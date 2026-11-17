import { product, type Lang } from '../config/product';

/**
 * Interface and story copy in English and Arabic.
 * Arabic recipe wording follows the supplied booklet ("طريقة التحضير") verbatim;
 * the remaining Arabic interface copy is written to match its tone.
 */

export interface ChapterCopy {
  title: string;
  body: string;
  /** short reinforcing note shown with the chapter (never the only place an instruction lives) */
  note?: string;
  /** alt text for the still composition of this chapter */
  alt: string;
}

export interface RecipeStep {
  title: string;
  body: string;
  warning?: string;
}

export interface Strings {
  meta: { title: string; description: string };
  nav: { ritual: string; inside: string; recipe: string; cta: string; menu: string; close: string; primary: string; home: string; skipToContent: string };
  lang: { switchTo: string; label: string };
  hero: { eyebrow: string; title: string; body: string; primary: string; secondary: string; scroll: string; alt: string };
  story: {
    heading: string;
    chapterWord: string;
    of: string;
    chaptersNav: string;
    skip: string;
    chapters: ChapterCopy[];
    ingredients: { orange: string; cinnamon: string; star: string; cardamom: string; clove: string };
    cues: { lowHeat: string; minutes15: string; doNotBoil: string; heatOff: string; rest: string; minutes8: string };
    finale: { line: string; note: string; alt: string };
    loading: string;
    stillsBecauseMotion: string;
    stillsBecauseWebgl: string;
    playAnimated: string;
    showStills: string;
  };
  kit: { eyebrow: string; title: string; intro: string; included: string; alt: string };
  recipe: {
    eyebrow: string;
    title: string;
    intro: string;
    stepWord: string;
    steps: RecipeStep[];
    timeTitle: string;
    time: string;
    needTitle: string;
    fromKit: string;
    fromKitList: string;
    fromKitchen: string;
    fromKitchenList: string;
    read: string;
    pdfNote: string;
    bookletAlt: string;
  };
  order: {
    title: string;
    body: string;
    cta: string;
    ctaOnline: string;
    howTitle: string;
    howBody: string;
    website: string;
    instagram: string;
    boutique: string;
    priceNote: string;
    alt: string;
  };
  footer: { replay: string; website: string; instagram: string; responsible: string; links: string };
}

const spirit = product.spirit;

