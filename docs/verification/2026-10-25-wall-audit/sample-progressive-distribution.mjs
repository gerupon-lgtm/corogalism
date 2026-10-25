import {writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRun} from '../../../src/game/run.js';
import {challengeDifficulty} from '../../../src/game/challenge.js';
import {generateVariedMaze} from '../../../src/maze/variation.js';
import {createStage} from '../../../src/world/stage.js';
import {createPuzzleStage} from '../../../src/world/puzzleStage.js';
import {getMaterial} from '../../../src/world/materials.js';
import {applyProgressiveWalls} from '../../../src/world/progressiveWalls.js';

// Build the same stage directly so root's later stagePlay integration cannot apply twice.
const out=dirname(fileURLToPath(import.meta.url));
const seeds=Array.from({length:32},(_,i)=>((i+1)*7919+77)%1000003),groups=new Map(),examples=[];
const zeroDamage=stage=>[...stage.walls,...(stage.rackets??[])].every(w=>(w.physicsMaterial?.damageK??getMaterial(w.materialId).damageK)===0);
for(const level of ['easy','normal']){
 for(const seed of seeds){
  const run=createRun(seed);
  for(let n=1;n<=100;n++){
   const variation=run.currentVariation(level),difficulty=challengeDifficulty(n,level),stageSeed=run.currentSeed();
   const stage=variation.puzzleKind?createPuzzleStage(stageSeed,{...variation,difficulty}):createStage(generateVariedMaze(variation,stageSeed),difficulty);
   const before={zero:zeroDamage(stage),stone:stage.walls.some(w=>w.materialId==='stone'),spike:stage.walls.some(w=>w.materialId==='spike')};
   applyProgressiveWalls(stage,difficulty);
   const info=stage.wallVariety;
   if(info){
    const range=n<=64?'33-64':'65-100';
    const categories=['all',...(stage.puzzle?['puzzle']:[]),...(stage.maze.baffle?['open']:[]),...(!stage.puzzle&&!stage.maze.baffle&&stage.zones.some(z=>z.kind==='ice')?['ice-non-open']:[])];
    for(const group of categories){
     const key=`${level}/${range}/${group}`;
     if(!groups.has(key))groups.set(key,{level,range,group,stages:0,profiles:{original:0,mixed:0,accent:0},noEligible:0,minimumChanged:0,nonOriginalUnchanged:0,changed:{default:0,stone:0,spike:0},eligibleSegments:0,changedSegments:0,zeroBefore:0,zeroAfter:0,stoneBefore:0,stoneAfter:0,spikeBefore:0,spikeAfter:0,shortfall:{default:0,stone:0,spike:0},splitWalls:0});
     const a=groups.get(key);a.stages++;a.profiles[info.profile]++;
     if(!info.eligibleSegments)a.noEligible++;
     if(info.minimumChanged)a.minimumChanged++;
     if(info.profile!=='original'&&!info.changedSegments)a.nonOriginalUnchanged++;
     a.eligibleSegments+=info.eligibleSegments;a.changedSegments+=info.changedSegments;a.splitWalls+=info.splitWalls;
     for(const id of ['default','stone','spike'])a.changed[id]+=info.changedCounts[id];
     for(const id of info.shortfall)a.shortfall[id]++;
     if(before.zero)a.zeroBefore++;if(zeroDamage(stage))a.zeroAfter++;
     if(before.stone)a.stoneBefore++;if(stage.walls.some(w=>w.materialId==='stone'))a.stoneAfter++;
     if(before.spike)a.spikeBefore++;if(stage.walls.some(w=>w.materialId==='spike'))a.spikeAfter++;
    }
    if(examples.filter(e=>e.level===level&&e.profile===info.profile).length<3)examples.push({level,runSeed:seed,stageSeed,stage:n,shape:variation.shape,...info});
   }
   run.clearStage({timeMs:0,noDamage:true});
  }
 }
 console.log(`Progressive audit ${level}: 3200 generated stages`);
}
const aggregates=[...groups.values()];
await writeFile(resolve(out,'progressive-distribution.json'),JSON.stringify({generatedAt:new Date().toISOString(),seeds,stagesPerRun:100,limitations:'Generation only; no actor movement, damage simulation, device input, or enjoyment verification. Profile shares include eligible original stages. No-eligible stages preserve all walls.',aggregates,examples},null,2));
const pct=(n,d)=>(100*n/d).toFixed(1),lines=['# Progressive wall generation audit','','32 seeds × 100 stages × 2 levels, preserving run history. Only stage >=33 with ice/sand/radial or puzzle participates. No game physics was simulated.','','| Level | Range | Group | Eligible stages | Original / mixed / accent | No eligible segments | Non-original unchanged | Wall-zero-damage before → after | Stone stages before → after | Spike stages before → after | Minimum-one fallback |','|---|---|---|---:|---|---:|---:|---|---|---|---:|'];
for(const a of aggregates)lines.push(`| ${a.level} | ${a.range} | ${a.group} | ${a.stages} | ${Object.values(a.profiles).map(n=>pct(n,a.stages)+'%').join(' / ')} | ${a.noEligible} | ${a.nonOriginalUnchanged} | ${pct(a.zeroBefore,a.stages)}% → ${pct(a.zeroAfter,a.stages)}% | ${pct(a.stoneBefore,a.stages)}% → ${pct(a.stoneAfter,a.stages)}% | ${pct(a.spikeBefore,a.stages)}% → ${pct(a.spikeAfter,a.stages)}% | ${a.minimumChanged} |`);
lines.push('','The minimum applies to total changed segments, not one of every material. Missing materials are recorded as shortfall. Fixed rectangles may split, so before/after segment counts are not directly comparable as wall lengths.');
await writeFile(resolve(out,'progressive-summary.md'),lines.join('\n')+'\n');
