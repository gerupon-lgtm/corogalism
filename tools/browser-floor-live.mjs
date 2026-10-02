import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
await mkdir('docs/verification/floor-challenge',{recursive:true});
// 面を進めるteleportは紹介UIの検証用。クリア能力・難易度の根拠にはしない。
try{for(const level of ['normal','easy']){
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(level=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:level,soundEnabled:true}));},level);
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto(base+'?debug=1&seed=77');await p.waitForLoadState('networkidle');await p.clock.runFor(32);
 await p.waitForFunction(()=>!!window.__corogalism);assert.match(await p.locator('.head .badge').textContent(),/0.6.5/);
 const state=()=>p.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(32)};
 const ready=async()=>{const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+100)};
 await click('btn-challenge');await ready();
 const rect=await p.locator('#board').boundingBox();await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();await p.mouse.move(rect.x+rect.width*.65,rect.y+rect.height/2);await p.clock.runFor(500);await p.mouse.up();assert.ok((await state()).actor.x>.5);
 for(let n=1;n<10;n++){await p.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y)});await p.clock.runFor(32);await click('btn-next');if(n<9)await ready();}
 assert.equal((await state()).theme.id,level==='normal'?'specialFlow':'iceSand');
 if(level==='normal'){assert.equal(await p.locator('#floor-intro').isVisible(),true);await p.screenshot({path:'docs/verification/floor-challenge/live-special-intro.png'});}
 await ready();assert.equal(await p.locator('#floor-intro').isVisible(),false);
 await p.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y)});await p.clock.runFor(32);await click('btn-clear-exit');
 if(level==='easy'){assert.equal(await p.locator('#flow-preview').isVisible(),true);await p.screenshot({path:'docs/verification/floor-challenge/live-easy-preview.png'});}
 assert.deepEqual(errors,[]);console.log('PASS published flow presentation '+level);await p.close();
}}finally{await b.close()}
