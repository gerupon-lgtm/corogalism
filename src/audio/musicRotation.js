import { musicTrackForStage } from './musicTracks.js';

const ROTATING_TRACKS = ['slide', 'force', 'puzzle'];

/** チャレンジ1回分の選曲状態。新しいチャレンジでは作り直す。 */
export function createMusicRotation(random = Math.random) {
  let remaining = [];
  let lastRotatingTrack;
  let hasCurrent = false;
  let currentKey;
  let currentTrack;

  return {
    select(stage, key) {
      // 同じ面の続行では、固定曲か抽選曲かを再判定しない。
      if (hasCurrent && currentKey === key) return currentTrack;

      const preferred = musicTrackForStage(stage);
      let track = preferred;
      if (ROTATING_TRACKS.includes(preferred)) {
        const beginsRound = remaining.length === 0;
        if (beginsRound) remaining = [...ROTATING_TRACKS];
        // 一巡の境目だけ連続を避け、除外した曲は候補に残す。
        const candidates = beginsRound
          ? remaining.filter(id => id !== lastRotatingTrack)
          : remaining;
        const totalWeight = candidates.reduce((sum, id) => sum + (id === preferred ? 2 : 1), 0);
        let draw = random() * totalWeight;
        track = candidates[candidates.length - 1];
        for (const id of candidates) {
          draw -= id === preferred ? 2 : 1;
          if (draw < 0) {
            track = id;
            break;
          }
        }
        remaining.splice(remaining.indexOf(track), 1);
        lastRotatingTrack = track;
      }

      hasCurrent = true;
      currentKey = key;
      currentTrack = track;
      return track;
    },
  };
}
