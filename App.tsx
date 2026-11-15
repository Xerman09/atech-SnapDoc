import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandHeader } from './src/components/BrandHeader';
import { LegalDocId } from './src/constants/legal';
import { LegalDocumentScreen } from './src/screens/LegalDocumentScreen';
import { OnboardingConsentScreen } from './src/screens/OnboardingConsentScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { formatDisplayDate } from './src/utils/dateFormat';

type ActiveRoute = 'onboarding' | 'home' | 'settings' | 'legal';

function MainApp() {
  const { colors, resolvedScheme, toggleTheme } = useTheme();
  const [hasConsented, setHasConsented] = useState(false);
  const [route, setRoute] = useState<ActiveRoute>('onboarding');
  const [legalReturnRoute, setLegalReturnRoute] = useState<'onboarding' | 'settings'>('onboarding');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocId>('privacy');

  const openLegal = (docId: LegalDocId, returnTo: 'onboarding' | 'settings') => {
    setActiveLegalDoc(docId);
    setLegalReturnRoute(returnTo);
    setRoute('legal');
  };

  if (route === 'legal') {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <LegalDocumentScreen
          docId={activeLegalDoc}
          onBack={() => setRoute(legalReturnRoute)}
        />
      </>
    );
  }

  if (!hasConsented || route === 'onboarding') {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <OnboardingConsentScreen
          onAccept={() => {
            setHasConsented(true);
            setRoute('home');
          }}
          onOpenLegal={(docId) => openLegal(docId, 'onboarding')}
        />
      </>
    );
  }

  if (route === 'settings') {
    return (
      <>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <SettingsScreen
          onBack={() => setRoute('home')}
          onOpenLegal={(docId) => openLegal(docId, 'settings')}
          onDeleteAllData={() => {
            setHasConsented(false);
            setRoute('onboarding');
          }}
        />
      </>
    );
  }

  const formattedNow = formatDisplayDate(new Date());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <BrandHeader />
          </View>
          <Pressable
            onPress={() => setRoute('settings')}
            accessibilityRole="button"
            accessibilityLabel="Open Settings and Privacy"
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.iconBtnText, { color: colors.textPrimary }]}>Settings</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Ready to Scan Offline
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            All documents stay on your device. Camera capture and image import will be added in Phase 3.
          </Text>
          <Text
            style={[styles.dateText, { color: colors.textSecondary }]}
            accessibilityLabel={`Current date and time: ${formattedNow}`}
          >
            {formattedNow}
          </Text>

          <Pressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${resolvedScheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              Switch to {resolvedScheme === 'dark' ? 'Light' : 'Dark'} Mode
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandWrap: {
    flex: 1,
  },
  iconBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  dateText: {
    fontSize: 13,
    marginTop: 2,
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
