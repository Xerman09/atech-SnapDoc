import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
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
  duplicatePage,
  listDocuments,
  listPagesByDocument,
  mergeDocuments,
  movePageOrder,
  renameDocument,
  reversePageOrder,
  updateDocumentFolder,
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
import { DocumentFolder, ScanDocument, ScannedPage } from './src/types/scanner';
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
  const [selectedFolder, setSelectedFolder] = useState<'All' | DocumentFolder>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az' | 'pages'>('newest');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeDoc, setActiveDoc] = useState<ScanDocument | null>(null);
  const [activePages, setActivePages] = useState<ScannedPage[]>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);
  const [queueTotal, setQueueTotal] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
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

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'legal') {
        setRoute(legalReturnRoute);
        return true;
      }
      if (route === 'export') {
        setRoute('document');
        return true;
      }
      if (route === 'edit') {
        setPendingUri(null);
        setPendingQueue([]);
        setQueueTotal(1);
        setEditingPageId(null);
        setRoute(activeDoc ? 'document' : 'home');
        return true;
      }
      if (route === 'capture') {
        setRoute(activeDoc ? 'document' : 'home');
        return true;
      }
      if (route === 'document') {
        setActiveDoc(null);
        setActivePages([]);
        setRoute('home');
        return true;
      }
      if (route === 'settings') {
        setRoute('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [route, legalReturnRoute, activeDoc]);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = documents.filter((d) => {
      const folderOk =
        selectedFolder === 'All' || (d.folder ?? 'General') === selectedFolder;
      const queryOk = !q || d.title.toLowerCase().includes(q);
      return folderOk && queryOk;
    });
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'oldest') return a.updatedAt - b.updatedAt;
      if (sortOrder === 'az') return a.title.localeCompare(b.title);
      if (sortOrder === 'pages') return b.pageCount - a.pageCount;
      return b.updatedAt - a.updatedAt;
    });
  }, [documents, searchQuery, selectedFolder, sortOrder]);

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
    setPendingQueue(assets.slice(1).map((a) => a.uri));
    setQueueTotal(assets.length);
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
    const queueLabel =
      queueTotal > 1
        ? `${queueTotal - pendingQueue.length}/${queueTotal}`
        : undefined;
    const advanceOrFinish = async () => {
      if (pendingQueue.length > 0) {
        const [nextUri, ...rest] = pendingQueue;
        setPendingQueue(rest);
        setPendingUri(nextUri);
        setEditingPageId(null);
        await refreshDocuments();
      } else {
        setPendingUri(null);
        setPendingQueue([]);
        setQueueTotal(1);
        setEditingPageId(null);
        await refreshDocuments();
        setRoute('document');
      }
    };
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <CropAndEnhanceScreen
          key={pendingUri}
          initialUri={pendingUri}
          queueLabel={queueLabel}
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
            await advanceOrFinish();
          }}
          onSaveMultiple={async (results) => {
            for (const edited of results) {
              await addPageToDocument({
                documentId: activeDoc.id,
                originalUri: edited.originalUri,
                processedUri: edited.processedUri,
                cropQuad: edited.cropQuad,
                filter: edited.filter,
                adjustments: edited.adjustments,
              });
            }
            await advanceOrFinish();
          }}
          onCancel={async () => {
            setPendingUri(null);
            setPendingQueue([]);
            setQueueTotal(1);
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
          onChangeFolder={async (folder) => {
            await updateDocumentFolder(activeDoc.id, folder);
            await refreshDocuments();
          }}
          onAddPageCamera={() => setRoute('capture')}
          onAddPageGallery={handleQuickImport}
          onEditPage={(page) => {
            setEditingPageId(page.id);
            setPendingUri(page.originalUri);
            setRoute('edit');
          }}
          onDuplicatePage={async (page) => {
            await duplicatePage(activeDoc.id, page);
            await refreshDocuments();
          }}
          onReversePages={async () => {
            await reversePageOrder(activeDoc.id);
            await refreshDocuments();
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
          docCount={documents.length}
          totalPages={documents.reduce((sum, d) => sum + d.pageCount, 0)}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await refreshDocuments();
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.accent}
          />
        }
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

        {/* Hero Smart Scan Card */}
        <Pressable
          onPress={() => {
            setActiveDoc(null);
            setRoute('capture');
          }}
          accessibilityRole="button"
          accessibilityLabel="Smart Camera Scan"
          style={({ pressed }) => [
            styles.heroCard,
            {
              backgroundColor: colors.heroBg,
              borderColor: colors.heroBorder,
              opacity: pressed ? 0.94 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}
        >
          <View style={styles.heroIconBadge}>
            <Ionicons name="scan-outline" size={24} color={colors.heroText} />
          </View>
          <View style={styles.heroTextGroup}>
            <Text style={[styles.heroTitle, { color: colors.heroText }]}>
              Scan Document
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.heroSubtext }]}>
              Auto-crop edges, flatten shadows & save PDF
            </Text>
          </View>
          <View style={styles.heroArrowPill}>
            <Ionicons name="arrow-forward" size={16} color={colors.heroText} />
          </View>
        </Pressable>

        {/* Quick Actions Row */}
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => {
              setActiveDoc(null);
              handleQuickImport();
            }}
            accessibilityRole="button"
            accessibilityLabel="Import Photos"
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.quickIconBox, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="images-outline" size={19} color={colors.accent} />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>
              Import
            </Text>
            <Text style={[styles.quickDesc, { color: colors.textMuted }]}>
              Gallery
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenLatestEnhance}
            accessibilityRole="button"
            accessibilityLabel="Crop and Enhance Filters"
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.quickIconBox, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="color-wand-outline" size={19} color={colors.accent} />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>
              Enhance
            </Text>
            <Text style={[styles.quickDesc, { color: colors.textMuted }]}>
              Filters
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenLatestExport}
            accessibilityRole="button"
            accessibilityLabel="Export to PDF or Image"
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.quickIconBox, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="document-text-outline" size={19} color={colors.accent} />
            </View>
            <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>
              Export
            </Text>
            <Text style={[styles.quickDesc, { color: colors.textMuted }]}>
              PDF & JPG
            </Text>
          </Pressable>
        </View>

        {/* Recent Documents */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            RECENT DOCUMENTS
          </Text>
          <View style={styles.sectionHeaderRight}>
            <Pressable
              onPress={() =>
                setSortOrder((prev) =>
                  prev === 'newest'
                    ? 'oldest'
                    : prev === 'oldest'
                      ? 'az'
                      : prev === 'az'
                        ? 'pages'
                        : 'newest'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Cycle document sort order"
              style={[
                styles.selectToggleBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.selectToggleText, { color: colors.textSecondary }]}>
                {sortOrder === 'newest'
                  ? 'Newest'
                  : sortOrder === 'oldest'
                    ? 'Oldest'
                    : sortOrder === 'az'
                      ? 'A–Z'
                      : 'Pages'}
              </Text>
            </Pressable>
            {documents.length >= 2 || selectMode ? (
              <Pressable
                onPress={() => {
                  setSelectMode((prev) => !prev);
                  setSelectedDocIds([]);
                }}
                accessibilityRole="button"
                accessibilityLabel={selectMode ? 'Cancel multi-select' : 'Select multiple documents to merge or delete'}
                style={[
                  styles.selectToggleBtn,
                  {
                    borderColor: selectMode ? colors.accent : colors.border,
                    backgroundColor: selectMode ? colors.accentSoft : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectToggleText,
                    { color: selectMode ? colors.accent : colors.textSecondary },
                  ]}
                >
                  {selectMode ? 'Done' : 'Select'}
                </Text>
              </Pressable>
            ) : null}
            <View style={[styles.countPill, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {filteredDocuments.length}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.folderFilterRow}
        >
          {(['All', 'General', 'Receipts', 'IDs', 'Work', 'School'] as const).map((folder) => {
            const active = selectedFolder === folder;
            return (
              <Pressable
                key={folder}
                onPress={() => setSelectedFolder(folder)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter documents by ${folder}`}
                style={[
                  styles.folderFilterChip,
                  {
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accentSoft : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.folderFilterText,
                    { color: active ? colors.accent : colors.textSecondary },
                  ]}
                >
                  {folder}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

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
            const isSelected = selectedDocIds.includes(item.id);
            return (
              <Pressable
                onPress={() => {
                  if (selectMode) {
                    setSelectedDocIds((prev) =>
                      prev.includes(item.id)
                        ? prev.filter((id) => id !== item.id)
                        : [...prev, item.id]
                    );
                    return;
                  }
                  openDocument(item, 'document');
                }}
                onLongPress={() => {
                  if (selectMode) return;
                  Alert.alert(item.title, 'Choose a quick action', [
                    { text: 'Open', onPress: () => openDocument(item, 'document') },
                    { text: 'Export PDF / Image', onPress: () => openDocument(item, 'export') },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteDocument(item.id);
                        await refreshDocuments();
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open document ${item.title}, ${item.pageCount} pages, updated ${formattedDate}`}
                style={({ pressed }) => [
                  styles.pageCard,
                  {
                    backgroundColor: isSelected ? colors.accentSoft : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {selectMode ? (
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? colors.accent : colors.textMuted}
                  />
                ) : null}
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
                  <View style={styles.pageSubRow}>
                    <View style={[styles.pageBadge, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.pageBadgeText, { color: colors.textSecondary }]}>
                        {item.pageCount} {item.pageCount === 1 ? 'pg' : 'pgs'}
                      </Text>
                    </View>
                    <View style={[styles.pageBadge, { backgroundColor: colors.accentSoft }]}>
                      <Text style={[styles.pageBadgeText, { color: colors.accent }]}>
                        {item.folder ?? 'General'}
                      </Text>
                    </View>
                    <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                      {formattedDate}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => openDocument(item, 'export')}
                  accessibilityRole="button"
                  accessibilityLabel={`Export ${item.title}`}
                  style={[styles.quickExportBtn, { backgroundColor: colors.accentSoft }]}
                >
                  <Ionicons name="share-outline" size={16} color={colors.accent} />
                </Pressable>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            );
          }}
        />
      </ScrollView>

      {selectMode ? (
        <View
          style={[
            styles.bulkBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Pressable
            disabled={selectedDocIds.length < 2}
            onPress={async () => {
              const merged = await mergeDocuments(
                selectedDocIds,
                `Merged ${formatShortDate(Date.now())}`
              );
              setSelectMode(false);
              setSelectedDocIds([]);
              await refreshDocuments();
              await openDocument(merged, 'document');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Merge ${selectedDocIds.length} selected documents`}
            style={[
              styles.bulkBtn,
              {
                backgroundColor:
                  selectedDocIds.length >= 2 ? colors.accent : colors.surfaceElevated,
              },
            ]}
          >
            <Text
              style={[
                styles.bulkBtnText,
                {
                  color:
                    selectedDocIds.length >= 2 ? '#FFFFFF' : colors.textMuted,
                },
              ]}
            >
              Merge ({selectedDocIds.length})
            </Text>
          </Pressable>
          <Pressable
            disabled={selectedDocIds.length === 0}
            onPress={() => {
              Alert.alert(
                'Delete Selected?',
                `Delete ${selectedDocIds.length} selected document(s)?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      for (const id of selectedDocIds) {
                        await deleteDocument(id);
                      }
                      setSelectMode(false);
                      setSelectedDocIds([]);
                      await refreshDocuments();
                    },
                  },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${selectedDocIds.length} selected documents`}
            style={[
              styles.bulkBtn,
              {
                backgroundColor:
                  selectedDocIds.length > 0 ? colors.danger : colors.surfaceElevated,
              },
            ]}
          >
            <Text
              style={[
                styles.bulkBtnText,
                { color: selectedDocIds.length > 0 ? '#FFFFFF' : colors.textMuted },
              ]}
            >
              Delete ({selectedDocIds.length})
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setActiveDoc(null);
            setRoute('capture');
          }}
          accessibilityRole="button"
          accessibilityLabel="Quick camera scan"
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.heroBg,
              borderColor: colors.heroBorder,
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Ionicons name="camera" size={20} color={colors.heroText} />
          <Text style={[styles.fabText, { color: colors.heroText }]}>Scan</Text>
        </Pressable>
      )}

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
    paddingTop: 16,
    paddingBottom: 96,
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
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sectionCount: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    shadowColor: '#1546B8',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextGroup: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  heroArrowPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickDesc: {
    fontSize: 11,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#1546B8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
    gap: 6,
  },
  pageSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 12,
  },
  quickExportBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderFilterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  folderFilterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  folderFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectToggleBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  selectToggleText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  bulkBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bulkBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bulkBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
