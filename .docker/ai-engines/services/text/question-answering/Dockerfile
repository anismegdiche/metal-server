FROM metal-ai-engine-base:v1.0.0

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Base image has curl

COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app.py ./

HEALTHCHECK --interval=10s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/text-question-answering/health || exit 1

EXPOSE 5000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
