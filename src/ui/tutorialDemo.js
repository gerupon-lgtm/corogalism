/** 説明用の短い見本。実際の球・壁・入力や物理時間には触れない。 */
import { drawToyWall, drawToyFloor } from '../render/toyWorld.js';
import { drawToyCandy } from '../render/toyCandy.js';
import { drawLeaf, drawFeatureFloors, drawGuard } from '../render/toyFeatures.js';
import { drawHourglass } from '../render/toyHourglass.js';
import { createToyBall } from '../render/toyBall.js';
import { drawRackets } from '../render/movingWalls.js';
import { drawFloorVisuals } from '../render/floorVisuals.js';
import { REST, RECOVERY } from '../config/gameConfig.js';

const states = new WeakMap();
const camera = { toScreen: (x, y) => ({ px: x, py: y }), toPx: n => n };
const floorCamera = { toPx: n => n * 40 };
const clamp = n => Math.max(0, Math.min(1, n));
const lerp = (a, b, t) => a + (b - a) * clamp(t);
const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const walls = new Set(['default', 'rubber', 'cork', 'stone', 'spike', 'moss', 'cotton']);

function line(c, points, { color = '#fff1d2', dashed = true, alpha = .65 } = {}) {
  c.save(); c.strokeStyle = color; c.globalAlpha = alpha; c.lineWidth = 1.8;
  c.setLineDash(dashed ? [3, 4] : []); c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.stroke(); c.restore();
}

function arrow(c, from, to, color = '#fff1d2') {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  line(c, [from, to], { color, dashed: false, alpha: .9 });
  c.save(); c.fillStyle = color; c.beginPath(); c.moveTo(...to);
  for (const side of [-.55, .55]) c.lineTo(to[0] - 5 * Math.cos(angle + side), to[1] - 5 * Math.sin(angle + side));
  c.closePath(); c.fill(); c.restore();
}

function pathPoint(points, progress) {
  const position = clamp(progress) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(position)), t = position - index;
  return { x: lerp(points[index][0], points[index + 1][0], t), y: lerp(points[index][1], points[index + 1][1], t) };
}

function drawBall(c, state, position, alpha = 1) {
  // 見返し・再生・独立canvasでも同じ時刻の絵を揃える。球の回転を描画履歴に依存させない。
  const actor = { x: 0, y: 0, r: 7 }; state.ball.update(actor);
  const steps = Math.max(1, Math.ceil(Math.hypot(position.x, position.y) / (actor.r * 2)));
  for (let i = 1; i <= steps; i++) {
    actor.x = position.x * i / steps; actor.y = position.y * i / steps; state.ball.update(actor);
  }
  c.save(); c.globalAlpha = alpha; state.ball.draw(c, position.x, position.y, 7); c.restore();
}

function meter(c, progress) {
  c.save(); c.fillStyle = '#12291d'; c.beginPath(); c.roundRect(10, 10, 38, 5, 2); c.fill();
  c.fillStyle = '#b5d78b'; c.beginPath(); c.roundRect(11, 11, 36 * clamp(progress), 3, 1); c.fill(); c.restore();
}

function drawPhone(c, kind, direction, time, reducedMotion) {
  // 見本内の操作。実プレイの次の一手とは独立させる。
  if (kind === 'gate') direction = time < 1800 ? { x: 1, y: 0 }
    : time < 2500 ? { x: -1, y: 0 } : time < 3800 ? { x: 0, y: -1 } : { x: 0, y: 0 };
  if (kind === 'racket') direction = time >= 3000 && time < 3500 ? { x: 0, y: 1 } : { x: 0, y: 0 };
  const x = Number.isFinite(direction?.x) ? Math.max(-1, Math.min(1, direction.x)) : 0;
  const y = Number.isFinite(direction?.y) ? Math.max(-1, Math.min(1, direction.y)) : 0;
  const strength = reducedMotion ? 1 : ease(time / 450);
  c.save(); c.translate(71, 98); c.rotate(x * .28 * strength); c.scale(1, 1 - Math.abs(y) * .22 * strength);
  c.fillStyle = '#70451f'; c.beginPath(); c.roundRect(-8, -11, 16, 23, 3); c.fill();
  c.fillStyle = '#fff1d2'; c.beginPath(); c.roundRect(-6, -9, 12, 17, 1.5); c.fill();
  c.fillStyle = '#a077b5'; c.beginPath(); c.arc(0, 10, 1, 0, Math.PI * 2); c.fill(); c.restore();
  const length = Math.hypot(x, y);
  if (length > .08) arrow(c, [98 - x / length * 6, 98 - y / length * 6], [98 + x / length * 8, 98 + y / length * 8], '#70451f');
  else line(c, [[90, 98], [106, 98]], { color: '#70451f', dashed: false, alpha: 1 });
}

