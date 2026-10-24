/** トップの木枠・共通ヘッダー・プレイ盤面の寸法と、展開時の操作を確認。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE);
const engine=process.env.HOME_ENGINE||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({executablePath:engine==='webkit'?'C:/Users/user/AppData/Local/ms-playwright/webkit-2336/Playwright.exe':'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.BASE_URL||'http://127.0.0.1:8794/';
const out=process.env.HOME_OUTPUT||'docs/verification/v0.8.2/local';await mkdir(out,{recursive:true});
const rows=[];
const rects=p=>p.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y+scrollY,width:b.width,height:b.height,bottom:b.bottom+scrollY};};return {head:r('.head'),badge:r('.badge'),frame:r('#screen-mode'),board:r('#board'),height:innerHeight,scroll:document.documentElement.scrollHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth};});
try{
 for(const [width,height,camera,bottom] of [[312,780,0,0],[360,740,0,0],[390,700,0,0],[390,844,0,0],[390,844,47,34],[412,915,18,24],[576,900,0,0],[844,390,0,0]]){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),errors=[];
  await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('verification only'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base+'?debug=1&seed=77');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('#screen-mode').dataset.artReady==='true');
  await page.addStyleTag({content:`:root{--camera-top:${camera}px}.wrap{padding-bottom:${12+bottom}px!important}`});
  const top=await rects(page);
  assert.equal(top.scrollWidth,width);
  if(height>=740){assert.ok(top.scroll<=height+1,JSON.stringify(top));assert.ok(Math.abs(top.frame.bottom-(height-12-bottom))<1);}
  const contained=await page.locator('#screen-mode button').evaluateAll(buttons=>{const f=document.querySelector('#screen-mode').getBoundingClientRect();return buttons.filter(b=>b.getClientRects().length).every(b=>{const r=b.getBoundingClientRect();return r.left>=f.left-1&&r.right<=f.right+1;});});assert.ok(contained,'visible controls must stay inside the wood frame');
  await page.screenshot({path:`${out}/home-${width}-${height}-${camera}.png`,fullPage:true});
  await page.locator('#mode-records summary').click();assert.equal(await page.locator('#mode-records').evaluate(e=>e.open),true);assert.equal((await rects(page)).scrollWidth,width);await page.locator('#mode-records summary').click();
  await page.locator('#btn-practice').click();await page.waitForFunction(()=>window.__corogalism.state.screen==='game');
  const play=await rects(page);assert.ok(Math.abs(top.frame.width-play.board.width)<1);assert.ok(Math.abs(top.frame.x-play.board.x)<1);assert.deepEqual(top.head,play.head);assert.deepEqual(top.badge,play.badge);
  // 画面を回して戻しても、盤面とキャンバスを同時に復帰させる。
  if(width===390&&height===844&&camera===0){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(80);await page.setViewportSize({width,height});await page.waitForTimeout(180);const restored=await rects(page);assert.equal(restored.board.width,play.board.width);const canvas=await page.locator('#canvas').boundingBox();assert.ok(Math.abs(canvas.width-(play.board.width-6))<1);}
  assert.deepEqual(errors,[]);rows.push({width,height,camera,bottom,top,play});await context.close();console.log('PASS '+width+'x'+height+' camera='+camera);
 }
}finally{await writeFile(`${out}/home-size.json`,JSON.stringify({base,engine,rows},null,2)+'\n');await browser.close();}
