/** 設定画面だけの高さ・操作・戻り先を実ブラウザで検証する。 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
const output=resolve(root,process.env.SETTINGS_OUTPUT||`docs/verification/v${version}/settings-local`);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
let base=process.env.BASE_URL,server,browser;
if(!base){server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!f.startsWith(root+sep))throw Error('outside root');const b=await readFile(f);res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(b);}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}/`;}
const profiles=[{id:'393x740',width:393,height:740},{id:'390x700',width:390,height:700},{id:'360x740',width:360,height:740},{id:'390x780',width:390,height:780},{id:'full',width:390,height:844,camera:18,bottom:24}].filter(p=>!process.env.SETTINGS_PROFILE||p.id===process.env.SETTINGS_PROFILE);
const report={version,base,rows:[],updateChecks:[],headingChecks:[],errors:[],simulatedSafeArea:true};
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const p of profiles){
  const context=await browser.newContext({viewport:{width:p.width,height:p.height},serviceWorkers:'allow'});
  await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));if(!localStorage.getItem('corogalism-settings'))localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',soundEnabled:false}));});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'?debug=1&verify='+version);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>!!window.__corogalism);await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.evaluate(p=>{document.documentElement.style.setProperty('--camera-top',(p.camera||0)+'px');document.querySelector('.wrap').style.paddingBottom=(12+(p.bottom||0))+'px';},p);
  const measureHeading=screen=>page.evaluate(screen=>{const panel=document.getElementById('screen-'+screen),title=panel.querySelector('h2'),box=title.getBoundingClientRect(),style=getComputedStyle(title),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {panelX:panel.getBoundingClientRect().x,panelWidth:panel.getBoundingClientRect().width,title:{centerX:box.x+box.width/2,top:box.top,height:box.height,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight},art:[...panel.querySelectorAll('.menu-scene canvas,.settings-scene canvas')].map(rect),rail:rect(panel.querySelector('[data-wall-divider]'))};},screen);
  const homeHeading=await measureHeading('mode');
  if(process.env.VERIFY_UPDATE==='1'){
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   const measure=()=>page.evaluate(()=>Object.fromEntries(['#screen-mode','.menu-heading','#btn-tutorial','#btn-practice','.challenge','.records','.tools','.bottom'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{x:r.x,y:r.y,width:r.width,height:r.height}];})));
   const before=await measure();await page.locator('#btn-pwa-check').click();await page.waitForFunction(()=>!document.getElementById('btn-pwa-check').disabled&&document.getElementById('pwa-check-result').textContent==='最新版です。');const after=await measure();report.updateChecks.push({profile:p.id,before,after,message:await page.locator('#pwa-check-result').textContent()});
   assert.deepEqual(after,before,'latest-version check must keep home geometry unchanged');
   if(p.id==='393x740')await page.screenshot({path:resolve(output,'home-latest.png')});
  }
  await page.locator('#btn-mode-settings').click();
  await page.evaluate(p=>{document.documentElement.style.setProperty('--camera-top',(p.camera||0)+'px');document.querySelector('.wrap').style.paddingBottom=(12+(p.bottom||0))+'px';},p);
  if(process.env.PROBE_CSS)await page.addStyleTag({content:process.env.PROBE_CSS});
  await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  if(process.env.EXPECT_HEADING==='1'){const settingsHeading=await measureHeading('settings');report.headingChecks.push({profile:p.id,home:homeHeading,settings:settingsHeading});assert.deepEqual(settingsHeading,homeHeading,'settings header dimensions and positions must match home');}
  const row=await page.evaluate(()=>{
   const panel=document.getElementById('screen-settings'),wrap=document.querySelector('.wrap'),r=panel.getBoundingClientRect(),close=document.getElementById('btn-settings-close').getBoundingClientRect();
   const art=[...panel.querySelectorAll('canvas')].map(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>24)painted++;return {kind:c.dataset.toy||c.dataset.wallDivider,painted};});
   return {overflow:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,screen:document.body.dataset.screen,innerHeight,wrapBottom:wrap.getBoundingClientRect().bottom,panel:{top:r.top,bottom:r.bottom,height:r.height},closeBottom:close.bottom,art,portraitHeight:document.getElementById('portrait-lock').getBoundingClientRect().height,titleFont:getComputedStyle(panel.querySelector('h2')).fontSize,children:[...panel.children].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {id:e.id||e.className,top:b.top,bottom:b.bottom,height:b.height,margin:s.margin,padding:s.padding,text:e.textContent.trim().slice(0,100)};})};
  });
  report.rows.push({profile:p.id,...row});await page.screenshot({path:resolve(output,p.id+'.png'),fullPage:true});
  await page.locator('#set-angle').fill('31');await page.locator('#set-bgm-volume').fill('57');await page.locator('#set-se-volume').fill('26');
  assert.equal(await page.locator('#set-angle-value').textContent(),'31°');assert.equal(await page.locator('#set-bgm-value').textContent(),'57%');assert.equal(await page.locator('#set-se-value').textContent(),'26%');
  if(process.env.EXPECT_FIXED==='1'){
   assert.equal(row.titleFont,'26px');assert.ok(row.portraitHeight>=44&&row.portraitHeight<=46);assert.deepEqual(row.art.map(a=>a.kind),['candy','hourglass','cork']);assert.ok(row.art.every(a=>a.painted>1000));
   await page.locator('.settings-device-notes summary').click();await page.waitForFunction(()=>document.querySelector('.settings-device-notes').open);assert.ok(await page.locator('#portrait-note').isVisible());assert.ok(await page.locator('#pwa-status').isVisible());await page.locator('.settings-device-notes summary').click();
   await page.locator('#portrait-lock').click();await page.waitForFunction(()=>!document.getElementById('portrait-lock').disabled);assert.ok(await page.locator('#portrait-note').isVisible());assert.ok(await page.locator('#portrait-note').textContent());await page.locator('.settings-device-notes summary').click();
   await page.locator('#btn-settings-sound').click();assert.equal(await page.locator('#btn-settings-sound').getAttribute('aria-pressed'),'true');await page.locator('#btn-settings-sound').click();
  }
  await page.locator('#btn-settings-close').click();await page.waitForFunction(()=>document.body.dataset.screen==='mode');
  if(process.env.EXPECT_FIXED==='1'){
   await page.locator('#btn-practice').click();await page.waitForFunction(()=>{const s=window.__corogalism.state;return s.screen==='game'&&s.countdownMs===0&&s.prepareMs===0;});await page.locator('#btn-game-settings').click();await page.waitForFunction(()=>document.body.dataset.screen==='settings');
   assert.equal(await page.locator('#set-angle').inputValue(),'31');assert.equal(await page.locator('#set-bgm-volume').inputValue(),'57');assert.equal(await page.locator('#set-se-volume').inputValue(),'26');
   const gameSettings=await page.evaluate(()=>({overflow:document.documentElement.scrollHeight-innerHeight,paused:window.__corogalism.state.paused,reason:document.getElementById('settings-note').textContent}));report.rows.at(-1).fromGame=gameSettings;assert.equal(gameSettings.overflow,0);assert.ok(gameSettings.paused);
   await page.locator('#btn-settings-close').click();await page.waitForFunction(()=>document.body.dataset.screen==='game');assert.ok(await page.evaluate(()=>window.__corogalism.state.paused));
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__corogalism);await page.locator('#btn-mode-settings').click();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#set-bgm-volume').inputValue(),'57');assert.equal(await page.locator('#set-angle').inputValue(),'31');assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight),0);report.rows.at(-1).offlineReload=true;
  }
  await context.close();
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.rows.map(({profile,overflow,panel,closeBottom})=>({profile,overflow,panel,closeBottom})),null,2));
 assert.deepEqual(report.errors,[]);assert.ok(report.rows.every(r=>r.overflow===0&&r.horizontal===0&&r.closeBottom<=r.innerHeight),'settings must fit without vertical or horizontal scrolling');
 console.log('PASS settings fit and angle/audio controls');
}catch(error){await writeFile(resolve(output,'failure.json'),JSON.stringify({message:error.message,report},null,2)+'\n');throw error;}
finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));}
