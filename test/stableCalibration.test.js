import test from 'node:test';
import assert from 'node:assert/strict';
import { createStableCalibration } from '../src/input/stableCalibration.js';

test('1回の値では確定せず、0.5秒の安定した姿勢を平均する', () => {
  const sampler = createStableCalibration();
  for (let i = 0; i < 5; i++) assert.equal(sampler.sample(20 + (i % 2), 10, i * 100), null);
  assert.deepEqual(sampler.sample(21, 10, 500), { beta: 20.5, gamma: 10 });
});
test('持ち替え中は取り直し、最後に安定した姿勢を採用する', () => {
  const sampler = createStableCalibration();
  for (let i = 0; i < 10; i++) assert.equal(sampler.sample(i * 5, i * 3, i * 100), null);
  for (let i = 10; i < 15; i++) assert.equal(sampler.sample(30, 5, i * 100), null);
  assert.deepEqual(sampler.sample(30, 5, 1500), { beta: 30, gamma: 5 });
});
test('センサー値の途切れと無効な値を安定時間に含めない', () => {
  const sampler = createStableCalibration();
  sampler.sample(20, 10, 0); assert.equal(sampler.sample(20, 10, 1000), null);
  assert.equal(sampler.sample(null, 10, 1100), null);
  for (let i = 0; i < 5; i++) assert.equal(sampler.sample(20, 10, 1200 + i * 100), null);
  assert.deepEqual(sampler.sample(20, 10, 1700), { beta: 20, gamma: 10 });
});
test('角度の180度境界をまたいでも平均が反転しない', () => {
  const sampler = createStableCalibration();
  for (let i = 0; i < 5; i++) sampler.sample(i % 2 ? -179 : 179, 0, i * 100);
  assert.deepEqual(sampler.sample(-179, 0, 500), { beta: -180, gamma: 0 });
});
test('中断時のresetで以前の測定時間を捨てる', () => {
  const sampler = createStableCalibration();
  for (let i = 0; i < 5; i++) sampler.sample(20, 10, i * 100);
  sampler.reset(); assert.equal(sampler.sample(20, 10, 500), null);
});
