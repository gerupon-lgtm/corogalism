/** 通常のブラウザ時計で盤面表示とpointer移動を確認する。仮想時計のPNGとは分ける。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8771/',output=process.env.RACKET_SCREEN_OUTPUT||'docs/verification/racket-puzzles/real-screen';
const expectedRelease=process.env.RACKET_EXPECT_RELEASE||'';
const cases=[...['baseline','cotton','rackets'].map(scenario=>({scenario,layout:'relay'})),...['sequence','timing'].map(layout=>({scenario:'rackets',layout}))];
await mkdir(output,{recursive:true});const rows=[];let active=null,errors=[],failedRequests=[],consoleErrors=[],httpErrors=[];
try{for(const {scenario,layout} of cases){
 const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2.625,serviceWorkers:'block'});
 await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));});
 const page=await context.newPage();active=page;errors=[];failedRequests=[];consoleErrors=[];httpErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()});});page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
 await page.goto(base+'racket-lab.html?debug=1&mode='+scenario+'&layout='+layout);await page.waitForFunction(()=>!!window.__racketLab);await page.evaluate(()=>document.fonts.ready);
 const releaseText=await page.locator('header span').textContent();assert.match(releaseText,/おためし3.*v0\.6\.30/);if(expectedRelease)assert.ok(releaseText.includes(expectedRelease),'指定した公開修正版を表示する');assert.equal(await page.evaluate(()=>window.__racketLab.state.settings.layout),layout);
 const icon=await page.evaluate(async()=>{const link=document.querySelector('link[rel="icon"]');if(!link)return null;const r=await fetch(link.href),bitmap=await createImageBitmap(await r.blob());const result={url:link.href,status:r.status,contentType:r.headers.get('content-type'),width:bitmap.width,height:bitmap.height};bitmap.close();return result;});
 assert.ok(icon,'ページがタブアイコンを指定する');assert.equal(icon.status,200);assert.match(icon.contentType,/^image\/png(?:;|$)/);assert.equal(icon.width,192);assert.equal(icon.height,192);
 await page.locator('#reset').click();await page.locator('#board').scrollIntoViewIfNeeded();const r=await page.locator('#board').boundingBox();
 const before=await page.evaluate(()=>window.__racketLab.state.actor);
 await page.mouse.move(r.x+r.width*.825,r.y+r.height*.56);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();await page.locator('#pause').click();await page.waitForTimeout(100);
 const state=await page.evaluate(()=>{const s=window.__racketLab.state;return {actor:s.actor,paused:s.paused,lastHalt:s.lastHalt,rackets:s.rackets};});
 assert.ok(Math.hypot(state.actor.x-before.x,state.actor.y-before.y)>.01,'通常時計でもpointerで球が動く');assert.equal(state.paused,true);assert.equal(state.lastHalt,null);
 const rect=await page.evaluate(()=>{const c=document.querySelector('#board'),r=c.getBoundingClientRect(),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)transparent++;return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,viewportWidth:innerWidth,transparent};});
 assert.equal(rect.transparent,0);
 const file=(layout==='relay'?scenario:layout)+'-412.png',png=await page.screenshot({path:output+'/'+file,fullPage:true});
 const image=await page.evaluate(async({base64,rect})=>{
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'})),ratio=bitmap.width/rect.viewportWidth,w=Math.floor(rect.width*ratio),h=Math.floor(rect.height*ratio),canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d');ctx.drawImage(bitmap,Math.round(rect.x*ratio),Math.round(rect.y*ratio),w,h,0,0,w,h);bitmap.close();
  const pixels=ctx.getImageData(0,0,w,h).data;let cyan=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<210&&pixels[i+1]>pixels[i]+15&&pixels[i+2]>pixels[i]+15)cyan++;return {width:w,height:h,cyanPixels:cyan,cyanRatio:cyan/(w*h)};
 },{base64:png.toString('base64'),rect});
 rows.push({scenario,layout,releaseText,icon,realClock:true,actualPointerMs:400,before,...state,screenshot:file,canvasTransparent:rect.transparent,...image,errors,failedRequests,consoleErrors,httpErrors});assert.ok(image.cyanRatio>.05,'保存PNGに氷の盤面が映る');assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS native clock screenshot '+layout+'/'+scenario+' '+image.cyanRatio.toFixed(3));await context.close();
}}catch(error){rows.push({failure:String(error),errors,failedRequests,consoleErrors,httpErrors});if(active&&!active.isClosed())await active.screenshot({path:output+'/failure.png',fullPage:true});throw error;}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2)+'\n');await browser.close();}
