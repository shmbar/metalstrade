import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';

export function SectionHeader({
  title,
  subtitle,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="h3">{title}</Text>
        {subtitle && (
          <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}
