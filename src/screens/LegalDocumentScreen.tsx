import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={`Back from ${doc.title}`}
          style={[styles.backBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {doc.title}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={[styles.meta, { color: colors.textSecondary }]}
          accessibilityLabel={`Last updated ${updatedText}`}
        >
          Last updated: {updatedText}
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  spacer: {
    width: 56,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  meta: {
    fontSize: 13,
    marginBottom: 4,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
});
