/** 5面の練習区切り。再挑戦では進めず、クリア後の「次」だけで種を進める。 */
export const PRACTICE_STAGE_COUNT = 5;

export function createPracticeCourse(startSeed) {
  let seed = Number.isFinite(startSeed) ? startSeed >>> 0 : 0;
  let stageIndex = 1;
  return {
    get stageIndex() { return stageIndex; },
    get stageCount() { return PRACTICE_STAGE_COUNT; },
    get currentSeed() { return seed; },
    get isLast() { return stageIndex === PRACTICE_STAGE_COUNT; },
    next() {
      if (stageIndex === PRACTICE_STAGE_COUNT) return false;
      seed = ((seed * 7919 + 13) % 1000003) >>> 0;
      stageIndex += 1;
      return true;
    },
  };
}

const COMMENTS = {
  start: '小さく傾けて、ゆっくり転がしてみよう。',
  wall: '曲がる前に、逆へ傾けて減速してみよう。',
  goal: '傾きを小さくして、カップを狙おう。',
};
const HOLD_MS = 4000;
const GOAL_DISTANCE = 1.3;

/** 読める間隔を保つ短文。elapsedMsは停止・説明画面を除いた時間を渡す。 */
export function createPracticeComment() {
  let active, age, lastWallHits, pendingWall, goalShown;
  function reset() {
    active = 'start';
    age = 0;
    lastWallHits = 0;
    pendingWall = false;
    goalShown = false;
  }
  function show(id) {
    if (active !== id) { active = id; age = 0; }
  }
  reset();
  return {
    reset,
    update({ actor, goal, wallHits, started, elapsedMs } = {}) {
      if (Number.isFinite(elapsedMs) && elapsedMs > 0) age += elapsedMs;
      const hits = Number.isFinite(wallHits) ? Math.max(0, Math.floor(wallHits)) : lastWallHits;
      if (hits > lastWallHits && active !== 'wall') pendingWall = true;
      lastWallHits = Math.max(lastWallHits, hits);
      const nearGoal = Boolean(started
        && Number.isFinite(actor?.x) && Number.isFinite(actor?.y)
        && Number.isFinite(goal?.x) && Number.isFinite(goal?.y)
        && Math.hypot(actor.x - goal.x, actor.y - goal.y) <= GOAL_DISTANCE);
      if (nearGoal && !goalShown) {
        goalShown = true;
        pendingWall = false;
        show('goal');
      } else if (age >= HOLD_MS) {
        if (nearGoal) show('goal');
        else if (pendingWall) { pendingWall = false; show('wall'); }
        else if (active === 'goal') show('start');
      }
      return COMMENTS[active];
    },
  };
}
