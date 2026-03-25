import json
import os
import time
from typing import Any, Dict, Optional

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from redis import Redis
from redis.exceptions import RedisError


MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/ai-task-platform")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
QUEUE_NAME = os.getenv("QUEUE_NAME", "ai-tasks")
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL", "1"))
STARTUP_RETRY_SECONDS = float(os.getenv("STARTUP_RETRY_SECONDS", "3"))

mongo_client = None
tasks = None
redis_client = None


def connect_dependencies() -> None:
    global mongo_client, tasks, redis_client

    while True:
        try:
            mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
            mongo_client.admin.command("ping")
            db = mongo_client.get_default_database()
            tasks = db.tasks

            redis_client = Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=5,
            )
            redis_client.ping()
            print("Worker connected to MongoDB and Redis")
            return
        except (PyMongoError, RedisError) as exc:
            print(f"Dependency connection failed: {exc}. Retrying...")
            time.sleep(STARTUP_RETRY_SECONDS)


def apply_operation(operation: str, input_text: str) -> str:
    if operation == "uppercase":
        return input_text.upper()
    if operation == "lowercase":
        return input_text.lower()
    if operation == "reverse":
        return input_text[::-1]
    if operation == "word_count":
        return str(len([word for word in input_text.split() if word.strip()]))
    raise ValueError(f"Unsupported operation: {operation}")


def update_task(task_id: str, changes: Dict[str, Any], log: Optional[str] = None) -> None:
    update_doc: Dict[str, Any] = {"$set": changes}
    if log:
        update_doc["$push"] = {"logs": log}
    tasks.update_one({"_id": ObjectId(task_id)}, update_doc)


def process_job(job: Dict[str, Any]) -> None:
    required_fields = {"taskId", "operation", "inputText"}
    if not required_fields.issubset(job):
        print(f"Skipping malformed job: {job}")
        return

    task_id = job["taskId"]
    update_task(task_id, {"status": "running"}, "Worker started processing")

    try:
        result = apply_operation(job["operation"], job["inputText"])
        update_task(
            task_id,
            {"status": "success", "result": result, "errorMessage": ""},
            "Task completed successfully",
        )
    except Exception as exc:
        update_task(
            task_id,
            {"status": "failed", "errorMessage": str(exc)},
            "Task failed during processing",
        )


def main() -> None:
    print("Worker started")
    connect_dependencies()

    while True:
        try:
            payload = redis_client.brpop(QUEUE_NAME, timeout=5)
        except RedisError as exc:
            print(f"Redis pop failed: {exc}. Reconnecting...")
            time.sleep(POLL_INTERVAL)
            connect_dependencies()
            continue

        if not payload:
            time.sleep(POLL_INTERVAL)
            continue

        _, raw = payload
        try:
            job = json.loads(raw)
        except json.JSONDecodeError:
            print(f"Skipping non-JSON payload: {raw}")
            continue

        process_job(job)


if __name__ == "__main__":
    main()
