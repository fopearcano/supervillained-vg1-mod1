import { GLOSSARY as G } from '../config';

/**
 * The GLOSSARY's pages (scenes/glossaryScene.ts) as data, and their layout as a pure function so
 * the card's size can be measured before anything is drawn (tested).
 *
 * Sources (docs/STORY-SOURCES.md, "The glossary"):
 * - THE CRUSADE: Alessandro Barbero's lecture on the Fourth Crusade (the Italian transcript in the
 *   repository root), paraphrased in English, not quoted.
 * - BULLYING: the owner's glossary drawn from Alberto Pellai and Barbara Tamborini, "Io dico no al
 *   bullismo" (Mondadori, 2021): its 37 entries, in English, shortened to fit the card.
 *
 * Text is upper case ASCII (the pixel font has no other glyphs, but for the pronunciation marks of
 * ui/pixelFont.ts).
 */

/** One sense of a headword: a label (A) NOUN, VALUES, ...) and its text. */
export interface GlossarySense {
  label: string;
  text: string;
  /** Circled by hand in red: the sense the game is about. */
  ring?: boolean;
  /** Greyed out: a sense the game is not about. */
  faded?: boolean;
}

export interface GlossaryEntry {
  id: string;
  /** The headword (may hold '\n'). */
  head: string;
  /** Under the rule: the pronunciation, or where the word comes from. */
  sub?: string;
  senses: GlossarySense[];
  /** A last faded line (the book's story, the order of the moves). */
  note?: string;
}

export interface GlossarySection {
  title: string;
  /** Shown at the foot of each of its pages. */
  source?: string;
  entries: GlossaryEntry[];
}

const BARBERO = 'AFTER A. BARBERO';
const PELLAI = 'AFTER PELLAI AND TAMBORINI (2021)';

/** A bullying entry: its meaning and the key idea, circled. */
function word(id: string, head: string, pos: 'NOUN,' | 'PHRASE,', meaning: string, idea: string, note?: string): GlossaryEntry {
  return { id, head, senses: [{ label: pos, text: meaning }, { label: 'KEY IDEA,', text: idea, ring: true }], ...(note ? { note } : {}) };
}

/** A key word of the book: one per chapter, each with the chapter's story. */
function key(id: string, head: string, pos: 'NOUN,' | 'PHRASE,', meaning: string, idea: string, story: string): GlossaryEntry {
  return word(id, head, pos, meaning, idea, `IN THE BOOK: ${story}`);
}

