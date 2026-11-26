/** Minimal typed event emitter used to decouple gameplay from FX, HUD and audio. */
export class Emitter<E extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof E, Array<(p: never) => void>>();

  on<K extends keyof E>(type: K, fn: (payload: E[K]) => void): () => void {
    const list = this.handlers.get(type) ?? [];
    list.push(fn as (p: never) => void);
    this.handlers.set(type, list);
    return () => {
      const l = this.handlers.get(type);
      if (l) this.handlers.set(type, l.filter((h) => h !== fn));
    };
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    const list = this.handlers.get(type);
    if (!list) return;
    for (const h of list) (h as (p: E[K]) => void)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export interface At {
  x: number;
  y: number;
}

/** Gameplay events (positions in grid space). */
export interface GameEvents extends Record<string, unknown> {
  treat: At & { score: number };
  digestWarning: At;
  poop: At & { surface: 'low' | 'medium' | 'heavy' };
  pee: At & { marking: boolean; radius: number; score: number };
  peeEmpty: At;
  /** Ran out of energy: no running until it recovers. */
  tired: At;
  poopCleaned: At & { score: number };
  drink: At;
  /** Zampanò steps into a puddle. */
  splash: At;
  lifeLost: At & { lives: number };
  gameOver: At;
  levelComplete: At;
  cat: At & { coins: number; score: number };
  ballSpawn: At;
  fetch: At & { penalty: number };
  bark: At & { dir: string };
  barkHit: At & { hits: number };
  bump: At;
  /** A progress-triggered patch of the park has just become polluted. */
  pollutionSurge: At & { radius: number; tiles: number };
  attackStart: { intensity: number };
  attackEnd: Record<string, never>;
  bagnaskizFled: At & { score: number };
  /** The band's ambush (systems/ambush.ts): a voice from off-screen, from its speaker's side (loud 0..1). */
  ambushVoice: At & { text: string; who: string; loud: number };
  /** The leader's shout (NOW!). */
  ambushNow: At & { text: string; who: string };
  ambushJump: At;
  /** Zampanò frozen with fright. */
  ambushScare: At;
  ambushBark: At & { who: string };
  /** A band member's poop pile (not counted as Zampanò's). */
  bandPoop: At & { who: string };
  ambushLeave: At;
  score: At & { amount: number; label?: string };
}
