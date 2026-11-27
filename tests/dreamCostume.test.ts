import { describe, expect, it } from 'vitest';
import { CHARACTERS, DREAM_ARMOUR, PLAY_AS, type CharacterKey } from '../src/assets/manifest';
import { dreamCostume, isDreamChapter } from '../src/campaign/state';

/** The owner's decision: in the dream the cast show their armoured sheets. */
const ARMOUR: Array<[CharacterKey, CharacterKey]> = [
  ['jack', 'jackKnight'],
  ['watson', 'watsonKnight'],
  ['santina', 'santinaKnight'],
  ['confusione', 'confusioneKnight'],
  ['sbrimbrulon', 'sbrimbrulonKnight'],
];
const DREAM = [2, 3, 4, 5, 6, 7];

describe('the dream (levels 2 to 7)', () => {
  it('is levels 2 to 7, not the lawn (1) or the study (8)', () => {
    expect(DREAM.every(isDreamChapter)).toBe(true);
    for (const c of [0, 1, 8, 9]) expect(isDreamChapter(c)).toBe(false);
  });
});

describe('dreamCostume', () => {
  it('dresses every cast member with an armoured sheet in armour, in every dream level', () => {
    for (const chapter of DREAM) for (const [plain, armoured] of ARMOUR) expect(dreamCostume(plain, chapter)).toBe(armoured);
  });

  it('leaves the cast plain on the lawn and in the study (levels 1 and 8)', () => {
    for (const chapter of [1, 8]) for (const [plain] of ARMOUR) expect(dreamCostume(plain, chapter)).toBe(plain);
  });

  it('leaves armoured keys, Bagnaskiz, Zampanò, the rest of the cast and the special figures alone', () => {
    const untouched = [
      ...ARMOUR.map(([, armoured]) => armoured),
      'bagnaskiz', 'bagnaskizMarshal', 'bagnaskizEmperor',
      'zampano', 'zampanoCross', 'zampanoKnight',
      'doge', 'niketas', 'fulk', 'pilgrim', 'knight', 'householdWoman', 'prince', 'varangian', 'crowdA', 'hound', 'cat',
      'legs', 'fortune', 'falcon', 'stag',
    ];
    for (const chapter of [1, ...DREAM, 8]) for (const key of untouched) expect(dreamCostume(key, chapter)).toBe(key);
  });

  it('never dresses a second copy of the dog the player is (?as=)', () => {
    // Played as Sbrimbrulòn he already wears his armour: a plain Sbrimbrulòn in a script stays plain.
    expect(dreamCostume('sbrimbrulon', 3, 'sbrimbrulon')).toBe('sbrimbrulon');
    // The scripts' own armoured Pierre is still theirs to place.
    expect(dreamCostume('sbrimbrulonKnight', 3, 'sbrimbrulon')).toBe('sbrimbrulonKnight');
    // Everyone else is dressed as usual, whoever is played.
    for (const playAs of PLAY_AS) {
      for (const [plain, armoured] of ARMOUR) {
        if (plain === playAs) continue;
        expect(dreamCostume(plain, 5, playAs)).toBe(armoured);
      }
    }
  });

  it('maps exactly the delivered armoured sheets, with the same actions as the plain ones', () => {
    expect(Object.entries(DREAM_ARMOUR).sort()).toEqual([...ARMOUR].sort());
    for (const [plain, armoured] of ARMOUR) {
      expect(CHARACTERS[armoured].sheet).toBe(`sprites/${armoured}.png`);
      // An actor keeps doing what the script asks (sit after 3 s, fetch, hurt...) in his armour.
      expect(Object.keys(CHARACTERS[armoured].anims)).toEqual(Object.keys(CHARACTERS[plain].anims));
      expect(CHARACTERS[armoured].frameW).toBe(CHARACTERS[plain].frameW);
      expect(CHARACTERS[armoured].anchorY).toBe(CHARACTERS[plain].anchorY);
    }
  });
});
