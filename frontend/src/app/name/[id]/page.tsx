'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Share2, Sparkles, Volume2, Users, BookOpen, Globe } from 'lucide-react';
import { api, Name, RegionPopularity, SimilarName, NameFacts } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { formatCountries, originsToCountryCodes } from '@/lib/countries';
import { LikeButton } from '@/components/LikeButton';
import LoadingSpinner from '@/components/LoadingSpinner';

const MAX_SIMILAR_COUNT = 20;

export default function NameDetailPage() {
  const router = useRouter();
  const params = useParams();
  const nameId = params.id as string;

  const [name, setName] = useState<Name | null>(null);
  const [similarNamesFromSelected, setSimilarNamesFromSelected] = useState<SimilarName[]>([]);
  const [similarNamesFromOther, setSimilarNamesFromOther] = useState<SimilarName[]>([]);
  const [regionPopularity, setRegionPopularity] = useState<RegionPopularity[]>([]);
  const [facts, setFacts] = useState<NameFacts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        // Load name details, similar names, facts, and preferences in parallel
        // Use 'same' gender filter to only show similar names of the same gender
        const [nameData, popularityData, similar, factsData, preferences] = await Promise.all([
          api.getNameDetails(nameId),
          api.getPopularityByRegion(nameId),
          api.getSimilarNames(nameId, MAX_SIMILAR_COUNT, 0.84, 'same'),
          api.getNameFacts(nameId),
          api.getPreferences(),
        ]);

        setName(nameData);
        setRegionPopularity(popularityData);
        setFacts(factsData);

        // Convert user's selected origins to country codes
        const userCountryCodes = originsToCountryCodes(preferences.origins || []);
        const userCountrySet = new Set(userCountryCodes);

        // Sort alphabetically after fetching top 20 by similarity
        const sortedSimilar = similar
          .map(s => ({
            id: s.id,
            name: s.name,
            gender: s.gender,
            similarity: s.similarity || 0,
            countries: s.countries,
            popularity_rank: s.popularity_rank,
            weighted_count: s.weighted_count,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        // Split similar names based on user's selected countries
        const fromSelected: SimilarName[] = [];
        const fromOther: SimilarName[] = [];

        for (const name of sortedSimilar) {
          const hasSelectedCountry = name.countries?.some(c => userCountrySet.has(c));
          if (hasSelectedCountry) {
            fromSelected.push(name);
          } else {
            fromOther.push(name);
          }
        }

        setSimilarNamesFromSelected(fromSelected);
        setSimilarNamesFromOther(fromOther);
      } catch (error) {
        console.error('Error loading name details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [nameId, router]);

  const handleSpeak = () => {
    if (name && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(name.name);
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleShare = async () => {
    if (!name) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name.name} on Hatch`,
          text: `Check out this name on Hatch: ${name.name} (${formatCountries(name.countries || [])})`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!name) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-400 mb-4">Name not found</div>
        <button
          onClick={() => router.back()}
          className="text-pink-500 hover:text-pink-600"
        >
          Go back
        </button>
      </div>
    );
  }

  const countryDisplay = formatCountries(name.countries || []) || 'various';

  // Use facts data if available, otherwise fall back to generic text
  const hasFacts = facts && (facts.meaning || facts.origin_language);
  const etymology = hasFacts && facts.meaning
    ? facts.meaning
    : `${name.name} is a name with rich cultural heritage from ${countryDisplay} tradition.`;

  const isMale = name.gender === 'M';
  const gradientClass = isMale
    ? 'from-blue-500 to-blue-600'
    : 'from-pink-500 to-rose-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className={`bg-gradient-to-br ${gradientClass} text-white pb-12`}>
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="text-center">
            <div className="text-6xl font-bold mb-4">{name.name}</div>
            <div className="text-2xl opacity-90 mb-8">
              {name.gender === 'M' ? 'Boy' : name.gender === 'F' ? 'Girl' : 'Unisex'}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <LikeButton
                nameId={name.id}
                gender={name.gender}
                variant="button"
              />
              <button
                onClick={handleSpeak}
                className="px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                className="px-8 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Origin & Meaning */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className={`w-6 h-6 ${isMale ? 'text-blue-500' : 'text-pink-500'}`} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Origin & Meaning</h2>
          </div>
          {facts?.origin_language && (
            <div className="mb-3">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${isMale ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'}`}>
                {facts.origin_language}
              </span>
            </div>
          )}
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{etymology}</p>
        </div>

        {/* Nicknames */}
        {facts?.nicknames && facts.nicknames.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className={`w-6 h-6 ${isMale ? 'text-blue-500' : 'text-pink-500'}`} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nicknames</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {facts.nicknames.map((nickname, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 font-medium"
                >
                  {nickname}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Famous People */}
        {((facts?.historical_figures && facts.historical_figures.length > 0) ||
          (facts?.fictional_characters && facts.fictional_characters.length > 0)) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className={`w-6 h-6 ${isMale ? 'text-blue-500' : 'text-pink-500'}`} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Famous People</h2>
            </div>
            <div className="space-y-4">
              {facts?.historical_figures?.map((figure, index) => (
                <div key={`hist-${index}`} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4">
                  <div className="font-semibold text-gray-900 dark:text-white">{figure.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{figure.description}</div>
                </div>
              ))}
              {facts?.fictional_characters?.map((character, index) => (
                <div key={`fict-${index}`} className="border-l-4 border-purple-300 dark:border-purple-500 pl-4">
                  <div className="font-semibold text-gray-900 dark:text-white">{character.name}</div>
                  <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">{character.source}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{character.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cultural References */}
        {facts?.cultural_references && (facts.cultural_references.religious || facts.cultural_references.mythological || facts.cultural_references.literary) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className={`w-6 h-6 ${isMale ? 'text-blue-500' : 'text-pink-500'}`} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cultural Significance</h2>
            </div>
            <div className="space-y-4">
              {facts.cultural_references.religious && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Religious</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{facts.cultural_references.religious}</p>
                </div>
              )}
              {facts.cultural_references.mythological && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Mythological</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{facts.cultural_references.mythological}</p>
                </div>
              )}
              {facts.cultural_references.literary && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Literary</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{facts.cultural_references.literary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Popularity by Region */}
        {regionPopularity.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Popularity by Region</h2>
            <div className="space-y-2">
              {regionPopularity.map((region) => {
                // Convert percentile to dots (0-5 scale)
                const getDots = (percentile: number | null): number => {
                  if (percentile === null) return 0;
                  if (percentile <= 1) return 5;
                  if (percentile <= 5) return 4;
                  if (percentile <= 10) return 3;
                  if (percentile <= 25) return 2;
                  if (percentile <= 50) return 1;
                  return 0;
                };
                const dots = getDots(region.percentile);
                const filledColor = isMale ? 'bg-blue-500' : 'bg-pink-500';

                return (
                  <div
                    key={region.country_code}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{region.country_name}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${i <= dots ? filledColor : 'bg-gray-200 dark:bg-gray-600'}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Similar Names from Selected Countries */}
        {similarNamesFromSelected.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Similar Names
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {similarNamesFromSelected.map((variant) => (
                <div
                  key={variant.id}
                  onClick={() => router.push(`/name/${variant.id}`)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="text-gray-900 dark:text-white font-medium">{variant.name}</span>
                  <LikeButton
                    nameId={variant.id}
                    gender={variant.gender}
                    variant="mini"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Names from Other Countries */}
        {similarNamesFromOther.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              From Other Countries
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {similarNamesFromOther.map((variant) => (
                <div
                  key={variant.id}
                  onClick={() => router.push(`/name/${variant.id}`)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="text-gray-900 dark:text-white font-medium">{variant.name}</span>
                  <LikeButton
                    nameId={variant.id}
                    gender={variant.gender}
                    variant="mini"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-12"></div>
    </div>
  );
}