function wallScene(c, state, kind, time) {
  drawToyWall(c, { x: 123, y: 10, w: 11, h: 62, materialId: kind }, camera);
  const ends = { rubber: [22, 16], cork: [57, 24], stone: [88, 34], spike: [43, 20], moss: [98, 37], cotton: [115, 17], default: [57, 24] };
  const start = [19, 65], hit = [115, 42], end = ends[kind];
  line(c, [start, hit, end]); arrow(c, hit, end);
  const position = time < 1700 ? pathPoint([start, hit], time / 1700) : pathPoint([hit, end], ease((time - 1700) / 1900));
  drawBall(c, state, position);
}

function floorScene(c, state, kind, time, reducedMotion) {
  let points, position;
  const radial = ['gravity', 'repulsion'].includes(kind);
  const zones = radial ? [{ kind: 'radial', x: 2.1, y: .95, radius: .85, strength: kind === 'gravity' ? 6 : -6 }]
    : [{ kind, cells: Array.from({ length: 8 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4) })) }];
  if (radial) {
    points = kind === 'gravity' ? [[16, 65], [47, 58], [73, 43], [94, 22], [125, 19]] : [[16, 40], [44, 43], [64, 64], [96, 69], [127, 64]];
    position = pathPoint(points, ease(time / 3700));
  } else {
    points = [[18, 45], [127, 45]];
    const travel = kind === 'ice' ? clamp(time / 3800) : .72 * (1 - Math.exp(-time / 900));
    position = pathPoint(points, travel);
  }
  const actor = { x: position.x / 40, y: position.y / 40, r: 7 / 40, vx: kind === 'sand' ? .8 : 0, vy: 0 };
  drawFloorVisuals(c, floorCamera, { stage: { zones }, actor, time, reduced: reducedMotion, settings: { force: 6 } });
  line(c, points); arrow(c, points.at(-2), points.at(-1)); drawBall(c, state, position);
}

function racketScene(c, state, time) {
  const edge = time >= 3000, local = edge ? time - 3000 : time;
  const hit = [97, 41], end = edge ? [32, 13] : [24, 41];
  const wall = { id: 'demo-racket', x: 105, y: edge ? lerp(19, 35, ease(local / 500)) : 19, w: 9, h: 44, axis: 'y', min: 13, max: 35, bounce: 'aim' };
  drawRackets(c, camera, { rackets: [wall] }, new Map(), 0);
  line(c, [[22, 41], hit]); line(c, [hit, [24, 41]], { alpha: edge ? .25 : .65 });
  line(c, [hit, [32, 13]], { alpha: edge ? .8 : .25 }); arrow(c, hit, end);
  if (edge) arrow(c, [125, 24], [125, 46], '#d9b9e9');
  const position = local < 1250 ? pathPoint([[22, 41], hit], local / 1250) : pathPoint([hit, end], ease((local - 1250) / 1400));
  drawBall(c, state, position);
}

function gateScene(c, state, time) {
  const open = ease(time / 1800);
  const gateX = time < 1800 ? lerp(49, 96, open) : lerp(96, 90, ease((time - 1800) / 700));
  for (const [x, w] of [[4, 45], [96, 44]]) drawToyWall(c, { x, y: 34, w, h: 11, materialId: 'cork' }, camera);
  c.save(); c.globalAlpha = .25;
  drawRackets(c, camera, { rackets: [{ id: 'demo-closed', x: 49, y: 34, w: 43, h: 11, axis: 'x', min: 49, max: 96, bounce: 'reflect' }] }, new Map(), 0); c.restore();
  drawRackets(c, camera, { rackets: [{ id: 'demo-gate', x: gateX, y: 34, w: 43, h: 11, axis: 'x', min: 49, max: 96, bounce: 'reflect', label: '1' }] }, new Map(), 0);
  arrow(c, [59, 23], [96, 23], '#d9b9e9'); line(c, [[70, 68], [70, 15]]);
  const position = time < 1800 ? { x: lerp(62, 76, open), y: 68 }
    : time < 2500 ? { x: lerp(76, 70, ease((time - 1800) / 700)), y: 68 }
      : { x: 70, y: lerp(68, 15, ease((time - 2500) / 1300)) };
  drawBall(c, state, position);
}

