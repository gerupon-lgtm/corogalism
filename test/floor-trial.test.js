import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeTrial, advanceTrial, trialKey, readTrialBest, saveTrialBest } from '../src/lab/timeTrial.js';
test('動き始めからゴールまで計測し、完走後は時計を固定する', () => {
  const t=createTimeTrial(); advanceTrial(t,500,false,false); assert.equal(t.elapsedMs,0);
  advanceTrial(t,100,true,false); advanceTrial(t,300,false,true); advanceTrial(t,900,true,false);
  assert.equal(t.elapsedMs,400); assert.equal(t.finished,true);
});
test('通常完走だけ保存し、遅い記録・練習・破損保存・保存不可を処理する', () => {
  const data=new Map(), storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const t={finished:true,practice:false,elapsedMs:500};
  assert.equal(saveTrialBest(storage,'a',t),true);
  saveTrialBest(storage,'a',{...t,elapsedMs:900}); assert.equal(readTrialBest(storage,'a'),500);
  saveTrialBest(storage,'a',{...t,elapsedMs:300}); assert.equal(readTrialBest(storage,'a'),300);
  assert.equal(saveTrialBest(storage,'a',{...t,practice:true,elapsedMs:100}),false);
  assert.equal(readTrialBest(storage,'a'),300);
  data.set('bad','NaN'); assert.equal(readTrialBest(storage,'bad'),null);
  const blocked={getItem(){throw Error();},setItem(){throw Error();}};
  assert.equal(readTrialBest(blocked,'a'),null); assert.equal(saveTrialBest(blocked,'a',t),false);
  assert.notEqual(trialKey({ice:.08,sand:3.2},'tilt'),trialKey({ice:.08,sand:3.2},'pointer'));
  assert.notEqual(trialKey({ice:.08,sand:3.2},'tilt'),trialKey({ice:.2,sand:3.2},'tilt'));
  const settings={ice:.08,sand:3.2,force:6,radius:1.6};
  assert.notEqual(trialKey(settings,'tilt'),trialKey(settings,'tilt','timeTrialAssist'));
  assert.notEqual(trialKey(settings,'tilt','timeTrialAssist'),trialKey({...settings,force:5},'tilt','timeTrialAssist'));
});
