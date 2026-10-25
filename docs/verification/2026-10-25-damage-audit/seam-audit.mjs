/** 同じ合併形状・素材の一枚壁/分割壁を、実衝突関数で12例だけ比較する。 */
import {writeFile} from 'node:fs/promises';
import {resolveCollisions} from '../../../src/physics/collision.js';
import {createHp} from '../../../src/game/hp.js';

const rows=[];
function compare({orientation,offset,tangent=0,reverse=false}){
 const vertical=orientation==='vertical',wall=vertical?{x:3,y:1,w:.24,h:4,materialId:'default'}:{x:1,y:3,w:4,h:.24,materialId:'default'};
 const pieces=vertical?[{...wall,h:2},{...wall,y:3,h:2}]:[{...wall,w:2},{...wall,x:3,w:2}];
 if(reverse)pieces.reverse();
 const input=vertical?{x:2.8,y:3+offset,vx:2.5,vy:tangent,r:.275}:{x:3+offset,y:2.8,vx:tangent,vy:2.5,r:.275};
 const run=walls=>{const actor={...input},impacts=[],hp=createHp({turns:15,hpPerTurn:4});const hits=resolveCollisions(actor,walls,()=>.35,(speed,w)=>impacts.push({speed,dealt:hp.applyImpact(speed,w,0)}));return {actor,hits,impacts,hpLost:hp.max-hp.value};};
 const whole=run([wall]),split=run(pieces),delta=Object.fromEntries(['x','y','vx','vy'].map(key=>[key,split.actor[key]-whole.actor[key]]));
 rows.push({orientation,offset,tangent,reverse,input,whole,split,delta,changed:Object.values(delta).some(v=>Math.abs(v)>1e-9)});
}
for(const offset of [-.05,0,.05])for(const tangent of [0,1.5])compare({orientation:'vertical',offset,tangent});
for(const offset of [-.05,.05])for(const tangent of [0,1.5])compare({orientation:'horizontal',offset,tangent});
for(const offset of [-.05,.05])compare({orientation:'vertical',offset,reverse:true});
const report={method:'resolveCollisions only; same default material and restitution .35; union geometry identical; no time integration or browser',cases:rows.length,changedCases:rows.filter(r=>r.changed).length,rows};
await writeFile(new URL('seam-audit.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
