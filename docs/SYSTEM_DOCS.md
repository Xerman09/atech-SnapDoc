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
| Project Foundation (Expo + TS + Hermes) | In Progress | Phase 1 | Core scaffold & modular structure |
| Light Mode & Dark Mode Theme System | In Progress | Phase 1 | System-aware + manual toggle, WCAG AA contrast |
| Human-Readable Date Formatting | In Progress | Phase 1 | Centralized `src/utils/dateFormat.ts` |
| System Docs & Agent Rules | Active | Phase 1 | `.agents/rules/` + `docs/` |
| Brand Identity & Custom Logo | Planned | Phase 2 | Original vector/PNG icon & splash |
| Legal, Privacy & Compliance Screens | Planned | Phase 2 | Offline Privacy, Terms, Refund, Cookie, Data Deletion |
| Live Camera & Safe Image Import | Planned | Phase 3 | Offline camera + validated gallery import |
| 4-Point Perspective Crop & Edge Detection | Planned | Phase 4 | Interactive corner editor & perspective warp |
| Scan Enhancement Filters | Planned | Phase 4 | Original, Magic Color, Grayscale, B&W Scan |
| Multi-Page Workspace & Encrypted Local DB | Planned | Phase 5 | Parameterized SQLite + SecureStore |
| Image (PNG/JPEG) & PDF Export | Planned | Phase 6 | Single/multi-page PDF (A4/Letter/Fit) |
| In-App Auto-Update & Compressed APK | Planned | Phase 7 | In-app update modal + R8/ProGuard/ABI splits |

---

## 3. Third-Party SDK Audit
*All third-party packages are audited for zero telemetry, zero ads, and offline compatibility.*

| Package | Purpose | Offline Safe | Telemetry / Tracking |
| :--- | :--- | :--- | :--- |
| `expo` / `react-native` | Core mobile runtime (Hermes) | Yes | None |
| `zod` *(planned)* | Input & schema validation | Yes | None |
| `expo-sqlite` *(planned)* | Parameterized local database | Yes | None |
| `expo-secure-store` *(planned)* | Encrypted key/PIN storage | Yes | None |

---

## 4. Security & Compliance Posture
- **Data Collection:** Zero analytics, zero ads, zero cloud uploads.
- **Storage Security:** App-private local storage; parameterized SQLite queries; input/file-type validation.
- **Secrets:** No API keys or secrets stored in repository (`.env` gitignored).
