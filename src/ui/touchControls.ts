import { Container, Graphics, Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import type { Gesture, GestureAction, Input } from '../core/input';
import { INPUT } from '../config';
import { spriteName } from '../assets/manifest';
import { runIconTexture } from '../assets/build';
import { PixelText } from './pixelText';

/** Button positions for the right hand (TouchControls mirrors them for the left hand). */
export interface ButtonLayout {
  peeX: number;
  peeY: number;
  peeR: number;
  barkX: number;
  barkY: number;
  barkR: number;
  runX: number;
  runY: number;
  runR: number;
  /** The action button's mode switcher (story walks). */
  switchX?: number;
  switchY?: number;
  switchR?: number;
}

/**
 * What the round action button does now: the scene's own action (LOOK, VOW, CALL...), BARK, or,
 * once he is a knight, the SWORD or the SHIELD. The switcher button (or Q / Tab, or a gesture)
 * cycles through the modes the scene allows.
 */
export type ActionMode = 'scene' | 'bark' | 'sword' | 'shield';

const MODE_STYLE: Record<ActionMode, { ring: number; ring2: number; text: string }> = {
  scene: { ring: 0x3ff0ff, ring2: 0xb040ff, text: '#3ff0ff' },
  bark: { ring: 0x3ff0ff, ring2: 0xb040ff, text: '#3ff0ff' },
  sword: { ring: 0xe8f0ff, ring2: 0xff3b3b, text: '#e8f0ff' },
  shield: { ring: 0xffc23a, ring2: 0x3050c0, text: '#ffc23a' },
};

/** The word a gesture's streak shows. */
const GESTURE_WORD: Record<Exclude<GestureAction, null>, string> = {
  action: 'ACTION',
  bark: 'BARK',
  strike: 'SWORD',
  guard: 'SHIELD',
  switch: 'SWITCH',
  runToggle: 'RUN',
  pee: 'PEE',
  run: 'RUN',
  menu: 'MENU',
  confirm: 'OK',
  back: 'BACK',
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
};

/**
 * Floating virtual joystick + PEE / action / RUN buttons, with the pee-charge droplets and the
 * energy ring around RUN (held, or switched on, to run; dimmed while Zampanò is tired). In the
 * story: the action button's mode switcher, and the right-hand gesture hints with a streak where
 * a gesture was made. The layout is mirrored for the left hand (CONTROLS).
 */
export class TouchControls {
  readonly root = new Container();
  private readonly joy = new Graphics();
  private readonly peeBtn = new Container();
  private readonly barkBtn = new Container();
  private readonly peeG = new Graphics();
  private readonly barkG = new Graphics();
  private readonly barkIcon: Sprite;
  private readonly modeIcon = new Graphics();
  private readonly runBtn = new Container();
  private readonly runG = new Graphics();
  private readonly energyRing = new Graphics();
  private readonly switchBtn = new Container();
  private readonly switchG = new Graphics();
  private readonly drops: Sprite[] = [];
  private readonly regen = new Graphics();
  /** Gesture hints (over the buttons) and the streak of the last gesture. */
  private readonly hints = new Container();
  private readonly hintG = new Graphics();
  private readonly hintTexts: PixelText[] = [];
  private readonly streak = new Graphics();
  private readonly streakText = new PixelText('', { color: '#ffffff', outline: '#120818' }).setOrigin(0.5, 1);
  private layout: ButtonLayout = { peeX: 0, peeY: 0, peeR: 15, barkX: 0, barkY: 0, barkR: 17, runX: 0, runY: 0, runR: 15 };
  /** The layout as given (right hand) and the view it was made for: re-applied when the hand changes. */
  private given: ButtonLayout | null = null;
  private view = { w: 216, h: 400, top: 60 };
  private mirrored = false;
  private charges = 0;
  private maxCharges = 3;
  private regenFrac = 0;
  private barkReady = 1;
  private peeLabel!: PixelText;
  private barkLabel!: PixelText;
  private peeVisible = true;
  private runVisible = true;
  private energy = 1;
  private canRun = true;
  private mode: ActionMode = 'bark';
  private modeIndex = 0;
  private modeCount = 1;
  /** Show the switcher and the gesture hints (story walks), not the Green Zone. */
  private storyExtras = false;
  private hintKey = '';
  /** The last gesture whose streak was drawn (Input's `seq`). */
  private streakSeq = 0;
  private streakLeft = 0;
  private streakFrom = { x: 0, y: 0 };
  private streakKind: Gesture = 'swipeUp';

  constructor(private readonly input: Input) {
    // Input keeps the last gesture across scenes: draw only gestures made after these controls.
    this.streakSeq = input.lastGesture?.seq ?? 0;
    const peeIcon = new Sprite(textures.get(spriteName('peeIcon')));
    const peeLabel = (this.peeLabel = new PixelText('PEE', { color: '#ffe23a', shadow: '#000000' }).setOrigin(0.5, 0));
    peeLabel.y = 6;
    peeIcon.y = -3;
    this.peeBtn.addChild(this.peeG, peeIcon, peeLabel, this.regen);
    const barkIcon = (this.barkIcon = new Sprite(textures.get(spriteName('barkIcon'))));
    const barkLabel = (this.barkLabel = new PixelText('BARK', { color: '#3ff0ff', shadow: '#000000' }).setOrigin(0.5, 0));
    barkLabel.y = 7;
    barkIcon.y = -4;
    this.barkBtn.addChild(this.barkG, barkIcon, this.modeIcon, barkLabel);
    for (let k = 0; k < 3; k++) {
      const d = new Sprite(textures.get(spriteName('drop', 0)));
      this.drops.push(d);
      this.peeBtn.addChild(d);
    }
    // The new art's icon (sprite update 1); the old version is the chevrons drawn here.
    const iconTex = runIconTexture();
    let runIcon: Container;
    if (iconTex) {
      runIcon = new Sprite(iconTex);
      runIcon.position.set(-Math.floor(iconTex.width / 2), -12);
    } else {
      const g = new Graphics();
      drawChevrons(g, -4, -8, 0xffffff);
      runIcon = g;
    }
    const runLabel = new PixelText('RUN', { color: '#4dff5a', outline: '#0a1a0a' }).setOrigin(0.5, 0);
    runLabel.y = 5;
    this.runBtn.addChild(this.runG, runIcon, runLabel, this.energyRing);
    this.switchBtn.addChild(this.switchG);
    this.switchBtn.visible = false;
    for (let k = 0; k < 3; k++) {
      const t = new PixelText('', { color: '#ffffff', shadow: '#000000' }).setOrigin(0, 0.5);
      this.hintTexts.push(t);
      this.hints.addChild(t);
    }
    this.hints.addChildAt(this.hintG, 0);
    this.hints.alpha = 0.55;
    this.hints.visible = false;
    this.streakText.visible = false;
    this.root.addChild(this.joy, this.hints, this.peeBtn, this.barkBtn, this.runBtn, this.switchBtn, this.streak, this.streakText);
  }

  /**
   * Places the buttons (given for the right hand; mirrored for the left), the joystick zone
   * (the thumb side, below `top`) and the gesture zone (the button side, below `top`).
   */
  setLayout(given: ButtonLayout, view: { w: number; h: number; top: number }): void {
    this.given = given;
    this.view = view;
    this.mirrored = this.input.leftHanded;
    const { w, h, top } = view;
    const mx = (x: number) => (this.mirrored ? w - x : x);
    const l: ButtonLayout = {
      ...given,
      peeX: mx(given.peeX),
      barkX: mx(given.barkX),
      runX: mx(given.runX),
      switchX: mx(given.switchX ?? given.barkX - 36),
      switchY: given.switchY ?? given.barkY + 10,
      switchR: given.switchR ?? 10,
    };
    this.layout = l;
    const thumbW = Math.round(w * INPUT.JOYSTICK_ZONE);
    this.input.joystickZone = this.mirrored ? { x: w - thumbW, y: top, w: thumbW, h: h - top } : { x: 0, y: top, w: thumbW, h: h - top };
    this.input.gestureZone = this.mirrored ? { x: 0, y: top, w: w - thumbW, h: h - top } : { x: thumbW, y: top, w: w - thumbW, h: h - top };
    this.peeBtn.position.set(l.peeX, l.peeY);
    this.barkBtn.position.set(l.barkX, l.barkY);
    this.input.setButton({ id: 'pee', action: 'pee', x: l.peeX, y: l.peeY, r: l.peeR + 4, enabled: this.root.visible && this.peeVisible });
    this.input.setButton({ id: 'bark', action: 'action', x: l.barkX, y: l.barkY, r: l.barkR + 4, enabled: this.root.visible });
    this.runBtn.position.set(l.runX, l.runY);
    this.input.setButton({ id: 'run', action: 'run', x: l.runX, y: l.runY, r: l.runR + 4, enabled: this.root.visible && this.runVisible });
    this.switchBtn.position.set(l.switchX!, l.switchY!);
    this.input.setButton({ id: 'switch', action: 'switch', x: l.switchX!, y: l.switchY!, r: l.switchR! + 3, enabled: this.root.visible && this.switchShown });
    // Charge droplets on an arc above-left of the PEE button (above-right when mirrored).
    this.drops.forEach((d, k) => {
      const a = Math.PI * (1.05 + k * 0.22);
      const x = Math.round(Math.cos(a) * (l.peeR + 6));
      d.position.set(this.mirrored ? -x : x, Math.round(Math.sin(a) * (l.peeR + 6)));
    });
    this.hintKey = '';
    this.redrawButtons();
  }

  /** The switcher is shown: story walks with more than one mode, if wanted (CONTROLS). */
  private get switchShown(): boolean {
    return this.storyExtras && this.modeCount > 1 && this.input.switcherWanted;
  }

  setEnabled(on: boolean): void {
    this.root.visible = on;
    for (const id of ['pee', 'bark', 'run', 'switch']) {
      const b = this.input.buttons.get(id);
      if (b) b.enabled = on && (id !== 'pee' || this.peeVisible) && (id !== 'run' || this.runVisible) && (id !== 'switch' || this.switchShown);
      if (b && !b.enabled) b.pressed = false;
    }
    this.input.joystickEnabled = on;
    this.input.gesturesEnabled = on;
    if (!on) this.input.clearRunLatch();
    this.switchBtn.visible = this.switchShown;
  }

  /** Story mode: hide PEE, relabel the action button (BARK / TALK / SERMON / LOOK...), hide RUN in walking-pace scenes. */
  configure(opts: { pee: boolean; action: string; run?: boolean; story?: boolean }): void {
    this.peeVisible = opts.pee;
    this.peeBtn.visible = opts.pee;
    this.storyExtras = opts.story ?? !opts.pee;
    const b = this.input.buttons.get('pee');
    if (b) b.enabled = opts.pee && this.root.visible;
    this.runVisible = opts.run ?? true;
    this.runBtn.visible = this.runVisible;
    const r = this.input.buttons.get('run');
    if (r) {
      r.enabled = this.runVisible && this.root.visible;
      if (!r.enabled) r.pressed = false;
    }
    if (!this.runVisible) this.input.clearRunLatch();
    this.mode = 'scene';
    this.modeIndex = 0;
    this.modeCount = 1;
    this.barkLabel.setText(opts.action);
    this.peeLabel.setText('PEE');
    this.applyMode();
  }

  /** The action button's mode (label, colours, icon) and the switcher's dots (index of count). */
  setActionMode(mode: ActionMode, label: string, index: number, count: number): void {
    this.mode = mode;
    this.modeIndex = index;
    this.modeCount = count;
    this.barkLabel.setText(label);
    this.applyMode();
  }

  private applyMode(): void {
    const st = MODE_STYLE[this.mode];
    this.barkLabel.setStyle({ color: st.text });
    this.barkIcon.visible = this.mode === 'scene' || this.mode === 'bark';
    this.modeIcon.clear();
    if (this.mode === 'sword') drawSword(this.modeIcon, 0, -5);
    else if (this.mode === 'shield') drawShield(this.modeIcon, 0, -5);
    this.switchBtn.visible = this.switchShown;
    const sw = this.input.buttons.get('switch');
    if (sw) sw.enabled = this.root.visible && this.switchShown;
    this.redrawButtons();
  }

  setPeeCharges(charges: number, max: number, regenFrac: number): void {
    if (charges === this.charges && max === this.maxCharges && Math.abs(regenFrac - this.regenFrac) < 0.02) return;
    this.charges = charges;
    this.maxCharges = max;
    this.regenFrac = regenFrac;
    this.drops.forEach((d, k) => {
      d.visible = k < max;
      d.texture = textures.get(spriteName('drop', k < charges ? 0 : 1));
    });
    this.redrawButtons();
  }

  /** Energy left (0..1) and whether RUN works now (false while tired). */
  setEnergy(frac: number, canRun: boolean): void {
    if (Math.abs(frac - this.energy) < 0.01 && canRun === this.canRun) return;
    this.energy = frac;
    this.canRun = canRun;
    this.redrawButtons();
  }

  setBarkReady(frac: number): void {
    if (Math.abs(frac - this.barkReady) < 0.05) return;
    this.barkReady = frac;
    this.redrawButtons();
  }

  private redrawButtons(): void {
    const l = this.layout;
    const pressedPee = this.input.buttons.get('pee')?.pressed ?? false;
    const pressedBark = this.input.buttons.get('bark')?.pressed ?? false;
    const pressedRun = (this.input.buttons.get('run')?.pressed ?? false) || this.input.runOn;
    const pressedSwitch = this.input.buttons.get('switch')?.pressed ?? false;
    const st = MODE_STYLE[this.mode];
    drawButton(this.peeG, l.peeR, 0xffe23a, 0xff3b3b, pressedPee, this.charges > 0 ? 1 : 0.35);
    drawButton(this.barkG, l.barkR, st.ring, st.ring2, pressedBark, 0.4 + 0.6 * this.barkReady);
    drawButton(this.runG, l.runR, 0x4dff5a, 0x3ff0ff, pressedRun && this.canRun, this.canRun ? 1 : 0.35);
    this.runBtn.alpha = this.canRun ? 1 : 0.6;
    // Energy ring: full circle = full energy; orange while tired (recovering).
    this.energyRing.clear();
    if (this.energy > 0.005) {
      this.energyRing
        .arc(0, 0, l.runR + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.energy))
        .stroke({ width: 2, color: this.canRun ? 0x4dff5a : 0xff9a1f, alpha: 0.9 });
    }
    this.regen.clear();
    if (this.charges < this.maxCharges && this.regenFrac > 0) {
      this.regen.arc(0, 0, l.peeR + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.regenFrac).stroke({ width: 1, color: 0xffe23a, alpha: 0.9 });
    }
    // Switcher: two arrows, and one dot per mode (the current one lit).
    const sr = l.switchR ?? 10;
    const g = this.switchG;
    drawButton(g, sr, 0xffffff, st.ring, pressedSwitch, 0.9);
    drawSwap(g, 0, -2);
    const n = this.modeCount;
    for (let k = 0; k < n; k++) {
      const x = Math.round((k - (n - 1) / 2) * 4);
      g.rect(x - 1, 6, 2, 2).fill({ color: k === this.modeIndex ? st.ring : 0x6a6a7a });
    }
  }

  private lastPressed = '';

  /** Called once per frame. */
  update(dt = 1 / 60): void {
    if (this.given && this.mirrored !== this.input.leftHanded) this.setLayout(this.given, this.view);
    const j = this.input.joystick;
    this.joy.clear();
    if (j.active) {
      const R = INPUT.JOYSTICK_RADIUS;
      this.joy.circle(Math.round(j.baseX), Math.round(j.baseY), R).fill({ color: 0x000000, alpha: 0.18 }).stroke({ width: 1, color: 0xffe23a, alpha: 0.8 });
      this.joy.circle(Math.round(j.baseX), Math.round(j.baseY), R - 3).stroke({ width: 1, color: 0xff3b3b, alpha: 0.5 });
      const dx = j.knobX - j.baseX;
      const dy = j.knobY - j.baseY;
      const len = Math.hypot(dx, dy);
      const k = len > R ? R / len : 1;
      this.joy
        .circle(Math.round(j.baseX + dx * k), Math.round(j.baseY + dy * k), 8)
        .fill({ color: 0x3ff0ff, alpha: 0.55 })
        .stroke({ width: 1, color: 0xffffff, alpha: 0.9 });
    }
    const pressed = ['pee', 'bark', 'run', 'switch'].map((id) => this.input.buttons.get(id)?.pressed).join('|') + (this.input.runOn ? 'R' : '');
    if (pressed !== this.lastPressed) {
      this.lastPressed = pressed;
      this.redrawButtons();
    }
    this.updateHints();
    this.updateStreak(dt);
  }

  /** Gesture hints over the buttons (touch only, story walks): what each gesture does now. */
  private updateHints(): void {
    const show = this.storyExtras && this.input.usingTouch && this.input.gesturesEnabled;
    this.hints.visible = show;
    if (!show) return;
    const ga = this.input.gestureActions;
    const key = `${ga.swipeUp}|${ga.swipeDown}|${ga.doubleTap}|${this.mirrored}`;
    if (key === this.hintKey) return;
    this.hintKey = key;
    const rows: Array<[Gesture, GestureAction]> = [
      ['swipeUp', ga.swipeUp],
      ['swipeDown', ga.swipeDown],
      ['doubleTap', ga.doubleTap],
    ];
    const z = this.input.gestureZone;
    const l = this.layout;
    const x0 = Math.round(z.x + 6);
    const y0 = Math.round(Math.min(l.runY - l.runR, l.barkY - l.barkR) - 40);
    const g = this.hintG;
    g.clear();
    let row = 0;
    rows.forEach(([kind, act], k) => {
      const t = this.hintTexts[k]!;
      t.visible = act !== null;
      if (act === null) return;
      const y = y0 + row * 11;
      row++;
      if (kind === 'swipeUp') drawArrow(g, x0 + 3, y, -1);
      else if (kind === 'swipeDown') drawArrow(g, x0 + 3, y, 1);
      else {
        g.circle(x0 + 1, y, 1.5).fill({ color: 0xffffff });
        g.circle(x0 + 5, y, 1.5).fill({ color: 0xffffff });
      }
      t.setText(GESTURE_WORD[act]);
      t.position.set(x0 + 10, y);
    });
  }

  /** A short streak and the word where a gesture was made. */
  private updateStreak(dt: number): void {
    const gst = this.input.lastGesture;
    if (gst && gst.seq !== this.streakSeq) {
      this.streakSeq = gst.seq;
      const act = this.input.gestureActions[gst.kind];
      if (act !== null) {
        this.streakLeft = INPUT.GESTURE_FLASH;
        this.streakFrom = { x: gst.x, y: gst.y };
        this.streakKind = gst.kind;
        this.streakText.setText(GESTURE_WORD[act]);
      }
    }
    this.streak.clear();
    if (this.streakLeft <= 0) {
      this.streakText.visible = false;
      return;
    }
    this.streakLeft -= dt;
    const a = Math.max(0, this.streakLeft / INPUT.GESTURE_FLASH);
    const { x, y } = this.streakFrom;
    const color = 0xffffff;
    if (this.streakKind === 'doubleTap') {
      const r = 6 + (1 - a) * 10;
      this.streak.circle(x, y, r).stroke({ width: 1, color, alpha: a });
      this.streak.circle(x, y, r * 0.55).stroke({ width: 1, color, alpha: a * 0.7 });
    } else {
      const s = this.streakKind === 'swipeUp' ? -1 : 1;
      const len = 26;
      this.streak.moveTo(x, y).lineTo(x, y + s * len).stroke({ width: 2, color, alpha: a });
      this.streak
        .poly([x, y + s * (len + 5), x - 4, y + s * (len - 1), x + 4, y + s * (len - 1)])
        .fill({ color, alpha: a });
    }
    this.streakText.visible = true;
    this.streakText.alpha = a;
    const ty = this.streakKind === 'swipeUp' ? y - 34 : this.streakKind === 'swipeDown' ? y - 6 : y - 16;
    this.streakText.position.set(Math.round(x), Math.round(ty));
  }
}

