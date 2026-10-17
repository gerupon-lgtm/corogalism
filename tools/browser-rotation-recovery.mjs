/** 回転と、resize通知の後に盤面の配置が確定する条件を実アプリで確認する。
 * iPhone実機の再現ではなく、PCのChrome/WebKitによる回転・配置タイミングの検証。
 * 面送りのみdebug位置移動を使い、回転中の進行状態と復帰後の実入力も確認する。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const playwright=await import(process.env.PLAYWRIGHT_MODULE);
const base=process.env.BASE_URL||'http://127.0.0.1:8786/';
const output=process.env.ROTATION_OUTPUT||'docs/verification/rotation-recovery/local';
const engines=(process.env.ROTATION_ENGINES||'chromium,webkit').split(',');
const targetStage=Number(process.env.ROTATION_STAGE||1);
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const rows=[];await mkdir(output,{recursive:true});
let failed=false;
for(const engine of engines){
 const browser=await playwright[engine].launch(engine==='chromium'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}:{headless:true,...(process.env.WEBKIT_EXECUTABLE?{executablePath:process.env.WEBKIT_EXECUTABLE}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await context.addInitScript(()=>{
   Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});
   Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
   localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  page.setDefaultTimeout(15000);
  if(process.env.ROTATION_BASELINE){
   const source=execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show',`${process.env.ROTATION_BASELINE}:src/main.js`],{encoding:'utf8'});
   await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:source}));
  }
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
  await page.goto(base+'?debug=1&seed=77');await page.waitForFunction(()=>!!window.__corogalism,null,{polling:50});
  assert.equal(await page.locator('.badge').textContent(),'v'+version);
  await page.locator('#btn-challenge').click();await page.clock.runFor(5000);
  for(let n=1;n<targetStage;n++){
   await page.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
   await page.clock.runFor(1400);await page.locator('#btn-next').click();await page.clock.runFor(5000);
   if(n%5===0)console.log(`${engine}: advanced to stage ${n+1}`);
  }
  await page.locator('#btn-pause').click();await page.clock.runFor(80);
  const stable=()=>page.evaluate(()=>{const s=window.__corogalism.state;return {actor:s.actor,seed:s.seed,stage:s.stageIndex,hp:s.hp,timeMs:s.timeMs,run:s.run,rackets:s.rackets};});
  const before=await stable();assert.equal(before.stage,targetStage);console.log(`${engine}: stage ${targetStage} ready`);
  const dimensions=()=>page.evaluate(()=>{
   const b=document.querySelector('#board'),c=document.querySelector('#canvas'),ctx=c.getContext('2d');
   return {board:b.clientWidth,canvas:c.clientWidth,pixels:c.width,pixelHeight:c.height,ratio:ctx.getTransform().a,dpr:Math.min(devicePixelRatio,3)};
  });
  const correct=d=>Math.abs(d.board-d.canvas)<=1&&d.pixels===Math.round(d.canvas*d.dpr)&&d.pixelHeight===d.pixels&&d.ratio===d.dpr;
  const settledDimensions=async()=>{
   // ResizeObserverは実際のレイアウトの後に届く。仮想時計だけを進めて即座に判定しない。
   try{await page.waitForFunction(()=>Math.abs(document.querySelector('#board').clientWidth-document.querySelector('#canvas').clientWidth)<=1,null,{polling:30,timeout:1000});}catch{}
   await page.clock.runFor(32);return dimensions();
  };
  for(let i=0;i<3;i++){
   await page.setViewportSize({width:844,height:390});await page.clock.runFor(80);
   const landscape=await settledDimensions();rows.push({engine,name:'landscape',cycle:i,dimensions:landscape,correct:correct(landscape)});
   if(!correct(landscape))failed=true;
   await page.setViewportSize({width:390,height:844});await page.clock.runFor(80);
   const portrait=await settledDimensions();rows.push({engine,name:'portrait',cycle:i,dimensions:portrait,correct:correct(portrait)});
   if(!correct(portrait))failed=true;
  }
  assert.deepEqual(await stable(),before);
  rows.push({engine,name:'viewport-rotation',cycles:3,dimensions:await dimensions(),statePreserved:true});
  await page.screenshot({path:`${output}/${engine}-rotation.png`,fullPage:true});
  // 実際の盤面幅を一度小さくし、resize通知を先に受けた後、配置だけを元へ戻す。
  // ブラウザの寸法APIやcanvasは偽装せず、DOMの配置タイミングだけを分離する。
  await page.evaluate(()=>{
   const b=document.querySelector('#board');window.__rotationOldWidth=b.style.width;
   b.style.width=`${b.getBoundingClientRect().width/2}px`;window.dispatchEvent(new Event('resize'));
  });await page.clock.runFor(80);
  const interim=await dimensions();assert.ok(correct(interim));
  await page.evaluate(()=>{document.querySelector('#board').style.width=window.__rotationOldWidth;});
  await page.clock.runFor(160);
  const delayed=await settledDimensions(),restored=correct(delayed);
  await page.screenshot({path:`${output}/${engine}-delayed-layout.png`,fullPage:true});
  rows.push({engine,name:'layout-after-resize',interim,restored,dimensions:delayed,statePreserved:JSON.stringify(await stable())===JSON.stringify(before)});
  if(!restored){failed=true;console.error(`${engine}: board=${delayed.board}, canvas=${delayed.canvas} (expected equal)`);}
  assert.deepEqual(await stable(),before);
  // 同じ盤面寸法で画素倍率が変わる条件。画面サイズの通知を待たず描画へ反映できること。
  if(process.env.ROTATION_EXTENDED==='1'){
   for(const dpr of [1,3,2]){
    await page.evaluate(ratio=>{Object.defineProperty(window,'devicePixelRatio',{value:ratio,configurable:true});window.dispatchEvent(new Event('resize'));},dpr);
    await page.clock.runFor(80);const d=await settledDimensions();assert.ok(correct(d),JSON.stringify(d));
    rows.push({engine,name:'dpr-resize',dimensions:d});
   }
   await page.evaluate(()=>{const b=document.querySelector('#board');b.hidden=true;window.dispatchEvent(new Event('resize'));});await page.clock.runFor(80);
   await page.evaluate(()=>{document.querySelector('#board').hidden=false;});await page.clock.runFor(80);
   assert.ok(correct(await settledDimensions()));assert.deepEqual(await stable(),before);
   rows.push({engine,name:'hidden-board-restored',statePreserved:true});
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
   await page.clock.runFor(80);assert.ok(correct(await settledDimensions()));
   rows.push({engine,name:'pageshow',dimensions:await dimensions()});
  }
  await page.locator('#btn-resume').click();await page.clock.runFor(5000);
  const initial=await page.evaluate(()=>window.__corogalism.state.actor),rect=await page.locator('#board').boundingBox();
  await page.mouse.move(rect.x+rect.width*.78,rect.y+rect.height*.65);await page.mouse.down();await page.clock.runFor(400);await page.mouse.up();
  const moved=await page.evaluate(()=>window.__corogalism.state.actor);
  assert.ok(Math.hypot(moved.x-initial.x,moved.y-initial.y)>.005,'movement after rotation');
  const opaque=await page.locator('#canvas').evaluate(c=>{const ctx=c.getContext('2d'),bytes=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]!==255)transparent++;return {transparent,pixels:c.width*c.height};});
  assert.equal(opaque.transparent,0);assert.deepEqual(errors,[]);rows.push({engine,name:'continued-input',stage:targetStage,moved:true,opaque,errors});
  await context.close();
 }catch(error){failed=true;rows.push({engine,error:String(error)});console.error(error.stack);}
 finally{await browser.close();await writeFile(output+'/results.json',JSON.stringify({version,base,rows},null,2));}
}
console.log(JSON.stringify({version,cases:rows.length,failed}));
assert.equal(failed,false,'rotation/layout recovery failed; see results.json');
