import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("VITE_NVIDIA_API_KEY")
url = "https://integrate.api.nvidia.com/v1/chat/completions"

models_to_test = [
    "meta/llama3-70b-instruct",
    "meta/llama3-8b-instruct",
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.1-70b-instruct",
    "nvidia/nemotron-4-340b-instruct",
    "google/gemma-7b-it",
    "mistralai/mixtral-8x7b-instruct-v0.1"
]

for model in models_to_test:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 10
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    print(f"Testing {model}: HTTP {response.status_code}")
    if response.status_code != 200:
        print(f"  Error: {response.text[:100]}")
    else:
        print(f"  SUCCESS!")
