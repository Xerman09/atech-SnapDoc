import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import {
  CapturedImageAsset,
  pickAndValidateImages,
} from '../services/capture/importImages';
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
  const [busy, setBusy] = useState(false);

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

  const handleTakePhoto = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
      });
      if (!photo?.uri) return;

      const savedUri = saveScanImageToAppStorage(photo.uri, `camera_${Date.now()}.jpg`, 'jpg');
      onCaptured([
        {
          id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          uri: savedUri,
          width: photo.width,
          height: photo.height,
          source: 'camera',
          createdAt: Date.now(),
        },
      ]);
    } catch {
      Alert.alert('Capture Failed', 'Could not capture photo. Please try again.');
    } finally {
      setBusy(false);
    }
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
    <SafeAreaView style={styles.cameraRoot}>
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
            onPress={() => setTorch((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ selected: torch }}
            accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
            style={styles.overlayBtn}
          >
            <Text style={styles.overlayBtnText}>{torch ? 'Flash: On' : 'Flash: Off'}</Text>
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

      <View style={styles.viewfinderWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          enableTorch={torch}
        />
        <View style={styles.frameGuide} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

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

        <View style={styles.placeholderRight} />
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  overlayBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
});
