import {createFloorPracticeStage} from '../world/floorPractice.js';
import {generateMaze} from '../maze/generator.js';
import {createStage} from '../world/stage.js';
import {FLOOR_CHALLENGE as C} from '../config/gameConfig.js';

export const BALL_LAB_FLOORS={normal:'普通',ice:'氷',sand:'砂',gravity:'重力',repulsion:'反重力',mixed:'氷＋力場'};
export const BALL_LAB_WALLS={default:'標準',rubber:'ゴム',stone:'石',cork:'コルク',moss:'こけ',spike:'とげ'};
export function createBallLabStage({layout='plaza',floor='normal',wall='default',floorValues={},wallValues={}}={}){
 const values={ice:C.ice,sand:C.sand,force:C.assistForce,radius:C.radius,...floorValues};
 const stage=layout==='maze'?createStage(generateMaze(7,913)):createFloorPracticeStage('normal');
 stage.theme={id:'ball-lab',label:'ボールのおためし'};
 for(const w of stage.walls){w.materialId=Object.hasOwn(BALL_LAB_WALLS,wall)?wall:'default';if(Number.isFinite(wallValues[w.materialId]))w.physicsMaterial={restitutionK:wallValues[w.materialId]};}
 if(['ice','sand','mixed'].includes(floor))stage.zones.push({kind:floor==='sand'?'sand':'ice',cells:Array.from({length:49},(_,i)=>({x:i%7,y:Math.floor(i/7)})),frictionK:floor==='sand'?values.sand:values.ice,...(floor==='sand'?{}:C.iceMotion),forceX:0,forceY:0});
 if(['gravity','repulsion','mixed'].includes(floor))for(const [i,[x,y]]of [[4.5,.5],[.5,4.5],[4.5,4.5]].entries())stage.zones.push({kind:'radial',x,y,radius:values.radius,strength:values.force*(floor==='repulsion'||floor==='mixed'&&i===1?-1:1),corner:true});
 return stage;
}
