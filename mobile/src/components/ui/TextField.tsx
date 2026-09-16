import React, { useRef, useState } from 'react';
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

export function TextField({ label, error, rightElement, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // The whole field — label, box and error — is what has to clear the keyboard.
  const fieldRef = useRef<View>(null);
  // The screen or sheet this field sits in; it scrolls the field above the keyboard.
  const revealer = useKeyboardRevealer();

  return (
    <View ref={fieldRef} collapsable={false} style={{ gap: 6 }}>
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
              paddingVertical: 12,
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
