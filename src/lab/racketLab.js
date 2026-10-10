import {BASE,TUNING} from '../config/gameConfig.js';
import {loadSettings} from '../record/storage.js';
import {getCharacter} from '../world/characters.js';
import {createActor,goalCenter} from '../world/stage.js';
import {getMaterial} from '../world/materials.js';
import {resolveParams} from '../physics/resolveParams.js';
import {createRacketStage,RACKET_DEFAULTS,RACKET_LAYOUTS} from './racketStage.js';
import {stepRacketPhysics} from './racketPhysics.js';
import {drawRackets} from './racketRender.js';
import {createRenderer} from '../render/canvasRenderer.js';
import {createFixedCamera} from '../render/camera.js';
import {createTiltVector} from '../input/tiltVector.js';
import {createPointerSource} from '../input/pointerSource.js';
import {createTiltSource} from '../input/tiltSource.js';
import {initPortraitLock} from '../input/portraitLock.js';
import {createBallMaterialAudio} from '../audio/ballMaterialAudio.js';
import {crossesGoal,haltMessage} from './exploration.js';

const $=id=>document.getElementById(id),canvas=$('board'),renderer=createRenderer(canvas),portrait=initPortraitLock();
const mainSettings=loadSettings();
const defaults={...RACKET_DEFAULTS,maxTiltAngleDeg:Number.isFinite(mainSettings.maxTiltAngleDeg)&&mainSettings.maxTiltAngleDeg>0?mainSettings.maxTiltAngleDeg:BASE.maxTiltAngleDeg};
const settings={...defaults},query=new URLSearchParams(location.search);
if(['baseline','cotton','rackets'].includes(query.get('mode')))settings.mode=query.get('mode');
if(Object.hasOwn(RACKET_LAYOUTS,query.get('layout')))settings.layout=query.get('layout');
if(query.has('cotton'))settings.cotton=query.get('cotton')!=='0';
for(const key of Object.keys(defaults))if(typeof defaults[key]==='number'&&query.has(key)){
  const value=Number(query.get(key));if(Number.isFinite(value)&&(key!=='maxTiltAngleDeg'||value>0))settings[key]=value;
}
let stage=createRacketStage(settings),actor=createActor(stage.maze,getCharacter('default')),camera;
const tilt=createTiltVector(),pointer=createPointerSource(canvas),sound=createBallMaterialAudio(),flashes=new Map();
let mode='pointer',paused=false,last=0,requestId=0,sensorTimer=null,lastResult=null,lastHalt=null;
let elapsedSec=0,racketHits=0,goalReached=false,started=false,trialEdited=false;
const observations=[],completions=[];
const receive=(x,y)=>{if(!paused&&!goalReached&&!document.hidden)tilt.setRaw(x,y);};
const sensor=createTiltSource({canCalibrate:()=>!paused&&!document.hidden,onCalibrated:()=>{$('status').textContent='傾き操作中。球と動く壁が同じ傾きで動きます。';}});
sound.setVolume(.6);sound.setEnabled(mainSettings.soundEnabled!==false);
function gesture(){sound.unlock();portrait.requestOnStart();}
function resize(){const size=renderer.resize(canvas.parentElement.clientWidth);camera=createFixedCamera(stage,size);}
const bindings={'racket-speed':'racketSpeed','racket-restitution':'racketRestitution','aim-angle':'aimAngleDeg','motion-transfer':'motionTransfer','ball-tilt':'ballTilt','speed-limit':'speedLimit','cotton-restitution':'cottonRestitution','max-tilt':'maxTiltAngleDeg'};
function refresh(){
  $('scenario').value=settings.mode;$('layout').value=settings.layout;$('mix-cotton').checked=settings.cotton;
  $('cotton-choice').hidden=settings.mode!=='rackets';
  const puzzle=['sequence','timing'].includes(settings.layout);
  $('scenario').querySelector('option[value="rackets"]').textContent=puzzle?'氷＋動く壁＋綿':'氷＋ラケット＋綿';
  $('motion-note').textContent=puzzle?'通路の壁はぶつかると普通にはね返します。端の角度と壁の動きを乗せる倍率は、ラケットの打ち分け用です。':'球は本編と同じビー玉・氷・ゴムの設定。ラケットを使わなくてもゴールできます。';
  $('hint').textContent=puzzle
    ?settings.mode==='rackets'?(settings.layout==='sequence'
      ?'①を下へ逃がして右の部屋へ。②を左へどかして下へ。白い綿で球を落ち着かせられます。'
      :'右へ助走すると、壁も右へ動いて入口をふさぎます。左下へ切り返して、滑る球を開いた通路へ。')
      :'動く壁を外した同じ通路で、球の動きを比べられます。綿の有無も切り替えてみよう。'
    :settings.mode==='rackets'
    ?'紫の縦ラケットは上下、横ラケットは左右へ。中心でまっすぐ、端で斜めに。'+(settings.layout==='relay'?'下から打ち返して、内側のカップを狙おう。':'綿で受け止めて狙い直せます。')
    :settings.mode==='cotton'?'白い綿は勢いを受け止めます。斜めに当てると壁沿いに滑り、傾けるとまた動けます。':'本編と同じビー玉・氷・ゴムの動き。'+(settings.layout==='relay'?'カップの入口は下側。折り返して導いてみよう。':'右下のカップまで、傾きで導いてみよう。');
  for(const [id,key]of Object.entries(bindings))$(id).value=settings[key];
  const cotton=stage.walls.find(w=>w.materialId==='cotton');
  const cottonBounce=cotton?resolveParams({base:BASE,character:actor.character,material:{...getMaterial('cotton'),...cotton.physicsMaterial}}).restitution:null;
  $('settings-note').textContent=`ゴムの反発0.9／氷の減速0.2。${cotton?'綿の実効反発'+cottonBounce+'（本編の壁上限0.7）。':''}速度の上限 ${settings.speedLimit>0?settings.speedLimit+'マス／秒':'なし'}は、本編と同じく加速・減速後に適用します。傾き感度は本編の保存設定から開始します。`;
  $('sound').textContent=sound.state.enabled?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(sound.state.enabled));
  $('pause').textContent=paused?'再開':'一時停止';$('pause-label').hidden=!paused||goalReached;
  $('pause').disabled=goalReached;
  $('elapsed').textContent=elapsedSec.toFixed(2);$('racket-hits').textContent=racketHits;$('speed').textContent=Math.hypot(actor.vx,actor.vy).toFixed(1);
  $('sound-note').hidden=!sound.state.failed;
}
function pointerMode(message='画面操作：押した方向へ球と動く壁が動きます。離すと壁は止まり、球は滑ります。'){
  requestId++;clearTimeout(sensorTimer);sensor.stop();pointer.stop();tilt.reset();mode='pointer';pointer.start(receive);
  $('sensor').hidden=false;$('pointer').hidden=true;$('calibrate').hidden=true;$('status').textContent=message;
}
function pause(value){
  paused=value;tilt.reset();sound.setHidden(value||document.hidden);last=0;
  if(!value&&lastHalt){lastHalt=null;$('status').textContent='再開しました。設定を変えて、動きを比べてみよう。';}
  refresh();
}
function reset(){
  const fresh=createRacketStage(settings);stage=fresh;actor=createActor(stage.maze,getCharacter('default'));
  tilt.reset();sound.stop();flashes.clear();elapsedSec=0;racketHits=0;goalReached=false;started=false;trialEdited=false;lastResult=null;lastHalt=null;last=0;
  resize();refresh();$('status').textContent=paused?'スタートへ戻しました。「再開」で試せます。':'球が動き始めると計測。ラケットを使った時の抜けやすさも比べてみよう。';
}
function rebuild(){
  if(goalReached){reset();$('status').textContent=paused?'設定を切り替え、スタートへ戻しました。「再開」で試せます。':'設定を切り替え、スタートへ戻しました。球が動き始めると計測します。';return;}
  const previous=stage.rackets,candidate=createRacketStage(settings);
  for(const w of candidate.rackets){
    const old=previous.find(p=>p.id===w.id);if(old)w[w.axis]=Math.max(w.min,Math.min(w.max,old[w.axis]));
    // 円の球を四角として判定すると、角の近くの安全な配置まで除外してしまう。
    const overlaps=()=>Math.hypot(actor.x-Math.max(w.x,Math.min(actor.x,w.x+w.w)),actor.y-Math.max(w.y,Math.min(actor.y,w.y+w.h)))<actor.r-1e-9;
    if(overlaps()){for(const position of [w.min,w.max]){w[w.axis]=position;if(!overlaps())break;}}
    if(overlaps()){
      // レール全体を球がふさぐ場合、設定切替で球を押し出さず、以前の条件を保つ。
      Object.assign(settings,stage.racketSettings);refresh();
      $('status').textContent='球が通路の中にいるため、動く壁を置けません。球を少し移動してから切り替えるか、「スタートへ」で戻して試せます。';
      return;
    }
  }
  stage=candidate;
  trialEdited=true;lastHalt=null;last=0;sound.stop();resize();refresh();
  $('status').textContent='位置と勢いを保って切り替えました。時間を比べる時は「スタートへ」で揃えられます。';
}
function simulate(dt){
  tilt.update(dt,BASE.inputSmoothing);
  let crossed=false;
  const goal=goalCenter(stage.maze);
  lastResult=stepRacketPhysics({actor,stage,tilt:tilt.value,base:BASE,dt,settings,
    onImpact:(speed,w)=>{sound.impact('default',speed,w.materialId==='racket'?'rubber':w.materialId);if(w.materialId==='racket')flashes.set(w.id,performance.now());},
    onTravel:(from,to)=>{if(crossesGoal(from,to,goal.x,goal.y,TUNING.goalRadius))crossed=true;}});
  racketHits+=lastResult.racketHits??0;
  if(!started&&(Math.hypot(actor.vx,actor.vy)>TUNING.startMoveSpeed||Math.hypot(actor.x-(stage.maze.start.x+.5),actor.y-(stage.maze.start.y+.5))>.02))started=true;
  if(started)elapsedSec+=dt;
  if(lastResult.halt){
    lastHalt=lastResult.halt;observations.push({settings:{...settings},actor:{x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy},halt:lastHalt});
    pause(true);$('status').textContent=haltMessage(lastHalt);
  }else if(!goalReached&&(crossed||Math.hypot(actor.x-goal.x,actor.y-goal.y)<TUNING.goalRadius)){
    goalReached=true;tilt.reset();sound.stop();completions.push({settings:{...settings},elapsedSec,racketHits,edited:trialEdited});
    $('status').textContent=`ゴール！ ${elapsedSec.toFixed(2)}秒 · 返球${racketHits}回。${trialEdited?'途中で設定変更あり。':''}「スタートへ」で同じ条件をもう一度。`;
    refresh();
  }
  return lastResult;
}
$('scenario').onchange=()=>{gesture();settings.mode=$('scenario').value;rebuild();};
$('layout').onchange=()=>{gesture();settings.layout=$('layout').value;reset();};
$('mix-cotton').onchange=()=>{gesture();settings.cotton=$('mix-cotton').checked;rebuild();};
$('reset').onclick=()=>{gesture();reset();};$('pause').onclick=()=>{gesture();pause(!paused);};
$('sound').onclick=()=>{sound.unlock();sound.setEnabled(!sound.state.enabled);refresh();};
for(const [id,key]of Object.entries(bindings))$(id).oninput=()=>{
  if(!$(id).value.trim())return;const value=Number($(id).value);
  if(!Number.isFinite(value)||(key==='maxTiltAngleDeg'&&value<=0)){$('settings-note').textContent='数値を確認してください。傾きの角度は0より大きい値で試せます。';return;}
  settings[key]=value;rebuild();
};
$('defaults').onclick=()=>{gesture();Object.assign(settings,defaults);reset();};
$('copy').onclick=async()=>{
  const data={page:'corogalism-racket-lab',revision:3,version:'0.6.30',...settings,mode:settings.mode,inputMode:mode,elapsedSec,racketHits,goalReached,edited:trialEdited,completions,observations};
  const text=JSON.stringify(data,null,2);$('settings-text').hidden=false;$('settings-text').value=text;
  try{await navigator.clipboard.writeText(text);$('copy-status').textContent='設定と試遊結果をコピーしました。';}catch{$('settings-text').select();$('copy-status').textContent='下の設定を選択してコピーしてください。';}
};
$('pointer').onclick=()=>{gesture();trialEdited=started||trialEdited;pointerMode();};
$('sensor').onclick=async()=>{
  sound.unlock();const id=++requestId;$('sensor').disabled=true;
  const permission=await sensor.requestPermission();if(id!==requestId){$('sensor').disabled=false;return;}
  portrait.requestOnStart();$('sensor').disabled=false;
  if(permission==='denied'||permission==='unsupported'){pointerMode(permission==='denied'?'傾きの許可が得られませんでした。画面操作で遊べます。':'傾きセンサーが使えません。画面操作で遊べます。');return;}
  pointer.stop();tilt.reset();mode='tilt';trialEdited=started||trialEdited;sensor.calibrate();sensor.start(receive,()=>settings.maxTiltAngleDeg);
  $('sensor').hidden=true;$('pointer').hidden=false;$('calibrate').hidden=false;$('status').textContent='遊ぶ姿勢で端末を静かに持ってください。傾きの基準を合わせます。';
  clearTimeout(sensorTimer);sensorTimer=setTimeout(()=>{if(mode==='tilt'&&(!sensor.receiving||sensor.needsCalibration))pointerMode('傾きの基準を取得できませんでした。画面操作で遊べます。');},6000);
};
$('calibrate').onclick=()=>{
  gesture();tilt.reset();sensor.calibrate();$('status').textContent='遊ぶ姿勢で静かに持ってください。基準を取り直します。';
  clearTimeout(sensorTimer);sensorTimer=setTimeout(()=>{if(mode==='tilt'&&sensor.needsCalibration)pointerMode('基準を取得できませんでした。画面操作で遊べます。');},6000);
};
canvas.addEventListener('pointerdown',gesture);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);else last=0;});
window.addEventListener('blur',()=>pause(true));new ResizeObserver(resize).observe(canvas.parentElement);
function frame(now){
  const dt=Math.min(TUNING.maxDt,Math.max(0,(now-(last||now))/1000));last=now;
  const active=!paused&&!goalReached&&!document.hidden&&!(mode==='tilt'&&sensor.needsCalibration);
  if(active&&dt>0){simulate(dt);if(!paused&&!goalReached)sound.rolling('default','ice',Math.hypot(actor.vx,actor.vy));}else sound.stop();
  if(camera)renderer.draw({stage,actor,camera,now,status:goalReached?'clear':'playing',pointerTilt:mode==='pointer'&&active?tilt.value:null,animationActive:active,
    drawExtras:(ctx,cam)=>drawRackets(ctx,cam,stage,flashes,now)});
  $('elapsed').textContent=elapsedSec.toFixed(2);$('racket-hits').textContent=racketHits;$('speed').textContent=Math.hypot(actor.vx,actor.vy).toFixed(1);$('sound-note').hidden=!sound.state.failed;
  requestAnimationFrame(frame);
}
pointerMode();resize();refresh();requestAnimationFrame(frame);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
if(query.has('debug'))window.__racketLab={
  get state(){return {stage,actor,rackets:stage.rackets,settings:{...settings},mode,paused,needsCalibration:sensor.needsCalibration,sound:sound.state,lastResult,lastHalt,elapsedSec,goalReached,racketHits};},
  teleport(x,y,vx=0,vy=0){Object.assign(actor,{x,y,vx,vy});tilt.reset();goalReached=false;started=false;lastHalt=null;last=0;},
  setTilt(x,y){tilt.setRaw(x,y);},advance(dt){return simulate(dt);},reset,
};
