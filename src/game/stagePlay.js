/** 1面の実行状態。DOMを持たず、既存の物理・HP・時間を接続する。 */
import { BASE, TUNING } from '../config/gameConfig.js';
import { generateMaze } from '../maze/generator.js';
import { createStage, createActor, goalCenter } from '../world/stage.js';
import { getCharacter } from '../world/characters.js';
import { stepPhysics } from '../physics/integrator.js';
import { createHp } from './hp.js';
import { stageTimeLimitSec } from './progression.js';

export function createStagePlay(seed, difficulty = null) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze, difficulty);
  const actor = createActor(maze, getCharacter('default'));
  const origin = { x: actor.x, y: actor.y };
  const hp = difficulty ? createHp({ turns: maze.turns, ...difficulty }) : null;
  const limitSec = difficulty ? stageTimeLimitSec(maze, difficulty) : null;
  let timeMs = 0;
  let activeSec = 0;
  let wallHits = 0;
  let started = false;
  let status = 'playing';

  return {
    stage, actor, hp, limitSec,
    get timeMs() { return timeMs; },
    get wallHits() { return wallHits; },
    get started() { return started; },
    get status() { return status; },
    get remainingSec() { return limitSec === null ? null : Math.max(0, limitSec - timeMs / 1000); },
    /** 停止中は呼ばない。elapsedMsは実時間、dtは物理用に上限を設けた秒数。 */
    advance({ dt, elapsedMs, tilt, base, onImpact }) {
      if (status !== 'playing') return 0;
      activeSec += Math.max(0, elapsedMs) / 1000;
      if (started) timeMs += Math.max(0, elapsedMs);
      let damage = 0;
      const result = stepPhysics({
        actor, stage, tilt, base, dt,
        onImpact(speed, wall) {
          if (hp && !hp.isDead) damage += hp.applyImpact(speed, wall, activeSec);
          onImpact?.(speed, wall);
        },
      });
      wallHits += result.wallHits;
      if (Math.hypot(actor.vx, actor.vy) > TUNING.startMoveSpeed
        || (hp && Math.hypot(actor.x - origin.x, actor.y - origin.y) >= TUNING.challengeStartDistance)) started = true;
      const goal = goalCenter(maze);
      // 最終フレームでゴールに触れても、死亡・時間切れならクリアにしない。
      if (hp?.isDead) status = 'dead';
      else if (limitSec !== null && timeMs >= limitSec * 1000) status = 'timeout';
      else if (Math.hypot(actor.x - goal.x, actor.y - goal.y) < TUNING.goalRadius) status = 'clear';
      return damage;
    },
    /** 開発用フックから使う。通常プレイは物理の移動速度で開始する。 */
    teleport(x, y) {
      actor.x = x; actor.y = y; actor.vx = 0; actor.vy = 0;
      started = true;
    },
  };
}
