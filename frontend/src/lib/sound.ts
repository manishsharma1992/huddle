/**
 * Tiny synthesized sound kit (no audio files to download). Sounds fire on the same frame as the visual
 * they belong to, and only for meaningful moments: a card landing, cards flipping, consensus.
 */
let ctx: AudioContext | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.06) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(gain, t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function noise(start: number, duration: number, gain = 0.05, freq = 2400) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * duration), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const amp = a.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(a.destination);
  src.start(t);
}

export const sound = {
  setEnabled(value: boolean) {
    enabled = value;
  },
  tap: () => tone(880, 0, 0.06, 'triangle', 0.04),
  place: () => {
    noise(0, 0.07, 0.08, 1800);
    tone(330, 0.01, 0.09, 'sine', 0.05);
  },
  flip: (index = 0) => noise(index * 0.07, 0.09, 0.06, 3200),
  tick: () => tone(1200, 0, 0.04, 'square', 0.015),
  count: (n: number) => tone(n === 0 ? 1046 : 660, 0, 0.12, 'sine', 0.05),
  chime: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.5, 'sine', 0.05)),
  soft: () => [440, 554.37].forEach((f, i) => tone(f, i * 0.08, 0.3, 'sine', 0.035)),
  pop: () => tone(520 + Math.random() * 200, 0, 0.08, 'triangle', 0.04),
  whoosh: () => noise(0, 0.25, 0.04, 900),
  bonk: () => {
    tone(180, 0, 0.12, 'sine', 0.08);
    noise(0, 0.05, 0.05, 600);
  },
};
