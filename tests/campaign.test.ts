import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTERS, findSubLevel } from '../src/campaign/chapters';
import { homeObject, KNOWN_MARVELS } from '../src/campaign/home';
import { applyEffects, beginAttempt, canSpend, dreamSkin, ending, endingNotes, fadeCommozione, graceTier, keepAttemptTime, loadCampaign, METER_MAX, METER_START, migrateV1, newCampaign, saveCampaign, spend, STORY_VERSION, UNKNOWN_BACKUP_KEY, unshakeable, V1_BACKUP_KEY } from '../src/campaign/state';
import { STORY } from '../src/config';
import { optionView } from '../src/story/steps';
import { CHAPTER_TITLES } from '../src/campaign/titles';
import { STORY_MAPS, THEMES } from '../src/story/maps';
import { parseAsciiMap } from '../src/world/level';

describe('campaign state rules', () => {
  it('clamps meters and reports real changes only', () => {
    const s = newCampaign();
    const changes = applyEffects(s, { commozione: 500, grace: -500 });
    expect(s.meters.commozione).toBe(METER_MAX);
    expect(s.meters.grace).toBe(0);
    expect(changes.map((c) => c.label)).toEqual(['+80 COMMOZIONE', '-70 GRACE']);
    expect(applyEffects(s, { commozione: 10 })).toEqual([]);
  });

  it('keeps the book unique and labels in uppercase', () => {
    const s = newCampaign();
    const first = applyEffects(s, { marvel: ['THE GALLEYS', 'THE GALLEYS'], value: 'Kept oaths', item: 'A rag cross' });
    expect(s.book.marvels).toEqual(['THE GALLEYS']);
    expect(first.map((c) => c.label)).toEqual(['MARVEL: THE GALLEYS', 'GOT: A RAG CROSS', 'VALUE: KEPT OATHS']);
    expect(applyEffects(s, { value: 'Kept oaths' })).toEqual([]);
  });

  it('spends commozione only when he is moved enough', () => {
    const s = newCampaign();
    expect(canSpend(s, 'commozione', 21)).toBe(false);
    expect(spend(s, 'commozione', 21)).toBe(false);
    expect(spend(s, 'commozione', 20)).toBe(true);
    expect(s.meters.commozione).toBe(0);
  });

  it('decides the ending at 7.8 and the costume from unlocks', () => {
    const s = newCampaign();
    expect(ending(s)).toBe('alpha');
    applyEffects(s, { flags: { oath: 'enforced' } });
    expect(ending(s)).toBe('knight');
    expect(dreamSkin(s)).toBe('zampano');
    // Taking the cross (1.5) is enough for the dream to put him in armour; arms come at 2.3.
    applyEffects(s, { unlock: 'cross' });
    expect(dreamSkin(s)).toBe('zampanoKnight');
    applyEffects(s, { unlock: 'knight' });
    expect(dreamSkin(s)).toBe('zampanoKnight');
    expect(unshakeable(s)).toBe(false);
    applyEffects(s, { supervillain: 200 });
    expect(unshakeable(s)).toBe(true);
  });
});

