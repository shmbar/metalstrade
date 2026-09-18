import React from 'react';
import { View } from 'react-native';
import { Card, Select, TextField, SectionHeader, Chip, Text } from '@/components/ui';
import { optionsFor } from '@/features/contracts/form';
import { spacing } from '@/theme/tokens';

// Web invoiceDetails.handleChange: these delivery terms have no port of discharge.
const NO_POD_TERMS = ['32432', '456', '43214', '567'];

export type InvoiceHeaderValue = {
  origin?: string;
  delTerm?: string;
  pol?: string;
  pod?: string;
  packing?: string;
  bankNname?: string;
  hs1?: string;
  hs2?: string;
  clientContractNo?: string;
  salesContractId?: string;
  ttlGross?: string | number;
  ttlPackages?: string | number;
  comments?: string;
  draft?: boolean;
  completed?: boolean;
};

/** The keys this component owns — Edit invoice seeds and saves exactly these. */
export const INVOICE_HEADER_KEYS = [
  'origin', 'delTerm', 'pol', 'pod', 'packing', 'bankNname', 'hs1', 'hs2',
  'clientContractNo', 'salesContractId', 'ttlGross', 'ttlPackages', 'comments', 'draft', 'completed',
] as const;

export const pickInvoiceHeader = (raw: any): InvoiceHeaderValue => {
  const out: any = {};
  INVOICE_HEADER_KEYS.forEach((k) => {
    if (raw?.[k] !== undefined) out[k] = raw[k];
  });
  return out;
};

/**
 * The invoice header web's invoiceDetails edits and mobile never had: shipping
 * terms, bank account, HS codes, weights, the client's contract number and sales
 * contract link, comments and the draft flag. Shared by New invoice and Edit invoice
 * so both write the same fields the same way. Values are settings ids, exactly as
 * web stores them.
 */
export function InvoiceHeaderFields({
  value,
  settings,
  onChange,
  salesContract,
}: {
  value: InvoiceHeaderValue;
  settings: any;
  onChange: (patch: Partial<InvoiceHeaderValue>) => void;
  /** Header sales-contract picker (web handleSalesContractPick). Omitted → not shown. */
  salesContract?: { options: { value: string; label: string }[]; onPick: (id: string) => void };
}) {
  const str = (v: unknown) => (v == null ? '' : String(v));
  // Web keys HS options as hs1/hs2 copies of settings.Hs[].hs — same ids, one list.
  const hsOptions = optionsFor(settings, 'Hs', 'hs');

  return (
    <>
      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Shipping" style={{ marginBottom: 0 }} />
        <Select
          label="Origin"
          value={str(value.origin)}
          options={[...optionsFor(settings, 'Origin', 'origin'), { value: 'empty', label: 'Empty' }]}
          onChange={(v) => onChange({ origin: v })}
        />
        <Select
          label="Delivery terms"
          value={str(value.delTerm)}
          options={optionsFor(settings, 'Delivery Terms', 'delTerm')}
          onChange={(v) => onChange(NO_POD_TERMS.includes(v) ? { delTerm: v, pod: '' } : { delTerm: v })}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Select label="POL" value={str(value.pol)} options={optionsFor(settings, 'POL', 'pol')} onChange={(v) => onChange({ pol: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Select label="POD" value={str(value.pod)} options={optionsFor(settings, 'POD', 'pod')} onChange={(v) => onChange({ pod: v })} />
          </View>
        </View>
        <Select label="Packing" value={str(value.packing)} options={optionsFor(settings, 'Packing', 'packing')} onChange={(v) => onChange({ packing: v })} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Total gross (kg)"
              value={str(value.ttlGross)}
              onChangeText={(t) => onChange({ ttlGross: t })}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Packages"
              value={str(value.ttlPackages)}
              onChangeText={(t) => onChange({ ttlPackages: t })}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Document" style={{ marginBottom: 0 }} />
        {/* Web: typing the client's contract # auto-links the matching sales contract;
            picking one from the list backfills the number. The screen does the match. */}
        <TextField
          label="Client contract no."
          value={str(value.clientContractNo)}
          onChangeText={(t) => onChange({ clientContractNo: t })}
          autoCapitalize="characters"
        />
        {salesContract && (
          <Select
            label="Sales contract"
            value={str(value.salesContractId)}
            options={salesContract.options}
            onChange={salesContract.onPick}
            placeholder="Not linked"
          />
        )}
        <Select
          label="Bank account"
          value={str(value.bankNname)}
          options={optionsFor(settings, 'Bank Account', 'bankNname')}
          onChange={(v) => onChange({ bankNname: v })}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Select label="HS code" value={str(value.hs1)} options={hsOptions} onChange={(v) => onChange({ hs1: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Select label="HS code 2" value={str(value.hs2)} options={hsOptions} onChange={(v) => onChange({ hs2: v })} />
          </View>
        </View>
        <TextField
          label="Comments"
          value={str(value.comments)}
          onChangeText={(t) => onChange({ comments: t })}
          multiline
        />
        {/* Web productsTableInvoice's two checkboxes: Draft and Invoice completed. */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip
              label="Draft"
              icon={value.draft ? 'checkmark' : undefined}
              active={!!value.draft}
              onPress={() => onChange({ draft: !value.draft })}
            />
            <Chip
              label="Invoice completed"
              icon={value.completed ? 'checkmark' : undefined}
              active={!!value.completed}
              onPress={() => onChange({ completed: !value.completed })}
            />
          </View>
          {value.draft && (
            <Text variant="caption" tone="muted">
              A draft books no stock movement — its material still counts as stock until you issue it.
            </Text>
          )}
        </View>
      </Card>
    </>
  );
}
