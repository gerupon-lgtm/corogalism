import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
await mkdir('docs/verification/floor-patterns',{recursive:true});
for(const width of [320,390,576]) {
const p=await b.newPage({viewport:{width,height:900},serviceWorkers:'block'}),errors=[];
p.on('pageerror',e=>errors.push(e.message));
await p.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'floor-lab.html?debug=1');
await p.waitForFunction(()=>!!window.__floorLab);
await p.locator('#pause').click();
for(const pattern of ['timeTrialAssist','iceRubber','iceSand','cornerGravity','cornerRepulsion','iceGravity','iceRepulsion']) {
await p.locator('#pattern').selectOption(pattern);
assert.equal(await p.locator('#floors').isVisible(),false);
assert.equal(await p.evaluate(()=>window.__floorLab.pattern),pattern);
await p.locator('#plaza').click();
await p.locator('#copy').click();
assert.equal(JSON.parse(await p.locator('#settings-text').inputValue()).pattern,pattern);
assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await p.locator('#board').screenshot({path:`docs/verification/floor-patterns/${width}-${pattern}.png`});
}
await p.locator('#pattern').selectOption('single');assert.equal(await p.locator('#floors').isVisible(),true);
assert.deepEqual(errors,[]);await p.close();console.log('PASS patterns '+width);
}
} finally {await b.close()}