/** ">>" made of pixel squares (crisp at any scale), top-left at (x, y). */
function drawChevrons(g: Graphics, x: number, y: number, color: number): void {
  for (const ox of [0, 4]) {
    for (const [dx, dy] of [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]] as const) g.rect(x + ox + dx, y + dy, 1, 1).fill({ color });
  }
}

/** Two arrows, one to the right above one to the left, centred at (x, y). */
function drawSwap(g: Graphics, x: number, y: number): void {
  const c = 0xffffff;
  // →
  g.rect(x - 4, y - 2, 6, 1).fill({ color: c });
  g.rect(x + 1, y - 4, 1, 5).fill({ color: c });
  g.rect(x + 2, y - 3, 1, 3).fill({ color: c });
  g.rect(x + 3, y - 2, 1, 1).fill({ color: c });
  // ←
  g.rect(x - 1, y + 2, 6, 1).fill({ color: c });
  g.rect(x - 2, y, 1, 5).fill({ color: c });
  g.rect(x - 3, y + 1, 1, 3).fill({ color: c });
  g.rect(x - 4, y + 2, 1, 1).fill({ color: c });
}

/** A small upright sword, centred at (x, y). */
function drawSword(g: Graphics, x: number, y: number): void {
  g.rect(x, y - 6, 1, 9).fill({ color: 0xe8f0ff });
  g.rect(x - 2, y + 3, 5, 1).fill({ color: 0xffc23a });
  g.rect(x, y + 4, 1, 2).fill({ color: 0x8a5a2a });
}

