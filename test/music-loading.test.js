import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundManager} from '../src/audio/soundManager.js';

test('遅れて届いた前の曲や停止中に届いた曲を勝手に再生しない',async()=>{
  const saved={AudioContext:globalThis.AudioContext,fetch:globalThis.fetch};
  const pending=new Map(),starts=[],requests=[];
  const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){}});
  class Audio{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=44100;}
    createGain(){return {gain:param(),connect(){},disconnect(){}};}
    createDynamicsCompressor(){return {threshold:param(),ratio:param(),connect(){}};}
    createBuffer(ch,frames){return {getChannelData:()=>new Float32Array(frames)};}
    createBufferSource(){return {playbackRate:param(),connect(){},disconnect(){},stop(){},start(){starts.push(this.buffer.name);}};}
    addEventListener(){}
    decodeAudioData(bytes){return Promise.resolve({name:new TextDecoder().decode(bytes)});}
  }
  const response=name=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(name).buffer});
  globalThis.AudioContext=Audio;
  globalThis.fetch=async url=>{
    const name=new URL(url).pathname.split('/').pop();requests.push(name);
    return name.startsWith('bgm-')?new Promise(resolve=>pending.set(name,()=>resolve(response(name)))):response(name);
  };
  const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
  try{
    const sound=createSoundManager({soundEnabled:true});sound.unlock();await flush();
    sound.setScene({music:true,track:'rest',speed:0,hidden:false});
    sound.setScene({music:true,track:'puzzle',speed:0,hidden:false});
    pending.get('bgm-puzzle.wav')();await flush();
    assert.equal(sound.state.musicTrack,'puzzle');
    pending.get('bgm-rest.wav')();await flush();
    assert.deepEqual(starts,['bgm-puzzle.wav']);
    sound.setScene({music:true,track:'force',speed:0,hidden:false});
    sound.setScene({music:false,track:'force',speed:0,hidden:true});
    pending.get('bgm-force.wav')();await flush();
    assert.equal(sound.state.music,false);
    assert.deepEqual(starts,['bgm-puzzle.wav']);
    sound.setScene({music:true,track:'force',speed:0,hidden:false});
    assert.equal(sound.state.musicTrack,'force');
    assert.deepEqual(starts,['bgm-puzzle.wav','bgm-force.wav']);
    assert.equal(requests.filter(n=>n==='bgm-force.wav').length,1);
    sound.setPreferences({soundEnabled:false});
    assert.equal(sound.state.music,false);
    assert.equal(sound.state.musicLoading,0);
  }finally{Object.assign(globalThis,saved);}
});
