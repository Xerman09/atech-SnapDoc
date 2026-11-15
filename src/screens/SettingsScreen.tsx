import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to home screen"
          style={[styles.backBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Settings & Privacy
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Appearance
          </Text>
          <View style={styles.themeRow}>
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
                    styles.themeChip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      { color: selected ? colors.primaryText : colors.textPrimary },
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Legal & Compliance
          </Text>
          {(
            [
              ['privacy', 'Privacy Policy'],
              ['terms', 'Terms of Service'],
              ['refund', 'Refund Policy'],
              ['cookies', 'Cookie Policy'],
              ['business', 'Business & Developer Details'],
            ] as [LegalDocId, string][]
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => onOpenLegal(id)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${label}`}
              style={[styles.rowBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.rowText, { color: colors.textPrimary }]}>{label}</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Data Management
          </Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            All scans are stored locally on your device only.
          </Text>
          <Pressable
            onPress={confirmDeleteAll}
            accessibilityRole="button"
            accessibilityLabel="Delete all local data and scans"
            style={[styles.dangerBtn, { borderColor: colors.danger }]}
          >
            <Text style={[styles.dangerText, { color: colors.danger }]}>
              Delete All Local Data & Scans
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            About {BUSINESS_INFO.appName}
          </Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Version {BUSINESS_INFO.appVersion} • Released {releaseDateText}
          </Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Developer: {BUSINESS_INFO.developerName} • 100% Offline
          </Text>
          <Pressable
            onPress={onCheckForUpdates}
            accessibilityRole="button"
            accessibilityLabel="Check for in-app updates"
            style={[styles.rowBtn, { borderColor: colors.border, marginTop: 4 }]}
          >
            <Text style={[styles.rowText, { color: colors.primary }]}>
              Check for In-App Updates
            </Text>
            <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
          </Pressable>
        </View>
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  themeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
  },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
