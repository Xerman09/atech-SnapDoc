# SnapDoc (`scanner_app`) — v2.0 Product & Engineering Plan

> **Document Owner:** Project Management & Engineering  
> **Target Release:** v2.0 (CamScanner-Grade Offline Document Suite)  
> **Baseline:** v1.0.0 (Phases 1–8 Completed)  
> **Created:** Nov 15, 2026  

---

## 1. Executive Summary & Vision

SnapDoc v1.0 established a reliable, 100% offline-first document scanner with live camera capture, 4-point perspective cropping, scan enhancement filters, multi-page SQLite storage, PDF/Image export, and an in-app Android updater.

**SnapDoc v2.0** evolves the app into a full **CamScanner-grade productivity suite** while strictly preserving our core promise: **100% offline-first, zero telemetry, zero cloud dependencies, and full Light/Dark Mode accessibility.**

### Immediate Priorities & Core CamScanner Pillars
1. **UI/UX 5-Item Bottom Bar & Center Camera (Phase 9 — First):** Persistent CamScanner-style 5-tab bottom navigation bar with a prominent raised center **Camera** scan button.
2. **App Launch Loading State (Phase 10):** Eliminate startup UI flicker with a branded, accessible bootstrap loading screen while SQLite, encrypted preferences, and theme state initialize.
3. **QR Code & Barcode Scanner (Phase 10):** Fast, offline QR/barcode scanner with scan history, smart local actions, and gallery decode.
4. **ID Cards Scanner (Phase 11):** Dedicated dual-sided ID Card / Driver's License / Passport capture mode that aligns Front + Back onto a single printable A4/Letter page.
5. **Extract Text / Offline OCR (Phase 13):** CamScanner-style **Extract Text** tool to convert scanned pages or imported photos into editable, copyable, searchable text 100% offline.

---

## 2. Non-Negotiable Architecture & Quality Guardrails

Every v2 phase must adhere to the project's established rules in `AGENTS.md`:

| Guardrail | Requirement |
| :--- | :--- |
| **Offline-First & Local-Only** | Zero analytics, zero cloud APIs, zero external telemetry. All scanning, OCR, PDF tools, and storage run locally on-device. |
| **Theming & Accessibility** | Full Light Mode & Dark Mode support via `src/theme/`, WCAG AA contrast, and `accessibilityLabel` on all interactive controls. |
| **Date Formatting** | Never render raw database timestamps; always use `src/utils/dateFormat.ts`. |
| **Security & Validation** | Parameterized `expo-sqlite` queries, `zod` schema validation on all inputs, sanitized filenames, and strict file allowlists. |
| **Documentation & QA** | Every completed phase must update `docs/SYSTEM_DOCS.md` and `docs/CHANGELOG.md`, and pass `npm run typecheck`, `npm test`, and `npm audit --audit-level=high`. |

---

## 3. v1.0 Baseline (Already Shipped)

- **Phases 1–2:** Expo SDK 58 + TypeScript foundation, Light/Dark theme system, custom SnapDoc branding, offline legal & consent onboarding.
- **Phases 3–4:** Live camera capture, safe gallery import, Sobel edge detection, 4-point perspective warp, and scan filters (Original, Magic Color, Grayscale, B&W Adaptive).
- **Phases 5–6:** Multi-page SQLite workspace, encrypted preferences, and offline PDF (A4/Letter/Fit) + PNG/JPEG export.
- **Phases 7–8:** In-app Android APK updater (SHA-256 verified), ProGuard/R8 release pipeline, Vitest unit tests, and security audit.

---

## 4. v2.0 Phased Implementation Roadmap

### Roadmap Overview

