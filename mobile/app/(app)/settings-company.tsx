import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Select, Button, SectionHeader, KeyboardFooter } from '@/components/ui';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { toast } from '@/store/toast';
import { spacing } from '@/theme/tokens';

/*
 * Settings → Company Details — web settings/tabs/general.js. The same six sections and
 * the same fields, written to the same cmpnyData document. Mobile used to expose only the
 * EUR→USD rate and the payment term; the company name, address, registration numbers,
 * contact details and the two invoice-PDF texts could only be changed on the web.
 */

type FieldDef = { key: string; label: string; placeholder?: string; keyboard?: 'decimal-pad' | 'number-pad' | 'email-address'; multiline?: boolean };

const SECTIONS: { title: string; hint?: string; fields: FieldDef[] }[] = [
  { title: 'Company', fields: [{ key: 'name', label: 'Company Name' }] },
  {
    title: 'Address',
    fields: [
      { key: 'street', label: 'Street' },
      { key: 'city', label: 'City' },
      { key: 'country', label: 'Country' },
      { key: 'zip', label: 'Zip Code' },
      { key: 'reg', label: 'Reg No.' },
      { key: 'vat', label: 'VAT No.' },
      { key: 'eori', label: 'EORI No.' },
    ],
  },
  {
    title: 'Online',
    fields: [
      { key: 'email', label: 'Email Address', keyboard: 'email-address' },
      { key: 'website', label: 'Website' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'phone', label: 'Phone' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'fax', label: 'Fax' },
      { key: 'contact', label: 'Person' },
    ],
  },
  {
    title: 'Invoicing',
    hint: 'Prepayment label replaces the word "Prepayment" on invoices. The note prints on the invoice PDF under Remarks — leave blank to omit.',
    fields: [
      { key: 'invPrepaymentLabel', label: 'Prepayment label', placeholder: 'Prepayment' },
      { key: 'invNonRadioText', label: 'Non-radioactive note', placeholder: 'e.g. We hereby certify the goods are non-radioactive and free of contamination.', multiline: true },
    ],
  },
  {
    title: 'Currency',
    hint: 'EUR→USD rate converts EUR to USD for combined dashboard totals (leave blank to use each contract’s rate). Payment term: an invoice with no due date is treated as due this many days after its date (default 30) — it drives the overdue alert.',
    fields: [
      { key: 'eurUsdRate', label: 'EUR → USD rate', placeholder: 'e.g. 1.08', keyboard: 'decimal-pad' },
      { key: 'defaultTermDays', label: 'Payment term (days)', placeholder: '30', keyboard: 'number-pad' },
    ],
  },
];

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Русский', label: 'Русский' },
];

export default function SettingsCompany() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const compData = useSettings((s) => s.compData);
  const { saveCompany } = useSettingsEdit();

  const [form, setForm] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  // Seed once, when company data has arrived (mobile-form-seeding).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !compData || Object.keys(compData).length === 0) return;
    seeded.current = true;
    setForm({ ...compData });
  }, [compData]);

  const val = (k: string) => (form?.[k] == null ? '' : String(form[k]));
  const set = (k: string) => (t: string) => setForm((f) => ({ ...f, [k]: t }));

  const onSave = async () => {
    setBusy(true);
    try {
      await saveCompany(form);
      toast.success('Company data saved successfully!');
    } catch {
      toast.error('Failed to save company data');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <StackHeader title="Company Details" subtitle="Printed on contracts and invoices" />
        <View style={{ gap: 14 }}>
          {SECTIONS.map((sec) => (
            <Card key={sec.title} style={{ gap: spacing.md }}>
              <SectionHeader title={sec.title} style={{ marginBottom: 0 }} />
              {sec.fields.map((f) => (
                <TextField
                  key={f.key}
                  label={f.label}
                  value={val(f.key)}
                  onChangeText={set(f.key)}
                  placeholder={f.placeholder}
                  keyboardType={f.keyboard}
                  autoCapitalize={f.keyboard === 'email-address' ? 'none' : undefined}
                  multiline={f.multiline}
                />
              ))}
              {sec.title === 'Company' && (
                <Select label="Language" value={val('lng') || 'English'} options={LANGUAGES} onChange={(v) => setForm((p) => ({ ...p, lng: v || 'English' }))} clearable={false} />
              )}
              {sec.hint ? <Text variant="caption" tone="faint">{sec.hint}</Text> : null}
            </Card>
          ))}
        </View>
      </Screen>
      <KeyboardFooter style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 10 }}>
        <Button title="Save" loading={busy} onPress={onSave} />
      </KeyboardFooter>
    </View>
  );
}
