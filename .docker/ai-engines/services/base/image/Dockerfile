# Base Image Service Dockerfile

FROM python:3.11-slim-bullseye

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Common Python Dependencies
# We install CPU-only torch here, plus other heavy libraries widely used across services.
# Individual services will essentially have a "no-op" or very fast pip install.
RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
    "torch>=2.0.0,<3.0.0" --extra-index-url https://download.pytorch.org/whl/cpu \
    "transformers>=4.30.0,<5.0.0" \
    "fastapi>=0.95.0,<1.0.0" \
    "uvicorn>=0.21.0,<0.22.0" \
    "python-multipart>=0.0.6" \
    "numpy>=1.24.0" \
    "pillow>=10.0.0" \
    "timm>=0.9.2"

# Set Hugging Face cache directory to a volume-friendly path
ENV HF_HOME=/data/models
RUN mkdir -p /data/models
# Services will COPY their own requirements.txt. 
# If requirements match what's above, pip will skip them.
