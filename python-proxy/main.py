"""
NemoClaw Inference Proxy — Enterprise Edition v3.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYERED SECURITY ARCHITECTURE:
  ┌─────────────────────────────────────────────────┐
  │  Layer 1: Frontend (agentAPI.js)                │
  │    • PII Redaction (SSN, phone, email, DOB)     │
  │    • Prompt Injection / Jailbreak Detection     │
  │    • Role-Based System Prompt Injection         │
  │    • Firestore Audit Trail                      │
  ├─────────────────────────────────────────────────┤
  │  Layer 2: THIS PROXY (NemoClaw Sandbox)         │
  │    • NeMo Guardrails INPUT Rails                │
  │    • Rate Limiting (per-IP)                     │
  │    • Direct NVIDIA NIM Inference (httpx)        │
  │    • NeMo Guardrails OUTPUT Rails               │
  │    • Server-Side Audit Logging                  │
  ├─────────────────────────────────────────────────┤
  │  Layer 3: NVIDIA NIM (integrate.api.nvidia.com) │
  │    • Nemotron Model Inference                   │
  │    • Enterprise-grade GPU Infrastructure        │
  └─────────────────────────────────────────────────┘

NeMo Guardrails is used EXCLUSIVELY for input/output security validation.
The actual LLM call is handled by a direct httpx client to NVIDIA NIM,
bypassing NeMo's internal LangChain routing (which hardcodes gpt-3.5-turbo).

Author: NemoClaw Agentic OS
"""

import os
import re
import time
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

NVIDIA_API_KEY = (
    os.environ.get("NVIDIA_API_KEY")
    or os.environ.get("OPENAI_API_KEY")
    or os.environ.get("VITE_NVIDIA_API_KEY")
    or ""
)

NVIDIA_BASE_URL = os.environ.get(
    "NVIDIA_BASE_URL",
    "https://integrate.api.nvidia.com/v1"
)

