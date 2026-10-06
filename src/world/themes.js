import { STAGE_THEMES } from '../config/gameConfig.js';
import { createRng } from '../maze/rng.js';
import { solvePath } from '../maze/path.js';

const floorDefs = {
 sand:{label:'砂でブレーキ',floorPattern:'sand',introHint:'砂の上で勢いが落ちます。'},
 iceRubber:{label:'氷とゴムの迷路',floorPattern:'iceRubber',introHint:'早めに逆へ傾けてブレーキ。'},
 gravityAssist:{label:'引力のカーブ',floorPattern:'gravityAssist',assist:true,introHint:'紫の重力が出口へ引きます。'},
 iceSand:{label:'氷と砂の迷路',floorPattern:'iceSand',introHint:'砂で減速して、角を曲がろう。'},
 repulsionAssist:{label:'押し出すカーブ',floorPattern:'repulsionAssist',assist:true,introHint:'橙の反重力が後ろから押します。'},
 iceAssist:{label:'氷と力場の迷路',floorPattern:'iceAssist',assist:true,introHint:'氷の勢いと、引く・押す力を使おう。'},
 gravityHinder:{label:'引力を抜ける迷路',floorPattern:'gravityHinder',introHint:'引かれる方向を読んで、横から抜けよう。'},
 repulsionHinder:{label:'斥力を抜ける迷路',floorPattern:'repulsionHinder',introHint:'押される方向を読んで、回り込もう。'},
 specialFlow:{label:'光の滑走路',floorPattern:'specialFlow',assist:true,special:true,introHint:'広いカーブを、光の軌道に乗って。'},
};
const intro=['basic','basic','sand','iceRubber','gravityAssist','iceSand','repulsionAssist','iceAssist','rest','iceSand','sticky','careful','gravityHinder','rest','repulsionHinder','iceAssist'];
const cycle=['trial','rest','iceRubber','basic','iceSand','bounce','gravityHinder','rest','repulsionHinder','iceAssist','sticky','careful','sand','rest','iceAssist','basic'];
export function themeAt(stage, level='normal',override=null) {
 const n=Math.max(1,Math.floor(stage));
 const id=level==='normal'&&n%10===0?'specialFlow':override|| (n<=intro.length?intro[n-1]:cycle[(n-intro.length-1)%cycle.length]);
 const definition=floorDefs[id]||STAGE_THEMES.definitions[id];
 const first=Object.keys(floorDefs).includes(id)&&!intro.slice(0,n-1).includes(id)&&n<=16;
 const theme={id,material:'default',ratio:0,...definition,firstVisit:first,learning:level==='easy'&&first};
 if(theme.learning){
  const hints={sand:'砂で減速して、曲がり角へ。',iceRubber:'早めに逆へ傾けて、氷の勢いを抑えよう。',gravityAssist:'紫の重力の向きを見ながら進もう。',repulsionAssist:'橙の反重力が押す向きを見て進もう。',iceSand:'砂で減速、氷で滑走。',iceAssist:'引く・押す力を見ながら、氷を滑ろう。'};
  theme.introHint=hints[id]||'力の向きを見て、横から抜けよう。';
  if(id==='gravityAssist'||id==='gravityHinder')theme.label='重力を試す迷路';
  if(id==='repulsionAssist'||id==='repulsionHinder')theme.label='反重力を試す迷路';
 }
 return theme;
}

/** 経路上の曲がり角に接する壁を優先。外周とスタート・ゴールの周囲は標準のまま。 */
export function assignTheme(stage, difficulty,theme=themeAt(difficulty.stage,difficulty.level)) {
  stage.theme = theme;
  if (theme.material === 'default') return;
  const { maze, wallThickness: wt } = stage;
  const path = solvePath(maze);
  const turns = path.filter((p, i) => i > 0 && i < path.length - 1
    && (p.x - path[i - 1].x !== path[i + 1].x - p.x || p.y - path[i - 1].y !== path[i + 1].y - p.y));
  const touches = (w, p) => {
    const x = p.x + 0.5, y = p.y + 0.5;
    return Math.hypot(x - Math.max(w.x, Math.min(x, w.x + w.w)), y - Math.max(w.y, Math.min(y, w.y + w.h))) <= 0.51;
  };
  const rng = createRng((maze.seed ^ 0x318be952) >>> 0);
  const eligible = stage.walls.filter(w => w.x > -wt / 4 && w.y > -wt / 4
    && w.x + w.w < maze.size + wt / 4 && w.y + w.h < maze.size + wt / 4
    && !touches(w, maze.start) && !touches(w, maze.goal));
  const ranked = eligible.map(w => ({ w, score: (turns.some(p => touches(w, p)) ? 1 : 0) + rng() }));
  ranked.sort((a, b) => b.score - a.score);
  for (const { w } of ranked.slice(0, Math.round(eligible.length * theme.ratio))) w.materialId = theme.material;
}