const en: Strings = {
  meta: {
    title: 'Cantina Cana Mulled Wine Kit | A Warm Winter Ritual',
    description: 'Red wine, fragrant spices, and a touch of orange, thoughtfully gathered in one box.',
  },
  nav: {
    ritual: 'The Ritual',
    inside: 'Inside the Box',
    recipe: 'Recipe',
    cta: 'Get the Kit',
    menu: 'Menu',
    close: 'Close menu',
    primary: 'Primary',
    home: 'Cantina Cana, back to top',
    skipToContent: 'Skip to content',
  },
  lang: { switchTo: 'العربية', label: 'Switch language to Arabic' },
  hero: {
    eyebrow: 'Mulled Wine Kit',
    title: 'A warm winter ritual.',
    body: 'Red wine, fragrant spices, and a touch of orange. Thoughtfully gathered in one box, ready to share.',
    primary: 'Discover the ritual',
    secondary: 'Explore the kit',
    scroll: 'Scroll',
    alt: 'The closed burgundy Cantina Cana Mulled Wine Kit gift box, printed in gold with a wine bottle, mini bottle, dried orange, cinnamon and star anise.',
  },
  story: {
    heading: 'The ritual, in six chapters',
    chapterWord: 'Chapter',
    of: 'of',
    chaptersNav: 'Chapters of the ritual',
    skip: 'Skip animation',
    chapters: [
      {
        title: 'Open a little warmth.',
        body: `Lift the lid to find a bottle of dry red wine, winter spices, dried oranges, and a mini bottle of ${spirit.inSentence.en}. Uncork the wine to begin.`,
        alt: 'The gift box stands open: the wine bottle on the left; the recipe booklet, dried oranges, mini bottle, cinnamon and corkscrew in compartments on the right.',
      },
      {
        title: 'Begin with the wine.',
        body: 'Pour the entire 750 ml bottle into a saucepan.',
        alt: 'The uncorked bottle pours a stream of deep red wine into a saucepan.',
      },
      {
        title: 'Let the spices tell their story.',
        body: 'Add the dried oranges and the included spices. Stir gently.',
        alt: 'Dried orange slices, cinnamon sticks, star anise, cardamom and cloves drop from their packets into the wine.',
      },
      {
        title: 'Slow warmth. Rich aroma.',
        body: 'Warm gently over low heat for approximately 15 minutes, stirring occasionally.',
        note: 'Do not boil.',
        alt: 'The saucepan sits on a softly glowing hob with a few wisps of steam rising while a wooden spoon stirs.',
      },
      {
        title: 'The finishing touch.',
        body: `Turn off the heat. Add the ${spirit.inSentence.en}, stir, and let the spices infuse for another 8 minutes.`,
        alt: `With the hob switched off, the mini bottle of ${spirit.inSentence.en} pours an amber stream into the wine.`,
      },
      {
        title: 'Pour. Strain. Share.',
        body: 'Strain through a fine sieve into a heat-resistant glass and serve warm.',
        note: 'Sweeten to taste; the recipe suggests approximately one teaspoon of sugar per cup.',
        alt: 'The saucepan pours through a fine sieve into a cut-crystal mug; the orange and whole spices stay in the sieve.',
      },
    ],
    ingredients: { orange: 'Dried oranges', cinnamon: 'Cinnamon sticks', star: 'Star anise', cardamom: 'Cardamom', clove: 'Cloves' },
    cues: {
      lowHeat: 'Low heat',
      minutes15: 'approx. 15 min',
      doNotBoil: 'Do not boil',
      heatOff: 'Heat off',
      rest: 'Rest',
      minutes8: '8 min',
    },
    finale: {
      line: 'Crafted with care. Shared with warmth.',
      note: 'Sweeten to taste; the recipe suggests approximately one teaspoon of sugar per cup.',
      alt: 'A cut-crystal mug of warm mulled wine, handle on the right, with a little steam rising.',
    },
    loading: 'Preparing the scene',
    stillsBecauseMotion: 'You prefer reduced motion, so the ritual is shown as still compositions.',
    stillsBecauseWebgl: '3D graphics are not available on this device, so the ritual is shown as still compositions.',
    playAnimated: 'Play the scroll animation',
    showStills: 'Show still images instead',
  },
  kit: {
    eyebrow: 'Inside your kit',
    title: 'Inside the box',
    intro: 'Everything the recipe calls for, gathered in one burgundy box.',
    included: 'Included in the kit',
    alt: 'The open gift box with its contents set out in front: wine bottle, mini bottle, recipe booklet, dried orange slices, star anise, cardamom, cloves, cinnamon sticks and corkscrew.',
  },
  recipe: {
    eyebrow: 'Recipe',
    title: 'Instructions',
    intro: 'Five steps from the booklet in your kit.',
    stepWord: 'Step',
    steps: [
      { title: 'Pour', body: 'Pour the entire bottle of red wine into a saucepan.' },
      { title: 'Spice', body: 'Add the dried orange slices, cinnamon sticks, star anise, cardamom, and cloves to the wine.' },
      {
        title: 'Heat',
        body: 'Warm the mixture over low heat for approximately 15 minutes. Stir to bring the ingredients together.',
        warning: 'Do not let it boil!',
      },
      {
        title: 'Rest & finish',
        body: `Turn off the heat, add ${spirit.recipeReference.en} and stir. Set aside and let the spices infuse for another 8 minutes.`,
      },
      {
        title: 'Pour & share',
        body: 'Add sugar if desired; approximately a teaspoon in each cup is recommended. Strain, serve warm, and enjoy!',
      },
    ],
    timeTitle: 'Time',
    time: 'About 15 minutes of gentle heat, then 8 minutes of rest.',
    needTitle: 'You will need',
    fromKit: 'From the kit',
    fromKitList: `750 ml dry red wine, dried orange slices, cinnamon sticks, star anise, cardamom, cloves, 40 ml ${spirit.inSentence.en}, corkscrew.`,
    fromKitchen: 'From your kitchen',
    fromKitchenList: 'Saucepan, spoon, fine sieve, heat-resistant glasses or cups. Sugar, if desired.',
    read: 'Read the recipe book',
    pdfNote: 'PDF',
    bookletAlt: 'The instructions spread of the Cantina Cana recipe booklet, in English and Arabic.',
  },
  order: {
    title: 'Pour. Spice. Heat.',
    body: 'And share warm moments together.',
    cta: 'Get the kit',
    ctaOnline: 'Order online',
    howTitle: 'How to order',
    howBody: 'This page does not take orders or payments. To buy the Mulled Wine Kit, reach Cantina Cana directly:',
    website: 'Visit the website',
    instagram: 'Message on Instagram',
    boutique: 'Visit in person',
    priceNote: 'Price and availability are confirmed by Cantina Cana.',
    alt: 'The closed gift box, the 750 ml wine bottle, the 40 ml orange aperitif, the recipe booklet and a steaming glass of mulled wine arranged together.',
  },
  footer: {
    replay: 'Replay the ritual',
    website: 'Website',
    instagram: 'Instagram',
    responsible: 'Contains alcohol. Please enjoy responsibly.',
    links: 'Brand links',
  },
};

