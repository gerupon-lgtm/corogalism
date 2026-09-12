import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveParams } from '../src/physics/resolveParams.js';
import { BASE, CLAMP } from '../src/config/gameConfig.js';
import { MATERIALS } from '../src/world/materials.js';
import { CHARACTERS } from '../src/world/characters.js';

const NEUTRAL = { frictionK: 1, restitutionK: 1, accelK: 1, forceX: 0, forceY: 0 };

test('係数が全部1.0なら基準値がそのまま返る', () => {
  const p = resolveParams({
    base: BASE,
    character: NEUTRAL,
    material: NEUTRAL,
    zone: NEUTRAL,
  });
  assert.equal(p.accel, BASE.tiltSensitivity);
  assert.equal(p.friction, BASE.friction);
  assert.equal(p.restitution, BASE.wallRestitution);
  assert.equal(p.forceX, 0);
  assert.equal(p.forceY, 0);
});

test('フェーズ1の既定（default素材・defaultキャラ）でも基準値どおり', () => {
  const p = resolveParams({
    base: BASE,
    character: CHARACTERS.default,
    material: MATERIALS.default,
    zone: NEUTRAL,
  });
  assert.equal(p.accel, BASE.tiltSensitivity);
  assert.equal(p.friction, BASE.friction);
  assert.equal(p.restitution, BASE.wallRestitution);
});

test('material / zone を省略しても全係数1.0と同じ結果になる', () => {
  const a = resolveParams({ base: BASE, character: CHARACTERS.default });
  const b = resolveParams({
    base: BASE,
    character: CHARACTERS.default,
    material: NEUTRAL,
    zone: NEUTRAL,
  });
  assert.deepEqual(a, b);
});

test('係数を掛け合わせた実効値が下限を割るとクランプされる', () => {
  const p = resolveParams({
    base: BASE,
    character: { ...NEUTRAL, frictionK: 0.01 },
    material: { ...NEUTRAL, frictionK: 0.01 },
    zone: NEUTRAL,
  });
  // 2.5 * 0.01 * 0.01 = 0.00025 → 下限
  assert.equal(p.friction, CLAMP.friction.min);
});

test('係数を掛け合わせた実効値が上限を超えるとクランプされる', () => {
  const p = resolveParams({
    base: BASE,
    character: { ...NEUTRAL, frictionK: 4 },
    material: { ...NEUTRAL, frictionK: 4 },
    zone: NEUTRAL,
  });
  // 2.5 * 4 * 4 = 40 → 上限
  assert.equal(p.friction, CLAMP.friction.max);
});

test('反発の上限を超える組み合わせがクランプされる', () => {
  const p = resolveParams({
    base: BASE,
    character: { ...NEUTRAL, restitutionK: 2 },
    material: { ...NEUTRAL, restitutionK: 2 },
    zone: NEUTRAL,
  });
  // 0.35 * 2 * 2 = 1.4 → 上限 0.7
  assert.equal(p.restitution, CLAMP.restitution.max);
});

test('加速の実効値もクランプされる（上下とも）', () => {
  const hi = resolveParams({ base: BASE, character: { ...NEUTRAL, accelK: 10 } });
  assert.equal(hi.accel, CLAMP.accel.max);
  const lo = resolveParams({ base: BASE, character: { ...NEUTRAL, accelK: 0.01 } });
  assert.equal(lo.accel, CLAMP.accel.min);
});

test('ゾーンの外力はそのまま渡る（クランプ対象外）', () => {
  const p = resolveParams({
    base: BASE,
    character: NEUTRAL,
    material: NEUTRAL,
    zone: { ...NEUTRAL, forceX: 3, forceY: -2 },
  });
  assert.equal(p.forceX, 3);
  assert.equal(p.forceY, -2);
});

test('base が無ければ例外', () => {
  assert.throws(() => resolveParams({}));
  assert.throws(() => resolveParams());
});
