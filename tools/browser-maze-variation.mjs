/** 実pointerイベントで新しい本編を遊ぶ。先の面の診断だけteleportで省略し区別して記録する。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8768/',output=process.env.VARIETY_BROWSER_OUTPUT||'docs/verification/maze-variation/v0620/game-local';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
await mkdir(output,{recursive:true});const rows=[];
try{for(const level of (process.env.VARIETY_LEVELS||'easy,normal').split(',')){
 const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(level=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:level,soundEnabled:true}));
  localStorage.setItem('corogalism-run-bests-floor-v1-easy',JSON.stringify({withContinue:{stages:107,totalTimeMs:1600000,at:'2026-10-07T00:00:00Z'}}));
 },level);
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);await p.goto(base+'?debug=1&seed=77');
 await p.waitForFunction(()=>!!window.__corogalism,null,{polling:50});
 assert.equal(await p.locator('.badge').textContent(),'v'+version);
 if(level==='easy')assert.match(await p.locator('#mode-legacy').textContent(),/107/);
 const state=()=>p.evaluate(()=>window.__corogalism.state);
 const click=async(id,diagnostic=false)=>{const el=p.locator('#'+id);if(['btn-next','btn-continue'].includes(id)){if(diagnostic)await p.clock.fastForward(1100);else await p.clock.runFor(1100);}await el.click();await p.clock.runFor(32);};
 const ready=async(diagnostic=false)=>{if(diagnostic){for(let i=0;i<80;i++){const s=await state();if(!s.prepareMs&&!s.countdownMs)return;await p.clock.fastForward(250);}assert.fail('診断用の面送りも開始待機を完了する');}const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+64);const next=await state();assert.equal(next.prepareMs+next.countdownMs,0);};
 await click('btn-challenge');await ready();
 const stop=Number(process.env.VARIETY_STOP_STAGE||(level==='easy'?112:16));
 const pickedStage=n=>process.env.VARIETY_STAGES?process.env.VARIETY_STAGES.split(',').map(Number).includes(n):n<=16||n>=97;
 for(let n=1;n<=stop;n++){
  let s=await state();assert.equal(s.stageIndex,n);
  const picked=pickedStage(n);
  if(!picked){await p.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y)});await p.clock.runFor(32);assert.equal((await state()).status,'clear');if(n<stop){const diagnostic=!pickedStage(n+1);await click('btn-next',diagnostic);await ready(diagnostic);}continue;}
  if(n<=8)assert.equal(s.maze.size,7);
  const profile=s.maze.variation;assert.equal(s.hp.max,40+s.maze.path.slice(2).filter((c,i)=>{
   const a=s.maze.path[i],b=s.maze.path[i+1];return c.x-b.x!==b.x-a.x||c.y-b.y!==b.y-a.y;
  }).length*4);
  if(n===3){
   const original=JSON.stringify({maze:s.maze,walls:s.walls,zones:s.zones});
   await p.evaluate(()=>window.__corogalism.setTilt(.1,.1));await p.clock.runFor(1000);
   await p.clock.fastForward((await state()).remainingSec*1000+1000);await p.clock.runFor(32);
   assert.equal((await state()).status,'timeout');await click('btn-continue');await ready();s=await state();
   assert.equal(JSON.stringify({maze:s.maze,walls:s.walls,zones:s.zones}),original);assert.equal(s.run.usedContinue,true);
  }
  const path=s.maze.path;let wp=1,steps=0;const rect=await p.locator('#board').boundingBox();
  assert.ok(rect.width>200);await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();
  while(s.status==='playing'&&steps<Math.ceil((s.limitSec+10)*1000/180)){
   if(s.trap){await p.mouse.up();await p.locator('#board').dblclick({position:{x:rect.width/2,y:rect.height/2}});await p.mouse.down();}
   const a=s.actor,tg=path[wp],dx=tg.x+.5-a.x,dy=tg.y+.5-a.y,dist=Math.hypot(dx,dy);
   if(dist<.24&&wp<path.length-1){wp++;continue;}
   const ice=s.zones.some(z=>z.kind==='ice'&&z.cells.some(c=>c.x===Math.floor(a.x)&&c.y===Math.floor(a.y)));
   const speed=Math.min(ice?1.35:1.7,dist*3.2);let x=(dx/(dist||1)*speed-a.vx)*.65,y=(dy/(dist||1)*speed-a.vy)*.65;
   if(steps%31===12){x+=.12;y-=.1;}const m=Math.max(1,Math.hypot(x,y));x/=m;y/=m;
   await p.mouse.move(rect.x+rect.width/2+x*rect.width*.49,rect.y+rect.height/2+y*rect.height*.49);
   await p.clock.runFor(180);s=await state();steps++;
   if(steps===20&&[3,4,7,8,12,100,107].includes(n))await p.screenshot({path:`${output}/play-${level}-${n}.png`});
   if(n===2&&steps===8){await p.mouse.up();await click('btn-pause');await click('btn-pause-guide');assert.ok(await p.locator('.guide-tip').first().textContent());await p.locator('.guide-x').click();assert.equal((await state()).paused,true);await click('btn-resume');await ready();await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();s=await state();}
  }
  await p.mouse.up();rows.push({level,stage:n,profile,theme:s.theme.id,label:s.theme.label,materials:s.walls.reduce((a,w)=>(a[w.materialId]=(a[w.materialId]||0)+1,a),{}),realPointerPlay:true,result:s.status,seconds:+(s.timeMs/1000).toFixed(2),limit:s.limitSec,hp:+s.hp.value.toFixed(1),maxHp:s.hp.max,wallHits:s.wallHits});
  console.log(JSON.stringify(rows.at(-1)));assert.equal(s.status,'clear',JSON.stringify(rows.at(-1)));
  if(n<stop){await click('btn-next');await ready();}
 }
 assert.deepEqual(errors,[]);await p.close();
}}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2));await browser.close();}
