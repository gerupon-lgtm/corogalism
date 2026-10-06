/** 本編と同じラン選択・時間・げんきで確認。操縦モデルの成功は人間の成功保証ではない。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRun} from '../src/game/run.js';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {checkReachability} from '../src/maze/validator.js';
import {createTiltVector} from '../src/input/tiltVector.js';
import {BASE} from '../src/config/gameConfig.js';

const output=process.env.VARIETY_OUTPUT||'docs/verification/maze-variation/v0620';await mkdir(output,{recursive:true});
const picked=new Set([...Array.from({length:16},(_,i)=>i+1),17,23,29,40,64,100,107,125]);
const balance=[],campaigns=[];
function play(seed,difficulty,variation,careful){
 const p=createStagePlay(seed,difficulty,{variation}),path=p.stage.maze.path,input=createTiltVector();
 let wp=1,next=0,response=0,thinking=0;const dt=1/60;
 for(let frame=0;frame<(p.limitSec+p.extendedSec+3)*60&&p.status==='playing';frame++){
  if(frame>=next){
   const a=p.actor;let t=path[wp],dx=t.x+.5-a.x,dy=t.y+.5-a.y,dist=Math.hypot(dx,dy);
   if(dist<.24&&wp<path.length-1){wp++;if(careful&&wp%4===0)thinking=frame+36;t=path[wp];dx=t.x+.5-a.x;dy=t.y+.5-a.y;dist=Math.hypot(dx,dy);}
   const ice=p.stage.zones.some(z=>z.kind==='ice'&&z.cells.some(c=>c.x===Math.floor(a.x)&&c.y===Math.floor(a.y)));
   const target=Math.min(ice?(careful?1:1.35):(careful?1.1:1.7),dist*3.2);
   let x=(dx/(dist||1)*target-a.vx)*.65,y=(dy/(dist||1)*target-a.vy)*.65;
   if(response%31===12){x+=.12;y-=.1;}if(frame<thinking){x=0;y=0;}
   const m=Math.max(1,Math.hypot(x,y));input.setRaw(x/m,y/m);next=frame+(careful?18:11);response++;
  }
  input.update(dt,BASE.inputSmoothing);p.advance({dt,elapsedMs:dt*1000,tilt:input.value,base:BASE});
  if(p.trap&&frame%12===0)p.assistEscape();
 }
 return {seed,level:difficulty.level,stage:difficulty.stage,variation,theme:p.stage.theme.id,materials:p.stage.walls.reduce((a,w)=>(a[w.materialId]=(a[w.materialId]||0)+1,a),{}),fields:p.stage.zones.filter(z=>z.kind==='radial').length,controller:careful?'careful-300ms-thinking':'180ms-imperfect',result:p.status,seconds:+(p.timeMs/1000).toFixed(2),limit:p.limitSec,hp:+p.hp.value.toFixed(1),maxHp:p.hp.max,path:path.length,turns:p.stage.maze.turns};
}
for(const level of ['easy','normal'])for(const runSeed of [1,77,913,7919]){
 const run=createRun(runSeed),profiles=[];
 for(let n=1;n<=150;n++){
  const variation=run.currentVariation(level);profiles.push(variation);
  if(picked.has(n))for(const careful of [false,true]){
   const p=createStagePlay(run.currentSeed(),challengeDifficulty(n,level),{variation});
   assert.ok(checkReachability(p.stage.maze).ok);assert.equal(p.hp.max,40+4*p.stage.maze.turns);
   for(const z of p.stage.zones.filter(z=>z.kind==='radial'))if(p.stage.maze.baffle){
    const b=p.stage.maze.baffle,size=p.stage.maze.size;
    assert.ok(z.x>.5&&z.x<size-.5&&z.y>.5&&z.y<size-.5);
    assert.ok(Math.hypot(z.x-.5,z.y-.5)>z.radius+.35);
    assert.ok(Math.hypot(z.x-size+.5,z.y-size+.5)>z.radius+.35);
    assert.ok(z[b.axis==='x'?'y':'x']+z.radius<b.gap);
   }
   balance.push(play(run.currentSeed(),challengeDifficulty(n,level),variation,careful));
  }
  run.clearStage({timeMs:0,noDamage:true});
 }
 campaigns.push({level,runSeed,profiles});console.log(JSON.stringify({level,runSeed,balanceCases:balance.length,failed:balance.filter(r=>r.result!=='clear').length}));
}
let constantCases=0;const directGoals=[];
for(const size of [7,9,11,13,17,21])for(const seed of [77,913,7919])for(const themeId of ['iceRubber','iceAssist','gravityAssist','repulsionAssist','iceSand','sand','careful','trial','rest','sticky']){
 const variation={size,shape:'open',themeId};
 for(let angle=0;angle<96;angle++)for(const magnitude of [.1,.5,1]){
  const p=createStagePlay(seed,challengeDifficulty(107,'easy'),{variation}),tilt={x:Math.cos(angle*Math.PI/48)*magnitude,y:Math.sin(angle*Math.PI/48)*magnitude};let bounced=false,goalBeforeBounce=false;
  // 本編のとりもち停止・自然脱出・延長・通過ゴールを含め、制限時間まで進める。
  for(let f=0;f<(p.limitSec+p.extendedSec+1)*60&&p.status==='playing'&&!bounced;f++){
   p.advance({dt:1/60,elapsedMs:1000/60,tilt,base:BASE,onImpact(speed){if(speed>1e-8)bounced=true;}});
   if(p.status==='clear'&&!bounced)goalBeforeBounce=true;
  }
  constantCases++;if(goalBeforeBounce)directGoals.push({size,seed,themeId,angle,magnitude});
 }
 console.log(JSON.stringify({size,seed,themeId,constantCases,directGoals:directGoals.length}));
}
await writeFile(output+'/balance.json',JSON.stringify(balance,null,2));await writeFile(output+'/campaigns.json',JSON.stringify(campaigns,null,2));
const summary={campaigns:campaigns.length,stagesPerCampaign:150,balanceCases:balance.length,cleared:balance.filter(r=>r.result==='clear').length,failures:balance.filter(r=>r.result!=='clear'),constantCases,directGoals};
await writeFile(output+'/summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,failures:summary.failures.length},null,2));assert.deepEqual(directGoals,[]);
