import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import {
  CapturedImageAsset,
  pickAndValidateImages,
} from '../services/capture/importImages';
import { composeIdCardA4Page } from '../services/cv/imagePipeline';
import { saveScanImageToAppStorage } from '../services/storage/localFiles';
import { useTheme } from '../theme/ThemeContext';

interface CaptureScreenProps {
  onCaptured: (assets: CapturedImageAsset[]) => void;
  onCancel: () => void;
}

export function CaptureScreen({ onCaptured, onCancel }: CaptureScreenProps) {
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [scanMode, setScanMode] = useState<'single' | 'batch' | 'id_card'>('single');
  const [showGrid, setShowGrid] = useState(true);
  const [timerOn, setTimerOn] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [batchAssets, setBatchAssets] = useState<CapturedImageAsset[]>([]);
  const [idFrontUri, setIdFrontUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!focusPoint) return;
    const t = setTimeout(() => setFocusPoint(null), 900);
    return () => clearTimeout(t);
  }, [focusPoint]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      executeCapture();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleGalleryImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await pickAndValidateImages();
      if (result.rejected.length > 0) {
        const summary = result.rejected
          .map((item) => `• ${item.name}: ${item.reason}`)
          .join('\n');
        Alert.alert('Some Images Were Skipped', summary);
      }
      if (result.imported.length > 0) {
        onCaptured(result.imported);
      }
    } finally {
      setBusy(false);
    }
  };

  const executeCapture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
      });
      if (!photo?.uri) return;

      const savedUri = saveScanImageToAppStorage(photo.uri, `camera_${Date.now()}.jpg`, 'jpg');
      const asset: CapturedImageAsset = {
        id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        uri: savedUri,
        width: photo.width,
        height: photo.height,
        source: 'camera',
        createdAt: Date.now(),
      };
      if (scanMode === 'batch') {
        setBatchAssets((prev) => [...prev, asset]);
      } else if (scanMode === 'id_card') {
        if (!idFrontUri) {
          setIdFrontUri(asset.uri);
        } else {
          const composed = await composeIdCardA4Page(idFrontUri, asset.uri);
          setIdFrontUri(null);
          onCaptured([
            {
              id: `idcard_${Date.now()}`,
              uri: composed.uri,
              width: composed.width,
              height: composed.height,
              source: 'camera',
              createdAt: Date.now(),
            },
          ]);
        }
      } else {
        onCaptured([asset]);
      }
    } catch {
      Alert.alert('Capture Failed', 'Could not capture photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleTakePhoto = () => {
    if (busy || countdown !== null) return;
    if (timerOn) {
      setCountdown(3);
    } else {
      executeCapture();
    }
  };

  const handleViewfinderTap = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.permissionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.permTitle, { color: colors.textPrimary }]}>
            Camera Permission Needed
          </Text>
          <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
            SnapDoc uses your camera strictly offline to scan documents. You can also import images from your gallery instead.
          </Text>
          <Pressable
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Allow camera access for scanning"
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
              Allow Camera Access
            </Text>
          </Pressable>
          <Pressable
            onPress={handleGalleryImport}
            accessibilityRole="button"
            accessibilityLabel="Import document images from gallery"
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
              Import from Gallery
            </Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel and return home"
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={styles.cameraRoot}
    >
      <View style={styles.topControls}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          style={styles.overlayBtn}
        >
          <Text style={styles.overlayBtnText}>Close</Text>
        </Pressable>

        <View style={styles.topRightControls}>
          <Pressable
            onPress={() => setShowGrid((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ selected: showGrid }}
            accessibilityLabel={showGrid ? 'Hide framing grid' : 'Show framing grid'}
            style={[
              styles.overlayBtn,
              showGrid && styles.overlayBtnActive,
            ]}
          >
            <Text style={styles.overlayBtnText}>Grid</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setIdFrontUri(null);
              setBatchAssets([]);
              setScanMode((prev) =>
                prev === 'single' ? 'batch' : prev === 'batch' ? 'id_card' : 'single'
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch scan mode between Single, Batch, and ID Card"
            style={[
              styles.overlayBtn,
              scanMode !== 'single' && styles.overlayBtnActive,
            ]}
          >
            <Text style={styles.overlayBtnText}>
              {scanMode === 'batch' ? 'Batch' : scanMode === 'id_card' ? 'ID Card' : 'Single'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTimerOn((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ selected: timerOn }}
            accessibilityLabel={timerOn ? 'Disable 3 second timer' : 'Enable 3 second timer'}
            style={[styles.overlayBtn, timerOn && styles.overlayBtnActive]}
          >
            <Text style={styles.overlayBtnText}>{timerOn ? '3s' : 'Timer'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setTorch((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ selected: torch }}
            accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
            style={[styles.overlayBtn, torch && styles.overlayBtnActive]}
          >
            <Text style={styles.overlayBtnText}>{torch ? 'Flash' : 'No Flash'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
            accessibilityRole="button"
            accessibilityLabel="Switch front or back camera"
            style={styles.overlayBtn}
          >
            <Text style={styles.overlayBtnText}>Flip</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.viewfinderWrap} onPress={handleViewfinderTap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          enableTorch={torch}
        />
        {focusPoint ? (
          <View
            pointerEvents="none"
            style={[
              styles.focusReticle,
              { left: focusPoint.x - 24, top: focusPoint.y - 24 },
            ]}
          />
        ) : null}
        {countdown !== null && countdown > 0 ? (
          <View style={styles.countdownOverlay} pointerEvents="none">
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        ) : null}
        {showGrid ? (
          <View style={styles.gridOverlay} pointerEvents="none">
            <View style={[styles.gridLineV, { left: '33.33%' }]} />
            <View style={[styles.gridLineV, { left: '66.66%' }]} />
            <View style={[styles.gridLineH, { top: '33.33%' }]} />
            <View style={[styles.gridLineH, { top: '66.66%' }]} />
          </View>
        ) : null}
        {scanMode === 'id_card' ? (
          <View style={styles.idPromptBanner} pointerEvents="none">
            <Text style={styles.idPromptText}>
              {idFrontUri ? 'Step 2/2: Scan BACK of ID Card' : 'Step 1/2: Scan FRONT of ID Card'}
            </Text>
          </View>
        ) : null}
        <View
          style={[
            styles.frameGuide,
            scanMode === 'id_card' && styles.idFrameGuide,
          ]}
          pointerEvents="none"
        >
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </Pressable>

      <View style={styles.bottomControls}>
        <Pressable
          onPress={handleGalleryImport}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Import images from gallery"
          style={styles.galleryBtn}
        >
          <Text style={styles.galleryBtnText}>Gallery</Text>
        </Pressable>

        <Pressable
          onPress={handleTakePhoto}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Capture document photo"
          style={styles.shutterOuter}
        >
          {busy ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>

        {batchAssets.length > 0 ? (
          <Pressable
            onPress={() => onCaptured(batchAssets)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Finish batch with ${batchAssets.length} pages`}
            style={styles.batchDoneBtn}
          >
            <Image
              source={{ uri: batchAssets[batchAssets.length - 1].uri }}
              style={styles.batchThumb}
            />
            <View style={styles.batchBadge}>
              <Text style={styles.batchBadgeText}>{batchAssets.length}</Text>
            </View>
            <Text style={styles.batchDoneText}>Done</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholderRight} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  permissionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  permDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 10,
  },
  overlayBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  overlayBtnActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    borderColor: '#60A5FA',
  },
  overlayBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewfinderWrap: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  frameGuide: {
    position: 'absolute',
    top: 24,
    right: 24,
    bottom: 24,
    left: 24,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#60A5FA',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  galleryBtn: {
    width: 72,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    alignItems: 'center',
  },
  galleryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#60A5FA',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  placeholderRight: {
    width: 72,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  batchDoneBtn: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  batchThumb: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#60A5FA',
  },
  batchBadge: {
    position: 'absolute',
    top: -4,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  batchBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  batchDoneText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  idPromptBanner: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(21, 70, 184, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  idPromptText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  idFrameGuide: {
    top: '28%',
    bottom: '28%',
    left: 20,
    right: 20,
  },
  focusReticle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '800',
  },
});
