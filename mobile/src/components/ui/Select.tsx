import React, { useMemo, useState } from 'react';
import { View, Pressable, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

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
}

// Themed picker that opens a bottom-sheet modal list (with optional search).
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
}: SelectProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));
    if (!needle) return sorted;
    return sorted.filter((o) => o.label.toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label" tone="muted">
          {label}
          {required ? <Text variant="label" tone="negative"> *</Text> : null}
        </Text>
      )}

      <Pressable
        onPress={() => {
          setQ('');
          setOpen(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? colors.negative : colors.borderStrong,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <Text variant="body" tone={selected ? 'default' : 'faint'} style={{ flex: 1 }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        {clearable && selected ? (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
        )}
      </Pressable>

      {error ? (
        <Text variant="caption" tone="negative">
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '70%',
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            paddingBottom: insets.bottom + spacing.md,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
            <Text variant="h3">{label || 'Select'}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {searchable && options.length > 8 && (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: spacing.md,
                }}
              >
                <Ionicons name="search" size={16} color={colors.textFaint} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search…"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  style={{ flex: 1, paddingVertical: 10, marginLeft: 6, color: colors.text, fontFamily: 'Poppins_400Regular' }}
                />
              </View>
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 13,
                    paddingHorizontal: spacing.lg,
                  }}
                >
                  <Text variant="body" tone={active ? 'primary' : 'default'} style={{ flex: 1 }} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text variant="body" tone="muted" style={{ textAlign: 'center', padding: spacing.xl }}>
                No options
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}
