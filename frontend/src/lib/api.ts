const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private proxyUrl: string;
  private backendUrl: string;

  constructor(backendUrl: string) {
    // Use same-origin proxy for API calls (avoids cross-site cookie issues on mobile)
    this.proxyUrl = '/api/proxy';
    // Direct backend URL only for OAuth redirect (which needs to go through backend)
    this.backendUrl = `${backendUrl}/api`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipRedirectOn401 = false
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${this.proxyUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Send same-origin httpOnly cookie
    });

    if (response.status === 401) {
      // Clear session flag
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('authenticated');
        // Only redirect if not explicitly skipped (e.g., auth checks)
        if (!skipRedirectOn401 && window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Logout - clears same-origin cookie and calls backend
  async logout() {
    // Clear the same-origin cookie
    await fetch('/api/auth/session', { method: 'DELETE' });
    // Notify backend (optional, for any server-side cleanup)
    await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  }

  // Auth - OAuth URL goes directly to backend for the redirect flow
  getGoogleAuthUrl() {
    return `${this.backendUrl}/auth/google`;
  }

  async getMe(skipRedirectOn401 = false) {
    return this.request<User>('/auth/me', {}, skipRedirectOn401);
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

  // New similarity-based endpoints (replaces group-based approach)
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

  async getSwipes(action?: 'like' | 'dismiss', limit = 50, offset = 0) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (action) params.append('action', action);
    return this.request<Swipe[]>(`/swipes?${params}`);
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
  async getMatches(limit = 50, offset = 0) {
    return this.request<Match[]>(`/matches?limit=${limit}&offset=${offset}`);
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

export const api = new ApiClient(BACKEND_URL);

// Types
export interface User {
  id: string;
  email: string;
  display_name?: string;
  family_name?: string;
  avatar_url?: string;
  couple_id?: string;
}

export interface Partner {
  id: string;
  display_name?: string;
  avatar_url?: string;
}

export interface Invite {
  id: string;
  code: string;
  status: string;
  invited_email?: string;
  expires_at?: string;
}

export interface InviteDetail {
  code: string;
  status: string;
  invited_by_name?: string;
}

export interface Name {
  id: string;
  name: string;
  gender?: 'M' | 'F' | 'U';
  meaning?: string;
  length?: number;
  is_primary?: boolean;
  // Aggregated from popularity data
  countries: string[];  // ISO country codes where this name is popular
  popularity_rank?: number;  // Best rank across selected countries
  weighted_count?: number;  // Sum of weighted counts
  popularity_percentile?: number;  // Best percentile (top X%) across countries
}

// Helper function to format popularity rank as a friendly percentage
export function formatPopularityAsPercentage(rank: number | undefined | null): string {
  if (!rank) return 'Classic';
  // Use 10,000 as a reasonable baseline for names per country
  const percentile = (rank / 10000) * 100;
  if (percentile <= 0.1) return 'Top 0.1%';
  if (percentile <= 1) return 'Top 1%';
  if (percentile <= 5) return 'Top 5%';
  if (percentile <= 10) return 'Top 10%';
  if (percentile <= 25) return 'Top 25%';
  if (percentile <= 50) return 'Top 50%';
  return `Top ${Math.round(percentile)}%`;
}

export interface Country {
  code: string;
  name: string;  // Readable name like "italy", "usa"
  count: number;
}

export interface Origin {
  name: string;
  count: number;
}

export interface Swipe {
  id: string;
  name_id: string;
  action: 'like' | 'dismiss';
  created_at?: string;
  name?: Name;
}

export interface SwipeResult {
  match: boolean;
  name?: Name;
}

export interface BatchSwipeResult {
  created: number;
  matches: Name[];
}

export interface Match extends Name {
  matched_at: string;
}

export interface CloseCallName {
  id: string;
  name: string;
  gender?: 'M' | 'F' | 'U';
  countries?: string[];
}

export interface CloseCall {
  similarity: number;
  your_name: CloseCallName;
  partner_name: CloseCallName;
}

export interface Preferences {
  origins: string[];
  genders: string[];
  starting_letters: string[];
  starts_with?: string;  // Free text prefix filter
  max_length?: number;
}

export interface NameVariant {
  id: string;
  name: string;
  countries: string[];  // ISO country codes
  meaning?: string;
  popularity_rank?: number;
  weighted_count?: number;
}

export interface RegionPopularity {
  country_code: string;
  country_name: string;
  popularity_rank: number | null;
  percentile: number | null;  // Top X% (lower is better)
  weighted_count: number | null;
}

export interface HistoricalFigure {
  name: string;
  description: string;
}

export interface FictionalCharacter {
  name: string;
  source: string;
  description: string;
}

export interface CulturalReferences {
  religious?: string;
  mythological?: string;
  literary?: string;
}

export interface NameFacts {
  origin_language?: string;
  meaning?: string;
  nicknames: string[];
  historical_figures: HistoricalFigure[];
  fictional_characters: FictionalCharacter[];
  cultural_references?: CulturalReferences;
}

// New similarity-based types (replaces group-based approach)
export interface SimilarName {
  id: string;
  name: string;
  gender?: 'M' | 'F' | 'U';
  similarity: number;  // Cosine similarity score (0-1)
  countries: string[];
  popularity_rank?: number;
  weighted_count?: number;
}

export interface NameWithSimilar {
  id: string;
  name: string;
  gender?: 'M' | 'F' | 'U';
  meaning?: string;
  length?: number;
  countries: string[];
  popularity_rank?: number;
  weighted_count?: number;
  similar: SimilarName[];  // Similar name variants computed on-the-fly
}

export interface CustomName {
  id: string;
  name: string;
  gender: 'M' | 'F' | 'U';
  user_id: string;
  couple_id: string;
  created_at: string;
}

