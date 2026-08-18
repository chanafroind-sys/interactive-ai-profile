'use client';

/**
 * Tiny synthesized audio layer — no media files, everything is generated with
 * the Web Audio API so nothing extra ships in the bundle.
 *
 * Browsers block audio until a user gesture, so the context is created lazily
 * and every call is a no-op until something resumes it. Nothing here ever
 * throws into the UI.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambient: { stop: () => void } | null = null;

type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const win = window as WindowWithAudio;
    const Ctor = window.AudioContext ?? win.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (master) master.gain.value = next ? 0 : 0.3;
  if (next) stopAmbient();
}

/** Short bubble "pop" — a fast pitch drop with a snappy envelope. */
export function playPop(pitch = 1): void {
  const audio = ensureContext();
  if (!audio || !master || muted) return;
  const now = audio.currentTime;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(180 * pitch, now + 0.11);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.5, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + 0.18);
}

/** Softer tick used for node hover, so the road doesn't get noisy. */
export function playBlip(pitch = 1): void {
  const audio = ensureContext();
  if (!audio || !master || muted) return;
  const now = audio.currentTime;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880 * pitch, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + 0.14);
}

/** Rising arpeggio for the tour's final celebration. */
export function playFanfare(): void {
  const audio = ensureContext();
  if (!audio || !master || muted) return;
  [0, 4, 7, 12].forEach((semitone, i) => {
    const now = audio.currentTime + i * 0.11;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(392 * Math.pow(2, semitone / 12), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain).connect(master!);
    osc.start(now);
    osc.stop(now + 0.55);
  });
}

/**
 * Ambient pad for tour mode: a slow detuned drone under a filter that drifts,
 * which reads as background music without needing an audio file.
 */
export function startAmbient(): void {
  const audio = ensureContext();
  if (!audio || !master || muted || ambient) return;

  const bus = audio.createGain();
  bus.gain.setValueAtTime(0.0001, audio.currentTime);
  bus.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 1.6);

  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  filter.Q.value = 6;

  // Slow sweep of the filter cutoff gives the pad movement.
  const lfo = audio.createOscillator();
  const lfoGain = audio.createGain();
  lfo.frequency.value = 0.06;
  lfoGain.gain.value = 340;
  lfo.connect(lfoGain).connect(filter.frequency);

  const voices = [110, 164.81, 220, 329.63].map((freq, i) => {
    const osc = audio.createOscillator();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = (i - 1.5) * 7;
    const voiceGain = audio.createGain();
    voiceGain.gain.value = i === 0 ? 0.5 : 0.22;
    osc.connect(voiceGain).connect(filter);
    return osc;
  });

  filter.connect(bus).connect(master);
  lfo.start();
  voices.forEach((v) => v.start());

  ambient = {
    stop: () => {
      const end = audio.currentTime + 0.9;
      bus.gain.cancelScheduledValues(audio.currentTime);
      bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), audio.currentTime);
      bus.gain.exponentialRampToValueAtTime(0.0001, end);
      voices.forEach((v) => v.stop(end + 0.05));
      lfo.stop(end + 0.05);
    },
  };
}

export function stopAmbient(): void {
  if (!ambient) return;
  try {
    ambient.stop();
  } catch {
    /* context already closed */
  }
  ambient = null;
}
