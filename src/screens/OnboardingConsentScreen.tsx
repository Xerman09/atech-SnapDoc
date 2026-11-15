import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandHeader } from '../components/BrandHeader';
import { LegalDocId } from '../constants/legal';
import { useTheme } from '../theme/ThemeContext';

interface OnboardingConsentScreenProps {
  onAccept: () => void;
  onOpenLegal: (docId: LegalDocId) => void;
}

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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <BrandHeader subtitle="100% Offline & Private Document Scanner" />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Before You Begin
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            SnapDoc works completely offline on your device. No documents, analytics, or cookies are sent to any server.
          </Text>

          <View style={styles.policyLinks}>
            {(
              [
                ['privacy', 'Privacy Policy'],
                ['terms', 'Terms of Service'],
                ['refund', 'Refund Policy'],
                ['cookies', 'Cookie Policy'],
              ] as [LegalDocId, string][]
            ).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => onOpenLegal(id)}
                accessibilityRole="link"
                accessibilityLabel={`Read ${label}`}
                style={[styles.linkChip, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              >
                <Text style={[styles.linkText, { color: colors.primary }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => {
              setAcceptedPolicies((prev) => !prev);
              setDeclinedMessage(false);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedPolicies }}
            accessibilityLabel="I have read and agree to the Privacy Policy and Terms of Service"
            style={[styles.checkRow, { borderColor: colors.border }]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: acceptedPolicies ? colors.primary : colors.border,
                  backgroundColor: acceptedPolicies ? colors.primary : 'transparent',
                },
              ]}
            >
              {acceptedPolicies ? (
                <Text style={[styles.checkmark, { color: colors.primaryText }]}>✓</Text>
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
            style={[styles.checkRow, { borderColor: colors.border }]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: confirmedAge ? colors.primary : colors.border,
                  backgroundColor: confirmedAge ? colors.primary : 'transparent',
                },
              ]}
            >
              {confirmedAge ? (
                <Text style={[styles.checkmark, { color: colors.primaryText }]}>✓</Text>
              ) : null}
            </View>
            <Text style={[styles.checkLabel, { color: colors.textPrimary }]}>
              I am 13 years or older, or have parent/guardian consent to use this app.
            </Text>
          </Pressable>

          {declinedMessage ? (
            <Text style={[styles.notice, { color: colors.warning }]} accessibilityLiveRegion="polite">
              You chose not to accept. Both checkboxes are required before scanning documents.
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onAccept}
              disabled={!canProceed}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canProceed }}
              accessibilityLabel="Accept and continue to SnapDoc"
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: canProceed ? colors.primary : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: canProceed ? colors.primaryText : colors.textSecondary },
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
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                Decline
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  policyLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  notice: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
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
});
