/** 実際のSoundManagerを一定振幅の音で動かし、開始音量の変化を測定する。 */
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8794/');
 const result=await page.evaluate(async()=>{
  const {createSoundManager}=await import('./src/audio/soundManager.js');
  const {AUDIO}=await import('./src/config/gameConfig.js');
  const original={AudioContext:globalThis.AudioContext,fetch:globalThis.fetch,fade:AUDIO.musicFadeSec};
  const rows=[];
  try{
   for(const fade of [.14]){
    AUDIO.musicFadeSec=fade;
    const offline=new OfflineAudioContext(1,48000*1.8,48000);let time=0;
    const tone=offline.createBuffer(1,48000,48000),data=tone.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=.01*Math.sin(2*Math.PI*1000*i/48000);
    globalThis.AudioContext=class{
     get state(){return 'running';}get currentTime(){return time;}get sampleRate(){return 48000;}get destination(){return offline.destination;}
     createGain(){return offline.createGain();}createBufferSource(){return offline.createBufferSource();}
     createDynamicsCompressor(){return offline.createDynamicsCompressor();}
     createBuffer(...a){return offline.createBuffer(...a);}decodeAudioData(){return Promise.resolve(tone);}addEventListener(){}
    };
    globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
    const sound=createSoundManager({soundEnabled:true,bgmVolume:.6,seVolume:.8});sound.unlock();
    for(let i=0;i<30;i++)await Promise.resolve();
    // スタート音の間に親の音量が落ち着いた後で、曲の音量変化だけを見る。
    time=1;sound.setScene({music:true,speed:0,hidden:false});
    for(let frame=1;frame<=48;frame++){time=1+frame/60;sound.setScene({music:true,speed:0,hidden:false});}
    const output=(await offline.startRendering()).getChannelData(0);
    const rmsAt=ms=>{const start=48000+Math.round(ms*48),end=start+480;let sum=0;for(let i=start;i<end;i++)sum+=output[i]**2;return Math.sqrt(sum/(end-start));};
    const settled=rmsAt(600);
    rows.push({stopFadeSec:fade,startAttackSec:AUDIO.musicAttackSec??null,levels:[0,10,20,40,60,100,140,200,500].map(ms=>({ms,ratioToSettled:rmsAt(ms)/settled}))});
   }
  }finally{globalThis.AudioContext=original.AudioContext;globalThis.fetch=original.fetch;AUDIO.musicFadeSec=original.fade;}
  return {note:'Chrome OfflineAudioContext: actual SoundManager, steady sine instead of WAV, 60 frame updates per second. Device output not measured.',rows};
 });
 await mkdir('docs/verification/bgm-attack',{recursive:true});
 await writeFile(process.env.ATTACK_OUTPUT||'docs/verification/bgm-attack/current.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 for(const row of result.rows)assert.ok(row.levels.find(v=>v.ms===20).ratioToSettled>=.98,'BGM must reach its normal level within the opening attack, without a long fade');
}finally{await browser.close();}
