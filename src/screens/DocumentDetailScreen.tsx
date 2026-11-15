import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudioShell } from '../components/StudioShell';
import { useTheme } from '../theme/ThemeContext';
import { ScanDocument, ScannedPage } from '../types/scanner';
import { formatRelativeDate } from '../utils/dateFormat';

interface DocumentDetailScreenProps {
  document: ScanDocument;
  pages: ScannedPage[];
  onBack: () => void;
  onRename: (newTitle: string) => void;
  onAddPageCamera: () => void;
  onAddPageGallery: () => void;
  onEditPage: (page: ScannedPage) => void;
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
};

export function DocumentDetailScreen({
  document,
  pages,
  onBack,
  onRename,
  onAddPageCamera,
  onAddPageGallery,
  onEditPage,
  onMovePage,
  onDeletePage,
  onDeleteDocument,
  onExport,
}: DocumentDetailScreenProps) {
  const { colors } = useTheme();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(document.title);

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
                onPress={() => onEditPage(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit page ${index + 1}`}
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
});
