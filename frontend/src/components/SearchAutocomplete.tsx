'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { api, Name, Origin } from '@/lib/api';
import { getCountryName, formatCountries, getOriginFlag } from '@/lib/countries';
import { LikeButton } from './LikeButton';

interface SearchAutocompleteProps {
  origins: Origin[];
  placeholder?: string;
  onCreateName?: (name: string) => void;
}

// Memoized search result item to prevent unnecessary re-renders
const SearchResultItem = memo(function SearchResultItem({
  name,
  isSelected,
  onClick,
  getGenderColor,
  getGenderLabel,
}: {
  name: Name;
  isSelected: boolean;
  onClick: () => void;
  getGenderColor: (gender?: string) => string;
  getGenderLabel: (gender?: string) => string;
}) {
  return (
    <div
      className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
        isSelected ? 'bg-pink-50 dark:bg-pink-900/30' : ''
      }`}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <span className="text-lg font-medium text-gray-900 dark:text-white">{name.name}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGenderColor(name.gender)}`}>
          {getGenderLabel(name.gender)}
        </span>
        <span className="text-sm text-gray-400 ml-auto truncate">{formatCountries(name.countries || [])}</span>
      </button>
      <LikeButton
        nameId={name.id}
        gender={name.gender as 'M' | 'F' | 'U'}
        variant="mini"
      />
    </div>
  );
});

export default function SearchAutocomplete({ origins, placeholder = 'Search names or countries...', onCreateName }: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [names, setNames] = useState<Name[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filter countries client-side
  const filteredOrigins = query.length > 0
    ? origins.filter(o =>
        o.name.toLowerCase().includes(query.toLowerCase()) ||
        getCountryName(o.name).toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  // Debounced search for names with request cancellation
  useEffect(() => {
    if (query.length < 2) {
      setNames([]);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await api.searchNames(query, 8);
        // Only update state if this request wasn't cancelled
        if (!controller.signal.aborted) {
          setNames(results);
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Search error:', error);
        if (!controller.signal.aborted) {
          setNames([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if query exactly matches an existing name (case-insensitive)
  const hasExactMatch = names.some(n => n.name.toLowerCase() === query.toLowerCase());

  // Show "Create" option when there's a valid query and no exact match
  const showCreateOption = onCreateName && query.length >= 2 && !isLoading && !hasExactMatch;

  const totalItems = names.length + filteredOrigins.length + (showCreateOption ? 1 : 0);

  const handleCreateClick = useCallback(() => {
    if (onCreateName && query.trim()) {
      // Capitalize first letter
      const formattedName = query.trim().charAt(0).toUpperCase() + query.trim().slice(1).toLowerCase();
      setIsOpen(false);
      setQuery('');
      onCreateName(formattedName);
    }
  }, [onCreateName, query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < names.length) {
            handleNameClick(names[selectedIndex]);
          } else if (selectedIndex < names.length + filteredOrigins.length) {
            handleOriginClick(filteredOrigins[selectedIndex - names.length]);
          } else if (showCreateOption) {
            handleCreateClick();
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, selectedIndex, names, filteredOrigins, totalItems, showCreateOption, handleCreateClick]);

  const handleNameClick = (name: Name) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/name/${name.id}`);
  };

  const handleOriginClick = (origin: Origin) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/explore/${origin.name}`);
  };

  const getGenderColor = (gender?: string) => {
    switch (gender) {
      case 'M': return 'bg-blue-100 text-blue-600';
      case 'F': return 'bg-pink-100 text-pink-600';
      default: return 'bg-purple-100 text-purple-600';
    }
  };

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case 'M': return 'Boy';
      case 'F': return 'Girl';
      default: return 'Unisex';
    }
  };

  const showDropdown = isOpen && query.length > 0 && (names.length > 0 || filteredOrigins.length > 0 || isLoading || showCreateOption);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-12 pl-11 pr-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {/* Names Section */}
          {names.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700">
                Names
              </div>
              {names.map((name, index) => (
                <SearchResultItem
                  key={name.id}
                  name={name}
                  isSelected={selectedIndex === index}
                  onClick={() => handleNameClick(name)}
                  getGenderColor={getGenderColor}
                  getGenderLabel={getGenderLabel}
                />
              ))}
            </div>
          )}

          {/* Countries Section */}
          {filteredOrigins.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700">
                Countries
              </div>
              {filteredOrigins.map((origin, index) => (
                <button
                  key={origin.name}
                  onClick={() => handleOriginClick(origin)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedIndex === names.length + index ? 'bg-pink-50 dark:bg-pink-900/30' : ''
                  }`}
                >
                  <span className="text-lg">{getOriginFlag(origin.name)}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{getCountryName(origin.name)}</span>
                  <span className="text-sm text-gray-400 ml-auto">{origin.count.toLocaleString()} names</span>
                </button>
              ))}
            </div>
          )}

          {/* Create option */}
          {showCreateOption && (
            <div>
              {(names.length > 0 || filteredOrigins.length > 0) && (
                <div className="h-px bg-gray-100 dark:bg-gray-700" />
              )}
              <button
                onClick={handleCreateClick}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors ${
                  selectedIndex === names.length + filteredOrigins.length ? 'bg-pink-50 dark:bg-pink-900/30' : ''
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Create "<span className="text-pink-600 dark:text-pink-400">{query.trim().charAt(0).toUpperCase() + query.trim().slice(1).toLowerCase()}</span>"
                </span>
              </button>
            </div>
          )}

          {/* No results and no create option */}
          {!isLoading && names.length === 0 && filteredOrigins.length === 0 && query.length >= 2 && !showCreateOption && (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
