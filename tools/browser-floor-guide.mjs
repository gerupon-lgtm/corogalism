import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
const output=process.env.GUIDE_OUTPUT||'docs/verification/floor-challenge';await mkdir(output,{recursive:true});
try{for(const [width,height] of [[320,568],[390,844],[576,1024]]){
 const p=await b.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer'}));});
 await p.goto(base+'?debug=1');await p.waitForFunction(()=>!!window.__corogalism);
 await p.locator('#btn-guide').click();await p.evaluate(()=>document.fonts.ready);
 assert.equal(await p.locator('[data-guide-art=cork]').count(),1);
 assert.equal(await p.locator('.guide-floor-grid .guide-card').count(),4);
 assert.equal(await p.locator('.guide-card').count(),15);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const geometry=await p.locator('#play-guide').evaluate(d=>({height:d.clientHeight,scrollHeight:d.scrollHeight}));
 await p.screenshot({path:`${output}/guide-top-${width}.png`});
 await p.locator('#play-guide').evaluate(d=>d.scrollTop=d.scrollHeight);
 await p.screenshot({path:`${output}/guide-bottom-${width}.png`});
 await p.locator('.guide-close').click();assert.equal(await p.locator('#btn-guide').evaluate(e=>e===document.activeElement),true);
 await p.locator('#btn-practice').click();await p.waitForFunction(()=>window.__corogalism.state.screen==='game');
 await p.locator('#btn-pause').click();await p.locator('#btn-pause-guide').click();
 await p.locator('.guide-x').click();assert.equal(await p.evaluate(()=>window.__corogalism.state.paused),true);
 assert.deepEqual(errors,[]);console.log('PASS guide',width,geometry);await p.close();
}}finally{await b.close()}
