# Over-Complexity Patterns (Simplicity Guide)

This document lists patterns that indicate the codebase is becoming too complex
for a low-traffic POC. The goal is to keep the app simple, readable, and easy to
evolve quickly.

## Technical Context

- Next.js 16 (App Router), React 19, TypeScript
- Chakra UI v3 + Panda CSS
- Supabase (auth + Postgres + RLS)
- ADK Agent Service (Python) via API routes + SSE

## Over-Complexity Patterns (by layer)

### Next.js / App Router

- Double data-fetching pipelines (Server Components + API routes + client fetch)
  for simple reads/writes.
- Multiple routes/handlers for the same need (e.g., API route + server action +
  custom hook) without a clear payoff.
- Advanced caching/ISR/SSR for pages that are simple and low traffic.
- Custom middleware or routing logic for basic redirects.

### React / UI

- Many global Context Providers for state that is local to one page.
- Component abstractions that only pass props through (unnecessary indirection).
- Duplicated local state (same data in multiple hooks without clear sync).
- Heavy state management patterns (Redux, multi-store Zustand) for a POC.
- Schema-driven UI or form builders when a simple form is enough.

### TypeScript

- Deep generic abstractions (nested utility types) for simple data shapes.
- "Magic" types that obscure the real data (too many mappers).
- Over-typing Supabase data with DTO/VO layers everywhere.

### Supabase / Data

- Repository pattern + services + adapters for simple CRUD.
- Overly fine-grained RLS before the tables are stable.
- Triggers, SQL functions, or RPCs for trivial operations.
- Duplicate sources of truth (local cache, derived tables, logs + state).

### API Routes / ADK Integration

- BFF re-implementing logic the ADK service already provides.
- Internal event bus or complex event systems for linear message flows.
- Retry/backoff/circuit breakers without a real need.
- Multiple "clients" and wrappers for a single endpoint.

### Infra / Tooling

- Docker/CI/build steps/scripts duplicated for the same outcome.
- Advanced telemetry or logging (traces, spans) for a POC.
- Service splitting (microservices) when one app is enough.

## General Smells

- Files > 300 lines without a clear reason.
- Functions with more than one business responsibility.
- 3+ levels of indirection to reach a simple operation.
- Lots of glue code between layers that could be merged.
- Abstractions before 2-3 concrete usages exist.
- Too much configuration for a single page or form.

## Simplification Heuristics

- Prefer one layer per need (UI -> API -> DB) as long as it works.
- Favor concrete, readable components over abstractions.
- Keep schemas and types close to the data (avoid extra mapping).
- Add complexity only when a real problem appears.