export const GLOSSARY_SECTIONS: readonly GlossarySection[] = [
  {
    title: 'THE GAME',
    entries: [
      {
        id: 'supervillain',
        head: 'SUPERVILLAIN,\nSUPERVILLAINED',
        sub: '/ˈsuːpərvilən/',
        senses: [
          { label: 'A) NOUN,', text: 'A FICTIONAL VILLAIN HAVING EXTRAORDINARY OR SUPERHUMAN POWERS', faded: true },
          { label: 'B) VERB,', text: 'TO GROW UP STRONG;\nTO GET CHARACTER', ring: true },
        ],
      },
    ],
  },
  {
    title: 'THE CRUSADE',
    source: BARBERO,
    entries: [
      {
        id: 'crusader',
        head: 'CRUSADER',
        sub: 'LATIN: CRUCESIGNATUS',
        senses: [
          { label: 'NOUN,', text: 'SIGNED WITH THE CROSS: ONE WHO VOWED TO GO, A CLOTH CROSS SEWN ON HIS CLOTHES.' },
          { label: 'VALUES,', text: 'A PROMISE ALL CAN SEE; FAITH; THE PARDON OF HIS SINS, WORTH RISKING HIS SKIN.', ring: true },
        ],
        note: "'CRUSADE' IS A MODERN WORD. TO THEM, JERUSALEM WAS WORTH DYING FOR.",
      },
      {
        id: 'knight',
        head: 'KNIGHT',
        sub: "CLARI'S OLD FRENCH:\nLI POVRE CHEVALIER",
        senses: [
          { label: 'NOUN,', text: 'A LORD TO THE PEASANTS, BUT A POOR KNIGHT NEXT TO LI RIKE HOMME, THE RICH MEN.' },
          { label: 'VALUES,', text: 'HONOUR AND SHAME; LOYALTY TO HIS LORD; THE VANGUARD; NEVER TURNING BACK.', ring: true },
        ],
        note: 'THE RICH MEN TOOK THE BEST HOUSES AND THE FINEST LOOT; THE POOR KNIGHTS, ONLY SILVER.',
      },
      {
        id: 'journey',
        head: 'JOURNEY,\nPILGRIMAGE',
        senses: [
          { label: 'NOUN,', text: 'THE HOLY VOYAGE TO JERUSALEM: THE CRUSADERS CALLED THEMSELVES PILGRIMS.' },
          { label: 'VALUES,', text: 'LEAVING HOME FOR GOD; ADVENTURE; WONDER AT THE WORLD; COMING HOME TO GIVE.', ring: true },
        ],
        note: 'ROBERT CAME HOME TO PICARDY WITH RELICS, AND GAVE THEM TO HIS PARISH.',
      },
    ],
  },
  {
    title: 'BULLYING: KEY WORDS',
    source: PELLAI,
    entries: [
      key('courage', 'COURAGE', 'NOUN,', 'CHOOSING TO HELP SOMEONE IN TROUBLE INSTEAD OF LOOKING AWAY.', 'IT WORKS WHEN MANY SHARE IT: IF THE GROUP STEPS IN, THE BULLY ENDS UP ALONE.', 'WILLY MONTEIRO DUARTE'),
      key('resilience', 'RESILIENCE', 'NOUN,', 'TURNING A PAINFUL EXPERIENCE INTO A CHANCE TO BRING OUT YOUR BEST.', "DON'T STAY UNDER THE WAVE: LEARN TO RIDE IT.", 'MIKA'),
      key('awareness', 'AWARENESS', 'NOUN,', "UNDERSTANDING THE WEIGHT YOUR ACTIONS HAVE ON OTHER PEOPLE'S LIVES.", 'EVEN A BULLY CAN CHANGE, BY THINKING OVER HIS MISTAKES.', 'DANIEL ZACCARO'),
      key('power', 'POWER', 'NOUN,', 'THE ABILITY TO LEAVE A MARK AND TO INFLUENCE OTHERS.', 'NOT GOOD OR BAD IN ITSELF: WHAT COUNTS IS HOW YOU CHOOSE TO USE IT.', 'GANDHI AND HITLER'),
      key('victim', 'VICTIM', 'NOUN,', 'SOMEONE SINGLED OUT AS THE TARGET OF REPEATED ATTACKS.', 'NOTHING IS WRONG WITH YOU: BREAK THE SILENCE AND ASK FOR HELP.', 'SUSAN BOYLE'),
      key('team-or-pack', 'TEAM OR PACK?', 'PHRASE,', 'A TEAM WORKS TOGETHER AND PROTECTS EVERYONE; A PACK COMPETES AND CRUSHES THE WEAKEST.', 'BULLYING IS PREVENTED BY TURNING THE GROUP INTO A TEAM.', 'THE VOLLEYBALL MATCH'),
      key('cyberbullying', 'CYBERBULLYING', 'NOUN,', 'BULLYING ONLINE: INSULTS, PHOTOS OR VIDEOS SPREAD TO HUMILIATE.', "WHAT HAPPENS ONLINE HURTS IN REAL LIFE, AND A CLICK CAN'T STOP IT.", 'CAROLINA PICCHIO'),
      key('diversity', 'DIVERSITY', 'NOUN,', 'WHAT SETS YOU APART FROM OTHERS AND FROM IMPOSED STANDARDS.', "IT BECOMES A STRENGTH WHEN YOU STOP SEEING YOURSELF THROUGH OTHERS' EYES.", 'WINNIE HARLOW'),
      key('self-esteem', 'SELF-ESTEEM', 'NOUN,', 'THE VALUE YOU GIVE YOURSELF, LIMITS AND STRENGTHS INCLUDED.', 'BELIEVING IN YOURSELF MAKES YOU A HARD TARGET, AND MAKES OTHERS STRONGER TOO.', 'DANIELE CASSIOLI'),
      key('i-say-no', 'I SAY NO', 'PHRASE,', 'SPEAKING OUT AGAINST AN INJUSTICE INSTEAD OF PUTTING UP WITH IT OR IGNORING IT.', 'EVEN THE YOUNGEST CAN CHANGE THINGS, ABOVE ALL TOGETHER.', 'GRETA THUNBERG, CLAUDETTE COLVIN, ERIN BROCKOVICH, #METOO'),
    ],
  },
  {
    title: 'BULLYING: ROLES',
    source: PELLAI,
    entries: [
      word('bully', 'BULLY', 'NOUN,', 'SOMEONE WHO USES FORCE, WORDS OR EXCLUSION TO DOMINATE OTHERS.', 'BULLYING HIDES WEAKNESS: ANGER AND PAIN WITH NO WORDS BECOME FISTS. NOT A LABEL FOR LIFE.'),
      word('bystander', 'BYSTANDER', 'NOUN,', 'SOMEONE WHO WATCHES AND KEEPS QUIET, OFTEN AFRAID OF BEING THE NEXT TARGET.', "SILENCE LEAVES THE FIELD TO THE BULLY; THE BYSTANDER'S CHOICE CAN TURN THE SCENE AROUND."),
      word('trusted-adult', 'TRUSTED ADULT', 'NOUN,', 'A PARENT, A TEACHER, THE HEAD TEACHER OR THE SCHOOL COUNSELLOR.', 'THEY MUST KNOW WHAT IS HAPPENING: THEY ARE ON YOUR SIDE, EVEN IF YOU GOT INTO TROUBLE.'),
      word('keyboard-warrior', 'KEYBOARD WARRIOR', 'NOUN,', 'SOMEONE WHO FEELS FREE TO INSULT FROM BEHIND A SCREEN OR A FAKE PROFILE.', "'I DIDN'T THINK ABOUT IT' DOES NOT UNDO THE HARM."),
    ],
  },
  {
    title: 'BULLYING: DYNAMICS',
    source: PELLAI,
    entries: [
      word('bullying', 'BULLYING', 'NOUN,', 'MAKING SOMEONE SUFFER ON PURPOSE, AGAIN AND AGAIN, TO FEEL STRONGER.', 'IT AIMS TO FRIGHTEN: IF EVERYONE RUNS AWAY, THE BULLY WINS.'),
      word('target', 'TARGET', 'NOUN,', 'THE ONE PICKED ON FOR A WEAK SPOT OR A DIFFERENCE.', 'ACCEPTING YOUR WEAK SPOTS TAKES POWER FROM THOSE WHO USE THEM AGAINST YOU.'),
      word('exclusion', 'EXCLUSION', 'NOUN,', "BULLYING MADE OF THINGS THAT DON'T HAPPEN: NO INVITATION, SILENCES, ROLLED EYES.", 'YOU CAN HURT SOMEONE WITHOUT TOUCHING OR INSULTING THEM.'),
      word('silence', 'SILENCE', 'NOUN,', 'THE MOST COMMON REACTION OF VICTIMS AND BYSTANDERS, OUT OF SHAME OR FEAR.', 'IT LETS BULLYING GO ON: BREAK IT BY TALKING TO SOMEONE.'),
      word('joke', 'JOKE', 'NOUN,', 'SOMETHING THAT MAKES THE ONE ON THE RECEIVING END SMILE TOO.', "IF IT HUMILIATES OR SHAMES, IT'S NOT A JOKE."),
      word('stereotype', 'STEREOTYPE', 'NOUN,', 'ONE MODEL OF BEAUTY OR STRENGTH THAT EVERYONE IS SUPPOSED TO MATCH.', 'PERFECT PICTURES ARE RETOUCHED; CHASING THEM ERASES WHAT MAKES YOU UNIQUE.'),
    ],
  },
  {
    title: 'BULLYING: POWER',
    source: PELLAI,
    entries: [
      word('power-to-act', 'POWER TO ACT', 'NOUN,', 'YOUR OWN ABILITY TO LEAVE A MARK: AT SCHOOL, IN SPORT, IN ART, WITH OTHERS.', 'WE ALL NEED IT; WHAT COUNTS IS HOW YOU EARN IT.'),
      word('power-of-service', 'POWER OF SERVICE', 'NOUN,', 'POWER AT THE SERVICE OF OTHERS: WITH ALLIES, FOR THOSE IN NEED, THROUGH YOUR SKILLS, OVER THOSE YOU LEAD.', 'USED WELL IT BECOMES COMPETENCE; USED BADLY IT STAYS A FORCE THAT OPPRESSES.'),
      word('domination', 'DOMINATION', 'NOUN,', 'FEELING STRONG BY CRUSHING OTHERS.', "IT'S THE SHORTCUT: IT MAKES YOU FEARED, NOT CAPABLE."),
      word('competence', 'COMPETENCE', 'NOUN,', 'FEELING STRONG THROUGH WHAT YOU CAN DO AND SHARE.', 'IT MAKES YOUR LIFE BETTER, AND THE LIVES OF THOSE AROUND YOU.'),
      word('responsibility', 'RESPONSIBILITY', 'NOUN,', 'THE DUTY THAT COMES WITH ALL POWER.', 'THE MORE POWER YOU HAVE, THE HARDER YOU MUST WORK SO THAT EVERYONE TAKES PART.'),
    ],
  },
  {
    title: 'BULLYING: WHAT TO DO',
    source: PELLAI,
    entries: [
      word('say-stop', 'SAY STOP', 'PHRASE,', "A FIRM, CLEAR MESSAGE THAT BLOCKS THE BULLY'S ACTION.", "THE FIRST MOVE. IF YOU CAN'T DO IT ALONE, GO TO THE SECOND.", 'MOVE 1 OF 3'),
      word('tell-someone', 'TELL SOMEONE', 'PHRASE,', 'TELLING A TRUSTED ADULT EVERYTHING.', 'ONCE AN ADULT KNOWS, HELP GETS MOVING.', 'MOVE 2 OF 3'),
      word('get-support', 'GET SUPPORT', 'PHRASE,', 'GETTING HELP TO LEAVE THE ROLE OF VICTIM AND TO HEAL THE WOUNDS INSIDE.', 'ASKING FOR HELP IS THE MOST IMPORTANT THING TO DO.', 'MOVE 3 OF 3'),
      word('empathy', 'EMPATHY', 'NOUN,', 'IMAGINING AND FEELING WHAT THE OTHER PERSON FEELS.', 'IT STOPS THE HAND BEFORE IT STRIKES.'),
      word('two-chairs', 'THE TWO CHAIRS GAME', 'NOUN,', 'AN ACTIVITY IN WHICH THE BULLY AND THE VICTIM SWAP PLACES.', "IN SOMEONE ELSE'S SHOES YOU FEEL THE WEIGHT OF YOUR ACTIONS."),
      word('three-rs', 'THE THREE RS', 'NOUN,', 'RESPONSIBILITY, RESPECT, RECIPROCITY: THE RULES FOR EVERY CLICK.', 'THINK BEFORE YOU POST; YOUR WORDS SAY A LOT ABOUT YOU; HOW WOULD YOU FEEL IN THEIR PLACE?'),
      word('virtual-is-real', 'VIRTUAL IS REAL', 'PHRASE,', 'THE FIRST POINT OF THE MANIFESTO OF NON-HOSTILE COMMUNICATION.', 'ONLINE, DO ONLY WHAT YOU WOULD HAVE THE COURAGE TO DO IN PERSON.'),
      word('postal-police', 'POSTAL POLICE', 'NOUN,', 'IN ITALY, THE POLICE WHO DEAL WITH WHAT HAPPENS ONLINE.', 'AGAINST CYBERBULLYING THERE IS REAL HELP.'),
      word('all-for-one', 'ALL FOR ONE,\nONE FOR ALL', 'PHRASE,', 'THE MOTTO OF A GROUP THAT WORKS AS A TEAM.', 'A UNITED GROUP IS WORTH MORE THAN THE SUM OF ITS MEMBERS.'),
      word('cooperation', 'COOPERATION', 'NOUN,', 'PUTTING YOUR SKILLS AT THE SERVICE OF THE GROUP.', 'THE OPPOSITE OF THE PACK, AND THE REAL PREVENTION.'),
      word('inclusion', 'INCLUSION', 'NOUN,', 'WELCOMING EVERYONE, WHATEVER THEIR ORIGIN, RELIGION, GENDER, ORIENTATION, HEALTH OR MEANS.', 'THERE ARE NO SECOND-CLASS PEOPLE.'),
      word('seeing-with-the-heart', 'SEEING WITH\nTHE HEART', 'PHRASE,', 'SEEING PEOPLE BEYOND THEIR LOOKS.', 'LOOK AT WHAT IS ESSENTIAL, NOT AT THE FLAW.'),
    ],
  },
];