| Phase | Focus Area | Priority | Est. Effort | Key Deliverables |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 9** | **UI/UX Navigation Shell (5-Item Bottom Bar)** | **P0 (First)** | 0.5 Sprint | Persistent 5-item bottom bar (`Home`, `Files`, **Center Camera**, `Tools`, `Settings`) with Light/Dark theming & responsive studio framing |
| **Phase 10** | **Launch Loading State & QR/Barcode Scanner** | **P0** | 1 Sprint | Branded startup loader, live QR/Barcode camera scanner, local scan history, smart actions |
| **Phase 11** | **CamScanner Capture Modes (ID Cards & Batch)** | P1 | 1–2 Sprints | **ID Cards** (front+back single-page layout), Batch/Continuous scan, Book 2-page split, Auto-capture & grid |
| **Phase 12** | **Document Organization & Workspace** | P1 | 1 Sprint | Folders/Categories, Tags & Favorites, Grid/List toggle, Sort options, Trash / Recycle Bin |
| **Phase 13** | **Extract Text (Offline OCR) & Search** | P2 | 2 Sprints | **Extract Text** tool (Image-to-Text), on-device OCR, full-text search, copy/edit/export `.txt` |
| **Phase 14** | **Convert Suite, PDF Tools & E-Signatures** | P2 | 2 Sprints | **Convert** (To Word `.docx`, To Excel `.xlsx`, To PPT `.pptx`, PDF to Image), e-signatures, stamps, markup, watermarks, PDF merge/split/compress |
| **Phase 15** | **Privacy Vault & Local Backup** | P3 | 1 Sprint | Biometric/PIN app & folder lock, encrypted offline `.snapdoc` archive export/restore |

---

### Phase 9: UI/UX Navigation Shell — 5-Item Bottom Bar *(First v2 Milestone)*

**Goal:** Establish a cohesive, CamScanner-style mobile navigation shell before adding new v2 tools so every feature has a clean, predictable home.

**5-Item Bottom Navigation Bar (`src/components/BottomNavBar.tsx`):**
1. **Home** — Recent scans, quick search, and overview.
2. **Files** — Full document library (and folders/categories in Phase 12).
3. **Scan (Center Camera Button)** — Prominent, elevated circular Camera FAB in the exact center of the bar for one-tap document scanning (`CaptureScreen`).
4. **Tools** — Dedicated Tools Hub for QR & Barcode, ID Cards, Extract Text, Convert Suite, Crop & Filters, and PDF & Image.
5. **Settings** — Theme (Light/Dark/System), In-App Updates, Legal & Privacy, and Local Data Management.

**UI/UX & Accessibility Requirements:**
- Full **Light Mode** & **Dark Mode** support via `src/theme/` tokens with WCAG AA contrast and active-tab indicators.
- `accessibilityLabel` and `accessibilityRole="tab"` / `"button"` on all 5 items.
- Responsive layout: full-width with safe-area bottom inset on mobile; docked cleanly inside `StudioShell` on Web/desktop.
- Hide the bottom bar automatically on immersive full-screen flows (`CaptureScreen`, `CropAndEnhanceScreen`, `QrScannerScreen`, `OnboardingConsentScreen`).

---

### Phase 10: App Launch Loading State & QR/Barcode Scanner

#### 10.1 App Launch Loading State (Bootstrap Screen)
**Problem:** On app launch, asynchronous initialization (opening `snapdoc.db`, reading `expo-secure-store` consent/theme preferences, and loading initial documents) can cause brief layout shifts or blank flashes.  
**Solution:**
- Create a dedicated `src/components/AppLoadingScreen.tsx` component using `src/theme/` tokens (supporting both Light and Dark mode).
- Display the SnapDoc brand mark, a subtle animated progress/activity indicator, and clear status messaging (e.g., *"Preparing your offline workspace..."*).
- Gate root navigation in `App.tsx` behind an explicit `isBootstrapping` state with a smooth fade transition once SQLite, `ThemeContext`, and consent status are resolved.
- Ensure graceful error recovery UI if local storage initialization fails (with a "Retry" action).

#### 10.2 QR Code & Barcode Scanner *(First Feature After UI Shell)*
**User Stories:**
- *As a user*, I want to tap **QR & Barcode** from the Home screen Tools grid (or Capture mode switcher) to scan QR codes and product/document barcodes offline.
- *As a user*, I want to see the decoded content immediately with safe, context-aware actions (Copy Text, Open Link with explicit confirmation, Save Contact/Wi-Fi details, or Attach Note to a Document).
- *As a user*, I want a local **Scan History** so I can revisit previously scanned codes anytime without re-scanning.
- *As a user*, I want to scan a QR/barcode from an existing gallery image as well as live camera.

