import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export type StatusType =
  | 'paid'
  | 'partially_paid'
  | 'unpaid'
  | 'overdue'
  | 'completed'
  | 'pending'
  | 'cancelled'
  | 'low_stock'
  | 'active'
  | 'inactive';

interface StatusChipProps {
  status: StatusType;
  label?: string;
  style?: ViewStyle;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, style }) => {
  const { colors, typography, shapes, spacing } = useTheme();

  let bg = colors.surfaceVariant;
  let text = colors.onSurfaceVariant;
  let defaultLabel = status.toUpperCase();

  switch (status) {
    case 'paid':
    case 'completed':
    case 'active':
      bg = colors.successContainer;
      text = colors.onSuccessContainer;
      defaultLabel = status === 'paid' ? 'Paid' : status === 'active' ? 'Active' : 'Completed';
      break;
    case 'partially_paid':
      bg = colors.infoContainer;
      text = colors.onInfoContainer;
      defaultLabel = 'Partial';
      break;
    case 'unpaid':
    case 'pending':
    case 'low_stock':
      bg = colors.warningContainer;
      text = colors.onWarningContainer;
      defaultLabel = status === 'low_stock' ? 'Low Stock' : status === 'pending' ? 'Pending' : 'Unpaid';
      break;
    case 'overdue':
    case 'inactive':
      bg = colors.errorContainer;
      text = colors.onErrorContainer;
      defaultLabel = status === 'overdue' ? 'Overdue' : 'Inactive';
      break;
    case 'cancelled':
      bg = colors.surfaceVariant;
      text = colors.onSurfaceVariant;
      defaultLabel = 'Cancelled';
      break;
  }

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bg,
          borderRadius: shapes.shapeFull,
          paddingHorizontal: spacing.space2 + 2,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      <Text style={[typography.labelSmall, { color: text, fontWeight: 'bold' }]}>
        {label || defaultLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
