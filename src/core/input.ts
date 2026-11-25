import { INPUT } from '../config';
import type { ControlSettings, GestureBinding } from './settings';

/**
 * Unified input: keyboard + mouse + multi-touch.
 * - Movement is a screen-space vector (x right, y down) with magnitude 0..1.
 * - Discrete actions (pee, action, bark, strike, menu, confirm, ...) are queued until consumed.
 * - RUN is held, not queued: `runHeld` (RUN button, Shift or K; or latched in toggle mode).
 *   The shield is held too: `guardHeld` (I, or the action button while it is in SHIELD mode).
 * - Touch: a floating virtual joystick (appears under the thumb), on-screen buttons, and
 *   gestures on the right-hand side over the buttons (swipe up, swipe down, double tap), bound
 *   to actions by the CONTROLS settings (`gestureActions`).
 */

/**
 * - `action`: the round action button (J / X): BARK in the Green Zone; in the story whatever its
 *   mode is (the scene's own action, BARK, SWORD or SHIELD; see StoryScene.actionMode).
 * - `bark`, `strike` (sword), `guard` (shield): those three directly (B, U, I).
 * - `switch`: the next mode of the action button (Q / Tab, the small switcher button).
 */
export type Action =
  | 'pee'
  | 'action'
  | 'bark'
  | 'strike'
  | 'guard'
  | 'switch'
  | 'run'
  | 'menu'
  | 'confirm'
  | 'back'
  | 'up'
  | 'down'
  | 'left'
  | 'right';

export type Gesture = 'swipeUp' | 'swipeDown' | 'doubleTap';

/** What a gesture does: an action, or 'runToggle' (RUN on / off). */
export type GestureAction = Action | 'runToggle' | null;

export interface GestureEvent {
  kind: Gesture;
  /** Where it happened (logical px): the start of a swipe, the second tap. */
  x: number;
  y: number;
  /** Increases with every gesture (so a view can tell a new one from the last). */
  seq: number;
}

/** The input action a gesture setting stands for. */
export function bindingAction(b: GestureBinding): GestureAction {
  switch (b) {
    case 'off':
      return null;
    case 'action':
      return 'action';
    case 'bark':
      return 'bark';
    case 'sword':
      return 'strike';
    case 'shield':
      return 'guard';
    case 'switch':
      return 'switch';
    case 'run':
      return 'runToggle';
  }
}

/** A swipe? Mostly vertical, long enough and quick enough. Pure (tested). */
export function classifySwipe(dx: number, dy: number, seconds: number): 'swipeUp' | 'swipeDown' | null {
  if (seconds > INPUT.SWIPE_MAX_TIME) return null;
  if (Math.abs(dy) < INPUT.SWIPE_MIN) return null;
  if (Math.abs(dy) < Math.abs(dx) * INPUT.SWIPE_RATIO) return null;
  return dy < 0 ? 'swipeUp' : 'swipeDown';
}

/** Is a press at (x, y, time) the second tap of a double tap after `prev` (the last tap)? Pure (tested). */
export function isDoubleTap(prev: { x: number; y: number; at: number } | null, x: number, y: number, at: number): boolean {
  if (!prev) return false;
  const dt = at - prev.at;
  return dt >= 0 && dt <= INPUT.DOUBLE_TAP_TIME && Math.hypot(x - prev.x, y - prev.y) <= INPUT.DOUBLE_TAP_DIST;
}

export interface VirtualButton {
  id: string;
  action: Action;
  /** Circle hit area in logical px. */
  x: number;
  y: number;
  r: number;
  enabled: boolean;
  /** Visual pressed state (held). */
  pressed: boolean;
}

export interface JoystickState {
  active: boolean;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
}

export interface Tap {
  x: number;
  y: number;
}

interface PointerTrack {
  kind: 'button' | 'joystick' | 'tap' | 'gesture';
  buttonId?: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** Seconds (event clock) when it went down. */
  startAt: number;
  /** A gesture pointer that already fired (a swipe, or the second tap of a double tap). */
  fired?: boolean;
}

const KEY_ACTIONS: Record<string, Action[]> = {
  Space: ['pee', 'confirm'],
  Enter: ['confirm'],
  NumpadEnter: ['confirm'],
  KeyJ: ['action'],
  KeyX: ['action'],
  KeyB: ['bark'],
  KeyU: ['strike'],
  KeyI: ['guard'],
  KeyQ: ['switch'],
  Tab: ['switch'],
  KeyK: ['run'],
  Escape: ['menu', 'back'],
  KeyP: ['menu'],
  ArrowUp: ['up'],
  KeyW: ['up'],
  ArrowDown: ['down'],
  KeyS: ['down'],
  ArrowLeft: ['left'],
  KeyA: ['left'],
  ArrowRight: ['right'],
  KeyD: ['right'],
};

