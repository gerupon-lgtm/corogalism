import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze } from '../src/maze/generator.js';
import { solvePath, countTurns } from '../src/maze/path.js';
import { createStage, createActor } from '../src/world/stage.js';
import { getCharacter } from '../src/world/characters.js';
import { MATERIALS } from '../src/world/materials.js';
import { difficultyAt, stageTimeLimitSec } from '../src/game/progression.js';
import { createHp, initialHp } from '../src/game/hp.js';
import { createRun, stageSeed } from '../src/game/run.js';
import { BASE, HP, DIFFICULTY, RUN } from '../src/config/gameConfig.js';

/* ---------- T-201 経路と折れ回数 ---------- */

test('経路の両端がスタートとゴールで、壁を通り抜けていない（F-201）', () => {
  const size = BASE.mazeSize;
  for (let seed = 1; seed <= 30; seed++) {
    const m = generateMaze(size, seed);
    const path = solvePath(m);
    assert.deepEqual(path[0], m.start, `seed=${seed} 始点`);
    assert.deepEqual(path[path.length - 1], m.goal, `seed=${seed} 終点`);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      assert.equal(Math.abs(dx) + Math.abs(dy), 1, '隣接セルへ進んでいる');
      const c = m.cells[a.y * size + a.x];
      const open = dx === 1 ? !c.r : dx === -1 ? !c.l : dy === 1 ? !c.b : !c.t;
      assert.ok(open, `seed=${seed} の (${a.x},${a.y})→(${b.x},${b.y}) で壁を抜けている`);
    }
  }
});

test('同一シードなら折れ回数も同じ（F-202）', () => {
  const a = generateMaze(BASE.mazeSize, 4242);
  const b = generateMaze(BASE.mazeSize, 4242);
  assert.equal(a.turns, b.turns);
  assert.equal(a.pathLength, b.pathLength);
});

test('MazeGraph に path / pathLength / turns が入っている', () => {
  const m = generateMaze(BASE.mazeSize, 7);
  assert.ok(Array.isArray(m.path));
  assert.equal(m.pathLength, m.path.length);
  assert.equal(m.turns, countTurns(m.path));
});

test('折れ回数は 7×7 で 0〜40 の範囲に収まる（実測は2〜32）', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const m = generateMaze(7, seed);
    assert.ok(m.turns >= 0 && m.turns <= 40, `seed=${seed} turns=${m.turns}`);
  }
});

test('まっすぐな経路なら折れ回数は0', () => {
  const straight = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  assert.equal(countTurns(straight), 0);
  const oneTurn = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
  assert.equal(countTurns(oneTurn), 1);
});

/* ---------- T-215 難易度カーブ ---------- */

test('面が進むと制限時間が縮み、HP係数が下がり、危険な壁が増える（F-251）', () => {
  const d1 = difficultyAt(1);
  const d20 = difficultyAt(20);
  assert.equal(d1.secPerCell, DIFFICULTY.secPerCellStart * DIFFICULTY.introTimeMult);
  assert.ok(d20.secPerCell < d1.secPerCell, '制限時間が縮む');
  assert.ok(d20.hpPerTurn < d1.hpPerTurn, 'HP係数が下がる');
  assert.ok(d20.dangerRatio > d1.dangerRatio, '危険な壁が増える');
  assert.ok(d20.mossRatio < d1.mossRatio, '安全地帯が減る');
});

test('難易度は下限で頭打ちになる（無限に厳しくならない）', () => {
  const d = difficultyAt(500);
  assert.equal(d.secPerCell, DIFFICULTY.secPerCellEnd);
  assert.equal(d.hpPerTurn, DIFFICULTY.hpPerTurnMin);
  assert.equal(d.damageMult, DIFFICULTY.damageMultMax);
  assert.ok(d.dangerRatio <= DIFFICULTY.dangerRatioMax);
  assert.equal(d.mossRatio, DIFFICULTY.mossRatioMin);
});

