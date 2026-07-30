# ---- AfriGuard Verify — backend ----
# Pinned to Python 3.11 (torch 2.1.2 has no build for 3.14).
FROM python:3.11-slim

# System libraries the app needs at runtime:
#   ffmpeg        -> video/audio decoding for OpenCV + librosa
#   libsndfile1   -> soundfile (audio loading)
#   libgl1 + libglib2.0-0 -> OpenCV shared libs
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface

# Install CPU-only PyTorch FIRST so we don't pull ~2GB of CUDA libraries,
# then the rest (torch is already satisfied for requirements.txt).
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

# Application code (see .dockerignore for what is excluded, incl. .env)
COPY . .

EXPOSE 8000

# Models download from Hugging Face on first startup (~1 GB).
# Mount a volume at /app/.cache/huggingface to cache them across restarts.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]