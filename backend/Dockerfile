FROM python:3.11-slim

WORKDIR /app

# Create data directory for SQLite (will be mounted in production)
RUN mkdir -p /app/data

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY alembic alembic/
COPY alembic.ini .
COPY app app/

# Run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