/** Every page in order, with its section. */
export const GLOSSARY_PAGES: ReadonlyArray<{ entry: GlossaryEntry; section: GlossarySection; sectionIndex: number }> =
  GLOSSARY_SECTIONS.flatMap((section, sectionIndex) => section.entries.map((entry) => ({ entry, section, sectionIndex })));

/** The page that `step` sections away from `page` starts on (wrapping around). */
export function sectionStart(page: number, step: number): number {
  const n = GLOSSARY_SECTIONS.length;
  const current = GLOSSARY_PAGES[page]?.sectionIndex ?? 0;
  const target = (((current + step) % n) + n) % n;
  return GLOSSARY_PAGES.findIndex((p) => p.sectionIndex === target);
}

/** Press Start 2P at 8 px (ui/pixelFont.ts): advance and line height of a glyph at scale 1. */
export const GLYPH = 8;
/** Gap between lines of the card's text (px). */
export const LINE_GAP = 3;

/** Greedy word wrap at `maxChars` (as PixelText does), keeping '\n'; long words are cut. */
export function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  const max = Math.max(1, maxChars);
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(' ').filter((s) => s.length > 0)) {
      if (!line) line = w;
      else if (line.length + 1 + w.length <= max) line += ` ${w}`;
      else {
        out.push(line);
        line = w;
      }
      while (line.length > max) {
        out.push(line.slice(0, max));
        line = line.slice(max);
      }
    }
    out.push(line);
  }
  return out;
}