test('迷路サイズは難易度で変わらない（F-252）', () => {
  for (const stage of [1, 10, 50]) {
    assert.equal(difficultyAt(stage).size, undefined, '難易度はサイズを持たない');
  }
  assert.equal(generateMaze(BASE.mazeSize, 1).size, 7);
});

test('制限時間は経路長に比例する（F-247）', () => {
  const d = difficultyAt(1);
  const a = generateMaze(BASE.mazeSize, 11);
  const b = generateMaze(BASE.mazeSize, 12);
  assert.equal(stageTimeLimitSec(a, d), a.pathLength * d.secPerCell);
  if (a.pathLength !== b.pathLength) {
    const longer = a.pathLength > b.pathLength ? a : b;
    const shorter = a.pathLength > b.pathLength ? b : a;
    assert.ok(stageTimeLimitSec(longer, d) > stageTimeLimitSec(shorter, d),
      '経路が長い面ほど制限時間が長い');
  }
});

/* ---------- T-203 HP ---------- */

test('HP初期値が折れ回数から正しく出る（F-211）', () => {
  const d1 = difficultyAt(1);
  assert.equal(initialHp(2, d1.hpPerTurn), 48);
  assert.equal(initialHp(15, d1.hpPerTurn), 100);
  assert.equal(initialHp(32, d1.hpPerTurn), 168);
});

test('閾値以下の接触ではHPが減らない（F-213）', () => {
  const hp = createHp({ turns: 15, hpPerTurn: 4 });
  const wall = { materialId: 'default' };
  assert.equal(hp.applyImpact(HP.threshold, wall, 0), 0);
  assert.equal(hp.applyImpact(0.1, wall, 1), 0);
  assert.equal(hp.value, hp.max);
  assert.equal(hp.tookDamage, false);
});

test('全力衝突でも1発の上限で止まる（F-214）', () => {
  const hp = createHp({ turns: 15, hpPerTurn: 4 });
  const dealt = hp.applyImpact(5.38, { materialId: 'default' }, 0);
  assert.equal(dealt, hp.max * HP.capRatio);
  assert.ok(!hp.isDead, '1発では死なない');
});

test('無敵時間中の2発目は無効（F-215）', () => {
  const hp = createHp({ turns: 15, hpPerTurn: 4 });
  const wall = { materialId: 'default' };
  const first = hp.applyImpact(2.5, wall, 10.0);
  assert.ok(first > 0);
  assert.equal(hp.applyImpact(2.5, wall, 10.0 + HP.cooldownSec / 2), 0, '無敵時間中');
  assert.ok(hp.applyImpact(2.5, wall, 10.0 + HP.cooldownSec) > 0, '無敵時間明け');
});

test('壁の素材でダメージが変わる（F-221）', () => {
  const mk = () => createHp({ turns: 15, hpPerTurn: 4 });
  const d = (id) => mk().applyImpact(2.5, { materialId: id }, 0);
  assert.ok(d('spike') > d('default'), 'spike のほうが痛い');
  assert.ok(d('moss') < d('default'), 'moss のほうが痛くない');
  // spike は default の2倍（上限に当たっていない範囲で）
  assert.ok(Math.abs(d('spike') / d('default') - MATERIALS.spike.damageK) < 1e-9);
});

test('難易度の倍率がダメージに効く', () => {
  const base = createHp({ turns: 15, hpPerTurn: 4, damageMult: 1 })
    .applyImpact(2.0, { materialId: 'default' }, 0);
  const hard = createHp({ turns: 15, hpPerTurn: 4, damageMult: 2 })
    .applyImpact(2.0, { materialId: 'default' }, 0);
  assert.ok(Math.abs(hard / base - 2) < 1e-9);
});

test('HPが0になると isDead が true', () => {
  const hp = createHp({ turns: 2, hpPerTurn: 4 }); // max 48
  let t = 0;
  while (!hp.isDead && t < 100) { hp.applyImpact(5.38, { materialId: 'spike' }, t); t += 1; }
  assert.ok(hp.isDead);
});

/* ---------- T-212 ラン ---------- */

