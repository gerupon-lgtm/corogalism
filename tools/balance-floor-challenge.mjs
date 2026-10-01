import {writeFile,mkdir} from 'node:fs/promises';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {BASE} from '../src/config/gameConfig.js';
import {createTiltVector} from '../src/input/tiltVector.js';
export function measuredPlay(seed,n,level,imperfect=true){
 const p=createStagePlay(seed,challengeDifficulty(n,level)),path=p.stage.maze.path;
 const input=createTiltVector();let wp=1,nextResponse=0,response=0;
 const dt=1/60;
 for(let frame=0;frame<(p.limitSec+3)*60&&p.status==='playing';frame++){
  if(frame>=nextResponse){
   const a=p.actor,t=path[wp];let dx=t.x+.5-a.x,dy=t.y+.5-a.y,dist=Math.hypot(dx,dy);
   if(dist<.24&&wp<path.length-1){wp++;const t=path[wp];dx=t.x+.5-a.x;dy=t.y+.5-a.y;dist=Math.hypot(dx,dy);}
   const ice=p.stage.zones.some(z=>z.kind==='ice'&&z.cells.some(c=>c.x===Math.floor(a.x)&&c.y===Math.floor(a.y)));
   const target=Math.min(ice?1.35:1.7,dist*3.2);
   let x=(dx/(dist||1)*target-a.vx)*.65,y=(dy/(dist||1)*target-a.vy)*.65;
   if(imperfect&&response%31===12){x+=.12;y-=.1;}
   const norm=Math.max(1,Math.hypot(x,y));input.setRaw(x/norm,y/norm);
   nextResponse=frame+(imperfect?11:1);response++;
  }
  input.update(dt,BASE.inputSmoothing);
  p.advance({dt,elapsedMs:1000*dt,tilt:input.value,base:BASE});
  if(p.trap&&frame%12===0)p.assistEscape();
 }
 return {seed,level,stage:n,theme:p.stage.theme.id,result:p.status,seconds:+(p.timeMs/1000).toFixed(2),limit:+p.limitSec.toFixed(2),hp:+p.hp.value.toFixed(1),maxHp:p.hp.max};
}
const rows=[];
for(const level of ['normal','easy'])for(let n=1;n<=20;n++){
 const cases=Array.from({length:Number(process.env.BALANCE_SEEDS||30)},(_,i)=>measuredPlay((i+1)*7919,n,level,true));
 rows.push(...cases);const cleared=cases.filter(r=>r.result==='clear');
 console.log(JSON.stringify({level,stage:n,theme:cases[0].theme,clear:cleared.length,total:cases.length,
  failures:cases.filter(r=>r.result!=='clear').map(r=>({seed:r.seed,result:r.result})),minHp:Math.min(...cleared.map(r=>r.hp)),minMargin:Math.min(...cleared.map(r=>r.limit-r.seconds))}));
}
await mkdir('docs/verification/floor-challenge',{recursive:true});
await writeFile('docs/verification/floor-challenge/balance.json',JSON.stringify(rows,null,2));
