import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ensureCharacters } from '../assets/build';
import { STORY } from '../config';
import { textures } from '../core/assets';
import type { Input } from '../core/input';
import { spriteName, textureName, CHARACTERS, type CharacterKey } from '../assets/manifest';
import type { CampaignState } from '../campaign/state';
import { PixelText } from '../ui/pixelText';
import { C, frameRect, hex, retroBox } from '../ui/retro';
import { withOldWords } from './names';

/** Speaker names, colors and portraits. */
export const SPEAKERS: Record<string, { name: string; color: string; portrait: CharacterKey | 'professor' | null }> = {
  zampano: { name: 'ZAMPANO', color: C.white, portrait: 'zampano' },
  sbrimbrulon: { name: 'SBRIMBRULON', color: '#e08848', portrait: 'sbrimbrulon' },
  bagnaskiz: { name: 'BAGNASKIZ', color: C.orange, portrait: 'bagnaskiz' },
  marshal: { name: 'THE MARSHAL', color: C.orange, portrait: 'bagnaskizMarshal' },
  emperor: { name: 'THE EMPEROR', color: '#c070f0', portrait: 'bagnaskizEmperor' },
  jack: { name: 'JACK', color: '#ff8ab8', portrait: 'jack' },
  watson: { name: 'WATSON', color: '#d8d4c8', portrait: 'watson' },
  santina: { name: 'SANTINA', color: C.hotPink, portrait: 'santina' },
  confusione: { name: 'CONFUSIONE', color: '#ffa040', portrait: 'confusione' },
  professor: { name: 'THE PROFESSOR', color: '#f0d8a0', portrait: 'professor' },
  doge: { name: 'THE DOGE', color: '#e8c048', portrait: 'doge' },
  king: { name: 'THE SAINTLY KING', color: '#8ab0ff', portrait: 'king' },
  emir: { name: 'THE EMIR', color: '#f0f0f0', portrait: 'emir' },
  legate: { name: 'THE LEGATE', color: '#f4f0e4', portrait: 'legate' },
  cellarer: { name: 'THE CELLARER', color: '#c8a070', portrait: 'cellarer' },
  clerkA: { name: 'BLACK CLERK', color: '#9a9ab0', portrait: 'clerkA' },
  clerkB: { name: 'WHITE CLERK', color: '#ffffff', portrait: 'clerkB' },
  preacher: { name: 'THE PREACHER', color: '#d8b080', portrait: 'preacher' },
  stranger: { name: 'A BAREFOOT MAN', color: '#d8c0a0', portrait: 'stranger' },
  burgher: { name: 'A BURGHER', color: '#a8d0a8', portrait: 'burgher' },
  marquis: { name: 'THE MARQUIS', color: '#f08080', portrait: 'marquis' },
  prince: { name: 'THE PRINCE', color: '#f0e0b0', portrait: 'prince' },
  lady: { name: 'A LADY', color: '#d8a8f0', portrait: 'lady' },
  greek: { name: 'A GREEK', color: '#c890e0', portrait: 'greek' },
  voice: { name: 'A VOICE', color: C.cyan, portrait: null },
  crowd: { name: 'THE CROWD', color: C.yellow, portrait: 'crowdA' },
  knight: { name: 'A KNIGHT', color: '#d0d8e8', portrait: 'knight' },
  // The Fourth Crusade dream (docs/STORY.md).
  fulk: { name: 'FULK OF NEUILLY', color: '#d8b080', portrait: 'fulk' },
  clerk: { name: 'A CLERK', color: '#ffffff', portrait: 'clerk' },
  abbot: { name: 'THE ABBOT OF VAUX', color: '#f4f0e4', portrait: 'abbot' },
  envoy: { name: 'AN ENVOY', color: '#f4f0e4', portrait: 'envoy' },
  bishop: { name: 'A BISHOP', color: '#f4f0e4', portrait: 'bishop' },
  niketas: { name: 'NIKETAS', color: '#c890e0', portrait: 'niketas' },
  cook: { name: 'THE COOK', color: '#c8a070', portrait: 'cook' },
  sailmaker: { name: 'A SAILMAKER', color: '#a8d0a8', portrait: 'sailmaker' },
  householdWoman: { name: 'A WOMAN OF THE HOUSEHOLD', color: '#d8a8f0', portrait: 'householdWoman' },
  pilgrim: { name: 'A PILGRIM', color: '#c8b090', portrait: 'pilgrim' },
  venetian: { name: 'A VENETIAN', color: '#d8b080', portrait: 'venetian' },
};

