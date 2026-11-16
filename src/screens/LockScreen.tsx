import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudioShell } from '../components/StudioShell';
import { useTheme } from '../theme/ThemeContext';

interface LockScreenProps {
  expectedPin: string;
  onUnlock: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function LockScreen({ expectedPin, onUnlock }: LockScreenProps) {
  const { colors } = useTheme();
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (digit === 'del') {
      setEntry((prev) => prev.slice(0, -1));
      setError(false);
      return;
    }
    if (!digit || entry.length >= 4) return;
    const next = entry + digit;
    setEntry(next);
    setError(false);
    if (next.length === 4) {
      if (next === expectedPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => setEntry(''), 280);
      }
    }
  };

  return (
    <StudioShell>
      <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          SnapDoc Locked
        </Text>
        <Text style={[styles.subtitle, { color: error ? colors.danger : colors.textSecondary }]}>
          {error ? 'Incorrect PIN. Please try again.' : 'Enter your 4-digit passcode'}
        </Text>

        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  borderColor: error ? colors.danger : colors.accent,
                  backgroundColor:
                    i < entry.length
                      ? error
                        ? colors.danger
                        : colors.accent
                      : 'transparent',
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.keypad}>
          {KEYS.map((key, idx) =>
            key === '' ? (
              <View key={idx} style={styles.keyEmpty} />
            ) : (
              <Pressable
                key={idx}
                onPress={() => handleDigit(key)}
                accessibilityRole="button"
                accessibilityLabel={key === 'del' ? 'Delete digit' : `Digit ${key}`}
                style={({ pressed }) => [
                  styles.keyBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                {key === 'del' ? (
                  <Ionicons name="backspace-outline" size={22} color={colors.textPrimary} />
                ) : (
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>{key}</Text>
                )}
              </Pressable>
            )
          )}
        </View>
      </View>
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  keypad: {
    width: 264,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  keyEmpty: {
    width: 76,
    height: 60,
  },
  keyBtn: {
    width: 76,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
  },
});
