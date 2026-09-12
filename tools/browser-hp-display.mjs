import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const output = new URL('../docs/verification/hp-display/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true }));
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.goto(base + '?debug=1&seed=1'); await page.evaluate(() => document.fonts.ready);
    await page.locator('.challenge-choice [data-level="easy"]').click(); await page.locator('#btn-challenge').click(); await page.clock.runFor(3700);
    const snapshot = () => page.evaluate(() => ({ hp: window.__corogalism.state.hp.value,
      number: document.querySelector('#hud-hp').textContent,
      damage: document.querySelector('#hud-damage').textContent }));
    let tiny = false, integer = false;
    for (const force of [0.45, 0.6, 0.8, 1, 0.45, 0.6, 0.8, 1]) {
      await page.evaluate(force => { window.__corogalism.teleport(0.6, 0.5); window.__corogalism.setTilt(-force, 0); }, force);
      for (let n = 0; n < 55; n++) {
        const before = await snapshot(); await page.clock.runFor(16); const after = await snapshot();
        if (after.hp >= before.hp) continue;
        const delta = Math.ceil(Math.max(0, before.hp)) - Math.ceil(Math.max(0, after.hp));
        assert.equal(after.damage, delta ? `−${delta}` : '微小', JSON.stringify({ before, after }));
        assert.equal(Number(after.number.split('/')[0]), Math.ceil(Math.max(0, after.hp)));
        if (!delta && !tiny) { tiny = true; await page.screenshot({ path: fileURLToPath(new URL(`tiny-${width}.png`, output)), fullPage: true }); }
        if (delta && !integer) { integer = true; await page.screenshot({ path: fileURLToPath(new URL(`integer-${width}.png`, output)), fullPage: true }); }
      }
      if (tiny && integer) break;
    }
    assert.ok(tiny && integer, `${width}: observe fractional and integer-changing real wall impacts`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: real wall impacts at 3 widths; micro damage and displayed integer deltas match HP numbers, no overflow or errors.');
} finally { await browser.close(); }