export function speakerOf(key: string): { name: string; color: string; portrait: CharacterKey | 'professor' | null } {
  return SPEAKERS[key] ?? { name: key.toUpperCase(), color: C.white, portrait: null };
}

export interface ChoiceView {
  label: string;
  locked?: string;
}

/**
 * Bottom dialogue box ("dream dialogue": short lines, in the imperfect) with a portrait,
 * a typewriter effect and an optional choice list above it.
 */
export class DialogueBox {
  readonly root = new Container();
  private readonly bg = new Graphics();
  private readonly portrait = new Sprite();
  private readonly name = new PixelText('', { shadow: '#000000' });
  private readonly text = new PixelText('', { color: C.white, shadow: '#000000', lineGap: 3 });
  private readonly more = new PixelText('>', { color: C.yellow, shadow: '#000000' });
  /** Off-screen copy of the text style: measures a whole line before it is typed. */
  private readonly measure = new PixelText('', { color: C.white, shadow: '#000000', lineGap: 3 });
  /** Box height: at least the classic four lines, taller (upwards) for a longer line. */
  private boxH: number = STORY.DIALOGUE_BOX.MIN_H;
  private readonly choices = new Container();
  private choiceRows: Array<{ g: Graphics; t: PixelText; x: number; y: number; w: number; h: number; locked: boolean }> = [];
  private full = '';
  private shown = 0;
  private w = 216;
  private h = 400;
  private time = 0;
  selected = 0;
  private keyboard = false;
  /** Typewriter speed in characters per second (text-speed setting). */
  cps: number = STORY.TEXT_CPS.normal;
  /** The sprite a speaker's portrait shows (the story scene dresses the cast for the dream). */
  portraitFor: (key: CharacterKey) => CharacterKey = (key) => key;

  constructor() {
    this.root.addChild(this.bg, this.portrait, this.name, this.text, this.more, this.choices);
    this.root.visible = false;
    this.portrait.scale.set(1);
  }

