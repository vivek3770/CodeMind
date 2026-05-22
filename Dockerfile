FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir fastapi uvicorn[standard] google-genai python-dotenv pydantic httpx RestrictedPython radon
COPY backend/ ./backend/
RUN mkdir -p backend/data/training backend/data/chroma_db backend/models/bug_classifier
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
