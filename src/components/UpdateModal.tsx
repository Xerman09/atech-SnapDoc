import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  downloadAndInstallApkUpdate,
  UpdateManifest,
} from '../services/update/inAppUpdater';
import { useTheme } from '../theme/ThemeContext';
import { formatShortDate } from '../utils/dateFormat';

interface UpdateModalProps {
  manifest: UpdateManifest | null;
  onDismiss: () => void;
}

export function UpdateModal({ manifest, onDismiss }: UpdateModalProps) {
  const { colors } = useTheme();
  const [downloading, setDownloading] = useState(false);

  if (!manifest) return null;

  const releasedText = formatShortDate(manifest.releasedAt);

  const handleInstall = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAndInstallApkUpdate(manifest);
    } catch (err) {
      Alert.alert(
        'Update Failed',
        err instanceof Error ? err.message : 'Could not install update.'
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={Boolean(manifest)}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Update Available (v{manifest.version})
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Released {releasedText} • Direct In-App Update
          </Text>
          <Text style={[styles.notes, { color: colors.textSecondary }]}>
            {manifest.notes}
          </Text>

          {downloading ? (
            <View style={styles.progressRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                Downloading & verifying update package...
              </Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                onPress={handleInstall}
                accessibilityRole="button"
                accessibilityLabel={`Download and install SnapDoc version ${manifest.version} inside the app`}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
                  Update Now
                </Text>
              </Pressable>
              <Pressable
                onPress={onDismiss}
                accessibilityRole="button"
                accessibilityLabel="Remind me later about update"
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                  Later
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
