import { STORY } from '../config';
import { storage } from '../core/storage';

/**
 * The story campaign's persistent state and its rules (pure, unit-tested).
 *
 * Meters (VG1 "systems taken from the board", re-anchored by the Fourth Crusade rewrite):
 *  - Commozione: filled by weeping, wonder and caring; big actions spend it; an unmoved Zampanò
 *    cannot act.
 *  - Supervillain: character; rises with nerve, comradeship and kept oaths. When full he cannot
 *    be pushed off the lawn.
 *  - Grace: the forms he swore to or was given (his vow, the pope's prohibition at Zara, the oath
 *    before the assault, declaring what he picks up). Breaking a form costs Grace even when every
 *    authority forgives. It measures his observance, not divine favour.
 *  - Standing: what the camp and its leaders think of him (dissent costs standing, not the level).
 */

export type MeterKey = 'commozione' | 'supervillain' | 'grace' | 'standing';
export type Ability = 'cross' | 'knight' | 'sermon';
export type FlagValue = string | number | boolean;

export interface Effects {
  commozione?: number;
  supervillain?: number;
  grace?: number;
  standing?: number;
  flags?: Record<string, FlagValue>;
  marvel?: string | string[];
  item?: string;
  value?: string;
  remembered?: string;
  shard?: string;
  unlock?: Ability;
  coins?: number;
}

export interface Book {
  /** Meraviglia: marvels found by looking. Each one becomes an object at home in 8.2. */
  marvels: string[];
  /** Things he carries home: the fresco, the identity card... */
  items: string[];
  /** Values learned (Comradeship, Physical courage, Kept oaths, An honest share, Resistance). */
  values: string[];
  /** The one line per dream scene that makes no sense, and is remembered. */
  remembered: string[];
  /** Scraps of the Professor's lecture, sniffed out in the study (1.2). */
  shards: string[];
}

/** Save format: 2 = the Fourth Crusade dream (docs/STORY.md); 1 = the earlier anthology dream. */
export const STORY_VERSION = 2;

/** A one-time message shown before the story continues. */
export type StoryNotice = 'dream-rewritten';

export interface CampaignState {
  version: 2;
  completed: string[];
  meters: Record<MeterKey, number>;
  flags: Record<string, FlagValue>;
  book: Book;
  abilities: Ability[];
  coins: number;
  /** Seconds played (story scenes and the Green Zone walk; replays not counted). */
  playTime: number;
  /** When it was last saved (ms since 1970), null before the first save. */
  savedAt: number | null;
  /** Shown once on CONTINUE or the story menu, then cleared (see migrateV1). */
  notice: StoryNotice | null;
}

export const METER_START: Readonly<Record<MeterKey, number>> = {
  commozione: 20,
  supervillain: 10,
  grace: 70,
  standing: 50,
};

export const METER_MAX = 100;

export function newCampaign(): CampaignState {
  return {
    version: 2,
    completed: [],
    meters: { ...METER_START },
    flags: {},
    book: { marvels: [], items: [], values: [], remembered: [], shards: [] },
    abilities: [],
    coins: 0,
    playTime: 0,
    savedAt: null,
    notice: null,
  };
}

/** A human-readable change, used for popups ("+10 COMMOZIONE"). */
export interface Change {
  label: string;
  positive: boolean;
}

const METER_LABEL: Record<MeterKey, string> = {
  commozione: 'COMMOZIONE',
  supervillain: 'SUPERVILLAIN',
  grace: 'GRACE',
  standing: 'STANDING',
};

function addUnique(list: string[], v: string): boolean {
  if (list.includes(v)) return false;
  list.push(v);
  return true;
}

/** Applies effects in place and returns what changed. */
export function applyEffects(state: CampaignState, fx: Effects): Change[] {
  const out: Change[] = [];
  for (const key of ['commozione', 'supervillain', 'grace', 'standing'] as const) {
    const d = fx[key];
    if (!d) continue;
    const before = state.meters[key];
    state.meters[key] = Math.max(0, Math.min(METER_MAX, before + d));
    const real = state.meters[key] - before;
    if (real !== 0) out.push({ label: `${real > 0 ? '+' : ''}${real} ${METER_LABEL[key]}`, positive: real > 0 });
  }
  if (fx.flags) Object.assign(state.flags, fx.flags);
  for (const m of fx.marvel === undefined ? [] : Array.isArray(fx.marvel) ? fx.marvel : [fx.marvel]) {
    if (addUnique(state.book.marvels, m)) out.push({ label: `MARVEL: ${m.toUpperCase()}`, positive: true });
  }
  if (fx.item && addUnique(state.book.items, fx.item)) out.push({ label: `GOT: ${fx.item.toUpperCase()}`, positive: true });
  if (fx.value && addUnique(state.book.values, fx.value)) out.push({ label: `VALUE: ${fx.value.toUpperCase()}`, positive: true });
  if (fx.remembered) addUnique(state.book.remembered, fx.remembered);
  if (fx.shard && addUnique(state.book.shards, fx.shard)) out.push({ label: `SCRAP: ${fx.shard.toUpperCase()}`, positive: true });
  if (fx.unlock && !state.abilities.includes(fx.unlock)) {
    state.abilities.push(fx.unlock);
    out.push({ label: `UNLOCKED: ${fx.unlock.toUpperCase()}`, positive: true });
  }
  if (fx.coins) {
    state.coins = Math.max(0, state.coins + fx.coins);
    out.push({ label: `${fx.coins > 0 ? '+' : ''}${fx.coins} COINS`, positive: fx.coins > 0 });
  }
  return out;
}

