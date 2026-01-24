# FastAPI Service Dockerfile for Azure Web App
# Author: Muhammad Ahmad (BCSF22M002) - DevOps, Containerization
# 
# Functionality:
# - Builds Docker container for FastAPI AI service
# - Installs Python dependencies and system packages
# - Configures container for Azure Web App deployment
# - Sets up ChromaDB storage directory
# - Exposes port 8000 for FastAPI service

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for ChromaDB (will be mounted to Azure File Share)
RUN mkdir -p /mnt/chroma

# Copy startup script
COPY startup.sh .
RUN chmod +x startup.sh

# Expose port (Azure Web App will set PORT env var)
EXPOSE 8000

# Start FastAPI server using PORT from environment
CMD ["./startup.sh"]

