'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Swipe, Match, CloseCall } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';

type Tab = 'likes' | 'dismisses' | 'matches';

// Gender color helper - matches mobile implementation
const getGenderColor = (gender?: 'M' | 'F' | 'U') => {
  if (gender === 'M') return 'bg-blue-500';
  if (gender === 'F') return 'bg-pink-500';
  return 'bg-purple-500';
};

export default function HistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('matches');
  const [likes, setLikes] = useState<Swipe[]>([]);
  const [dismisses, setDismisses] = useState<Swipe[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [closeCalls, setCloseCalls] = useState<CloseCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        const [likesData, dismissData, matchesData, closeCallsData] = await Promise.all([
          api.getSwipes('like'),
          api.getSwipes('dismiss'),
          api.getMatches(),
          api.getCloseCalls(20, 0.75),
        ]);
        setLikes(likesData);
        setDismisses(dismissData);
        setMatches(matchesData);
        setCloseCalls(closeCallsData);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleChangeSwipe = async (
    nameId: string,
    newAction: 'like' | 'dismiss'
  ) => {
    setUpdatingId(nameId);
    try {
      await api.updateSwipe(nameId, newAction);
      // Reload data
      const [likesData, dismissData, matchesData] = await Promise.all([
        api.getSwipes('like'),
        api.getSwipes('dismiss'),
        api.getMatches(),
      ]);
      setLikes(likesData);
      setDismisses(dismissData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Error updating swipe:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Sort matches alphabetically
  const sortedMatches = [...matches].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Sort liked names alphabetically (each swipe = one name)
  const sortedLikedNames = likes
    .filter(swipe => swipe.name)
    .map(swipe => swipe.name!)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Sort dismissed names alphabetically (each swipe = one name)
  const sortedDismissedNames = dismisses
    .filter(swipe => swipe.name)
    .map(swipe => swipe.name!)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-6 pt-8 pb-6">
        <h1 className="text-2xl font-medium mb-1">History</h1>
        <p className="text-white/80 text-sm">Your swipe activity and matches</p>
      </div>

      {/* Clickable Stats Section */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('matches')}
              className={`text-center p-2 rounded-xl transition-all ${
                activeTab === 'matches'
                  ? 'bg-pink-50 dark:bg-pink-900/30 ring-2 ring-pink-300 dark:ring-pink-600'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-3xl font-bold text-pink-500">{sortedMatches.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Matches</div>
            </button>
            <button
              onClick={() => setActiveTab('likes')}
              className={`text-center p-2 rounded-xl transition-all border-x border-gray-100 dark:border-gray-700 ${
                activeTab === 'likes'
                  ? 'bg-rose-50 dark:bg-rose-900/30 ring-2 ring-rose-300 dark:ring-rose-600'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-3xl font-bold text-rose-400">{sortedLikedNames.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Liked</div>
            </button>
            <button
              onClick={() => setActiveTab('dismisses')}
              className={`text-center p-2 rounded-xl transition-all ${
                activeTab === 'dismisses'
                  ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-300 dark:ring-gray-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-3xl font-bold text-gray-400">{sortedDismissedNames.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Passed</div>
            </button>
          </div>
        </div>
      </div>

      {/* Close Calls Section - Show when on matches or likes tab */}
      {(activeTab === 'matches' || activeTab === 'likes') && closeCalls.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-xl">🎯</span> Close Calls
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            You and your partner liked similar names - consider these!
          </p>
          <div className="space-y-2">
            {closeCalls.map((cc, index) => (
              <div
                key={`${cc.your_name.id}-${cc.partner_name.id}-${index}`}
                className="flex items-center justify-between bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-amber-200/50 dark:border-amber-700/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/name/${cc.partner_name.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                    >
                      {cc.partner_name.name}
                    </Link>
                    <span className="text-xs text-gray-400">←</span>
                    <Link
                      href={`/name/${cc.your_name.id}`}
                      className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {cc.your_name.name}
                    </Link>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Partner liked • {Math.round(cc.similarity * 100)}% similar to yours
                  </div>
                </div>
                <button
                  onClick={() => handleChangeSwipe(cc.partner_name.id, 'like')}
                  disabled={updatingId === cc.partner_name.id}
                  className="ml-2 p-2 text-amber-500 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-full transition-colors disabled:opacity-50"
                  title="Like this name too"
                >
                  {updatingId === cc.partner_name.id ? (
                    <span className="block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {activeTab === 'matches' && 'Your Matches'}
          {activeTab === 'likes' && 'Names You Liked'}
          {activeTab === 'dismisses' && 'Names You Passed'}
        </h2>

        {activeTab === 'matches' && (
          <div className="space-y-2">
            {sortedMatches.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-300">No matches yet</p>
                <p className="text-sm mt-1">Keep swiping to find names you both love!</p>
              </div>
            ) : (
              sortedMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/name/${match.id}`}
                  className="flex items-center justify-between bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm hover:bg-white dark:hover:bg-gray-700 transition-all hover:shadow-md border-2 border-pink-200 dark:border-pink-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{match.name}</span>
                      <span className={`w-2 h-2 rounded-full ${getGenderColor(match.gender)}`} />
                    </div>
                    {match.meaning && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{match.meaning}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Matched {new Date(match.matched_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="space-y-2">
            {sortedLikedNames.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-300">No likes yet</p>
                <p className="text-sm mt-1">Start swiping to save names you love!</p>
              </div>
            ) : (
              sortedLikedNames.map((name) => (
                <div
                  key={name.id}
                  className="flex items-center justify-between bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm"
                >
                  <Link
                    href={`/name/${name.id}`}
                    className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{name.name}</span>
                      <span className={`w-2 h-2 rounded-full ${getGenderColor(name.gender)}`} />
                    </div>
                    {name.meaning && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{name.meaning}</p>
                    )}
                  </Link>
                  <button
                    onClick={() => handleChangeSwipe(name.id, 'dismiss')}
                    disabled={updatingId === name.id}
                    className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors disabled:opacity-50"
                    title="Move to passed"
                  >
                    {updatingId === name.id ? (
                      <span className="block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'dismisses' && (
          <div className="space-y-2">
            {sortedDismissedNames.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-300">No passed names yet</p>
                <p className="text-sm mt-1">Names you pass on will appear here</p>
              </div>
            ) : (
              sortedDismissedNames.map((name) => (
                <div
                  key={name.id}
                  className="flex items-center justify-between bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm"
                >
                  <Link
                    href={`/name/${name.id}`}
                    className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{name.name}</span>
                      <span className={`w-2 h-2 rounded-full ${getGenderColor(name.gender)}`} />
                    </div>
                    {name.meaning && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{name.meaning}</p>
                    )}
                  </Link>
                  <button
                    onClick={() => handleChangeSwipe(name.id, 'like')}
                    disabled={updatingId === name.id}
                    className="ml-2 p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-full transition-colors disabled:opacity-50"
                    title="Move to likes"
                  >
                    {updatingId === name.id ? (
                      <span className="block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
