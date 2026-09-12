/** 初期化・画面遷移・ゲームループ。物理とHPの接続はstagePlayに委譲する。 */
import { BASE, TUNING, UI, CHALLENGE_LEVELS } from './config/gameConfig.js';
import { createSoundManager } from './audio/soundManager.js';
import { createStagePlay } from './game/stagePlay.js';
import { createRun } from './game/run.js';
import { challengeDifficulty, normalizeLevel } from './game/challenge.js';
import { goalCenter } from './world/stage.js';
import { createTiltVector } from './input/tiltVector.js';
import { createTiltSource } from './input/tiltSource.js';
import { createPointerSource } from './input/pointerSource.js';
import { createFixedCamera } from './render/camera.js';
import { createRenderer } from './render/canvasRenderer.js';
import { getWallMaterialAppearance } from './render/materialAppearance.js';
import { loadSettings, saveSettings, saveBest, getBest, loadRunBests, saveRunBest } from './record/storage.js';
import { createGameScreen } from './ui/gameScreen.js';
import { createClearScreen } from './ui/clearScreen.js';
import { createSettingsScreen } from './ui/settingsScreen.js';
import { createRunScreens } from './ui/runScreens.js';

const root = document;
const find = (id) => root.querySelector(`#${id}`);
const boardEl = find('board');
const game = createGameScreen(root);
const clear = createClearScreen(root);
const settingsUi = createSettingsScreen(root);
const runUi = createRunScreens(root);
const renderer = createRenderer(find('canvas'));
const tilt = createTiltVector();
const tiltSource = createTiltSource({
  canCalibrate: () => !document.hidden && settings.mode === 'tilt'
    && (manualCalibration || (screen === 'game' && !paused && prepareMs > 0)),
  onCalibrated: (value) => {
    settings.calibration = value;
    saveSettings(settings);
    manualCalibration = false;
    tilt.reset();
    find('calibration-note').textContent = '基準を設定しました。このページで遊ぶ間は維持します。';
    find('board-status').textContent = '基準を設定しました';
    updateCountdown();
  },
});
const pointerSource = createPointerSource(boardEl);
const settings = loadSettings();
settings.challengeLevel = normalizeLevel(settings.challengeLevel);
let activeLevel = settings.challengeLevel;
let manualCalibration = false;
const sound = createSoundManager(settings, (note) => { find('sound-note').textContent = note; });
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
let screen = 'mode';
let paused = false;
let handled = false;
let starting = false;
let inputReady = false;
let countdownMs = 0;
let prepareMs = 0;
let audibleCountdown = null;
let lastFrame = performance.now();

function initialSeed() {
  const q = new URLSearchParams(location.search).get('seed');
  if (q !== null && q !== '' && Number.isFinite(Number(q))) return Number(q) >>> 0;
  return (Date.now() % 1000003) >>> 0;
}
function nextSeed() { return ((seed * 7919 + 13) % 1000003) >>> 0; }
function isPlaying() { return screen === 'game' && !paused && !document.hidden && prepareMs === 0 && countdownMs === 0; }
function receiveTilt(x, y) { if (isPlaying()) tilt.setRaw(x, y); }

function updateAudio() {
  const active = play && isPlaying() && play.status === 'playing';
  sound.setScene({
    music: Boolean(active),
    speed: active ? Math.hypot(play.actor.vx, play.actor.vy) : 0,
    hidden: document.hidden,
  });
}

function renderSound() {
  for (const id of ['btn-sound', 'btn-settings-sound']) {
    const button = find(id);
    button.setAttribute('aria-pressed', String(settings.soundEnabled));
    button.setAttribute('aria-label', settings.soundEnabled ? '音をミュートする' : '音を有効にする');
    button.querySelector('span').textContent = settings.soundEnabled ? '音 ON' : '音 OFF';
  }
}

function saveSound() {
  sound.setPreferences(settings);
  find('sound-save-note').textContent = saveSettings(settings)
    ? '音量の設定は次回も引き継ぎます。' : 'このブラウザでは設定を保存できません。今回はこの音量で遊べます。';
  renderSound();
}

function toggleSound() {
  settings.soundEnabled = !settings.soundEnabled;
  saveSound();
  if (settings.soundEnabled) { sound.unlock(true); sound.effect('select'); }
}

function resetInput() {
  pointerSource.stop();
  tilt.reset();
  if (settings.mode === 'pointer' && isPlaying()) pointerSource.start(receiveTilt);
}

