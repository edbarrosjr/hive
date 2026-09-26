// Renders showreel/index.html to an MP4 (H.264 + AAC) frame by frame with headless Chromium.
//
//   node showreel/render.mjs                 -> showreel/out/showreel.mp4
//   node showreel/render.mjs --stills 0,90   -> showreel/out/still-0000.png, still-0090.png
//   node showreel/render.mjs --sheet         -> showreel/out/sheet.png (one still every 0.5s)
//
// Env: FFMPEG (path to an ffmpeg with libx264 + aac), CHROMIUM (browser executable).
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const CHROMIUM = process.env.CHROMIUM;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => { console.error('page error:', e); process.exitCode = 1; });
await page.goto('file://' + path.join(here, 'index.html') + '?render');
await page.evaluate(() => window.reel.ready);
const { FPS, FRAMES, W, H } = await page.evaluate(() => ({ FPS: window.reel.FPS, FRAMES: window.reel.FRAMES, W: window.reel.W, H: window.reel.H }));

const grab = async (frame, type = 'image/png', q) => {
  const url = await page.evaluate(([f, t, q]) => window.reel.frameDataURL(f, t, q), [frame, type, q]);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};

if (args.includes('--stills')) {
  const frames = (opt('--stills') ?? '0').split(',').map(Number);
  for (const f of frames) {
    const file = path.join(outDir, `still-${String(f).padStart(4, '0')}.png`);
    await writeFile(file, await grab(f));
    console.log('wrote', file);
  }
} else if (args.includes('--sheet')) {
  // contact sheet: 6 columns of downscaled stills, one every half second
  const step = Math.round(FPS * 0.5), cols = 6, sw = 480, sh = 270;
  const frames = []; for (let f = 0; f < FRAMES; f += step) frames.push(f);
  const rows = Math.ceil(frames.length / cols);
  const sheet = await browser.newPage({ viewport: { width: cols * sw, height: rows * sh } });
  await sheet.setContent(`<body style="margin:0;background:#000"><canvas id=c width=${cols * sw} height=${rows * sh}></canvas></body>`);
  for (let i = 0; i < frames.length; i++) {
    const png = (await grab(frames[i], 'image/jpeg', 0.85)).toString('base64');
    await sheet.evaluate(async ([b64, i, cols, sw, sh, label]) => {
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
      const g = document.getElementById('c').getContext('2d');
      const x = (i % cols) * sw, y = Math.floor(i / cols) * sh;
      g.drawImage(img, x, y, sw, sh);
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, 90, 24); g.fillStyle = '#fff'; g.font = '14px monospace'; g.fillText(label, x + 6, y + 17);
    }, [png, i, cols, sw, sh, (frames[i] / FPS).toFixed(2) + 's']);
  }
  const file = path.join(outDir, 'sheet.png');
  await writeFile(file, await sheet.screenshot({ type: 'png' }));
  console.log('wrote', file);
} else {
  const audio = path.join(outDir, 'audio.wav');
  const hasAudio = existsSync(audio);
  const out = path.join(outDir, 'showreel.mp4');
  const ff = spawn(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    ...(hasAudio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-r', String(FPS), '-s', `${W}x${H}`,
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('close', (c) => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); ff.on('error', rej); });
  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    const png = await grab(f);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`\rframe ${f}/${FRAMES}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  ff.stdin.end();
  await done;
  console.log(`\nwrote ${out} (${hasAudio ? 'with' : 'without'} audio)`);
}
await browser.close();