/** Actions that need feeling: "an unmoved Zampanò cannot act". */
export function canSpend(state: CampaignState, meter: MeterKey, amount: number): boolean {
  return state.meters[meter] >= amount;
}

export function spend(state: CampaignState, meter: MeterKey, amount: number): boolean {
  if (!canSpend(state, meter, amount)) return false;
  state.meters[meter] -= amount;
  return true;
}

export function markComplete(state: CampaignState, id: string): void {
  if (!state.completed.includes(id)) state.completed.push(id);
}

export function isComplete(state: CampaignState, id: string): boolean {
  return state.completed.includes(id);
}

/** Supervillain full: he cannot be pushed off the lawn. */
export function unshakeable(state: CampaignState): boolean {
  return state.meters.supervillain >= METER_MAX;
}

/**
 * The 7.8 choice decides the ending: he called the pilgrims to their oath himself (THE KNIGHT), or
 * stood silent while Niketas did (THE WITNESS; internal key "alpha", kept for save compatibility).
 */
export type Ending = 'knight' | 'alpha';
export function ending(state: CampaignState): Ending {
  return state.flags.oath === 'enforced' ? 'knight' : 'alpha';
}

/**
 * Skin Zampanò wears in the dream: the armour as soon as he has taken the cross (1.5; the dream
 * makes the rag a crusader's coat of mail), plain before. The sword and the shield come later,
 * with the `knight` ability (2.3).
 */
export function dreamSkin(state: CampaignState): 'zampano' | 'zampanoCross' | 'zampanoKnight' {
  if (state.abilities.includes('knight') || state.abilities.includes('cross')) return 'zampanoKnight';
  return 'zampano';
}

/**
 * The feeling fades: every dream sub-level (levels 2 to 7) starts with a little less Commozione,
 * so wonder and weeping must keep filling it. Returns the amount actually lost.
 */
export function fadeCommozione(state: CampaignState, chapter: number): number {
  if (chapter < 2 || chapter > 7) return 0;
  const before = state.meters.commozione;
  state.meters.commozione = Math.max(0, before - STORY.COMMOZIONE_FADE);
  return before - state.meters.commozione;
}

/** Grace, as the telling in 8.2 and the ending show it. */
export type GraceTier = 'high' | 'mid' | 'low';
export function graceTier(state: CampaignState): GraceTier {
  const g = state.meters.grace;
  return g >= STORY.GRACE.HIGH ? 'high' : g >= STORY.GRACE.LOW ? 'mid' : 'low';
}

/** Extra ending lines from Grace and Standing. */
export function endingNotes(state: CampaignState): string[] {
  const out: string[] = [];
  const tier = graceTier(state);
  out.push(
    tier === 'high'
      ? 'HE KEPT THE FORMS HE SWORE TO, EVEN THE SMALL ONES NOBODY CHECKS.'
      : tier === 'mid'
        ? 'HE KEPT MOST OF THE FORMS HE SWORE TO. ABOUT THE REST HE HAS A LONG EXPLANATION.'
        : 'HE BROKE THE FORMS HE SWORE TO, AND EVERY AUTHORITY FORGAVE HIM. HE HAS NOT QUITE FORGIVEN HIMSELF.',
  );
  const st = state.meters.standing;
  out.push(
    st >= STORY.STANDING.FOND
      ? 'THE CAMP REMEMBERS HIM FONDLY. THE DOGS AT THE FENCES WATCH HIM DRINK AND SAY NOTHING.'
      : st >= STORY.STANDING.FAIR
        ? 'THE CAMP REMEMBERS HIM, MORE OR LESS.'
        : 'THE MARSHAL REMEMBERS WHO SPOKE AGAINST HIM. HE WALKED ON ANYWAY.',
  );
  return out;
}

const KEY = 'story';
/** Where a version-1 save is kept, untouched, when it is migrated. */
export const V1_BACKUP_KEY = 'story-v1-backup';

/**
 * Version-1 scenes whose meaning the rewrite keeps (docs/STORY-SOURCES.md, "Save migration").
 * 1.1 and 1.5 changed (the bucket, the rag cross and the sleep boundary) and every dream scene
 * belongs to the new story, so they are played again; nothing old counts as a new scene.
 */
