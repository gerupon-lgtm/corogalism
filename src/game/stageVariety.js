/** 面数による難化ではなく、直近の体験との差で生成条件を選ぶ。 */
import {MAZE_VARIETY as C} from '../config/gameConfig.js';
import {createRng} from '../maze/rng.js';
import {themeAt} from '../world/themes.js';

const labels={classic:'迷路',intricate:'入り組んだ道',short:'すなおな道',roomy:'広い曲がり角',open:'反発の広場'};
function pick(rng,entries){
 let at=rng()*entries.reduce((sum,[,weight])=>sum+weight,0);
 for(const [value,weight] of entries){at-=weight;if(at<0)return value;}
 return entries.at(-1)[0];
}
function varietyWeight(value,key,history){
 let weight=1;
 for(const [i,p] of history.slice(-C.history).reverse().entries())if(p[key]===value)weight*=i===0?C.repeatFactor:C.recentFactor;
 return weight;
}
export function chooseStageVariation({seed,stage,level='normal',history=[]}){
 const rng=createRng((seed^0xb7e15162)>>>0);
 if(stage===1)return {size:7,shape:'short',themeId:'basic',label:labels.short};
 const shape=pick(rng,C.shapes.map(([id,w])=>[id,w*varietyWeight(id,'shape',history)]));
 const size=pick(rng,C.sizes.map(([n,w])=>[n,w*varietyWeight(n,'size',history)]));
 let themeId=themeAt(stage,level).id;
 // 最初の床紹介と通常限定面は維持。紹介後の固定巡回を置き換える。
 if(stage>16&&!(level==='normal'&&stage%10===0)){
  themeId=pick(rng,C.themes.map(id=>[id,varietyWeight(id,'themeId',history)
   *(shape==='short'&&['basic','rest','sand'].includes(id)?3:1)
   *(shape==='open'&&['iceRubber','iceSand','iceAssist'].includes(id)?3:1)]));
 }
 return {size,shape,themeId,label:labels[shape]};
}
