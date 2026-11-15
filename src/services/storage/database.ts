import * as SQLite from 'expo-sqlite';
import { z } from 'zod';
import {
  AdjustmentSettings,
  CropQuad,
  FilterPreset,
  ScanDocument,
  ScannedPage,
} from '../../types/scanner';
import { deleteLocalScanFile } from './localFiles';

const DB_NAME = 'snapdoc.db';

const TitleSchema = z
  .string()
  .trim()
  .min(1, 'Document title cannot be empty')
  .max(80, 'Document title must be 80 characters or fewer');

const FilterSchema = z.enum(['original', 'magic_color', 'grayscale', 'bw_scan']);

const AdjustmentsSchema = z.object({
  brightness: z.number().min(-100).max(100),
  contrast: z.number().min(-100).max(100),
  sharpness: z.number().min(0).max(100),
});

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          page_count INTEGER NOT NULL DEFAULT 0,
          cover_uri TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY NOT NULL,
          document_id TEXT NOT NULL,
          page_index INTEGER NOT NULL,
          original_uri TEXT NOT NULL,
          processed_uri TEXT NOT NULL,
          crop_quad_json TEXT,
          rotation INTEGER NOT NULL DEFAULT 0,
          filter TEXT NOT NULL DEFAULT 'original',
          adjustments_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export function sanitizeDocumentTitle(rawTitle: string): string {
  const cleaned = rawTitle.replace(/[\r\n\t<>]/g, ' ').trim();
  const parsed = TitleSchema.safeParse(cleaned || 'Scanned Document');
  return parsed.success ? parsed.data : 'Scanned Document';
}

interface DocumentRow {
  id: string;
  title: string;
  page_count: number;
  cover_uri: string | null;
  created_at: number;
  updated_at: number;
}

interface PageRow {
  id: string;
  document_id: string;
  page_index: number;
  original_uri: string;
  processed_uri: string;
  crop_quad_json: string | null;
  rotation: number;
  filter: string;
  adjustments_json: string;
  created_at: number;
}

