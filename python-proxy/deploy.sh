#!/bin/bash
# Deployment script for NemoClaw Python Proxy to Google Cloud Run
# Make sure to authenticate with 'gcloud auth login' and 'gcloud config set project [YOUR_PROJECT_ID]'

# You will need to substitute your actual GCP project ID below if not set.
GCP_PROJECT=$(gcloud config get-value project)
SERVICE_NAME="nemoclaw-inference-proxy"
REGION="us-central1"

if [ -z "$GCP_PROJECT" ]; then
  echo "Error: No Google Cloud Project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "Deploying $SERVICE_NAME to Cloud Run in $REGION for project $GCP_PROJECT..."

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="NVIDIA_MODEL_ID=meta/llama-3.1-70b-instruct"

echo "Deployment completed successfully. Don't forget to set your runtime secrets (NVIDIA_API_KEY, OPENAI_API_KEY, etc.) in the Cloud Run console."
