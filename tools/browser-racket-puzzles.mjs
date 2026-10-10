/** 新しい通路パズルを実Chromeで操作する。自動制御と実機の遊びやすさは分ける。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8772/';
const output=process.env.RACKET_PUZZLE_OUTPUT||'docs/verification/racket-puzzles/local';
const viewports=(process.env.RACKET_PUZZLE_VIEWPORTS||'312x720,412x915,576x1024').split(',').map(v=>v.split('x').map(Number));
const rows=[];await mkdir(output,{recursive:true});let active=null,activeErrors=[],activeRequests=[];
const clamp=(v,limit)=>Math.max(-limit,Math.min(limit,v));
async function fixture(layout,width=412,height=915,workers='block'){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===412?2.625:1,serviceWorkers:workers});
 await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture fullscreen rejection'));});
 const page=await context.newPage(),errors=[],requests=[];active=page;activeErrors=errors;activeRequests=requests;
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push({url:r.url(),failure:r.failure()}));
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(base+'racket-lab.html?debug=1&mode=rackets&layout='+layout);await page.waitForFunction(()=>!!window.__racketLab);await page.evaluate(()=>document.fonts.ready);await page.clock.runFor(32);
 assert.match(await page.locator('header span').textContent(),/おためし3.*v0\.6\.30/);
 assert.equal(await page.locator('#layout').inputValue(),layout);assert.equal(await page.evaluate(()=>window.__racketLab.state.stage.maze.labLayout),layout);
 return {context,page,errors,requests};
}
async function snapshot(page){return page.evaluate(()=>{
 const s=window.__racketLab.state,actor={x:s.actor.x,y:s.actor.y,vx:s.actor.vx,vy:s.actor.vy,r:s.actor.r};
 const racks=s.rackets.map(w=>({id:w.id,x:w.x,y:w.y,w:w.w,h:w.h,axis:w.axis,min:w.min,max:w.max,home:w.home,bounce:w.bounce,blocked:w.blocked,vx:w.vx,vy:w.vy}));
 const embedded=[];for(const w of [...s.stage.walls,...s.rackets]){
  const nx=Math.max(w.x,Math.min(actor.x,w.x+w.w)),ny=Math.max(w.y,Math.min(actor.y,w.y+w.h));
  if(Math.hypot(actor.x-nx,actor.y-ny)<actor.r-1e-7)embedded.push({id:w.id??'static',x:w.x,y:w.y,w:w.w,h:w.h});
 }
 return {layout:s.settings.layout,mode:s.settings.mode,actor,rackets:racks,goalReached:s.goalReached,elapsedSec:s.elapsedSec,racketHits:s.racketHits,lastHalt:s.lastHalt,paused:s.paused,sampledLastWallHits:s.lastResult?.wallHits??0,blockedRackets:s.lastResult?.blockedRackets??[],embedded};
});}
function assertLive(s){assert.equal(s.lastHalt,null,'通常の操作で計算を中断しない');assert.ok([s.actor.x,s.actor.y,s.actor.vx,s.actor.vy,...s.rackets.flatMap(w=>[w.x,w.y,w.vx,w.vy])].every(Number.isFinite));assert.deepEqual(s.embedded,[],'球が壁の内部へ入り込まない');}
async function restart(page,layout){
 await page.locator('#scenario').selectOption('rackets');await page.locator('#layout').selectOption(layout);await page.locator('#reset').click();await page.clock.runFor(32);
 if((await snapshot(page)).paused){await page.locator('#pause').click();await page.clock.runFor(32);}
}
async function inputControl(page){
 await page.locator('#board').scrollIntoViewIfNeeded();const box=await page.locator('#board').boundingBox();let down=false;
 return {
  async move(x,y){const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}if(!down){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();down=true;}await page.mouse.move(box.x+box.width*(.5+x/2),box.y+box.height*(.5+y/2));},
  async release(){if(down){await page.mouse.up();down=false;}},
 };
}
async function hold(page,input,tilt,seconds,trace,purpose,observe){
 await input.move(tilt.x,tilt.y);const ticks=Math.ceil(seconds*1000/16);
 for(let i=0;i<ticks;i++){await page.clock.runFor(Math.min(16,seconds*1000-i*16));const s=await snapshot(page);assertLive(s);observe?.(s,i);if(i%10===0||i===ticks-1)trace.push({phase:purpose,tick:i,...s});if(s.goalReached)break;}
}
async function until(page,input,op,trace){
 await input.move(op.tilt.x,op.tilt.y);assert.ok(['x','y'].includes(op.condition.axis));let reached=false;
 for(let i=0;i<Math.ceil(op.maxSeconds*1000/16);i++){
  await page.clock.runFor(16);const s=await snapshot(page);assertLive(s);const position=s.actor[op.condition.axis];
  reached=(op.condition.min===undefined||position>=op.condition.min)&&(op.condition.max===undefined||position<=op.condition.max);
  if(i%8===0||reached)trace.push({phase:op.purpose,condition:op.condition,tick:i,reached,...s});if(reached||s.goalReached)break;
 }
 assert.equal(reached,true,'位置を見て切り替える操作が所定の通過条件へ届く');
}
async function route(page,input,via,trace,purpose){
 for(const target of via){
  let reached=false;
  for(let i=0;i<1100;i++){
   const s=await snapshot(page);assertLive(s);if(s.goalReached)return;
   const dx=target.x-s.actor.x,dy=target.y-s.actor.y;
   if(Math.hypot(dx,dy)<.045&&Math.hypot(s.actor.vx,s.actor.vy)<.1){trace.push({phase:purpose,target,reached:true,...s});reached=true;break;}
   const x=clamp((clamp(dx*2,1.3)-s.actor.vx)*.45,.7),y=clamp((clamp(dy*2,1.3)-s.actor.vy)*.45,.7);
   await input.move(x,y);await page.clock.runFor(16);if(i%30===0)trace.push({phase:purpose,target,tick:i,...s});
  }
  if(!reached){const s=await snapshot(page);trace.push({phase:purpose,target,reached:false,...s});throw Error('自動pointer制御が通過点へ到達しない '+JSON.stringify({target,actor:s.actor,rackets:s.rackets}));}
 }
}
async function completeCourse(page,layout){
 await restart(page,layout);const operations=await page.evaluate(()=>window.__racketLab.state.stage.labAnchors.recommendedOperations);
 assert.ok(Array.isArray(operations)&&operations.length>0,'新面に開始からの検証操作を定義する');
 const input=await inputControl(page),trace=[],before=await snapshot(page),result={layout,automatedController:true,teleport:false,debugAdvance:false,controller:{tickMs:16,velocityFromError:2,maxDesiredSpeed:1.3,velocityFeedback:.45,maxInputComponent:.7,tolerance:.045,maxArrivalSpeed:.1},operations,before,trace};
 rows.push({fullCourse:result});
 try{for(const op of operations){
  if(op.kind==='hold'){
   const initial=await snapshot(page);await hold(page,input,op.tilt,op.seconds,trace,op.purpose??op.until??'hold');const after=await snapshot(page);
   const moved=Math.hypot(after.actor.x-initial.actor.x,after.actor.y-initial.actor.y)>.01||after.rackets.some(w=>{const old=initial.rackets.find(p=>p.id===w.id);return Math.hypot(w.x-old.x,w.y-old.y)>.01;});
   assert.ok(moved,'全コースの保持入力が盤面へ届き、球または戸が動く');
  }
  else if(op.kind==='route')await route(page,input,op.via,trace,op.purpose??'route');
  else if(op.kind==='until')await until(page,input,op,trace);
  else throw Error('未知の検証操作 '+op.kind);
  if((await snapshot(page)).goalReached)break;
 }}finally{await input.release();result.final=await snapshot(page);}
 assert.equal(result.final.goalReached,true,'新面を開始から実pointer操作で完走する');console.log('PASS puzzle course '+layout+' '+result.final.elapsedSec.toFixed(3)+'sec hits'+result.final.racketHits);
 return result;
}
async function sequencePassChecks(page){
 const results=[];
 for(const id of ['gate-1','gate-2'])for(const open of [false,true]){
  await restart(page,'sequence');const setup=await page.evaluate(({id,open})=>{
   const lab=window.__racketLab,a=lab.state.stage.labAnchors,w=lab.state.rackets.find(w=>w.id===id),point=id==='gate-1'?a.waitingA:a.waitingB;
   w[w.axis]=a.gateStates[open?'open':'closed'][id];lab.teleport(point.x,point.y);
   return {actor:point,gateId:id,gatePosition:w[w.axis],axis:w.axis,open};
  },{id,open});
  const input=await inputControl(page),trace=[];let passed=false,passedAtMs=null;
  await hold(page,input,id==='gate-1'?{x:.5,y:0}:{x:0,y:.5},2,trace,id+(open?' open':' closed'),(s,i)=>{
   const w=s.rackets.find(w=>w.id===id),beyond=id==='gate-1'?s.actor.x>w.x+w.w+s.actor.r:s.actor.y>w.y+w.h+s.actor.r;
   if(beyond&&!passed){passed=true;passedAtMs=(i+1)*16;trace.push({firstCrossing:true,tick:i,...s});}
  });await input.release();const final=await snapshot(page);
  results.push({debugActorAndGatePlacement:setup,debugAdvance:false,actualPointer:true,observationSeconds:2,passed,passedAtMs,final,trace});rows.push({sequenceGateProbe:results.at(-1)});assert.equal(passed,open,'閉じた戸で止まり、開いた戸の先へ進む');
 }
 console.log('PASS sequence closed/open crossings');return results;
}
async function timingChecks(page){
 const results=[];
 for(const when of ['early','late']){
  await restart(page,'timing');const probe=await page.evaluate(()=>{
   const lab=window.__racketLab,a=lab.state.stage.labAnchors.timingProbe,w=lab.state.rackets.find(w=>w.id===a.gate.id);w[w.axis]=a.gate.position;lab.teleport(a.actor.x,a.actor.y,a.actor.vx,a.actor.vy);return a;
  });
  const input=await inputControl(page),trace=[];const result={when,debugActorAndGatePlacement:probe,debugAdvance:false,actualPointer:true,trace};rows.push({timingProbe:result});
  let timeMs=0,passedAtMs=null,positiveInertiaOnLeft=false,sampledWallHits=0;
  for(const phase of probe[when]){
   await input.move(phase.tilt.x,phase.tilt.y);
   for(let i=0;i<Math.ceil(phase.seconds*1000/16);i++){
    const step=Math.min(16,phase.seconds*1000-i*16);await page.clock.runFor(step);timeMs+=step;const s=await snapshot(page);assertLive(s);sampledWallHits+=s.sampledLastWallHits;
    if(passedAtMs===null&&s.actor.y>=probe.passY)passedAtMs=timeMs;
    const gate=s.rackets.find(w=>w.id===probe.gate.id);if(phase.tilt.x<0&&s.actor.vx>0&&gate.x<probe.gate.position-.02)positiveInertiaOnLeft=true;
    if(i%6===0||s.actor.y>=probe.passY)trace.push({timeMs,input:phase.tilt,...s});
   }
  }
  await input.release();Object.assign(result,{passedAtMs,positiveInertiaOnLeft,sampledWallHits,wallHitCountExact:false,final:await snapshot(page)});results.push(result);
  assert.equal(passedAtMs!==null,when==='early','早い切返しは1秒以内に通れ、遅い切返しは同じ1秒では通れない');if(when==='early')assert.equal(positiveInertiaOnLeft,true,'左へ戸を戻しても球の右向き慣性は残る');
 }
 console.log('PASS timing early/late and inertia');return results;
}
async function timingSwitchProbe(page){
 for(const probe of [{layout:'timing',x:4.265,y:3.38,allowed:false},{layout:'timing',x:4.2,y:3.5,allowed:false},{layout:'sequence',x:5.22,y:4.38,allowed:true}]){
  await restart(page,probe.layout);await page.locator('#pause').click();await page.locator('#scenario').selectOption('baseline');await page.clock.runFor(32);await page.evaluate(({x,y})=>window.__racketLab.teleport(x,y),probe);
  const before=await snapshot(page);assertLive(before);await page.locator('#scenario').selectOption('rackets');const immediate=await snapshot(page),message=await page.locator('#status').textContent();await page.clock.runFor(32);const pausedFrame=await snapshot(page);
  assertLive(immediate);assertLive(pausedFrame);assert.deepEqual(immediate.actor,before.actor,'切替直後も球の位置と勢いを保つ');assert.deepEqual(pausedFrame.actor,before.actor,'停止中の切替で球を押し出さない');
  assert.equal(immediate.mode,probe.allowed?'rackets':'baseline');assert.equal(await page.locator('#scenario').inputValue(),probe.allowed?'rackets':'baseline');
  if(probe.allowed){const gate=immediate.rackets.find(w=>w.id==='gate-2');assert.equal(gate.x,gate.min,'外接矩形は重なっても円の角が安全ならminへ置ける');}
  else{assert.equal(immediate.rackets.length,0);assert.match(message,/切り替|切替|置け|重な|安全/,'切替できない理由を表示する');}
  await page.locator('#pause').click();await page.clock.runFor(32);const resumedFrame=await snapshot(page);assertLive(resumedFrame);assert.deepEqual(resumedFrame.actor,before.actor);
  const result={debugPlacement:probe,before,immediate,pausedFrame,resumedFrame,message,displacement:Math.hypot(resumedFrame.actor.x-before.actor.x,resumedFrame.actor.y-before.actor.y)};
  rows.push({modeEnableSafety:result});console.log('PASS mode enable '+JSON.stringify({probe,mode:immediate.mode,displacement:result.displacement,message}));
 }
}
async function inspectLayout(page,layout,width){
 const modes=[];for(const mode of ['baseline','cotton','rackets']){
  await page.locator('#scenario').selectOption(mode);await page.clock.runFor(32);
  const s=await page.evaluate(()=>{const s=window.__racketLab.state;return {mode:s.settings.mode,layout:s.settings.layout,walls:s.stage.walls.map(({x,y,w,h})=>({x,y,w,h})),zones:s.stage.zones,rackets:s.rackets,cotton:s.stage.walls.filter(w=>w.materialId==='cotton').length};});
  assert.equal(s.mode,mode);assert.equal(s.layout,layout);if(mode!=='rackets')assert.equal(s.rackets.length,0);else assert.ok(s.rackets.length>0);
  if(mode==='baseline')assert.equal(s.cotton,0);else assert.ok(s.cotton>0);modes.push(s);
 }
 for(const s of modes.slice(1)){assert.deepEqual(s.walls,modes[0].walls);assert.deepEqual(s.zones,modes[0].zones);}
 const definitions=modes.at(-1).rackets;assert.equal(new Set(definitions.map(w=>w.id)).size,definitions.length);
 for(const w of definitions){assert.ok(['x','y'].includes(w.axis));assert.ok(w.w>0&&w.h>0);assert.ok(w.min<=w[w.axis]&&w[w.axis]<=w.max);assert.equal(w.bounce,'reflect');assert.equal(w.physicsMaterial.damageK,0);}
 await restart(page,layout);const stored=await page.evaluate(()=>JSON.stringify({...localStorage})),before=await snapshot(page),input=await inputControl(page),trace=[];
 await hold(page,input,{x:.45,y:.45},.35,trace,'bothaxes');await input.release();const moving=await snapshot(page);
 for(const w of moving.rackets){const old=before.rackets.find(p=>p.id===w.id),fixed=w.axis==='x'?'y':'x';assert.equal(w[fixed],old[fixed]);assert.ok(w[w.axis]>=w.min-1e-9&&w[w.axis]<=w.max+1e-9);}
 assert.ok(moving.rackets.some(w=>{const old=before.rackets.find(p=>p.id===w.id);return Math.abs(w[w.axis]-old[old.axis])>.01;}),'同じpointerで可動壁が動く');
 await page.clock.runFor(1200);const neutral=await snapshot(page);await page.clock.runFor(1000);const settled=await snapshot(page);
 for(const w of settled.rackets){const old=neutral.rackets.find(p=>p.id===w.id);assert.ok(Math.hypot(w.x-old.x,w.y-old.y)<1e-5,'水平に戻した壁は静止する');}
 await page.locator('#pause').click();await page.clock.runFor(32);const paused=await snapshot(page);await page.clock.runFor(500);assert.deepEqual((await snapshot(page)).actor,paused.actor);assert.deepEqual((await snapshot(page)).rackets,paused.rackets);
 await page.locator('summary').first().click();await page.locator('#copy').click();const shared=JSON.parse(await page.locator('#settings-text').inputValue());
 assert.equal(shared.revision,3);assert.equal(shared.version,'0.6.30');assert.equal(shared.layout,layout);assert.equal(shared.page,'corogalism-racket-lab');
 await page.locator('#layout').selectOption(layout==='sequence'?'timing':'sequence');await page.clock.runFor(32);assert.equal((await snapshot(page)).elapsedSec,0);assert.equal((await snapshot(page)).goalReached,false);assert.equal((await snapshot(page)).paused,true);
 await page.locator('#defaults').click();await page.clock.runFor(32);assert.equal((await snapshot(page)).layout,'relay');assert.equal((await snapshot(page)).paused,true);
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),stored,'本編の保存データを変更しない');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 rows.push({layout,width,modeGeometryMatches:true,variableRacketCount:definitions.length,definitions,realPointer:true,before,moving,neutral:positions(neutral),shared,mainStorageUnchanged:true});console.log('PASS puzzle UI '+width+'/'+layout);
}
function positions(s){return s.rackets.map(({id,x,y})=>({id,x,y}));}
async function reflectionChecks(page,layout){
 await restart(page,layout);await page.locator('#pause').click();await page.clock.runFor(32);
 const ids=await page.evaluate(()=>window.__racketLab.state.rackets.map(w=>w.id)),shots=[];
 for(const id of ids)for(const offset of [0,-.5,.5]){
  const shot=await page.evaluate(({id,offset,layout})=>{
   const lab=window.__racketLab;lab.reset();const w=lab.state.rackets.find(w=>w.id===id),r=lab.state.actor.r,vertical=w.h>=w.w;
   // timingの初期戸は固定壁の下に収納されている。開口上へ出した局所入射で面の反射を比べる。
   if(layout==='timing')w[w.axis]=lab.state.stage.labAnchors.gateStates.closed[id];
   // 端からさらに外向きに進めると隣の綿へ先に触れる。接線は中心へ向けて戸だけを比べる。
   const tangentInitial=offset>0?-.8:.8;
   if(vertical)lab.teleport(w.x-r-.35,w.y+w.h/2+offset*w.h/2,4,tangentInitial);
   else lab.teleport(w.x+w.w/2+offset*w.w/2,w.y-r-.35,tangentInitial,4);
   for(let i=0;i<30&&!lab.state.racketHits;i++)lab.advance(.01);
   const s=lab.state;return {id,offset,tangentInitial,vertical,axis:w.axis,bounce:w.bounce,debugGatePosition:w[w.axis],debugAdvance:true,actor:{x:s.actor.x,y:s.actor.y,vx:s.actor.vx,vy:s.actor.vy},hits:s.racketHits,halt:s.lastHalt};
  },{id,offset,layout});shots.push(shot);rows.push({localDebugShot:shot});
  assert.equal(shot.halt,null);assert.equal(shot.hits,1);assert.equal(shot.bounce,'reflect');
  const normal=shot.vertical?shot.actor.vx:shot.actor.vy,tangent=shot.vertical?shot.actor.vy:shot.actor.vx;
  assert.ok(normal<-1,'長い面で元の側へ返す');assert.ok(Math.abs(tangent-shot.tangentInitial)<.06,'反射壁は中心/端による架空の打ち分けを加えない');
 }
 console.log('PASS puzzle shape/axis reflection '+layout);return shots;
}
try{
 for(const [width,height]of viewports)for(const layout of ['sequence','timing']){
  const f=await fixture(layout,width,height);await inspectLayout(f.page,layout,width);
  if(width===412){await reflectionChecks(f.page,layout);if(layout==='sequence')await sequencePassChecks(f.page);else{await timingChecks(f.page);await timingSwitchProbe(f.page);}await completeCourse(f.page,layout);}
  assert.deepEqual(f.errors,[]);await f.context.close();
 }
 // 未訪問のlayout付きURLも資材保存から起動する。実行前にrootが資材数を確定する。
 if(process.env.RACKET_PUZZLE_OFFLINE!=='0'){
  const context=await browser.newContext({viewport:{width:412,height:915}});await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture fullscreen rejection'));});const page=await context.newPage();active=page;activeErrors=[];activeRequests=[];page.on('pageerror',e=>activeErrors.push(e.message));page.on('requestfailed',r=>activeRequests.push({url:r.url(),failure:r.failure()}));
  await page.goto(base+'ball-lab.html?debug=1');await page.waitForFunction(()=>!!window.__ballLab);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cache=await page.evaluate(async()=>{const names=await caches.keys(),keys=await(await caches.open(names.find(n=>n.startsWith('corogalism-')))).keys();return {names,files:keys.length};});
  if(process.env.PRECACHE_COUNT)assert.equal(cache.files,Number(process.env.PRECACHE_COUNT));await context.setOffline(true);await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  for(const layout of ['sequence','timing']){
   await page.goto(base+'racket-lab.html?debug=1&layout='+layout+'&offline-puzzle=1');await page.waitForFunction(()=>!!window.__racketLab);await page.clock.runFor(32);assert.equal((await snapshot(page)).layout,layout);
   const before=await snapshot(page),input=await inputControl(page),trace=[];await hold(page,input,{x:.45,y:.45},.35,trace,'offline');await input.release();const after=await snapshot(page);assertLive(after);assert.ok(Math.hypot(after.actor.x-before.actor.x,after.actor.y-before.actor.y)>.01);rows.push({offline:true,layout,cache,before,after});
  }
  assert.deepEqual(activeErrors,[]);await context.close();console.log('PASS puzzle new URLs offline');
 }
}catch(error){rows.push({failure:String(error),errors:activeErrors,failedRequests:activeRequests});if(active&&!active.isClosed()){rows.push({failureState:await snapshot(active).catch(()=>null)});await active.screenshot({path:output+'/failure.png',fullPage:true});}throw error;}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2)+'\n');await browser.close();}