function featureScene(c, state, kind, time, reducedMotion) {
  const rest = kind === 'rest', progress = clamp((time - 1300) / 2400);
  const releases = clamp((time - 2700) / 900);
  const shrink = time < 1800 ? 1 : time < 2300 ? .7 : time < 2700 ? .4 : 0;
  c.save(); c.translate(76, 43);
  if (!rest) c.scale(shrink, shrink);
  drawFeatureFloors(c, { rest: rest ? { x: 0, y: 0, used: false, progress: REST.durationSec * progress } : null, sticky: rest ? [] : [{ x: 0, y: 0 }] }, { toScreen: () => ({ px: 0, py: 0 }), toPx: n => n * 54 });
  c.restore();
  line(c, [[17, 43], [76, 43], [126, 43]]);
  const x = time < 1300 ? lerp(17, 76, ease(time / 1300)) : rest ? 76 : lerp(76, 126, ease(releases));
  drawBall(c, state, { x, y: 43 });
  if (rest) meter(c, .4 + progress * REST.healRatio);
  else {
    for (const tapAt of [1800, 2300]) {
      const age = reducedMotion ? .45 : (time - tapAt) / 400;
      if (age < 0 || age > 1) continue;
      c.save(); c.strokeStyle = '#fff1d2'; c.globalAlpha = 1 - age * .7; c.lineWidth = 2;
      c.beginPath(); c.arc(tapAt === 1800 ? 101 : 115, 66, 3 + age * 5, 0, Math.PI * 2); c.stroke(); c.restore();
    }
  }
}

function itemScene(c, state, kind, time) {
  const collected = ease((time - 1500) / 450), x = lerp(18, 125, ease(time / 3600));
  line(c, [[18, 43], [125, 43]]);
  // 取った後も薄い元位置を残し、停止した見本から対象が分かるようにする。
  c.save(); c.globalAlpha = 1 - collected * .7;
  if (kind === 'candy') drawToyCandy(c, 76, 43, 23, 0, true);
  if (kind === 'leaf') drawLeaf(c, 76, 43, 18);
  if (kind === 'hourglass') drawHourglass(c, 76, 43, 19);
  c.restore();
  if (kind === 'candy') meter(c, .4 + RECOVERY.healRatio * collected);
  if (kind === 'leaf') drawGuard(c, x, 43, 7, collected);
  if (kind === 'hourglass') {
    c.save(); c.strokeStyle = '#fff1d2'; c.lineWidth = 2;
    c.beginPath(); c.arc(26, 19, 8, -Math.PI / 2, -Math.PI / 2 + (1 + collected) * Math.PI); c.stroke();
    line(c, [[26, 14], [26, 19], [30, 19]], { dashed: false, alpha: 1 }); c.restore();
  }
  drawBall(c, state, { x, y: 43 });
}

/** 一度だけ再生し、末尾で静止。elapsedMsの管理と再生操作は呼び出し元が担当する。 */
export function drawTutorialDemo(canvas, { kind = 'roll', elapsedMs = 0, direction = { x: 1, y: 0 }, reducedMotion = false } = {}) {
  if (canvas.width !== 144) canvas.width = 144;
  if (canvas.height !== 112) canvas.height = 112;
  const c = canvas.getContext('2d');
  if (!c || c.isContextLost?.()) return;
  let state = states.get(canvas);
  if (!state) { state = { ball: createToyBall() }; states.set(canvas, state); }
  const duration = kind === 'racket' ? 6000 : 4000;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const stillTime = kind === 'racket' ? 5100 : kind === 'sticky' ? 2450 : 2700;
  const time = reducedMotion ? stillTime : Math.min(duration, elapsed);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 144, 112);
  c.save(); c.beginPath(); c.roundRect(2, 2, 140, 79, 10); c.clip();
  drawToyFloor(c, { maze: { size: 4 } }, { toScreen: (x, y) => ({ px: x * 40, py: y * 40 }), toPx: n => n * 40 }, 144, false);
  if (walls.has(kind)) wallScene(c, state, kind, time);
  else if (['ice', 'sand', 'gravity', 'repulsion'].includes(kind)) floorScene(c, state, kind, time, reducedMotion);
  else if (kind === 'racket') racketScene(c, state, time);
  else if (kind === 'gate') gateScene(c, state, time);
  else if (['rest', 'sticky'].includes(kind)) featureScene(c, state, kind, time, reducedMotion);
  else if (['candy', 'leaf', 'hourglass'].includes(kind)) itemScene(c, state, kind, time);
  else {
    const dx = Number.isFinite(direction?.x) ? direction.x : 1, dy = Number.isFinite(direction?.y) ? direction.y : 0;
    const length = Math.hypot(dx, dy) || 1, x = dx / length, y = dy / length;
    const points = [[72 - 48 * x, 42 - 27 * y], [72 + 48 * x, 42 + 27 * y]];
    line(c, points); arrow(c, points[0], points[1]); drawBall(c, state, pathPoint(points, ease(time / 3600)));
  }
  c.restore();
  c.strokeStyle = '#809578'; c.lineWidth = 1; c.beginPath(); c.roundRect(2.5, 2.5, 139, 78, 10); c.stroke();
  drawPhone(c, kind, direction, time, reducedMotion); c.restore();
}
