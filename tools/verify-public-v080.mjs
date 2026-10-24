/** 公開された実行資材の本文と形式をローカルと比較する。 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'https://corogalism.sikumilab.com/';
const version=process.env.APP_VERSION||'0.8.0';
const out=process.env.VERIFY_OUTPUT||'docs/verification/v0.8.0/public';
const scope={self:{}};vm.runInNewContext(await readFile('precache.js','utf8'),scope);
const files=[...scope.self.PRECACHE_FILES,'precache.js','sw.js','CNAME'];
const rows=[],sha=v=>createHash('sha256').update(v).digest('hex');
for(const file of files){
 const url=new URL(file,base);url.searchParams.set('release-check',version);
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 const bytes=Buffer.from(await response.arrayBuffer()),local=await readFile(file);
 const type=response.headers.get('content-type')||'';
 assert.equal(response.status,200,file);assert.equal(sha(bytes),sha(local),file+' bytes');
 if(file.endsWith('.wav'))assert.match(type,/audio\/(wav|wave|x-wav)/,file);
 if(file.endsWith('.js'))assert.match(type,/(javascript|ecmascript)/,file);
 if(file.endsWith('.css'))assert.match(type,/text\/css/,file);
 if(file.endsWith('.html'))assert.match(type,/text\/html/,file);
 rows.push({file,status:response.status,type,bytes:bytes.length,sha256:sha(bytes)});
}
await mkdir(out,{recursive:true});
await writeFile(`${out}/assets.json`,JSON.stringify({base,version,cache:scope.self.PRECACHE_VERSION,checkedAt:new Date().toISOString(),files:rows.length,rows},null,2)+'\n');
console.log(JSON.stringify({files:rows.length,cache:scope.self.PRECACHE_VERSION,allBytesMatch:true}));
