import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSIC_TRACKS, normalizeMusicTrack, musicTrackForStage } from '../src/audio/musicTracks.js';
import { themeAt } from '../src/world/themes.js';

test('面の主役から5曲へ割り当て、光の滑走路は現行曲を維持する', () => {
  const expected = ['default','default','default','slide','force','slide','force','force','rest','slide','default','default','force','rest','force','force'];
  assert.deepEqual(expected.map((_, i) => musicTrackForStage({ theme: themeAt(i + 1, 'easy') })), expected);
  assert.equal(musicTrackForStage({theme:themeAt(10,'normal')}),'default');
  for (const id of ['racket','sequence','timing','combined']) {
    assert.equal(musicTrackForStage({puzzle:{kind:id},theme:{id:'basic'}}),'puzzle');
  }
});

test('床への一時的な接触で曲を変えず、未知の指定は現行曲へ戻す', () => {
  for (const kind of ['sand','ice','radial']) {
    assert.equal(musicTrackForStage({theme:{id:'basic'},zones:[{kind}]}),'default');
  }
  assert.equal(musicTrackForStage(null),'default');
  assert.equal(normalizeMusicTrack('invalid'),'default');
  assert.equal(normalizeMusicTrack('__proto__'),'default');
  assert.equal(Object.keys(MUSIC_TRACKS).length,5);
});
