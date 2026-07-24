#!/bin/sh
set -e

ollama serve &
OLLAMA_PID=$!

# Wait for server
echo "Waiting for Ollama..."
until ollama list > /dev/null 2>&1; do
    sleep 1
done

# Pull model if not present
if ! ollama list 2>/dev/null | grep -q "llama3-groq-tool-use:8b"; then
    echo "Pulling llama3-groq-tool-use:8b..."
    ollama pull llama3-groq-tool-use:8b
    echo "Done."
fi

wait $OLLAMA_PID
