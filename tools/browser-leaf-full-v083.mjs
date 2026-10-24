/** 実ゲームでまもりを満たし、取得不可の理由と盤面外の位置を確認する。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.BASE_URL||'http://127.0.0.1:8794/';
const out=process.env.LEAF_OUTPUT||'docs/verification/v0.8.3/local';await mkdir(out,{recursive:true});
const rows=[];
try{
 for(const width of [312,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),errors=[];
  await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('verification only'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  await page.goto(base+'?debug=1&seed=1');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>!!window.__corogalism);await page.locator('#btn-challenge').click();await page.waitForFunction(()=>window.__corogalism.state.screen==='game',null,{polling:50});await page.clock.runFor(4500);
  const contact=async()=>{await page.evaluate(()=>{const s=window.__corogalism.state;assertLeaf(s);function assertLeaf(s){if(!s.leaf)throw Error('seed must provide a real leaf');Object.assign(s.leaf,{x:s.actor.x,y:s.actor.y,collected:false});}});await page.clock.runFor(32);};
  // 同じ葉っぱを3回配置するテスト条件。取得量・まもりの加算自体は本物の処理。
  for(let i=0;i<3;i++)await contact();
  let s=await page.evaluate(()=>window.__corogalism.state);assert.equal(s.shield,s.hp.max*.5);assert.equal(s.hp.value,s.hp.max);
  await contact();assert.equal(await page.locator('#recovery-feedback').textContent(),'葉っぱのまもりはまんたん！');assert.equal((await page.evaluate(()=>window.__corogalism.state)).leaf.collected,false);
  const geometry=await page.evaluate(()=>{const b=document.querySelector('#board').getBoundingClientRect(),n=document.querySelector('#recovery-feedback').getBoundingClientRect();return{boardBottom:b.bottom,noticeTop:n.top,noticeLeft:n.left,noticeRight:n.right,width:innerWidth};});
  assert.ok(geometry.noticeTop>=geometry.boardBottom);assert.ok(geometry.noticeLeft>=0&&geometry.noticeRight<=width);
  await page.screenshot({path:`${out}/leaf-full-${width}.png`,fullPage:true});
  await page.clock.runFor(3500);assert.equal(await page.locator('#recovery-feedback').textContent(),'');
  await page.evaluate(()=>{window.__corogalism.state.leaf.x+=3;});await page.clock.runFor(32);await contact();assert.equal(await page.locator('#recovery-feedback').textContent(),'葉っぱのまもりはまんたん！');
  assert.deepEqual(errors,[]);rows.push({width,shield:s.shield,maxHp:s.hp.max,geometry,oncePerContact:true,reentry:true});await context.close();console.log('PASS leaf-full '+width);
 }
}finally{await writeFile(`${out}/leaf-full.json`,JSON.stringify({base,rows},null,2)+'\n');await browser.close();}
