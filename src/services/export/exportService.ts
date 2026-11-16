import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Platform } from 'react-native';
import { ScanDocument, ScannedPage } from '../../types/scanner';
import { sanitizeFilename } from '../../utils/fileValidation';
import { sanitizeDocumentTitle } from '../storage/database';

export type PdfPageSize = 'a4' | 'letter' | 'fit';
export type PdfMarginPreset = 'none' | 'small' | 'standard';
export type ExportQualityPreset = 'high' | 'balanced' | 'small';
export type ImageExportFormat = 'jpeg' | 'png';

const QUALITY_MAP: Record<ExportQualityPreset, number> = {
  high: 0.92,
  balanced: 0.75,
  small: 0.55,
};

/**
 * Estimates the offline export size in KB based on page count, quality preset, and format.
 */
export function estimateExportSizeKb(
  pageCount: number,
  quality: ExportQualityPreset,
  mode: 'pdf' | 'image'
): number {
  const perPageKb =
    mode === 'pdf'
      ? quality === 'high'
        ? 380
        : quality === 'balanced'
          ? 185
          : 85
      : quality === 'high'
        ? 360
        : quality === 'balanced'
          ? 170
          : 75;
  return Math.max(1, pageCount) * perPageKb;
}

const MARGIN_PT_MAP: Record<PdfMarginPreset, number> = {
  none: 0,
  small: 18,
  standard: 36,
};

const PAGE_SIZE_PT: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

function getExportsDirectory(): Directory {
  const dir = new Directory(Paths.document, 'exports');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
}

/**
 * Exports all pages of a document into a single multi-page PDF offline,
 * returning the local file URI and byte size.
 */
