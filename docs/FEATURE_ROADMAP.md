# SnapDoc — Feature & Release Checklist

All features are built **100% offline and local-only** on-device, with zero cloud dependencies, telemetry, or external APIs.

---

## Done

### Core Architecture & UI
- [x] Offline camera capture, gallery import (`JPG`, `PNG`, `WebP`), SQLite library, and Light/Dark themes (`v1.0.0`)
- [x] Android Safe Area insets (`react-native-safe-area-context`) so headers/controls never overlap the status bar or navigation bar (`v1.0.1`)
- [x] Premium Home UI: Cobalt **Scan Document** hero card, 3-column **Import / Enhance / Export** quick tools, elevated document cards with page badges, and floating **Scan** FAB
- [x] Automated compressed Android APK builds (`arm64-v8a` + Gradle cache + concurrency cancel-in-progress) and **In-App Update** prompt (`v1.0.1–v1.0.8`)
- [x] Local PDF Download to device folders (e.g., **Downloads**) via Android SAF directory picker (`Save PDF to Device`) + Share Sheet (`Share / Open PDF`)

### Capture & Smart Scanning
- [x] **4-Side Hough Auto-Crop + Line Refinement:** Multi-channel (RGB + Luma) Sobel + NMS + 4-side Hough voting + weighted least-squares corner intersection
- [x] **Corner Magnifier Loupe (`2.4×` Zoom Bubble):** Crosshair zoom bubble opposite your finger while dragging any corner handle
- [x] **Multi-Page Batch Scan Mode:** Continuous camera capture with live thumbnail, page counter badge, and **Done** action
- [x] **ID Card / Two-Sided Scan Mode:** Guided Front + Back capture composed onto a single white A4 sheet (`1240×1754`)
- [x] **Book / Two-Page Spread Split (`Split 2P`):** Splits a two-page spread down the center spine into two separate pages
- [x] **3×3 Framing Grid, Tap-to-Focus Reticle & 3s Hands-Free Timer Shutter**
- [x] **Auto-Orientation Detection (`Upright`):** Detects sideways text lines and rotates `90°` upright

### Scanned Output, Editing & Organization
- [x] **Halo-Free Paper Background Estimation:** Morphological local-max shadow removal in `Magic Color` and `Grayscale`
- [x] **Specialized Scan Presets:** `Magic Color`, `Receipt`, `Whiteboard`, `Eco Print`, `Grayscale`, `B&W Scan`
- [x] **Whiten Slider (`0..100`) & Bright / Contrast / Sharp Steppers**
- [x] **Clean Bleed (`despeckle`):** Suppresses isolated paper specks and faint back-side bleed-through
- [x] **Clean Edges (`cleanMargins`):** Smoothly whitens dark outer borders and edge shadows
- [x] **Page-Curl Flattening (`Decurl`):** Sinusoidal vertical-arch compensation for curved notebook/book pages
- [x] **Status Stamp Overlays:** Bordered `PAID`, `APPROVED`, and `CONFIDENTIAL` stamps rendered offline
- [x] **Custom Export File Naming, Quick Date Templates & Live Compression Size Preview**
- [x] **Folders / Tags Organization:** Local SQLite folders (`General`, `Receipts`, `IDs`, `Work`, `School`) with Home filtering and folder badges

---

## Need to Do

### On-Device Verification (`v1.0.8`)
- [ ] Confirm GitHub Actions builds and publishes `snapdoc-1.0.8.apk`
- [ ] Install `v1.0.8` via the in-app update prompt on your Android phone
- [ ] Test **Single**, **Batch**, **ID Card** (Front + Back → A4), **Grid**, **Timer (`3s`)**, and **Tap-to-Focus** on device
- [ ] Test **Auto-Crop + Corner Loupe**, **Upright**, **Split 2P**, **Decurl**, **Clean Bleed**, **Clean Edges**, **Stamp**, and all scan presets on device
- [ ] Test **Folders** filtering and **Save PDF to Device** (Downloads folder) on device

### Optional Future Enhancements
- [ ] **Freehand Signature Pad:** Draw and save reusable handwritten signatures with your finger
- [ ] **Interactive Brush Eraser:** Manually brush out fingers/thumbs or marks anywhere on a page
- [ ] **Real-Time Live Edge Contour Overlay:** Requires migrating from `expo-camera` to `react-native-vision-camera` with a native frame processor
- [ ] **Sync `docs/SYSTEM_DOCS.md`:** Document the `folder` column migration, `v1.0.4–v1.0.8` CV options, and SAF PDF export flow
