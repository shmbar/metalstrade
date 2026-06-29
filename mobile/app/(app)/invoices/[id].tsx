import { useMemo, useState } from 'react';
import { View, Pressable, Modal, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, Button, SectionHeader, TextField, DateField, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useInvoices, deriveInvoice } from '@/features/invoices/useInvoices';
import { useAddPayment } from '@/features/invoices/usePayments';
import { useGenerateReminder, useSendReminder } from '@/features/invoices/useReminder';
import { apiConfigured } from '@/lib/api';
import { exportPdf } from '@/lib/export';
import { invoiceHtml } from '@/lib/pdfTemplates';
import { num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, compData } = useSettings();
  const { data: invoices } = useInvoices();
  const addPayment = useAddPayment();
  const genReminder = useGenerateReminder();
  const sendReminder = useSendReminder();

  const [showReminder, setShowReminder] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const view = useMemo(() => {
    const inv = invoices?.find((i) => i.id === id);
    return inv ? deriveInvoice(inv, settings) : null;
  }, [invoices, id, settings]);

  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));

  if (!view) {
    return (
      <Screen>
        <Back />
        <EmptyState
          title="Invoice not found"
          message="Open it from the invoices list."
          icon={<Ionicons name="receipt-outline" size={40} color={colors.textFaint} />}
        />
      </Screen>
    );
  }

  const sym = curSymbol(view.cur);
  const products = Array.isArray(view.raw.productsDataInvoice) ? view.raw.productsDataInvoice : [];
  const payments = Array.isArray(view.raw.payments) ? view.raw.payments : [];

  const submitPayment = async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter a payment amount greater than zero.');
      return;
    }
    try {
      await addPayment.mutateAsync({
        invoiceId: view.id,
        year: view.year,
        payment: { pmnt: amt, date: payDate },
      });
      setShowAdd(false);
      setAmount('');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Failed to record payment.');
    }
  };

  const clientObj = settings?.Client?.Client?.find((c: any) => c.id === view.raw.client);
  const companyName = (compData as any)?.companyName || (compData as any)?.cmpnyName || (compData as any)?.name || 'IMS';

  const openReminder = async () => {
    setTo(clientObj?.email || clientObj?.other1 || '');
    setSubject('');
    setBody('');
    setShowReminder(true);
    try {
      const draft = await genReminder.mutateAsync({
        invoice: {
          number: view.number,
          client: view.clientName,
          totalAmount: view.total,
          balanceDue: view.balance,
          paymentStatus: view.status,
          cur: view.cur,
          date: view.dateIso,
        },
        clientEmail: clientObj?.email || '',
        companyName,
      });
      setSubject(draft.subject || `Payment reminder — Invoice #${view.number}`);
      setBody(draft.body || '');
    } catch (e: any) {
      setSubject(`Payment reminder — Invoice #${view.number}`);
      setBody(`(Couldn't generate a draft: ${e?.message || 'error'}. You can write the message below.)`);
    }
  };

  const doSendReminder = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      Alert.alert('Incomplete', 'Recipient, subject and message are required.');
      return;
    }
    try {
      await sendReminder.mutateAsync({ invoiceId: view.id, invoiceYear: view.year, to: to.trim(), subject, body, companyName });
      setShowReminder(false);
      Alert.alert('Sent', `Reminder emailed to ${to.trim()}.`);
    } catch (e: any) {
      Alert.alert('Could not send', e?.message || 'Email failed (the server may not have email configured).');
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Back />
        <Pressable onPress={() => router.push(`/(app)/invoices/edit?id=${view.id}`)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Edit</Text>
        </Pressable>
      </View>

      {/* Title */}
      <View style={{ marginTop: 8, marginBottom: 16 }}>
        <Text variant="display">Invoice #{view.number ?? '—'}</Text>
        <Text variant="body" tone="muted" style={{ marginTop: 2 }}>
          {view.clientName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Badge label={view.status} tone={view.status === 'Paid' ? 'positive' : view.status === 'Partial' ? 'warn' : 'negative'} />
          <Badge label={view.finalized ? 'Finalized' : 'Provisional'} tone={view.finalized ? 'positive' : 'warn'} />
          {view.dateIso ? <Badge label={view.dateIso} tone="neutral" /> : null}
        </View>
      </View>

      {/* Money summary */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">Total</Text>
          <Text variant="h2" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>{view.totalLabel}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">Paid</Text>
          <Text variant="h2" tone="positive" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
            {sym}{fmtMoney(view.paid)}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">Balance</Text>
          <Text variant="h2" tone={view.balance > 0.01 ? 'negative' : 'positive'} style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
            {view.balanceLabel}
          </Text>
        </Card>
      </View>

      {/* Products */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Materials" subtitle={`${products.length} line item(s)`} />
        {products.length === 0 ? (
          <Text variant="body" tone="muted">No materials on this invoice.</Text>
        ) : (
          products.map((p, i) => (
            <View
              key={p.id || i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium" numberOfLines={1}>{p.description || '—'}</Text>
                <Text variant="caption" tone="faint">
                  {fmtMoney(num(p.qnty), 0)} × {sym}{fmtMoney(num(p.unitPrc))}
                </Text>
              </View>
              <Text variant="bodyMedium" tone="primary">
                {sym}{fmtMoney(num(p.total) || num(p.qnty) * num(p.unitPrc))}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* Payments */}
      <Card>
        <SectionHeader
          title="Payments"
          subtitle={`${payments.length} payment(s)`}
          right={
            <Pressable onPress={() => setShowAdd(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text variant="bodyMedium" tone="primary">Add</Text>
            </Pressable>
          }
        />
        {payments.length === 0 ? (
          <Text variant="body" tone="muted">No payments recorded yet.</Text>
        ) : (
          payments.map((p, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text variant="body" tone="muted">{p.date || p.pmntDate || '—'}</Text>
              <Text variant="bodyMedium" tone="positive">{sym}{fmtMoney(num(p.pmnt))}</Text>
            </View>
          ))
        )}
      </Card>

      <Button
        title="Export invoice (PDF)"
        variant="secondary"
        style={{ marginTop: 14 }}
        leftIcon={<Ionicons name="document-outline" size={18} color={colors.primary} />}
        onPress={() => exportPdf(invoiceHtml(view, compData), `Invoice-${view.number}`)}
      />

      {/* AI payment reminder */}
      {apiConfigured() && view.balance > 0.01 && (
        <Button
          title="Send payment reminder"
          variant="secondary"
          style={{ marginTop: 10 }}
          loading={genReminder.isPending}
          leftIcon={<Ionicons name="mail-outline" size={18} color={colors.primary} />}
          onPress={openReminder}
        />
      )}

      {/* Reminder sheet */}
      <Modal visible={showReminder} transparent animationType="slide" onRequestClose={() => setShowReminder(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowReminder(false)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text variant="h2">Payment reminder</Text>
            {genReminder.isPending && <Text variant="caption" tone="faint">drafting…</Text>}
          </View>
          <TextField label="To" value={to} onChangeText={setTo} placeholder="client@email.com" autoCapitalize="none" keyboardType="email-address" />
          <TextField label="Subject" value={subject} onChangeText={setSubject} />
          <TextField label="Message" value={body} onChangeText={setBody} multiline numberOfLines={6} style={{ minHeight: 130, textAlignVertical: 'top' }} />
          <Button title="Send email" loading={sendReminder.isPending} onPress={doSendReminder} />
        </View>
      </Modal>

      {/* Add payment sheet — content rendered only while open so the native date
          picker isn't mounted behind a hidden modal. */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        {showAdd && (
          <>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowAdd(false)} />
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderTopLeftRadius: radius['2xl'],
                borderTopRightRadius: radius['2xl'],
                padding: spacing.lg,
                paddingBottom: insets.bottom + spacing.lg,
                gap: spacing.lg,
              }}
            >
              <Text variant="h2">Record payment</Text>
              <Text variant="caption" tone="muted">
                Invoice #{view.number} · balance {view.balanceLabel}
              </Text>
              <TextField
                label={`Amount (${sym.trim() || view.cur})`}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                autoFocus
              />
              <DateField label="Payment date" value={payDate} onChange={setPayDate} />
              <Button title="Save payment" loading={addPayment.isPending} onPress={submitPayment} />
            </View>
          </>
        )}
      </Modal>
    </Screen>
  );
}

function Back() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Invoices</Text>
    </Pressable>
  );
}
