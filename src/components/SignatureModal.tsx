import React, { useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { NormalizedStroke } from '../types/scanner';

interface SignatureModalProps {
  visible: boolean;
  initialStrokes?: NormalizedStroke[];
  onApply: (strokes: NormalizedStroke[]) => void;
  onClose: () => void;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function SignatureModal({
  visible,
  initialStrokes = [],
  onApply,
  onClose,
}: SignatureModalProps) {
  const { colors } = useTheme();
  const [strokes, setStrokes] = useState<NormalizedStroke[]>(initialStrokes);
  const [padSize, setPadSize] = useState({ width: 300, height: 150 });
  const padSizeRef = useRef(padSize);
  padSizeRef.current = padSize;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const nx = clamp01(locationX / Math.max(1, padSizeRef.current.width));
          const ny = clamp01(locationY / Math.max(1, padSizeRef.current.height));
          setStrokes((prev) => [...prev, [{ x: nx, y: ny }]]);
        },
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const nx = clamp01(locationX / Math.max(1, padSizeRef.current.width));
          const ny = clamp01(locationY / Math.max(1, padSizeRef.current.height));
          setStrokes((prev) => {
            if (prev.length === 0) return [[{ x: nx, y: ny }]];
            const copy = [...prev];
            copy[copy.length - 1] = [...copy[copy.length - 1], { x: nx, y: ny }];
            return copy;
          });
        },
      }),
    []
  );

  const handlePadLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setPadSize({ width, height });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Draw Signature
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign below with your finger. Saved 100% offline onto this page.
          </Text>

          <View
            onLayout={handlePadLayout}
            {...responder.panHandlers}
            accessibilityLabel="Signature drawing canvas"
            style={[styles.pad, { borderColor: colors.border }]}
          >
            <Svg width={padSize.width} height={padSize.height}>
              {strokes.map((stroke, idx) => (
                <Polyline
                  key={idx}
                  points={stroke
                    .map((p) => `${p.x * padSize.width},${p.y * padSize.height}`)
                    .join(' ')}
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => setStrokes([])}
              accessibilityRole="button"
              accessibilityLabel="Clear signature pad"
              style={[styles.btn, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel signature"
              style={[styles.btn, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnText, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(strokes)}
              accessibilityRole="button"
              accessibilityLabel="Apply signature to document"
              style={[styles.btn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>
                {strokes.length > 0 ? 'Apply' : 'Remove'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12.5,
  },
  pad: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});
