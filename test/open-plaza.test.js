import test from 'node:test';
import assert from 'node:assert/strict';
import {generateVariedMaze} from '../src/maze/variation.js';
import {checkReachability} from '../src/maze/validator.js';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {restFloors} from '../src/world/stageFeatures.js';
import {stableFloorPoint} from '../src/world/floorThemes.js';
import {sampleZone} from '../src/world/stage.js';

// 最短経路の選ばれ方に左右されず、最も少ない切り返しで抜ける道を探す。
function fewestTurns(maze){
 const {size,cells}=maze,dist=new Array(size*size*4).fill(Infinity),queue=[];
 const dirs=[['t',0,-1],['r',1,0],['b',0,1],['l',-1,0]];
 for(let dir=0;dir<4;dir++){dist[dir]=0;queue.push({cell:0,dir,cost:0});}
 while(queue.length){
  queue.sort((a,b)=>b.cost-a.cost);const {cell,dir,cost}=queue.pop();
  if(cost!==dist[cell*4+dir])continue;
  if(cell===size*size-1)return cost;
  for(const [next,[side,dx,dy]] of dirs.entries()){
   if(cells[cell][side])continue;
   const x=cell%size+dx,y=Math.floor(cell/size)+dy;if(x<0||y<0||x>=size||y>=size)continue;
   const at=y*size+x,value=cost+(dir===next?0:1);
   if(value<dist[at*4+next]){dist[at*4+next]=value;queue.push({cell:at,dir:next,cost:value});}
  }
 }
 return Infinity;
}

test('広場は外周をL字に進むだけの近道がなく、最も少ない切り返しの道でも迂回する',()=>{
 for(const size of [7,8,9,11,13,15,17,21])for(let i=1;i<=24;i++){
  const seed=i*7919,maze=generateVariedMaze({size,shape:'open'},seed);
  const clear=(axis,value)=>Array.from({length:size-1},(_,at)=>
   axis==='x'?!maze.cells[value*size+at].r:!maze.cells[at*size+value].b).every(Boolean);
  assert.ok(!(clear('x',0)&&clear('y',size-1)),`${size}/${seed}:上→右のL字が開通`);
  assert.ok(!(clear('y',0)&&clear('x',size-1)),`${size}/${seed}:左→下のL字が開通`);
  assert.ok(fewestTurns(maze)>=4,`${size}/${seed}:傾きの切り返しが少ない近道`);
 }
});

test('広場の力場の印は短い内壁にも重ならず、各空間の両向きの力を残す',()=>{
 for(const size of [7,8,13,21])for(const seed of [31676,55433,332598,522654,530573]){
  const {stage}=createStagePlay(seed,challengeDifficulty(107,'easy'),{variation:{size,shape:'open',themeId:'iceAssist'}});
  const fields=stage.zones.filter(z=>z.kind==='radial');
  for(const z of fields)for(const w of stage.walls){
   const distance=Math.hypot(z.x-Math.max(w.x,Math.min(z.x,w.x+w.w)),z.y-Math.max(w.y,Math.min(z.y,w.y+w.h)));
   assert.ok(distance>=.33,JSON.stringify({size,seed,x:z.x,y:z.y,wall:w}));
  }
  for(let room=0;room<=stage.maze.baffles.length;room++){
   const own=fields.filter(z=>stage.maze.baffles.filter(b=>z[b.axis]>=b.coord).length===room);
   assert.ok(own.some(z=>z.strength>0)&&own.some(z=>z.strength<0),JSON.stringify({size,seed,room,own}));
  }
 }
});

test('広場は全マスへ進める広さを残し、向き・間隔・通り道の幅が種で変わる',()=>{
 const axes=new Set(),arrangements=new Set(),widths=new Set();
 for(const size of [7,8,9,11,13,21])for(let i=1;i<=40;i++){
  const maze=generateVariedMaze({size,shape:'open'},i*7919);
  assert.equal(checkReachability(maze).ok,true);
  const wallCount=maze.cells.reduce((sum,c,index)=>sum+(index%size<size-1?c.r:0)+(index<size*(size-1)?c.b:0),0);
  assert.ok(wallCount<(size-1)**2,'通常の自動生成迷路より内壁が少ない広場として残す');
  assert.ok(maze.baffles?.length>=2);
  const boundaries=[0,...maze.baffles.map(b=>b.coord),size];
  for(let j=1;j<boundaries.length;j++)assert.ok(boundaries[j]-boundaries[j-1]>=2,'1マス幅の部屋へ分割しない');
  for(const b of maze.baffles){axes.add(b.axis);widths.add(b.gapEnd-b.gapStart);}
  arrangements.add(JSON.stringify(maze.baffles));
 }
 assert.equal(axes.size,2);assert.ok(arrangements.size>20);assert.ok(widths.size>=2);
});

test('広場の増えた各空間にも床の仕掛けがあり、開始・終了と出口中央を力場が覆わない',()=>{
 for(const size of [7,8,13,21])for(const seed of [5,77,913,7919])
 for(const themeId of ['sand','iceAssist','rest','sticky']){
  const p=createStagePlay(seed,challengeDifficulty(17,'easy'),{variation:{size,shape:'open',themeId}}),{stage}=p,{maze}=stage;
  const room=q=>maze.baffles.filter(b=>q[b.axis]>=b.coord).length;
  for(let side=0;side<=maze.baffles.length;side++){
   if(themeId==='sand'||themeId==='iceAssist'){
    const sand=stage.zones.filter(z=>z.kind==='sand').flatMap(z=>z.cells).filter(c=>room({x:c.x+.5,y:c.y+.5})===side);
    assert.ok(sand.length>=4,JSON.stringify({size,seed,themeId,side,sand}));
    assert.equal(sampleZone(stage,{x:sand[0].x+.5,y:sand[0].y+.5,vx:1,vy:0}).frictionK,3.2);
   }
   if(themeId==='iceAssist'){
    const fields=stage.zones.filter(z=>z.kind==='radial'&&room(z)===side);
    assert.ok(fields.some(z=>z.strength>0)&&fields.some(z=>z.strength<0),JSON.stringify({size,seed,side,fields}));
   }
   if(themeId==='rest'){
    const rests=restFloors(stage).filter(r=>room(r)===side);
    assert.ok(rests.length,JSON.stringify({size,seed,side}));assert.ok(rests.every(r=>stableFloorPoint(stage,r)));
   }
   if(themeId==='sticky')assert.ok(stage.sticky.filter(t=>room(t)===side).length>=2,JSON.stringify({size,seed,side}));
  }
  for(const z of stage.zones.filter(z=>z.kind==='radial')){
   assert.ok(Math.hypot(z.x-.5,z.y-.5)>z.radius+.35);
   assert.ok(Math.hypot(z.x-size+.5,z.y-size+.5)>z.radius+.35);
   for(const b of maze.baffles){
    const cross=z[b.axis],along=z[b.axis==='x'?'y':'x'];
    assert.ok(Math.hypot(cross-b.coord,along-(b.gapStart+b.gapEnd)/2)>z.radius+.35,JSON.stringify({size,seed,z,b}));
   }
  }
 }
});
