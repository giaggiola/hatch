'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthenticated, checkAuth } from '@/lib/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // The httpOnly cookie was set by the backend redirect.
    // Verify auth works and set session flag for client-side checks.
    async function verifyAndRedirect() {
      const isAuthed = await checkAuth();
      if (isAuthed) {
        setAuthenticated();
        router.push('/swipe');
      } else {
        // Cookie wasn't set or is invalid
        router.push('/');
      }
    }
    verifyAndRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner size="md" className="mx-auto mb-4" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
