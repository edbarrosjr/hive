// Synthesizes the showreel soundtrack (15 s, 48 kHz stereo WAV) with no dependencies.
// Every hit lines up with the animation's timeline in index.html (120 BPM, cuts on 2.0 / 4.0 / 6.5 / 9.0 / 11.5 / 13.25 / 13.5).
//
//   node showreel/audio.mjs   -> showreel/out/audio.wav
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float64Array(N), R = new Float64Array(N);
const REV_L = new Float64Array(N), REV_R = new Float64Array(N); // reverb send
const TAU = Math.PI * 2;
let seed = 1234;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

// Renders `voice(t)` from `start` for `dur` seconds into the mix (and the reverb send).
function play(start, dur, voice, { gain = 1, pan = 0, send = 0 } = {}) {
  const s0 = Math.max(0, Math.floor(start * SR)), s1 = Math.min(N, Math.floor((start + dur) * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let n = s0; n < s1; n++) {
    const v = voice((n - s0) / SR);
    L[n] += v * gl; R[n] += v * gr;
    if (send) { REV_L[n] += v * gl * send; REV_R[n] += v * gr * send; }
  }
}
const decay = (t, tau) => Math.exp(-t / tau);
const ad = (t, a, tau) => (t < a ? t / a : decay(t - a, tau));
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// stateful one-pole / biquad filters used inside voices (each voice owns its own instance)
const lowpass = (cut) => { let y = 0; const a = 1 - Math.exp(-TAU * cut / SR); return (x, c) => { const k = c ? 1 - Math.exp(-TAU * c / SR) : a; y += k * (x - y); return y; }; };
const bandpass = (f0, q) => {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, f = f0) => {
    const w = TAU * f / SR, al = Math.sin(w) / (2 * q);
    const b0 = al, b1 = 0, b2 = -al, a0 = 1 + al, a1 = -2 * Math.cos(w), a2 = 1 - al;
    const y = (b0 / a0) * x + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; return y;
  };
};
const highpass = (cut) => { const lp = lowpass(cut); return (x) => x - lp(x); };

// ---------- instruments ----------
function kick(t0, g = 1) {
  play(t0, 0.5, (t) => Math.sin(TAU * (45 * t + (150 - 45) * (1 - Math.exp(-t / 0.05)) * 0.05)) * decay(t, 0.16) + rnd() * decay(t, 0.008) * 0.5, { gain: 0.9 * g });
}
function boom(t0, g = 1, len = 1.4) {
  play(t0, len, (t) => Math.sin(TAU * (38 * t + 60 * (1 - Math.exp(-t / 0.12)) * 0.12)) * decay(t, len * 0.35), { gain: 1.1 * g, send: 0.5 });
  const bp = bandpass(1200, 0.7);
  play(t0, 0.5, (t) => bp(rnd()) * decay(t, 0.08), { gain: 0.9 * g, send: 0.6 });
}
function snare(t0, g = 1) {
  const bp = bandpass(1800, 0.8);
  play(t0, 0.35, (t) => bp(rnd()) * decay(t, 0.07) + Math.sin(TAU * 190 * t) * decay(t, 0.05) * 0.6, { gain: 0.55 * g, send: 0.35 });
}
function hat(t0, g = 1, len = 0.05) {
  const hp = highpass(7000);
  play(t0, len * 4, (t) => hp(rnd()) * decay(t, len), { gain: 0.32 * g, pan: 0.25 });
}
function bassNote(t0, m, len) {
  const lp = lowpass(600);
  const f = midi(m);
  play(t0, len, (t) => {
    let v = 0; for (let h = 1; h <= 7; h++) v += Math.sin(TAU * f * h * t) / h; // saw-ish
    const cut = 160 + 1400 * decay(t, 0.09);
    return lp(v, cut) * ad(t, 0.005, len * 0.6) + Math.sin(TAU * f * t) * 0.5 * ad(t, 0.005, len * 0.7);
  }, { gain: 0.34 });
}
function pluck(t0, m, len = 0.35, g = 1, pan = 0) {
  const f = midi(m);
  play(t0, len, (t) => (Math.sin(TAU * f * t) + Math.sin(TAU * f * 2 * t) * 0.35 * decay(t, 0.08) + Math.sin(TAU * f * 3 * t) * 0.12 * decay(t, 0.05)) * ad(t, 0.003, len * 0.3), { gain: 0.22 * g, pan, send: 0.45 });
}
function stab(t0, notes, len = 0.25, g = 1) {
  for (const m of notes) { const f = midi(m); play(t0, len, (t) => (Math.sin(TAU * f * t) + Math.sin(TAU * f * 1.005 * t) + Math.sin(TAU * f * 2 * t) * 0.3) * ad(t, 0.004, len * 0.35), { gain: 0.11 * g, send: 0.5 }); }
}
function whoosh(t0, len = 0.2, g = 1, dir = 1) {
  const bp = bandpass(400, 1.2);
  play(t0, len, (t) => { const k = t / len; return bp(rnd(), 300 + 4000 * Math.pow(dir > 0 ? k : 1 - k, 2)) * Math.pow(Math.sin(k * Math.PI), 0.7); }, { gain: 0.7 * g, pan: -dir * 0.5 });
}
function riser(t0, len, g = 1) {
  const bp = bandpass(300, 0.9);
  play(t0, len, (t) => { const k = t / len; return bp(rnd(), 200 + 5000 * k * k) * k * k + Math.sin(TAU * (100 + 700 * k * k) * t) * k * 0.25; }, { gain: 0.55 * g, send: 0.4 });
}
function blip(t0, f, len = 0.08, g = 1) { play(t0, len * 5, (t) => Math.sin(TAU * f * t) * ad(t, 0.002, len), { gain: 0.18 * g, pan: 0.2, send: 0.3 }); }
function pad(t0, len, notes, g = 1) {
  for (const m of notes) {
    const f = midi(m); const lp = lowpass(900); const ph = rnd() * 10;
    play(t0, len, (t) => { const env = Math.min(1, t / 1.2) * Math.min(1, (len - t) / 1.0); return lp(Math.sin(TAU * f * t + ph) + Math.sin(TAU * f * 1.004 * t) + Math.sin(TAU * f * 0.996 * t + 1), 300 + 500 * Math.sin(t * 0.7) ** 2) * env; }, { gain: 0.045 * g, pan: rnd() * 0.6, send: 0.6 });
  }
}
function shimmer(t0, f, len = 1.2, g = 1) { play(t0, len, (t) => Math.sin(TAU * f * t) * decay(t, len * 0.3) + Math.sin(TAU * f * 1.5 * t) * decay(t, len * 0.2) * 0.4, { gain: 0.14 * g, send: 0.8 }); }

