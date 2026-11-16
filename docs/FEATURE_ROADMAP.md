# SnapDoc — Feature Roadmap

All planned features below are designed to run **100% offline and local-only** on-device, with zero cloud dependencies, telemetry, or external APIs.

---

## 1. Capture & Smart Scanning

- [x] **Corner Magnifier Loupe (Zoom Bubble)** *(High Priority)*
  - Pop up a zoomed circular magnifier above the user's finger while dragging any of the 4 corner handles in `CropAndEnhanceScreen`, enabling pixel-accurate alignment without the thumb blocking the corner.
- [x] **Multi-Page Batch Scan Mode** *(High Priority)*
  - Keep the camera active after each shutter press with a live page counter (`1, 2, 3…`) and thumbnail preview strip so multi-page packets can be captured continuously and cropped/enhanced in sequence.
- [x] **ID Card / Two-Sided Scan Mode** *(High Priority)*
  - Guided front-and-back capture flow for IDs, licenses, and cards that automatically aligns and places both sides cleanly onto a single A4 page.
- [ ] **Live Edge Overlay & Auto-Shutter**
  - Real-time document boundary detection overlay inside `CaptureScreen` with an optional auto-capture countdown when the document is held steady.
- [x] **Tap-to-Focus, Exposure Lock & Framing Guides** *(Framing Grid implemented; Tap-to-Focus pending)*
  - Tap anywhere on the camera preview to focus/meter on the document, plus toggleable 3×3 alignment grid and tilt-level indicator.
- [x] **Book / Two-Page Spread Split**
  - Capture an open two-page book or notebook spread in one shot and automatically split it along the center spine into two separate straight pages.
- [x] **Auto-Orientation Detection**
  - Automatically detect sideways or upside-down captures and rotate them upright before saving.

---

## 2. Scanned Output & Document Enhancement

- [x] **Paper Whitening & Shadow Removal Slider** *(High Priority)*
  - Dedicated intensity control to neutralize warm indoor lighting and cast shadows into clean white paper while preserving ink, stamps, and colored highlights.
- [x] **Specialized Scan Presets** *(Receipt, Whiteboard & Eco Print implemented)*
  - **Receipt / Thermal:** Boosts faded thermal receipt ink and suppresses paper noise.
  - **Whiteboard:** Removes glare/reflections and sharpens dry-erase marker strokes.
  - **Eco / Light Ink:** Clean, ink-saving output optimized for physical printing.
- [x] **Finger / Thumb & Margin Eraser** *(Clean Edges outer-margin eraser implemented)*
  - Cleanly remove fingers holding the edge of a page or dark outer margins and fill with the surrounding paper tone.
- [x] **Despeckle & Bleed-Through Suppression**
  - Reduce faint back-side text bleed-through and paper grain on thin or double-sided sheets.
- [ ] **Page-Curl / Book-Curve Flattening**
  - Correct mild curvature on thick notebooks, receipts, or bound pages that do not lie flat.

---

## 3. Document Editing, Annotations & Export

- [x] **Handwritten Signature & Stamp Overlay** *(Status stamps `PAID`, `APPROVED`, `CONFIDENTIAL` implemented)*
  - Draw or save reusable local signatures and date/status stamps (e.g., `PAID`, `CONFIDENTIAL`, `APPROVED`) to place onto scanned pages before PDF export.
- [x] **Custom PDF Page Naming & Compression Preview**
  - Live estimated PDF file size preview before exporting and quick templates for document naming.
- [x] **Folders / Tags Organization**
  - Local SQLite folders/tags (e.g., `Receipts`, `IDs`, `Work`, `School`) for quick filtering on the Home library screen.
