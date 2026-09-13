import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagePlay} from '../src/game/stagePlay.js';
import {challengeDifficulty} from '../src/game/challenge.js';
import {BASE} from '../src/config/gameConfig.js';
test('満タン案内は接触1回につき1回。残したキャンディは減ったときに回復できる',()=>{
 const p=createStagePlay(7919,challengeDifficulty(3,'easy')),events=[];
 p.stage.recovery={x:2.5,y:2.5,collected:false};p.stage.sticky=[];
 const tick=()=>p.advance({dt:0,elapsedMs:10,tilt:{x:0,y:0},base:BASE,onFeature:k=>events.push(k)});
 p.teleport(2.5,2.5);tick();for(let i=0;i<100;i++)tick();assert.deepEqual(events,['full']);assert.equal(p.stage.recovery.collected,false);
 p.teleport(.5,.5);tick();p.teleport(2.5,2.5);tick();assert.deepEqual(events,['full','full']);
 p.hp.applyImpact(3,{materialId:'default'},0);const hp=p.hp.value;tick();assert.ok(p.hp.value>hp);assert.equal(p.stage.recovery.collected,true);assert.equal(events.length,2);
});
