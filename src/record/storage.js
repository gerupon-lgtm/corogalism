/**
 * localStorage の読み書き（F-135）。
 *
 * 読めない・書けない環境（プライベートウィンドウ、site data をブロックした
 * ブラウザ等）でもゲームが動くこと。すべて try/catch で囲み、失敗しても黙って
 * 既定値で続ける。
 */
import { normalizeAudioSettings } from '../audio/audioSettings.js';

const SETTINGS_KEY = 'corogalism-settings';
const BESTS_KEY = 'corogalism-bests';
const RUN_BESTS_KEY = 'corogalism-run-bests';

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
  const stored = read(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored, ...normalizeAudioSettings(stored) };
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

function isRunBest(value) {
  return value
    && typeof value === 'object'
    && Number.isInteger(value.stages)
    && value.stages >= 0
    && Number.isFinite(value.totalTimeMs)
    && value.totalTimeMs >= 0
    && typeof value.at === 'string'
    && !Number.isNaN(Date.parse(value.at));
}

/** チャレンジの自己ベストを、ノーコン／コンティニュー込みの2本で読む。 */
export function loadRunBests() {
  const stored = read(RUN_BESTS_KEY, {});
  return {
    noContinue: isRunBest(stored.noContinue) ? stored.noContinue : null,
    withContinue: isRunBest(stored.withContinue) ? stored.withContinue : null,
  };
}

function isBetterRun(candidate, previous) {
  if (!previous) return true;
  if (candidate.stages !== previous.stages) return candidate.stages > previous.stages;
  return candidate.totalTimeMs < previous.totalTimeMs;
}

/**
 * ラン結果をコンティニュー使用有無に応じた記録へ保存する。
 * 到達面数が多い方、同面数なら合計タイムが短い方を自己ベストとする。
 */
export function saveRunBest(result) {
  const validResult = result
    && Number.isInteger(result.stages)
    && result.stages >= 0
    && Number.isFinite(result.totalTimeMs)
    && result.totalTimeMs >= 0
    && typeof result.usedContinue === 'boolean';

  if (!validResult) return { updated: false, saved: false, best: null };

  const bests = loadRunBests();
  const category = result.usedContinue ? 'withContinue' : 'noContinue';
  const previous = bests[category];
  if (!isBetterRun(result, previous)) {
    return { updated: false, saved: true, best: previous };
  }

  const best = {
    stages: result.stages,
    totalTimeMs: result.totalTimeMs,
    at: new Date().toISOString(),
  };
  bests[category] = best;
  const saved = write(RUN_BESTS_KEY, bests);
  return { updated: true, saved, best };
}
