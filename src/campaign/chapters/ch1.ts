import { STORY } from '../../config';
import type { PropEntity } from '../../entities/prop';
import { carry, dropCarried } from '../../story/carry';
import { putOnHeadGear, takeOffHeadGear } from '../../story/headGear';
import { ask, call, card, face, flash, fx, move, prof, say, shake, sound, stage, wait } from '../../story/steps';
import type { StoryScene } from '../../story/storyScene';
import { walk } from '../../story/walk';
import { C } from '../../ui/retro';
import { CHAPTER_TITLES } from '../titles';
import type { ChapterDef } from '../types';
import { bark, blockGap, distTo, followLeader, placeObject } from './helpers';

/** Heads popping up along the fences to watch (Jack calls them). */
function heads(ctx: StoryScene): void {
  ctx.addActor('h1', 'crowdA', '3', { kind: 'idle', face: 'player' });
  ctx.addActor('h2', 'crowdB', '4', { kind: 'idle', face: 'player' });
  for (const n of ['h1', 'h2']) ctx.actor(n).emote('bark');
}

/**
 * Level 1 — The Greenzone (reality). Zampanò walks home through a neighborhood where every other
 * dog can walk straight to the water bowl. Nothing in this level is a dream: it plants what the
 * dream will use (the bucket that will be a helmet, the bowl's clang that will be a harbor bell,
 * the gates that will be walls, the cloth that will be a cross and a sail, the lecture's three
 * voices) and ends when he falls asleep under the Professor's desk (docs/STORY.md).
 */
