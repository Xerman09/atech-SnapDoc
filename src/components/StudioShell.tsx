import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface StudioShellProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Centers content cleanly at mobile-studio width on wide screens
 * while applying Android/iOS Safe Area insets (status bar & navigation bar).
 */
export function StudioShell({ children, style }: StudioShellProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <View style={[styles.frame, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
});
