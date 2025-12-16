// ISO country code to display name mapping
const isoToName: Record<string, string> = {
  AD: 'Andorra',
  AE: 'UAE',
  AF: 'Afghanistan',
  AL: 'Albania',
  AM: 'Armenia',
  AR: 'Argentina',
  AT: 'Austria',
  AU: 'Australia',
  AW: 'Aruba',
  AZ: 'Azerbaijan',
  BA: 'Bosnia',
  BD: 'Bangladesh',
  BE: 'Belgium',
  BG: 'Bulgaria',
  BO: 'Bolivia',
  BR: 'Brazil',
  BY: 'Belarus',
  CA: 'Canada',
  CH: 'Switzerland',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DE: 'Germany',
  DK: 'Denmark',
  DZ: 'Algeria',
  EC: 'Ecuador',
  EE: 'Estonia',
  EG: 'Egypt',
  ES: 'Spain',
  FI: 'Finland',
  FO: 'Faroe Islands',
  FR: 'France',
  GB: 'UK',
  GE: 'Georgia',
  GG: 'Guernsey',
  GI: 'Gibraltar',
  GL: 'Greenland',
  GQ: 'Equatorial Guinea',
  GR: 'Greece',
  HR: 'Croatia',
  HT: 'Haiti',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IM: 'Isle of Man',
  IN: 'India',
  IQ: 'Iraq',
  IR: 'Iran',
  IS: 'Iceland',
  IT: 'Italy',
  JE: 'Jersey',
  JM: 'Jamaica',
  JO: 'Jordan',
  JP: 'Japan',
  KG: 'Kyrgyzstan',
  KR: 'Korea',
  KW: 'Kuwait',
  KZ: 'Kazakhstan',
  LB: 'Lebanon',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  LY: 'Libya',
  MA: 'Morocco',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Montenegro',
  MK: 'Macedonia',
  ML: 'Mali',
  MN: 'Mongolia',
  MT: 'Malta',
  MX: 'Mexico',
  MY: 'Malaysia',
  NL: 'Netherlands',
  NO: 'Norway',
  NP: 'Nepal',
  NZ: 'New Zealand',
  PA: 'Panama',
  PE: 'Peru',
  PF: 'French Polynesia',
  PH: 'Philippines',
  PK: 'Pakistan',
  PL: 'Poland',
  PR: 'Puerto Rico',
  PT: 'Portugal',
  PY: 'Paraguay',
  RO: 'Romania',
  RS: 'Serbia',
  RU: 'Russia',
  SA: 'Saudi Arabia',
  SE: 'Sweden',
  SG: 'Singapore',
  SI: 'Slovenia',
  SK: 'Slovakia',
  SM: 'San Marino',
  SV: 'El Salvador',
  TH: 'Thailand',
  TJ: 'Tajikistan',
  TN: 'Tunisia',
  TR: 'Turkey',
  TW: 'Taiwan',
  UA: 'Ukraine',
  US: 'USA',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VE: 'Venezuela',
  VN: 'Vietnam',
  ZA: 'South Africa',
};

// Legacy origin name to display name (for backwards compatibility)
const originToName: Record<string, string> = {
  albania: 'Albania',
  andorra: 'Andorra',
  argentina: 'Argentina',
  armenia: 'Armenia',
  australia: 'Australia',
  austria: 'Austria',
  azerbaijan: 'Azerbaijan',
  bangladesh: 'Bangladesh',
  belarus: 'Belarus',
  belgium: 'Belgium',
  bosnia: 'Bosnia',
  brazil: 'Brazil',
  bulgaria: 'Bulgaria',
  canada: 'Canada',
  chile: 'Chile',
  china: 'China',
  colombia: 'Colombia',
  croatia: 'Croatia',
  czechia: 'Czechia',
  denmark: 'Denmark',
  egypt: 'Egypt',
  estonia: 'Estonia',
  finland: 'Finland',
  france: 'France',
  georgia: 'Georgia',
  germany: 'Germany',
  greece: 'Greece',
  hungary: 'Hungary',
  india: 'India',
  indonesia: 'Indonesia',
  iran: 'Iran',
  iraq: 'Iraq',
  ireland: 'Ireland',
  israel: 'Israel',
  italy: 'Italy',
  japan: 'Japan',
  kazakhstan: 'Kazakhstan',
  korea: 'Korea',
  latvia: 'Latvia',
  lithuania: 'Lithuania',
  macedonia: 'Macedonia',
  malaysia: 'Malaysia',
  mexico: 'Mexico',
  moldova: 'Moldova',
  montenegro: 'Montenegro',
  morocco: 'Morocco',
  netherlands: 'Netherlands',
  newzealand: 'New Zealand',
  norway: 'Norway',
  pakistan: 'Pakistan',
  philippines: 'Philippines',
  poland: 'Poland',
  portugal: 'Portugal',
  romania: 'Romania',
  russia: 'Russia',
  saudiarabia: 'Saudi Arabia',
  serbia: 'Serbia',
  singapore: 'Singapore',
  slovakia: 'Slovakia',
  slovenia: 'Slovenia',
  southafrica: 'South Africa',
  spain: 'Spain',
  sweden: 'Sweden',
  switzerland: 'Switzerland',
  thailand: 'Thailand',
  turkey: 'Turkey',
  uae: 'UAE',
  uk: 'UK',
  ukraine: 'Ukraine',
  usa: 'USA',
  uzbekistan: 'Uzbekistan',
  vietnam: 'Vietnam',
};

