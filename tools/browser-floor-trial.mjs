import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
await mkdir('docs/verification/floor-trial',{recursive:true});
for(const width of [320,390,576]){
 const p=await b.newPage({viewport:{width,height:900},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 const pattern=process.env.TRIAL_PATTERN||'timeTrial';
 const url=(process.env.BASE_URL||'http://127.0.0.1:8765/')+'floor-lab.html?pattern='+pattern+'&debug=1';
 await p.goto(url);await p.waitForFunction(()=>!!window.__floorLab);
 assert.equal(await p.locator('#pattern').inputValue(),pattern);
 await p.clock.runFor(1000);assert.equal(await p.locator('#trial-time').textContent(),'0.00');
 await p.evaluate(()=>Object.assign(window.__floorLab.actor,{x:.53,vx:.4}));await p.clock.runFor(300);
 assert.ok(await p.evaluate(()=>window.__floorLab.trial.elapsedMs>0));
 await p.locator('#pause').click();const elapsed=await p.locator('#trial-time').textContent();await p.clock.runFor(500);
 assert.equal(await p.locator('#trial-time').textContent(),elapsed);
 await p.locator('#pause').click();await p.evaluate(()=>Object.assign(window.__floorLab.actor,{x:6.5,y:6.5,vx:0,vy:0}));
 await p.clock.runFor(32);assert.equal(await p.evaluate(()=>window.__floorLab.trial.finished),true);
 const best=await p.locator('#trial-best').textContent();assert.notEqual(best,'—');
 await p.clock.runFor(500);assert.equal(await p.locator('#trial-best').textContent(),best);
 await p.reload();await p.waitForFunction(()=>!!window.__floorLab);assert.equal(await p.locator('#trial-best').textContent(),best);
 await p.locator('#plaza').click();assert.match(await p.locator('#trial-note').textContent(),/練習/);
 await p.evaluate(()=>Object.assign(window.__floorLab.actor,{x:6.5,y:6.5,vx:0,vy:0}));await p.clock.runFor(32);
 assert.equal(await p.locator('#trial-best').textContent(),best);
 await p.locator('#reset').click();assert.equal(await p.locator('#trial-time').textContent(),'0.00');
 await p.locator('#ice').fill('0.2');await p.locator('#ice').dispatchEvent('input');
 assert.equal(await p.locator('#trial-best').textContent(),'—');
 assert.equal(await p.evaluate(()=>window.__floorLab.actor.x),.5);
 await p.locator('#defaults').click();await p.clock.runFor(32);
 await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`docs/verification/floor-trial/${width}.png`,fullPage:true});
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.locator('#pattern').selectOption('iceRubber');assert.equal(await p.locator('#trial-info').isVisible(),false);
 assert.ok(await p.evaluate(()=>window.__floorLab.stage.walls.every(w=>w.materialId==='rubber')));
 assert.deepEqual(errors,[]);await p.close();console.log('PASS trial '+width);
}
}finally{await b.close()}