function mapDocumentRow(row: DocumentRow): ScanDocument {
  return {
    id: row.id,
    title: row.title,
    pageCount: row.page_count,
    coverUri: row.cover_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPageRow(row: PageRow): ScannedPage {
  let cropQuad: CropQuad | undefined;
  if (row.crop_quad_json) {
    try {
      cropQuad = JSON.parse(row.crop_quad_json) as CropQuad;
    } catch {
      cropQuad = undefined;
    }
  }

  let adjustments: AdjustmentSettings = { brightness: 0, contrast: 0, sharpness: 15 };
  try {
    const parsed = AdjustmentsSchema.safeParse(JSON.parse(row.adjustments_json));
    if (parsed.success) adjustments = parsed.data;
  } catch {
    // Keep default adjustments
  }

  const parsedFilter = FilterSchema.safeParse(row.filter);
  const filter: FilterPreset = parsedFilter.success ? parsedFilter.data : 'original';

  const rot = row.rotation === 90 || row.rotation === 180 || row.rotation === 270 ? row.rotation : 0;

  return {
    id: row.id,
    documentId: row.document_id,
    pageIndex: row.page_index,
    originalUri: row.original_uri,
    processedUri: row.processed_uri,
    cropQuad,
    rotation: rot,
    filter,
    adjustments,
    createdAt: row.created_at,
  };
}

export async function listDocuments(): Promise<ScanDocument[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DocumentRow>(
    'SELECT id, title, page_count, cover_uri, created_at, updated_at FROM documents ORDER BY updated_at DESC'
  );
  return rows.map(mapDocumentRow);
}

export async function createDocument(title: string): Promise<ScanDocument> {
  const db = await getDb();
  const safeTitle = sanitizeDocumentTitle(title);
  const now = Date.now();
  const id = `doc_${now}_${Math.random().toString(36).slice(2, 7)}`;

  await db.runAsync(
    'INSERT INTO documents (id, title, page_count, cover_uri, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, safeTitle, 0, null, now, now]
  );

  return {
    id,
    title: safeTitle,
    pageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export async function renameDocument(documentId: string, newTitle: string): Promise<string> {
  const db = await getDb();
  const safeTitle = sanitizeDocumentTitle(newTitle);
  const now = Date.now();
  await db.runAsync(
    'UPDATE documents SET title = ?, updated_at = ? WHERE id = ?',
    [safeTitle, now, documentId]
  );
  return safeTitle;
}

export async function listPagesByDocument(documentId: string): Promise<ScannedPage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PageRow>(
    'SELECT * FROM pages WHERE document_id = ? ORDER BY page_index ASC',
    [documentId]
  );
  return rows.map(mapPageRow);
}

async function syncDocumentSummary(db: SQLite.SQLiteDatabase, documentId: string): Promise<void> {
  const pages = await db.getAllAsync<{ processed_uri: string }>(
    'SELECT processed_uri FROM pages WHERE document_id = ? ORDER BY page_index ASC',
    [documentId]
  );
  const coverUri = pages[0]?.processed_uri ?? null;
  await db.runAsync(
    'UPDATE documents SET page_count = ?, cover_uri = ?, updated_at = ? WHERE id = ?',
    [pages.length, coverUri, Date.now(), documentId]
  );
}

export async function addPageToDocument(params: {
  documentId: string;
  originalUri: string;
  processedUri: string;
  cropQuad?: CropQuad;
  filter: FilterPreset;
  adjustments: AdjustmentSettings;
}): Promise<ScannedPage> {
  const db = await getDb();
  const countRow = await db.getFirstAsync<{ max_idx: number | null }>(
    'SELECT MAX(page_index) as max_idx FROM pages WHERE document_id = ?',
    [params.documentId]
  );
  const nextIndex = (countRow?.max_idx ?? -1) + 1;
  const now = Date.now();
  const id = `page_${now}_${Math.random().toString(36).slice(2, 7)}`;

  const validFilter = FilterSchema.parse(params.filter);
  const validAdjustments = AdjustmentsSchema.parse(params.adjustments);

  await db.runAsync(
    `INSERT INTO pages (
      id, document_id, page_index, original_uri, processed_uri,
      crop_quad_json, rotation, filter, adjustments_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.documentId,
      nextIndex,
      params.originalUri,
      params.processedUri,
      params.cropQuad ? JSON.stringify(params.cropQuad) : null,
      0,
      validFilter,
      JSON.stringify(validAdjustments),
      now,
    ]
  );

  await syncDocumentSummary(db, params.documentId);

  return {
    id,
    documentId: params.documentId,
    pageIndex: nextIndex,
    originalUri: params.originalUri,
    processedUri: params.processedUri,
    cropQuad: params.cropQuad,
    rotation: 0,
    filter: validFilter,
    adjustments: validAdjustments,
    createdAt: now,
  };
}

export async function updatePage(params: {
  pageId: string;
  documentId: string;
  originalUri: string;
  processedUri: string;
  cropQuad?: CropQuad;
  filter: FilterPreset;
  adjustments: AdjustmentSettings;
}): Promise<void> {
  const db = await getDb();
  const validFilter = FilterSchema.parse(params.filter);
  const validAdjustments = AdjustmentsSchema.parse(params.adjustments);

  await db.runAsync(
    `UPDATE pages
     SET original_uri = ?, processed_uri = ?, crop_quad_json = ?, filter = ?, adjustments_json = ?
     WHERE id = ? AND document_id = ?`,
    [
      params.originalUri,
      params.processedUri,
      params.cropQuad ? JSON.stringify(params.cropQuad) : null,
      validFilter,
      JSON.stringify(validAdjustments),
      params.pageId,
      params.documentId,
    ]
  );

  await syncDocumentSummary(db, params.documentId);
}

export async function movePageOrder(
  documentId: string,
  pageId: string,
  direction: 'up' | 'down'
): Promise<void> {
  const db = await getDb();
  const pages = await listPagesByDocument(documentId);
  const idx = pages.findIndex((p) => p.id === pageId);
  if (idx === -1) return;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= pages.length) return;

  const reordered = [...pages];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < reordered.length; i++) {
      await db.runAsync(
        'UPDATE pages SET page_index = ? WHERE id = ? AND document_id = ?',
        [i, reordered[i].id, documentId]
      );
    }
    await syncDocumentSummary(db, documentId);
  });
}

export async function deletePage(documentId: string, pageId: string): Promise<void> {
  const db = await getDb();
  const target = await db.getFirstAsync<{ original_uri: string; processed_uri: string }>(
    'SELECT original_uri, processed_uri FROM pages WHERE id = ? AND document_id = ?',
    [pageId, documentId]
  );

  await db.runAsync('DELETE FROM pages WHERE id = ? AND document_id = ?', [pageId, documentId]);

  if (target) {
    deleteLocalScanFile(target.original_uri);
    if (target.processed_uri !== target.original_uri) {
      deleteLocalScanFile(target.processed_uri);
    }
  }

  const remaining = await listPagesByDocument(documentId);
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < remaining.length; i++) {
      await db.runAsync('UPDATE pages SET page_index = ? WHERE id = ?', [i, remaining[i].id]);
    }
    await syncDocumentSummary(db, documentId);
  });
}

export async function deleteDocument(documentId: string): Promise<void> {
  const db = await getDb();
  const pages = await listPagesByDocument(documentId);
  await db.runAsync('DELETE FROM documents WHERE id = ?', [documentId]);

  for (const p of pages) {
    deleteLocalScanFile(p.originalUri);
    if (p.processedUri !== p.originalUri) {
      deleteLocalScanFile(p.processedUri);
    }
  }
}

export async function wipeAllDatabaseData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM pages; DELETE FROM documents;');
}
