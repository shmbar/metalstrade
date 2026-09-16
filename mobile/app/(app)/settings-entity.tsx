import { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Select, Button, EmptyState, Sheet, IconButton, SegmentedControl, SectionHeader, Avatar } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useSettingsEdit } from '@/features/settings/useSettingsEdit';
import { toast } from '@/store/toast';
import { newId } from '@/data/writes';
import { spacing } from '@/theme/tokens';
import { StackHeader } from '@/components/StackHeader';

/*
 * One editor for the settings directories that are lists of records — web's Suppliers,
 * Clients, Bank Account, Stocks and Documents tabs (settings/tabs/*.js). Each type below
 * carries web's own fields, labels, required fields, list order, delete rule and
 * delete wording, so a record saved here is the record web would have saved.
 */

type Field = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  select?: 'currency' | 'stockType';
  group?: string;
};

type Config = {
  cat: string;
  title: string;
  /** "New …" / "Edit …" */
  noun: string;
  fields: Field[];
  sortKey: string;
  primary: (x: any) => string;
  secondary: (x: any) => string;
  avatar?: (x: any) => string;
  /** Documents are removed outright on web; every other list is soft-deleted */
  hardDelete?: boolean;
  /** web ModalToDelete text; Documents delete without asking, as web does */
  confirm?: string;
  /** web's message for a missing name on the Documents tab */
  nameMessage?: string;
};

const DOCS = ['Annex VII', 'ISF', 'Carrier'];

const partyFields = (nameKey: string): Field[] => [
  { key: nameKey, label: 'Name', required: true },
  { key: 'nname', label: 'Nick Name', required: true },
  { key: 'street', label: 'Street', required: true },
  { key: 'city', label: 'City', required: true },
  { key: 'country', label: 'Country', required: true },
  { key: 'other1', label: 'Other' },
  { key: 'poc', label: 'POC', group: 'Contact' },
  { key: 'email', label: 'Email', group: 'Contact' },
  { key: 'phone', label: 'Phone', group: 'Contact' },
  { key: 'mobile', label: 'Mobile', group: 'Contact' },
  { key: 'fax', label: 'Fax', group: 'Contact' },
  { key: 'other2', label: 'Other', group: 'Contact' },
];