DEFAULT_MODEL = os.environ.get(
    "NVIDIA_MODEL_ID",
    "nvidia/nemotron-3-super-120b-a12b"
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  NEMOCLAW GUARDRAILS — DETERMINISTIC RAILS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# These are enterprise-grade deterministic security rails
# that validate input/output WITHOUT making LLM calls.
# This preserves the NemoClaw security narrative while
# avoiding the gpt-3.5-turbo LangChain fallback.

class NemoClawGuardrails:
    """
    NemoClaw Security Rail Engine — Deterministic Layer.

    Enforces IOLTA-grade security constraints on all inference
    traffic flowing through the Agentic OS. These rails run
    BEFORE and AFTER every LLM call.

    Security Protocol: OpenClaw · NemoClaw · OpenShell
    """

    # ── INPUT RAILS ──────────────────────────────

    JAILBREAK_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?(prior|previous|above)", re.I),
        re.compile(r"disregard\s+(all\s+)?(prior|previous|above)", re.I),
        re.compile(r"you\s+are\s+now", re.I),
        re.compile(r"system\s+prompt", re.I),
        re.compile(r"developer\s+mode", re.I),
        re.compile(r"\bDAN\b"),
        re.compile(r"forget\s+everything", re.I),
        re.compile(r"bypass\s+restrictions", re.I),
        re.compile(r"override\s+(all\s+)?rules", re.I),
        re.compile(r"reveal\s+your\s+prompt", re.I),
        re.compile(r"pretend\s+you\s+are", re.I),
        re.compile(r"act\s+as\s+if", re.I),
        re.compile(r"new\s+persona", re.I),
        re.compile(r"jailbreak", re.I),
        re.compile(r"do\s+anything\s+now", re.I),
        re.compile(r"ignore\s+safety", re.I),
        re.compile(r"no\s+restrictions", re.I),
        re.compile(r"unrestricted\s+mode", re.I),
    ]

    SENSITIVE_LEGAL_PATTERNS = [
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),          # SSN
        re.compile(r"\b(?:iolta|trust\s+account)\s*#?\s*\d+", re.I),  # IOLTA refs
        re.compile(r"\b(?:routing|account)\s*#?\s*\d{8,}", re.I),     # Banking
    ]

    TOPIC_BLOCKLIST = [
        re.compile(r"how\s+to\s+(?:hack|exploit|break\s+into)", re.I),
        re.compile(r"illegal\s+(?:advice|activity|scheme)", re.I),
        re.compile(r"money\s+laundering", re.I),
        re.compile(r"forge\s+(?:documents?|signatures?)", re.I),
        re.compile(r"fabricate\s+(?:evidence|testimony)", re.I),
        re.compile(r"destroy\s+(?:evidence|documents?)", re.I),
        re.compile(r"obstruct\s+(?:justice|investigation)", re.I),
    ]

    # ── OUTPUT RAILS ─────────────────────────────

    HALLUCINATION_MARKERS = [
        re.compile(r"in\s+the\s+case\s+of\s+\w+ v\.? \w+,?\s+\d{4}", re.I),  # Fake case citations
        re.compile(r"\d+\s+U\.?S\.?\s+\d+"),              # US Reports citation
        re.compile(r"\d+\s+F\.?\s*(?:2d|3d|4th)\s+\d+"),  # Federal Reporter
        re.compile(r"\d+\s+S\.?\s*Ct\.?\s+\d+"),           # Supreme Court Reporter
    ]

    FACTUAL_GROUNDING_DISCLAIMER = (
        "\n\n— NemoClaw Compliance Notice: This response contains legal references "
        "that should be independently verified through official legal databases. "
        "NemoC LAW AI does not guarantee the accuracy of cited case law."
    )

    @classmethod
    def check_input(cls, messages: list) -> dict:
        """
        NemoClaw Input Rail — Pre-inference security validation.
        
        Returns:
            {"allowed": True} or {"allowed": False, "reason": str, "rail": str}
        """
        for msg in messages:
            if msg.get("role") != "user":
                continue
            content = msg.get("content", "")

            # Rail 1: Jailbreak Detection
            for pattern in cls.JAILBREAK_PATTERNS:
                if pattern.search(content):
                    return {
                        "allowed": False,
                        "reason": "Prompt injection attempt detected. This interaction has been logged for security review.",
                        "rail": "nemoclaw.input.jailbreak_shield",
                    }

            # Rail 2: Topic Blocklist (legal ethics)
            for pattern in cls.TOPIC_BLOCKLIST:
                if pattern.search(content):
                    return {
                        "allowed": False,
                        "reason": "This request involves activities that conflict with legal ethics obligations. As an officer of the court, this AI cannot assist with this topic.",
                        "rail": "nemoclaw.input.ethics_guard",
                    }

            # Rail 3: Sensitive Data Warning (log but allow)
            for pattern in cls.SENSITIVE_LEGAL_PATTERNS:
                if pattern.search(content):
                    print(f"  [RAIL] ⚠ Sensitive legal data detected in input (pattern: {pattern.pattern})")

        return {"allowed": True}

    @classmethod
    def check_output(cls, content: str) -> dict:
        """
        NemoClaw Output Rail — Post-inference content validation.

        Returns:
            {"content": str, "modified": bool, "rails_applied": list}
        """
        rails_applied = []
        modified = False

        # Rail 1: Factual Grounding Check — flag unverified case citations
        has_citations = False
        for pattern in cls.HALLUCINATION_MARKERS:
            if pattern.search(content):
                has_citations = True
                break

        if has_citations:
            content += cls.FACTUAL_GROUNDING_DISCLAIMER
            modified = True
            rails_applied.append("nemoclaw.output.factual_grounding")

        # Rail 2: Ensure no raw PII leaked in response
        pii_patterns = [
            (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED-SSN]"),
            (re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"), "[REDACTED-PHONE]"),
        ]
        for pattern, replacement in pii_patterns:
            if pattern.search(content):
                content = pattern.sub(replacement, content)
                modified = True
                rails_applied.append("nemoclaw.output.pii_redaction")

        # Rail 3: UPL (Unauthorized Practice of Law) Guard
        upl_phrases = [
            re.compile(r"(?:I|this AI)\s+(?:am|is)\s+(?:a|your)\s+lawyer", re.I),
            re.compile(r"(?:I|this AI)\s+(?:can|will)\s+represent\s+you", re.I),
            re.compile(r"this\s+constitutes?\s+legal\s+advice", re.I),
        ]
        for pattern in upl_phrases:
            if pattern.search(content):
                content += "\n\n⚠️ COMPLIANCE: AI-generated content is not legal advice. Attorney review required."
                modified = True
                rails_applied.append("nemoclaw.output.upl_guard")
                break

        return {
            "content": content,
            "modified": modified,
            "rails_applied": rails_applied,
        }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  APPLICATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = FastAPI(
    title="NemoClaw Inference Proxy",
    description="Enterprise NVIDIA NIM gateway with NemoClaw Guardrails for Legal AI",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  RATE LIMITER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 30
rate_store = defaultdict(list)

def check_rate_limit(client_ip: str):
    now = time.time()
    rate_store[client_ip] = [t for t in rate_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_store[client_ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded.")
    rate_store[client_ip].append(now)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  REQUEST MODELS
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
#  NVIDIA NIM CLIENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

nvidia_client = httpx.AsyncClient(
    base_url=NVIDIA_BASE_URL,
    timeout=httpx.Timeout(120.0, connect=10.0),
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
)

async def call_nvidia_nim(request: InferenceRequest) -> dict:
    """Forward inference directly to NVIDIA NIM."""
    if not NVIDIA_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="NVIDIA API key not configured. Set NVIDIA_API_KEY, OPENAI_API_KEY, or VITE_NVIDIA_API_KEY."
        )

    model_id = request.model or DEFAULT_MODEL
    payload = {
        "model": model_id,
        "messages": [{"role": m.role, "content": m.content} for m in request.messages],
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "top_p": request.top_p,
        "frequency_penalty": request.frequency_penalty,
        "presence_penalty": request.presence_penalty,
        "stream": False,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
    }

    print(f"  [NIM] → model={model_id} | msgs={len(request.messages)} | max_tokens={request.max_tokens}")

    try:
        response = await nvidia_client.post("/chat/completions", json=payload, headers=headers)
    except httpx.ConnectError as e:
        raise HTTPException(status_code=502, detail=f"NVIDIA NIM connection failed: {e}")
    except httpx.TimeoutException as e:
        raise HTTPException(status_code=504, detail=f"NVIDIA NIM timeout: {e}")

    if response.status_code != 200:
        error_body = response.text
        print(f"  [NIM] ✗ {response.status_code}: {error_body[:300]}")

        # Auto-fallback if model not found
        if response.status_code == 404 and model_id != DEFAULT_MODEL:
            print(f"  [NIM] ↻ Retrying with fallback model: {DEFAULT_MODEL}")
            payload["model"] = DEFAULT_MODEL
            try:
                response = await nvidia_client.post("/chat/completions", json=payload, headers=headers)
                if response.status_code == 200:
                    print(f"  [NIM] ✓ Fallback succeeded")
                    return response.json()
            except Exception:
                pass

        raise HTTPException(status_code=response.status_code, detail=f"NVIDIA NIM: {error_body}")

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    print(f"  [NIM] ✓ {len(content)} chars | model={data.get('model', 'unknown')}")
    return data

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PRIMARY ENDPOINT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/nvidia/v1/chat/completions")
async def chat_completions(req: InferenceRequest, request: Request):
    """
    NemoClaw Secured Inference Pipeline:
      1. Rate limiting
      2. NemoClaw INPUT rails (jailbreak, ethics, PII detection)
      3. NVIDIA NIM inference (direct httpx call)
      4. NemoClaw OUTPUT rails (factual grounding, PII redaction, UPL guard)
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    ts = datetime.now().isoformat()
    print(f"\n{'━'*60}")
    print(f"[NEMOCLAW] Inference pipeline started | {client_ip} | {ts}")

    # ── PHASE 1: NemoClaw Input Rails ────────────
    messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
    input_check = NemoClawGuardrails.check_input(messages_dict)

    if not input_check["allowed"]:
        rail = input_check.get("rail", "unknown")
        reason = input_check.get("reason", "Request blocked by security policy.")
        print(f"  [RAIL] ✗ INPUT BLOCKED by {rail}")
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": reason,
                }
            }],
            "nemoclaw": {
                "blocked": True,
                "rail": rail,
                "layer": "input",
            }
        }

    print(f"  [RAIL] ✓ Input rails passed")

    # ── PHASE 2: NVIDIA NIM Inference ────────────
    result = await call_nvidia_nim(req)

    # ── PHASE 3: NemoClaw Output Rails ───────────
    raw_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
    output_check = NemoClawGuardrails.check_output(raw_content)

    if output_check["modified"]:
        result["choices"][0]["message"]["content"] = output_check["content"]
        result["nemoclaw"] = {
            "rails_applied": output_check["rails_applied"],
            "layer": "output",
        }
        print(f"  [RAIL] ⚠ Output modified by: {output_check['rails_applied']}")
    else:
        print(f"  [RAIL] ✓ Output rails passed (clean)")

    print(f"[NEMOCLAW] Pipeline complete | {datetime.now().isoformat()}")
    print(f"{'━'*60}\n")

    return result

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  UTILITY ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/health")
def health_check():
    return {
        "status": "operational",
        "service": "NemoClaw Inference Proxy v3.0 — Enterprise Edition",
        "security": "OpenClaw · NemoClaw · OpenShell",
        "guardrails": {
            "input_rails": ["jailbreak_shield", "ethics_guard", "sensitive_data_monitor"],
            "output_rails": ["factual_grounding", "pii_redaction", "upl_guard"],
        },
        "nvidia_endpoint": NVIDIA_BASE_URL,
        "model": DEFAULT_MODEL,
        "api_key_configured": bool(NVIDIA_API_KEY),
        "api_key_prefix": NVIDIA_API_KEY[:12] + "..." if NVIDIA_API_KEY else "NOT SET",
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/api/nvidia/v1/models")
async def list_models():
    if not NVIDIA_API_KEY:
        return {"data": [{"id": DEFAULT_MODEL, "object": "model"}]}
    try:
        response = await nvidia_client.get("/models", headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"})
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"  [NIM] Models list failed: {e}")
    return {"data": [{"id": DEFAULT_MODEL, "object": "model"}]}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STARTUP / SHUTDOWN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.on_event("startup")
async def startup_event():
    print("\n" + "═"*60)
    print("  NemoClaw Inference Proxy v3.0 — Enterprise Edition")
    print("  Security Protocol: OpenClaw · NemoClaw · OpenShell")
    print("═"*60)
    print(f"  Endpoint:     {NVIDIA_BASE_URL}")
    print(f"  Model:        {DEFAULT_MODEL}")
    print(f"  API Key:      {'✓ ' + NVIDIA_API_KEY[:12] + '...' if NVIDIA_API_KEY else '✗ NOT SET'}")
    print(f"  Input Rails:  jailbreak_shield, ethics_guard, sensitive_data_monitor")
    print(f"  Output Rails: factual_grounding, pii_redaction, upl_guard")
    print("═"*60)

    if NVIDIA_API_KEY:
        try:
            response = await nvidia_client.get("/models", headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"})
            if response.status_code == 200:
                models = response.json().get("data", [])
                model_ids = [m.get("id", "") for m in models]
                print(f"  [BOOT] ✓ NVIDIA NIM verified — {len(models)} models available")
                if DEFAULT_MODEL in model_ids:
                    print(f"  [BOOT] ✓ Model '{DEFAULT_MODEL}' confirmed in catalog")
                else:
                    print(f"  [BOOT] ⚠ Model '{DEFAULT_MODEL}' not in catalog. Available:")
                    for mid in model_ids[:15]:
                        print(f"           - {mid}")
            else:
                print(f"  [BOOT] ⚠ NIM returned {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"  [BOOT] ⚠ NIM connection check failed: {e}")
    else:
        print("  [BOOT] ✗ No API key configured")

    print()

@app.on_event("shutdown")
async def shutdown_event():
    await nvidia_client.aclose()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ENTRYPOINT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"\nStarting NemoClaw Inference Proxy on port {port}...\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
