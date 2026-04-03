# Agentic OS Hyperscale Deployment Runbook

**Instructions for the User:** 
When you are ready to migrate from your GitHub Codespace to a live production environment, start a fresh conversation with your AI engineering agent and simply **copy and paste the entire block below**.

***

### 📋 COPY & PASTE THIS PROMPT TO YOUR NEXT AGENT

> **System Context & Objective**
> You are lead DevOps engineer for "NemoC LAW AI", an Agentic Software-as-a-Service (AgaaS) platform for law firms. We have completed local development inside a GitHub Codespace. It is now time to migrate our dual-stack architecture to a hyperscale production environment.
> 
> **Architecture Overview:**
> 1. **Frontend**: A React 19 application built with Vite, utilizing Firebase (Auth/Firestore) and Stripe (Billing).
> 2. **Backend (Fort Knox)**: A specialized NVIDIA NeMo Guardrails interception proxy written in Python (located in the `python-proxy/` folder). It routes frontend queries through UPL compliance shields before hitting the NVIDIA `nemotron-3-super-120b` NIM endpoints.
> 
> **Your specific deployment tasks are divided into exactly 3 phases. Do not ask me to run commands for you. You must use your terminal control and browser subagents to execute this entire list autonomously. Only stop to ask me a question if an API key is missing or a mandatory authentication window blocks you.**
> 
> ### Phase 1: Autonomous Dockerization & Cloud Run Deploy
> 1. Use your file editing tools to analyze the `python-proxy/` directory and autonomously generate a production-ready `Dockerfile` capable of running `uvicorn` and the NeMo CLI. Write the file automatically.
> 2. Use your terminal execution tool to run the `gcloud run deploy` configuration commands entirely yourself. Push the container to Google Cloud.
> 3. Automatically map the required `NVIDIA_API_KEY` and `OPENAI_API_BASE` into the Cloud Run environment variables.
> 4. Do not proceed until you have successfully generated a live, working Cloud Run URL (e.g., `https://nemoc-proxy-...run.app`).
> 
> ### Phase 2: Autonomous Frontend API Re-routing
> 1. Use your code editing tools to modify `vite.config.js` and `src/lib/agentAPI.js`. Eradicate the local 127.0.0.1 proxies and automatically bind the fetch requests to the secure Cloud Run URL you just deployed.
> 2. Automatically generate the `.env.production` build file with the correct Firebase and Stripe API keys to prepare the React app for compilation.
> 
> ### Phase 3: Autonomous Firebase Production Deploy
> 1. Use your terminal execution tool to run `npm run build` and automatically handle any linter warnings or compilation errors.
> 2. Use your terminal tool to execute `firebase deploy --only hosting`. 
> 3. Verify that the `firebase.json` explicitly intercepts SPA routing so page refreshes do not 404.
> 4. Once `firebase deploy` successfully outputs the live Hosting URL, autonomously ping the URL to check the CORS headers and ensure Fort Knox is securely locked.
> 5. Present me with the final, live URL when the entire ecosystem is 100% finished. Do not ask me to do anything. You are the engineer, go.