export class Input {
  readonly move = { x: 0, y: 0 };
  readonly joystick: JoystickState = { active: false, baseX: 0, baseY: 0, knobX: 0, knobY: 0 };
  /** Where the floating joystick may appear (logical px). */
  joystickZone = { x: 0, y: 0, w: 0, h: 0 };
  joystickEnabled = false;
  /** True once a touch was seen: show touch controls. */
  usingTouch = false;
  readonly buttons = new Map<string, VirtualButton>();
  /** Where the right-hand gestures are read (logical px), while `gesturesEnabled`. */
  gestureZone = { x: 0, y: 0, w: 0, h: 0 };
  gesturesEnabled = false;
  /** What each gesture does (CONTROLS settings). */
  gestureActions: Record<Gesture, GestureAction> = { swipeUp: 'strike', swipeDown: 'guard', doubleTap: 'bark' };
  /** RUN button: false = hold to run, true = tap to switch running on and off. */
  runToggle = false;
  /** The last gesture (for its on-screen streak), or null. */
  lastGesture: GestureEvent | null = null;
  /** Buttons for the left hand: the layout is mirrored (joystick on the right). */
  leftHanded = false;
  /** The switcher button is wanted (CONTROLS). */
  switcherWanted = true;

  private readonly keys = new Set<string>();
  private readonly pending = new Map<Action, number>();
  private taps: Tap[] = [];
  private readonly pointers = new Map<number, PointerTrack>();
  private joystickPointer: number | null = null;
  private toLogical: (cx: number, cy: number) => { x: number; y: number } = (x, y) => ({ x, y });
  private now = 0;
  /** RUN switched on (toggle mode, or a gesture bound to RUN). */
  private runLatched = false;
  /** The last tap in the gesture zone (for the double tap), event clock. */
  private lastTap: { x: number; y: number; at: number } | null = null;
  private gestureSeq = 0;

  attach(el: HTMLElement, toLogical: (clientX: number, clientY: number) => { x: number; y: number }): void {
    this.toLogical = toLogical;
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.releaseAll());
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    el.addEventListener('pointermove', (e) => this.onPointerMove(e));
    el.addEventListener('pointerup', (e) => this.onPointerUp(e, false));
    el.addEventListener('pointercancel', (e) => this.onPointerUp(e, true));
    el.addEventListener('lostpointercapture', (e) => this.onPointerUp(e, true));
    // No zoom, no scrolling, no long-press menu.
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('contextmenu', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('touchstart', prevent, { passive: false });
    document.addEventListener('touchmove', prevent, { passive: false });
    document.addEventListener('gesturestart', prevent);
    document.addEventListener('dblclick', prevent);
  }

  /** Automation (story autopilot): when set, replaces keyboard and joystick movement, RUN and the shield. */
  override: { x: number; y: number; run?: boolean; guard?: boolean } | null = null;

  /** RUN is held: the touch button (or switched on), Shift or K (or the autopilot asks for it). */
  get runHeld(): boolean {
    if (this.override) return !!this.override.run;
    return (
      this.runLatched ||
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.keys.has('KeyK') ||
      (!this.runToggle && (this.buttons.get('run')?.pressed ?? false))
    );
  }

  /** RUN switched on by a tap (toggle mode) or a gesture. */
  get runOn(): boolean {
    return this.runLatched;
  }

  /** Switch RUN off (controls hidden, scene change). */
  clearRunLatch(): void {
    this.runLatched = false;
  }

  /** The shield is held up: I, or the autopilot. (The action button in SHIELD mode: `actionHeld`.) */
  get guardHeld(): boolean {
    if (this.override) return !!this.override.guard;
    return this.keys.has('KeyI');
  }

  /** The action button (or J / X) is being held down. */
  get actionHeld(): boolean {
    if (this.override) return false;
    return this.keys.has('KeyJ') || this.keys.has('KeyX') || (this.buttons.get('bark')?.pressed ?? false);
  }

