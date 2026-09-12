import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze, createCells } from '../src/maze/generator.js';
import { checkReachability } from '../src/maze/validator.js';
import { createRng } from '../src/maze/rng.js';

test('同じシードなら常に同じ迷路が返る（F-123）', () => {
  const a = generateMaze(7, 12345);
  const b = generateMaze(7, 12345);
  assert.deepEqual(a.cells, b.cells);
});

test('違うシードなら違う迷路になる', () => {
  const a = generateMaze(7, 1);
  const b = generateMaze(7, 2);
  assert.notDeepEqual(a.cells, b.cells);
});

test('セル数が size * size になる', () => {
  for (const size of [5, 7, 9, 11]) {
    const m = generateMaze(size, 99);
    assert.equal(m.cells.length, size * size);
  }
});

test('外周は必ず壁になっている', () => {
  const size = 7;
  const m = generateMaze(size, 777);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = (i - x) / size;
    if (y === 0) assert.equal(m.cells[i].t, 1, `上端(${x},${y})`);
    if (y === size - 1) assert.equal(m.cells[i].b, 1, `下端(${x},${y})`);
    if (x === 0) assert.equal(m.cells[i].l, 1, `左端(${x},${y})`);
    if (x === size - 1) assert.equal(m.cells[i].r, 1, `右端(${x},${y})`);
  }
});

test('サイズを変えても例外なく生成できる', () => {
  for (const size of [2, 3, 5, 7, 9, 12, 16, 21]) {
    assert.doesNotThrow(() => generateMaze(size, size * 31 + 7));
  }
});

test('size が2未満なら例外', () => {
  assert.throws(() => generateMaze(1, 1));
  assert.throws(() => generateMaze(0, 1));
});

test('正常な迷路は到達可能性検証に合格する（F-122）', () => {
  const m = generateMaze(7, 4242);
  const r = checkReachability(m);
  assert.equal(r.ok, true);
  assert.equal(r.visited, 49);
  assert.deepEqual(r.unreachable, []);
});

test('孤立セルを作った迷路は不合格になる（検出できることの確認）', () => {
  const size = 7;
  const m = generateMaze(size, 4242);
  // 中央のセルを四方から塞いで孤立させる
  const target = { x: 3, y: 3 };
  const ti = target.y * size + target.x;
  const broken = {
    ...m,
    cells: m.cells.map((c) => ({ ...c })),
  };
  broken.cells[ti] = { t: 1, r: 1, b: 1, l: 1 };
  broken.cells[(target.y - 1) * size + target.x].b = 1;
  broken.cells[(target.y + 1) * size + target.x].t = 1;
  broken.cells[target.y * size + (target.x - 1)].r = 1;
  broken.cells[target.y * size + (target.x + 1)].l = 1;

  const r = checkReachability(broken);
  assert.equal(r.ok, false);
  assert.ok(r.unreachable.some((c) => c.x === target.x && c.y === target.y));
});

test('全セルが壁で囲まれた初期状態は不合格になる', () => {
  const size = 4;
  const r = checkReachability({ size, cells: createCells(size), start: { x: 0, y: 0 } });
  assert.equal(r.ok, false);
  assert.equal(r.visited, 1);
});

test('乱数はシードで再現し、範囲は[0,1)に収まる', () => {
  const a = createRng(7);
  const b = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});
