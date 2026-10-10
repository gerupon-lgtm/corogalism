/** 可動壁の紹介後は、面数による難化ではなく直近との差で選ぶ。 */
import {PUZZLE_MAIN as C} from '../config/gameConfig.js';
import {createRng} from '../maze/rng.js';

export const PUZZLE_KINDS=['racket','sequence','timing','openRacket','sequenceTiming','racketTiming'];
export const PUZZLE_LABELS={racket:'ラケットで打ち返す',sequence:'順に道をひらく',timing:'切り返して滑りこむ',openRacket:'ひらいて打ち返す',sequenceTiming:'順にひらいて滑りこむ',racketTiming:'打ち返して滑りこむ'};
const weighted=(rng,values)=>{
 let at=rng()*values.reduce((sum,[,weight])=>sum+weight,0);
 for(const [value,weight] of values){at-=weight;if(at<0)return value;}
 return values.at(-1)[0];
};
const recentWeight=(value,key,history,C)=>history.slice(-C.history).reverse().reduce((w,p,i)=>p[key]===value?w*(i===0?C.repeatFactor:C.recentFactor):w,1);

/** null は従来の迷路。通常の10面ごとの演出面を置き換えない。 */
export function choosePuzzleVariation({seed,stage,level='normal',history=[]}){
 if(level==='normal'&&stage%10===0)return null;
 const introduction=C.introduction.find(([at])=>at===stage);
 if(introduction)return {size:C.introSize,shape:'puzzle',themeId:'iceRubber',puzzleKind:introduction[1],puzzleEase:'relaxed',puzzleMaterialPattern:'iceRubber',puzzleFirstVisit:true,label:PUZZLE_LABELS[introduction[1]]};
 if(stage<C.mixStartStage)return null;
 const rng=createRng((seed^0x8b8b8b8b)>>>0);
 // 同種が続く確率を下げるだけ。単独・組合せ・息抜きの候補を除外しない。
 const chance=C.chance*recentWeight('puzzle','shape',history,C);
 if(rng()>=chance)return null;
 const puzzleKind=weighted(rng,PUZZLE_KINDS.map(kind=>[kind,recentWeight(kind,'puzzleKind',history,C)]));
 const size=weighted(rng,C.sizes);
 const puzzleEase=weighted(rng,C.easeWeights.map(([ease,w])=>[ease,w*recentWeight(ease,'puzzleEase',history,C)]));
 const puzzleMaterialPattern=weighted(rng,C.materials.weights.map(([pattern,w])=>{
  const safe=['iceRubber','iceSandRubber','normalRubber'].includes(pattern);
  const early=stage<=C.materials.earlyEndStage?(safe?C.materials.earlySafeFactor:C.materials.earlyChallengeFactor):1;
  return [pattern,w*early*recentWeight(pattern,'puzzleMaterialPattern',history,C)];
 }));
 return {size,shape:'puzzle',themeId:'iceRubber',puzzleKind,puzzleEase,puzzleMaterialPattern,puzzleFirstVisit:false,label:PUZZLE_LABELS[puzzleKind]};
}
