import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { createSampleDocumentDataUri } from './src/utils/sampleDocument';

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
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, searchQuery]);

  const openLegal = (docId: LegalDocId, returnTo: 'onboarding' | 'settings') => {
    setActiveLegalDoc(docId);
    setLegalReturnRoute(returnTo);
    setRoute('legal');
  };

  const openDocument = async (doc: ScanDocument, targetRoute: 'document' | 'export' = 'document') => {
    const pages = await listPagesByDocument(doc.id);
    setActiveDoc(doc);
    setActivePages(pages);
    setRoute(targetRoute);
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

  const handleTrySampleScan = async () => {
    const sampleUri = createSampleDocumentDataUri();
    await handleIncomingAssets([
      {
        id: `sample_${Date.now()}`,
        uri: sampleUri,
        width: 480,
        height: 640,
        source: 'gallery',
        createdAt: Date.now(),
      },
    ]);
  };

  const handleOpenLatestExport = async () => {
    if (documents.length === 0) {
      Alert.alert(
        'No Documents Yet',
        'Scan or import a document first to export it as a PDF or image.'
      );
      return;
    }
    await openDocument(documents[0], 'export');
  };

  const handleOpenLatestEnhance = async () => {
    if (documents.length === 0) {
      await handleQuickImport();
      return;
    }
    const pages = await listPagesByDocument(documents[0].id);
    if (pages.length === 0) {
      await handleQuickImport();
      return;
    }
    setActiveDoc(documents[0]);
    setActivePages(pages);
    setEditingPageId(pages[0].id);
    setPendingUri(pages[0].originalUri);
    setRoute('edit');
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
                'You are running the latest version of SnapDoc.'
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
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
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

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search documents..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search scanned documents"
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Feature Tools Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            TOOLS & FEATURES
          </Text>
        </View>

        <View style={styles.toolsGrid}>
          <Pressable
            onPress={() => {
              setActiveDoc(null);
              setRoute('capture');
            }}
            accessibilityRole="button"
            accessibilityLabel="Smart Camera Scan"
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.toolIconBox, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Ionicons name="camera-outline" size={20} color={colors.primaryText} />
            </View>
            <Text style={[styles.toolTitle, { color: colors.primaryText }]}>
              Smart Scan
            </Text>
            <Text
              style={[
                styles.toolDesc,
                { color: resolvedScheme === 'dark' ? '#334155' : '#CBD5E1' },
              ]}
            >
              Capture & auto-crop
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setActiveDoc(null);
              handleQuickImport();
            }}
            accessibilityRole="button"
            accessibilityLabel="Import Photos"
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.toolIconBox, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="images-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>
              Import Photos
            </Text>
            <Text style={[styles.toolDesc, { color: colors.textSecondary }]}>
              JPG, PNG & WebP
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenLatestEnhance}
            accessibilityRole="button"
            accessibilityLabel="Crop and Enhance Filters"
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.toolIconBox, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="color-wand-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>
              Crop & Filters
            </Text>
            <Text style={[styles.toolDesc, { color: colors.textSecondary }]}>
              Magic Color & B&W
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenLatestExport}
            accessibilityRole="button"
            accessibilityLabel="Export to PDF or Image"
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.toolIconBox, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>
              PDF & Image
            </Text>
            <Text style={[styles.toolDesc, { color: colors.textSecondary }]}>
              Export A4 or JPG/PNG
            </Text>
          </Pressable>
        </View>

        {/* Recent Documents */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            RECENT DOCUMENTS
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            {filteredDocuments.length}
          </Text>
        </View>

        <FlatList
          data={filteredDocuments}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="scan-outline" size={24} color={colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery ? 'No matching documents' : 'No scanned documents yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Use Smart Scan, Import Photos, or try a sample document to preview cropping, filters, and PDF export.'}
              </Text>
              {!searchQuery ? (
                <Pressable
                  onPress={handleTrySampleScan}
                  accessibilityRole="button"
                  accessibilityLabel="Try a sample document scan"
                  style={({ pressed }) => [
                    styles.sampleBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
                  <Text style={[styles.sampleBtnText, { color: colors.accent }]}>
                    Try Sample Document
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const formattedDate = formatRelativeDate(item.updatedAt);
            return (
              <Pressable
                onPress={() => openDocument(item, 'document')}
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
                <Pressable
                  onPress={() => openDocument(item, 'export')}
                  accessibilityRole="button"
                  accessibilityLabel={`Export ${item.title}`}
                  style={[styles.quickExportBtn, { backgroundColor: colors.accentSoft }]}
                >
                  <Ionicons name="share-outline" size={16} color={colors.accent} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      </ScrollView>
      <UpdateModal
        manifest={availableUpdate}
        onDismiss={() => setAvailableUpdate(null)}
      />
    </StudioShell>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 14,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
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
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    width: '48.4%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  toolIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  toolDesc: {
    fontSize: 12,
  },
  listContent: {
    gap: 10,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    gap: 10,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  sampleBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
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
  quickExportBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
