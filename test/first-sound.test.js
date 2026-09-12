import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSelectBuffer } from '../src/audio/selectBuffer.js';
import { createSoundManager } from '../src/audio/soundManager.js';

test('初回操作音のPCMは承認済みWAVの全サンプルと一致する', () => {
  const wav = readFileSync(new URL('../assets/audio/se-select.wav', import.meta.url));
  let pcm, format;
  for (let at = 12; at + 8 <= wav.length;) {
    const id = wav.toString('ascii', at, at + 4), n = wav.readUInt32LE(at + 4);
    if (id === 'data') pcm = wav.subarray(at + 8, at + 8 + n);
    if (id === 'fmt ') format = wav.subarray(at + 8, at + 8 + n);
    at += 8 + n + n % 2;
  }
  const result = createSelectBuffer({ createBuffer(channels, frames, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(frames));
    return { channels, frames, sampleRate, getChannelData: i => data[i] };
  } });
  assert.equal(result.sampleRate, format.readUInt32LE(4));
  assert.equal(result.channels, format.readUInt16LE(2));
  assert.equal(result.frames * result.channels * 2, pcm.length);
  for (let i = 0; i < result.frames; i++) for (let ch = 0; ch < result.channels; ch++) {
    assert.equal(result.getChannelData(ch)[i], pcm.readInt16LE((i * result.channels + ch) * 2) / 32768);
  }
});

test('resume待ちの操作音は1件だけ保持し、停止・ミュート・非表示で破棄する', async () => {
  const previous = { AudioContext: globalThis.AudioContext, fetch: globalThis.fetch };
  let ctx, starts = 0;
  const param = () => ({ value: 0, cancelScheduledValues() {}, setTargetAtTime() {} });
  class FakeAudio {
    constructor() { ctx = this; this.state = 'suspended'; this.currentTime = 0; }
    createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
    createDynamicsCompressor() { return { threshold: param(), ratio: param(), connect() {} }; }
    createBuffer(ch, frames) { return { getChannelData: () => new Float32Array(frames) }; }
    createBufferSource() { return { connect() {}, disconnect() {}, start() { starts++; }, stop() {} }; }
    addEventListener() {}
    resume() { return new Promise(resolve => { this.ready = () => { this.state = 'running'; resolve(); }; }); }
  }
  globalThis.AudioContext = FakeAudio;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    for (const cancel of ['none', 'stop', 'mute', 'hidden', 'expired']) {
      starts = 0;
      const sound = createSoundManager({ soundEnabled: true });
      sound.unlock(); sound.effect('select'); sound.effect('select');
      if (cancel === 'stop') sound.stopEffects();
      if (cancel === 'mute') sound.setPreferences({ soundEnabled: false });
      if (cancel === 'hidden') sound.setScene({ hidden: true, music: false, speed: 0 });
      if (cancel === 'expired') await new Promise(resolve => setTimeout(resolve, 300));
      ctx.ready(); await Promise.resolve(); await Promise.resolve();
      assert.equal(starts, cancel === 'none' ? 1 : 0, cancel);
      sound.setScene({ hidden: false, music: false, speed: 0 });
      assert.equal(starts, cancel === 'none' ? 1 : 0, `${cancel}: no stale replay`);
    }
  } finally { globalThis.AudioContext = previous.AudioContext; globalThis.fetch = previous.fetch; }
});
