import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, TextField, SectionHeader } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { Product } from '@/data/types';
import { newId } from '@/data/writes';
import { num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';
import { radius } from '@/theme/tokens';

interface ProductsEditorProps {
  products: Product[];
  currency: string;
  onChange: (products: Product[]) => void;
}

// Editable product lines (description / qty / unit price). Mirrors the web
// ProductsTable's core columns; line total is derived (qty × unitPrc).
export function ProductsEditor({ products, currency, onChange }: ProductsEditorProps) {
  const { colors } = useTheme();
  const sym = curSymbol(currency);

  const update = (id: string, patch: Partial<Product>) =>
    onChange(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const add = () => onChange([...products, { id: newId(), description: '', qnty: '', unitPrc: '' }]);
  const remove = (id: string) => onChange(products.filter((p) => p.id !== id));

  const grandTotal = products.reduce((s, p) => s + num(p.qnty) * num(p.unitPrc), 0);

  return (
    <Card>
      <SectionHeader
        title="Products"
        subtitle={`${products.length} line item${products.length === 1 ? '' : 's'}`}
        right={
          <Text variant="h3" tone="primary">
            {sym}
            {fmtMoney(grandTotal)}
          </Text>
        }
      />

      {products.map((p, i) => (
        <View
          key={p.id}
          style={{
            gap: 8,
            paddingVertical: 12,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="label" tone="faint" style={{ width: 18 }}>
              {i + 1}
            </Text>
            <View style={{ flex: 1 }}>
              <TextField
                value={String(p.description ?? '')}
                onChangeText={(t) => update(p.id, { description: t })}
                placeholder="Description"
              />
            </View>
            <Pressable onPress={() => remove(p.id)} hitSlop={8} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={20} color={colors.negative} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 26 }}>
            <View style={{ flex: 1 }}>
              <TextField
                value={String(p.qnty ?? '')}
                onChangeText={(t) => update(p.id, { qnty: t })}
                placeholder="Qty"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                value={String(p.unitPrc ?? '')}
                onChangeText={(t) => update(p.id, { unitPrc: t })}
                placeholder="Unit price"
                keyboardType="decimal-pad"
              />
            </View>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingRight: 4,
              }}
            >
              <Text variant="bodyMedium" tone="muted">
                {sym}
                {fmtMoney(num(p.qnty) * num(p.unitPrc))}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <Pressable
        onPress={add}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 12,
          paddingVertical: 11,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.borderStrong,
        }}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text variant="bodyMedium" tone="primary">
          Add product
        </Text>
      </Pressable>
    </Card>
  );
}
