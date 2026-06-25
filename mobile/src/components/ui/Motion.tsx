import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Subtle staggered fade-in-up for list items (premium entrance). `index` staggers
// the delay; capped so long lists don't feel slow.
export function FadeInItem({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(380)} style={style}>
      {children}
    </Animated.View>
  );
}
