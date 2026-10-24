import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagePlay } from '../src/game/stagePlay.js';
import { challengeDifficulty } from '../src/game/challenge.js';
import { BASE, LEAF } from '../src/config/gameConfig.js';

const advance = (play, events) => play.advance({
  dt: 0, elapsedMs: 10, tilt: { x: 0, y: 0 }, base: BASE,
  onFeature: kind => events.push(kind),
});

function leafPlay(difficulty = challengeDifficulty(3, 'easy'), carry = {}) {
  const play = createStagePlay(7919, difficulty, carry);
  play.stage.leaf = { x: 2.5, y: 2.5, collected: false };
  play.stage.recovery = null;
  play.stage.hourglass = null;
  play.stage.rest = null;
  play.stage.extraRests = [];
  play.stage.sticky = [];
  play.teleport(2.5, 2.5);
  return play;
}

test('まもりが上限の葉っぱは残し、接触し続けても満杯案内は一度だけ', () => {
  const play = leafPlay(), events = [];
  const cap = play.hp.max * LEAF.capRatio;
  play.shield.value = cap;
  for (let i = 0; i < 100; i++) advance(play, events);
  assert.deepEqual(events, ['leaf-full']);
  assert.equal(play.stage.leaf.collected, false);
  assert.equal(play.shield.value, cap);
});

test('満杯の葉っぱから離れて戻ると、もう一度案内する', () => {
  const play = leafPlay(), events = [];
  play.shield.value = play.hp.max * LEAF.capRatio;
  advance(play, events);
  play.teleport(.5, .5);
  advance(play, events);
  play.teleport(2.5, 2.5);
  advance(play, events);
  advance(play, events);
  assert.deepEqual(events, ['leaf-full', 'leaf-full']);
  assert.equal(play.stage.leaf.collected, false);
});

test('満杯案内の後、接触したまままもりが減ると葉っぱを取得できる', () => {
  const play = leafPlay(), events = [];
  const cap = play.hp.max * LEAF.capRatio;
  play.shield.value = cap;
  advance(play, events);
  play.hp.applyImpact(30, { materialId: 'default' }, 0);
  assert.ok(play.shield.value < cap);
  advance(play, events);
  assert.deepEqual(events, ['leaf-full', 'leaf']);
  assert.equal(play.stage.leaf.collected, true);
  assert.ok(Math.abs(play.shield.value - cap) < 1e-8);
});

test('満杯の基準は減ったげんきではなく、その面の最大げんきを使う', () => {
  for (const hpPerTurn of [0, 10]) {
    const difficulty = { ...challengeDifficulty(3, 'easy'), hpPerTurn };
    const play = leafPlay(difficulty), events = [];
    play.hp.applyImpact(30, { materialId: 'default' }, 0);
    assert.ok(play.hp.value < play.hp.max);
    play.shield.value = play.hp.max * LEAF.capRatio - 1;
    advance(play, events);
    assert.deepEqual(events, ['leaf']);
    assert.equal(play.stage.leaf.collected, true);
    assert.equal(play.shield.value, play.hp.max * LEAF.capRatio);
  }
});

test('前の面から持ち越した上限超えのまもりは、案内しても減らさない', () => {
  const shield = { value: 999 };
  const play = leafPlay(undefined, { shield }), events = [];
  assert.ok(shield.value > play.hp.max * LEAF.capRatio);
  advance(play, events);
  advance(play, events);
  assert.deepEqual(events, ['leaf-full']);
  assert.equal(play.shield, shield);
  assert.equal(shield.value, 999);
  assert.equal(play.stage.leaf.collected, false);
});

test('げんき満タンでも、まもりに空きがあれば葉っぱを取得できる', () => {
  const play = leafPlay(), events = [];
  assert.equal(play.hp.value, play.hp.max);
  advance(play, events);
  assert.deepEqual(events, ['leaf']);
  assert.equal(play.stage.leaf.collected, true);
  assert.equal(play.shield.value, play.hp.max * LEAF.amountRatio);
});

test('取得済みの葉っぱには、満杯のまもりで触れ直しても案内しない', () => {
  const play = leafPlay(), events = [];
  advance(play, events);
  play.shield.value = play.hp.max * LEAF.capRatio;
  advance(play, events);
  play.teleport(.5, .5);
  advance(play, events);
  play.teleport(2.5, 2.5);
  advance(play, events);
  assert.deepEqual(events, ['leaf']);
});

test('HPのないプラクティスと床の練習は葉っぱ通知を出さず進められる', () => {
  for (const carry of [{}, { floorPractice: 'normal' }]) {
    const play = createStagePlay(7919, null, carry), events = [];
    assert.equal(play.hp, null);
    advance(play, events);
    assert.deepEqual(events, []);
    assert.equal(play.status, 'playing');
  }
});

test('チュートリアルの葉っぱも、満杯案内から同じ接触で取得へ進められる', () => {
  const play = createStagePlay(7919, null, { tutorial: true }), events = [];
  play.shield.value = play.hp.max * LEAF.capRatio;
  play.teleport(play.stage.leaf.x, play.stage.leaf.y);
  advance(play, events);
  play.shield.value = 0;
  advance(play, events);
  assert.deepEqual(events, ['leaf-full', 'leaf']);
  assert.equal(play.stage.leaf.collected, true);
  assert.equal(play.status, 'playing');
});
