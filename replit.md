# Workspace

## Overview

Full-stack project management tool (similar to Linear/Notion) with authentication, projects, tasks, subtasks, blockers, and three views (List, Kanban, Gantt). Uses the **Market Mind visual identity**.

## Brand / Visual Identity

- **Primary color**: Turquoise `#13eac1` (`hsl(169 85% 50%)`)
- **Accent color**: Blue `#23a7e5` (`hsl(199 79% 52%)`)
- **Background**: Deep dark green `#061910` (`hsl(160 65% 5%)`)
- **Font**: Plus Jakarta Sans (Google Fonts)
- **Mode**: Always dark (`<html class="dark">` in index.html)
- **Logo**: `attached_assets/logo_4_1774721132433.png` (used in login, register, sidebar)
- **Auth background**: Pure CSS dark green with radial turquoise/blue glows + subtle grid

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: Token-based (in-memory sessions, reset on server restart), bcryptjs

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (backend)
│   └── pm-tool/            # React + Vite frontend (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Features

- **Authentication**: Login/Register pages, token-based auth (pm_token in localStorage)
- **Dashboard**: Overview stats across all projects
- **Projects**: Create/edit/delete projects with color coding
- **Tasks**:
  - **Board view**: Drag-and-drop Kanban (Todo → In Progress → In Review → Done)
  - **List view**: Table with Title, Status, Priority, Deadline, Owner, Subtasks columns
  - **Timeline view**: SVG Gantt bars + dependency arrows (orange dashed = blocked, green solid = resolved)
- **Subtasks**: Nested tasks with checkbox toggle, progress bar, inline creation (in task detail sheet)
- **Blockers / Dependencies**: Task dependency relationships with visual indicators on cards, in the list, and on the Gantt; managed in task detail sheet
- **Task detail sheet**: Slide-in panel with Owner box, Deadline box (red if overdue), Subtasks section, Blocked By section, Description, Comments
- **Kanban cards**: Priority badge, blocked badge, subtask count, overdue highlight, owner avatar
- **Team members**: User list with assignee support

## Demo Accounts

- `alice@demo.com` / `password123` (admin)
- `bob@demo.com` / `password123`
- `carol@demo.com` / `password123`

## Database Schema

- `users` — authentication + profile
- `projects` — project records (owner, color, status, dates)
- `tasks` — task records (status, priority, assignee, parentTaskId for subtasks, dates, tags, position)
- `task_dependencies` — blocker relationships (taskId, dependsOnTaskId)
- `comments` — task comments

## API Routes

All routes at `/api`:

- `GET /api/auth/me` — current user
- `POST /api/auth/login` — login
- `POST /api/auth/register` — register
- `POST /api/auth/logout` — logout
- `GET/POST /api/projects` — list/create projects
- `GET/PUT/DELETE /api/projects/:id` — get/update/delete project
- `GET/POST /api/projects/:id/tasks` — list/create top-level tasks
- `GET/PUT/DELETE /api/tasks/:id` — get/update/delete task
- `GET/POST /api/tasks/:id/subtasks` — list/create subtasks
- `GET/POST /api/tasks/:id/dependencies` — list/add blockers
- `DELETE /api/tasks/:id/dependencies/:dependsOnId` — remove blocker
- `GET/POST /api/tasks/:id/comments` — list/create comments
- `GET /api/users` — list team members

## Development

```bash
# Run codegen after changing OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes
pnpm --filter @workspace/db run push

# Seed demo data
pnpm --filter @workspace/scripts run seed
```

## Important Notes

- Sessions are **in-memory**: all tokens are cleared on API server restart (demo limitation)
- Gantt dependency arrows: `ROW_STEP=52px`, bars at `top-1.5 h-7`, label column `250px`, day width `40px`
- Only top-level tasks (parentTaskId IS NULL) are returned by the project tasks list endpoint
- Subtasks are fetched separately via `/tasks/:id/subtasks`
