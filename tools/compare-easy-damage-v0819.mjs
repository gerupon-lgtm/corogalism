/** v0.8.19: 旧式との数値比較。ゲーム本体や保存データは変更しない。 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { challengeDifficulty } from '../src/game/challenge.js';
import { createHp } from '../src/game/hp.js';
import { createStagePlay } from '../src/game/stagePlay.js';
import { generateMaze } from '../src/maze/generator.js';
import { createStage, createActor } from '../src/world/stage.js';
import { getCharacter } from '../src/world/characters.js';
import { MATERIALS } from '../src/world/materials.js';
import { resolveCollisions } from '../src/physics/collision.js';
import { stepPhysics } from '../src/physics/integrator.js';
import { resolveParams } from '../src/physics/resolveParams.js';
import { BASE, HP, TUNING } from '../src/config/gameConfig.js';
import * as currentConfig from '../src/config/gameConfig.js';

const started = performance.now();
const output = new URL('../docs/verification/v0.8.19/comparison.json', import.meta.url);
const rows = [1, 5, 10, 11, 17, 23, 24, 40, 100];
const speeds = [0, 1.2, 1.8, 2.8, 4, 6, 30];
const levels = ['easy', 'normal'];
const oldHp = { base: 40, damageScale: 10, threshold: 1.2, capRatio: .35, cooldownSec: .25 };
const stableSources = ['src/game/hp.js', 'src/game/progression.js', 'src/physics/integrator.js',
  'src/physics/collision.js', 'src/physics/resolveParams.js', 'src/world/materials.js',
  'src/world/stage.js', 'src/maze/generator.js', 'src/game/stagePlay.js',
  'src/world/floorThemes.js', 'src/world/stageFeatures.js', 'src/world/themes.js',
  'src/world/recovery.js', 'src/world/progressiveWalls.js'];
const canonical = value => value.replace(/\r\n/g, '\n');
const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const sourceDigests = async () => Object.fromEntries(await Promise.all(stableSources.map(async path =>
  [path, digest(canonical(await readFile(new URL(`../${path}`, import.meta.url), 'utf8')))])));
const gitHead = path => execFileSync('git', ['show', `HEAD:${path}`], {
  cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', windowsHide: true });
function withoutDamageConfig(config) {
  const copy = JSON.parse(JSON.stringify(config));
  delete copy.FLOOR_CHALLENGE.damageFactor;
  delete copy.FLOOR_CHALLENGE.damageIntroEndStage;
  return copy;
}

// v0.8.18 の実装を変更前に読んで固定した値。新設定を参照しない独立した比較用の式。
function oldParameters(stage, level) {
  const n = Math.max(1, Math.floor(stage));
  const intro = Math.max(0, (10 - n) / 9);
  const factor = level === 'easy' ? .4 : .65;
  return { hpPerTurn: 4, damageMult: Math.min(1.4, 1 + .015 * (n - 1)) * (1 - .5 * intro) * factor,
    damageCapRatio: (.2 + .15 * (1 - intro)) * factor };
}
function oldDifficulty(stage, level) {
  return { ...challengeDifficulty(stage, level), ...oldParameters(stage, level) };
}
function nonDamageFields(difficulty) {
  const { damageMult, damageCapRatio, ...fields } = difficulty;
  return fields;
}
function fieldCases(getDifficulty = challengeDifficulty) {
  return levels.flatMap(level => Array.from({ length: 150 }, (_, i) =>
    ({ level, stage: i + 1, fields: nonDamageFields(getDifficulty(i + 1, level)) })));
}
function timeCases(getDifficulty = challengeDifficulty) {
  return levels.flatMap(level => rows.map(stage => {
    const play = createStagePlay(7919, getDifficulty(stage, level));
    return { level, stage, seed: 7919, turns: play.stage.maze.turns, pathLength: play.stage.maze.pathLength,
      maxHp: play.hp.max, limitSec: play.limitSec };
  }));
}
async function save(report) {
  await mkdir(new URL('.', output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (process.argv.includes('--capture-baseline') || process.argv.includes('--capture-baseline-from-head')) {
  let baselineDifficulty = challengeDifficulty;
  let provenance = 'Live v0.8.18 before editing';
  let baselineSource = await sourceDigests();
  let baselineConfig = currentConfig;
  if (process.argv.includes('--capture-baseline-from-head')) {
    // 作業ファイルを戻さず、変更前コミットの設定と難易度関数を読み込む。
    const headConfigSource = gitHead('src/config/gameConfig.js');
    const headConfigUrl = `data:text/javascript;base64,${Buffer.from(headConfigSource).toString('base64')}`;
    baselineConfig = await import(headConfigUrl);
    const headChallengeSource = gitHead('src/game/challenge.js')
      .replace("'../config/gameConfig.js'", JSON.stringify(headConfigUrl))
      .replace("'./progression.js'", JSON.stringify(new URL('../src/game/progression.js', import.meta.url).href));
    baselineDifficulty = (await import(`data:text/javascript;base64,${Buffer.from(headChallengeSource).toString('base64')}`)).challengeDifficulty;
    baselineSource = Object.fromEntries(stableSources.map(path => [path, digest(canonical(gitHead(path)))]));
    assert.deepEqual(await sourceDigests(), baselineSource, 'Core differs from tracked baseline');
    assert.deepEqual(withoutDamageConfig(currentConfig), withoutDamageConfig(baselineConfig), 'Non-damage config differs from HEAD');
    provenance = `Git HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], {cwd:fileURLToPath(new URL('..', import.meta.url)),encoding:'utf8',windowsHide:true}).trim()}; old challenge/config loaded directly, unchanged core checked by SHA-256`;
  }
  for (const level of levels) for (let n = 1; n <= 150; n++) {
    const actual = baselineDifficulty(n, level), old = oldParameters(n, level);
    assert.equal(actual.damageMult, old.damageMult, `baseline multiplier ${level} ${n}`);
    assert.equal(actual.damageCapRatio, old.damageCapRatio, `baseline cap ${level} ${n}`);
    assert.equal(actual.hpPerTurn, old.hpPerTurn);
  }
  assert.deepEqual(baselineConfig.HP, oldHp);
  const baseline = { capturedAt: new Date().toISOString(), version: 'v0.8.18',
    provenance,
    oldFormula: { introEndStage: 10, easyFactor: .4, normalFactor: .65, damageStep: .015, damageMax: 1.4 },
    hpConfig: { ...baselineConfig.HP }, nonDamageConfigSha256: digest(withoutDamageConfig(baselineConfig)),
    nonDamageFieldCases: 300, nonDamageFieldsSha256: digest(fieldCases(baselineDifficulty)),
    timeAndInitialHp: timeCases(baselineDifficulty), stableSourceSha256: baselineSource };
  await save({ baseline });
  console.log(JSON.stringify({ baseline: 'captured', output: fileURLToPath(output), elapsedMs: performance.now() - started }));
  process.exit(0);
}

const { baseline } = JSON.parse(await readFile(output, 'utf8'));
assert.ok(baseline, 'Run --capture-baseline against v0.8.18 before editing sources');
assert.deepEqual(HP, baseline.hpConfig, 'HP settings changed');
assert.equal(digest(withoutDamageConfig(currentConfig)), baseline.nonDamageConfigSha256, 'Non-damage config changed');
assert.equal(digest(fieldCases()), baseline.nonDamageFieldsSha256, 'A non-damage difficulty field changed');
assert.deepEqual(timeCases(), baseline.timeAndInitialHp, 'Initial HP or time limit changed');
assert.deepEqual(await sourceDigests(), baseline.stableSourceSha256, 'HP, time, or physics source changed');
assert.equal(challengeDifficulty(1, 'easy').damageMult, .14, 'v0.8.19 easy factor is not ready');
assert.equal(challengeDifficulty(24, 'easy').damageCapRatio, .35 * .28, 'v0.8.19 grace endpoint is not ready');

// HPの独立計算と実createHpを照合し、通常が変わらず、やさしいが増えないことを確認。
let damageCases = 0;
for (let n = 1; n <= 150; n++) for (const material of Object.values(MATERIALS)) for (const speed of speeds) {
  for (const level of levels) {
    const old = oldParameters(n, level), current = challengeDifficulty(n, level);
    const expected = speed <= oldHp.threshold ? 0 : Math.min(140 * old.damageCapRatio,
      oldHp.damageScale * old.damageMult * material.damageK * (speed - oldHp.threshold) ** 2);
    const hp = createHp({ turns: 25, ...current });
    const actual = hp.applyImpact(speed, { materialId: material.id }, 1);
    if (level === 'normal') assert.equal(actual, expected, `normal changed: ${n}/${material.id}/${speed}`);
    else assert.ok(actual <= expected, `easy increased: ${n}/${material.id}/${speed}`);
    assert.equal(hp.max, 140);
    damageCases++;
  }
}

// 毎回同じ位置・法線速度から本物の衝突処理を通す。0.5秒間隔で無敵時間を避ける。
function repeatedHits(difficulty, speed) {
  const hp = createHp({ turns: 25, ...difficulty });
  const wall = { x: 1, y: 0, w: .24, h: 3, materialId: 'default' };
  const restitution = (contactWall, impactSpeed) => resolveParams({ base: BASE,
    character: getCharacter('default'), material: MATERIALS[contactWall.materialId], impactSpeed }).restitution;
  let hits = 0, wallHits = 0, firstDamage, firstImpact;
  while (!hp.isDead && hits < 10000) {
    const actor = { x: .9, y: 1.5, r: .2, vx: speed, vy: 0 };
    const hitTime = hits * .5;
    wallHits += resolveCollisions(actor, [wall], restitution, (impact, contactWall) => {
      const damage = hp.applyImpact(impact, contactWall, hitTime);
      if (hits === 0) { firstDamage = damage; firstImpact = impact; }
    });
    hits++;
  }
  assert.ok(hp.isDead, 'Repeated-hit workload did not reach HP zero');
  assert.equal(firstImpact, speed, 'Collision callback must receive requested normal speed');
  assert.equal(wallHits, hits, 'All moderate/capped impacts must also count as wall hits');
  return { firstDamage, capHp: hp.max * difficulty.damageCapRatio, capRatio: difficulty.damageCapRatio,
    hitsUntilDead: hits, wallHits, finalHp: hp.value };
}
const comparison = rows.map(stage => ({ stage, maxHp: 140, materialId: 'default',
  moderate: { speed: 2.8, old: repeatedHits(oldDifficulty(stage, 'easy'), 2.8),
    current: repeatedHits(challengeDifficulty(stage, 'easy'), 2.8) },
  capped: { speed: 4, old: repeatedHits(oldDifficulty(stage, 'easy'), 4),
    current: repeatedHits(challengeDifficulty(stage, 'easy'), 4) } }));
assert.equal(comparison.find(row => row.stage === 11).moderate.old.hitsUntilDead, 12);
assert.equal(comparison.find(row => row.stage === 11).capped.old.hitsUntilDead, 8);
for (const row of comparison) for (const kind of ['moderate', 'capped']) {
  assert.ok(row[kind].current.firstDamage < row[kind].old.firstDamage);
  assert.ok(row[kind].current.hitsUntilDead > row[kind].old.hitsUntilDead);
}

// ゲーム終了による停止は切り離し、同じ入力を同じフレーム数だけ流す。
// HP用の通知は別々に接続するが、転がりのx/y/vx/vyと壁ヒット数は完全一致を求める。
const trajectoryCases = [];
let trajectoryScalars = 0;
for (const size of [7, 8, 13]) for (const seed of [7919, 271828]) for (const n of [1, 11, 24, 40]) {
  const old = oldDifficulty(n, 'easy'), current = challengeDifficulty(n, 'easy');
  const maze = generateMaze(size, seed);
  const stages = [createStage(structuredClone(maze), old), createStage(structuredClone(maze), current)];
  assert.equal(digest(stages[0]), digest(stages[1]), 'Damage changes altered seeded stage data');
  const actors = stages.map(stage => createActor(stage.maze, getCharacter('default')));
  const hp = [createHp({ turns: stages[0].maze.turns, ...old }), createHp({ turns: stages[1].maze.turns, ...current })];
  const impactCounts = [0, 0], totalWallHits = [0, 0], firstDeadAtFrame = [null, null];
  const frames = 1800;
  for (let frame = 0; frame < frames; frame++) {
    const phase = Math.floor(frame / 90) % 8;
    const tilt = [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1},
      {x:.7,y:.7},{x:-.7,y:.7},{x:-.7,y:-.7},{x:.7,y:-.7}][phase];
    for (let i = 0; i < 2; i++) {
      const result = stepPhysics({ actor: actors[i], stage: stages[i], tilt, base: BASE, dt: 1 / 60,
        onImpact(speed, wall) { impactCounts[i]++; if (!hp[i].isDead) hp[i].applyImpact(speed, wall, frame / 60); } });
      totalWallHits[i] += result.wallHits;
      if (hp[i].isDead && firstDeadAtFrame[i] === null) firstDeadAtFrame[i] = frame;
    }
    for (const key of ['x', 'y', 'vx', 'vy']) {
      assert.equal(actors[0][key], actors[1][key], `trajectory differs size=${size} seed=${seed} stage=${n} frame=${frame} ${key}`);
      trajectoryScalars++;
    }
    assert.equal(totalWallHits[0], totalWallHits[1]);
  }
  assert.ok(impactCounts[0] > 0, 'Trace must exercise collision callbacks');
  assert.equal(impactCounts[0], impactCounts[1]);
  trajectoryCases.push({ size, seed, stage: n, frames, impactCallbacks: impactCounts,
    wallHits: totalWallHits, finalHp: hp.map(value => value.value), firstDeadAtFrame,
    finalActor: Object.fromEntries(['x','y','vx','vy'].map(key => [key, actors[0][key]])), exactMatch: true });
}
const report = { baseline, verification: { at: new Date().toISOString(), version: 'v0.8.19',
  command: 'node tools/compare-easy-damage-v0819.mjs', elapsedMs: performance.now() - started,
  hitSetup: { maxHp: 140, turns: 25, wallMaterial: 'default', normalSpeedModerate: 2.8,
    normalSpeedCapped: 4, intervalSec: .5, threshold: TUNING.wallHitSpeed },
  damageCases, stages: [1,150], speeds, materials: Object.keys(MATERIALS),
  assertions: { normalDamageUnchanged: true, easyDamageNeverHigher: true, initialHpAndTimeUnchanged: true,
    nonDamageDifficultyFieldsUnchanged: true, stableCoreSourcesUnchanged: true, exactTrajectoryScalars: trajectoryScalars },
  evidenceBoundary: ['Deterministic numeric/Node comparison using production HP, collision and physics functions.',
    'Equal repeated impacts are a controlled example, not a measured human play history.',
    'Trajectory comparison continues before applying gameplay game-over stopping; it isolates rolling behavior from longer survival.',
    'No browser, physical-device, sensor, audio, or human difficulty acceptance is claimed.'] },
  comparison, trajectoryCases };
await save(report);
console.table(comparison.map(row => ({ stage: row.stage,
  oldDamage: row.moderate.old.firstDamage.toFixed(4), newDamage: row.moderate.current.firstDamage.toFixed(4),
  oldCap: row.capped.old.capHp.toFixed(4), newCap: row.capped.current.capHp.toFixed(4),
  moderateHits: `${row.moderate.old.hitsUntilDead} -> ${row.moderate.current.hitsUntilDead}`,
  cappedHits: `${row.capped.old.hitsUntilDead} -> ${row.capped.current.hitsUntilDead}` })));
console.log(JSON.stringify({ result: 'passed', damageCases, trajectoryCases: trajectoryCases.length,
  trajectoryScalars, elapsedMs: report.verification.elapsedMs, output: fileURLToPath(output) }));
