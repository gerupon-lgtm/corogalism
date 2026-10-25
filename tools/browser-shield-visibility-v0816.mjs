/** まもり表示の可読性・衝突と、HUD／迷路の位置を実ブラウザで検証する。 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
const baselineMode=process.env.SHIELD_BASELINE==='1';
const output=resolve(root,process.env.SHIELD_OUTPUT||`docs/verification/v${version}/shield-local`);
const baseline=baselineMode?null:JSON.parse(await readFile(resolve(root,'docs/verification/shield-visibility/before/results.json'),'utf8'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
let base=process.env.BASE_URL,server,browser,page;
if(!base){server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!f.startsWith(root+sep))throw Error('outside root');const data=await readFile(f);res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}/`;}
const profiles=[{id:'393x740',width:393,height:740},{id:'360x740',width:360,height:740},{id:'390x700',width:390,height:700},{id:'full',width:390,height:844,camera:18,bottom:24}];
const report={version,base,rows:[],errors:[],fixtureBoundary:'large numeric values are DOM-only layout fixtures; item acquisition uses debug teleport and real pickup logic'};
const contrast=(a,b)=>{const luminance=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const measure=()=>page.evaluate(()=>{
 const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const shield=document.getElementById('hud-shield'),badge=shield.parentElement,style=getComputedStyle(shield);
 return {card:rect('#hp-meter-block'),board:rect('#board'),badge:rect('.shield-stock'),hp:rect('#hud-hp'),damage:rect('#hud-damage'),name:rect('#hp-meter-block .meter-name'),hpBar:rect('#hp-bar'),timeBar:rect('#time-bar'),font:parseFloat(style.fontSize),weight:style.fontWeight,color:style.color,background:getComputedStyle(badge).backgroundColor,icon:rect('.shield-stock img').width,value:shield.textContent,label:badge.getAttribute('aria-label'),badgeText:badge.textContent.trim(),overflow:document.documentElement.scrollHeight-innerHeight};
});
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const profile of profiles)for(const mode of ['challenge','tutorial']){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},serviceWorkers:'block'});
  await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:'easy',soundEnabled:false}));});
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'?debug=1&seed=77');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>!!window.__corogalism);
  await page.evaluate(p=>{document.documentElement.style.setProperty('--camera-top',(p.camera||0)+'px');document.querySelector('.wrap').style.paddingBottom=(12+(p.bottom||0))+'px';},profile);
  if(mode==='tutorial'){await page.locator('#btn-tutorial').click();await page.locator('#btn-tutorial-start').click();}else await page.locator('#btn-challenge').click();
  await page.waitForFunction(()=>window.__corogalism.state.screen==='game');await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  const row={profile:profile.id,mode,initial:await measure()};
  if(!baselineMode){
   const old=baseline.rows.find(r=>r.profile===profile.id&&r.mode===mode).initial;
   for(const item of ['card','board'])for(const key of ['x','y','width','height'])assert.ok(Math.abs(row.initial[item][key]-old[item][key])<1,`${profile.id} ${mode} ${item}.${key}: ${row.initial[item][key]} vs ${old[item][key]}`);
   assert.ok(row.initial.font>=14);assert.ok(Number(row.initial.weight)>=700);assert.ok(row.initial.icon>=17);assert.match(row.initial.badgeText,/まもり/);
   row.initial.contrast=contrast(row.initial.color,row.initial.background);assert.ok(row.initial.contrast>=4.5);
   if(mode==='challenge')assert.ok(Math.abs(row.initial.hpBar.y-row.initial.timeBar.y)<1,'time and HP bars stay aligned');
   row.largeValues=await page.evaluate(()=>{const stock=document.getElementById('hud-shield'),old=stock.textContent,damage=document.getElementById('hud-damage'),oldDamage=damage.textContent;damage.textContent='−123';const clear=(a,b)=>a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;const rows=[0,1,20,50,120].map(value=>{stock.textContent=String(value);const r=stock.parentElement.getBoundingClientRect(),card=document.getElementById('hp-meter-block').getBoundingClientRect(),hp=document.getElementById('hud-hp').getBoundingClientRect(),name=document.querySelector('#hp-meter-block .meter-name').getBoundingClientRect();return {value,inside:r.left>=card.left&&r.right<=card.right,clearOfName:r.left>=name.right+1,clearOfHp:clear(r,hp),clearOfDamage:clear(r,damage.getBoundingClientRect())};});stock.textContent=old;damage.textContent=oldDamage;return rows;});
   assert.ok(row.largeValues.every(r=>r.inside&&r.clearOfName&&r.clearOfHp&&r.clearOfDamage),JSON.stringify(row.largeValues));
  }
  await page.waitForFunction(()=>{const s=window.__corogalism.state;return s.countdownMs===0&&s.prepareMs===0;});
  const leaf=await page.evaluate(()=>window.__corogalism.state.leaf);
  if(leaf){await page.evaluate(leaf=>window.__corogalism.teleport(leaf.x,leaf.y),leaf);await page.waitForFunction(()=>window.__corogalism.state.shield>0);await page.waitForFunction(()=>document.getElementById('hud-shield').textContent===String(Math.ceil(window.__corogalism.state.shield)));row.pickup={actual:await page.evaluate(()=>window.__corogalism.state.shield),display:await measure()};if(!baselineMode){row.pickup.display.contrast=contrast(row.pickup.display.color,row.pickup.display.background);assert.ok(row.pickup.display.contrast>=4.5);assert.equal(row.pickup.display.value,String(Math.ceil(row.pickup.actual)));assert.equal(row.pickup.display.label,`葉っぱのまもり 残り${Math.ceil(row.pickup.actual)}`);}}
  await page.screenshot({path:resolve(output,`${profile.id}-${mode}.png`)});report.rows.push(row);await context.close();
 }
 assert.deepEqual(report.errors,[]);if(!baselineMode)assert.ok(report.rows.every(r=>r.initial.overflow===0&&(!r.pickup||r.pickup.display.overflow===0)));await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.rows.map(r=>({profile:r.profile,mode:r.mode,font:r.initial.font,cardHeight:r.initial.card.height,pickup:r.pickup?.actual})),null,2));
}catch(error){await writeFile(resolve(output,'failure.json'),JSON.stringify({message:error.message,report},null,2)+'\n');if(page)await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});throw error;}
finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));}
