import test from 'node:test';
import assert from 'node:assert/strict';
import { createPuzzleTutorialCourse, PUZZLE_TUTORIAL_LESSONS } from '../src/game/puzzleTutorial.js';

test('打ち返す・順に開くを一面ずつ体験し、二面でコースを終える', () => {
  const course = createPuzzleTutorialCourse(123);
  const kinds = [], seeds = [];
  do {
    kinds.push(course.profile.puzzleKind);
    seeds.push(course.stageSeed);
    assert.equal(course.profile.puzzleEase, 'relaxed');
    assert.equal(course.profile.puzzleTutorial, true);
    assert.ok(course.lesson.title && course.lesson.body && course.lesson.art && course.lesson.clearNote);
  } while (course.next());
  assert.deepEqual(kinds, ['racket', 'sequence']);
  assert.equal(course.stageCount,2);
  assert.equal(kinds.length, PUZZLE_TUTORIAL_LESSONS.length);
  assert.equal(new Set(seeds).size, seeds.length);
  assert.equal(course.isLast, true);
  const finalLesson = course.lesson;
  assert.equal(course.next(), false);
  assert.equal(course.lesson, finalLesson);
});

test('戻っても同じ紹介面を再現でき、別コースの進み具合は変わらない', () => {
  const course = createPuzzleTutorialCourse(123), other = createPuzzleTutorialCourse(123);
  const firstSeed = course.stageSeed;
  assert.equal(course.next(), true);
  assert.equal(other.index, 0);
  assert.equal(other.stageSeed, firstSeed);
  assert.equal(course.next(), false);
  course.reset();
  assert.equal(course.index, 0);
  assert.equal(course.stageSeed, firstSeed);
  assert.deepEqual(course.profile, other.profile);
});

test('動く壁紹介の二面は通常床と通常壁で、げんきゼロでも続けられる',()=>{
 const course=createPuzzleTutorialCourse(123),patterns=[];
 do {
  patterns.push(course.profile.puzzleMaterialPattern);
  assert.equal(course.lesson.context,'げんきが0になっても続けられます。');
 } while(course.next());
 assert.deepEqual(patterns,['tutorialNormal','tutorialNormal']);
 assert.equal(course.lesson.nextLabel,'あそび方を終える');
});
