#!/bin/bash
set -e

echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama API to be ready..."
until ollama list 2>/dev/null || ! kill -0 $OLLAMA_PID 2>/dev/null; do
  sleep 2
done

if ! kill -0 $OLLAMA_PID 2>/dev/null; then
    echo "Ollama server crashed."
    exit 1
fi

echo "Ollama API ready."

echo "Pulling mistral model (this may take several minutes on first run)..."
ollama pull mistral

echo "Verifying mistral is present..."
until ollama list | grep -q mistral || ! kill -0 $OLLAMA_PID 2>/dev/null; do
  echo "  mistral not confirmed yet, retrying..."
  sleep 5
done

if ! kill -0 $OLLAMA_PID 2>/dev/null; then
    echo "Ollama server crashed."
    exit 1
fi

echo "mistral loaded and ready."
wait $OLLAMA_PID
