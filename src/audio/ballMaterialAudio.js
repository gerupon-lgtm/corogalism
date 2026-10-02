/** 試遊専用。硬い球だけ接触の質感を鳴らす。衝突の音色は維持する。 */
import { BALL_LAB_AUDIO } from '../config/gameConfig.js';
const rate=22050;
const tau=Math.PI*2;
function random(seed){let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296*2-1;};}
// 無音も素材の個性。柔らかい球に擦れのループを割り当てない。
const rollingProfiles={
 metal:{continuous:true},
 wood:{seed:1259,hz:310,second:680,low:.25,rough:.07,body:.11,decay:.0045,tail:.025,attack:.0007,interval:.072,jitter:.085,gain:.9},
 default:{seed:2017,hz:1800,second:3400,low:0,rough:.045,body:.11,decay:.0016,tail:.01,attack:.00025,interval:.052,jitter:.075,gain:.8},
};
function createMetalRollingBuffer(context,floor){
 const n=rate*4,noise=random(811),white=Float32Array.from({length:n},noise);
 const b=context.createBuffer(1,n,rate),data=b.getChannelData(0),coefficient=hz=>1-Math.exp(-tau*hz/rate);
 const lowA=coefficient(45),bodyA=coefficient(floor==='ice'?210:floor==='sand'?190:260),surfaceA=coefficient(500),smoothA=coefficient(700);
 const pressureA=1-Math.exp(-1/(rate*.24)),gain=floor==='ice'?.3:floor==='sand'?.425:.75;
 let low=0,body=0,surface=0,pressure=0,shaped=0;
 // 金属は打音を連打しない。低い接触の連続成分と、ゆっくりした荷重の揺れ。
 // 同じ周期を一度通してフィルタを安定させ、継ぎ目で状態をリセットしない。
 for(let pass=0;pass<2;pass++)for(let i=0;i<n;i++){
  const w=white[i];low+=lowA*(w-low);body+=bodyA*(w-body);surface+=surfaceA*(w-surface);pressure+=pressureA*(w-pressure);
  const texture=((body-low)*.8+(surface-body)*.1)*(1+Math.max(-.18,Math.min(.18,pressure*12)));
  shaped+=smoothA*(texture-shaped);
  if(pass)data[i]=Math.tanh(shaped*gain);
 }
 return b;
}
export function createRollingBuffer(context,kind='metal',floor='normal'){
 const profile=rollingProfiles[kind];if(!profile)return null;
 if(profile.continuous)return createMetalRollingBuffer(context,floor);
 const n=rate*4,noise=random(profile.seed),b=context.createBuffer(1,n,rate),data=b.getChannelData(0);
 const spacing=floor==='ice'?1.7:1,softness=floor==='sand'?.6:1,floorGain=floor==='ice'?.45:floor==='sand'?.65:1;
 // 接触ごとに短い音を作る。木・ガラスの隙間に常時ノイズを重ねない。
 for(let start=0;start<n;){
  const strength=(.65+(noise()+1)*.3)*profile.gain*floorGain,polarity=noise()<0?-1:1;
  const length=Math.round(rate*profile.tail*softness);let low=0,rough=0;
  for(let i=0;i<length;i++){
   const t=i/rate,w=noise();low=low*.945+w*.055;rough=rough*.8+w*.2;
   const body=polarity*profile.body*(Math.sin(tau*profile.hz*t)+.35*Math.sin(tau*profile.second*t));
   const envelope=Math.min(1,t/profile.attack)*Math.exp(-t/(profile.decay*softness))*Math.min(1,(length-1-i)/(rate*.001));
   // 末尾の粒を先頭へ回して接触音の余韻をループ境界でも連続させる。
   data[(start+i)%n]+=(low*profile.low+(rough-low)*profile.rough+body)*envelope*strength;
  }
  start+=Math.round(rate*(profile.interval+(noise()+1)*.5*profile.jitter)*spacing);
 }
 for(let i=0;i<n;i++)data[i]=Math.tanh(data[i]);
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
   if(!rollingProfiles[kind]||!available()||speed<BALL_LAB_AUDIO.rollingMinSpeed){stopLoop();return;}
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
