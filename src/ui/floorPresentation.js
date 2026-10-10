import { drawFloorArt } from '../render/floorArt.js';
import { drawPuzzleIntro } from '../render/movingWalls.js';
const KEY='corogalism-flow-preview-v1';
let fallbackShown=false;
export function shouldShowFlowPreview(result){
 if(result.level!=='easy'||result.stages<8)return false;
 try{
  const raw=Number(localStorage.getItem(KEY)),count=Number.isSafeInteger(raw)&&raw>=0?raw:0;
  localStorage.setItem(KEY,String(count+1));return count%3===0;
 }catch{if(fallbackShown)return false;fallbackShown=true;return true;}
}
export function createFloorPresentation(root){
 const intro=root.querySelector('#floor-intro'),layer=root.querySelector('#countdown-layer'),preview=root.querySelector('#flow-preview');
 let seen=new Set(),currentCue=null;
 return {
  resetRun(){seen=new Set();},
  setStage(theme){
   const key=theme?.puzzleKind?`puzzle-${theme.puzzleKind}`:theme?.id;
   const show=Boolean((theme?.floorPattern||theme?.puzzleKind&&theme.firstVisit)&&!seen.has(key));currentCue=show?(theme.special?'flowStart':'floorStart'):theme?.special?'flowStart':null;
   intro.hidden=!show;layer.classList.toggle('has-floor-intro',show);
   if(show){seen.add(key);intro.querySelector('strong').textContent=theme.label;intro.querySelector('p').textContent=theme.introHint;
    if(theme.puzzleKind)drawPuzzleIntro(intro.querySelector('canvas'),theme.puzzleKind);
    else {
     const id=theme.special?'specialFlow':theme.floorPattern==='iceRubber'?'ice':theme.floorPattern.startsWith('ice')?'iceSand':theme.floorPattern.toLowerCase().includes('repulsion')?'repulsion':theme.floorPattern.toLowerCase().includes('gravity')?'gravity':'sand';
     drawFloorArt(intro.querySelector('canvas'),id);
    }
   }
  },
  setResult(result){
   const show=shouldShowFlowPreview(result);preview.hidden=!show;
   preview.classList.remove('is-revealed');
   if(show){drawFloorArt(preview.querySelector('canvas'),'specialFlow');void preview.offsetWidth;preview.classList.add('is-revealed');}
  },
  dismiss(){currentCue=null;intro.hidden=true;layer.classList.remove('has-floor-intro');},
  get cue(){return currentCue;},
 };
}
