# backend/main.py
import os
import io
import uuid
import shutil
import tempfile
import threading
from datetime import datetime, timezone
from collections import defaultdict

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from transformers import (
    Wav2Vec2FeatureExtractor,
    WavLMForXVector,
    ViTImageProcessor,
    ViTForImageClassification,
)
import torch
import numpy as np
import librosa
from PIL import Image
import cv2
import requests

from dotenv import load_dotenv
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse

# ------------------------------------------------------------------
# ENV / CONFIG  (Twilio WhatsApp)
# ------------------------------------------------------------------
load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

app = FastAPI(
    title="Afriguard - Deepfake & Manipulation Detection API",
    description="Detect deepfakes in images, audio (speaker verification), and videos",
    version="4.0",
)

# CORS - the React dashboard runs on port 8080
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------
# IN-MEMORY CASE STORE
# NOTE: this lives in RAM and resets when the server restarts.
# Fine for a demo. To persist across restarts, swap for SQLite later.
# ------------------------------------------------------------------
CASES: List[dict] = []          # newest first
_cases_lock = threading.Lock()


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


# Flag as manipulated ONLY when the model is at least this confident.
# Deliberately conservative: a false accusation can harm as much as a deepfake.
FAKE_THRESHOLD = 0.80


def _record_case(media_type: str, fake_probability: float, explanation: str = "") -> dict:
    fake_prob = fake_probability or 0.0
    is_fake = fake_prob >= FAKE_THRESHOLD

    # Show the percentage that AGREES with the verdict, so the number never
    # contradicts the label:
    #   manipulated -> show the deepfake probability
    #   authentic   -> show the authentic probability (100 - deepfake%)
    if is_fake:
        display_pct = round(fake_prob * 100)
        verdict = f"{display_pct}% Likely Manipulated"
    else:
        display_pct = round((1 - fake_prob) * 100)
        verdict = f"{display_pct}% Likely Authentic"

    case = {
        "id": "case-" + uuid.uuid4().hex[:8],
        "mediaType": media_type,                 # 'image' | 'video' | 'audio'
        "status": "completed",
        "confidence": display_pct,               # 0-100, matches the verdict label
        "fakeProbability": round(fake_prob * 100),  # raw deepfake % (for the dashboard/analysts)
        "submittedAt": _now_iso(),
        "completedAt": _now_iso(),
        "verdict": verdict,
        "isFake": bool(is_fake),
        "explanation": explanation or (
            f"Model assessed this {media_type} at {round(fake_prob * 100)}% deepfake "
            f"probability (threshold {int(FAKE_THRESHOLD * 100)}%). "
            f"Verdict: {'manipulated' if is_fake else 'likely authentic'}."
        ),
    }
    with _cases_lock:
        CASES.insert(0, case)
    return case


def _record_failed(media_type: str) -> dict:
    case = {
        "id": "case-" + uuid.uuid4().hex[:8],
        "mediaType": media_type,
        "status": "failed",
        "confidence": 0,
        "submittedAt": _now_iso(),
        "verdict": "Analysis Failed",
        "isFake": False,
        "explanation": "The media could not be processed.",
    }
    with _cases_lock:
        CASES.insert(0, case)
    return case


# ------------------------------------------------------------------
# MODEL LOADING (once at startup)
# ------------------------------------------------------------------
@app.on_event("startup")
async def load_models():
    global feature_extractor, speaker_model, image_processor, image_model

    print("Loading WavLM speaker verification model...")
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained("microsoft/wavlm-base-plus-sv")
    speaker_model = WavLMForXVector.from_pretrained("microsoft/wavlm-base-plus-sv")

    print("Loading Deepfake Image Detector (ViT)...")
    image_processor = ViTImageProcessor.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model")
    image_model = ViTForImageClassification.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model")

    # Switch to inference mode (otherwise dropout stays active and biases output)
    speaker_model.eval()
    image_model.eval()

    print("All models loaded successfully!")


# ------------------------------------------------------------------
# CORE ANALYSIS HELPERS
# ------------------------------------------------------------------
def _fake_class_index() -> int:
    """Find which output index corresponds to the 'fake' class."""
    for idx, lbl in image_model.config.id2label.items():
        if str(lbl).lower() in ("fake", "deepfake", "manipulated"):
            return int(idx)
    return -1