export const CH1: ChapterDef = {
  number: 1,
  title: CHAPTER_TITLES[0],
  menuTitle: 'The Greenzone',
  intro: 'ZAMPANO WAKES ON THE COMMON LAWN. THE WAY HOME RUNS THROUGH A NEIGHBORHOOD WHERE EVERY OTHER DOG CAN WALK STRAIGHT TO THE WATER BOWL.',
  cast: 'EVERYONE AS THEMSELVES',
  theme: 'greenzone',
  music: 'greenzone',
  professor: {
    text: 'CLARI, YOU UNDERSTAND, WAS A SMALL KNIGHT FROM PICARDY. HE HEARD MOST THINGS AFTER OTHER PEOPLE HAD DECIDED THEM, AND WROTE THEM DOWN AS IF HE HAD BEEN IN THE ROOM.',
  },
  subLevels: [
    {
      id: '1.0',
      title: 'The Green Zone',
      happens:
        'ZAMPANO WAKES ON THE COMMON LAWN. THE WAY HOME RUNS THROUGH A NEIGHBORHOOD WHERE EVERY OTHER DOG CAN WALK STRAIGHT TO THE WATER BOWL. EAT TREATS AGAINST HUNGER, PEE TO CLEAN WHAT THE POOPS SPOIL, CATCH CATS FOR COINS, IGNORE THE BALLS, AND BARK AWAY AT BAGNASKIZ WHEN HE POLLUTES THE ZONE. AT THE END OF THE WALK, TIRED, HE LIES DOWN ON THE LAWN.',
      source: 'SPEC: THE GREEN ZONE (FROM THE VIDEO). BOARD: THE GREENZONE, BAGNASKIZ THE BULLY. REALITY.',
      greenZone: 1,
      script: () => [],
    },
    {
      id: '1.1',
      title: 'A bucket on his head',
      happens:
        "AFTER THE WALK HE DOZES ON THE LAWN AND WAKES WITH A CHILD'S SAND BUCKET OVER HIS HEAD. WALK HOME TO THE HEDGE GAP: WHENEVER HE STOPS OR BARKS, THE BUCKET SLIDES DOWN OVER HIS EYES. A PAW COMES IN FROM OUTSIDE THE FRAME: CONFUSIONE SLAPS IT OFF IN FRONT OF EVERYONE.",
      source: "ORIGINAL GREENZONE SCENE, REWORKED FROM THE OLD PREMATURE JERUSALEM DREAM: CONFUSIONE'S SLAP (BOARD PHOTOS, 16 NOVEMBER). THE BUCKET PLANTS THE HELMET OF 2.1.",
      script: () => [
        stage('neighborhood', [{ name: 'watson', who: 'watson', at: { x: 4.5, y: 10.4 }, face: 'NW' }], { skin: 'plain', at: { x: 3.5, y: 9.5 }, face: 'E' }),
        card('', 'AFTER THE WALK, ON THE LAWN, HE DOZES OFF...', { color: C.green, seconds: 1.8, dim: 0.9 }),
        sound('hit'),
        shake(3),
        call((ctx) => {
          // The bucket lands on his head, right down over his eyes.
          putOnHeadGear(ctx, 'bucket');
          ctx.visor = STORY.VISOR.MAX;
        }),
        card('CLONK', 'SOMETHING HAS COME DOWN OVER HIS HEAD', { color: C.yellow, seconds: 1.6, dim: 0.2 }),
        say('watson', 'OOPS, MAN. THE KIDS LEFT THEIR SAND BUCKET. IT SUITS YOU.'),
        walk({
          objective: 'WALK HOME TO THE HEDGE GAP. KEEP YOUR HEAD UP',
          goal: { reach: '6', label: 'THE HEDGE GAP' },
          noRun: true,
          action: 'BARK',
          onAction: (ctx, w) => {
            bark(ctx, 'WOOF! (IT ECHOES INSIDE THE BUCKET.)');
            w.data.bow = 0.8;
          },
          onUpdate: (ctx, w, dt) => {
            // The bucket slips down whenever he lowers his head: standing still or barking.
            const V = STORY.VISOR;
            const p = ctx.player;
            const still = Math.hypot(p.vx, p.vy) < 0.2;
            const stillT = still ? ((w.data.stillT as number) ?? 0) + dt : 0;
            const bow = Math.max(0, ((w.data.bow as number) ?? 0) - dt);
            w.data.stillT = stillT;
            w.data.bow = bow;
            const down = stillT > V.STILL_AFTER || bow > 0;
            ctx.visor = down ? Math.min(V.MAX, ctx.visor + V.DOWN_RATE * dt) : Math.max(0, ctx.visor - V.UP_RATE * dt);
            if (!w.data.told && w.time > 0.6) {
              w.data.told = true;
              ctx.notice('WALK ON TO PUSH THE BUCKET UP. STOP AND IT SLIDES DOWN', C.cyan);
            }
          },
        }),
        call((ctx) => ctx.addActor('conf', 'confusione', { x: ctx.player.gx + 2.6, y: ctx.player.gy - 1.4 }, { kind: 'goto', to: { x: ctx.player.gx + 0.6, y: ctx.player.gy - 0.3 }, speed: 8, run: true })),
        card('', 'A PAW COMES IN FROM OUTSIDE THE FRAME', { color: C.green, seconds: 0.9, dim: 0 }),
        sound('hurt'),
        flash(),
        shake(8),
        call((ctx) => {
          // Slapped off: it tumbles away from the paw across the lane and lies there.
          ctx.visor = 0;
          const paw = ctx.actor('conf');
          takeOffHeadGear(ctx, 'knock', { x: paw.gx, y: paw.gy });
        }),
        card('SLAP!', 'THE BUCKET ROLLS AWAY ACROSS THE LANE', { color: C.red, seconds: 1.4, dim: 0.2 }),
        say('confusione', 'YOU WERE WALKING INTO THE HEDGE WITH A BUCKET ON. THE WHOLE LANE SAW.'),
        say('zampano', 'I WAS KEEPING MY HEAD UP.'),
        say('confusione', 'THE GAP IS RIGHT HERE. IT IS ALWAYS RIGHT HERE. GO HOME.'),
        say('zampano', 'THERE WAS A BUCKET, AND IT FELT LIKE A HELMET.', { remembered: true }),
      ],
    },
    {
      id: '1.2',
      title: "Under the Professor's desk",
      happens:
        'FOLLOW HIS FATHER, A MEDIEVAL HISTORIAN REHEARSING A LECTURE, INTO THE STUDY. SNIFF THE CHAIR LEG, A SUITCASE AND THE HEM OF HIS COAT FOR SCRAPS OF THE LECTURE. OUTSIDE, JACK LETS THE OTHER DOGS PASS BETWEEN TWO GARDEN GATES, BUT ECHOES ZAMPANO\'S BARK UNTIL HEADS POP UP ALONG THE FENCES. AT A CREAK FROM THE WINDOW HE LETS HIM THROUGH.',
      source: "ORIGINAL GREENZONE SCENE. THE LECTURE PLANTS THE DREAM'S THREE VOICES (VILLEHARDOUIN, CLARI, NIKETAS CHONIATES) AND ITS RESIDUES: THE DEBT FOR THE FLEET (VILLEHARDOUIN'S TREATY, 85,000 MARKS), PIERRE'S WALK (CLARI 47), THE CITY WATCHING FROM ITS WALLS (CLARI 40).",
      script: () => {
        let echoes = 0;
        let open = false;
        let bumps = 0;
        // Jack in the gap between the two garden gates (he stands at marker '2', 7.5 3.5).
        const jackGate = blockGap({ x0: 6.55, x1: 8.45, y0: 2, y1: 5 });
        const letThrough = (ctx: StoryScene) => {
          if (open) return;
          open = true;
          ctx.say('CREAK...', { x: 1.5, y: 1.5 }, '#f0d8a0');
        };
        return [
          call((ctx) => {
            ctx.setStage('study', { skin: 'plain', at: 'S', face: 'NW' });
            ctx.addActor('prof', 'legs', { x: ctx.marker('S').x - 0.8, y: ctx.marker('S').y - 0.6 }, { kind: 'idle' });
          }),
          say('professor', 'NOW. WHERE WERE WE. THE FOURTH CRUSADE. AGAIN, FROM THE TOP.'),
          followLeader({
            objective: 'FOLLOW YOUR FATHER INTO THE STUDY',
            leader: 'prof',
            path: ['3', '7', '1', '6'],
            speed: 1.4,
            onReach: (ctx, k) => {
              const lines = ['VILLEHARDOUIN, YOU UNDERSTAND, WAS IN THE ROOM WHEN THEY DECIDED.', 'CLARI WAS OUTSIDE THE ROOM. HE SAW EVERYTHING AND WAS TOLD NOTHING.', 'NOBODY SAILS IN WINTER.', 'AND NIKETAS WAS INSIDE THE WALLS, WATCHING THEM COME.'];
              const legs = ctx.actor('prof');
              ctx.say(lines[k % lines.length]!, { x: legs.gx, y: legs.gy - 1.2 }, '#f0d8a0');
            },
          }),
          call((ctx) => ctx.actor('prof').setBehavior({ kind: 'idle' })),
          walk({
            objective: 'SNIFF THE CHAIR LEG, THE SUITCASE AND THE HEM OF HIS COAT',
            action: 'SNIFF',
            onAction: (ctx) => ctx.say('SNIFF...', { x: ctx.player.gx, y: ctx.player.gy }),
            pickups: [
              { at: '0', kind: 'shard', label: 'THE CHAIR LEG', text: '"A FLEET BOUGHT ON CREDIT. EIGHTY-FIVE THOUSAND MARKS, AND THEY HAD NOT GOT IT."', effects: { shard: 'A FLEET BOUGHT ON CREDIT' } },
              { at: '5', kind: 'shard', label: 'THE SUITCASE', text: '"THE OTHERS TURNED BACK. ONE KNIGHT KEPT WALKING."', effects: { shard: 'A KNIGHT WHO KEPT WALKING' } },
              { at: '6', kind: 'shard', label: 'THE HEM OF HIS COAT', text: '"A CITY SEEN FROM ITS WALLS, AND THE WALLS FULL OF PEOPLE."', effects: { shard: 'A CITY SEEN FROM ITS WALLS' } },
            ],
          }),
          say('professor', 'DREAMS ARE FURNISHED WITH DAILY LIFE, YOU KNOW. A SAILOR DREAMS ROPES; A COMMUTER DREAMS TRAINS AND SUITCASES.'),
          say('zampano', 'AND A DOG DREAMS LECTURES.', { remembered: true }),
          call((ctx) => {
            ctx.setStage('neighborhood', { skin: 'plain', at: 'S', face: 'NE' });
            ctx.addActor('jack', 'jack', '2', { kind: 'idle', face: 'W' });
            ctx.addActor('d1', 'crowdC', { x: 4.5, y: 3.5 }, { kind: 'goto', to: { x: 11.5, y: 3.5 }, speed: 2 });
          }),
          card('OUTSIDE', 'TWO GARDEN GATES, AND JACK IN BETWEEN', { color: C.green, seconds: 1.8 }),
          call((ctx) => ctx.actor('jack').setBehavior({ kind: 'goto', to: { x: 8.5, y: 4.5 }, speed: 3 })),
          say('jack', 'GO ON, GO ON. EVERYBODY PASSES. (THE OTHER DOG TROTS THROUGH.)'),
          call((ctx) => ctx.actor('jack').setBehavior({ kind: 'goto', to: ctx.marker('2'), speed: 3 })),
          wait(0.6),
          say('jack', 'EVERYBODY EXCEPT YOU.'),
          walk({
            objective: 'GET THROUGH THE GARDEN GATES TO THE BOWL',
            goal: { reach: '1', label: 'THE BOWL' },
            pilot: (ctx) => (open ? null : { target: { x: 6.2, y: 3.5 }, act: distTo(ctx, { x: 6.2, y: 3.5 }) < 1.2, hold: true }),
            onAction: (ctx) => {
              bark(ctx, 'WOOF!');
              if (open || distTo(ctx, ctx.marker('2')) > 3) return;
              echoes++;
              const j = ctx.actor('jack');
              ctx.say(echoes === 1 ? 'WOOF!' : echoes === 2 ? 'WOOF! WOOF!' : '"WOOF," HE SAYS. "WOOF!"', { x: j.gx, y: j.gy }, '#f0b060');
              j.emote('bark');
              if (echoes === 2) heads(ctx);
              if (echoes >= 3) letThrough(ctx);
            },
            onUpdate: (ctx, w) => {
              // The window creaked: Jack steps aside (below), then the way to the bowl is free.
              if (open) {
                w.complete = true;
                return;
              }
              if (!jackGate(ctx)) return;
              bumps++;
              ctx.say('NOPE!', ctx.marker('2'), '#f0b060');
              ctx.actor('jack').emote('bark');
              if (bumps === 3 || bumps === 8) ctx.notice('JACK WILL NOT MOVE. BARK?', C.orange);
              // Nobody stays stuck: pushing long enough gets him through too.
              if (bumps >= 14) letThrough(ctx);
            },
          }),
          call((ctx) => ctx.actor('jack').setBehavior({ kind: 'goto', to: { x: 8.5, y: 4.5 }, speed: 2.5 })),
          say('jack', "(A CREAK FROM THE PROFESSOR'S WINDOW. JACK STEPS ASIDE AS IF HE HAD ALWAYS MEANT TO.)"),
          walk({
            objective: 'GO THROUGH TO THE BOWL',
            goal: { reach: '1', label: 'THE BOWL' },
          }),
          say('zampano', 'THERE WAS A GATE, AND IT WAS A CHIHUAHUA.', { remembered: true }),
        ];
      },
    },
    {
      id: '1.3',
      title: 'The toll at the bowl',
      happens:
        'BAGNASKIZ LETS SBRIMBRULON DRINK, THEN PUTS HIS PAW OVER THE BOWL AND DEMANDS THE USUAL APOLOGY. JACK CALLS THE FENCES TO WATCH; WATSON DRAGS THE BOWL JUST OUT OF REACH. OFFER THE PAW AND HE DEMANDS THE OTHER ONE TOO. TRY THE DIRECT PATH AND JACK CUTS HIM OFF. THE HEDGE IS ALWAYS OPEN: THE LONG WAY TO HIS OWN NEIGHBOR\'S GATE.',
      source: "ORIGINAL GREENZONE SCENE: BAGNASKIZ'S CHARACTER CARD (BOARD, 11:52:06). THE BOWL'S CLANG BECOMES THE HARBOR BELL OF VENICE; THE BOWL ALWAYS ONE STEP AWAY, THE FLEET BOUGHT ON CREDIT.",
      script: () => {
        let bowl: PropEntity | null = null;
        let cutOff = 0;
        // The second garden gate on the lane, where Jack cuts him off.
        const cutGate = blockGap({ x0: 17.4, x1: 18.9, y0: 2, y1: 5 });
        let jokeT = 0;
        const jokes = ['AND THEN HE OFFERED THE OTHER PAW!', 'HA HA HA!', 'THE OTHER PAW!', 'HA HA!'];
        let j = 0;
        return [
          call((ctx) => {
            ctx.setStage('neighborhood', { skin: 'plain', at: { x: 10.5, y: 3.5 }, face: 'E' });
            bowl = placeObject(ctx, 'bowl', '1');
            ctx.addActor('bag', 'bagnaskiz', { x: 13.5, y: 2.6 }, { kind: 'idle', face: 'S' });
            ctx.addActor('sbrim', 'sbrimbrulon', { x: 13.5, y: 4.2 }, { kind: 'idle', face: 'N' });
            ctx.addActor('jack', 'jack', { x: 16.5, y: 4.5 }, { kind: 'idle', face: 'player' });
            ctx.addActor('watson', 'watson', '7', { kind: 'idle', face: 'SW' });
          }),
          card('THE BOWL', "THE BAND'S TOLL", { color: C.orange, seconds: 1.6 }),
          say('bagnaskiz', 'DRINK, SBRIMBRULON. TAKE YOUR TIME.'),
          call((ctx) => ctx.actor('sbrim').setBehavior({ kind: 'goto', to: { x: 20.5, y: 4.5 }, speed: 1.6 })),
          move('zampano', { x: 12.4, y: 3.5 }, 2),
          call((ctx) => {
            const b = ctx.actor('bag');
            b.setPosition(13.2, 3.1);
            b.emote('bark');
          }),
          say('bagnaskiz', '(HE PUTS HIS PAW OVER THE BOWL.) SIGNOR VILLANO. YOU KNOW THE TOLL. THE USUAL APOLOGY.'),
          say('jack', 'EVERYBODY! COME AND WATCH!'),
          call((ctx) => heads(ctx)),
          ask('bagnaskiz', 'THE PAW, ZAMPANO.', [
            {
              label: '(OFFER THE PAW) PARDON.',
              effects: { supervillain: -3, flags: { pawOffered: true } },
              then: [say('jack', '(OFFERING A PAW, VERY SLOWLY) PAAARDON...'), say('bagnaskiz', 'AND THE OTHER ONE.')],
            },
            { label: '(LOOK PAST HIM AT THE WATER)', then: [say('bagnaskiz', 'THE WATER IS NOT LOOKING AT YOU.')] },
          ]),
          call((ctx) => {
            if (bowl) bowl.setPosition(14.6, 2.4);
            ctx.game.audio.play('hit');
            ctx.say('CLONG.', { x: 14.6, y: 2.4 }, '#c8d0ff');
          }),
          say('watson', '(HE DRAGS THE BOWL JUST OUT OF REACH.) OOPS, MAN.'),
          walk({
            objective: "GO HOME BY SANTINA'S GATE. ANY WAY YOU CAN",
            goal: { reach: '8', label: "SANTINA'S GATE" },
            checkpoints: ['6'],
            pilot: (ctx) => {
              // Through the hedge gap, along the lower lane, up through the far gap.
              const p = ctx.player;
              if (p.gy < 6 && p.gx < 19) return { target: { x: 12.5, y: 7.5 } };
              if (p.gy >= 6 && p.gx < 19.8) return { target: { x: 20.5, y: 7.6 } };
              return null;
            },
            onUpdate: (ctx, _w, dt) => {
              const p = ctx.player;
              // Jack cuts him off at the next opening on the direct path.
              if (cutGate(ctx)) {
                const jack = ctx.actor('jack');
                jack.setPosition(18.5, 3.5);
                jack.emote('bark');
                ctx.say('NOT THIS WAY, SIGNOR!', { x: 18.5, y: 3.5 }, '#f0b060');
                if (cutOff++ === 0) ctx.notice('JACK CUTS HIM OFF. THE HEDGE IS ALWAYS OPEN', C.orange);
              }
              // From the lower lane he can hear Jack telling the same joke on the other side.
              if (p.gy > 6.6) {
                jokeT -= dt;
                if (jokeT <= 0) {
                  jokeT = 2.4;
                  ctx.say(jokes[j++ % jokes.length]!, { x: p.gx - 0.5, y: 5.4 }, '#f0b060');
                }
              }
            },
          }),
          fx({ flags: { longWay: true } }),
          card('THE LONG WAY', "TO HIS OWN NEIGHBOR'S GATE", { color: C.orange, seconds: 2 }),
          say('zampano', 'THERE WAS A BOWL, AND IT WAS ALWAYS ONE STEP AWAY.', { remembered: true }),
        ];
      },
    },
    {
      id: '1.4',
      title: 'Santina wants her ball back',
      happens:
        'A RED BALL HAS ROLLED THROUGH THE BARS. SANTINA AND A FRIEND CAN SEE IT ON ZAMPANO\'S SIDE OF THE GATE, AND SHE ASKS HIM TO ROLL IT BACK. EVERY REPLY COMES FROM HIS SINCERE CONVICTION THAT SHE WANTS TO SEE SOMETHING IMPRESSIVE.',
      source: 'ORIGINAL GREENZONE SCENE: THE HANDWRITTEN NOTE BESIDE THE CASTING LIST (BOARD, 11:52:30). HIS CONVICTION THAT SHE WANTS A PERFORMANCE RETURNS AT THE WALLS IN 7.3 AND IS ANSWERED IN 8.4.',
      script: () => {
        let ball: PropEntity | null = null;
        const used = new Set<string>();
        const tries: Array<{ key: string; label: string; then: ReturnType<typeof say>[] }> = [
          {
            key: 'bow',
            label: '(A COURTLY BOW)',
            then: [say('voice', 'HE PUTS A PAW ON THE BALL AND BOWS UNTIL HIS CHIN TOUCHES IT.'), say('santina', 'THE BALL, ZAMPANO. YOU HAVE FOUND IT.')],
          },
          {
            key: 'strength',
            label: '(A DISPLAY OF STRENGTH)',
            then: [say('voice', 'HE TRIES TO LIFT THE GATE CLEAN OFF ITS HINGES. THE BALL RESTS BY HIS BACK PAW.'), say('lady', 'IT FITS BETWEEN THE BARS.')],
          },
          { key: 'compliment', label: 'YOUR GATE SMELLS VERY NICE.', then: [say('voice', 'SANTINA LOOKS AT THE GATE.'), say('santina', 'MY FATHER PAINTED IT YESTERDAY.')] },
        ];
        const wheel = (): ReturnType<typeof call> =>
          call((ctx) => {
            const left = tries.filter((t) => !used.has(t.key));
            if (!left.length) return;
            ctx.insert([
              ask(
                'santina',
                used.size === 0 ? 'CAN YOU ROLL IT BACK TO ME?' : 'THE BALL, ZAMPANO. CAN YOU ROLL IT BACK?',
                left.map((t) => ({ label: t.label, then: [call(() => used.add(t.key)), ...t.then, wheel()] })),
              ),
            ]);
          });
        return [
          call((ctx) => {
            ctx.setStage('neighborhood', { skin: 'plain', at: { x: 18.5, y: 3.5 }, face: 'E' });
            ctx.addActor('santina', 'santina', '9', { kind: 'idle', face: 'W' });
            ctx.addActor('friend', 'lady', '0', { kind: 'idle', face: 'W' });
            ball = placeObject(ctx, 'ball', { x: 21.2, y: 3.75 }, 0xff4040);
          }),
          card("SANTINA'S GATE", 'THE BAND IS ALREADY OUT OF EARSHOT', { color: C.hotPink, seconds: 1.8 }),
          say('santina', 'ZAMPANO! MY BALL. THE RED ONE, THERE, BY YOUR PAW.'),
          move('zampano', { x: 20.6, y: 3.5 }, 2),
          face('zampano', 'E'),
          wheel(),
          call(() => {
            if (ball) ball.setPosition(21.4, 4.4);
          }),
          card('', 'THE BALL SETTLES BESIDE THE GATEPOST. ON HIS SIDE.', { color: C.hotPink, seconds: 2 }),
          say('zampano', '(HE STRAIGHTENS UP, PLEASED WITH HIS PERFORMANCE.)'),
          move('zampano', { x: 16.5, y: 3.5 }, 2.2),
          say('voice', 'SANTINA WATCHES HIM GO.'),
          fx({ flags: { santinaBall: 'performed' } }),
          say('zampano', 'THERE WAS A GATE, AND I WAS MAGNIFICENT AT IT.', { remembered: true }),
        ];
      },
    },
    {
      id: '1.5',
      title: 'A cross of rag',
      happens:
        'A SCRAP OF RED CLOTH IS CAUGHT IN THE HEDGE. CARRY IT HOME. IN THE STUDY THE PROFESSOR IS STILL REHEARSING: THE KNIGHTS SEWED CLOTH CROSSES ON THEIR SHOULDERS AND WENT. ZAMPANO PUTS THE RAG ON HIS OWN BACK AND WAITS FOR SOMEONE TO NOTICE. CURL UP UNDER THE DESK, WHERE THE DREAM BEGINS.',
      source: "ORIGINAL GREENZONE SCENE, REPLACING THE OLD REENACTMENT OF LOUIS IX. THE CLOTH CROSS AS THE SIGN OF THOSE WHO TOOK THE CROSS (VILLEHARDOUIN, MARZIALS PP. 1-4). THE SLEEP BOUNDARY: EVERYTHING AFTER THE LAST CARD IS DREAM.",
      script: () => [
        stage('neighborhood', [], { skin: 'plain', at: '8', face: 'W' }),
        walk({
          objective: 'TAKE THE SCRAP OF RED CLOTH CAUGHT IN THE HEDGE',
          pickups: [{ at: { x: 20.5, y: 5.5 }, kind: 'spot', label: 'A SCRAP OF RED CLOTH', sprite: 'rag' }],
        }),
        carry('RED CLOTH'),
        walk({ objective: 'FOLLOW THE FAMILIAR LANE HOME', goal: { reach: 'S', label: 'HOME' } }),
        dropCarried(),
        call((ctx) => {
          ctx.setStage('study', { skin: 'plain', at: '5', face: 'NE' });
          ctx.addActor('conf', 'confusione', '6', { kind: 'idle', face: 'player' });
          ctx.addActor('prof', 'legs', '2', { kind: 'idle' });
        }),
        prof('...AND ONE BY ONE THEY TOOK THE CROSS. A PIECE OF CLOTH, SEWN ON THE SHOULDER. THAT WAS ENOUGH TO BELONG.'),
        say('voice', 'ZAMPANO LAYS THE RAG ON HIS BACK. IT SLIDES OFF. HE LAYS IT ON AGAIN.'),
        ask('confusione', 'AND WHAT IS THAT SUPPOSED TO BE?', [
          {
            label: 'I AM ONE OF THEM. I HEARD THE WHOLE THING.',
            effects: { unlock: 'cross', supervillain: 3 },
            then: [say('confusione', 'YOU HEARD A MAN TALKING TO HIS COAT.')],
          },
          {
            label: '(SAY NOTHING. LET THEM SEE IT.)',
            effects: { unlock: 'cross', commozione: 3 },
            then: [say('confusione', 'NOBODY IS LOOKING, ZAMPANO.')],
          },
        ]),
        // The rag rides on his back (no armour on the lawn: the dream will make it a coat of mail).
        carry('A RAG CROSS ON HIS BACK'),
        sound('star'),
        call((ctx) => ctx.actor('prof').setBehavior({ kind: 'goto', to: { x: ctx.player.gx + 1.2, y: ctx.player.gy - 0.8 }, speed: 1.2 })),
        wait(1.4),
        card('', 'THE PROFESSOR STEPS OVER HIM WITHOUT LOOKING DOWN', { color: '#f0d8a0', seconds: 1.8, dim: 0.2 }),
        say('zampano', 'HE WILL NOTICE TOMORROW.'),
        say('confusione', 'TOMORROW. OBVIOUSLY.'),
        say('zampano', 'THERE WAS A RAG, AND IT WAS A CROSS, AND NOBODY LOOKED.', { remembered: true }),
        walk({ objective: 'CURL UP UNDER THE DESK', goal: { reach: '0', label: 'THE DESK' } }),
        prof('...AND IN THE SPRING THEY SET OFF FOR VENICE, WHERE THE SHIPS WERE. THE MONEY WAS ANOTHER MATTER.'),
        card('UNDER THE DESK', "IN THE DARK, THE HEM OF HIS FATHER'S TROUSERS BECOMES THE EDGE OF A SAIL. THE UNDERSIDE OF THE DESK IS THE BOTTOM OF A SHIP.", { color: '#f0d8a0' }),
      ],
    },
  ],
};
