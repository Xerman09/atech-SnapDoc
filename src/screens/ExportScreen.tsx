import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudioShell } from '../components/StudioShell';
import {
  estimateExportSizeKb,
  ExportQualityPreset,
  generateDocumentPdf,
  ImageExportFormat,
  PdfMarginPreset,
  PdfPageSize,
  prepareExportImage,
  saveImagesToDeviceGallery,
  savePdfToLocalDevice,
  shareLocalFile,
} from '../services/export/exportService';
import { useTheme } from '../theme/ThemeContext';
import { ScanDocument, ScannedPage } from '../types/scanner';
import { formatRelativeDate } from '../utils/dateFormat';
import { parsePageRange } from '../utils/pageRange';

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
  const [customName, setCustomName] = useState(document.title);
  const [pageRangeInput, setPageRangeInput] = useState('All');
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedPages = useMemo(() => {
    const indices = parsePageRange(pageRangeInput, pages.length);
    return indices.map((i) => pages[i]).filter(Boolean);
  }, [pageRangeInput, pages]);

  const exportBaseName = customName.trim() || document.title;
  const estKb = estimateExportSizeKb(selectedPages.length, quality, exportMode);
  const estLabel =
    estKb >= 1024 ? `~${(estKb / 1024).toFixed(1)} MB` : `~${estKb} KB`;

  const todayStamp = new Date().toISOString().slice(0, 10);

  const handleExportPdf = async (destination: 'download' | 'share') => {
    if (busy || pages.length === 0) return;
    if (selectedPages.length === 0) {
      Alert.alert(
        'Invalid Page Range',
        `Enter page numbers between 1 and ${pages.length} (e.g. "1-3" or "All").`
      );
      return;
    }
    setBusy(true);
    try {
      const { uri, sizeBytes } = await generateDocumentPdf({
        document: { ...document, title: exportBaseName },
        pages: selectedPages,
        pageSize,
        margin,
        quality,
        includePageNumbers,
        includeWatermark,
      });
      const sizeKb = Math.max(1, Math.round(sizeBytes / 1024));
      if (destination === 'download') {
        const res = await savePdfToLocalDevice(uri, exportBaseName);
        if (res.saved && Platform.OS !== 'web') {
          Alert.alert(
            'PDF Saved Locally',
            `${res.fileName} (${sizeKb} KB) was saved to your selected folder.`
          );
        }
      } else {
        await shareLocalFile(
          uri,
          'application/pdf',
          `${exportBaseName}_${sizeKb}KB.pdf`
        );
      }
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
    if (selectedPages.length === 0) {
      Alert.alert(
        'Invalid Page Range',
        `Enter page numbers between 1 and ${pages.length} (e.g. "1-3" or "All").`
      );
      return;
    }
    setBusy(true);
    try {
      const preparedUris: string[] = [];
      for (let i = 0; i < selectedPages.length; i++) {
        const res = await prepareExportImage({
          page: selectedPages[i],
          format: imageFormat,
          quality,
          baseTitle: exportBaseName,
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
        const ext = imageFormat === 'png' ? 'png' : 'jpg';
        await shareLocalFile(preparedUris[0], mime, `${exportBaseName}_page_1.${ext}`);
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
    <StudioShell>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to document"
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Export
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {document.title}
          </Text>
          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} • Updated{' '}
            {formatRelativeDate(document.updatedAt)}
          </Text>
        </View>

        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>FORMAT</Text>
        <View style={[styles.segmentedWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
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
                style={[styles.segment, selected && { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: selected ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {exportMode === 'pdf' ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Page Size
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
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.accentSoft : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 6 }]}>
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
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.accentSoft : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 6 }]}>
              PDF Options
            </Text>
            <View style={styles.row}>
              <Pressable
                onPress={() => setIncludePageNumbers((prev) => !prev)}
                accessibilityRole="switch"
                accessibilityState={{ checked: includePageNumbers }}
                accessibilityLabel="Toggle PDF page numbers"
                style={[
                  styles.chip,
                  {
                    borderColor: includePageNumbers ? colors.accent : colors.border,
                    backgroundColor: includePageNumbers ? colors.accentSoft : colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: includePageNumbers ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {includePageNumbers ? 'Page #: On' : 'Page #: Off'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIncludeWatermark((prev) => !prev)}
                accessibilityRole="switch"
                accessibilityState={{ checked: includeWatermark }}
                accessibilityLabel="Toggle Confidential PDF watermark"
                style={[
                  styles.chip,
                  {
                    borderColor: includeWatermark ? colors.accent : colors.border,
                    backgroundColor: includeWatermark ? colors.accentSoft : colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: includeWatermark ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {includeWatermark ? 'Watermark: On' : 'Watermark: Off'}
                </Text>
              </Pressable>
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
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.accentSoft : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.accent : colors.textPrimary },
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
            File Name
          </Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            maxLength={80}
            placeholder="Document file name..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Export file name"
            style={[
              styles.nameInput,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          <View style={styles.row}>
            {(
              [
                [document.title, 'Doc Title'],
                [`Scan_${todayStamp}`, 'Scan + Date'],
                [`Receipt_${todayStamp}`, 'Receipt + Date'],
              ] as [string, string][]
            ).map(([presetVal, label]) => (
              <Pressable
                key={label}
                onPress={() => setCustomName(presetVal)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${label} naming template`}
                style={[
                  styles.templateChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
              >
                <Text style={[styles.templateChipText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {pages.length > 1 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 4 }]}>
                Pages ({selectedPages.length}/{pages.length} selected)
              </Text>
              <TextInput
                value={pageRangeInput}
                onChangeText={setPageRangeInput}
                maxLength={40}
                placeholder={`All or e.g. 1-${Math.min(2, pages.length)}`}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Export page range"
                style={[
                  styles.nameInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.qualityHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Compression & Quality
            </Text>
            <View style={[styles.estPill, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.estPillText, { color: colors.accent }]}>
                Est. {estLabel}
              </Text>
            </View>
          </View>
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
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accentSoft : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? colors.accent : colors.textPrimary },
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
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.busyText, { color: colors.textSecondary }]}>
              Generating offline export...
            </Text>
          </View>
        ) : exportMode === 'pdf' ? (
          <View style={styles.imageActions}>
            <Pressable
              onPress={() => handleExportPdf('download')}
              disabled={pages.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Save PDF document locally to device"
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="download-outline" size={18} color={colors.primaryText} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
                Save PDF to Device
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleExportPdf('share')}
              disabled={pages.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Share or open PDF document"
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Ionicons name="share-social-outline" size={17} color={colors.textPrimary} />
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                Share / Open PDF
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.imageActions}>
            <Pressable
              onPress={() => handleExportImages('share')}
              disabled={pages.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Download or share image file"
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="download-outline" size={18} color={colors.primaryText} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
                Download Image
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleExportImages('gallery')}
              disabled={pages.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Save all scanned pages to device gallery"
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Ionicons name="images-outline" size={17} color={colors.textPrimary} />
              <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                Save All to Device Gallery
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  backText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  spacer: {
    width: 64,
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  docTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  docMeta: {
    fontSize: 13,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
    marginLeft: 4,
  },
  segmentedWrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    borderRadius: 9,
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
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  templateChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  templateChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  qualityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  estPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  estPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
