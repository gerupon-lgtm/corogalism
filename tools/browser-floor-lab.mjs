import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8765/';
await mkdir('docs/verification/floor-lab', { recursive: true });
try {
  for (const width of [320, 390, 576]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000);
    await page.goto(base + 'floor-lab.html?debug=1'); await page.waitForFunction(() => !!window.__floorLab);
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const type of ['ice', 'sand', 'gravity', 'repulsion', 'normal']) {
      await page.locator(`[data-type=${type}]`).click();
      assert.equal(await page.evaluate(() => window.__floorLab.type), type);
      assert.equal(await page.evaluate(() => window.__floorLab.actor.x), .5);
    }
    await page.locator('[data-type=gravity]').click(); await page.locator('#plaza').click();
    const box = await page.locator('#board').boundingBox();
    await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5); await page.mouse.down();
    await page.clock.runFor(350); await page.mouse.up();
    assert.ok(await page.evaluate(() => window.__floorLab.actor.x > 2.7));
    await page.locator('#pause').click(); const before = await page.evaluate(() => window.__floorLab.actor.x);
    await page.clock.runFor(400); assert.equal(await page.evaluate(() => window.__floorLab.actor.x), before);
    await page.locator('#pause').click();
    await page.locator('#force').fill('7'); await page.locator('#force').dispatchEvent('input');
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw Error('denied'); } }, configurable: true }));
    await page.locator('#copy').click();
    assert.equal(JSON.parse(await page.locator('#settings-text').inputValue()).force, 7);
    await page.locator('#defaults').click(); assert.equal(await page.evaluate(() => window.__floorLab.settings.force), 5);
    await page.locator('#board').scrollIntoViewIfNeeded(); await page.clock.runFor(32);
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ fullPage: true, path: `docs/verification/floor-lab/${width}.png` });
    assert.deepEqual(errors, []); await page.close(); console.log('PASS floor lab width ' + width);
  }
  for (const sensor of ['denied', 'silent', 'granted']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await page.addInitScript(sensor => Object.defineProperty(window, 'DeviceOrientationEvent', { value: class { static async requestPermission() { return sensor === 'denied' ? 'denied' : 'granted'; } }, configurable: true }), sensor);
    await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000);
    await page.goto(base + 'floor-lab.html?debug=1'); await page.locator('#sensor').click();
    if (sensor === 'granted') {
      for (let i = 0; i < 15; i++) { await page.evaluate(() => { const e = new Event('deviceorientation'); Object.assign(e, { beta: 15, gamma: 0 }); dispatchEvent(e); }); await page.clock.runFor(100); }
      assert.equal(await page.evaluate(() => window.__floorLab.mode), 'tilt');
      assert.match(await page.locator('#status').textContent(), /傾き操作中/);
      await page.locator('#calibrate').click(); await page.clock.runFor(6500);
      assert.equal(await page.evaluate(() => window.__floorLab.mode), 'pointer');
    } else { await page.clock.runFor(6500); assert.equal(await page.evaluate(() => window.__floorLab.mode), 'pointer'); }
    await page.close(); console.log('PASS floor lab sensor ' + sensor);
  }
  const oldPage = await browser.newPage({ serviceWorkers: 'block' });
  await oldPage.route('**/src/config/gameConfig.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const BASE = {};' }));
  await oldPage.goto(base + 'floor-lab.html');
  await oldPage.waitForFunction(() => document.getElementById('status').textContent.includes('ゲームの更新が必要'));
  assert.equal(await oldPage.locator('#sensor').isDisabled(), true);
  await oldPage.close(); console.log('PASS old PWA update guidance');
  const offline = await browser.newContext();
  const page = await offline.newPage();
  await page.goto(base); await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await offline.setOffline(true); await page.goto(base + 'floor-lab.html');
  await page.locator('[data-type=ice]').click();
  assert.match(await page.locator('#hint').textContent(), /滑り続け/);
  await offline.close(); console.log('PASS floor lab offline after main cache');
} finally { await browser.close(); }
