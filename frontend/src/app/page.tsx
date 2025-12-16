'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GoogleSignIn from '@/components/GoogleSignIn';
import { isAuthenticated, checkAuth, setAuthenticated } from '@/lib/auth';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Quick check using session storage flag
    if (isAuthenticated()) {
      router.push('/swipe');
      return;
    }

    // Verify with backend (cookie might be valid even if flag is missing)
    checkAuth().then((authenticated) => {
      if (authenticated) {
        setAuthenticated();
        router.push('/swipe');
      } else {
        setIsLoading(false);
      }
    });
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">👶💕</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hatch
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Swipe on baby names with your partner. When you both like the same
          name, it&apos;s a match!
        </p>

        <div className="space-y-4">
          <GoogleSignIn />
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p className="mb-2">How it works:</p>
          <ol className="text-left space-y-2">
            <li className="flex items-start">
              <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2 mt-0.5">
                1
              </span>
              <span>Sign in with Google</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2 mt-0.5">
                2
              </span>
              <span>Invite your partner</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2 mt-0.5">
                3
              </span>
              <span>Swipe on names you love</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2 mt-0.5">
                4
              </span>
              <span>See your matches!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
