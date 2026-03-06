FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ── API server ───────────────────────────────────────
FROM base AS api
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

# ── Celery worker ────────────────────────────────────
FROM base AS worker
CMD ["celery", "-A", "backend.celery_app:celery", "worker", "--loglevel=info", "--concurrency=4", "-Q", "workflows,agents,calls"]
