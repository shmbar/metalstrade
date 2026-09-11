import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnUI,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton, Text } from '@/components/ui';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { useExchangeRates } from './useExchangeRates';
import { useMetalPrices } from './useMetalPrices';

/**
 * MARKETS TICKER — web's dashboard strip (components/Dashboard/MarketsTicker.js
 * + HeadlineTicker.js) on mobile.
 *
 * Client report 2026-09-11: "App missing the currency rates. Also prices live
 * don't update or move like on the webapp." Mobile had a static row of metal
 * cards refreshed every five minutes and no FX at all. This is web's pair of
 * strips — Exchange Rates, then Metal Prices — each scrolling right to left on a
 * seamless loop at web's 50 px/s and refreshing on web's intervals (metals 60 s,
 * FX 30 min).
 *
 * Touching a strip holds it still so a figure can be read; letting go resumes
 * from the same spot (web pauses on hover). With the OS "Reduce Motion" setting
 * on, the strips don't auto-scroll and are swiped by finger instead.
 */

const SPEED_PX_PER_S = 50; // HeadlineTicker speed={50}

// Flag of the pair's BASE currency — web's currencyCountry map.
const FLAG: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}',
  EUR: '\u{1F1EA}\u{1F1FA}',
  GBP: '\u{1F1EC}\u{1F1E7}',
  ILS: '\u{1F1EE}\u{1F1F1}',
  RUB: '\u{1F1F7}\u{1F1FA}',
  AED: '\u{1F1E6}\u{1F1EA}',
  CNY: '\u{1F1E8}\u{1F1F3}',
};

// Web's formatPrice: USD, always two decimals.
const usd2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Seamless right-to-left loop: two copies side by side, moved one copy's width per lap. */
function Marquee({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const held = useRef(false);

  // Scheduled on the UI thread so a resume starts from the strip's REAL current
  // offset rather than a stale JS-side copy — otherwise letting go would jump.
  const run = useCallback(
    (w: number) => {
      if (w <= 0) return;
      const lapMs = (w / SPEED_PX_PER_S) * 1000;
      runOnUI((copyWidth: number, lap: number) => {
        'worklet';
        const from = Math.max(-copyWidth, Math.min(0, x.value));
        const remaining = ((copyWidth + from) / copyWidth) * lap;
        x.value = withSequence(
          withTiming(-copyWidth, { duration: remaining, easing: Easing.linear }),
          withRepeat(
            withSequence(
              withTiming(0, { duration: 0 }),
              withTiming(-copyWidth, { duration: lap, easing: Easing.linear })
            ),
            -1,
            false
          )
        );
      })(w, lapMs);
    },
    [x]
  );

  useEffect(() => {
    if (reduced || width <= 0 || held.current) return;
    run(width);
    return () => cancelAnimation(x);
  }, [width, reduced, run, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  if (reduced) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {children}
      </ScrollView>
    );
  }

  const hold = () => {
    held.current = true;
    cancelAnimation(x);
  };
  const release = () => {
    held.current = false;
    run(width);
  };

  return (
    <View style={{ overflow: 'hidden', paddingLeft: 12 }} onTouchStart={hold} onTouchEnd={release} onTouchCancel={release}>
      <Animated.View style={[{ flexDirection: 'row', alignSelf: 'flex-start' }, style]}>
        <View style={{ flexDirection: 'row' }} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
          {children}
        </View>
        {/* The loop's second copy — hidden from screen readers so each figure is read once. */}
        <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginRight: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {children}
    </View>
  );
}

function TickerCard({
  icon,
  title,
  right,
  children,
}: {
  icon: IconName;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        paddingTop: 10,
        paddingBottom: 12,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: radius.sm,
              backgroundColor: colors.primary + '1A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={14} color={colors.primary} />
          </View>
          <Text variant="bodyMedium">{title}</Text>
        </View>
        {right}
      </View>
      <View>
        {children}
        {/* Edge fades — web masks the strip in from each side. */}
        <LinearGradient
          pointerEvents="none"
          colors={[colors.card, colors.card + '00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[colors.card + '00', colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24 }}
        />
      </View>
    </View>
  );
}

function SkeletonStrip() {
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width={128} height={32} style={{ borderRadius: radius.md }} />
      ))}
    </View>
  );
}

function Unavailable({ label }: { label: string }) {
  return (
    <Text variant="caption" tone="faint" style={{ paddingHorizontal: 12 }}>
      {label}
    </Text>
  );
}

/** Web's change pill: ▲ green / ▼ red / • flat, showing the % when the server has it. */
function ChangePill({ change, pct }: { change: number | null; pct: number | null }) {
  const { colors } = useTheme();
  if (change == null) return null;
  const up = change > 0;
  const down = change < 0;
  const fg = up ? colors.positive : down ? colors.negative : colors.textMuted;
  const bg = up ? colors.positive + '1F' : down ? colors.negative + '1F' : colors.border;
  const arrow = up ? '▲' : down ? '▼' : '•';
  const figure = pct != null ? `${Math.abs(pct).toFixed(2)}%` : Math.abs(change).toFixed(2);
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text
        variant="caption"
        style={{ color: fg, fontFamily: 'PlusJakartaSans_500Medium', fontVariant: ['tabular-nums'] }}
      >
        {`${arrow} ${figure}`}
      </Text>
    </View>
  );
}

function FxTicker() {
  const { pairs, isLoading } = useExchangeRates();
  const hasAny = pairs.some((p) => p.rate != null);
  return (
    <TickerCard icon="cash-outline" title="Exchange Rates">
      {isLoading ? (
        <SkeletonStrip />
      ) : !hasAny ? (
        <Unavailable label="Exchange rates unavailable right now" />
      ) : (
        <Marquee>
          {pairs.map((p) => (
            <Chip key={p.key}>
              <Text variant="body">{FLAG[p.base] ?? ''}</Text>
              <Text variant="body" tone="muted">
                {p.label}
              </Text>
              {/* Web's formatRate: four decimals. */}
              <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>
                {p.rate != null ? p.rate.toFixed(4) : '—'}
              </Text>
            </Chip>
          ))}
        </Marquee>
      )}
    </TickerCard>
  );
}

function MetalsTicker() {
  const { colors } = useTheme();
  const { prices, date, isLoading, isFetching, refresh, configured } = useMetalPrices();
  if (!configured) return null;
  return (
    <TickerCard
      icon="cube-outline"
      title="Metal Prices"
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {date ? (
            <Text variant="caption" tone="primary">
              {`LME · ${date}`}
            </Text>
          ) : null}
          <Pressable
            onPress={refresh}
            disabled={isFetching}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Refresh metal prices"
          >
            <Ionicons name="refresh" size={16} color={colors.primary} style={{ opacity: isFetching ? 0.4 : 1 }} />
          </Pressable>
        </View>
      }
    >
      {isLoading ? (
        <SkeletonStrip />
      ) : prices.length === 0 ? (
        <Unavailable label="Metal prices unavailable right now" />
      ) : (
        <Marquee>
          {prices.map((m) => (
            <Chip key={m.key}>
              <Text variant="body" tone="muted">
                {`${m.name} (${m.unit})`}
              </Text>
              <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>
                {usd2.format(m.price)}
              </Text>
              <ChangePill change={m.change} pct={m.changePct} />
            </Chip>
          ))}
        </Marquee>
      )}
    </TickerCard>
  );
}

export function MarketsTicker() {
  return (
    <View style={{ gap: 10 }}>
      <FxTicker />
      <MetalsTicker />
    </View>
  );
}
