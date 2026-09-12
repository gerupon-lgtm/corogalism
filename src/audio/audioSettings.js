import { AUDIO } from '../config/gameConfig.js';

/** 古い保存データや不正な数値でも、音量を安全な範囲へ戻す。 */
export function normalizeAudioSettings(value = {}) {
  value = value || {};
  const volume = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
  return {
    soundEnabled: value.soundEnabled === true,
    bgmVolume: volume(value.bgmVolume, AUDIO.defaultBgmVolume),
    seVolume: volume(value.seVolume, AUDIO.defaultSeVolume),
  };
}
