import {BALL_MATERIALS,getBallMaterial} from '../world/ballMaterials.js';
import {createBallLabStage,BALL_LAB_FLOORS,BALL_LAB_WALLS} from './ballLabStage.js';
import {createActor} from '../world/stage.js';
import {BASE,FLOOR_CHALLENGE} from '../config/gameConfig.js';
import {getMaterial} from '../world/materials.js';
import {applyExploration,describeExploration,haltMessage,crossesGoal} from './exploration.js';
import {stepPhysics} from '../physics/integrator.js';
import {createRenderer} from '../render/canvasRenderer.js';
import {createToyBall} from '../render/toyBall.js';
import {createFixedCamera} from '../render/camera.js';
import {createTiltVector} from '../input/tiltVector.js';
import {createPointerSource} from '../input/pointerSource.js';
import {createTiltSource} from '../input/tiltSource.js';
import {initPortraitLock} from '../input/portraitLock.js';
import {createBallMaterialAudio} from '../audio/ballMaterialAudio.js';

const $=id=>document.getElementById(id),canvas=$('board'),renderer=createRenderer(canvas),portrait=initPortraitLock();
const defaultFloors={ice:FLOOR_CHALLENGE.ice,sand:FLOOR_CHALLENGE.sand,force:FLOOR_CHALLENGE.assistForce,radius:FLOOR_CHALLENGE.radius};
const settings={ball:'metal',layout:'plaza',floor:'normal',wall:'default',physics:'explore',settleBounce:false,floorValues:{...defaultFloors},ballValues:{},wallValues:{}},tilt=createTiltVector(),sound=createBallMaterialAudio();
let stage=createBallLabStage(settings),actor=createActor(stage.maze,getBallMaterial(settings.ball)),camera,paused=false,last=0,mode='pointer',requestId=0,sensorTimer=null;
const observations=[];let lastHalt=null;
applyExploration(stage,settings.physics,settings.settleBounce);
let goalInside=false;
const receive=(x,y)=>{if(!paused&&!document.hidden)tilt.setRaw(x,y)};
const pointer=createPointerSource(canvas);
const sensor=createTiltSource({canCalibrate:()=>!paused&&!document.hidden,onCalibrated:()=>{$('status').textContent='傾き操作中。ゆっくり傾けて動きを試そう。'}});
function gesture(){sound.unlock();portrait.requestOnStart();}
function pointerMode(message='画面操作：盤面の中心から進みたい方向を押し続けてください。'){
 requestId++;clearTimeout(sensorTimer);sensor.stop();pointer.stop();tilt.reset();mode='pointer';pointer.start(receive);
 $('sensor').hidden=false;$('pointer').hidden=true;$('calibrate').hidden=true;$('status').textContent=message;
}
function pause(value){paused=value;tilt.reset();sound.setHidden(value||document.hidden);$('pause').textContent=value?'再開':'一時停止';$('pause-label').hidden=!value;last=0;if(!value){lastHalt=null;$('status').textContent='再開しました。今の素材・床・壁で動きを比べてみよう。';}}
function reset(x=.5,y=.5){Object.assign(actor,{x,y,vx:0,vy:0});tilt.reset();sound.stop();goalInside=false;last=0;lastHalt=null;$('status').textContent=paused?'位置と速さを戻しました。「再開」で今の組み合わせを試せます。':'位置と速さを戻しました。今の組み合わせで動きを試せます。';}
function resize(){const size=renderer.resize(canvas.parentElement.getBoundingClientRect().width);camera=createFixedCamera(stage,size);}
function refresh(){
 $('hint').textContent=settings.ballValues[settings.ball]?'この素材の数値を調整中。ほかの床や壁でも動きを比べてみよう。':settings.ball==='superball'&&!settings.settleBounce?'勢いを残して弾む。壁と床を組み合わせて、跳ね方の違いを試そう。':getBallMaterial(settings.ball).hint;
 for(const button of $('balls').children)button.setAttribute('aria-pressed',String(button.dataset.ball===settings.ball));
 $('test-area').hidden=!['gravity','repulsion','mixed'].includes(settings.floor);
 $('physics-readout').textContent=describeExploration(actor,stage);
 $('physics').value=settings.physics;$('settle').checked=settings.settleBounce;
 for(const key of ['accelK','frictionK','restitutionK','fieldK'])$('ball-'+key).value=actor.character[key]??1;
 for(const key of Object.keys(defaultFloors))$('floor-'+key).value=settings.floorValues[key];
 $('wall-restitution').value=settings.wallValues[settings.wall]??getMaterial(settings.wall).restitutionK;
}
function change(key,value){
 gesture();settings[key]=value;
 if(key==='ball'){
  actor.character={...getBallMaterial(value),...settings.ballValues[value]};actor.r=actor.character.sizeRatio/2;
 }else{stage=createBallLabStage(settings);if(key==='layout')reset();resize();}
 applyExploration(stage,settings.physics,settings.settleBounce);
 sound.stop();refresh();
}
for(const [id,ball]of Object.entries(BALL_MATERIALS)){
 const button=document.createElement('button');button.dataset.ball=id;button.type='button';
 const preview=document.createElement('canvas');preview.width=preview.height=64;preview.setAttribute('aria-hidden','true');
 const painter=createToyBall();painter.update({character:ball,x:0,y:0,r:.275});painter.draw(preview.getContext('2d'),32,30,24);
 const label=document.createElement('span');label.textContent=ball.name;button.append(preview,label);button.onclick=()=>change('ball',id);$('balls').append(button);
}
for(const [id,options]of [['floor',BALL_LAB_FLOORS],['wall',BALL_LAB_WALLS]])for(const [value,label]of Object.entries(options)){
 const option=document.createElement('option');option.value=value;option.textContent=label;$(id).append(option);
}
for(const id of ['floor','wall','layout'])$(id).onchange=()=>change(id,$(id).value);
$('physics').onchange=()=>{settings.settleBounce=$('physics').value==='legacy';change('physics',$('physics').value);};
$('settle').onchange=()=>{settings.settleBounce=$('settle').checked;applyExploration(stage,settings.physics,settings.settleBounce);refresh();};
function numericInput(id,apply,positive=false){$(id).oninput=()=>{
 const value=$(id).valueAsNumber;
 if(!Number.isFinite(value)||(positive&&value<=0)){$('input-note').textContent=positive?'範囲は0より大きい数値を入力してください。':'計算できる数値を入力してください。';return;}
 $('input-note').textContent='入力した数値を保存しました。「組み合わせのまま」で上限なしの動きを試せます。';apply(value);refresh();
};}
for(const key of ['accelK','frictionK','restitutionK','fieldK'])numericInput('ball-'+key,value=>{
 (settings.ballValues[settings.ball]??={})[key]=value;actor.character={...getBallMaterial(settings.ball),...settings.ballValues[settings.ball]};sound.stop();
});
for(const key of Object.keys(defaultFloors))numericInput('floor-'+key,value=>{settings.floorValues[key]=value;change('floor',settings.floor);},key==='radius');
numericInput('wall-restitution',value=>{settings.wallValues[settings.wall]=value;change('wall',settings.wall);});
$('material-defaults').onclick=()=>{settings.ballValues={};settings.wallValues={};settings.floorValues={...defaultFloors};change('ball',settings.ball);change('floor',settings.floor);reset();$('input-note').textContent='動きの数値を初期値に戻しました。';};
$('sound').onclick=()=>{const enabled=!sound.state.enabled;sound.setEnabled(enabled);$('sound').textContent=enabled?'音ON':'音OFF';$('sound').setAttribute('aria-pressed',String(enabled));};
$('volume').oninput=()=>{gesture();sound.setVolume(Number($('volume').value));$('volume-value').textContent=Math.round(sound.state.volume*100)+'%'};
$('reset').onclick=()=>{gesture();reset();};
$('test-area').onclick=()=>{gesture();reset(3.1,.5);};
$('pause').onclick=()=>{gesture();pause(!paused);};
$('pointer').onclick=()=>{gesture();pointerMode()};
$('sensor').onclick=async()=>{
 const id=++requestId,pending=sensor.requestPermission();gesture();const permission=await pending;
 if(id!==requestId)return;
 if(['denied','unsupported'].includes(permission)){pointerMode('センサーを利用できないため、画面操作で遊べます。');return;}
 pointer.stop();tilt.reset();mode='tilt';sensor.calibrate();sensor.start(receive,()=>BASE.maxTiltAngleDeg);
 $('sensor').hidden=true;$('pointer').hidden=false;$('calibrate').hidden=false;$('status').textContent='縦持ちで楽に構え、少し静止してください。';
 clearTimeout(sensorTimer);sensorTimer=setTimeout(()=>{if(id===requestId&&sensor.needsCalibration)pointerMode('傾きを確認できなかったため、画面操作に切り替えました。');},6000);
};
$('calibrate').onclick=()=>{gesture();sensor.calibrate();tilt.reset();clearTimeout(sensorTimer);const id=requestId;sensorTimer=setTimeout(()=>{if(id===requestId&&sensor.needsCalibration)pointerMode('傾きを確認できなかったため、画面操作に切り替えました。');},6000);$('status').textContent='遊ぶ姿勢で少し静止してください。';};
canvas.addEventListener('pointerdown',gesture);
$('copy').onclick=async()=>{
 const text=JSON.stringify({page:'corogalism-ball-lab',revision:7,...settings,mode,sound:sound.state.enabled,volume:sound.state.volume,observations},null,2);
 $('settings-text').hidden=false;$('settings-text').value=text;
 try{await navigator.clipboard.writeText(text);$('copy-status').textContent='コピーしました。設定と感想を送ってください。';}
 catch{$('settings-text').focus();$('settings-text').select();$('copy-status').textContent='設定を選択してコピーしてください。';}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);else last=0;});
