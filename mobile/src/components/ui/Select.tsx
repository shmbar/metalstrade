import React, { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Pressable } from './Pressable';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Sheet } from './Sheet';
import { SearchField } from './SearchField';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { hapticTap } from '@/lib/haptics';
import { matchesAllWords, searchWords } from '@shared/search';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  /**
   * `field` — a labelled form field (the default, for forms).
   * `chip` — a compact pill for filter bars: shows the choice (or the placeholder),
   * tints when a filter is set, and clears with its own ✕.
   */
  variant?: 'field' | 'chip';
}

// Themed picker that opens the shared bottom sheet (with search on long lists).
// Replaces the web app's Radix <Selector> across the contract form.
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  error,
  required,
  searchable = true,
  clearable = true,
  variant = 'field',
}: SelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const words = searchWords(q);
    const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));
    if (!words.length) return sorted;
    return sorted.filter((o) => matchesAllWords(o.label, words));
  }, [options, q]);

  const openSheet = () => {
    setQ('');
    setOpen(true);
  };

  const trigger =
    variant === 'chip' ? (
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}: ${selected ? selected.label : 'any'}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 36,
          paddingLeft: 14,
          paddingRight: 10,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? colors.primary + '66' : colors.border,
          backgroundColor: selected ? colors.primary + '14' : colors.surfaceAlt,
        }}
      >
        <Text variant="label" tone={selected ? 'primary' : 'muted'} numberOfLines={1} style={{ maxWidth: 170 }}>
          {selected ? selected.label : placeholder}
        </Text>
        {clearable && selected ? (
          <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear filter">
            <Ionicons name="close" size={15} color={colors.primary} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={15} color={colors.textFaint} />
        )}
      </Pressable>
    ) : (
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.negative : colors.borderStrong,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          minHeight: 48,
          gap: 8,
        }}
      >
        <Text variant="body" tone={selected ? 'default' : 'faint'} style={{ flex: 1 }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        {clearable && selected ? (
          <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear">
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
        )}
      </Pressable>
    );

  return (
    <View style={{ gap: 6 }}>
      {variant === 'field' && label ? (
        <Text variant="label" tone="muted">
          {label}
          {required ? <Text variant="label" tone="negative"> *</Text> : null}
        </Text>
      ) : null}

      {trigger}

      {error ? (
        <Text variant="caption" tone="negative">
          {error}
        </Text>
      ) : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={label || placeholder || 'Select'} scroll={false} maxHeightPct={0.75}>
        {searchable && options.length > 8 ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <SearchField value={q} onChangeText={setQ} placeholder="Search…" />
          </View>
        ) : null}
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.value}
          keyboardShouldPersistTaps="handled"
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.md }}
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  if (!active) hapticTap();
                  onChange(item.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: spacing.lg,
                  backgroundColor: active ? colors.primary + '0F' : 'transparent',
                }}
              >
                <Text variant="body" tone={active ? 'primary' : 'default'} style={{ flex: 1 }} numberOfLines={1}>
                  {item.label}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text variant="body" tone="muted" style={{ textAlign: 'center', padding: spacing.xl }}>
              {q ? 'No matches' : 'No options'}
            </Text>
          }
        />
      </Sheet>
    </View>
  );
}
