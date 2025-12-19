'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Origin } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import PopularNames from '@/components/explore/PopularNames';
import RegionAccordion from '@/components/explore/RegionAccordion';
import CreateNameModal from '@/components/CreateNameModal';

export default function ExplorePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createNameValue, setCreateNameValue] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        const originsData = await api.getOrigins();
        setOrigins(originsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleCreateName = (name: string) => {
    setCreateNameValue(name);
    setShowCreateModal(true);
  };

  const handleSubmitCustomName = async (data: { name: string; gender: 'M' | 'F' | 'U' }) => {
    try {
      const result = await api.createCustomName(data);
      setShowCreateModal(false);
      // Navigate to the new custom name or show success
      if (result?.id) {
        router.push(`/name/${result.id}`);
      }
    } catch (error) {
      console.error('Error creating custom name:', error);
      // TODO: Show error toast
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell className="bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-6 pt-8 pb-6">
        <h1 className="text-2xl font-medium mb-1">Explore</h1>
        <p className="text-white/80 text-sm">Discover names from around the world</p>
      </div>

      {/* Search */}
      <div className="px-4 -mt-4 relative z-10">
        <SearchAutocomplete origins={origins} onCreateName={handleCreateName} />
      </div>

      {/* Most Popular Names */}
      <div className="mt-6">
        <PopularNames title="Most Popular Names" limit={10} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />

      {/* Regions */}
      <RegionAccordion origins={origins} />

      {/* Create Name Modal */}
      <CreateNameModal
        isOpen={showCreateModal}
        initialName={createNameValue}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmitCustomName}
      />
    </AppShell>
  );
}
