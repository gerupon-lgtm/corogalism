import { BASE, FLOOR_LAB } from '../config/gameConfig.js';
import { stepPhysics } from '../physics/integrator.js';
import { createFixedCamera } from '../render/camera.js';
import { createTiltVector } from '../input/tiltVector.js';
import { createTiltSource } from '../input/tiltSource.js';
import { createPointerSource } from '../input/pointerSource.js';
import { createFloorLab, applyFloor, FLOOR_OPTIONS, PATCH_CELLS } from './floorModel.js';

import { drawFloorVisuals } from './floorVisuals.js';

const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
const { stage, actor } = createFloorLab();
const settings = { ...FLOOR_LAB }, tilt = createTiltVector();
let type = 'normal', mode = 'pointer', paused = false, last = 0, sensorTimer, requestId = 0;
let camera, won = false, visualTime = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = createPointerSource(canvas);
const sensor = createTiltSource({ onCalibrated: () => { $('status').textContent = '傾き操作中。縦持ちでゆっくり傾けてください。'; } });
const receive = (x, y) => tilt.setRaw(x, y);
function pointerMode(message = '画面操作：盤面の中心から進みたい方向を押し続けてください。') {
  requestId++; clearTimeout(sensorTimer); sensor.stop(); pointer.stop(); tilt.reset();
  mode = 'pointer'; pointer.start(receive); $('calibrate').disabled = true;
  $('status').textContent = message;
}
function scheduleFallback(id) {
  clearTimeout(sensorTimer);
  sensorTimer = setTimeout(() => {
    if (id === requestId && mode === 'tilt' && sensor.needsCalibration)
      pointerMode('傾きを確認できなかったため、画面操作に切り替えました。再度「傾きで遊ぶ」から試せます。');
  }, 6000);
}
$('sensor').onclick = async () => {
  const id = ++requestId;
  const permission = await sensor.requestPermission();
  if (id !== requestId) return;
  if (permission === 'denied' || permission === 'unsupported') { pointerMode('センサーを利用できないため、画面操作で遊べます。'); return; }
  pointer.stop(); tilt.reset(); mode = 'tilt'; sensor.calibrate();
  sensor.start(receive, () => BASE.maxTiltAngleDeg);
  $('calibrate').disabled = false;
  $('status').textContent = '縦持ちで遊ぶ姿勢のまま、少し静止してください。';
  scheduleFallback(id);
};
$('pointer').onclick = () => pointerMode();
$('calibrate').onclick = () => { tilt.reset(); sensor.calibrate(); $('status').textContent = '今の姿勢で少し静止してください。'; scheduleFallback(requestId); };
function reset(x = 0.5, y = 0.5) { Object.assign(actor, { x, y, vx: 0, vy: 0 }); tilt.reset(); won = false; }
$('reset').onclick = () => reset();
$('plaza').onclick = () => reset(2.7, 5.7);
$('pause').onclick = () => { paused = !paused; tilt.reset(); $('pause').textContent = paused ? '再開' : '一時停止'; };
function updateFloor() {
  applyFloor(stage, type, settings);
  $('hint').textContent = FLOOR_OPTIONS[type].hint;
  for (const button of $('floors').children) button.setAttribute('aria-pressed', String(button.dataset.type === type));
  for (const key of Object.keys(settings)) { $(key).value = settings[key]; $(key + '-value').textContent = settings[key].toFixed(2); }
}
for (const [key, option] of Object.entries(FLOOR_OPTIONS)) {
  const button = document.createElement('button'); button.textContent = option.name; button.dataset.type = key;
  button.onclick = () => { type = key; updateFloor(); reset(); };
  $('floors').append(button);
}
for (const key of Object.keys(settings)) $(key).oninput = () => { settings[key] = Number($(key).value); updateFloor(); };
$('defaults').onclick = () => { Object.assign(settings, FLOOR_LAB); updateFloor(); reset(); };
$('copy').onclick = async () => {
  const text = JSON.stringify({ page: 'corogalism-floor-lab', revision: 2, floor: type, mode, ...settings }, null, 2);
  $('settings-text').hidden = false; $('settings-text').value = text;
  try { await navigator.clipboard.writeText(text); $('copy-status').textContent = 'コピーしました。この設定と感想を送ってください。'; }
  catch { $('settings-text').focus(); $('settings-text').select(); $('copy-status').textContent = '下の設定値を選択してコピーしてください。'; }
};
function resize() {
  const width = canvas.getBoundingClientRect().width;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr); canvas.height = canvas.width;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); camera = createFixedCamera(stage, width);
  draw(performance.now());
}
new ResizeObserver(resize).observe(canvas);
function circle(x, y, radius, color, stroke = false) {
  const p = camera.toScreen(x, y); ctx.beginPath(); ctx.arc(p.px, p.py, camera.toPx(radius), 0, Math.PI * 2);
  if (stroke) { ctx.strokeStyle = color; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
}
function label(text, x, y, color = '#73634e') {
  const p = camera.toScreen(x, y); ctx.fillStyle = color; ctx.font = `${camera.toPx(.22)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(text, p.px, p.py);
}
function draw(now) {
  if (!camera) resize();
  ctx.clearRect(0, 0, camera.viewportPx, camera.viewportPx);
  ctx.fillStyle = '#fff5e1'; ctx.fillRect(0, 0, camera.viewportPx, camera.viewportPx);
  ctx.lineWidth = 1;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const p = camera.toScreen(x, y); ctx.strokeStyle = '#e8ddc8'; ctx.strokeRect(p.px, p.py, camera.toPx(1), camera.toPx(1));
  }
  drawFloorVisuals(ctx, camera, { type, settings, actor, time: visualTime, reduced: reducedMotion.matches });
  for (const wall of stage.walls) { const p = camera.toScreen(wall.x, wall.y); ctx.fillStyle = '#ab865f'; ctx.fillRect(p.px, p.py, camera.toPx(wall.w), camera.toPx(wall.h)); }
  circle(5.5, .5, .34, '#618c6b'); label('GOAL', 5.5, .57, '#fff');
  label('START', .6, .5); label('広場', 4.5, 6.6);
  const p = camera.toScreen(actor.x, actor.y), r = camera.toPx(actor.r);
  const gradient = ctx.createRadialGradient(p.px - r * .3, p.py - r * .4, r * .08, p.px, p.py, r);
  gradient.addColorStop(0, '#fff'); gradient.addColorStop(.3, '#a6dccd'); gradient.addColorStop(1, '#326754');
  circle(actor.x, actor.y, actor.r, gradient);
  if (paused) label('一時停止中', 3.5, 3.2, '#44382c');
}
function frame(now) {
  const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
  if (!paused && !document.hidden && !(mode === 'tilt' && sensor.needsCalibration)) {
    visualTime += dt * 1000;
    // 描画頻度による操作差を抑え、小さい刻みで既存の物理を進める。
    const count = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < count; i++) { tilt.update(dt / count, BASE.inputSmoothing); stepPhysics({ actor, stage, tilt: tilt.value, base: BASE, dt: dt / count }); }
    if (!won && Math.hypot(actor.x - 5.5, actor.y - .5) < .35) { won = true; $('status').textContent = 'ゴール！ スタートへ戻るか、ほかの床でも試してみよう。'; }
  }
  draw(now); requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { tilt.reset(); last = 0; if (document.hidden) { paused = true; $('pause').textContent = '再開'; } });
window.addEventListener('blur', () => { tilt.reset(); paused = true; $('pause').textContent = '再開'; });
pointerMode(); updateFloor(); requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has('debug')) window.__floorLab = { stage, actor, settings, get type() { return type; }, get mode() { return mode; } };
