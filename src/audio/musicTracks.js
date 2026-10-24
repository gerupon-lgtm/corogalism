/** 採用r6の5曲。接触中の床ではなく、面全体の主役に合わせる。 */
export const MUSIC_TRACKS = Object.freeze({
  default: 'bgm.wav',
  slide: 'bgm-slide.wav',
  force: 'bgm-force.wav',
  puzzle: 'bgm-puzzle.wav',
  rest: 'bgm-rest.wav',
});

export function normalizeMusicTrack(id) {
  return Object.hasOwn(MUSIC_TRACKS, id) ? id : 'default';
}

export function musicTrackForStage(stage) {
  if (stage?.puzzle || stage?.theme?.id === 'puzzle') return 'puzzle';
  const id = stage?.theme?.id;
  if (id === 'rest') return 'rest';
  // 光の滑走路は、これまでの曲を維持する。
  if (id === 'specialFlow') return 'default';
  if (['gravityAssist', 'gravityHinder', 'repulsionAssist', 'repulsionHinder', 'iceAssist'].includes(id)) return 'force';
  if (['iceRubber', 'iceSand', 'bounce'].includes(id)) return 'slide';
  if (id === 'floor-practice') {
    if (['gravity', 'repulsion'].includes(stage.theme.practiceKind)) return 'force';
    if (stage.theme.practiceKind === 'ice') return 'slide';
  }
  return 'default';
}
