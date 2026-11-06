/** Actual browser UI, real pickup and pointer movement. Teleports only accelerate stage/fixture placement. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/user/Documents/AI連携ゲーム/.codex-browser/node_modules/playwright/index.mjs');
let base=process.env.BASE_URL,server;
const output=resolve(process.env.TUTORIAL_OUTPUT||'docs/verification/v0.8.18/tutorial-local');
if(!base){const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.wav':'audio/wav','.webmanifest':'application/manifest+json'};server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname,f=resolve(root,'.'+decodeURIComponent(p)+(p.endsWith('/')?'index.html':''));if(!f.startsWith(root))throw Error('path');const data=await readFile(f);res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream','cache-control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/`;}
const report={base,rows:[],errors:[],boundary:'pointer input plus debug teleports to reduce travel; not human comprehension or device evidence'};
let browser,page;
const ready=()=>page.waitForFunction(()=>{const s=window.__corogalism?.state;return s?.screen==='game'&&s.countdownMs===0&&s.prepareMs===0;});
const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
async function layout(){return page.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right};};const panel=document.querySelector('#tutorial-lesson'),pr=r(panel);return {overflow:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,board:r(document.querySelector('#board')),lesson:pr,text:[...panel.querySelectorAll('h2,.tutorial-copy,.tutorial-hint,.tutorial-example,.tutorial-review')].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none').map(e=>({class:e.className,text:e.textContent,...r(e)})),title:panel.querySelector('h2').textContent};});}
async function finish(){await page.evaluate(()=>{const c=window.__corogalism,g=c.state.goal;c.teleport(g.x,g.y);});await page.waitForFunction(()=>window.__corogalism.state.screen==='clear');await page.waitForFunction(()=>!document.querySelector('#btn-next').disabled);}
try{
 await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const p of [{id:'393x740',width:393,height:740},{id:'360x740',width:360,height:740},{id:'390x700',width:390,height:700},{id:'320x700',width:320,height:700},{id:'reduced',width:393,height:740,reducedMotion:'reduce'}]){
  const context=await browser.newContext({viewport:{width:p.width,height:p.height},serviceWorkers:'block',reducedMotion:p.reducedMotion||'no-preference'});
  await context.addInitScript(()=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});Element.prototype.requestFullscreen=()=>Promise.reject(Error('fixture'));localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',soundEnabled:false,challengeLevel:'easy'}));});
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'?debug=1&seed=77');await page.waitForFunction(()=>!!window.__corogalism);
  await page.locator('#btn-tutorial').click();await settle();const introOverflow=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);assert.equal(introOverflow,0,`${p.id} intro overflow`);await page.screenshot({path:resolve(output,`${p.id}-intro.png`)});
  await page.locator('#btn-tutorial-start').click();await ready();await settle();const stages=[];
  for(let step=0;step<3;step++){
   const row=await layout();stages.push(row);await page.screenshot({path:resolve(output,`${p.id}-${step+1}.png`)});
   assert.equal(row.overflow,0,`${p.id}/${step+1} scroll`);assert.equal(row.horizontal,0);
   for(const t of row.text)assert.ok(t.x>=row.lesson.x-1&&t.right<=row.lesson.right+1&&t.y>=row.lesson.y-1&&t.bottom<=row.lesson.bottom+1,`${p.id}/${step+1} text outside: ${JSON.stringify(t)}`);
   assert.ok(row.board.width>=240);assert.match(await page.locator('#mode-card-title').textContent(),new RegExp(`${step+1} / 3`));
   if(step===0){
    assert.match(row.title,/ころがして/);assert.match(await page.locator('.tutorial-hint').textContent(),/少し.*傾け/);
    if(p.id==='393x740'){
     const s=await page.evaluate(()=>window.__corogalism.state),b=await page.locator('#board').boundingBox();await page.mouse.move(b.x+b.width*.8,b.y+b.height*.5);await page.mouse.down();await page.waitForFunction(x=>window.__corogalism.state.actor.x>x+.2,s.actor.x);await page.waitForFunction(()=>window.__corogalism.state.wallHits>0);await page.mouse.up();
     await page.waitForFunction(()=>document.querySelector('#tutorial-lesson').dataset.lesson==='default');
     await page.evaluate(()=>{const c=window.__corogalism;c.teleport(2.5,1.5);});
     await page.waitForFunction(()=>document.querySelector('#tutorial-lesson').dataset.lesson==='sand');
     await page.locator('#btn-tutorial-prev').click();assert.equal(await page.locator('#tutorial-lesson').getAttribute('data-lesson'),'default');await page.locator('#btn-tutorial-next').click();assert.equal(await page.locator('#tutorial-lesson').getAttribute('data-lesson'),'sand');
     await page.locator('#btn-tutorial-demo').click();await page.locator('#btn-pause').click();const hash=()=>page.locator('#tutorial-lesson canvas').evaluate(c=>c.toDataURL());const before=await hash();await page.waitForTimeout(600);assert.equal(await hash(),before);await page.locator('#btn-resume').click();await ready();await page.screenshot({path:resolve(output,'material-sand.png')});
    }
   }
   if(step===1&&p.id==='393x740'){
    const wall=await page.evaluate(()=>window.__corogalism.state.rackets.find(w=>w.h>w.w));
    await page.evaluate(w=>window.__corogalism.teleport(w.x-.375,w.y+w.h/2),wall);
    const b=await page.locator('#board').boundingBox();await page.mouse.move(b.x+b.width*.8,b.y+b.height*.5);await page.mouse.down();
    await page.waitForFunction(()=>document.querySelector('.tutorial-feedback').textContent.includes('打ち返せた'));await page.mouse.up();await page.screenshot({path:resolve(output,'racket-return.png')});
   }
   await finish();assert.match(await page.locator('#clear-heading').textContent(),/できた/);await page.locator('#btn-next').click();if(step<2)await ready();else await page.waitForFunction(()=>window.__corogalism.state.screen==='mode');
  }
  report.rows.push({profile:p.id,introOverflow,stages});await context.close();
 }
 assert.deepEqual(report.errors,[]);await writeFile(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS tutorial: five viewports/settings, three lessons, review, pause, real pointer movement');
}catch(e){await writeFile(resolve(output,'failure.json'),JSON.stringify({message:e.message,report},null,2)+'\n');if(page)await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});throw e;}
finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
