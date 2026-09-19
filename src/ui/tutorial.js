/** 接触説明の表示・自動終了。物理時間とは独立し、非表示タブでは進めない。 */
import { TUTORIAL, REST, STICKY, RECOVERY, LEAF, HOURGLASS } from '../config/gameConfig.js';
import { walls, items, floors, drawGuideArt } from './guide.js';
import { createLessonQueue } from '../game/tutorialLessons.js';
export function createTutorialUi(onChange) {
 const dialog=document.querySelector('#tutorial-lesson');
 const queue=createLessonQueue();let remaining=0;
 const entries=new Map([...walls,...items,...floors].map(([id,title,body])=>[id,{title,body}]));
 function dismiss(){if(dialog.open)dialog.close();}
 dialog.addEventListener('click',dismiss);
 dialog.addEventListener('close',()=>{remaining=0;onChange();});
 return {
  get open(){return dialog.open;},
  reset(){queue.reset();dismiss();},
  contact(id){queue.contact(id);},
  inspect(play){
   const a=play.actor,s=play.stage;
   const near=(t,r)=>t&&Math.abs(a.x-t.x)<r&&Math.abs(a.y-t.y)<r;
   for(const [id,tile,r] of [['sticky',s.sticky[0],STICKY.radius],['rest',s.rest,REST.radius],['candy',s.recovery,a.r+RECOVERY.radius],['leaf',s.leaf,a.r+LEAF.radius],['hourglass',s.hourglass,a.r+HOURGLASS.radius]])if(near(tile,r))this.contact(id);
  },
  flush(){
   if(dialog.open)return;
   const id=queue.next();if(!id)return;const entry=entries.get(id);
   dialog.querySelector('h2').textContent=entry.title+(walls.some(w=>w[0]===id)?'の壁':'');
   dialog.querySelector('.tutorial-copy').textContent=entry.body;
   dialog.querySelector('.tutorial-context').textContent=walls.some(w=>w[0]===id)?'ぶつかる速さと壁の素材で、げんきの減り方が変わります。':['hourglass','rest'].includes(id)?'時間の加算はチャレンジで有効です。':'';
   drawGuideArt(dialog.querySelector('canvas'),id);
   remaining=TUTORIAL.lessonMs;dialog.querySelector('progress').value=1;dialog.showModal();onChange();
  },
  tick(ms,canOpen){if(document.hidden)return;if(!dialog.open){if(canOpen)this.flush();return;}remaining-=Math.max(0,ms);dialog.querySelector('progress').value=Math.max(0,remaining/TUTORIAL.lessonMs);if(remaining<=0)dismiss();},
 };
}
