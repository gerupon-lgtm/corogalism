/** ResizeObserver後の次frameを確かめ、virtualclockと実時計で分けて記録する。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8771/',output=process.env.RACKET_RESIZE_OUTPUT||'docs/verification/racket-goal/resize-diagnostic';
await mkdir(output,{recursive:true});const rows=[];let activePage=null,activeVirtual=null,activeErrors=null,activeRequests=null;
async function capture(page){return page.evaluate(()=>{
 const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]!==255)transparent++;
 return {width:canvas.width,height:canvas.height,matrix:ctx.getTransform().a,transparent,trace:[...window.__resizeTrace]};
});}
try{for(const virtual of (process.env.RACKET_RESIZE_MODES==='real'?[false]:[true,false])){
 const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625,serviceWorkers:'block'});
 await context.addInitScript(()=>{
  Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));
  window.__resizeTrace=[];
  const log=type=>{const c=document.querySelector('#board');if(!c)return;window.__resizeTrace.push({type,time:performance.now(),width:c.width,clientWidth:c.parentElement.clientWidth,matrix:c.getContext('2d').getTransform().a});if(window.__resizeTrace.length>120)window.__resizeTrace.shift();};
  const Original=ResizeObserver;window.ResizeObserver=class extends Original{constructor(callback){super((entries,observer)=>{log('observer-before');callback(entries,observer);log('observer-after');});}};
  const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){const result=clear.call(this,...args);if(this.canvas.id==='board')log('frame-clear');return result;};
  const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){const result=draw.call(this,...args);if(this.canvas.id==='board')log('frame-image');return result;};
 });
 const page=await context.newPage(),errors=[],failedRequests=[];activePage=page;activeVirtual=virtual;activeErrors=errors;activeRequests=failedRequests;page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
 if(virtual){await page.clock.install();await page.clock.pauseAt(Date.now()+1000);}
 await page.goto(base+'racket-lab.html?debug=1');await page.waitForFunction(()=>!!window.__racketLab);await page.locator('#pause').click();await page.waitForLoadState('networkidle');
 if(virtual)await page.clock.runFor(100);else await page.waitForTimeout(100);
 const initial=await capture(page);assert.equal(initial.transparent,0);
 await page.setViewportSize({width:436,height:915});if(virtual)await page.clock.runFor(100);else await page.waitForTimeout(150);
 await page.setViewportSize({width:412,height:915});if(virtual)await page.clock.runFor(100);else await page.waitForTimeout(150);
 const beforeExtraFrame=await capture(page);if(virtual)await page.clock.runFor(32);else await page.waitForTimeout(32);
 const afterExtraFrame=await capture(page);assert.equal(afterExtraFrame.transparent,0);assert.equal(afterExtraFrame.width,initial.width);assert.equal(afterExtraFrame.matrix,initial.matrix);
 if(!virtual)assert.equal(beforeExtraFrame.transparent,0,'実時計の描画はresize後も全体を再描画する');
 let frozenResize=null;
 if(virtual){
  // 本体Observerの後で寸法通知を受け取り、その間は仮想RAFを進めない。
  await page.setViewportSize({width:436,height:915});
  await page.evaluate(()=>new Promise(resolve=>{const observer=new ResizeObserver(()=>{observer.disconnect();resolve();});observer.observe(document.querySelector('#board').parentElement);}));
  const afterObserver=await capture(page);assert.equal(afterObserver.transparent,afterObserver.width*afterObserver.height,'RAF停止中、寸法更新は描画を消去する');
  await page.clock.runFor(32);const afterFrame=await capture(page);assert.equal(afterFrame.transparent,0,'通知の後の次frameで全面を復元する');
  frozenResize={afterObserver,afterFrame};
 }
 assert.deepEqual(errors,[]);rows.push({virtual,initial,beforeExtraFrame,afterExtraFrame,frozenResize,errors});
 await page.screenshot({path:output+(virtual?'/virtual-clock.png':'/real-clock.png'),fullPage:true});console.log('PASS racket resize '+JSON.stringify({virtual,transparentBeforeFrame:beforeExtraFrame.transparent,transparentAfterFrame:afterExtraFrame.transparent}));await context.close();
}}catch(error){rows.push({failure:true,virtual:activeVirtual,message:String(error),errors:activeErrors,failedRequests:activeRequests});if(activePage&&!activePage.isClosed())await activePage.screenshot({path:output+'/failure.png',fullPage:true});throw error;}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2)+'\n');await browser.close();}
