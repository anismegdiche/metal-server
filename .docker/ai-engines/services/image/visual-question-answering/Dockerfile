FROM metal-ai-engine-base-image:1.0.0

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .



HEALTHCHECK --interval=10s --timeout=10s --start-period=10s --retries=3 \
    CMD curl --fail http://localhost:5000/image-visual-question-answering/health || exit 1

# Start the application
EXPOSE 5000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
