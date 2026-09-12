/** 初期化・画面遷移・ゲームループ。物理とHPの接続はstagePlayに委譲する。 */
import { BASE, TUNING } from './config/gameConfig.js';
import { createStagePlay } from './game/stagePlay.js';
import { createRun } from './game/run.js';
import { difficultyAt } from './game/progression.js';
import { goalCenter } from './world/stage.js';
import { createTiltVector } from './input/tiltVector.js';
import { createTiltSource } from './input/tiltSource.js';
import { createPointerSource } from './input/pointerSource.js';
import { createFixedCamera } from './render/camera.js';
import { createRenderer } from './render/canvasRenderer.js';
import { getWallMaterialAppearance } from './render/materialAppearance.js';
import { loadSettings, saveSettings, saveBest, getBest, loadRunBests, saveRunBest } from './record/storage.js';
import { createTitleScreen } from './ui/titleScreen.js';
import { createGameScreen } from './ui/gameScreen.js';
import { createClearScreen } from './ui/clearScreen.js';
import { createSettingsScreen } from './ui/settingsScreen.js';
import { createRunScreens } from './ui/runScreens.js';

const root = document;
const find = (id) => root.querySelector(`#${id}`);
const boardEl = find('board');
const title = createTitleScreen(root);
const game = createGameScreen(root);
const clear = createClearScreen(root);
const settingsUi = createSettingsScreen(root);
const runUi = createRunScreens(root);
const renderer = createRenderer(find('canvas'));
const tilt = createTiltVector();
const tiltSource = createTiltSource();
const pointerSource = createPointerSource(boardEl);
const settings = loadSettings();
let tiltAllowed = false;
let tiltDeniedReason = '';
let sensorCheck = null;
let play = null;
let camera = null;
let seed = initialSeed();
let gameMode = 'practice';
let run = null;
let recordStatus = null;
let stageIndex = 1;
let screen = 'title';
let paused = false;
let handled = false;
let starting = false;
let lastFrame = performance.now();

function initialSeed() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '' && Number.isFinite(Number(q))) return Number(q) >>> 0;
  return (Date.now() % 1000003) >>> 0;
}
function nextSeed() { return ((seed * 7919 + 13) % 1000003) >>> 0; }
function isPlaying() { return screen === 'game' && !paused && !document.hidden; }
function receiveTilt(x, y) { if (isPlaying()) tilt.setRaw(x, y); }

function resetInput() {
  pointerSource.stop();
  tilt.reset();
  if (settings.mode === 'pointer' && isPlaying()) pointerSource.start(receiveTilt);
}

function applyMode(mode) {
  clearTimeout(sensorCheck);
  tiltSource.stop();
  settings.mode = mode === 'tilt' && tiltAllowed ? 'tilt' : 'pointer';
  resetInput();
  if (settings.mode === 'tilt') {
    tiltSource.start(receiveTilt, () => settings.maxTiltAngleDeg);
    sensorCheck = setTimeout(() => {
      if (settings.mode === 'tilt' && !tiltSource.receiving) {
        tiltAllowed = false;
        tiltDeniedReason = 'センサーから値が届かないため、タッチ／クリック操作に切り替えました。';
        applyMode('pointer');
      }
    }, 1500);
  }
  saveSettings(settings);
  settingsUi.setTiltAvailable(tiltAllowed, tiltDeniedReason);
  settingsUi.render(settings);
  runUi.setModeBests(loadRunBests(), tiltDeniedReason);
  updateHint();
}

async function enableTilt() {
  if (!tiltSource.supported) {
    tiltDeniedReason = 'この端末では盤面のタッチ／クリックで操作します。';
    return false;
  }
  // await前に呼び出すことでiOSのユーザー操作起点を保持する。
  const res = await tiltSource.requestPermission();
  if (res === 'denied' || res === 'unsupported') {
    tiltDeniedReason = '傾きセンサーを利用できないため、盤面のタッチ／クリックで操作します。';
    return false;
  }
  tiltDeniedReason = '';
  return true;
}

function calibrate() {
  if (settings.mode !== 'tilt') return;
  tiltSource.calibrate();
  tilt.reset();
  setTimeout(() => {
    const c = tiltSource.getCalibration();
    if (c) { settings.calibration = c; saveSettings(settings); }
  }, 300);
}

function resize() {
  if (play) camera = createFixedCamera(play.stage, renderer.resize(boardEl.clientWidth));
}

function updateHint() {
  find('play-hint').textContent = screen === 'game'
    ? settings.mode === 'pointer' ? '盤面の中心から、進みたい方向を押し続けます。' : '端末を傾けて、右下のカップへ。'
    : 'オレンジのビー玉を、右下のカップへ。';
  game.setOrientationWarning(window.innerWidth > window.innerHeight && settings.mode === 'tilt');
}

