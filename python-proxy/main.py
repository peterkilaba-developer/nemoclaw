import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Safely map keys for OpenAI compatible LangChain NIM requests
if "VITE_NVIDIA_API_KEY" in os.environ and "OPENAI_API_KEY" not in os.environ:
    os.environ["OPENAI_API_KEY"] = os.environ["VITE_NVIDIA_API_KEY"]

if "OPENAI_API_BASE" not in os.environ:
    os.environ["OPENAI_API_BASE"] = "https://integrate.api.nvidia.com/v1"

# NeMo Guardrails
from nemoguardrails import LLMRails, RailsConfig
from langchain.chat_models import ChatOpenAI

app = FastAPI(title="NemoClaw Proxy Service", description="NVIDIA NeMo Guardrails interception layer for Agentic OS")

# Explicitly instantiate the model to bypass NeMo's internal fallback to gpt-3.5-turbo
try:
    main_llm = ChatOpenAI(model_name="nvidia/nemotron-4-340b-instruct", temperature=0.05, max_tokens=1024)
except ImportError:
    from langchain_community.chat_models import ChatOpenAI
    main_llm = ChatOpenAI(model_name="nvidia/nemotron-4-340b-instruct", temperature=0.05, max_tokens=1024)

# Load NeMo configurations from current directory
config = RailsConfig.from_path("./")
rails = LLMRails(config, llm=main_llm)

class Message(BaseModel):
    role: str
    content: str
    
class InferenceRequest(BaseModel):
    model: str
    messages: List[Message]
    max_tokens: int = 1024
    temperature: float = 0.05
    top_p: float = 0.8
    frequency_penalty: float = 0.2

@app.post("/api/nvidia/v1/chat/completions")
async def chat_completions(req: InferenceRequest):
    # We must format the messages to pass into the NeMo Rail generate API
    try:
        # Pass the formatted messages into the Guardrails engine
        # The Guardrails engine takes the conversation array, runs through Input/Colang routing
        # and ultimately connects to the LLM backend (defined in config.yml) if safe.
        
        # Convert pydantic models to dicts
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in req.messages]
        
        # Generate response synchronously via Rails
        response = await rails.generate_async(messages=messages_dict)
        
        # Return standard OpenAI-compatible response format which our firebase agentAPI.js expects
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response.get("content", "I am unable to provide a response at this time.")
                    }
                }
            ]
        }
        
    except Exception as e:
        print(f"Rail Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "Secure Sandbox Active", "layer": "NVIDIA NeMo Guardrails"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"Starting NemoClaw Proxy Sandbox on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