export const V1_KEPT_SCENES: readonly string[] = ['1.0', '1.2', '1.3', '1.4'];
/** Flags only the kept scenes set. */
const V1_KEPT_FLAGS = ['pawOffered', 'longWay', 'santinaBall'];
/** The lecture scraps of 1.2 (same names in both versions). */
const V1_KEPT_SHARDS = ['A FLEET BOUGHT ON CREDIT', 'A KNIGHT WHO KEPT WALKING', 'A CITY SEEN FROM ITS WALLS'];
/** The remembered lines of the kept scenes. */
const V1_KEPT_REMEMBERED = ['AND A DOG DREAMS LECTURES.', 'THERE WAS A GATE, AND IT WAS A CHIHUAHUA.', 'THERE WAS A BOWL, AND IT WAS ALWAYS ONE STEP AWAY.', 'THERE WAS A GATE, AND I WAS MAGNIFICENT AT IT.'];

type V1Save = Partial<Omit<CampaignState, 'version' | 'notice'>> & { version?: number };

/**
 * A version-1 save in the rewritten story: the Green Zone and the unchanged neighborhood scenes
 * (1.0, 1.2-1.4) with their flags, scraps and remembered lines, coins and play time are kept; the
 * dream starts again at 1.1 with fresh meters, book and costume. A one-time notice says so.
 * Pure (the caller keeps the original under V1_BACKUP_KEY).
 */
export function migrateV1(raw: V1Save): CampaignState {
  const s = newCampaign();
  const old = Array.isArray(raw.completed) ? raw.completed.filter((x): x is string => typeof x === 'string') : [];
  // Saves from before the Green Zone walk became 1.0: whoever reached 1.1 has walked it.
  if (old.includes('1.1') && !old.includes('1.0')) old.unshift('1.0');
  s.completed = V1_KEPT_SCENES.filter((id) => old.includes(id));
  const flags = raw.flags ?? {};
  for (const f of V1_KEPT_FLAGS) if (f in flags && s.completed.length) s.flags[f] = flags[f]!;
  // The kept scenes' own meter change: offering the paw at the bowl (1.3).
  if (s.flags.pawOffered === true) s.meters.supervillain = Math.max(0, s.meters.supervillain - 3);
  s.book.shards = (raw.book?.shards ?? []).filter((x) => V1_KEPT_SHARDS.includes(x));
  s.book.remembered = (raw.book?.remembered ?? []).filter((x) => V1_KEPT_REMEMBERED.includes(x));
  s.coins = typeof raw.coins === 'number' && Number.isFinite(raw.coins) ? Math.max(0, raw.coins) : 0;
  s.playTime = typeof raw.playTime === 'number' && Number.isFinite(raw.playTime) ? Math.max(0, raw.playTime) : 0;
  s.savedAt = typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : null;
  // Tell the player only when something they played is being played again.
  s.notice = old.some((id) => !V1_KEPT_SCENES.includes(id)) ? 'dream-rewritten' : null;
  return s;
}

export function loadCampaign(): CampaignState {
  const raw = storage.get<(Partial<Omit<CampaignState, 'version'>> & { version?: number }) | null>(KEY, null);
  const base = newCampaign();
  if (!raw) return base;
  if (raw.version === 1) {
    // Keep the old save untouched beside the migrated one, once.
    if (storage.get<unknown>(V1_BACKUP_KEY, null) === null) storage.set(V1_BACKUP_KEY, raw);
    const migrated = migrateV1(raw as V1Save);
    storage.set(KEY, migrated);
    return migrated;
  }
  if (raw.version !== STORY_VERSION) return base;
  return {
    ...base,
    ...raw,
    version: STORY_VERSION,
    meters: { ...base.meters, ...(raw.meters ?? {}) },
    flags: { ...(raw.flags ?? {}) },
    book: { ...base.book, ...(raw.book ?? {}) },
    abilities: Array.isArray(raw.abilities) ? raw.abilities : [],
    completed: Array.isArray(raw.completed) ? [...raw.completed] : [],
    playTime: typeof raw.playTime === 'number' && Number.isFinite(raw.playTime) ? Math.max(0, raw.playTime) : 0,
    savedAt: typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : null,
    notice: raw.notice === 'dream-rewritten' ? raw.notice : null,
  };
}

/**
 * One attempt at a sub-level plays on a copy of the campaign: its choices, meters, Commozione
 * costs, flags and book entries count only when the scene is finished (or skipped from the pause
 * menu, which keeps what was done so far). RESTART SCENE and QUIT TO TITLE abandon the attempt,
 * so the scene starts again from the campaign as it was before it, and nothing applies twice.
 */
export function beginAttempt(state: CampaignState): CampaignState {
  return structuredClone(state);
}

/** An abandoned attempt keeps only the time played (pure, tested). */
export function keepAttemptTime(state: CampaignState, attempt: CampaignState): void {
  state.playTime = Math.max(state.playTime, attempt.playTime);
}

export function saveCampaign(state: CampaignState, now = Date.now()): void {
  state.savedAt = now;
  storage.set(KEY, state);
}

export function resetCampaign(): CampaignState {
  const s = newCampaign();
  saveCampaign(s);
  return s;
}
