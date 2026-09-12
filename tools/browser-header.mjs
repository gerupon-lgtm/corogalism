import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
// 修正前のプレイ画面と同じHTMLを使い、CSS変更による位置・大きさの差を測る。
const oldCss = execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/').replace(/\/$/, '')}`, 'show', '3ccd187:style.css'], { cwd: root, encoding: 'utf8' });
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:8765/');
const output = new URL('../docs/verification/header/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
async function open(viewport, original, fallback) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await context.addInitScript(() => Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true }));
  if (original) await context.route('**/style.css', route => route.fulfill({ contentType: 'text/css', body: oldCss }));
  if (fallback) await context.route('**/assets/fonts/*.woff2', route => route.abort());
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto(new URL('?debug=1&seed=123', base).href); await page.clock.runFor(32); await page.evaluate(() => document.fonts.ready);
  const state = () => page.evaluate(() => window.__corogalism.state);
  const click = async id => { await page.locator(`#${id}`).click(); await page.clock.runFor(32); };
  const ready = async () => { const s = await state(); await page.clock.runFor(s.prepareMs + s.countdownMs + 32); };
  const boxes = selectors => page.evaluate(selectors => selectors.map(selector => {
    const el = document.querySelector(selector), r = el.getBoundingClientRect(), css = getComputedStyle(el);
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height, font: css.fontSize, line: css.lineHeight };
  }), selectors);
  return { context, page, state, click, ready, boxes };
}
try {
  for (const [width, height, fallback = false] of [[320,568], [375,812], [390,844], [464,900], [1280,900], [812,375], [320,568,true]]) {
    const viewport = { width, height }, suffix = `${width}${fallback ? '-fallback' : ''}`;
    const old = await open(viewport, true, fallback); await old.click('btn-challenge'); await old.ready();
    const selectors = ['.head', '#challenge-hud', '#board', '#btn-pause', '#btn-sound', '#screen-game'];
    const originalGame = await old.boxes(selectors); await old.context.close();
    const app = await open(viewport, false, fallback);
    const headerSelectors = ['.head', '.brand', '.brand-word', '.brand-tagline', '.head .badge', '#dev-note'];
    const header = await app.boxes(headerSelectors);
    const check = async name => {
      assert.deepEqual(await app.boxes(headerSelectors), header, `${name}: same header geometry and typography`);
      assert.equal(await app.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const [, logo, , tagline, badge] = header;
      assert.ok(logo.x + logo.width <= tagline.x && tagline.x + tagline.width <= badge.x, 'branding does not overlap');
    };
    await check('mode'); await app.page.screenshot({ path: fileURLToPath(new URL(`mode-${suffix}.png`, output)), fullPage: true });
    await app.click('btn-mode-settings'); await check('settings'); await app.click('btn-settings-close');
    await app.click('btn-challenge'); await check('ready'); await app.ready(); await check('game');
    assert.deepEqual(await app.boxes(selectors), originalGame, 'board/HUD/controls retain their exact pre-change bounds');
    await app.page.screenshot({ path: fileURLToPath(new URL(`game-${suffix}.png`, output)), fullPage: true });
    await app.click('btn-pause'); await check('pause'); await app.click('btn-game-settings'); await check('game settings');
    await app.click('btn-settings-close'); await app.click('btn-resume'); await app.ready();
    const board = await app.page.locator('#board').boundingBox();
    await app.page.mouse.move(board.x + board.width * .8, board.y + board.height * .5); await app.page.mouse.down(); await app.page.clock.runFor(200); await app.page.mouse.up();
    assert.equal((await app.state()).started, true, 'pointer gameplay still responds');
    await app.page.evaluate(() => { const g = window.__corogalism.state.goal; window.__corogalism.teleport(g.x, g.y); }); await app.page.clock.runFor(32);
    await check('clear'); await app.click('btn-next'); await app.ready();
    await app.page.evaluate(() => window.__corogalism.teleport(.5,.5)); await app.page.clock.fastForward((await app.state()).limitSec * 1000 + 50);
    assert.equal((await app.state()).screen, 'over'); await check('over'); await app.click('btn-run-end'); await check('result');
    await app.page.screenshot({ path: fileURLToPath(new URL(`result-${suffix}.png`, output)), fullPage: true });
    await app.context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: identical header across all screens at 6 viewports plus blocked-font fallback; unchanged game/board/HUD/control geometry and working pointer play.');
} finally { await browser.close(); }
