# Repository Guidelines (SocioSim)

**Always read first:** `AGENTS.md`, `CHANGELOG.md`, `Makefile`, `docs/specs/specification_stack_and_tools.md`, `README.md`,

The most recent schema is in `docs/sociosim_public_schema.sql`

## Project Snapshot

- Next.js 16 + React 19 + TypeScript + Chakra UI v3 with Panda CSS (zero-runtime, generates `styled-system/` — never edit that folder).
- Supabase provides auth/DB; ADK Agent Service (Python, port 8000) powers interviews.
- UI language is French by default; keep copy/messages in French unless stated otherwise.
- App structure: routes under `src/app/`, shared providers in `src/app/providers.tsx`, global styles in `src/app/globals.css`, reusable components in `src/app/components/`. Assets live in `public/`.

## Development Commands

See `Makefile`. Common flows:
- `make start` (Supabase + Next.js dev)
- `make dev` (Next.js dev only)
- `make lint` (ESLint + TypeScript)
- `make test` (Vitest with coverage)
- `make format` / `make format-fix`

## Coding Style & Conventions

- TypeScript functional components, 2-space indent, prefer double quotes (single quotes only when Chakra props need them).
- Path alias `@/*` for imports; avoid long relative paths.
- Route/file naming: route segments lowercase-with-dashes; utilities camelCase; components PascalCase.
- Do not touch `styled-system/` output. Panda regenerates automatically in dev/build.
- Global input padding is defined in `src/app/globals.css`; avoid per-field padding props unless necessary.
- Data loading for pages: prefer Next.js API routes backed by the service Supabase client instead of direct client Supabase queries. Avoid gating the entire page on multiple client-side fetches; aim for a single API response or progressive rendering to prevent infinite spinners.

Important: do not implement silent fail. Better the app crashes than obfuscate failures.

## Chakra UI v3 Rules (not v2)

- Use `gap`/`columnGap`/`rowGap` instead of `spacing`.
- `colorPalette` replaces `colorScheme` on color-aware components.
- Input adornments: `endElement`/`startElement` props instead of `InputRightElement` wrappers.
- Props renamed: `disabled` (not `isDisabled`), `focusable` (not `isFocusable`), etc.
- Check `docs/chakra-v3/*.txt` when unsure; lint/types will catch v2 APIs.

## Testing

make test (coverage)

or

make test-ui

## Database

Supabase PostgreSQL 17

Migrations: write `<migration>.sql` files in `supabase/migrations` when needed. Do not run migrations automatically.

## Commits & PRs

- Default branch: `main`. Commit messages: short, lowercase, imperative (`"add interview lobby screen"`).
- PRs should include: summary, screenshots for UI changes, linked issues, and notes on manual/automated tests. Request review before merging.

## Configuration & Secrets

- Never commit secrets. Keep environment values in `.env.local`; update `.env.local.example` when new vars are required. Ensure Next.js settings align after env changes.

# Changelog

Always update changelog.md for major changes and document them there.
