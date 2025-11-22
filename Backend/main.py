from fastapi import FastAPI, UploadFile, File, HTTPException
from typing import List
from transformers import Wav2Vec2FeatureExtractor, WavLMForXVector, ViTForImageClassification, ViTImageProcessor
import torch
import numpy as np
import librosa
import io
from PIL import Image
import cv2
import tempfile
import os

app = FastAPI(title="Afriguard Manipulation Detection API")

# Load models
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained('microsoft/wavlm-base-plus-sv')
model = WavLMForXVector.from_pretrained('microsoft/wavlm-base-plus-sv')


image_processor = ViTImageProcessor.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model")
image_model = ViTForImageClassification.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model")

@app.post("/detect/image/")
async def detect_image_manipulation(image: UploadFile = File(...)):
    """Detect image deepfake/fake manipulation."""
    try:
        img_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        # Preprocess
        inputs = image_processor(images=pil_image, return_tensors="pt")
        with torch.no_grad():
            outputs = image_model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1)
            predicted_class = torch.argmax(logits, dim=1).item()
            confidence = float(torch.max(probs).item())
        label = image_model.config.id2label[predicted_class]

        is_fake = label.lower() in ["fake", "deepfake"]

        return {
            "predicted_label": label,
            "fake": is_fake,
            "confidence": confidence,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.post("/detect/audio/")
async def detect_audio_manipulation(audio_files: List[UploadFile] = File(...)):
    """
    Detect if two audio files are from the same speaker using wavlm-base-plus-sv.
    Expects two uploaded wav files. Make sure the files have different names.
    Returns similarity and boolean is_same_speaker decision.
    """
    if len(audio_files) != 2:
        raise HTTPException(status_code=400, detail="Exactly 2 audio files must be uploaded (for speaker comparison).")
    try:
        audio_arrays = []
        for f in audio_files:
            data = await f.read()
            waveform, sr = librosa.load(io.BytesIO(data), sr=16000)
            audio_arrays.append(waveform)
        
        inputs = feature_extractor(audio_arrays, sampling_rate=16000, padding=True, return_tensors="pt")
        with torch.no_grad():
            embeddings = model(**inputs).embeddings
        embeddings = torch.nn.functional.normalize(embeddings, dim=-1).cpu()
        cosine_sim = torch.nn.CosineSimilarity(dim=-1)
        similarity = float(cosine_sim(embeddings[0], embeddings[1]))
        threshold = 0.86  # The optimal threshold is dataset-dependent
        return {
            "similarity": similarity,
            "is_same_speaker": similarity >= threshold,
            "threshold": threshold
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@app.post("/detect/video/")
async def detect_video_manipulation(video: UploadFile = File(...)):
    """Detect video deepfake/fake manipulation."""
    try:
        # Save uploaded video temporarily
        temp_fd, temp_path = tempfile.mkstemp(suffix=".mp4")
        with os.fdopen(temp_fd, "wb") as f:
            f.write(await video.read())

        # Extract N frames from the video
        N = 5
        frames = []
        cap = cv2.VideoCapture(temp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames < N:
            idxs = np.arange(total_frames)
        else:
            idxs = np.linspace(0, total_frames - 1, N).astype(int)
        for idx in idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                frames.append(pil_image)
        cap.release()
        os.remove(temp_path)

        # Run frame-level deepfake/image manipulation (classification)
        frame_results = []
        fake_probs = []
        label_counts = {}
        for pil_image in frames:
            inputs = image_processor(images=pil_image, return_tensors="pt")
            with torch.no_grad():
                outputs = image_model(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=1)
                predicted_class = torch.argmax(logits, dim=1).item()
                confidence = float(torch.max(probs).item())
                label = image_model.config.id2label[predicted_class]
                # Collect frame-wise results
                frame_results.append({
                    "predicted_label": label,
                    "confidence": confidence
                })
                fake_probs.append(probs[0, predicted_class].item())
                label_counts[label] = label_counts.get(label, 0) + 1

        # Determine overall prediction for video
        if label_counts:
            # Most common label
            most_common_label = max(label_counts, key=label_counts.get)
            confidence = float(np.mean(fake_probs)) if fake_probs else 0.0
        else:
            most_common_label = "unknown"
            confidence = 0.0

        # Is the video considered fake?
        # You might want to customize what label means fake for your model
        is_fake = most_common_label.lower() in ["fake", "deepfake"]

        return {
            "predicted_label": most_common_label,
            "fake": is_fake,
            "confidence": confidence,
            "frame_results": frame_results,
            "details": "Detection run on sample video frames.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}")

@app.get("/")
def read_root():
    return {"msg": "Afriguard Manipulation Detection API. Use /docs for Swagger UI."}
