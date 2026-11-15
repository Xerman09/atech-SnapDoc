import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ExportQualityPreset,
  generateDocumentPdf,
  ImageExportFormat,
  PdfMarginPreset,
  PdfPageSize,
  prepareExportImage,
  saveImagesToDeviceGallery,
  shareLocalFile,
} from '../services/export/exportService';
import { useTheme } from '../theme/ThemeContext';
import { ScanDocument, ScannedPage } from '../types/scanner';
import { formatRelativeDate } from '../utils/dateFormat';

interface ExportScreenProps {
  document: ScanDocument;
  pages: ScannedPage[];
  onBack: () => void;
}

export function ExportScreen({ document, pages, onBack }: ExportScreenProps) {
  const { colors } = useTheme();
  const [exportMode, setExportMode] = useState<'pdf' | 'image'>('pdf');
  const [pageSize, setPageSize] = useState<PdfPageSize>('a4');
  const [margin, setMargin] = useState<PdfMarginPreset>('small');
  const [quality, setQuality] = useState<ExportQualityPreset>('balanced');
  const [imageFormat, setImageFormat] = useState<ImageExportFormat>('jpeg');
  const [busy, setBusy] = useState(false);

  const handleExportPdf = async () => {
    if (busy || pages.length === 0) return;
    setBusy(true);
    try {
      const { uri, sizeBytes } = await generateDocumentPdf({
        document,
        pages,
        pageSize,
        margin,
        quality,
      });
      const sizeKb = Math.max(1, Math.round(sizeBytes / 1024));
      await shareLocalFile(
        uri,
        'application/pdf',
        `Save ${document.title} (${sizeKb} KB)`
      );
    } catch (err) {
      Alert.alert(
        'PDF Export Failed',
        err instanceof Error ? err.message : 'Could not generate PDF.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleExportImages = async (destination: 'gallery' | 'share') => {
    if (busy || pages.length === 0) return;
    setBusy(true);
    try {
      const preparedUris: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const res = await prepareExportImage({
          page: pages[i],
          format: imageFormat,
          quality,
          baseTitle: document.title,
          pageNumber: i + 1,
        });
        preparedUris.push(res.uri);
      }

      if (destination === 'gallery') {
        const count = await saveImagesToDeviceGallery(preparedUris);
        Alert.alert(
          'Saved to Gallery',
          `${count} ${count === 1 ? 'image' : 'images'} saved to your device gallery.`
        );
      } else {
        const mime = imageFormat === 'png' ? 'image/png' : 'image/jpeg';
        await shareLocalFile(preparedUris[0], mime, `Save ${document.title} Image`);
      }
    } catch (err) {
      Alert.alert(
        'Image Export Failed',
        err instanceof Error ? err.message : 'Could not export images.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to document"
          style={[styles.backBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Export Document
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {document.title}
          </Text>
          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} • Updated{' '}
            {formatRelativeDate(document.updatedAt)}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Export Format
          </Text>
          <View style={styles.row}>
            {(
              [
                ['pdf', 'PDF Document'],
                ['image', 'Image (JPG / PNG)'],
              ] as ['pdf' | 'image', string][]
            ).map(([id, label]) => {
              const selected = exportMode === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setExportMode(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Export as ${label}`}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? colors.primaryText : colors.textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {exportMode === 'pdf' ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              PDF Page Size
            </Text>
            <View style={styles.row}>
              {(
                [
                  ['a4', 'A4'],
                  ['letter', 'US Letter'],
                  ['fit', 'Fit Image'],
                ] as [PdfPageSize, string][]
              ).map(([id, label]) => {
                const selected = pageSize === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setPageSize(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`PDF page size ${label}`}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.primaryText : colors.textPrimary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Margins
            </Text>
            <View style={styles.row}>
              {(
                [
                  ['none', 'None'],
                  ['small', 'Small'],
                  ['standard', 'Standard'],
                ] as [PdfMarginPreset, string][]
              ).map(([id, label]) => {
                const selected = margin === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setMargin(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`PDF margin ${label}`}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.primaryText : colors.textPrimary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Image Format
            </Text>
            <View style={styles.row}>
              {(
                [
                  ['jpeg', 'JPEG'],
                  ['png', 'PNG (Lossless)'],
                ] as [ImageExportFormat, string][]
              ).map(([id, label]) => {
                const selected = imageFormat === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setImageFormat(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Image format ${label}`}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.primaryText : colors.textPrimary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Quality / File Size
          </Text>
          <View style={styles.row}>
            {(
              [
                ['high', 'High'],
                ['balanced', 'Balanced'],
                ['small', 'Small File'],
              ] as [ExportQualityPreset, string][]
            ).map(([id, label]) => {
              const selected = quality === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setQuality(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Quality preset ${label}`}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? colors.primaryText : colors.textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.busyText, { color: colors.textSecondary }]}>
              Generating offline export...
            </Text>
          </View>
        ) : exportMode === 'pdf' ? (
          <Pressable
            onPress={handleExportPdf}
            disabled={pages.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Generate and download PDF document"
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
              Generate & Save PDF
            </Text>
          </Pressable>
        ) : (
          <View style={styles.imageActions}>
            <Pressable
              onPress={() => handleExportImages('gallery')}
              disabled={pages.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Save all scanned pages to device gallery"
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
                Save All to Gallery
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleExportImages('share')}
              disabled={pages.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Share or save first page image file"
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                Save / Share Image File
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  spacer: {
    width: 56,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  docMeta: {
    fontSize: 13,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  busyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageActions: {
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
