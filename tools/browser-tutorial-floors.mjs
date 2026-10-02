/** 接触説明の個別検証は位置移動、通しプレイは実pointerのみで検証する。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=process.env.TUTORIAL_OUTPUT||'docs/verification/tutorial-floors';await mkdir(output,{recursive:true});
const rows=[];
try{for(const [width,height]of [[320,568],[390,844],[576,1024]]){
 const p=await b.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer'}));});
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8767/')+'?debug=1');await p.waitForFunction(()=>!!window.__corogalism);
 const state=()=>p.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(32)};
 const start=async()=>{await click('btn-tutorial');await click('btn-tutorial-start');const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+100)};
 for(const [kind,x,y]of [['sand',2.5,1.5],['ice',3.5,3.5],['gravity',4.8,1.5],['repulsion',4.5,5.5],['cork',3.5,3.5]]){
  await start();assert.equal((await state()).limitSec,null);
  await p.evaluate(([x,y])=>window.__corogalism.teleport(x,y),[x,y]);
  if(kind==='cork')await p.evaluate(()=>window.__corogalism.setTilt(0,.6));
  await p.clock.runFor(kind==='cork'?1700:750);
  assert.equal(await p.locator('#tutorial-lesson').getAttribute('data-lesson'),kind);
  assert.ok(await p.locator('.tutorial-copy').textContent());
  const rect=await p.locator('#board').boundingBox(),panel=await p.locator('#tutorial-lesson').boundingBox();
  assert.ok(panel.y>=rect.y+rect.height);assert.ok(panel.y+panel.height<=height+2);
  await p.screenshot({path:`${output}/${kind}-${width}.png`});
  await click('btn-pause');const before=(await state()).actor;await p.clock.runFor(4000);assert.deepEqual((await state()).actor,before);
  await click('btn-resume');const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+100);
  await click('btn-game-exit');
 }
 if(width===390){
  await start();let s=await state(),wp=1,steps=0;const seen=new Set(),r=await p.locator('#board').boundingBox();
  const press=async()=>{await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down()};await press();
  while(s.status==='playing'&&steps++<800){
   const target=s.maze.path[wp],a=s.actor,dx=target.x+.5-a.x,dy=target.y+.5-a.y,d=Math.hypot(dx,dy);
   if(d<.24&&wp<s.maze.path.length-1){wp++;continue;}
   if(s.trap){await p.mouse.up();for(let i=0;i<5;i++){await p.mouse.click(r.x+r.width/2,r.y+r.height/2);await p.clock.runFor(60);await p.mouse.click(r.x+r.width/2,r.y+r.height/2);await p.clock.runFor(60)}await p.clock.runFor(500);await press();}
   const speed=Math.min(1.3,d*3.2);let x=(dx/(d||1)*speed-a.vx)*.65,y=(dy/(d||1)*speed-a.vy)*.65;
   const m=Math.max(1,Math.hypot(x,y));x/=m;y/=m;
   await p.mouse.move(r.x+r.width/2+x*r.width*.49,r.y+r.height/2+y*r.height*.49);await p.clock.runFor(180);s=await state();
   const id=await p.locator('#tutorial-lesson').getAttribute('data-lesson');if(id)seen.add(id);
  }
  await p.mouse.up();assert.equal(s.status,'clear');
  assert.ok(['sand','ice','gravity','repulsion'].every(id=>seen.has(id)),JSON.stringify([...seen]));
  rows.push({width,result:s.status,seconds:s.timeMs/1000,lessons:[...seen]});
  assert.equal(await p.evaluate(()=>localStorage.getItem('corogalism-run-bests-floor-v1')),null);
 }
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('PASS tutorial floors '+width);await p.close();
}}finally{await writeFile(`${output}/tutorial-pointer.json`,JSON.stringify(rows,null,2));await b.close()}
