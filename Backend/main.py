# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from transformers import Wav2Vec2FeatureExtractor, WavLMForXVector, ViTImageProcessor, ViTForImageClassification
import torch
import numpy as np
import librosa
import io
from PIL import Image
import cv2
import tempfile
import os
import shutil

app = FastAPI(
    title="Afriguard - Deepfake & Manipulation Detection API",
    description="Detect deepfakes in images, audio (speaker verification), and videos",
    version="2.0"
)

# CORS - CRITICAL for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://yourdomain.com"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models ONCE at startup (much faster)
@app.on_event("startup")
async def load_models():
    global feature_extractor, speaker_model, image_processor, image_model
    
    print("Loading WavLM speaker verification model...")
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained('microsoft/wavlm-base-plus-sv')
    speaker_model = WavLMForXVector.from_pretrained('microsoft/wavlm-base-plus-sv')
    
    print("Loading Deepfake Image Detector (ViT)...")
    image_processor = ViTImageProcessor.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model")
    image_model = ViTForImageClassification.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model")
    
    print("All models loaded successfully!")

#  endpoints 
@app.post("/detect/image/")
async def detect_image_manipulation(image: UploadFile = File(...)):
    if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.webp')):
        raise HTTPException(400, "Invalid image format")
        
    try:
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        inputs = image_processor(images=pil_image, return_tensors="pt")
        
        with torch.no_grad():
            logits = image_model(**inputs).logits
            probs = torch.softmax(logits, dim=1)
            predicted_idx = torch.argmax(logits, dim=1).item()
            confidence = probs[0][predicted_idx].item()
            label = image_model.config.id2label[predicted_idx]
        
        is_fake = label.lower() in ["fake", "deepfake", "manipulated"]
        
        return {
            "filename": image.filename,
            "predicted_label": label,
            "is_fake": is_fake,
            "confidence": round(confidence, 4)
        }
    except Exception as e:
        raise HTTPException(500, f"Image analysis failed: {str(e)}")

@app.post("/detect/audio/")
async def detect_audio_manipulation(audio_files: List[UploadFile] = File(...)):
    if len(audio_files) != 2:
        raise HTTPException(400, "Exactly 2 audio files required")
    
    try:
        arrays = []
        for audio in audio_files:
            if not audio.filename.lower().endswith(('.wav', '.mp3', '.m4a')):
                raise HTTPException(400, f"Unsupported audio: {audio.filename}")
            content = await audio.read()
            waveform, sr = librosa.load(io.BytesIO(content), sr=16000)
            arrays.append(waveform)

        inputs = feature_extractor(arrays, sampling_rate=16000, padding=True, return_tensors="pt")
        with torch.no_grad():
            embeddings = speaker_model(**inputs).embeddings
            embeddings = torch.nn.functional.normalize(embeddings, dim=-1).cpu()
        
        similarity = float(torch.nn.CosineSimilarity(dim=-1)(embeddings[0], embeddings[1]))
        threshold = 0.86
        is_same = similarity >= threshold

        return {
            "similarity_score": round(similarity, 4),
            "is_same_speaker": is_same,
            "threshold": threshold,
            "interpretation": "High similarity → likely same speaker (possible deepfake voice cloning)"
        }
    except Exception as e:
        raise HTTPException(500, f"Audio analysis failed: {str(e)}")

@app.post("/detect/video/")
async def detect_video_manipulation(video: UploadFile = File(...)):
    if not video.filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
        raise HTTPException(400, "Invalid video format")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    try:
        shutil.copyfileobj(video.file, temp_file)
        temp_file.close()

        cap = cv2.VideoCapture(temp_file.name)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total / fps if fps > 0 else 0

        # Sample 8 frames evenly
        frame_indices = np.linspace(0, max(total-1, 0), 8, dtype=int)
        frames = []
        for i in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(Image.fromarray(frame))
        cap.release()

        results = []
        fake_confidences = []
        for frame in frames:
            inputs = image_processor(images=frame, return_tensors="pt")
            with torch.no_grad():
                logits = image_model(**inputs).logits
                prob = torch.softmax(logits, dim=1)[0]
                pred_idx = torch.argmax(logits, dim=1).item()
                conf = prob[pred_idx].item()
                label = image_model.config.id2label[pred_idx]
                results.append({"label": label, "confidence": conf})
                if label.lower() in ["fake", "deepfake"]:
                    fake_confidences.append(conf)

        avg_fake_conf = np.mean(fake_confidences) if fake_confidences else 0
        is_fake = avg_fake_conf > 0.6  # adjustable threshold

        return {
            "filename": video.filename,
            "duration_sec": round(duration, 2),
            "frames_analyzed": len(frames),
            "is_fake": is_fake,
            "fake_confidence_avg": round(avg_fake_conf, 4),
            "verdict": "DEEPFAKE DETECTED" if is_fake else "Likely Authentic",
            "frame_details": results
        }
    except Exception as e:
        raise HTTPException(500, f"Video processing failed: {str(e)}")
    finally:
        os.unlink(temp_file.name)

@app.get("/")
def home():
    return {"message": "Afriguard API running!", "docs": "/docs"}