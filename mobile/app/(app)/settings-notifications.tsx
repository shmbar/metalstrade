import { Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text } from '@/components/ui';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { toast } from '@/store/toast';
import { haptics } from '@/lib/haptics';
import { layout } from '@/theme/tokens';
import { NOTIFICATION_CATEGORIES, OTHER_CATEGORY, isCategoryEnabled } from '@shared/notificationPrefs';
import { useNotificationPrefs } from '@/features/push/notificationPrefs';

/*
 * Settings → Notifications — web settings/tabs/notifications.js, the same switches.
 *
 * Both write ONE document per person that the web bell, this app and the push sender all
 * read (shared/notificationPrefs.js), so a switch changed here is already changed on the web.
 * A category that is off: no badge, no push, and left out of the notification list.
 */
const ROWS = [...NOTIFICATION_CATEGORIES, OTHER_CATEGORY];

export default function SettingsNotifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs, setCategoryEnabled } = useNotificationPrefs();

  const change = async (key: string, on: boolean) => {
    haptics.selection();
    const ok = await setCategoryEnabled(key, on);
    if (ok) toast.success('Data successfully saved');
    else toast.error('Failed to save');
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Notifications" subtitle="Applies here and on the web, including push" />
      <Card padded={false}>
        {ROWS.map((c, i) => {
          const on = isCategoryEnabled(prefs, c.key);
          return (
            <View
              key={c.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: layout.cardInset,
                paddingVertical: layout.rowPad,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium">{c.label}</Text>
                <Text variant="caption" tone="muted">{c.description}</Text>
              </View>
              <Switch value={on} onValueChange={(v) => change(c.key, v)} accessibilityLabel={`${c.label} notifications`} />
            </View>
          );
        })}
      </Card>
      <Text variant="caption" tone="faint" style={{ marginTop: layout.stack, textAlign: 'center' }}>
        Switched-off notifications are not deleted — they just stop reaching you.
      </Text>
    </Screen>
  );
}
