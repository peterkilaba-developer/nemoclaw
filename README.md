# NemoC LAW AI

NemoC LAW AI is an agentic practice-management operating system for law firms. It combines a secure firm dashboard, matter workspaces, client portals, billing workflows, AI agent orchestration, and operational dashboards for intake, litigation support, client communications, marketing, and firm administration.

## Production Scope

- React 19 + Vite web application.
- Firebase Auth, Firestore, Hosting, and Cloud Functions.
- Stripe billing and checkout integration.
- SendGrid, Twilio, LinkedIn/X, Google Maps, NVIDIA/NemoClaw, and enrichment-provider integrations through server-side functions where possible.
- Dual dashboard experience:
  - `Classic` mode for the original operational interface.
  - `Command` mode for the ChatGPT/macOS-style practice command interface.

## Repository Layout

```text
src/                 React application, routes, components, contexts, and services
src/pages/           Public pages, dashboard pages, matter workspaces, admin screens
src/lib/             Firebase, agent, billing, enrichment, security, and integration services
functions/           Firebase Cloud Functions and provider gateways
public/              Logos, media, SEO files, and static assets
scripts/             Operational migration, readiness, seed, and agent activation scripts
python-proxy/        Python proxy service for auxiliary integrations
agent-prompts/       Internal agent prompt definitions
_agents/             Internal workflow documentation
```

## Local Development

Install dependencies:

```bash
npm ci
cd functions && npm ci && cd ..
```

Create environment files from the examples:

```bash
cp .env.example .env
cp functions/.env.example functions/.env.nemoc-law-ai
```

Run the web app:

```bash
npm run dev
```

Run production checks:

```bash
npm run lint
npm run build
```

Run Firebase Functions locally:

```bash
cd functions
npm run serve
```

## Environment Variables

Client-side variables must start with `VITE_` and should only contain public browser-safe values. Provider secrets belong in Firebase Functions environment configuration or the local `functions/.env.nemoc-law-ai` file.

Never commit real `.env` files, Firebase cache files, local debug output, or generated payload dumps.

## Deployment

Build and deploy through Firebase:

```bash
npm run build
firebase deploy
```

Deploy functions only:

```bash
cd functions
npm run deploy
```

## Quality Gate

Before opening a pull request or deploying:

```bash
npm run lint
npm run build
```

For changes touching Firebase Functions, also run the relevant emulator or function-level smoke checks.

## Security Notes

- Do not place provider API keys in front-end code unless they are explicitly public publishable keys.
- Keep privileged provider calls behind Firebase Functions.
- Rotate any credential that was ever committed to Git history before making a repository public.
- Review Firestore rules and function logs before production rollout.

## Ownership

This repository is prepared for `peterkilaba-developer/nemoclaw`.