/**
 * Get display name for a country.
 * Accepts both ISO codes (IT, US) and readable origins (italy, usa).
 */
export function getCountryName(code: string): string {
  if (!code) return '';
  // Check ISO code first (uppercase)
  const upperCode = code.toUpperCase();
  if (isoToName[upperCode]) {
    return isoToName[upperCode];
  }
  // Check origin name (lowercase)
  const lowerCode = code.toLowerCase();
  if (originToName[lowerCode]) {
    return originToName[lowerCode];
  }
  // Fallback to the input
  return code;
}

/**
 * Get country flag emoji from ISO code.
 */
export function getCountryFlag(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) return '';
  const code = isoCode.toUpperCase();
  // Convert ISO code to flag emoji using regional indicator symbols
  const offset = 127397; // Offset to convert A-Z to regional indicators
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}

/**
 * Format countries array for display.
 * Returns something like "Italy, Spain +3"
 * @param countries Array of country codes
 * @param maxShow Maximum number of countries to show
 * @param prioritize Optional array of country codes to show first
 */
export function formatCountries(
  countries: string[],
  maxShow: number = 2,
  prioritize?: string[]
): string {
  if (!countries || countries.length === 0) return '';

  let ordered = countries;
  if (prioritize && prioritize.length > 0) {
    const prioritySet = new Set(prioritize);
    const priority = countries.filter(c => prioritySet.has(c));
    const rest = countries.filter(c => !prioritySet.has(c));
    ordered = [...priority, ...rest];
  }

  const shown = ordered.slice(0, maxShow).map(getCountryName);
  const remaining = ordered.length - maxShow;
  if (remaining > 0) {
    return `${shown.join(', ')} +${remaining}`;
  }
  return shown.join(', ');
}

// Origin name to ISO code mapping
const originToIso: Record<string, string> = {
  albania: 'AL', andorra: 'AD', argentina: 'AR', armenia: 'AM',
  australia: 'AU', austria: 'AT', azerbaijan: 'AZ', bangladesh: 'BD',
  belarus: 'BY', belgium: 'BE', bosnia: 'BA', brazil: 'BR',
  bulgaria: 'BG', canada: 'CA', chile: 'CL', china: 'CN',
  colombia: 'CO', croatia: 'HR', czechia: 'CZ', denmark: 'DK',
  egypt: 'EG', estonia: 'EE', finland: 'FI', france: 'FR',
  georgia: 'GE', germany: 'DE', greece: 'GR', hungary: 'HU',
  india: 'IN', indonesia: 'ID', iran: 'IR', iraq: 'IQ',
  ireland: 'IE', israel: 'IL', italy: 'IT', japan: 'JP',
  kazakhstan: 'KZ', korea: 'KR', latvia: 'LV', lithuania: 'LT',
  macedonia: 'MK', malaysia: 'MY', mexico: 'MX', moldova: 'MD',
  montenegro: 'ME', morocco: 'MA', netherlands: 'NL', newzealand: 'NZ',
  norway: 'NO', pakistan: 'PK', philippines: 'PH', poland: 'PL',
  portugal: 'PT', romania: 'RO', russia: 'RU', saudiarabia: 'SA',
  serbia: 'RS', singapore: 'SG', slovakia: 'SK', slovenia: 'SI',
  southafrica: 'ZA', spain: 'ES', sweden: 'SE', switzerland: 'CH',
  thailand: 'TH', turkey: 'TR', uae: 'AE', uk: 'GB',
  ukraine: 'UA', usa: 'US', uzbekistan: 'UZ', vietnam: 'VN',
};

/**
 * Convert origin name to ISO code.
 * @param origin Origin name like "italy" or "usa"
 * @returns ISO code like "IT" or "US", or the input if not found
 */
export function originToCountryCode(origin: string): string {
  if (!origin) return '';
  const lower = origin.toLowerCase();
  return originToIso[lower] || origin.toUpperCase();
}

/**
 * Convert array of origin names to ISO codes.
 */
export function originsToCountryCodes(origins: string[]): string[] {
  return origins.map(originToCountryCode);
}

/**
 * Get flag emoji for an origin name (e.g., "italy" -> "🇮🇹").
 * Works with both origin names and ISO codes.
 */
export function getOriginFlag(origin: string): string {
  if (!origin) return '🌍';
  // Try as ISO code first
  if (origin.length === 2) {
    const flag = getCountryFlag(origin);
    if (flag) return flag;
  }
  // Convert origin name to ISO code then get flag
  const isoCode = originToCountryCode(origin);
  const flag = getCountryFlag(isoCode);
  return flag || '🌍';
}
