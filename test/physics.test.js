import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze } from '../src/maze/generator.js';
import { createStage, createActor, sampleMaterial, sampleZone } from '../src/world/stage.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { getCharacter } from '../src/world/characters.js';
import { MATERIALS } from '../src/world/materials.js';
import { BASE, TUNING } from '../src/config/gameConfig.js';

function setup(seed = 20260912) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze);
  const actor = createActor(maze, getCharacter('default'));
  return { maze, stage, actor };
}

test('傾きが無ければボールは動き出さない', () => {
  const { stage, actor } = setup();
  for (let i = 0; i < 120; i++) {
    stepPhysics({ actor, stage, tilt: { x: 0, y: 0 }, base: BASE, dt: 1 / 60 });
  }
  assert.ok(Math.hypot(actor.vx, actor.vy) < 1e-6);
});

test('傾けると傾けた向きへ動く', () => {
  const { stage, actor } = setup();
  const x0 = actor.x;
  for (let i = 0; i < 20; i++) {
    stepPhysics({ actor, stage, tilt: { x: 1, y: 0 }, base: BASE, dt: 1 / 60 });
  }
  assert.ok(actor.x > x0, '右へ動く');
});

test('どの方向へ全力で走らせても盤外へ出ない（トンネリング対策）', () => {
  const dirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 }, { x: 0.7, y: -0.7 }, { x: -0.7, y: -0.7 },
  ];
  for (let seed = 1; seed <= 20; seed++) {
    const { stage, actor, maze } = setup(seed);
    for (const d of dirs) {
      for (let i = 0; i < 180; i++) {
        stepPhysics({ actor, stage, tilt: d, base: BASE, dt: 1 / 60 });
        assert.ok(
          actor.x >= -1e-6 && actor.x <= maze.size && actor.y >= -1e-6 && actor.y <= maze.size,
          `seed=${seed} dir=${d.x},${d.y} で盤外 (${actor.x}, ${actor.y})`
        );
      }
    }
  }
});

test('速度上限を超えない', () => {
  const { stage, actor } = setup();
  for (let i = 0; i < 600; i++) {
    stepPhysics({ actor, stage, tilt: { x: 1, y: 1 }, base: BASE, dt: 1 / 60 });
    assert.ok(Math.hypot(actor.vx, actor.vy) <= TUNING.maxSpeed + 1e-6);
  }
});

test('巨大なdtでも壊れない（タブ復帰時）', () => {
  const { stage, actor, maze } = setup();
  stepPhysics({ actor, stage, tilt: { x: 1, y: 1 }, base: BASE, dt: 10 });
  assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y));
  assert.ok(actor.x <= maze.size && actor.y <= maze.size);
});

test('摩擦が効いて傾きを戻すと減速する', () => {
  const { stage, actor } = setup();
  for (let i = 0; i < 30; i++) {
    stepPhysics({ actor, stage, tilt: { x: 1, y: 0 }, base: BASE, dt: 1 / 60 });
  }
  const moving = Math.hypot(actor.vx, actor.vy);
  assert.ok(moving > 0);
  for (let i = 0; i < 180; i++) {
    stepPhysics({ actor, stage, tilt: { x: 0, y: 0 }, base: BASE, dt: 1 / 60 });
  }
  assert.ok(Math.hypot(actor.vx, actor.vy) < moving * 0.1, '減速している');
});

test('素材とゾーンのサンプリングは呼び出し側にマスを見せない', () => {
  const { stage, actor } = setup();
  const m = sampleMaterial(stage, actor);
  const z = sampleZone(stage, actor);
  assert.equal(m.id, 'default');
  assert.equal(z.forceX, 0);
  assert.equal(z.forceY, 0);
});

test('素材の係数を変えると物理コードを変えずに挙動が変わる（層構造の確認）', () => {
  // 壁の衝突が混ざると比較が不安定になるため、壁を外して素材の効果だけを見る
  const slide = setup(31);
  const sticky = setup(31);
  slide.stage.walls = [];
  sticky.stage.walls = [];

  // データだけの変更で素材を足す（物理コードは1行も触らない）
  MATERIALS['test-sticky'] = { id: 'test-sticky', frictionK: 3.0, restitutionK: 1, accelK: 1 };
  sticky.stage.floors = sticky.stage.floors.map(() => 'test-sticky');

  try {
    for (let i = 0; i < 30; i++) {
      stepPhysics({ actor: slide.actor, stage: slide.stage, tilt: { x: 1, y: 0 }, base: BASE, dt: 1 / 60 });
      stepPhysics({ actor: sticky.actor, stage: sticky.stage, tilt: { x: 1, y: 0 }, base: BASE, dt: 1 / 60 });
    }
    const slideSpeed = Math.hypot(slide.actor.vx, slide.actor.vy);
    const stickySpeed = Math.hypot(sticky.actor.vx, sticky.actor.vy);
    assert.ok(
      stickySpeed < slideSpeed * 0.7,
      `摩擦の大きい素材のほうが遅くなる（slide=${slideSpeed.toFixed(2)} sticky=${stickySpeed.toFixed(2)}）`
    );
    assert.ok(sticky.actor.x < slide.actor.x, '進んだ距離も短い');
  } finally {
    delete MATERIALS['test-sticky'];
  }
});

test('キャラの sizeRatio を変えると半径が変わる（キャラ属性であることの確認）', () => {
  const maze = generateMaze(BASE.mazeSize, 5);
  const big = createActor(maze, { ...getCharacter('default'), sizeRatio: 0.7 });
  const small = createActor(maze, { ...getCharacter('default'), sizeRatio: 0.55 });
  assert.equal(big.r, 0.35);
  assert.equal(small.r, 0.275);
});
