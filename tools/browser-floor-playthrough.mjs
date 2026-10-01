/** 実際のpointerイベントで通す。位置・HPを書き換えず、経路は観測のみ。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
const rows=[];await mkdir('docs/verification/floor-challenge',{recursive:true});
try{for(const level of (process.env.PLAY_LEVEL?[process.env.PLAY_LEVEL]:['normal','easy'])){
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(level=>{Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});localStorage.setItem('corogalism-settings',JSON.stringify({mode:'pointer',challengeLevel:level,soundEnabled:true}));},level);
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto(base+'?debug=1&seed='+(process.env.PLAY_SEED||77));await p.waitForFunction(()=>!!window.__corogalism);
 const state=()=>p.evaluate(()=>window.__corogalism.state);
 const click=async id=>{await p.locator('#'+id).click();await p.clock.runFor(100);};
 const ready=async()=>{const s=await state();await p.clock.runFor(s.prepareMs+s.countdownMs+100);};
 await click('btn-challenge');await ready();
 for(let n=1;n<=Number(process.env.PLAY_STAGES||16);n++){
  let s=await state();assert.equal(s.stageIndex,n);
  const path=s.maze.path;let wp=1,steps=0,hit=0,lastHp=s.hp.value;
  const rect=await p.locator('#board').boundingBox();
  await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();
  while(s.status==='playing'&&steps<800){
   const a=s.actor,tg=path[wp],dx=tg.x+.5-a.x,dy=tg.y+.5-a.y,dist=Math.hypot(dx,dy);
   if(dist<.24&&wp<path.length-1){wp++;continue;}
   const ice=s.zones.some(z=>z.kind==='ice'&&z.cells.some(c=>c.x===Math.floor(a.x)&&c.y===Math.floor(a.y)));
   const target=Math.min(ice?1.35:1.7,dist*3.2),ux=dx/(dist||1),uy=dy/(dist||1);
   let x=(ux*target-a.vx)*.65,y=(uy*target-a.vy)*.65;
   // 反応は180msごと。時々少し斜めに入力して、理想操縦と区別する。
   if(steps%31===12){x+=.12;y-=.1;}
   const m=Math.max(1,Math.hypot(x,y));x/=m;y/=m;
   await p.mouse.move(rect.x+rect.width/2+x*rect.width*.49,rect.y+rect.height/2+y*rect.height*.49);
   await p.clock.runFor(180);s=await state();steps++;
   if(s.hp.value<lastHp)hit++;lastHp=s.hp.value;
   if([3,4,5,8,10].includes(n)&&steps===20)await p.screenshot({path:`docs/verification/floor-challenge/play-${level}-${n}.png`});
   if(n===2&&steps===8){await p.mouse.up();await click('btn-pause');await click('btn-pause-guide');await p.locator('.guide-x').click();assert.equal((await state()).paused,true);await click('btn-resume');await ready();await p.mouse.down();}
  }
  await p.mouse.up();rows.push({level,seed:Number(process.env.PLAY_SEED||77),stage:n,theme:s.theme.id,result:s.status,seconds:+(s.timeMs/1000).toFixed(2),limit:s.limitSec,hp:+s.hp.value.toFixed(1),maxHp:s.hp.max,damageEvents:hit});
  console.log(JSON.stringify(rows.at(-1)));
  assert.equal(s.status,'clear',JSON.stringify(rows.at(-1)));
  if(n===Number(process.env.PLAY_STAGES||16)){await click('btn-clear-exit');assert.equal((await state()).screen,'run-result');
   if(level==='easy')assert.equal(await p.locator('#flow-preview').isVisible(),true);
   await p.screenshot({path:`docs/verification/floor-challenge/result-${level}.png`});
  }else{await click('btn-next');await ready();}
 }
 assert.deepEqual(errors,[]);await p.close();
}}finally{await writeFile(`docs/verification/floor-challenge/browser-playthrough${process.env.TEST_SUFFIX||''}.json`,JSON.stringify(rows,null,2));await b.close()}
