import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:8768/');
const output = new URL('../docs/verification/play-notices/v0623/', import.meta.url);
const baselineOnly = process.env.NOTICE_MODE === 'baseline';
const publicRun = base.protocol === 'https:';
await mkdir(output, { recursive: true });
const profiles = [
  { name: 'pixel6a', width: 412, height: 915, dpr: 2.625 },
  { name: 'pixel6a-compact', width: 393, height: 873, dpr: 2.75 },
  { name: 'pixel6a-large-ui', width: 360, height: 800, dpr: 3 },
  { name: 'short-screen', width: 320, height: 568, dpr: 2 },
];
const baseline = baselineOnly ? {} : JSON.parse(await readFile(new URL('baseline.json', output), 'utf8'));
const results = [], errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const profile of profiles) for (const fullscreen of [false, true]) {
    const key = `${profile.name}-${fullscreen ? 'fullscreen' : 'browser'}`;
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.dpr, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage(); page.on('pageerror', error => errors.push({ key, message: error.message }));
    await page.addInitScript(fullscreen => {
      localStorage.setItem('corogalism-settings', JSON.stringify({ mode: 'pointer', soundEnabled: false, challengeLevel: 'easy' }));
      Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true });
      if (!fullscreen) Element.prototype.requestFullscreen = () => Promise.reject(new Error('browser-mode measurement'));
    }, fullscreen);
    await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000);
    await page.goto(new URL('?debug=1&seed=1', base).href);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#btn-challenge').click();
    await page.waitForFunction(() => window.__corogalism?.state.screen === 'game');
    if (fullscreen) await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.clock.runFor(3800);
    const board = await page.locator('#board').boundingBox();
    await page.mouse.move(board.x + board.width * .75, board.y + board.height * .5);
    await page.mouse.down(); await page.clock.runFor(250); await page.mouse.up();
    // 実際の全画面遷移後に、旧版・新版とも同じresize処理を完了して比較する。
    await page.evaluate(() => dispatchEvent(new Event('resize')));
    await page.clock.runFor(32);
    assert.equal(await page.evaluate(() => window.__corogalism.state.started), true);
    const geometry = () => page.evaluate(() => {
      const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(n => Math.round(n * 100) / 100); };
      return { viewport: [innerWidth, innerHeight], documentHeight: document.documentElement.scrollHeight,
        board: box('#board'), canvas: box('#canvas'), hud: box('#screen-game .hud'), controls: box('#screen-game .row'), exit: box('#btn-game-exit'), fullscreen: Boolean(document.fullscreenElement) };
    });
    const before = await geometry();
    if (baselineOnly) { baseline[key] = before; await context.close(); continue; }
    assert.deepEqual(before, baseline[key], `${key}: unchanged board, controls, and document height`);
    const checks = await page.evaluate(async () => {
      const { createGameScreen } = await import('./src/ui/gameScreen.js');
      const ui = createGameScreen(document), state = window.__corogalism.state;
      const boardEl = document.querySelector('#board'), canvas = document.querySelector('#canvas');
      const camera = { toScreen: (x, y) => ({ px: x * canvas.clientWidth / state.maze.size, py: y * canvas.clientWidth / state.maze.size }), toPx: n => n * canvas.clientWidth / state.maze.size };
      const neutral = { actor: state.actor, trap: null, stage: { rest: null, extraRests: [] } };
      const hud = now => ({ now, timeMs: state.timeMs, wallHits: state.wallHits, tiltMagnitude: 0, mode: 'pointer', hp: state.hp && { ...state.hp, ratio: state.hp.value / state.hp.max }, remainingSec: state.remainingSec, limitSec: state.limitSec, shield: state.shield, started: true, paused: false, preparing: false });
      const checks = [];
      function render({ kind, floor = '', play = neutral, motion = false, escape = false, now = performance.now() } = {}) {
        if (kind === 'recovery') ui.showRecovery(10, 20, now);
        else if (kind) ui.showFeature(kind, now);
        if (escape) ui.showEscape(play, now);
        ui.setHud(hud(now)); ui.setFeatureHint(play, camera, true, motion, now);
        ui.renderNotices?.({ visible: true, floorText: floor });
      }
      function inspect(name, content) {
        const visible = ['#recovery-feedback', '#floor-contact-hint', '#feature-hint'].map(s => document.querySelector(s)).filter(el => !el.hidden && el.textContent && getComputedStyle(el).display !== 'none');
        if (visible.length !== 1) throw new Error(`${name}: expected one visible message, got ${visible.length}`);
        const message = visible[0], r = message.getBoundingClientRect(), b = boardEl.getBoundingClientRect(), h = document.querySelector('#screen-game .hud').getBoundingClientRect();
        if (boardEl.contains(message) || r.top < b.bottom - .1) throw new Error(`${name}: notice covers board`);
        if (r.bottom > h.top + .1 || r.left < 0 || r.right > innerWidth || message.scrollWidth > message.clientWidth + 1) throw new Error(`${name}: notice clips or covers lower HUD`);
        if (content && !content.test(message.textContent)) throw new Error(`${name}: wrong message ${message.textContent}`);
        const caption = document.querySelector('#play-hint');
        if (getComputedStyle(caption).display !== 'none' && getComputedStyle(caption).visibility !== 'hidden') throw new Error(`${name}: original caption overlaps notice`);
        checks.push({ name, text: message.textContent, bounds: [r.x, r.y, r.width, r.height] });
      }
      for (const kind of ['guard', 'leaf', 'recovery', 'hourglass', 'rest', 'full']) {
        render({ kind }); inspect(kind, kind === 'guard' ? /守/ : null);
      }
      ui.setHud(hud(performance.now() + 10000));
      for (const floor of ['砂で減速。少し傾け続けてみよう。', '氷は勢いが残る。逆へ傾けてブレーキ。', '重力は中心へ引く。傾きを弱めてみよう。', '反重力は中心から押す。近づいてみよう。']) { render({ floor }); inspect('floor'); }
      const trapped = { ...neutral, trap: { target: 3, elapsed: 0 } };
      render({ play: trapped, motion: true, floor: '床の説明', kind: 'guard' }); inspect('trap-priority', /タップ/);
      render({ play: trapped, escape: true }); inspect('shortened', /短縮/);
      const escaped = { ...trapped, trap: null };
      render({ play: escaped }); inspect('escaped', /ぬけ/);
      const resting = { ...neutral, stage: { rest: { used: false, progress: .5 }, extraRests: [] } };
      render({ play: resting, now: performance.now() + 10000 }); inspect('resting', /ひとやすみ/);
      ui.setHud(hud(performance.now() + 20000)); ui.setFeatureHint(neutral, camera, true, false, performance.now() + 20000);
      ui.renderNotices?.({ visible: true, floorText: '' });
      if (document.querySelector('#play-hint').classList.contains('has-play-notice')) throw new Error('caption does not return after message');
      ui.showFeature('guard', performance.now()); ui.renderNotices?.({ visible: false, floorText: '' });
      if (!document.querySelector('#play-notices')?.hidden) throw new Error('notice remains while paused or counting');
      return checks;
    });
    assert.deepEqual(await geometry(), before, `${key}: message appearance never changes layout`);
    if (profile.name === 'pixel6a') {
      await page.evaluate(async () => { const {createGameScreen}=await import('./src/ui/gameScreen.js'); const ui=createGameScreen(document); ui.showFeature('guard', performance.now()); ui.renderNotices({visible:true,floorText:''}); });
      await page.screenshot({ path: fileURLToPath(new URL(`${publicRun?'public':'local'}-${key}.png`, output)), fullPage: true });
    }
    results.push({ key, geometry: before, checks });
    console.log(`PASS ${key}: ${checks.length} notices, unchanged dimensions`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  if (baselineOnly) await writeFile(new URL('baseline.json', output), JSON.stringify(baseline, null, 2) + '\n');
  else await writeFile(new URL(`${publicRun?'public':'local'}.json`, output), JSON.stringify({ results, errors }, null, 2) + '\n');
  console.log(baselineOnly ? `BASELINE ${Object.keys(baseline).length} profiles` : `PASS ${results.length} profiles / ${results.reduce((n,r)=>n+r.checks.length,0)} notices`);
} finally { await browser.close(); }
