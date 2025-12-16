'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { api, User, Partner, Invite } from '@/lib/api';

interface ProfileSectionProps {
  user: User | null;
  partner: Partner | null;
  invite: Invite | null;
  onUserUpdate: (user: User) => void;
  onInviteCreate: (invite: Invite) => void;
  onShowShareModal: () => void;
}

export default function ProfileSection({
  user,
  partner,
  invite,
  onUserUpdate,
  onInviteCreate,
  onShowShareModal,
}: ProfileSectionProps) {
  const [familyName, setFamilyName] = useState(user?.family_name || '');
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [tempFamilyName, setTempFamilyName] = useState('');
  const [isSavingFamily, setIsSavingFamily] = useState(false);

  const startEditingFamilyName = () => {
    setTempFamilyName(familyName);
    setEditingFamilyName(true);
  };

  const cancelEditingFamilyName = () => {
    setEditingFamilyName(false);
    setTempFamilyName('');
  };

  const handleFamilyNameSave = async () => {
    if (!user) return;
    setIsSavingFamily(true);
    try {
      const updated = await api.updateUser({ family_name: tempFamilyName });
      onUserUpdate(updated);
      setFamilyName(tempFamilyName);
      setEditingFamilyName(false);
    } catch (error) {
      console.error('Error updating family name:', error);
    } finally {
      setIsSavingFamily(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const newInvite = await api.createInvite();
      onInviteCreate(newInvite);
    } catch (error) {
      console.error('Error creating invite:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="w-14 h-14 rounded-full"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-xl">
            👤
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {user?.display_name || 'User'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Family Name - inline row */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Family name</span>
        {editingFamilyName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempFamilyName}
              onChange={(e) => setTempFamilyName(e.target.value)}
              placeholder="e.g., Smith"
              className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <button
              onClick={handleFamilyNameSave}
              disabled={isSavingFamily}
              className="p-1 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEditingFamilyName}
              className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={startEditingFamilyName} className="flex items-center gap-1.5 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300">
            <span>{familyName || <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}</span>
            <Pencil className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Partner - inline row */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Partner</span>
        {partner ? (
          <div className="flex items-center gap-2">
            {partner.avatar_url ? (
              <img src={partner.avatar_url} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">👤</div>
            )}
            <span className="text-gray-900 dark:text-white">{partner.display_name || 'Partner'}</span>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          </div>
        ) : invite ? (
          <button
            onClick={onShowShareModal}
            className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1.5"
          >
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{invite.code}</span>
            Share
          </button>
        ) : (
          <button onClick={handleCreateInvite} className="text-sm text-primary-500 hover:text-primary-600">
            Invite partner
          </button>
        )}
      </div>
    </div>
  );
}
