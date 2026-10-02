import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=process.env.AUDIO_OUTPUT||'docs/verification/ball-lab';await mkdir(output,{recursive:true});
try{const p=await b.newPage({serviceWorkers:'block'});await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'ball-lab.html');
 for(const kind of ['metal','superball','wood','sponge']){
  const values=await p.evaluate(async kind=>{
   const {createRollingBuffer,createImpactBuffer}=await import('/src/audio/ballMaterialAudio.js');
   const {BALL_LAB_AUDIO:A}=await import('/src/config/gameConfig.js');
   const rate=22050,c=new OfflineAudioContext(1,rate*6,rate),limiter=c.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=8;limiter.connect(c.destination);
   const roll=c.createBufferSource(),gain=c.createGain();roll.buffer=createRollingBuffer(c,kind,'normal');roll.loop=true;roll.playbackRate.setValueAtTime(.7,0);roll.playbackRate.linearRampToValueAtTime(1.1,3);gain.gain.setValueAtTime(0,0);gain.gain.linearRampToValueAtTime(A.rollingGain*.8,3);gain.gain.linearRampToValueAtTime(0,6);roll.connect(gain);gain.connect(limiter);roll.start();
   for(const [t,wall]of [[3.5,'stone'],[4.5,'rubber'],[5.2,'cork']]){const s=c.createBufferSource(),g=c.createGain();s.buffer=createImpactBuffer(c,kind,wall);g.gain.value=.7;s.connect(g);g.connect(limiter);s.start(t)}
   const data=(await c.startRendering()).getChannelData(0);return Array.from(data);
  },kind);
  const wave=Buffer.alloc(44+values.length*2);wave.write('RIFF',0);wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(22050,24);wave.writeUInt32LE(44100,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(values.length*2,40);
  for(let i=0;i<values.length;i++)wave.writeInt16LE(Math.round(Math.max(-1,Math.min(1,values[i]))*32767),44+i*2);
  await writeFile(`${output}/${kind}-demo.wav`,wave);console.log(kind+' audio rendered, peak '+values.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0).toFixed(3));
 }
}finally{await b.close()}
