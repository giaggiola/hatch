'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Origin } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import PopularNames from '@/components/explore/PopularNames';
import RegionAccordion from '@/components/explore/RegionAccordion';

export default function ExplorePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [origins, setOrigins] = useState<Origin[]>([]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-6 pt-8 pb-6">
        <h1 className="text-2xl font-medium mb-1">Explore</h1>
        <p className="text-white/80 text-sm">Discover names from around the world</p>
      </div>

      {/* Search */}
      <div className="px-4 -mt-4 relative z-10">
        <SearchAutocomplete origins={origins} />
      </div>

      {/* Most Popular Names */}
      <div className="mt-6">
        <PopularNames title="Most Popular Names" limit={10} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />

      {/* Regions */}
      <RegionAccordion origins={origins} />

      <BottomNav />
    </div>
  );
}
