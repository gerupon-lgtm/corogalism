/** 実プレイの一手と動きの見本。球・壁・進行条件は変更しない。 */
import {TUTORIAL,REST,STICKY,RECOVERY,LEAF,HOURGLASS,PUZZLE_HINTS} from '../config/gameConfig.js';
import {floorContact} from '../world/floorLearning.js';
import {createLessonTiming} from '../game/tutorialLessons.js';
import {createPuzzleHints} from '../game/puzzleHints.js';
import {materialTutorialHint} from '../game/tutorialCoach.js';
import {drawTutorialDemo} from './tutorialDemo.js';
const lessons={
 roll:['ころがしてみよう','傾けた方へ、球が転がる。','少しずつ傾けて、カップを目指そう。'],
 default:['普通の壁に、そっと','速く当たるほど、げんきが減る。','曲がる前に、ゆっくりに。'],
 rubber:['ゴムなら、ポン！','よくはねる。ゴムそのものは無傷。','はね返る勢いも、進む力に。'],
 cork:['コルクは、やさしく','ほどよくはねて、痛みが少なめ。','ぶつかったあとの動きを見よう。'],
 stone:['石は、ずしっと','はねにくいけれど、痛みは大きめ。','ゆっくり近づいてみよう。'],
 spike:['とげには、ご用心','速く当たると、大きなダメージ。','この紹介は、げんき0でも続けられるよ。'],
 moss:['こけの壁で、ひと息','はねにくく、痛みも少なめ。','壁ごとの違いを、感じてみよう。'],
 cotton:['綿で、ふわっと','壁へ向かう勢いを吸収。痛みなし。','壁に沿う動きは、そのまま残る。'],
 candy:['キャンディで回復！','げんきが20%戻る。','満タンのときは、取らずに残るよ。'],
 leaf:['はっぱが、まもる','ダメージを先に引き受ける。','まもり満タンでは、葉っぱは残るよ。'],
 hourglass:['もう少し、遊べる！','チャレンジの時間が5秒増える。','この紹介には、時間制限はないよ。'],
 rest:['ひとやすみで、回復','2秒じっとすると、げんき20%回復。','チャレンジでは、時間も2秒増える。'],
 sticky:['とりもちから、脱出！','盤面をダブルタップで、早く脱出。','そのままでも、3秒で抜けられるよ。'],
 ice:['氷は、すーっと','水平に戻しても、勢いが残る。','早めに逆へ傾けて、ブレーキ。'],
 sand:['砂で、ブレーキ','転がる勢いが、すっと落ちる。','曲がり角で、違いを感じてみよう。'],
 gravity:['重力に、引かれる','中心へ引く力で、軌道が曲がる。','傾きと引く力を、重ねてみよう。'],
 repulsion:['反重力に、押される','中心から押す力で、軌道が曲がる。','抜けたあとにも、勢いが残るよ。'],
 racket:['ラケットで、ポン！','中心はまっすぐ。端なら斜めへ。','傾けると、球もラケットも動く。'],
 gate:['傾けて、道をつくろう','球と戸は、同じ傾きで動く。','水平に戻すと、戸はその場で止まる。'],
};
export function createTutorialUi(){
 const panel=document.querySelector('#tutorial-lesson'),timing=createLessonTiming(TUTORIAL);
 const title=panel.querySelector('h2'),copy=panel.querySelector('.tutorial-copy'),hintEl=panel.querySelector('.tutorial-hint');
 const arrow=document.createElement('span'),hintText=document.createElement('span');arrow.className='tutorial-direction';arrow.setAttribute('aria-hidden','true');hintEl.replaceChildren(arrow,hintText);
 const canvas=panel.querySelector('canvas'),replay=panel.querySelector('#btn-tutorial-demo');
 const review=panel.querySelector('.tutorial-review'),prev=panel.querySelector('#btn-tutorial-prev'),next=panel.querySelector('#btn-tutorial-next');
 const feedback=panel.querySelector('.tutorial-feedback'),previews=[...document.querySelectorAll('[data-tutorial-preview]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let openingLesson=null,puzzleHints=null,materialHint=null,kind='roll',lastActive=null;
 let demoMs=0,previewMs=0,previewing=false,paintAge=0,feedbackMs=0,lastPaint=null,lastPreview=-1;
 let touching=new Set(),celebrated=new Set(),previousActor=null;
 function notify(key,text){
  if(celebrated.has(key))return;celebrated.add(key);feedback.textContent=text;feedback.hidden=false;feedbackMs=1900;
  if(!reduced.matches)feedback.animate([{opacity:0,transform:'translate(-50%,3px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:180,easing:'ease-out'});
 }
 function paint(){
  const direction=kind==='roll'?materialHint?.direction:kind==='racket'?{x:0,y:1}:{x:1,y:0};
  const key=`${kind}:${reduced.matches?0:Math.min(demoMs,kind==='racket'?6000:4000)}:${direction?.x?.toFixed(2)}:${direction?.y?.toFixed(2)}:${reduced.matches}`;
  if(key===lastPaint)return;lastPaint=key;drawTutorialDemo(canvas,{kind,elapsedMs:demoMs,direction,reducedMotion:reduced.matches});
 }
 function render(){
  const id=openingLesson?(openingLesson.puzzleKind==='racket'?'racket':'gate'):timing.active??'roll';kind=id;
  const entry=lessons[id]??lessons.roll;
  panel.querySelector('.tutorial-message').hidden=false;panel.querySelector('.tutorial-idle').hidden=true;
  panel.classList.add('has-lesson');panel.classList.toggle('is-puzzle-course',Boolean(openingLesson));panel.dataset.lesson=openingLesson?.id??id;
  if(id!==lastActive){
   title.textContent=entry[0];copy.textContent=entry[1];demoMs=0;paintAge=100;lastActive=id;panel.classList.remove('is-updated');
   if(id!=='roll'&&!reduced.matches)panel.animate([{borderColor:'#e1a245'},{borderColor:'#c9b18b'}],{duration:650});
  }
  const hint=puzzleHints?.current,text=openingLesson?(hint?.text??entry[2]):id==='roll'?(materialHint?.text??entry[2]):entry[2];
  hintEl.hidden=false;if(hintText.textContent!==text)hintText.textContent=text;
  const d=(hint??(id==='roll'?materialHint:null))?.direction;
  arrow.hidden=!d;
  if(d){const largest=Math.max(Math.abs(d.x),Math.abs(d.y)),ratio=openingLesson?PUZZLE_HINTS.diagonalRatio:0;
   const active=largest>=PUZZLE_HINTS.directionDeadZone;
   const x=(openingLesson?active&&Math.abs(d.x)/largest>=ratio:Math.abs(d.x)>.1)?Math.sign(d.x):0;
   const y=(openingLesson?active&&Math.abs(d.y)/largest>=ratio:Math.abs(d.y)>.1)?Math.sign(d.y):0;
   const symbol=({'-1,-1':'↖','0,-1':'↑','1,-1':'↗','-1,0':'←','0,0':'—','1,0':'→','-1,1':'↙','0,1':'↓','1,1':'↘'})[`${x},${y}`];if(arrow.textContent!==symbol)arrow.textContent=symbol;
  }
  if(hint)panel.dataset.hint=hint.id;else delete panel.dataset.hint;
  review.hidden=Boolean(openingLesson)||timing.history.length<1;prev.disabled=timing.history.length<2;
  next.disabled=timing.history.length<2&&timing.pendingCount===0;
  const reviewText=`説明 ${Math.max(1,timing.history.indexOf(timing.active)+1)} / ${timing.history.length}`,reviewLabel=review.querySelector('span');
  if(reviewLabel.textContent!==reviewText)reviewLabel.textContent=reviewText;
  const replayText=demoMs<(kind==='racket'?6000:4000)&&!reduced.matches?'↻ 見本を再生':'▶ 見本を再生';
  if(replay.textContent!==replayText)replay.textContent=replayText;
 }
 replay.addEventListener('click',()=>{demoMs=0;paintAge=100;paint();});
 for(const[button,delta]of [[prev,-1],[next,1]])button.addEventListener('click',()=>{timing.review(delta);render();paint();});
 reduced.addEventListener('change',()=>{paintAge=100;paint();});
 return {
  get open(){return Boolean(timing.active||openingLesson);},get hint(){return puzzleHints?.current??materialHint;},
  reset(context=null,stage=null){
   timing.reset();touching.clear();celebrated.clear();feedback.hidden=true;feedbackMs=0;previousActor=null;
   openingLesson=context;puzzleHints=context&&stage?.puzzle?createPuzzleHints(stage):null;materialHint=null;lastActive=null;demoMs=0;lastPaint=null;
   panel.setAttribute('aria-label',context?'面の目的・今の一手・動きの見本':'素材の説明と動きの見本');render();paint();
  },
  contact(id){
   if(openingLesson){if(openingLesson.puzzleKind==='racket'&&id==='racket')notify('return','ポン！ 打ち返せた！');return;}
   if(lessons[id])timing.contact(id);
  },
  inspect(play,tilt=null,elapsedMs=0){
   const a=play.actor,s=play.stage;
   if(puzzleHints){
    puzzleHints.update({actor:a,tilt,elapsedMs,status:play.status});
    if(previousActor)for(const portal of s.puzzle.portals??[]){
     const dx=portal.to.x-portal.from.x,dy=portal.to.y-portal.from.y,len=Math.hypot(dx,dy),nx=dx/len,ny=dy/len;
     const before=(previousActor.x-portal.to.x)*nx+(previousActor.y-portal.to.y)*ny,after=(a.x-portal.to.x)*nx+(a.y-portal.to.y)*ny;
     const side=Math.abs((a.x-portal.to.x)*-ny+(a.y-portal.to.y)*nx);
     if(before<0&&after>=0&&side<.85)notify(portal.id,portal===s.puzzle.portals.at(-1)?'道を通れた！ カップへ。':'道を通れた！ 次の戸へ。');
    }
    previousActor={x:a.x,y:a.y};render();return;
   }
   materialHint=materialTutorialHint(s.maze,a);
   const near=(t,r)=>t&&Math.abs(a.x-t.x)<r&&Math.abs(a.y-t.y)<r,current=new Set(),floor=floorContact(s,a);
   if(lessons[floor]){current.add(floor);if(!touching.has(floor))this.contact(floor);}
   for(const[id,tile,r]of [['sticky',s.sticky?.[0],STICKY.radius],['rest',s.rest,REST.radius],['candy',s.recovery,a.r+RECOVERY.radius],['leaf',s.leaf,a.r+LEAF.radius],['hourglass',s.hourglass,a.r+HOURGLASS.radius]])if(near(tile,r)&&!tile.collected){current.add(id);if(!touching.has(id))this.contact(id);}
   if(a.x>1.2||a.y>1.2)notify('roll','いいね、その調子！');touching=current;render();
  },
  tick(ms,canAdvance,showPreview=false){
   if(document.hidden)return;const delta=Math.min(100,Math.max(0,ms));
   if(showPreview){if(!previewing){previewMs=0;lastPreview=-1;}previewing=true;previewMs=Math.min(6000,previewMs+delta);paintAge+=delta;const frame=reduced.matches?0:previewMs;if(paintAge>=50&&frame!==lastPreview){paintAge=0;lastPreview=frame;for(const c of previews)drawTutorialDemo(c,{kind:c.dataset.tutorialPreview,elapsedMs:previewMs,reducedMotion:reduced.matches});}return;}
   previewing=false;if(!canAdvance)return;
   timing.tick(ms);demoMs=Math.min(6000,demoMs+delta);feedbackMs=Math.max(0,feedbackMs-delta);feedback.hidden=feedbackMs===0;
   render();paintAge+=delta;if(paintAge>=50){paintAge=0;paint();}
  },
 };
}
