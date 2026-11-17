/**
 * Single source of truth for product facts, brand links, ordering, and asset paths.
 * Everything here comes from the supplied packaging artwork and recipe booklet.
 * Nothing on the page invents prices, stock, reviews, awards, or shipping terms.
 */

export type Lang = 'en' | 'ar';
export type L10n = Record<Lang, string>;

export const brand = {
  name: 'Cantina Cana',
  wordmark: 'CANTINA CANA',
  /** Back cover of the recipe booklet */
  signature: {
    en: 'Crafted with care. Shared with warmth.',
    ar: 'صُنع بعناية. يُشارَك بدفء.',
  } satisfies L10n,
  website: { label: 'www.cantinacana.com', url: 'https://www.cantinacana.com' },
  instagram: { label: '@cantina.cana', url: 'https://www.instagram.com/cantina.cana/' },
  /** The booklet mentions a boutique store in Nazareth, found on Waze as "Cantina Cana". No address or phone is supplied. */
  boutique: {
    en: 'Boutique store in Nazareth. Find “Cantina Cana” on Waze.',
    ar: 'متجرنا في الناصرة. ابحث عن “Cantina Cana” على تطبيق ويز.',
  } satisfies L10n,
} as const;

/**
 * Ordering. Leave `url` as null until a verified checkout or product page exists:
 * the page then shows a transparent "How to order" panel instead of a fake checkout.
 * `price` is displayed only when it is filled in here.
 */
export const order: { url: string | null; price: L10n | null } = {
  url: null,
  price: null,
};

export const product = {
  name: { en: 'Mulled Wine Kit', ar: 'مجموعة النبيذ الساخن' } satisfies L10n,
  tagline: { en: 'A Warm Winter Ritual', ar: 'طقوس شتوية دافئة' } satisfies L10n,
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
    displayName: { en: 'Orange Aperitif', ar: 'أبيريتيف البرتقال' } satisfies L10n,
    /** lower-case form used inside sentences */
    inSentence: { en: 'orange aperitif', ar: 'أبيريتيف البرتقال' } satisfies L10n,
    /** the booklet's Arabic recipe wording for the mini bottle */
    recipeReference: { en: 'the mini bottle of orange aperitif', ar: 'زجاجة مشروب البرتقال الصغيرة' } satisfies L10n,
  },
  recipe: { heatMinutes: 15, restMinutes: 8 },
} as const;

