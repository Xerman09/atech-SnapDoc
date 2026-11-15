# SnapDoc — System Documentation

> **App Type:** 100% Local-Only, Offline React Native Document Scanner (Expo SDK + TypeScript + Hermes)  
> **Last Updated:** Nov 15, 2026

---

## 1. Architecture Overview
SnapDoc runs completely offline on the user's device. Document capture, edge detection, perspective cropping, image enhancement filters, local storage, and PDF generation execute locally without requiring an internet connection or cloud server.

### Core Directories
- `src/theme/` — Light Mode & Dark Mode color palettes, typography, and `ThemeProvider`
- `src/utils/` — Centralized utilities including `dateFormat.ts` (human-readable dates) and input/file validators
- `src/types/` — Shared TypeScript interfaces (`ScanDocument`, `ScannedPage`, `FilterPreset`, `Point`)
- `src/services/` — Local SQLite storage, FileSystem helpers, CV/cropper, filter engine, PDF export, and in-app updater
- `src/components/` — Reusable accessible UI components
- `src/screens/` — App screens (Home, Capture, Cropper, Enhance, DocumentDetail, Settings, Legal)

---

## 2. Feature Inventory

| Feature | Status | Phase | Notes |
| :--- | :--- | :--- | :--- |
| Project Foundation (Expo + TS + Hermes) | Completed | Phase 1 | Core scaffold & modular structure (`tsc --noEmit` verified) |
| Light Mode & Dark Mode Theme System | Completed | Phase 1 | System-aware + manual toggle, WCAG AA contrast (`src/theme/`) |
| Human-Readable Date Formatting | Completed | Phase 1 | Centralized `src/utils/dateFormat.ts` |
| System Docs & Agent Rules | Active | Phase 1 | `.agents/rules/` + `AGENTS.md` + `docs/` |
| Brand Identity & Custom Logo | Completed | Phase 2 | Custom SnapDoc icon, adaptive Android icon, splash, `BrandHeader` |
| Legal, Privacy & Compliance Screens | Completed | Phase 2 | Offline Privacy, Terms, Refund, Cookie, Business Info, Age Gate, Data Deletion |
| Live Camera & Safe Image Import | Completed | Phase 3 | Offline `expo-camera`, multi-image gallery import, `zod` + file allowlist validation |
| 4-Point Perspective Crop & Edge Detection | Completed | Phase 4 | Sobel edge detector, inverse homography warp, draggable SVG corner handles, 90° rotation |
| Scan Enhancement Filters | Completed | Phase 4 | Original, Magic Color, Grayscale, B&W Adaptive Scan + Brightness/Contrast/Sharpness |
| Multi-Page Workspace & Encrypted Local DB | Completed | Phase 5 | Parameterized `expo-sqlite` + `expo-secure-store`, multi-page reorder/rename/delete |
| Image (PNG/JPEG) & PDF Export | Completed | Phase 6 | Offline `pdf-lib` multi-page PDF (A4/Letter/Fit, margins, quality) + Gallery/File image export |
| In-App Auto-Update & Compressed APK | Completed | Phase 7 | HTTPS manifest check, SHA-256 verification, in-app Android installer, ProGuard/R8 + Hermes + ABI splits |

---

## 3. Third-Party SDK Audit
*All third-party packages are audited for zero telemetry, zero ads, and offline compatibility.*

| Package | Purpose | Offline Safe | Telemetry / Tracking |
| :--- | :--- | :--- | :--- |
| `expo` / `react-native` | Core mobile runtime (Hermes) | Yes | None |
| `zod` | Input, schema & image import validation | Yes | None |
| `expo-camera` | Offline camera document capture | Yes | None |
| `expo-image-picker` | Local gallery multi-image import | Yes | None |
| `expo-file-system` | App-private `scans/` file storage | Yes | None |
| `expo-image-manipulator` | Native image rotation & resize | Yes | None |
| `react-native-svg` | Interactive 4-point crop polygon overlay | Yes | None |
| `jpeg-js` | Pure-JS offline JPEG decode/encode for CV | Yes | None |
| `expo-sqlite` | Parameterized local SQLite database (`snapdoc.db`) | Yes | None |
| `expo-secure-store` | Encrypted Keystore preferences & consent storage | Yes | None |
| `pdf-lib` | Offline single/multi-page PDF generation | Yes | None |
| `expo-sharing` | Native offline share/save-to-files sheet | Yes | None |
| `expo-media-library` | Save scanned images to device gallery | Yes | None |
| `expo-intent-launcher` | Direct in-app Android APK update installer | Yes | None |
| `expo-crypto` | SHA-256 checksum verification for updates | Yes | None |
| `expo-build-properties` | ProGuard/R8 shrinking & HTTPS-only enforcement | Yes | None |

---

## 4. Security & Compliance Posture
- **Data Collection:** Zero analytics, zero ads, zero cloud uploads.
- **Storage Security:** App-private local storage; parameterized SQLite queries; input/file-type validation.
- **Secrets:** No API keys or secrets stored in repository (`.env` gitignored).
