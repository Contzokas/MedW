#!/bin/bash
set -e

echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama API to be ready..."
until ollama list 2>/dev/null; do
  sleep 2
done
echo "Ollama API ready."

echo "Pulling mistral model (this may take several minutes on first run)..."
ollama pull mistral

echo "Verifying mistral is present..."
until ollama list | grep -q mistral; do
  echo "  mistral not confirmed yet, retrying..."
  sleep 5
done

echo "mistral loaded and ready."
wait $OLLAMA_PID
