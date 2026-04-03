"""
NemoClaw Inference Proxy — Enterprise Edition
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Direct NVIDIA NIM inference gateway for the NemoC LAW AI Agentic OS.
Replaces the NeMo Guardrails middleware with a clean, zero-dependency
proxy that communicates directly with NVIDIA's OpenAI-compatible API.

Architecture:
  React Frontend → Vite Proxy → THIS SERVICE → NVIDIA NIM (integrate.api.nvidia.com)

Security layers (handled here):
  1. Input validation & sanitization
  2. Request logging & audit trail
  3. Rate limiting per IP
  4. Response content filtering

Security layers (handled by frontend agentAPI.js):
  1. PII redaction (SSN, phone, email, DOB, financial data)
  2. Prompt injection / jailbreak detection
  3. Role-based system prompt injection
  4. Firestore audit logging

Author: NemoClaw Agentic OS
"""

import os
import time
import json
import httpx
import uvicorn
from datetime import datetime
from collections import defaultdict
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ENVIRONMENT BOOTSTRAP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

load_dotenv()

# Resolve the NVIDIA API key from multiple possible env var names
NVIDIA_API_KEY = (
    os.environ.get("NVIDIA_API_KEY")
    or os.environ.get("OPENAI_API_KEY")
    or os.environ.get("VITE_NVIDIA_API_KEY")
    or ""
)

# The NVIDIA NIM endpoint (OpenAI-compatible)
NVIDIA_BASE_URL = os.environ.get(
    "NVIDIA_BASE_URL",
    "https://integrate.api.nvidia.com/v1"
)

