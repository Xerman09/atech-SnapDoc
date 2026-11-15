import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandHeader } from '../components/BrandHeader';
import { StudioShell } from '../components/StudioShell';
import { LegalDocId } from '../constants/legal';
import { useTheme } from '../theme/ThemeContext';

interface OnboardingConsentScreenProps {
  onAccept: () => void;
  onOpenLegal: (docId: LegalDocId) => void;
}

const POLICY_ITEMS: { id: LegalDocId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
  { id: 'terms', label: 'Terms of Service', icon: 'document-text-outline' },
  { id: 'refund', label: 'Refund Policy', icon: 'card-outline' },
  { id: 'cookies', label: 'Cookie Policy', icon: 'ellipse-outline' },
];

export function OnboardingConsentScreen({
  onAccept,
  onOpenLegal,
}: OnboardingConsentScreenProps) {
  const { colors } = useTheme();
  // Explicitly unchecked by default — zero dark patterns
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [declinedMessage, setDeclinedMessage] = useState(false);

  const canProceed = acceptedPolicies && confirmedAge;

  return (
    <StudioShell>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <BrandHeader subtitle="100% Offline & Private Document Studio" />
        </View>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.heroIntro}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              PRIVACY-FIRST ARCHITECTURE
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Before you begin
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Every scan, edge crop, and PDF export happens strictly on your device. Zero cloud uploads, zero analytics, and zero trackers.
            </Text>
          </View>

          <View
            style={[
              styles.groupedList,
              { borderColor: colors.borderSubtle, backgroundColor: colors.background },
            ]}
          >
            {POLICY_ITEMS.map((item, idx) => (
              <Pressable
                key={item.id}
                onPress={() => onOpenLegal(item.id)}
                accessibilityRole="link"
                accessibilityLabel={`Read ${item.label}`}
                style={({ pressed }) => [
                  styles.policyRow,
                  idx < POLICY_ITEMS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSubtle,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.policyLeft}>
                  <Ionicons name={item.icon} size={17} color={colors.textSecondary} />
                  <Text style={[styles.policyLabel, { color: colors.textPrimary }]}>
                    {item.label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>

          <View style={styles.consentGroup}>
            <Pressable
              onPress={() => {
                setAcceptedPolicies((prev) => !prev);
                setDeclinedMessage(false);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedPolicies }}
              accessibilityLabel="I have read and agree to the Privacy Policy and Terms of Service"
              style={[
                styles.checkRow,
                {
                  borderColor: acceptedPolicies ? colors.accent : colors.border,
                  backgroundColor: acceptedPolicies ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: acceptedPolicies ? colors.accent : colors.border,
                    backgroundColor: acceptedPolicies ? colors.accent : 'transparent',
                  },
                ]}
              >
                {acceptedPolicies ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : null}
              </View>
              <Text style={[styles.checkLabel, { color: colors.textPrimary }]}>
                I agree to the Privacy Policy and Terms of Service.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setConfirmedAge((prev) => !prev);
                setDeclinedMessage(false);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmedAge }}
              accessibilityLabel="I confirm I am at least 13 years old or have parent or guardian consent"
              style={[
                styles.checkRow,
                {
                  borderColor: confirmedAge ? colors.accent : colors.border,
                  backgroundColor: confirmedAge ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: confirmedAge ? colors.accent : colors.border,
                    backgroundColor: confirmedAge ? colors.accent : 'transparent',
                  },
                ]}
              >
                {confirmedAge ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : null}
              </View>
              <Text style={[styles.checkLabel, { color: colors.textPrimary }]}>
                I am 13 years or older, or have parent/guardian consent.
              </Text>
            </Pressable>
          </View>

          {declinedMessage ? (
            <Text style={[styles.notice, { color: colors.warning }]} accessibilityLiveRegion="polite">
              Both confirmations are required before scanning documents.
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onAccept}
              disabled={!canProceed}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canProceed }}
              accessibilityLabel="Accept and continue to SnapDoc"
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: canProceed ? colors.primary : colors.surfaceElevated,
                  opacity: pressed && canProceed ? 0.88 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: canProceed ? colors.primaryText : colors.textMuted },
                ]}
              >
                Accept & Continue
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setAcceptedPolicies(false);
                setConfirmedAge(false);
                setDeclinedMessage(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Decline terms and stay on consent screen"
              style={styles.declineLink}
            >
              <Text style={[styles.declineText, { color: colors.textMuted }]}>
                Decline
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerBlock: {
    paddingHorizontal: 4,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    gap: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroIntro: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  groupedList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  policyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  policyLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  consentGroup: {
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  notice: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    gap: 8,
    marginTop: 2,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  declineLink: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
