#!/bin/bash
# Azure Web App startup script
# Azure Web App sets PORT environment variable

PORT=${PORT:-8000}
exec uvicorn app:app --host 0.0.0.0 --port $PORT

