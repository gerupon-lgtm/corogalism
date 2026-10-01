import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowFlowPreview } from '../src/ui/floorPresentation.js';
import { createFloorJingle } from '../src/audio/floorJingle.js';
test('通常の予告はやさしい8面後だけ、連続表示と保存拒否を抑える',()=>{
 const map=new Map();globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const eligible={level:'easy',stages:8};
 assert.equal(shouldShowFlowPreview({level:'normal',stages:20}),false);
 assert.equal(shouldShowFlowPreview({level:'easy',stages:7}),false);
 assert.deepEqual(Array.from({length:7},()=>shouldShowFlowPreview(eligible)),[true,false,false,true,false,false,true]);
 globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 assert.equal(shouldShowFlowPreview(eligible),true);assert.equal(shouldShowFlowPreview(eligible),false);
 delete globalThis.localStorage;
});
test('専用ジングルは短く音割れせず、通常と特別を識別できる',()=>{
 const ctx={sampleRate:8000,createBuffer(ch,n,rate){const data=new Float32Array(n);return {duration:n/rate,getChannelData:()=>data};}};
 const a=createFloorJingle(ctx),b=createFloorJingle(ctx,true);
 assert.ok(a.duration<=.8);assert.ok(b.duration<=.8);
 assert.notDeepEqual(a.getChannelData(),b.getChannelData());
 assert.ok(a.getChannelData().every(v=>Math.abs(v)<.5));
});
