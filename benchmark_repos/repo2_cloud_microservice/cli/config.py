import os

# Declared in .env.example
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# LOOSE END: Undeclared environment variable missing from .env.example
METRICS_COLLECTOR_URL = os.getenv("METRICS_COLLECTOR_URL")