function showScreen(name) {
  const previousScreen = screen;
  screen = name;
  const ended = name === 'clear' || name === 'over';
  const boardSession = name === 'game' || ended;
  root.querySelectorAll('section.panel, section.game-toast').forEach((el) => {
    el.hidden = el.id !== `screen-${name}` && !(ended && el.id === 'screen-game');
  });
  root.body.dataset.screen = name;
  root.body.classList.toggle('board-session', boardSession);
  find('screen-game').inert = ended;
  find('screen-game').setAttribute('aria-hidden', String(ended));
  find('toast-layer').hidden = !ended;
  find('challenge-hud').hidden = !boardSession || gameMode !== 'challenge';
  find('board-overlay').hidden = name !== 'game' || !paused;
  find('board-status').textContent = '一時停止';
  resetInput();
  lastFrame = performance.now();
  updateHint();
  resize();
  // focus()の既定スクロールを抑え、トースト内から操作を続けられるようにする。
  if (ended) {
    const button = name === 'clear' ? find('btn-next') : find('btn-continue').disabled ? find('btn-run-end') : find('btn-continue');
    button.focus({ preventScroll: true });
  } else if (boardSession && ['clear', 'over'].includes(previousScreen)) {
    find('btn-pause').focus({ preventScroll: true });
  }
}

// 操作付きトースト内でTabを循環し、背景の操作へ抜けないようにする。
root.addEventListener('keydown', (event) => {
  if (!['clear', 'over'].includes(screen) || event.key !== 'Tab') return;
  const buttons = [...find(`screen-${screen}`).querySelectorAll('button')].filter(el => !el.hidden && !el.disabled);
  const index = buttons.indexOf(root.activeElement);
  const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
  event.preventDefault(); buttons[next].focus({ preventScroll: true });
});

const materialHelp = {
  default: '標準の跳ね返りとダメージ', rubber: 'よく跳ねる・ダメージ小',
  stone: '跳ねにくい・ダメージ大', spike: '跳ねる・ダメージ特大', moss: '跳ねにくい・ダメージ小',
};
function renderLegend() {
  const list = find('material-list');
  list.replaceChildren();
  const present = new Set(play.stage.walls.map((wall) => wall.materialId));
  for (const id of Object.keys(materialHelp)) {
    if (!present.has(id)) continue;
    const appearance = getWallMaterialAppearance(id);
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'material-swatch';
    swatch.style.backgroundColor = appearance.fill;
    swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, `${appearance.label}：${materialHelp[id]}`);
    list.append(item);
  }
}

function loadStage(useSeed) {
  seed = useSeed >>> 0;
  stageIndex = run ? run.stageIndex : 1;
  play = createStagePlay(seed, run ? difficultyAt(stageIndex) : null);
  paused = false;
  handled = false;
  game.setPaused(false);
  game.setStage({ challenge: Boolean(run), stageIndex, continuesLeft: run?.continuesLeft ?? 0 });
  renderLegend();
  resize();
}

function startGame(mode, useSeed = seed) {
  gameMode = mode;
  run = mode === 'challenge' ? createRun(useSeed) : null;
  recordStatus = null;
  loadStage(run ? run.currentSeed() : useSeed);
  showScreen('game');
}

function showModes() {
  runUi.setModeBests(loadRunBests(), tiltDeniedReason);
  showScreen('mode');
}

function setPaused(value) {
  paused = value;
  game.setPaused(value);
  resetInput();
  lastFrame = performance.now();
  find('board-overlay').hidden = !value || screen !== 'game';
}

function finishStage() {
  handled = true;
  if (run) {
    run.clearStage({ timeMs: play.timeMs, noDamage: !play.hp.tookDamage });
    clear.setResult({ gameMode, stageIndex, hp: play.hp, noDamage: !play.hp.tookDamage, timeMs: play.timeMs, seed });
  } else {
    const updated = saveBest(seed, play.timeMs, play.wallHits);
    const best = getBest(seed);
    clear.setResult({ gameMode, timeMs: play.timeMs, bestMs: best?.timeMs, isNewBest: Boolean(updated && best), seed });
  }
  showScreen('clear');
}

function failStage() {
  handled = true;
  run.failStage(play.status);
  // 最初の失敗でノーコン記録を確定。続けてもその記録を失わない。
  recordStatus = saveRunBest(run.result());
  runUi.setOver(run);
  showScreen('over');
}

function finishRun() {
  if (!run) { showModes(); return; }
  recordStatus ??= saveRunBest(run.result());
  runUi.setResult(run.result(), recordStatus);
  showScreen('run-result');
}

