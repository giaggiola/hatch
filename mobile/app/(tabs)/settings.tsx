import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { InviteShareModal } from '@/components/InviteShareModal';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { Preferences, Invite, Origin } from '@/types';

const GENDER_OPTIONS: { value: 'M' | 'F' | 'U'; label: string }[] = [
  { value: 'M', label: 'Boy' },
  { value: 'F', label: 'Girl' },
  { value: 'U', label: 'Unisex' },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, signOut, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Family name editing state
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [tempFamilyName, setTempFamilyName] = useState('');
  const [savingFamilyName, setSavingFamilyName] = useState(false);

  // Origins search state
  const [originSearch, setOriginSearch] = useState('');

  // Starts with input state
  const [startsWithInput, setStartsWithInput] = useState('');
  const startsWithDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startsWithInitializedRef = useRef(false);

  // Max length local state for immediate UI feedback
  const [localMaxLength, setLocalMaxLength] = useState<number | undefined>(undefined);
  const maxLengthInitializedRef = useRef(false);

  // Gender local state for immediate UI feedback
  const [localGenders, setLocalGenders] = useState<string[]>([]);
  const gendersInitializedRef = useRef(false);

  // Fetch partner info
  const { data: partner } = useQuery({
    queryKey: ['partner'],
    queryFn: () => api.getPartner(),
  });

  // Fetch origins for filter
  const { data: origins } = useQuery<Origin[]>({
    queryKey: ['origins'],
    queryFn: () => api.getOrigins(),
  });

  // Fetch preferences
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['preferences'],
    queryFn: () => api.getPreferences(),
  });

  // Initialize starts with input from preferences (only on first load)
  useEffect(() => {
    if (preferences && !startsWithInitializedRef.current) {
      startsWithInitializedRef.current = true;
      if (preferences.starts_with) {
        setStartsWithInput(preferences.starts_with);
      } else if (preferences.starting_letters?.length === 1) {
        setStartsWithInput(preferences.starting_letters[0]);
      }
    }
  }, [preferences]);

  // Initialize max length from preferences (only on first load)
  useEffect(() => {
    if (preferences && !maxLengthInitializedRef.current) {
      maxLengthInitializedRef.current = true;
      setLocalMaxLength(preferences.max_length);
    }
  }, [preferences]);

  // Initialize genders from preferences (only on first load)
  useEffect(() => {
    if (preferences && !gendersInitializedRef.current) {
      gendersInitializedRef.current = true;
      setLocalGenders(preferences.genders || []);
    }
  }, [preferences]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (startsWithDebounceRef.current) {
        clearTimeout(startsWithDebounceRef.current);
      }
    };
  }, []);

  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: (data: Partial<Preferences>) => api.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      queryClient.invalidateQueries({ queryKey: ['swipeNames'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['closeCalls'] });
    },
  });

  const handleInvitePartner = async () => {
    setCreatingInvite(true);
    try {
      const newInvite = await api.createInvite();
      setInvite(newInvite);
      setShowInviteModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to create invite. Please try again.');
      console.error('Error creating invite:', error);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleShowShareModal = () => {
    if (invite) {
      setShowInviteModal(true);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteUser();
              signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Family name editing handlers
  const startEditingFamilyName = () => {
    setTempFamilyName(user?.family_name || '');
    setEditingFamilyName(true);
  };

  const cancelEditingFamilyName = () => {
    setEditingFamilyName(false);
    setTempFamilyName('');
  };

  const handleFamilyNameSave = async () => {
    setSavingFamilyName(true);
    try {
      await api.updateUser({ family_name: tempFamilyName });
      await refreshUser();
      setEditingFamilyName(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update family name. Please try again.');
    } finally {
      setSavingFamilyName(false);
    }
  };

  const toggleGender = (gender: 'M' | 'F' | 'U') => {
    const updated = localGenders.includes(gender)
      ? localGenders.filter((g) => g !== gender)
      : [...localGenders, gender];
    // Update local state immediately for responsive UI
    setLocalGenders(updated);
    // Then sync to server
    updatePrefsMutation.mutate({ genders: updated as ('M' | 'F' | 'U')[] });
  };

  const toggleOrigin = (origin: string) => {
    const current = preferences?.origins || [];
    const updated = current.includes(origin)
      ? current.filter((o) => o !== origin)
      : [...current, origin];
    updatePrefsMutation.mutate({ origins: updated });
  };

  const handleStartsWithChange = useCallback((value: string) => {
    // Update local state immediately for responsive UI
    setStartsWithInput(value);

    // Debounce the API call
    if (startsWithDebounceRef.current) {
      clearTimeout(startsWithDebounceRef.current);
    }
    startsWithDebounceRef.current = setTimeout(() => {
      updatePrefsMutation.mutate({
        starts_with: value.trim() || undefined,
        starting_letters: value.trim() ? [value.trim()] : [],
      });
    }, 300);
  }, [updatePrefsMutation]);

  const handleMaxLengthChange = (value: number) => {
    // Update local state immediately for responsive UI
    const newValue = value >= 15 ? undefined : value;
    setLocalMaxLength(newValue);
    // Then sync to server
    updatePrefsMutation.mutate({ max_length: newValue });
  };

  const clearOrigins = () => {
    updatePrefsMutation.mutate({ origins: [] });
  };

  // Filter, sort alphabetically, and put selected origins at the top
  const filteredOrigins = (origins?.filter((origin) =>
    origin.name.toLowerCase().includes(originSearch.toLowerCase())
  ) || []).sort((a, b) => {
    const aSelected = preferences?.origins?.includes(a.name) ?? false;
    const bSelected = preferences?.origins?.includes(b.name) ?? false;
    // Selected items come first
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    // Then sort alphabetically within each group
    return a.name.localeCompare(b.name);
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Section */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.profileRow}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.display_name?.[0] || user?.email?.[0] || '?'}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {user?.display_name || 'Anonymous'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Family Name Row */}
        <View style={[styles.inlineRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>
            Family name
          </Text>
          {editingFamilyName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[
                  styles.familyNameInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={tempFamilyName}
                onChangeText={setTempFamilyName}
                placeholder="e.g., Smith"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleFamilyNameSave}
                disabled={savingFamilyName}
                style={styles.editButton}
              >
                {savingFamilyName ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <FontAwesome name="check" size={16} color="#10b981" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEditingFamilyName} style={styles.editButton}>
                <FontAwesome name="times" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={startEditingFamilyName} style={styles.editableValue}>
              <Text style={[styles.inlineValue, { color: colors.text }]}>
                {user?.family_name || (
                  <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                    Not set
                  </Text>
                )}
              </Text>
              <FontAwesome name="pencil" size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Partner Row */}
        <View style={[styles.inlineRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>Partner</Text>
          {partner ? (
            <View style={styles.partnerConnected}>
              {partner.avatar_url ? (
                <Image source={{ uri: partner.avatar_url }} style={styles.partnerAvatarSmall} />
              ) : (
                <View style={[styles.partnerAvatarSmall, { backgroundColor: colors.primary }]}>
                  <Text style={styles.partnerAvatarSmallText}>
                    {partner.display_name?.[0] || '?'}
                  </Text>
                </View>
              )}
              <Text style={[styles.inlineValue, { color: colors.text }]}>
                {partner.display_name || 'Partner'}
              </Text>
              <View style={[styles.connectedDot, { backgroundColor: '#10b981' }]} />
            </View>
          ) : invite ? (
            <TouchableOpacity onPress={handleShowShareModal} style={styles.shareInvite}>
              <View style={[styles.inviteCodeBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.inviteCodeText, { color: colors.text }]}>
                  {invite.code}
                </Text>
              </View>
              <Text style={[styles.shareText, { color: colors.primary }]}>Share</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleInvitePartner} disabled={creatingInvite}>
              {creatingInvite ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.inviteLink, { color: colors.primary }]}>
                  Invite partner
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Appearance Section */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
        <View style={styles.themeRow}>
          <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>Theme</Text>
          <View style={[styles.themeToggle, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[
                styles.themeButton,
                theme === 'light' && { backgroundColor: colors.surface },
                theme === 'light' && styles.themeButtonActive,
              ]}
              onPress={() => setTheme('light')}
            >
              <FontAwesome
                name="sun-o"
                size={16}
                color={theme === 'light' ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeButton,
                theme === 'dark' && { backgroundColor: colors.surface },
                theme === 'dark' && styles.themeButtonActive,
              ]}
              onPress={() => setTheme('dark')}
            >
              <FontAwesome
                name="moon-o"
                size={16}
                color={theme === 'dark' ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeButton,
                theme === 'system' && { backgroundColor: colors.surface },
                theme === 'system' && styles.themeButtonActive,
              ]}
              onPress={() => setTheme('system')}
            >
              <FontAwesome
                name="desktop"
                size={16}
                color={theme === 'system' ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filters Section */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Filters</Text>
          <FontAwesome
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filtersContent}>
            {/* Gender - Chip Style Multi-Select */}
            <View style={styles.filterGroup}>
              <View style={styles.filterLabelRow}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Gender
                </Text>
              </View>
              <View style={styles.genderChipsContainer}>
                {GENDER_OPTIONS.map((option) => {
                  const isSelected = localGenders.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.genderChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => toggleGender(option.value)}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <FontAwesome name="check" size={12} color="#fff" style={styles.chipCheckIcon} />
                      )}
                      <Text
                        style={[
                          styles.genderChipText,
                          { color: isSelected ? '#fff' : colors.text },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.multiSelectHint, { color: colors.textSecondary }]}>
                Tap to select multiple
              </Text>
            </View>

            {/* Max Length & Starts With Row */}
            <View style={styles.filterRow}>
              {/* Max Length */}
              <View style={styles.filterHalf}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Max length
                </Text>
                <View style={[styles.stepperContainer, { backgroundColor: colors.background }]}>
                  <TouchableOpacity
                    style={[styles.stepperButton, { borderColor: colors.border }]}
                    onPress={() => {
                      if (localMaxLength === undefined) {
                        // From unlimited, go to 14
                        handleMaxLengthChange(14);
                      } else if (localMaxLength > 3) {
                        handleMaxLengthChange(localMaxLength - 1);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="minus" size={12} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { color: colors.text }]}>
                    {localMaxLength !== undefined ? localMaxLength : '∞'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, { borderColor: colors.border }]}
                    onPress={() => {
                      if (localMaxLength !== undefined && localMaxLength < 14) {
                        handleMaxLengthChange(localMaxLength + 1);
                      } else {
                        // At 14 or undefined, go to unlimited
                        handleMaxLengthChange(15);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="plus" size={12} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Starts With */}
              <View style={styles.filterHalf}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Starts with
                </Text>
                <View style={styles.startsWithContainer}>
                  <TextInput
                    style={[
                      styles.startsWithInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                      },
                    ]}
                    value={startsWithInput}
                    onChangeText={handleStartsWithChange}
                    placeholder="Al, Ma..."
                    placeholderTextColor={colors.textSecondary}
                    maxLength={10}
                  />
                  {startsWithInput ? (
                    <TouchableOpacity
                      onPress={() => {
                        setStartsWithInput('');
                        handleStartsWithChange('');
                      }}
                      style={styles.clearButton}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Origins */}
            <View style={styles.filterGroup}>
              <View style={styles.filterLabelRow}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                  Origins
                </Text>
                {preferences?.origins && preferences.origins.length > 0 && (
                  <TouchableOpacity onPress={clearOrigins}>
                    <Text style={[styles.clearLink, { color: colors.primary }]}>
                      Clear ({preferences.origins.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Origin Search */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                    },
                  ]}
                  value={originSearch}
                  onChangeText={setOriginSearch}
                  placeholder="Search origins..."
                  placeholderTextColor={colors.textSecondary}
                />
                {originSearch ? (
                  <TouchableOpacity
                    onPress={() => setOriginSearch('')}
                    style={styles.searchClearButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Origins List - No nested scroll, renders inline */}
              <View style={[styles.originsList, { backgroundColor: colors.background }]}>
                {filteredOrigins.map((origin, index) => {
                  const isSelected = preferences?.origins?.includes(origin.name);
                  const isLast = index === filteredOrigins.length - 1;
                  return (
                    <TouchableOpacity
                      key={origin.name}
                      style={[
                        styles.originItem,
                        !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                      ]}
                      onPress={() => toggleOrigin(origin.name)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.originName,
                          { color: colors.text },
                        ]}
                      >
                        {origin.name}
                      </Text>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <FontAwesome name="check" size={10} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Account Actions - Subtle footer like web */}
      <View style={styles.accountActions}>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={[styles.accountLink, { color: colors.textSecondary }]}>Log out</Text>
        </TouchableOpacity>
        <Text style={[styles.accountDot, { color: colors.border }]}>•</Text>
        <TouchableOpacity onPress={handleDeleteAccount}>
          <Text style={[styles.accountLinkDanger, { color: colors.textSecondary }]}>
            Delete account
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: colors.primary }]}>Hatch</Text>
        <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
      </View>

      {/* Invite Modal */}
      {invite && (
        <InviteShareModal
          code={invite.code}
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  profileInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  displayName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  email: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
  },
  inlineLabel: {
    fontSize: FontSizes.sm,
  },
  inlineValue: {
    fontSize: FontSizes.sm,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  familyNameInput: {
    width: 100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: FontSizes.sm,
  },
  editButton: {
    padding: Spacing.xs,
  },
  editableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  partnerConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  partnerAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerAvatarSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shareInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inviteCodeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  inviteCodeText: {
    fontSize: FontSizes.xs,
    fontFamily: 'monospace',
  },
  shareText: {
    fontSize: FontSizes.sm,
  },
  inviteLink: {
    fontSize: FontSizes.sm,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.md,
  },
  themeButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  themeButtonActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersContent: {
    marginTop: Spacing.md,
  },
  filterGroup: {
    marginBottom: Spacing.md,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  filterLabel: {
    fontSize: FontSizes.sm,
  },
  filterHint: {
    fontSize: FontSizes.xs,
  },
  clearLink: {
    fontSize: FontSizes.xs,
  },
  genderChipsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  chipCheckIcon: {
    marginRight: 6,
  },
  genderChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  multiSelectHint: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  filterHalf: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  sliderValue: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
  },
  startsWithContainer: {
    position: 'relative',
  },
  startsWithInput: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    paddingRight: 32,
  },
  clearButton: {
    position: 'absolute',
    right: Spacing.sm,
    top: '50%',
    transform: [{ translateY: -8 }],
    padding: 4,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  searchInput: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    paddingRight: 32,
  },
  searchClearButton: {
    position: 'absolute',
    right: Spacing.sm,
    top: '50%',
    transform: [{ translateY: -8 }],
    padding: 4,
  },
  originsList: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  originItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  originName: {
    fontSize: FontSizes.sm,
    textTransform: 'capitalize',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  accountLink: {
    fontSize: FontSizes.sm,
  },
  accountDot: {
    fontSize: FontSizes.sm,
  },
  accountLinkDanger: {
    fontSize: FontSizes.sm,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  appName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  appVersion: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
});