/** A small kite shield with a cross, centred at (x, y). */
function drawShield(g: Graphics, x: number, y: number): void {
  g.poly([x - 4, y - 5, x + 5, y - 5, x + 5, y + 1, x + 0.5, y + 5, x - 4, y + 1]).fill({ color: 0x3050c0 }).stroke({ width: 1, color: 0xffc23a });
  g.rect(x, y - 4, 1, 7).fill({ color: 0xffffff });
  g.rect(x - 2, y - 2, 5, 1).fill({ color: 0xffffff });
}

/** A vertical arrow (dir -1 up, 1 down) centred at (x, y). */
function drawArrow(g: Graphics, x: number, y: number, dir: number): void {
  g.rect(x, y - 3, 1, 7).fill({ color: 0xffffff });
  g.poly([x + 0.5, y + dir * 5, x - 2.5, y + dir * 1, x + 3.5, y + dir * 1]).fill({ color: 0xffffff });
}

function drawButton(g: Graphics, r: number, ring: number, ring2: number, pressed: boolean, alpha: number): void {
  g.clear();
  g.circle(0, 0, r).fill({ color: pressed ? ring : 0x000000, alpha: pressed ? 0.45 : 0.28 });
  g.circle(0, 0, r).stroke({ width: 1, color: ring, alpha });
  g.circle(1, 1, r - 2).stroke({ width: 1, color: ring2, alpha: alpha * 0.8 });
}
