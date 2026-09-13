import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 await mkdir('docs/verification/guide',{recursive:true});
 for(const width of [320,390,576]){
 const ctx=await browser.newContext({viewport:{width,height:844},hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765/');
 await page.locator('#btn-guide').scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY);
 await page.locator('#btn-guide').click();await page.evaluate(()=>document.fonts.ready);
 const sizes=await page.evaluate(()=>{const d=document.querySelector('#play-guide');return {h:d.clientHeight,scroll:d.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,cards:[...d.querySelectorAll('.guide-floors .guide-card')].map(c=>c.getBoundingClientRect().height)}});
 assert.equal(sizes.overflow,false);assert.ok(sizes.scroll<=sizes.h+1,JSON.stringify({width,...sizes}));assert.equal(sizes.cards[0],sizes.cards[1]);
 assert.equal(await page.locator('.guide-card').count(),10);
 assert.equal(await page.locator('.guide-floors .guide-card').last().locator('p').innerText(),'迷路内連続タップで最短0.5秒で脱出可能。');
 await page.screenshot({path:`docs/verification/guide/overlay-${width}.png`});
 await page.locator('.guide-close').click();assert.equal(await page.locator('#play-guide').isVisible(),false);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<2);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-guide');
 await page.locator('#btn-guide').click();await page.mouse.click(2,2);assert.equal(await page.locator('#play-guide').isVisible(),false);
 await page.locator('#btn-guide').click();await page.locator('.guide-x').click();assert.equal(await page.locator('#play-guide').isVisible(),false);
 await page.locator('#btn-guide').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#play-guide').isVisible(),false);
 await page.setViewportSize({width,height:480});await page.locator('#btn-guide').click();await page.locator('.guide-close').scrollIntoViewIfNeeded();await page.locator('.guide-close').click();
 assert.deepEqual(errors,[]);await ctx.close();console.log('PASS guide',width,'equal floors, one screen, all dismissal paths, small-height close');
 }
}finally{await browser.close()}
