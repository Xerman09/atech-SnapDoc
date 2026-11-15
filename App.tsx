import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BrandHeader } from './src/components/BrandHeader';
import { StudioShell } from './src/components/StudioShell';
import { UpdateModal } from './src/components/UpdateModal';
import { LegalDocId } from './src/constants/legal';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { CropAndEnhanceScreen } from './src/screens/CropAndEnhanceScreen';
import { DocumentDetailScreen } from './src/screens/DocumentDetailScreen';
import { ExportScreen } from './src/screens/ExportScreen';
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
import {
  checkForInAppUpdate,
  UpdateManifest,
} from './src/services/update/inAppUpdater';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ScanDocument, ScannedPage } from './src/types/scanner';
import { formatRelativeDate, formatShortDate } from './src/utils/dateFormat';

type ActiveRoute =
  | 'onboarding'
  | 'home'
  | 'capture'
  | 'edit'
  | 'document'
  | 'export'
  | 'settings'
  | 'legal';

function MainApp() {
  const { colors, resolvedScheme, toggleTheme } = useTheme();
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
  const [availableUpdate, setAvailableUpdate] = useState<UpdateManifest | null>(null);

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

      checkForInAppUpdate().then((manifest) => {
        if (manifest) setAvailableUpdate(manifest);
      });
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
      <StudioShell style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </StudioShell>
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

  if (route === 'export' && activeDoc) {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <ExportScreen
          document={activeDoc}
          pages={activePages}
          onBack={() => setRoute('document')}
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
          onExport={() => setRoute('export')}
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
          onCheckForUpdates={async () => {
            const manifest = await checkForInAppUpdate();
            if (manifest) {
              setAvailableUpdate(manifest);
            } else {
              Alert.alert(
                'Up to Date',
                'You are running the latest version of SnapDoc (or you are currently offline).'
              );
            }
          }}
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
    <StudioShell>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <BrandHeader />
          </View>
          <View style={styles.topActions}>
            <Pressable
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${resolvedScheme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={[
                styles.iconCircle,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Ionicons
                name={resolvedScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={colors.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={() => setRoute('settings')}
              accessibilityRole="button"
              accessibilityLabel="Open Settings and Privacy"
              style={[
                styles.iconCircle,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              setActiveDoc(null);
              setRoute('capture');
            }}
            accessibilityRole="button"
            accessibilityLabel="Open camera to scan a new document"
            style={({ pressed }) => [
              styles.primaryAction,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="camera-outline" size={18} color={colors.primaryText} />
            <Text style={[styles.primaryActionText, { color: colors.primaryText }]}>
              Scan Document
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setActiveDoc(null);
              handleQuickImport();
            }}
            accessibilityRole="button"
            accessibilityLabel="Import document images from gallery"
            style={({ pressed }) => [
              styles.secondaryAction,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="images-outline" size={18} color={colors.textPrimary} />
            <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
              Import
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            RECENT DOCUMENTS
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            {documents.length}
          </Text>
        </View>

        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="scan-outline" size={26} color={colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Your library is empty
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Capture a document with your camera or import photos to crop, enhance, and export as PDF or image.
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
                style={({ pressed }) => [
                  styles.pageCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {item.coverUri ? (
                  <Image
                    source={{ uri: item.coverUri }}
                    style={[styles.thumb, { borderColor: colors.borderSubtle }]}
                    accessibilityLabel={`Cover page of ${item.title}`}
                  />
                ) : (
                  <View
                    style={[
                      styles.thumbPlaceholder,
                      { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
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
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            );
          }}
        />
      </View>
      <UpdateModal
        manifest={availableUpdate}
        onDismiss={() => setAvailableUpdate(null)}
      />
    </StudioShell>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1.5,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    gap: 10,
    paddingBottom: 28,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    gap: 10,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  pageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 14,
  },
  thumb: {
    width: 50,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
  },
  thumbPlaceholder: {
    width: 50,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageMeta: {
    flex: 1,
    gap: 3,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 12.5,
  },
});
