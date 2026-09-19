/** 説明をため込まず、体験→短い停止→表示したまま操作→間隔の順で進む。 */
export function createLessonTiming(cfg) {
 const seen=new Set();let pending=null,active=null,delay=0,shown=0,gap=0;
 return {
  get active(){return active;},
  get blocking(){return active!==null&&shown<cfg.pauseMs;},
  get progress(){return active===null?0:Math.max(0,1-shown/cfg.lessonMs);},
  contact(id){if(seen.has(id)||pending||active||gap>0)return;pending=id;delay=cfg.contactDelayMs;},
  tick(ms){
   const step=Math.max(0,ms);
   if(active){shown+=step;if(shown>=cfg.lessonMs)this.dismiss();return;}
   if(gap>0){gap=Math.max(0,gap-step);return;}
   if(pending){delay-=step;if(delay<=0){active=pending;seen.add(active);pending=null;shown=0;}}
  },
  dismiss(){if(active){active=null;shown=0;gap=cfg.lessonGapMs;}},
  reset(){seen.clear();pending=null;active=null;delay=shown=gap=0;},
 };
}
