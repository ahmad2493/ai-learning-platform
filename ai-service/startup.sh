#!/bin/bash
# Azure Web App Startup Script
# Author: Muhammad Ahmad (BCSF22M002) - DevOps
# 
# Functionality:
# - Handles Azure Web App PORT environment variable
# - Starts FastAPI server with uvicorn
# - Ensures service listens on correct port for Azure

# Azure Web App sets PORT environment variable
PORT=${PORT:-8000}
exec uvicorn app:app --host 0.0.0.0 --port $PORT

