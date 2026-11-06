/**
 * v0.8.19 browser regression: actual challenge buttons and native pointer input.
 * Virtual clock stepping and existing debug goal teleports accelerate this check.
 * Imported-module collision fixtures are calculations, not the user's exact run
 * or physical-device / human play acceptance.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(process.env.EASY_OUTPUT || resolve(root, 'docs/verification/v0.8.19/easy-local'));
let base = process.env.BASE_URL;
let server;
let browser;
let activePage;
const report = {
  expectedVersion: '0.8.19',
  boundary: 'Isolated Chrome browser contexts; 100 ms virtual clock steps; native pointer input; existing debug goal teleports for stages 1–11. Collision fixtures use imported production modules and 140 HP, not the user’s exact maze. No physical-device or human play acceptance.',
  errors: [],
  pointer: {},
  stageProgression: [],
  layouts: [],
};

if (!base) {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
  server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, `.${path}${path.endsWith('/') ? 'index.html' : ''}`);
      const rel = relative(root, file);
      if (rel.startsWith('..') || rel.includes(':')) throw Error('outside root');
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  base = `http://127.0.0.1:${server.address().port}/`;
}
base = new URL(base.endsWith('/') ? base : `${base}/`).href;
report.base = base;

const state = page => page.evaluate(() => window.__corogalism.state);
const advanceUntil = async (page, predicate, label, steps = 100) => {
  for (let i = 0; i < steps; i++) {
    if (await page.evaluate(predicate)) return;
    await page.clock.runFor(100);
  }
  throw Error(`Virtual clock timeout: ${label}; state=${JSON.stringify(await state(page))}`);
};
const click = async (page, selector) => {
  await page.locator(selector).click({ force: true });
  await page.clock.runFor(32);
};
const ready = page => advanceUntil(page, () => {
  const s = window.__corogalism.state;
  return s.screen === 'game' && s.prepareMs === 0 && s.countdownMs === 0;
}, 'challenge ready');
async function layout(page, label) {
  const row = await page.evaluate(() => {
    const b = document.querySelector('#board').getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      verticalOverflow: document.documentElement.scrollHeight - innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      board: { x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom },
      stageLabel: document.querySelector('#hud-stage').textContent,
      hpLabel: document.querySelector('#hud-hp').textContent,
      levelLabel: document.querySelector('#play-mode-label').textContent,
      version: document.querySelector('.badge').textContent.trim(),
    };
  });
  assert.equal(row.version, 'v0.8.19', `${label} version`);
  assert.equal(row.verticalOverflow, 0, `${label} vertical scroll`);
  assert.equal(row.horizontalOverflow, 0, `${label} horizontal scroll`);
  assert.ok(row.board.width >= 240 && row.board.bottom <= row.viewport.height, `${label} board fits`);
  report.layouts.push({ label, ...row });
  await page.screenshot({ path: resolve(output, `${label}.png`) });
  return row;
}
async function setup(level) {
  const context = await browser.newContext({ viewport: { width: 393, height: 740 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await context.addInitScript(level => {
    Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined, configurable: true });
    Element.prototype.requestFullscreen = () => Promise.reject(Error('browser fixture: fullscreen disabled'));
    localStorage.setItem('corogalism-settings', JSON.stringify({ mode: 'pointer', soundEnabled: false, challengeLevel: level }));
    const records = { noContinue: { rulesVersion: 'puzzle-v1', stages: 999, totalTimeMs: 12345, at: '2026-11-06T00:00:00.000Z' }, withContinue: { rulesVersion: 'puzzle-v1', stages: 888, totalTimeMs: 23456, at: '2026-11-06T00:00:00.000Z' } };
    for (const key of ['corogalism-run-bests-puzzle-v1', 'corogalism-run-bests-puzzle-v1-easy']) localStorage.setItem(key, JSON.stringify(records));
  }, level);
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push({ level, type: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push({ level, type: 'console', message: message.text() });
  });
  await page.clock.install({ time: new Date('2026-11-06T00:00:00.000Z') });
  await page.clock.pauseAt(new Date('2026-11-06T00:00:01.000Z'));
  await page.goto(new URL('?debug=1&seed=77', base).href);
  await page.waitForFunction(() => Boolean(window.__corogalism));
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(32);
  assert.equal(await page.locator('.badge').textContent(), 'v0.8.19');
  assert.equal(await page.locator('#challenge-level-label').textContent(), level === 'easy' ? 'やさしい' : '通常');
  const recordSnapshot = await page.evaluate(() => Object.fromEntries(['corogalism-run-bests-puzzle-v1', 'corogalism-run-bests-puzzle-v1-easy'].map(key => [key, localStorage.getItem(key)])));
  await click(page, '#btn-challenge');
  await ready(page);
  const initial = await state(page);
  assert.equal(initial.level, level);
  assert.equal(initial.mode, 'pointer');
  assert.equal(initial.run.runSeed, 77);
  assert.equal(initial.stageIndex, 1);
  await layout(page, `${level}-393x740-stage1`);
  return { context, page, initial, recordSnapshot };
}
async function pointerTrace(page) {
  await page.evaluate(() => {
    let frames = 0;
    const observe = () => { frames++; requestAnimationFrame(observe); };
    window.__easyDamageBrowserFrameCount = () => frames;
    requestAnimationFrame(observe);
  });
  const board = await page.locator('#board').boundingBox();
  await page.mouse.move(board.x + board.width * .88, board.y + board.height * .5);
  await page.mouse.down();
  const samples = [];
  for (let ms = 100; ms <= 2000; ms += 100) {
    await page.clock.runFor(100);
    const s = await state(page);
    const timing = await page.evaluate(() => ({ clockMs: performance.now(), frames: window.__easyDamageBrowserFrameCount() }));
    samples.push({ ms, ...timing, actor: s.actor, hp: s.hp, status: s.status, wallHits: s.wallHits, tilt: s.tilt });
    assert.equal(s.status, 'playing', `pointer trace alive at ${ms} ms`);
  }
  await page.mouse.up();
  return samples;
}
async function browserFixtures(page) {
  return page.evaluate(async base => {
    const [{ challengeDifficulty }, { difficultyAt }, { createHp }, { resolveCollisions }, { resolveParams }, { BASE, FLOOR_CHALLENGE: C, HP }, { getMaterial }, { createStagePlay }, { createTiltVector }] = await Promise.all([
      import(new URL('src/game/challenge.js', base).href),
      import(new URL('src/game/progression.js', base).href),
      import(new URL('src/game/hp.js', base).href),
      import(new URL('src/physics/collision.js', base).href),
      import(new URL('src/physics/resolveParams.js', base).href),
      import(new URL('src/config/gameConfig.js', base).href),
      import(new URL('src/world/materials.js', base).href),
      import(new URL('src/game/stagePlay.js', base).href),
      import(new URL('src/input/tiltVector.js', base).href),
    ]);
    function before(stage, level) {
      const base = difficultyAt(stage), n = base.stage, intro = Math.max(0, (10 - n) / 9), factor = level === 'easy' ? .4 : .65;
      return { ...base, level, themed: true,
        secPerCell: Math.max(C.secPerCellEnd, C.secPerCellStart - (C.secPerCellStart - C.secPerCellEnd) * (n - 1) / (C.timeStages - 1)),
        hpPerTurn: C.hpPerTurn,
        damageMult: Math.min(C.damageMax, 1 + C.damageStep * (n - 1)) * (1 - .5 * intro) * factor,
        damageCapRatio: (.2 + .15 * (1 - intro)) * factor,
        recoveryChance: C.recoveryChance[level], timeBonusSec: 0 };
    }
    const normalStages = [1, 2, 9, 10, 11, 17, 23, 24, 25, 40, 150];
    const normalUnchanged = normalStages.every(stage => {
      const old = before(stage, 'normal'), current = challengeDifficulty(stage, 'normal');
      return Object.keys(old).join('|') === Object.keys(current).join('|') && Object.keys(old).every(key => Object.is(old[key], current[key]));
    });
    function fixture(difficulty, speed, count) {
      const hp = createHp({ turns: 25, ...difficulty });
      const wall = { x: 1, y: 0, w: .24, h: 2, materialId: 'default' };
      const rows = [];
      for (let hit = 0; hit < count; hit++) {
        const actor = { x: .8, y: 1, vx: speed, vy: 0, r: .25 };
        let damage = 0;
        const hits = resolveCollisions(actor, [wall], wall => resolveParams({ base: BASE, material: getMaterial(wall.materialId) }).restitution,
          (impactSpeed, contactWall) => { damage += hp.applyImpact(impactSpeed, contactWall, hit * (HP.cooldownSec + .01)); });
        rows.push({ hit: hit + 1, damage, value: hp.value, actor, hits });
      }
      return { initialHp: hp.max, finalHp: hp.value, rows };
    }
    const current = challengeDifficulty(11, 'easy'), old = before(11, 'easy');
    const live = window.__corogalism.state;
    const trace = level => {
      const p = createStagePlay(live.seed, challengeDifficulty(1, level), { variation: live.maze.variation });
      const tilt = createTiltVector(), samples = [];
      tilt.setRaw(.76, 0);
      for (let ms = 20; ms <= 2000; ms += 20) {
        tilt.update(.02, BASE.inputSmoothing);
        p.advance({ dt: .02, elapsedMs: 20, tilt: tilt.value, base: BASE });
        if (ms % 100 === 0) samples.push({ ms, actor: { x: p.actor.x, y: p.actor.y, vx: p.actor.vx, vy: p.actor.vy, r: p.actor.r }, hp: { value: p.hp.value, max: p.hp.max }, status: p.status });
      }
      return samples;
    };
    return {
      boundary: '140 HP = base 40 + 25 turns × 4. Independent repeated default-wall collisions with production browser modules; not an exact reproduction of the user’s stage.',
      configuration: { easyFactor: C.damageFactor.easy, normalIntroEnd: C.damageIntroEndStage.normal, easyIntroEnd: C.damageIntroEndStage.easy },
      normalStages, normalUnchanged,
      matchedStepTrace: { boundary: 'Production createStagePlay + createTiltVector imported in Chrome; same native run seed/variation; exact 20-ms calculation steps, observations every 100 ms for 2 s. Separate from independently scheduled live native app traces.', normal: trace('normal'), easy: trace('easy') },
      moderate: { speed: 2.8, count: 12, before: fixture(old, 2.8, 12), after: fixture(current, 2.8, 12) },
      strong: { speed: 30, count: 8, before: fixture(old, 30, 8), after: fixture(current, 30, 8) },
    };
  }, base);
}

try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  // Run contexts serially to keep browser resource use low.
  const normal = await setup('normal');
  const normalSamples = await pointerTrace(normal.page);
  report.pointer.normal = { initial: normal.initial, samples: normalSamples };
  await normal.context.close();

  const easy = await setup('easy');
  activePage = easy.page;
  const easySamples = await pointerTrace(easy.page);
  report.pointer.easy = { initial: easy.initial, samples: easySamples };
  assert.deepEqual(easy.initial.maze, normal.initial.maze, 'stage 1 maze unchanged between modes');
  assert.deepEqual(easy.initial.walls, normal.initial.walls, 'stage 1 walls unchanged between modes');
  assert.equal(easy.initial.hp.max, normal.initial.hp.max);
  let greatestActorDelta = 0, greatestFrameCountDelta = 0;
  for (let i = 0; i < normalSamples.length; i++) {
    greatestFrameCountDelta = Math.max(greatestFrameCountDelta, Math.abs(normalSamples[i].frames - easySamples[i].frames));
    for (const key of ['x', 'y', 'vx', 'vy', 'r']) {
      const delta = Math.abs(normalSamples[i].actor[key] - easySamples[i].actor[key]);
      greatestActorDelta = Math.max(greatestActorDelta, delta);
    }
  }
  for (const [label, samples, initial] of [['normal', normalSamples, normal.initial], ['easy', easySamples, easy.initial]]) {
    assert.ok(Math.hypot(samples.at(-1).actor.x - initial.actor.x, samples.at(-1).actor.y - initial.actor.y) > .05, `${label} native pointer moved the ball`);
    assert.ok(samples.some(sample => sample.hp.value < initial.hp.value && sample.actor.vx < 0), `${label} native pointer exercised soft wall reflection`);
  }
  assert.ok(easySamples.at(-1).hp.value >= normalSamples.at(-1).hp.value, 'easy live trace ends with no less HP');
  // wallHits deliberately excludes soft contacts below speed 2; HP loss and
  // the reversed velocity prove this seed's close starting wall was contacted.
  report.pointer.comparison = { boundary: 'Independently scheduled live animation frames may differ at a 100-ms observation boundary. Recorded deltas are observations, not an exact equality assertion; matched-step equality is checked below using imported production browser modules.', greatestActorDelta, greatestFrameCountDelta, samples: normalSamples.length, virtualDurationMs: 2000, sameNormalizedNativePointer: { x: .76, y: 0 }, mazeEqual: true, wallsEqual: true, easyFinalHpNoLower: true, softWallReflectionObservedBoth: true };

  report.fixtures = await browserFixtures(easy.page);
  assert.deepEqual(report.fixtures.configuration, { easyFactor: .28, normalIntroEnd: 10, easyIntroEnd: 24 });
  assert.equal(report.fixtures.normalUnchanged, true);
  for (let i = 0; i < report.fixtures.matchedStepTrace.normal.length; i++) {
    const normalStep = report.fixtures.matchedStepTrace.normal[i], easyStep = report.fixtures.matchedStepTrace.easy[i];
    assert.deepEqual(easyStep.actor, normalStep.actor, `matched-step browser trajectory ${i}`);
    assert.equal(easyStep.status, 'playing');
    assert.equal(normalStep.status, 'playing');
    assert.ok(easyStep.hp.value >= normalStep.hp.value);
  }
  report.fixtures.matchedStepTrace.exactActorEquality = true;
  assert.equal(report.fixtures.moderate.after.initialHp, 140);
  assert.ok(report.fixtures.moderate.after.finalHp >= 60, '12 moderate collisions leave 60+ HP');
  assert.ok(report.fixtures.strong.after.finalHp >= 50, '8 strong collisions leave 50+ HP');
  for (const name of ['moderate', 'strong']) for (let i = 0; i < report.fixtures[name].count; i++) {
    assert.deepEqual(report.fixtures[name].after.rows[i].actor, report.fixtures[name].before.rows[i].actor, `${name} collision reflection unchanged`);
  }

  for (let current = 1; current <= 10; current++) {
    assert.equal((await state(easy.page)).stageIndex, current);
    await easy.page.evaluate(() => { const c = window.__corogalism, goal = c.state.goal; c.teleport(goal.x, goal.y); });
    await advanceUntil(easy.page, () => window.__corogalism.state.screen === 'clear', `stage ${current} clear`);
    await advanceUntil(easy.page, () => !document.querySelector('#btn-next').disabled, `stage ${current} next button`);
    await click(easy.page, '#btn-next');
    await ready(easy.page);
    const s = await state(easy.page);
    assert.equal(s.level, 'easy');
    assert.equal(s.stageIndex, current + 1);
    report.stageProgression.push({ stage: s.stageIndex, hp: s.hp, limitSec: s.limitSec, theme: s.theme.id, hud: await easy.page.locator('#hud-stage').textContent() });
  }
  assert.match(await easy.page.locator('#hud-stage').textContent(), /11面目/);
  await layout(easy.page, 'easy-393x740-stage11');
  await easy.page.setViewportSize({ width: 360, height: 740 });
  await easy.page.clock.runFor(64);
  await layout(easy.page, 'easy-360x740-stage11');

  await click(easy.page, '#btn-game-exit');
  assert.equal(await easy.page.locator('#run-end-confirm').evaluate(dialog => dialog.open), true);
  await click(easy.page, '#btn-end-confirm');
  assert.equal((await state(easy.page)).screen, 'run-result');
  await click(easy.page, '#btn-run-modes');
  assert.equal((await state(easy.page)).screen, 'mode');
  const recordsAfter = await easy.page.evaluate(() => Object.fromEntries(['corogalism-run-bests-puzzle-v1', 'corogalism-run-bests-puzzle-v1-easy'].map(key => [key, localStorage.getItem(key)])));
  assert.deepEqual(recordsAfter, easy.recordSnapshot, 'isolated existing better records preserved');
  await click(easy.page, '#btn-challenge');
  await ready(easy.page);
  const restarted = await state(easy.page);
  assert.equal(restarted.stageIndex, 1);
  assert.equal(restarted.level, 'easy');
  assert.equal(restarted.run.stages, 0);
  await layout(easy.page, 'easy-360x740-restarted-stage1');
  report.restart = { freshStage1: true, existingBetterRecordsPreserved: true, stage: restarted.stageIndex, hp: restarted.hp };
  assert.deepEqual(report.errors, []);
  await easy.context.close();
  activePage = null;
  await writeFile(resolve(output, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);
  await rm(resolve(output, 'failure.json'), { force: true });
  await rm(resolve(output, 'failure.png'), { force: true });
  console.log(`PASS v0.8.19: native pointer rolling/reflection observed; matched-step browser module trajectory exact; easy UI reaches stage 11; 140 HP moderate fixture=${report.fixtures.moderate.after.finalHp.toFixed(6)}, strong=${report.fixtures.strong.after.finalHp.toFixed(6)}; scroll=0; errors=0; records preserved.`);
} catch (error) {
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'failure.json'), `${JSON.stringify({ message: error.message, stack: error.stack, report }, null, 2)}\n`);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolveClose => server.close(resolveClose));
}
