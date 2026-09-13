import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 for(const level of ['easy','normal']) {
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
  const p=await ctx.newPage();await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
  await p.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?debug=1&seed=123');await p.waitForFunction(()=>!!window.__corogalism);
  const state=()=>p.evaluate(()=>window.__corogalism.state);
  const click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(32)};
  const ready=async()=>{const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+32)};
  const clear=async()=>{await p.evaluate(()=>{const a=window.__corogalism;a.teleport(a.state.goal.x,a.state.goal.y)});await p.clock.runFor(32)};
  const key='corogalism-run-bests'+(level==='easy'?'-easy':'');
  const records=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  await p.locator('[data-level="'+level+'"]').first().click();await click('btn-challenge');await ready();await clear();
  assert.equal((await records())?.noContinue?.stages,1,'clear must save before exit or failure');
  await click('btn-next');await ready();await p.evaluate(()=>window.__corogalism.teleport(.5,.5));await p.clock.fastForward((await state()).limitSec*1000+100);
  assert.equal((await state()).screen,'over');await click('btn-continue');
  assert.equal((await records()).withContinue?.stages,1,'continue must save before countdown');
  await ready();await clear();assert.equal((await records()).withContinue.stages,2);assert.equal((await records()).noContinue.stages,1);
  await click('btn-next');await ready();await p.evaluate(()=>window.__corogalism.teleport(.5,.5));await p.clock.fastForward((await state()).limitSec*1000+100);
  await click('btn-continue');assert.equal((await state()).run.continuesLeft,0);
  await click('btn-game-exit');assert.match(await p.locator('#run-category').innerText(),/コンティニュー使用/);assert.equal(await p.locator('#run-badge').isVisible(),true);
  await p.reload();await p.waitForFunction(()=>!!window.__corogalism);assert.equal((await records()).withContinue.stages,2);
  await p.locator('[data-level="'+level+'"]').first().click();await click('btn-challenge');await ready();await clear();await click('btn-next');await ready();await clear();await click('btn-next');await ready();await clear();
  await p.reload();await p.waitForFunction(()=>!!window.__corogalism);
  assert.equal((await records()).noContinue.stages,3,'reload after clear keeps best');assert.equal((await records()).withContinue.stages,2,'new no-continue run preserves separate continued best');
  await ctx.close();console.log('PASS: checkpoint records, continue category, result badge, reload and new run: '+level);
 }
}finally{await browser.close()}
