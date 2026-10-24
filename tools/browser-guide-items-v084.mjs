/** 取得不可の短い説明が読め、ガイドのスクロール増が小さいことを確認する。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const playwright=await import(process.env.PLAYWRIGHT_MODULE);
const engine=process.env.GUIDE_ENGINE||'chromium';
const version=process.env.APP_VERSION||'0.8.4';
const base=process.env.BASE_URL||'http://127.0.0.1:8794/';
const out=process.env.GUIDE_OUTPUT||'docs/verification/v0.8.4/local';
const offline=process.env.GUIDE_OFFLINE==='1';
await mkdir(out,{recursive:true});
const browser=await playwright[engine].launch({headless:true,executablePath:engine==='webkit'?'C:/Users/user/AppData/Local/ms-playwright/webkit-2336/Playwright.exe':'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const rows=[];
try {
 for(const [width,height] of (offline?[[390,844]]:[[312,780],[390,844],[412,915]])) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:offline?'allow':'block'}),errors=[];
  await context.addInitScript(()=>{
   Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});
   Element.prototype.requestFullscreen=()=>Promise.reject(Error('verification only'));
   localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',soundEnabled:false}));
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(new URL('?debug=1',base).href);
  if(offline){
   await page.evaluate(()=>navigator.serviceWorker.ready);
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   const cacheSize=await page.evaluate(async()=>{const name=(await caches.keys()).find(n=>n.startsWith('corogalism-'));return (await(await caches.open(name)).keys()).length;});
   assert.equal(cacheSize,130);
   await context.setOffline(true);
   await page.reload();
  }
  await page.waitForFunction(()=>!!window.__corogalism);
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.badge').textContent(),'v'+version);
  await page.locator('#btn-guide').scrollIntoViewIfNeeded();
  const homeScroll=await page.evaluate(()=>scrollY);
  await page.locator('#btn-guide').click();
  assert.equal(await page.locator('#play-guide').isVisible(),true);
  const geometry=await page.locator('#play-guide').evaluate(dialog=>{
   const cards=['candy','leaf'].map(id=>dialog.querySelector(`.guide-card [data-guide-art="${id}"]`).closest('article'));
   const paragraphs=cards.map(c=>c.querySelector('p'));
   const current=paragraphs.map(p=>p.textContent);
   const measure=()=>({scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight,scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth,cards:cards.map(c=>c.getBoundingClientRect().height)});
   const after=measure();
   // 旧本文だけを一時的に戻し、同じCSS・フォント・幅で増加量を測る。
   ['20％回復。満タンなら残る。','ダメージを肩代わり。'].forEach((text,i)=>paragraphs[i].textContent=text);
   const before=measure();
   current.forEach((text,i)=>paragraphs[i].textContent=text);
   return {before,after,text:current,addedScroll:after.scrollHeight-before.scrollHeight,paragraphsFit:paragraphs.every(p=>p.scrollWidth<=p.clientWidth)};
  });
  assert.match(geometry.text[0],/げんき満タンでは取れません。/);
  assert.match(geometry.text[1],/まもり満タンでは取れません。/);
  assert.ok(geometry.addedScroll>=0&&geometry.addedScroll<=36,JSON.stringify(geometry));
  assert.ok(geometry.paragraphsFit);
  assert.ok(geometry.after.scrollWidth<=geometry.after.clientWidth);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const itemGroup=page.locator('.guide-group').filter({has:page.locator('h2',{hasText:'うれしいアイテム'})});
  await itemGroup.scrollIntoViewIfNeeded();
  await itemGroup.screenshot({path:`${out}/guide-items-${width}.png`});
  await page.locator('.guide-close').scrollIntoViewIfNeeded();
  await page.locator('.guide-close').click();
  assert.equal(await page.locator('#play-guide').isVisible(),false);
  await page.waitForFunction(()=>document.activeElement.id==='btn-guide');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-guide');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-homeScroll)<2);
  await page.locator('#btn-practice').click();
  await page.waitForFunction(()=>window.__corogalism.state.screen==='game');
  await page.locator('#btn-pause').click();
  await page.locator('#btn-pause-guide').click();
  assert.equal(await page.locator('#play-guide').isVisible(),true);
  assert.match(await page.locator('#play-guide').textContent(),/まもり満タンでは取れません。/);
  await page.locator('.guide-x').click();
  assert.equal(await page.evaluate(()=>window.__corogalism.state.paused),true);
  assert.deepEqual(errors,[]);
  rows.push({width,height,...geometry,errors});
  console.log(`PASS ${engine} ${width}: added scroll ${geometry.addedScroll}px`);
  await context.close();
 }
} finally {
 await writeFile(`${out}/guide-items.json`,JSON.stringify({base,version,engine,offline,rows},null,2)+'\n');
 await browser.close();
}
