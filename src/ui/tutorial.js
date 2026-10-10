/** 接触説明の差し替えとカード全体の更新通知。物理時間とは独立し、非表示タブでは進めない。 */
import { TUTORIAL, REST, STICKY, RECOVERY, LEAF, HOURGLASS } from '../config/gameConfig.js';
import { walls, movingWalls, items, floors, floorMaterials, drawGuideArt } from './guide.js';
import { floorContact } from '../world/floorLearning.js';
import { createLessonTiming } from '../game/tutorialLessons.js';
import { createPuzzleHints } from '../game/puzzleHints.js';
export function createTutorialUi() {
 const panel=document.querySelector('#tutorial-lesson');
 const timing=createLessonTiming(TUTORIAL);
 const entries=new Map([...walls,...movingWalls,...items,...floors,...floorMaterials].map(([id,title,body])=>[id,{title,body,art:id}]));
 let lastActive=null,flash=null,noticeMs=0,openingLesson=null,puzzleHints=null;let touching=new Set();
 const hintEl=panel.querySelector('.tutorial-hint');
 function renderHint(){
  const hint=puzzleHints?.current;
  hintEl.hidden=!openingLesson;
  const text=openingLesson?(hint?.text??'球の動きを見ながら、少しずつ傾けよう。'):'';
  if(hintEl.textContent!==text)hintEl.textContent=text;
  if(hint)panel.dataset.hint=hint.id;else delete panel.dataset.hint;
 }
 function render(){
  // 動く壁のコースでは、接触しても面の目的と操作ヒントを残す。
  const id=openingLesson?.id??timing.active??null;
  panel.classList.toggle('has-lesson',Boolean(id));
  panel.querySelector('.tutorial-message').hidden=!id;
  panel.querySelector('.tutorial-idle').hidden=Boolean(id);
  if(id&&id!==lastActive){
   const entry=entries.get(id);
   panel.querySelector('h2').textContent=entry.title+(walls.some(w=>w[0]===id)?'の壁':'');
   panel.querySelector('.tutorial-copy').textContent=entry.body;
   panel.querySelector('.tutorial-context').textContent=openingLesson?'時間・げんき切れなし。綿で狙い直せます。':entry.context??(id==='cotton'?'壁に沿う動きは残ります。':movingWalls.some(w=>w[0]===id)?'傾きを戻すと壁は止まり、球は勢いで進みます。':walls.some(w=>w[0]===id)?'速さと壁の素材で、げんきの減り方が変わります。':['hourglass','rest'].includes(id)?'時間の加算はチャレンジで有効です。':'');
   drawGuideArt(panel.querySelector('canvas'),entry.art??id);
   panel.dataset.lesson=id;
   noticeMs=TUTORIAL.flashMs;
   flash?.cancel();
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const quiet={boxShadow:'0 3px #8e7957, 0 0 18px 4px #ffc94700, inset 0 0 0 150px #ffd15a00',borderColor:'#c9b18b'};
    const bright={boxShadow:'0 3px #8e7957, 0 0 18px 4px #ffc947bb, inset 0 0 0 150px #ffd15ab3',borderColor:'#e79a19'};
    flash=panel.animate([
     {...quiet,offset:0},{...bright,offset:.10},{...bright,offset:.25},
     {...quiet,offset:.45},{...bright,offset:.60},{...bright,offset:.75},
     {...quiet,offset:1},
    ],{duration:TUTORIAL.flashMs,easing:'ease-in-out'});
   }
  }
  panel.classList.toggle('is-updated',noticeMs>0);
  lastActive=id;
  renderHint();
 }
 return {
  get open(){return Boolean(timing.active||openingLesson);},
  get hint(){return puzzleHints?.current??null;},
  reset(context=null,stage=null){
   noticeMs=0;timing.reset();touching.clear();flash?.cancel();lastActive=null;delete panel.dataset.lesson;
   openingLesson=context;
   puzzleHints=openingLesson&&stage?.puzzle?createPuzzleHints(stage):null;
   panel.setAttribute('aria-label',openingLesson?'面の目的と操作のヒント':'素材の説明');
   panel.classList.toggle('is-puzzle-course',Boolean(openingLesson));
   if(openingLesson)entries.set(openingLesson.id,openingLesson);
   render();
  },
  contact(id){
   if(openingLesson)return;
   if(entries.has(id))timing.contact(id);
  },
  inspect(play,tilt=null,elapsedMs=0){
   if(puzzleHints){puzzleHints.update({actor:play.actor,tilt,elapsedMs,status:play.status});renderHint();return;}
   const a=play.actor,s=play.stage;
   const near=(t,r)=>t&&Math.abs(a.x-t.x)<r&&Math.abs(a.y-t.y)<r;
   const current=new Set();
   const floor=floorContact(s,a);
   if(!openingLesson&&floorMaterials.some(([id])=>id===floor)){current.add(floor);if(!touching.has(floor))this.contact(floor);}
   for(const [id,tile,r] of [['sticky',s.sticky?.[0],STICKY.radius],['rest',s.rest,REST.radius],['candy',s.recovery,a.r+RECOVERY.radius],['leaf',s.leaf,a.r+LEAF.radius],['hourglass',s.hourglass,a.r+HOURGLASS.radius]])if(near(tile,r)&&!tile.collected){current.add(id);if(!touching.has(id))this.contact(id);}
   touching=current;
  },
  tick(ms,canAdvance){if(!canAdvance||document.hidden)return;noticeMs=Math.max(0,noticeMs-Math.max(0,ms));timing.tick(ms);render();},
 };
}
