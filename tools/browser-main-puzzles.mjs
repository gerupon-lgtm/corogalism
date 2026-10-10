/** 本編の動く壁を実pointerで検証する。面送りの診断配置と全コース操作は別に記録する。 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const playwright=process.env.PLAYWRIGHT_MODULE;
const {chromium}=await import(/^[A-Za-z]:[\\/]/.test(playwright)?pathToFileURL(playwright).href:playwright);
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8774/';
const output=process.env.MAIN_PUZZLE_OUTPUT||'docs/verification/main-puzzles/local';
const phase=process.env.MAIN_PUZZLE_PHASE||'all';
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const viewports=(process.env.MAIN_PUZZLE_VIEWPORTS||'312x720,412x915,576x1024').split(',').map(v=>v.split('x').map(Number));
const rows=[];let active=null,observed={};await mkdir(output,{recursive:true});
const clamp=(n,limit)=>Math.max(-limit,Math.min(limit,n));
function record(name,result){rows.push({name,...result});console.log('PASS '+name+' '+JSON.stringify(result.summary??{width:result.width,level:result.level,stage:result.stage,index:result.index,kind:result.kind,puzzle:result.puzzle}));}
async function fixture(width=412,height=915,{level='easy',sensor='absent',clock=true,workers='block'}={}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===412?2.625:1,serviceWorkers:workers});
 await context.addInitScript(({level,sensor})=>{
  if(sensor==='absent')Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});
  else Object.defineProperty(window,'DeviceOrientationEvent',{value:class DeviceOrientationEvent{static async requestPermission(){return 'denied';}},configurable:true});
  Element.prototype.requestFullscreen=()=>Promise.reject(Error('verification fullscreen rejected'));
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:sensor==='denied'?'tilt':'pointer',challengeLevel:level,soundEnabled:true}));
 },{level,sensor});
 const page=await context.newPage();active=page;const errors=[],failedRequests=[],consoleErrors=[],httpErrors=[];
 observed={errors,failedRequests,consoleErrors,httpErrors};
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()});});page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
 if(clock){await page.clock.install();await page.clock.pauseAt(Date.now()+1000);}
 await page.goto(base+'?debug=1&seed='+(process.env.MAIN_PUZZLE_SEED||'77'));await page.waitForFunction(()=>!!window.__corogalism);await page.evaluate(()=>document.fonts.ready);if(clock)await page.clock.runFor(32);
 assert.equal(await page.locator('.badge').textContent(),'v'+version);
 return {context,page,width,height,clock,errors,failedRequests,consoleErrors,httpErrors};
}
const rawState=page=>page.evaluate(()=>window.__corogalism.state);
async function snapshot(page){return page.evaluate(()=>{
 const s=window.__corogalism.state,a=s.actor,rackets=s.rackets??[],walls=s.walls??[],embedded=[];
 for(const w of [...walls,...rackets]){
  const x=Math.max(w.x,Math.min(a.x,w.x+w.w)),y=Math.max(w.y,Math.min(a.y,w.y+w.h));
  if(Math.hypot(a.x-x,a.y-y)<a.r-1e-6)embedded.push({id:w.id??'static',x:w.x,y:w.y,w:w.w,h:w.h});
 }
 return {actor:a,rackets:rackets.map(w=>({id:w.id,x:w.x,y:w.y,w:w.w,h:w.h,axis:w.axis,min:w.min,max:w.max,home:w.home,bounce:w.bounce,blocked:w.blocked,vx:w.vx,vy:w.vy})),embedded,status:s.status,screen:s.screen,gameMode:s.gameMode,stageIndex:s.stageIndex,puzzleCourse:s.puzzleCourse,puzzle:s.puzzle,paused:s.paused,prepareMs:s.prepareMs,countdownMs:s.countdownMs,timeMs:s.timeMs,wallHits:s.wallHits,racketHits:s.racketHits??null,hp:s.hp,remainingSec:s.remainingSec,limitSec:s.limitSec,extendedSec:s.extendedSec,lastHalt:s.lastResult?.halt??s.lastHalt??null,sampledLastRacketHits:s.lastResult?.racketHits??0,lastResult:s.lastResult};
 });}
function assertLive(s){assert.equal(s.lastHalt,null,'普通の操作で計算を中断しない');assert.ok([s.actor.x,s.actor.y,s.actor.vx,s.actor.vy,...s.rackets.flatMap(w=>[w.x,w.y,w.vx??0,w.vy??0])].every(Number.isFinite),'球と壁の数値が有限');assert.deepEqual(s.embedded,[],'球が壁に埋まらない');for(const w of s.rackets){assert.ok(w[w.axis]>=w.min-1e-8&&w[w.axis]<=w.max+1e-8,'壁がレール内にある');assert.ok(w.home>=w.min-1e-8&&w.home<=w.max+1e-8,'壁の初期位置がレール内にある');}}
async function click(page,id,{diagnostic=false}={}){
 const button=page.locator('#'+id);if(await button.isDisabled()){if(diagnostic)await page.clock.fastForward(1400);else await page.clock.runFor(1400);}
 await button.click();await page.clock.runFor(32);
}
async function ready(page,diagnostic=false){
 for(let i=0;i<80;i++){const s=await rawState(page);if(s.screen==='game'&&!s.prepareMs&&!s.countdownMs)return;
  if(diagnostic)await page.clock.fastForward(250);else await page.clock.runFor(Math.min(250,(s.prepareMs+s.countdownMs||250)+32));
 }assert.fail('開始待機を完了する');
}
async function inputControl(page){
 await page.locator('#board').scrollIntoViewIfNeeded();const box=await page.locator('#board').boundingBox();assert.ok(box.width>200);let down=false;
 return {async move(x,y){const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}if(!down){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();down=true;}await page.mouse.move(box.x+box.width*(.5+x/2),box.y+box.height*(.5+y/2));},async release(){if(down){await page.mouse.up();down=false;}}};
}
function traceState(s){return {actor:s.actor,rackets:s.rackets,status:s.status,timeMs:s.timeMs,hp:s.hp,wallHits:s.wallHits,racketHits:s.racketHits,lastHalt:s.lastHalt};}
async function hold(page,input,operation,trace){
 await input.move(operation.tilt.x,operation.tilt.y);let ticks=Math.ceil(operation.seconds*1000/16);
 for(let i=0;i<ticks;i++){await page.clock.runFor(Math.min(16,operation.seconds*1000-i*16));const s=await snapshot(page);assertLive(s);if(i%30===0||i===ticks-1||s.status!=='playing')trace.push({purpose:operation.purpose,kind:'hold',tick:i,...traceState(s)});if(s.status!=='playing')break;}
}
async function until(page,input,operation,trace){
 await input.move(operation.tilt.x,operation.tilt.y);assert.ok(['x','y'].includes(operation.condition.axis));let reached=false;
 for(let i=0;i<Math.ceil(operation.maxSeconds*1000/16);i++){await page.clock.runFor(16);const s=await snapshot(page);assertLive(s);const p=s.actor[operation.condition.axis];reached=(operation.condition.min===undefined||p>=operation.condition.min)&&(operation.condition.max===undefined||p<=operation.condition.max);if(i%30===0||reached||s.status!=='playing')trace.push({purpose:operation.purpose,kind:'until',tick:i,reached,...traceState(s)});if(reached||s.status!=='playing')break;}
 assert.equal(reached,true,'画面の位置を見て入力を切り替える条件へ届く');
}
async function route(page,input,operation,trace){
 for(const target of operation.via){let reached=false;
  for(let i=0;i<1100;i++){const s=await snapshot(page);assertLive(s);if(s.status==='clear')return;assert.equal(s.status,'playing','経路途中で時間・げんき切れにならない');const dx=target.x-s.actor.x,dy=target.y-s.actor.y;
   if(Math.hypot(dx,dy)<.045&&Math.hypot(s.actor.vx,s.actor.vy)<.1){trace.push({purpose:operation.purpose,kind:'route',target,reached:true,...traceState(s)});reached=true;break;}
   const x=clamp((clamp(dx*2,1.3)-s.actor.vx)*.45,.7),y=clamp((clamp(dy*2,1.3)-s.actor.vy)*.45,.7);await input.move(x,y);await page.clock.runFor(16);if(i%60===0)trace.push({purpose:operation.purpose,kind:'route',target,tick:i,...traceState(s)});
  }if(!reached){const s=await snapshot(page);trace.push({target,reached:false,...traceState(s)});throw Error('実pointer制御で通過点に到達しない '+JSON.stringify({target,actor:s.actor,rackets:s.rackets}));}
 }
}
async function fullCourse(page,{label,diagnosticStageAdvance=false}={}){
 const before=await snapshot(page),operations=before.puzzle?.verificationOperations;
 assert.ok(Array.isArray(operations)&&operations.length,'全コースの操作が提供される');assert.equal(before.status,'playing');
 const input=await inputControl(page),trace=[],result={label,kind:before.puzzle.kind,teleport:false,debugAdvance:false,diagnosticStageAdvance,actualPointer:true,automatedController:true,realDevice:false,controller:{tickMs:16,positionErrorGain:2,maxDesiredSpeed:1.3,velocityFeedback:.45,maxInputComponent:.7,tolerance:.045,maxArrivalSpeed:.1},before,operations,trace};rows.push({name:'full-course',...result});
 try{for(const operation of operations){
  if(operation.kind==='hold')await hold(page,input,operation,trace);else if(operation.kind==='route')await route(page,input,operation,trace);else if(operation.kind==='until')await until(page,input,operation,trace);else throw Error('未知の操作 '+operation.kind);
  const s=await snapshot(page);if(s.status==='clear')break;assert.equal(s.status,'playing');
 }}finally{await input.release();result.final=await snapshot(page);rows[rows.length-1].final=result.final;}
 assert.equal(result.final.status,'clear','開始から位置を置換せず実pointerでゴールへ届く');
 const budget=before.limitSec===null?null:before.limitSec+result.final.extendedSec,seconds=result.final.timeMs/1000;
 rows[rows.length-1].summary={label,kind:result.kind,seconds,budget,spareSeconds:budget===null?null:budget-seconds,hp:result.final.hp,hits:result.final.wallHits,racketHits:result.final.racketHits};
 console.log('PASS full-course '+JSON.stringify(rows.at(-1).summary));return result;
}
async function diagnosticsClean(f){for(const key of ['errors','failedRequests','consoleErrors','httpErrors'])assert.deepEqual(f[key],[],key+' が空');record('browser-errors',{width:f.width,...observed});}
async function tutorialStart(page){await click(page,'btn-puzzle-tutorial');await ready(page);const s=await rawState(page);assert.equal(s.gameMode,'tutorial');assert.equal(s.puzzleCourse.index,0);}
async function uiChecks(){
 for(const [width,height]of viewports){const f=await fixture(width,height),{page}=f;
  await click(page,'btn-guide');const newArts=await page.locator('[data-guide-art]').evaluateAll(nodes=>nodes.map(n=>n.dataset.guideArt));for(const art of ['cotton','racket','gate'])assert.ok(newArts.includes(art),'ガイドに '+art+' を載せる');assert.ok(await page.locator('#play-guide').textContent());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);record('guide',{width,newArts,geometry:await page.locator('#play-guide').evaluate(d=>({height:d.clientHeight,scrollHeight:d.scrollHeight}))});await page.screenshot({path:output+'/guide-top-'+width+'.png',fullPage:true});await page.locator('#play-guide').evaluate(d=>d.scrollTop=d.scrollHeight);await page.screenshot({path:output+'/guide-bottom-'+width+'.png',fullPage:true});await page.locator('.guide-x').click();await page.clock.runFor(32);
  await tutorialStart(page);const kinds=[];
  for(let i=0;i<6;i++){const s=await snapshot(page);assertLive(s);assert.equal(s.limitSec,null,'紹介は時間制限なし');assert.ok(s.puzzle);assert.equal(s.puzzleCourse.index,i);kinds.push(s.puzzle.kind);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const lesson=await page.locator('#tutorial-lesson').evaluate(p=>{const copy=p.querySelector('.tutorial-copy'),text=p.querySelector('.tutorial-text'),title=p.querySelector('h2'),card=p.getBoundingClientRect(),body=copy.getBoundingClientRect(),heading=title.getBoundingClientRect(),context=p.querySelector('.tutorial-context').getBoundingClientRect(),footer=p.querySelector('.tutorial-play-state').getBoundingClientRect();return {title:title.textContent,body:copy.textContent,cardHeight:card.height,textHeight:text.clientHeight,textScrollHeight:text.scrollHeight,titleTop:heading.top,titleBottom:heading.bottom,copyTop:body.top,copyBottom:body.bottom,contextTop:context.top,contextBottom:context.bottom,footerTop:footer.top,footerBottom:footer.bottom,cardTop:card.top,cardBottom:card.bottom};});assert.ok(lesson.title&&lesson.body);assert.ok(lesson.titleTop>=lesson.cardTop&&Math.max(lesson.titleBottom,lesson.copyBottom,lesson.contextBottom,lesson.footerBottom)<=lesson.cardBottom+1,'題名・本文・補助・操作案内が紹介カード内に収まる');assert.ok(lesson.titleBottom<=lesson.copyTop+1&&lesson.copyBottom<=lesson.contextTop+1&&lesson.contextBottom<=lesson.footerTop+1,'紹介の各行が重ならない');record('tutorial-lesson',{width,index:i,kind:s.puzzle.kind,lesson});
   const input=await inputControl(page),initial=await snapshot(page);await input.move(.25,.2);await page.clock.runFor(160);await input.release();const moved=await snapshot(page);assert.ok(Math.hypot(moved.actor.x-initial.actor.x,moved.actor.y-initial.actor.y)>.001||moved.rackets.some((w,j)=>Math.hypot(w.x-initial.rackets[j].x,w.y-initial.rackets[j].y)>.001));
   await page.clock.runFor(1200);const settled=await snapshot(page);await page.clock.runFor(600);const neutral=await snapshot(page);for(const w of neutral.rackets){const before=settled.rackets.find(r=>r.id===w.id);assert.ok(Math.hypot(w.x-before.x,w.y-before.y)<1e-5,'水平へ戻した壁はその場で止まる');}
   await click(page,'btn-pause');const paused=await snapshot(page);await page.clock.runFor(500);assert.deepEqual((await snapshot(page)).actor,paused.actor);assert.deepEqual((await snapshot(page)).rackets,paused.rackets);await click(page,'btn-pause-guide');await page.locator('.guide-x').click();await page.clock.runFor(32);assert.equal((await rawState(page)).paused,true);await click(page,'btn-resume');await ready(page);
   await page.evaluate(()=>{const c=window.__corogalism,s=c.state;c.teleport(s.goal.x,s.goal.y);});await page.clock.runFor(32);assert.equal((await rawState(page)).status,'clear');if(i<5){await click(page,'btn-next',{diagnostic:true});await ready(page,true);}
  }assert.equal(new Set(kinds).size,6);record('tutorial-ui',{width,kinds,diagnosticGoalPlacement:true,actualPointerMovement:true,pauseResume:true});await diagnosticsClean(f);await f.context.close();
 }
 const f=await fixture(412,915,{sensor:'denied'});await tutorialStart(f.page);assert.equal((await rawState(f.page)).mode,'pointer');const input=await inputControl(f.page),before=await snapshot(f.page);await input.move(.35,.15);await f.page.clock.runFor(250);await input.release();assert.ok(Math.hypot((await snapshot(f.page)).actor.x-before.actor.x,(await snapshot(f.page)).actor.y-before.actor.y)>.001);record('sensor-denied',{fallback:'pointer',actualPointer:true});await diagnosticsClean(f);await f.context.close();
 const f2=await fixture();await click(f2.page,'btn-tutorial');await click(f2.page,'btn-tutorial-start');await ready(f2.page);assert.equal((await rawState(f2.page)).gameMode,'tutorial');assert.equal((await rawState(f2.page)).puzzleCourse,null);assert.equal(await f2.page.locator('#tutorial-lesson').evaluate(p=>p.classList.contains('is-puzzle-course')),false,'旧紹介に新コース用の配置を適用しない');await f2.page.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y);});await f2.page.clock.runFor(32);assert.equal((await rawState(f2.page)).status,'clear');assert.equal(await f2.page.locator('#btn-next').isVisible(),true);await click(f2.page,'btn-next');await ready(f2.page);assert.equal((await rawState(f2.page)).puzzleCourse.index,0);assert.equal(await f2.page.locator('#tutorial-lesson').evaluate(p=>p.classList.contains('is-puzzle-course')),true);record('existing-tutorial-continuation',{diagnosticExistingGoalPlacement:true,continuation:'puzzle-tutorial',oldCardStyleUnchanged:true});await diagnosticsClean(f2);await f2.context.close();
}
async function tutorialCourses(){const f=await fixture(),{page}=f;await tutorialStart(page);const start=Number(process.env.MAIN_PUZZLE_TUTORIAL_START||0),count=Number(process.env.MAIN_PUZZLE_TUTORIAL_COUNT||6);assert.ok(Number.isInteger(start)&&start>=0&&Number.isInteger(count)&&count>=1&&start+count<=6);
 for(let i=0;i<start;i++){await page.evaluate(()=>{const c=window.__corogalism,s=c.state;c.teleport(s.goal.x,s.goal.y);});await page.clock.runFor(32);await click(page,'btn-next',{diagnostic:true});await ready(page,true);}
 for(let i=start;i<start+count;i++){await fullCourse(page,{label:'tutorial-'+(i+1),diagnosticStageAdvance:start>0});if(i<start+count-1){await click(page,'btn-next');await ready(page);}}
 await diagnosticsClean(f);await f.context.close();
}
async function challengeCourses(){
 const stop=Number(process.env.MAIN_PUZZLE_STOP_STAGE||40),picked=new Set((process.env.MAIN_PUZZLE_STAGES||'17,19,21,23').split(',').map(Number)),requireGenerated=process.env.MAIN_PUZZLE_GENERATED_COMBO!=='0';
 for(const level of (process.env.MAIN_PUZZLE_LEVELS||'easy,normal').split(',')){const f=await fixture(412,915,{level}),{page}=f;await click(page,'btn-challenge');await ready(page);let generatedCombinationPlayed=false;
  for(let n=1;n<=stop;n++){const s=await rawState(page);assert.equal(s.stageIndex,n);const combination=Boolean(s.puzzle)&&!['racket','sequence','timing'].includes(s.puzzle.kind);const play=picked.has(n)||n>23&&combination&&!generatedCombinationPlayed;
   if(play){assert.ok(s.puzzle,'対象面が動く壁の面');if(n>23)generatedCombinationPlayed=true;
    if(level==='easy'&&n===17){const original=JSON.stringify({cells:s.maze.cells,walls:s.walls,zones:s.zones,kind:s.puzzle.kind});const input=await inputControl(page);await input.move(.2,.2);await page.clock.runFor(200);await input.release();await page.clock.fastForward((await rawState(page)).remainingSec*1000+100);await page.clock.runFor(32);assert.equal((await rawState(page)).status,'timeout');await click(page,'btn-continue');await ready(page);const restored=await rawState(page);assert.equal(JSON.stringify({cells:restored.maze.cells,walls:restored.walls,zones:restored.zones,kind:restored.puzzle.kind}),original,'コンティニューで同じパズルが復元する');assert.equal(restored.run.usedContinue,true);record('puzzle-continue',{level,stage:n,sameStaticGeometry:true,resetDynamicPositions:restored.rackets.map(w=>({id:w.id,coordinate:w[w.axis],home:w.home})),timeoutDiagnosticClock:true});}
    await fullCourse(page,{label:level+'-'+n,diagnosticStageAdvance:n>1});}
   else{await page.evaluate(()=>{const c=window.__corogalism,s=c.state;c.teleport(s.goal.x,s.goal.y);});await page.clock.runFor(32);assert.equal((await rawState(page)).status,'clear');}
   record('challenge-family',{level,stage:n,puzzle:s.puzzle?.kind??null,profile:s.maze.variation,diagnosticStageAdvance:!play});
   if(n<stop){await click(page,'btn-next',{diagnostic:true});await ready(page,true);}
  }
  if(requireGenerated)assert.equal(generatedCombinationPlayed,true,'紹介後にも生成された組み合わせが出る');await diagnosticsClean(f);await f.context.close();
 }
}
async function nativeScreens(){
 for(const [width,height]of viewports){const f=await fixture(width,height,{clock:false}),{page}=f;await page.locator('#btn-guide').click();await page.screenshot({path:output+'/native-guide-top-'+width+'.png',fullPage:true});await page.locator('#play-guide').evaluate(d=>d.scrollTop=d.scrollHeight);await page.screenshot({path:output+'/native-guide-bottom-'+width+'.png',fullPage:true});await page.locator('.guide-x').click();await page.locator('#btn-puzzle-tutorial').click();await page.waitForFunction(()=>window.__corogalism.state.prepareMs===0&&window.__corogalism.state.countdownMs===0);
  await page.waitForFunction(()=>{const a=window.__corogalism.state.audio;return a.enabled&&a.context==='running'&&a.loaded&&a.music;});
  const input=await inputControl(page),before=await snapshot(page);await input.move(.25,.15);await page.waitForTimeout(300);await input.release();const audioPlaying=(await rawState(page)).audio;assert.equal(audioPlaying.context,'running');assert.equal(audioPlaying.music,true);await page.locator('#btn-pause').click();await page.waitForTimeout(100);const after=await snapshot(page);assertLive(after);assert.ok(Math.hypot(after.actor.x-before.actor.x,after.actor.y-before.actor.y)>.001);
  const canvas=await page.locator('#canvas').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let transparent=0;for(let i=3;i<p.length;i+=4)if(p[i]!==255)transparent++;return {width:c.width,height:c.height,transparent};});assert.equal(canvas.transparent,0,'通常時計の盤面に透明領域なし');await page.screenshot({path:output+'/native-tutorial-'+width+'.png',fullPage:true});record('native-screen',{width,realClock:true,actualPointer:true,before,after,canvas,audioPlaying});
  if(width===412){
   await page.locator('#btn-resume').click();await page.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&!s.prepareMs&&!s.countdownMs&&s.audio.music;});const audioBefore=(await rawState(page)).audio;
   const cotton=await page.evaluate(()=>{const s=window.__corogalism.state;return s.walls.filter(w=>w.materialId==='cotton').map(w=>({w,distance:Math.hypot(w.x+w.w/2-s.actor.x,w.y+w.h/2-s.actor.y)})).sort((a,b)=>a.distance-b.distance)[0].w;});
   const contactInput=await inputControl(page);let contact=false;
   for(let tick=0;tick<20;tick++){const s=await rawState(page),dx=cotton.x+cotton.w/2-s.actor.x,dy=cotton.y+cotton.h/2-s.actor.y,length=Math.hypot(dx,dy);await contactInput.move(dx/length*.65,dy/length*.65);await page.waitForTimeout(100);assertLive(await snapshot(page));if((await rawState(page)).audio.events.includes('cotton')){contact=true;break;}}
   await contactInput.release();const audioAfter=(await rawState(page)).audio;assert.equal(contact,true,'実pointer接触で綿の音源を生成して再生する');assert.equal(audioAfter.context,'running');record('native-cotton-audio',{actualPointer:true,teleport:false,cotton,audioBefore,audioAfter,naturalSoundOnDeviceUnverified:true});await page.locator('#btn-pause').click();await page.waitForTimeout(100);
   for(let index=1;index<6;index++){
   await page.locator('#btn-resume').click();await page.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&!s.prepareMs&&!s.countdownMs;});await page.evaluate(()=>{const c=window.__corogalism,s=c.state;c.teleport(s.goal.x,s.goal.y);});await page.waitForFunction(()=>window.__corogalism.state.status==='clear');await page.locator('#btn-next').click();await page.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&!s.prepareMs&&!s.countdownMs;});const next=await snapshot(page);assert.equal(next.puzzleCourse.index,index);assertLive(next);await page.locator('#btn-pause').click();await page.waitForTimeout(100);const png=output+'/native-'+next.puzzle.kind+'-'+width+'.png';await page.screenshot({path:png,fullPage:true});record('native-puzzle-comparison',{width,index,kind:next.puzzle.kind,realClock:true,diagnosticEarlierGoalPlacement:true,screenshot:png,state:next});
  }}await diagnosticsClean(f);await f.context.close();
 }
}
async function offlineChecks(){
 const f=await fixture(412,915,{workers:'allow',clock:false}),{page,context}=f;await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const cache=await page.evaluate(async()=>{const names=(await caches.keys()).filter(n=>n.startsWith('corogalism-'));const keys=await(await caches.open(names[0])).keys();return {names,files:keys.length,keys:keys.map(k=>new URL(k.url).pathname)};});
 if(process.env.PRECACHE_COUNT)assert.equal(cache.files,Number(process.env.PRECACHE_COUNT));
 for(const source of ['src/world/puzzleStage.js','src/game/puzzleTutorial.js','src/physics/movingWalls.js','src/render/movingWalls.js'])assert.ok(cache.keys.some(p=>p.endsWith('/'+source)),'新実行資材 '+source+' を保存');
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!window.__corogalism);await page.clock.install();await page.clock.pauseAt(Date.now()+1000);await page.clock.runFor(32);assert.equal(await page.locator('.badge').textContent(),'v'+version);assert.equal(await page.evaluate(()=>navigator.onLine),false);
 const versioned=await page.evaluate(()=>[...document.querySelectorAll('link[rel=stylesheet],script[type=module]')].map(e=>e.href||e.src));assert.ok(versioned.every(url=>new URL(url).searchParams.has('v')),'バージョン付き資材URLのままオフライン起動');
 await click(page,'btn-guide');assert.ok((await page.locator('#play-guide').textContent()).includes('綿'));assert.ok(await page.locator('[data-guide-art=racket]').count());await page.locator('.guide-x').click();await page.clock.runFor(32);await tutorialStart(page);
 let input=await inputControl(page),before=await snapshot(page);await input.move(.25,.1);await page.clock.runFor(250);await input.release();const after=await snapshot(page);assertLive(after);assert.ok(Math.hypot(after.actor.x-before.actor.x,after.actor.y-before.actor.y)>.001);await click(page,'btn-game-exit');assert.equal((await rawState(page)).screen,'mode');
 await click(page,'btn-practice');await ready(page);const practice=await rawState(page);assert.equal(practice.gameMode,'practice');assert.equal(practice.puzzle==null,true);assert.equal(practice.limitSec,null);input=await inputControl(page);await input.move(.2,.15);await page.clock.runFor(250);await input.release();assert.ok(Math.hypot((await snapshot(page)).actor.x-practice.actor.x,(await snapshot(page)).actor.y-practice.actor.y)>.001);await click(page,'btn-game-exit');
 record('offline-main',{offline:true,cache,versioned,newTutorialPointer:true,guide:true,oldPractice:true,before,after});
 for(const lab of [{path:'ball-lab.html?debug=1&preset=cotton',debug:'__ballLab'},{path:'floor-lab.html?debug=1',debug:'__floorLab'},{path:'racket-lab.html?debug=1&layout=sequence',debug:'__racketLab'}]){
  await page.goto(base+lab.path);await page.waitForFunction(name=>!!window[name],lab.debug);await page.clock.runFor(32);const actor=()=>page.evaluate(name=>{const s=window[name];const a=s.state?.actor??s.actor;return {x:a.x,y:a.y,vx:a.vx,vy:a.vy};},lab.debug);const initial=await actor();await page.locator('#board').scrollIntoViewIfNeeded();const box=await page.locator('#board').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55);await page.clock.runFor(300);await page.mouse.up();const moved=await actor();assert.ok(Math.hypot(moved.x-initial.x,moved.y-initial.y)>.001,'未訪問のラボもオフラインでpointer操作できる');record('offline-lab',{path:lab.path,offline:true,actualPointer:true,initial,moved});
 }
 await diagnosticsClean(f);await f.context.close();
}
async function nativeLast312(){
 const f=await fixture(312,720,{clock:false}),{page}=f;await page.locator('#btn-puzzle-tutorial').click();
 const nativeReady=()=>page.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&!s.prepareMs&&!s.countdownMs;});await nativeReady();
 for(let index=0;index<5;index++){await page.evaluate(()=>{const c=window.__corogalism,s=c.state;c.teleport(s.goal.x,s.goal.y);});await page.waitForFunction(()=>window.__corogalism.state.status==='clear');await page.locator('#btn-next').click();await nativeReady();}
 const state=await snapshot(page);assert.equal(state.puzzleCourse.index,5);assertLive(state);const screenshot=output+'/native-racketTiming-312.png';await page.screenshot({path:screenshot,fullPage:true});record('native-last312',{width:312,index:5,realClock:true,diagnosticEarlierGoalPlacement:true,state,screenshot});await diagnosticsClean(f);await f.context.close();
}
async function mainTitle(){
 const f=await fixture(),{page}=f;await click(page,'btn-challenge');await ready(page,true);
 for(let index=1;index<17;index++){await page.evaluate(()=>{const c=window.__corogalism,s=c.state;c.teleport(s.goal.x,s.goal.y);});await page.clock.runFor(32);assert.equal((await rawState(page)).status,'clear');await click(page,'btn-next',{diagnostic:true});await ready(page,true);}
 assert.equal((await rawState(page)).stageIndex,17);await page.clock.resume();await page.waitForTimeout(150);const state=await snapshot(page);assertLive(state);assert.equal(state.status,'playing');
 const title=await page.locator('#stage-theme').evaluate(e=>({text:e.textContent,width:e.clientWidth,scrollWidth:e.scrollWidth}));assert.equal(title.text,'7×7 ラケットで打ち返す');assert.ok(title.scrollWidth<=title.width,'17面の題名が表示枠内に収まる');const screenshot=output+'/main17-title-412.png';await page.screenshot({path:screenshot,fullPage:true});record('main17-title',{width:412,realClock:true,diagnosticEarlierGoalPlacement:true,title,state,screenshot});await diagnosticsClean(f);await f.context.close();
}
try{if(['all','ui'].includes(phase))await uiChecks();if(['all','tutorial'].includes(phase))await tutorialCourses();if(['all','challenge'].includes(phase))await challengeCourses();if(['all','native'].includes(phase))await nativeScreens();if(['all','native','last312'].includes(phase))await nativeLast312();if(['all','main-title'].includes(phase))await mainTitle();if(['all','offline'].includes(phase))await offlineChecks();}
catch(error){rows.push({name:'failure',error:String(error),observed,activeState:active&&!active.isClosed()?await snapshot(active).catch(()=>null):null});if(active&&!active.isClosed())await active.screenshot({path:output+'/failure.png',fullPage:true});throw error;}
finally{await writeFile(output+'/results.json',JSON.stringify({base,phase,version,rows},null,2)+'\n');await browser.close();}
