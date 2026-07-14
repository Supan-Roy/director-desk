FROM python:3.10-slim

WORKDIR /app

# Install FFmpeg (required for audio extraction in subtitle generation)
# and minimal runtime libraries needed by ctranslate2/faster-whisper wheels
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency list and install packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the Whisper tiny model so it's baked into the image
# (avoids cold-start download on production and ensures offline capability)
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu', compute_type='int8')"

# Copy the rest of the application
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI server (without --reload in production)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
