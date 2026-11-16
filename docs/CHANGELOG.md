# Changelog

All notable changes to **SnapDoc (`scanner_app`)** will be documented in this file.

## [Unreleased] — Nov 16, 2026
### Release v1.0.6 — Despeckle/Bleed Clean, Auto-Orientation & Export Naming Preview
- Added **Despeckle & Bleed-Through Suppression (`Clean Bleed`)** in `src/types/scanner.ts`, `src/services/filters/scanFilters.ts`, and `src/screens/CropAndEnhanceScreen.tsx`.
- Added **Auto-Orientation (`Upright`)** using horizontal/vertical edge-projection variance (`shouldRotate90ForUprightText` in `src/services/cv/edgeDetector.ts`, `autoOrientImageIfNeeded` in `src/services/cv/imagePipeline.ts`, and `Upright` button in `src/screens/CropAndEnhanceScreen.tsx`).
- Added **Custom Export File Naming, Naming Templates & Live Compression Size Estimate** in `src/services/export/exportService.ts` (`estimateExportSizeKb`) and `src/screens/ExportScreen.tsx`.
- Added unit tests for `despeckle` and `shouldRotate90ForUprightText` in `src/__tests__/cvAndFilters.test.ts`, updated `docs/FEATURE_ROADMAP.md`, and bumped app version to `1.0.6` (`android.versionCode: 6`).

### Release v1.0.5 — ID Card A4 Mode, 2-Page Book Spread Split & Eco Print
- Added **ID Card / Two-Sided Scan Mode** in `src/screens/CaptureScreen.tsx` and `composeIdCardA4Page` in `src/services/cv/imagePipeline.ts` to capture Front + Back of an ID and compose both onto a single A4 page (`1240×1754`).
- Added **Book / Two-Page Spread Split (`Split 2P`)** in `src/screens/CropAndEnhanceScreen.tsx`, `splitSpreadPage` in `src/services/cv/imagePipeline.ts`, and `onSaveMultiple` in `App.tsx` to split an open two-page spread down the spine into two separate pages.
- Added **Eco Print** (`eco_print`) preset in `src/types/scanner.ts`, `src/services/filters/scanFilters.ts`, `src/screens/CropAndEnhanceScreen.tsx`, and `src/screens/DocumentDetailScreen.tsx`, plus a unit test in `src/__tests__/cvAndFilters.test.ts`.
- Updated `docs/FEATURE_ROADMAP.md` and bumped app version to `1.0.5` (`android.versionCode: 5`).

### Release v1.0.4 — Corner Magnifier Loupe, Batch Scan, Framing Grid & Scan Presets
- Added a **2.4× Corner Magnifier Loupe** with crosshair in `src/screens/CropAndEnhanceScreen.tsx` when dragging any crop corner handle.
- Added **Multi-Page Batch Scan Mode** (live page thumbnail + counter badge + `Done` action) and a toggleable **3×3 Framing Grid** in `src/screens/CaptureScreen.tsx`.
- Added **Receipt** and **Whiteboard** scan presets plus a **Whiten** (`0..100`) paper-whitening control in `src/types/scanner.ts`, `src/services/filters/scanFilters.ts`, `src/screens/CropAndEnhanceScreen.tsx`, and `src/screens/DocumentDetailScreen.tsx`.
- Added unit tests for `receipt` and `whiteboard` presets in `src/__tests__/cvAndFilters.test.ts` and updated `docs/FEATURE_ROADMAP.md`.
- Bumped app version to `1.0.4` (`android.versionCode: 4`).

## [Unreleased] — Nov 15, 2026
### Added (Feature Roadmap Documentation)
- Created `docs/FEATURE_ROADMAP.md` listing planned offline-first capture, scan-output enhancement, and PDF/organization features.

