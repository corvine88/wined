import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { getTierForLevel, getThresholdForLevel, LV10_TROPHY_COLOR } from '../levels';

// Shield bounding box is x:[64,104] y:[20,96]; viewBox below adds a little padding around it.
const SHIELD_PATH = 'M64 20 L104 20 L104 56 Q104 82 84 96 Q64 82 64 56 Z';
const VIEWBOX = '58 14 52 88';
const VIEWBOX_WIDTH = 52;
const VIEWBOX_HEIGHT = 88;

const LOCKED_TIER = { fill: '#D8D5CE', stroke: '#B5B1A6', text: '#9B968A' };

const ICONS: Partial<Record<number, keyof typeof Ionicons.glyphMap>> = {
  1: 'book-outline',
  3: 'wine-outline',
  4: 'star',
  5: 'locate',
  6: 'gift',
  8: 'flash',
  10: 'trophy',
};

const TEXT_SYMBOLS: Partial<Record<number, string>> = {
  2: '×2',
  9: '+',
};

function CrownIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 8 L7 12 L12 5 L17 12 L21 8 L19 18 L5 18 Z" fill={color} />
      <Circle cx="3" cy="8" r="1.6" fill={color} />
      <Circle cx="12" cy="5" r="1.6" fill={color} />
      <Circle cx="21" cy="8" r="1.6" fill={color} />
    </Svg>
  );
}

function Symbol({ level, size, color }: { level: number; size: number; color: string }) {
  const iconName = ICONS[level];
  if (iconName) return <Ionicons name={iconName} size={size} color={color} />;
  if (level === 7) return <CrownIcon size={size} color={color} />;
  const textSymbol = TEXT_SYMBOLS[level];
  if (textSymbol) return <Text style={{ color, fontSize: size, fontWeight: '800', lineHeight: size * 1.1 }}>{textSymbol}</Text>;
  return null;
}

export default function LevelBadge({ level, size = 64, locked = false }: { level: number; size?: number; locked?: boolean }) {
  const tier = locked ? LOCKED_TIER : getTierForLevel(level);
  const height = size * (VIEWBOX_HEIGHT / VIEWBOX_WIDTH);
  const symbolColor = !locked && level === 10 ? LV10_TROPHY_COLOR : tier.text;

  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height} viewBox={VIEWBOX} style={StyleSheet.absoluteFillObject}>
        <Path d={SHIELD_PATH} fill={tier.fill} stroke={tier.stroke} strokeWidth={3} />
      </Svg>

      <View style={styles.content} pointerEvents="none">
        {locked ? (
          <Ionicons name="lock-closed" size={size * 0.3} color={tier.text} />
        ) : (
          <>
            <Symbol level={level} size={size * 0.26} color={symbolColor} />
            <Text style={{ color: tier.text, fontSize: size * 0.2, fontWeight: '800', marginTop: size * 0.04 }}>
              {getThresholdForLevel(level)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '10%',
  },
});
