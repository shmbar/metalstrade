import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tone = 'default' | 'positive' | 'negative' | 'warn' | 'primary';

const useToneColor = () => {
  const { colors } = useTheme();
  return (t?: Tone) =>
    t === 'positive'
      ? colors.positive
      : t === 'negative'
        ? colors.negative
        : t === 'warn'
          ? colors.warn
          : t === 'primary'
            ? colors.primary
            : colors.text;
};

/**
 * A list section — web's SectionHeader (a brand-soft icon tile + the section name)
 * with the section's total on the right, and its rows edge to edge underneath.
 * The rows carry their own padding and hairline dividers, so the card itself is
 * unpadded and the dividers reach the card's inner edge like a native grouped list.
 */
export function SectionCard({
  icon,
  title,
  subtitle,
  total,
  totalTone,
  right,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  total?: string;
  totalTone?: Tone;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const toneColor = useToneColor();
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: children ? 8 : 14,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: colors.primary + '1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="h3" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
        {total != null ? (
          <Text variant="h3" numberOfLines={1} style={{ color: toneColor(totalTone), fontVariant: ['tabular-nums'] }}>
            {total}
          </Text>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

/**
 * One counterparty/warehouse row: avatar chip, name, optional secondary line,
 * the figure, and a chevron when it opens onto something. Press feedback comes
 * from the shared Pressable.
 */
export function EntityRow({
  name,
  subtitle,
  value,
  valueTone,
  onPress,
  first,
  avatar = true,
  trailing,
}: {
  name: string;
  subtitle?: string;
  value?: string;
  valueTone?: Tone;
  onPress?: () => void;
  first?: boolean;
  avatar?: boolean;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const toneColor = useToneColor();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: colors.borderStrong,
      }}
    >
      {avatar ? <Avatar name={name} size={34} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {value != null ? (
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={{ color: toneColor(valueTone), fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </Pressable>
  );
}