def analyze_image_pil(pil_image: Image.Image) -> dict:
    inputs = image_processor(images=pil_image, return_tensors="pt")
    with torch.no_grad():
        logits = image_model(**inputs).logits
        probs = torch.softmax(logits, dim=1)
        predicted_idx = torch.argmax(logits, dim=1).item()
        confidence = probs[0][predicted_idx].item()
        label = image_model.config.id2label[predicted_idx]

    fake_idx = _fake_class_index()
    if fake_idx >= 0:
        fake_prob = float(probs[0][fake_idx].item())
    else:
        # fallback if labels are unusual
        fake_prob = confidence if label.lower() in ("fake", "deepfake", "manipulated") else 1 - confidence

    is_fake = label.lower() in ["fake", "deepfake", "manipulated"]
    return {
        "predicted_label": label,
        "is_fake": is_fake,
        "confidence": round(confidence, 4),          # confidence in the winning label
        "fake_probability": round(fake_prob, 4),     # 0..1 probability it's fake (for dashboard %)
    }


def analyze_video_path(path: str) -> dict:
    cap = cv2.VideoCapture(path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total / fps if fps > 0 else 0

    frame_indices = np.linspace(0, max(total - 1, 0), 8, dtype=int)
    frames = []
    for i in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if ret:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(frame))
    cap.release()

    results = []
    fake_probs = []
    for frame in frames:
        r = analyze_image_pil(frame)
        results.append({"label": r["predicted_label"], "confidence": r["confidence"]})
        fake_probs.append(r["fake_probability"])

    avg_fake_prob = float(np.mean(fake_probs)) if fake_probs else 0.0
    is_fake = avg_fake_prob > 0.5

    return {
        "duration_sec": round(duration, 2),
        "frames_analyzed": len(frames),
        "is_fake": is_fake,
        "fake_probability": round(avg_fake_prob, 4),
        "fake_confidence_avg": round(avg_fake_prob, 4),   # kept for backward compat
        "verdict": "DEEPFAKE DETECTED" if is_fake else "Likely Authentic",
        "frame_details": results,
    }


# ------------------------------------------------------------------
# DETECTION ENDPOINTS  (now ALSO record a case)
# ------------------------------------------------------------------
@app.post("/detect/image/")
async def detect_image_manipulation(image: UploadFile = File(...)):
    if not image.filename.lower().endswith((".png", ".jpg", ".jpeg", ".bmp", ".webp")):
        raise HTTPException(400, "Invalid image format")
    try:
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        result = analyze_image_pil(pil_image)
        case = _record_case("image", result["fake_probability"])
        return {"filename": image.filename, "case_id": case["id"], **result}
    except Exception as e:
        raise HTTPException(500, f"Image analysis failed: {str(e)}")


@app.post("/detect/audio/")
async def detect_audio_manipulation(audio_files: List[UploadFile] = File(...)):
    if len(audio_files) != 2:
        raise HTTPException(400, "Exactly 2 audio files required")
    try:
        arrays = []
        for audio in audio_files:
            if not audio.filename.lower().endswith((".wav", ".mp3", ".m4a")):
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
            "interpretation": "High similarity -> likely same speaker (possible deepfake voice cloning)",
        }
    except Exception as e:
        raise HTTPException(500, f"Audio analysis failed: {str(e)}")


@app.post("/detect/video/")
async def detect_video_manipulation(video: UploadFile = File(...)):
    if not video.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(400, "Invalid video format")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    try:
        shutil.copyfileobj(video.file, temp_file)
        temp_file.close()
        result = analyze_video_path(temp_file.name)
        case = _record_case("video", result["fake_probability"])
        return {"filename": video.filename, "case_id": case["id"], **result}
    except Exception as e:
        raise HTTPException(500, f"Video processing failed: {str(e)}")
    finally:
        os.unlink(temp_file.name)


# ------------------------------------------------------------------
# DASHBOARD READ ENDPOINTS  (shapes match the frontend Case / Stats types)
# ------------------------------------------------------------------
@app.get("/cases")
def list_cases():
    with _cases_lock:
        return list(CASES)


@app.get("/cases/{case_id}")
def get_case(case_id: str):
    with _cases_lock:
        for c in CASES:
            if c["id"] == case_id:
                return c
    raise HTTPException(404, "Case not found")


