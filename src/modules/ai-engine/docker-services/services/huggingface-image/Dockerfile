# Use a smaller base image with Python 3.11
FROM python:3.11-slim-bullseye

# Set working directory
WORKDIR /app

RUN apt-get update
RUN apt-get install -y --no-install-recommends ca-certificates
RUN update-ca-certificates
RUN apt-get install -y --no-install-recommends curl libgl1-mesa-glx libglib2.0-0
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

COPY requirements.txt ./

RUN pip install --upgrade pip setuptools wheel

RUN pip install --use-feature=truststore --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

COPY app.py ./
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/huggingface/image/health || exit 1

# Expose the port the app runs on
EXPOSE 5000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
