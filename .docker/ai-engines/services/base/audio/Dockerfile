# Base Audio Service Dockerfile

FROM python:3.11-slim-bullseye

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    gcc \
    python3-dev \
    git \
    libsndfile1 \
    ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Common Python Dependencies
# We install CPU-only torch and torchaudio here, plus other heavy libraries widely used across services.
# Individual services will essentially have a "no-op" or very fast pip install.
RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
    "torch>=2.0.0,<3.0.0" --extra-index-url https://download.pytorch.org/whl/cpu \
    "torchaudio>=2.0.0,<3.0.0" --extra-index-url https://download.pytorch.org/whl/cpu \
    "transformers>=4.30.0,<5.0.0" \
    "fastapi>=0.95.0,<1.0.0" \
    "uvicorn>=0.21.0,<0.22.0" \
    "pydantic>=2.4.2" \
    "python-multipart>=0.0.6" \
    "numpy>=1.26.0,<2.0.0" \
    "soundfile>=0.12.1" \
    "psutil>=5.9.0" \
    "datasets>=2.12.0" \
    "librosa>=0.10.0" \
    "jiwer>=3.0.0"

# Set Hugging Face cache directory to a volume-friendly path
ENV HF_HOME=/data/models
RUN mkdir -p /data/models
