import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from './Button';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmTitle?: string;
  cancelTitle?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmTitle = 'Confirm',
  cancelTitle = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const { colors, typography, shapes, spacing } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderRadius: shapes.shapeLarge,
              padding: spacing.space5,
            },
          ]}
        >
          <Text
            style={[
              typography.titleLarge,
              { color: isDestructive ? colors.error : colors.onSurface, fontWeight: 'bold' },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              typography.bodyLarge,
              { color: colors.onSurfaceVariant, marginVertical: spacing.space3 },
            ]}
          >
            {message}
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title={cancelTitle}
              variant="outlined"
              onPress={onCancel}
              style={{ flex: 1, marginRight: spacing.space2 }}
            />
            <Button
              title={confirmTitle}
              variant={isDestructive ? 'destructive' : 'filled'}
              onPress={onConfirm}
              style={{ flex: 1, marginLeft: spacing.space2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
