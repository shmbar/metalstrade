import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { layout } from '@/theme/tokens';

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: layout.headerGap,
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <Text variant="caption" tone="faint">
            {subtitle}
          </Text>
        )}
        <Text variant="h1">{title}</Text>
      </View>
      {right}
    </View>
  );
}
