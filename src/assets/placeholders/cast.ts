import { BAGNASKIZ_SPEC, CAT_SPEC, ZAMPANO_SPEC, type CritterSpec } from './critters';

/**
 * Placeholder looks for the whole cast (see the VG1 design: "the animals stay animals; armour is
 * costume"). Every entry is a variation of the three base drawers: Maltese, pug and cat.
 */

const DOG: CritterSpec = {
  ...ZAMPANO_SPEC,
  fluffy: false,
  bodyR: 6.6,
  headR: 6,
  colors: { ...ZAMPANO_SPEC.colors },
};

function dog(colors: Partial<CritterSpec['colors']>, extra: Partial<CritterSpec> = {}): CritterSpec {
  return { ...DOG, ...extra, colors: { ...DOG.colors, ...colors } };
}

function recolor(base: string, shade: string, deep: string, outline = '#2a1e18'): Partial<CritterSpec['colors']> {
  return { base, shade, deep, outline };
}

export const CAST_SPECS: Record<string, CritterSpec> = {
  zampano: ZAMPANO_SPEC,
  bagnaskiz: BAGNASKIZ_SPEC,
  cat: CAT_SPEC,
  /** After 1.5: the rag cross sewn on his coat. */
  zampanoCross: { ...ZAMPANO_SPEC, costume: 'cross' },
  /** After 2.5 (Fortune's hands): helm and tabard. */
  zampanoKnight: { ...ZAMPANO_SPEC, costume: 'tabard', hat: 'helm', hatColor: '#aab4c4' },
  /** Shih-tzu, the model of a knight: long golden coat, red topknot. */
  sbrimbrulon: {
    ...ZAMPANO_SPEC,
    colors: { ...ZAMPANO_SPEC.colors, ...recolor('#f6e2b8', '#dcbc84', '#b48a50', '#3a2a18') },
    muzzle: '#7a5430',
    topknot: '#e02040',
  },
  /** Fallback only; the delivered PNG supplies the reference-matching knight art. */
  sbrimbrulonKnight: {
    ...ZAMPANO_SPEC,
    colors: { ...ZAMPANO_SPEC.colors, ...recolor('#bc7836', '#473022', '#071e1b', '#071e1b') },
    marks: 'patches', markColor: '#fff3d9', muzzle: '#fff3d9', eyes: 'big',
    costume: 'tabard', hat: 'helm', hatColor: '#99959a',
  },
  /** Mad chihuahua: small, fawn, huge pointy ears, big eyes. */
  jack: {
    ...DOG,
    bodyR: 5.2,
    headR: 5.2,
    bodyLen: 3.8,
    legLen: 3.5,
    ears: 'cat',
    eyes: 'big',
    tail: 'long',
    colors: { ...DOG.colors, ...recolor('#dca868', '#b88244', '#8e5e28') },
  },
  /** Stupid, stoned Jack Russell terrier: white with brown patches, sleepy eyes. */
  watson: dog(recolor('#f8f6ee', '#d8d4c8', '#a8a294'), { marks: 'patches', markColor: '#8a5a2a', eyes: 'sleepy' }),
  /** Female Maltese with a pink bow. */
  santina: { ...ZAMPANO_SPEC, bodyR: 6.4, headR: 6.2, hat: 'bow', hatColor: '#ff6aa8' },
  /** Fighting cat full of scars. */
  confusione: {
    ...CAT_SPEC,
    colors: { ...CAT_SPEC.colors, ...recolor('#8c8c98', '#646470', '#44444e', '#16161c'), eye: '#e8d040', nose: '#e88a9a' },
    stripes: '#5a5a66',
    marks: 'scars',
  },
  /** The old, blind, very shrewd Doge. */
  doge: dog(recolor('#c4c4cc', '#9c9ca8', '#74747e'), { eyes: 'blind', hat: 'cap', hatColor: '#e8c048' }),
  /** A saintly king. */
  king: dog(recolor('#f0ece4', '#cfc8bc', '#a49c8e'), { hat: 'crown', costume: 'tabard', costumeColor: '#3a5ad0' }),
  emir: dog(recolor('#8a5a34', '#6a4224', '#4a2c16'), { hat: 'turban', hatColor: '#f4f4f4' }),
  legate: dog(recolor('#d8c8a8', '#b8a684', '#8e7c5c'), { hat: 'mitre', hatColor: '#f4f0e4' }),
  cellarer: dog(recolor('#b89870', '#967650', '#6e5434'), { hat: 'hood', hatColor: '#6a4426' }),
  clerkA: dog(recolor('#d0d0d0', '#a8a8a8', '#7c7c7c'), { hat: 'hood', hatColor: '#222230' }),
  clerkB: dog(recolor('#d0d0d0', '#a8a8a8', '#7c7c7c'), { hat: 'hood', hatColor: '#f0f0f4' }),
  /** Fulk of Neuilly, the star preacher. */
  preacher: dog(recolor('#a8845c', '#86643e', '#5e4426'), { hat: 'hood', hatColor: '#4a3020', eyes: 'big' }),
  /** The barefoot stranger walking the other way. */
  stranger: dog(recolor('#c8b090', '#a68e6e', '#7c6648'), { hat: 'hood', hatColor: '#7a5a34' }),
  lady: dog(recolor('#f4ece8', '#d8ccc8', '#b0a49e'), { hat: 'veil', hatColor: '#c890e0' }),
  greek: dog(recolor('#5a4434', '#423226', '#2c2018'), { hat: 'cap', hatColor: '#8a2ab0' }),
  knight: dog(recolor('#d0b890', '#b09670', '#86704e'), { hat: 'helm', hatColor: '#aab4c4', costume: 'tabard' }),
  varangian: { ...BAGNASKIZ_SPEC, colors: { ...BAGNASKIZ_SPEC.colors, ...recolor('#c8a070', '#a07c50', '#785a34') }, muzzle: undefined, hat: 'helm', hatColor: '#8890a0' },
  marquis: dog(recolor('#e8e0d4', '#c8bcac', '#a09482'), { hat: 'cap', hatColor: '#d03030', costume: 'tabard', costumeColor: '#e8d8a0' }),
  prince: { ...DOG, bodyR: 5.6, headR: 5.6, hat: 'crown', colors: { ...DOG.colors, ...recolor('#f4e4c8', '#d8c4a0', '#b09c78') } },
  burgher: dog(recolor('#b4a090', '#948070', '#6c5a4c'), { hat: 'cap', hatColor: '#3a6a3a' }),
  crowdA: dog(recolor('#d8c09c', '#b89c78', '#8e7656'), { costume: 'cross' }),
  crowdB: dog(recolor('#8a6a4a', '#6a4e32', '#4a3420'), { marks: 'patches', markColor: '#f0e8dc' }),
  crowdC: dog(recolor('#3c3c44', '#2a2a30', '#1a1a20', '#0c0c10'), { costume: 'cross' }),
  /** Bagnaskiz's masks: the marshal Villehardouin, then the usurping emperors. */
  bagnaskizMarshal: { ...BAGNASKIZ_SPEC, costume: 'tabard', costumeColor: '#3a5ad0', hat: 'helm', hatColor: '#aab4c4' },
  bagnaskizEmperor: { ...BAGNASKIZ_SPEC, costume: 'tabard', costumeColor: '#8a2ab0', hat: 'crown' },
  /** 2.1: the band as three beasts. */
  bear: { ...BAGNASKIZ_SPEC, hat: 'bearEars', hatColor: '#6a4428' },
  leopard: {
    ...DOG,
    bodyR: 5.2,
    headR: 5.2,
    ears: 'cat',
    tail: 'long',
    eyes: 'big',
    marks: 'spots',
    markColor: '#3a2410',
    colors: { ...DOG.colors, ...recolor('#e8c060', '#c89a3c', '#9a7020') },
  },
  hound: dog(recolor('#9a7a5a', '#7a5c40', '#563e28'), { marks: 'patches', markColor: '#3a2618', eyes: 'sleepy' }),
};

