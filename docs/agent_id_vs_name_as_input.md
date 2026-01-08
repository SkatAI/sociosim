# ADK Input: `agent_id` vs `agent_name`

## Current behavior
- Requests to ADK (`/run`, `/run_sse`) include `agent_name`, not `agent_id`.
- `AdkClient.createSession` stores `state.agent_name`.
- `AdkRequest` allows `agent_name` (see `src/types/adk.ts`).
- `/api/sessions` accepts `agent_name` and resolves it to `agent_id` for DB writes.
- `/api/chat` fetches the agent name from DB and sends `agent_name` to ADK.

**Key files:**
- `src/lib/adkClient.ts` (createSession state, run/run_sse body)
- `src/types/adk.ts` (AdkRequest shape)
- `src/app/api/sessions/route.ts` (expects `agent_name`)
- `src/app/api/chat/route.ts` (sends `agent_name`)

## Desired behavior
Use `agent_id` as the input to ADK instead of `agent_name`.

## Required changes
### 1) ADK contract
- Update ADK service to accept `agent_id` in session state and in run/run_sse requests.
- If the ADK service still needs the name internally, it should resolve it server‑side (using its own data store or a lookup).

### 2) Types and client payloads
- Update `AdkRequest` to carry `agent_id` (and remove or deprecate `agent_name`).
- Update `AdkClient.createSession` to pass `state.agent_id`.
- Update `AdkClient.streamMessage` and `AdkClient.sendMessage` callers to provide `agent_id`.

Files:
- `src/types/adk.ts`
- `src/lib/adkClient.ts`

### 3) API routes
- `/api/sessions`: accept `agent_id` as input (instead of `agent_name`), validate it, and use it directly.
- `/api/chat`: load `agent_id` from the interview and pass it to ADK.

Files:
- `src/app/api/sessions/route.ts`
- `src/app/api/chat/route.ts`

### 4) UI + BFF callers
Any place that currently posts `agent_name` should pass `agent_id`:
- `src/app/personnas/page.tsx`
- `src/app/dashboard/DashboardClient.tsx`

### 5) Backwards compatibility (optional)
If you want a soft rollout:
- Keep both fields temporarily: accept `agent_id` preferred, fall back to `agent_name`.
- Deprecate `agent_name` once ADK supports `agent_id`.

## Notes
- `agent_id` is already the canonical key in DB (`interviews.agent_id`, `agents.id`).
- Using `agent_id` avoids name collisions and makes renames safe.
