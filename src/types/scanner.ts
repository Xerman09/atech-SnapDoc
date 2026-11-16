export type ThemeMode = 'system' | 'light' | 'dark';

export type FilterPreset =
  | 'original'
  | 'magic_color'
  | 'grayscale'
  | 'bw_scan'
  | 'receipt'
  | 'whiteboard';

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

export interface AdjustmentSettings {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  sharpness: number;  // 0 to 100
  whitening?: number; // 0 to 100 (paper background whitening)
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
  pageCount: number;
  coverUri?: string;
  createdAt: number; // Unix ms stored internally only; display via dateFormat.ts
  updatedAt: number; // Unix ms stored internally only; display via dateFormat.ts
}
