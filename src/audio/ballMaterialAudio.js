/** 試遊専用。転がりは不規則な接触音。衝突の音色は維持する。 */
import { BALL_LAB_AUDIO } from '../config/gameConfig.js';
const rate=22050;
const tau=Math.PI*2;
function random(seed){let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296*2-1;};}
export function createRollingBuffer(context,kind='metal',floor='normal'){
 const n=rate*4,cross=Math.round(rate*.08),noise=random(713),samples=new Float32Array(n+cross);
 const profile=kind==='metal'?{hz:210,decay:.985,ring:.012}:kind==='wood'?{hz:340,decay:.962,ring:.01}:kind==='superball'?{hz:125,decay:.945,ring:.006}:{hz:480,decay:.94,ring:kind==='sponge'?0:.006};
 const feedback1=2*profile.decay*Math.cos(tau*profile.hz/rate),feedback2=-(profile.decay**2);
 let low=0,rough=0,r1=0,r2=0,next=0,texture=0;
 for(let i=0;i<samples.length;i++){
  const w=noise();low=low*.955+w*.045;rough=rough*.78+w*.22;texture=texture*.998+w*.002;
  let impulse=0;
  if(i>=next){impulse=profile.ring*noise()*(floor==='ice'?.25:1);next=i+Math.round(rate*(.04+(noise()+1)*.065));}
  const ring=impulse+feedback1*r1+feedback2*r2;r2=r1;r1=ring;
  let v=kind==='metal'?low*1.8+(rough-low)*.12+ring:
   kind==='wood'?low*.8+(rough-low)*.18+ring:
   kind==='superball'?low*.55+(rough-low)*.08+ring:
   kind==='sponge'?low*.22+(rough-low)*.035:low*.3+(rough-low)*.3+ring;
  v*=.8+Math.min(.4,Math.abs(texture)*7);
  if(floor==='ice')v*=.45;
  if(floor==='sand')v=v*.65+(rough-low)*.23;
  samples[i]=Math.tanh(v);
 }
 const b=context.createBuffer(1,n,rate),data=b.getChannelData(0);data.set(samples.subarray(cross));
 for(let i=0;i<cross;i++){const f=i/cross;data[n-cross+i]=samples[n+i]*(1-f)+samples[i]*f;}
 return b;
}
export function createImpactBuffer(context,kind='metal',wall='default'){
 const n=Math.round(rate*.5),b=context.createBuffer(1,n,rate),data=b.getChannelData(0),noise=random(331);
 const soft=wall==='rubber'?.5:wall==='cork'?.38:wall==='stone'?1.25:.85;
 let low=0,phase=0;
 for(let i=0;i<n;i++){
  const t=i/rate,w=noise();low=.7*low+.3*w;let v;
  if(kind==='metal')v=(.42*Math.sin(tau*116*t)*Math.exp(-t*26)+soft*(.27*Math.sin(tau*446*t)+.16*Math.sin(tau*1094*t)) *Math.exp(-t/(.12*soft)) +low*.35*Math.exp(-t*85));
  else if(kind==='wood')v=(.42*Math.sin(tau*185*t)+low*.35)*Math.exp(-t*32);
  else if(kind==='superball'){phase+=tau*(82+180*Math.exp(-t*9))*soft/rate;v=.65*Math.sin(phase)*Math.exp(-t*12)+low*.1*Math.exp(-t*60);}
  else if(kind==='sponge')v=low*.32*Math.exp(-t*48);
  else v=(.35*Math.sin(tau*660*t)+low*.24)*Math.exp(-t*20);
  const attack=Math.min(1,i/(rate*.002)),tail=Math.min(1,(n-1-i)/(rate*.02));
  data[i]=Math.tanh(v*soft)*attack*tail;
 }
 return b;
}

export function createBallMaterialAudio(){
 let context=null,output=null,loop=null,current='',enabled=true,volume=.6,hidden=false,failed=false,lastImpact=-Infinity;
 const buffers=new Map(),voices=new Set(),events=[];let serial=0;
 const log=v=>{events.push(v);if(events.length>40)events.shift()};
 function available(){return !failed&&enabled&&!hidden&&volume>0&&context?.state==='running'}
 function stopLoop(){
  if(loop){try{loop.gain.gain.setTargetAtTime(0,context.currentTime,.015);loop.source.stop(context.currentTime+.06)}catch{}loop=null;}
  current='';
 }
 function stop(){stopLoop();for(const v of voices){try{v.stop()}catch{}}voices.clear();}
 function unlock(){
  if(!enabled)return;
  failed=false;
  try{
   if(!context){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio){failed=true;return;}
    context=new Audio();output=context.createGain();output.gain.value=volume;
    const compressor=context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=8;
    output.connect(compressor);compressor.connect(context.destination);
    context.addEventListener('statechange',()=>{if(context.state!=='running')stop()});
   }
   if(context.state!=='running')context.resume().catch(()=>{failed=true;stop();});
  }catch{failed=true;stop();context?.close().catch(()=>{});context=null;output=null;buffers.clear();}
 }
 function getBuffer(key,create){if(!buffers.has(key))buffers.set(key,create());return buffers.get(key)}
 return {
  unlock,
  setEnabled(value){enabled=Boolean(value);if(!enabled)stop();else unlock();},
  setVolume(value){volume=Math.max(0,Math.min(1,value));if(output)output.gain.setTargetAtTime(volume,context.currentTime,.04);if(!volume)stop();},
  setHidden(value){hidden=Boolean(value);if(hidden)stop();},
  stop,
  rolling(kind,floor,speed){
   try{
   if(!available()||speed<BALL_LAB_AUDIO.rollingMinSpeed){stopLoop();return;}
   const key=`roll:${kind}:${floor}`;
   if(current!==key){
    stopLoop();const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=getBuffer(key,()=>createRollingBuffer(context,kind,floor));source.loop=true;gain.gain.value=0;
    source.connect(gain);gain.connect(output);source.onended=()=>{source.disconnect();gain.disconnect()};source.start();
    loop={source,gain};current=key;log(key);
   }
   const motion=Math.min(1,Math.max(0,(speed-BALL_LAB_AUDIO.rollingMinSpeed)/(BALL_LAB_AUDIO.rollingFullSpeed-BALL_LAB_AUDIO.rollingMinSpeed)));
   loop.gain.gain.setTargetAtTime(BALL_LAB_AUDIO.rollingGain*.8*Math.pow(motion,.8),context.currentTime,.06);
   loop.source.playbackRate.setTargetAtTime(.7+Math.min(1,speed/7)*.6,context.currentTime,.06);
   }catch{failed=true;stop();}
  },
  impact(kind,speed,wall){
   try{
   if(!available()||speed<.25||context.currentTime-lastImpact<.08)return;
   lastImpact=context.currentTime;const key=`hit:${kind}:${wall}`;
   const source=context.createBufferSource(),gain=context.createGain();
   source.buffer=getBuffer(key,()=>createImpactBuffer(context,kind,wall));gain.gain.value=Math.min(.85,.12+Math.sqrt(speed/8)*.65);
   source.playbackRate.value=.97+(serial++%5)*.015;source.connect(gain);gain.connect(output);
   if(voices.size>=8){const first=voices.values().next().value;first.stop();voices.delete(first);}
   voices.add(source);source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(source)};source.start();log(key);
   }catch{failed=true;stop();}
  },
  get state(){return {enabled,volume,failed,context:context?.state||'none',rolling:Boolean(loop),voices:voices.size,buffers:buffers.size,events:[...events]};},
 };
}