export type GlossaryTextStyle = 'heading' | 'section' | 'head' | 'sub' | 'label' | 'labelFaded' | 'body' | 'faded' | 'ringed' | 'small';

/** A placed piece of a page, in px from the card's inner top-left corner (`gap`: between lines). */
export type GlossaryItem =
  | { kind: 'text'; style: GlossaryTextStyle; lines: string[]; x: number; y: number; w: number; h: number; gap: number }
  | { kind: 'rule'; x: number; y: number; w: number }
  | { kind: 'ring'; cx: number; cy: number; rx: number; ry: number; n: number };

export interface GlossaryLayout {
  items: GlossaryItem[];
  /** Height of the page's text (the counter and buttons go under it). */
  height: number;
}

/**
 * Spacing of a page (px). COMPACT is for short views (a desktop window, at most 0.62 as wide as
 * it is tall, can be only about 300 px high): no GLOSSARY heading, tighter gaps and lines.
 */
const NORMAL = { heading: true, section: 9, head: 3, rule: 5, sub: 10, label: 4, labelRing: 10, body: 11, ring: 14, note: 8, source: 8, line: LINE_GAP };
const COMPACT = { heading: false, section: 6, head: 2, rule: 4, sub: 5, label: 2, labelRing: 8, body: 6, ring: 10, note: 4, source: 4, line: 2 };

