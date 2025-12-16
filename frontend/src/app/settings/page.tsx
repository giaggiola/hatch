'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, User, Partner, Invite, Preferences, Origin } from '@/lib/api';
import { isAuthenticated, logout, clearAuth } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';
import InviteShareModal from '@/components/InviteShareModal';
import {
  ProfileSection,
  AppearanceSection,
  FiltersSection,
  DeleteAccountModal,
} from '@/components/settings';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Filter state
  const [preferences, setPreferences] = useState<Preferences>({
    origins: [],
    genders: [],
    starting_letters: [],
    starts_with: '',
    max_length: undefined,
  });
  const [availableOrigins, setAvailableOrigins] = useState<Origin[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        const [userData, partnerData, prefsData, originsData] = await Promise.all([
          api.getMe(),
          api.getPartner(),
          api.getPreferences(),
          api.getOrigins(),
        ]);
        setUser(userData);
        setPartner(partnerData);
        setPreferences(prefsData);
        setAvailableOrigins(originsData);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteAccount = async () => {
    try {
      await api.deleteUser();
      clearAuth();
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white max-w-lg mx-auto">
          Settings
        </h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <ProfileSection
          user={user}
          partner={partner}
          invite={invite}
          onUserUpdate={setUser}
          onInviteCreate={setInvite}
          onShowShareModal={() => setShowShareModal(true)}
        />

        <AppearanceSection />

        <FiltersSection
          initialPreferences={preferences}
          availableOrigins={availableOrigins}
        />

        {/* Account Actions - subtle footer */}
        <div className="flex items-center justify-center gap-4 pt-2 pb-4">
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Log out
          </button>
          <span className="text-gray-300">•</span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Invite Share Modal */}
      {showShareModal && invite && (
        <InviteShareModal
          code={invite.code}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
