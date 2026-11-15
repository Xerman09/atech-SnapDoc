import { ScanDocument, ScannedPage } from '../../types/scanner';

const WEB_DOCS_KEY = 'snapdoc_web_documents';
const WEB_PAGES_KEY = 'snapdoc_web_pages';

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof globalThis.localStorage === 'undefined') return fallback;
    const raw = globalThis.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    if (typeof globalThis.localStorage === 'undefined') return;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function webListDocuments(): ScanDocument[] {
  return readJson<ScanDocument[]>(WEB_DOCS_KEY, []).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}

export function webCreateDocument(doc: ScanDocument): ScanDocument {
  const docs = webListDocuments();
  docs.unshift(doc);
  writeJson(WEB_DOCS_KEY, docs);
  return doc;
}

export function webRenameDocument(documentId: string, safeTitle: string): string {
  const docs = webListDocuments().map((d) =>
    d.id === documentId ? { ...d, title: safeTitle, updatedAt: Date.now() } : d
  );
  writeJson(WEB_DOCS_KEY, docs);
  return safeTitle;
}

export function webListPages(documentId: string): ScannedPage[] {
  return readJson<ScannedPage[]>(WEB_PAGES_KEY, [])
    .filter((p) => p.documentId === documentId)
    .sort((a, b) => a.pageIndex - b.pageIndex);
}

function webSyncSummary(documentId: string): void {
  const pages = webListPages(documentId);
  const docs = webListDocuments().map((d) =>
    d.id === documentId
      ? {
          ...d,
          pageCount: pages.length,
          coverUri: pages[0]?.processedUri,
          updatedAt: Date.now(),
        }
      : d
  );
  writeJson(WEB_DOCS_KEY, docs);
}

export function webAddPage(page: ScannedPage): ScannedPage {
  const allPages = readJson<ScannedPage[]>(WEB_PAGES_KEY, []);
  allPages.push(page);
  writeJson(WEB_PAGES_KEY, allPages);
  webSyncSummary(page.documentId);
  return page;
}

export function webUpdatePage(
  pageId: string,
  documentId: string,
  patch: Partial<ScannedPage>
): void {
  const allPages = readJson<ScannedPage[]>(WEB_PAGES_KEY, []).map((p) =>
    p.id === pageId && p.documentId === documentId ? { ...p, ...patch } : p
  );
  writeJson(WEB_PAGES_KEY, allPages);
  webSyncSummary(documentId);
}

export function webMovePage(
  documentId: string,
  pageId: string,
  direction: 'up' | 'down'
): void {
  const docPages = webListPages(documentId);
  const idx = docPages.findIndex((p) => p.id === pageId);
  if (idx === -1) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= docPages.length) return;

  [docPages[idx], docPages[swapIdx]] = [docPages[swapIdx], docPages[idx]];
  const updatedIds = new Map(docPages.map((p, i) => [p.id, i]));

  const allPages = readJson<ScannedPage[]>(WEB_PAGES_KEY, []).map((p) =>
    p.documentId === documentId && updatedIds.has(p.id)
      ? { ...p, pageIndex: updatedIds.get(p.id)! }
      : p
  );
  writeJson(WEB_PAGES_KEY, allPages);
  webSyncSummary(documentId);
}

export function webDeletePage(documentId: string, pageId: string): void {
  const remaining = readJson<ScannedPage[]>(WEB_PAGES_KEY, []).filter(
    (p) => !(p.id === pageId && p.documentId === documentId)
  );
  let idx = 0;
  const reindexed = remaining.map((p) =>
    p.documentId === documentId ? { ...p, pageIndex: idx++ } : p
  );
  writeJson(WEB_PAGES_KEY, reindexed);
  webSyncSummary(documentId);
}

export function webDeleteDocument(documentId: string): void {
  const docs = webListDocuments().filter((d) => d.id !== documentId);
  const pages = readJson<ScannedPage[]>(WEB_PAGES_KEY, []).filter(
    (p) => p.documentId !== documentId
  );
  writeJson(WEB_DOCS_KEY, docs);
  writeJson(WEB_PAGES_KEY, pages);
}

export function webWipeAll(): void {
  writeJson(WEB_DOCS_KEY, []);
  writeJson(WEB_PAGES_KEY, []);
}
