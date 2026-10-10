/** 動く壁を一つずつ試した後、組み合わせを体験する短い紹介コース。 */
const context = 'げんきが0になっても続けられます。';
const lesson = (puzzleKind, title, body, art, clearNote) => Object.freeze({
  id: `puzzle-${puzzleKind}`, puzzleKind, puzzleEase: 'relaxed', title, body, art, context,
  clearNote, nextLabel: '次のしかけを試す',
});

export const PUZZLE_TUTORIAL_LESSONS = Object.freeze([
  lesson('racket', '動かして、打ち返そう', 'ラケットの中心と端で、返す向きを変えよう。', 'racket', '狙う位置で、はね返る方向が変わります。次は、壁を動かして道を開こう。'),
  lesson('sequence', '順に動かして、道を開こう', '球を落ち着かせ、順に戸を開こう。', 'gate', '球を落ち着かせる場所が、道を開く手がかりです。次は、氷で球の勢いを使ってみよう。'),
  lesson('timing', '切り返して、滑り込もう', '球の勢いを残し、戸を開いて滑り込もう。', 'timing-demo', '壁は切り返しても、球には勢いが残ります。ここからは、しかけを組み合わせよう。'),
  lesson('openRacket', '道を開いて、打ち返そう', '戸を開き、ラケットで次の部屋へ送ろう。', 'racket', '道を開いた先でも、ラケットで狙いを変えられます。次は、順番とタイミングを組み合わせよう。'),
  lesson('sequenceTiming', '順に開いて、滑り込もう', '戸を順に開き、最後は勢いで滑り込もう。', 'gate', '落ち着いて道を作る場面と、勢いを使う場面がつながります。最後は、打ち返しから滑り込もう。'),
  Object.freeze({ ...lesson('racketTiming', '打ち返して、滑り込もう', 'ラケットで球を送り、切り返して戸を開こう。', 'timing-demo', '本編では、普通の迷路・一つのしかけ・組み合わせが登場します。やさしいでも通常でも遊べます。'), nextLabel: 'あそび方を終える' }),
]);

export function createPuzzleTutorialCourse(seed = 0) {
  const courseSeed = seed >>> 0;
  let index = 0;
  return {
    get index() { return index; },
    get lesson() { return PUZZLE_TUTORIAL_LESSONS[index]; },
    get isLast() { return index === PUZZLE_TUTORIAL_LESSONS.length - 1; },
    get stageSeed() { return (courseSeed + Math.imul(index + 1, 0x9e3779b9)) >>> 0; },
    get profile() {
      const current = PUZZLE_TUTORIAL_LESSONS[index];
      return { puzzleKind: current.puzzleKind, puzzleEase: current.puzzleEase, puzzleTutorial: true, puzzleFirstVisit: true,
        puzzleMaterialPattern: index < 2 ? 'tutorialNormal' : 'iceRubber' };
    },
    next() {
      if (index === PUZZLE_TUTORIAL_LESSONS.length - 1) return false;
      index += 1;
      return true;
    },
    reset() { index = 0; },
  };
}
