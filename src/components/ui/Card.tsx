import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const { colors, shapes, spacing } = useTheme();

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
          borderRadius: shapes.shapeMedium,
          padding: spacing.space4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  statusColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  statusColor,
  onPress,
  style,
}) => {
  const { colors, typography, shapes, spacing } = useTheme();

  return (
    <Card
      onPress={onPress}
      style={[
        styles.metricCard,
        {
          borderLeftColor: statusColor || colors.primary,
          borderLeftWidth: 4,
          borderRadius: shapes.shapeMedium,
        },
        style,
      ]}
    >
      <View style={styles.metricHeader}>
        <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant, flex: 1 }]}>
          {title}
        </Text>
        {icon}
      </View>
      <Text
        style={[
          typography.headlineSmall,
          { color: statusColor || colors.onSurface, fontWeight: 'bold', marginVertical: spacing.space1 },
        ]}
      >
        {value}
      </Text>
      {subtitle ? (
        <Text style={[typography.bodySmall, { color: colors.outline }]}>{subtitle}</Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginVertical: 6,
  },
  metricCard: {
    minHeight: 90,
    justifyContent: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
