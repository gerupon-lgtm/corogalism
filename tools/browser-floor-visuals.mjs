import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
await p.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'floor-lab.html?debug=1');
await mkdir('docs/verification/floor-visuals',{recursive:true});
for(const type of ['ice','sand','gravity','repulsion']) {
await p.locator('[data-type='+type+']').click();
await p.evaluate(()=>Object.assign(window.__floorLab.actor,{x:3.6,y:4.6,vx:0,vy:0}));
await p.clock.runFor(32);await p.locator('#board').screenshot({path:'docs/verification/floor-visuals/'+type+'.png'});
}
await p.locator('#pause').click();await p.clock.runFor(32);
const frozen=await p.locator('#board').screenshot();await p.clock.runFor(500);
assert.deepEqual(await p.locator('#board').screenshot(),frozen);
await p.locator('#pause').click();await p.emulateMedia({reducedMotion:'reduce'});
await p.locator('#reset').click();await p.clock.runFor(32);
const reduced=await p.locator('#board').screenshot();await p.clock.runFor(500);
assert.deepEqual(await p.locator('#board').screenshot(),reduced);
console.log('PASS: four floor visuals, pause and reduced-motion stillness');
} finally {await b.close()}
