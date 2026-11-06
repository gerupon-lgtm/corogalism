/** 初回は接触を見届けてから表示し、以後は読む時間と見返しを保つ。停止中は呼出し側でtickを止める。 */
export function createLessonTiming(cfg) {
 const seen=new Set(),pending=[],history=[];
 const readingMs=cfg.readingMs??4800;
 let activeIndex=-1,remainingMs=cfg.contactDelayMs;
 const active=()=>history[activeIndex]??null;
 function showNext(){
  history.push(pending.shift());
  activeIndex=history.length-1;
  remainingMs=readingMs;
  return active();
 }
 return {
  get active(){return active();},
  get history(){return [...history];},
  get pendingCount(){return pending.length;},
  contact(id){if(seen.has(id))return;seen.add(id);pending.push(id);},
  tick(ms){
   if(!history.length&&!pending.length)return;
   const elapsed=Number.isFinite(ms)?Math.max(0,ms):0;
   remainingMs=Math.max(0,remainingMs-elapsed);
   // 大きな時間差でも一度に一件だけ表示し、残りの未読を飛ばさない。
   if(pending.length&&remainingMs===0)showNext();
  },
  review(delta){
   if(!history.length)return null;
   if(delta!==-1&&delta!==1)return active();
   // 最後まで見た状態での明示的な「次」は、読む時間を待たず未読を開く。
   if(delta===1&&activeIndex===history.length-1&&pending.length)return showNext();
   activeIndex=(activeIndex+delta+history.length)%history.length;
   remainingMs=readingMs;
   return active();
  },
  reset(){
   seen.clear();pending.length=0;history.length=0;
   activeIndex=-1;remainingMs=cfg.contactDelayMs;
  },
 };
}
