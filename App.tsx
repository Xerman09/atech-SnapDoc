import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandHeader } from './src/components/BrandHeader';
import { LegalDocId } from './src/constants/legal';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { CropAndEnhanceScreen } from './src/screens/CropAndEnhanceScreen';
import { DocumentDetailScreen } from './src/screens/DocumentDetailScreen';
import { LegalDocumentScreen } from './src/screens/LegalDocumentScreen';
import { OnboardingConsentScreen } from './src/screens/OnboardingConsentScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import {
  CapturedImageAsset,
  pickAndValidateImages,
} from './src/services/capture/importImages';
import {
  addPageToDocument,
  createDocument,
  deleteDocument,
  deletePage,
  listDocuments,
  listPagesByDocument,
  movePageOrder,
  renameDocument,
  updatePage,
  wipeAllDatabaseData,
} from './src/services/storage/database';
import { deleteAllScanFiles } from './src/services/storage/localFiles';
import {
  clearSecurePrefs,
  getStoredConsent,
  setStoredConsent,
} from './src/services/storage/securePrefs';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ScanDocument, ScannedPage } from './src/types/scanner';
import { formatRelativeDate, formatShortDate } from './src/utils/dateFormat';

type ActiveRoute =
  | 'onboarding'
  | 'home'
  | 'capture'
  | 'edit'
  | 'document'
  | 'settings'
  | 'legal';

