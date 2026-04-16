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

OLLAMA_MODEL="${OLLAMA_MODEL:-mistral:7b}"

echo "Pulling ${OLLAMA_MODEL} model (this may take several minutes on first run)..."
ollama pull "${OLLAMA_MODEL}"

echo "Verifying ${OLLAMA_MODEL} is present..."
until ollama list | grep -q "${OLLAMA_MODEL}" || ! kill -0 $OLLAMA_PID 2>/dev/null; do
  echo "  ${OLLAMA_MODEL} not confirmed yet, retrying..."
  sleep 5
done

if ! kill -0 $OLLAMA_PID 2>/dev/null; then
    echo "Ollama server crashed."
    exit 1
fi

echo "${OLLAMA_MODEL} loaded and ready."
wait $OLLAMA_PID
