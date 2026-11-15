import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import {
  autoDetectNormalizedQuad,
  processScanPage,
  rotateImage90,
} from '../services/cv/imagePipeline';
import { getDefaultCropQuad } from '../services/cv/geometry';
import { useTheme } from '../theme/ThemeContext';
import {
  AdjustmentSettings,
  CropQuad,
  FilterPreset,
} from '../types/scanner';

interface CropAndEnhanceScreenProps {
  initialUri: string;
  onSave: (result: {
    originalUri: string;
    processedUri: string;
    cropQuad: CropQuad;
    filter: FilterPreset;
    adjustments: AdjustmentSettings;
  }) => void;
  onCancel: () => void;
}

type CornerKey = keyof CropQuad;

const FILTER_OPTIONS: { id: FilterPreset; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'magic_color', label: 'Magic Color' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'bw_scan', label: 'B&W Scan' },
];

const DEFAULT_ADJUSTMENTS: AdjustmentSettings = {
  brightness: 0,
  contrast: 0,
  sharpness: 15,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function CropAndEnhanceScreen({
  initialUri,
  onSave,
  onCancel,
}: CropAndEnhanceScreenProps) {
  const { colors } = useTheme();
  const [sourceUri, setSourceUri] = useState(initialUri);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [step, setStep] = useState<'crop' | 'enhance'>('crop');
  const [quad, setQuad] = useState<CropQuad>(() => getDefaultCropQuad(1, 1, 0.08));
  const [filter, setFilter] = useState<FilterPreset>('magic_color');
  const [adjustments, setAdjustments] = useState<AdjustmentSettings>(DEFAULT_ADJUSTMENTS);
  const [busy, setBusy] = useState(false);
  const [boxSize, setBoxSize] = useState({ width: 300, height: 400 });

  const boxRef = useRef(boxSize);
  boxRef.current = boxSize;

  const quadRef = useRef(quad);
  quadRef.current = quad;

  useEffect(() => {
    let active = true;
    setBusy(true);
    autoDetectNormalizedQuad(sourceUri)
      .then((detected) => {
        if (active) setQuad(detected);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [sourceUri]);

  const handleBoxLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setBoxSize({ width, height });
    }
  };

  const makeCornerResponder = (corner: CornerKey) => {
    let startPoint = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPoint = { ...quadRef.current[corner] };
      },
      onPanResponderMove: (_, gesture) => {
        const w = Math.max(1, boxRef.current.width);
        const h = Math.max(1, boxRef.current.height);
        const nextX = clamp01(startPoint.x + gesture.dx / w);
        const nextY = clamp01(startPoint.y + gesture.dy / h);
        setQuad((prev) => ({
          ...prev,
          [corner]: { x: nextX, y: nextY },
        }));
      },
    });
  };

  const responders = useMemo(
    () => ({
      topLeft: makeCornerResponder('topLeft'),
      topRight: makeCornerResponder('topRight'),
      bottomRight: makeCornerResponder('bottomRight'),
      bottomLeft: makeCornerResponder('bottomLeft'),
    }),
    []
  );

  const runProcessing = async (
    nextFilter = filter,
    nextAdjustments = adjustments
  ) => {
    setBusy(true);
    try {
      const res = await processScanPage(
        sourceUri,
        quad,
        nextFilter,
        nextAdjustments
      );
      setProcessedUri(res.uri);
      setStep('enhance');
    } catch {
      Alert.alert('Processing Error', 'Could not process the document image.');
    } finally {
      setBusy(false);
    }
  };

  const handleRotate = async (dir: 'left' | 'right') => {
    if (busy) return;
    setBusy(true);
    try {
      const rotated = await rotateImage90(sourceUri, dir);
      setSourceUri(rotated.uri);
      setProcessedUri(null);
      setStep('crop');
    } catch {
      Alert.alert('Rotation Error', 'Could not rotate image.');
    } finally {
      setBusy(false);
    }
  };

  const polygonPoints = [
    `${quad.topLeft.x * boxSize.width},${quad.topLeft.y * boxSize.height}`,
    `${quad.topRight.x * boxSize.width},${quad.topRight.y * boxSize.height}`,
    `${quad.bottomRight.x * boxSize.width},${quad.bottomRight.y * boxSize.height}`,
    `${quad.bottomLeft.x * boxSize.width},${quad.bottomLeft.y * boxSize.height}`,
  ].join(' ');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel document editing"
          style={[styles.headerBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.headerBtnText, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {step === 'crop' ? 'Adjust Corners' : 'Enhance Scan'}
        </Text>
        <Pressable
          onPress={() => {
            if (step === 'crop') {
              runProcessing();
            } else if (processedUri) {
              onSave({
                originalUri: sourceUri,
                processedUri,
                cropQuad: quad,
                filter,
                adjustments,
              });
            }
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={step === 'crop' ? 'Apply perspective crop' : 'Save scanned page'}
          style={[styles.headerPrimaryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.headerPrimaryText, { color: colors.primaryText }]}>
            {step === 'crop' ? 'Next' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.previewArea} onLayout={handleBoxLayout}>
        <Image
          source={{ uri: step === 'enhance' && processedUri ? processedUri : sourceUri }}
          style={styles.previewImage}
          resizeMode="contain"
          accessibilityLabel={
            step === 'crop'
              ? 'Captured document with adjustable crop corners'
              : 'Enhanced scanned document preview'
          }
        />

        {step === 'crop' ? (
          <View style={styles.overlayLayer}>
            <Svg width={boxSize.width} height={boxSize.height}>
              <Polygon
                points={polygonPoints}
                fill="rgba(96, 165, 250, 0.16)"
                stroke="#60A5FA"
                strokeWidth={2.5}
              />
            </Svg>

            {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as CornerKey[]).map(
              (corner) => {
                const pt = quad[corner];
                return (
                  <View
                    key={corner}
                    {...responders[corner].panHandlers}
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel={`Drag ${corner} crop handle`}
                    style={[
                      styles.handle,
                      {
                        left: pt.x * boxSize.width - 14,
                        top: pt.y * boxSize.height - 14,
                        borderColor: colors.primary,
                      },
                    ]}
                  />
                );
              }
            )}
          </View>
        ) : null}

        {busy ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Processing scan...</Text>
          </View>
        ) : null}
      </View>

      {step === 'crop' ? (
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => handleRotate('left')}
            accessibilityRole="button"
            accessibilityLabel="Rotate left 90 degrees"
            style={[styles.toolBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.toolText, { color: colors.textPrimary }]}>Rotate L</Text>
          </Pressable>
          <Pressable
            onPress={() => handleRotate('right')}
            accessibilityRole="button"
            accessibilityLabel="Rotate right 90 degrees"
            style={[styles.toolBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.toolText, { color: colors.textPrimary }]}>Rotate R</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setBusy(true);
              autoDetectNormalizedQuad(sourceUri)
                .then(setQuad)
                .finally(() => setBusy(false));
            }}
            accessibilityRole="button"
            accessibilityLabel="Auto detect document edges"
            style={[styles.toolBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.toolText, { color: colors.primary }]}>Auto</Text>
          </Pressable>
          <Pressable
            onPress={() => setQuad(getDefaultCropQuad(1, 1, 0))}
            accessibilityRole="button"
            accessibilityLabel="Reset crop to full image"
            style={[styles.toolBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.toolText, { color: colors.textPrimary }]}>Full</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.enhancePanel, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTER_OPTIONS.map((opt) => {
              const active = filter === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setFilter(opt.id);
                    runProcessing(opt.id, adjustments);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Apply ${opt.label} filter`}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? colors.primaryText : colors.textPrimary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.adjustGrid}>
            {(
              [
                ['brightness', 'Brightness', -100, 100, 15],
                ['contrast', 'Contrast', -100, 100, 15],
                ['sharpness', 'Sharpness', 0, 100, 20],
              ] as [keyof AdjustmentSettings, string, number, number, number][]
            ).map(([key, label, min, max, delta]) => (
              <View key={key} style={[styles.adjustItem, { borderColor: colors.border }]}>
                <Text style={[styles.adjustLabel, { color: colors.textSecondary }]}>
                  {label}: {adjustments[key]}
                </Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => {
                      const next = {
                        ...adjustments,
                        [key]: Math.max(min, adjustments[key] - delta),
                      };
                      setAdjustments(next);
                      runProcessing(filter, next);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${label}`}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.stepText, { color: colors.textPrimary }]}>-</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const next = {
                        ...adjustments,
                        [key]: Math.min(max, adjustments[key] + delta),
                      };
                      setAdjustments(next);
                      runProcessing(filter, next);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${label}`}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.stepText, { color: colors.textPrimary }]}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => setStep('crop')}
            accessibilityRole="button"
            accessibilityLabel="Return to crop corner editor"
            style={[styles.reCropBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.reCropText, { color: colors.primary }]}>
              Adjust Crop Corners
            </Text>
          </Pressable>
        </View>
      )}
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerPrimaryBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  headerPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  overlayLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  handle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  toolBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toolText: {
    fontSize: 13,
    fontWeight: '600',
  },
  enhancePanel: {
    borderTopWidth: 1,
    padding: 12,
    gap: 10,
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  adjustGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 6,
    alignItems: 'center',
  },
  adjustLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepBtn: {
    width: 30,
    height: 28,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 15,
    fontWeight: '700',
  },
  reCropBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  reCropText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
