import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = new URL(process.env.BASE_URL || 'http://127.0.0.1:8765/');
const output = new URL('../docs/verification/toy/', import.meta.url);
await mkdir(output, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];
try {
  for(const width of [320,375,390,1280]) {
    const context=await browser.newContext({viewport:{width,height:width===320?568:900},deviceScaleFactor:2});
    await context.addInitScript(()=>Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true}));
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
    await page.goto(new URL('?debug=1&seed=123',baseUrl).href);await page.clock.runFor(32);
    const click=async id=>{
      const box=await page.locator(`#${id}`).boundingBox();
      assert.ok(box,`${id} visible`);
      await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
      await page.clock.runFor(500);
      const s = await state();
      if (s.screen === 'game' && !s.paused && s.countdownMs > 0) await page.clock.runFor(s.prepareMs + s.countdownMs + 32);
    };
    const state=()=>page.evaluate(()=>window.__corogalism.state);
    const layout=()=>page.evaluate(()=>{
      const b=document.querySelector('#board').getBoundingClientRect();
      return {x:b.x,y:b.y,width:b.width,height:b.height,scroll:window.scrollY,documentHeight:document.documentElement.scrollHeight};
    });
    await click('btn-challenge');
    await page.evaluate(()=>window.scrollTo(0,16));
    const before=await layout();
    await page.screenshot({path:fileURLToPath(new URL(`game-${width}.png`,output)),fullPage:true});
    await page.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
    await page.clock.runFor(500);
    assert.equal((await state()).screen,'clear');
    // Playwrightの時計とCSS timelineは独立するため、定位置の検査は登場アニメーション完了後。
    await page.locator('#screen-clear').evaluate(el=>el.getAnimations().forEach(animation=>animation.finish()));
    assert.deepEqual(await layout(),before,`clear preserves complete layout at ${width}`);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-next');
    const toast=await page.locator('#screen-clear').boundingBox();
    assert.ok(toast.x>=before.x && toast.y>=before.y && toast.y+toast.height<=before.y+before.height);
    assert.ok(Math.abs(toast.x+toast.width/2-before.x-before.width/2)<1, 'clear horizontally centered');
    assert.ok(Math.abs(toast.y+toast.height/2-before.y-before.height/2)<1, 'clear vertically centered');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-clear-exit');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-game-settings');
    // 画面外の設定へTab移動した際のブラウザ標準スクロールと、ゲーム遷移の検査を分ける。
    await page.evaluate(scroll=>window.scrollTo(0,scroll),before.scroll);
    await page.screenshot({path:fileURLToPath(new URL(`clear-${width}.png`,output)),fullPage:true});
    await page.clock.runFor(2000);
    assert.equal((await state()).screen,'clear');
    const time=(await state()).timeMs;await page.clock.fastForward(60000);assert.equal((await state()).timeMs,time);
    await click('btn-next');assert.equal((await state()).stageIndex,2);
    assert.deepEqual(await layout(),before,`next preserves complete layout at ${width}`);
    const failedSeed=(await state()).seed;
    await page.evaluate(()=>window.__corogalism.teleport(.5,.5));
    await page.clock.fastForward((await state()).limitSec*1000+50);await page.clock.runFor(500);
    assert.equal((await state()).screen,'over');
    await page.locator('#screen-over').evaluate(el=>el.getAnimations().forEach(animation=>animation.finish()));
    assert.deepEqual(await layout(),before,`failure preserves complete layout at ${width}`);
    const over=await page.locator('#screen-over').boundingBox();
    assert.ok(Math.abs(over.x+over.width/2-before.x-before.width/2)<1, 'continue horizontally centered');
    assert.ok(Math.abs(over.y+over.height/2-before.y-before.height/2)<1, `continue vertically centered: ${JSON.stringify({over,before})}`);
    await page.screenshot({path:fileURLToPath(new URL(`continue-${width}.png`,output)),fullPage:true});
    await click('btn-continue');
    assert.equal((await state()).screen,'game');assert.equal((await state()).seed,failedSeed);
    assert.equal((await state()).hp.value,(await state()).hp.max);
    assert.deepEqual(await layout(),before,`continue preserves complete layout at ${width}`);
    // 後半の素材を、同じ実装のまま実際の盤面上で確認する。
    if(width===375) {
      for(let i=2;i<15;i++) {
        await page.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});
        await page.clock.runFor(500);await click('btn-next');
      }
      await page.screenshot({path:fileURLToPath(new URL('materials-stage15.png',output)),fullPage:true});
    }
    await context.close();
  }
  // 動きを減らす設定ではトーストと祝福演出が静止し、操作は同じ。
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.goto(new URL('?debug=1&seed=123',baseUrl).href);await page.clock.runFor(32);
  for(const id of ['btn-practice']) {await page.locator(`#${id}`).click({force:true});await page.clock.runFor(32);}
  await page.clock.runFor(3700);
  const before=await page.locator('#board').boundingBox();
  await page.evaluate(()=>{const g=window.__corogalism.state.goal;window.__corogalism.teleport(g.x,g.y);});await page.clock.runFor(32);
  assert.deepEqual(await page.locator('#board').boundingBox(),before);
  assert.equal(await page.locator('#screen-clear').evaluate(el=>getComputedStyle(el).animationName),'none');
  const canvasBefore=await page.locator('#canvas').evaluate(el=>el.toDataURL());
  await page.clock.runFor(1000);
  assert.equal(await page.locator('#canvas').evaluate(el=>el.toDataURL()),canvasBefore);
  await page.locator('#btn-retry').click({force:true});await page.clock.runFor(32);
  assert.equal(await page.evaluate(()=>window.__corogalism.state.screen),'game');
  assert.deepEqual(errors,[]);
  console.log('PASS: C visuals, unchanged scroll/document/board bounds through clear/next/fail/continue at 4 widths, real pointer clicks, non-modal keyboard navigation, persistent toast, frozen timer, reduced motion and practice retry; no page errors.');
} finally {await browser.close();}
