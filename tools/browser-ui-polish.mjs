import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:8765/');
const output = new URL('../docs/verification/ui-polish/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
try {
  for (const width of [320, 375, 390, 464, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 812 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true });
      localStorage.setItem('corogalism-run-bests', JSON.stringify({ noContinue: { stages: 12, totalTimeMs: 192340, at: new Date().toISOString() }, withContinue: { stages: 20, totalTimeMs: 390120, at: new Date().toISOString() } }));
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.goto(new URL('?debug=1&seed=123', base).href); await page.clock.runFor(32);
    await page.evaluate(() => document.fonts.ready);
    const state = () => page.evaluate(() => window.__corogalism.state);
    const click = async id => { await page.locator(`#${id}`).click(); await page.clock.runFor(32); };
    const screenshot = async name => page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), fullPage: true });
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const settingsOnly = async () => {
      for (const id of ['board', 'challenge-hud', 'play-toolbar', 'play-hint', 'screen-game']) assert.equal(await page.locator(`#${id}`).isVisible(), false, `${id} hidden in settings`);
      assert.equal(await page.locator('#screen-settings').isVisible(), true);
      await noOverflow();
    };
    assert.equal(await page.locator('#screen-mode h2').textContent(), '今日はどちらで遊ぶ？');
    assert.doesNotMatch(await page.locator('#screen-mode').textContent(), /3・2・1|カウントダウン/);
    const sentences = await page.locator('#btn-practice .mode-description > span').evaluateAll(els => els.map(el => {
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,line:parseFloat(getComputedStyle(el).lineHeight)};
    }));
    assert.equal(sentences.length,2);
    assert.ok(sentences.every(s=>Math.abs(s.h-s.line)<1),'each sentence fits on one line');
    const description = await page.locator('#btn-practice .mode-description').boundingBox();
    if(sentences[0].w+sentences[1].w>description.width+.5) assert.ok(sentences[1].y>sentences[0].y,'description breaks at full stop when it cannot fit');
    else assert.equal(sentences[1].y,sentences[0].y,'description stays on one line when it fits');
    assert.equal(await page.locator('footer .brand-word').count(), 0);
    assert.match(await page.locator('header .brand-tagline').textContent(), /A SMALL MAZE/);
    assert.equal(await page.locator('header .brand-tagline br').count(), 1);
    const logo = await page.locator('header .brand').boundingBox();
    const tagline = await page.locator('header .brand-tagline').boundingBox();
    assert.ok(tagline.x >= logo.x + logo.width, 'two-line tagline is right of logo');
    const baselines = await page.evaluate(() => ['.brand-word', '.brand-tagline'].map(selector => {
      const probe = document.createElement('span'); probe.style.cssText = 'display:inline-block;width:0;height:0';
      document.querySelector(selector).append(probe); const y = probe.getBoundingClientRect().y; probe.remove(); return y;
    }));
    assert.ok(Math.abs(baselines[0] - baselines[1]) < 1, 'A BIG FEELING aligns with the bottom baseline of m');
    assert.match(await page.locator('#mode-best-no').textContent(), /12 面192.34 秒/);
    assert.match(await page.locator('#mode-best-continue').textContent(), /20 面390.12 秒/);
    assert.equal(await page.evaluate(() => document.fonts.check('700 16px "M PLUS 1p"', '記録')), true);
    const fonts = await page.locator('body, button, .record-cards dd, .brand-word').evaluateAll(els => els.map(el => ({logo:el.classList.contains('brand-word'),font:getComputedStyle(el).fontFamily})));
    assert.ok(fonts.every(f => f.logo ? !f.font.includes('M PLUS 1p') : f.font.includes('M PLUS 1p')));
    await noOverflow(); await screenshot('title-records');
    await click('btn-mode-settings'); await settingsOnly();
    await screenshot('settings-title'); await click('btn-settings-close');
    await click('btn-challenge'); await page.clock.runFor(3100);
    const before = await state();
    assert.ok(before.walls.every(w => Math.abs(Math.min(w.w, w.h) - .24) < 1e-9));
    await screenshot('game');
    await click('btn-game-settings'); await settingsOnly();
    const stopped = await state(); await page.clock.fastForward(60000);
    assert.deepEqual((await state()).actor, stopped.actor); assert.equal((await state()).timeMs, stopped.timeMs); assert.deepEqual((await state()).hp, stopped.hp);
    await page.locator('#set-angle').fill('30'); await screenshot('settings-game');
    await click('btn-settings-close'); assert.equal((await state()).paused, true); assert.equal((await state()).seed, before.seed);
    await click('btn-resume'); await page.clock.runFor(3100);
    await page.evaluate(() => { const g = window.__corogalism.state.goal; window.__corogalism.teleport(g.x, g.y); }); await page.clock.runFor(32);
    assert.equal((await state()).screen, 'clear'); await click('btn-game-settings'); await settingsOnly();
    await click('btn-settings-close'); assert.equal((await state()).screen, 'clear');
    await noOverflow(); await context.close();
  }
  // フォントファイルの取得を失敗させても、文字と主要操作が使える。
  const context = await browser.newContext({ viewport: { width: 320, height: 812 } });
  await context.route('**/assets/fonts/*.woff2', route => route.abort());
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(base.href); await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('700 16px "M PLUS 1p"', '記録')), false);
  await page.locator('#btn-mode-settings').click(); assert.equal(await page.locator('#screen-settings').isVisible(), true);
  assert.equal(await page.locator('#board').isVisible(), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: fileURLToPath(new URL('font-fallback-320.png', output)), fullPage: true });
  await context.close(); assert.deepEqual(errors, []);
  console.log('PASS: header branding, populated records, fonts and blocked-font fallback, settings without board/HUD at 5 widths, game freeze and return from clear, wider collision walls.');
} finally { await browser.close(); }
