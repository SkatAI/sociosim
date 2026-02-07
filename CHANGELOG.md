# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Test Coverage:** Add comprehensive test suite for main interview page (`/interview`) with 16 tests covering authentication, session creation, agent loading, and chat interaction.
- **Google Docs Export:** Add OAuth flow and export pipeline to create interview documents in Google Docs.
- **Auth Flow Tests:** Add tests for registration, login, password reset, and logout with invalid input coverage.
- **Guide Page:** Add `/guide-entretien` rendered from `public/docs/guide_entretien.md` and link it in the header.
- **Auth Emails:** Send signup confirmations and password reset emails via Supabase Auth (Inbucket in local dev).
- **Auth Email Template:** Add a custom HTML template for password reset emails.
- **User Management:** Add `/manage-users` page with a user list and API endpoint.
- **User Invites:** Add email-based invitations from `/manage-users`.
- **User Status:** Allow banning/unbanning users from the manage users list.
- **User Roles:** Allow toggling user roles directly from the manage users list.
- **Interview Export:** Add server-side PDF exports with the system prompt included.
- **Personnas:** Add a creation flow with a prefilled prompt template and redirect to the editor.
- **Personnas Admin Controls:** Add agent activation toggle on personna cards with admin-only access, icon-based status, and toast feedback.
- **Personnas List:** Split active and inactive agents into separate sections and hide interview actions for inactive agents.
- **Dashboard Filters:** Only show interviews for active agents.
- **Auth Admin Flag:** Expose `user_admin` in auth context and gate the manage users link + redirect non-admins.
- **Footer:** Add Université Gustave Eiffel footer with logo and legal/contact links.
### Changed
- **Interviews Route:** Rename `/dashboard` to `/interviews`.
- **Admin Interviews:** Admins can view all interviews without resuming someone else’s session.
- **Tests:** Auth flow tests now pass with bad input assertions and coverage reporting.
- **Interview Layout:** Extract shared interview layout and hooks to reduce duplication across interview pages.
- **Interview Intro:** Render the new interview intro from `public/docs/guide_entretien_court.md`.
- **Interview Intro:** Replace the collapsible guide with a header help link that opens a dialog.
- **Interview Intro:** Allow font size settings to scale the intro text.
- **Auth Redirects:** Update local Supabase SMTP host and redirect allowlist to support email-based flows.
- **Dashboard:** Split the dashboard into dedicated Personnas and Mes entretiens pages.
- **Agents:** Add `public.agent_prompts` for versioned system prompts and seed a template persona in Supabase.
- **Personnas:** Replace the prompt textarea with a TipTap editor that saves markdown.
- **ADK Contract:** Send `agent_id` (instead of `agent_name`) in ADK session/run requests and accept `agent_id` in `/api/sessions`.
- **Personnas:** Add prompt history selector on `/personnas/[id]/edit` to load and edit previous versions.
- **Users:** Allow authenticated reads of user profiles for prompt history labels.
- **Personnas:** Filter the list to `active` agents and track prompt availability on each card.
- **Personnas:** Switch filtering to `is_template=false` for listing agents.
- **Interview Sidebar:** Refresh the header layout with icon-only actions and agent details in the sidebar.
- **Interview History:** Use agent IDs for history filters and links across personnas and interviews.
- **Interview Tokens:** Rely exclusively on ADK `usageMetadata` (`promptTokenCount`/`candidatesTokenCount`) for token usage storage.
- **Icon Buttons:** Add tooltips across icon-only actions for clearer affordances.
- **Personnas Actions:** Align card actions with the interview sidebar styling and update prompt/admin controls.
- **Personnas Validation:** Add Cauldron prompt review with sidebar feedback on create/edit and block publishing when invalid.
### Fixed
- **Chakra Buttons:** Replace invalid `variant="link"` usage with Chakra v3-compatible variants.
- **Next Config:** Move `outputFileTracingIncludes` to the top-level Next.js config.
- **Auth Resilience:** Add shared timeout handling for auth and registration flows to prevent infinite spinners.
- **Auth Concurrency:** Centralize client auth calls behind a serialized auth service to avoid Supabase auth deadlocks.
- **Client DB Calls:** Move personna edits/creation and interview agent lookups to API routes to avoid auth-client hangs.
- **Registration Guard:** Block banned users from re-registering via email aliases.
- **Interview History:** Stabilize history visibility by using server-computed message counts and chunked queries to avoid URI length errors.
- **Interview Summary:** Include agent descriptions in interview summaries for sidebar context.

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
