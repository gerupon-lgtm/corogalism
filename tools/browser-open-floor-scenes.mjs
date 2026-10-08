/** 本編の生成・描画・床作用を3幅で診断。面送りや人間の成功率とは区別する。 */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=process.env.OPEN_SCENES_OUTPUT||'docs/verification/open-floor-pacing/v0622/scenes-local';
await mkdir(output,{recursive:true});const rows=[];
const version=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
try{
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install();await p.clock.pauseAt(Date.now()+1000);
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:8768/')+'?debug=1');await p.waitForLoadState('networkidle');await p.waitForFunction(()=>!!window.__corogalism,null,{polling:50});
 assert.equal(await p.locator('.badge').textContent(),'v'+version);
 for(const width of [320,412,576])for(const [size,themeId]of [[7,'sand'],[7,'iceRubber'],[13,'sand'],[13,'iceAssist'],[13,'rest'],[13,'sticky']]){
  await p.setViewportSize({width,height:width===576?1280:844});
  const row=await p.evaluate(async({size,themeId,version})=>{
   const {createStagePlay}=await import('/src/game/stagePlay.js'),{challengeDifficulty}=await import('/src/game/challenge.js');
   const {createRenderer}=await import('/src/render/canvasRenderer.js'),{createFixedCamera}=await import('/src/render/camera.js');
   const {BASE}=await import('/src/config/gameConfig.js'),{sampleZone}=await import('/src/world/stage.js');
   const {openRooms,openRoomAt}=await import('/src/world/openFloors.js');
   document.querySelector('#open-scene-proof')?.remove();const section=document.createElement('section');section.id='open-scene-proof';
   Object.assign(section.style,{position:'fixed',inset:'0',zIndex:9999,background:'#101a15',padding:'16px',overflow:'auto',display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'});
   const title=document.createElement('p');title.textContent=`配置診断 v${version}｜${size}×${size} ${themeId}`;section.append(title);
   const canvas=document.createElement('canvas');Object.assign(canvas.style,{width:'100%',maxWidth:'560px',border:'2px solid #c5aa75',borderRadius:'14px'});section.append(canvas);document.body.append(section);
   const play=createStagePlay(themeId==='iceRubber'?5:913,challengeDifficulty(themeId==='sand'?3:17,'easy'),{variation:{size,shape:'open',themeId}}),stage=play.stage;
   const side=q=>openRoomAt(stage.maze,q),rooms=openRooms(stage.maze).map(r=>r.id);
   const sand=stage.zones.filter(z=>z.kind==='sand').flatMap(z=>z.cells),fields=stage.zones.filter(z=>z.kind==='radial'),rests=[stage.rest,...stage.extraRests].filter(Boolean);
   const counts=rooms.map(room=>({room,sand:sand.filter(c=>side({x:c.x+.5,y:c.y+.5})===room).length,fields:fields.filter(sideField=>side(sideField)===room).length,rests:rests.filter(r=>side(r)===room).length,sticky:stage.sticky.filter(t=>side(t)===room).length}));
   const effects={};
   for(const room of rooms){
    const s=sand.find(c=>side({x:c.x+.5,y:c.y+.5})===room);
    if(s){const f=sampleZone(stage,{x:s.x+.5,y:s.y+.5,vx:2,vy:0});effects[`sand${room}`]=f.frictionK===3.2;}
    const z=fields.find(z=>side(z)===room);
    if(z){const f=sampleZone(stage,{x:z.x+.17,y:z.y,vx:0,vy:0});effects[`field${room}`]=Math.hypot(f.forceX,f.forceY)>.01;}
   }
   const advance=()=>play.advance({dt:1/60,elapsedMs:1000/60,tilt:{x:0,y:0},base:BASE});
   if(['rest','iceRubber'].includes(themeId)){
    const r=rests[0];play.hp.applyImpact(3,{materialId:'stone'},0);const hp=play.hp.value;play.teleport(r.x,r.y);
    for(let i=0;i<130;i++)advance();effects.rest=r.used&&play.hp.value>hp&&play.extendedSec===2;
   }
   if(stage.sticky.length){const t=stage.sticky[0];play.teleport(t.x,t.y);play.actor.vx=.5;advance();effects.sticky=Boolean(play.trap)&&play.actor.vx===0&&play.actor.vy===0;}
   play.teleport(.5,.5);const renderer=createRenderer(canvas),css=canvas.getBoundingClientRect().width;renderer.resize(css);const camera=createFixedCamera(stage,css);
   renderer.draw({stage,actor:play.actor,camera,now:0,animationActive:false});
   const note=document.createElement('p');note.style.fontSize='12px';note.textContent=counts.map(c=>`区画${c.room+1}:砂${c.sand}／力場${c.fields}／休憩${c.rests}／とりもち${c.sticky}`).join(' ｜ ');section.append(note);
   return {width:innerWidth,size,themeId,baffles:stage.maze.baffles,counts,effects,canvasCss:css};
  },{size,themeId,version});
  assert.ok(row.canvasCss>200);for(const value of Object.values(row.effects))assert.equal(value,true,JSON.stringify(row));
  if(themeId==='sand')assert.ok(row.counts.every(c=>c.sand>=4));if(themeId==='iceAssist')assert.ok(row.counts.every(c=>c.sand>=4&&c.fields>=2));if(['rest','iceRubber'].includes(themeId))assert.ok(row.counts.every(c=>c.rests>=1));if(themeId==='sticky')assert.ok(row.counts.every(c=>c.sticky>=2));
  await p.screenshot({path:`${output}/${width}-${size}-${themeId}.png`});rows.push(row);
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile(output+'/results.json',JSON.stringify(rows,null,2));await b.close();}
assert.equal(rows.length,18);console.log(`PASS ${rows.length} scenes`);