function configFor(type: string): Config {
  switch (type) {
    case 'Annex VII':
      return {
        cat: 'Annex VII',
        title: 'Documents',
        noun: 'Template',
        sortKey: 'name',
        hardDelete: true,
        nameMessage: 'Template name is required.',
        primary: (x) => x.nickname || x.name || '(unnamed)',
        secondary: (x) => [x.rDCode, x.wasteDescription].filter(Boolean).join(' · '),
        fields: [
          { key: 'name', label: 'Template Name', required: true },
          { key: 'rDCode', label: 'R-Code / D-Code (field 8)', placeholder: 'e.g. R4' },
          { key: 'wasteDescription', label: 'Waste Description (field 9)', placeholder: 'e.g. Ni Cr Turnings' },
          { key: 'baselCode', label: 'Basel Annex IX (field 10.i)', placeholder: 'e.g. B1010' },
          { key: 'oecdCode', label: 'OECD Code (field 10.ii)' },
          { key: 'annexIIIACode', label: 'Annex IIIA Code (field 10.iii)' },
          { key: 'annexIIIBCode', label: 'Annex IIIB Code (field 10.iv)' },
          { key: 'euCode', label: 'EU List of Wastes (field 10.v)', placeholder: 'e.g. 19.12.02' },
          { key: 'nationalCode', label: 'National Code (field 10.vi)', placeholder: 'e.g. 7503' },
          { key: 'otherCode', label: 'Other Code (field 10.vii)' },
          { key: 'exportCountry', label: 'Export / Dispatch Country (field 11)', placeholder: 'e.g. US' },
          { key: 'transitCountry', label: 'Transit Country (field 11)' },
          { key: 'importCountry', label: 'Import / Destination Country (field 11)', placeholder: 'e.g. NL' },
        ],
      };
    case 'ISF':
      return {
        cat: 'ISF',
        title: 'Documents',
        noun: 'Template',
        sortKey: 'name',
        hardDelete: true,
        nameMessage: 'Template name is required.',
        primary: (x) => x.nickname || x.name || '(unnamed)',
        secondary: (x) => [x.htsCommodityCode, x.itemDescription].filter(Boolean).join(' · '),
        fields: [
          { key: 'name', label: 'Template Name', required: true },
          { key: 'importerRecordNum', label: 'Importer Reference #' },
          { key: 'consigneeNum', label: 'Consignee Number' },
          { key: 'htsCommodityCode', label: 'HTS-6 Commodity Code', placeholder: 'e.g. 7503.00' },
          { key: 'itemDescription', label: 'Item Description', placeholder: 'e.g. Ni Cr Stainless Steel Turnings' },
          { key: 'email1', label: 'Notification Email 1', placeholder: 'e.g. compliance@company.com' },
          { key: 'email2', label: 'Notification Email 2' },
        ],
      };
    case 'Carrier':
      return {
        cat: 'Carrier',
        title: 'Documents',
        noun: 'Carrier',
        sortKey: 'name',
        hardDelete: true,
        nameMessage: 'Carrier name is required.',
        primary: (x) => x.nickname || x.name || '(unnamed)',
        secondary: (x) => [x.contact, x.email].filter(Boolean).join(' · '),
        fields: [
          { key: 'name', label: 'Carrier Name', required: true },
          { key: 'nickname', label: 'Nickname', placeholder: 'e.g. CMA Estonia' },
          { key: 'address', label: 'Address' },
          { key: 'contact', label: 'Contact Person' },
          { key: 'tel', label: 'Tel.' },
          { key: 'fax', label: 'Fax' },
          { key: 'email', label: 'E-Mail' },
        ],
      };
    case 'Bank Account':
      return {
        cat: 'Bank Account',
        title: 'Bank Account',
        noun: 'Bank account',
        sortKey: 'bankNname',
        confirm: 'Deleting this account is irreversible. Please confirm to proceed.',
        primary: (x) => x.bankNname || x.bankName || '—',
        secondary: (x) => [x.bankName, x.iban].filter(Boolean).join(' · '),
        fields: [
          { key: 'bankName', label: 'Bank', required: true, maxLength: 47 },
          { key: 'bankNname', label: 'Bank Nick Name', required: true },
          { key: 'cur', label: 'Currency', required: true, select: 'currency' },
          { key: 'swiftCode', label: 'Note #1', required: true, maxLength: 45 },
          { key: 'iban', label: 'Note #2', required: true, maxLength: 47 },
          { key: 'corrBank', label: 'Note #3', required: true, maxLength: 47 },
          { key: 'corrBankSwift', label: 'Note #4', required: true, maxLength: 47 },
          { key: 'other', label: 'Other' },
        ],
      };
    case 'Stocks':
      return {
        cat: 'Stocks',
        title: 'Stocks',
        noun: 'Stock',
        sortKey: 'stock',
        confirm: 'Deleting this stock is irreversible. Please confirm to proceed.',
        primary: (x) => x.stock || '—',
        secondary: (x) => [x.nname, x.sType, x.country].filter(Boolean).join(' · '),
        avatar: (x) => x.nname || x.stock || '',
        fields: [
          { key: 'stock', label: 'Name', required: true },
          { key: 'nname', label: 'Nick Name', required: true },
          { key: 'country', label: 'Country' },
          { key: 'address', label: 'Address' },
          { key: 'sType', label: 'Stock type', select: 'stockType' },
          { key: 'phone', label: 'Phone' },
          { key: 'other', label: 'Other' },
        ],
      };
    case 'Client':
      return {
        cat: 'Client',
        title: 'Clients',
        noun: 'Client',
        sortKey: 'client',
        confirm: 'Deleting this client is irreversible. Please confirm to proceed.',
        primary: (x) => x.nname || x.client || '—',
        secondary: (x) => [x.client, x.city, x.country].filter(Boolean).join(' · '),
        avatar: (x) => x.nname || x.client || '',
        fields: partyFields('client'),
      };
    default:
      return {
        cat: 'Supplier',
        title: 'Suppliers',
        noun: 'Supplier',
        sortKey: 'supplier',
        confirm: 'Deleting this supplier is irreversible. Please confirm to proceed.',
        primary: (x) => x.nname || x.supplier || '—',
        secondary: (x) => [x.supplier, x.city, x.country].filter(Boolean).join(' · '),
        avatar: (x) => x.nname || x.supplier || '',
        fields: partyFields('supplier'),
      };
  }
}

