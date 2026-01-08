# Use shared base image
FROM metal-ai-engine-base-text:1.0.0

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# (Optional) Updates if needed, but base should have curl
# RUN apt-get update && ...

# Copy requirements and install dependencies
# Base image already has torch/transformers on CPU
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py ./

# Health check endpoint (uses curl)
HEALTHCHECK --interval=10s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:5000/text-emotion-detection/health || exit 1

EXPOSE 5000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
