import React, { useState } from 'react';
import {
  Alert,
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
import { BUSINESS_INFO, LegalDocId } from '../constants/legal';
import { useTheme } from '../theme/ThemeContext';
import { ThemeMode } from '../types/scanner';
import { formatShortDate } from '../utils/dateFormat';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenLegal: (docId: LegalDocId) => void;
  onCheckForUpdates: () => void;
  onDeleteAllData: () => void;
  hasAppPin?: boolean;
  onSaveAppPin?: (pin: string | null) => Promise<void>;
  docCount?: number;
  totalPages?: number;
}

const LEGAL_ROWS: { id: LegalDocId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
  { id: 'terms', label: 'Terms of Service', icon: 'document-text-outline' },
  { id: 'refund', label: 'Refund Policy', icon: 'card-outline' },
  { id: 'cookies', label: 'Cookie Policy', icon: 'ellipse-outline' },
  { id: 'business', label: 'Business & Developer Details', icon: 'business-outline' },
];

export function SettingsScreen({
  onBack,
  onOpenLegal,
  onCheckForUpdates,
  onDeleteAllData,
  hasAppPin = false,
  onSaveAppPin,
  docCount = 0,
  totalPages = 0,
}: SettingsScreenProps) {
  const { colors, mode, setMode } = useTheme();
  const releaseDateText = formatShortDate(BUSINESS_INFO.releaseDateMs);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState('');

  const confirmDeleteAll = () => {
    Alert.alert(
      'Delete All Local Data?',
      'This will permanently erase all scanned documents, pages, and local preferences from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: onDeleteAllData,
        },
      ]
    );
  };

  return (
    <StudioShell>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to home screen"
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Settings
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.segmentedWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((option) => {
            const selected = mode === option;
            return (
              <Pressable
                key={option}
                onPress={() => setMode(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Theme mode: ${option}`}
                style={[
                  styles.segment,
                  selected && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: selected ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>LEGAL & COMPLIANCE</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {LEGAL_ROWS.map((row, idx) => (
            <Pressable
              key={row.id}
              onPress={() => onOpenLegal(row.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${row.label}`}
              style={({ pressed }) => [
                styles.rowBtn,
                idx < LEGAL_ROWS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderSubtle,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.rowLeft}>
                <Ionicons name={row.icon} size={17} color={colors.textSecondary} />
                <Text style={[styles.rowText, { color: colors.textPrimary }]}>{row.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>APPLICATION</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>
              {BUSINESS_INFO.appName} v{BUSINESS_INFO.appVersion}
            </Text>
            <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
              {releaseDateText}
            </Text>
          </View>
          <Pressable
            onPress={onCheckForUpdates}
            accessibilityRole="button"
            accessibilityLabel="Check for in-app updates"
            style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="cloud-download-outline" size={17} color={colors.accent} />
              <Text style={[styles.rowText, { color: colors.accent, fontWeight: '600' }]}>
                Check for In-App Updates
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </Pressable>
        </View>

        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>DATA PRIVACY</Text>
        <View style={[styles.groupedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.rowBtn, { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="folder-outline" size={17} color={colors.textSecondary} />
              <Text style={[styles.rowText, { color: colors.textPrimary }]}>
                Local Vault: {docCount} {docCount === 1 ? 'document' : 'documents'} • {totalPages}{' '}
                {totalPages === 1 ? 'page' : 'pages'}
              </Text>
            </View>
          </View>
          {onSaveAppPin ? (
            <Pressable
              onPress={() => {
                if (hasAppPin) {
                  Alert.alert('App Lock PIN', 'Disable or change your 4-digit passcode?', [
                    { text: 'Change PIN', onPress: () => { setPinDraft(''); setPinModalOpen(true); } },
                    {
                      text: 'Disable PIN',
                      style: 'destructive',
                      onPress: () => onSaveAppPin(null),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                } else {
                  setPinDraft('');
                  setPinModalOpen(true);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Configure 4-digit offline app lock PIN"
              style={({ pressed }) => [
                styles.rowBtn,
                { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name={hasAppPin ? 'lock-closed-outline' : 'lock-open-outline'}
                  size={17}
                  color={hasAppPin ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.rowText, { color: colors.textPrimary }]}>
                  App Lock PIN ({hasAppPin ? 'Enabled' : 'Off'})
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={confirmDeleteAll}
            accessibilityRole="button"
            accessibilityLabel="Delete all local data and scans"
            style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
              <Text style={[styles.rowText, { color: colors.danger, fontWeight: '600' }]}>
                Delete All Local Data & Scans
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={pinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalOpen(false)}
      >
        <View style={styles.pinBackdrop}>
          <View style={[styles.pinCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.pinTitle, { color: colors.textPrimary }]}>
              Set 4-Digit App PIN
            </Text>
            <Text style={[styles.pinSub, { color: colors.textSecondary }]}>
              Stored encrypted on-device in Keystore. Required when opening SnapDoc.
            </Text>
            <TextInput
              value={pinDraft}
              onChangeText={(t) => setPinDraft(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="4-digit PIN input"
              style={[
                styles.pinInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <View style={styles.pinActions}>
              <Pressable
                onPress={() => setPinModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel PIN setup"
                style={[styles.pinBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.pinBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!/^\d{4}$/.test(pinDraft)) {
                    Alert.alert('Invalid PIN', 'Please enter exactly 4 digits.');
                    return;
                  }
                  if (onSaveAppPin) {
                    await onSaveAppPin(pinDraft);
                  }
                  setPinModalOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Save 4-digit PIN"
                style={[styles.pinBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <Text style={[styles.pinBtnText, { color: '#FFFFFF' }]}>Save PIN</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 10,
    paddingBottom: 32,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 8,
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
  groupedCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoMeta: {
    fontSize: 12.5,
  },
  pinBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  pinCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  pinTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  pinSub: {
    fontSize: 12.5,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  pinActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pinBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  pinBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