// ---------- arrangement (120 BPM: beat = 0.5 s, 8th = 0.25 s, 16th = 0.125 s) ----------
const BEAT = 0.5;
// S0 ignition: drone swell, pings on the shockwaves, impact on the title reveal
play(0, 2.0, (t) => (Math.sin(TAU * 55 * t) + Math.sin(TAU * 82.4 * t) * 0.5) * Math.min(1, t / 0.9) * Math.max(0, 1 - Math.max(0, t - 1.0) / 1.0), { gain: 0.25, send: 0.3 });
shimmer(0.2, 1320, 1.0, 0.7); shimmer(0.5, 1760, 1.0, 0.8);
whoosh(0.45, 0.5, 0.6, 1);
boom(1.0, 0.9);
stab(1.02, [52, 59, 64, 71], 0.6, 0.9);
for (let i = 0; i < 6; i++) pluck(1.02 + i * 0.055, [76, 79, 83, 84, 88, 91][i], 0.5, 0.6, -0.5 + i * 0.2);
riser(1.5, 0.5, 0.6);
// S1 kinetic type: full drums kick in, a whoosh + stab on every word
boom(2.0, 1.0, 0.9);
for (let t = 2.0; t <= 13.0 + 1e-6; t += BEAT) kick(t, t < 4 ? 0.9 : 1);
for (let t = 2.0; t <= 13.25; t += BEAT / 2) hat(t, ((t / BEAT) % 1) < 0.01 ? 1 : 0.55, ((t * 4) % 2 === 1) ? 0.11 : 0.05);
for (let t = 4.5; t <= 13.0; t += 2 * BEAT) snare(t);
const chords = [[64, 67, 71], [62, 67, 71], [64, 69, 72], [67, 71, 74], [64, 67, 71], [66, 69, 74]];
for (let i = 0; i < 6; i++) { whoosh(2.0 + i * 0.25 - 0.12, 0.16, 0.8, i % 2 ? 1 : -1); stab(2.0 + i * 0.25, chords[i], 0.22, 1); }
for (let i = 0; i < 6; i++) blip(3.5 + i * 0.025, 1200 + i * 150, 0.05, 0.7);
whoosh(3.85, 0.2, 1, 1); riser(3.6, 0.4, 0.5);
// S2 geometry: bass line starts, morph pops on each beat
const bassline = [40, 40, 43, 40, 45, 40, 47, 43];
for (let t = 4.0, i = 0; t < 13.25; t += BEAT / 2, i++) bassNote(t, bassline[i % 8] + (t >= 9 && t < 11.5 ? 2 : 0), 0.22);
pad(4.0, 9.4, [52, 59, 64, 67]);
for (let i = 0; i < 5; i++) { stab(4.0 + i * BEAT, [[64, 71], [64, 67, 71], [65, 69, 72], [67, 71, 74], [69, 72, 76]][i], 0.3, 0.8); pluck(4.0 + i * BEAT + 0.125, 88 + [0, 3, 5, 7, 10][i], 0.25, 0.5, 0.4); }
riser(6.0, 0.5, 0.7); whoosh(6.42, 0.15, 0.9, -1);
// S3 dimension: 16th-note arpeggio with echo
boom(6.5, 0.7, 1.0);
const arp = [64, 67, 71, 76, 79, 76, 71, 67];
for (let t = 6.5, i = 0; t < 11.5; t += BEAT / 4, i++) { const m = arp[i % 8] + (t >= 9 ? 2 : 0); pluck(t, m, 0.3, i % 4 === 0 ? 0.9 : 0.55, Math.sin(i * 0.8) * 0.6); pluck(t + 0.375, m + 12, 0.25, 0.22, -Math.sin(i * 0.8) * 0.6); }
riser(8.4, 0.6, 0.8); whoosh(8.88, 0.2, 1.1, 1);
// S4 interface: UI ticks
boom(9.0, 0.8, 0.8);
stab(9.0, [66, 69, 73, 78], 0.5, 0.9);
for (let i = 0; i < 8; i++) blip(9.4 + i * 0.05, 700 + i * 90, 0.05, 0.8);
for (let i = 0; i < 3; i++) blip(9.55 + i * 0.2, 520 + i * 120, 0.12, 0.6);
for (let i = 0; i < 8; i++) blip(10.0 + i * 0.09, 900, 0.03, 0.4);
blip(10.55, 1500, 0.05, 0.8); blip(10.58, 1100, 0.05, 0.6); // toggle
blip(10.92, 800, 0.03, 1); blip(10.94, 600, 0.05, 0.8); // button
shimmer(11.02, 1568, 0.8, 0.9); shimmer(11.06, 2093, 0.8, 0.6); // toast
riser(11.0, 0.5, 0.6); whoosh(11.3, 0.25, 0.9, -1);
// S5 particles: swell + big riser into the burst
pad(11.4, 2.0, [40, 47, 52, 55, 59], 1.4);
riser(12.2, 1.05, 1.3);
for (let t = 12.25; t < 13.25; t += BEAT / 4) hat(t, 0.6, 0.03);
boom(13.25, 1.4, 1.6);
whoosh(13.25, 0.5, 1.2, 1);
// S6 sign-off: final chord and a soft ring pulse
stab(13.5, [52, 56, 59, 64, 68], 1.4, 0.7);
pad(13.5, 1.5, [40, 52, 56, 59], 1.2);
shimmer(13.55, 1318, 1.2, 0.8);
for (let i = 0; i < 2; i++) shimmer(13.9 + i * 1.1, 2637, 0.8, 0.35);

