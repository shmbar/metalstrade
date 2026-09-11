import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Subtle staggered fade-in-up for list items. Deliberately quick: at the old
// 380 ms + 45 ms per row (capped at 8), the last rows were still arriving ~0.75 s
// after the screen opened, which reads as "the page takes time to load" (client,
// 2026-09-11). Now everything has settled within ~0.37 s.
export function FadeInItem({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 25).duration(220)} style={style}>
      {children}
    </Animated.View>
  );
}
