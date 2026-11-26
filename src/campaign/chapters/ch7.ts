import { STORY } from '../../config';
import type { Point } from '../../entities/actor';
import type { PropEntity } from '../../entities/prop';
import { carry, dropCarried } from '../../story/carry';
import { TugGame, mini } from '../../story/minigames';
import { ask, branch, call, card, fx, say, sound, stage } from '../../story/steps';
import type { StoryScene } from '../../story/storyScene';
import { walk } from '../../story/walk';
import { C } from '../../ui/retro';
import { spend } from '../state';
import { CHAPTER_TITLES } from '../titles';
import type { ChapterDef } from '../types';
import { followLeader, lullWalk, placeObject, sounder } from './helpers';

/** 7.3: progress along the march, from the start toward the walls. */
function along(p: Point, start: Point, f: Point): number {
  return (p.x - start.x) * f.x + (p.y - start.y) * f.y;
}

/** The city's places that come back changed (7.4 → 7.9). */
const COLUMN = '5';
const HERCULES = '1';
const DOORWAY = '9';

/**
 * Level 7 — Constantinople, June 1203 to May 1204: splendor, entry, conquest. Six phases: the
 * approach and reciprocal astonishment; the July 1203 action (the Doge's banner, Pierre's walk);
 * the restored city, open to visit; unpaid promises and fire; the coup and the April 1204
 * assaults (Aleaume's breach); the sack and the unequal distribution. Clari's wonder and
 * complaint meet Niketas Choniates's account of the same streets (docs/STORY.md, chapter 7).
 */
