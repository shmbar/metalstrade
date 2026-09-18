import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, MAX_FONT_SCALE, radius, spacing, typography } from '@/theme/tokens';
import { useKeyboardRevealer } from '@/lib/keyboard';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function TextField({ label, error, rightElement, style, onFocus, onBlur, autoFocus, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // The whole field — label, box and error — is what has to clear the keyboard.
  const fieldRef = useRef<View>(null);
  // The screen or sheet this field sits in; it scrolls the field above the keyboard.
  const revealer = useKeyboardRevealer();
  const inputRef = useRef<TextInput>(null);
  const handle = useMemo(() => ({ input: inputRef, box: fieldRef }), []);
  useEffect(() => revealer?.register?.(handle), [revealer, handle]);

  // In a sheet, autoFocus is handed to the sheet, which focuses this field once the sheet is
  // actually on screen. Elsewhere it is the platform's own autoFocus.
  const deferFocus = !!autoFocus && !!revealer?.deferAutoFocus;
  useEffect(() => {
    if (deferFocus) revealer?.deferAutoFocus?.(handle);
    // on mount only: a field asks once, when its sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return moves to the next field down, keeping the keyboard up — the way iOS forms work.
  // Dismissing on every Return and re-opening on the next tap is what made moving between
  // fields jump. A caller that handles Return itself (search, "add alias") keeps its own.
  const chains = !!revealer?.focusNext && !rest.multiline && rest.onSubmitEditing == null && rest.returnKeyType == null;

  return (
    <View ref={fieldRef} collapsable={false} style={{ gap: 4 }}>
      {label && (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.negative : focused ? colors.primary : colors.borderStrong,
          paddingHorizontal: spacing.md,
          minHeight: layout.controlHeight,
        }}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[
            {
              flex: 1,
              paddingVertical: 10,
              fontFamily: typography.input.fontFamily,
              fontSize: typography.input.fontSize,
              color: colors.text,
            },
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            revealer?.reveal(fieldRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
          autoFocus={deferFocus ? false : autoFocus}
          ref={inputRef}
          {...(chains
            ? { returnKeyType: 'next' as const, submitBehavior: 'submit' as const, onSubmitEditing: () => revealer?.focusNext?.(handle) }
            : null)}
        />
        {rightElement && <View style={{ marginLeft: 8 }}>{rightElement}</View>}
      </View>
      {error ? (
        <Text variant="caption" tone="negative">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
