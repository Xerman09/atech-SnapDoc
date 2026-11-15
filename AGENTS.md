# SnapDoc (`scanner_app`) — Agent Guidelines

- **Offline-First & Local-Only**: Never add cloud telemetry, analytics, or unrequested backend dependencies. All scanning, filtering, storage, and PDF export must work 100% offline.
- **System Documentation**: Every feature or code change MUST update `docs/SYSTEM_DOCS.md` and `docs/CHANGELOG.md` (see `.agents/rules/system-documentation.md`).
- **Date Display**: Never render raw database timestamps in the UI; always use `src/utils/dateFormat.ts` (see `.agents/rules/date-formatting.md`).
- **Theming & Accessibility**: Support both Light Mode and Dark Mode using the theme tokens in `src/theme/`, maintain WCAG AA contrast, and include `accessibilityLabel` on interactive controls.
- **Security**: Use parameterized SQLite queries, validate all inputs with `zod`, sanitize filenames, restrict imported image types/sizes, and never commit secrets or API keys.
