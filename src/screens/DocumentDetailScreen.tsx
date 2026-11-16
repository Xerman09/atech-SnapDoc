import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudioShell } from '../components/StudioShell';
import { shareLocalFile } from '../services/export/exportService';
import { useTheme } from '../theme/ThemeContext';
import { DocumentFolder, ScanDocument, ScannedPage } from '../types/scanner';
import { formatRelativeDate } from '../utils/dateFormat';

interface DocumentDetailScreenProps {
  document: ScanDocument;
  pages: ScannedPage[];
  onBack: () => void;
  onRename: (newTitle: string) => void;
  onChangeFolder: (folder: DocumentFolder) => void;
  onAddPageCamera: () => void;
  onAddPageGallery: () => void;
  onEditPage: (page: ScannedPage) => void;
  onDuplicatePage: (page: ScannedPage) => void;
  onReversePages: () => void;
  onMovePage: (pageId: string, direction: 'up' | 'down') => void;
  onDeletePage: (pageId: string) => void;
  onDeleteDocument: () => void;
  onExport: () => void;
}

const FILTER_LABELS: Record<ScannedPage['filter'], string> = {
  original: 'Original',
  magic_color: 'Magic Color',
  grayscale: 'Grayscale',
  bw_scan: 'Black & White',
  receipt: 'Receipt',
  whiteboard: 'Whiteboard',
  eco_print: 'Eco Print',
};

const FOLDERS: DocumentFolder[] = ['General', 'Receipts', 'IDs', 'Work', 'School'];