  get typing(): boolean {
    return this.shown < this.full.length;
  }

  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.redrawBox();
  }

  private boxTop(): number {
    return this.h - STORY.DIALOGUE_BOX.BOTTOM - this.boxH;
  }

  private redrawBox(): void {
    const B = STORY.DIALOGUE_BOX;
    // The whole line must fit: the box grows upwards (its bottom edge stays where it is).
    this.measure.setStyle({ maxWidth: this.w - 62 }).setText(this.full);
    this.boxH = Math.max(B.MIN_H, this.measure.textHeight + B.PAD);
    const top = this.boxTop();
    this.bg.clear();
    retroBox(this.bg, 3, top, this.w - 6, this.boxH, C.yellow, C.red, 0.78);
    this.portrait.position.set(8, top + 6);
    this.name.position.set(this.portrait.texture === null ? 8 : 52, top + 6);
    this.text.position.set(52, top + 18);
    this.text.setStyle({ maxWidth: this.w - 62 });
    this.more.position.set(this.w - 14, top + this.boxH - 12);
  }

  private portraitToken = 0;

  show(speaker: string, line: string): void {
    const sp = speakerOf(speaker);
    this.root.visible = true;
    this.name.setText(sp.name).setStyle({ color: sp.color });
    if (sp.portrait === 'professor') {
      this.portrait.texture = textures.get(spriteName('professorFace'));
      this.portrait.scale.set(1.5);
    } else if (sp.portrait && sp.portrait in CHARACTERS) {
      const who = this.portraitFor(sp.portrait);
      // Speakers who are not on stage may not have their sprites generated yet.
      const key = textureName(who, 'idle', 'S', 0);
      const token = ++this.portraitToken;
      this.portrait.scale.set(1);
      this.portrait.texture = textures.has(key) ? textures.get(key) : Texture.EMPTY;
      if (!textures.has(key))
        void ensureCharacters([who]).then(() => {
          if (token === this.portraitToken && textures.has(key)) this.portrait.texture = textures.get(key);
        });
    } else {
      this.portrait.texture = textures.get(spriteName('sparkle'));
      this.portrait.scale.set(3);
    }
    this.full = line;
    this.shown = 0;
    this.text.setText('');
    this.clearChoices();
    this.redrawBox();
  }

  hide(): void {
    this.root.visible = false;
    this.clearChoices();
  }

  /** Reveals the whole line at once. */
  finish(): void {
    this.shown = this.full.length;
    this.text.setText(withOldWords(this.full, this.full.length, C.white));
  }

  setChoices(options: ChoiceView[]): void {
    this.clearChoices();
    this.selected = Math.max(0, options.findIndex((o) => !o.locked));
    this.keyboard = false;
    const gap = 4;
    const bw = this.w - 16;
    const x = 8;
    // Rows grow with their (wrapped) label; the stack sits right above the dialogue box.
    const texts = options.map((o) => {
      const label = o.locked ? `${o.label}  [${o.locked}]` : o.label;
      return new PixelText(label, { color: o.locked ? '#7a7a8a' : C.cyan, shadow: '#000000', maxWidth: bw - 12, lineGap: 2 }).setOrigin(0, 0);
    });
    const heights = texts.map((t) => Math.max(16, t.textHeight + 8));
    const total = heights.reduce((a, b) => a + b, 0) + (options.length - 1) * gap;
    let y = this.boxTop() - total - 6;
    options.forEach((o, k) => {
      const g = new Graphics();
      const t = texts[k]!;
      const h = heights[k]!;
      t.position.set(x + 6, y + Math.round((h - t.textHeight) / 2));
      this.choices.addChild(g, t);
      this.choiceRows.push({ g, t, x, y, w: bw, h, locked: !!o.locked });
      y += h + gap;
    });
    this.drawChoices();
  }

  get hasChoices(): boolean {
    return this.choiceRows.length > 0;
  }

  private clearChoices(): void {
    for (const r of this.choiceRows) {
      r.g.destroy();
      r.t.destroy();
    }
    this.choiceRows = [];
    this.choices.removeChildren();
  }

  private drawChoices(): void {
    const blink = Math.floor(this.time * 4) % 2 === 0;
    this.choiceRows.forEach((r, k) => {
      const sel = this.keyboard && k === this.selected;
      r.g.clear();
      r.g.rect(r.x, r.y, r.w, r.h).fill({ color: sel ? 0x3a1050 : 0x000000, alpha: 0.7 });
      frameRect(r.g, r.x, r.y, r.w, r.h, hex(r.locked ? '#4a4a5a' : C.red));
      frameRect(r.g, r.x + 1, r.y + 1, r.w - 1, r.h - 1, hex(r.locked ? '#5a5a6a' : sel && blink ? C.white : C.yellow), 0.9);
    });
  }

  /**
   * Handles input for the choice list. Returns the picked index (or a locked index, so the
   * caller can say why it doesn't work), else -1.
   */
  updateChoices(input: Input): number {
    if (!this.choiceRows.length) return -1;
    if (input.consume('up')) {
      this.keyboard = true;
      this.selected = (this.selected + this.choiceRows.length - 1) % this.choiceRows.length;
    }
    if (input.consume('down')) {
      this.keyboard = true;
      this.selected = (this.selected + 1) % this.choiceRows.length;
    }
    if (input.consumeContinue()) return this.selected;
    for (const tap of input.consumeTaps()) {
      const hit = this.choiceRows.findIndex((r) => tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y - 2 && tap.y <= r.y + r.h + 2);
      if (hit >= 0) return hit;
    }
    this.drawChoices();
    return -1;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.shown < this.full.length) {
      this.shown = Math.min(this.full.length, this.shown + dt * this.cps);
      this.text.setText(withOldWords(this.full, Math.floor(this.shown), C.white));
    }
    this.more.visible = !this.typing && !this.choiceRows.length && Math.floor(this.time * 3) % 2 === 0;
    if (this.choiceRows.length) this.drawChoices();
  }
}

