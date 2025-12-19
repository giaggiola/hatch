'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuthenticated } from '@/lib/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      // Get token from URL (passed by backend after OAuth)
      const token = searchParams.get('token');

      if (!token) {
        // No token in URL - redirect to login
        router.push('/');
        return;
      }

      try {
        // Set the httpOnly cookie on the frontend domain (same-origin)
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          // Cookie set successfully - mark as authenticated and redirect
          setAuthenticated();
          router.push('/swipe');
        } else {
          // Failed to set cookie
          router.push('/');
        }
      } catch {
        // Error setting cookie
        router.push('/');
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner size="md" className="mx-auto mb-4" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="md" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
