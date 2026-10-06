/** 実ブラウザの2D領域を初期化し、復元通知後の倍率・静止画・残像を比較する。
 * reset + contextrestored は復元状態の模擬であり、実機での発生契機の再現ではない。 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const output=process.env.RENDER_OUTPUT||'docs/verification/render-recovery/local';
await mkdir(output,{recursive:true});
const rows=[],failures=[],noSignalDiagnostics=[];
try{
 for(const dpr of (process.env.RENDER_DPRS||'1,2.625,3').split(',').map(Number)){
  const page=await browser.newPage({viewport:{width:576,height:1280},deviceScaleFactor:dpr,serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.RENDER_BEFORE==='1'||process.env.RENDER_BASELINE_REF)for(const file of ['canvasRenderer','toyBall','floorVisuals']){
   const source=execFileSync('git',['-c','safe.directory=C:/Users/user/Documents/AI連携ゲーム/corogalism','show',(process.env.RENDER_BASELINE_REF||'c542f38')+':src/render/'+file+'.js'],{encoding:'utf8'});
   await page.route('**/src/render/'+file+'.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
  }
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:8768/')+'?debug=1');
  await page.waitForLoadState('networkidle');
  for(const n of (process.env.RENDER_STAGES||'3,4,5,8,12').split(',').map(Number))for(const target of ['none','main','floor','walls','ball','all','silent-all']){
   const variation=process.env.RENDER_VARIETY==='1'?({3:{size:13,shape:'open'},4:{size:11,shape:'intricate'},5:{size:9,shape:'roomy'},8:{size:7,shape:'short'},12:{size:13,shape:'open',themeId:'trial'}}[n]):undefined;
   const row=await page.evaluate(async({n,target,variation})=>{
    const {createRenderer}=await import('/src/render/canvasRenderer.js');
    const {createStagePlay}=await import('/src/game/stagePlay.js');
    const {challengeDifficulty}=await import('/src/game/challenge.js');
    const {stageSeed}=await import('/src/game/run.js');
    const {createFixedCamera}=await import('/src/render/camera.js');
    const canvases=[],original=document.createElement;
    document.createElement=function(tag,...args){const el=original.call(this,tag,...args);if(tag==='canvas')canvases.push(el);return el};
    let canvas,renderer;
    try{canvas=document.createElement('canvas');renderer=createRenderer(canvas)}finally{document.createElement=original}
    const play=createStagePlay(stageSeed(77,n),challengeDifficulty(n,'easy'),{variation});
    renderer.resize(528);const camera=createFixedCamera(play.stage,528);
    const args={stage:play.stage,actor:play.actor,camera,animationActive:false,now:0};
    const ctx=canvas.getContext('2d'),pixels=()=>new Uint8ClampedArray(ctx.getImageData(0,0,canvas.width,canvas.height).data);
    // 初回の画像読み出しでChromeが描画方式を切り替えるため、比較前に揃える。
    renderer.draw(args);pixels();renderer.draw(args);const before=pixels(),matrixBefore=ctx.getTransform().a;
    document.querySelector('#recovery-proof')?.remove();canvas.id='recovery-proof';
    Object.assign(canvas.style,{position:'fixed',left:'20px',top:'360px',zIndex:999,background:'#24362e',border:'3px solid #baa579'});
    document.body.append(canvas);
    const index={none:[],main:[0],floor:[1],walls:[2],ball:[3],all:[0,1,2,3],'silent-all':[0,1,2,3]}[target];
    for(const i of index){
     if(target!=='silent-all')canvases[i].dispatchEvent(new Event('contextlost'));
     canvases[i].getContext('2d').reset();
     if(target!=='silent-all')canvases[i].dispatchEvent(new Event('contextrestored'));
    }
    renderer.resize(528); // 画面サイズが変わらない復元
    renderer.draw(args);const after=pixels();
    let different=0,transparent=0,maxChannelDelta=0;
    for(let i=0;i<before.length;i+=4){const delta=Math.max(Math.abs(before[i]-after[i]),Math.abs(before[i+1]-after[i+1]),Math.abs(before[i+2]-after[i+2]),Math.abs(before[i+3]-after[i+3]));if(delta)different++;maxChannelDelta=Math.max(maxChannelDelta,delta);if(after[i+3]!==255)transparent++}
    // 一旦移動して戻す。同じ盤面が描かれれば以前の球の位置に残像は残らない。
    const initial={x:play.actor.x,y:play.actor.y};
    for(let step=0;step<8;step++){play.actor.x=initial.x+step*.3;play.actor.y=initial.y+step*.2;renderer.draw(args)}
    Object.assign(play.actor,initial);renderer.draw(args);const final=pixels();let trailDifferent=0,trailMaxChannelDelta=0;
    const at=camera.toScreen(initial.x,initial.y),scale=matrixBefore,ballRadius=camera.toPx(play.actor.r)*1.5*scale;
    for(let i=0;i<before.length;i+=4){const px=i/4%canvas.width,py=Math.floor(i/4/canvas.width);if(Math.hypot(px-at.px*scale,py-at.py*scale)>ballRadius){const delta=Math.max(Math.abs(before[i]-final[i]),Math.abs(before[i+1]-final[i+1]),Math.abs(before[i+2]-final[i+2]),Math.abs(before[i+3]-final[i+3]));if(delta)trailDifferent++;trailMaxChannelDelta=Math.max(trailMaxChannelDelta,delta);}}
    return {stage:n,size:play.stage.maze.size,shape:play.stage.maze.variation?.shape,theme:play.stage.theme.id,target,dpr:window.devicePixelRatio,matrixBefore,matrixAfter:ctx.getTransform().a,different,maxChannelDelta,transparent,trailDifferent,trailMaxChannelDelta,width:canvas.width};
   },{n,target,variation});
   row.observable=target!=='silent-all'||dpr!==1;
   // 可変盤面では旧版でも同じ最大12画素・1/255の丸め差が出ることを比較済み。
   // opt-inの時だけ小差を記録しつつ許容。倍率・透明化・大きな残像は厳密に検出する。
   const tolerance=Number(process.env.RENDER_PIXEL_TOLERANCE||0),pixelLimit=tolerance?32:0;
   row.recovered=row.maxChannelDelta<=tolerance&&row.trailMaxChannelDelta<=tolerance&&row.different<=pixelLimit&&row.trailDifferent<=pixelLimit&&!row.transparent&&row.matrixAfter===row.matrixBefore;
   rows.push(row);
   if(n===12&&dpr===2.625&&target==='all')await page.screenshot({path:output+'/easy-12-restored.png'});
   // silent-all at DPR1 has no state-change signal: not a browser restoration event.
   if(row.observable){if(!row.recovered)failures.push(row)}else noSignalDiagnostics.push(row);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await writeFile(output+'/recovery.json',JSON.stringify({rows,failures,noSignalDiagnostics},null,2));await browser.close()}
console.log(JSON.stringify({cases:rows.length,checked:rows.length-noSignalDiagnostics.length,noSignalDiagnostics:noSignalDiagnostics.length,failures:failures.length,first:failures[0]},null,2));
assert.equal(failures.length,0,'復元後は同じ倍率で盤面全体と球を描き直す');
