/**
 * 傾きセンサー入力（F-101, F-102, F-103, F-106）。
 *
 * 注意（環境の制約。実装で回避できない）:
 * - DeviceOrientation はセキュアコンテキスト（HTTPS）でしか動かない。
 *   開発機のLAN IP（http://192.168.x.x）にスマホから繋いでもセンサーは反応しない。
 * - iOS 13以降は requestPermission() を「ユーザー操作を起点に」呼ぶ必要がある。
 *
 * 許可拒否・非搭載・値が届かない場合は supported/receiving が false になる。
 * 呼び出し側は必ず擬似傾きモードへ着地させる（行き止まりを作らない）。
 */
import { createStableCalibration } from './stableCalibration.js';

export function createTiltSource({ canCalibrate = () => true, onCalibrated = () => {} } = {}) {
  let calibration = null;
  let pendingCalibration = true;
  let receiving = false;
  let handler = null;
  let onVector = null;
  let getMaxAngle = () => 25;
  const stable = createStableCalibration();

  function isSupported() {
    return typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined';
  }

  function needsPermission() {
    return isSupported() && typeof window.DeviceOrientationEvent.requestPermission === 'function';
  }

  async function requestPermission() {
    if (!isSupported()) return 'unsupported';
    if (!needsPermission()) return 'unnecessary';
    try {
      const res = await window.DeviceOrientationEvent.requestPermission();
      return res === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  function onOrientation(e) {
    if (!Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) { stable.reset(); return; }
    receiving = true;

    const beta = e.beta;
    const gamma = e.gamma;

    if (pendingCalibration || !calibration) {
      if (!canCalibrate()) { stable.reset(); return; }
      const measured = stable.sample(beta, gamma, performance.now());
      if (!measured) return;
      calibration = measured;
      pendingCalibration = false;
      onCalibrated({ ...calibration });
    }

    let dBeta = beta - calibration.beta;
    const dGamma = gamma - calibration.gamma;
    if (dBeta > 180) dBeta -= 360;
    if (dBeta < -180) dBeta += 360;

    const maxAngle = Math.max(1, getMaxAngle());
    const x = Math.max(-1, Math.min(1, dGamma / maxAngle));
    const y = Math.max(-1, Math.min(1, dBeta / maxAngle));
    if (onVector) onVector(x, y);
  }

  return {
    get supported() { return isSupported(); },
    get receiving() { return receiving; },
    get needsCalibration() { return pendingCalibration || !calibration; },
    needsPermission,
    requestPermission,

    start(vectorCallback, maxAngleGetter) {
      if (!isSupported()) return false;
      onVector = vectorCallback;
      if (maxAngleGetter) getMaxAngle = maxAngleGetter;
      if (!handler) {
        handler = onOrientation;
        window.addEventListener('deviceorientation', handler);
      }
      return true;
    },

    stop() {
      if (handler) {
        window.removeEventListener('deviceorientation', handler);
        handler = null;
      }
      receiving = false;
      stable.reset();
    },

    /** 明示的な再調整。採用するまでは前の基準を残し、中断できる。 */
    calibrate() {
      pendingCalibration = true;
      stable.reset();
    },

    cancelCalibration() { pendingCalibration = !calibration; stable.reset(); },
    resetCalibrationSamples() { stable.reset(); },

    getCalibration() { return calibration ? { ...calibration } : null; },
    setCalibration(c) {
      if (c && Number.isFinite(c.beta) && Number.isFinite(c.gamma)) {
        calibration = { beta: c.beta, gamma: c.gamma };
        pendingCalibration = false;
      }
    },
  };
}