export default function SettingsEntity() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const cfg = configFor(String(type || ''));
  const isDoc = DOCS.includes(cfg.cat);

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings((s) => s.settings);
  const { saveEntities } = useSettingsEdit();

  const list = useMemo(
    () =>
      (((settings as any)?.[cfg.cat]?.[cfg.cat] || []) as any[])
        .filter((x) => !x?.deleted)
        .sort((a, b) => String(a?.[cfg.sortKey] || '').localeCompare(String(b?.[cfg.sortKey] || ''))),
    [settings, cfg.cat, cfg.sortKey]
  );

  const currencyOptions = useMemo(
    () => (((settings as any)?.Currency?.Currency || []) as any[]).filter((c) => !c?.deleted).map((c) => ({ value: c.id, label: String(c.cur || c.id) })),
    [settings]
  );
  const stockTypeOptions = [
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Virtual', label: 'Virtual' },
  ];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const blank = () => Object.fromEntries([['id', ''], ...cfg.fields.map((f) => [f.key, '']), ...(isDoc ? [] : [['deleted', false]])]);
  const openNew = () => {
    setForm(blank());
    setErrors({});
    setOpen(true);
  };
  const openEdit = (e: any) => {
    setForm({ ...e });
    setErrors({});
    setOpen(true);
  };

  const persist = async (nextList: any[]) => {
    setBusy(true);
    try {
      await saveEntities(cfg.cat, nextList);
      toast.success('Data successfully saved');
      return true;
    } catch {
      toast.error('Failed to save');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    const errs: Record<string, string> = {};
    cfg.fields.forEach((f) => {
      if (f.required && !String(form[f.key] ?? '').trim()) errs[f.key] = cfg.nameMessage && f.key === 'name' ? cfg.nameMessage : 'Field must be filled';
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const raw = ((settings as any)?.[cfg.cat]?.[cfg.cat] || []) as any[];
    const ok = form.id
      ? await persist(raw.map((x) => (x.id === form.id ? { ...x, ...form } : x)))
      : await persist([...raw, { ...form, id: newId() }]);
    if (ok) setOpen(false);
  };

  const onDelete = (e: any) => {
    const raw = ((settings as any)?.[cfg.cat]?.[cfg.cat] || []) as any[];
    const run = async () => {
      const next = cfg.hardDelete ? raw.filter((x) => x.id !== e.id) : raw.map((x) => (x.id === e.id ? { ...x, deleted: true } : x));
      const ok = await persist(next);
      if (ok && form.id === e.id) setOpen(false);
    };
    if (!cfg.confirm) {
      run();
      return;
    }
    Alert.alert('Delete Confirmation', cfg.confirm, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const groups = cfg.fields.reduce<{ title?: string; fields: Field[] }[]>((acc, f) => {
    const last = acc[acc.length - 1];
    if (!last || last.title !== f.group) acc.push({ title: f.group, fields: [f] });
    else last.fields.push(f);
    return acc;
  }, []);

  const renderField = (f: Field) => {
    const label = f.required ? `${f.label} *` : f.label;
    const value = String(form[f.key] ?? '');
    const onChange = (t: string) => {
      setForm((p: any) => ({ ...p, [f.key]: t }));
      if (errors[f.key]) setErrors((p) => ({ ...p, [f.key]: '' }));
    };
    if (f.select) {
      return (
        <Select
          key={f.key}
          label={label}
          value={value}
          options={f.select === 'currency' ? currencyOptions : stockTypeOptions}
          onChange={onChange}
          error={errors[f.key] || undefined}
        />
      );
    }
    return (
      <TextField
        key={f.key}
        label={label}
        value={value}
        placeholder={f.placeholder}
        maxLength={f.maxLength}
        onChangeText={onChange}
        error={errors[f.key] || undefined}
        autoCapitalize={/email/i.test(f.key) ? 'none' : undefined}
        keyboardType={/email/i.test(f.key) ? 'email-address' : undefined}
      />
    );
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader
        title={cfg.title}
        right={<IconButton icon="add" variant="primary" accessibilityLabel={`Add ${cfg.noun.toLowerCase()}`} onPress={openNew} />}
      />

      {/* Documents: web's Annex VII / ISF / Carrier switch. */}
      {isDoc && (
        <View style={{ marginBottom: 12 }}>
          <SegmentedControl
            value={cfg.cat}
            onChange={(v) => router.setParams({ type: v })}
            options={DOCS.map((d) => ({ value: d, label: d }))}
          />
        </View>
      )}

      {list.length === 0 ? (
        <EmptyState
          title={isDoc ? `No ${cfg.cat === 'Carrier' ? 'carriers' : 'templates'} yet` : `No ${cfg.title.toLowerCase()} yet`}
          message="Tap + to add one."
        />
      ) : (
        <Card padded={false}>
          {list.map((e: any, i: number) => (
            <Pressable
              key={e.id}
              onPress={() => openEdit(e)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
            >
              {cfg.avatar ? <Avatar name={cfg.avatar(e)} size={30} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium" numberOfLines={1}>{cfg.primary(e)}</Text>
                {cfg.secondary(e) ? <Text variant="caption" tone="muted" numberOfLines={1}>{cfg.secondary(e)}</Text> : null}
              </View>
              <IconButton icon="trash-outline" tone="danger" size={36} accessibilityLabel={`Delete ${cfg.primary(e)}`} onPress={() => onDelete(e)} />
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </Card>
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={form.id ? `Edit ${cfg.noun}` : `New ${cfg.noun}`}
        footer={<Button title={form.id ? 'Update' : isDoc ? `Save ${cfg.noun}` : 'Add'} loading={busy} onPress={onSave} />}
      >
        <View style={{ gap: spacing.md }}>
          {groups.map((g, gi) => (
            <View key={`${g.title || 'main'}-${gi}`} style={{ gap: spacing.md }}>
              {g.title ? <SectionHeader title={g.title} style={{ marginBottom: 0, marginTop: 4 }} /> : null}
              {g.fields.map(renderField)}
            </View>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
