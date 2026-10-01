import {FLOOR_CHALLENGE as C} from '../config/gameConfig.js';

export const FLOOR_LESSONS={
 normal:{label:'普通',hint:'普通の床：いつもの転がり方。'},
 sand:{label:'砂',hint:'砂で減速。少し傾け続けてみよう。'},
 ice:{label:'氷',hint:'氷は勢いが残る。逆へ傾けてブレーキ。'},
 gravity:{label:'重力',hint:'重力は中心へ引く。傾きを弱めてみよう。'},
 repulsion:{label:'反重力',hint:'反重力は中心から押す。近づいてみよう。'},
};

/** 通常床を最低2マス挟み、最短13マスの経路でも3回比べられる。 */
export function learningSandCells(maze){
 const cells=[];
 for(let i=2;i<=maze.path.length-3&&cells.length<6;i+=4)cells.push(maze.path[i],maze.path[i+1]);
 return cells;
}

/** 最終経路から離れた2点を選び、空きがあれば3点目を加える。 */
export function learningFieldPoints(maze){
 const clear=C.radius+.35;
 const points=maze.path.map((c,i)=>({x:c.x+.5,y:c.y+.5,i})).filter(p=>
  Math.hypot(p.x-maze.start.x-.5,p.y-maze.start.y-.5)>clear&&Math.hypot(p.x-maze.goal.x-.5,p.y-maze.goal.y-.5)>clear);
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 let chosen=[],widest=0;
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(dist(points[i],points[j])>widest){widest=dist(points[i],points[j]);chosen=[points[i],points[j]];}
 if(widest<C.radius*2)return [];
 const third=points.filter(p=>chosen.every(q=>dist(p,q)>=C.radius*2)).sort((a,b)=>Math.min(...chosen.map(q=>dist(b,q)))-Math.min(...chosen.map(q=>dist(a,q))))[0];
 if(third)chosen.push(third);
 return chosen.sort((a,b)=>a.i-b.i);
}

export function floorContact(stage,actor){
 const field=stage.zones.find(z=>z.kind==='radial'&&Math.hypot(actor.x-z.x,actor.y-z.y)<z.radius-.1);
 if(field)return field.strength>0?'gravity':'repulsion';
 return stage.zones.find(z=>z.cells?.some(c=>c.x===Math.floor(actor.x)&&c.y===Math.floor(actor.y)))?.kind||'normal';
}

/** 接触が300ms続いたら表示。止まった時間は進めず、再接触で再確認できる。 */
export function createFloorContactGuide(){
 let last=null,hold=0,shown=null,remaining=0,message='';
 return {
  reset(){last=null;hold=0;shown=null;remaining=0;message='';},
  tick(kind,ms,active){
   if(!active)return message;
   const dt=Math.max(0,ms);remaining=Math.max(0,remaining-dt);if(!remaining)message='';
   if(kind!==last){last=kind;hold=0;shown=null;}
   hold+=dt;
   if(kind&&FLOOR_LESSONS[kind]&&hold>=300&&shown!==kind){shown=kind;remaining=3500;message=FLOOR_LESSONS[kind].hint;}
   return message;
  },
 };
}
