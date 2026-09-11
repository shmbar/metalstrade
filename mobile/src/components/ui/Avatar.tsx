import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Deterministic initials chip for suppliers, clients, warehouses and people —
 * the mobile side of web's components/Avatar.js ("every supplier/client/vendor/
 * warehouse name gets the avatar chip"). Same name → same colour, on every screen
 * and in both apps, so a counterparty is recognisable before its name is read.
 */

const hashName = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// Web strips punctuation with \p{L}\p{N}. A Unicode-property regex that an engine
// doesn't support is a crash at module load, so the scripts names here are
// actually written in are listed explicitly instead: Latin (+ extended), Greek,
// Cyrillic, Hebrew, Arabic, CJK.
const NON_NAME = /[^A-Za-z0-9À-ɏͰ-ϿЀ-ӿ֐-׿؀-ۿ一-鿿\s]+/g;

/** Web's initialsOf: letters/digits only, so "Metalfund (Igor)" reads "MI", not "M(". */
export const initialsOf = (name: string): string => {
  const words = String(name).replace(NON_NAME, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const { colors, scheme } = useTheme();
  const label = String(name || '').trim();
  if (!label) return null;
  const dark = scheme === 'dark';
  // Web's six tones in web's order — violet, green, amber, plum, teal, neutral —
  // so a name lands on the same colour family it has on the web app.
  const tones = [
    colors.primary,
    colors.positive,
    colors.warn,
    dark ? '#B9A3C6' : '#6A5677',
    dark ? '#7BC0B8' : '#2F6560',
    colors.textMuted,
  ];
  const fg = tones[hashName(label) % tones.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fg + (dark ? '2E' : '1F'),
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        variant="caption"
        color={fg}
        allowFontScaling={false}
        style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: Math.max(9, Math.round(size * 0.36)),
          lineHeight: Math.round(size * 0.5),
          letterSpacing: 0.2,
        }}
      >
        {initialsOf(label)}
      </Text>
    </View>
  );
}