window.addEventListener('blur',()=>pause(true));
new ResizeObserver(resize).observe(canvas.parentElement);
function frame(now){
 const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
 const active=!paused&&!document.hidden&&!(mode==='tilt'&&sensor.needsCalibration);
 if(active){
  const count=Math.max(1,Math.ceil(dt*120));
  let goalCrossed=false;
  for(let i=0;i<count;i++){
   tilt.update(dt/count,BASE.inputSmoothing);
   const result=stepPhysics({actor,stage,tilt:tilt.value,base:BASE,dt:dt/count,onImpact:(speed,w)=>sound.impact(settings.ball,speed,w.materialId),onTravel:(from,to)=>{if(crossesGoal(from,to))goalCrossed=true;}});
   if(result.halt){lastHalt=result.halt;observations.push({settings:JSON.parse(JSON.stringify(settings)),actor:{x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy},halt:result.halt});pause(true);$('status').textContent=haltMessage(result.halt);break;}
  }
  const floor=stage.zones.find(z=>z.kind==='ice'||z.kind==='sand')?.kind||'normal';
  if(!paused)sound.rolling(settings.ball,floor,Math.hypot(actor.vx,actor.vy));
  const inside=Math.hypot(actor.x-6.5,actor.y-6.5)<.4;
  if(!paused&&(goalCrossed||inside&&!goalInside))$('status').textContent='ゴール！ そのまま転がしても、素材を替えてもOK。';goalInside=inside;
  $('physics-readout').textContent=describeExploration(actor,stage);
 }else sound.stop();
 $('sound-note').hidden=!sound.state.failed;
 if(camera)renderer.draw({stage,actor,camera,now,pointerTilt:mode==='pointer'&&active?tilt.value:null,animationActive:active});
 requestAnimationFrame(frame);
}
pointerMode();refresh();resize();requestAnimationFrame(frame);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
if(new URLSearchParams(location.search).has('debug'))window.__ballLab={get state(){return {settings:{...settings},actor:{x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy,r:actor.r},mode,paused,lastHalt,observations,needsCalibration:sensor.needsCalibration,sound:sound.state,stage};},teleport(x,y,vx=0,vy=0){Object.assign(actor,{x,y,vx,vy});tilt.reset();}};