function applyMode(mode) {
  clearTimeout(sensorCheck);
  tiltSource.stop();
  manualCalibration = false;
  tiltSource.cancelCalibration();
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
  renderDifficulty();
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
  if (screen === 'game') setPaused(true);
  manualCalibration = true;
  tiltSource.calibrate();
  tilt.reset();
  find('calibration-note').textContent = '楽に持てる角度で、少し静止してください。';
  find('board-status').textContent = '楽な角度で少し静止してください';
}

function renderDifficulty() {
  for (const button of root.querySelectorAll('[data-level]')) button.setAttribute('aria-pressed', String(button.dataset.level === settings.challengeLevel));
  find('difficulty-note').textContent = settings.challengeLevel === 'easy' ? 'ぶつかったときのHP消費が少なめ。' : 'いつもの手応えで挑戦。';
  find('challenge-level-label').textContent = CHALLENGE_LEVELS[settings.challengeLevel].label;
  runUi.setModeBests(loadRunBests(settings.challengeLevel), tiltDeniedReason);
}
function runResult() { return { ...run.result(), level: activeLevel }; }

function resize() {
  if (play && !boardEl.hidden) camera = createFixedCamera(play.stage, renderer.resize(boardEl.clientWidth));
}

function updateHint() {
  find('play-hint').textContent = screen === 'game'
    ? settings.mode === 'pointer' ? '盤面の中心から、進みたい方向を押し続けます。' : '端末を傾けて、右下のカップへ。'
    : 'オレンジのビー玉を、右下のカップへ。';
  game.setOrientationWarning(window.innerWidth > window.innerHeight && settings.mode === 'tilt');
}

function showScreen(name) {
  const previousScreen = screen;
  if (previousScreen !== name && manualCalibration) {
    manualCalibration = false;
    tiltSource.cancelCalibration();
  }
  tiltSource.resetCalibrationSamples();
  if (previousScreen !== name) sound.stopEffects();
  screen = name;
  const ended = name === 'clear' || name === 'over';
  const boardSession = name === 'game' || ended;
  root.querySelectorAll('section.panel, section.game-toast').forEach((el) => {
    el.hidden = el.id !== `screen-${name}` && !(ended && el.id === 'screen-game');
  });
  root.body.dataset.screen = name;
  root.body.classList.toggle('board-session', boardSession);
  boardEl.hidden = !boardSession;
  find('play-toolbar').hidden = !boardSession;
  find('play-hint').hidden = !boardSession;
  find('btn-pause').disabled = name !== 'game';
  find('toast-layer').hidden = !ended;
  find('challenge-hud').hidden = !boardSession || gameMode !== 'challenge';
  find('board-overlay').hidden = name !== 'game' || !paused;
  find('board-status').textContent = '一時停止';
  updateCountdown();
  resetInput();
  lastFrame = performance.now();
  updateHint();
  resize();
  updateAudio();
  // 設定は先頭から読める独立画面にし、戻るときは元の操作位置を復元する。
  if (name === 'settings') window.scrollTo(0, 0);
  else if (name === 'run-result') {
    window.scrollTo(0, 0);
    find('run-heading').focus({ preventScroll: true });
  }
  else if (previousScreen === 'settings') window.scrollTo(0, settingsUi.returnScroll || 0);
  // focus()の既定スクロールを抑え、トースト内から操作を続けられるようにする。
  if (ended) {
    const button = name === 'clear' ? find('btn-next') : find('btn-continue').disabled ? find('btn-run-end') : find('btn-continue');
    button.focus({ preventScroll: true });
  } else if (boardSession && ['clear', 'over'].includes(previousScreen)) {
    find('btn-pause').focus({ preventScroll: true });
  }
}

function updateCountdown() {
  const visible = screen === 'game' && !paused && countdownMs > 0;
  find('countdown-layer').hidden = !visible;
  const preparing = prepareMs > 0;
  const calibrating = visible && settings.mode === 'tilt' && tiltSource.needsCalibration;
  find('countdown-caption').textContent = calibrating ? '楽な角度で少し静止してください' : 'まもなくスタート';
  find('btn-calibration-pointer').hidden = !calibrating;
  const counting = visible && !preparing;
  const label = preparing ? 'READY' : String(Math.ceil(countdownMs / 1000));
  find('countdown-layer').classList.toggle('is-preparing', preparing);
  if (counting && audibleCountdown !== label) sound.tick(Number(label));
  else if (audibleCountdown !== null && !visible && countdownMs === 0 && isPlaying()) sound.tick(0);
  audibleCountdown = counting ? label : null;
  if (visible && find('countdown-number').textContent !== label) {
    find('countdown-number').textContent = label;
    find('countdown-layer').setAttribute('aria-label', preparing ? '姿勢を整えてください' : `開始まで${label}秒`);
  }
}

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
    swatch.dataset.material = id;
    swatch.style.backgroundColor = appearance.fill;
    swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, `${appearance.label}：${materialHelp[id]}`);
    list.append(item);
  }
}

