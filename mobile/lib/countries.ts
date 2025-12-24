/**
 * Country utilities for mobile app - aligned with web frontend
 */

// Map of origin names to ISO country codes
const ORIGIN_TO_ISO: Record<string, string> = {
  // European origins
  'italy': 'IT',
  'italian': 'IT',
  'spain': 'ES',
  'spanish': 'ES',
  'france': 'FR',
  'french': 'FR',
  'germany': 'DE',
  'german': 'DE',
  'portugal': 'PT',
  'portuguese': 'PT',
  'greece': 'GR',
  'greek': 'GR',
  'ireland': 'IE',
  'irish': 'IE',
  'scotland': 'GB',
  'scottish': 'GB',
  'wales': 'GB',
  'welsh': 'GB',
  'england': 'GB',
  'english': 'GB',
  'netherlands': 'NL',
  'dutch': 'NL',
  'sweden': 'SE',
  'swedish': 'SE',
  'norway': 'NO',
  'norwegian': 'NO',
  'denmark': 'DK',
  'danish': 'DK',
  'finland': 'FI',
  'finnish': 'FI',
  'poland': 'PL',
  'polish': 'PL',
  'russia': 'RU',
  'russian': 'RU',
  'ukraine': 'UA',
  'ukrainian': 'UA',
  'czech': 'CZ',
  'hungary': 'HU',
  'hungarian': 'HU',
  'romania': 'RO',
  'romanian': 'RO',
  'bulgaria': 'BG',
  'bulgarian': 'BG',
  'croatia': 'HR',
  'croatian': 'HR',
  'serbia': 'RS',
  'serbian': 'RS',
  'austria': 'AT',
  'austrian': 'AT',
  'switzerland': 'CH',
  'swiss': 'CH',
  'belgium': 'BE',
  'belgian': 'BE',

  // Middle Eastern origins
  'hebrew': 'IL',
  'israel': 'IL',
  'arabic': 'SA',
  'arab': 'SA',
  'persian': 'IR',
  'iran': 'IR',
  'turkey': 'TR',
  'turkish': 'TR',

  // Asian origins
  'china': 'CN',
  'chinese': 'CN',
  'japan': 'JP',
  'japanese': 'JP',
  'korea': 'KR',
  'korean': 'KR',
  'india': 'IN',
  'indian': 'IN',
  'hindi': 'IN',
  'sanskrit': 'IN',
  'vietnam': 'VN',
  'vietnamese': 'VN',
  'thailand': 'TH',
  'thai': 'TH',
  'philippines': 'PH',
  'filipino': 'PH',
  'indonesia': 'ID',
  'indonesian': 'ID',

  // African origins
  'nigeria': 'NG',
  'nigerian': 'NG',
  'ethiopia': 'ET',
  'ethiopian': 'ET',
  'kenya': 'KE',
  'kenyan': 'KE',
  'egypt': 'EG',
  'egyptian': 'EG',
  'south africa': 'ZA',
  'african': 'ZA',

  // Americas
  'usa': 'US',
  'united states': 'US',
  'american': 'US',
  'mexico': 'MX',
  'mexican': 'MX',
  'brazil': 'BR',
  'brazilian': 'BR',
  'argentina': 'AR',
  'argentinian': 'AR',
  'canada': 'CA',
  'canadian': 'CA',

  // Other
  'latin': 'VA',
  'hawaiian': 'US',
};

/**
 * Convert origin name to ISO country code
 */
export function originToCountryCode(origin: string): string {
  const normalized = origin.toLowerCase().trim();
  return ORIGIN_TO_ISO[normalized] || '';
}

/**
 * Get country flag emoji from ISO code
 */
export function getCountryFlag(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) return '';
  const code = isoCode.toUpperCase();
  // Convert ISO code to flag emoji using regional indicator symbols
  const offset = 127397;
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}

/**
 * Get flag emoji for an origin name (e.g., "italy" -> "🇮🇹")
 */
export function getOriginFlag(origin: string): string {
  // First try direct ISO code match
  if (origin.length === 2) {
    const flag = getCountryFlag(origin);
    if (flag) return flag;
  }
  // Convert origin name to ISO code then get flag
  const isoCode = originToCountryCode(origin);
  const flag = getCountryFlag(isoCode);
  return flag || '🌍';
}

/**
 * Convert array of origin names to ISO codes.
 */
export function originsToCountryCodes(origins: string[]): string[] {
  return origins.map(originToCountryCode).filter(Boolean);
}

// ISO code to country name
const ISO_TO_NAME: Record<string, string> = {
  IT: 'Italy', ES: 'Spain', FR: 'France', DE: 'Germany', PT: 'Portugal',
  GR: 'Greece', IE: 'Ireland', GB: 'UK', NL: 'Netherlands', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', RU: 'Russia',
  UA: 'Ukraine', CZ: 'Czechia', HU: 'Hungary', RO: 'Romania', BG: 'Bulgaria',
  HR: 'Croatia', RS: 'Serbia', AT: 'Austria', CH: 'Switzerland', BE: 'Belgium',
  IL: 'Israel', SA: 'Saudi Arabia', IR: 'Iran', TR: 'Turkey',
  CN: 'China', JP: 'Japan', KR: 'Korea', IN: 'India', VN: 'Vietnam',
  TH: 'Thailand', PH: 'Philippines', ID: 'Indonesia',
  NG: 'Nigeria', ET: 'Ethiopia', KE: 'Kenya', EG: 'Egypt', ZA: 'South Africa',
  US: 'USA', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina', CA: 'Canada',
};

/**
 * Get country name from ISO code
 */
export function getCountryName(isoCode: string): string {
  return ISO_TO_NAME[isoCode.toUpperCase()] || isoCode;
}
