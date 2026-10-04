/** 配置・床効果・継続状態の画面確認。面の移動にはデバッグ位置移動を使う。
 * 難易度の確認は browser-floor-playthrough.mjs の実pointer通しプレイで別に行う。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8767/';
const output=process.env.BRANCH_BROWSER_OUTPUT||'docs/verification/branch-floors/browser';
await mkdir(output,{recursive:true});const rows=[];
try{for(const [width,height]of [[320,568],[390,844],[576,1024]])for(const level of ['normal','easy']){
 const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(level=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:level,soundEnabled:true}));},level);
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(base+'?debug=1&seed=1');await page.waitForFunction(()=>!!window.__corogalism);
 assert.equal(await page.locator('.badge').textContent(),'v0.6.14');
 const state=()=>page.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await page.locator('#'+id).click();await page.clock.runFor(100);};
 const ready=async()=>{for(let i=0;i<24;i++){const s=await state();if(!s.prepareMs&&!s.countdownMs)return;await page.clock.fastForward(250);}assert.fail('開始カウントが完了しない');};
 await click('btn-challenge');await ready();
 for(let n=1;n<=16;n++){
  let s=await state();assert.equal(s.stageIndex,n);assert.equal(s.status,'playing');
  const route=t=>s.maze.path.some(c=>c.x===Math.floor(t.x)&&c.y===Math.floor(t.y));
  const sand=s.zones.find(z=>z.kind==='sand'),fields=s.zones.filter(z=>z.kind==='radial');
  const branchSand=sand?.cells.filter(c=>!route({x:c.x+.5,y:c.y+.5})).length||0;
  if(sand)assert.ok(branchSand>0);
  for(const item of [s.recovery,s.leaf,s.hourglass].filter(Boolean))assert.ok(route(item));
  if(fields.length)assert.ok(fields.some(f=>f.branch));
  if([3,5,7,11].includes(n))await page.screenshot({path:`${output}/${level}-${width}-${n}.png`});
  if(n===2){await click('btn-pause');await click('btn-pause-guide');await page.locator('.guide-x').click();assert.equal((await state()).paused,true);await click('btn-resume');await ready();}
  let restCheck=null;
  if(n===11){
   const tile=s.sticky.find(t=>!route(t));assert.ok(tile);
   await page.evaluate(tile=>window.__corogalism.teleport(tile.x,tile.y),tile);await page.clock.runFor(100);assert.ok((await state()).trap);
   const rect=await page.locator('#board').boundingBox();
   for(let tap=0;tap<10;tap++){await page.mouse.click(rect.x+rect.width*.45,rect.y+rect.height*.5);await page.clock.runFor(100);}
   await page.clock.runFor(600);assert.equal((await state()).trap,null);
   // 位置だけ戻して通常入力で壁へ当て、げんきを減らす。HPは書き換えない。
   const candidates=[];
   for(let i=0;i<s.maze.cells.length;i++)for(const [dx,dy,side]of [[1,0,'r'],[-1,0,'l'],[0,1,'b'],[0,-1,'t']]){
    const x=i%7,y=Math.floor(i/7),nx=x+dx,ny=y+dy;
    if(s.maze.cells[i][side]||nx<0||nx>=7||ny<0||ny>=7||!s.maze.cells[ny*7+nx][side])continue;
    const points=[{x:x+.5,y:y+.5},{x:nx+.5,y:ny+.5}];
    if(points.some(p=>Math.hypot(p.x-s.goal.x,p.y-s.goal.y)<1.5||s.sticky.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<.5)))continue;
    candidates.push({x:x+.5,y:y+.5,dx,dy});
   }
   assert.ok(candidates.length);const corridor=candidates[0];
   await page.evaluate(p=>window.__corogalism.teleport(p.x,p.y),corridor);
   await page.mouse.move(rect.x+rect.width*(.5+corridor.dx*.49),rect.y+rect.height*(.5+corridor.dy*.49));await page.mouse.down();
   for(let i=0;i<15&&(await state()).hp.value===(await state()).hp.max;i++)await page.clock.runFor(120);
   await page.mouse.up();s=await state();assert.ok(s.hp.value<s.hp.max);await page.clock.runFor(700);
   const rest=s.rests.find(t=>!route(t));assert.ok(rest);
   await page.evaluate(p=>window.__corogalism.teleport(p.x,p.y),rest);await page.clock.runFor(1100);
   assert.ok((await state()).rests.find(t=>t.x===rest.x&&t.y===rest.y).progress>0);
   assert.equal(await page.locator('#feature-hint').textContent(),'ひとやすみ中…');
   await click('btn-pause');assert.ok((await state()).rests.every(t=>t.progress===0));
   await click('btn-resume');await ready();const before=(await state()).hp.value;
   await page.clock.runFor(2200);s=await state();assert.equal(s.rests.find(t=>t.x===rest.x&&t.y===rest.y).used,true);assert.ok(s.hp.value>before);
   const used=s.rests.filter(t=>t.used).map(t=>[t.x,t.y]);
   await page.clock.fastForward(Math.ceil((s.remainingSec+.1)*1000));assert.equal((await state()).screen,'over');
   await click('btn-continue');await ready();s=await state();assert.deepEqual(s.rests.filter(t=>t.used).map(t=>[t.x,t.y]),used);
   restCheck={branchStickyEscaped:true,impactViaPointer:true,branchRestHealed:true,pauseReset:true,continuePreserved:true,used};
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  rows.push({width,level,stage:n,theme:s.theme.id,branchSand,branchFields:fields.filter(f=>f.branch).length,branchRests:s.rests.filter(t=>!route(t)).length,restCheck});
  await page.evaluate(goal=>window.__corogalism.teleport(goal.x,goal.y),s.goal);await page.clock.runFor(32);await page.clock.fastForward(2000);assert.equal((await state()).status,'clear');
  if(n<16){await click('btn-next');await ready();}else{await click('btn-clear-exit');assert.equal((await state()).screen,'run-result');}
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({width,level,stages:16,result:'pass'}));await page.close();
}}finally{await writeFile(`${output}/results.json`,JSON.stringify(rows,null,2));await browser.close();}