function loadStage(useSeed, delayMs = UI.beforeCountdownMs) {
  seed = useSeed >>> 0;
  stageIndex = run ? run.stageIndex : 1;
  play = createStagePlay(seed, run ? challengeDifficulty(stageIndex, activeLevel) : null);
  paused = false;
  handled = false;
  countdownMs = UI.startCountdownMs;
  prepareMs = delayMs;
  game.setPaused(false);
  game.setStage({ challenge: Boolean(run), stageIndex, continuesLeft: run?.continuesLeft ?? 0 });
  find('play-mode-label').textContent = run ? CHALLENGE_LEVELS[activeLevel].label : 'PRACTICE';
  find('stage-theme').textContent = play.stage.theme?.label || '';
  find('recovery-feedback').textContent = '';
  renderLegend();
  resize();
}

function startGame(mode, useSeed = seed) {
  gameMode = mode;
  activeLevel = settings.challengeLevel;
  run = mode === 'challenge' ? createRun(useSeed) : null;
  recordStatus = null;
  loadStage(run ? run.currentSeed() : useSeed);
  showScreen('game');
}

function showModes() {
  countdownMs = 0;
  prepareMs = 0;
  renderDifficulty();
  showScreen('mode');
}

function setPaused(value) {
  sound.stopEffects();
  find('board-status').textContent = '一時停止';
  paused = value;
  tiltSource.resetCalibrationSamples();
  if (manualCalibration) { manualCalibration = false; tiltSource.cancelCalibration(); }
  if (!value) { countdownMs = UI.startCountdownMs; prepareMs = UI.beforeCountdownMs; }
  game.setPaused(value);
  resetInput();
  lastFrame = performance.now();
  find('board-overlay').hidden = !value || screen !== 'game';
  updateCountdown();
  updateAudio();
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
  sound.clear();
}

function failStage() {
  handled = true;
  run.failStage(play.status);
  // 最初の失敗でノーコン記録を確定。続けてもその記録を失わない。
  recordStatus = saveRunBest(runResult());
  runUi.setOver(run);
  showScreen('over');
  sound.effect('fail');
}

function finishRun() {
  if (!run) { showModes(); return; }
  recordStatus ??= saveRunBest(runResult());
  runUi.setResult(runResult(), recordStatus);
  showScreen('run-result');
}

function frame(now) {
  const elapsedMs = Math.max(0, now - lastFrame);
  const dt = Math.min(elapsedMs / 1000, TUNING.maxDt);
  lastFrame = now;
  if (screen === 'game' && !paused && !document.hidden && countdownMs > 0) {
    // 長いフレームや復帰で準備時間を飛ばさず、完了フレームでは物理を進めない。
    const calibrating = settings.mode === 'tilt' && tiltSource.needsCalibration;
    const step = calibrating ? 0 : Math.min(elapsedMs, UI.countdownMaxStepMs);
    const preparingStep = Math.min(prepareMs, step);
    prepareMs -= preparingStep;
    countdownMs = Math.max(0, countdownMs - (step - preparingStep));
    updateCountdown();
    if (countdownMs === 0) resetInput();
  } else if (isPlaying() && play.status === 'playing') {
    tilt.update(dt, BASE.inputSmoothing);
    const hpBefore = play.hp?.value;
    let recovery = null;
    const damage = play.advance({ dt, elapsedMs, tilt: tilt.value, base: { ...BASE, maxTiltAngleDeg: settings.maxTiltAngleDeg }, onImpact: sound.impact,
      onRecovery: (_amount, change) => { recovery = change; game.showRecovery(change.before, change.after, now); sound.effect('select'); } });
    if (damage > 0) game.showDamage(hpBefore, recovery?.before ?? play.hp.value, now);
    if (!handled && play.status === 'clear') finishStage();
    else if (!handled && run && ['dead', 'timeout'].includes(play.status)) failStage();
  }
  if (play && camera && !boardEl.hidden) renderer.draw({ stage: play.stage, actor: play.actor, camera, status: play.status, now,
    pointerTilt: isPlaying() && settings.mode === 'pointer' && pointerSource.active ? tilt.value : null });
  if (['game', 'clear', 'over'].includes(screen)) game.setHud({ timeMs: play.timeMs, wallHits: play.wallHits, tiltMagnitude: tilt.magnitude,
    mode: settings.mode, started: play.started, paused, preparing: countdownMs > 0, hp: play.hp, remainingSec: play.remainingSec, limitSec: play.limitSec, now });
  updateAudio();
  requestAnimationFrame(frame);
}

