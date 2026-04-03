---
description: How to sync local Windows frontend development with the remote Codespace proxy backend.
---

# Agentic OS Development Convention: The GitHub Sync Bridge

This project utilizes a **Hybrid Execution Model**:
1. **Frontend / React UI Development** occurs natively on the user's Local Windows File System to ensure maximum IDE performance and low-latency edits.
2. **Backend Inference / Fort Knox Proxy** executes securely inside an isolated, containerized GitHub Codespace environment (`musical-bassoon...`) due to strict Python NeMo networking constraints.

## The Sync Protocol
Because the local environment and the cloud container are distinct hard drives, the following protocol MUST be observed whenever making material changes to the application:

### Step 1: Local Engineering
Develop features, refactor React components, and manipulate CSS directly within the local Windows `c:\Projects\NemoC_LAW_AI` directory. You do not need to use browser subagents for simple code-authoring.

### Step 2: Push to Bridge
Once a feature or fix is locally drafted and ready to be tested against the Inference Proxy:
1. Stage the files locally: `git add .`
2. Commit specifically stating the target test: `git commit -m "feat/fix: descriptive summary"`
3. Push to the GitHub bridge: `git push origin main`

### Step 3: Remote Pull & execution
1. Once pushed, either prompt the user or utilize a `browser_subagent` to access the remote Codespace web terminal.
2. Inside the remote terminal, execute: `git pull origin main`
3. If new dependencies were added, execute `npm install` inside the frontend or `pip install` inside the python-proxy.
4. Verify execution by connecting strictly through the forwarded Codespace ports (`5173` for Vite). Do not expect localhost on Windows to connect to the Codespace magically without SSH tunneling. 

**STRICT DIRECTIVE:** 
Never operate under the assumption that a local file save will auto-trigger a Vite Hot Module Replacement (HMR) inside the cloud Codespace. They are entirely oblivious to each other until a `git push` and `git pull` occur. Let Git be the bridge.
