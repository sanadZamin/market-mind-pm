# Market Mind PM

Market Mind PM is a project management workspace with:
- task boards, lists, and Gantt timeline
- project reporting/export
- Excel import with optional LLM-assisted mapping
- team update email notifications

## Monorepo Structure

- `artifacts/pm-tool`: React + Vite frontend app
- `artifacts/api-server`: Express API server
- `lib/db`: shared database schema and Drizzle setup
- `lib/api-spec`: OpenAPI contract
- `lib/api-zod`: generated zod validators/types from API spec
- `lib/api-client-react`: generated API hooks/client used by frontend

## Tech Stack

- Frontend: React, Vite, TanStack Query, Tailwind, Framer Motion
- Backend: Express, Drizzle ORM, PostgreSQL
- Email: Nodemailer (SMTP)
- Excel: `xlsx` + `multer`
- Report export: `jsPDF` (with programmatic Gantt rendering)

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database

## Install

```bash
pnpm install
```

## Run Locally

### 1) API server

```bash
pnpm --filter @workspace/api-server dev
```

### 2) Frontend

```bash
pnpm --filter @workspace/pm-tool dev
```

The frontend reads config from `artifacts/pm-tool/.env` (including `PORT` and `BASE_PATH`).

## Environment Variables

### API (`artifacts/api-server/.env`)

Required core:
- `DATABASE_URL`

Email notifications:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE` (`true`/`false`)
- `EMAIL_FROM`
- `EMAIL_DEBUG` (`true`/`false`, optional)
- `PM_TOOL_BASE_URL` (e.g. `https://market-mind.com/pm`)
- `EMAIL_LOGO_PATH` (optional local path)
- `EMAIL_LOGO_URL` (optional fallback URL)

Excel import LLM mapping:
- `OLLAMA_BASE_URL` (default: `http://149.102.140.178:7869`)
- `OLLAMA_MODEL` (default: `qwen3.5:0.8b`)

### Frontend (`artifacts/pm-tool/.env`)

- `PORT` (dev server port)
- `BASE_PATH` (deployment subpath, e.g. `/pm/`)
- `API_PORT` (optional, local API proxy target; default 8080 in config)

## Qwen LLM Usage

The API includes LLM-assisted Excel mapping in:
- `artifacts/api-server/src/routes/import-excel.ts`

Behavior:
- Reads uploaded Excel rows.
- If deterministic headers are not sufficient, calls Ollama to map rows to task fields.
- Uses `OLLAMA_MODEL` (default `qwen3.5:0.8b`) and `OLLAMA_BASE_URL`.
- Returns normalized tasks for import.

If Ollama/LLM is unavailable, the route falls back to heuristic parsing and still returns usable data.

## Build

```bash
pnpm build
```

## Notes for Subpath Deployments (`/pm`)

- Build frontend with `BASE_PATH=/pm/`.
- Ensure reverse proxy routes:
  - `/pm/` -> frontend
  - `/pm/api/` -> API
- Set `PM_TOOL_BASE_URL` to the public frontend base (e.g. `https://market-mind.com/pm`) so email action links are correct.

