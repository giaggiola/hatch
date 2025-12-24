import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

type Gender = 'M' | 'F' | 'U';

interface CreateNameModalProps {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string, gender: Gender) => Promise<void>;
}

export function CreateNameModal({
  visible,
  initialName,
  onClose,
  onSubmit,
}: CreateNameModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<Gender>('U');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens with new name
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setGender('U');
      setError(null);
    }
  }, [visible, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(name.trim(), gender);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create name');
    } finally {
      setIsSubmitting(false);
    }
  };

  const genderOptions: { value: Gender; label: string; color: string }[] = [
    { value: 'M', label: 'Boy', color: '#3b82f6' },
    { value: 'F', label: 'Girl', color: colors.primary },
    { value: 'U', label: 'Unisex', color: '#8b5cf6' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <Text style={[styles.title, { color: colors.text }]}>
            Create Custom Name
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Add a name that's not in our database
          </Text>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {/* Gender Selection */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
            <View style={styles.genderOptions}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderOption,
                    {
                      backgroundColor: gender === option.value
                        ? option.color
                        : colors.background,
                      borderColor: gender === option.value
                        ? option.color
                        : colors.border,
                    },
                  ]}
                  onPress={() => setGender(option.value)}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      {
                        color: gender === option.value
                          ? '#ffffff'
                          : colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.border }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#ffffff' }]}>
                  Create
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderOptionText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {},
  submitButton: {},
  buttonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
