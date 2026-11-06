import { chromium } from 'file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.TUTORIAL_DEMO_URL ?? 'http://127.0.0.1:8795/';
const output = resolve('docs/verification/v0.8.18/demo-local');
const kinds = ['roll', 'default', 'rubber', 'cork', 'stone', 'spike', 'moss', 'cotton', 'ice', 'sand', 'gravity', 'repulsion', 'rest', 'sticky', 'candy', 'leaf', 'hourglass', 'racket', 'gate'];
const errors = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu', '--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1900, height: 1120 }, deviceScaleFactor: 1 });
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(new URL('tools/', base).href, { waitUntil: 'domcontentloaded' });
  await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>v0.8.18 tutorial demo verification fixture</title><style>
    *{box-sizing:border-box}body{margin:0;padding:20px;background:#243d30;color:#fff1d2;font:14px system-ui,sans-serif}h1{font-size:23px;margin:0 0 6px}p{margin:0 0 18px;font-size:13px}#sheet{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.tile{border:1px solid #a38a61;background:#fff1d2;color:#70451f;border-radius:12px;padding:9px}h2{font-size:16px;margin:0 0 4px}.frames{display:flex;justify-content:space-between;gap:4px}figure{margin:0;text-align:center}canvas{width:132px;height:103px;display:block}figcaption{font-size:11px;margin-top:1px}
  </style><h1>v0.8.18 見本描画の独立検証</h1><p>アプリの実画面ではない比較用の検証画像。各種類は 0秒 → 1.5秒 → 終了時（通常4秒／ラケット6秒）。操作図はラケットと戸の動きに同期し、他は右向き。</p><div id="sheet"></div></html>`);
  const results = await page.evaluate(async ({ kinds, base }) => {
    const { drawTutorialDemo } = await import(new URL('src/ui/tutorialDemo.js', base).href);
    const { wallTextureReady } = await import(new URL('src/render/toyWorld.js', base).href);
    const started = performance.now();
    while (!wallTextureReady() && performance.now() - started < 3000) await new Promise(resolve => setTimeout(resolve, 30));
    const fingerprint = async canvas => {
      const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const digest = await crypto.subtle.digest('SHA-256', rgba);
      const scene = canvas.getContext('2d').getImageData(2, 2, 140, 79).data;
      const sceneDigest = await crypto.subtle.digest('SHA-256', scene);
      const phone = canvas.getContext('2d').getImageData(0, 84, 144, 28).data;
      const phoneDigest = await crypto.subtle.digest('SHA-256', phone);
      let paintedPixels = 0;
      for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) paintedPixels++;
      const hex = buffer => [...new Uint8Array(buffer)].map(n => n.toString(16).padStart(2, '0')).join('');
      return { hash: hex(digest), sceneHash: hex(sceneDigest), phoneHash: hex(phoneDigest), paintedPixels };
    };
    const fresh = async (kind, elapsedMs, reducedMotion = false, direction) => {
      const canvas = document.createElement('canvas'); drawTutorialDemo(canvas, { kind, elapsedMs, reducedMotion, direction });
      return fingerprint(canvas);
    };
    const rows = [];
    for (const kind of kinds) {
      const duration = kind === 'racket' ? 6000 : 4000;
      const canvas = document.createElement('canvas'), frames = {};
      for (const time of [0, 1500, 4000, 7000]) {
        drawTutorialDemo(canvas, { kind, elapsedMs: time }); frames[time] = await fingerprint(canvas);
      }
      const freshEnd = await fresh(kind, duration), freshLater = await fresh(kind, 7000);
      const reducedFirst = await fresh(kind, 0, true), reducedLater = await fresh(kind, 1500, true);
      const denseCanvas = document.createElement('canvas');
      for (let time = 0; time <= duration; time += 100) drawTutorialDemo(denseCanvas, { kind, elapsedMs: time });
      const denseEnd = await fingerprint(denseCanvas);
      const stillLater = await fresh(kind, duration + 3000);
      rows.push({ kind, duration, frames, freshEnd, freshLater, denseEnd, reducedFirst, reducedLater,
        animated: frames[0].sceneHash !== frames[1500].sceneHash,
        reducedStable: reducedFirst.hash === reducedLater.hash,
        endingStable: freshEnd.hash === freshLater.hash && freshEnd.hash === stillLater.hash && freshEnd.hash === frames[duration === 6000 ? 7000 : 4000].hash,
        independentCanvasStable: freshEnd.hash === denseEnd.hash,
        painted: Object.values(frames).every(frame => frame.paintedPixels > 9000) });
    }
    const meterColumns = (kind, elapsedMs) => {
      const canvas = document.createElement('canvas'); drawTutorialDemo(canvas, { kind, elapsedMs });
      const row = canvas.getContext('2d').getImageData(11, 12, 36, 1).data;
      let filled = 0;
      for (let x = 0; x < 36; x++) if (row[x * 4] === 181 && row[x * 4 + 1] === 215 && row[x * 4 + 2] === 139) filled++;
      return filled;
    };
    const meters = ['candy', 'rest'].map(kind => {
      const before = meterColumns(kind, 0), after = meterColumns(kind, 4000);
      return { kind, before, after, expectedIncrease: '20 percent of 36 pixels', passed: Math.abs(before - 36 * .4) <= 1 && Math.abs(after - 36 * .6) <= 1 };
    });
    const phones = [];
    for (const [kind, elapsedMs, direction] of [
      ['gate', 1000, { x: 1, y: 0 }], ['gate', 2100, { x: -1, y: 0 }],
      ['gate', 3100, { x: 0, y: -1 }], ['gate', 4000, { x: 0, y: 0 }],
      ['racket', 3200, { x: 0, y: 1 }], ['racket', 6000, { x: 0, y: 0 }],
    ]) {
      const actual = await fresh(kind, elapsedMs), reference = await fresh('roll', 4000, false, direction);
      phones.push({ kind, elapsedMs, direction, passed: actual.phoneHash === reference.phoneHash });
    }
    return { textureReady: wallTextureReady(), rows, meters, phones };
  }, { kinds, base });
  const failures = results.rows.flatMap(row => ['animated', 'reducedStable', 'endingStable', 'independentCanvasStable', 'painted'].filter(check => !row[check]).map(check => `${row.kind}: ${check}`));
  for (const check of results.meters) if (!check.passed) failures.push(`${check.kind}: recovery meter`);
  for (const check of results.phones) if (!check.passed) failures.push(`${check.kind}: phone at ${check.elapsedMs}`);
  for (const reducedMotion of [false, true]) {
    await page.evaluate(async ({ kinds, base, reducedMotion }) => {
      const { drawTutorialDemo } = await import(new URL('src/ui/tutorialDemo.js', base).href);
      const sheet = document.querySelector('#sheet'); sheet.replaceChildren();
      document.querySelector('h1').textContent = `v0.8.18 見本描画 ${reducedMotion ? '動きを減らす設定' : '通常の動き'}（独立検証）`;
      for (const kind of kinds) {
        const tile = document.createElement('section'); tile.className = 'tile';
        const title = document.createElement('h2'); title.textContent = kind; tile.append(title);
        const frames = document.createElement('div'); frames.className = 'frames'; tile.append(frames);
        for (const time of [0, 1500, kind === 'racket' ? 6000 : 4000]) {
          const figure = document.createElement('figure'), canvas = document.createElement('canvas'), caption = document.createElement('figcaption');
          drawTutorialDemo(canvas, { kind, elapsedMs: time, reducedMotion }); caption.textContent = `${time / 1000}秒`;
          figure.append(canvas, caption); frames.append(figure);
        }
        sheet.append(tile);
      }
    }, { kinds, base, reducedMotion });
    await page.screenshot({ path: resolve(output, reducedMotion ? 'contact-sheet-reduced.png' : 'contact-sheet-normal.png'), fullPage: true });
  }
  const report = { version: '0.8.18', fixture: 'detached canvas and DOM-only contact sheet; not the app layout', base, checkedAt: new Date().toISOString(), checks: results.rows.length * 5 + results.meters.length + results.phones.length, failures, errors, ...results };
  await writeFile(resolve(output, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ checks: report.checks, kinds: kinds.length, failures, errors, textureReady: report.textureReady, output }, null, 2));
  process.exitCode = failures.length || errors.length ? 1 : 0;
} finally {
  await browser.close();
}
