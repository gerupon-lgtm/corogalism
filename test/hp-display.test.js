import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameScreen } from '../src/ui/gameScreen.js';
import { displayedHp, damageLabel, recoveryLabel } from '../src/ui/hpDisplay.js';

function screen() {
  const nodes = new Map();
  const root = { querySelector(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', value: 0, querySelector: root.querySelector,
      setAttribute() {}, removeAttribute() {}, classList: { toggle() {}, add() {}, remove() {} } });
    return nodes.get(id);
  } };
  const game = createGameScreen(root);
  const hud = (value, now = 0) => game.setHud({ timeMs: 0, wallHits: 0, tiltMagnitude: 0, mode: 'pointer',
    started: true, hp: { value, max: 100, ratio: value / 100 }, remainingSec: 10, limitSec: 10, now });
  return { game, hud, text: id => root.querySelector(id).textContent };
}

test('HP表示が変わらない微小ダメージを−1と表示しない', () => {
  const s = screen(); s.hud(99.8);
  const before = s.text('#hud-hp');
  s.game.showDamage(99.8, 99.6, 10); s.hud(99.6, 10);
  assert.equal(s.text('#hud-hp'), before);
  assert.equal(s.text('#hud-damage'), '微小');
});

test('端数をまたぐ被弾と致死ダメージは、表示HPの差と一致する', () => {
  for (const [before, after] of [[99.2,98.8],[99.8,98.1],[2.2,-5],[0.2,-3],[100,78.4]]) {
    const s = screen(); s.hud(before); s.game.showDamage(before, after, 10); s.hud(after, 10);
    assert.equal(s.text('#hud-damage'), `−${displayedHp(before) - displayedHp(after)}`);
    assert.equal(s.text('#hud-hp'), `${displayedHp(after)} / 100`);
  }
});

test('微小な被弾の蓄積でも、整数HPが減ったときだけ数値を出す', () => {
  let hp = 100;
  for (let i = 0; i < 20; i++) {
    const after = hp - 0.13;
    const difference = displayedHp(hp) - displayedHp(after);
    assert.equal(damageLabel(hp, after), difference ? '−1' : '微小'); hp = after;
  }
});

test('回復の表示もHPの増分と一致し、小さい回復を+0と表示しない', () => {
  assert.equal(recoveryLabel(80.2, 100), 'HP +19');
  assert.equal(recoveryLabel(99.8, 100), 'HPを少し回復');
  assert.equal(recoveryLabel(79.9, 99.9), 'HP +20');
});