// ---------- reverb (Schroeder: 4 combs + 2 allpasses) ----------
function reverb(inp, out, seedOff) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float64Array(d + seedOff), i: 0, fb: 0.78 }));
  const aps = [225, 556].map((d) => ({ buf: new Float64Array(d + seedOff), i: 0 }));
  for (let n = 0; n < N; n++) {
    const x = inp[n]; let y = 0;
    for (const c of combs) { const d = c.buf[c.i]; c.buf[c.i] = x + d * c.fb; c.i = (c.i + 1) % c.buf.length; y += d; }
    y *= 0.25;
    for (const a of aps) { const d = a.buf[a.i]; const v = y + d * -0.5; a.buf[a.i] = y + v * 0.5; a.i = (a.i + 1) % a.buf.length; y = v; }
    out[n] += y * 0.35;
  }
}
reverb(REV_L, L, 0); reverb(REV_R, R, 23);

// ---------- master: fade, soft clip, normalize ----------
let peak = 0;
for (let n = 0; n < N; n++) {
  const t = n / SR; const fade = t > 14.4 ? Math.max(0, 1 - (t - 14.4) / 0.55) : 1;
  L[n] = Math.tanh(L[n] * 0.9) * fade; R[n] = Math.tanh(R[n] * 0.9) * fade;
  peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
}
const norm = 0.89 / peak;
const pcm = Buffer.alloc(N * 4);
for (let n = 0; n < N; n++) { pcm.writeInt16LE(Math.round(L[n] * norm * 32767), n * 4); pcm.writeInt16LE(Math.round(R[n] * norm * 32767), n * 4 + 2); }
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
await mkdir(outDir, { recursive: true });
const file = path.join(outDir, 'audio.wav');
await writeFile(file, Buffer.concat([header, pcm]));
console.log('wrote', file, `(peak before normalize ${peak.toFixed(2)})`);
