/** L字の近道と、道順を知る操縦モデルを分けて保存。人間の面白さの保証には使わない。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateVariedMaze} from '../src/maze/variation.js';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {createTiltVector} from '../src/input/tiltVector.js';
import {BASE} from '../src/config/gameConfig.js';
const output=process.env.PLAZA_OUTPUT||'docs/verification/plaza-steering/v0626';await mkdir(output,{recursive:true});
const root=fileURLToPath(new URL('../',import.meta.url)).replaceAll('\\','/');
const baseline=execFileSync('git',['-c','safe.directory='+root,'show','cbd96f2:src/maze/variation.js'],{encoding:'utf8'})
 .replace(/from '(\.\.?\/[^']+)'/g,(_,path)=>`from '${new URL(path,new URL('../src/maze/variation.js',import.meta.url)).href}'`);
const {generateVariedMaze:before}=await import('data:text/javascript;base64,'+Buffer.from(baseline).toString('base64'));
function geometry(m){
 const n=m.size,clear=(axis,value)=>Array.from({length:n-1},(_,i)=>axis==='x'?!m.cells[value*n+i].r:!m.cells[i*n+value].b).every(Boolean);
 return {path:m.pathLength,turns:m.turns,lShortcut:(clear('x',0)&&clear('y',n-1))||(clear('y',0)&&clear('x',n-1)),baffles:m.baffles||[m.baffle]};
}
const layouts=[];
for(const size of [7,8,9,11,13,15,17,21])for(let i=1;i<=40;i++){
 const seed=i*7919,profile={size,shape:'open'},a=geometry(before(profile,seed)),b=geometry(generateVariedMaze(profile,seed));
 layouts.push({size,seed,before:a,after:b});assert.equal(b.lShortcut,false);
}
const rows=[];
for(const size of [7,9,13,15,17,21])for(const seed of [77,913,7919])
for(const themeId of ['sand','iceRubber','iceAssist','gravityHinder','repulsionHinder','sticky','careful','trial'])
for(const level of ['easy','normal'])for(const careful of [false,true]){
 const variation={size,shape:'open',themeId},p=createStagePlay(seed,challengeDifficulty(107,level),{variation}),path=p.stage.maze.path,input=createTiltVector();
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
 rows.push({size,seed,themeId,level,controller:careful?'careful-300ms-thinking':'180ms-imperfect',result:p.status,path:path.length,turns:p.stage.maze.turns,
  seconds:+(p.timeMs/1000).toFixed(2),limit:p.limitSec,extendedSec:p.extendedSec,budgetSec:p.limitSec+p.extendedSec,hp:+p.hp.value.toFixed(1),maxHp:p.hp.max,wallHits:p.wallHits});
 if(rows.length%96===0)console.log(JSON.stringify({cases:rows.length,failures:rows.filter(r=>r.result!=='clear').length}));
}
const groups=[];for(const level of ['easy','normal'])for(const controller of ['180ms-imperfect','careful-300ms-thinking']){
 const own=rows.filter(r=>r.level===level&&r.controller===controller);groups.push({level,controller,cases:own.length,clears:own.filter(r=>r.result==='clear').length});
}
const summary={layouts:layouts.length,beforeL:layouts.filter(r=>r.before.lShortcut).length,afterL:layouts.filter(r=>r.after.lShortcut).length,
 cases:rows.length,groups,failures:rows.filter(r=>r.result!=='clear')};
await writeFile(output+'/layouts.json',JSON.stringify(layouts,null,2));await writeFile(output+'/plaza-balance.json',JSON.stringify(rows,null,2));
await writeFile(output+'/plaza-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,failures:summary.failures.length},null,2));
