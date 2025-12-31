# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Test Coverage:** Add comprehensive test suite for main interview page (`/interview`) with 16 tests covering authentication, session creation, agent loading, and chat interaction.

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