  /** Called once per logic step. */
  update(dt: number): void {
    this.now += dt;
    for (const [a, t] of this.pending) if (this.now - t > INPUT.ACTION_TTL) this.pending.delete(a);
    if (this.override) {
      this.move.x = this.override.x;
      this.move.y = this.override.y;
      return;
    }
    // Keyboard vector
    let kx = 0;
    let ky = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) kx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) kx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) ky -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) ky += 1;
    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      const mag = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1 : INPUT.KEYBOARD_WALK_MAG;
      this.move.x = (kx / len) * mag;
      this.move.y = (ky / len) * mag;
      return;
    }
    // Joystick vector
    if (this.joystick.active) {
      const dx = this.joystick.knobX - this.joystick.baseX;
      const dy = this.joystick.knobY - this.joystick.baseY;
      const len = Math.hypot(dx, dy);
      let mag = Math.min(1, len / INPUT.JOYSTICK_RADIUS);
      mag = mag < INPUT.JOYSTICK_DEADZONE ? 0 : (mag - INPUT.JOYSTICK_DEADZONE) / (1 - INPUT.JOYSTICK_DEADZONE);
      this.move.x = len > 0 ? (dx / len) * mag : 0;
      this.move.y = len > 0 ? (dy / len) * mag : 0;
      return;
    }
    this.move.x = 0;
    this.move.y = 0;
  }

  /** Returns true (once) if the action was triggered recently. */
  consume(action: Action): boolean {
    if (!this.pending.has(action)) return false;
    this.pending.delete(action);
    return true;
  }

  /** The queued taps, left in the queue. */
  peekTaps(): readonly Tap[] {
    return this.taps;
  }

  /** Returns and clears the taps (pointer press+release without much movement). */
  consumeTaps(): Tap[] {
    const t = this.taps;
    this.taps = [];
    return t;
  }

  /** Forget queued actions/taps (call on scene changes so a key press doesn't leak). */
  clearPending(): void {
    this.pending.clear();
    this.taps = [];
    this.lastTap = null;
  }

  /** Applies the CONTROLS settings. */
  applyControls(c: ControlSettings): void {
    this.gestureActions = { swipeUp: bindingAction(c.swipeUp), swipeDown: bindingAction(c.swipeDown), doubleTap: bindingAction(c.doubleTap) };
    if (this.runToggle && c.run !== 'toggle') this.runLatched = false;
    this.runToggle = c.run === 'toggle';
    this.leftHanded = c.hand === 'left';
    this.switcherWanted = c.switcher;
  }

  /** True (once) if any of the actions was triggered recently; consumes all of them. */
  consumeAny(actions: readonly Action[]): boolean {
    let hit = false;
    for (const a of actions) if (this.consume(a)) hit = true;
    return hit;
  }

  /**
   * The one rule for "continue / confirm / pick" on every screen (dialogue, cards, menus, the
   * choice wheel, the book, the title's cards): Space, Enter, J / X, the PEE or the action button.
   * True (once) if any was pressed recently; consumes all of them, so one Space (pee + confirm)
   * counts once. Taps are read by each screen itself.
   */
  consumeContinue(): boolean {
    return this.consumeAny(['confirm', 'action', 'pee']);
  }

  /** A gesture was made: do what it is bound to, and remember it for its on-screen streak. */
  private fireGesture(kind: Gesture, x: number, y: number): void {
    const a = this.gestureActions[kind];
    if (a === 'runToggle') this.runLatched = !this.runLatched;
    else if (a) this.trigger(a);
    this.lastGesture = { kind, x, y, seq: ++this.gestureSeq };
  }

  private inGestureZone(x: number, y: number): boolean {
    const z = this.gestureZone;
    return this.gesturesEnabled && x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
  }

  trigger(action: Action): void {
    this.pending.set(action, this.now);
  }

  /** Automation: a tap at a logical position, as if a finger pressed and released there. */
  pushTap(x: number, y: number): void {
    this.taps.push({ x, y });
  }

  setButton(b: Omit<VirtualButton, 'pressed'>): void {
    const old = this.buttons.get(b.id);
    this.buttons.set(b.id, { ...b, pressed: old?.pressed ?? false });
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const code = e.code;
    if (code.startsWith('Arrow') || code === 'Space' || code === 'Tab') e.preventDefault();
    if (down) {
      if (!e.repeat) for (const a of KEY_ACTIONS[code] ?? []) this.trigger(a);
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    // A stylus on a phone plays with the on-screen buttons too: touch hints for it as well.
    if (e.pointerType === 'touch' || e.pointerType === 'pen') this.usingTouch = true;
    const p = this.toLogical(e.clientX, e.clientY);
    const at = e.timeStamp / 1000;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    for (const b of this.buttons.values()) {
      if (!b.enabled) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r) {
        b.pressed = true;
        // Toggle mode: a tap on RUN switches running on or off; hold mode: held (runHeld).
        if (b.action === 'run') this.runLatched = this.runToggle ? !this.runLatched : false;
        this.trigger(b.action);
        this.pointers.set(e.pointerId, { kind: 'button', buttonId: b.id, startX: p.x, startY: p.y, x: p.x, y: p.y, startAt: at });
        return;
      }
    }
    // Right-hand side, over the buttons: gestures (the second tap of a double tap fires on press).
    if (this.inGestureZone(p.x, p.y)) {
      const second = isDoubleTap(this.lastTap, p.x, p.y, at);
      if (second) {
        this.lastTap = null;
        this.fireGesture('doubleTap', p.x, p.y);
      }
      this.pointers.set(e.pointerId, { kind: 'gesture', startX: p.x, startY: p.y, x: p.x, y: p.y, startAt: at, fired: second });
      return;
    }
    const z = this.joystickZone;
    if (
      this.joystickEnabled &&
      this.joystickPointer === null &&
      p.x >= z.x &&
      p.x <= z.x + z.w &&
      p.y >= z.y &&
      p.y <= z.y + z.h
    ) {
      this.joystickPointer = e.pointerId;
      Object.assign(this.joystick, { active: true, baseX: p.x, baseY: p.y, knobX: p.x, knobY: p.y });
      this.pointers.set(e.pointerId, { kind: 'joystick', startX: p.x, startY: p.y, x: p.x, y: p.y, startAt: at });
      return;
    }
    this.pointers.set(e.pointerId, { kind: 'tap', startX: p.x, startY: p.y, x: p.x, y: p.y, startAt: at });
  }

  private onPointerMove(e: PointerEvent): void {
    const t = this.pointers.get(e.pointerId);
    if (!t) return;
    const p = this.toLogical(e.clientX, e.clientY);
    t.x = p.x;
    t.y = p.y;
    if (t.kind === 'gesture' && !t.fired) {
      // A swipe fires as soon as it is one (no waiting for the finger to lift).
      const swipe = classifySwipe(p.x - t.startX, p.y - t.startY, e.timeStamp / 1000 - t.startAt);
      if (swipe) {
        t.fired = true;
        this.lastTap = null;
        this.fireGesture(swipe, t.startX, t.startY);
      }
      return;
    }
    if (t.kind === 'joystick') {
      const j = this.joystick;
      j.knobX = p.x;
      j.knobY = p.y;
      // The base follows the thumb when dragged beyond the radius.
      const dx = j.knobX - j.baseX;
      const dy = j.knobY - j.baseY;
      const len = Math.hypot(dx, dy);
      const R = INPUT.JOYSTICK_RADIUS;
      if (len > R) {
        j.baseX = j.knobX - (dx / len) * R;
        j.baseY = j.knobY - (dy / len) * R;
      }
    }
  }

  private onPointerUp(e: PointerEvent, cancelled: boolean): void {
    const t = this.pointers.get(e.pointerId);
    if (!t) return;
    this.pointers.delete(e.pointerId);
    if (t.kind === 'button' && t.buttonId) {
      const b = this.buttons.get(t.buttonId);
      if (b) b.pressed = false;
    } else if (t.kind === 'joystick') {
      this.joystickPointer = null;
      this.joystick.active = false;
    } else if (t.kind === 'gesture') {
      if (cancelled || t.fired) return;
      const at = e.timeStamp / 1000;
      if (Math.hypot(t.x - t.startX, t.y - t.startY) <= INPUT.TAP_SLOP) {
        // A plain tap: still a tap (dialogue, menus), and maybe the first of a double tap.
        this.taps.push({ x: t.x, y: t.y });
        this.lastTap = at - t.startAt <= INPUT.TAP_MAX_TIME ? { x: t.x, y: t.y, at } : null;
      }
    } else if (!cancelled && Math.hypot(t.x - t.startX, t.y - t.startY) <= INPUT.TAP_SLOP) {
      this.taps.push({ x: t.x, y: t.y });
    }
  }

  private releaseAll(): void {
    this.keys.clear();
    this.pointers.clear();
    this.lastTap = null;
    this.joystickPointer = null;
    this.joystick.active = false;
    for (const b of this.buttons.values()) b.pressed = false;
  }
}
