import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ionicons as Icon } from '@expo/vector-icons';
import { Card } from './Card';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { Pressable } from './Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';
import { useCollapsible } from '@/lib/collapse';

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
  collapsible,
  open = true,
  onToggle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  total?: string;
  totalTone?: Tone;
  right?: React.ReactNode;
  children?: React.ReactNode;
  /** Tap the header to fold the rows away; the heading keeps title + total. */
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { colors } = useTheme();
  const toneColor = useToneColor();
  const showRows = !collapsible || open;
  const Header: any = collapsible ? Pressable : View;
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <Header
        {...(collapsible
          ? { onPress: onToggle, accessibilityRole: 'button', accessibilityState: { expanded: open }, accessibilityLabel: `${title}${open ? ' — collapse' : ' — expand'}` }
          : {})}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: layout.cardInset,
          paddingTop: layout.cardInset,
          paddingBottom: children && showRows ? 6 : layout.cardInset,
        }}
      >
        <View
          style={{
            width: layout.sectionIcon,
            height: layout.sectionIcon,
            borderRadius: 9,
            backgroundColor: colors.primary + '1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={15} color={colors.primary} />
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
          <Text variant="h3" numberOfLines={1} style={{ color: toneColor(totalTone) }}>
            {total}
          </Text>
        ) : null}
        {/* The same trailing slot the rows keep, so the header total and the row figures
            share one right edge. */}
        {collapsible ? (
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={layout.trailing} color={colors.textFaint} />
        ) : (
          <View style={{ width: layout.trailing }} />
        )}
      </Header>
      {showRows ? children : null}
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
        gap: 10,
        paddingHorizontal: layout.cardInset,
        paddingVertical: layout.rowPad,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}
    >
      {avatar ? <Avatar name={name} size={layout.leading} /> : null}
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
      {/* A row without a chevron keeps the chevron's width, so every figure in the card
          ends on the same line — a pressable row and a plain one used to differ by 26pt. */}
      {onPress ? (
        <Ionicons name="chevron-forward" size={layout.trailing} color={colors.textFaint} />
      ) : (
        <View style={{ width: layout.trailing }} />
      )}
    </Pressable>
  );
}

/**
 * A SectionCard that folds, and remembers whether this user left it open.
 *
 * Cashflow used to render every row of all ten sections in one scroll (the web app shows
 * the same sections as closed accordions), which is most of what "too much scrolling"
 * was. Closed, a section still shows the two things that matter — what it is and what it
 * totals — so the screen reads as a summary and opens only what you ask for.
 */
export function FoldSection({
  id,
  defaultOpen = false,
  ...rest
}: Parameters<typeof SectionCard>[0] & { id: string; defaultOpen?: boolean }) {
  const [open, toggle] = useCollapsible(id, defaultOpen);
  return <SectionCard {...rest} collapsible open={open} onToggle={toggle} />;
}
