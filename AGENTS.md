# Repository Guidelines (SocioSim)

**Always read first:** `docs/specs/specification_stack_and_tools.md`, `README.md`, `CLAUDE.md`.

## Project Snapshot

- Next.js 16 + React 19 + TypeScript + Chakra UI v3 with Panda CSS (zero-runtime, generates `styled-system/` — never edit that folder).
- Supabase provides auth/DB; ADK Agent Service (Python, port 8000) powers interviews.
- UI language is French by default; keep copy/messages in French unless stated otherwise.
- App structure: routes under `src/app/`, shared providers in `src/app/providers.tsx`, global styles in `src/app/globals.css`, reusable components in `src/app/components/`. Assets live in `public/`.

## Development Commands

- `make devrun` (or `npm run dev`) — Panda watch + Next dev server on :3000 for day-to-day work.
- `make lint` / `npm run lint:all` — ESLint + TypeScript checks.
- `npm run build` — runs Panda codegen + Next build; use before releases.
- `make pretty` / `npm run format:fix` — formatting.
- Supabase locally: `supabase start` (or `make start` to boot Supabase + dev server together).

## Coding Style & Conventions

- TypeScript functional components, 2-space indent, prefer double quotes (single quotes only when Chakra props need them).
- Path alias `@/*` for imports; avoid long relative paths.
- Route/file naming: route segments lowercase-with-dashes; utilities camelCase; components PascalCase.
- Do not touch `styled-system/` output. Panda regenerates automatically in dev/build.
- Global input padding is defined in `src/app/globals.css`; avoid per-field padding props unless necessary.

## Chakra UI v3 Rules (not v2)

- Use `gap`/`columnGap`/`rowGap` instead of `spacing`.
- `colorPalette` replaces `colorScheme` on color-aware components.
- Input adornments: `endElement`/`startElement` props instead of `InputRightElement` wrappers.
- Props renamed: `disabled` (not `isDisabled`), `focusable` (not `isFocusable`), etc.
- Check `docs/chakra-v3/*.txt` when unsure; lint/types will catch v2 APIs.

## Testing

- No automated tests yet. Manually exercise new flows in `npm run dev`, especially Supabase interactions. When adding tests later, colocate as `*.test.tsx` near components.

## Commits & PRs

- Default branch: `main`. Commit messages: short, lowercase, imperative (`"add interview lobby screen"`).
- PRs should include: summary, screenshots for UI changes, linked issues, and notes on manual/automated tests. Request review before merging.

## Configuration & Secrets

- Never commit secrets. Keep environment values in `.env.local`; update `.env.local.example` when new vars are required. Ensure Next.js settings align after env changes.

# Changelog

Always update changelog.md for major changes and document them there.