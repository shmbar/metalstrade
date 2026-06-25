import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

// A single shimmering placeholder block.
export function Skeleton({ width, height = 14, style }: { width?: number | string; height?: number; style?: ViewStyle }) {
  const { scheme } = useTheme();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { width: (width as any) ?? '100%', height, borderRadius: radius.sm, backgroundColor: scheme === 'dark' ? '#1d2940' : '#e7ecf3' },
        anim,
        style,
      ]}
    />
  );
}

// A card-shaped skeleton row, used while lists load.
export function SkeletonCard() {
  const { colors, scheme } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={'55%'} height={16} />
          <Skeleton width={'35%'} height={12} />
        </View>
        <Skeleton width={70} height={18} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Skeleton width={64} height={20} style={{ borderRadius: 999 }} />
        <Skeleton width={48} height={20} style={{ borderRadius: 999 }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
