/** 1面の実行状態。DOMを持たず、既存の物理・HP・時間を接続する。 */
import { BASE, TUNING, RECOVERY, LEAF, REST, STICKY } from '../config/gameConfig.js';
import { generateMaze } from '../maze/generator.js';
import { createStage, createActor, goalCenter } from '../world/stage.js';
import { getCharacter } from '../world/characters.js';
import { stepPhysics } from '../physics/integrator.js';
import { createHp } from './hp.js';
import { stageTimeLimitSec } from './progression.js';

export function createStagePlay(seed, difficulty = null, carry = {}) {
  const maze = generateMaze(BASE.mazeSize, seed);
  const stage = createStage(maze, difficulty);
  const actor = createActor(maze, getCharacter('default'));
  const origin = { x: actor.x, y: actor.y };
  const shield = carry.shield ?? { value: 0 };
  const hp = difficulty ? createHp({ turns: maze.turns, ...difficulty, shield }) : null;
  if (stage.leaf && carry.leafCollected) stage.leaf.collected = true;
  if (stage.rest && carry.restUsed) stage.rest.used = true;
  let extendedSec = 0, restOrigin = null, trap = null, releasedFloor = null;
  const onTile = (tile, radius) => tile && Math.abs(actor.x-tile.x) < radius && Math.abs(actor.y-tile.y) < radius;
  const limitSec = difficulty ? stageTimeLimitSec(maze, difficulty) : null;
  let timeMs = 0;
  let activeSec = 0;
  let wallHits = 0;
  let started = false;
  let status = 'playing';

  return {
    stage, actor, hp, limitSec, shield,
    get trap() { return trap; },
    get extendedSec() { return extendedSec; },
    assistEscape() {
      if (status !== 'playing' || !trap) return false;
      const before = trap.target;
      trap.target = Math.max(STICKY.minSec, before - STICKY.shortenSec);
      return trap.target < before;
    },
    resetRest() { if (stage.rest) stage.rest.progress = 0; restOrigin = null; },
    get timeMs() { return timeMs; },
    get wallHits() { return wallHits; },
    get started() { return started; },
    get status() { return status; },
    get remainingSec() { return limitSec === null ? null : Math.max(0, limitSec + extendedSec - timeMs / 1000); },
    /** 停止中は呼ばない。elapsedMsは実時間、dtは物理用に上限を設けた秒数。 */
    advance({ dt, elapsedMs, tilt, base, onImpact, onRecovery, onFeature }) {
      if (status !== 'playing') return 0;
      activeSec += Math.max(0, elapsedMs) / 1000;
      if (started) timeMs += Math.max(0, elapsedMs);
      let damage = 0;
      if (releasedFloor && !onTile(releasedFloor, .5 + actor.r)) releasedFloor = null;
      if (trap) {
        trap.elapsed += Math.max(0, elapsedMs) / 1000;
        actor.vx = 0; actor.vy = 0;
        if (trap.elapsed >= trap.target) { releasedFloor = trap.tile; trap = null; }
      }
      const result = trap ? { wallHits: 0 } : stepPhysics({
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
      else if (limitSec !== null && timeMs >= (limitSec + extendedSec) * 1000) status = 'timeout';
      else {
        const leaf = stage.leaf;
        if (leaf && !leaf.collected && onTile(leaf, actor.r + LEAF.radius) && shield.value < hp.max * LEAF.capRatio) {
          shield.value += Math.min(hp.max * LEAF.amountRatio, hp.max * LEAF.capRatio - shield.value);
          leaf.collected = true; onFeature?.('leaf');
        }
        if (!trap) {
          const tile = stage.sticky.find(t => t !== releasedFloor && onTile(t, STICKY.radius));
          if (tile) { trap = { tile, elapsed: 0, target: STICKY.durationSec }; actor.vx = 0; actor.vy = 0; }
        }
        const rest = stage.rest;
        if (rest && !rest.used && hp.value < hp.max && onTile(rest, REST.radius)
          && Math.hypot(actor.vx,actor.vy) <= REST.speed) {
          if (!restOrigin) { restOrigin = {x:actor.x,y:actor.y}; rest.progress = 0; }
          else if (Math.hypot(actor.x-restOrigin.x,actor.y-restOrigin.y) > REST.drift) {
            rest.progress = 0; restOrigin = {x:actor.x,y:actor.y};
          } else rest.progress += Math.max(0,elapsedMs)/1000;
          if (rest.progress >= REST.durationSec) {
            hp.heal(hp.max * REST.healRatio); rest.used = true; rest.progress = REST.durationSec;
            extendedSec += REST.durationSec; onFeature?.('rest');
          }
        } else { if (rest) rest.progress = 0; restOrigin = null; }
        const item = stage.recovery;
        if (item && !item.collected && hp.value < hp.max
          && Math.hypot(actor.x - item.x, actor.y - item.y) < actor.r + RECOVERY.radius) {
          const before = hp.value;
          const gained = hp.heal(hp.max * RECOVERY.healRatio);
          if (gained > 0) { item.collected = true; onRecovery?.(gained, { before, after: hp.value }); }
        }
        if (Math.hypot(actor.x - goal.x, actor.y - goal.y) < TUNING.goalRadius) status = 'clear';
      }
      return damage;
    },
    /** 開発用フックから使う。通常プレイは物理の移動速度で開始する。 */
    teleport(x, y) {
      actor.x = x; actor.y = y; actor.vx = 0; actor.vy = 0;
      started = true;
    },
  };
}