async function selectMode(mode) {
  if (starting) return;
  starting = true;
  const controls = ['btn-practice', 'btn-challenge', 'btn-mode-settings'].map(find);
  controls.forEach(el => { el.disabled = true; });
  try {
    if (!inputReady) {
      // モードボタンのクリックから直接iOS許可を求める。
      tiltAllowed = await enableTilt();
      applyMode(settings.mode);
      inputReady = true;
    }
    startGame(mode, mode === 'practice' ? initialSeed() : seed);
    // 初回センサー確認でボタンを無効化していても、遷移完了後に操作音を1回鳴らす。
    sound.effect('select');
  } finally {
    starting = false;
    controls.forEach(el => { el.disabled = false; });
  }
}

function toSettings(from) {
  if (from === 'game') setPaused(true);
  settingsUi.returnTo = from;
  settingsUi.returnScroll = window.scrollY;
  settingsUi.setTiltAvailable(tiltAllowed, tiltDeniedReason);
  settingsUi.render(settings);
  showScreen('settings');
}
find('btn-challenge').addEventListener('click', () => selectMode('challenge'));
for (const button of root.querySelectorAll('[data-level]')) button.addEventListener('click', () => {
  if (screen !== 'mode' || starting) return;
  settings.challengeLevel = normalizeLevel(button.dataset.level);
  saveSettings(settings);
  renderDifficulty();
});
find('btn-calibration-pointer').addEventListener('click', () => applyMode('pointer'));
find('btn-pause-calibrate').addEventListener('click', calibrate);
find('btn-practice').addEventListener('click', () => selectMode('practice'));
find('btn-mode-settings').addEventListener('click', () => toSettings('mode'));
game.onPause(() => { if (screen === 'game') { setPaused(!paused); if (paused) sound.effect('pause'); } });
find('btn-resume').addEventListener('click', () => { if (screen === 'game' && paused) setPaused(false); });
game.onCalibrate(calibrate);
game.onSettings(() => toSettings(screen));
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
    loadStage(run.currentSeed(), UI.continueBeforeCountdownMs);
    showScreen('game');
    sound.effect('continue');
  }
});
find('btn-run-end').addEventListener('click', finishRun);
find('btn-run-again').addEventListener('click', () => startGame('challenge', nextSeed()));
find('btn-run-modes').addEventListener('click', showModes);
settingsUi.onModeChange(applyMode);
settingsUi.onAngleChange((v) => { settings.maxTiltAngleDeg = v; saveSettings(settings); });
settingsUi.onVolumeChange((key, value) => { settings[key] = value; saveSound(); sound.unlock(); });
find('btn-sound').addEventListener('click', toggleSound);
find('btn-settings-sound').addEventListener('click', toggleSound);
// センサー許可のawaitへ進む前に、クリック内で音声を有効化する。
root.addEventListener('click', (event) => {
  if (event.target.closest('button')) sound.unlock();
}, true);
root.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button && !button.disabled && !['btn-sound', 'btn-settings-sound', 'btn-pause', 'btn-resume', 'btn-continue', 'btn-practice', 'btn-challenge'].includes(button.id)) sound.effect('select');
});
settingsUi.onCalibrate(calibrate);
settingsUi.onClose(() => showScreen(['game', 'clear', 'over'].includes(settingsUi.returnTo) ? settingsUi.returnTo : 'mode'));
window.addEventListener('resize', () => { resize(); updateHint(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'game') setPaused(true);
  if (document.hidden) sound.stopEffects();
  updateAudio();
  lastFrame = performance.now();
});

// クエリがない場合はwindowにフックを公開しない。
if (new URLSearchParams(location.search).get('debug') === '1') {
  window.__corogalism = {
    get state() {
      return { seed, timeMs: play.timeMs, wallHits: play.wallHits, started: play.started,
        audio: sound.state, level: activeLevel, theme: play.stage.theme, recovery: play.stage.recovery,
        calibration: tiltSource.getCalibration(), needsCalibration: tiltSource.needsCalibration,
        cleared: play.status === 'clear', paused, prepareMs, countdownMs, mode: settings.mode, gameMode, screen, stageIndex,
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
showModes();
settingsUi.setTiltAvailable(false, 'モードを選んだときに、傾きセンサーの利用を確認します。');
settingsUi.render(settings);
renderSound();
requestAnimationFrame(frame);