/** Big centered text (titles, SLAP!, YOU HAVE BEEN SUPERVILLAINED) and the Professor's box. */
export class CardLayer {
  readonly root = new Container();
  private readonly dim = new Graphics();
  readonly big = new PixelText('', { scale: 2, outline: '#120818', glow: 'self', glowAlpha: 0.35, align: 'center' }).setOrigin(0.5);
  readonly small = new PixelText('', { color: C.white, shadow: '#000000', align: 'center', lineGap: 4 }).setOrigin(0.5, 0);
  /** Optional small line above the big text ("YOU HAVE BEEN"). */
  readonly above = new PixelText('', { color: C.white, shadow: '#000000', align: 'center' }).setOrigin(0.5, 0);
  readonly tap = new PixelText('TAP', { color: C.yellow, shadow: '#000000' }).setOrigin(0.5);
  private w = 216;
  private h = 400;
  private time = 0;
  showTap = false;

  constructor() {
    this.root.addChild(this.dim, this.above, this.big, this.small, this.tap);
    this.root.visible = false;
  }

  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.big.setStyle({ maxWidth: w - 12 });
    this.small.setStyle({ maxWidth: w - 20 });
  }

  show(big: string, small = '', color: string = C.yellow, dim = 0.55, above = ''): void {
    this.root.visible = true;
    // Double size only when every (explicit) line fits: 12 glyphs at 16 px on a 216-px screen.
    const longest = Math.max(...big.split('\n').map((l) => l.length));
    this.big.setStyle({ color, scale: longest <= 12 ? 2 : 1 });
    this.big.setText(big);
    this.small.setText(small);
    this.above.setText(above);
    this.dim.clear().rect(0, 0, this.w, this.h).fill({ color: 0x000000, alpha: dim });
    const aboveH = above ? this.above.textHeight + 10 : 0;
    const total = aboveH + this.big.textHeight + (small ? this.small.textHeight + 12 : 0);
    const top = Math.round(this.h * 0.42 - total / 2);
    this.above.position.set(Math.round(this.w / 2), top);
    this.big.position.set(Math.round(this.w / 2), top + aboveH + Math.round(this.big.textHeight / 2));
    this.small.position.set(Math.round(this.w / 2), top + aboveH + this.big.textHeight + 12);
    this.tap.position.set(Math.round(this.w / 2), Math.round(this.h * 0.82));
    this.time = 0;
  }

  hide(): void {
    this.root.visible = false;
  }

  update(dt: number): void {
    this.time += dt;
    this.tap.visible = this.showTap && this.time > 0.6 && Math.floor(this.time * 2.5) % 2 === 0;
  }
}

/**
 * Story HUD: sub-level id + title, current objective, the three meters
 * (Commozione, Supervillain, Grace), an optional mode meter (nerve, thirst, listen) and MENU.
 */
export class StoryHud {
  readonly root = new Container();
  private readonly title = new PixelText('', { color: C.yellow, shadow: '#000000' });
  private readonly objective = new PixelText('', { color: C.white, shadow: '#000000', lineGap: 2 });
  private readonly meters = new Graphics();
  private readonly icons: Sprite[] = [];
  private readonly menu = new Graphics();
  private readonly menuLabel = new PixelText('MENU', { color: C.yellow, shadow: '#000000' }).setOrigin(1, 0);
  private readonly modeLabel = new PixelText('', { color: C.white, shadow: '#000000' }).setOrigin(0.5, 0);
  private readonly modeBar = new Graphics();
  private w = 216;
  private mode: { label: string; value: number; color: number } | null = null;
  private clock = 0;

