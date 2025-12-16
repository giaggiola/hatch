'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { api, Preferences, Origin } from '@/lib/api';
import { GENDERS } from '@/lib/constants';

interface FiltersSectionProps {
  initialPreferences: Preferences;
  availableOrigins: Origin[];
  onPreferencesChange?: (preferences: Preferences) => void;
}

export default function FiltersSection({
  initialPreferences,
  availableOrigins,
  onPreferencesChange,
}: FiltersSectionProps) {
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [startsWithInput, setStartsWithInput] = useState(
    initialPreferences.starting_letters?.[0] || ''
  );
  const [isSavingFilters, setIsSavingFilters] = useState(false);
  const [filtersSaved, setFiltersSaved] = useState(false);
  const [originSearch, setOriginSearch] = useState('');

  const updatePreferences = (newPrefs: Preferences) => {
    setPreferences(newPrefs);
    onPreferencesChange?.(newPrefs);
  };

  const toggleOrigin = (origin: string) => {
    updatePreferences({
      ...preferences,
      origins: preferences.origins.includes(origin)
        ? preferences.origins.filter((o) => o !== origin)
        : [...preferences.origins, origin],
    });
  };

  const toggleGender = (gender: string) => {
    updatePreferences({
      ...preferences,
      genders: preferences.genders.includes(gender)
        ? preferences.genders.filter((g) => g !== gender)
        : [...preferences.genders, gender],
    });
  };

  const handleStartsWithChange = (value: string) => {
    setStartsWithInput(value);
    updatePreferences({
      ...preferences,
      starting_letters: value.trim() ? [value.trim()] : [],
    });
  };

  const handleSaveFilters = async () => {
    setIsSavingFilters(true);
    setFiltersSaved(false);
    try {
      await api.updatePreferences(preferences);
      setFiltersSaved(true);
      setTimeout(() => setFiltersSaved(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSavingFilters(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>

      {/* Gender - segmented control */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Gender</span>
          {preferences.genders.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">All</span>
          )}
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {GENDERS.map((gender) => (
            <button
              key={gender.value}
              onClick={() => toggleGender(gender.value)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                preferences.genders.includes(gender.value)
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {gender.label}
            </button>
          ))}
        </div>
      </div>

      {/* Length & Starts with - compact row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1.5">Max length</span>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-2 gap-2">
            <input
              type="range"
              min="3"
              max="15"
              value={preferences.max_length || 15}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updatePreferences({
                  ...preferences,
                  max_length: val >= 15 ? undefined : val,
                });
              }}
              className="flex-1 h-1 min-w-0"
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-4 text-center shrink-0">
              {preferences.max_length && preferences.max_length < 15 ? preferences.max_length : '∞'}
            </span>
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1.5">Starts with</span>
          <div className="relative">
            <input
              type="text"
              value={startsWithInput}
              onChange={(e) => handleStartsWithChange(e.target.value)}
              placeholder="Al, Ma..."
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              maxLength={10}
            />
            {startsWithInput && (
              <button
                onClick={() => handleStartsWithChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Origins */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Origins</span>
          {preferences.origins.length > 0 ? (
            <button
              onClick={() => updatePreferences({ ...preferences, origins: [] })}
              className="text-xs text-primary-500 hover:underline"
            >
              Clear ({preferences.origins.length})
            </button>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">All</span>
          )}
        </div>
        <div className="relative mb-2">
          <input
            type="text"
            value={originSearch}
            onChange={(e) => setOriginSearch(e.target.value)}
            placeholder="Search origins..."
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {originSearch && (
            <button
              onClick={() => setOriginSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg">
          {availableOrigins
            .filter((origin) =>
              origin.name.toLowerCase().includes(originSearch.toLowerCase())
            )
            .map((origin) => (
              <label
                key={origin.name}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
              >
                <span className="capitalize text-sm text-gray-700 dark:text-gray-300">{origin.name}</span>
                <input
                  type="checkbox"
                  checked={preferences.origins.includes(origin.name)}
                  onChange={() => toggleOrigin(origin.name)}
                  className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                />
              </label>
            ))}
        </div>
      </div>

      {/* Save filters button */}
      <button
        onClick={handleSaveFilters}
        disabled={isSavingFilters}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          filtersSaved
            ? 'bg-green-500 text-white'
            : 'bg-primary-500 text-white hover:bg-primary-600'
        } disabled:opacity-50`}
      >
        {isSavingFilters ? 'Saving...' : filtersSaved ? 'Filters Saved!' : 'Save Filters'}
      </button>
    </div>
  );
}