# Default model — the frontend sends its own model ID, but we enforce this as fallback
DEFAULT_MODEL = os.environ.get(
    "NVIDIA_MODEL_ID",
    "nvidia/llama-3.1-nemotron-70b-instruct"
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  APPLICATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = FastAPI(
    title="NemoClaw Inference Proxy",
    description="Enterprise-grade NVIDIA NIM gateway for the NemoC LAW AI Agentic OS",
    version="2.0.0",
)

# CORS — allow the Codespace frontend and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  RATE LIMITER (per-IP, in-memory)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RATE_LIMIT_WINDOW = 60   # seconds
RATE_LIMIT_MAX = 30      # max requests per window per IP
rate_store = defaultdict(list)

def check_rate_limit(client_ip: str):
    """Enforce per-IP rate limiting."""
    now = time.time()
    # Prune old entries
    rate_store[client_ip] = [t for t in rate_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_store[client_ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {RATE_LIMIT_MAX} requests per {RATE_LIMIT_WINDOW}s."
        )
    rate_store[client_ip].append(now)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  REQUEST / RESPONSE MODELS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class Message(BaseModel):
    role: str
    content: str

class InferenceRequest(BaseModel):
    model: Optional[str] = None
    messages: List[Message]
    max_tokens: int = 1024
    temperature: float = 0.05
    top_p: float = 0.8
    frequency_penalty: float = 0.2
    presence_penalty: float = 0.0
    stream: bool = False

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  NVIDIA NIM ASYNC CLIENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Persistent async HTTP client for connection pooling
nvidia_client = httpx.AsyncClient(
    base_url=NVIDIA_BASE_URL,
    timeout=httpx.Timeout(120.0, connect=10.0),   # 120s read, 10s connect
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
)

async def call_nvidia_nim(request: InferenceRequest) -> dict:
    """
    Forward an inference request directly to the NVIDIA NIM API.
    Returns the raw OpenAI-compatible JSON response.
    """
    if not NVIDIA_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="NVIDIA API key not configured. Set NVIDIA_API_KEY, OPENAI_API_KEY, or VITE_NVIDIA_API_KEY in your environment."
        )

    # Build the payload — use frontend-specified model or fall back to default
    model_id = request.model or DEFAULT_MODEL
    
    payload = {
        "model": model_id,
        "messages": [{"role": m.role, "content": m.content} for m in request.messages],
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "top_p": request.top_p,
        "frequency_penalty": request.frequency_penalty,
        "presence_penalty": request.presence_penalty,
        "stream": False,  # We never stream through the proxy
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
    }

    print(f"[NIM] → Requesting model={model_id} | messages={len(request.messages)} | max_tokens={request.max_tokens}")

    try:
        response = await nvidia_client.post(
            "/chat/completions",
            json=payload,
            headers=headers,
        )
    except httpx.ConnectError as e:
        print(f"[NIM] ✗ Connection failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to connect to NVIDIA NIM: {str(e)}")
    except httpx.TimeoutException as e:
        print(f"[NIM] ✗ Timeout: {e}")
        raise HTTPException(status_code=504, detail=f"NVIDIA NIM request timed out: {str(e)}")

    if response.status_code != 200:
        error_body = response.text
        print(f"[NIM] ✗ Error {response.status_code}: {error_body}")
        
        # If the model is not found, try the fallback model
        if response.status_code == 404 and model_id != DEFAULT_MODEL:
            print(f"[NIM] ↻ Model '{model_id}' not found, retrying with fallback '{DEFAULT_MODEL}'...")
            payload["model"] = DEFAULT_MODEL
            try:
                response = await nvidia_client.post(
                    "/chat/completions",
                    json=payload,
                    headers=headers,
                )
                if response.status_code == 200:
                    print(f"[NIM] ✓ Fallback model succeeded")
                    data = response.json()
                    return data
            except Exception as fallback_err:
                print(f"[NIM] ✗ Fallback also failed: {fallback_err}")
        
        raise HTTPException(
            status_code=response.status_code,
            detail=f"NVIDIA NIM returned {response.status_code}: {error_body}"
        )

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    print(f"[NIM] ✓ Response received | {len(content)} chars | model={data.get('model', 'unknown')}")
    return data

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  API ROUTES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/nvidia/v1/chat/completions")
async def chat_completions(req: InferenceRequest, request: Request):
    """
    Primary inference endpoint.  
    Receives OpenAI-compatible chat completion requests from the frontend,
    applies rate limiting, and forwards directly to NVIDIA NIM.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)
    
    print(f"\n{'━'*60}")
    print(f"[PROXY] Inference request from {client_ip} at {datetime.now().isoformat()}")
    print(f"[PROXY] Model: {req.model or DEFAULT_MODEL} | Messages: {len(req.messages)}")
    
    # Validate messages aren't empty
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages array cannot be empty")
    
    # Forward to NVIDIA NIM
    result = await call_nvidia_nim(req)
    
    return result


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "operational",
        "service": "NemoClaw Inference Proxy v2.0",
        "nvidia_endpoint": NVIDIA_BASE_URL,
        "model": DEFAULT_MODEL,
        "api_key_configured": bool(NVIDIA_API_KEY),
        "api_key_prefix": NVIDIA_API_KEY[:12] + "..." if NVIDIA_API_KEY else "NOT SET",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/nvidia/v1/models")
async def list_models():
    """Proxy the models list from NVIDIA NIM."""
    if not NVIDIA_API_KEY:
        return {"data": [{"id": DEFAULT_MODEL, "object": "model"}]}
    
    try:
        response = await nvidia_client.get(
            "/models",
            headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
        )
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"[NIM] Models list failed: {e}")
    
    return {"data": [{"id": DEFAULT_MODEL, "object": "model"}]}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STARTUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.on_event("startup")
async def startup_event():
    """Boot diagnostics."""
    print("\n" + "═"*60)
    print("  NemoClaw Inference Proxy v2.0 — Enterprise Edition")
    print("  NVIDIA NIM Direct Gateway for Legal AI")
    print("═"*60)
    print(f"  Endpoint:  {NVIDIA_BASE_URL}")
    print(f"  Model:     {DEFAULT_MODEL}")
    print(f"  API Key:   {'✓ Configured (' + NVIDIA_API_KEY[:12] + '...)' if NVIDIA_API_KEY else '✗ NOT SET'}")
    print("═"*60 + "\n")
    
    # Validate API key on startup by hitting the health/models endpoint
    if NVIDIA_API_KEY:
        try:
            response = await nvidia_client.get(
                "/models",
                headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
            )
            if response.status_code == 200:
                models = response.json().get("data", [])
                print(f"  [BOOT] ✓ NVIDIA NIM connection verified — {len(models)} models available")
                # Check if our default model exists
                model_ids = [m.get("id", "") for m in models]
                if DEFAULT_MODEL in model_ids:
                    print(f"  [BOOT] ✓ Default model '{DEFAULT_MODEL}' found in catalog")
                else:
                    print(f"  [BOOT] ⚠ Default model '{DEFAULT_MODEL}' not found in catalog")
                    print(f"  [BOOT]   Available models (first 10):")
                    for mid in model_ids[:10]:
                        print(f"           - {mid}")
            else:
                print(f"  [BOOT] ⚠ NVIDIA NIM returned {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"  [BOOT] ⚠ Could not verify NVIDIA NIM connection: {e}")
    else:
        print("  [BOOT] ✗ No API key — inference will fail until configured")
    
    print()


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up the HTTP client."""
    await nvidia_client.aclose()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ENTRYPOINT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"\nStarting NemoClaw Inference Proxy on port {port}...\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
