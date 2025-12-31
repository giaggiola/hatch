import * as SecureStore from 'expo-secure-store';
import {
  User,
  Partner,
  Invite,
  InviteDetail,
  Name,
  NameWithSimilar,
  Country,
  Origin,
  Swipe,
  SwipeResult,
  BatchSwipeResult,
  Match,
  CloseCall,
  Preferences,
  RegionPopularity,
  NameFacts,
  CustomName,
} from '../types';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}/api`;

const TOKEN_KEY = 'auth_token';

// Timeout and retry configuration
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Helper to create a timeout promise
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), ms)
  );
}

// Helper to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    const token = await this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    let lastError: Error = new Error('Request failed');

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await Promise.race([
          fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
          }),
          timeout(timeoutMs),
        ]);

        if (response.status === 401) {
          await this.clearToken();
          throw new Error('Unauthorized');
        }

        // Don't retry 4xx client errors (except 408 Request Timeout, 429 Too Many Requests)
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.detail || 'Request failed');
        }

        // Retry on 5xx server errors or 408/429
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          lastError = new Error(error.detail || `Server error: ${response.status}`);
          if (attempt < MAX_RETRIES) {
            await delay(RETRY_DELAY_MS * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }
          throw lastError;
        }

        return response.json();
      } catch (error: any) {
        lastError = error;

        // Don't retry auth errors or client errors
        if (error.message === 'Unauthorized' || error.message?.includes('Request failed')) {
          throw error;
        }

        // Retry on timeout or network errors
        if (attempt < MAX_RETRIES) {
          if (__DEV__) {
            console.log(`API retry ${attempt + 1}/${MAX_RETRIES} for ${endpoint}: ${error.message}`);
          }
          await delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError;
  }

  // Auth
  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    await this.clearToken();
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  // This will be called after OAuth to exchange code for token
  async exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
    const response = await fetch(`${this.baseUrl}/auth/google/callback?code=${code}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  // Users
  async updateUser(data: { display_name?: string; family_name?: string }) {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser() {
    return this.request('/users/me', { method: 'DELETE' });
  }

  async getPartner() {
    return this.request<Partner | null>('/users/partner');
  }

  // Invites
  async createInvite(invited_email?: string) {
    return this.request<Invite>('/invites', {
      method: 'POST',
      body: JSON.stringify({ invited_email }),
    });
  }

  async getInvite(code: string) {
    return this.request<InviteDetail>(`/invites/${code}`);
  }

  async acceptInvite(code: string) {
    return this.request(`/invites/${code}/accept`, { method: 'POST' });
  }

  // Names
  async getNames(limit = 20) {
    return this.request<Name[]>(`/names?limit=${limit}`);
  }

  async getNameDetails(nameId: string) {
    return this.request<Name>(`/names/${nameId}`);
  }

  async getCountries() {
    return this.request<Country[]>('/names/countries');
  }

  async getOrigins() {
    return this.request<Origin[]>('/names/origins');
  }

  async searchNames(query: string, limit = 20) {
    return this.request<Name[]>(`/names/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getNamesByOrigin(origin: string, limit = 50, offset = 0) {
    return this.request<Name[]>(`/names/by-origin/${encodeURIComponent(origin)}?limit=${limit}&offset=${offset}`);
  }

  async getPopularNames(gender?: 'M' | 'F' | 'U', limit = 10) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (gender) params.append('gender', gender);
    return this.request<Name[]>(`/names/popular?${params}`);
  }

  async getNameById(nameId: string) {
    return this.request<Name>(`/names/${nameId}`);
  }

  async getSimilarNames(nameId: string, limit = 10, minSimilarity = 0.89, gender?: string) {
    const params = new URLSearchParams({
      limit: String(limit),
      min_similarity: String(minSimilarity),
    });
    if (gender) params.append('gender', gender);
    return this.request<(Name & { similarity?: number })[]>(
      `/names/${nameId}/similar?${params}`
    );
  }

  async getNamesForSwiping(limit = 10) {
    return this.request<NameWithSimilar[]>(`/names/swipe?limit=${limit}`);
  }

  async getNameDetailWithSimilar(nameId: string, limit = 10, minSimilarity = 0.89) {
    return this.request<NameWithSimilar>(
      `/names/${nameId}/detail?limit=${limit}&min_similarity=${minSimilarity}`
    );
  }

  async getPopularityByRegion(nameId: string) {
    return this.request<RegionPopularity[]>(`/names/${nameId}/popularity-by-region`);
  }

  async getNameFacts(nameId: string) {
    return this.request<NameFacts>(`/names/${nameId}/facts`);
  }

  // Custom Names
  async createCustomName(data: { name: string; gender: 'M' | 'F' | 'U' }) {
    return this.request<CustomName>('/custom-names', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomNames() {
    return this.request<CustomName[]>('/custom-names');
  }

  async deleteCustomName(id: string) {
    return this.request(`/custom-names/${id}`, { method: 'DELETE' });
  }

  // Swipes
  async checkSwipeStatus(nameId: string) {
    return this.request<{ action: 'like' | 'dismiss' | null }>(`/swipes/check/${nameId}`);
  }

  async createSwipe(name_id: string, action: 'like' | 'dismiss') {
    return this.request<SwipeResult>('/swipes', {
      method: 'POST',
      body: JSON.stringify({ name_id, action }),
    });
  }

  async createBatchSwipes(swipes: Array<{ name_id: string; action: 'like' | 'dismiss' }>) {
    return this.request<BatchSwipeResult>('/swipes/batch', {
      method: 'POST',
      body: JSON.stringify({ swipes }),
    });
  }

  async getSwipes(action?: 'like' | 'dismiss', limit = 50, offset = 0, search?: string) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (action) params.append('action', action);
    if (search) params.append('search', search);
    return this.request<Swipe[]>(`/swipes?${params}`);
  }

  async getSwipeCounts() {
    return this.request<{ likes: number; dismisses: number; matches: number }>('/swipes/counts');
  }

  async updateSwipe(name_id: string, action: 'like' | 'dismiss') {
    return this.request<SwipeResult>(`/swipes/${name_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  }

  async deleteSwipe(name_id: string) {
    return this.request(`/swipes/${name_id}`, { method: 'DELETE' });
  }

  // Matches
  async getMatches(limit = 50, offset = 0, search?: string) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) params.append('search', search);
    return this.request<Match[]>(`/matches?${params}`);
  }

  async getCloseCalls(limit = 20, minSimilarity = 0.75) {
    return this.request<CloseCall[]>(
      `/matches/close-calls?limit=${limit}&min_similarity=${minSimilarity}`
    );
  }

  // Preferences
  async getPreferences() {
    return this.request<Preferences>('/preferences');
  }

  async updatePreferences(data: Partial<Preferences>) {
    return this.request<Preferences>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_URL);