export const CH7: ChapterDef = {
  number: 7,
  title: CHAPTER_TITLES[6],
  intro: 'JUNE 1203 TO SPRING 1204. THE CITY FILLS THE SCREEN AND LOOKS BACK. IT WILL TAKE A YEAR, THREE EMPERORS CALLED ALEXIOS, A FIRE AND A HOLE IN A WALL BEFORE THE SMALL KNIGHT IS INSIDE IT. BY THEN IT IS NOT THE SAME CITY.',
  cast: "SBRIMBRULON AS PIERRE D'AMIENS; CONFUSIONE AS ALEAUME; BAGNASKIZ AS THE MARSHAL, AND HIS FACE ON ALEXIOS III AND ALEXIOS V; THE YOUNG ALEXIOS IV; NIKETAS CHONIATES AS HIMSELF; WATSON; JACK; SANTINA AT A WINDOW",
  theme: 'constantinople',
  music: 'medieval',
  professor: {
    text: 'CLARI SAYS NO HARM WAS DONE TO POOR OR RICH. NIKETAS SAYS NO ONE WAS WITHOUT A SHARE IN THE GRIEF. THEY WERE IN THE SAME CITY ON THE SAME DAYS, YOU UNDERSTAND. ONE OF THEM WAS STANDING IN HIS OWN DOORWAY.',
  },
  subLevels: [
    {
      id: '7.1',
      title: 'Looking both ways',
      happens:
        "THE CITY FILLS THE SCREEN IN SATURATED COLOR, AND EVERY WALL AND ROOF IS FULL OF PEOPLE LOOKING BACK. LOOK AT THE WALLS, THE ROOFS AND THE DOMES. THEN ROW THE YOUNG ALEXIOS ALONG THE WALLS SO THE CITY CAN RECOGNIZE ITS PRINCE. NOBODY RECOGNIZES HIM.",
      source:
        "CLARI 40-41 (DEREMILITARI): THE PEOPLE WATCH FROM THE WALLS AND THE ROOFTOPS, AND THE CREWS LOOK ON THE CITY WITH WONDER; TEN GALLEYS SHOW THE YOUNG MAN AND THE CITY WILL NOT KNOW HIM. VILLEHARDOUIN PP. 35-36: THE SAME SHOWING. NIKETAS CHONIATES APPEARS AS HIMSELF; HIS LINES ARE ORIGINAL.",
      script: () => [
        call((ctx) => {
          ctx.setStage('city', { at: 'S' });
          ctx.bleach = -0.6;
        }),
        card('CONSTANTINOPLE', 'THE CITY FILLS THE SCREEN, AND LOOKS BACK', { color: C.yellow, seconds: 2.2 }),
        walk({
          objective: 'LOOK FROM THE CAMP TOWARDS THE DOMES',
          action: 'LOOK',
          pickups: [
            { at: '7', kind: 'marvel', label: 'THE GREAT WALLS', text: 'TOWER AFTER TOWER, AS FAR AS THE SEA', effects: { marvel: 'THE GREAT WALLS', commozione: 3 } },
            { at: '3', kind: 'marvel', label: 'THE CITY OF ROOFS', text: 'EVERY ROOF IS FULL OF PEOPLE STARING BACK', effects: { marvel: 'THE CITY OF ROOFS', commozione: 3 } },
            { at: '4', kind: 'marvel', label: 'THE GOLDEN DOMES', text: 'THEY SHINE EVEN WHEN THE SUN DOES NOT', effects: { marvel: 'THE GOLDEN DOMES', commozione: 3 } },
          ],
          onAction: (ctx) => ctx.say('OOOH.', { x: ctx.player.gx, y: ctx.player.gy }, C.yellow),
        }),
        card('NIKETAS CHONIATES', 'AN OFFICIAL OF THE EMPIRE, AND A HISTORIAN. NOBODY FROM THE LAWN: THE DREAM HAS NO FACE TO LEND HIM.', { color: '#c8a0ff', seconds: 3 }),
        say('niketas', 'THE BEGINNING OF JULY, IN THE YEAR 6711 SINCE THE CREATION OF THE WORLD. FROM OUR ROOFS THEY LOOK LIKE A FAIR THAT HAS LOST ITS WAY.'),
        say('niketas', 'THOSE OF THE WEST. LATINS. BARBARIANS WITH SHAVEN CHEEKS, SO THEY ALL LOOK YOUNG. WHO ARE THEY BRINGING US?'),
        say('voice', 'ROW THE YOUNG ALEXIOS ALONG THE WALLS. HIS SUBJECTS WILL RECOGNIZE HIM.'),
        mini(() => new TugGame({ objective: 'ROW THE YOUNG ALEXIOS ALONG THE WALLS', label: 'ROW! (TAP)', friend: 'prince' }), { lost: { commozione: 3 } }),
        say('niketas', 'WHO IS THAT BOY? WE ROMANS HAVE AN EMPEROR.'),
        card('NOBODY KNOWS HIM', 'NO AMOUNT OF ROWING WILL MAKE HIM WELCOME', { color: C.red, seconds: 2.4 }),
        say('zampano', 'THERE WAS A PRINCE, AND NOBODY HAD EVER SEEN HIM.', { remembered: true }),
      ],
    },
    {
      id: '7.2',
      title: "The Doge's banner",
      happens:
        "17 JULY 1203, AT THE SEA WALLS. THE OLD, BLIND DOGE HAS HIMSELF PUT ASHORE WITH THE BANNER OF SAINT MARK. FOLLOW IT THROUGH THE LANDING WHILE AXE-BEARING GUARDS APPEAR AT THE PARAPET. THEY COME DOWN: HOLD YOUR GROUND BY THE BANNER, SHIELD UP, UNTIL THE VENETIANS HOLD THE TOWERS. THEN CARRY WORD TO THE LANDWARD CAMP: THE EMPEROR HAS COME OUT WITH A MUCH LARGER FORCE.",
      source:
        "VILLEHARDOUIN PP. 41-45: THE ASSAULT OF 17 JULY; THE DOGE LANDS WITH THE STANDARD OF SAINT MARK ('MORE THAN FORTY PEOPLE TOLD HIM': HE DID NOT SEE IT HIMSELF); THE VENETIANS TAKE TOWERS; ALEXIOS III COMES OUT. CLARI 44 AND 46: HIS ESTIMATE OF THE EMPEROR'S HORSEMEN (A CLAIM); THE VENETIANS FIRE PART OF THE CITY 'AS LARGE AS THE CITY OF ARRAS'. THE STAND BY THE BANNER AGAINST THE AXE-MEN IS ADAPTATION.",
      script: () => {
        let banner: PropEntity | null = null;
        return [
          call((ctx) => {
            ctx.setStage('field', { at: 'S' });
            ctx.addActor('doge', 'doge', { x: ctx.marker('S').x - 0.6, y: ctx.marker('S').y - 1 }, { kind: 'idle', face: 'N' });
            banner = placeObject(ctx, 'banner', { x: ctx.marker('S').x - 0.3, y: ctx.marker('S').y - 1.1 });
          }),
          card('17 JULY 1203', 'THE SEA WALLS', { color: C.orange, seconds: 1.8 }),
          say('doge', 'I AM OLD AND BLIND. GIVE ME THE BANNER OF SAINT MARK AND PUT ME ASHORE.'),
          followLeader({
            objective: "FOLLOW THE DOGE'S BANNER THROUGH THE LANDING",
            leader: 'doge',
            path: ['3', { x: 8.5, y: 12.5 }, '1'],
            speed: 1.9,
            onReach: (ctx, k) => {
              if (k !== 1) return;
              ['8', '9', '7'].forEach((m, n) => ctx.addActor(`v${n}`, 'varangian', m, { kind: 'idle', face: 'S' }));
              ctx.notice('THE AXE-BEARING BARBARIANS, DANES AND ENGLISH, AT THE PARAPET', C.red);
            },
            onUpdate: (ctx) => {
              const d = ctx.actor('doge');
              banner?.setPosition(d.gx + 0.3, d.gy - 0.1);
            },
          }),
          call((ctx) => {
            // (They appeared at the parapet during the landing; a skipped landing still has them.)
            ['8', '9', '7'].forEach((m, n) => {
              const a = ctx.actors.get(`v${n}`) ?? ctx.addActor(`v${n}`, 'varangian', m, { kind: 'idle', face: 'S' });
              a.setBehavior({ kind: 'idle', face: 'player' });
            });
          }),
          card('THE AXES COME DOWN', 'THE GUARDS LEAVE THE PARAPET. STAND BY THE BANNER, SHIELD UP, UNTIL THE VENETIANS HOLD THE TOWERS.', { color: C.red, seconds: 2.6 }),
          walk({
            objective: 'HOLD YOUR GROUND BY THE BANNER',
            survive: 18,
            fight: {
              foes: ['v0', 'v1', 'v2'],
              rout: 0,
              hp: 3,
              speed: 1.2,
              radius: 6,
              leash: 9,
              parry: true,
              routLines: ['BACK TO THE WALL!', 'TO THE EMPEROR!', 'THE TOWERS ARE LOST!'],
              knockedText: 'UP AGAIN. THE RING UNDER AN AXE-MAN FILLS: SHIELD UP.',
            },
          }),
          call((ctx) => {
            for (const n of ['v0', 'v1', 'v2']) ctx.actor(n).setBehavior({ kind: 'goto', to: { x: ctx.actor(n).gx, y: 3.5 }, speed: 1.6 });
          }),
          card('THE TOWERS', 'THE VENETIANS TAKE TOWERS ALONG THE SEA WALL. THE AXE-MEN FALL BACK.', { color: C.orange, seconds: 2.2 }),
          say('marshal', "(LATER, IN THE MARSHAL'S BOOK) I DID NOT SEE THE BANNER ON THE TOWER MYSELF. MORE THAN FORTY PEOPLE TOLD ME."),
          say('doge', 'GO. TELL THE CAMP ON THE LAND SIDE. WHAT COMES OUT OF THAT GATE IS NOT SMALL.'),
          carry('WORD FOR THE CAMP'),
          walk({ objective: 'CARRY WORD TO THE LANDWARD CAMP', goal: { reach: '2', label: 'LANDWARD CAMP' } }),
          dropCarried(),
          card('A MUCH LARGER FORCE', 'HAS COME OUT TO MEET THEM. CLARI WILL SAY A HUNDRED THOUSAND HORSEMEN.', { color: C.red, seconds: 2.4 }),
          say('zampano', 'THERE WAS A BANNER, AND A BLIND MAN WAS CARRYING IT.', { remembered: true }),
        ];
      },
    },
    {
      id: '7.3',
      title: 'Stay beside Pierre',
      happens:
        "BAGNASKIZ WEARS THE FACE OF THE EMPEROR ALEXIOS III. THE COUNT OF FLANDERS TURNS BACK. PIERRE AND THE COUNT OF SAINT-POL GO ON AT A WALK, AND EVEN THE COOKS COME OUT WITH POTS AND PESTLES. HOLD LEVEL WITH PIERRE'S SHOULDER. HIGH ON THE WALLS A WOMAN WITH SANTINA'S FACE IS WATCHING; THE WIND TAKES WHAT SHE SAYS. THE EMPEROR TURNS FOR THE CITY. NOBODY STRIKES A BLOW.",
      source:
        "CLARI 45-48 (DEREMILITARI): PETER OF AMIENS AND THE COUNT OF SAINT-POL IN THE SECOND BATTALION; GROOMS AND COOKS ARMED WITH 'COPPER POTS AND WITH PESTLES'; FLANDERS TURNS BACK, SAINT-POL AND PETER WILL NOT 'TURN BACK ONE STEP'; THE LADIES AT THE PALACE WINDOWS SAY 'IT SEEMED AS IF OUR WARRIORS WERE ANGELS' (47); FLANDERS SPURS ON AND RIDES BESIDE THEM (48). VILLEHARDOUIN PP. 43-45: ALEXIOS III RETIRES WITHOUT ATTACKING. THE WINDOW AND SANTINA'S FACE ARE ADAPTATION; THE OLD SOISSONS LINE IS REMOVED.",
      script: () => {
        const S = STORY.SHOULDER;
        let nerve = 1;
        let warnT = 0;
        let rejoined = false;
        let pots = false;
        let windowT = 1.5;
        const reset = (ctx: StoryScene) => {
          const s0 = ctx.marker('S');
          ctx.player.setPosition(s0.x, s0.y);
          ctx.actor('sbrim').setPosition(s0.x - 1, s0.y);
          ctx.actor('sbrim').setBehavior({ kind: 'goto', to: { x: ctx.marker('1').x - 1, y: ctx.marker('1').y }, speed: S.SPEED });
          ctx.world!.snapCamera();
          nerve = 1;
          ctx.metrics.restarts++;
        };
        return [
          call((ctx) => {
            ctx.setStage('field');
            ctx.addActor('emperor', 'bagnaskizEmperor', '9', { kind: 'idle', face: 'S' });
            ctx.addActor('v1', 'varangian', '8', { kind: 'idle', face: 'S' });
            ctx.addActor('v2', 'varangian', '7', { kind: 'idle', face: 'S' });
            ctx.addActor('flanders', 'knight', '3', { kind: 'idle', face: 'N' });
            ctx.addActor('window', 'santina', { x: 13.5, y: 7.5 }, { kind: 'idle', face: 'SW' });
            const s0 = ctx.marker('S');
            ctx.addActor('sbrim', 'sbrimbrulonKnight', { x: s0.x - 1, y: s0.y }, { kind: 'idle', face: 'N' });
            ctx.addActor('stpol', 'knight', { x: s0.x + 1, y: s0.y + 0.4 }, { kind: 'idle', face: 'N' });
          }),
          card('A FAMILIAR FACE', 'BAGNASKIZ, AS THE EMPEROR ALEXIOS III, THE UNCLE ON THE THRONE', { color: '#c070f0', seconds: 2.2 }),
          say('emperor', 'I RIDE OUT. ALL OF YOU. AT THEM.'),
          card('CHARGE?', '', { color: C.red, seconds: 1 }),
          say('knight', 'THE COUNT OF FLANDERS TURNS BACK! BACK TO THE CAMP!'),
          call((ctx) => ctx.actor('flanders').setBehavior({ kind: 'goto', to: ctx.marker('2'), speed: 3.2, run: true })),
          say('sbrimbrulon', 'WE WILL NOT TURN BACK AT ALL. LORDS, RIDE ON, IN GOD\'S NAME. AT A WALK. STAY AT MY SHOULDER, LITTLE ONE.'),
          say('knight', '(BEHIND THEM, THE CAMP) LORD GOD, KEEP THEM TODAY, AND ALL THEIR COMPANY!'),
          call((ctx) => {
            ctx.actor('sbrim').setBehavior({ kind: 'goto', to: { x: ctx.marker('1').x - 1, y: ctx.marker('1').y }, speed: S.SPEED });
            ctx.actor('stpol').setBehavior({ kind: 'follow', target: ctx.actor('sbrim'), distance: 2, speed: 2, side: 1.2 });
          }),
          walk({
            objective: 'STAY LEVEL WITH PIERRE',
            noRun: true,
            pilot: (ctx) => {
              const s = ctx.actor('sbrim');
              return { target: { x: s.gx + 1, y: s.gy }, hold: true };
            },
            onUpdate: (ctx, w, dt) => {
              const p = ctx.player;
              const sb = ctx.actor('sbrim');
              const s0 = ctx.marker('S');
              const g = ctx.marker('1');
              const fl = Math.hypot(g.x - s0.x, g.y - s0.y) || 1;
              const f = { x: (g.x - s0.x) / fl, y: (g.y - s0.y) / fl };
              const diff = along({ x: p.gx, y: p.gy }, s0, f) - along({ x: sb.gx, y: sb.gy }, s0, f);
              const side = Math.abs((p.gx - sb.gx) * f.y - (p.gy - sb.gy) * f.x);
              const level = Math.abs(diff) < S.BAND && side < 3;
              nerve = Math.max(0, Math.min(1, nerve + (level ? S.GAIN : -S.LOSE) * dt));
              warnT -= dt;
              if (!level && warnT <= 0) {
                warnT = 2.4;
                ctx.notice(diff > 0 ? 'HE BOLTS AHEAD. EASE BACK INTO STEP' : side >= 3 ? 'STAY AT HIS SHOULDER' : 'HE DROPS BACK. EASE INTO STEP', C.orange);
              }
              ctx.hud.setMode({ label: 'NERVE: LEVEL WITH PIERRE', value: nerve, color: 0xff7a1f });
              const done = along({ x: sb.gx, y: sb.gy }, s0, f) / fl;
              if (!pots && done > 0.15) {
                pots = true;
                ctx.notice('THE GROOMS AND COOKS COME TOO, WITH POTS AND PESTLES', C.yellow);
              }
              if (!rejoined && done > 0.45) {
                rejoined = true;
                ctx.actor('flanders').setBehavior({ kind: 'follow', target: sb, distance: 2.4, speed: 3, side: -1.2 });
                ctx.notice('FLANDERS COMES ROUND AND REJOINS THEM', C.cyan);
              }
              windowT -= dt;
              if (windowT <= 0 && done > 0.25) {
                windowT = 2.2;
                ctx.say('(...THE WIND TAKES HER WORDS...)', { x: 13.5, y: 7.5 }, '#c8a0ff');
              }
              if (nerve <= 0) {
                ctx.metrics.nerveBroken++;
                ctx.interrupt([card('OUT OF STEP', "BACK TO THE START: STAY LEVEL WITH PIERRE'S SHOULDER", { color: C.red, seconds: 2 }), call(() => reset(ctx))]);
                return;
              }
              if (done > 0.95 && level) w.complete = true;
            },
          }),
          call((ctx) => {
            ctx.actor('emperor').setBehavior({ kind: 'goto', to: { x: ctx.marker('9').x, y: ctx.marker('9').y - 2 }, speed: 2.2 });
            ctx.actor('v1').setBehavior({ kind: 'goto', to: { x: ctx.marker('8').x, y: ctx.marker('8').y - 2 }, speed: 2 });
            ctx.actor('v2').setBehavior({ kind: 'goto', to: { x: ctx.marker('7').x, y: ctx.marker('7').y - 2 }, speed: 2 });
            ctx.apply({ supervillain: 15, value: 'Physical courage', flags: { vanguard: true } });
          }),
          card('THE EMPEROR TURNS FOR THE CITY', 'NOBODY STRIKES A BLOW', { color: C.cyan, seconds: 2.4 }),
          say('zampano', 'THERE WERE A LOT OF THEM, AND THEY WERE SHOUTING.'),
          say('sbrimbrulon', 'LET THEM SHOUT. WE WALKED.'),
          say('zampano', 'THE LADIES ON THE WALLS THOUGHT WE LOOKED LIKE ANGELS. ESPECIALLY ONE OF US.'),
          say('sbrimbrulon', 'WHO TOLD YOU THAT?'),
          say('zampano', 'I COULD TELL.'),
          say('zampano', 'THERE WAS A WINDOW, AND THE WIND TOOK WHAT SHE SAID.', { remembered: true }),
        ];
      },
    },
    {
      id: '7.4',
      title: 'A city to visit',
      happens:
        "ALEXIOS III HAS FLED. ISAAC II IS BROUGHT OUT OF PRISON AND HIS SON IS CROWNED ALEXIOS IV. FOR A WHILE THE PILGRIMS ARE VISITORS. WALK THE CITY WITH WATSON: THE PALACE OF THE LION'S MOUTH, A BRONZE HERCULES, A COLUMN CARVED WITH SHIPS NOBODY CAN READ, AND NIKETAS'S OWN COURTYARD, WITH A LAMP AND A PURPLE CUSHION LIKE THE ONE AT HOME. REMEMBER THE STREET.",
      source:
        "VILLEHARDOUIN PP. 45-48: ALEXIOS III FLEES; ISAAC IS ENTHRONED; THE YOUNG ALEXIUS IS CROWNED (1 AUGUST 1203). CLARI 80 NAMES THE PALACE OF THE LION'S MOUTH; CLARI 92: PILLARS ON WHICH THINGS TO COME WERE 'PORTRAYED AND WRITTEN', READABLE ONLY AFTERWARDS (THE STARTING POINT OF THE COLUMN). CHONIATES (DESTROYED MONUMENTS, PARA. 3): THE GREAT HERCULES. NIKETAS'S COURTYARD, THE LAMP AND THE VISIT ARE ADAPTATION.",
      script: () => [
        stage('city', [
          { name: 'watson', who: 'watson', at: { x: 19.5, y: 20.5 }, face: 'NW' },
          { name: 'niketas', who: 'niketas', at: DOORWAY, face: 'E' },
        ], { at: 'S' }),
        card('ALEXIOS III FLEES', 'ISAAC II IS BROUGHT OUT OF PRISON. HIS SON IS CROWNED ALEXIOS IV.', { color: C.yellow, seconds: 2.4 }),
        call((ctx) => ctx.actor('watson').setBehavior({ kind: 'follow', target: ctx.player, distance: 1.4, speed: 3, side: -0.8 })),
        say('watson', 'MAN, IT IS PEACE. WE ARE VISITORS NOW. DO NOT TOUCH ANYTHING.'),
        walk({
          objective: 'VISIT THE CITY. LOOK AT EVERYTHING',
          action: 'LOOK',
          pickups: [
            { at: '8', kind: 'marvel', label: "THE PALACE OF THE LION'S MOUTH", text: 'A PALACE BY THE SEA, WITH MORE ROOMS THAN THE CAMP HAS TENTS', effects: { marvel: "THE PALACE OF THE LION'S MOUTH", commozione: 3 } },
            { at: HERCULES, kind: 'marvel', label: 'THE BRONZE HERCULES', text: 'A BRONZE GIANT IN A LION SKIN, TIRED, LEANING ON NOTHING', effects: { marvel: 'THE BRONZE HERCULES', commozione: 3 } },
            { at: COLUMN, kind: 'marvel', label: 'THE CARVED COLUMN', text: 'SHIPS, LADDERS, LITTLE MEN CLIMBING. NOBODY CAN SAY WHAT IT MEANS', effects: { marvel: 'THE CARVED COLUMN', commozione: 3 } },
            { at: { x: 4.5, y: 20.5 }, kind: 'marvel', label: "NIKETAS'S COURTYARD", text: 'A LAMP, A FIG TREE, AND A PURPLE CUSHION EXACTLY LIKE THE ONE AT HOME', effects: { marvel: 'A LAMP IN A COURTYARD', commozione: 4 } },
          ],
          onAction: (ctx) => ctx.say('OOOH.', { x: ctx.player.gx, y: ctx.player.gy }, C.yellow),
        }),
        say('niketas', 'YOU MAY LOOK. YOUR PRINCE HAS PROMISED YOUR PEOPLE A GREAT DEAL OF OUR MONEY. LOOK WHILE IT IS STILL HERE.'),
        say('zampano', 'I HAVE A CUSHION LIKE THAT.'),
        say('niketas', 'THEN YOU KNOW WHAT IT IS TO COME HOME TO ONE.'),
        fx({ flags: { visitedCity: true } }),
        say('zampano', 'THERE WAS A CITY, AND IT LET ME IN TO LOOK.', { remembered: true }),
      ],
    },
    {
      id: '7.5',
      title: 'Unpaid promises',
      happens:
        "THE FIRST PAYMENT COMES; THE REST DOES NOT. CARRY THE CHESTS FROM THE PALACE AND WATCH THEM GET LIGHTER. THE DOGE TELLS THE YOUNG EMPEROR WHAT HE THINKS OF HIM FROM A GALLEY. THEN SOME PILGRIMS GO TO BURN THE MOSQUE OF THE CITY'S MUSLIMS, THEIR GREEK NEIGHBOURS COME TO DEFEND IT, AND IN THE FIGHT A FIRE STARTS THAT BURNS FOR TWO DAYS: LEAD A WOMAN OF NIKETAS'S HOUSEHOLD BACK TO HER COURTYARD ALONG THE STREET YOU LEARNED. SHE TELLS HIM NOT TO COME BACK.",
      source:
        "CLARI LVI AND LIX (MUNRO): A FIRST PAYMENT, THEN NO MORE; THE DOGE REBUKES THE YOUNG EMPEROR FROM HIS GALLEYS. VILLEHARDOUIN PP. 48-53: ALEXIUS CANNOT PAY; A RIOT BETWEEN GREEKS AND LATINS, A FIRE THAT BURNS TWO DAYS, THE LATINS OF THE CITY FLEE TO THE CAMP, 'THUS WAS THERE DIVISION BETWEEN THE GREEKS AND THE FRANKS'. BARBERO'S LECTURE ON THE FOURTH CRUSADE: CRUSADERS SET OUT TO BURN THE MOSQUE, THE GREEKS DEFEND THEIR MUSLIM NEIGHBOURS, THE FIRE BURNS THE FORUM OF CONSTANTINE AND PART OF THE HIPPODROME; NIKETAS LOSES HIS PALACE IN IT. REPLACES THE OLD CLIGES EPISODE. THE CHESTS AND THE WOMAN ARE ADAPTATION.",
      script: () => [
        stage('city', [], { at: '8' }),
        say('voice', 'THE FIRST PAYMENT. ALEXIOS IV SENDS IT OUT OF THE PALACE IN CHESTS.'),
        carry('A CHEST'),
        walk({
          objective: 'CARRY THE CHESTS OUT OF THE PALACE',
          pickups: [
            { at: { x: 11.5, y: 6.5 }, kind: 'coin', label: 'A CHEST', text: 'FULL. HALF OF IT IS ALREADY THE VENETIANS\'.' },
            { at: { x: 9.5, y: 8.5 }, kind: 'coin', label: 'ANOTHER CHEST', text: 'HALF FULL. "THE REST AFTER THE HARVEST."' },
            { at: { x: 12.5, y: 9.5 }, kind: 'coin', label: 'THE LAST CHEST', text: 'EMPTY, WITH AN APOLOGY IN IT.' },
          ],
        }),
        dropCarried(),
        call((ctx) => ctx.addActor('doge', 'doge', { x: ctx.player.gx - 1.2, y: ctx.player.gy - 0.8 }, { kind: 'idle', face: 'player' })),
        say('doge', '(FROM HIS GALLEY, TO THE YOUNG EMPEROR) WE PULLED YOU OUT OF THE MUD, BOY. WE CAN PUT YOU BACK IN IT.'),
        call((ctx) => ctx.removeActor('doge')),
        card('THE MOSQUE', "SOME PILGRIMS GO TO BURN THE MOSQUE OF THE CITY'S MUSLIMS. THEIR GREEK NEIGHBOURS COME TO DEFEND IT. IN THE FIGHT, A FIRE. IT BURNS FOR TWO DAYS.", { color: C.red, seconds: 3 }),
        call((ctx) => {
          ctx.player.setPosition(ctx.marker('3').x, ctx.marker('3').y);
          ctx.world!.snapCamera();
          ctx.fog = STORY.SMOKE;
          ctx.addActor('woman', 'householdWoman', { x: ctx.player.gx + 0.8, y: ctx.player.gy + 0.4 }, { kind: 'follow', target: ctx.player, distance: 1, speed: 3, side: 0.5 });
        }),
        say('householdWoman', "(A WOMAN OF NIKETAS'S HOUSEHOLD) I CANNOT SEE MY OWN STREET. YOU WALKED IT WITH YOUR SAILOR. TAKE ME BACK TO THE COURTYARD."),
        walk({
          objective: 'LEAD HER BACK TO THE COURTYARD ALONG THE STREET YOU LEARNED',
          goal: { reach: DOORWAY, label: 'THE COURTYARD' },
          checkpoints: ['2'],
          fire: { from: '1', spread: 0.35, startAfter: (w) => w.time > 0.6 },
        }),
        call((ctx) => (ctx.fog = 0)),
        say('householdWoman', 'THE HOUSE HAS BURNED. THE FIG TREE IS GONE. THE LAMP IS STILL HERE.'),
        say('householdWoman', 'YOUR PEOPLE ARE LEAVING THE CITY FOR YOUR CAMP. GO WITH THEM. DO NOT COME BACK.'),
        card('DIVISION', 'BETWEEN THE GREEKS AND THE FRANKS, AS THE MARSHAL WILL PUT IT', { color: '#c8a0ff', seconds: 2.2 }),
        say('zampano', 'THERE WAS A CITY, AND IT WAS ON FIRE, AND I KNEW ONE STREET.', { remembered: true }),
      ],
    },
    {
      id: '7.6',
      title: 'A third Alexios',
      happens:
        'THE MARSHAL IS ONE OF THE ENVOYS WHO CARRY THE DEFIANCE TO THE PALACE: WALK IN WITH THEM, HEAR IT AND WALK OUT AT THE SAME PACE. FIRE-SHIPS COME DOWN ON THE FLEET AT NIGHT. THEN MOURTZOUPHLOS TAKES THE THRONE AS ALEXIOS V AND THE YOUNG ALEXIOS IV IS STRANGLED. THE DREAM RUNS OUT OF FACES: BAGNASKIZ AGAIN, UNDER A DIFFERENT CROWN.',
      source:
        "VILLEHARDOUIN PP. 53-56: THE DEFIANCE DELIVERED IN BLACHERNAE BY CONON OF BETHUNE, GEOFFROI DE VILLEHARDOUIN AND MILES OF BRABANT WITH THREE VENETIANS; THE FIRE-SHIPS; MOURZUPHLES SEIZES POWER (JANUARY 1204), ALEXIOS IV IS STRANGLED, ISAAC DIES. CLARI 61-62: MOURZUPHLES HAS BOTH STRANGLED (HIS VERSION). THE WALKING RULE IS ADAPTATION.",
      script: () => {
        const runCheck = (ctx: StoryScene) => {
          if (!ctx.player.running) return;
          ctx.metrics.ran++;
          ctx.interrupt([card('YOU RAN', 'ENVOYS DO NOT RUN. AGAIN.', { color: C.red, seconds: 1.6 }), call(() => ctx.player.setPosition(ctx.marker('S').x, ctx.marker('S').y))]);
        };
        return [
          call((ctx) => {
            ctx.setStage('palace');
            ctx.addActor('alexios', 'prince', '1', { kind: 'idle', face: 'S' });
            ['2', '3', '5', '6'].forEach((m, k) => ctx.addActor(`g${k}`, 'varangian', m, { kind: 'idle', face: 'player' }));
            ctx.addActor('envoy', 'bagnaskizMarshal', { x: ctx.marker('S').x - 0.8, y: ctx.marker('S').y }, { kind: 'follow', target: ctx.player, distance: 1, speed: 2.2, side: -0.8 });
            ctx.addActor('envoy2', 'knight', { x: ctx.marker('S').x + 0.8, y: ctx.marker('S').y }, { kind: 'follow', target: ctx.player, distance: 1, speed: 2.2, side: 0.8 });
          }),
          say('marshal', 'HE HAS NOT PAID. WE GO IN AND TELL HIM SO. WALK IN WITH US. WALK OUT AT THE SAME PACE.'),
          walk({ objective: 'WALK INTO THE THRONE ROOM WITH THE ENVOYS', goal: { reach: '4', radius: 1 }, onUpdate: (ctx) => runCheck(ctx) }),
          say('marshal', 'YOU SWORE TO PAY. YOU HAVE NOT PAID. FROM NOW ON WE ARE NO LONGER YOUR FRIENDS. THAT IS OUR CHALLENGE.'),
          say('prince', '(ALEXIOS IV) ...'),
          walk({ objective: 'WALK OUT AT THE SAME PACE. DO NOT RUN', goal: { reach: 'S', radius: 1 }, onUpdate: (ctx) => runCheck(ctx) }),
          card('ALIVE', 'THEY WALK OUT ALIVE. NOBODY CAN BELIEVE IT.', { color: C.green, seconds: 2 }),
          card('AT NIGHT', 'SHIPS ON FIRE COME DRIFTING DOWN ON THE FLEET. THE VENETIANS TOW THEM AWAY.', { color: C.red, seconds: 2.4 }),
          card('JANUARY 1204', 'MOURTZOUPHLOS TAKES THE THRONE AS ALEXIOS V. ALEXIOS IV IS STRANGLED. ISAAC II DIES.', { color: '#c070f0', seconds: 2.8 }),
          call((ctx) => {
            const u = ctx.addActor('usurper', 'bagnaskizEmperor', { x: ctx.player.gx - 1.4, y: ctx.player.gy - 1 }, { kind: 'idle', face: 'player' });
            u.sprite.tint = 0xffd890;
          }),
          card('THE DREAM RUNS OUT OF FACES', 'BAGNASKIZ AGAIN, UNDER A DIFFERENT CROWN: MOURTZOUPHLOS, ALEXIOS V', { color: '#c070f0', seconds: 2.4 }),
          say('emperor', 'A DIFFERENT CROWN, LITTLE KNIGHT. LEAVE MY LAND IN EIGHT DAYS.'),
          card('THE GATES CLOSE', 'TO THE PILGRIMS', { color: C.red, seconds: 2 }),
          say('zampano', 'THERE WAS A THRONE, AND I WALKED OUT OF IT AT A WALK.', { remembered: true }),
        ];
      },
    },
    {
      id: '7.7',
      title: 'The hole in the wall',
      happens:
        "BEFORE THE ASSAULT EVERYONE SWEARS: ALL BOOTY TO BE BROUGHT IN AND DECLARED, AND NO HAND ON WOMEN OR CLERGY. THE FIRST ASSAULT FAILS AND THE WALLS ECHO WITH MOCKERY. ON THE MONDAY, PIERRE'S MEN HACK A HOLE IN A WALLED-UP GATE AND NOBODY DARES GO IN. ALEAUME DOES. TRY TO HOLD HIM BACK BY THE FOOT: HE WRIGGLES FREE. FOLLOW HIM IN.",
      source:
        "CLARI 68 (THE AGREEMENT: BOOTY DECLARED UNDER OATH, WOMEN AND CLERGY PROTECTED), 70-71 (THE FRIDAY ASSAULT FAILS, THE GREEKS MOCK), 72-73 (ABSOLUTION; THE WOMEN SENT AWAY), 75-76 (PETER OF AMIENS AT THE FALSE POSTERN; ALEAUME OF CLARI, A CLERK, GOES IN ON HANDS AND FEET WHILE HIS BROTHER ROBERT HOLDS HIM BY THE FOOT), 77-79. VILLEHARDOUIN PP. 59-63: THE COVENANT; THE ASSAULTS; 12 APRIL 1204. CONFUSIONE PLAYS ALEAUME; THE DEED IS ALEAUME'S, NOT ZAMPANO'S.",
      script: () => {
        const rattle = sounder('...RATTLE...', '#b8b8c8');
        return [
          // From the assault on the host is in arms: Aleaume in his mail (it rattles), Jack too.
          stage('breach', [
            { name: 'legate', who: 'bishop', at: '3', face: 'SE' },
            { name: 'conf', who: 'confusioneKnight', at: '4', face: 'SW' },
            { name: 'jack', who: 'jackKnight', at: { x: 9.5, y: 10.5 }, face: 'N' },
          ]),
          say('bishop', 'SWEAR IT ON THE SAINTS. EVERYTHING TAKEN IS BROUGHT IN AND DECLARED. NO HAND ON A WOMAN. NO HAND ON A PRIEST OR A NUN.'),
          ask('bishop', 'SWEAR.', [{ label: 'SO HELP ME GOD.', effects: { grace: 5, flags: { sworn: true } } }]),
          say('jack', 'SO HELP ME GOD. (HE IS CROSSING HIS FINGERS.)'),
          call((ctx) => {
            if (ctx.state.flags.clothRoute) ctx.notice('EVERYTHING BROUGHT IN: LIKE THE BOLT OF CLOTH AT ZARA', C.yellow);
          }),
          card('THE FRIDAY ASSAULT FAILS', 'FROM THE WALLS: "WOOF! WOOF!" THEY ARE MOCKING HIS BARK, LIKE JACK AT THE GATE.', { color: C.orange, seconds: 2.6 }),
          card('SUNDAY', 'THE BISHOPS ABSOLVE THE HOST AND SEND THE WOMEN AWAY FROM THE CAMP', { color: '#f0d8a0', seconds: 2.4 }),
          card('MONDAY', "PIERRE'S MEN HACK A HOLE IN A WALLED-UP GATE. ON THE OTHER SIDE, A CROWD. NOBODY DARES GO IN.", { color: C.yellow, seconds: 2.6 }),
          say('confusione', 'I DARE. ON HANDS AND FEET.'),
          mini(() => new TugGame(), { lost: { commozione: 6 } }),
          call((ctx) => ctx.actor('conf').setBehavior({ kind: 'goto', to: ctx.marker('2'), speed: 2.6 })),
          say('zampano', 'I HAD HIS FOOT. I HAD IT.'),
          branch(
            (s) => s.flags.comradeship === true,
            [
              say('confusione', '(FROM INSIDE THE WALL) BROTHER! YOU SPLIT YOUR HALF LOAF WITH ME AT ZARA. THIS WAY. FOLLOW MY VOICE.'),
              walk({ objective: 'FOLLOW HIS VOICE IN', goal: { reach: '2', radius: 0.9 }, noRun: true }),
            ],
            [
              say('voice', 'HE IS GONE INTO THE DARK WITHOUT A WORD. ONLY HIS MAIL RATTLES.'),
              walk({
                objective: 'FOLLOW THE RATTLE OF HIS MAIL',
                goal: { reach: '2', radius: 0.9, hidden: true },
                noRun: true,
                onUpdate: (ctx, _w, dt) => {
                  const c = ctx.actor('conf');
                  rattle(ctx, { x: c.gx, y: c.gy }, dt);
                },
              }),
            ],
          ),
          fx({ supervillain: 10, value: 'Comradeship', flags: { followed: true } }),
          card('WITHIN THE WALL', 'ALEAUME WAITS FOR HIM. BEHIND THEM, A GATE IS BROKEN OPEN.', { color: C.cyan, seconds: 2.2 }),
          card('THAT NIGHT', 'MOURTZOUPHLOS FLEES THE CITY', { color: '#c070f0', seconds: 2 }),
          say('zampano', 'THERE WAS A HOLE, AND MY BROTHER WAS IN IT. HE IS NOT MY BROTHER.', { remembered: true }),
        ];
      },
    },
    {
      id: '7.8',
      title: 'Whose street was it?',
      happens:
        "THE CITY IS TAKEN. CLARI WILL WRITE THAT NO HARM WAS DONE TO POOR OR RICH, AND FILL HIS BOOK WITH WONDERS. TURN THE PAGE: THE SAME STREETS, AS NIKETAS WILL WRITE THEM, AND HIS OWN DOORWAY. HIS HOUSEHOLD IS LEAVING; JACK DRAGS A GIRL OUT OF THE GROUP. WAIT FOR A LULL AND CALL THE PILGRIMS TO THEIR OATH, OR STAND SILENT WHILE NIKETAS CALLS THEM HIMSELF. EITHER WAY THEY LET HER GO.",
      source:
        "CLARI 80 (THE TAKING; 'NO MISCHIEF WAS DONE TO POOR OR TO RICH'; THE HIGH MEN SEIZE THE BEST HOUSES). CHONIATES, THE SACK (MUNRO PP. 15-16): IMAGES TRODDEN, THE ALTAR OF THE GREAT CHURCH BROKEN AND SHARED OUT, MULES IN THE SANCTUARY, 'NO ONE WAS WITHOUT A SHARE IN THE GRIEF'. THE TWO ACCOUNTS ARE KEPT APART. NIKETAS'S FLIGHT AS BARBERO TELLS IT FROM NIKETAS (LECTURE ON THE FOURTH CRUSADE): THE HOUSE WITH A DARK ENTRANCE, THE VENETIAN FRIEND WHO KEEPS THE LOOTERS AWAY, THE GIRLS WITH MUD ON THEIR FACES, A GIRL DRAGGED INTO A HOUSE AND LET GO WHEN NIKETAS REMINDS HER CAPTOR OF THE OATH, 'THESE ABOMINATIONS'. ZAMPANO'S CALL AND JACK'S ROLE ARE INVENTED.",
      script: () => {
        let called = false;
        return [
          fx({ flags: { oath: 'undecided' } }),
          stage('city', [], { at: 'S' }),
          card('THE CITY IS TAKEN', '"NO HARM WAS DONE TO POOR OR RICH," THE SMALL KNIGHT WILL WRITE. HE FILLS HIS BOOK.', { color: C.orange, seconds: 2.8 }),
          walk({
            objective: 'FILL THE BOOK OF MARVELS',
            action: 'LOOK',
            pickups: [
              { at: '0', kind: 'marvel', label: 'THE GREAT CHURCH', text: 'A DOME LIKE THE SKY, HUNG ON NOTHING', effects: { marvel: 'THE GREAT CHURCH', commozione: 5 } },
              { at: '7', kind: 'marvel', label: 'THE HIPPODROME', text: 'TIERS OF SEATS, AND BRONZE FIGURES EVERYWHERE', effects: { marvel: 'THE HIPPODROME', commozione: 5 } },
            ],
            onAction: (ctx) => ctx.say('MERVEILLE!', { x: ctx.player.gx, y: ctx.player.gy }, C.yellow),
          }),
          sound('glitch'),
          call((ctx) => ctx.game.transition.play(null, 0.6, 1)),
          card('TURN THE PAGE', "THE SAME STREETS, AS NIKETAS WILL WRITE THEM: MULES LED INTO THE GREAT CHURCH, ITS ALTAR BROKEN UP AND SHARED OUT, NO ONE WITHOUT A SHARE IN THE GRIEF.", { color: '#c8a0ff', seconds: 3.4 }),
          call((ctx) => {
            ctx.addActor('niketas', 'niketas', DOORWAY, { kind: 'idle', face: 'E' });
            ctx.addActor('venetian', 'venetian', { x: 4.5, y: 20.5 }, { kind: 'idle', face: 'E' });
            ctx.addActor('family', 'greek', { x: 3.5, y: 21.5 }, { kind: 'idle', face: 'E' });
            // In arms, as at the breach (7.7).
            const jack = ctx.addActor('jack', 'jackKnight', { x: 4.5, y: 19.5 }, { kind: 'goto', to: { x: 7.5, y: 16.5 }, speed: 0.45 });
            ctx.addActor('girl', 'householdWoman', { x: 5, y: 19.8 }, { kind: 'follow', target: jack, distance: 0.7, speed: 0.6 });
            ctx.addActor('p1', 'pilgrim', { x: 8.5, y: 18.5 }, { kind: 'wander', center: { x: 8.5, y: 18.5 }, radius: 1, speed: 0.8 });
            ctx.addActor('p2', 'knight', { x: 9.5, y: 19.5 }, { kind: 'wander', center: { x: 9.5, y: 19.5 }, radius: 1, speed: 0.8 });
            ctx.player.setPosition(10.5, 17.5);
            ctx.world!.snapCamera();
          }),
          say('voice', "NIKETAS'S HOUSE BURNED IN THE FIRE; HE AND HIS FRIENDS HAVE SHELTERED IN ONE WITH A DARK ENTRANCE, AND THE LAMP CAME WITH THEM. NOW THE HOUSEHOLD IS LEAVING ON FOOT, A VENETIAN FRIEND IN FRONT, THE GIRLS IN THE MIDDLE WITH MUD ON THEIR FACES. JACK DRAGS ONE OF THEM OUT OF THE GROUP."),
          lullWalk({
            objective: 'WAIT FOR A LULL AND CALL THE PILGRIMS TO THEIR OATH, OR STAND SILENT',
            action: 'CALL',
            source: 'p1',
            stand: { x: 7.5, y: 18 },
            range: 3.6,
            noise: ['LOOT!', 'THIS WAY!', 'GOLD!', 'WHO HAS A SACK?'],
            noiseLabel: 'THE STREET IS LOUD',
            drowned: 'NOBODY HEARS HIM OVER THE LOOTING. WAIT FOR A LULL',
            actText: 'NO HAND ON A WOMAN! YOU SWORE!',
            need: 1,
            pilotActs: (p) => p.policy.ending === 'knight',
            onGood: (ctx) => {
              if (!spend(ctx.state, 'commozione', STORY.COST.OATH_BARK)) ctx.notice('IT TAKES ALL HE HAS LEFT', C.orange);
              else ctx.notice(`-${STORY.COST.OATH_BARK} COMMOZIONE`, C.red);
              called = true;
              ctx.apply({ flags: { oath: 'enforced' }, supervillain: 15, grace: 5, standing: -6, value: 'Kept oaths', remembered: 'NO HAND ON A WOMAN! YOU SWORE! (IN HIS OWN WORDS)' });
            },
            onUpdate: (ctx, w) => {
              // Silence: Niketas calls them himself.
              if (!called && w.time > 16) {
                ctx.say('YOU SWORE AN OATH! LET HER GO!', ctx.marker(DOORWAY), '#f0f0f0');
                ctx.apply({ flags: { oath: 'silent' }, remembered: '"YOU SWORE AN OATH! LET HER GO!" (NIKETAS, OVERHEARD)' });
                w.complete = true;
              }
            },
          }),
          call((ctx) => {
            ctx.actor('jack').setBehavior({ kind: 'flee', speed: 3, radius: 6 });
            ctx.actor('girl').setBehavior({ kind: 'goto', to: { x: 3.5, y: 20.8 }, speed: 1.6 });
          }),
          branch(
            (s) => s.flags.oath === 'enforced',
            [say('knight', '(THE PILGRIMS) HE IS RIGHT. WE SWORE. LET HER GO, JACK.'), say('jack', 'ALL RIGHT! ALL RIGHT! I WAS ONLY... CARRYING HER. FOR SAFETY.')],
            [say('knight', '(THE PILGRIMS) THE GREEK IS RIGHT. WE SWORE. LET HER GO, JACK.'), say('voice', 'ZAMPANO SAID NOTHING. HE HEARD EVERY WORD.')],
          ),
          say('niketas', 'SHE IS BACK WITH HER FAMILY. OUR HOUSE IS NOT. THESE THINGS THE ARMIES OF THE WEST DID TO A CHRISTIAN PEOPLE. I WILL WRITE DOWN WHO SPOKE, AND WHO DID NOT.'),
          say('zampano', 'THERE WAS A DOORWAY, AND IT WAS SOMEBODY ELSE\'S.', { remembered: true }),
        ];
      },
    },
    {
      id: '7.9',
      title: 'The common pile',
      happens:
        "THE LAMP FROM NIKETAS'S COURTYARD IS LYING IN THE STREET. BRING IT TO THE COMMON PILE, AS SWORN, OR KEEP IT UNDER YOUR CLOAK. ON THE WAY, THE BRONZE HERCULES IS GONE FROM ITS PEDESTAL, AND THE CARVED COLUMN NOW SEEMS TO SAY WHAT EVERYONE KNEW ALL ALONG. AT THE PILE THE GOLD AND SILK STAY UNDER GUARD, AND THE POOR KNIGHTS RECEIVE THE COARSE SILVER.",
      source:
        "CLARI 81 (THE TREASURE GUARDED IN AN ABBEY; THE BEST TAKEN BY THE GUARDS AND THE RICH; THE POOR KNIGHTS GET ONLY THE COARSE SILVER), 92 (THE PILLARS, READ AFTER THE EVENT), 98 (ALEAUME CLAIMS A KNIGHT'S SHARE AND SAINT-POL ALLOWS IT), 105 (THE POOR KNIGHTS' COMPLAINT). VILLEHARDOUIN PP. 65-66 (COVETOUSNESS; THINGS KEPT BACK; THE COUNT OF SAINT-POL HANGS A KNIGHT WITH HIS SHIELD AT HIS NECK). CHONIATES, DESTROYED MONUMENTS (PARAS. 2-3): BRONZE STATUES THROWN INTO THE FIRE AND TURNED INTO COINAGE; THE HERCULES THROWN DOWN. THE LAMP AND THE CHOICE ARE ADAPTATION.",
      script: () => [
        // Aleaume still in the mail of the breach (7.7): he claims a knight's share at the pile.
        stage('city', [{ name: 'conf', who: 'confusioneKnight', at: { x: 6.5, y: 19.5 }, face: 'W' }], { at: { x: 5.5, y: 18.5 } }),
        walk({
          objective: 'THE LAMP IS LYING IN THE STREET. PICK IT UP',
          pickups: [{ at: { x: 4.5, y: 20.5 }, kind: 'spot', label: "THE LAMP FROM NIKETAS'S COURTYARD", text: 'STILL WARM FROM LAST NIGHT', sprite: 'lamp' }],
        }),
        carry('A LAMP'),
        ask('confusione', 'WE SWORE TO BRING EVERYTHING IN, BROTHER. EVERYTHING. EVEN LAMPS.', [
          {
            label: '(CARRY IT TO THE COMMON PILE, AS SWORN.)',
            effects: { grace: 6, flags: { lamp: 'declared' }, value: 'An honest share' },
            then: [say('confusione', 'IT WILL END UP IN SOMEBODY ELSE\'S HOUSE. BUT NOT BY US.')],
          },
          {
            label: '(HIDE IT UNDER YOUR CLOAK.)',
            effects: { grace: -8, coins: 3, flags: { lamp: 'kept' } },
            then: [
              // Out of sight: the label goes, the lamp stays under the cloak.
              dropCarried(),
              card('', 'THAT AFTERNOON THE COUNT OF SAINT-POL HANGS A KNIGHT WHO KEPT THINGS BACK, WITH HIS SHIELD AT HIS NECK', { color: C.red, seconds: 2.8 }),
              say('zampano', '(UNDER THE CLOAK, THE LAMP IS VERY HEAVY.)'),
            ],
          },
        ]),
        walk({
          objective: 'GO BY THE PLACES YOU VISITED',
          action: 'LOOK',
          pickups: [
            { at: HERCULES, kind: 'marvel', label: 'AN EMPTY PEDESTAL', text: 'THE BRONZE HERCULES IS GONE. THROWN DOWN, AND MELTED FOR COIN, THEY SAY', effects: { marvel: 'AN EMPTY PEDESTAL', commozione: 4 } },
            { at: COLUMN, kind: 'spot', label: 'THE CARVED COLUMN', text: 'SHIPS, LADDERS, LITTLE MEN CLIMBING. NOW EVERYONE SAYS THEY KNEW WHAT IT MEANT', effects: { flags: { columnAgain: true } } },
          ],
          onAction: (ctx) => ctx.say('...', { x: ctx.player.gx, y: ctx.player.gy }),
        }),
        walk({ objective: 'GO TO THE COMMON PILE', goal: { reach: '0', label: 'THE PILE' } }),
        // Declared: he puts the lamp on the pile (kept: there is nothing over his head to drop).
        dropCarried(),
        call((ctx) => {
          if (ctx.state.flags.clothRoute) ctx.notice('LIKE THE BOLT OF CLOTH AT ZARA: FROM A HOUSE TO THE PILE', C.yellow);
        }),
        card('THE COMMON PILE', 'THE GOLD AND THE SILK STAY UNDER GUARD. THE POOR KNIGHTS RECEIVE THE COARSE SILVER.', { color: '#d8d8e8', seconds: 2.6 }),
        say('confusione', 'A CLERK WANTS A KNIGHT\'S SHARE. THE COUNT OF SAINT-POL SAYS CLERKS SHARE LIKE KNIGHTS. SO DO I.'),
        say('zampano', 'THEY DIVIDED THE HOUSES WHILE WE WERE AT THE WALLS. EVEN THE GOOD ONES. ESPECIALLY THE GOOD ONES.'),
        say('zampano', 'THE GOLD WENT TO LI RIKE HOMME. LI POVRE CHEVALIER GOT THE SILVER.'),
        fx({ coins: 2 }),
        say('zampano', 'THERE WAS GOLD, AND THEN THERE WAS SILVER, AND THEN THERE WAS ME.', { remembered: true }),
        sound('glitch'),
        card('JERUSALEM', 'LOADING...', { color: '#f6c0e0', seconds: 2.4, dim: 0.9 }),
        card('', 'THE PASTEL CITY NEVER LOADS', { color: '#b070ff', seconds: 2, dim: 0.95, flash: true }),
      ],
    },
  ],
};
