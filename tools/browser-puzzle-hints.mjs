/** 状況に応じた紹介ヒント。面送りの診断配置と、開始からの実 pointer 完走を分けて記録する。 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(/^[A-Za-z]:[\\/]/.test(modulePath) ? pathToFileURL(modulePath).href : modulePath);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8774/';
const output = process.env.PUZZLE_HINT_OUTPUT || 'docs/verification/puzzle-hints/local';
const phase = process.env.PUZZLE_HINT_PHASE || 'all';
const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
const viewports = (process.env.PUZZLE_HINT_VIEWPORTS || '312x720,412x915,576x1024').split(',').map(v => v.split('x').map(Number));
const screenshotSeed = (48 - Math.imul(6, 0x9e3779b9)) >>> 0;
const rows = [];
let active = null;
let activeErrors = null;
await mkdir(output, { recursive: true });
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
const state = page => page.evaluate(() => window.__corogalism.state);

function record(name, result) {
  rows.push({ name, ...result });
  console.log('PASS ' + name + ' ' + JSON.stringify(result.summary ?? { width: result.width, kind: result.kind, index: result.index }));
}

async function fixture(width = 412, height = 915, { seed = screenshotSeed, clock = true, workers = 'block' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width === 412 ? 2.625 : 1, serviceWorkers: workers });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true });
    Element.prototype.requestFullscreen = () => Promise.reject(Error('verification fullscreen rejected'));
    localStorage.setItem('corogalism-settings', JSON.stringify({ mode: 'pointer', challengeLevel: 'easy', soundEnabled: false }));
  });
  const page = await context.newPage();
  active = page;
  const errors = { page: [], console: [], requests: [], http: [] };
  const loadedAssets = {}, assetReads = [];
  activeErrors = errors;
  page.on('pageerror', error => errors.page.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('requestfailed', request => errors.requests.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => {
    if (response.status() >= 400) errors.http.push({ url: response.url(), status: response.status() });
    const path = new URL(response.url()).pathname;
    if (['/src/game/puzzleHints.js', '/src/config/gameConfig.js', '/src/ui/tutorial.js', '/style.css'].some(file => path.endsWith(file))) assetReads.push(response.body().then(body => { loadedAssets[path] = createHash('sha256').update(body).digest('hex'); }));
  });
  if (clock) { await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000); }
  await page.goto(base + '?debug=1&seed=' + seed);
  await page.waitForFunction(() => !!window.__corogalism);
  await page.evaluate(() => document.fonts.ready);
  if (clock) await page.clock.runFor(32);
  assert.equal(await page.locator('.badge').textContent(), 'v' + version);
  return { context, page, width, height, errors, loadedAssets, assetReads };
}

async function click(page, id) {
  const button = page.locator('#' + id);
  if (await button.isDisabled()) await page.clock.runFor(1400);
  await button.click();
  await page.clock.runFor(32);
}

async function ready(page) {
  for (let i = 0; i < 80; i++) {
    const s = await state(page);
    if (s.screen === 'game' && !s.prepareMs && !s.countdownMs) return;
    await page.clock.runFor(250);
  }
  assert.fail('開始待機を終える');
}

async function start(page) { await click(page, 'btn-puzzle-tutorial'); await ready(page); }
async function diagnosticNext(page) {
  await page.evaluate(() => { const c = window.__corogalism, s = c.state; c.teleport(s.goal.x, s.goal.y); });
  await page.clock.runFor(32);
  assert.equal((await state(page)).status, 'clear');
  await click(page, 'btn-next');
  await ready(page);
}

async function inputControl(page) {
  await page.locator('#board').scrollIntoViewIfNeeded();
  const box = await page.locator('#board').boundingBox();
  assert.ok(box && box.width > 200);
  let down = false;
  return {
    async move(x, y) {
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      if (!down) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); down = true; }
      await page.mouse.move(box.x + box.width * (.5 + x / 2), box.y + box.height * (.5 + y / 2));
    },
    async release() { if (down) { await page.mouse.up(); down = false; } },
  };
}

async function panel(page) {
  return page.locator('#tutorial-lesson').evaluate(p => {
    const fields = ['h2', '.tutorial-copy', '.tutorial-hint', '.tutorial-context', '.tutorial-play-state'];
    const bounds = element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width }; };
    return { ...bounds(p), dataset: { ...p.dataset }, fields: Object.fromEntries(fields.map(selector => {
      const e = p.querySelector(selector);
      return [selector, e ? { ...bounds(e), text: e.textContent, hidden: e.hidden || getComputedStyle(e).display === 'none' } : null];
    })), hintCount: p.querySelectorAll('.tutorial-hint').length };
  });
}

function assertPanel(s, p) {
  assert.equal(p.height, 150, '紹介枠の縦幅を増やさない');
  assert.equal(p.hintCount, 1, '次の操作を一つ表示する');
  assert.equal(p.fields.h2.text, s.puzzleCourse.lesson.title, '面の目的を残す');
  assert.equal(p.fields['.tutorial-copy'].text, s.puzzleCourse.lesson.body, '接触の説明で本文を置き換えない');
  assert.ok(p.fields['.tutorial-hint'].text.trim(), '次の操作が空でない');
  assert.ok(s.tutorialHint?.id && s.tutorialHint?.text, '案内の状態が読める');
  const visible = Object.entries(p.fields).filter(([, e]) => e && !e.hidden && e.height > 0);
  for (const [selector, e] of visible) {
    assert.ok(e.top >= p.top - 1 && e.bottom <= p.bottom + 1, selector + ' が紹介枠内に収まる');
    assert.ok(e.left >= p.left - 1 && e.right <= p.right + 1, selector + ' が紹介枠から横にはみ出さない');
  }
  const content = ['.tutorial-copy', '.tutorial-hint', '.tutorial-context', '.tutorial-play-state'].map(selector => p.fields[selector]).filter(e => e && !e.hidden && e.height > 0).sort((a, b) => a.top - b.top);
  for (let i = 1; i < content.length; i++) assert.ok(content[i - 1].bottom <= content[i].top + 1, '本文・ヒント・補助行が重ならない');
}

function assertLive(s) {
  assert.equal(s.lastResult?.halt ?? null, null, '計算が中断しない');
  assert.ok([s.actor.x, s.actor.y, s.actor.vx, s.actor.vy, ...s.rackets.flatMap(w => [w.x, w.y, w.vx ?? 0, w.vy ?? 0])].every(Number.isFinite), '球と壁が有限');
  for (const w of [...s.walls, ...s.rackets]) {
    const x = Math.max(w.x, Math.min(s.actor.x, w.x + w.w)), y = Math.max(w.y, Math.min(s.actor.y, w.y + w.h));
    assert.ok(Math.hypot(s.actor.x - x, s.actor.y - y) >= s.actor.r - 1e-6, '球が壁に埋まらない');
  }
}

async function clean(fixture) {
  const assetResults = await Promise.allSettled(fixture.assetReads);
  for (const result of assetResults) assert.equal(result.status, 'fulfilled', '確認に使った資材の内容を記録');
  for (const [type, errors] of Object.entries(fixture.errors)) assert.deepEqual(errors, [], type + ' のエラーなし');
  record('browser-errors', { width: fixture.width, errors: fixture.errors, loadedAssets: fixture.loadedAssets });
}

async function diagnosticContact(page) {
  let s = await state(page);
  const timingGate = s.rackets.find(w => w.id === 'timing-gate');
  const closed = timingGate && s.puzzle.anchors.gateStates.closed[timingGate.id];
  // 開いた戸は固定壁と重なるので、実入力で閉じてから戸そのものへの接触を診断する。
  if (timingGate && Math.abs(timingGate[timingGate.axis] - closed) > .05) {
    const input = await inputControl(page), tilt = { x: 0, y: 0 };
    tilt[timingGate.axis] = Math.sign(closed - timingGate[timingGate.axis]) * .6;
    await input.move(tilt.x, tilt.y); await page.clock.runFor(1100); await input.release(); await page.clock.runFor(600);
    s = await state(page);
  }
  const all = [...s.walls, ...s.rackets], radius = s.actor.r;
  const free = point => point.x >= radius && point.y >= radius && point.x <= s.maze.size - radius && point.y <= s.maze.size - radius && all.every(w => {
    const x = Math.max(w.x, Math.min(point.x, w.x + w.w)), y = Math.max(w.y, Math.min(point.y, w.y + w.h));
    return Math.hypot(point.x - x, point.y - y) >= radius + .001;
  });
  let chosen;
  for (const wall of [...s.rackets, ...s.walls.filter(w => w.materialId === 'cotton')]) {
    const candidates = [
      { x: wall.x - radius - .015, y: wall.y + wall.h / 2, tilt: { x: .6, y: 0 } },
      { x: wall.x + wall.w + radius + .015, y: wall.y + wall.h / 2, tilt: { x: -.6, y: 0 } },
      { x: wall.x + wall.w / 2, y: wall.y - radius - .015, tilt: { x: 0, y: .6 } },
      { x: wall.x + wall.w / 2, y: wall.y + wall.h + radius + .015, tilt: { x: 0, y: -.6 } },
    ].filter(point => !wall.axis || point.tilt[wall.axis] === 0);
    const point = candidates.find(free);
    if (point) { chosen = { wall, point }; break; }
  }
  assert.ok(chosen, '壁に接触する診断用の空き位置がある');
  await page.evaluate(point => window.__corogalism.teleport(point.x, point.y), chosen.point);
  const input = await inputControl(page);
  await input.move(chosen.point.tilt.x, chosen.point.tilt.y);
  let dynamicContact = false;
  for (let i = 0; i < 30; i++) {
    await page.clock.runFor(16);
    const live = await state(page); assertLive(live);
    dynamicContact ||= (live.lastResult?.racketHits ?? 0) > 0;
  }
  await input.release();
  const after = await state(page);
  assertPanel(after, await panel(page));
  if (chosen.wall.id) assert.ok(dynamicContact, '診断配置から実 pointer で動く壁に接触した');
  return { wallId: chosen.wall.id ?? chosen.wall.materialId, diagnosticPositionPlacement: true, actualPointerContact: true, dynamicContact, afterHint: after.tutorialHint };
}

async function uiChecks() {
  const first = Number(process.env.PUZZLE_HINT_UI_START || 0), count = Number(process.env.PUZZLE_HINT_UI_COUNT || 6);
  assert.ok(Number.isInteger(first) && first >= 0 && Number.isInteger(count) && count > 0 && first + count <= 6);
  for (const [width, height] of viewports) {
    const f = await fixture(width, height), { page } = f;
    await start(page);
    for (let index = 0; index < first; index++) await diagnosticNext(page);
    const kinds = [], orientations = [], hints = [];
    for (let index = first; index < first + count; index++) {
      await page.clock.runFor(1200);
      const before = await state(page), card = await panel(page);
      assertLive(before); assertPanel(before, card);
      assert.equal(before.puzzleCourse.index, index);
      assert.equal(before.limitSec, null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      kinds.push(before.puzzle.kind); orientations.push({ rotation: before.puzzle.rotation, mirror: before.puzzle.mirror }); hints.push(before.tutorialHint);
      await page.screenshot({ path: output + '/lesson-' + (index + 1) + '-' + width + '.png', fullPage: true });

      const contact = await diagnosticContact(page);

      const input = await inputControl(page);
      await input.move(.3, .2); await page.clock.runFor(240); await input.release();
      assertLive(await state(page));
      assertPanel(await state(page), await panel(page));
      await click(page, 'btn-pause');
      const paused = await state(page), pausedPanel = await panel(page);
      await page.clock.runFor(800);
      assert.deepEqual((await state(page)).actor, paused.actor);
      assert.deepEqual((await state(page)).rackets, paused.rackets);
      assert.deepEqual((await state(page)).tutorialHint, paused.tutorialHint, 'ポーズ中はヒントを進めない');
      assert.equal((await panel(page)).fields['.tutorial-hint'].text, pausedPanel.fields['.tutorial-hint'].text);
      await click(page, 'btn-resume'); await ready(page);
      await click(page, 'btn-game-settings');
      const settings = await state(page);
      await page.clock.runFor(800);
      assert.deepEqual((await state(page)).actor, settings.actor);
      assert.deepEqual((await state(page)).tutorialHint, settings.tutorialHint, '設定中はヒントを進めない');
      await click(page, 'btn-settings-close');
      assert.equal((await state(page)).paused, true, '設定から戻ると既存のポーズへ戻る');
      await click(page, 'btn-resume'); await ready(page);
      record('lesson-ui', { width, index, kind: before.puzzle.kind, orientation: orientations.at(-1), card, hint: before.tutorialHint, contact, pointerReaction: true, pauseAndSettingsFreeze: true, priorStageAdvance: 'diagnostic-goal-placement' });
      if (index < first + count - 1) await diagnosticNext(page);
    }
    assert.equal(new Set(kinds).size, count);
    if (count === 6) assert.ok(orientations.some(o => o.rotation !== 0), '回転した配置を含む');
    record('six-lessons', { width, first, count, kinds, orientations, hints, cardHeight: 150, physicalPhoneTest: false });
    await clean(f); await f.context.close();
  }
}

async function legacyChecks() {
  const f = await fixture(), { page } = f;
  await click(page, 'btn-tutorial'); await click(page, 'btn-tutorial-start'); await ready(page);
  const original = await state(page);
  assert.equal(original.puzzleCourse, null);
  assert.equal(await page.locator('#tutorial-lesson').evaluate(p => p.classList.contains('is-puzzle-course')), false);
  assert.equal(await page.locator('.tutorial-hint').isVisible(), false, '元の遊び方に動く壁ヒントを出さない');
  const input = await inputControl(page); await input.move(.3, .1); await page.clock.runFor(250); await input.release();
  assert.ok(Math.hypot((await state(page)).actor.x - original.actor.x, (await state(page)).actor.y - original.actor.y) > .001);
  await diagnosticNext(page);
  assert.equal((await state(page)).puzzleCourse.index, 0);
  await page.clock.runFor(1200); assertPanel(await state(page), await panel(page));
  await click(page, 'btn-game-exit');
  await click(page, 'btn-practice'); await ready(page);
  assert.equal((await state(page)).puzzleCourse, null);
  assert.equal(await page.locator('#tutorial-lesson').isVisible(), false);
  record('legacy-regression', { oldTutorialPointer: true, continuation: 'puzzle-tutorial', practiceUnchanged: true, diagnosticOriginalGoalPlacement: true });
  await clean(f); await f.context.close();
}

function traceEntry(s, extra = {}) { return { ...extra, timeMs: s.timeMs, actor: s.actor, gate: s.rackets.find(w => w.id === 'timing-gate'), hint: s.tutorialHint, status: s.status }; }

async function route(page, input, targets, trace) {
  for (const target of targets) {
    let reached = false;
    for (let tick = 0; tick < 1200; tick++) {
      const s = await state(page); assertLive(s);
      if (s.status === 'clear') return;
      assert.equal(s.status, 'playing');
      const dx = target.x - s.actor.x, dy = target.y - s.actor.y;
      if (Math.hypot(dx, dy) < .045 && Math.hypot(s.actor.vx, s.actor.vy) < .1) { reached = true; trace.push(traceEntry(s, { step: 'route', target, reached })); break; }
      await input.move(clamp((clamp(dx * 2, 1.3) - s.actor.vx) * .45, .7), clamp((clamp(dy * 2, 1.3) - s.actor.vy) * .45, .7));
      await page.clock.runFor(16);
      if (tick % 60 === 0) trace.push(traceEntry(await state(page), { step: 'route', target, tick }));
    }
    assert.ok(reached, '通常の pointer 操作で通過点へ届く ' + JSON.stringify(target));
  }
}

async function until(page, input, tilt, reached, trace, name, maxMs = 5000) {
  await input.move(tilt.x, tilt.y);
  for (let tick = 0; tick < Math.ceil(maxMs / 16); tick++) {
    await page.clock.runFor(16);
    const s = await state(page); assertLive(s);
    if (s.tutorialHint?.phase === 'cutback' && !trace.some(row => row.step === 'cutback-card')) {
      const card = await panel(page); assertPanel(s, card);
      trace.push(traceEntry(s, { step: 'cutback-card', card }));
      await page.screenshot({ path: output + '/sixth-cutback.png', fullPage: true });
    }
    if (tick % 15 === 0 || reached(s)) trace.push(traceEntry(s, { step: name, tilt, tick }));
    if (reached(s)) return;
  }
  assert.fail(name + ' の切替位置へ届く ' + JSON.stringify((await state(page)).actor));
}

async function screenshotCourse() {
  const [width, height] = (process.env.PUZZLE_HINT_COURSE_VIEWPORT || '412x915').split('x').map(Number);
  const f = await fixture(width, height), { page } = f;
  await start(page);
  for (let index = 0; index < 5; index++) await diagnosticNext(page);
  const before = await state(page);
  assert.equal(before.seed, 48);
  assert.equal(before.puzzle.kind, 'racketTiming');
  assert.deepEqual({ rotation: before.puzzle.rotation, mirror: before.puzzle.mirror }, { rotation: 1, mirror: true });
  assert.deepEqual(before.goal, { x: 2.5, y: 4.5 });
  const trace = [], input = await inputControl(page);
  rows.push({ name: 'screenshot-sixth-full-course', width, height, actualPointer: true, teleportDuringCourse: false, previousLessons: 'diagnostic-goal-placement', automatedController: true, humanOrPhysicalPhoneTest: false, stageSeed: 48, before, trace });
  try {
    const hint = before.tutorialHint;
    assert.ok(hint?.target && hint?.direction, '最初のヒントに狙う位置と傾ける向きがある');
    const distanceBefore = Math.hypot(hint.target.x - before.actor.x, hint.target.y - before.actor.y);
    await input.move(hint.direction.x * .25, hint.direction.y * .25);
    await page.clock.runFor(240);
    const guided = await state(page), distanceAfter = Math.hypot(hint.target.x - guided.actor.x, hint.target.y - guided.actor.y);
    assert.ok(distanceAfter < distanceBefore, '表示された向きへの弱い操作で最初の案内位置へ近づく');
    trace.push(traceEntry(guided, { step: 'follow-initial-displayed-direction', recommendation: hint, distanceBefore, distanceAfter }));
    await route(page, input, [{ x: 5.3, y: 3.3 }], trace);
    await until(page, input, { x: -.2, y: -.3 }, s => s.actor.y <= 1.2, trace, 'weak-left-up');
    await until(page, input, { x: -.7, y: .3 }, s => s.actor.x <= 3.365, trace, 'gentle-down-reverse-and-left');
    const crossed = await state(page);
    await page.screenshot({ path: output + '/sixth-after-gate.png', fullPage: true });
    assertPanel(crossed, await panel(page));
    await route(page, input, [{ x: 3.55, y: .5 }, { x: 3.55, y: 5.5 }, { x: .5, y: 5.5 }, { x: .5, y: 4.5 }, { x: 2.5, y: 4.5 }], trace);
  } finally { await input.release(); rows.at(-1).final = await state(page); }
  const final = await state(page);
  assert.equal(final.status, 'clear', '開始から位置を置き換えずに六面目をクリア');
  const hintIds = [...new Set(trace.map(t => t.hint?.id).filter(Boolean))];
  assert.ok(hintIds.length >= 2, '球と戸の位置に応じて案内が変わる');
  const directions = [...new Set(trace.map(t => JSON.stringify(t.hint?.direction)).filter(Boolean))];
  assert.ok(directions.length >= 2, '案内の傾ける向きが変わる');
  const cutback = trace.filter(t => t.hint?.phase === 'cutback');
  assert.ok(cutback.some(t => t.actor.x >= 3.365 && t.actor.y <= 2.3), '上側の通路を渡る前に切り返しを案内する');
  rows.at(-1).summary = { seconds: final.timeMs / 1000, wallHits: final.wallHits, hintIds, directions, humanOrPhysicalPhoneTest: false };
  console.log('PASS screenshot-sixth-full-course ' + JSON.stringify(rows.at(-1).summary));
  await page.screenshot({ path: output + '/sixth-clear.png', fullPage: true });
  await clean(f); await f.context.close();
}

async function offlineChecks() {
  const f = await fixture(412, 915, { clock: false, workers: 'allow' }), { context, page } = f;
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cache = await page.evaluate(async () => {
    const name = (await caches.keys()).find(name => name.startsWith('corogalism-'));
    const files = (await (await caches.open(name)).keys()).map(request => new URL(request.url).pathname);
    return { name, files };
  });
  if (process.env.PUZZLE_HINT_PRECACHE_COUNT) assert.equal(cache.files.length, Number(process.env.PUZZLE_HINT_PRECACHE_COUNT), '公開確認の保存資材数が一致する');
  if (process.env.PUZZLE_HINT_CACHE) assert.equal(cache.name, 'corogalism-' + process.env.PUZZLE_HINT_CACHE, '公開確認のキャッシュ世代が一致する');
  assert.ok(cache.files.some(file => file.endsWith('/src/game/puzzleHints.js')), 'ヒントの新モジュールを保存');
  await context.setOffline(true); await page.reload();
  await page.waitForFunction(() => !!window.__corogalism);
  await page.clock.install(); await page.clock.pauseAt(Date.now() + 1000); await page.clock.runFor(32);
  await start(page); await page.clock.runFor(1200);
  assertPanel(await state(page), await panel(page));
  const input = await inputControl(page), before = await state(page);
  await input.move(.3, .2); await page.clock.runFor(250); await input.release();
  assert.ok(Math.hypot((await state(page)).actor.x - before.actor.x, (await state(page)).actor.y - before.actor.y) > .001);
  record('offline', { offline: true, cache, hintsVisible: true, actualPointer: true });
  await clean(f); await context.close();
}

try {
  if (['all', 'ui'].includes(phase)) await uiChecks();
  if (['all', 'legacy'].includes(phase)) await legacyChecks();
  if (['all', 'course'].includes(phase)) await screenshotCourse();
  if (['all', 'offline'].includes(phase)) await offlineChecks();
} catch (error) {
  rows.push({ name: 'failure', error: String(error), errors: activeErrors, state: active && !active.isClosed() ? await state(active).catch(() => null) : null });
  if (active && !active.isClosed()) await active.screenshot({ path: output + '/failure.png', fullPage: true });
  throw error;
} finally {
  await writeFile(output + '/results.json', JSON.stringify({ base, phase, version, screenshotSeed, rows }, null, 2) + '\n');
  await browser.close();
}