**Technical Scope:**
- **Camera Integration:** Use `expo-camera` (`CameraView` `onBarcodeScanned` & `barcodeScannerSettings`) supporting `qr`, `ean13`, `ean8`, `upc_a`, `upc_e`, `code128`, `code39`, `pdf417`, `aztec`, and `datamatrix`.
- **Viewfinder UI:** Create `src/screens/QrScannerScreen.tsx` with an accessible scanning reticle, torch/flash toggle, scan-from-image button, and haptic/visual detection feedback.
- **Validation & Parsing:** Add `src/utils/barcodeParser.ts` with `zod` validation to safely classify payloads (`url`, `wifi`, `vcard`, `email`, `phone`, `product_barcode`, `plain_text`) and prevent unsafe auto-redirects.
- **Local Storage:** Add a parameterized `barcode_history` table in `src/services/storage/database.ts` (and `webDbFallback.ts`) storing `id`, `format`, `raw_value`, `payload_type`, and `scanned_at` (rendered via `src/utils/dateFormat.ts`).
- **Home Hub Integration:** Wire **QR & Barcode** into the Home screen **Tools & Features** section in `App.tsx`.

**Phase 10 Definition of Done (DoD):**
- [ ] App opens with branded `AppLoadingScreen` and transitions cleanly with zero flash of unstyled/unloaded content.
- [ ] Live QR & Barcode scanning works offline on Android/iOS, with a clean Web fallback (gallery/manual decode or informative notice).
- [ ] Decoded results are validated with `zod`, saved to `barcode_history`, and displayed with human-readable dates.
- [ ] Unit tests added for `barcodeParser.ts` and database history CRUD.
- [ ] `npm run typecheck`, `npm test`, and `docs/SYSTEM_DOCS.md` + `docs/CHANGELOG.md` updated.

---

### Phase 11: CamScanner Capture Modes

Bring SnapDoc's camera experience to parity with CamScanner's specialized capture workflows:
1. **Batch / Continuous Scan Mode:**
   - Capture multiple pages in rapid succession without leaving `CaptureScreen.tsx`.
   - Live floating thumbnail badge showing page count; tap "Done" to enter a batch review queue for cropping/filtering all pages at once.
2. **ID Cards Mode (Dual-Side Card & Passport Scanner):**
   - Dedicated **ID Cards** entry point on the Home **Tools & Features** grid and in `CaptureScreen.tsx`.
   - Presets for **National ID / Driver's License** (CR-80 aspect ratio) and **Passport** (single spread).
   - Guided two-step capture (*Front Side* -> *Back Side*) with card-aspect overlay frame and individual crop/enhance confirmation.
   - Automatically composes both sides cleanly onto a single printable A4/Letter page in `exportService.ts`, with optional verification watermark (e.g., *"For Verification Only"*).
3. **Book / Two-Page Split Mode:**
   - Capture an open two-page book spread with a center spine guide.
   - Automatically split the warped image into two sequential pages (`Left Page`, `Right Page`).
4. **Camera Pro Assists:**
   - Optional 3x3 composition grid, horizon level indicator, and **Auto-Capture** countdown when document edges stabilize.

---

### Phase 12: Document Organization & Workspace

Scale the Home workspace from a flat list to a structured document manager:
1. **Folders & Categories:**
   - Local `folders` table in SQLite (`id`, `name`, `color`, `icon`, `created_at`, `updated_at`).
   - Default suggested categories (e.g., *All Scans*, *Receipts*, *IDs & Cards*, *Work*) plus user-created folders.
2. **Tags & Favorites:**
   - Star/pin important documents to the top; filter by tags or folder chips.
3. **View & Sort Controls:**
   - Toggle between **List View** and **Thumbnail Grid View**.
   - Sort by *Newest*, *Oldest*, *Name (A–Z)*, or *Page Count*.
4. **Trash / Recycle Bin:**
   - Soft-delete documents to a local `Trash` view with **Restore** and **Delete Permanently** actions to prevent accidental data loss.

---

### Phase 13: Extract Text (Offline OCR) & Full-Text Search

Make scanned documents and photos extractable, searchable, and copyable without sending a single byte to the cloud:
1. **Standalone "Extract Text" Tool (Image-to-Text):**
   - Dedicated **Extract Text** entry point on the Home **Tools & Features** grid and inside `DocumentDetailScreen.tsx` (per-page action).
   - Capture a photo or pick from gallery -> run on-device OCR -> view extracted text in an editable sheet with **Copy All**, **Select Lines**, **Share/Save `.txt`**, or **Attach to Document**.
2. **On-Device OCR Engine:**
   - Integrate an offline text-recognition engine (e.g., on-device ML Kit Text Recognition / local Tesseract native/WASM bridge) with zero network calls.
3. **Per-Page & Per-Document Text Index:**
   - Store extracted text in a local `page_ocr_text` column/table in `snapdoc.db` (parameterized SQLite).
