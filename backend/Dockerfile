FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

EXPOSE 8000

# Shell form so ${PORT} expands — Render injects PORT (default 10000) and routes
# traffic there; local docker-compose doesn't set it, so this falls back to 8000.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
