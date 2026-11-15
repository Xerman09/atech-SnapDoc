import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
}: SettingsScreenProps) {
  const { colors, mode, setMode } = useTheme();
  const releaseDateText = formatShortDate(BUSINESS_INFO.releaseDateMs);

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
});
