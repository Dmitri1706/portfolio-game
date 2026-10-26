/**
 * Звук: 8-битная фоновая музыка и звуковые эффекты, сгенерированные кодом (Web Audio, в духе sfxr).
 * Любой звук и музыку можно заменить своим файлом: пропишите путь в content/settings.json → "audio".
 * Звук выключен по умолчанию и включается только кнопкой 🔊.
 */
import { SETTINGS, asset } from './content';

export type Sfx =
  | 'step'
  | 'door'
  | 'fall'
  | 'land'
  | 'bump'
  | 'pickup'
  | 'place'
  | 'type'
  | 'applause'
  | 'achievement';

const FILES: Record<string, string> = SETTINGS.audio;

let ctx: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;
let noise: AudioBuffer;
let on = false;
const listeners = new Set<(on: boolean) => void>();

function audio(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.6;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.22;
    musicBus.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

export function isSoundOn(): boolean {
  return on;
}

export function onSoundChange(fn: (on: boolean) => void): void {
  listeners.add(fn);
}

export function setSound(value: boolean): void {
  on = value;
  if (on) {
    audio().resume();
    startMusic();
  } else {
    stopMusic();
    ctx?.suspend();
  }
  listeners.forEach((fn) => fn(on));
}

// Вкладка свёрнута — звук на паузе, вернулись — продолжаем
document.addEventListener('visibilitychange', () => {
  if (!on || !ctx) return;
  if (document.hidden) {
    ctx.suspend();
    musicEl?.pause();
  } else {
    ctx.resume();
    musicEl?.play().catch(() => {});
  }
});

// ================= Генератор звуков =================

interface Note {
  wave: OscillatorType | 'noise';
  /** Частота в начале и в конце (Гц) */
  f0: number;
  f1?: number;
  /** Сдвиг начала, с */
  at?: number;
  dur: number;
  vol: number;
  /** Фильтр для шума: 'low' — глухой, 'high' — звонкий */
  filter?: 'low' | 'high';
}

function play(notes: Note[], bus: GainNode = sfxBus, when?: number): void {
  const a = audio();
  const t0 = when ?? a.currentTime;
  for (const n of notes) {
    const start = t0 + (n.at ?? 0);
    const end = start + n.dur;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(n.vol, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    let src: AudioScheduledSourceNode;
    if (n.wave === 'noise') {
      const s = a.createBufferSource();
      s.buffer = noise;
      s.loop = true;
      const f = a.createBiquadFilter();
      f.type = n.filter === 'high' ? 'highpass' : 'lowpass';
      f.frequency.value = n.f0;
      s.connect(f).connect(g);
      src = s;
    } else {
      const o = a.createOscillator();
      o.type = n.wave;
      o.frequency.setValueAtTime(n.f0, start);
      if (n.f1) o.frequency.exponentialRampToValueAtTime(n.f1, end);
      o.connect(g);
      src = o;
    }
    g.connect(bus);
    src.start(start);
    src.stop(end + 0.02);
  }
}

const RECIPES: Record<Exclude<Sfx, 'applause'>, Note[]> = {
  step: [{ wave: 'noise', f0: 900, dur: 0.04, vol: 0.12 }],
  door: [
    { wave: 'square', f0: 220, f1: 140, dur: 0.18, vol: 0.12 },
    { wave: 'noise', f0: 2500, at: 0.18, dur: 0.05, vol: 0.2, filter: 'high' },
  ],
  fall: [{ wave: 'sine', f0: 1100, f1: 260, dur: 0.75, vol: 0.18 }],
  land: [
    { wave: 'triangle', f0: 140, f1: 45, dur: 0.22, vol: 0.5 },
    { wave: 'noise', f0: 500, dur: 0.18, vol: 0.35 },
  ],
  bump: [
    { wave: 'triangle', f0: 95, f1: 38, dur: 0.32, vol: 0.6 },
    { wave: 'square', f0: 70, f1: 40, dur: 0.12, vol: 0.15 },
    { wave: 'noise', f0: 350, dur: 0.2, vol: 0.4 },
  ],
  pickup: [
    { wave: 'square', f0: 520, f1: 900, dur: 0.09, vol: 0.12 },
    { wave: 'square', f0: 880, at: 0.07, dur: 0.07, vol: 0.1 },
  ],
  place: [
    { wave: 'square', f0: 660, dur: 0.07, vol: 0.12 },
    { wave: 'square', f0: 990, at: 0.08, dur: 0.12, vol: 0.12 },
    { wave: 'noise', f0: 4000, at: 0.08, dur: 0.15, vol: 0.06, filter: 'high' },
  ],
  type: [{ wave: 'square', f0: 1200, dur: 0.018, vol: 0.035 }],
  achievement: [
    { wave: 'triangle', f0: 784, dur: 0.12, vol: 0.25 },
    { wave: 'triangle', f0: 988, at: 0.1, dur: 0.12, vol: 0.25 },
    { wave: 'triangle', f0: 1319, at: 0.2, dur: 0.5, vol: 0.28 },
    { wave: 'square', f0: 2637, at: 0.2, dur: 0.35, vol: 0.05 },
  ],
};

function applause(): Note[] {
  const out: Note[] = [];
  for (let i = 0; i < 70; i++) {
    out.push({ wave: 'noise', f0: 1200 + Math.random() * 1500, at: Math.random() * 2.2, dur: 0.03, vol: 0.08 + Math.random() * 0.12, filter: 'high' });
  }
  return out;
}

// ================= Свои файлы вместо сгенерированных =================

const buffers = new Map<string, AudioBuffer | 'loading' | 'error'>();

function fileBuffer(name: string): AudioBuffer | null {
  const path = FILES[name];
  if (!path) return null;
  const b = buffers.get(name);
  if (b instanceof AudioBuffer) return b;
  if (!b) {
    buffers.set(name, 'loading');
    fetch(asset(path))
      .then((r) => r.arrayBuffer())
      .then((data) => audio().decodeAudioData(data))
      .then((buf) => buffers.set(name, buf))
      .catch(() => buffers.set(name, 'error'));
  }
  return null;
}

/** Проиграть звуковой эффект (если звук включён). */
export function sfx(name: Sfx): void {
  if (!on) return;
  const buf = fileBuffer(name);
  if (buf) {
    const s = audio().createBufferSource();
    s.buffer = buf;
    s.connect(sfxBus);
    s.start();
    return;
  }
  play(name === 'applause' ? applause() : RECIPES[name]);
}

// ================= Музыка =================

const BPM = 112;
const EIGHTH = 60 / BPM / 2;
// Мелодия (MIDI-ноты по восьмым, null — пауза) и бас (по половинкам)
const LEAD = [
  72, 76, 79, 76, 81, 79, 76, 74, 72, 76, 79, 81, 79, null, 76, null, 77, 81, 84, 81, 79, 76, 74, 72, 74, 76, 74, 71, 72, null, null, null,
];
const BASS = [48, 48, 45, 45, 41, 41, 43, 43];
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

let musicTimer = 0;
let nextTime = 0;
let step = 0;
let musicEl: HTMLAudioElement | null = null;

function startMusic(): void {
  if (FILES.music) {
    musicEl ??= Object.assign(new Audio(asset(FILES.music)), { loop: true, volume: 0.35 });
    musicEl.play().catch(() => {});
    return;
  }
  if (musicTimer) return;
  const a = audio();
  nextTime = a.currentTime + 0.1;
  musicTimer = window.setInterval(() => {
    // планируем ноты на 0.3 с вперёд, чтобы музыка не заикалась
    while (nextTime < a.currentTime + 0.3) {
      const i = step % LEAD.length;
      const n = LEAD[i];
      if (n) play([{ wave: 'square', f0: midi(n), dur: EIGHTH * 0.9, vol: 0.1 }], musicBus, nextTime);
      if (i % 4 === 0) play([{ wave: 'triangle', f0: midi(BASS[(i / 4) % BASS.length]), dur: EIGHTH * 3.6, vol: 0.35 }], musicBus, nextTime);
      if (i % 2 === 1) play([{ wave: 'noise', f0: 6000, dur: 0.03, vol: 0.05, filter: 'high' }], musicBus, nextTime);
      nextTime += EIGHTH;
      step++;
    }
  }, 60);
}

function stopMusic(): void {
  clearInterval(musicTimer);
  musicTimer = 0;
  musicEl?.pause();
}