### Improved (Premium UI Upgrade)
- Added `heroBg`, `heroBorder`, `heroText`, and `heroSubtext` theme tokens in `src/theme/colors.ts` for both Light Mode and Dark Mode with WCAG AA contrast.
- Redesigned the Home screen in `App.tsx` with a full-width cobalt **Scan Document** hero card, a 3-column **Import / Enhance / Export** quick-action bar, elevated document cards with page-count pills, and a floating **Scan** action button.

### Improved (Minimized & Faster GitHub Actions CI)
- Added `concurrency` (`cancel-in-progress: true`) and `paths-ignore` (`docs/**`, `*.md`, `.agents/**`, `update-manifest.json`) in `.github/workflows/build-apk.yml` to cancel superseded runs and skip docs-only pushes.
- Added `gradle/actions/setup-gradle@v4` caching, `--build-cache`, `--prefer-offline --no-audit`, and targeted `arm64-v8a` ABI to cut APK build time and output size.

### Added (Local PDF Download)
- Added `savePdfToLocalDevice` in `src/services/export/exportService.ts` using `Directory.pickDirectoryAsync()` on Android/iOS (and direct browser download on Web) so users can save generated PDFs directly to any local device folder (e.g., Downloads) without needing the Share Sheet.
- Updated `src/screens/ExportScreen.tsx` PDF actions to provide both **Save PDF to Device** and **Share / Open PDF**.

### Release v1.0.3 — Precision Auto-Crop & CamScanner-Grade Output
- Upgraded `src/services/cv/edgeDetector.ts` from single-point quadrant scoring to multi-channel (RGB + Luma) Sobel + 1D Non-Maximum Suppression + directed 4-side Hough line voting + multi-candidate 4-side edge-support scoring + weighted least-squares line refinement, so auto-crop snaps to the document's true 4 edges rather than distracting desk/border edges.
- Upgraded `src/services/filters/scanFilters.ts` with separable morphological local-max paper background estimation (halo-free shadow removal in `Magic Color` and `Grayscale`), subtle saturation & ink contrast tuning, anti-aliased smoothstep adaptive thresholding in `B&W Scan`, and automatic subtle unsharp masking for crisp text.
- Increased auto-detect analysis width to `400px` and max warped output dimension to `1800px` in `src/services/cv/imagePipeline.ts`.
- Added unit test in `src/__tests__/cvAndFilters.test.ts` verifying document corner localization with a distracting background border strip.
- Bumped app version to `1.0.3` (`android.versionCode: 3`).

### Release v1.0.2
- Bumped app version to `1.0.2` (`android.versionCode: 2`) in `app.json`, `package.json`, and `src/constants/legal.ts` to publish the Android image-processing & file I/O fix (`Buffer` polyfill + awaited `expo-file-system` `write`/`copySync`) as an OTA/in-app update.

### Fixed (Android Document Processing & File I/O)
- Added `buffer` polyfill (`globalThis.Buffer`) in `index.ts` and `src/services/cv/imagePipeline.ts` so `jpeg-js` (`Buffer.from(...)`) works reliably in React Native Hermes on Android.
- Fixed async `expo-file-system` `File.copy` / `File.write` race conditions: switched `saveScanImageToAppStorage` in `src/services/storage/localFiles.ts` to `copySync(..., { overwrite: true })`, updated `processScanPage` in `src/services/cv/imagePipeline.ts` to `create` + `await outFile.write(new Uint8Array(encoded.data))`, and awaited `write` / `copy` in `src/services/export/exportService.ts`.
- Sanitized base64 whitespace/data-URI prefixes in `base64ToUint8Array` (`imagePipeline.ts`) and surfaced specific error details in `CropAndEnhanceScreen.tsx`'s `Processing Error` alert.

### Added (Automated In-App Update Releases)
- Bumped app version to `1.0.1` in `app.json`, `package.json`, and `src/constants/legal.ts`.
- Updated `.github/workflows/build-apk.yml` to automatically publish versioned APKs (`snapdoc-<version>.apk`) to **GitHub Releases**, compute real SHA-256 checksums, and update `update-manifest.json` on `main` (`[skip ci]`) so installed apps receive automatic in-app update popups.

