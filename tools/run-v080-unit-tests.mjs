/** 既存テストを最大5ファイルずつ直列実行し、終了コードまで保存する。 */
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='docs/verification/v0.8.0/tests';mkdirSync(out,{recursive:true});
const files=readdirSync('test').filter(f=>f.endsWith('.test.js')).sort();
const rows=[];
for(let i=0;i<files.length;i+=5){
 const batch=files.slice(i,i+5).map(f=>'test/'+f),start=Date.now();
 const result=spawnSync(process.execPath,['--max-old-space-size=768','--test','--test-concurrency=1','--test-reporter=tap',...batch],{encoding:'utf8',maxBuffer:4*1024*1024,windowsHide:true});
 const log=(result.stdout||'')+(result.stderr||'');
 writeFileSync(`${out}/batch-${i/5+1}.txt`,log);
 const row={files:batch,exitCode:result.status,seconds:(Date.now()-start)/1000,tests:Number(log.match(/# tests (\d+)/)?.[1]||0),passed:Number(log.match(/# pass (\d+)/)?.[1]||0),failed:Number(log.match(/# fail (\d+)/)?.[1]||0)};
 rows.push(row);writeFileSync(`${out}/results.json`,JSON.stringify({rows},null,2)+'\n');
 console.log(JSON.stringify(row));
 if(result.status!==0)process.exit(1);
}
console.log(JSON.stringify({files:files.length,tests:rows.reduce((s,r)=>s+r.tests,0),passed:rows.reduce((s,r)=>s+r.passed,0),failed:rows.reduce((s,r)=>s+r.failed,0)}));
