import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  hint,
  containerStyle,
  style,
  ...props
}) => {
  const { colors, typography, shapes, spacing } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  let borderColor = colors.outline;
  if (isFocused) borderColor = colors.primary;
  if (error) borderColor = colors.error;

  return (
    <View style={[styles.container, { marginBottom: spacing.space4 }, containerStyle]}>
      <Text
        style={[
          typography.labelMedium,
          {
            color: error ? colors.error : isFocused ? colors.primary : colors.onSurfaceVariant,
            marginBottom: spacing.space1,
          },
        ]}
      >
        {label}
      </Text>
      <TextInput
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor={colors.outline}
        style={[
          styles.input,
          typography.bodyLarge,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderRadius: shapes.shapeSmall,
            color: colors.onSurface,
            paddingHorizontal: spacing.space3,
            paddingVertical: spacing.space2,
          },
          style,
        ]}
      />
      {error ? (
        <Text
          style={[
            typography.bodySmall,
            { color: colors.error, marginTop: spacing.space1 },
          ]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={[
            typography.bodySmall,
            { color: colors.outline, marginTop: spacing.space1 },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
  },
});
