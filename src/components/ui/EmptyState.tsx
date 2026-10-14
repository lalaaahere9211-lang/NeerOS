import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionTitle,
  onAction,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.space6 }]}>
      {icon ? <View style={{ marginBottom: spacing.space4 }}>{icon}</View> : null}
      <Text
        style={[
          typography.titleMedium,
          { color: colors.onSurface, textAlign: 'center', marginBottom: spacing.space2 },
        ]}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.space5 },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} variant="filled" />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
});
