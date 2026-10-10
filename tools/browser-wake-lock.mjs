/** v0.7.0: 画面消灯防止の実画面遷移・非対応時の継続・表示幅を確認する。 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(/^[A-Za-z]:[\\/]/.test(modulePath) ? pathToFileURL(modulePath).href : modulePath);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8774/';
const output = process.env.WAKE_LOCK_OUTPUT || 'docs/verification/wake-lock/local';
const phase = process.env.WAKE_LOCK_PHASE || 'main';
assert.ok(['main', 'native', 'offline', 'all'].includes(phase), '指定された検証の種類が存在する');
const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
const rows = [];
let activePage = null;
let activeFixture = null;
await mkdir(output, { recursive: true });

function record(name, result) {
  rows.push({ name, ...result });
  console.log('PASS ' + name + ' ' + JSON.stringify(result.summary ?? { width: result.width, gameMode: result.gameMode, native: result.native }));
}

async function fixture({ width = 412, height = 915, mode = 'granted', clock = true, workers = 'block' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width === 412 ? 2.625 : 1, serviceWorkers: workers });
  await context.addInitScript(({ mode }) => {
    Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true });
    Element.prototype.requestFullscreen = () => Promise.reject(Error('verification fullscreen rejected'));
    localStorage.setItem('corogalism-settings', JSON.stringify({ mode: 'pointer', challengeLevel: 'easy', soundEnabled: false }));
    if (mode === 'native') return;
    let hidden = false;
    Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible', configurable: true });
    const state = { mode, requests: [], releases: [], held: [], deferred: [] };
    class Sentinel extends EventTarget {
      constructor(id) { super(); this.id = id; this.released = false; this.type = 'screen'; }
      async release() {
        if (this.released) return;
        this.released = true;
        state.releases.push(this.id);
        this.dispatchEvent(new Event('release'));
      }
    }
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: mode === 'unsupported' ? undefined : {
        async request(type) {
          state.requests.push(type);
          if (state.mode === 'reject') throw new DOMException('verification permission denied', 'NotAllowedError');
          const value = new Sentinel(state.requests.length);
          state.held.push(value);
          if (state.mode === 'deferred') return new Promise(resolve => state.deferred.push(() => resolve(value)));
          return value;
        },
      },
    });
    window.__wakeLockVerification = {
      get state() { return { mode: state.mode, requests: [...state.requests], releases: [...state.releases], held: state.held.filter(value => !value.released).map(value => value.id), deferred: state.deferred.length, hidden }; },
      setMode(value) { state.mode = value; },
      resolve() { state.deferred.shift()?.(); },
      visibility(value) { hidden = value; document.dispatchEvent(new Event('visibilitychange')); },
      releaseFromOS() { const value = state.held.find(value => !value.released); if (value) void value.release(); },
    };
  }, { mode });
  const page = await context.newPage();
  const diagnostics = { pageErrors: [], failedRequests: [], consoleErrors: [], httpErrors: [] };
  page.on('pageerror', error => diagnostics.pageErrors.push(error.message));
  page.on('requestfailed', request => diagnostics.failedRequests.push({ url: request.url(), failure: request.failure() }));
  page.on('console', message => { if (message.type() === 'error') diagnostics.consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) diagnostics.httpErrors.push({ url: response.url(), status: response.status() }); });
  if (clock) { await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000); }
  await page.goto(base + '?debug=1&seed=77');
  await page.waitForFunction(() => !!window.__corogalism);
  await page.evaluate(() => document.fonts.ready);
  if (clock) await page.clock.runFor(32);
  assert.equal(await page.locator('.badge').textContent(), 'v' + version);
  activePage = page;
  activeFixture = { context, page, clock, width, height, mode, diagnostics };
  return activeFixture;
}

const state = page => page.evaluate(() => window.__corogalism.state);
const mock = page => page.evaluate(() => window.__wakeLockVerification.state);
async function waitWake(page, expected) {
  await page.waitForFunction(expected => {
    const value = window.__corogalism.state.wakeLock;
    return Object.entries(expected).every(([key, target]) => value[key] === target);
  }, expected);
  return (await state(page)).wakeLock;
}
async function click(fixture, id) {
  await fixture.page.locator('#' + id).click();
  if (fixture.clock) await fixture.page.clock.runFor(32);
}
async function ready(fixture) {
  if (!fixture.clock) {
    await fixture.page.waitForFunction(() => { const value = window.__corogalism.state; return value.screen === 'game' && value.countdownMs === 0 && value.prepareMs === 0; });
    return;
  }
  for (let index = 0; index < 45; index++) {
    const value = await state(fixture.page);
    if (value.screen === 'game' && !value.prepareMs && !value.countdownMs) return;
    await fixture.page.clock.runFor(250);
  }
  assert.fail('READYとカウントダウンが完了する');
}
async function clean(fixture) {
  assert.deepEqual(fixture.diagnostics, { pageErrors: [], failedRequests: [], consoleErrors: [], httpErrors: [] });
  record('diagnostics', { mode: fixture.mode, width: fixture.width, ...fixture.diagnostics });
  await fixture.context.close();
}
async function pointer(fixture, { wall = false } = {}) {
  const { page } = fixture;
  await page.locator('#board').scrollIntoViewIfNeeded();
  const box = await page.locator('#board').boundingBox();
  const before = await state(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .08, box.y + box.height * .5);
  let after;
  let reflectedAtWall = false;
  for (let index = 0; index < (wall ? 50 : 3); index++) {
    if (fixture.clock) await page.clock.runFor(100);
    else await page.waitForTimeout(100);
    after = await state(page);
    const contact = [...after.walls, ...(after.rackets ?? [])].some(value => {
      const x = Math.max(value.x, Math.min(after.actor.x, value.x + value.w));
      const y = Math.max(value.y, Math.min(after.actor.y, value.y + value.h));
      return Math.hypot(after.actor.x - x, after.actor.y - y) <= after.actor.r + .005;
    });
    reflectedAtWall ||= contact && after.actor.vx > .001;
    if (wall && (after.wallHits > before.wallHits || reflectedAtWall)) break;
  }
  await page.mouse.up();
  assert.ok([after.actor.x, after.actor.y, after.actor.vx, after.actor.vy].every(Number.isFinite));
  assert.ok(Math.hypot(after.actor.x - before.actor.x, after.actor.y - before.actor.y) > .001, '実pointer入力で球が動く');
  if (wall) assert.ok(after.wallHits > before.wallHits || reflectedAtWall, '実pointer入力で壁へ当たり速度が反転する');
  return { before: before.actor, after: after.actor, wallHitsBefore: before.wallHits, wallHitsAfter: after.wallHits, reflectedAtWall, actualPointer: true, teleport: false };
}

async function entriesAndTransitions() {
  for (const [id, gameMode] of [['btn-challenge', 'challenge'], ['btn-practice', 'practice'], ['btn-floor-practice', 'floor-practice'], ['btn-puzzle-tutorial', 'tutorial']]) {
    const f = await fixture();
    const { page } = f;
    const timeline = [{ operation: 'mode-selection', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), mock: await mock(page) }];
    await click(f, id);
    timeline.push({ operation: 'READY', wakeLock: await waitWake(page, { active: true, held: true, pending: false }), prepareMs: (await state(page)).prepareMs, mock: await mock(page) });
    assert.equal((await state(page)).gameMode, gameMode);
    assert.ok((await state(page)).prepareMs > 0, 'READY中から消灯防止を取得する');
    await ready(f);
    const motion = await pointer(f, { wall: true });
    timeline.push({ operation: 'playing', wakeLock: await waitWake(page, { active: true, held: true, pending: false }), mock: await mock(page) });
    await click(f, 'btn-pause');
    timeline.push({ operation: 'pause', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), mock: await mock(page) });
    await click(f, 'btn-resume');
    timeline.push({ operation: 'resume', wakeLock: await waitWake(page, { active: true, held: true, pending: false }), mock: await mock(page) });
    await ready(f);
    await click(f, 'btn-game-settings');
    timeline.push({ operation: 'settings', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), mock: await mock(page) });
    await click(f, 'btn-settings-close');
    assert.equal((await state(page)).paused, true);
    timeline.push({ operation: 'settings-close-stays-paused', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), mock: await mock(page) });
    await click(f, 'btn-resume'); await ready(f);
    await page.evaluate(() => window.__wakeLockVerification.visibility(true));
    timeline.push({ operation: 'hidden', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), paused: (await state(page)).paused, mock: await mock(page) });
    assert.equal((await state(page)).paused, true);
    await page.evaluate(() => window.__wakeLockVerification.visibility(false));
    timeline.push({ operation: 'visible-stays-paused', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), mock: await mock(page) });
    await click(f, 'btn-resume'); await ready(f);
    timeline.push({ operation: 'visible-resume', wakeLock: await waitWake(page, { active: true, held: true, pending: false }), mock: await mock(page) });
    await click(f, 'btn-game-exit');
    if (gameMode === 'challenge') {
      assert.equal(await page.locator('#run-end-confirm').evaluate(value => value.open), true);
      timeline.push({ operation: 'end-confirm', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), mock: await mock(page) });
      await click(f, 'btn-end-confirm');
      assert.equal((await state(page)).screen, 'run-result');
      await click(f, 'btn-run-modes');
    }
    assert.equal((await state(page)).screen, 'mode');
    timeline.push({ operation: 'back-to-mode-selection', wakeLock: await waitWake(page, { active: false, held: false, pending: false }), mock: await mock(page) });
    record('entry-transitions', { gameMode, input: motion, visibilityWasDiagnostic: true, timeline });
    await clean(f);
  }
}

async function endScreens() {
  const f = await fixture(); const { page } = f;
  await click(f, 'btn-challenge'); await ready(f);
  const heldBefore = await waitWake(page, { active: true, held: true });
  await page.evaluate(() => { const game = window.__corogalism; game.teleport(game.state.goal.x, game.state.goal.y); });
  await page.clock.runFor(32);
  assert.equal((await state(page)).screen, 'clear');
  const clear = await waitWake(page, { active: false, held: false, pending: false });
  await page.clock.runFor(1400); await click(f, 'btn-next'); await ready(f);
  const next = await waitWake(page, { active: true, held: true, pending: false });
  await pointer(f);
  await page.clock.fastForward((await state(page)).remainingSec * 1000 + 250); await page.clock.runFor(32);
  assert.equal((await state(page)).screen, 'over');
  const over = await waitWake(page, { active: false, held: false, pending: false });
  await page.clock.runFor(1400); await click(f, 'btn-continue');
  const continuing = await waitWake(page, { active: true, held: true, pending: false });
  record('clear-over-continue', { diagnosticGoalPlacement: true, diagnosticTimeoutClock: true, heldBefore, clear, next, over, continuing, mock: await mock(page) });
  await clean(f);
}

async function refusalsAndPending() {
  for (const mode of ['unsupported', 'reject']) {
    const f = await fixture({ mode }); const { page } = f;
    await click(f, 'btn-puzzle-tutorial'); await ready(f);
    const wakeLock = await waitWake(page, { active: true, held: false, pending: false, supported: mode !== 'unsupported' });
    assert.equal(wakeLock.lastError, mode === 'reject' ? 'NotAllowedError' : null);
    const input = await pointer(f, { wall: true });
    const initial = await mock(page);
    assert.equal(initial.requests.length, mode === 'reject' ? 1 : 0, '拒否状態で毎フレーム要求を繰り返さない');
    await click(f, 'btn-pause'); await click(f, 'btn-resume'); await ready(f);
    await waitWake(page, { active: true, held: false, pending: false });
    const resumed = await mock(page);
    assert.equal(resumed.requests.length, mode === 'reject' ? 2 : 0);
    record('fallback-keeps-game-playable', { mode, wakeLock, input, initial, resumed });
    await clean(f);
  }
  const f = await fixture({ mode: 'deferred' }); const { page } = f;
  await click(f, 'btn-puzzle-tutorial');
  await waitWake(page, { active: true, held: false, pending: true });
  await click(f, 'btn-pause');
  const pausePending = (await state(page)).wakeLock;
  await page.evaluate(() => window.__wakeLockVerification.resolve());
  const lateReleased = await waitWake(page, { active: false, held: false, pending: false });
  assert.equal((await mock(page)).held.length, 0, '停止後に遅れて取得したものを解除する');
  await page.evaluate(() => window.__wakeLockVerification.setMode('granted'));
  await click(f, 'btn-resume');
  const resumed = await waitWake(page, { active: true, held: true, pending: false });
  await ready(f);
  const beforeOSRelease = await mock(page);
  await page.evaluate(() => window.__wakeLockVerification.releaseFromOS());
  await page.clock.runFor(250);
  const releasedByOS = await waitWake(page, { active: true, held: false, pending: false });
  assert.equal((await mock(page)).requests.length, beforeOSRelease.requests.length, 'OS側解除を即時要求し続けない');
  await click(f, 'btn-pause'); await click(f, 'btn-resume');
  const explicitResume = await waitWake(page, { active: true, held: true, pending: false });
  record('pending-pause-and-os-release', { pausePending, lateReleased, resumed, releasedByOS, explicitResume, mock: await mock(page) });
  await clean(f);
}

async function nativeAndLayout() {
  for (const [width, height] of [[312, 720], [412, 915], [576, 1024]]) {
    const f = await fixture({ width, height, mode: 'native', clock: false }); const { page } = f;
    const ui = await page.evaluate(() => {
      const button = document.querySelector('#btn-puzzle-tutorial'), note = document.querySelector('#dev-note'), badge = document.querySelector('.badge');
      const r = button.getBoundingClientRect(), b = badge.getBoundingClientRect();
      return { label: button.innerText.replace(/\s+/g, ' ').trim(), button: { left: r.left, right: r.right, width: r.width, scrollWidth: button.scrollWidth, clientWidth: button.clientWidth }, badge: { text: badge.textContent, left: b.left, right: b.right }, devNoteHidden: !note || note.hidden || getComputedStyle(note).display === 'none', phaseTextVisible: document.body.innerText.includes('フェーズ2'), docWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, secureContext: isSecureContext, supported: typeof navigator.wakeLock?.request === 'function', visibilityState: document.visibilityState };
    });
    assert.ok(ui.label.includes('動く壁のあそび方'));
    assert.equal(ui.label.includes('壁を動かすあそび方'), false);
    assert.equal(ui.devNoteHidden, true); assert.equal(ui.phaseTextVisible, false);
    assert.equal(ui.badge.text, 'v' + version);
    assert.ok(ui.button.left >= 0 && ui.button.right <= width && ui.button.scrollWidth <= ui.button.clientWidth);
    assert.ok(ui.badge.left >= 0 && ui.badge.right <= width);
    assert.ok(ui.docWidth <= width, '横幅をはみ出さない');
    assert.equal(ui.secureContext, true);
    await page.screenshot({ path: output + '/title-' + width + '.png', fullPage: true });
    await click(f, 'btn-puzzle-tutorial'); await ready(f);
    await page.waitForFunction(() => !window.__corogalism.state.wakeLock.pending);
    const acquired = (await state(page)).wakeLock;
    assert.equal(acquired.active, true);
    if (acquired.supported && !acquired.lastError) assert.equal(acquired.held, true, '実Chromeの画面消灯防止要求が成立する');
    const input = await pointer(f, { wall: true });
    if (width === 412) await page.screenshot({ path: output + '/playing-' + width + '.png', fullPage: true });
    await click(f, 'btn-pause');
    const paused = await waitWake(page, { active: false, held: false, pending: false });
    await click(f, 'btn-resume'); await ready(f);
    await page.waitForFunction(() => !window.__corogalism.state.wakeLock.pending);
    const resumed = (await state(page)).wakeLock;
    record('native-api-and-layout', { width, native: true, ui, acquired, paused, resumed, input, physicalPhoneDimmingUnverified: true });
    await clean(f);
  }
}

async function offline() {
  const f = await fixture({ mode: 'native', clock: false, workers: 'allow' });
  const { page, context } = f;
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cache = await page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.startsWith('corogalism-'));
    const selected = await caches.open(names[0]);
    const keys = await selected.keys();
    return { names, count: keys.length, wakeLockModule: keys.some(key => new URL(key.url).pathname.endsWith('/src/input/screenWakeLock.js')) };
  });
  assert.equal(cache.count, 120);
  assert.equal(cache.wakeLockModule, true);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => !!window.__corogalism);
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  assert.equal(await page.locator('.badge').textContent(), 'v' + version);
  await click(f, 'btn-puzzle-tutorial'); await ready(f);
  await page.waitForFunction(() => !window.__corogalism.state.wakeLock.pending);
  const courseWakeLock = (await state(page)).wakeLock;
  assert.equal(courseWakeLock.active, true);
  const courseInput = await pointer(f, { wall: true });
  await click(f, 'btn-game-exit');
  const released = await waitWake(page, { active: false, held: false, pending: false });
  await click(f, 'btn-practice'); await ready(f);
  const practiceInput = await pointer(f, { wall: true });
  const practiceWakeLock = (await state(page)).wakeLock;
  assert.equal(practiceWakeLock.active, true);
  record('offline-module-and-main-course', { cache, offline: true, courseWakeLock, courseInput, released, practiceWakeLock, practiceInput, realPhoneDimmingUnverified: true });
  await clean(f);
}

try {
  if (phase === 'main' || phase === 'all') {
    await entriesAndTransitions();
    await endScreens();
    await refusalsAndPending();
  }
  if (phase === 'main' || phase === 'native' || phase === 'all') await nativeAndLayout();
  if (phase === 'offline' || phase === 'all') await offline();
} catch (error) {
  rows.push({ name: 'failure', error: String(error), diagnostics: activeFixture?.diagnostics, state: activePage && !activePage.isClosed() ? await state(activePage).catch(() => null) : null });
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: output + '/failure.png', fullPage: true });
  throw error;
} finally {
  await writeFile(output + '/results.json', JSON.stringify({ base, phase, version, rows }, null, 2) + '\n');
  await browser.close();
}
