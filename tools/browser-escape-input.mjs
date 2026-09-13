import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const ctx=await browser.newContext({serviceWorkers:'block'});const page=await ctx.newPage();await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765/');
 await page.evaluate(async()=>{
  const {createEscapeInput}=await import('./src/input/escapeInput.js');const board=document.createElement('div');document.body.append(board);
  const probe=window.probe={active:true,count:0};probe.input=createEscapeInput(board,()=>probe.active,()=>probe.count++);
  probe.pointer=(type,x=20)=>board.dispatchEvent(new PointerEvent(type,{pointerId:1,isPrimary:true,button:0,clientX:x,clientY:20,bubbles:true}));
  probe.motion=x=>{const e=new Event('devicemotion');Object.assign(e,{accelerationIncludingGravity:{x,y:0,z:9.8}});window.dispatchEvent(e);};
 });
 const tap=async()=>{await page.evaluate(()=>{probe.pointer('pointerdown');probe.pointer('pointerup');});};
 await tap();await page.clock.runFor(100);await tap();assert.equal(await page.evaluate(()=>probe.count),1);
 // スワイプはダブルタップにならない。
 await page.clock.runFor(500);await page.evaluate(()=>{probe.pointer('pointerdown');probe.pointer('pointerup',100);});await page.clock.runFor(100);await tap();assert.equal(await page.evaluate(()=>probe.count),1);
 await page.evaluate(()=>probe.input.reset());await page.clock.runFor(500);
 // 軽い本体衝撃の模擬入力。連続した大きなサンプルは1回のみ。
 await page.evaluate(()=>probe.motion(0));await page.clock.runFor(16);await page.evaluate(()=>probe.motion(8));await page.clock.runFor(80);assert.equal(await page.evaluate(()=>probe.count),2);
 await page.evaluate(()=>probe.motion(-8));await page.clock.runFor(80);assert.equal(await page.evaluate(()=>probe.count),2);
 // 同じ操作の画面タップが遅れて届いた場合、本体側を取り消す。
 await page.clock.runFor(500);await page.evaluate(()=>probe.input.reset());await page.evaluate(()=>probe.motion(0));await page.clock.runFor(16);await page.evaluate(()=>probe.motion(8));await tap();await page.clock.runFor(100);await tap();assert.equal(await page.evaluate(()=>probe.count),3);
 await page.evaluate(()=>{probe.active=false;probe.input.reset();});await page.clock.runFor(500);await tap();await page.clock.runFor(100);await tap();await page.evaluate(()=>probe.motion(0));await page.clock.runFor(16);await page.evaluate(()=>probe.motion(10));await page.clock.runFor(100);assert.equal(await page.evaluate(()=>probe.count),3);
 console.log('PASS: double tap, swipe rejection, motion impulse, burst suppression, pointer/motion deduplication, inactive input ignored.');
}finally{await browser.close();}
