FROM python:3.12-alpine AS runtime
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
CMD ["python", "src/worker.py"]

