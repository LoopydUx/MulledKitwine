/**
 * Single source of truth for product facts, brand links, ordering, and asset paths.
 * Everything here comes from the supplied packaging artwork and recipe booklet.
 * Nothing on the page invents prices, stock, reviews, awards, or shipping terms.
 */

export type L10n = { en: string };

export const brand = {
  name: 'Cantina Cana',
  wordmark: 'CANTINA CANA',
  /** Back cover of the recipe booklet */
  signature: {
    en: 'Crafted with care. Shared with warmth.',
  } satisfies L10n,
  website: { label: 'www.cantinacana.com', url: 'https://www.cantinacana.com' },
  instagram: { label: '@cantina.cana', url: 'https://www.instagram.com/cantina.cana/' },
  /** The booklet mentions a boutique store in Nazareth, found on Waze as "Cantina Cana". No address or phone is supplied. */
  boutique: {
    en: 'Boutique store in Nazareth. Find “Cantina Cana” on Waze.',
  } satisfies L10n,
} as const;

/**
 * Ordering. Leave `url` as null until a verified checkout or product page exists.
 * The order button is shown only when `url` is set, so the page never fakes a checkout.
 * `price` is displayed only when it is filled in here.
 */
export const order: { url: string | null; price: L10n | null } = {
  url: null,
  price: null,
};

export const product = {
  name: { en: 'Mulled Wine Kit' } satisfies L10n,
  tagline: { en: 'A Warm Winter Ritual' } satisfies L10n,
  wine: {
    volumeMl: 750,
    vintage: 2023,
    abv: 13,
    grapes: 'Cabernet Sauvignon & Merlot',
    origin: 'Bethlehem',
  },
  /**
   * The mini bottle. The booklet's ingredient page calls it "Orange Aperitif" while the
   * box and the English recipe say "orange brandy" / "brandy". Change the display name
   * here and every mention on the page follows.
   */
  spirit: {
    volumeMl: 40,
    abv: 35,
    displayName: { en: 'Orange Aperitif' } satisfies L10n,
    /** lower-case form used inside sentences */
    inSentence: { en: 'orange aperitif' } satisfies L10n,
    /** wording used inside the recipe for the mini bottle */
    recipeReference: { en: 'the mini bottle of orange aperitif' } satisfies L10n,
  },
  recipe: { heatMinutes: 15, restMinutes: 8 },
} as const;

/** Type printed on the box and bottle. Brand art stays in English. */
export const packaging = {
  wordmark: 'CANTINA CANA',
  productName: 'Mulled Wine Kit',
  tagline: 'A Warm Winter Ritual',
  sideLine: 'Pour, Mix, Heat And Share Warm Moments Together.',
  wineLabel: 'Dry Red Wine',
} as const;

export const assets = {
  bookletCover: '/textures/booklet-cover.webp',
  bookletSpread: '/recipe/booklet-instructions.webp',
  textures: {
    packFront: '/textures/pack-front.webp',
    packRight: '/textures/pack-right.webp',
    packLeft: '/textures/pack-left.webp',
    packBack: '/textures/pack-back.webp',
    lidInside: '/textures/pack-lid-inside.webp',
    bookletCover: '/textures/booklet-cover.webp',
  },
  /** Still frames rendered from the 3D scene (see README: `?capture=1`). */
  stills: {
    hero: '/stills/hero.webp',
    chapters: [
      '/stills/chapter-1.webp',
      '/stills/chapter-2.webp',
      '/stills/chapter-3.webp',
      '/stills/chapter-4.webp',
      '/stills/chapter-5.webp',
      '/stills/chapter-6.webp',
    ],
    finale: '/stills/finale.webp',
    kit: '/stills/kit.webp',
    closing: '/stills/closing.webp',
  },
} as const;

export type KitItemId = 'wine' | 'cinnamon' | 'orange' | 'star-anise' | 'cardamom' | 'cloves' | 'aperitif' | 'corkscrew' | 'booklet';

export interface KitItem {
  id: KitItemId;
  /** line drawing taken from the recipe booklet */
  illustration: string | null;
  name: L10n;
  role: L10n;
  description: L10n;
  meta?: L10n;
}

/** The actual contents of the kit, in the order the booklet presents them. */
export const kitItems: KitItem[] = [
  {
    id: 'wine',
    illustration: '/illustrations/wine.png',
    name: { en: 'Dry Red Wine' },
    role: { en: 'The heart of the recipe' },
    description: {
      en: 'Produced in Bethlehem, Cantina Cana’s 2023 dry red brings together Cabernet Sauvignon and Merlot. Ripe fruit and subtle oak make a beautiful foundation for winter spices.',
    },
    meta: { en: 'Vintage 2023 · 750 ml · 13% alc.' },
  },
  {
    id: 'cinnamon',
    illustration: '/illustrations/cinnamon.png',
    name: { en: 'Organic Ceylon Cinnamon Sticks' },
    role: { en: 'The warmth' },
    description: {
      en: 'Alba Grade true cinnamon from Sri Lanka, brought to you by Mama Muna. A delicate aroma and naturally sweet flavour in every sip.',
    },
    meta: { en: 'Organic · Alba Grade · Sri Lanka' },
  },
  {
    id: 'orange',
    illustration: '/illustrations/orange.png',
    name: { en: 'Dried Oranges' },
    role: { en: 'The brightness' },
    description: {
      en: 'Bright, fragrant, and delicately citrusy. A refreshing contrast to the deeper notes of wine and spice.',
    },
  },
  {
    id: 'star-anise',
    illustration: '/illustrations/star-anise.png',
    name: { en: 'Star Anise' },
    role: { en: 'The character' },
    description: {
      en: 'Beautifully shaped and wonderfully aromatic, with delicate licorice-like notes that add complexity to the blend.',
    },
  },
  {
    id: 'cardamom',
    illustration: '/illustrations/cardamom.png',
    name: { en: 'Cardamom' },
    role: { en: 'The unexpected note' },
    description: {
      en: 'Small, delicate, and full of fragrance. Gently floral and citrusy, it complements the cinnamon and orange.',
    },
  },
  {
    id: 'cloves',
    illustration: '/illustrations/cloves.png',
    name: { en: 'Cloves' },
    role: { en: 'The depth' },
    description: {
      en: 'Tiny, yet wonderfully powerful. A rich, warm spiciness; a few are all it takes.',
    },
  },
  {
    id: 'aperitif',
    illustration: '/illustrations/aperitif.png',
    name: product.spirit.displayName,
    role: { en: 'The finishing touch' },
    description: {
      en: 'A splash of orange adds subtle citrus sweetness and an extra layer of warmth. It is stirred in once the heat is off.',
    },
    meta: { en: '40 ml · 35% alc.' },
  },
  {
    id: 'corkscrew',
    illustration: '/illustrations/corkscrew.png',
    name: { en: 'Corkscrew Wine Opener' },
    role: { en: 'The essential' },
    description: {
      en: 'Uncork your wine, gather your loved ones, and let the warmth begin.',
    },
  },
  {
    id: 'booklet',
    illustration: null,
    name: { en: 'Recipe Booklet' },
    role: { en: 'The guide' },
    description: {
      en: 'Ingredient notes and the five-step recipe, in English and Arabic.',
    },
  },
];