@app.get("/stats")
def get_stats():
    with _cases_lock:
        cases = list(CASES)
    total = len(cases)
    today = datetime.now(timezone.utc).date().isoformat()
    today_count = sum(1 for c in cases if c["submittedAt"][:10] == today)
    fakes = sum(1 for c in cases if c.get("isFake"))
    completed = [c for c in cases if c["status"] == "completed"]
    deepfake_pct = round((fakes / len(completed)) * 100) if completed else 0
    avg_conf = round(sum(c["confidence"] for c in completed) / len(completed), 1) if completed else 0.0
    return {
        "totalVerificationsToday": today_count,
        "deepfakePercentage": deepfake_pct,
        "averageConfidence": avg_conf,
        "totalCases": total,
    }


@app.get("/stats/chart")
def get_chart():
    with _cases_lock:
        cases = list(CASES)
    by_date = defaultdict(lambda: {"verifications": 0, "deepfakes": 0})
    for c in cases:
        d = c["submittedAt"][:10]
        by_date[d]["verifications"] += 1
        if c.get("isFake"):
            by_date[d]["deepfakes"] += 1
    return [{"date": d, **v} for d, v in sorted(by_date.items())]


# ------------------------------------------------------------------
# TWILIO WHATSAPP HELPERS
# ------------------------------------------------------------------
def _download_twilio_media(media_url: str) -> bytes:
    resp = requests.get(media_url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=30)
    resp.raise_for_status()
    return resp.content


def _send_whatsapp(to_number: str, body: str):
    if not twilio_client:
        print("Twilio client not configured; cannot send:", body)
        return
    twilio_client.messages.create(
        from_=TWILIO_WHATSAPP_NUMBER,
        to=to_number,
        body=body,
    )


def process_whatsapp_media(from_number: str, media_url: str, content_type: str):
    """Runs in the background: download -> detect -> record case -> reply."""
    media_type = "image" if content_type.startswith("image/") else \
                 "video" if content_type.startswith("video/") else \
                 "audio" if content_type.startswith("audio/") else "other"
    try:
        data = _download_twilio_media(media_url)

        if media_type == "image":
            pil = Image.open(io.BytesIO(data)).convert("RGB")
            r = analyze_image_pil(pil)
            case = _record_case("image", r["fake_probability"])
            verdict = "Deepfake detected" if case["isFake"] else "Likely authentic"
            reply = (
                f"Analysis complete! {verdict}.\n"
                f"Case ID: {case['id']}\n"
                f"Details: {case['verdict']}"
            )

        elif media_type == "video":
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            tmp.write(data)
            tmp.close()
            try:
                r = analyze_video_path(tmp.name)
            finally:
                os.unlink(tmp.name)
            case = _record_case("video", r["fake_probability"])
            verdict = "Deepfake detected" if case["isFake"] else "Likely authentic"
            reply = (
                f"Analysis complete! {verdict}.\n"
                f"Case ID: {case['id']}\n"
                f"Details: {case['verdict']}"
            )

        elif media_type == "audio":
            reply = (
                "I received a voice note, but voice-clone checking needs two "
                "clips to compare (a known-real sample + the suspicious one). "
                "For now I can verify images and videos - forward one of those."
            )

        else:
            reply = "Unsupported file type. Please forward an image or a video."

    except Exception as e:
        _record_failed(media_type if media_type != "other" else "image")
        reply = f"Sorry, processing failed. Try again! ({str(e)})"

    _send_whatsapp(from_number, reply)


@app.post("/whatsapp/webhook")
async def whatsapp_webhook(
    background_tasks: BackgroundTasks,
    From: str = Form(...),
    NumMedia: int = Form(0),
    Body: str = Form(""),
    MediaUrl0: str = Form(None),
    MediaContentType0: str = Form(None),
):
    resp = MessagingResponse()

    if NumMedia == 0 or not MediaUrl0:
        resp.message(
            "Welcome to AfriGuard Verify.\n"
            "Forward me a suspicious *image* or *video* and I'll tell you if it "
            "looks like a deepfake."
        )
        return Response(content=str(resp), media_type="application/xml")

    background_tasks.add_task(process_whatsapp_media, From, MediaUrl0, MediaContentType0)
    resp.message("Got it - analyzing now. I'll send the verdict in a moment...")
    return Response(content=str(resp), media_type="application/xml")


@app.get("/")
def home():
    return {"message": "Afriguard API running!", "docs": "/docs"}