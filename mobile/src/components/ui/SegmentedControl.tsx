import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: radius.sm,
              alignItems: 'center',
              backgroundColor: active ? colors.bgElevated : 'transparent',
              shadowColor: active ? '#103a7a' : undefined,
              shadowOpacity: active ? 0.08 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: active ? 1 : 0,
            }}
          >
            <Text variant="label" tone={active ? 'primary' : 'muted'} style={{ fontFamily: 'Inter_600SemiBold' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