describe('meters with consequences', () => {
  it('fades Commozione only in the dream levels (2-7), never below zero', () => {
    const s = newCampaign();
    expect(fadeCommozione(s, 1)).toBe(0);
    expect(fadeCommozione(s, 3)).toBe(STORY.COMMOZIONE_FADE);
    expect(s.meters.commozione).toBe(20 - STORY.COMMOZIONE_FADE);
    expect(fadeCommozione(s, 8)).toBe(0);
    s.meters.commozione = 1;
    expect(fadeCommozione(s, 5)).toBe(1);
    expect(s.meters.commozione).toBe(0);
  });

  it('lets Standing decide how the camp remembers him', () => {
    const s = newCampaign();
    s.meters.standing = 20;
    expect(endingNotes(s)[1]).toMatch(/MARSHAL REMEMBERS/);
    s.meters.standing = STORY.STANDING.FAIR;
    expect(endingNotes(s)[1]).toMatch(/MORE OR LESS/);
    s.meters.standing = 100;
    expect(endingNotes(s)[1]).toMatch(/FONDLY/);
  });

  it('shows Grace (the forms he swore to) in the telling and the ending', () => {
    const s = newCampaign();
    s.meters.grace = STORY.GRACE.HIGH;
    expect(graceTier(s)).toBe('high');
    s.meters.grace = STORY.GRACE.LOW;
    expect(graceTier(s)).toBe('mid');
    s.meters.grace = 0;
    expect(graceTier(s)).toBe('low');
    expect(endingNotes(s)[0]).toMatch(/BROKE THE FORMS HE SWORE TO/);
    s.meters.grace = 100;
    expect(endingNotes(s)[0]).toMatch(/KEPT THE FORMS HE SWORE TO/);
    expect(endingNotes(s)).toHaveLength(2);
  });

  it('locks costly choices when he is unmoved, and shows the cost', () => {
    const s = newCampaign();
    s.meters.commozione = 5;
    const o = { label: 'WE DEFY YOU.', cost: 10 };
    expect(optionView(o, s)).toEqual({ label: 'WE DEFY YOU.', locked: 'TOO UNMOVED: NEEDS 10 COMMOZIONE' });
    s.meters.commozione = 10;
    expect(optionView(o, s)).toEqual({ label: 'WE DEFY YOU.  (-10 COMMOZIONE)' });
    expect(optionView({ label: 'FREE' }, s)).toEqual({ label: 'FREE' });
  });
});

