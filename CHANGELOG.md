# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Test Coverage:** Add comprehensive test suite for main interview page (`/interview`) with 16 tests covering authentication, session creation, agent loading, and chat interaction.
- **Auth Flow Tests:** Add tests for registration, login, password reset, and logout with invalid input coverage.
- **Guide Page:** Add `/guide-entretien` rendered from `public/docs/guide_entretien.md` and link it in the header.
- **Auth Emails:** Send signup confirmations and password reset emails via Supabase Auth (Inbucket in local dev).
### Changed
- **Tests:** Auth flow tests now pass with bad input assertions and coverage reporting.
- **Interview Intro:** Render the new interview intro from `public/docs/guide_entretien_court.md`.
- **Interview Intro:** Make the guide collapsible for faster starts.
- **Interview Intro:** Show only the first line by default with click-to-expand text.
- **Interview Intro:** Allow font size settings to scale the intro text.
- **Auth Redirects:** Update local Supabase SMTP host and redirect allowlist to support email-based flows.
- **Dashboard:** Split the dashboard into dedicated Personnas and Mes entretiens pages.
- **Agents:** Add `public.agent_prompts` for versioned system prompts and seed a template persona in Supabase.
- **Personnas:** Replace the prompt textarea with a TipTap editor that saves markdown.

### Changed
- **Agents Data Source:** Load agent_name and description from `public.agents` instead of static in-code definitions.
- **Theme System:** Move to Chakra semantic tokens with light/dark mode support and header color-mode toggle.
- **Interview Input Layout:** Keep chat input pinned and full-width during resume and new interview flows.

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

### Categories
- **Added:** New features and test coverage
- **Changed:** Changes to existing functionality
- **Fixed:** Bug fixes
- **Deprecated:** Soon-to-be removed features
- **Removed:** Removed features
- **Security:** Security improvements and fixes
