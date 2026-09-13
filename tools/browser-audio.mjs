import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:8765/');
const output = new URL('../docs/verification/audio/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
async function open({ failure, delayed = false } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true }));
  await context.addInitScript(() => {
    window.__bgmStarts = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer?.duration > 30) window.__bgmStarts.push({ offset: args[1] || 0, loop: this.loop });
      return start.apply(this, args);
    };
  });
  if (failure === 'api') await context.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  if (failure === 'fetch') await context.route('**/assets/audio/*', route => route.abort());
  const pending = [];
  if (delayed) await context.route('**/assets/audio/*', route => { pending.push(route); });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const requests = []; page.on('request', r => { if (r.url().includes('/assets/audio/')) requests.push(r.url()); });
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto(new URL('?debug=1&seed=123', base).href); await page.clock.runFor(32);
  const state = () => page.evaluate(() => window.__corogalism.state);
  const click = async id => { await page.locator(`#${id}`).click(); await page.clock.runFor(32); };
  const ready = async () => { const s = await state(); await page.clock.runFor(s.prepareMs + s.countdownMs + 32); };
  const clear = async () => { await page.evaluate(() => { const g = window.__corogalism.state.goal; window.__corogalism.teleport(g.x, g.y); }); await page.clock.runFor(32); };
  return { context, page, state, click, ready, clear, requests, pending };
}
try {
  const { context, page, state, click, ready, clear, requests } = await open();
  assert.equal((await state()).audio.context, 'none'); assert.equal(requests.length, 0);
  await click('btn-mode-settings'); await click('btn-settings-sound');
  await page.waitForFunction(() => window.__corogalism.state.audio.loaded, null, { polling: 50 });
  assert.equal((await state()).audio.buffers, 14); assert.equal((await state()).audio.context, 'running');
  assert.equal((await state()).audio.music, false);
  await page.screenshot({ path: fileURLToPath(new URL('settings-390.png', output)), fullPage: true });
  await click('btn-settings-close'); assert.equal((await state()).audio.music, false);
  const countdown = async () => {
    assert.ok((await state()).countdownMs > 0);
    assert.equal(await page.locator('#countdown-number').textContent(), 'READY');
    await page.clock.runFor((await state()).prepareMs + 16);
    for (let i = 0; i < 3; i++) {
      assert.equal((await state()).audio.music, false, 'BGM stays silent during 3/2/1');
      await page.clock.runFor(1000);
    }
    await page.clock.runFor(100);
    assert.equal((await state()).countdownMs, 0, 'controls become active before BGM');
    assert.equal((await state()).audio.music, false, 'start SE and the gap remain free of BGM');
    assert.ok((await state()).audio.musicDelaySec > 0);
    // AudioContextはPlaywrightの仮想時計と独立しているので、音声時計も進める。
    await page.clock.runFor(1000);
    await page.waitForFunction(() => window.__corogalism.state.audio.musicDelaySec === 0, null, { polling: 50 });
    await page.clock.runFor(32);
    assert.equal((await state()).audio.music, true, 'BGM starts after the 0.8s SE plus 0.2s gap');
    assert.deepEqual(await page.evaluate(() => window.__bgmStarts.at(-1)), { offset: 0, loop: true }, 'every BGM start begins at the first sample and loops');
  };
  await click('btn-challenge'); await countdown();
  assert.equal((await state()).audio.events.filter(e => e === 'countdown').length, 4);
  await click('btn-sound'); await click('btn-sound');
  assert.equal((await state()).audio.music, true);
  assert.deepEqual(await page.evaluate(() => window.__bgmStarts.at(-1)), { offset: 0, loop: true }, 'unmuting also restarts BGM from the beginning');
  const audioBox = await page.locator('#btn-sound').boundingBox(), pauseBox = await page.locator('#btn-pause').boundingBox();
  assert.ok(audioBox.x + audioBox.width <= pauseBox.x); assert.ok(Math.abs(audioBox.y - pauseBox.y) < 1);
  assert.equal(await page.locator('#dev-note').isVisible(), true);
  await page.screenshot({ path: fileURLToPath(new URL('game-390.png', output)), fullPage: true });
  await page.evaluate(() => window.__corogalism.setTilt(1, 0)); await page.clock.runFor(150);
  assert.ok((await state()).audio.events.includes('rolling'));
  await page.clock.runFor(1500); assert.ok((await state()).audio.events.includes('wall'));
  await click('btn-pause'); assert.equal((await state()).audio.music, false); assert.equal((await state()).audio.rolling, false);
  assert.ok((await state()).audio.events.includes('pause'));
  await click('btn-resume'); await countdown(); await clear();
  assert.equal((await state()).audio.music, false, 'clear stops BGM');
  assert.equal((await state()).screen, 'clear'); assert.ok((await state()).audio.events.includes('goal')); assert.ok((await state()).audio.events.includes('clear'));
  await click('btn-next'); await countdown();
  await page.evaluate(() => window.__corogalism.teleport(.5, .5)); await page.clock.fastForward((await state()).limitSec * 1000 + 50);
  assert.equal((await state()).screen, 'over'); assert.equal((await state()).audio.music, false, 'game over stops BGM'); assert.ok((await state()).audio.events.includes('fail'));
  await click('btn-continue'); assert.ok((await state()).audio.events.includes('continue')); await countdown();
  await click('btn-game-settings'); assert.equal((await state()).audio.music, false);
  await page.locator('#set-bgm-volume').fill('0'); await page.locator('#set-se-volume').fill('25');
  assert.equal((await state()).audio.bgmVolume, 0); assert.equal((await state()).audio.seVolume, .25);
  await click('btn-settings-close'); await click('btn-resume'); assert.equal((await state()).audio.music, false);
  await click('btn-sound'); assert.equal((await state()).audio.enabled, false); assert.equal((await state()).audio.voices, 0);
  await click('btn-sound');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal((await state()).paused, true); assert.equal((await state()).audio.music, false); assert.equal((await state()).audio.voices, 0);
  await page.reload(); await page.clock.runFor(32);
  assert.equal((await state()).audio.enabled, true); assert.equal((await state()).audio.context, 'none');
  assert.equal((await state()).audio.seVolume, .25); assert.equal((await state()).audio.bgmVolume, 0);
  await click('btn-mode-settings'); await page.locator('#set-bgm-volume').fill('60');
  await page.waitForFunction(() => window.__corogalism.state.audio.loaded, null, { polling: 50 });
  await click('btn-settings-close'); assert.equal((await state()).audio.music, false);
  await click('btn-challenge'); await countdown(); await click('btn-game-exit');
  assert.equal((await state()).screen, 'run-result'); assert.equal((await state()).audio.music, false);
  await click('btn-run-modes'); assert.equal((await state()).audio.music, false);
  for (const interruption of ['pause', 'settings', 'clear', 'exit', 'mute']) {
    await click('btn-practice'); await ready();
    assert.equal((await state()).audio.music, false);
    if (interruption === 'clear') await clear();
    else await click({ pause: 'btn-pause', settings: 'btn-game-settings', exit: 'btn-game-exit', mute: 'btn-sound' }[interruption]);
    await page.clock.runFor(1200);
    await new Promise(resolve => setTimeout(resolve, 1100)); await page.clock.runFor(32);
    assert.equal((await state()).audio.music, false, `no late BGM after ${interruption}`);
    assert.notEqual((await state()).audio.events.at(-1), 'bgm');
    if (interruption === 'settings') await click('btn-settings-close');
    if (interruption !== 'exit') await click('btn-game-exit');
    if (interruption === 'mute') { await click('btn-mode-settings'); await click('btn-settings-sound'); await click('btn-settings-close'); }
  }
  await context.close();
  for (const failure of ['api', 'fetch']) {
    const app = await open({ failure }); await app.click('btn-mode-settings'); await app.click('btn-settings-sound');
    if (failure === 'fetch') await app.page.waitForFunction(() => window.__corogalism.state.audio.loaded, null, { polling: 50 });
    assert.ok((await app.page.locator('#sound-note').textContent()).length > 0);
    await app.click('btn-settings-close'); await app.click('btn-practice'); await app.ready(); await app.clear();
    assert.equal((await app.state()).screen, 'clear'); await app.context.close();
  }
  const slow = await open({ delayed: true }); await slow.click('btn-practice'); await slow.click('btn-sound');
  for (let i = 0; slow.pending.length < 14 && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(slow.pending.length, 14);
  await slow.click('btn-sound'); await Promise.all(slow.pending.map(route => route.continue()));
  await slow.page.waitForFunction(() => window.__corogalism.state.audio.loaded, null, { polling: 50 });
  assert.equal((await slow.state()).audio.music, false); assert.equal((await slow.state()).audio.voices, 0);
  await slow.context.close(); assert.deepEqual(errors, []);
  console.log('PASS: every BGM start uses offset 0 and loops, start SE + 0.2s gap, cancellation during delay, active play only; opt-in loading, 14 decoded sounds, countdown/rolling/impact/clear/fail/continue, pause/settings/visibility stop, independent persisted volume, approved toolbar, missing API/fetch failure and mute during loading.');
} finally { await browser.close(); }
