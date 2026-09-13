import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765/');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await page.locator('#btn-pwa-check').click();await page.waitForFunction(()=>document.querySelector('#pwa-check-result').textContent==='最新版です。');
 assert.equal(await page.locator('.badge').innerText(),'v0.4.4');
 await mkdir('docs/verification/update-check',{recursive:true});
 await page.screenshot({path:'docs/verification/update-check/title-390.png',fullPage:true});
 await ctx.setOffline(true);await page.locator('#btn-pwa-check').click();await page.waitForFunction(()=>document.querySelector('#pwa-check-result').textContent.includes('オフラインです'));
 assert.equal(await page.locator('#btn-pwa-check').isEnabled(),true);
 console.log('PASS: v0.4.4 latest/manual check, offline result and retry button.');
}finally{await browser.close()}
