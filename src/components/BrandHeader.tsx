import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface BrandHeaderProps {
  subtitle?: string;
}

export function BrandHeader({ subtitle = 'Offline Document Scanner' }: BrandHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`SnapDoc, ${subtitle}`}
    >
      <Image
        source={require('../../assets/icon.png')}
        style={[styles.logo, { borderColor: colors.border }]}
        accessibilityLabel="SnapDoc application logo"
      />
      <View style={styles.textGroup}>
        <Text style={[styles.brandName, { color: colors.textPrimary }]}>
          SnapDoc
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  textGroup: {
    flex: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
  },
});
