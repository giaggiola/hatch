export interface Region {
  id: string;
  name: string;
  emoji: string;
  origins: string[];
}

export const REGIONS: Region[] = [
  {
    id: 'europe',
    name: 'Europe',
    emoji: '🇪🇺',
    origins: [
      'italy', 'uk', 'france', 'germany', 'spain', 'portugal', 'ireland',
      'netherlands', 'belgium', 'sweden', 'norway', 'denmark', 'finland',
      'poland', 'austria', 'switzerland', 'greece', 'czechia', 'hungary',
      'romania', 'bulgaria', 'croatia', 'serbia', 'slovakia', 'slovenia',
      'estonia', 'latvia', 'lithuania', 'ukraine', 'belarus', 'moldova',
      'albania', 'bosnia', 'montenegro', 'macedonia', 'is', 'lu', 'mt',
      'mc', 'sm', 'li', 'andorra', 'fo', 'gg', 'je', 'im', 'gi', 'gl'
    ],
  },
  {
    id: 'americas',
    name: 'Americas',
    emoji: '🌎',
    origins: [
      'usa', 'canada', 'mexico', 'brazil', 'argentina', 'colombia', 'chile',
      'peru', 've', 'ec', 'bo', 'py', 'uy', 'pa', 'pr', 'jm', 'ht', 'sv'
    ],
  },
  {
    id: 'asia_oceania',
    name: 'Asia & Oceania',
    emoji: '🌏',
    origins: [
      'japan', 'china', 'india', 'korea', 'thailand', 'malaysia', 'philippines',
      'pakistan', 'bangladesh', 'australia', 'newzealand', 'tw', 'np', 'kg',
      'kazakhstan', 'mn', 'tj', 'pf'
    ],
  },
  {
    id: 'middle_east_africa',
    name: 'Middle East & Africa',
    emoji: '🌍',
    origins: [
      'turkey', 'israel', 'iran', 'iraq', 'egypt', 'morocco', 'saudiarabia',
      'uae', 'jo', 'lb', 'kw', 'dz', 'tn', 'ly', 'southafrica', 'ml', 'gq',
      'georgia', 'armenia', 'azerbaijan'
    ],
  },
];
