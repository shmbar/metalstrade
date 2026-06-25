import React, { useState } from 'react';
import { View, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

interface DateFieldProps {
  label?: string;
  value: string | null | undefined; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  required?: boolean;
  error?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const display = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`;
};

// Date input mirroring the web app's single-date picker (DD-MMM-YYYY display,
// ISO storage). iOS uses an inline spinner in a sheet; Android the native dialog.
export function DateField({ label, value, onChange, required, error }: DateFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<Date>(value ? new Date(value) : new Date());

  const openPicker = () => {
    setTemp(value ? new Date(value) : new Date());
    setOpen(true);
  };

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label" tone="muted">
          {label}
          {required ? <Text variant="label" tone="negative"> *</Text> : null}
        </Text>
      )}

      <Pressable
        onPress={openPicker}
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
        <Ionicons name="calendar-outline" size={18} color={colors.textFaint} />
        <Text variant="body" tone={value ? 'default' : 'faint'} style={{ flex: 1 }}>
          {value ? display(value) : 'Select date'}
        </Text>
      </Pressable>

      {error ? (
        <Text variant="caption" tone="negative">
          {error}
        </Text>
      ) : null}

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={temp}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setOpen(false);
            if (event.type === 'set' && selected) onChange(toIso(selected));
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
          <View
            style={{
              backgroundColor: colors.bgElevated,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              padding: spacing.lg,
            }}
          >
            <DateTimePicker
              value={temp}
              mode="date"
              display="spinner"
              themeVariant={colors.bg === '#0b1220' ? 'dark' : 'light'}
              onChange={(_, selected) => selected && setTemp(selected)}
              style={{ alignSelf: 'center' }}
            />
            <Button title="Done" onPress={() => { onChange(toIso(temp)); setOpen(false); }} />
          </View>
        </Modal>
      )}
    </View>
  );
}