4. **Full-Text Search:**
   - Upgrade Home screen search to match both **document titles** and **extracted OCR text**, highlighting matching snippets.

---

### Phase 14: Convert Suite, PDF Power Tools, E-Signatures & Markup

Add CamScanner's offline **Convert** suite alongside post-scan editing and document-signing capabilities:
1. **Offline Convert Suite (Home Tools & Export Hub):**
   - **To Word (`.docx`):** Generate offline `.docx` documents from scanned pages (embedding enhanced page images and/or Phase 12 OCR-extracted text paragraphs) using local OOXML generation—zero cloud upload.
   - **To Excel (`.xlsx` / `.csv`):** Detect tabular rows/columns from scanned receipts or tables via OCR bounding boxes and export locally as `.xlsx` spreadsheets (with `.csv` fallback).
   - **To PPT (`.pptx`):** Convert multi-page scans (e.g., whiteboard notes, handouts, slides) into a `.pptx` presentation with one scanned page per slide.
   - **PDF to Image (`.png` / `.jpg`):** Import a local `.pdf` file (validated with `zod` + size limits), render each page offline to high-resolution PNG/JPEG images, and save to the device gallery or open as a new SnapDoc document.
2. **Handwritten E-Signature & Stamps:**
   - Finger/stylus signature pad (`react-native-svg`) saved locally as reusable transparent overlays.
   - Built-in vector stamps (*APPROVED*, *PAID*, *CONFIDENTIAL*, *COPY*) with drag, resize, and rotate placement on any page.
3. **Page Markup & Redaction:**
   - Non-destructive annotation layer: **Highlighter**, **Freehand Pen**, **Text Note**, and **Blackout Redaction** (flattened securely into exported PDFs/images).
4. **Custom Watermarks:**
   - Add diagonal/tiled text watermarks (e.g., *"For Verification Only — Nov 2026"*) with opacity and color controls during PDF/Image export.
5. **PDF Merge, Split & Compress:**
   - Merge multiple saved documents into one PDF, extract selected pages into a new document, and offer **High / Balanced / Small File** compression presets.

---

### Phase 15: Privacy Vault & Encrypted Local Backup

Protect sensitive local scans (IDs, contracts, tax records) with hardware-backed security:
1. **App Lock & Folder Lock:**
   - Optional PIN or Biometric (`expo-local-authentication`) lock on app launch or on specific sensitive folders.
   - Auto-lock timeout setting in `SettingsScreen.tsx`.
2. **Encrypted Offline Backup & Restore:**
   - Export all documents, folders, and metadata into a single passphrase-encrypted local `.snapdoc` archive (stored via `expo-sharing` / local filesystem).
   - Import/restore `.snapdoc` backups on a new device completely offline.

---

## 5. Risk Register & Technical Considerations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Web Preview Parity** | `expo-camera` barcode scanning and native OCR behave differently on Web vs Android/iOS. | Maintain clean `Platform.OS === 'web'` fallbacks in every new service and screen (consistent with `webDbFallback.ts`). |
| **APK Size Bloat** | Adding OCR models or heavy native libraries can inflate APK size. | Keep Phases 9–12 pure Expo/TS; evaluate lightweight on-device ML models and keep ProGuard/R8 + ABI splits (`arm64-v8a`, `armeabi-v7a`) active. |
| **SQLite Schema Migrations** | Adding `barcode_history`, `folders`, and OCR tables must not wipe existing v1 user data. | Implement versioned `PRAGMA user_version` migrations in `src/services/storage/database.ts` with safe `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` steps. |
| **Memory Pressure in Batch Mode** | Capturing 20+ high-res photos in Batch Mode can cause OOM on budget Android devices. | Downscale working previews, write full-res files immediately to `FileSystem.documentDirectory/scans/`, and process one page at a time. |

---

## 6. Immediate Next Step (Sprint 1 Kickoff)

Ready to begin **Phase 9** followed by **Phase 10**:
1. **Phase 9:** Implement `BottomNavBar.tsx` (5 items: `Home`, `Files`, raised center **Camera**, `Tools`, `Settings`) and wire tab routing in `App.tsx`.
2. **Phase 10:** Implement `AppLoadingScreen.tsx` + **QR Code & Barcode Scanner** (`QrScannerScreen.tsx`, `barcodeParser.ts`, `barcode_history` SQLite table).
3. Add unit tests and update `docs/SYSTEM_DOCS.md` and `docs/CHANGELOG.md`.
