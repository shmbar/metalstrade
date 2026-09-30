import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SectionHeader } from '@/components/ui';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { toast } from '@/store/toast';
import { haptics } from '@/lib/haptics';
import { layout } from '@/theme/tokens';
import { useAuth } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';
import { CATEGORY_KEYS, NOTIFICATION_CATEGORIES, OTHER_CATEGORY, enabledCategoryCount, isCategoryEnabled } from '@shared/notificationPrefs';
import { useNotificationPrefs } from '@/features/push/notificationPrefs';
import { askPushPermission, pushPermission, registerPush } from '@/features/push/registerPush';

/*
 * Settings → Notifications — web settings/tabs/notifications.js, the same switches.
 *
 * Both write ONE document per person that the web bell, this app and the push sender all
 * read (shared/notificationPrefs.js), so a switch changed here is already changed on the web.
 * A category that is off: no badge, no push, and left out of the notification list.
 *
 * Laid out like a messaging app's settings: first whether this phone may show alerts at all
 * (iOS permission — without it every switch below is silent on this phone), then one switch
 * for everything, then each kind.
 */
const ROWS = [...NOTIFICATION_CATEGORIES, OTHER_CATEGORY];
type Permission = 'granted' | 'denied' | 'undetermined' | null;

export default function SettingsNotifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs, saving, setCategoryEnabled, setAllEnabled } = useNotificationPrefs();
  const { homeWorkspace, currentUser } = useAuth(useShallow((s) => ({ homeWorkspace: s.homeWorkspace, currentUser: s.currentUser })));

  // The phone's own permission — re-read on return from iOS Settings.
  const [permission, setPermission] = useState<Permission>(null);
  const readPermission = useCallback(() => {
    pushPermission().then(setPermission);
  }, []);
  useEffect(() => {
    readPermission();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') readPermission(); });
    return () => sub.remove();
  }, [readPermission]);

  const allowPush = async () => {
    if (permission === 'denied') {
      Linking.openSettings();
      return;
    }
    const ok = await askPushPermission();
    setPermission(ok ? 'granted' : 'denied');
    if (ok && homeWorkspace) registerPush(homeWorkspace, currentUser.email, currentUser.uid);
  };

  const done = (ok: boolean) => (ok ? toast.success('Data successfully saved') : toast.error('Failed to save'));
  const change = async (key: string, on: boolean) => {
    haptics.selection();
    done(await setCategoryEnabled(key, on));
  };
  const onCount = enabledCategoryCount(prefs);
  const allOn = onCount === CATEGORY_KEYS.length;
  const changeAll = async (on: boolean) => {
    haptics.selection();
    done(await setAllEnabled(on));
  };

  const row = (i: number) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: layout.cardInset,
    paddingVertical: layout.rowPad,
    borderTopWidth: i ? 1 : 0,
    borderTopColor: colors.border,
  });

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Notifications" subtitle="Applies here and on the web, including push" />

      <SectionHeader title="On this phone" />
      <Card padded={false} style={{ marginBottom: layout.stack }}>
        <View style={row(0)}>
          <Ionicons
            name={permission === 'granted' ? 'notifications' : 'notifications-off-outline'}
            size={20}
            color={permission === 'granted' ? colors.primary : colors.textFaint}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyMedium">Push notifications</Text>
            <Text variant="caption" tone="muted">
              {permission === 'granted'
                ? 'Allowed — alerts arrive even when the app is closed'
                : permission === 'denied'
                  ? 'Turned off for this app in iOS Settings — nothing below can reach this phone'
                  : permission === 'undetermined'
                    ? 'Not set up yet on this phone'
                    : 'Checking…'}
            </Text>
          </View>
          {permission && permission !== 'granted' ? (
            <Button title={permission === 'denied' ? 'Open Settings' : 'Allow'} variant="secondary" onPress={allowPush} />
          ) : null}
        </View>
      </Card>

      <SectionHeader title="What to notify me about" subtitle={`${onCount} of ${CATEGORY_KEYS.length} on`} />
      <Card padded={false}>
        <View style={row(0)}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyStrong">All notifications</Text>
            <Text variant="caption" tone="muted">{allOn ? 'Every kind is on' : onCount === 0 ? 'Everything is off' : 'Some kinds are off'}</Text>
          </View>
          <Switch
            value={allOn}
            disabled={saving === '*'}
            onValueChange={changeAll}
            accessibilityLabel="All notifications"
            trackColor={{ true: colors.primary }}
          />
        </View>
        {ROWS.map((c, i) => {
          const on = isCategoryEnabled(prefs, c.key);
          return (
            <View key={c.key} style={row(i + 1)}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium">{c.label}</Text>
                <Text variant="caption" tone="muted">{c.description}</Text>
              </View>
              <Switch
                value={on}
                disabled={saving === c.key || saving === '*'}
                onValueChange={(v) => change(c.key, v)}
                accessibilityLabel={`${c.label} notifications`}
                trackColor={{ true: colors.primary }}
              />
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