describe('VG1 campaign data', () => {
  it('has the eight levels in order with their titles', () => {
    expect(CHAPTERS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(CHAPTERS.map((c) => c.title)).toEqual([...CHAPTER_TITLES]);
    expect(CHAPTER_TITLES[0]).toBe('The Greenzone');
    expect(CHAPTER_TITLES[7]).toBe('Back to the Greenzone');
  });

  it('numbers sub-levels n.1, n.2 ... with unique ids (36, plus the 1.0 Green Zone walk)', () => {
    const ids = CHAPTERS.flatMap((c) => c.subLevels.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(37);
    expect(CHAPTERS.map((c) => c.subLevels.length)).toEqual([6, 3, 4, 3, 5, 3, 9, 4]);
    expect(ids[0]).toBe('1.0');
    expect(CHAPTERS[0]!.subLevels[0]!.greenZone).toBe(1);
    for (const c of CHAPTERS) c.subLevels.filter((s) => !s.greenZone).forEach((s, k) => expect(s.id).toBe(`${c.number}.${k + 1}`));
    expect(findSubLevel('7.3')?.chapter.number).toBe(7);
    expect(findSubLevel('9.1')).toBeNull();
  });

  it('gives every sub-level a script, a "what happens" and a source', () => {
    for (const c of CHAPTERS) {
      expect(c.professor.text.length).toBeGreaterThan(10);
      expect(THEMES[c.theme]).toBeDefined();
      for (const s of c.subLevels) {
        expect(s.happens, s.id).toBe(s.happens.toUpperCase());
        expect(s.source.length, s.id).toBeGreaterThan(5);
        if (s.greenZone) continue;
        const steps = s.script();
        expect(steps.length, s.id).toBeGreaterThan(1);
        // Scripts are rebuilt every time they are played.
        expect(s.script()).not.toBe(steps);
      }
    }
  });

  it('parses every story map and its theme', () => {
    for (const [key, def] of Object.entries(STORY_MAPS)) {
      const m = parseAsciiMap(def.rows, { base: def.base, requireExit: false });
      expect(m.width, key).toBe(def.rows[0]!.length);
      expect(THEMES[def.theme], key).toBeDefined();
    }
  });

  it('turns every marvel the dream can award into an object at home (8.2)', () => {
    const dir = 'src/campaign/chapters';
    const awarded = new Set<string>();
    for (const f of readdirSync(dir)) {
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      for (const m of src.matchAll(/marvel: (?:'([^']+)'|"([^"]+)")/g)) awarded.add((m[1] ?? m[2])!);
    }
    expect(awarded.size).toBeGreaterThan(10);
    for (const m of awarded) expect(KNOWN_MARVELS, m).toContain(m);
    expect(awarded).toContain("THE PALACE OF THE LION'S MOUTH");
    expect(awarded).toContain('AN EMPTY PEDESTAL');
    expect(homeObject('THE HIPPODROME')).toBe('THE RUG (IT IS A RACETRACK)');
    expect(homeObject('AN EMPTY PEDESTAL')).toBe('AN EMPTY SPOT ON THE SHELF');
    expect(homeObject('THE MOON')).toBe('A SOUVENIR OF MOON');
  });
});

/** A localStorage stand-in for the tests (storage.ts reads globalThis.localStorage). */
function memoryStorage(): Map<string, string> {
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
  return mem;
}

/** A version-1 save (the anthology dream) as the game wrote it: storage key and JSON shape. */
function v1Save(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    completed: ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '6.4', '7.8'],
    meters: { commozione: 55, supervillain: 70, grace: 30, standing: 80 },
    flags: { pawOffered: true, longWay: false, santinaBall: 'kept', reenacted: true, oath: 'enforced', blackHole24: true },
    book: {
      marvels: ['THE DROMONS', 'THE HERMIT'],
      items: ['A RELIC'],
      values: ['Forms matter'],
      remembered: ['THERE WAS A GATE, AND IT WAS A CHIHUAHUA.', 'THERE WAS A FALCON, AND IT WAS A KING.'],
      shards: ['A FLEET BOUGHT ON CREDIT', 'A SHARD OF HATTIN'],
    },
    abilities: ['cross', 'knight', 'sermon'],
    coins: 17,
    playTime: 3600,
    savedAt: 1_700_000_000_000,
    ...over,
  };
}

describe('saves from before the Fourth Crusade rewrite (version 1)', () => {
  it('keeps the walk and the unchanged neighborhood scenes, and starts the dream again at 1.1', () => {
    const s = migrateV1(v1Save());
    expect(s.version).toBe(STORY_VERSION);
    expect(s.completed).toEqual(['1.0', '1.2', '1.3', '1.4']);
    expect(s.flags).toEqual({ pawOffered: true, longWay: false, santinaBall: 'kept' });
    expect(s.book.shards).toEqual(['A FLEET BOUGHT ON CREDIT']);
    expect(s.book.remembered).toEqual(['THERE WAS A GATE, AND IT WAS A CHIHUAHUA.']);
    expect(s.book.marvels).toEqual([]);
    expect(s.book.items).toEqual([]);
    expect(s.book.values).toEqual([]);
    expect(s.coins).toBe(17);
    expect(s.playTime).toBe(3600);
    expect(s.savedAt).toBe(1_700_000_000_000);
    expect(s.notice).toBe('dream-rewritten');
  });

  it('resets the meters and the costume: the rag cross and the armour are earned again', () => {
    const s = migrateV1(v1Save());
    expect(s.abilities).toEqual([]);
    expect(dreamSkin(s)).toBe('zampano');
    // The kept 1.3 choice (offering the paw) keeps its own small cost.
    expect(s.meters).toEqual({ ...METER_START, supervillain: METER_START.supervillain - 3 });
    expect(migrateV1(v1Save({ flags: {} })).meters).toEqual(METER_START);
    expect(ending(s)).toBe('alpha');
  });

  it('says nothing when no played scene is lost', () => {
    expect(migrateV1(v1Save({ completed: ['1.0', '1.2'] })).notice).toBeNull();
    const empty = migrateV1(v1Save({ completed: [] }));
    expect(empty.notice).toBeNull();
    expect(empty.completed).toEqual([]);
    expect(empty.flags).toEqual({});
  });

  it('counts the Green Zone walk (1.0) as done in saves made before it became part of the story', () => {
    expect(migrateV1(v1Save({ completed: ['1.1', '1.2'] })).completed).toEqual(['1.0', '1.2']);
  });

  it('survives damaged saves', () => {
    const s = migrateV1({ version: 1, completed: 'nope', coins: -4, playTime: Number.NaN } as never);
    expect(s.completed).toEqual([]);
    expect(s.coins).toBe(0);
    expect(s.playTime).toBe(0);
  });

  it('migrates once on load, keeps the old save aside untouched, and remembers the notice until it is shown', () => {
    const mem = memoryStorage();
    const raw = v1Save();
    mem.set('supervillained:story', JSON.stringify(raw));
    const s = loadCampaign();
    expect(s.version).toBe(2);
    expect(s.completed).toEqual(['1.0', '1.2', '1.3', '1.4']);
    expect(JSON.parse(mem.get(`supervillained:${V1_BACKUP_KEY}`)!)).toEqual(raw);
    expect(JSON.parse(mem.get('supervillained:story')!).version).toBe(2);
    // Loading again neither migrates again nor overwrites the backup.
    expect(loadCampaign()).toEqual(s);
    expect(loadCampaign().notice).toBe('dream-rewritten');
    // The flow clears the notice once it has shown it.
    s.notice = null;
    saveCampaign(s);
    expect(loadCampaign().notice).toBeNull();
    expect(JSON.parse(mem.get(`supervillained:${V1_BACKUP_KEY}`)!)).toEqual(raw);
  });
});

describe('saved stories', () => {
  it('round-trips a version-2 save and ignores unknown versions', () => {
    const mem = memoryStorage();
    const s = newCampaign();
    s.completed = ['1.0', '1.1', '2.1'];
    applyEffects(s, { unlock: 'cross', marvel: 'THE GALLEYS', flags: { comradeship: true } });
    saveCampaign(s);
    const back = loadCampaign();
    expect(back.completed).toEqual(['1.0', '1.1', '2.1']);
    expect(back.abilities).toEqual(['cross']);
    expect(back.book.marvels).toEqual(['THE GALLEYS']);
    expect(back.flags.comradeship).toBe(true);
    expect(back.notice).toBeNull();
    mem.set('supervillained:story', JSON.stringify({ version: 99, completed: ['1.0'] }));
    expect(loadCampaign().completed).toEqual([]);
  });

  it('keeps a save it does not know (a newer game) aside untouched before starting afresh', () => {
    const mem = memoryStorage();
    const newer = { version: 99, completed: ['1.0', '1.1', '9.9'], meters: { resolve: 12 }, playTime: 7200 };
    mem.set('supervillained:story', JSON.stringify(newer));
    const s = loadCampaign();
    expect(s).toEqual(newCampaign());
    expect(JSON.parse(mem.get(`supervillained:${UNKNOWN_BACKUP_KEY}`)!)).toEqual(newer);
    // The fresh campaign is saved over it; the backup stays.
    saveCampaign(s);
    expect(JSON.parse(mem.get('supervillained:story')!).version).toBe(STORY_VERSION);
    expect(loadCampaign().completed).toEqual([]);
    expect(JSON.parse(mem.get(`supervillained:${UNKNOWN_BACKUP_KEY}`)!)).toEqual(newer);
  });

  it('keeps the first unknown save: a later one does not overwrite the backup', () => {
    const mem = memoryStorage();
    const first = { version: 99, completed: ['1.0', '1.1'] };
    mem.set('supervillained:story', JSON.stringify(first));
    loadCampaign();
    // A damaged save with no version at all is not known either.
    mem.set('supervillained:story', JSON.stringify({ completed: ['1.0'], coins: 3 }));
    expect(loadCampaign().completed).toEqual([]);
    mem.set('supervillained:story', JSON.stringify({ version: '2', completed: ['1.0'] }));
    expect(loadCampaign().completed).toEqual([]);
    expect(JSON.parse(mem.get(`supervillained:${UNKNOWN_BACKUP_KEY}`)!)).toEqual(first);
  });

  it('keeps nothing aside for an empty storage or for the saves it knows', () => {
    const mem = memoryStorage();
    expect(loadCampaign()).toEqual(newCampaign());
    expect(mem.size).toBe(0);
    const s = newCampaign();
    s.completed = ['1.0'];
    saveCampaign(s);
    expect(loadCampaign().completed).toEqual(['1.0']);
    mem.set('supervillained:story', JSON.stringify(v1Save()));
    expect(loadCampaign().completed).toEqual(['1.0', '1.2', '1.3', '1.4']);
    expect(mem.has(`supervillained:${UNKNOWN_BACKUP_KEY}`)).toBe(false);
  });
});

describe('attempts at a sub-level (RESTART SCENE, QUIT TO TITLE, SKIP SCENE)', () => {
  /** What one attempt at 6.1 does: the feeling fades, he shares his half loaf (a costly choice). */
  function playShareTheLoaf(attempt: ReturnType<typeof newCampaign>, seconds: number): void {
    fadeCommozione(attempt, 6);
    spend(attempt, 'commozione', 10);
    applyEffects(attempt, { supervillain: 8, value: 'Comradeship', flags: { comradeship: true } });
    attempt.playTime += seconds;
  }

  it('leaves the campaign untouched until the scene is finished', () => {
    const campaign = newCampaign();
    campaign.meters.commozione = 40;
    const attempt = beginAttempt(campaign);
    playShareTheLoaf(attempt, 30);
    expect(campaign.meters).toEqual({ ...METER_START, commozione: 40 });
    expect(campaign.flags).toEqual({});
    expect(campaign.book.values).toEqual([]);
  });

  it('counts a restarted scene once: the choices, the cost and the fade of the attempt that finishes', () => {
    let campaign = newCampaign();
    campaign.meters.commozione = 40;
    const once = beginAttempt(campaign);
    playShareTheLoaf(once, 30);

    // First attempt abandoned half way (RESTART SCENE), then played to the end.
    const first = beginAttempt(campaign);
    playShareTheLoaf(first, 20);
    keepAttemptTime(campaign, first);
    const second = beginAttempt(campaign);
    playShareTheLoaf(second, 10);
    campaign = second; // finished: the attempt becomes the campaign

    expect(campaign.meters).toEqual(once.meters);
    expect(campaign.book.values).toEqual(['Comradeship']);
    expect(campaign.playTime).toBe(30); // both attempts' time is played time
  });

  it('keeps only the time played when an attempt is abandoned, never less than what was saved', () => {
    const campaign = newCampaign();
    campaign.playTime = 100;
    const attempt = beginAttempt(campaign);
    playShareTheLoaf(attempt, 12);
    keepAttemptTime(campaign, attempt);
    expect(campaign.playTime).toBe(112);
    expect(campaign.meters).toEqual(METER_START);
    keepAttemptTime(campaign, newCampaign());
    expect(campaign.playTime).toBe(112);
  });

  it('plays an attempt on its own copy: nested book lists and flags are not shared', () => {
    const campaign = newCampaign();
    applyEffects(campaign, { marvel: 'THE GALLEYS' });
    const attempt = beginAttempt(campaign);
    applyEffects(attempt, { marvel: 'THE HORSES OF SAINT MARK', flags: { x: 1 } });
    expect(campaign.book.marvels).toEqual(['THE GALLEYS']);
    expect(campaign.flags).toEqual({});
  });
});

describe('period words in the dialogue', () => {
  it('colours whole period words only, longest first, as the line is typed', async () => {
    const { oldWordRanges, withOldWords, OLD_WORD_COLOR } = await import('../src/story/names');
    const line = 'NOBODY SAYS CRUSADE, BROTHER. IT IS THE HOLY VOYAGE. AND WE ARE PILGRIMS.';
    const r = oldWordRanges(line);
    expect(r.map(([a, b]) => line.slice(a, b))).toEqual(['THE HOLY VOYAGE', 'PILGRIMS']);
    // Not inside another word.
    expect(oldWordRanges('UNROMANSLIKE LATINSKI')).toEqual([]);
    const all = withOldWords(line, line.length, '#fff');
    expect(all.map((s) => s.text).join('')).toBe(line);
    expect(all.filter((s) => s.color === OLD_WORD_COLOR).map((s) => s.text)).toEqual(['THE HOLY VOYAGE', 'PILGRIMS']);
    // Half typed: the visible part of the word is already coloured.
    const half = withOldWords(line, line.indexOf('VOYAGE'), '#fff');
    expect(half.map((s) => s.text).join('')).toBe(line.slice(0, line.indexOf('VOYAGE')));
    expect(half[half.length - 1]).toEqual({ text: 'THE HOLY ', color: OLD_WORD_COLOR });
  });

  it('every period word is spoken somewhere in the dream', () => {
    const dir = 'src/campaign/chapters';
    const all = readdirSync(dir)
      .map((f) => readFileSync(`${dir}/${f}`, 'utf8'))
      .join('\n')
      .replace(/\\'/g, "'");
    return import('../src/story/names').then(({ OLD_WORDS }) => {
      for (const w of OLD_WORDS) expect(all, w).toContain(w);
    });
  });
});
