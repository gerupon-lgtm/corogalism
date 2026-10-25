import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE_STAGE_COUNT, createPracticeCourse, createPracticeComment } from '../src/game/practiceCourse.js';

const START = '小さく傾けて、ゆっくり転がしてみよう。';
const WALL = '曲がる前に、逆へ傾けて減速してみよう。';
const GOAL = '傾きを小さくして、カップを狙おう。';
const far = { actor: { x: .5, y: .5 }, goal: { x: 6.5, y: 6.5 }, started: true, wallHits: 0, elapsedMs: 0 };

test('5面だけ進め、再読出しや最終面の次操作で種・面数を変えない', () => {
  const course = createPracticeCourse(77);
  assert.equal(PRACTICE_STAGE_COUNT, 5);
  assert.equal(course.stageCount, 5);
  assert.equal(course.currentSeed, 77);
  assert.equal(course.stageIndex, 1);
  assert.equal(course.isLast, false);
  assert.equal(course.next(), true);
  assert.equal(course.currentSeed, 609776);
  // 同じ迷路の再挑戦では、読み出すだけで状態を進めない。
  const retrySeed = course.currentSeed;
  assert.equal(course.currentSeed, retrySeed);
  assert.equal(course.stageIndex, 2);
  for (let stage = 3; stage <= 5; stage++) {
    assert.equal(course.next(), true);
    assert.equal(course.stageIndex, stage);
  }
  assert.equal(course.isLast, true);
  const finalSeed = course.currentSeed;
  for (let i = 0; i < 3; i++) assert.equal(course.next(), false);
  assert.equal(course.stageIndex, 5);
  assert.equal(course.currentSeed, finalSeed);
});

test('新しい練習は1面目から始まり、不正な種は有限の符号なし値へ整える', () => {
  const course = createPracticeCourse(-1);
  assert.equal(course.currentSeed, 4294967295);
  course.next();
  assert.ok(Number.isInteger(course.currentSeed) && course.currentSeed >= 0);
  assert.equal(createPracticeCourse(-1).stageIndex, 1);
  for (const seed of [NaN, Infinity, -Infinity, undefined]) {
    const fresh = createPracticeCourse(seed);
    assert.equal(fresh.currentSeed, 0);
    assert.equal(fresh.next(), true);
    assert.equal(fresh.currentSeed, 13);
  }
});

test('壁への接触を覚えておき、開始コメントを4秒読んだ後で一度だけ切り替える', () => {
  const hint = createPracticeComment();
  assert.equal(hint.update(), START);
  assert.equal(hint.update({ ...far, wallHits: 1, elapsedMs: 1000 }), START);
  assert.equal(hint.update({ ...far, wallHits: 4, elapsedMs: 2999 }), START);
  assert.equal(hint.update({ ...far, wallHits: 4, elapsedMs: 1 }), WALL);
  assert.equal(hint.update({ ...far, wallHits: 12, elapsedMs: 1000 }), WALL);
  assert.equal(hint.update({ ...far, wallHits: 12, elapsedMs: 5000 }), WALL);
});

test('初めてゴールへ近づいた時は、4秒待たずに狙い方を示す', () => {
  const hint = createPracticeComment();
  assert.equal(hint.update({ ...far, elapsedMs: 100 }), START);
  assert.equal(hint.update({ ...far, actor: { x: 5.5, y: 6.5 }, elapsedMs: 100 }), GOAL);
  // 壁にぶつかって離れても、表示直後のゴール説明を消さない。
  assert.equal(hint.update({ ...far, wallHits: 1, elapsedMs: 3999 }), GOAL);
  assert.equal(hint.update({ ...far, wallHits: 2, elapsedMs: 1 }), WALL);
  // 2度目は通常の読み取り時間を守る。
  assert.equal(hint.update({ ...far, actor: { x: 5.5, y: 6.5 }, wallHits: 2, elapsedMs: 3999 }), WALL);
  assert.equal(hint.update({ ...far, actor: { x: 5.5, y: 6.5 }, wallHits: 2, elapsedMs: 1 }), GOAL);
});

test('停止中や不正な時間では保持時間を進めず、resetで接触とゴール履歴も戻す', () => {
  const hint = createPracticeComment();
  for (const elapsedMs of [-1000, NaN, Infinity, 0]) {
    assert.equal(hint.update({ ...far, wallHits: 1, elapsedMs }), START);
  }
  assert.equal(hint.update({ ...far, wallHits: 1, elapsedMs: 3999 }), START);
  assert.equal(hint.update({ ...far, wallHits: 1, elapsedMs: 1 }), WALL);
  hint.reset();
  assert.equal(hint.update(), START);
  assert.equal(hint.update({ ...far, elapsedMs: 6000 }), START);
  assert.equal(hint.update({ ...far, actor: { x: NaN, y: 6.5 } }), START);
  assert.equal(hint.update({ ...far, actor: { x: 6, y: 6.5 } }), GOAL);
  hint.reset();
  assert.equal(hint.update(), START);
  assert.equal(hint.update({ ...far, actor: { x: 6, y: 6.5 }, started: false }), START);
  assert.equal(hint.update({ ...far, actor: { x: 6, y: 6.5 } }), GOAL);
});
