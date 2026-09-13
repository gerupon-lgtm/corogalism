const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = new URL(process.env.BASE_URL || 'http://127.0.0.1:8765/');
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const output = new URL('../docs/verification/', import.meta.url);
const errors = [];
async function setup(kind = 'unsupported', blockStorage = false) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  await context.addInitScript(({ kind, blockStorage }) => {
    if (blockStorage) {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    }
    window.permissionCalls = 0;
    Object.defineProperty(window, 'DeviceOrientationEvent', { configurable: true, value: kind === 'unsupported' ? undefined : class {
      static requestPermission() {
        window.permissionCalls++;
        window.permissionHadActivation = navigator.userActivation.isActive;
        return Promise.resolve(kind === 'denied' ? 'denied' : 'granted');
      }
    } });
  }, { kind, blockStorage });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto(new URL('?debug=1&seed=123', baseUrl).href);
  await page.clock.runFor(32);
  const click = async (id, ready = true) => { await page.locator(`#${id}`).click({ force: true }); await page.clock.runFor(32); const s = await state(); if (ready && s.screen === 'game' && !s.paused && s.countdownMs > 0) await page.clock.runFor(s.prepareMs + s.countdownMs + 32); };
  const state = () => page.evaluate(() => window.__corogalism.state);
  return { context, page, click, state };
}
try {
  const { context, page, click, state } = await setup();
  await click('btn-challenge');
  const max = (await state()).hp.max;
  for (let i = 0; i < 6 && (await state()).screen === 'game'; i++) {
    await page.evaluate(() => { window.__corogalism.teleport(0.5, 0.5); window.__corogalism.setTilt(1, 0); });
    await page.clock.runFor(1100);
    if (i === 0) {
      assert.ok((await state()).hp.value < max);
      await page.screenshot({ path: fileURLToPath(new URL('damage-375.png', output)), fullPage: true });
    }
  }
  assert.equal((await state()).status, 'dead');
  assert.equal(await page.locator('#over-heading').textContent(), 'もう一度！');
  assert.match(await page.locator('#over-note').textContent(), /げんきがなくなりました/);
  await click('btn-continue'); assert.equal((await state()).hp.value, max);
  // 後半の素材も実際のステージ配置で描画する。
  for (let i = 0; i < 14; i++) {
    await page.evaluate(() => { const { goal } = window.__corogalism.state; window.__corogalism.teleport(goal.x, goal.y); });
    await page.clock.runFor(32); await click('btn-next');
  }
  const ids = new Set((await state()).walls.map(w => w.materialId));
  assert.ok(ids.has('moss') && !ids.has('spike'), '15面目は苔が主役');
  await page.screenshot({ path: fileURLToPath(new URL('materials-stage15-375.png', output)), fullPage: true });
  await context.close();

  for (const kind of ['denied', 'silent', 'granted']) {
    const { context, page, click, state } = await setup(kind);
    assert.equal(await page.evaluate(() => permissionCalls), 0);
    await click('btn-challenge', false);

    assert.equal(await page.evaluate(() => permissionCalls), 1);
    assert.equal(await page.evaluate(() => permissionHadActivation), true);
    if (kind === 'granted') {
      await page.evaluate(() => {
        window.emitOrientation = (beta, gamma) => { const event = new Event('deviceorientation'); event.beta = beta; event.gamma = gamma; window.dispatchEvent(event); };
        window.emitOrientation(20, 10);
      });
    }
    if (kind === 'granted') for (let i = 0; i < 7; i++) { await page.evaluate(() => window.emitOrientation(20, 10)); await page.clock.runFor(100); }
    await page.clock.runFor(1700); await page.clock.runFor((await state()).prepareMs + (await state()).countdownMs + 32);
    assert.equal((await state()).mode, kind === 'granted' ? 'tilt' : 'pointer');
    if (kind === 'granted') {
      await page.evaluate(() => window.emitOrientation(20, 25)); await page.clock.runFor(200);
      assert.equal((await state()).started, true);
      await click('btn-calibrate');
      for (let i = 0; i < 7; i++) { await page.evaluate(() => window.emitOrientation(35, 17)); await page.clock.runFor(100); }
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('corogalism-settings')).calibration);
      assert.deepEqual(saved, { beta: 35, gamma: 17 });
    }
    await context.close();
  }
  const blocked = await setup('unsupported', true);
  await blocked.click('btn-challenge');
  await blocked.click('btn-game-exit');
  assert.match(await blocked.page.locator('#run-save-note').textContent(), /保存できません/);
  await blocked.click('btn-run-modes'); await blocked.click('btn-practice');
  await blocked.page.evaluate(() => { const { goal } = window.__corogalism.state; window.__corogalism.teleport(goal.x, goal.y); });
  await blocked.page.clock.runFor(32); assert.equal((await blocked.state()).screen, 'clear');
  assert.deepEqual(errors, []);
  console.log('PASS: actual physics damage/HP0/HP reset, late-stage material render, iOS permission activation/grant/denial, no-event fallback, recalibration persistence, blocked storage gameplay; no page errors.');
} finally { await browser.close(); }