const ar: Strings = {
  meta: {
    title: 'مجموعة النبيذ الساخن من كانتينا كانا | طقوس شتوية دافئة',
    description: 'نبيذ أحمر، توابل عطرة، ولمسة من البرتقال، جُمعت بعناية في علبة واحدة.',
  },
  nav: {
    ritual: 'الطقوس',
    inside: 'داخل العلبة',
    recipe: 'الوصفة',
    cta: 'احصل على المجموعة',
    menu: 'القائمة',
    close: 'إغلاق القائمة',
    primary: 'التنقل الرئيسي',
    home: 'كانتينا كانا، العودة إلى الأعلى',
    skipToContent: 'انتقل إلى المحتوى',
  },
  lang: { switchTo: 'English', label: 'تغيير اللغة إلى الإنجليزية' },
  hero: {
    eyebrow: 'مجموعة النبيذ الساخن',
    title: 'طقوس شتوية دافئة.',
    body: 'نبيذ أحمر، توابل عطرة، ولمسة من البرتقال. جُمعت بعناية في علبة واحدة، جاهزة للمشاركة.',
    primary: 'اكتشف الطقوس',
    secondary: 'استكشف المجموعة',
    scroll: 'مرّر للأسفل',
    alt: 'علبة هدايا كانتينا كانا العنّابية المغلقة لمجموعة النبيذ الساخن، مطبوعة بالذهبي مع زجاجة نبيذ وزجاجة صغيرة وبرتقال مجفف وقرفة ويانسون نجمي.',
  },
  story: {
    heading: 'الطقوس في ستة فصول',
    chapterWord: 'الفصل',
    of: 'من',
    chaptersNav: 'فصول الطقوس',
    skip: 'تخطَّ الحركة',
    chapters: [
      {
        title: 'افتح قليلًا من الدفء.',
        body: `ارفع الغطاء لتجد زجاجة نبيذ أحمر جاف، توابل الشتاء، برتقالًا مجففًا، وزجاجة صغيرة من ${spirit.inSentence.ar}. افتح النبيذ لتبدأ.`,
        alt: 'علبة الهدايا مفتوحة: زجاجة النبيذ على اليسار، وكتيّب الوصفة والبرتقال المجفف والزجاجة الصغيرة والقرفة والفتاحة في الأقسام على اليمين.',
      },
      {
        title: 'ابدأ بالنبيذ.',
        body: 'اسكب زجاجة النبيذ الأحمر كاملة (750 مل) في طنجرة.',
        alt: 'الزجاجة المفتوحة تسكب خيطًا من النبيذ الأحمر الداكن في طنجرة.',
      },
      {
        title: 'دع التوابل تروي حكايتها.',
        body: 'أضف شرائح البرتقال المجفف، أعواد القرفة، اليانسون النجمي، الهيل، والقرنفل، ثم اخلطهم مع النبيذ.',
        alt: 'شرائح البرتقال المجفف وأعواد القرفة واليانسون النجمي والهيل والقرنفل تسقط من أكياسها في النبيذ.',
      },
      {
        title: 'دفء هادئ. عبير غني.',
        body: 'سخّن الخليط على نار هادئة لمدة 15 دقيقة تقريبًا، وحرّكه من وقت لآخر حتى تمتزج النكهات.',
        note: 'انتبه، لا تتركه يغلي!',
        alt: 'الطنجرة فوق موقد يتوهّج بهدوء، وخيوط رقيقة من البخار تتصاعد بينما تحرّك ملعقة خشبية الخليط.',
      },
      {
        title: 'اللمسة الأخيرة.',
        body: `أطفئ النار، أضف ${spirit.recipeReference.ar} وحرّك الخليط. اتركه لمدة 8 دقائق إضافية حتى تمتزج النكهات أكثر.`,
        alt: 'بعد إطفاء الموقد، تسكب الزجاجة الصغيرة خيطًا كهرمانيًا من مشروب البرتقال في النبيذ.',
      },
      {
        title: 'اسكب. صفِّ. شارك.',
        body: 'صفِّ المشروب عبر مصفاة ناعمة في كأس مقاوم للحرارة، وقدّمه دافئًا.',
        note: 'أضف السكر حسب الرغبة، ينصح بملعقة صغيرة لكل كوب.',
        alt: 'الطنجرة تسكب عبر مصفاة ناعمة في كأس كريستال بمقبض، ويبقى البرتقال والتوابل الكاملة في المصفاة.',
      },
    ],
    ingredients: { orange: 'برتقال مجفف', cinnamon: 'أعواد القرفة', star: 'اليانسون النجمي', cardamom: 'الهيل', clove: 'القرنفل' },
    cues: {
      lowHeat: 'نار هادئة',
      minutes15: '15 دقيقة تقريبًا',
      doNotBoil: 'لا تتركه يغلي',
      heatOff: 'النار مطفأة',
      rest: 'اتركه يرتاح',
      minutes8: '8 دقائق',
    },
    finale: {
      line: 'صُنع بعناية. يُشارَك بدفء.',
      note: 'أضف السكر حسب الرغبة، ينصح بملعقة صغيرة لكل كوب. قدّمه دافئًا وصحة وهنا!',
      alt: 'كأس كريستال بمقبض من النبيذ الساخن يتصاعد منه قليل من البخار.',
    },
    loading: 'جارٍ تحضير المشهد',
    stillsBecauseMotion: 'تفضّل تقليل الحركة، لذلك تُعرض الطقوس كصور ثابتة.',
    stillsBecauseWebgl: 'الرسوم ثلاثية الأبعاد غير متاحة على هذا الجهاز، لذلك تُعرض الطقوس كصور ثابتة.',
    playAnimated: 'تشغيل الحركة مع التمرير',
    showStills: 'عرض الصور الثابتة',
  },
  kit: {
    eyebrow: 'داخل مجموعتك',
    title: 'داخل العلبة',
    intro: 'كل ما تحتاجه الوصفة، مجموعًا في علبة عنّابية واحدة.',
    included: 'ضمن المجموعة',
    alt: 'علبة الهدايا مفتوحة ومحتوياتها مصفوفة أمامها: زجاجة النبيذ، الزجاجة الصغيرة، كتيّب الوصفة، شرائح البرتقال المجفف، اليانسون النجمي، الهيل، القرنفل، أعواد القرفة، والفتاحة.',
  },
  recipe: {
    eyebrow: 'الوصفة',
    title: 'طريقة التحضير',
    intro: 'خمس خطوات من الكتيّب المرفق بمجموعتك.',
    stepWord: 'الخطوة',
    steps: [
      { title: 'اسكب', body: 'اسكب النبيذ الأحمر كاملة في طنجرة.' },
      { title: 'اخلط', body: 'أضف شرائح البرتقال المجفف، أعواد القرفة، اليانسون النجمي، الهيل، والقرنفل، ثم اخلطهم مع النبيذ.' },
      {
        title: 'سخّن',
        body: 'سخّن الخليط على نار هادئة لمدة 15 دقيقة تقريبًا، وحرّكه من وقت لآخر حتى تمتزج النكهات.',
        warning: 'انتبه، لا تتركه يغلي!',
      },
      {
        title: 'اتركه يرتاح',
        body: `أطفئ النار، أضف ${spirit.recipeReference.ar} وحرّك الخليط. اتركه لمدة 8 دقائق إضافية حتى تمتزج النكهات أكثر.`,
      },
      {
        title: 'قدّم وشارك',
        body: 'أضف السكر حسب الرغبة، ينصح بملعقة صغيرة لكل كوب. قدّمه دافئًا وصحة وهنا!',
      },
    ],
    timeTitle: 'الوقت',
    time: 'نحو 15 دقيقة على نار هادئة، ثم 8 دقائق من الراحة.',
    needTitle: 'ما ستحتاجه',
    fromKit: 'من المجموعة',
    fromKitList: `750 مل من النبيذ الأحمر الجاف، شرائح البرتقال المجفف، أعواد القرفة، اليانسون النجمي، الهيل، القرنفل، 40 مل من ${spirit.inSentence.ar}، وفتاحة النبيذ.`,
    fromKitchen: 'من مطبخك',
    fromKitchenList: 'طنجرة، ملعقة، مصفاة ناعمة، وكؤوس أو أكواب مقاومة للحرارة. والسكر حسب الرغبة.',
    read: 'اقرأ كتيّب الوصفة',
    pdfNote: 'PDF',
    bookletAlt: 'صفحتا طريقة التحضير في كتيّب وصفات كانتينا كانا، بالإنجليزية والعربية.',
  },
  order: {
    title: 'اسكب. تبّل. سخّن.',
    body: 'وشارك لحظات دافئة معًا.',
    cta: 'احصل على المجموعة',
    ctaOnline: 'اطلب عبر الإنترنت',
    howTitle: 'طريقة الطلب',
    howBody: 'هذه الصفحة لا تستقبل طلبات أو مدفوعات. لشراء مجموعة النبيذ الساخن، تواصل مع كانتينا كانا مباشرة:',
    website: 'زُر الموقع الإلكتروني',
    instagram: 'راسلنا على إنستغرام',
    boutique: 'زُرنا شخصيًا',
    priceNote: 'السعر والتوفّر يؤكَّدان من كانتينا كانا.',
    alt: 'علبة الهدايا المغلقة وزجاجة النبيذ سعة 750 مل وزجاجة الأبيريتيف سعة 40 مل وكتيّب الوصفة وكأس نبيذ ساخن يتصاعد منه البخار، مرتّبة معًا.',
  },
  footer: {
    replay: 'أعد الطقوس من البداية',
    website: 'الموقع الإلكتروني',
    instagram: 'إنستغرام',
    responsible: 'يحتوي على كحول. استمتع بمسؤولية.',
    links: 'روابط العلامة',
  },
};

export const strings: Record<Lang, Strings> = { en, ar };
