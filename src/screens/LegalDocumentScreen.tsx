import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudioShell } from '../components/StudioShell';
import { LEGAL_DOCUMENTS, LegalDocId } from '../constants/legal';
import { useTheme } from '../theme/ThemeContext';
import { formatShortDate } from '../utils/dateFormat';

interface LegalDocumentScreenProps {
  docId: LegalDocId;
  onBack: () => void;
}

export function LegalDocumentScreen({ docId, onBack }: LegalDocumentScreenProps) {
  const { colors } = useTheme();
  const doc = LEGAL_DOCUMENTS[docId];
  const updatedText = formatShortDate(doc.lastUpdatedTimestamp);

  return (
    <StudioShell>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={`Back from ${doc.title}`}
          style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {doc.title}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text
          style={[styles.meta, { color: colors.textMuted }]}
          accessibilityLabel={`Last updated ${updatedText}`}
        >
          LAST UPDATED • {updatedText.toUpperCase()}
        </Text>

        {doc.sections.map((section) => (
          <View
            key={section.heading}
            style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.heading, { color: colors.textPrimary }]}>
              {section.heading}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {section.body}
            </Text>
          </View>
        ))}
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
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
  meta: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 2,
    marginLeft: 2,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
});