  constructor(private readonly input: Input) {
    for (const key of ['tear', 'mask', 'halo'] as const) {
      const s = new Sprite(textures.get(spriteName(key)));
      this.icons.push(s);
    }
    this.root.addChild(this.title, this.objective, this.meters, ...this.icons, this.menu, this.menuLabel, this.modeBar, this.modeLabel);
  }

  layout(w: number, _h: number): void {
    this.w = w;
    this.title.position.set(4, 4);
    this.title.setStyle({ maxWidth: w - 70, lineGap: 2 });
    this.objective.position.set(4, 6 + this.title.textHeight + 4);
    this.objective.setStyle({ maxWidth: w - 78 });
    this.icons.forEach((s, k) => s.position.set(w - 62, 26 + k * 9));
    this.menu.clear();
    for (let k = 0; k < 3; k++) this.menu.rect(w - 17, 4 + k * 3, 13, 1).fill(hex(C.yellow));
    this.menuLabel.position.set(w - 3, 13);
    // Keeps its state: a resize must not turn it on under the pause menu.
    this.input.setButton({ id: 'menu', action: 'menu', x: w - 14, y: 12, r: 14, enabled: this.menuEnabled });
    this.modeLabel.position.set(Math.round(w / 2), 56);
  }

  setTitle(id: string, title: string): void {
    this.title.setText(`${id} ${title.toUpperCase()}`);
    this.objective.y = 6 + this.title.textHeight + 4;
  }

  setObjective(text: string): void {
    this.objective.setText(text);
    this.objectiveShown = text.length > 0;
  }

  private objectiveShown = false;

  /** The lowest HUD line on screen (the objective, or the mode bar under it): notices go below. */
  get bottom(): number {
    const obj = this.objectiveShown ? this.objective.y + this.objective.textHeight : 0;
    if (!this.mode) return obj;
    return Math.max(56, Math.round(obj + 3)) + 16;
  }

  setMode(m: { label: string; value: number; color: number } | null): void {
    this.mode = m;
  }

  /** The MENU button (one per game: Input's `menu` button is shared by every HUD). */
  private menuEnabled = true;

  setMenuEnabled(on: boolean): void {
    this.menuEnabled = on;
    const b = this.input.buttons.get('menu');
    if (b) b.enabled = on;
    this.menu.visible = this.menuLabel.visible = on;
  }

  update(dt: number, state: CampaignState): void {
    this.clock += dt;
    const g = this.meters;
    g.clear();
    const vals = [state.meters.commozione, state.meters.supervillain, state.meters.grace];
    const cols = [0x5ac8ff, 0xe02030, 0xffd040];
    vals.forEach((v, k) => {
      const x = this.w - 51;
      const y = 28 + k * 9;
      g.rect(x, y, 46, 4).fill({ color: 0x000000, alpha: 0.55 });
      g.rect(x + 1, y + 1, Math.round((44 * v) / 100), 2).fill(cols[k]!);
      if (v >= 100 && k === 1 && Math.floor(this.clock * 4) % 2) g.rect(x, y, 46, 4).stroke({ width: 1, color: 0xffffff });
    });
    const m = this.mode;
    this.modeBar.clear();
    this.modeLabel.visible = !!m;
    if (m) {
      const bw = Math.min(120, this.w - 80);
      const x = Math.round(this.w / 2 - bw / 2);
      // Below the objective, however many lines it took.
      const top = Math.max(56, Math.round(this.objective.y + this.objective.textHeight + 3));
      const by = top + 10;
      this.modeLabel.setText(m.label);
      this.modeLabel.y = top;
      this.modeBar.rect(x, by, bw, 6).fill({ color: 0x000000, alpha: 0.6 });
      this.modeBar.rect(x + 1, by + 1, Math.max(0, Math.round((bw - 2) * Math.max(0, Math.min(1, m.value)))), 4).fill(m.color);
      frameRect(this.modeBar, x, by, bw, 6, hex(C.red));
    }
  }
}
