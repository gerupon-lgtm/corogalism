import test from 'node:test';
import assert from 'node:assert/strict';
import { createPuzzleTutorialCourse, PUZZLE_TUTORIAL_LESSONS } from '../src/game/puzzleTutorial.js';

test('三つの単独体験から組み合わせへ進み、最後でコースを終えられる', () => {
  const course = createPuzzleTutorialCourse(123);
  const kinds = [], seeds = [];
  do {
    kinds.push(course.profile.puzzleKind);
    seeds.push(course.stageSeed);
    assert.equal(course.profile.puzzleEase, 'relaxed');
    assert.equal(course.profile.puzzleTutorial, true);
    assert.ok(course.lesson.title && course.lesson.body && course.lesson.art && course.lesson.clearNote);
  } while (course.next());
  assert.deepEqual(kinds.slice(0, 3), ['racket', 'sequence', 'timing']);
  assert.ok(kinds.slice(3).every(kind => !['racket', 'sequence', 'timing'].includes(kind)));
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
  assert.equal(course.next(), true);
  course.reset();
  assert.equal(course.index, 0);
  assert.equal(course.stageSeed, firstSeed);
  assert.deepEqual(course.profile, other.profile);
});

test('最初の２面は通常床と通常壁、切り返しから氷へ進む',()=>{
 const course=createPuzzleTutorialCourse(123),patterns=[];
 do {
  patterns.push(course.profile.puzzleMaterialPattern);
  assert.equal(course.lesson.context,'げんきが0になっても続けられます。');
 } while(course.next());
 assert.deepEqual(patterns,['tutorialNormal','tutorialNormal','iceRubber','iceRubber','iceRubber','iceRubber']);
});
