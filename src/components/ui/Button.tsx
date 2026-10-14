import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { colors, typography, shapes, spacing } = useTheme();

  let backgroundColor = colors.primary;
  let textColor = colors.onPrimary;
  let borderColor = 'transparent';
  let borderWidth = 0;

  switch (variant) {
    case 'filled':
      backgroundColor = colors.primary;
      textColor = colors.onPrimary;
      break;
    case 'tonal':
      backgroundColor = colors.secondaryContainer;
      textColor = colors.onSecondaryContainer;
      break;
    case 'outlined':
      backgroundColor = 'transparent';
      textColor = colors.primary;
      borderColor = colors.outline;
      borderWidth = 1;
      break;
    case 'text':
      backgroundColor = 'transparent';
      textColor = colors.primary;
      break;
    case 'destructive':
      backgroundColor = colors.error;
      textColor = colors.onError;
      break;
  }

  if (disabled) {
    backgroundColor = colors.surfaceVariant;
    textColor = colors.outline;
    borderColor = 'transparent';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          borderRadius: shapes.shapeMedium,
          paddingVertical: spacing.space3,
          paddingHorizontal: spacing.space4,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              typography.labelLarge,
              { color: textColor, marginLeft: icon ? spacing.space2 : 0 },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