/**
 * The exponent of the hand-drawn ring (a superellipse |x/rx|^n + |y/ry|^n = 1) around centred
 * lines: the roundest of 2 (an ellipse), 4, 6, 8 that keeps every line's ends inside it. A glyph
 * does not fill its cell, so a corner may graze the ring by a few px.
 */
export function ringExponent(lines: string[], rx: number, ry: number, gap: number = LINE_GAP): number {
  const h = lines.length * GLYPH + (lines.length - 1) * gap;
  const fits = (n: number) =>
    lines.every((l, k) => {
      const hx = Math.max(0, (l.length * GLYPH) / 2 - 4);
      const top = k * (GLYPH + gap);
      return [top + 1, top + GLYPH - 1].every((y) => Math.abs(hx / rx) ** n + Math.abs((y - h / 2) / ry) ** n <= 1);
    });
  return [2, 4, 6].find(fits) ?? 8;
}

/** Lays a page out in a card whose inner width is `inner` px (compact: for short views). Pure. */
export function layoutPage(page: number, inner: number, compact = false): GlossaryLayout {
  const { entry, section } = GLOSSARY_PAGES[page]!;
  const S = compact ? COMPACT : NORMAL;
  const items: GlossaryItem[] = [];
  const chars = (w: number) => Math.floor(w / GLYPH);
  let y = 0;
  const text = (style: GlossaryTextStyle, lines: string[], x: number | 'center', scale = 1, bold = false): { x: number; w: number; h: number } => {
    const w = Math.max(0, ...lines.map((l) => l.length)) * GLYPH * scale + (bold ? 1 : 0);
    const h = lines.length * GLYPH * scale + Math.max(0, lines.length - 1) * S.line;
    const px = x === 'center' ? Math.round((inner - w) / 2) : x;
    items.push({ kind: 'text', style, lines, x: px, y, w, h, gap: S.line });
    return { x: px, w, h };
  };
  if (S.heading) y += text('heading', ['GLOSSARY'], 'center', 2, true).h + 4;
  y += text('section', wrapText(section.title, chars(inner)), 'center').h + S.section;
  y += text('head', wrapText(entry.head, chars(inner - 1)), 0, 1, true).h + S.head;
  items.push({ kind: 'rule', x: 0, y, w: inner });
  y += S.rule;
  if (entry.sub) y += text('sub', wrapText(entry.sub, chars(inner)), 0).h + S.sub;
  for (const sense of entry.senses) {
    y += text(sense.faded ? 'labelFaded' : 'label', [sense.label], 0, 1, true).h + (sense.ring ? S.labelRing : S.label);
    if (sense.ring) {
      const lines = wrapText(sense.text, chars(inner - G.RING_PAD_X * 2));
      const t = text('ringed', lines, 'center');
      const rx = t.w / 2 + G.RING_PAD_X;
      const ry = t.h / 2 + G.RING_PAD_Y;
      items.push({ kind: 'ring', cx: t.x + t.w / 2, cy: y + t.h / 2, rx, ry, n: ringExponent(lines, rx, ry, S.line) });
      y += t.h + S.ring;
    } else {
      y += text(sense.faded ? 'faded' : 'body', wrapText(sense.text, chars(inner - 8)), 8).h + S.body;
    }
  }
  if (entry.note) y += text('small', wrapText(entry.note, chars(inner)), 0).h + S.note;
  if (section.source) y += text('small', wrapText(section.source, chars(inner)), 0).h + S.source;
  return { items, height: y };
}

