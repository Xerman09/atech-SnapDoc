export type ThemeMode = 'system' | 'light' | 'dark';

export type FilterPreset =
  | 'original'
  | 'magic_color'
  | 'grayscale'
  | 'bw_scan'
  | 'receipt'
  | 'whiteboard'
  | 'eco_print';

export interface Point {
  x: number;
  y: number;
}

export interface CropQuad {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export type DocumentFolder = 'General' | 'Receipts' | 'IDs' | 'Work' | 'School';

export type StampPreset = 'none' | 'PAID' | 'APPROVED' | 'CONFIDENTIAL';

export interface AdjustmentSettings {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  sharpness: number;  // 0 to 100
  whitening?: number; // 0 to 100 (paper background whitening)
  despeckle?: boolean; // suppress paper grain and back-side bleed-through
  cleanMargins?: boolean; // whiten outer 3% border shadows/fingers
  decurl?: boolean; // flatten mild book/notebook page curvature
  stamp?: StampPreset; // optional rubber-stamp overlay
}

export interface ScannedPage {
  id: string;
  documentId: string;
  pageIndex: number;
  originalUri: string;
  processedUri: string;
  cropQuad?: CropQuad;
  rotation: 0 | 90 | 180 | 270;
  filter: FilterPreset;
  adjustments: AdjustmentSettings;
  createdAt: number; // Unix ms stored internally only; display via dateFormat.ts
}

export interface ScanDocument {
  id: string;
  title: string;
  folder?: DocumentFolder;
  pageCount: number;
  coverUri?: string;
  createdAt: number; // Unix ms stored internally only; display via dateFormat.ts
  updatedAt: number; // Unix ms stored internally only; display via dateFormat.ts
}
