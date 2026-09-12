import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { BackButton } from '@/components/ui/BackButton';

/**
 * Header for every pushed (non-tab) screen: back control, title block, and an
 * optional right-hand slot for the screen's period picker or primary action.
 *
 * Titles sit left, beside the back button — the same alignment the tab screens'
 * ScreenHeader uses — instead of each screen deciding between a centred h2, a
 * left h1 or a flex-1 h2. One header reads as one app.
 */
export function StackHeader({
  title,
  subtitle,
  right,
  backLabel,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  backLabel?: string;
  /** Override what the back control does (a select mode that cancels, a form that confirms). */
  onBack?: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <BackButton label={backLabel} onPress={onBack} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="h2" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="faint" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
