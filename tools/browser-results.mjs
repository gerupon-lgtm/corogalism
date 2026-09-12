import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:8765/');
const output = new URL('../docs/verification/results/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
try {
  for (const width of [320, 390, 576, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 900 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true }));
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.goto(new URL('?debug=1&seed=123', base).href); await page.clock.runFor(32); await page.evaluate(() => document.fonts.ready);
    const state = () => page.evaluate(() => window.__corogalism.state);
    const click = async id => { await page.locator(`#${id}`).click(); await page.clock.runFor(32); };
    const ready = async () => { const s = await state(); await page.clock.runFor(s.prepareMs + s.countdownMs + 32); };
    const frozen = () => page.evaluate(() => { const s = window.__corogalism.state; return { actor: s.actor, hp: s.hp, time: s.timeMs, remaining: s.remainingSec }; });
    const clear = async () => { await page.evaluate(() => { const g = window.__corogalism.state.goal; window.__corogalism.teleport(g.x, g.y); }); await page.clock.runFor(32); };
    await click('btn-challenge');
    assert.ok((await state()).prepareMs > 550); assert.equal(await page.locator('#countdown-number').textContent(), 'READY');
    const before = await frozen(); await page.evaluate(() => window.__corogalism.setTilt(1, 1)); await page.clock.runFor(300);
    assert.deepEqual(await frozen(), before); assert.equal((await state()).countdownMs, 3000);
    await click('btn-pause'); const hold = (await state()).prepareMs; await page.clock.fastForward(60000);
    assert.equal((await state()).prepareMs, hold); await click('btn-resume'); assert.ok((await state()).prepareMs > 550);
    await ready(); await page.evaluate(() => window.__corogalism.teleport(.5, .5)); await page.clock.fastForward((await state()).limitSec * 1000 + 50);
    assert.equal((await state()).screen, 'over'); await click('btn-continue');
    assert.equal((await state()).run.continuesLeft, 1); assert.ok((await state()).prepareMs > 1450);
    assert.equal(await page.locator('#countdown-number').textContent(), 'READY');
    const continued = await frozen(); await page.clock.runFor(1000); assert.deepEqual(await frozen(), continued);
    assert.equal((await state()).countdownMs, 3000); assert.equal((await state()).audio.music, false);
    await page.screenshot({ path: fileURLToPath(new URL(`continue-ready-${width}.png`, output)), fullPage: true });
    await page.clock.runFor((await state()).prepareMs + 16); assert.equal(await page.locator('#countdown-number').textContent(), '3');
    await ready();
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.__corogalism.teleport(.5, .5)); await page.clock.fastForward(17000); await clear();
      assert.equal((await state()).screen, 'clear');
      if (i < 2) { await click('btn-next'); assert.ok((await state()).prepareMs > 550); await ready(); }
    }
    await click('btn-game-exit'); assert.equal((await state()).screen, 'run-result');
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'run-heading');
    assert.equal(await page.locator('#board').isVisible(), false); assert.equal((await state()).audio.music, false);
    assert.match(await page.locator('#run-stages').textContent(), /3 面/);
    assert.equal(await page.locator('#run-badge').isVisible(), true);
    assert.match(await page.locator('#run-category').textContent(), /コンティニュー使用/);
    assert.equal(await page.locator('#screen-run-result').evaluate(el => getComputedStyle(el).borderRadius), '23px');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: fileURLToPath(new URL(`result-${width}.png`, output)), fullPage: true });
    await page.locator('#btn-run-again').focus(); await page.keyboard.press('Enter'); await page.clock.runFor(32);
    assert.equal((await state()).screen, 'game'); assert.ok((await state()).prepareMs > 550); await ready();
    await click('btn-game-exit'); await click('btn-run-modes'); assert.equal((await state()).screen, 'mode');
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: toy result screen, 0.6s preparation, 1.5s continue pause, frozen input/HP/clocks, pause/resume and keyboard retry at 4 widths.');
} finally { await browser.close(); }
