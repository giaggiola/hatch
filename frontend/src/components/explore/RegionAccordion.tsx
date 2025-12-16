'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Origin } from '@/lib/api';
import { REGIONS, Region } from '@/lib/regions';
import { getCountryName, getOriginFlag } from '@/lib/countries';

interface RegionAccordionProps {
  origins: Origin[];
}

export default function RegionAccordion({ origins }: RegionAccordionProps) {
  const router = useRouter();
  const [expandedRegion, setExpandedRegion] = useState<string | null>('europe');

  // Create a map of origin name -> origin data
  const originMap = new Map(origins.map(o => [o.name.toLowerCase(), o]));

  // Get origins for a region that actually exist in our data
  const getRegionOrigins = (region: Region): Origin[] => {
    return region.origins
      .map(o => originMap.get(o))
      .filter((o): o is Origin => o !== undefined)
      .sort((a, b) => b.count - a.count);
  };

  // Calculate total names per region
  const getRegionCount = (region: Region): number => {
    return getRegionOrigins(region).reduce((sum, o) => sum + o.count, 0);
  };

  return (
    <div className="py-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 px-4">Explore by Region</h2>
      <div className="px-4 space-y-2">
        {REGIONS.map((region) => {
          const regionOrigins = getRegionOrigins(region);
          const isExpanded = expandedRegion === region.id;
          const totalNames = getRegionCount(region);

          if (regionOrigins.length === 0) return null;

          return (
            <div key={region.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedRegion(isExpanded ? null : region.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{region.emoji}</span>
                  <div className="text-left">
                    <span className="font-medium text-gray-900 dark:text-white">{region.name}</span>
                    <span className="block text-xs text-gray-400">
                      {regionOrigins.length} countries · {totalNames.toLocaleString()} names
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {regionOrigins.map((origin) => (
                      <button
                        key={origin.name}
                        onClick={() => router.push(`/explore/${origin.name}`)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                      >
                        <span className="text-lg">{getOriginFlag(origin.name)}</span>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                            {getCountryName(origin.name)}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {origin.count.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
