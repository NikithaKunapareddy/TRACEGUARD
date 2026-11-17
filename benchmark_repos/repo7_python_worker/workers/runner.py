"""Worker entrypoint for processing async jobs."""
import os
import sys

# LOOSE_END: Unconfigured broker URL in env
BROKER_URL = os.getenv("CELERY_BROKER_URL")

def run_worker():
    print(f"Connecting to broker: {BROKER_URL}")

if __name__ == "__main__":
    run_worker()
