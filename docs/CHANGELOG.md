# Changelog

All notable changes to **SnapDoc (`scanner_app`)** will be documented in this file.

## [Unreleased] — Nov 15, 2026
### Changed (UI/UX Upgrade)
- Upgraded the visual design system (`src/theme/colors.ts`) to an **Architectural Paper (Light)** and **Obsidian Studio (Dark)** palette with WCAG AA contrast.
- Installed `@expo/vector-icons` and added `src/components/StudioShell.tsx` for responsive centered studio framing on desktop/web and full-width mobile layout.
- Redesigned `BrandHeader.tsx`, `OnboardingConsentScreen.tsx`, `App.tsx`, `SettingsScreen.tsx`, `LegalDocumentScreen.tsx`, `DocumentDetailScreen.tsx`, and `ExportScreen.tsx` with grouped hairline lists, segmented controls, crisp vector icons, and refined typographic hierarchy.

### Fixed (QA Audit)
- Added `metro.config.js` with `unstable_enablePackageExports = false` to fix Metro Web `tslib.default` (`__extends`) runtime crash.
- Fixed binary SHA-256 checksum verification in `src/services/update/inAppUpdater.ts` to use `Crypto.digest(SHA256, Uint8Array)` instead of UTF-8 string hashing.
- Added clean Web (`Platform.OS === 'web'`) fallbacks for local storage (`src/services/storage/webDbFallback.ts`, `database.ts`, `securePrefs.ts`, `localFiles.ts`), image processing (`imagePipeline.ts`), and browser PDF/Image file downloads (`exportService.ts`).

### Added
- **Phase 8: Security Audit, Unit Tests & Verification**:
  - Installed `vitest` and added `test` and `typecheck` scripts in `package.json`.
  - Added unit test suites in `src/__tests__/` covering human-readable date formatting (`dateFormat.test.ts`), file upload/import security validation (`fileValidation.test.ts`), and CV perspective warp + scan filters (`cvAndFilters.test.ts`).
  - Verified `npm audit --audit-level=high` (0 high/critical vulnerabilities), `npm run typecheck`, and `npm test` (3 files, 11/11 tests passing).

### Phase 7 (Completed)
- **Phase 7: In-App Auto-Update & Compressed APK Build**:
  - Installed `expo-intent-launcher`, `expo-crypto`, and `expo-build-properties`.
  - Built HTTPS-only in-app updater (`src/services/update/inAppUpdater.ts`) with `zod` manifest validation, SHA-256 integrity verification, and direct Android APK installation without opening an external browser.
  - Built `src/components/UpdateModal.tsx` and wired silent launch update check + manual Settings update check.
  - Configured `app.json` and `eas.json` for Hermes, ProGuard/R8 (`enableProguardInReleaseBuilds`, `enableShrinkResourcesInReleaseBuilds`), ABI splits (`arm64-v8a`, `armeabi-v7a`), and `usesCleartextTraffic: false`.

### Phase 6 (Completed)
- **Phase 6: Export Engine (Image & PDF)**:
  - Installed `pdf-lib`, `expo-sharing`, and `expo-media-library`.
  - Built offline export engine (`src/services/export/exportService.ts`) supporting single/multi-page PDFs (A4, US Letter, Fit-to-Image, margins, quality presets) and PNG/JPEG image export to device gallery or file share sheet.
  - Built `src/screens/ExportScreen.tsx` and wired Export into `DocumentDetailScreen.tsx` and `App.tsx`.

### Phase 5 (Completed)
- **Phase 5: Multi-Page Workspace & Local Encrypted Storage**:
  - Installed `expo-sqlite` and `expo-secure-store` (SDK 58 compatible).
  - Built parameterized SQLite database layer (`src/services/storage/database.ts`) with `zod` schema validation and input sanitization for documents and multi-page ordering.
  - Built encrypted preferences storage (`src/services/storage/securePrefs.ts`) for consent and theme persistence (`ThemeContext.tsx`).
  - Built `src/screens/DocumentDetailScreen.tsx` for multi-page document viewing, renaming, reordering, adding, editing, and deleting pages.

### Phase 4 (Completed)
- **Phase 4: Edge Detection, Perspective Crop & Scan Filters**:
  - Installed `expo-image-manipulator`, `react-native-svg`, and `jpeg-js`.
  - Added projective homography & bilinear perspective warp (`src/services/cv/geometry.ts`).
  - Added offline Sobel edge & 4-corner document detector (`src/services/cv/edgeDetector.ts`).
  - Added CamScanner-style pixel filter engine (`src/services/filters/scanFilters.ts`): Original, Magic Color, Grayscale, B&W Adaptive Scan, plus Brightness, Contrast, and Sharpness controls.
  - Added offline CV pipeline (`src/services/cv/imagePipeline.ts`) and interactive 4-point crop & enhancement editor (`src/screens/CropAndEnhanceScreen.tsx`).

### Phase 3 (Completed)
- **Phase 3: Document Capture & Safe Import Module**:
  - Installed `expo-camera`, `expo-image-picker`, `expo-file-system`, and `zod` (SDK 58 compatible).
  - Added strict image import validation (`src/utils/fileValidation.ts`): allowlists `jpg`/`jpeg`/`png`/`webp`, enforces 20 MB and 10,000 px limits, and sanitizes filenames.
  - Added app-private local file storage (`src/services/storage/localFiles.ts`) with full data-wipe support.
  - Added live camera capture screen (`src/screens/CaptureScreen.tsx`) with document framing guide, flash/torch toggle, camera flip, and gallery import.
  - Added multi-image gallery importer (`src/services/capture/importImages.ts`) and wired capture/import into `App.tsx` with human-readable dates.

### Phase 2 (Completed)
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
