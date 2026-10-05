/** 終了確認を実タップ・Enter・Escapeで確認。終了場面の準備だけデバッグ移動を使う。 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const base=process.env.BASE_URL||'http://127.0.0.1:8768/';
const output=process.env.END_CONFIRM_OUTPUT||'docs/verification/run-end-confirm/local';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const rows=[];
const widths=(process.env.END_CONFIRM_WIDTHS||'320,390,576').split(',').map(Number);
const levels=(process.env.END_CONFIRM_LEVELS||'normal,easy').split(',');
async function open(width,level,soundEnabled){
 const context=await browser.newContext({viewport:{width,height:width===320?568:width===576?1024:844},serviceWorkers:'block'});
 await context.addInitScript(({level,soundEnabled})=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});
  Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:level,soundEnabled}));
 },{level,soundEnabled});
 const page=await context.newPage(),errors=[],failedRequests=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(base+'?debug=1&seed=123');
 try{await page.waitForFunction(()=>!!window.__corogalism,null,{polling:50});}
 catch(error){await writeFile(`${output}/load-error.json`,JSON.stringify({errors,failedRequests,url:page.url()},null,2)+'\n');throw error;}
 assert.equal(await page.locator('.badge').textContent(),'v'+version);
 const state=()=>page.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await page.locator('#'+id).click();await page.clock.runFor(32);};
 const ready=async()=>{const s=await state();await page.clock.runFor(s.prepareMs+s.countdownMs+32);assert.equal((await state()).countdownMs,0);};
 const clear=async()=>{
  await page.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
  for(let i=0;i<100&&(await state()).screen!=='clear';i++)await page.clock.runFor(16);
  assert.equal((await state()).screen,'clear');
 };
 const fail=async()=>{await page.evaluate(()=>window.__corogalism.teleport(.5,.5));await page.clock.runFor(32);await page.clock.fastForward(Math.ceil(((await state()).remainingSec+.1)*1000));assert.equal((await state()).screen,'over');};
 const stable=s=>({screen:s.screen,stage:s.stageIndex,run:s.run,hp:s.hp,time:s.timeMs});
 const isOpen=()=>page.locator('#run-end-confirm').evaluate(d=>d.open);
 const modal=async()=>{
  assert.equal(await isOpen(),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-end-cancel');
  const r=await page.locator('#run-end-confirm').boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width);
  assert.ok(r.y+r.height<=(width===320?568:width===576?1024:844));
  assert.equal(await page.locator('#run-end-confirm').evaluate(d=>d.scrollHeight<=d.clientHeight),true);
 };
 const close=async()=>{assert.deepEqual(errors,[]);await context.close();};
 return {page,state,click,ready,clear,fail,stable,isOpen,modal,close};
}
try{
 if(!process.env.END_CONFIRM_EXTRA_ONLY)for(const width of widths)for(const level of levels)for(const soundEnabled of [false,true]){
  const p=await open(width,level,soundEnabled);await p.click('btn-challenge');await p.ready();
  assert.equal(await p.page.locator('#hud-stage').textContent(),'1面目');assert.equal(await p.page.locator('#hud-stage').isVisible(),true);
  await p.clear();const cleared=p.stable(await p.state());
  assert.equal(await p.page.locator('#btn-clear-exit').textContent(),'終了して結果を見る');
  await p.click('btn-clear-exit');await p.modal();assert.deepEqual(p.stable(await p.state()),cleared);
  await p.page.clock.runFor(400);assert.equal(await p.page.locator('#btn-next').isDisabled(),true);
  if(level==='normal'&&soundEnabled)await p.page.screenshot({path:`${output}/${width}-clear-confirm.png`});
  await p.page.keyboard.press('Enter');assert.equal(await p.isOpen(),false,'既定のEnterは戻る');
  await p.page.waitForFunction(()=>document.activeElement.id==='btn-clear-exit');
  await p.click('btn-clear-exit');await p.modal();
  // 背景の元ボタン位置には確認の「戻る」が重なる場合があるため、確実に枠外をタップする。
  await p.page.mouse.click(5,5);
  assert.equal(await p.isOpen(),true,'背景タップで終了や次面移動を起こさない');
  assert.deepEqual(p.stable(await p.state()),cleared);
  await p.page.keyboard.press('Escape');assert.equal(await p.isOpen(),false);
  await p.page.waitForFunction(()=>document.activeElement.id==='btn-clear-exit');
  await p.page.clock.runFor(650);assert.equal(await p.page.locator('#btn-next').isDisabled(),false,'取り消しても元の待機をリセットしない');
  assert.deepEqual(p.stable(await p.state()),cleared);
  await p.click('btn-next');assert.equal((await p.state()).stageIndex,2);assert.equal(await p.page.locator('#hud-stage').textContent(),'2面目');await p.ready();await p.fail();
  const failed=p.stable(await p.state());await p.click('btn-run-end');await p.modal();
  await p.page.clock.runFor(1100);assert.equal(await p.page.locator('#btn-continue').isDisabled(),false);
  assert.equal(await p.page.evaluate(()=>document.activeElement.id),'btn-end-cancel','裏のボタン有効化で確認からフォーカスを奪わない');
  assert.deepEqual(p.stable(await p.state()),failed);
  await p.page.keyboard.press('Escape');assert.equal(await p.isOpen(),false);await p.page.waitForFunction(()=>document.activeElement.id==='btn-run-end');
  assert.deepEqual(p.stable(await p.state()),failed);
  await p.click('btn-continue');assert.equal((await p.state()).run.continuesLeft,1);await p.ready();await p.fail();
  await p.click('btn-run-end');await p.modal();await p.click('btn-end-confirm');
  assert.equal((await p.state()).screen,'run-result');await p.page.waitForFunction(()=>document.activeElement.id==='run-heading');
  assert.equal((await p.state()).run.stages,1);assert.equal(await p.isOpen(),false);
  await p.page.locator('#btn-end-confirm').dispatchEvent('click');assert.equal((await p.state()).screen,'run-result','閉じた確認の連打は無視');
  assert.equal(await p.page.evaluate(()=>document.body.classList.contains('end-confirm-open')),false);
  assert.equal(await p.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  rows.push({width,level,soundEnabled,clearCancelled:true,waitPreserved:true,overCancelled:true,continuesPreserved:true,confirmed:true,stageVisible:true});
  console.log(JSON.stringify(rows.at(-1)));await p.close();
 }
 const game=await open(390,'easy',false);await game.click('btn-challenge');await game.ready();
 await game.click('btn-game-exit');await game.modal();assert.equal((await game.state()).paused,true);
 const stopped=game.stable(await game.state());await game.page.clock.runFor(5000);assert.deepEqual(game.stable(await game.state()),stopped);
 await game.click('btn-end-cancel');assert.equal(await game.isOpen(),false);assert.equal((await game.state()).paused,true);
 await game.click('btn-resume');assert.ok((await game.state()).prepareMs>0);
 rows.push({playingExit:true,paused:true,timeAndHpFrozen:true,cancelKeepsPaused:true});await game.close();
 const practice=await open(390,'easy',false);await practice.click('btn-practice');await practice.ready();await practice.clear();
 await practice.click('btn-clear-exit');assert.equal((await practice.state()).screen,'mode');assert.equal(await practice.isOpen(),false);
 rows.push({practiceExit:true,noConfirmation:true});await practice.close();
 const exhausted=await open(390,'easy',false);await exhausted.click('btn-challenge');await exhausted.ready();
 for(let n=0;n<2;n++){await exhausted.fail();await exhausted.page.clock.runFor(1100);await exhausted.click('btn-continue');await exhausted.ready();}
 await exhausted.fail();assert.equal((await exhausted.state()).run.continuesLeft,0);
 await exhausted.click('btn-run-end');assert.equal((await exhausted.state()).screen,'run-result');assert.equal(await exhausted.isOpen(),false);
 rows.push({continuesExhausted:true,noConfirmation:true});await exhausted.close();
 console.log(JSON.stringify({cases:rows.length,result:'pass'}));
}finally{await writeFile(`${output}/results.json`,JSON.stringify(rows,null,2)+'\n');await browser.close();}
