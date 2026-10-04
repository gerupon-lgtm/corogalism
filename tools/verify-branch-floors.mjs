/** 変更前の同条件と比べ、迷路・ルートの砂・既存力場を維持しているか確認。 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {restFloors} from '../src/world/stageFeatures.js';
const baseline=JSON.parse(await readFile(process.env.BRANCH_BASELINE||'docs/verification/branch-floors/previous-placement.json','utf8'));
const groups={},changes=[];
for(const old of baseline){
 const p=createStagePlay(old.seed,challengeDifficulty(old.n,old.level)),s=p.stage;
 assert.equal(createHash('sha256').update(JSON.stringify(s.maze.cells)).digest('hex'),old.maze);
 const onRoute=t=>s.maze.path.some(c=>Math.floor(t.x)===c.x&&Math.floor(t.y)===c.y);
 const sand=s.zones.find(z=>z.kind==='sand');
 assert.deepEqual(s.maze.path.filter(c=>sand?.cells.some(q=>q.x===c.x&&q.y===c.y)),old.sand);
 assert.deepEqual(s.zones.filter(z=>z.kind==='radial'&&!z.branch),old.fields);
 assert.ok(p.limitSec>=old.limit);
 for(const t of [s.recovery,s.leaf,s.hourglass].filter(Boolean))assert.ok(onRoute(t));
 const extra=s.zones.filter(z=>z.branch),affected=extra.filter(z=>s.maze.path.some(c=>Math.hypot(z.x-c.x-.5,z.y-c.y-.5)<z.radius));
 const key=`${old.level}:${old.n}:${s.theme.id}`,row=groups[key]||={level:old.level,stage:old.n,theme:s.theme.id,total:0,branchSand:0,branchField:0,branchRest:0,branchSticky:0,routeAffected:0};
 row.total++;if(sand?.cells.some(c=>!onRoute({x:c.x+.5,y:c.y+.5})))row.branchSand++;
 if(extra.length)row.branchField++;if(s.extraRests.length)row.branchRest++;if(s.sticky.some(t=>!onRoute(t)))row.branchSticky++;if(affected.length)row.routeAffected++;
 if(affected.length)changes.push({seed:old.seed,stage:old.n,level:old.level,theme:s.theme.id,addedFields:extra.length,routeAffected:affected.length,oldLimit:old.limit,newLimit:p.limitSec});
 assert.equal(restFloors(s).filter(t=>onRoute(t)).length,s.rest?1:0);
}
const result={cases:baseline.length,mazeUnchanged:true,routeSandUnchanged:true,originalFieldsUnchanged:true,itemsOnRoute:true,timeNotShortened:true,groups:Object.values(groups),routeInfluence:changes};
const output=process.env.BRANCH_OUTPUT||'docs/verification/branch-floors';await mkdir(output,{recursive:true});await writeFile(`${output}/placement.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({cases:result.cases,groups:result.groups.length,routeInfluence:changes.length,checks:'pass'}));
