import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const oldCss=execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show','3c29bd8:style.css'],{encoding:'utf8'});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 await mkdir('docs/verification/compact-layout',{recursive:true});
 for(const [width,height] of [[393,820],[390,780],[360,800],[320,720]]){
  const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
  await ctx.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});localStorage.setItem('corogalism-settings',JSON.stringify({challengeLevel:'easy'}));});
  const page=await ctx.newPage();await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765/');await page.evaluate(()=>document.fonts.ready);
  const dims=await page.evaluate(()=>({page:document.documentElement.scrollHeight,height:innerHeight,copyright:document.querySelector('.menu-copyright').getBoundingClientRect().bottom}));
  console.log('title',width,height,dims);assert.ok(dims.page<=height+1,JSON.stringify(dims));
  await page.screenshot({path:`docs/verification/compact-layout/title-${width}.png`});
  await page.locator('#btn-mode-settings').click();await page.screenshot({path:`docs/verification/compact-layout/settings-${width}.png`,fullPage:true});
  console.log('settings',width,await page.evaluate(()=>document.documentElement.scrollHeight));
  await page.locator('#btn-settings-close').click();await page.locator('#btn-practice').click();await page.waitForFunction(()=>document.body.dataset.screen==='game');await page.evaluate(()=>document.fonts.ready);
  const box=await page.locator('#board').boundingBox();const pause=await page.locator('#btn-pause').boundingBox();
  await page.route('**/style.css',r=>r.fulfill({contentType:'text/css',body:oldCss}));await page.reload();await page.evaluate(()=>document.fonts.ready);await page.locator('#btn-practice').click();await page.waitForFunction(()=>document.body.dataset.screen==='game');await page.evaluate(()=>document.fonts.ready);
  assert.deepEqual(await page.locator('#board').boundingBox(),box);assert.deepEqual(await page.locator('#btn-pause').boundingBox(),pause);
  await ctx.close();
 }
 console.log('PASS title fits including copyright; game board and pause geometry unchanged.');
}finally{await browser.close()}
