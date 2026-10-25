import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createRun } from '../../../src/game/run.js';
import { createStagePlay } from '../../../src/game/stagePlay.js';
import { challengeDifficulty } from '../../../src/game/challenge.js';
import { getMaterial } from '../../../src/world/materials.js';

// Audit only: generate stages and advance independent local run objects.
// No actor simulation, record persistence, audio, source mutation, or publication.
const out = dirname(fileURLToPath(import.meta.url));
const root = resolve(out, '../../..');
const seeds = Array.from({ length: 32 }, (_, i) => ((i + 1) * 7919 + 77) % 1000003);
const sources = ['src/world/themes.js', 'src/world/floorThemes.js', 'src/world/puzzleMaterials.js', 'src/config/gameConfig.js', 'src/game/stageVariety.js', 'src/game/puzzleVariety.js', 'src/world/stage.js', 'src/world/puzzleStage.js', 'src/world/materials.js'];
const sourceHashes = {};
for (const path of sources) sourceHashes[path] = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
const ranges = n => n <= 16 ? '01-16' : n <= 23 ? '17-23' : n <= 32 ? '24-32' : n <= 64 ? '33-64' : '65-100';
const aggregates = new Map(), themeAggregates = new Map(), rows = [];
function blank(level, range, group) {
  return { level, range, group, stages: 0, fixedWallSegments: 0, movingWallSegments: 0, fixedMaterials: {}, movingMaterials: {}, stagesWithMaterial: {}, allWallsZeroDamageStages: 0, stagesWithStandard: 0, stagesWithStoneOrSpike: 0, patterns: {}, firstSampleStage: {}, shapes: {}, themes: {} };
}
const damage = w => w.physicsMaterial?.damageK ?? getMaterial(w.materialId).damageK;
function add(map, key, level, range, group, row, fixed, moving) {
  if (!map.has(key)) map.set(key, blank(level, range, group));
  const a = map.get(key); a.stages++;
  a.fixedWallSegments += fixed.length; a.movingWallSegments += moving.length;
  for (const w of fixed) a.fixedMaterials[w.materialId] = (a.fixedMaterials[w.materialId] ?? 0) + 1;
  for (const w of moving) a.movingMaterials[w.materialId] = (a.movingMaterials[w.materialId] ?? 0) + 1;
  const ids = [...new Set([...fixed, ...moving].map(w => w.materialId))];
  for (const id of ids) { a.stagesWithMaterial[id] = (a.stagesWithMaterial[id] ?? 0) + 1; a.firstSampleStage[id] = Math.min(a.firstSampleStage[id] ?? Infinity, row.stage); }
  if ([...fixed, ...moving].every(w => damage(w) === 0)) a.allWallsZeroDamageStages++;
  if (ids.includes('default')) a.stagesWithStandard++;
  if (ids.includes('stone') || ids.includes('spike')) a.stagesWithStoneOrSpike++;
  if (row.pattern) a.patterns[row.pattern] = (a.patterns[row.pattern] ?? 0) + 1;
  a.shapes[row.shape] = (a.shapes[row.shape] ?? 0) + 1;
  a.themes[row.theme] = (a.themes[row.theme] ?? 0) + 1;
}
for (const level of ['easy', 'normal']) {
  for (const runSeed of seeds) {
    const run = createRun(runSeed);
    for (let n = 1; n <= 100; n++) {
      const variation = run.currentVariation(level);
      const { stage } = createStagePlay(run.currentSeed(), challengeDifficulty(n, level), { variation });
      const fixed = stage.walls, moving = stage.rackets ?? [];
      const ice = stage.zones.some(z => z.kind === 'ice'), open = Boolean(stage.maze.baffle), puzzle = Boolean(stage.puzzle);
      const row = { level, runSeed, stage: n, stageSeed: run.currentSeed(), shape: variation.shape, theme: stage.theme.id, size: stage.maze.size, pattern: stage.puzzle?.materialPattern ?? null, ice, open, puzzle, fixedMaterials: {}, movingMaterials: {} };
      for (const w of fixed) row.fixedMaterials[w.materialId] = (row.fixedMaterials[w.materialId] ?? 0) + 1;
      for (const w of moving) row.movingMaterials[w.materialId] = (row.movingMaterials[w.materialId] ?? 0) + 1;
      rows.push(row);
      const groups = ['all', ...(puzzle ? ['puzzle'] : ['ordinary', ...(ice ? ['ice'] : []), ...(open ? ['open'] : []), ...(ice && open ? ['ice-open'] : []), ...(ice && !open ? ['ice-non-open'] : []), ...(stage.theme.special ? ['specialFlow'] : [])])];
      for (const group of groups) {
        const range = ranges(n);
        add(aggregates, `${level}/${range}/${group}`, level, range, group, row, fixed, moving);
        add(aggregates, `${level}/all/${group}`, level, 'all', group, row, fixed, moving);
      }
      add(themeAggregates, `${level}/${stage.theme.id}/${open ? 'open' : puzzle ? 'puzzle' : 'maze'}`, level, 'all', `${stage.theme.id}/${open ? 'open' : puzzle ? 'puzzle' : 'maze'}`, row, fixed, moving);
      run.clearStage({ timeMs: 0, noDamage: true });
    }
  }
  console.log(`Generated ${level}: ${seeds.length * 100} stages`);
}
const data = { generatedAt: new Date().toISOString(), seedRule: '((i + 1) * 7919 + 77) % 1000003, i = 0..31', seeds, stagesPerRun: 100, sourceHashes, limitations: ['Stage generation and wall-segment counts only; no moving-wall operation, damage simulation, physical-device play, or enjoyment evaluation.', 'Percentages of fixed wall segments are not wall lengths, contact probabilities, actual HP loss, or area.', 'Sample frequencies depend on history and seeds; configured weights alone are not actual stage probabilities.', 'Movable racket/gate walls are counted separately from fixed walls.'], aggregates: [...aggregates.values()], themeAggregates: [...themeAggregates.values()], rows };
await writeFile(resolve(out, 'distribution.json'), JSON.stringify(data, null, 2));
const pct = (n, d) => d ? (n * 100 / d).toFixed(1) : '0.0';
const mix = a => Object.entries(a.fixedMaterials).sort((a,b) => b[1]-a[1]).map(([id,n]) => `${id} ${pct(n,a.fixedWallSegments)}%`).join(', ');
const lines = ['# Wall generation audit (2026-10-25)', '', '32 deterministic run seeds × 100 stages × 2 levels = 6,400 actual generated stages. Each run preserves the current variation history. No actor movement is simulated.', '', 'Fixed-wall percentages are counts of wall rectangle segments, not wall length, contact probability, or HP loss. Moving walls are counted separately in distribution.json.', '', '| Level | Stage range | Group | Stages | Entire stage zero-damage walls | Stage with standard | Stage with stone/spike | Fixed wall segment mix |', '|---|---|---|---:|---:|---:|---:|---|'];
for (const a of data.aggregates.filter(a => ['ice-non-open','ice-open','open','puzzle'].includes(a.group)).sort((a,b) => a.level.localeCompare(b.level)||a.group.localeCompare(b.group)||a.range.localeCompare(b.range))) lines.push(`| ${a.level} | ${a.range} | ${a.group} | ${a.stages} | ${pct(a.allWallsZeroDamageStages,a.stages)}% | ${pct(a.stagesWithStandard,a.stages)}% | ${pct(a.stagesWithStoneOrSpike,a.stages)}% | ${mix(a)} |`);
lines.push('', '## Puzzle material pattern frequencies', '', '| Level | Range | Puzzle stages | Patterns (share of generated puzzle stages) |', '|---|---|---:|---|');
for (const a of data.aggregates.filter(a => a.group === 'puzzle').sort((a,b) => a.level.localeCompare(b.level)||a.range.localeCompare(b.range))) lines.push(`| ${a.level} | ${a.range} | ${a.stages} | ${Object.entries(a.patterns).map(([id,n]) => `${id} ${pct(n,a.stages)}%`).join(', ')} |`);
lines.push('', '## Theme and shape fixed-wall mix', '', '| Level | Theme / shape | Stages | Fixed wall segment mix |', '|---|---|---:|---|');
for (const a of data.themeAggregates.sort((a,b) => a.level.localeCompare(b.level)||a.group.localeCompare(b.group))) lines.push(`| ${a.level} | ${a.group} | ${a.stages} | ${mix(a)} |`);
await writeFile(resolve(out, 'summary.md'), lines.join('\n') + '\n');
console.log(`Wrote ${rows.length} stage rows and ${data.aggregates.length} aggregate rows to ${out}`);
