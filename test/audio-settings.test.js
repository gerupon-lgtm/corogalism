import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAudioSettings } from '../src/audio/audioSettings.js';
import { loadSettings, saveSettings } from '../src/record/storage.js';

test('旧設定では音OFF、承認した音量比を既定値にする', () => {
  assert.deepEqual(normalizeAudioSettings({ mode: 'pointer' }), { soundEnabled: false, bgmVolume: .6, seVolume: .8 });
});

test('不正な保存音量は補正し、文字列のONを有効扱いしない', () => {
  assert.deepEqual(normalizeAudioSettings({ soundEnabled: 'true', bgmVolume: NaN, seVolume: Infinity }), { soundEnabled: false, bgmVolume: .6, seVolume: .8 });
  assert.deepEqual(normalizeAudioSettings({ soundEnabled: true, bgmVolume: -1, seVolume: 9 }), { soundEnabled: true, bgmVolume: 0, seVolume: 1 });
  assert.equal(normalizeAudioSettings(null).soundEnabled, false);
});

test('音設定を保存・復元しても操作モードとキャリブレーションを維持する', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  try {
    saveSettings({ mode: 'pointer', maxTiltAngleDeg: 30, calibration: { beta: 12, gamma: 2 }, soundEnabled: true, bgmVolume: .2, seVolume: 0 });
    assert.deepEqual(loadSettings(), { mode: 'pointer', maxTiltAngleDeg: 30, calibration: { beta: 12, gamma: 2 }, soundEnabled: true, bgmVolume: .2, seVolume: 0 });
  } finally { delete globalThis.localStorage; }
});
