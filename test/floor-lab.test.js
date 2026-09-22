import test from 'node:test';
import assert from 'node:assert/strict';
import { createFloorLab, applyFloor } from '../src/lab/floorModel.js';
import { sampleZone } from '../src/world/stage.js';
import { BASE, FLOOR_LAB } from '../src/config/gameConfig.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { checkReachability } from '../src/maze/validator.js';

test('おためし固定コースは全セル到達可能', () => {
  assert.equal(checkReachability(createFloorLab().stage.maze).ok, true);
});
test('同じ初速の球は氷、通常、砂の順に遠くまで滑る', () => {
  const distances = ['ice', 'normal', 'sand'].map(type => {
    const { stage, actor } = createFloorLab(); applyFloor(stage, type, FLOOR_LAB);
    Object.assign(actor, { x: 3.3, y: 4.5, vx: 2, vy: 0 });
    for (let i = 0; i < 60; i++) stepPhysics({ actor, stage, tilt: { x: 0, y: 0 }, base: BASE, dt: 1 / 120 });
    return actor.x - 3.3;
  });
  assert.ok(distances[0] > distances[1] * 1.4);
  assert.ok(distances[1] > distances[2] * 1.4);
});
test('重力と反重力は接近・通過の力が逆、中心と範囲外は力なし', () => {
  for (const type of ['gravity', 'repulsion']) {
    const { stage } = createFloorLab(); applyFloor(stage, type, FLOOR_LAB);
    const sign = type === 'gravity' ? 1 : -1;
    assert.ok(sampleZone(stage, { x: 3.5, y: 4.5 }).forceX * sign > 0);
    assert.ok(sampleZone(stage, { x: 5.5, y: 4.5 }).forceX * sign < 0);
    for (const x of [4.5, 1, 7]) assert.equal(Math.abs(sampleZone(stage, { x, y: 4.5 }).forceX), 0);
    for (let x = 2; x < 7; x += .01) {
      const force = sampleZone(stage, { x, y: 4.5 });
      assert.ok(Math.hypot(force.forceX, force.forceY) <= FLOOR_LAB.force + 1e-9);
    }
  }
});
test('広場の横をかすめる球は引力で内側、斥力で外側に曲がる', () => {
  for (const type of ['gravity', 'repulsion']) {
    const { stage, actor } = createFloorLab(); applyFloor(stage, type, FLOOR_LAB);
    Object.assign(actor, { x: 3.5, y: 5.1, vx: 2, vy: 0 });
    for (let i = 0; i < 30; i++) stepPhysics({ actor, stage, tilt: { x: 0, y: 0 }, base: BASE, dt: 1 / 120 });
    assert.ok(type === 'gravity' ? actor.y < 5.1 : actor.y > 5.1);
    applyFloor(stage, 'normal', FLOOR_LAB); assert.equal(stage.zones.length, 0);
  }
});
