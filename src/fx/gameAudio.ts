import { AMBUSH, AUDIO } from '../config';

/** The band's barks, each its own voice (until recorded voices are delivered: ASSETS.md). */
const BAND_PITCH: Record<string, number> = { bagnaskiz: 1, jack: 1.35, watson: 0.82 };
const bandRate = (who: string) => (BAND_PITCH[who] ?? 1) * (0.96 + Math.random() * 0.08);
import type { AudioEngine } from '../core/audio';
import type { Emitter, GameEvents } from '../core/events';

/** Maps gameplay events to sound effects. */
export function bindGameAudio(events: Emitter<GameEvents>, audio: AudioEngine): void {
  // Recorded sounds (assets/sounds); the rest stays synthesized.
  events.on('treat', () => audio.play('treat'));
  events.on('poop', () => audio.play('poop'));
  events.on('pee', (e) => {
    audio.play('pee');
    if (e.marking) audio.play('star', { delay: 0.12 });
  });
  events.on('peeEmpty', () => audio.play('empty'));
  events.on('tired', () => audio.play('empty', { rate: 0.8 }));
  events.on('poopCleaned', () => audio.play('coin', { rate: 1.5, volume: 0.5 }));
  events.on('drink', () => audio.play('drink'));
  events.on('splash', () => audio.play('splash', { volume: 0.7 }));
  events.on('digestWarning', () => audio.play('warning'));
  events.on('lifeLost', () => audio.play('hurt'));
  events.on('bump', () => audio.play('laser'));
  events.on('bark', () => audio.play('bark', { rate: 0.95 + Math.random() * 0.1 }));
  events.on('barkHit', () => audio.play('hit'));
  events.on('bagnaskizFled', () => audio.play('flee'));
  events.on('cat', () => {
    audio.play('meow');
    audio.play('coin', { delay: AUDIO.CASH_DELAY });
  });
  events.on('ballSpawn', () => audio.play('ball'));
  events.on('fetch', () => audio.play('fetch'));
  events.on('pollutionSurge', () => audio.play('warning', { rate: 0.82, volume: 0.75 }));
  // The ambush: voices louder as he gets closer, the shout, the fright, the barking and poops.
  events.on('ambushVoice', (e) => {
    const [quiet, loud] = AMBUSH.VOICE_VOLUME;
    audio.play('bark', { rate: bandRate(e.who), volume: quiet + (loud - quiet) * e.loud });
  });
  events.on('ambushNow', (e) => {
    audio.play('bark', { rate: bandRate(e.who) * 0.92 });
    audio.play('hit', { delay: 0.05 });
  });
  events.on('ambushJump', () => audio.play('swish'));
  events.on('ambushScare', () => audio.play('hurt'));
  events.on('ambushBark', (e) => audio.play('bark', { rate: bandRate(e.who), volume: 0.8 }));
  events.on('bandPoop', () => audio.play('poop', { volume: 0.6 }));
  events.on('attackStart', () => {
    audio.play('alarm');
    audio.loop('siren', { volume: AUDIO.SIREN_VOLUME, delay: AUDIO.SIREN_DELAY });
    audio.setDuck(0.45);
  });
  events.on('attackEnd', () => {
    audio.stopLoop('siren');
    audio.play('saved');
    audio.setDuck(1);
  });
  events.on('levelComplete', () => {
    audio.stopLoop('siren');
    audio.play('jingle');
    audio.setDuck(0.35);
  });
  events.on('gameOver', () => {
    audio.stopLoop('siren');
    audio.stopMusic();
    audio.play('gameover');
  });
}
