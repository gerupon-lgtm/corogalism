/** 接触説明の差し替えと穏やかな更新通知。物理時間とは独立し、非表示タブでは進めない。 */
import { TUTORIAL, REST, STICKY, RECOVERY, LEAF, HOURGLASS } from '../config/gameConfig.js';
import { walls, items, floors, drawGuideArt } from './guide.js';
import { createLessonTiming } from '../game/tutorialLessons.js';
export function createTutorialUi() {
 const panel=document.querySelector('#tutorial-lesson');
 const timing=createLessonTiming(TUTORIAL);
 const entries=new Map([...walls,...items,...floors].map(([id,title,body])=>[id,{title,body}]));
 let lastActive=null,flash=null,noticeMs=0;let touching=new Set();
 function render(){
  const id=timing.active;
  panel.classList.toggle('has-lesson',Boolean(id));
  panel.querySelector('.tutorial-message').hidden=!id;
  panel.querySelector('.tutorial-idle').hidden=Boolean(id);
  if(id&&id!==lastActive){
   const entry=entries.get(id);
   panel.querySelector('h2').textContent=entry.title+(walls.some(w=>w[0]===id)?'の壁':'');
   panel.querySelector('.tutorial-copy').textContent=entry.body;
   panel.querySelector('.tutorial-context').textContent=walls.some(w=>w[0]===id)?'速さと壁の素材で、げんきの減り方が変わります。':['hourglass','rest'].includes(id)?'時間の加算はチャレンジで有効です。':'';
   drawGuideArt(panel.querySelector('canvas'),id);
   panel.dataset.lesson=id;
   noticeMs=TUTORIAL.updateNoticeMs;
   flash?.cancel();
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches) flash=panel.animate([
    {boxShadow:'0 3px #8e7957, inset 0 0 0 0px #d69426',borderColor:'#c9b18b'},
    {boxShadow:'0 3px #8e7957, 0 0 10px #e5b75099, inset 0 0 0 3px #d69426',borderColor:'#b67b20',offset:.12},
    {boxShadow:'0 3px #8e7957, 0 0 10px #e5b75099, inset 0 0 0 3px #d69426',borderColor:'#b67b20',offset:.45},
    {boxShadow:'0 3px #8e7957, inset 0 0 0 0px #d69426',borderColor:'#c9b18b'},
   ],{duration:TUTORIAL.flashMs,easing:'ease-out'});
  }
  panel.classList.toggle('is-updated',noticeMs>0);
  lastActive=id;
 }
 return {
  get open(){return Boolean(timing.active);},
  reset(){noticeMs=0;timing.reset();touching.clear();flash?.cancel();delete panel.dataset.lesson;render();},
  contact(id){timing.contact(id);},
  inspect(play){
   const a=play.actor,s=play.stage;
   const near=(t,r)=>t&&Math.abs(a.x-t.x)<r&&Math.abs(a.y-t.y)<r;
   const current=new Set();
   for(const [id,tile,r] of [['sticky',s.sticky[0],STICKY.radius],['rest',s.rest,REST.radius],['candy',s.recovery,a.r+RECOVERY.radius],['leaf',s.leaf,a.r+LEAF.radius],['hourglass',s.hourglass,a.r+HOURGLASS.radius]])if(near(tile,r)&&!tile.collected){current.add(id);if(!touching.has(id))this.contact(id);}
   touching=current;
  },
  tick(ms,canAdvance){if(!canAdvance||document.hidden)return;noticeMs=Math.max(0,noticeMs-Math.max(0,ms));timing.tick(ms);render();},
 };
}
