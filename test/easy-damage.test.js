import test from 'node:test';
import assert from 'node:assert/strict';
import {createHp} from '../src/game/hp.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {resolveCollisions} from '../src/physics/collision.js';

function replay(speed,count){
 const hp=createHp({turns:25,...challengeDifficulty(11,'easy')});let hits=0;
 for(let i=0;i<count;i++){
  const a={x:2.9,y:3,r:.275,vx:speed,vy:0};
  hits+=resolveCollisions(a,[{x:3,y:1,w:.1,h:4,materialId:'default'}],()=>.35,(v,w)=>hp.applyImpact(v,w,i+1));
 }
 return {hp,hits};
}
test('11面目の通常壁12ヒットでも、やさしいのげんき140に余裕が残る',()=>{
 const {hp,hits}=replay(2.8,12);assert.equal(hp.max,140);assert.equal(hits,12);assert.ok(hp.value>60,`remaining ${hp.value}`);
});
test('11面目で強く8回当たっても継続でき、1回の上限は最大げんきの8%未満',()=>{
 const {hp,hits}=replay(4,8);assert.equal(hits,8);assert.ok(hp.value>50);
 assert.ok(challengeDifficulty(11,'easy').damageCapRatio<.08);
});
test('やさしいの単発上限は紹介後まで緩やかに増え、24面目から一定になる',()=>{
 const caps=Array.from({length:40},(_,i)=>challengeDifficulty(i+1,'easy').damageCapRatio*140);
 for(let i=1;i<caps.length;i++){assert.ok(caps[i]>=caps[i-1]-1e-10);assert.ok(caps[i]-caps[i-1]<.26);}
 assert.equal(caps[23],caps[39]);assert.ok(caps[23]<14);
});
