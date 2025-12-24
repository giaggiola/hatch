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
  countries: string[];
  popularity_rank?: number;
  weighted_count?: number;
  popularity_percentile?: number;
}

export interface SimilarName {
  id: string;
  name: string;
  gender?: 'M' | 'F' | 'U';
  similarity: number;
  countries: string[];
  popularity_rank?: number;
  weighted_count?: number;
}

export interface NameWithSimilar extends Name {
  similar: SimilarName[];
}

export interface Country {
  code: string;
  name: string;
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
  starts_with?: string;
  max_length?: number;
}

export interface RegionPopularity {
  country_code: string;
  country_name: string;
  popularity_rank: number | null;
  percentile: number | null;
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

export interface CustomName {
  id: string;
  name: string;
  gender: 'M' | 'F' | 'U';
  user_id: string;
  couple_id: string;
  created_at: string;
}

// Helper function to format popularity rank as a friendly percentage
export function formatPopularityAsPercentage(rank: number | undefined | null): string {
  if (!rank) return 'Classic';
  const percentile = (rank / 10000) * 100;
  if (percentile <= 0.1) return 'Top 0.1%';
  if (percentile <= 1) return 'Top 1%';
  if (percentile <= 5) return 'Top 5%';
  if (percentile <= 10) return 'Top 10%';
  if (percentile <= 25) return 'Top 25%';
  if (percentile <= 50) return 'Top 50%';
  return `Top ${Math.round(percentile)}%`;
}
