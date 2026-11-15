import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to document library"
          style={[styles.headerBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>Back</Text>
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
                  { color: colors.textPrimary, borderColor: colors.primary, backgroundColor: colors.background },
                ]}
                onSubmitEditing={handleSaveTitle}
              />
              <Pressable
                onPress={handleSaveTitle}
                accessibilityRole="button"
                accessibilityLabel="Save document title"
                style={[styles.saveTitleBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.saveTitleText, { color: colors.primaryText }]}>Save</Text>
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
              <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
                {pages.length} {pages.length === 1 ? 'page' : 'pages'} • Tap title to rename
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={confirmDeleteDoc}
          accessibilityRole="button"
          accessibilityLabel="Delete entire document"
          style={[styles.headerBtn, { borderColor: colors.danger }]}
        >
          <Text style={[styles.headerBtnText, { color: colors.danger }]}>Delete</Text>
        </Pressable>
      </View>

      <View style={styles.addRow}>
        <Pressable
          onPress={onAddPageCamera}
          accessibilityRole="button"
          accessibilityLabel="Add page using camera"
          style={[styles.addBtnPrimary, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.addBtnPrimaryText, { color: colors.primaryText }]}>
            + Scan Page
          </Text>
        </Pressable>
        <Pressable
          onPress={onAddPageGallery}
          accessibilityRole="button"
          accessibilityLabel="Add pages from gallery"
          style={[styles.addBtnSecondary, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.addBtnSecondaryText, { color: colors.textPrimary }]}>
            + Import
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
              borderColor: pages.length > 0 ? colors.primary : colors.border,
              backgroundColor: colors.surface,
              opacity: pages.length > 0 ? 1 : 0.5,
            },
          ]}
        >
          <Text style={[styles.addBtnSecondaryText, { color: colors.primary }]}>
            Export
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No pages in this document yet. Tap "+ Scan Page" or "+ Import Page".
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
                  style={[styles.thumb, { borderColor: colors.border }]}
                  accessibilityLabel={`Page ${index + 1} preview, scanned ${dateText}`}
                />
              </Pressable>

              <View style={styles.pageInfo}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                  Page {index + 1}
                </Text>
                <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
                  {item.filter.replace('_', ' ').toUpperCase()} • {dateText}
                </Text>

                <View style={styles.pageActions}>
                  <Pressable
                    onPress={() => onEditPage(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Crop or enhance page ${index + 1}`}
                    style={[styles.miniBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.miniBtnText, { color: colors.primary }]}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onMovePage(item.id, 'up')}
                    disabled={index === 0}
                    accessibilityRole="button"
                    accessibilityLabel={`Move page ${index + 1} up`}
                    style={[styles.miniBtn, { borderColor: colors.border, opacity: index === 0 ? 0.4 : 1 }]}
                  >
                    <Text style={[styles.miniBtnText, { color: colors.textPrimary }]}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onMovePage(item.id, 'down')}
                    disabled={index === pages.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel={`Move page ${index + 1} down`}
                    style={[
                      styles.miniBtn,
                      { borderColor: colors.border, opacity: index === pages.length - 1 ? 0.4 : 1 },
                    ]}
                  >
                    <Text style={[styles.miniBtnText, { color: colors.textPrimary }]}>↓</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDeletePage(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete page ${index + 1}`}
                    style={[styles.miniBtn, { borderColor: colors.danger }]}
                  >
                    <Text style={[styles.miniBtnText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
  },
  saveTitleBtn: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveTitleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addBtnPrimary: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  addBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  addBtnSecondary: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  addBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  pageCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 84,
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
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
