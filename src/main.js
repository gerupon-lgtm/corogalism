/**
 * 初期化・画面遷移・ゲームループ。
 *
 * 物理パラメータは resolveParams 経由（integrator の中）で解決される。
 * ここでは基準値（BASE）と設定値を渡すだけで、物理の値を直接読まない。
 */
import { BASE, TUNING } from './config/gameConfig.js';
import { generateMaze } from './maze/generator.js';
import { createStage, createActor, goalCenter } from './world/stage.js';
import { getCharacter } from './world/characters.js';
import { stepPhysics } from './physics/integrator.js';
import { createTiltVector } from './input/tiltVector.js';
import { createTiltSource } from './input/tiltSource.js';
import { createPointerSource } from './input/pointerSource.js';
import { createFixedCamera } from './render/camera.js';
import { createRenderer } from './render/canvasRenderer.js';
import { loadSettings, saveSettings, saveBest, getBest } from './record/storage.js';
import { createTitleScreen } from './ui/titleScreen.js';
import { createGameScreen } from './ui/gameScreen.js';
import { createClearScreen } from './ui/clearScreen.js';
import { createSettingsScreen } from './ui/settingsScreen.js';

const root = document;
const boardEl = root.querySelector('#board');
const canvas = root.querySelector('#canvas');

const title = createTitleScreen(root);
const game = createGameScreen(root);
const clear = createClearScreen(root);
const settingsUi = createSettingsScreen(root);

const renderer = createRenderer(canvas);
const tilt = createTiltVector();
const tiltSource = createTiltSource();
const pointerSource = createPointerSource(boardEl);

let settings = loadSettings();
let tiltAllowed = false;
let tiltDeniedReason = '';

let stage = null;
let actor = null;
let camera = null;
let seed = initialSeed();
let running = false;
let paused = false;
let cleared = false;
let started = false;
let startedAt = 0;
let timeMs = 0;
let wallHits = 0;
let lastFrame = 0;

function initialSeed() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '' && Number.isFinite(Number(q))) return Number(q) >>> 0;
  return (Date.now() % 1000003) >>> 0;
}

function nextSeed() {
  return ((seed * 7919 + 13) % 1000003) >>> 0;
}

/* ---------- 入力 ---------- */

function applyMode(mode) {
  settings.mode = mode === 'tilt' && tiltAllowed ? 'tilt' : 'pointer';
  saveSettings(settings);
  tilt.reset();
  pointerSource.stop();
  tiltSource.stop();

  if (settings.mode === 'tilt') {
    tiltSource.start((x, y) => tilt.setRaw(x, y), () => settings.maxTiltAngleDeg);
  } else {
    pointerSource.start((x, y) => tilt.setRaw(x, y));
  }
  settingsUi.render(settings);
}

async function enableTilt() {
  if (!tiltSource.supported) {
    tiltAllowed = false;
    tiltDeniedReason = 'この端末では傾きセンサーが使えないため、擬似傾きモードで動作します。';
    return false;
  }
  const res = await tiltSource.requestPermission();
  if (res === 'denied') {
    tiltAllowed = false;
    tiltDeniedReason = '傾きセンサーの利用が許可されなかったため、擬似傾きモードで動作します。';
    return false;
  }
  tiltAllowed = true;
  tiltDeniedReason = '';
  if (settings.calibration) tiltSource.setCalibration(settings.calibration);
  // 値が届かない場合（HTTPSでない等）は擬似傾きモードへ落とす
  setTimeout(() => {
    if (settings.mode === 'tilt' && !tiltSource.receiving) {
      tiltAllowed = false;
      tiltDeniedReason =
        'センサーから値が届きません（HTTPSで開いているか確認してください）。擬似傾きモードに切り替えました。';
      settingsUi.setTiltAvailable(false, tiltDeniedReason);
      applyMode('pointer');
    }
  }, 1500);
  return true;
}

function calibrate() {
  if (settings.mode !== 'tilt') return;
  tiltSource.calibrate();
  tilt.reset();
  // 次のイベントで基準が入るので、少し待ってから保存する
  setTimeout(() => {
    const c = tiltSource.getCalibration();
    if (c) {
      settings.calibration = c;
      saveSettings(settings);
    }
  }, 300);
}

/* ---------- 面 ---------- */

function loadStage(useSeed) {
  seed = useSeed >>> 0;
  const maze = generateMaze(BASE.mazeSize, seed);
  stage = createStage(maze);
  actor = createActor(maze, getCharacter('default'));
  resize();
  started = false;
  cleared = false;
  paused = false;
  timeMs = 0;
  wallHits = 0;
  tilt.reset();
  game.setPaused(false);
}

