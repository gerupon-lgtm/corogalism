/** 表示4条件（短画面を含む）。実RAFで表示し、fixture進行と実入力完走を区別する。 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const output=fileURLToPath(new URL('.',import.meta.url));
const repo=resolve(output,'../../..');
const runtime=process.env.PLAYWRIGHT_MODULE||pathToFileURL(resolve(repo,'../.codex-browser/node_modules/playwright/index.mjs')).href;
const {chromium}=await import(runtime);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(repo,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==repo&&!file.startsWith(repo+sep)){res.writeHead(403);res.end();return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
const report={conditions:[],lessons:[],flow:{kind:'debug teleport fixture; not physical completion',stages:[]},physical:{kind:'actual pointer events; no teleport or HP mutation'},comments:{kind:'pure comment module fixture'},errors:[]};
const failures=[];let browser;
const check=(condition,message)=>{if(!condition)failures.push(message);};
const state=p=>p.evaluate(()=>window.__corogalism.state);
const settle=p=>p.evaluate(async()=>{await document.fonts.ready;for(let i=0;i<5;i++)await new Promise(requestAnimationFrame);});
const ready=async p=>{await p.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&s.prepareMs===0&&s.countdownMs===0;},{timeout:10000});await settle(p);};
async function pageFor(condition){
 const p=await browser.newPage({viewport:{width:condition.width,height:condition.height},serviceWorkers:'block'});
 p.on('pageerror',e=>report.errors.push(e.message));
 await p.addInitScript(()=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});
  Element.prototype.requestFullscreen=async()=>{throw new Error('normal-window test');};
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));
 });
 await p.goto(base+'?debug=1&seed=77');await p.waitForFunction(()=>!!window.__corogalism);await settle(p);
 if(condition.camera){await p.addStyleTag({content:`:root{--camera-top:${condition.camera}px!important}.wrap{padding-bottom:${condition.bottom}px!important}`});await p.evaluate(()=>window.dispatchEvent(new Event('resize')));await settle(p);}
 return p;
}
async function start(p,mode){
 if(mode==='tutorial'){await p.locator('#btn-tutorial').click();await p.locator('#btn-tutorial-start').click();}
 else await p.locator(mode==='practice'?'#btn-practice':'#btn-challenge').click();
 await ready(p);
}
async function measure(p){return p.evaluate(()=>{
 const rect=id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,fontSize:s.fontSize,visible:!!el.getClientRects().length,text:el.textContent};};
 const ids=['play-heading','play-toolbar','screen-game','play-mode-card','mode-card-title','mode-card-description','mode-card-icon','practice-stage','practice-comment','btn-sound','btn-pause','btn-calibrate','btn-game-exit','board','tutorial-lesson'];
 const bounded=[...document.querySelectorAll('#play-heading .play-mode-card,#play-heading .meter-block,#play-heading img,#play-toolbar button,#screen-game button,#screen-game .tutorial-lesson,#screen-game .hud')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className,left:r.left,right:r.right,width:r.width};});
 return {elements:Object.fromEntries(ids.map(id=>[id,rect(id)])),bounded,scrollY,overflow:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight,horizontalOverflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth,innerHeight,fullscreen:!!document.fullscreenElement};
});}
try{
 await mkdir(output,{recursive:true});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const conditions=[{id:'390x740',width:390,height:740},{id:'390x844-camera18-bottom24',width:390,height:844,camera:18,bottom:24},{id:'360x740',width:360,height:740},{id:'390x700',width:390,height:700}];
 if(process.env.LESSONS_ONLY!=='1'){
 for(const condition of conditions.filter(c=>process.env.FINAL_SHORT!=='1'||c.id==='390x700')){
  const row={...condition,modes:{}};
  for(const mode of ['tutorial','practice','challenge']){
   const p=await pageFor(condition);await start(p,mode);
   row.modes[mode]=await measure(p);
   await p.screenshot({path:resolve(output,`${condition.id}-${mode}.png`),fullPage:true});
   check(row.modes[mode].overflow<=1,`${condition.id}/${mode}: vertical overflow ${row.modes[mode].overflow}`);
   check(row.modes[mode].horizontalOverflow<=1,`${condition.id}/${mode}: horizontal overflow ${row.modes[mode].horizontalOverflow}`);
   check(!row.modes[mode].fullscreen,`${condition.id}/${mode}: unexpectedly fullscreen`);
   const measurement=row.modes[mode],board=measurement.elements.board;
   for(const id of ['play-heading','play-toolbar','screen-game']){
    check(Math.abs(measurement.elements[id].x-board.x)<=1,`${condition.id}/${mode}: ${id}.left must equal board.left`);
    check(Math.abs(measurement.elements[id].width-board.width)<=1,`${condition.id}/${mode}: ${id}.width must equal board.width`);
   }
   for(const element of measurement.bounded)check(element.left>=board.x-1&&element.right<=board.right+1,`${condition.id}/${mode}: ${element.id} outside board bounds (${element.left}..${element.right}; board ${board.x}..${board.right})`);
   if(mode==='practice')check(row.modes[mode].elements['practice-stage'].text==='1面目 / 5',`${condition.id}: initial practice stage text`);
   await p.close();
  }
  const t=row.modes.tutorial.elements,p=row.modes.practice.elements,c=row.modes.challenge.elements;
  for(const id of ['mode-card-title','mode-card-description']){
   check(Math.abs(t[id].y-p[id].y)<=1,`${condition.id}: ${id}.y differs`);
   for(const e of [t,p])check(Math.abs(e[id].x-e.board.x-51)<=1,`${condition.id}: ${id}.left must equal its own board.left+51`);
  }
  for(const e of [t,p])check(e['mode-card-title'].fontSize==='16px',`${condition.id}: title must be 16px`);
  check(p['mode-card-icon'].width===24&&p['mode-card-icon'].height===24,`${condition.id}: practice ball dimensions`);
  check(t['mode-card-icon'].width===32&&t['mode-card-icon'].height===24,`${condition.id}: tutorial candy dimensions`);
  for(const id of ['btn-sound','btn-pause','btn-calibrate','btn-game-exit'])for(const e of [t,p])check(Math.abs(e[id].y-c[id].y)<=1,`${condition.id}: ${id} y differs from challenge`);
  report.conditions.push(row);console.log(JSON.stringify({condition:condition.id,overflow:Object.fromEntries(Object.entries(row.modes).map(([k,v])=>[k,v.overflow])),failures:[...failures]}));
 }
 if(process.env.DISPLAY_ONLY!=='1'&&process.env.FINAL_SHORT!=='1'){
 const flow=await pageFor(conditions[0]);await start(flow,'practice');
 const first=await state(flow);
 await flow.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y);});
 await flow.waitForFunction(()=>window.__corogalism.state.screen==='clear');
 await flow.locator('#btn-retry').click();await ready(flow);
 const retry=await state(flow);check(retry.seed===first.seed&&retry.stageIndex===first.stageIndex,'fixture: retry changes stage or seed');
 report.flow.retry={seedBefore:first.seed,seedAfter:retry.seed,stageBefore:first.stageIndex,stageAfter:retry.stageIndex};
 for(let n=1;n<=5;n++){
  let s=await state(flow);check(s.stageIndex===n,`fixture: stage ${n} state index`);
  check(await flow.locator('#practice-stage').textContent()===`${n}面目 / 5`,`fixture: stage ${n} count text`);
  check(s.hp===null&&s.limitSec===null,`fixture: practice unexpectedly has HP/time limit at ${n}`);
  await flow.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y);});
  await flow.waitForFunction(()=>window.__corogalism.state.screen==='clear');
  const next=flow.locator('#btn-next');await next.waitFor();await flow.waitForFunction(()=>!document.getElementById('btn-next').disabled);
  report.flow.stages.push({stage:n,seed:s.seed,nextText:await next.textContent(),clearNote:await flow.locator('#clear-note').textContent()});
  await flow.screenshot({path:resolve(output,`fixture-clear-${n}.png`),fullPage:true});
  await next.click();
  if(n<5)await ready(flow);else{await flow.waitForFunction(()=>window.__corogalism.state.screen==='mode');report.flow.finalScreen=(await state(flow)).screen;}
 }
 report.comments=await flow.evaluate(async()=>{
  const {createPracticeComment}=await import('/src/game/practiceCourse.js');const c=createPracticeComment();
  const args={actor:{x:0,y:0},goal:{x:6,y:6},wallHits:0,started:true,elapsedMs:0};
  const start=c.update(args),earlyWall=c.update({...args,wallHits:1,elapsedMs:1000}),before4=c.update({...args,wallHits:1,elapsedMs:2999}),after4=c.update({...args,wallHits:1,elapsedMs:1});
  const earlyGoal=c.update({...args,wallHits:1,actor:{x:6,y:5},elapsedMs:1});
  return {kind:'pure module fixture; initial goal approach explicitly overrides 4-second minimum',start,earlyWall,before4,after4,earlyGoal};
 });
 check(report.comments.start===report.comments.earlyWall&&report.comments.start===report.comments.before4,'comments: wall replaces start before 4 seconds');
 check(report.comments.after4!==report.comments.start,'comments: wall never replaces after 4 seconds');
 check(report.comments.earlyGoal!==report.comments.after4,'comments: initial goal approach does not override hold');
 await flow.close();
 const p=await pageFor(conditions[0]);await start(p,'practice');
 let s=await state(p),wp=1,steps=0;const startTime=Date.now(),path=s.maze.path;
 const r=await p.locator('#board').boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();
 while(s.status==='playing'&&Date.now()-startTime<90000){
  const a=s.actor,t=path[wp],dx=t.x+.5-a.x,dy=t.y+.5-a.y,dist=Math.hypot(dx,dy);
  if(dist<.24&&wp<path.length-1){wp++;continue;}
  const target=Math.min(1.7,dist*3.2);let x=(dx/(dist||1)*target-a.vx)*.65,y=(dy/(dist||1)*target-a.vy)*.65;
  const m=Math.max(1,Math.hypot(x,y));await p.mouse.move(r.x+r.width/2+x/m*r.width*.49,r.y+r.height/2+y/m*r.height*.49);
  await p.waitForTimeout(120);s=await state(p);steps++;
 }
 await p.mouse.up();report.physical={...report.physical,seed:s.seed,stage:s.stageIndex,result:s.status,seconds:s.timeMs/1000,wallHits:s.wallHits,steps,waypoint:wp,pathLength:path.length};
 await p.screenshot({path:resolve(output,'physical-stage-1.png'),fullPage:true});await p.close();
 check(s.status==='clear','physical: stage 1 did not clear within 90 seconds');
 }
 }
 if(process.env.DISPLAY_ONLY!=='1'){
 // 狭幅の長文と6コース。到達操作はfixture、表示自体は実RAF。
 const lessonCondition=process.env.LESSON_SHORT==='1'?conditions.at(-1):conditions[2];
 const lessonPrefix=process.env.LESSON_SHORT==='1'?'lesson-short':'lesson';
 report.lessonCondition=lessonCondition;
 const lessonPage=await pageFor(lessonCondition);await start(lessonPage,'tutorial');
 report.lessonToolbarReference=await lessonPage.evaluate(()=>({soundY:document.getElementById('btn-sound').getBoundingClientRect().y,pauseY:document.getElementById('btn-pause').getBoundingClientRect().y}));
 const measureLesson=async(label,kind)=>{
  await settle(lessonPage);
  const value=await lessonPage.evaluate(()=>{
   const frame=document.getElementById('tutorial-lesson'),r=frame.getBoundingClientRect(),cs=getComputedStyle(frame);
   const rows=[...frame.querySelectorAll('canvas,h2,p,small')].filter(e=>getComputedStyle(e).display!=='none'&&e.getClientRects().length).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent,bottom:e.getBoundingClientRect().bottom}));
   const bottom=Math.max(...rows.map(e=>e.bottom));
   return {height:r.height,innerBottom:r.bottom-parseFloat(cs.paddingBottom)-parseFloat(cs.borderBottomWidth),contentBottom:bottom,overflow:Math.max(0,bottom-r.bottom+parseFloat(cs.paddingBottom)+parseFloat(cs.borderBottomWidth)),soundY:document.getElementById('btn-sound').getBoundingClientRect().y,pauseY:document.getElementById('btn-pause').getBoundingClientRect().y,rows};
  });
  report.lessons.push({label,kind,...value});check(value.overflow<=1,`lesson ${label}: content overflow ${value.overflow}px`);
  check(Math.abs(value.soundY-report.lessonToolbarReference.soundY)<=1&&Math.abs(value.pauseY-report.lessonToolbarReference.pauseY)<=1,`lesson ${label}: sound/pause y differs from initial tutorial`);
  console.log(JSON.stringify({lesson:label,condition:lessonCondition.id,height:value.height,overflow:value.overflow,spare:value.innerBottom-value.contentBottom}));
  await lessonPage.screenshot({path:resolve(output,`${lessonPrefix}-${label}.png`),fullPage:true});
 };
 // 実素材定義の本文を既存説明DOMへ反映。説明選択の挙動確認ではなく長文の表示fixture。
 await lessonPage.locator('#btn-pause').click();
 for(const id of ['cotton','sticky']){
  await lessonPage.evaluate(async id=>{
   const guide=await import('/src/ui/guide.js'),entry=[...guide.walls,...guide.floors].find(v=>v[0]===id);
   const panel=document.getElementById('tutorial-lesson');panel.querySelector('.tutorial-idle').hidden=true;panel.querySelector('.tutorial-message').hidden=false;
   panel.querySelector('h2').textContent=entry[1]+(guide.walls.some(e=>e[0]===id)?'の壁':'');panel.querySelector('.tutorial-copy').textContent=entry[2];
   panel.querySelector('.tutorial-context').textContent=id==='cotton'?'壁に沿う動きは残ります。':'';
   guide.drawGuideArt(panel.querySelector('canvas'),id);
   // mainの自動更新が静的fixtureを上書きしないよう、この測定だけ実プレイをポーズする。
  },id);
  await measureLesson(id,'static text fixture from actual guide definitions');
  const last=report.lessons.at(-1);
  check(last.rows.some(r=>r.tag==='H2'&&r.text===(id==='cotton'?'綿の壁':'とりもち'))&&last.rows.some(r=>r.cls==='tutorial-copy'&&r.text.length>0),`lesson ${id}: heading/body fixture did not render`);
 }
 if(process.env.MATERIALS_ONLY!=='1'){
 // 通常紹介をfixtureクリアし、既存next操作で動く壁の紹介へ。
 await lessonPage.locator('#btn-resume').click();await ready(lessonPage);
 await lessonPage.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y);});
 await lessonPage.waitForFunction(()=>window.__corogalism.state.screen==='clear');
 await lessonPage.waitForFunction(()=>!document.getElementById('btn-next').disabled);await lessonPage.locator('#btn-next').click();await ready(lessonPage);
 for(let i=0;i<6;i++){
  await lessonPage.waitForTimeout(400);await measureLesson(`puzzle-${i+1}`,'real course initial hint; progression uses teleport fixture');
  await lessonPage.locator('#btn-pause').click();
  await lessonPage.locator('.tutorial-hint').evaluate(e=>{e.hidden=false;e.textContent='少し右下に傾けて、ラケットのそばで調整しよう。';});
  await measureLesson(`puzzle-${i+1}-long-hint`,'static worst-length real hint wording; not an observed hint transition');
  await lessonPage.locator('#btn-resume').click();await ready(lessonPage);
  if(i<5){await lessonPage.evaluate(()=>{const s=window.__corogalism.state;window.__corogalism.teleport(s.goal.x,s.goal.y);});await lessonPage.waitForFunction(()=>window.__corogalism.state.screen==='clear');await lessonPage.waitForFunction(()=>!document.getElementById('btn-next').disabled);await lessonPage.locator('#btn-next').click();await ready(lessonPage);}
 }
 }
 await lessonPage.close();
 }
 check(report.errors.length===0,'browser page errors');
}catch(error){report.exception=error.stack;failures.push(error.message);}
finally{
 report.failures=failures;await writeFile(resolve(output,process.env.FINAL_SHORT==='1'?'final-short-results.json':process.env.LESSON_SHORT==='1'?'lesson-short-results.json':process.env.DISPLAY_ONLY==='1'?'width-results.json':process.env.MATERIALS_ONLY==='1'?'material-results.json':process.env.LESSONS_ONLY==='1'?'lesson-results.json':'browser-results.json'),JSON.stringify(report,null,2));
 await browser?.close();await new Promise(done=>server.close(done));
}
console.log(JSON.stringify({failures,flow:report.flow,physical:report.physical,comments:report.comments,errors:report.errors},null,2));
if(failures.length)process.exitCode=1;
