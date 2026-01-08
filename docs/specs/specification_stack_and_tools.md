# Features

SocioSim is a French-language web app where sociology students practice interviews with AI personnas.

Current capabilities:
- Authentication: registration, login, password reset, email confirmation (Supabase Auth + Inbucket in local dev)
- Personnas: list published personnas, create a new personna, edit system prompt versions
- Interviews: start a new interview from a personna, resume past interviews
- Guide: interview guide page and a help dialog on the interview screen

## Accounts

- Users live in `public.users` with roles `student`, `teacher`, `admin`
- Current UI is student-focused (no dedicated teacher/admin dashboards yet)

## LLMs / ADK Agent Service

- ADK Agent Service (Python, port 8000) powers the interview conversation
- Next.js API routes create sessions (`/api/sessions`) and stream chat (`/api/chat`) via SSE
- Messages and token usage are stored in Supabase

## Data schema (public)

- `agents`, `agent_prompts` (versioned system prompts)
- `interviews`, `sessions`, `user_interview_session`
- `messages`, `interview_usage`
- `users`

See `docs/sociosim_public_schema.sql` for details.

## Front end

- Home, login, register, password reset, profile
- Personnas list (`/personnas`), create (`/personnas/new`), edit (`/personnas/[id]/edit`)
- Interview start (`/interview`) and resume (`/interview/[id]`)
- Guide page (`/guide-entretien`)

## Testing

- Unit/integration tests with Vitest
- Playwright E2E scaffolding exists in `e2e/` but is not the primary test harness

## Future / Not Implemented Yet

- Teacher/admin dashboards and feedback workflows
- Moderation, quotas, and provider rate limiting
- Advanced interview analysis (teacher/AI feedback, coding tables)
- Expanded content models (themes, avatars, theory frameworks)
- Accessibility and i18n beyond French

## Tech stack

- Next.js 16 + React 19 + TypeScript
- Chakra UI v3 + Panda CSS
- Supabase (auth, database)
- ADK Agent Service (Python)
- SSE for streaming chat responses
