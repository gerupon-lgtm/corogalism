/** 接触説明の表示・自動終了。物理時間とは独立し、非表示タブでは進めない。 */
import { TUTORIAL, REST, STICKY, RECOVERY, LEAF, HOURGLASS } from '../config/gameConfig.js';
import { walls, items, floors, drawGuideArt } from './guide.js';
import { createLessonTiming } from '../game/tutorialLessons.js';
export function createTutorialUi(onChange) {
 const panel=document.querySelector('#tutorial-lesson');
 const timing=createLessonTiming(TUTORIAL);
 const entries=new Map([...walls,...items,...floors].map(([id,title,body])=>[id,{title,body}]));
 let lastActive=null,lastBlocking=false;let touching=new Set();
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
  }
  panel.querySelector('progress').value=timing.progress;
  panel.querySelector('.tutorial-play-state').textContent=timing.blocking?'ちょっとひと息…':'操作できます';
  lastActive=id;
  if(lastBlocking!==timing.blocking){lastBlocking=timing.blocking;onChange();}
 }
 panel.addEventListener('click',()=>{timing.dismiss();render();});
 return {
  get open(){return Boolean(timing.active);},
  get blocking(){return timing.blocking;},
  reset(){timing.reset();touching.clear();render();},
  contact(id){timing.contact(id);},
  inspect(play){
   const a=play.actor,s=play.stage;
   const near=(t,r)=>t&&Math.abs(a.x-t.x)<r&&Math.abs(a.y-t.y)<r;
   const current=new Set();
   for(const [id,tile,r] of [['sticky',s.sticky[0],STICKY.radius],['rest',s.rest,REST.radius],['candy',s.recovery,a.r+RECOVERY.radius],['leaf',s.leaf,a.r+LEAF.radius],['hourglass',s.hourglass,a.r+HOURGLASS.radius]])if(near(tile,r)&&!tile.collected){current.add(id);if(!touching.has(id))this.contact(id);}
   touching=current;
  },
  tick(ms,canAdvance){if(!canAdvance||document.hidden)return;timing.tick(ms);render();},
 };
}
