import test from 'node:test';
import assert from 'node:assert/strict';
import { createFloorLab, applyFloor as applyActualFloor } from '../src/lab/floorModel.js';
import { sampleZone } from '../src/world/stage.js';
import { BASE, FLOOR_LAB } from '../src/config/gameConfig.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { checkReachability } from '../src/maze/validator.js';
import { PATTERNS } from '../src/lab/floorModel.js';
import { resolveParams } from '../src/physics/resolveParams.js';

test('複合パターンは同一迷路・安全壁で床の対比と方向に沿う力を配置', () => {
  const {stage, actor} = createFloorLab();
  const maze = JSON.stringify(stage.maze);
  for (const pattern of Object.keys(PATTERNS)) {
    applyActualFloor(stage, 'normal', FLOOR_LAB, pattern);
    assert.equal(JSON.stringify(stage.maze), maze);
    assert.ok(stage.walls.every(w=>w.materialId===(pattern==='timeTrial'?'default':'rubber')));
    if (pattern==='iceRubber') assert.equal(stage.zones[0].cells.length,49);
    if (pattern==='iceSand') {
      assert.equal(stage.zones.length,2);
      assert.equal(new Set(stage.zones.flatMap(z=>z.cells.map(c=>`${c.x},${c.y}`))).size,49);
      assert.ok(stage.zones.every(z=>z.cells.length>0));
    }
    for (const site of stage.labSites) {
      Object.assign(actor,{x:site.cell.x+.5,y:site.cell.y+.5,vx:0,vy:0});
      const z=sampleZone(stage,actor);
      assert.ok(z.forceX*site.dx+z.forceY*site.dy<0, pattern);
      const p=resolveParams({base:BASE,character:actor.character,zone:z});
      assert.ok(p.accel>Math.hypot(p.forceX,p.forceY));
      if(pattern.startsWith('ice')) {
        assert.equal(z.frictionK,FLOOR_LAB.ice);
        assert.equal(stage.zones.filter(z=>z.kind==='radial').length,1);
        assert.equal(stage.zones.find(z=>z.kind==='ice').cells.length,4);
        actor.vx=3;
        assert.ok(sampleZone(stage,actor).accelK<.5);
      }
    }
  }
});
// 摩擦・慣性・単一の力場の検証は壁のない床で分離して測る。
function applyFloor(stage, type, settings) {
  stage.walls = [];
  applyActualFloor(stage, type, settings);
  if (type === 'gravity' || type === 'repulsion') stage.zones = stage.zones.filter(z => z.x === 4.5 && z.y === 4.5);
}


test('氷は逆入力後も滑り、減速してから反転する。速いほど停止距離が長い', () => {
  function brake(type, speed) {
    const { stage, actor } = createFloorLab(); applyFloor(stage, type, FLOOR_LAB);
    Object.assign(actor, { x: 3.1, y: 4.5, vx: speed, vy: 0 });
    let time = 0;
    while (actor.vx > 0 && time < 2) {
      stepPhysics({ actor, stage, tilt: { x: -1, y: 0 }, base: BASE, dt: 1 / 240 });
      time += 1 / 240;
    }
    assert.ok(actor.vx <= 0);
    return { time, distance: actor.x - 3.1 };
  }
  const normal = brake('normal', 3), slow = brake('ice', 1.5), fast = brake('ice', 3);
  assert.ok(fast.time > normal.time * 2);
  assert.ok(fast.distance > normal.distance * 2);
  assert.ok(fast.time > slow.time);
  assert.ok(fast.distance > slow.distance * 2);
});

test('氷の発進は通常と同じ加速度で始まり、斜め入力時には横滑りを残す', () => {
  const { stage, actor } = createFloorLab(); applyFloor(stage, 'ice', FLOOR_LAB);
  Object.assign(actor, { x: 3.5, y: 4.5, vx: 0, vy: 0 });
  assert.equal(sampleZone(stage, actor).accelK, 1);
  Object.assign(actor, { vx: 3, vy: 0 });
  for (let i = 0; i < 24; i++) stepPhysics({ actor, stage, tilt: { x: 0, y: -1 }, base: BASE, dt: 1 / 240 });
  assert.ok(actor.vx > 2.8);
  assert.ok(actor.vy < 0 && actor.vy > -1);
  applyActualFloor(stage, 'normal', FLOOR_LAB);
  assert.equal(sampleZone(stage, actor).accelK, 1);
});

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
  assert.ok(distances[0] > distances[1] * 1.1);
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


test('固定迷路は全壁ゴム・全面床で、切替後も同じ迷路を使う', () => {
  const { stage } = createFloorLab();
  const before = JSON.stringify(stage.maze);
  assert.ok(stage.walls.every(w => w.materialId === 'rubber'));
  assert.ok(stage.maze.turns > 5);
  for (const type of ['ice', 'sand']) {
    applyActualFloor(stage, type, FLOOR_LAB);
    assert.equal(stage.zones[0].cells.length, 49);
    for (let y=0;y<7;y++) for(let x=0;x<7;x++) {
      assert.equal(sampleZone(stage,{x:x+.5,y:y+.5,vx:0,vy:0}).frictionK,FLOOR_LAB[type]);
    }
  }
  applyActualFloor(stage,'gravity',FLOOR_LAB);
  assert.equal(stage.zones.length,16);
  for(let y=.2;y<7;y+=.25) for(let x=.2;x<7;x+=.25) {
    const z=sampleZone(stage,{x,y});
    assert.ok(Math.hypot(z.forceX,z.forceY)<=FLOOR_LAB.force+1e-9);
  }
  assert.equal(JSON.stringify(stage.maze),before);
});


test('タイムトライアルは角の手前だけ砂、角と残りの床は氷、壁は通常', () => {
  const {stage} = createFloorLab();
  applyActualFloor(stage,'normal',FLOOR_LAB,'timeTrial');
  const sand=stage.zones.find(z=>z.kind==='sand').cells;
  assert.equal(sand.length,3);
  for(const cell of sand) {
    const i=stage.maze.path.findIndex(p=>p.x===cell.x&&p.y===cell.y);
    const corner=stage.maze.path[i+1], next=stage.maze.path[i+2];
    assert.notEqual((corner.x-cell.x)*(next.y-corner.y),(corner.y-cell.y)*(next.x-corner.x));
    assert.ok(!sand.some(p=>p.x===corner.x&&p.y===corner.y));
  }
  assert.equal(stage.zones.find(z=>z.kind==='ice').cells.length,46);
  assert.ok(stage.walls.every(w=>w.materialId==='default'));
  applyActualFloor(stage,'ice',FLOOR_LAB,'single');
  assert.ok(stage.walls.every(w=>w.materialId==='rubber'));
});
