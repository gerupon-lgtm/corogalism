/** 試遊専用。低音に中低域を重ね、スマホでも重い転がりを感じられる音にする。 */
const rate=22050;
const tau=Math.PI*2;
function random(seed){let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296*2-1;};}
export function createRollingBuffer(context,kind='metal',floor='normal'){
 const n=rate*2,cross=Math.round(rate*.05),noise=random(713),samples=new Float32Array(n+cross);let low=0;
 for(let i=0;i<samples.length;i++){
  const t=i/rate,w=noise();low=low*.96+w*.04;
  const pulse=.65+.2*Math.sin(tau*8*t)+.12*Math.sin(tau*13*t);
  let v;
  if(kind==='metal')v=(.44*Math.sin(tau*74*t)+.22*Math.sin(tau*148*t)+.14*Math.sin(tau*222*t))*pulse+low*1.1+w*.018;
  else if(kind==='wood')v=(.2*Math.sin(tau*166*t)+.12*Math.sin(tau*332*t))*pulse+low*.9+w*.03*Math.max(0,Math.sin(tau*19*t));
  else if(kind==='superball')v=(.18*Math.sin(tau*124*t)+.1*Math.sin(tau*248*t))*pulse+low*.65+w*.015;
  else if(kind==='sponge')v=low*.45+w*.018;
  else v=(.15*Math.sin(tau*194*t)+low*.65+w*.025)*pulse;
  if(floor==='ice')v=v*.72+Math.sin(tau*(kind==='metal'?296:388)*t)*.025;
  if(floor==='sand')v=v*.6+w*.12+low*.6;
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
   if(!available()||speed<.04){stopLoop();return;}
   const key=`roll:${kind}:${floor}`;
   if(current!==key){
    stopLoop();const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=getBuffer(key,()=>createRollingBuffer(context,kind,floor));source.loop=true;gain.gain.value=0;
    source.connect(gain);gain.connect(output);source.onended=()=>{source.disconnect();gain.disconnect()};source.start();
    loop={source,gain};current=key;log(key);
   }
   loop.gain.gain.setTargetAtTime(Math.min(.9,.1+Math.sqrt(speed/7)*.7),context.currentTime,.06);
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