### Improved (CamScanner-Grade Crop & Filter Precision)
- Fixed letterbox aspect-ratio mismatch in `CropAndEnhanceScreen.tsx` by measuring natural image dimensions via `Image.getSize()` and pinning the 4-point crop overlay directly to the rendered image bounds (`imgRect`).
- Added 3x3 Gaussian smoothing and weighted Sobel edge localization in `src/services/cv/edgeDetector.ts` to reduce desk-texture noise.
- Upgraded `Magic Color` and `B&W Scan` in `src/services/filters/scanFilters.ts` with integral-image local illumination normalization (shadow removal across uneven lighting).
- Increased working resolution to `1600px` and JPEG output quality to `94%` in `src/services/cv/imagePipeline.ts`.

### Fixed (Android Safe Area Insets)
- Installed `react-native-safe-area-context`, wrapped `App.tsx` in `<SafeAreaProvider>`, and replaced `react-native`'s `SafeAreaView` with `SafeAreaView` from `react-native-safe-area-context` across `StudioShell.tsx`, `CaptureScreen.tsx`, and `CropAndEnhanceScreen.tsx` to prevent status bar and navigation bar overlap on Android.
- Added `.agents/rules/safe-area.md` to enforce `react-native-safe-area-context` on all future screens.

### Added (Planning / Roadmap)
- Created `docs/V2_PLAN.md` documenting the SnapDoc v2.0 phased product and engineering roadmap (Phases 9–15):
  - **Phase 9:** UI/UX Navigation Shell with a 5-item bottom bar (`Home`, `Files`, raised center **Camera**, `Tools`, `Settings`).
  - **Phase 10:** App launch loading state and **QR Code & Barcode** scanner.
  - **Phases 11–15:** **ID Cards** dual-side capture, Batch/Book modes, Workspace Folders/Trash, **Extract Text** (offline OCR), offline **Convert** suite (**To Word**, **To Excel**, **To PPT**, **PDF to Image**), E-Signatures/Markup, and Privacy Vault/Local Backup.

### Fixed (Metro Resolver)
- Updated `metro.config.js` to keep `unstable_enablePackageExports` enabled for React Native 0.88 (`react-native/react-private-interface`) while routing only `tslib` to `tslib/tslib.js`.

### Fixed (CI)
- Removed `android-actions/setup-android@v3` from `.github/workflows/build-apk.yml` (which failed looking for deprecated `tools` package) so Gradle uses the pre-installed Android SDK on `ubuntu-latest`.

### Added (CI / APK Build)
- Added `.github/workflows/build-apk.yml` to automatically run `typecheck`, `test`, `expo prebuild --platform android`, and Gradle `assembleRelease` (`arm64-v8a,armeabi-v7a`, ProGuard/R8, Hermes), uploading `SnapDoc-release-apk` as a downloadable artifact.

### Added (Home Workspace & Feature Hub)
- Added `src/utils/sampleDocument.ts` to generate an offline sample tilted document for instant testing of edge detection, perspective crop, filters, and PDF/Image export.
- Upgraded `App.tsx` Home screen with a live document search bar, a 2x2 **Tools & Features** grid (`Smart Scan`, `Import Photos`, `Crop & Filters`, `PDF & Image`), quick-export buttons on document rows, and a **Try Sample Document** action.

### Fixed
- Added `update-manifest.json` at repository root and restricted `checkForInAppUpdate()` to `Platform.OS === 'android'` so Web previews do not log a 404 console error.

### Changed (UI Copy Cleanup)
- Removed technical badges and internal labels (`LOCAL` badge, `PRIVACY-FIRST ARCHITECTURE` eyebrow, internal filter slugs, and architecture jargon) across `BrandHeader.tsx`, `OnboardingConsentScreen.tsx`, `DocumentDetailScreen.tsx`, `UpdateModal.tsx`, and `legal.ts`.

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
