import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button } from '@/components/ui';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { toast } from '@/store/toast';
import { SERVICE_UNAVAILABLE, getJson, apiConfigured } from '@/lib/api';

/*
 * Settings → Email Setup — web settings/tabs/emailSetup.js: whether the server can send
 * payment-reminder emails (GET /api/ai/email-status), the reminder cadence the invoice
 * Bell uses (settings.ReminderCadence.days, 1–90, saved as you type like web), and web's
 * five setup steps.
 */

type Status = { ready: boolean; hasApiKey?: boolean; hasFromEmail?: boolean; fromEmail?: string; fromDomain?: string };


export default function SettingsEmail() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings((s) => s.settings);
  const { saveSection } = useSettingsEdit();

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const settingsCadence = parseFloat((settings as any)?.ReminderCadence?.days);
  const [cadence, setCadence] = useState(Number.isFinite(settingsCadence) && settingsCadence > 0 ? String(settingsCadence) : '7');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Number.isFinite(settingsCadence) && settingsCadence > 0) setCadence(String(settingsCadence));
  }, [settingsCadence]);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!apiConfigured()) throw new Error(SERVICE_UNAVAILABLE);
      setStatus(await getJson<Status>('/api/ai/email-status'));
    } catch (e: any) {
      setError(e?.message || 'Failed to check email config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // web handleCadenceChange: 1–90 days, saved 600ms after the last keystroke.
  const onCadence = (val: string) => {
    setCadence(val);
    const n = parseFloat(val);
    if (!Number.isFinite(n) || n < 1 || n > 90) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveSection('ReminderCadence', { days: n });
        toast.success('Data successfully saved');
      } catch {
        toast.error('Failed to save');
      }
    }, 600);
  };

  const steps: { title: string; body?: React.ReactNode }[] = [
    {
      title: '1. Create a Resend account.',
      body: (
        <Text variant="caption" tone="primary" onPress={() => Linking.openURL('https://resend.com/signup')} style={{ textDecorationLine: 'underline' }}>
          resend.com/signup
        </Text>
      ),
    },
    { title: '2. Create an API key', body: <Text variant="caption" tone="muted">in the Resend dashboard (API Keys → Create).</Text> },
    {
      title: '3. Verify your sending domain',
      body: (
        <>
          <Text variant="caption" tone="muted">in Resend (Domains → Add Domain → add the DNS records).</Text>
          <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
            Without domain verification, emails will go to spam or bounce. This is the most common reason reminders fail.
          </Text>
        </>
      ),
    },
    {
      title: '4. Add these to your .env.local file',
      body: (
        <>
          <Text variant="caption" tone="muted">at the project root:</Text>
          <View style={{ marginTop: 6, borderRadius: 8, padding: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
            <Text variant="mono" selectable>
              {'RESEND_API_KEY=re_your_key_here\nRESEND_FROM_EMAIL=billing@yourdomain.com'}
            </Text>
          </View>
        </>
      ),
    },
    { title: '5. Restart your dev server', body: <Text variant="caption" tone="muted">for the env vars to load, then tap Re-check above.</Text> },
  ];

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Email Setup" subtitle="Payment reminder emails" />

      <Card style={{ gap: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text variant="bodyMedium">Payment Reminder Emails</Text>
          </View>
          <Button title="Re-check" variant="secondary" loading={loading} onPress={fetchStatus} />
        </View>

        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="caption" tone="muted">Checking server config…</Text>
          </View>
        ) : error ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.negative + '14', borderWidth: 1, borderColor: colors.negative + '33' }}>
            <Ionicons name="warning-outline" size={16} color={colors.negative} />
            <Text variant="caption" style={{ flex: 1, color: colors.negative }}>{error}</Text>
          </View>
        ) : status?.ready ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.positive + '14', borderWidth: 1, borderColor: colors.positive + '33' }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.positive} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: colors.positive }}>Email sending is configured</Text>
              <Text variant="caption" style={{ color: colors.positive, marginTop: 2 }}>
                Sending from {status.fromEmail}
                {status.fromDomain ? ` — make sure ${status.fromDomain} is verified in your Resend dashboard for best deliverability.` : ''}
              </Text>
            </View>
          </View>
        ) : status ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.warn + '14', borderWidth: 1, borderColor: colors.warn + '33' }}>
            <Ionicons name="warning-outline" size={18} color={colors.warn} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: colors.warn }}>Email sending is NOT configured</Text>
              <Text variant="caption" style={{ color: colors.warn, marginTop: 2 }}>
                Missing: {[!status.hasApiKey ? 'RESEND_API_KEY' : '', !status.hasFromEmail ? 'RESEND_FROM_EMAIL' : ''].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Ionicons name="time-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">Reminder cadence</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
              The Bell icon on the Invoices page shows a red dot when an invoice is still unpaid this many days after the last reminder.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 90 }}>
            <TextField value={cadence} onChangeText={onCadence} keyboardType="number-pad" accessibilityLabel="Reminder cadence in days" style={{ textAlign: 'center' }} />
          </View>
          <Text variant="body" tone="muted">days</Text>
        </View>
      </Card>

      <Card style={{ gap: 12, marginBottom: 12 }}>
        <Text variant="bodyMedium">
          Setup steps {status?.ready ? <Text variant="bodyMedium" style={{ color: colors.positive }}>(complete ✓)</Text> : null}
        </Text>
        {steps.map((s) => (
          <View key={s.title} style={{ gap: 2 }}>
            <Text variant="captionStrong">{s.title}</Text>
            {s.body}
          </View>
        ))}
      </Card>

      <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        The Bell icon on the Invoices page sends AI-generated reminders. The 24-hour cooldown prevents spam.
      </Text>
    </Screen>
  );
}
