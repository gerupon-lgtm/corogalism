/** 初めて触れた素材だけを順に説明。動作後の短い間を置き、説明は次の更新まで残す。 */
export function createLessonTiming(cfg) {
 const seen=new Set(),pending=[];let active=null,delay=cfg.contactDelayMs;
 return {
  get active(){return active;},
  contact(id){if(seen.has(id))return;seen.add(id);pending.push(id);},
  tick(ms){
   if(!pending.length)return;
   delay-=Math.max(0,ms);
   if(delay<=0){active=pending.shift();delay=cfg.contactDelayMs;}
  },
  reset(){seen.clear();pending.length=0;active=null;delay=cfg.contactDelayMs;},
 };
}
