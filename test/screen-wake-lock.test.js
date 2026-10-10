import test from 'node:test';
import assert from 'node:assert/strict';
import { createScreenWakeLock } from '../src/input/screenWakeLock.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function sentinel() {
  const value = new EventTarget();
  value.released = false;
  value.releases = 0;
  value.release = async () => {
    value.releases += 1;
    value.released = true;
    value.dispatchEvent(new Event('release'));
  };
  return value;
}
function environment(request = async () => sentinel()) {
  const doc = new EventTarget(), win = new EventTarget(), calls = [];
  doc.hidden = false;
  const control = createScreenWakeLock({
    document: doc, window: win,
    navigator: { wakeLock: { request: kind => { calls.push(kind); return request(); } } },
  });
  return { control, doc, win, calls };
}

test('開始前は要求せず、開始から停止まで1個だけ保持する', async () => {
  const lock = sentinel(), { control, calls } = environment(async () => lock);
  assert.deepEqual(calls, []);
  await control.setActive(true);
  for (let frame = 0; frame < 180; frame++) await control.setActive(true);
  assert.deepEqual(calls, ['screen']);
  assert.equal(control.state.held, true);
  await control.setActive(false);
  assert.equal(lock.releases, 1);
  assert.equal(control.state.held, false);
  await control.dispose();
});

test('一時停止から再開すると新しく取得する', async () => {
  const { control, calls } = environment();
  await control.setActive(true);
  await control.setActive(false);
  await control.setActive(true);
  assert.equal(calls.length, 2);
  assert.equal(control.state.held, true);
  await control.dispose();
});

test('非表示では解除し、表示に戻った時に有効なら取り直す', async () => {
  const first = sentinel(), { control, doc, calls } = environment(async () => calls.length === 1 ? first : sentinel());
  await control.setActive(true);
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(first.released, true);
  assert.equal(control.state.held, false);
  doc.hidden = false;
  doc.dispatchEvent(new Event('visibilitychange'));
  await settle();
  assert.equal(calls.length, 2);
  await control.dispose();
});

test('非表示中に一時停止したら、戻っても再開操作まで取得しない', async () => {
  const { control, doc, calls } = environment();
  await control.setActive(true);
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  await control.setActive(false);
  doc.hidden = false;
  doc.dispatchEvent(new Event('visibilitychange'));
  await settle();
  assert.equal(calls.length, 1);
  await control.setActive(true);
  assert.equal(calls.length, 2);
  await control.dispose();
});

test('取得中に停止すると、遅れて返ったロックも解除する', async () => {
  const waiting = deferred(), lock = sentinel(), { control, calls } = environment(() => waiting.promise);
  const start = control.setActive(true);
  await settle();
  void control.setActive(false);
  waiting.resolve(lock);
  await start;
  assert.equal(calls.length, 1);
  assert.equal(lock.releases, 1);
  assert.equal(control.state.held, false);
  await control.dispose();
});

test('取得中に非表示になると、遅れて返ったロックも解除する', async () => {
  const waiting = deferred(), lock = sentinel(), { control, doc } = environment(() => waiting.promise);
  const start = control.setActive(true);
  await settle();
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  waiting.resolve(lock);
  await start;
  assert.equal(lock.released, true);
  assert.equal(control.state.held, false);
  await control.dispose();
});

test('遅れた取得の解除を待つ間に再開しても、取得し直せる', async () => {
  const requestWait = deferred(), releaseWait = deferred(), first = sentinel();
  first.release = async () => { await releaseWait.promise; first.released = true; };
  const { control, calls } = environment(() => calls.length === 1 ? requestWait.promise : Promise.resolve(sentinel()));
  const start = control.setActive(true);
  await settle();
  void control.setActive(false);
  requestWait.resolve(first);
  await settle();
  void control.setActive(true);
  releaseWait.resolve();
  await start;
  await settle();
  assert.equal(calls.length, 2);
  assert.equal(control.state.held, true);
  await control.dispose();
});

test('取得拒否を毎フレーム繰り返さず、再開で再試行できる', async () => {
  const { control, calls } = environment(async () => { throw new DOMException('Denied', 'NotAllowedError'); });
  await control.setActive(true);
  for (let frame = 0; frame < 180; frame++) await control.setActive(true);
  assert.equal(calls.length, 1);
  assert.equal(control.state.lastError, 'NotAllowedError');
  await control.setActive(false);
  await control.setActive(true);
  assert.equal(calls.length, 2);
  await control.dispose();
});

test('OSによる解除を即座に取り直し続けない', async () => {
  const first = sentinel(), { control, calls } = environment(async () => first);
  await control.setActive(true);
  await first.release();
  for (let frame = 0; frame < 180; frame++) await control.setActive(true);
  assert.equal(control.state.held, false);
  assert.equal(calls.length, 1);
  await control.dispose();
});

test('画面の退出で解除し、戻れば有効な時だけ取り直す', async () => {
  const { control, win, calls } = environment();
  await control.setActive(true);
  win.dispatchEvent(new Event('pagehide'));
  assert.equal(control.state.held, false);
  win.dispatchEvent(new Event('pageshow'));
  await settle();
  assert.equal(calls.length, 2);
  await control.dispose();
  win.dispatchEvent(new Event('pageshow'));
  await control.setActive(true);
  assert.equal(calls.length, 2);
});

test('非対応でも開始・停止を失敗させない', async () => {
  const control = createScreenWakeLock({ navigator: {}, document: new EventTarget(), window: new EventTarget() });
  await control.setActive(true);
  assert.equal(control.state.supported, false);
  assert.equal(control.state.held, false);
  await control.setActive(false);
  await control.dispose();
});

test('破棄後に取得が返った場合も解除して保持しない', async () => {
  const waiting = deferred(), lock = sentinel(), { control } = environment(() => waiting.promise);
  const start = control.setActive(true);
  await settle();
  void control.dispose();
  waiting.resolve(lock);
  await start;
  assert.equal(lock.released, true);
  assert.equal(control.state.held, false);
});
