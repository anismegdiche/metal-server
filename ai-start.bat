podman machine init
podman machine start
podman run -d --name ollama -p 5001:11434 -v ollama:/root/.ollama ollama/ollama
podman exec -it ollama ollama pull llama3-groq-tool-use:8b