'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, InviteDetail } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import GoogleSignIn from '@/components/GoogleSignIn';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [invite, setInvite] = useState<InviteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const data = await api.getInvite(code);
        setInvite(data);

        // If already authenticated, try to accept
        if (isAuthenticated()) {
          await handleAccept();
        } else {
          // Store the invite URL so we can return here after OAuth login
          localStorage.setItem('auth_redirect', `/invite/${code}`);
        }
      } catch (error) {
        setError('Invite not found or expired');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvite();
  }, [code]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await api.acceptInvite(code);
      router.push('/swipe');
    } catch (error: any) {
      setError(error.message || 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
        <p className="text-gray-600 mb-6 text-center">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="bg-primary-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-600 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (invite?.status !== 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Invite Already Used
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          This invite has already been accepted or has expired.
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-primary-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-600 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">💕</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You&apos;re Invited!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {invite?.invited_by_name || 'Someone'} wants to find baby names with
          you on Hatch.
        </p>

        {isAuthenticated() ? (
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full bg-primary-500 text-white font-semibold py-4 rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isAccepting ? 'Joining...' : 'Join & Start Swiping'}
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Sign in to accept the invite
            </p>
            <GoogleSignIn />
          </div>
        )}
      </div>
    </div>
  );
}
