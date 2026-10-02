import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined}));
 const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
 await p.goto(base+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller);
 const cache=await p.evaluate(async()=>{const names=await caches.keys();return {names,files:(await (await caches.open(names[0])).keys()).length}});assert.equal(cache.files,100);
 await c.setOffline(true);await p.goto(base+'ball-lab.html?debug=1');await p.waitForFunction(()=>!!window.__ballLab);
 await p.locator('[data-ball=superball]').click();await p.locator('#floor').selectOption('mixed');await p.locator('#wall').selectOption('rubber');
 const r=await p.locator('#board').boundingBox();await p.mouse.move(r.x+r.width*.7,r.y+r.height/2);await p.mouse.down();await p.waitForTimeout(350);await p.mouse.up();await p.waitForTimeout(350);
 const state=await p.evaluate(()=>window.__ballLab.state);assert.ok(state.actor.x>.7);assert.equal(state.sound.rolling,false);assert.ok(!state.sound.events.some(e=>e.startsWith('roll:superball:')));assert.equal(state.sound.context,'running');
 await p.evaluate(()=>window.__ballLab.teleport(6.2,.5,4,0));await p.waitForTimeout(350);
 const hit=await p.evaluate(()=>window.__ballLab.state.sound);assert.ok(hit.events.includes('hit:superball:rubber'));
 await p.locator('[data-ball=default]').click();await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));await p.waitForTimeout(150);
 const glass=await p.evaluate(()=>window.__ballLab.state.sound);assert.ok(glass.events.includes('roll:default:ice'));
 await p.locator('[data-ball=metal]').click();await p.evaluate(()=>window.__ballLab.teleport(2,.5,2,0));await p.waitForTimeout(150);
 const metal=await p.evaluate(()=>window.__ballLab.state.sound);assert.ok(metal.events.includes('roll:metal:ice'));assert.equal(metal.rolling,true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({offline:true,...cache,softBall:state.sound,impact:hit,glass,metal}));await c.close();
 for(const source of ['export function resolveParams() {}','// ch.fieldK\nexport function resolveParams() {}']){
  const old=await b.newPage({serviceWorkers:'block'});await old.route('**/src/physics/resolveParams.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
  await old.goto(base+'ball-lab.html?debug=1');await old.waitForFunction(()=>document.querySelector('#status').textContent.includes('更新が必要'));
  assert.equal(await old.evaluate(()=>!!window.__ballLab),false);assert.equal(await old.locator('button:not(:disabled)').count(),0);await old.close();console.log('PASS old physics guard');
 }
}finally{await b.close()}
