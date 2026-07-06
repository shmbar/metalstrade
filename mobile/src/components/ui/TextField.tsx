import React, { useState } from 'react';
import { View, TextInput, TextInputProps, Pressable } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function TextField({ label, error, rightElement, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
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
        }}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          style={[
            {
              flex: 1,
              paddingVertical: 12,
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: colors.text,
            },
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
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
