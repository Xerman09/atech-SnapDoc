import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { formatDisplayDate } from './src/utils/dateFormat';

function MainShell() {
  const { colors, resolvedScheme, mode, toggleTheme, setMode } = useTheme();
  const formattedNow = formatDisplayDate(new Date());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            SnapDoc
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            100% Offline Document Scanner
          </Text>
          <Text
            style={[styles.dateText, { color: colors.textSecondary }]}
            accessibilityLabel={`Current date and time: ${formattedNow}`}
          >
            {formattedNow}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${resolvedScheme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                Toggle {resolvedScheme === 'dark' ? 'Light' : 'Dark'} Mode
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('system')}
              accessibilityRole="button"
              accessibilityLabel="Use system appearance setting"
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                System ({mode})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
  },
  dateText: {
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
