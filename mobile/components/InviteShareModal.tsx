import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Share,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { api } from '@/lib/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface InviteShareModalProps {
  code: string;
  visible: boolean;
  onClose: () => void;
}

export function InviteShareModal({ code, visible, onClose }: InviteShareModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Use the web app URL for the invite link
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://hatch.name-me.app';
  const inviteUrl = `${baseUrl}/invite/${code}`;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title: 'Join me on Hatch',
        message: `I'd like to pick baby names together with you on Hatch!\n\n${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (error) {
      console.log('Share cancelled or failed');
    }
  };

  const handleSendEmail = async () => {
    if (!email.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailSending(true);
    setEmailError('');

    try {
      await api.createInvite(email);
      setEmailSent(true);
      setEmail('');
      setTimeout(() => setEmailSent(false), 3000);
    } catch (error) {
      setEmailError('Failed to send invite. Please try again.');
      console.error('Email send error:', error);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Invite Partner</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Invite Code */}
            <View style={styles.codeSection}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Invite Code
              </Text>
              <Text style={[styles.codeText, { color: colors.text }]}>{code}</Text>
            </View>

            {/* Share Link */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Share Link
              </Text>
              <View style={styles.linkRow}>
                <View style={[styles.linkInput, { backgroundColor: colors.background }]}>
                  <Text
                    style={[styles.linkText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {inviteUrl}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.copyButton,
                    { backgroundColor: copied ? '#10b981' : colors.primary },
                  ]}
                  onPress={handleCopy}
                >
                  <FontAwesome
                    name={copied ? 'check' : 'copy'}
                    size={14}
                    color="#ffffff"
                  />
                  <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Native Share */}
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: colors.background }]}
              onPress={handleNativeShare}
            >
              <FontAwesome name="share-alt" size={16} color={colors.text} />
              <Text style={[styles.shareButtonText, { color: colors.text }]}>
                Share via...
              </Text>
            </TouchableOpacity>

            {/* Email Invite */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Send invite by email
              </Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={[
                    styles.emailInput,
                    { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="partner@email.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor: emailSent ? '#10b981' : colors.primary,
                      opacity: emailSending || !email.trim() ? 0.5 : 1,
                    },
                  ]}
                  onPress={handleSendEmail}
                  disabled={emailSending || !email.trim()}
                >
                  {emailSending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <FontAwesome
                        name={emailSent ? 'check' : 'envelope'}
                        size={14}
                        color="#ffffff"
                      />
                      <Text style={styles.sendButtonText}>
                        {emailSent ? 'Sent!' : 'Send'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>
          </View>

          {/* Footer */}
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            This invite expires in 7 days
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  codeText: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 4,
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  linkInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  linkText: {
    fontSize: FontSizes.sm,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  shareButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  emailRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: FontSizes.md,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  footerText: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    paddingBottom: Spacing.lg,
  },
});
