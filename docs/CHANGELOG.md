# Changelog

All notable changes to **SnapDoc (`scanner_app`)** will be documented in this file.

## [Unreleased] — Nov 15, 2026
### Added
- **Phase 1 Initialization**:
  - Created Antigravity workspace agent rules in `.agents/rules/system-documentation.md`, `.agents/rules/date-formatting.md`, and `AGENTS.md`.
  - Created `docs/SYSTEM_DOCS.md` and `docs/CHANGELOG.md` for ongoing feature and change tracking.
  - Initialized React Native (Expo SDK 58 + TypeScript) project structure in `scanner_app`.
  - Implemented Light Mode & Dark Mode `ThemeProvider` (`src/theme/colors.ts`, `src/theme/ThemeContext.tsx`) with WCAG AA palettes and updated `app.json` (`userInterfaceStyle: "automatic"`, name `"SnapDoc"`).
  - Implemented centralized human-readable date utilities (`src/utils/dateFormat.ts`) and shared scanner types (`src/types/scanner.ts`).
  - Hardened `.gitignore` to exclude `.env` and `.env.*` secret files.
