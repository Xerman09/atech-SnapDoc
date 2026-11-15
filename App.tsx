import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandHeader } from './src/components/BrandHeader';
import { LegalDocId } from './src/constants/legal';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { LegalDocumentScreen } from './src/screens/LegalDocumentScreen';
import { OnboardingConsentScreen } from './src/screens/OnboardingConsentScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import {
  CapturedImageAsset,
  pickAndValidateImages,
} from './src/services/capture/importImages';
import { deleteAllScanFiles } from './src/services/storage/localFiles';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { formatRelativeDate } from './src/utils/dateFormat';

type ActiveRoute = 'onboarding' | 'home' | 'capture' | 'settings' | 'legal';

function MainApp() {
  const { colors, resolvedScheme } = useTheme();
  const [hasConsented, setHasConsented] = useState(false);
  const [route, setRoute] = useState<ActiveRoute>('onboarding');
  const [legalReturnRoute, setLegalReturnRoute] = useState<'onboarding' | 'settings'>('onboarding');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocId>('privacy');
  const [capturedPages, setCapturedPages] = useState<CapturedImageAsset[]>([]);

  const openLegal = (docId: LegalDocId, returnTo: 'onboarding' | 'settings') => {
    setActiveLegalDoc(docId);
    setLegalReturnRoute(returnTo);
    setRoute('legal');
  };

  const handleQuickImport = async () => {
    const result = await pickAndValidateImages();
    if (result.rejected.length > 0) {
      const summary = result.rejected
        .map((item) => `• ${item.name}: ${item.reason}`)
        .join('\n');
      Alert.alert('Some Images Were Skipped', summary);
    }
    if (result.imported.length > 0) {
      setCapturedPages((prev) => [...result.imported, ...prev]);
    }
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

  if (route === 'capture') {
    return (
      <>
        <StatusBar style="light" />
        <CaptureScreen
          onCaptured={(assets) => {
            setCapturedPages((prev) => [...assets, ...prev]);
            setRoute('home');
          }}
          onCancel={() => setRoute('home')}
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
            deleteAllScanFiles();
            setCapturedPages([]);
            setHasConsented(false);
            setRoute('onboarding');
          }}
        />
      </>
    );
  }

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

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setRoute('capture')}
            accessibilityRole="button"
            accessibilityLabel="Open camera to scan a document"
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.primaryText }]}>
              Scan Camera
            </Text>
          </Pressable>

          <Pressable
            onPress={handleQuickImport}
            accessibilityRole="button"
            accessibilityLabel="Import document images from gallery"
            style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
              Import Images
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={capturedPages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Scans Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap "Scan Camera" or "Import Images" to capture a document offline.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const formattedDate = formatRelativeDate(item.createdAt);
            return (
              <View
                style={[styles.pageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={[styles.thumb, { borderColor: colors.border }]}
                  accessibilityLabel={`Scanned page ${index + 1} captured ${formattedDate}`}
                />
                <View style={styles.pageMeta}>
                  <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                    Scanned Page {capturedPages.length - index}
                  </Text>
                  <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                    {item.source === 'camera' ? 'Camera Capture' : 'Gallery Import'} • {formattedDate}
                  </Text>
                </View>
              </View>
            );
          }}
        />
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
    gap: 16,
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  pageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageMeta: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 13,
  },
});
