/**
 * localStorage の読み書き（F-135）。
 *
 * 読めない・書けない環境（プライベートウィンドウ、site data をブロックした
 * ブラウザ等）でもゲームが動くこと。すべて try/catch で囲み、失敗しても黙って
 * 既定値で続ける。
 */
const SETTINGS_KEY = 'corogalism-settings';
const BESTS_KEY = 'corogalism-bests';

const DEFAULT_SETTINGS = {
  mode: 'tilt',
  maxTiltAngleDeg: 25,
  calibration: null,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) };
}

export function saveSettings(settings) {
  return write(SETTINGS_KEY, settings);
}

export function loadBests() {
  return read(BESTS_KEY, {});
}

/** 更新したら記録を返す。更新しなければ null */
export function saveBest(seed, timeMs, wallHits) {
  const bests = loadBests();
  const key = String(seed);
  const prev = bests[key];
  if (prev && prev.timeMs <= timeMs) return null;
  bests[key] = { timeMs, wallHits, at: new Date().toISOString() };
  write(BESTS_KEY, bests);
  return bests[key];
}

export function getBest(seed) {
  return loadBests()[String(seed)] || null;
}
