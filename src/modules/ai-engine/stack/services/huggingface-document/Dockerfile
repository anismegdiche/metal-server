FROM python:3.11-slim-bullseye

WORKDIR /app

RUN apt-get update && \
	apt-get install -y --no-install-recommends ca-certificates ffmpeg && \
	update-ca-certificates && \
	apt-get upgrade -y && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt --trusted-host pypi.org --trusted-host files.pythonhosted.org

COPY app.py ./

ENV PYTHONHTTPSVERIFY=0

EXPOSE 5000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
