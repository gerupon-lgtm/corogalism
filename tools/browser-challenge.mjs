import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:8765/');
const output = new URL('../docs/verification/challenge/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
async function setup(width, sensor = false) {
  const context = await browser.newContext({ viewport: { width, height: 812 }, deviceScaleFactor: 2 });
  await context.addInitScript(sensor => {
    Object.defineProperty(window, 'DeviceOrientationEvent', { value: sensor ? class {} : undefined, configurable: true });
    window.emit = (beta, gamma) => { const e = new Event('deviceorientation'); Object.assign(e, { beta, gamma }); window.dispatchEvent(e); };
    localStorage.setItem('corogalism-run-bests', JSON.stringify({ noContinue: { stages: 8, totalTimeMs: 8000, at: '2026-09-12T00:00:00Z' } }));
  }, sensor);
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto(new URL('?debug=1&seed=1', base).href); await page.clock.runFor(32);
  const state = () => page.evaluate(() => window.__corogalism.state);
  const click = async id => { await page.locator(`#${id}`).click({ force: true }); await page.clock.runFor(32); };
  const ready = async () => { const s = await state(); await page.clock.runFor(s.prepareMs + s.countdownMs + 32); };
  const clear = async () => { await page.evaluate(() => { const s = window.__corogalism.state; window.__corogalism.teleport(s.goal.x, s.goal.y); }); await page.clock.runFor(32); };
  const emit = async (beta, gamma, count = 7) => { for (let i = 0; i < count; i++) { await page.evaluate(v => window.emit(...v), [beta, gamma]); await page.clock.runFor(100); } };
  return { context, page, state, click, ready, clear, emit };
}
try {
  for (const width of [320, 390, 576, 1280]) {
    const { context, page, state, click, ready, clear } = await setup(width);
    assert.match(await page.locator('#mode-best-no').textContent(), /8 面/);
    await page.locator('[data-level="easy"]').first().click(); await page.clock.runFor(32);
    assert.match(await page.locator('#mode-best-no').textContent(), /これから/);
    assert.equal(await page.locator('[data-level="easy"][aria-pressed="true"]').count(), 2);
    assert.equal(await page.locator('#mode-records').getAttribute('open'), null);
    await page.screenshot({ path: fileURLToPath(new URL(`mode-${width}.png`, output)), fullPage: true });
    await page.locator('#mode-records summary').click();
    assert.equal(await page.locator('#mode-best-no').isVisible(), true);
    await page.locator('#mode-records summary').click();
    await click('btn-challenge'); await ready();
    assert.equal((await state()).level, 'easy');
    assert.ok((await state()).recovery);
    await page.screenshot({ path: fileURLToPath(new URL(`candy-${width}.png`, output)), fullPage: true });
    // 衝突でHPを減らしてから取得。既存物理・回復表示を同じ経路で検証。
    await page.evaluate(() => window.__corogalism.setTilt(-1, 0)); await page.clock.runFor(1300);
    assert.ok((await state()).hp.value < (await state()).hp.max);
    const beforeRecovery = Math.ceil((await state()).hp.value);
    await page.evaluate(() => { const s = window.__corogalism.state; window.__corogalism.setTilt(0, 0); window.__corogalism.teleport(s.recovery.x, s.recovery.y); });
    await page.clock.runFor(32);
    assert.equal((await state()).recovery.collected, true);
    const displayedRecovery = Math.ceil((await state()).hp.value) - beforeRecovery;
    assert.equal(await page.locator('#recovery-feedback').textContent(), displayedRecovery ? `げんき +${displayedRecovery}` : 'げんきを少し回復');
    await page.screenshot({ path: fileURLToPath(new URL(`heal-${width}.png`, output)), fullPage: true });
    for (let n = 1; n < 4; n++) { await clear(); await click('btn-next'); await ready(); }
    assert.equal((await state()).theme.id, 'bounce');
    assert.ok((await state()).walls.some(w => w.materialId === 'rubber'));
    await page.screenshot({ path: fileURLToPath(new URL(`rubber-${width}.png`, output)), fullPage: true });
    await click('btn-game-exit'); assert.match(await page.locator('#run-category').textContent(), /やさしい/);
    await click('btn-run-modes'); assert.match(await page.locator('#mode-best-no').textContent(), /3 面/);
    await page.locator('#mode-records summary').click();
    await page.locator('[data-level="normal"]').last().click(); await page.clock.runFor(32);
    assert.match(await page.locator('#mode-best-no').textContent(), /8 面/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();
  }
  const { context, page, state, click, ready, clear, emit } = await setup(390, true);
  await click('btn-mode-settings'); assert.equal(await page.locator('#btn-settings-calibrate').isDisabled(), true); await click('btn-settings-close');
  await click('btn-challenge'); await emit(20, 10, 1);
  assert.equal((await state()).calibration, null); assert.equal((await state()).prepareMs, 600);
  await emit(25, 15); assert.deepEqual((await state()).calibration, { beta: 25, gamma: 15 });
  await ready(); await emit(25, 25, 1); assert.ok((await state()).started);
  await clear(); await click('btn-next'); await emit(40, 20); await ready();
  assert.deepEqual((await state()).calibration, { beta: 25, gamma: 15 });
  await click('btn-game-exit'); await click('btn-run-modes'); await click('btn-practice'); await ready();
  assert.deepEqual((await state()).calibration, { beta: 25, gamma: 15 });
  await click('btn-calibrate'); assert.equal((await state()).paused, true);
  await emit(35, 17); assert.deepEqual((await state()).calibration, { beta: 35, gamma: 17 });
  assert.equal((await state()).paused, true); await click('btn-resume'); await ready(); await click('btn-pause'); assert.equal(await page.locator('#board-status').textContent(), '一時停止'); await click('btn-resume'); await ready();
  await click('btn-game-settings'); await click('btn-settings-calibrate'); await emit(45, 21);
  assert.deepEqual((await state()).calibration, { beta: 45, gamma: 21 });
  await click('btn-settings-calibrate'); await emit(55, 21, 1); await click('btn-settings-close');
  assert.deepEqual((await state()).calibration, { beta: 45, gamma: 21 });
  await context.close();
  const unstable = await setup(320, true);
  await unstable.click('btn-challenge');
  for (let i = 0; i < 12; i++) await unstable.emit(20 + i * 5, 10, 1);
  assert.equal((await unstable.state()).needsCalibration, true);
  await unstable.click('btn-calibration-pointer'); await unstable.ready();
  assert.equal((await unstable.state()).mode, 'pointer'); assert.equal((await unstable.state()).countdownMs, 0);
  await unstable.context.close();
  assert.deepEqual(errors, []);
  console.log('PASS: 4 widths, separate legacy/easy records, candy pickup, themed rubber, stable first calibration and persistence across modes/stages, manual pause/settings, cancelled measurement, unstable sensor escape.');
} finally { await browser.close(); }