export async function generateDocumentPdf(params: {
  document: ScanDocument;
  pages: ScannedPage[];
  pageSize: PdfPageSize;
  margin: PdfMarginPreset;
  quality: ExportQualityPreset;
  includePageNumbers?: boolean;
  includeWatermark?: boolean;
}): Promise<{ uri: string; sizeBytes: number }> {
  const {
    document,
    pages,
    pageSize,
    margin,
    quality,
    includePageNumbers = false,
    includeWatermark = false,
  } = params;
  if (pages.length === 0) {
    throw new Error('Cannot export an empty document.');
  }

  const pdfDoc = await PDFDocument.create();
  const safeTitle = sanitizeDocumentTitle(document.title);
  pdfDoc.setTitle(safeTitle);
  pdfDoc.setCreator('SnapDoc Offline');
  pdfDoc.setProducer('SnapDoc PDF Engine');

  const font =
    includePageNumbers || includeWatermark
      ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      : null;

  const compress = QUALITY_MAP[quality];
  const marginPt = MARGIN_PT_MAP[margin];

  for (let idx = 0; idx < pages.length; idx++) {
    const pageItem = pages[idx];
    const prepared = await ImageManipulator.manipulateAsync(
      pageItem.processedUri,
      [],
      {
        compress,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!prepared.base64) continue;
    const jpgBytes = base64ToUint8Array(prepared.base64);
    const embedded = await pdfDoc.embedJpg(jpgBytes);

    let targetW: number;
    let targetH: number;

    if (pageSize === 'fit') {
      targetW = embedded.width + marginPt * 2;
      targetH = embedded.height + marginPt * 2;
    } else {
      const base = PAGE_SIZE_PT[pageSize];
      const isLandscape = embedded.width > embedded.height;
      targetW = isLandscape ? base.height : base.width;
      targetH = isLandscape ? base.width : base.height;
    }

    const pdfPage = pdfDoc.addPage([targetW, targetH]);
    const availW = Math.max(10, targetW - marginPt * 2);
    const availH = Math.max(10, targetH - marginPt * 2);

    const scale = Math.min(availW / embedded.width, availH / embedded.height);
    const drawW = embedded.width * scale;
    const drawH = embedded.height * scale;
    const drawX = (targetW - drawW) / 2;
    const drawY = (targetH - drawH) / 2;

    pdfPage.drawImage(embedded, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });

    if (includeWatermark && font) {
      const wmText = 'CONFIDENTIAL';
      const wmSize = Math.max(24, Math.min(48, Math.round(targetW * 0.075)));
      const wmWidth = font.widthOfTextAtSize(wmText, wmSize);
      pdfPage.drawText(wmText, {
        x: Math.max(20, (targetW - wmWidth * 0.7) / 2),
        y: targetH * 0.42,
        size: wmSize,
        font,
        color: rgb(0.75, 0.14, 0.14),
        opacity: 0.18,
        rotate: degrees(32),
      });
    }

    if (includePageNumbers && font) {
      const numText = `${idx + 1} / ${pages.length}`;
      const numSize = 10;
      const numW = font.widthOfTextAtSize(numText, numSize);
      pdfPage.drawText(numText, {
        x: (targetW - numW) / 2,
        y: 8,
        size: numSize,
        font,
        color: rgb(0.35, 0.4, 0.48),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const fileName = sanitizeFilename(`${safeTitle}_${Date.now()}.pdf`, 'pdf');

  if (Platform.OS === 'web') {
    const base64Pdf = uint8ArrayToBase64(pdfBytes);
    return {
      uri: `data:application/pdf;base64,${base64Pdf}`,
      sizeBytes: pdfBytes.length,
    };
  }

  const exportsDir = getExportsDirectory();
  const outFile = new File(exportsDir, fileName);
  outFile.create({ intermediates: true, overwrite: true });
  await outFile.write(pdfBytes);

  return {
    uri: outFile.uri,
    sizeBytes: pdfBytes.length,
  };
}

/**
 * Prepares a scanned page as PNG or JPEG for download/sharing.
 */
export async function prepareExportImage(params: {
  page: ScannedPage;
  format: ImageExportFormat;
  quality: ExportQualityPreset;
  baseTitle: string;
  pageNumber: number;
}): Promise<{ uri: string }> {
  const { page, format, quality, baseTitle, pageNumber } = params;
  const saveFormat =
    format === 'png'
      ? ImageManipulator.SaveFormat.PNG
      : ImageManipulator.SaveFormat.JPEG;

  const result = await ImageManipulator.manipulateAsync(page.processedUri, [], {
    compress: format === 'png' ? 1 : QUALITY_MAP[quality],
    format: saveFormat,
  });

  const ext = format === 'png' ? 'png' : 'jpg';
  const fileName = sanitizeFilename(`${baseTitle}_page_${pageNumber}.${ext}`, ext);

  if (Platform.OS === 'web') {
    return { uri: result.uri };
  }

  const exportsDir = getExportsDirectory();
  const targetFile = new File(exportsDir, fileName);
  await new File(result.uri).copy(targetFile, { overwrite: true });

  return { uri: targetFile.uri };
}

export async function shareLocalFile(uri: string, mimeType: string, title: string): Promise<void> {
  if (Platform.OS === 'web' && typeof globalThis.document !== 'undefined') {
    const link = globalThis.document.createElement('a');
    link.href = uri;
    link.download = sanitizeFilename(
      title,
      mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg'
    );
    globalThis.document.body.appendChild(link);
    link.click();
    globalThis.document.body.removeChild(link);
    return;
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: title,
  });
}

export async function saveImagesToDeviceGallery(uris: string[]): Promise<number> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Media library permission is required to save images to your gallery.');
  }
  let savedCount = 0;
  for (const uri of uris) {
    await MediaLibrary.saveToLibraryAsync(uri);
    savedCount += 1;
  }
  return savedCount;
}

/**
 * Saves a generated PDF file directly to a user-selected local folder (e.g. Downloads)
 * on Android/iOS via the system directory picker, or triggers a browser download on Web.
 */
export async function savePdfToLocalDevice(
  uri: string,
  baseTitle: string
): Promise<{ saved: boolean; fileName: string }> {
  const fileName = sanitizeFilename(`${baseTitle}_${Date.now()}.pdf`, 'pdf');

  if (Platform.OS === 'web') {
    await shareLocalFile(uri, 'application/pdf', fileName);
    return { saved: true, fileName };
  }

  let pickedDir: Directory;
  try {
    pickedDir = await Directory.pickDirectoryAsync();
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('cancel') || msg.includes('abort')) {
      return { saved: false, fileName };
    }
    throw err;
  }

  const bytes = await new File(uri).bytes();
  const destFile = pickedDir.createFile(fileName, 'application/pdf');
  await destFile.write(bytes);
  return { saved: true, fileName };
}
