/** 打ち返す・道を開くを一面ずつ試す短い紹介。組み合わせは本編で体験する。 */
const context = 'げんきが0になっても続けられます。';
const lesson = (puzzleKind, title, body, art, clearNote) => Object.freeze({
  id: `puzzle-${puzzleKind}`, puzzleKind, puzzleEase: 'relaxed', title, body, art, context,
  clearNote, nextLabel: '次のしかけを試す',
});

export const PUZZLE_TUTORIAL_LESSONS = Object.freeze([
  lesson('racket', '動かして、打ち返そう', 'ラケットの中心と端で、返す向きを変えよう。', 'racket', '狙う位置で、はね返る方向が変わります。次は、壁を動かして道を開こう。'),
  Object.freeze({ ...lesson('sequence', '順に動かして、道を開こう', '球を落ち着かせ、順に戸を開こう。', 'gate', '基本の操作はこれでひと通り。本編では氷や、しかけの組み合わせも登場します。'), nextLabel: 'あそび方を終える' }),
]);

export function createPuzzleTutorialCourse(seed = 0) {
  const courseSeed = seed >>> 0;
  let index = 0;
  return {
    get index() { return index; },
    get stageCount() { return PUZZLE_TUTORIAL_LESSONS.length; },
    get lesson() { return PUZZLE_TUTORIAL_LESSONS[index]; },
    get isLast() { return index === PUZZLE_TUTORIAL_LESSONS.length - 1; },
    get stageSeed() { return (courseSeed + Math.imul(index + 1, 0x9e3779b9)) >>> 0; },
    get profile() {
      const current = PUZZLE_TUTORIAL_LESSONS[index];
      return { puzzleKind: current.puzzleKind, puzzleEase: current.puzzleEase, puzzleTutorial: true, puzzleFirstVisit: true,
        puzzleMaterialPattern: 'tutorialNormal' };
    },
    next() {
      if (index === PUZZLE_TUTORIAL_LESSONS.length - 1) return false;
      index += 1;
      return true;
    },
    reset() { index = 0; },
  };
}
