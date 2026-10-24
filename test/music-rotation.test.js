import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicRotation } from '../src/audio/musicRotation.js';

const stageWithTheme = id => ({ theme: { id } });

test('基本・やすらぎ・光の滑走路は固定曲を選び、抽選を使わない', () => {
  const rotation = createMusicRotation(() => { throw new Error('固定曲で抽選した'); });
  assert.equal(rotation.select(stageWithTheme('basic'), '1:1'), 'default');
  assert.equal(rotation.select(stageWithTheme('rest'), '2:1'), 'rest');
  assert.equal(rotation.select(stageWithTheme('specialFlow'), '3:1'), 'default');
  assert.equal(rotation.select(null, '4:1'), 'default');
});

test('固定曲が途中に入っても、残る3曲を一巡するまで重複しない', () => {
  const rotation = createMusicRotation(() => 0);
  const themes = ['iceRubber', 'basic', 'iceRubber', 'rest', 'iceRubber'];
  assert.deepEqual(themes.map((id, index) => rotation.select(stageWithTheme(id), `${index}:1`)), [
    'slide', 'default', 'force', 'rest', 'puzzle',
  ]);
});

test('同じ現在面の再選択は入力が変わっても曲を維持し、次の抽選を消費しない', () => {
  let draws = 0;
  const rotation = createMusicRotation(() => { draws += 1; return 0; });
  assert.equal(rotation.select(stageWithTheme('iceRubber'), '1:2'), 'slide');
  assert.equal(rotation.select(stageWithTheme('gravityAssist'), '1:2'), 'slide');
  assert.equal(rotation.select(stageWithTheme('rest'), '1:2'), 'slide');
  assert.equal(rotation.select(stageWithTheme('basic'), '2:2'), 'default');
  assert.equal(rotation.select(stageWithTheme('gravityAssist'), '2:2'), 'default');
  assert.equal(rotation.select(stageWithTheme('iceRubber'), '3:2'), 'force');
  assert.equal(rotation.select(stageWithTheme('rest'), '4:2'), 'rest');
  assert.equal(rotation.select(stageWithTheme('iceRubber'), '4:2'), 'rest');
  assert.equal(rotation.select(stageWithTheme('iceRubber'), '5:2'), 'puzzle');
  assert.equal(draws, 3);
});

test('一巡後は固定曲を挟んでも直前の対象曲を避け、その曲を次の候補に残す', () => {
  const draws = [0.6, 0, 0, 0.99, 0.99, 0];
  const rotation = createMusicRotation(() => draws.shift());
  const themes = ['iceRubber', 'iceRubber', 'iceRubber', 'rest', 'iceRubber', 'iceRubber', 'iceRubber'];
  assert.deepEqual(themes.map((id, index) => rotation.select(stageWithTheme(id), `${index}:3`)), [
    'force', 'slide', 'puzzle', 'rest', 'force', 'puzzle', 'slide',
  ]);
});

test('候補に残るテーマ曲の当たり幅はほかの曲の2倍にする', () => {
  const cases = [
    [stageWithTheme('iceRubber'), { slide: 4, force: 2, puzzle: 2 }],
    [stageWithTheme('gravityAssist'), { slide: 2, force: 4, puzzle: 2 }],
    [{ theme: { id: 'basic' }, puzzle: { kind: 'racket' } }, { slide: 2, force: 2, puzzle: 4 }],
  ];
  for (const [stage, expected] of cases) {
    const counts = { slide: 0, force: 0, puzzle: 0 };
    for (let sample = 0; sample < 8; sample += 1) {
      const rotation = createMusicRotation(() => (sample + 0.5) / 8);
      counts[rotation.select(stage, '1:4')] += 1;
    }
    assert.deepEqual(counts, expected);
  }
});

test('テーマを繰り返しても抽選値が変わっても、対象3面ごとに全3曲が揃う', () => {
  for (const draw of [0, 0.2, 0.49, 0.5, 0.8, 0.999999]) {
    for (const theme of ['iceRubber', 'gravityAssist', 'puzzle']) {
      const rotation = createMusicRotation(() => draw);
      const tracks = Array.from({ length: 36 }, (_, index) => rotation.select(stageWithTheme(theme), `${index}:5`));
      for (let start = 0; start < tracks.length; start += 3) {
        assert.deepEqual(tracks.slice(start, start + 3).sort(), ['force', 'puzzle', 'slide']);
        if (start > 0) assert.notEqual(tracks[start], tracks[start - 1]);
      }
    }
  }
});

test('渡した抽選値で順番が変わり、同じ3曲順を固定で繰り返さない', () => {
  const selectSix = random => {
    const rotation = createMusicRotation(random);
    return Array.from({ length: 6 }, (_, index) => rotation.select(stageWithTheme('iceRubber'), `${index}:6`));
  };
  assert.deepEqual(selectSix(() => 0), ['slide', 'force', 'puzzle', 'slide', 'force', 'puzzle']);
  const draws = [0, 0, 0, 0.99, 0, 0];
  assert.deepEqual(selectSix(() => draws.shift()), ['slide', 'force', 'puzzle', 'force', 'slide', 'puzzle']);
});

test('現在面を離れた後は、同じ面番号でも新しい選曲として扱う', () => {
  const rotation = createMusicRotation(() => 0);
  const stage = stageWithTheme('iceRubber');
  assert.equal(rotation.select(stage, '1:7'), 'slide');
  assert.equal(rotation.select(stage, '1:8'), 'force');
  assert.equal(rotation.select(stage, '1:7'), 'puzzle');
});

test('新しい選曲器には前回の候補・現在面・直前曲を引き継がない', () => {
  const previous = createMusicRotation(() => 0);
  const stage = stageWithTheme('iceRubber');
  previous.select(stage, '1:9');
  previous.select(stage, '2:9');
  previous.select(stage, '3:9');
  previous.select(stageWithTheme('rest'), '4:9');

  const next = createMusicRotation(() => 0.99);
  assert.equal(next.select(stage, '4:9'), 'puzzle');
  assert.equal(next.select(stage, '5:9'), 'force');
  assert.equal(previous.select(stage, '5:9'), 'slide');
});
