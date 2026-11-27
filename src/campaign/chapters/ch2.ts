import { STORY } from '../../config';
import { putOnHeadGear, takeOffHeadGear } from '../../story/headGear';
import { ask, call, card, emote, fx, prof, say, skin, sound } from '../../story/steps';
import { walk } from '../../story/walk';
import { C } from '../../ui/retro';
import { CHAPTER_TITLES } from '../titles';
import type { ChapterDef } from '../types';
import { bark, followLeader, lullWalk } from './helpers';

/**
 * Level 2 — On the edge of dreams: becoming the small knight. Under the desk the dream starts
 * (after the sleep boundary of 1.5). The lecture, the rag, the bucket and his hunger to be
 * admired become a preacher, a list of names, borrowed armour and the road to Venice. He is a
 * small knight of Picardy in Robert de Clari's position: the destination is Jerusalem, the plan
 * is decided by others (docs/STORY.md, chapter 2).
 */
export const CH2: ChapterDef = {
  number: 2,
  title: CHAPTER_TITLES[1],
  menuTitle: 'Edge of dreams',
  intro: 'UNDER THE DESK THE DARK FILLS WITH PEOPLE: A PREACHER, A LIST OF NAMES, A BORROWED COAT OF MAIL. ZAMPANO IS A SMALL KNIGHT OF PICARDY NOW, AND JERUSALEM IS ALWAYS ONE STEP AWAY.',
  cast: "CONFUSIONE AS ALEAUME, A CLERK; SBRIMBRULON AS PIERRE D'AMIENS, HIS LORD; BAGNASKIZ AS THE MARSHAL, GEOFFROI DE VILLEHARDOUIN; FULK OF NEUILLY",
  theme: 'jerusalem',
  music: 'level2',
  professor: {
    text: 'VILLEHARDOUIN WAS ONE OF THE SIX ENVOYS WHO SIGNED FOR THE SHIPS. CLARI WAS IN THE CROWD THAT WOULD HAVE TO PAY FOR THEM. READ THEM SIDE BY SIDE, YOU UNDERSTAND, AND YOU CAN HEAR A DOOR CLOSING.',
  },
  subLevels: [
    {
      id: '2.1',
      title: 'One step from Jerusalem',
      happens:
        'THE BOTTOM OF THE SHIP OPENS INTO A PASTEL COUNTRY. ON THE HORIZON, JERUSALEM: WHERE EVERYONE SAYS THEY ARE GOING. HIS HELMET IS FAR TOO BIG AND SLIDES DOWN WHENEVER HE STOPS. WALK TO THE GATE. IT IS ALWAYS ONE STEP AWAY, AND BEHIND A DOOR SOMEONE IS SAYING A DIFFERENT NAME.',
      source:
        "DREAM PROLOGUE (ADAPTATION; THE HELMET IS THE BUCKET OF 1.1). JERUSALEM AS THE PROMISED DESTINATION, NEVER REACHED. VILLEHARDOUIN (MARZIALS P. 8): THE COUNCIL WAS TOLD THE REAL OBJECTIVE WAS BABYLON (EGYPT), THE PEOPLE ONLY 'OVERSEAS'.",
      script: () => [
        call((ctx) => {
          ctx.setStage('jerusalem');
          // The bucket of 1.1, much grander: a great helm far too big for him.
          putOnHeadGear(ctx, 'helmet');
        }),
        card('', 'THE BOTTOM OF THE SHIP OPENS...', { color: '#f6c8e0', seconds: 1.8, dim: 0.9 }),
        card('JERUSALEM', 'WHERE EVERYONE SAYS THEY ARE GOING', { color: '#f6c8e0', seconds: 2.2, dim: 0.3 }),
        prof('JERUSALEM, YOU UNDERSTAND. THAT IS WHAT THEY PREACHED. THAT IS WHAT THEY SEWED ON.'),
        walk({
          objective: 'WALK TO THE CITY GATE. KEEP YOUR HEAD UP',
          goal: { reach: '1' },
          noRun: true,
          action: 'BARK',
          onAction: (ctx, w) => {
            bark(ctx, 'JERUSALEM!');
            w.data.bow = 0.8;
          },
          onUpdate: (ctx, w, dt) => {
            // The helmet (the bucket of 1.1, much grander) slides down whenever he lowers his head.
            const V = STORY.VISOR;
            const p = ctx.player;
            const still = Math.hypot(p.vx, p.vy) < 0.2;
            const stillT = still ? ((w.data.stillT as number) ?? 0) + dt : 0;
            const bow = Math.max(0, ((w.data.bow as number) ?? 0) - dt);
            w.data.stillT = stillT;
            w.data.bow = bow;
            const down = stillT > V.STILL_AFTER || bow > 0;
            ctx.visor = down ? Math.min(V.MAX, ctx.visor + V.DOWN_RATE * dt) : Math.max(0, ctx.visor - V.UP_RATE * dt);
            if (down && !w.data.told) {
              w.data.told = true;
              ctx.notice('THE HELMET SLIPS DOWN. WALK ON TO PUSH IT UP', C.cyan);
            }
            // Behind a door, the leaders use another name for the destination.
            w.data.t = ((w.data.t as number) ?? 0) + dt;
            if ((w.data.t as number) > 3.2) {
              w.data.t = 0;
              ctx.say('(BEHIND A DOOR) ...BABYLON... EGYPT FIRST... DO NOT TELL THE MEN...', { x: ctx.player.gx + 2, y: ctx.player.gy - 2 }, '#9aa4c0');
            }
          },
        }),
        call((ctx) => {
          ctx.visor = 0;
          takeOffHeadGear(ctx, 'lift');
        }),
        card('ONE STEP AWAY', 'THE GATE MOVES BACK BY EXACTLY ONE STEP', { color: '#f6c8e0', seconds: 2 }),
        say('zampano', 'NOBODY SAID ANYTHING ABOUT EGYPT.'),
        say('voice', 'NOBODY SAID ANYTHING TO YOU.'),
        card('FIRST', 'A PREACHER. THEN A LIST. THEN THE SHIPS. THEN THE MONEY.', { color: '#9aa4c0', seconds: 2.4 }),
        say('zampano', 'THERE WAS A CITY, AND IT WAS ALWAYS ONE STEP AWAY.', { remembered: true }),
      ],
    },
    {
      id: '2.2',
      title: 'Names on a list',
      happens:
        "AT A TOURNAMENT IN CHAMPAGNE, FULK OF NEUILLY IS PREACHING THE CROSS. SHOUT ZAMPANO'S VOW IN THE PAUSES BETWEEN HIS PHRASES UNTIL THE CROWD HEARS IT. THEN THE GREAT COUNTS TAKE THE CROSS ON THE PLATFORM AND EVERY HEAD TURNS TO THEM. A CLERK WRITES THE NAMES BY RANK. ZAMPANO'S GOES AT THE BOTTOM. THE MARSHAL LEAVES FOR VENICE TO HIRE THE SHIPS.",
      source:
        "VILLEHARDOUIN (MARZIALS PP. 1-4): FULK OF NEUILLY PREACHES; THE INDULGENCE IS PROCLAIMED; AT THE TOURNEY OF ECRI THIBAUT OF CHAMPAGNE AND LOUIS OF BLOIS TAKE THE CROSS; SIX ENVOYS, VILLEHARDOUIN AMONG THEM, GO TO VENICE. FULK'S WORDS, THE VOW IN THE LULLS AND THE LIST ARE ADAPTATION. FULK DIED BEFORE THE DEPARTURE (P. 18).",
      script: () => {
        const crowd = ['1', '2', '3', '4', '5', '7'];
        return [
          call((ctx) => {
            ctx.setStage('fair', { at: 'S' });
            ctx.addActor('fulk', 'fulk', '0', { kind: 'idle', face: 'SE' });
            crowd.forEach((m, k) => ctx.addActor(`c${k}`, 'pilgrim', m, { kind: 'idle', face: 'N' }));
          }),
          card('A TOURNAMENT IN CHAMPAGNE', 'A PREACHER HAS TAKEN OVER THE FIELD', { color: C.yellow, seconds: 2 }),
          say('fulk', 'TAKE THE CROSS! THE HOLY VOYAGE, THE GENERAL PASSAGE! WHOEVER GOES, GOES FORGIVEN. LORDS FIRST, AND THEN EVERYBODY.'),
          lullWalk({
            objective: 'SHOUT YOUR VOW IN THE PAUSES BETWEEN HIS PHRASES',
            action: 'VOW',
            source: 'fulk',
            range: 6,
            stand: { x: 9.5, y: 10.5 },
            noise: ['TAKE THE CROSS!', 'REPENT!', 'OVERSEAS!', 'LEAVE YOUR FIELDS!', 'GOD SEES YOU!'],
            noiseLabel: 'FULK IS PREACHING',
            drowned: 'FULK DROWNS HIM OUT. WAIT FOR A PAUSE',
            actText: 'I GO TOO! WOOF!',
            need: 3,
            onGood: (ctx, _w, n) => {
              // The crowd turns, two at a time, and makes room.
              for (const k of [2 * (n - 1), 2 * (n - 1) + 1]) {
                const a = ctx.actors.get(`c${k}`);
                if (!a) continue;
                a.faceToward(ctx.player.gx, ctx.player.gy);
                ctx.say('THE LITTLE ONE TOO?', { x: a.gx, y: a.gy }, C.yellow);
                a.setBehavior({ kind: 'goto', to: { x: a.gx + (k % 2 ? 2.5 : -2.5), y: a.gy }, speed: 1.6 });
              }
              ctx.apply({ commozione: 2 });
            },
          }),
          fx({ unlock: 'sermon', grace: 5, flags: { vow: true } }),
          card('A VOW', 'HE HAS SAID IT OUT LOUD. IT COUNTS NOW.', { color: C.yellow, seconds: 2 }),
          call((ctx) => {
            ctx.addActor('count1', 'marquis', { x: 7.5, y: 5.5 }, { kind: 'idle', face: 'S' });
            ctx.addActor('count2', 'knight', { x: 9.5, y: 5.5 }, { kind: 'idle', face: 'S' });
            for (let k = 0; k < 6; k++) ctx.actors.get(`c${k}`)?.faceToward(8.5, 5.5);
          }),
          say('voice', 'THEN THE COUNTS OF CHAMPAGNE AND BLOIS TAKE THE CROSS ON THE PLATFORM, AND EVERY HEAD TURNS TO THEM.'),
          call((ctx) => ctx.addActor('clerk', 'clerk', { x: 11.5, y: 8.5 }, { kind: 'idle', face: 'player' })),
          say('clerk', '(A CLERK, WRITING) CRUCESIGNATI: SIGNED WITH THE CROSS. THE COUNTS. THEIR KNIGHTS. THEIR KNIGHTS\' KNIGHTS. AND YOU ARE?'),
          ask('clerk', 'NAME, AND WHOSE MAN YOU ARE.', [
            {
              label: 'A KNIGHT OF PICARDY. PUT ME NEAR THE TOP.',
              effects: { supervillain: 3, standing: -2 },
              then: [say('clerk', 'THE LIST GOES BY RANK. (HE WRITES AT THE BOTTOM.)')],
            },
            {
              label: '(JUST BE GLAD TO BE ON IT.)',
              effects: { commozione: 3, standing: 2 },
              then: [say('clerk', '(HE WRITES AT THE BOTTOM, VERY SMALL.)')],
            },
          ]),
          call((ctx) => ctx.addActor('marshal', 'bagnaskizMarshal', { x: 5.5, y: 9.5 }, { kind: 'idle', face: 'player' })),
          card('A FAMILIAR FACE', "BAGNASKIZ IS THE MARSHAL HERE: GEOFFROI DE VILLEHARDOUIN, WHO WILL WRITE IT ALL DOWN", { color: C.orange, seconds: 2.6 }),
          say('marshal', 'SIX OF US RIDE TO VENICE TO HIRE THE SHIPS. I AM ONE OF THE SIX.'),
          say('zampano', 'CAN I COME?'),
          say('marshal', 'YOU CAN PAY, LATER. EVERYONE WILL PAY, LATER.'),
          say('zampano', 'THERE WAS A LIST, AND I WAS AT THE BOTTOM OF IT.', { remembered: true }),
        ];
      },
    },
    {
      id: '2.3',
      title: 'A coat of mail too big',
      happens:
        "ON THE ROAD SOUTH, IN A COAT OF MAIL TWO SIZES TOO BIG, ZAMPANO STILL HAS NO ARMS. JACK AND TWO LADS OF THE ROAD WANT WHAT THE ARMOURER LEFT ON THE ROAD: BARK THEM OFF. PICK UP A SWORD, A SHIELD PAINTED LAST NIGHT AND A SWORD BELT: ZAMPANO IS A KNIGHT, HEAVY AND MAGNIFICENT. CONFUSIONE IS ALEAUME, A CLERK WHO CALLS HIM BROTHER. TRY THE CHARGE ACROSS THE ROAD, THEN SPAR WITH THE SQUIRES OF SBRIMBRULON, WHO IS PIERRE D'AMIENS, HIS LORD: SWORD AND SHIELD. A MUCH HARDER TRICK WILL BE TO WALK.",
      source:
        "ADAPTATION. CLARI SIGNS HIMSELF 'ROBERT OF CLARI, KNIGHT' (CLARI 120) AND RIDES IN PIERRE D'AMIENS'S BATTALION (CLARI 45-47, 75); ALEAUME OF CLARI, A CLERK, IS ROBERT'S BROTHER (CLARI 75-76). THE BORROWED ARMOUR AND ARMS, THE ROAD, JACK'S LADS AND THE SPARRING ARE INVENTED.",
      script: () => [
        call((ctx) => {
          ctx.setStage('road', { at: 'S' });
          ctx.addActor('conf', 'confusione', { x: 9.5, y: 26.5 }, { kind: 'follow', target: ctx.player, distance: 1.4, speed: 3, side: -0.8 });
        }),
        card('A FAMILIAR FACE', "CONFUSIONE IS ALEAUME HERE: ROBERT OF CLARI'S BROTHER, A CLERK. IN THE DREAM HE CALLS ZAMPANO BROTHER. ON THE LAWN HE NEVER WOULD.", { color: C.cyan, seconds: 3 }),
        say('confusione', 'BROTHER. A COAT OF MAIL IS NOT A KNIGHT. A KNIGHT CARRIES A SWORD AND A SHIELD. THE ARMOURER LEFT THEM ALONG THE ROAD.'),
        // The first fight: barking only (no sword and no shield yet).
        call((ctx) => {
          ctx.addActor('jack', 'jack', { x: 8.5, y: 21.5 }, { kind: 'idle', face: 'player' });
          ctx.addActor('lad1', 'pilgrim', { x: 6.5, y: 23.5 }, { kind: 'idle', face: 'player' });
          ctx.addActor('lad2', 'pilgrim', { x: 5.5, y: 25.5 }, { kind: 'idle', face: 'player' });
        }),
        say('jack', 'A DOG IN A TIN COAT, GOING TO JERUSALEM? THE ARMOURER\'S THINGS ARE OURS NOW. LIKE THE GATE.'),
        card('BARK!', 'THE ROUND BUTTON, A DOUBLE TAP OVER THE BUTTONS, OR B. A BARK PUSHES BACK EVERYONE NEAR.', { color: C.cyan, seconds: 3 }),
        walk({
          objective: 'BARK JACK AND HIS LADS OFF THE ROAD',
          fight: { foes: ['jack', 'lad1', 'lad2'], hp: 1, speed: 1.4, routLines: ['MAD DOG!', 'KEEP YOUR TIN COAT!', 'ALL RIGHT! ALL RIGHT!'] },
        }),
        call((ctx) => {
          for (const n of ['jack', 'lad1', 'lad2']) ctx.removeActor(n);
        }),
        say('confusione', 'THEY WILL BE BACK, BROTHER. THEIR KIND ALWAYS COMES BACK.'),
        walk({
          objective: 'PICK UP THE SWORD, THE SHIELD AND THE BELT',
          pickups: [
            { at: '2', kind: 'spot', label: 'A SWORD', text: 'BORROWED. BLUNT. HE HOLDS IT LIKE A BONE.', sprite: 'sword' },
            { at: '3', kind: 'spot', label: 'A SWORD BELT', text: 'TWO SIZES TOO BIG, LIKE THE MAIL. IT CLINKS.', sprite: 'belt' },
            { at: '4', kind: 'spot', label: 'A SHIELD', text: 'PAINTED LAST NIGHT. STILL WET.', sprite: 'shieldItem' },
          ],
        }),
        fx({ unlock: 'knight', supervillain: 8 }),
        sound('star'),
        skin('zampanoKnight'),
        card('A KNIGHT', 'ARMED, HEAVY, CLINKING AND MAGNIFICENT', { color: C.cyan, seconds: 2.2 }),
        emote('zampano', 'bark'),
        say('zampano', 'WOOF. (DEEPER.)'),
        say('confusione', 'IT IS THE HELMET. IT ECHOES.'),
        walk({
          objective: 'TRY OUT THE CHARGE DOWN THE ROAD (HOLD RUN)',
          goal: { reach: '6', label: 'CHARGE!' },
          onUpdate: (ctx) => {
            // The armour is heavy: walking is slower, and only a charge feels grand.
            ctx.player.speedMul = ctx.player.running ? 1 : 0.8;
          },
        }),
        call((ctx) => {
          ctx.player.speedMul = 1;
          ctx.addActor('pierre', 'sbrimbrulonKnight', { x: ctx.player.gx + 1, y: ctx.player.gy - 0.6 }, { kind: 'idle', face: 'player' });
        }),
        card('A FAMILIAR FACE', "SBRIMBRULON IS PIERRE D'AMIENS HERE: THE LORD WHOSE MEN HE RIDES WITH", { color: C.cyan, seconds: 2.4 }),
        say('sbrimbrulon', 'THAT WAS A FINE CHARGE AT NOTHING, LITTLE ONE. NOW TRY SOMETHING THAT HITS BACK. MY SQUIRES HAVE STICKS.'),
        // The second fight: sword and shield, against wooden swords.
        call((ctx) => {
          ctx.addActor('sq1', 'knight', { x: 10.5, y: 9.5 }, { kind: 'idle', face: 'player' });
          ctx.addActor('sq2', 'pilgrim', { x: 5.5, y: 11.5 }, { kind: 'idle', face: 'player' });
          ctx.addActor('sq3', 'knight', { x: 10.5, y: 12.5 }, { kind: 'idle', face: 'player' });
          ctx.actor('pierre').setBehavior({ kind: 'idle', face: 'player' });
        }),
        card('SWORD AND SHIELD', 'SWIPE UP OVER THE BUTTONS TO STRIKE (U), SWIPE DOWN TO RAISE THE SHIELD (I, HOLD IT). THE SMALL BUTTON BY THE ROUND ONE SWITCHES WHAT IT DOES (Q).', { color: C.cyan, seconds: 3.6 }),
        card('THE RING', 'WHEN THE RING UNDER A SQUIRE FILLS RED, HIS STICK IS COMING DOWN: SHIELD UP, THEN STRIKE WHILE HE STAGGERS. SQUIRES PARRY A BLOW THEY SEE COMING.', { color: C.yellow, seconds: 3.2 }),
        walk({
          objective: 'SPAR UNTIL ALL THREE SQUIRES YIELD',
          fight: { foes: ['sq1', 'sq2', 'sq3'], hp: 2, speed: 1.2, health: 6, parry: true, routLines: ['I YIELD!', 'MERCY, SIR DOG!', 'ENOUGH, MESSIRE!'] },
        }),
        call((ctx) => {
          for (const n of ['sq1', 'sq2', 'sq3']) ctx.removeActor(n);
        }),
        say('sbrimbrulon', 'GOOD. THE SWORD IS THE EASY PART. NOW WALK. VENICE IS A LONG WAY.'),
        say('zampano', 'YES, MESSIRE PIERRE. TO THE CRUSADE!'),
        say('confusione', 'NOBODY SAYS CRUSADE, BROTHER. IT IS THE HOLY VOYAGE. AND WE ARE PILGRIMS.'),
        followLeader({
          objective: "FALL IN BEHIND PIERRE. TO VENICE",
          leader: 'pierre',
          path: ['7', '8', '9'],
          speed: 1.6,
          onReach: (ctx, k) => {
            const lines = ['THEY SAY THE VENETIANS HAVE BUILT A WHOLE FLEET FOR US.', 'THEY SAY IT IS ALREADY PAID FOR.', ''];
            const a = ctx.actor('pierre');
            if (lines[k]) ctx.say(lines[k]!, { x: a.gx, y: a.gy - 1 }, C.cyan);
          },
        }),
        card('A MUCH HARDER TRICK', 'WILL BE TO WALK', { color: C.yellow, seconds: 2.2 }),
        say('zampano', 'THERE WAS A COAT OF MAIL, AND I WAS INSIDE IT SOMEWHERE.', { remembered: true }),
      ],
    },
  ],
};
