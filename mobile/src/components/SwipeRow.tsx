import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { hapticTap } from '@/lib/haptics';
import { radius } from '@/theme/tokens';

interface SwipeRowProps {
  children: React.ReactNode;
  actionLabel: string;
  actionIcon: keyof typeof Ionicons.glyphMap;
  actionColor: string;
  onAction: () => void;
}

// Swipe-left row revealing one primary action (Mercury/Ramp list pattern).
// The action panel matches the card's 12px bottom margin so heights line up.
export function SwipeRow({ children, actionLabel, actionIcon, actionColor, onAction }: SwipeRowProps) {
  const ref = useRef<SwipeableMethods>(null);

  const renderRight = () => (
    <Pressable
      onPress={() => {
        hapticTap();
        ref.current?.close();
        onAction();
      }}
      style={{
        width: 88,
        marginBottom: 12,
        marginLeft: 8,
        borderRadius: radius.xl,
        backgroundColor: actionColor,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      <Ionicons name={actionIcon} size={20} color="#ffffff" />
      <Text variant="caption" color="#ffffff" style={{ fontFamily: 'Inter_600SemiBold' }}>
        {actionLabel}
      </Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      renderRightActions={renderRight}
      friction={2}
      rightThreshold={36}
      overshootRight={false}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
