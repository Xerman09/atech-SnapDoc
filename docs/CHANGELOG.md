# Changelog

All notable changes to **SnapDoc (`scanner_app`)** will be documented in this file.

## [Unreleased] — Nov 15, 2026
### Added
- **Phase 2: Brand Identity, Logo & Legal/Compliance Foundation**:
  - Generated custom **SnapDoc** app icon, adaptive Android icons, monochrome icon, splash icon, and favicon in `assets/`.
  - Added `src/components/BrandHeader.tsx` with accessible logo + wordmark.
  - Added offline legal & business documents in `src/constants/legal.ts` (Privacy Policy, Terms of Service, Refund Policy, Cookie Policy, Business Details).
  - Added `src/screens/OnboardingConsentScreen.tsx` (unchecked-by-default policy & 13+ age consent gate, zero dark patterns).
  - Added `src/screens/LegalDocumentScreen.tsx` and `src/screens/SettingsScreen.tsx` (Theme selector, Legal links, and one-tap "Delete All Local Data & Scans").

### Phase 1 (Completed)
- **Phase 1 Initialization**:
  - Created Antigravity workspace agent rules in `.agents/rules/system-documentation.md`, `.agents/rules/date-formatting.md`, and `AGENTS.md`.
  - Created `docs/SYSTEM_DOCS.md` and `docs/CHANGELOG.md` for ongoing feature and change tracking.
  - Initialized React Native (Expo SDK 58 + TypeScript) project structure in `scanner_app`.
  - Implemented Light Mode & Dark Mode `ThemeProvider` (`src/theme/colors.ts`, `src/theme/ThemeContext.tsx`) with WCAG AA palettes and updated `app.json` (`userInterfaceStyle: "automatic"`, name `"SnapDoc"`).
  - Implemented centralized human-readable date utilities (`src/utils/dateFormat.ts`) and shared scanner types (`src/types/scanner.ts`).
  - Hardened `.gitignore` to exclude `.env` and `.env.*` secret files.
