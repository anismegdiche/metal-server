FROM ollama/ollama:latest

COPY pull-model.sh /pull-model.sh
RUN chmod +x /pull-model.sh

ENTRYPOINT ["/pull-model.sh"]