function frame(now) {
  const elapsedMs = Math.max(0, now - lastFrame);
  const dt = Math.min(elapsedMs / 1000, TUNING.maxDt);
  lastFrame = now;
  if (isPlaying() && play.status === 'playing') {
    tilt.update(dt, BASE.inputSmoothing);
    const damage = play.advance({ dt, elapsedMs, tilt: tilt.value, base: { ...BASE, maxTiltAngleDeg: settings.maxTiltAngleDeg } });
    if (damage > 0) game.showDamage(damage, now);
    if (!handled && play.status === 'clear') finishStage();
    else if (!handled && run && ['dead', 'timeout'].includes(play.status)) failStage();
  }
  if (play && camera) renderer.draw({ stage: play.stage, actor: play.actor, camera, status: play.status, now,
    pointerTilt: isPlaying() && settings.mode === 'pointer' && pointerSource.active ? tilt.value : null });
  if (['game', 'clear', 'over'].includes(screen)) game.setHud({ timeMs: play.timeMs, wallHits: play.wallHits, tiltMagnitude: tilt.magnitude,
    mode: settings.mode, started: play.started, paused, hp: play.hp, remainingSec: play.remainingSec, limitSec: play.limitSec, now });
  requestAnimationFrame(frame);
}

title.onStart(async () => {
  if (starting) return;
  starting = true;
  find('btn-start').disabled = true;
  find('btn-title-settings').disabled = true;
  try {
    tiltAllowed = await enableTilt();
    applyMode(settings.mode);
    calibrate();
    showModes();
  } finally {
    starting = false;
    find('btn-start').disabled = false;
    find('btn-title-settings').disabled = false;
  }
});

function toSettings(from) {
  if (from === 'game') setPaused(true);
  settingsUi.returnTo = from;
  settingsUi.setTiltAvailable(tiltAllowed, tiltDeniedReason);
  settingsUi.render(settings);
  showScreen('settings');
}
title.onSettings(() => toSettings('title'));
find('btn-challenge').addEventListener('click', () => startGame('challenge'));
find('btn-practice').addEventListener('click', () => startGame('practice', initialSeed()));
find('btn-mode-back').addEventListener('click', () => showScreen('title'));
game.onPause(() => setPaused(!paused));
game.onCalibrate(calibrate);
game.onSettings(() => toSettings('game'));
find('btn-game-exit').addEventListener('click', finishRun);
find('btn-clear-exit').addEventListener('click', finishRun);
find('material-legend').addEventListener('toggle', () => {
  if (find('material-legend').open && screen === 'game') setPaused(true);
});
clear.onRetry(() => { if (screen === 'clear' && !run) { loadStage(seed); showScreen('game'); } });
clear.onNext(() => { if (screen === 'clear') { loadStage(run ? run.currentSeed() : nextSeed()); showScreen('game'); } });
find('btn-continue').addEventListener('click', () => {
  if (screen === 'over' && run?.useContinue()) {
    recordStatus = null;
    loadStage(run.currentSeed());
    showScreen('game');
  }
});
find('btn-run-end').addEventListener('click', finishRun);
find('btn-run-again').addEventListener('click', () => startGame('challenge', nextSeed()));
find('btn-run-modes').addEventListener('click', showModes);
settingsUi.onModeChange(applyMode);
settingsUi.onAngleChange((v) => { settings.maxTiltAngleDeg = v; saveSettings(settings); });
settingsUi.onCalibrate(calibrate);
settingsUi.onClose(() => showScreen(settingsUi.returnTo === 'game' ? 'game' : 'title'));
window.addEventListener('resize', () => { resize(); updateHint(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'game') setPaused(true);
  lastFrame = performance.now();
});

// クエリがない場合はwindowにフックを公開しない。
if (new URLSearchParams(location.search).get('debug') === '1') {
  window.__corogalism = {
    get state() {
      return { seed, timeMs: play.timeMs, wallHits: play.wallHits, started: play.started,
        cleared: play.status === 'clear', paused, mode: settings.mode, gameMode, screen, stageIndex,
        status: play.status, remainingSec: play.remainingSec, limitSec: play.limitSec,
        hp: play.hp ? { value: play.hp.value, max: play.hp.max } : null,
        run: run ? { ...run.result(), stageIndex: run.stageIndex, continuesLeft: run.continuesLeft, runSeed: run.runSeed } : null,
        actor: { x: play.actor.x, y: play.actor.y, vx: play.actor.vx, vy: play.actor.vy, r: play.actor.r },
        goal: goalCenter(play.stage.maze), walls: play.stage.walls.map((wall) => ({ ...wall })) };
    },
    teleport(x, y) { play.teleport(x, y); },
    setTilt(x, y) { tilt.setRaw(x, y); },
  };
}
loadStage(seed);
showScreen('title');
settingsUi.setTiltAvailable(false, '傾き操作を使うには、タイトルの開始ボタンを押してください。');
settingsUi.render(settings);
requestAnimationFrame(frame);
