import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Name } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface MatchModalProps {
  name: Name | null;
  familyName?: string;
  onClose: () => void;
  visible: boolean;
}

export function MatchModal({ name, familyName, onClose, visible }: MatchModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  if (!name) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View
          style={[
            styles.modal,
            { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.emoji}>🎉</Text>

          <Text style={[styles.title, { color: colors.primary }]}>
            It's a Match!
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You and your partner both liked this name
          </Text>

          <View style={[styles.nameCard, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.matchedName, { color: colors.text }]}>
              {name.name}
            </Text>
            {familyName && (
              <Text style={[styles.fullName, { color: colors.textSecondary }]}>
                {name.name} {familyName}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Keep Swiping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modal: {
    width: '85%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  nameCard: {
    width: '100%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  matchedName: {
    fontSize: FontSizes.display - 8,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  fullName: {
    fontSize: FontSizes.lg,
  },
  button: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
