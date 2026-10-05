/** 結果ボタンの待機を実タップ・キー入力で確認。面の終了にはデバッグ位置移動を使う。 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const base=process.env.BASE_URL||'http://127.0.0.1:8768/';
const output=process.env.END_ACTION_OUTPUT||'docs/verification/end-actions/local';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const rows=[];
async function open(width,level,soundEnabled,{audioFailure=false,reduced=false}={}){
 const context=await browser.newContext({viewport:{width,height:width===320?568:width===576?1024:844},serviceWorkers:'block',reducedMotion:reduced?'reduce':'no-preference'});
 await context.addInitScript(({level,soundEnabled,audioFailure})=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});
  Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
  localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:level,soundEnabled}));
  if(audioFailure){window.AudioContext=undefined;window.webkitAudioContext=undefined;}
 },{level,soundEnabled,audioFailure});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(base+'?debug=1&seed=123');await page.waitForFunction(()=>!!window.__corogalism);
 assert.equal(await page.locator('.badge').textContent(),'v'+version);
 await page.evaluate(()=>document.fonts.ready);
 const state=()=>page.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await page.locator('#'+id).click();await page.clock.runFor(32);};
 const ready=async()=>{const s=await state();await page.clock.runFor(s.prepareMs+s.countdownMs+32);assert.equal((await state()).countdownMs,0);};
 const clear=async()=>{
  await page.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
  for(let i=0;i<100&&(await state()).screen!=='clear';i++)await page.clock.runFor(16);
  assert.equal((await state()).screen,'clear');
 };
 const fail=async()=>{
  await page.evaluate(()=>window.__corogalism.teleport(.5,.5));await page.clock.runFor(32);
  await page.clock.fastForward(Math.ceil(((await state()).remainingSec+.1)*1000));
  assert.equal((await state()).screen,'over');
 };
 async function waitButton(id,waitMs,label,{shots,focusOther=false}={}){
  const button=page.locator('#'+id),before=await state();
  await page.waitForTimeout(400); // 既存のトースト入場アニメーションを描画する。
  assert.equal(await button.isDisabled(),true);assert.equal(await button.textContent(),label);
  assert.equal(await button.getAttribute('aria-label'),null);
  assert.ok(await button.evaluate(b=>b.classList.contains('is-waiting')));
  const size=await button.evaluate(b=>[b.offsetWidth,b.offsetHeight]);
  const rect=await button.boundingBox();
  assert.ok(rect,JSON.stringify(await button.evaluate(b=>({id:b.id,hidden:b.hidden,panelHidden:b.closest('section').hidden,display:getComputedStyle(b).display,panelDisplay:getComputedStyle(b.closest('section')).display}))));
  for(let i=0;i<3;i++)await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
  await page.keyboard.press('Enter');
  // 合成clickも待機をすり抜けない。残り回数・面・成績を消費しない。
  await button.dispatchEvent('click');
  const stable=s=>({screen:s.screen,stage:s.stageIndex,seed:s.seed,run:s.run,hp:s.hp,time:s.timeMs});
  assert.deepEqual(stable(await state()),stable(before));
  if(focusOther)await page.locator(id==='btn-next'?'#btn-clear-exit':'#btn-run-end').focus();
  await page.clock.runFor(waitMs/2);
  assert.equal(await button.isDisabled(),true);assert.equal(await button.textContent(),label);
  assert.ok(Number(await button.evaluate(b=>getComputedStyle(b).opacity))<1);
  assert.equal(await button.evaluate(b=>getComputedStyle(b).filter),'grayscale(1)');
  assert.ok(await page.locator('button:disabled').evaluateAll(buttons=>buttons
   .filter(b=>b.getClientRects().length).every(b=>getComputedStyle(b).filter==='grayscale(1)')));
  if(shots)await page.screenshot({path:`${output}/${shots}-waiting.png`});
  await page.clock.runFor(waitMs/2-100);
  assert.equal(await button.isDisabled(),true,'有効化直前もタップを受け付けない');
  await page.clock.runFor(132);
  const activation=await button.evaluate(b=>{
   // ブラウザが作る実際の色の遷移を途中で止め、補間値を確認する。
   // 仮想タイマーと描画時間のずれで、途中の色を取り逃がさない。
   const filter=getComputedStyle(b).filter;
   if(matchMedia('(prefers-reduced-motion: reduce)').matches)return {reduced:true,filter,disabled:b.disabled};
   const animation=b.getAnimations().find(a=>a.transitionProperty==='filter');
   if(!animation)return {filter,disabled:b.disabled};
   const duration=animation.effect.getTiming().duration;
   animation.pause();animation.currentTime=duration/2;
   const midpoint=getComputedStyle(b).filter;
   animation.play();
   return {duration,midpoint,disabled:b.disabled};
  });
  assert.equal(activation.disabled,false,'彩度が戻る途中から操作を受け付ける');
  if(activation.reduced)assert.equal(activation.filter,'none');
  else{
   assert.equal(activation.duration,300);
   const grayscale=Number(activation.midpoint?.match(/^grayscale\(([\d.]+)\)$/)?.[1]);
   assert.ok(grayscale>0&&grayscale<1,JSON.stringify(activation));
  }
  assert.equal(await button.isDisabled(),false);assert.equal(await button.textContent(),label);
  assert.equal(await button.evaluate(b=>b.classList.contains('is-waiting')),false);
  assert.deepEqual(await button.evaluate(b=>[b.offsetWidth,b.offsetHeight]),size,'切り替えでボタン寸法を変えない');
  if(focusOther)assert.equal(await page.evaluate(()=>document.activeElement.id),id==='btn-next'?'btn-clear-exit':'btn-run-end');
  else assert.equal(await page.evaluate(()=>document.activeElement.id),id);
  await page.clock.runFor(300);
  // CSSの描画時間は仮想のsetTimeoutと別に進むため、色の遷移も実時間で待つ。
  await page.waitForTimeout(400);
  assert.equal(Number(await button.evaluate(b=>getComputedStyle(b).opacity)),1);
  assert.equal(await button.evaluate(b=>getComputedStyle(b).filter),'none');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(shots)await page.screenshot({path:`${output}/${shots}-ready.png`});
  assert.deepEqual(stable(await state()),stable(before));
  return activation;
 }
 const close=async()=>{assert.deepEqual(errors,[]);await context.close();};
 return {page,state,click,ready,clear,fail,waitButton,close};
}
try{
 for(const width of [320,390,576])for(const level of ['normal','easy'])for(const soundEnabled of [false,true]){
  const p=await open(width,level,soundEnabled);
  await p.click('btn-challenge');await p.ready();
  if(soundEnabled)await p.page.waitForFunction(()=>window.__corogalism.state.audio.loaded,null,{polling:50});
  await p.clear();
  const shots=level==='normal'&&soundEnabled?`${width}-clear`:undefined;
  const clearActivation=await p.waitButton('btn-next',2000,'次の面へ',{shots,focusOther:width===390&&level==='easy'&&!soundEnabled});
  await p.click('btn-next');assert.equal((await p.state()).stageIndex,2);
  assert.ok((await p.state()).prepareMs>0);await p.ready();await p.fail();
  const continueActivation=await p.waitButton('btn-continue',1000,'コンティニュー',{shots:shots?`${width}-over`:undefined});
  await p.click('btn-continue');assert.equal((await p.state()).run.continuesLeft,1);
  assert.ok((await p.state()).prepareMs>1400);assert.equal((await p.state()).countdownMs,3000);
  if(width===390&&level==='normal'&&soundEnabled){
   await p.ready();await p.fail();await p.waitButton('btn-continue',1000,'コンティニュー');
   await p.click('btn-continue');await p.ready();await p.fail();
   assert.equal((await p.state()).run.continuesLeft,0);
   await p.page.clock.runFor(3000);
   assert.equal(await p.page.locator('#btn-continue').isDisabled(),true);
   assert.equal(await p.page.locator('#btn-continue').evaluate(b=>b.classList.contains('is-waiting')),false);
   assert.equal(await p.page.evaluate(()=>document.activeElement.id),'btn-run-end');
  }
  rows.push({width,level,soundEnabled,clearWaitMs:2000,continueWaitMs:1000,disabledTapIgnored:true,labelsUnchanged:true,layoutStable:true,clearActivation,continueActivation});
  console.log(JSON.stringify(rows.at(-1)));await p.close();
 }
 for(const [mode,start,label]of [['practice','btn-practice','次の迷路'],['tutorial','btn-tutorial-start','モード選択へ'],['floor-practice','btn-floor-practice','続けて試す']]){
  const p=await open(390,'easy',false);
  if(mode==='tutorial')await p.click('btn-tutorial');
  await p.click(start);await p.ready();await p.clear();
  await p.waitButton('btn-next',2000,label);await p.click('btn-next');
  assert.equal((await p.state()).screen,mode==='tutorial'?'mode':'game');
  rows.push({mode,clearWaitMs:2000,labelsUnchanged:true});await p.close();
 }
 for(const soundEnabled of [false,true]){
  const p=await open(390,'normal',soundEnabled);await p.click('btn-challenge');await p.ready();
  if(soundEnabled)await p.page.waitForFunction(()=>window.__corogalism.state.audio.loaded,null,{polling:50});
  for(let n=1;n<=10;n++){
   assert.equal((await p.state()).stageIndex,n);await p.clear();
   const special=(await p.state()).theme.special;
   if(n===10){assert.equal(special,true);if(soundEnabled)assert.ok((await p.state()).audio.events.includes('flowGoal'));}
   await p.waitButton('btn-next',special?650:2000,'次の面へ');
   await p.click('btn-next');await p.ready();
  }
  rows.push({specialFlow:true,soundEnabled,clearWaitMs:650,nextStage:11});await p.close();
 }
 const p=await open(390,'easy',true,{audioFailure:true,reduced:true});
 await p.click('btn-challenge');await p.ready();await p.clear();
 await p.waitButton('btn-next',2000,'次の面へ');await p.click('btn-next');await p.ready();await p.fail();
 assert.equal((await p.state()).audio.context,'none');
 // 待機中の終了は即時。古いタイマーが別画面を戻したり、有効化したりしない。
 await p.click('btn-run-end');assert.equal((await p.state()).screen,'run-result');
 await p.page.clock.runFor(3000);assert.equal((await p.state()).screen,'run-result');
 assert.equal(await p.page.locator('#btn-continue').isDisabled(),true);
 assert.equal(await p.page.locator('#btn-continue').evaluate(b=>b.classList.contains('is-waiting')),false);
 rows.push({audioFailure:true,reducedMotion:true,clearWaitMs:2000,earlyExit:true,timerCancelled:true});await p.close();
 console.log(JSON.stringify({cases:rows.length,result:'pass'}));
}finally{await writeFile(`${output}/results.json`,JSON.stringify(rows,null,2)+'\n');await browser.close();}
