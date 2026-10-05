import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow, spacing } from '@/theme/tokens';
import { useToastStore, ToastItem } from '@/store/toast';

const ICON: Record<ToastItem['tone'], keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

function ToastCard({ item }: { item: ToastItem }) {
  const { colors, scheme } = useTheme();
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(t);
  }, [dismiss, item.id, item.duration]);

  const tint = item.tone === 'success' ? colors.positive : item.tone === 'error' ? colors.negative : colors.primary;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18).stiffness(240)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.springify().damping(20)}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 11,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.border,
          ...getShadow(scheme, 'lg'),
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: tint + '1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={ICON[item.tone]} size={18} color={tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {item.title ? (
            <Text variant="bodyMedium" numberOfLines={1}>
              {item.title}
            </Text>
          ) : null}
          <Text variant={item.title ? 'caption' : 'bodyMedium'} tone={item.title ? 'muted' : 'default'} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/** Mounted once at the root; renders the toast stack under the status bar. */
export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();
  if (items.length === 0) return null;
  return (
    <View
      // Touches pass straight through. A toast sits over the header — the Back button and
      // the screen's actions — for up to four seconds after every save, and when it took
      // taps (to dismiss itself) the first tap on Back after saving did nothing
      // (client, 2026-10-05: "buttons not responding"). It goes away on its own.
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: spacing.lg,
        right: spacing.lg,
        gap: 8,
        zIndex: 1000,
      }}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}