/** Height of the tallest page at this inner width: the card keeps one size as the pages turn. */
export function tallestPage(inner: number, compact = false): number {
  return Math.max(...GLOSSARY_PAGES.map((_, k) => layoutPage(k, inner, compact).height));
}

/** The card's padding (less when compact), its page counter (not when compact), its button row (px). */
export const CARD_PAD = 10;
export const COMPACT_PAD = 6;
export const COUNTER_H = 8;
export const COUNTER_GAP = 6;
export const BUTTON_H = 15;
export const COMPACT_BUTTON_GAP = 5;

/** The card's height around `textH` px of text. */
export function cardHeight(textH: number, compact: boolean): number {
  return (compact ? COMPACT_PAD : CARD_PAD) * 2 + textH + (compact ? COMPACT_BUTTON_GAP : COUNTER_H + COUNTER_GAP) + BUTTON_H;
}

export interface CardFit {
  compact: boolean;
  /** Card width, padding, and the text's width inside. */
  cw: number;
  pad: number;
  inner: number;
  /** Height of the text area (every page fits, unless clipped). */
  textH: number;
  /** Even compact, the tallest page is cut at the bottom (only in views under about 300 px). */
  clipped: boolean;
  cardH: number;
}

/**
 * How the card fits a `viewW` x `viewH` view: the normal layout (8 px margins) if it fits, else
 * the compact one (no heading, no counter, tighter gaps, 4 px margins, less padding), else the
 * compact one cut to the view, so the buttons always stay on the screen. Pure (tested).
 */
export function fitCard(viewW: number, viewH: number, cardWidth: number = G.CARD_WIDTH): CardFit {
  const cw = Math.min(viewW - 16, cardWidth);
  const inner = cw - CARD_PAD * 2;
  const normal = tallestPage(inner, false);
  if (cardHeight(normal, false) <= viewH - 16) {
    return { compact: false, cw, pad: CARD_PAD, inner, textH: normal, clipped: false, cardH: cardHeight(normal, false) };
  }
  const ccw = Math.min(viewW - 8, cardWidth);
  const cinner = ccw - COMPACT_PAD * 2;
  const tall = tallestPage(cinner, true);
  const textH = Math.min(tall, Math.max(40, viewH - 8 - cardHeight(0, true)));
  return { compact: true, cw: ccw, pad: COMPACT_PAD, inner: cinner, textH, clipped: textH < tall, cardH: cardHeight(textH, true) };
}
