import { CALIBRATION } from '../config/gameConfig.js';

const wrapAngle = value => ((value + 180) % 360 + 360) % 360 - 180;

/** 短時間の安定を検出し、1回のセンサー値ではなく平均姿勢を返す。 */
export function createStableCalibration(cfg = CALIBRATION) {
  let window = null;
  return {
    reset() { window = null; },
    sample(beta, gamma, nowMs) {
      if (![beta, gamma, nowMs].every(Number.isFinite)) { window = null; return null; }
      if (window && (nowMs < window.last || nowMs - window.last > cfg.maxSampleGapMs)) window = null;
      let b = window ? wrapAngle(beta - window.beta) : 0;
      let g = window ? wrapAngle(gamma - window.gamma) : 0;
      if (window && (Math.max(window.maxB, b) - Math.min(window.minB, b) > cfg.toleranceDeg
        || Math.max(window.maxG, g) - Math.min(window.minG, g) > cfg.toleranceDeg)) window = null;
      if (!window) {
        window = { beta, gamma, at: nowMs, last: nowMs, minB: 0, maxB: 0, minG: 0, maxG: 0, sumB: 0, sumG: 0, count: 0 };
        b = g = 0;
      }
      window.minB = Math.min(window.minB, b); window.maxB = Math.max(window.maxB, b);
      window.minG = Math.min(window.minG, g); window.maxG = Math.max(window.maxG, g);
      window.sumB += b; window.sumG += g; window.count++; window.last = nowMs;
      if (nowMs - window.at < cfg.stableMs || window.count < cfg.minSamples) return null;
      return { beta: wrapAngle(window.beta + window.sumB / window.count), gamma: wrapAngle(window.gamma + window.sumG / window.count) };
    },
  };
}