export function DocumentDetailScreen({
  document,
  pages,
  onBack,
  onRename,
  onChangeFolder,
  onAddPageCamera,
  onAddPageGallery,
  onEditPage,
  onDuplicatePage,
  onReversePages,
  onMovePage,
  onDeletePage,
  onDeleteDocument,
  onExport,
}: DocumentDetailScreenProps) {
  const { colors } = useTheme();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(document.title);
  const [previewPage, setPreviewPage] = useState<{
    page: ScannedPage;
    index: number;
  } | null>(null);

  const handleSaveTitle = () => {
    onRename(titleDraft);
    setEditingTitle(false);
  };

  const confirmDeleteDoc = () => {
    Alert.alert(
      'Delete Document?',
      `Permanently delete "${document.title}" and all ${pages.length} page(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDeleteDocument },
      ]
    );
  };

  return (
    <StudioShell>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to document library"
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Library</Text>
        </Pressable>

        <View style={styles.titleCenter}>
          {editingTitle ? (
            <View style={styles.renameRow}>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                maxLength={80}
                autoFocus
                accessibilityLabel="Document title input"
                style={[
                  styles.titleInput,
                  { color: colors.textPrimary, borderColor: colors.accent, backgroundColor: colors.surface },
                ]}
                onSubmitEditing={handleSaveTitle}
              />
              <Pressable
                onPress={handleSaveTitle}
                accessibilityRole="button"
                accessibilityLabel="Save document title"
                style={[styles.saveTitleBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.saveTitleText, { color: colors.primaryText }]}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setTitleDraft(document.title);
                setEditingTitle(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Rename document ${document.title}`}
            >
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {document.title}
              </Text>
              <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
                {pages.length} {pages.length === 1 ? 'page' : 'pages'} • Tap to rename
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={confirmDeleteDoc}
          accessibilityRole="button"
          accessibilityLabel="Delete entire document"
          style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
        </Pressable>
      </View>

      <View style={styles.addRow}>
        <Pressable
          onPress={onAddPageCamera}
          accessibilityRole="button"
          accessibilityLabel="Add page using camera"
          style={[styles.addBtnPrimary, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="camera-outline" size={16} color={colors.primaryText} />
          <Text style={[styles.addBtnPrimaryText, { color: colors.primaryText }]}>
            Scan Page
          </Text>
        </Pressable>
        <Pressable
          onPress={onAddPageGallery}
          accessibilityRole="button"
          accessibilityLabel="Add pages from gallery"
          style={[styles.addBtnSecondary, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="images-outline" size={16} color={colors.textPrimary} />
          <Text style={[styles.addBtnSecondaryText, { color: colors.textPrimary }]}>
            Import
          </Text>
        </Pressable>
        <Pressable
          onPress={onExport}
          disabled={pages.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Export document as PDF or Image"
          style={[
            styles.addBtnSecondary,
            {
              borderColor: pages.length > 0 ? colors.accent : colors.border,
              backgroundColor: pages.length > 0 ? colors.accentSoft : colors.surface,
              opacity: pages.length > 0 ? 1 : 0.45,
            },
          ]}
        >
          <Ionicons name="share-outline" size={16} color={colors.accent} />
          <Text style={[styles.addBtnSecondaryText, { color: colors.accent }]}>
            Export
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.folderBar}
        style={styles.folderScroll}
      >
        {FOLDERS.map((folderName) => {
          const active = (document.folder ?? 'General') === folderName;
          return (
            <Pressable
              key={folderName}
              onPress={() => onChangeFolder(folderName)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Move document to ${folderName} folder`}
              style={[
                styles.folderChip,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.folderChipText,
                  { color: active ? colors.accent : colors.textSecondary },
                ]}
              >
                {folderName}
              </Text>
            </Pressable>
          );
        })}
        {pages.length >= 2 ? (
          <Pressable
            onPress={onReversePages}
            accessibilityRole="button"
            accessibilityLabel="Reverse page order"
            style={[
              styles.folderChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.folderChipText, { color: colors.accent }]}>
              ⇅ Reverse Order
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No pages in this document yet. Tap "Scan Page" or "Import".
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const dateText = formatRelativeDate(item.createdAt);
          return (
            <View style={[styles.pageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setPreviewPage({ page: item, index })}
                accessibilityRole="button"
                accessibilityLabel={`Preview page ${index + 1} full screen`}
              >
                <Image
                  source={{ uri: item.processedUri }}
                  style={[styles.thumb, { borderColor: colors.borderSubtle }]}
                  accessibilityLabel={`Page ${index + 1} preview, scanned ${dateText}`}
                />
              </Pressable>

              <View style={styles.pageInfo}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                  Page {index + 1}
                </Text>
                <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
                  {FILTER_LABELS[item.filter]} • {dateText}
                </Text>

                <View style={styles.pageActions}>
                  <Pressable
                    onPress={() => onEditPage(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Crop or enhance page ${index + 1}`}
                    style={[styles.miniBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.miniBtnText, { color: colors.accent }]}>Crop & Filter</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDuplicatePage(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Duplicate page ${index + 1}`}
                    style={[styles.miniIconBtn, { borderColor: colors.border }]}
                  >
                    <Ionicons name="copy-outline" size={13} color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => onMovePage(item.id, 'up')}
                    disabled={index === 0}
                    accessibilityRole="button"
                    accessibilityLabel={`Move page ${index + 1} up`}
                    style={[styles.miniIconBtn, { borderColor: colors.border, opacity: index === 0 ? 0.35 : 1 }]}
                  >
                    <Ionicons name="arrow-up" size={13} color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => onMovePage(item.id, 'down')}
                    disabled={index === pages.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel={`Move page ${index + 1} down`}
                    style={[
                      styles.miniIconBtn,
                      { borderColor: colors.border, opacity: index === pages.length - 1 ? 0.35 : 1 },
                    ]}
                  >
                    <Ionicons name="arrow-down" size={13} color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={() => onDeletePage(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete page ${index + 1}`}
                    style={[styles.miniIconBtn, { borderColor: colors.border }]}
                  >
                    <Ionicons name="close" size={14} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={Boolean(previewPage)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPage(null)}
      >
        {previewPage ? (
          <View style={styles.lightboxBackdrop}>
            <View style={styles.lightboxTop}>
              <Text style={styles.lightboxTitle}>
                Page {previewPage.index + 1} of {pages.length}
              </Text>
              <View style={styles.lightboxActions}>
                <Pressable
                  onPress={async () => {
                    try {
                      await shareLocalFile(
                        previewPage.page.processedUri,
                        'image/jpeg',
                        `${document.title}_page_${previewPage.index + 1}.jpg`
                      );
                    } catch (err) {
                      Alert.alert(
                        'Share Failed',
                        err instanceof Error ? err.message : 'Could not share page.'
                      );
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Share this single page"
                  style={styles.lightboxBtn}
                >
                  <Text style={styles.lightboxBtnText}>Share</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const target = previewPage.page;
                    setPreviewPage(null);
                    onEditPage(target);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Edit this page"
                  style={styles.lightboxBtn}
                >
                  <Text style={styles.lightboxBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPreviewPage(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close full screen preview"
                  style={styles.lightboxBtn}
                >
                  <Text style={styles.lightboxBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
            <Image
              source={{ uri: previewPage.page.processedUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
            {pages.length > 1 ? (
              <View style={styles.lightboxNavRow}>
                <Pressable
                  onPress={() => {
                    const prevIdx = Math.max(0, previewPage.index - 1);
                    setPreviewPage({ page: pages[prevIdx], index: prevIdx });
                  }}
                  disabled={previewPage.index === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Previous page"
                  style={[
                    styles.lightboxBtn,
                    { opacity: previewPage.index === 0 ? 0.35 : 1 },
                  ]}
                >
                  <Text style={styles.lightboxBtnText}>‹ Prev</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const nextIdx = Math.min(pages.length - 1, previewPage.index + 1);
                    setPreviewPage({ page: pages[nextIdx], index: nextIdx });
                  }}
                  disabled={previewPage.index === pages.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel="Next page"
                  style={[
                    styles.lightboxBtn,
                    { opacity: previewPage.index === pages.length - 1 ? 0.35 : 1 },
                  ]}
                >
                  <Text style={styles.lightboxBtnText}>Next ›</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  headerMeta: {
    fontSize: 11,
    textAlign: 'center',
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  titleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 14,
  },
  saveTitleBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveTitleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  addBtnPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPrimaryText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  addBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSecondaryText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  folderScroll: {
    maxHeight: 44,
    marginTop: 10,
  },
  folderBar: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  folderChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  folderChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  pageCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 14,
    alignItems: 'center',
  },
  thumb: {
    width: 62,
    height: 82,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageInfo: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pageSub: {
    fontSize: 12,
  },
  pageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  miniBtn: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniIconBtn: {
    borderWidth: 1,
    borderRadius: 7,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.96)',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  lightboxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lightboxTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lightboxActions: {
    flexDirection: 'row',
    gap: 8,
  },
  lightboxBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  lightboxBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  lightboxImage: {
    flex: 1,
    width: '100%',
  },
  lightboxNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
});
