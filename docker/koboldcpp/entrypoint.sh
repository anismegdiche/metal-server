#!/usr/bin/env bash
set -euo pipefail

MODEL_PATH="${MODEL_DIR}/${MODEL_FILE}"

if [ ! -f "${MODEL_PATH}" ]; then
    echo "Model not found locally. Downloading ${MODEL_FILE} from ${MODEL_REPO}..."
    hf download "${MODEL_REPO}" \
        --include "${MODEL_FILE}" \
        --local-dir "${MODEL_DIR}"
else
    echo "Model already present at ${MODEL_PATH}, skipping download."
fi

echo "Starting llama-server..."
exec /app/bin/llama-server \
    -m "${MODEL_PATH}" \
    -c "${CTX_SIZE}" \
    -t "${THREADS}" \
    --jinja \
    --host 0.0.0.0 \
    --port "${PORT}"