function resize() {
  if (!stage) return;
  const px = renderer.resize(boardEl.clientWidth);
  camera = createFixedCamera(stage, px);
}

/* ---------- ループ ---------- */

function frame(now) {
  const dt = Math.min((now - (lastFrame || now)) / 1000, TUNING.maxDt);
  lastFrame = now;

  if (running && !paused && !cleared) {
    tilt.update(dt, BASE.inputSmoothing);
    const base = { ...BASE, maxTiltAngleDeg: settings.maxTiltAngleDeg };
    const res = stepPhysics({ actor, stage, tilt: tilt.value, base, dt });
    wallHits += res.wallHits;

    const speed = Math.hypot(actor.vx, actor.vy);
    if (!started && speed > TUNING.startMoveSpeed) {
      started = true;
      startedAt = now;
    }
    if (started) timeMs = now - startedAt;

    const g = goalCenter(stage.maze);
    if (Math.hypot(actor.x - g.x, actor.y - g.y) < TUNING.goalRadius) {
      finishStage();
    }
  }

  if (stage && camera) {
    renderer.draw({
      stage,
      actor,
      camera,
      pointerTilt: settings.mode === 'pointer' && pointerSource.active ? tilt.value : null,
    });
  }
  if (running) {
    game.setHud({ timeMs, wallHits, tiltMagnitude: tilt.magnitude, mode: settings.mode });
  }

  requestAnimationFrame(frame);
}

function finishStage() {
  cleared = true;
  const updated = saveBest(seed, timeMs, wallHits);
  const best = getBest(seed);
  clear.setResult({
    timeMs,
    bestMs: best ? best.timeMs : null,
    isNewBest: Boolean(updated),
    seed,
  });
  game.hide();
  clear.show();
}

/* ---------- 画面遷移 ---------- */

function toGame() {
  title.hide();
  clear.hide();
  settingsUi.hide();
  game.show();
  resize();
  running = true;
}

function toSettings(from) {
  settingsUi.setTiltAvailable(tiltAllowed, tiltDeniedReason);
  settingsUi.render(settings);
  title.hide();
  game.hide();
  clear.hide();
  settingsUi.show();
  settingsUi.returnTo = from;
}

title.onStart(async () => {
  await enableTilt();
  applyMode(tiltAllowed ? settings.mode : 'pointer');
  if (!tiltAllowed && tiltDeniedReason) title.setNote(tiltDeniedReason);
  loadStage(seed);
  toGame();
});
title.onSettings(() => toSettings('title'));

game.onPause(() => {
  paused = !paused;
  game.setPaused(paused);
});
game.onCalibrate(calibrate);
game.onSettings(() => { running = false; toSettings('game'); });

clear.onRetry(() => { loadStage(seed); toGame(); });
clear.onNext(() => { loadStage(nextSeed()); toGame(); });

settingsUi.onModeChange((mode) => applyMode(mode));
settingsUi.onAngleChange((v) => {
  settings.maxTiltAngleDeg = v;
  saveSettings(settings);
});
settingsUi.onCalibrate(calibrate);
settingsUi.onClose(() => {
  settingsUi.hide();
  if (settingsUi.returnTo === 'game' && stage) { toGame(); } else { title.show(); }
});

window.addEventListener('resize', () => {
  resize();
  game.setOrientationWarning(window.innerWidth > window.innerHeight && settings.mode === 'tilt');
});

/* ---------- 開発用フック（?debug=1 のときだけ有効） ----------
   自動テストや手元の確認で、ボールを任意の位置へ置いたり状態を読んだりするための口。
   本番の挙動には影響しない（クエリが無ければ window に何も生えない）。 */
if (new URLSearchParams(location.search).get('debug') === '1') {
  window.__corogalism = {
    get state() {
      return {
        seed, timeMs, wallHits, started, cleared, paused, mode: settings.mode,
        actor: { x: actor.x, y: actor.y, vx: actor.vx, vy: actor.vy, r: actor.r },
        goal: goalCenter(stage.maze),
      };
    },
    /** ボールをマス座標へ置く（速度は0にする） */
    teleport(x, y) {
      actor.x = x; actor.y = y; actor.vx = 0; actor.vy = 0;
      if (!started) { started = true; startedAt = performance.now(); }
    },
    setTilt(x, y) { tilt.setRaw(x, y); },
  };
}

// 初期表示（タイトルでも盤面が見えるようにステージを作っておく）
loadStage(seed);
title.show();
settingsUi.render(settings);
requestAnimationFrame(frame);
