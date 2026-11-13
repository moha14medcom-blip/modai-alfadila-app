/* WebAudio alert-sound engine — no audio assets, everything is synthesised. */

import type { SoundId, SoundSettings } from './types';

export const SOUND_IDS: SoundId[] = ['alarm', 'double', 'radar', 'horn'];

export const SOUND_LABELS: Record<SoundId, string> = {
  alarm: 'منبّه كلاسيك',
  double: 'دقّتين',
  radar: 'رادار',
  horn: 'بوق',
};

export const DEFAULT_SOUNDS: SoundSettings = {
  pomodoro: 'alarm',
  countdown: 'radar',
  reward: 'double',
};

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call once on the first user gesture so mobile browsers unlock audio. */
export function unlockAudio() {
  getCtx();
}

interface ToneOptions {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
}

function tone(audio: AudioContext, o: ToneOptions) {
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = o.type ?? 'sine';
  const start = audio.currentTime + o.at;
  const end = start + o.dur;
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, o.glideTo), end);
  const peak = Math.max(0.0001, o.gain ?? 0.3);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(g).connect(audio.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

export function playSound(id: SoundId, volume = 0.85) {
  const audio = getCtx();
  if (!audio) return;
  const v = Math.min(1, Math.max(0, volume));

  switch (id) {
    case 'alarm':
      [0, 0.22, 0.44].forEach((at) => {
        tone(audio, { freq: 880, at, dur: 0.16, type: 'square', gain: 0.22 * v });
        tone(audio, { freq: 1174, at: at + 0.08, dur: 0.14, type: 'square', gain: 0.18 * v });
      });
      break;

    case 'double':
      tone(audio, { freq: 988, at: 0, dur: 0.18, type: 'sine', gain: 0.34 * v });
      tone(audio, { freq: 1318, at: 0.16, dur: 0.26, type: 'sine', gain: 0.3 * v });
      break;

    case 'radar':
      tone(audio, {
        freq: 1400,
        glideTo: 320,
        at: 0,
        dur: 0.5,
        type: 'triangle',
        gain: 0.28 * v,
      });
      tone(audio, { freq: 660, at: 0.5, dur: 0.22, type: 'triangle', gain: 0.2 * v });
      break;

    case 'horn':
      tone(audio, { freq: 262, at: 0, dur: 0.34, type: 'sawtooth', gain: 0.24 * v });
      tone(audio, { freq: 196, at: 0.08, dur: 0.4, type: 'sawtooth', gain: 0.22 * v });
      tone(audio, { freq: 330, at: 0.36, dur: 0.3, type: 'sawtooth', gain: 0.18 * v });
      break;

    default:
      break;
  }
}

export function levelUpFanfare(volume = 0.85) {
  const audio = getCtx();
  if (!audio) return;
  const v = Math.min(1, Math.max(0, volume));
  [523, 659, 784, 1046].forEach((freq, i) => {
    tone(audio, { freq, at: i * 0.1, dur: 0.24, type: 'triangle', gain: 0.26 * v });
  });
}
