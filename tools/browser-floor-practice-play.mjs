/** 実pointerで力場へ近づき、手を離した後の方向を比較する。位置移動なし。 */
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const rows=[];
const output=process.env.LEARNING_OUTPUT||'docs/verification/floor-learning';await mkdir(output,{recursive:true});
try{
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer'}));});
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'?debug=1');
 await p.waitForFunction(()=>!!window.__corogalism);
 const state=()=>p.evaluate(()=>window.__corogalism.state);
 const ready=async()=>{const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+100)};
 await p.locator('#btn-floor-practice').click();await p.clock.runFor(32);
 await p.waitForFunction(()=>window.__corogalism.state.screen==='game');await ready();
 for(const kind of ['normal','gravity','repulsion']){
  await p.locator(`[data-floor=${kind}]`).click();await p.clock.runFor(32);
  await p.locator('#btn-floor-reset').click();await ready();
  const r=await p.locator('#board').boundingBox();
  await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();
  let s=await state(),steps=0;
  while((Math.abs(s.actor.x-3.45)>.1||Math.abs(s.actor.vx)>.1)&&steps++<250){
   const a=s.actor,ux=Math.max(-1,Math.min(1,((3.45-a.x)*2.5-a.vx)*.65)),uy=Math.max(-1,Math.min(1,((.5-a.y)*2.5-a.vy)*.65));
   await p.mouse.move(r.x+r.width/2+ux*r.width*.49,r.y+r.height/2+uy*r.height*.49);
   await p.clock.runFor(100);s=await state();
  }
  assert.ok(steps<250,kind+' can approach field');
  await p.mouse.up();await p.clock.runFor(350);
  const before=(await state()).actor;await p.clock.runFor(600);const after=(await state()).actor;
  const delta=after.x-before.x;
  rows.push({kind,steps,fromX:before.x,toX:after.x,delta});
  if(kind==='gravity')assert.ok(delta>.04,'gravity pulls right toward center');
  if(kind==='repulsion')assert.ok(delta<-.04,'repulsion pushes left away from center');
  if(kind==='normal')assert.ok(Math.abs(delta)<.04,'normal slows to rest');
  assert.equal((await state()).hp,null);assert.equal((await state()).limitSec,null);
  await p.screenshot({path:`${output}/pointer-${kind}.png`});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(rows));
}finally{await writeFile(`${output}/practice-pointer.json`,JSON.stringify(rows,null,2));await b.close()}
