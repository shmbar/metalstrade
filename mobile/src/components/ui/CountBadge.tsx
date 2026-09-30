import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * An unread count — "3", "99+". Nothing at all for zero, so a caller can always render it.
 * `overlay` pins it to the top-right corner of an icon button (the Dashboard bell); inline it
 * sits in a row before the chevron (More → Notifications). The tab bar uses the navigator's
 * own tabBarBadge with the same colour.
 */
export function CountBadge({ count, overlay = false }: { count: number; overlay?: boolean }) {
  const { colors } = useTheme();
  if (!count || count < 1) return null;
  return (
    <View
      accessibilityLabel={`${count} unread`}
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 9,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...(overlay ? { position: 'absolute', top: -4, right: -4, borderWidth: 2, borderColor: colors.surface } : {}),
      }}
    >
      <Text variant="captionStrong" color={colors.primaryText}>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
}