function MainApp() {
  const { colors, resolvedScheme } = useTheme();
  const [initializing, setInitializing] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [route, setRoute] = useState<ActiveRoute>('onboarding');
  const [legalReturnRoute, setLegalReturnRoute] = useState<'onboarding' | 'settings'>('onboarding');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocId>('privacy');

  const [documents, setDocuments] = useState<ScanDocument[]>([]);
  const [activeDoc, setActiveDoc] = useState<ScanDocument | null>(null);
  const [activePages, setActivePages] = useState<ScannedPage[]>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    const docs = await listDocuments();
    setDocuments(docs);
    if (activeDoc) {
      const updated = docs.find((d) => d.id === activeDoc.id) ?? null;
      setActiveDoc(updated);
      if (updated) {
        const pages = await listPagesByDocument(updated.id);
        setActivePages(pages);
      } else {
        setActivePages([]);
      }
    }
  }, [activeDoc]);

  useEffect(() => {
    (async () => {
      const consented = await getStoredConsent();
      const docs = await listDocuments();
      setDocuments(docs);
      setHasConsented(consented);
      setRoute(consented ? 'home' : 'onboarding');
      setInitializing(false);
    })();
  }, []);

  const openLegal = (docId: LegalDocId, returnTo: 'onboarding' | 'settings') => {
    setActiveLegalDoc(docId);
    setLegalReturnRoute(returnTo);
    setRoute('legal');
  };

  const openDocument = async (doc: ScanDocument) => {
    const pages = await listPagesByDocument(doc.id);
    setActiveDoc(doc);
    setActivePages(pages);
    setRoute('document');
  };

  const handleIncomingAssets = async (assets: CapturedImageAsset[]) => {
    if (assets.length === 0) return;

    let targetDoc = activeDoc;
    if (!targetDoc) {
      targetDoc = await createDocument(`Scan ${formatShortDate(Date.now())}`);
      setActiveDoc(targetDoc);
    }

    // Save any extra batch-imported images directly as pages
    for (let i = 1; i < assets.length; i++) {
      await addPageToDocument({
        documentId: targetDoc.id,
        originalUri: assets[i].uri,
        processedUri: assets[i].uri,
        filter: 'original',
        adjustments: { brightness: 0, contrast: 0, sharpness: 15 },
      });
    }

    setEditingPageId(null);
    setPendingUri(assets[0].uri);
    setRoute('edit');
  };

  const handleQuickImport = async () => {
    const result = await pickAndValidateImages();
    if (result.rejected.length > 0) {
      const summary = result.rejected
        .map((item) => `• ${item.name}: ${item.reason}`)
        .join('\n');
      Alert.alert('Some Images Were Skipped', summary);
    }
    if (result.imported.length > 0) {
      await handleIncomingAssets(result.imported);
    }
  };

  if (initializing) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (route === 'legal') {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <LegalDocumentScreen
          docId={activeLegalDoc}
          onBack={() => setRoute(legalReturnRoute)}
        />
      </>
    );
  }

  if (!hasConsented || route === 'onboarding') {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <OnboardingConsentScreen
          onAccept={async () => {
            await setStoredConsent(true);
            setHasConsented(true);
            setRoute('home');
          }}
          onOpenLegal={(docId) => openLegal(docId, 'onboarding')}
        />
      </>
    );
  }

  if (route === 'capture') {
    return (
      <>
        <StatusBar style="light" />
        <CaptureScreen
          onCaptured={handleIncomingAssets}
          onCancel={() => setRoute(activeDoc ? 'document' : 'home')}
        />
      </>
    );
  }

  if (route === 'edit' && pendingUri && activeDoc) {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <CropAndEnhanceScreen
          initialUri={pendingUri}
          onSave={async (edited) => {
            if (editingPageId) {
              await updatePage({
                pageId: editingPageId,
                documentId: activeDoc.id,
                originalUri: edited.originalUri,
                processedUri: edited.processedUri,
                cropQuad: edited.cropQuad,
                filter: edited.filter,
                adjustments: edited.adjustments,
              });
            } else {
              await addPageToDocument({
                documentId: activeDoc.id,
                originalUri: edited.originalUri,
                processedUri: edited.processedUri,
                cropQuad: edited.cropQuad,
                filter: edited.filter,
                adjustments: edited.adjustments,
              });
            }
            setPendingUri(null);
            setEditingPageId(null);
            await refreshDocuments();
            setRoute('document');
          }}
          onCancel={async () => {
            setPendingUri(null);
            setEditingPageId(null);
            await refreshDocuments();
            setRoute(activeDoc ? 'document' : 'home');
          }}
        />
      </>
    );
  }

  if (route === 'document' && activeDoc) {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <DocumentDetailScreen
          document={activeDoc}
          pages={activePages}
          onBack={async () => {
            setActiveDoc(null);
            setActivePages([]);
            await refreshDocuments();
            setRoute('home');
          }}
          onRename={async (newTitle) => {
            await renameDocument(activeDoc.id, newTitle);
            await refreshDocuments();
          }}
          onAddPageCamera={() => setRoute('capture')}
          onAddPageGallery={handleQuickImport}
          onEditPage={(page) => {
            setEditingPageId(page.id);
            setPendingUri(page.originalUri);
            setRoute('edit');
          }}
          onMovePage={async (pageId, direction) => {
            await movePageOrder(activeDoc.id, pageId, direction);
            await refreshDocuments();
          }}
          onDeletePage={async (pageId) => {
            await deletePage(activeDoc.id, pageId);
            await refreshDocuments();
          }}
          onDeleteDocument={async () => {
            await deleteDocument(activeDoc.id);
            setActiveDoc(null);
            setActivePages([]);
            const docs = await listDocuments();
            setDocuments(docs);
            setRoute('home');
          }}
        />
      </>
    );
  }

  if (route === 'settings') {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <SettingsScreen
          onBack={() => setRoute('home')}
          onOpenLegal={(docId) => openLegal(docId, 'settings')}
          onDeleteAllData={async () => {
            await wipeAllDatabaseData();
            deleteAllScanFiles();
            await clearSecurePrefs();
            setDocuments([]);
            setActiveDoc(null);
            setActivePages([]);
            setPendingUri(null);
            setHasConsented(false);
            setRoute('onboarding');
          }}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <BrandHeader />
          </View>
          <Pressable
            onPress={() => setRoute('settings')}
            accessibilityRole="button"
            accessibilityLabel="Open Settings and Privacy"
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.iconBtnText, { color: colors.textPrimary }]}>Settings</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              setActiveDoc(null);
              setRoute('capture');
            }}
            accessibilityRole="button"
            accessibilityLabel="Open camera to scan a new document"
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.primaryText }]}>
              Scan Camera
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setActiveDoc(null);
              handleQuickImport();
            }}
            accessibilityRole="button"
            accessibilityLabel="Import document images from gallery"
            style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
              Import Images
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Documents Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap "Scan Camera" or "Import Images" to create your first multi-page offline document.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const formattedDate = formatRelativeDate(item.updatedAt);
            return (
              <Pressable
                onPress={() => openDocument(item)}
                accessibilityRole="button"
                accessibilityLabel={`Open document ${item.title}, ${item.pageCount} pages, updated ${formattedDate}`}
                style={[styles.pageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {item.coverUri ? (
                  <Image
                    source={{ uri: item.coverUri }}
                    style={[styles.thumb, { borderColor: colors.border }]}
                    accessibilityLabel={`Cover page of ${item.title}`}
                  />
                ) : (
                  <View style={[styles.thumbPlaceholder, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.thumbPlaceholderText, { color: colors.textSecondary }]}>DOC</Text>
                  </View>
                )}
                <View style={styles.pageMeta}>
                  <Text style={[styles.pageTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                    {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} • {formattedDate}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandWrap: {
    flex: 1,
  },
  iconBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  pageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
  },
  thumbPlaceholder: {
    width: 56,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pageMeta: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 13,
  },
});
