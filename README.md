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
- Email: Resend (HTTP API when `RESEND_API_KEY` is set) or Nodemailer (SMTP)
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

**Spring Boot API** (`artifacts/api-server-springboot`, e.g. Docker `springapi`): uses **JavaMailSender** (SMTP). For [Resend](https://resend.com/docs/send-with-smtp), set relay credentials plus a verified `EMAIL_FROM`:

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=465` (implicit TLS) or `587` (STARTTLS); align with `SMTP_SECURE`
- `SMTP_USER=resend`
- `SMTP_PASS` **or** `RESEND_API_KEY` — same secret (`spring.mail.password` falls back to `RESEND_API_KEY` when `SMTP_PASS` is unset)
- `SMTP_SECURE` (`true` for port 465 is typical)
- `EMAIL_FROM` — must use an address on a domain [verified in Resend](https://resend.com/docs)
- `EMAIL_ENABLED`, `EMAIL_DEBUG`, `PM_TOOL_BASE_URL` (or `PUBLIC_APP_URL` / `FRONTEND_URL`), `EMAIL_LOGO_*` — same as below where applicable

**Express API** (`artifacts/api-server`): optional **Resend HTTP SDK** — set `RESEND_API_KEY` + `EMAIL_FROM` (skips SMTP when configured). Otherwise use SMTP via Nodemailer:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM`
- `EMAIL_DEBUG` (`true`/`false`, optional)
- `PM_TOOL_BASE_URL` — public SPA base for email links (e.g. `https://market-mind.com/pm`). Same resolution: `PUBLIC_APP_URL` or `FRONTEND_URL` if `PM_TOOL_BASE_URL` is unset (Express and Spring).
- `EMAIL_LOGO_PATH` (optional local path)
- `EMAIL_LOGO_URL` (optional fallback URL)

AI features (description rephrase + Excel import mapping):
- `OPENAI_API_KEY` (required for AI features)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (optional, default: `https://api.openai.com/v1`; any OpenAI-compatible endpoint works)

### Frontend (`artifacts/pm-tool/.env`)

- `PORT` (dev server port)
- `BASE_PATH` (deployment subpath, e.g. `/pm/`)
- `API_PORT` (optional, local API proxy target; default 8080 in config)
- `VITE_PM_SIGNIN_PATH` (optional, build-time path segment for sign-in; default `mm-workbench`, so sign-in is at `/${segment}` under your app base—there is no public `/login` route)

## OpenAI Usage

The API uses OpenAI chat completions for:
- **AI Rephrase** of project and task descriptions
- **Excel import mapping** when spreadsheet headers can't be matched deterministically

Behavior:
- Reads uploaded Excel rows.
- If deterministic headers are not sufficient, calls OpenAI to map rows to task fields.
- Uses `OPENAI_MODEL` (default `gpt-4o-mini`) with `OPENAI_API_KEY`.
- Returns normalized tasks for import.

If OpenAI is unavailable, Excel import falls back to heuristic parsing and still returns usable data; AI Rephrase returns an error message to the UI.

## Build

```bash
pnpm build
```

## Notes for Subpath Deployments (`/pm`)

- Build frontend with `BASE_PATH=/pm/`.
- Ensure reverse proxy routes:
  - `/pm/` -> frontend
  - `/pm/api/` -> API
- Set `PM_TOOL_BASE_URL` (or `PUBLIC_APP_URL`) to the public frontend base (e.g. `https://market-mind.com/pm`) so email action links are not `localhost`. With Docker Compose, add these in `docker-compose.override.yml` or your deployment env; the default compose file no longer forces a localhost URL into the API container.