/** Type printed on the box and bottle. Brand art stays in English in every language. */
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
    name: { en: 'Dry Red Wine', ar: 'نبيذ أحمر جاف' },
    role: { en: 'The heart of the recipe', ar: 'قلب الوصفة' },
    description: {
      en: 'Produced in Bethlehem, Cantina Cana’s 2023 dry red brings together Cabernet Sauvignon and Merlot. Ripe fruit and subtle oak make a beautiful foundation for winter spices.',
      ar: 'من إنتاج بيت لحم، يجمع نبيذ كانتينا كانا الأحمر الجاف لعام 2023 بين الكابرنيه سوفينيون والميرلو. نكهات الفاكهة الناضجة ولمسة البلوط الخفيفة تشكّل أساسًا جميلًا لدفء توابل الشتاء.',
    },
    meta: { en: 'Vintage 2023 · 750 ml · 13% alc.', ar: 'إنتاج 2023 · 750 مل · كحول 13%' },
  },
  {
    id: 'cinnamon',
    illustration: '/illustrations/cinnamon.png',
    name: { en: 'Organic Ceylon Cinnamon Sticks', ar: 'أعواد قرفة سيلانية عضوية' },
    role: { en: 'The warmth', ar: 'الدفء' },
    description: {
      en: 'Alba Grade true cinnamon from Sri Lanka, brought to you by Mama Muna. A delicate aroma and naturally sweet flavour in every sip.',
      ar: 'قرفة سيلانية عضوية من درجة ألبا من سريلانكا، مقدَّمة من Mama Muna. تُعرف بالقرفة الحقيقية، بعبيرها الرقيق وحلاوتها الطبيعية.',
    },
    meta: { en: 'Organic · Alba Grade · Sri Lanka', ar: 'عضوية · درجة ألبا · سريلانكا' },
  },
  {
    id: 'orange',
    illustration: '/illustrations/orange.png',
    name: { en: 'Dried Oranges', ar: 'برتقال مجفف' },
    role: { en: 'The brightness', ar: 'الإشراق' },
    description: {
      en: 'Bright, fragrant, and delicately citrusy. A refreshing contrast to the deeper notes of wine and spice.',
      ar: 'مشرق وعطِر بلمسة حمضية رقيقة، يوازن عمق النبيذ والتوابل بانتعاش لطيف.',
    },
  },
  {
    id: 'star-anise',
    illustration: '/illustrations/star-anise.png',
    name: { en: 'Star Anise', ar: 'اليانسون النجمي' },
    role: { en: 'The character', ar: 'الطابع' },
    description: {
      en: 'Beautifully shaped and wonderfully aromatic, with delicate licorice-like notes that add complexity to the blend.',
      ar: 'شكل جميل وعبير أخّاذ، بنفحات رقيقة تشبه عرق السوس تضيف عمقًا وتميّزًا للخلطة.',
    },
  },
  {
    id: 'cardamom',
    illustration: '/illustrations/cardamom.png',
    name: { en: 'Cardamom', ar: 'هيل' },
    role: { en: 'The unexpected note', ar: 'النفحة غير المتوقعة' },
    description: {
      en: 'Small, delicate, and full of fragrance. Gently floral and citrusy, it complements the cinnamon and orange.',
      ar: 'صغير ورقيق ومليء بالعبير، بنفحات زهرية وحمضية لطيفة تكمّل القرفة والبرتقال.',
    },
  },
  {
    id: 'cloves',
    illustration: '/illustrations/cloves.png',
    name: { en: 'Cloves', ar: 'قرنفل' },
    role: { en: 'The depth', ar: 'العمق' },
    description: {
      en: 'Tiny, yet wonderfully powerful. A rich, warm spiciness; a few are all it takes.',
      ar: 'صغير الحجم وقوي الأثر. يمنح الخلطة دفئًا غنيًا، ويكفي منه القليل.',
    },
  },
  {
    id: 'aperitif',
    illustration: '/illustrations/aperitif.png',
    name: product.spirit.displayName,
    role: { en: 'The finishing touch', ar: 'اللمسة الأخيرة' },
    description: {
      en: 'A splash of orange adds subtle citrus sweetness and an extra layer of warmth. It is stirred in once the heat is off.',
      ar: 'رشّة من نكهة البرتقال تضيف حلاوة حمضية خفيفة ودفئًا إضافيًا، وتُضاف بعد إطفاء النار.',
    },
    meta: { en: '40 ml · 35% alc.', ar: '40 مل · كحول 35%' },
  },
  {
    id: 'corkscrew',
    illustration: '/illustrations/corkscrew.png',
    name: { en: 'Corkscrew Wine Opener', ar: 'فتاحة النبيذ' },
    role: { en: 'The essential', ar: 'الأساسية' },
    description: {
      en: 'Uncork your wine, gather your loved ones, and let the warmth begin.',
      ar: 'افتح النبيذ، اجمع أحبّاءك، ودع الدفء يبدأ.',
    },
  },
  {
    id: 'booklet',
    illustration: null,
    name: { en: 'Recipe Booklet', ar: 'كتيّب الوصفة' },
    role: { en: 'The guide', ar: 'الدليل' },
    description: {
      en: 'Ingredient notes and the five-step recipe, in English and Arabic.',
      ar: 'ملاحظات عن المكوّنات والوصفة بخمس خطوات، بالعربية والإنجليزية.',
    },
  },
];
