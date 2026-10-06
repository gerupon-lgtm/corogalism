/** 長い面名と音・ポーズが同じ列に収まり、文字がボタンと重ならないこと。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const output=process.env.LABEL_OUTPUT||'docs/verification/maze-variation/v0621/labels-local';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
await mkdir(output,{recursive:true});const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),rows=[];
try{
 const p=await b.newPage({viewport:{width:320,height:844},serviceWorkers:'block'});
 await p.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy'}));});
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);await p.goto((process.env.BASE_URL||'http://127.0.0.1:8768/')+'?debug=1&seed=77');await p.waitForLoadState('networkidle');await p.waitForFunction(()=>!!window.__corogalism,null,{polling:50});await p.locator('#btn-challenge').click();await p.clock.runFor(32);assert.equal(await p.evaluate(()=>window.__corogalism.state.screen),'game');
 assert.equal(await p.locator('.badge').textContent(),'v'+version);
 for(const width of [320,390,576]){
  await p.setViewportSize({width,height:width===576?1280:844});
  await p.evaluate(()=>document.querySelector('#stage-theme').textContent='13×13 反発の広場｜慎重に進む迷路・氷');await p.clock.runFor(32);
  const row=await p.evaluate(()=>{const label=document.querySelector('#stage-theme'),actions=document.querySelector('.play-actions'),r=label.getBoundingClientRect(),a=actions.getBoundingClientRect();return {width:innerWidth,labelWidth:r.width,labelScroll:label.scrollWidth,labelRight:r.right,actionsLeft:a.left,actionsRight:a.right,pageWidth:document.documentElement.scrollWidth};});
  rows.push(row);await p.screenshot({path:`${output}/${width}.png`});console.log(JSON.stringify(row));
  assert.ok(row.labelWidth>50&&row.actionsRight-row.actionsLeft>100,'表示済みのゲームで比較');assert.ok(row.labelScroll<=row.labelWidth+1,'面名を折り返して領域内に表示');assert.ok(row.labelRight<=row.actionsLeft+1,'操作領域を確保');assert.ok(row.actionsRight<=row.width,'ポーズボタンを画面に収める');assert.ok(row.pageWidth<=row.width,'横へのはみ出しなし');
 }
}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2));await b.close();}
