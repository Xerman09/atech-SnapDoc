import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface BrandHeaderProps {
  subtitle?: string;
}

export function BrandHeader({ subtitle = 'Document Scanner' }: BrandHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`SnapDoc, ${subtitle}`}
    >
      <View style={[styles.logoFrame, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          accessibilityLabel="SnapDoc application logo"
        />
      </View>
      <View style={styles.textGroup}>
        <Text style={[styles.brandName, { color: colors.textPrimary }]}>
          SnapDoc
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
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
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
  },
});
