export type LegalDocId = 'privacy' | 'terms' | 'refund' | 'cookies' | 'business';

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDocument {
  id: LegalDocId;
  title: string;
  lastUpdatedTimestamp: number; // Formatted via dateFormat.ts in UI
  sections: LegalSection[];
}

export const BUSINESS_INFO = {
  appName: 'SnapDoc',
  developerName: 'Atech System',
  supportEmail: 'support@atechsystem.local',
  appVersion: '1.0.7',
  releaseDateMs: Date.UTC(2026, 10, 15, 0, 25, 0),
};

export const LEGAL_DOCUMENTS: Record<LegalDocId, LegalDocument> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    lastUpdatedTimestamp: BUSINESS_INFO.releaseDateMs,
    sections: [
      {
        heading: '1. 100% Offline & Local-Only Processing',
        body: 'SnapDoc processes all document captures, edge detection, image enhancements, and PDF exports strictly on your device. No documents, images, or personal data are ever uploaded to external servers.',
      },
      {
        heading: '2. Data We Collect',
        body: 'We collect only what is strictly necessary on your device: camera access (to capture documents) and local storage access (to save and export your scans). We do not collect analytics, telemetry, location data, or advertising identifiers.',
      },
      {
        heading: '3. Third-Party SDKs',
        body: 'SnapDoc uses only audited open-source runtime libraries required for offline mobile rendering and local storage. Zero advertising, tracking, or behavioral profiling SDKs are included.',
      },
      {
        heading: '4. Your Data Deletion Rights',
        body: 'You have full control over your local data. Use "Delete All Local Data & Scans" in Settings at any time to permanently erase all scanned documents, cached images, and preferences from your device.',
      },
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    lastUpdatedTimestamp: BUSINESS_INFO.releaseDateMs,
    sections: [
      {
        heading: '1. License & Permitted Use',
        body: 'SnapDoc is provided as a free, offline utility for scanning, enhancing, and exporting documents locally on your device.',
      },
      {
        heading: '2. User Responsibility',
        body: 'You retain full ownership and responsibility for all documents you scan, store, or export. Ensure you comply with applicable laws when scanning third-party or copyrighted materials.',
      },
      {
        heading: '3. No Hidden Fees',
        body: 'SnapDoc contains no hidden fees, subscriptions, or deceptive prompts. All core scanning and PDF export features operate offline at no cost.',
      },
    ],
  },
  refund: {
    id: 'refund',
    title: 'Refund Policy',
    lastUpdatedTimestamp: BUSINESS_INFO.releaseDateMs,
    sections: [
      {
        heading: 'Free Offline Software',
        body: 'SnapDoc is distributed as 100% free, local-only software with no paid subscriptions, in-app purchases, or hidden charges. Because no payments are collected, no monetary refunds are applicable.',
      },
    ],
  },
  cookies: {
    id: 'cookies',
    title: 'Cookie Policy',
    lastUpdatedTimestamp: BUSINESS_INFO.releaseDateMs,
    sections: [
      {
        heading: 'Zero Cookies & Zero Trackers',
        body: 'SnapDoc is a native offline mobile application and does not use browser cookies, tracking pixels, or cross-app advertising trackers. Local preferences (such as Light/Dark theme) are stored solely in your device storage.',
      },
    ],
  },
  business: {
    id: 'business',
    title: 'Business & Developer Details',
    lastUpdatedTimestamp: BUSINESS_INFO.releaseDateMs,
    sections: [
      {
        heading: 'Publisher Information',
        body: `Developer: ${BUSINESS_INFO.developerName}\nApplication: ${BUSINESS_INFO.appName} (v${BUSINESS_INFO.appVersion})`,
      },
      {
        heading: 'Support & Inquiries',
        body: `For support, accessibility feedback, or legal inquiries, contact: ${BUSINESS_INFO.supportEmail}`,
      },
    ],
  },
};
