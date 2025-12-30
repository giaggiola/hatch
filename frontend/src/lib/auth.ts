import { api } from './api';

/**
 * Check if user is authenticated by making a quick API call.
 * Uses httpOnly cookie - we can't check it directly from JS.
 * Returns false if the API call fails (user not logged in).
 */
export async function checkAuth(): Promise<boolean> {
  try {
    await api.getMe(true);  // Skip redirect on 401 - this is just a check
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous auth check for immediate redirects.
 * This is a best-effort check - the real auth is handled by the backend.
 * We use localStorage (persists across browser restarts) with backend sync.
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('authenticated') === 'true';
}

/**
 * Mark user as authenticated (called after successful login)
 */
export function setAuthenticated(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authenticated', 'true');
  }
}

/**
 * Clear auth state (called on logout or 401)
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authenticated');
  }
}

/**
 * Initialize auth state on app load.
 * Syncs the localStorage flag with the actual backend auth state.
 * This ensures the flag is accurate after browser restarts.
 */
export async function initAuth(): Promise<boolean> {
  const isAuthed = await checkAuth();
  if (isAuthed) {
    setAuthenticated();
  } else {
    clearAuth();
  }
  return isAuthed;
}

/**
 * Logout user - clears cookie via API and local state
 */
export async function logout(): Promise<void> {
  clearAuth();
  await api.logout();
}