test('同じ runSeed なら面の並びが常に同じ（F-241）', () => {
  const a = [], b = [];
  for (let n = 1; n <= 30; n++) { a.push(stageSeed(12345, n)); b.push(stageSeed(12345, n)); }
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, Array.from({ length: 30 }, (_, i) => stageSeed(999, i + 1)));
  assert.equal(new Set(a).size, a.length, '同じランの中で面のシードが重複しない');
});

test('面をクリアすると到達面数と合計タイムが積み上がる（F-246）', () => {
  const run = createRun(1);
  run.clearStage({ timeMs: 8000, noDamage: true });
  run.clearStage({ timeMs: 9000, noDamage: false });
  assert.equal(run.clearedStages, 2);
  assert.equal(run.totalTimeMs, 17000);
  assert.equal(run.noDamageStages, 1);
  assert.equal(run.stageIndex, 3);
});

test('HP0でも時間切れでもランが終わる（F-243, F-248）', () => {
  for (const cause of ['dead', 'timeout']) {
    const run = createRun(1);
    run.clearStage({ timeMs: 1000, noDamage: false });
    run.failStage(cause);
    assert.ok(run.isOver);
    assert.equal(run.cause, cause);
    assert.equal(run.clearedStages, 1, '失敗した面は面数に入らない');
  }
});

test('コンティニューは回数制限があり、面数は維持される（F-244）', () => {
  const run = createRun(1);
  run.clearStage({ timeMs: 1000, noDamage: false });
  for (let i = 0; i < RUN.continues; i++) {
    run.failStage('dead');
    assert.ok(run.canContinue);
    assert.ok(run.useContinue());
    assert.equal(run.clearedStages, 1, '到達面数は維持される');
    assert.ok(!run.isOver);
  }
  run.failStage('dead');
  assert.ok(!run.canContinue, `${RUN.continues}回使ったらもう使えない`);
  assert.ok(!run.useContinue());
});

test('コンティニューを使うと記録の振り分けが変わる（F-245）', () => {
  const clean = createRun(1);
  clean.clearStage({ timeMs: 1000, noDamage: true });
  clean.failStage('dead');
  assert.equal(clean.result().usedContinue, false);

  const dirty = createRun(1);
  dirty.clearStage({ timeMs: 1000, noDamage: true });
  dirty.failStage('dead');
  dirty.useContinue();
  dirty.clearStage({ timeMs: 1000, noDamage: true });
  dirty.failStage('timeout');
  assert.equal(dirty.result().usedContinue, true);
  assert.equal(dirty.result().stages, 2);
});

/* ---------- T-204 壁素材の配置 ---------- */

test('同じシード・同じ面なら素材配置も同じ（F-223）', () => {
  const d = difficultyAt(10);
  const m1 = generateMaze(BASE.mazeSize, 555);
  const m2 = generateMaze(BASE.mazeSize, 555);
  const a = createStage(m1, d).walls.map((w) => w.materialId);
  const b = createStage(m2, d).walls.map((w) => w.materialId);
  assert.deepEqual(a, b);
});

test('面が進むと危険な壁が増える（F-223）', () => {
  const count = (stage) => {
    const m = generateMaze(BASE.mazeSize, 31);
    const st = createStage(m, difficultyAt(stage));
    return st.walls.filter((w) => w.materialId === 'stone' || w.materialId === 'spike').length;
  };
  assert.ok(count(20) > count(1), `面1:${count(1)} 面20:${count(20)}`);
  assert.equal(count(1), 0, '面1には危険な壁が無い');
});

test('難易度を渡さなければ全部 default（フェーズ1の挙動を壊さない）', () => {
  const st = createStage(generateMaze(BASE.mazeSize, 1));
  assert.ok(st.walls.every((w) => w.materialId === 'default'));
});

test('ボールはキャラの sizeRatio から半径を得る', () => {
  const m = generateMaze(BASE.mazeSize, 1);
  const a = createActor(m, getCharacter('default'));
  assert.equal(a.r, getCharacter('default').sizeRatio / 2);
});
