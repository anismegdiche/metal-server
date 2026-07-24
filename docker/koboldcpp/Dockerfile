# syntax=docker/dockerfile:1

##########################
# Stage 1: build llama.cpp
##########################
FROM ubuntu:24.04 AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    curl \
    ca-certificates \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt

# Clone llama.cpp (pin a specific tag/commit if you want reproducible builds)
RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git

WORKDIR /opt/llama.cpp

# Build CPU-only, release mode.
# GGML_NATIVE=OFF because the build machine's CPU may differ from the runtime host;
# set it to ON only if you build and run on the exact same machine.
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=OFF \
    && cmake --build build --config Release -j"$(nproc)"

##########################
# Stage 2: runtime image
##########################
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    libgomp1 \
    ca-certificates \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --no-cache-dir --break-system-packages "huggingface_hub[cli]"

WORKDIR /app

# Copy only the built binaries/libs we need
COPY --from=build /opt/llama.cpp/build/bin/ /app/bin/

ENV PATH="/app/bin:${PATH}"
ENV LD_LIBRARY_PATH="/app/bin:${LD_LIBRARY_PATH}"

# Model storage
VOLUME ["/models"]

ENV MODEL_REPO="bartowski/Llama-3-Groq-8B-Tool-Use-GGUF"
ENV MODEL_FILE="Llama-3-Groq-8B-Tool-Use-Q4_K_M.gguf"
ENV MODEL_DIR="/models"
ENV CTX_SIZE="4096"
ENV THREADS="6"
ENV PORT="8080"

# Entrypoint script: download model if missing, then start server
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