// Emergency fallbacks for the dedicated delivered cast. The new PNGs provide their authored
// human/dog identities; these existing generic silhouettes keep a broken download playable.
const PIXEL_CAST_FALLBACKS: Record<string, string> = {
  professor: 'clerkA', niketas: 'greek', fulk: 'preacher', clerk: 'clerkB',
  abbot: 'cellarer', envoy: 'burgher', bishop: 'legate', cook: 'cellarer',
  sailmaker: 'crowdC', householdWoman: 'lady', pilgrim: 'crowdA', venetian: 'crowdB',
};
for (const [key, source] of Object.entries(PIXEL_CAST_FALLBACKS)) {
  CAST_SPECS[key] = { ...CAST_SPECS[source]!, colors: { ...CAST_SPECS[source]!.colors } };
}

// The Jack, Watson, Santina and Confusione animation deliveries: emergency fallbacks in the colours
// of the delivered art (the deliveries' own specs), plain and in armour (helm and tabard).
CAST_SPECS.jack = {
  ...CAST_SPECS.jack!,
  colors: { ...CAST_SPECS.jack!.colors, base: '#111214', shade: '#303033', deep: '#08090a', outline: '#08090a', eye: '#eacb28', nose: '#493047' },
  muzzle: '#fff0d5',
};
CAST_SPECS.santina = {
  ...CAST_SPECS.santina!,
  colors: { ...CAST_SPECS.santina!.colors, base: '#fff8e6', shade: '#91c7bd', deep: '#438d8c', outline: '#02282a', eye: '#fff8e6', nose: '#033b40' },
  stripes: undefined, muzzle: undefined, eyes: undefined, marks: undefined,
  fluffy: true, ears: 'floppy', tail: 'fluff',
  costume: undefined, hat: 'bow', hatColor: '#cc4338',
};
CAST_SPECS.confusione = {
  ...CAST_SPECS.confusione!,
  colors: { ...CAST_SPECS.confusione!.colors, base: '#ff9414', shade: '#cf6504', deep: '#8e3e02', outline: '#211208', eye: '#fff1ce', nose: '#c65e2c' },
  stripes: '#a64703', muzzle: '#ffe1aa', eyes: 'sleepy', marks: undefined,
  costume: undefined, hat: undefined,
};
for (const key of ['jack', 'watson', 'santina', 'confusione']) {
  const plain = CAST_SPECS[key]!;
  CAST_SPECS[`${key}Knight`] = { ...plain, colors: { ...plain.colors }, costume: 'tabard', hat: 'helm', hatColor: '#99959a' };
}
