import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createImpactBuffer} from '../src/audio/ballMaterialAudio.js';
const previous=execFileSync('git',['-c',`safe.directory=${process.cwd().replaceAll('\\','/')}`,'show','01a969a:src/audio/ballMaterialAudio.js'],{encoding:'utf8'});
const source=previous.replace("'../config/gameConfig.js'",JSON.stringify(new URL('../src/config/gameConfig.js',import.meta.url).href));
const old=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const context={createBuffer(_channels,n,sampleRate){const data=new Float32Array(n);return {sampleRate,length:n,getChannelData:()=>data};}};
const hash=b=>createHash('sha256').update(Buffer.from(b.getChannelData(0).buffer)).digest('hex');
const rows=[];
for(const ball of ['default','metal','wood','superball','sponge'])for(const wall of ['default','rubber','stone','cork','moss','spike']){
 const before=old.createImpactBuffer(context,ball,wall),after=createImpactBuffer(context,ball,wall);
 rows.push({ball,wall,same:hash(before)===hash(after),length:after.length,sha256:hash(after)});
}
await writeFile('docs/verification/cotton-wall/audio-regression.json',JSON.stringify({baseline:'01a969a',rows},null,2)+'\n');
console.log(`Existing impact PCM: ${rows.filter(r=>r.same).length}/${rows.length} identical`);
if(rows.some(r=>!r.same))process.exitCode=1;
