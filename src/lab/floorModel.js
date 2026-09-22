import { generateMaze } from '../maze/generator.js';
import { ICE_LAB } from '../config/gameConfig.js';
import { createStage, createActor, buildWalls } from '../world/stage.js';
import { CHARACTERS } from '../world/characters.js';
import { checkReachability } from '../maze/validator.js';

export const FLOOR_OPTIONS = {
  normal: { name: '通常', color: '#e9dcc5', hint: 'いつもの床。ほかの床との手触りを比べてみよう。' },
  ice: { name: '氷', color: '#b9eaf5', hint: '青い床は滑り続けます。速いほど止まりにくいので、早めに逆へ傾けてブレーキ。' },
  sand: { name: '砂', color: '#eed091', hint: '砂の上は勢いが落ちます。強めに傾けて進もう。' },
  gravity: { name: '重力', color: '#d9c7f0', hint: '輪の中心へ引かれます。横をかすめると進路が内側へ曲がります。' },
  repulsion: { name: '反重力', color: '#f8c9bb', hint: '輪の外へ押されます。中心を越えたら加速に注意。' },
};

export function createFloorLab() {
  const maze = generateMaze(7, 250);
  const stage = createStage(maze);
  for (const wall of stage.walls) wall.materialId = 'rubber';
  return { stage, actor: createActor(maze, CHARACTERS.default) };
}

export const PATCH_CELLS = Array.from({ length: 49 }, (_, i) => ({ x: i % 7, y: Math.floor(i / 7) }));
export const FIELD_CENTERS = [0.5, 2.5, 4.5, 6.5].flatMap(y => [0.5, 2.5, 4.5, 6.5].map(x => ({ x, y })));

export const PATTERNS = {
  timeTrialAssist: { name: '広いカーブ＋重力・反重力', hint: '通常壁・氷＋砂。広げたカーブで紫の重力が先へ引き、橙の反重力が後ろから押します。検証中は壁ダメージなし。' },
  timeTrial: { name: '氷＋砂 タイムトライアル', hint: '通常壁・ほぼ全面氷。曲がり角の直前の砂で減速。検証ページのみ壁ダメージなし・時間制限なし。' },
  single: { name: '全面の床比較', hint: '' },
  iceRubber: { name: '全面氷＋ゴム', hint: '採用決定の組み合わせ。反発と慣性を制御してゴールへ。' },
  iceSand: { name: '氷＋砂', hint: '氷で滑走し、曲がり角の手前と角の砂でブレーキ。' },
  cornerGravity: { name: '曲がり角の重力', hint: '角の円盤は、曲がって進む方向と逆側へ引きます。' },
  cornerRepulsion: { name: '曲がり角の反重力', hint: '角の円盤は、曲がって進む方向側から押し戻します。' },
  iceGravity: { name: '氷＋重力', hint: '短い氷区間に重力を1個。滑る勢いと引力を読みます。' },
  iceRepulsion: { name: '氷＋反重力', hint: '短い氷区間に反重力を1個。押されて変わる軌道を試そう。' },
};

export function cornerSites(maze) {
  const sites = [];
  for (let i = 3; i < maze.path.length - 3; i++) {
    const prev = maze.path[i-1], cell = maze.path[i], next = maze.path[i+1];
    const dx = next.x-cell.x, dy = next.y-cell.y;
    if ((cell.x-prev.x)*dy === (cell.y-prev.y)*dx) continue;
    if (sites.length && i-sites.at(-1).index < 5) continue;
    sites.push({ index: i, cell, dx, dy });
    if (sites.length === 3) break;
  }
  return sites;
}

export function applyFloor(stage, type, settings, pattern = 'single') {
  const assisted = pattern === 'timeTrialAssist';
  if (Boolean(stage.labAssisted) !== assisted) {
    stage.maze = generateMaze(7, 250);
    if (assisted) {
      const open = (a,b) => {
        const dx=b.x-a.x, dy=b.y-a.y;
        const [side,opposite] = dx===1?['r','l']:dx===-1?['l','r']:dy===1?['b','t']:['t','b'];
        stage.maze.cells[a.y*7+a.x][side]=0;
        stage.maze.cells[b.y*7+b.x][opposite]=0;
      };
      for (const site of cornerSites(stage.maze)) {
        const prev=stage.maze.path[site.index-1],next=stage.maze.path[site.index+1];
        const inner={x:prev.x+next.x-site.cell.x,y:prev.y+next.y-site.cell.y};
        if(inner.x<0||inner.y<0||inner.x>=7||inner.y>=7) continue;
        open(prev,inner);open(inner,next);
      }
      if(!checkReachability(stage.maze).ok) throw new Error('カーブ面の到達性が不正です');
    }
    stage.walls=buildWalls(stage.maze);
    stage.labAssisted=assisted;
  }
  stage.zones = [];
  for (const wall of stage.walls) wall.materialId = pattern.startsWith('timeTrial') ? 'default' : 'rubber';
  stage.labPattern = pattern;
  stage.labSites = [];
  if (pattern !== 'single') {
    const sites = cornerSites(stage.maze);
    const floor = (kind, cells) => { if (cells.length) stage.zones.push({ kind, cells, ...(kind === 'ice' ? ICE_LAB : {}), frictionK: settings[kind], forceX: 0, forceY: 0 }); };
    if (pattern.startsWith('timeTrial')) {
      const sand = sites.map(site => stage.maze.path[site.index-1]);
      floor('sand', sand);
      floor('ice', PATCH_CELLS.filter(c=>!sand.some(s=>s.x===c.x&&s.y===c.y)));
    }
    if (assisted) {
      stage.labSites=sites;
      for(const site of sites) {
        const prev=stage.maze.path[site.index-1],next=stage.maze.path[site.index+1];
        for(const [cell,sign] of [[next,1],[prev,-1]]) stage.zones.push({kind:'radial',x:cell.x+.5,y:cell.y+.5,radius:settings.radius,strength:settings.force*.55*sign,corner:true});
      }
    }
    if (pattern === 'iceRubber') floor('ice', PATCH_CELLS);
    if (pattern === 'iceSand') {
      const sand = sites.flatMap(site => stage.maze.path.slice(site.index-1,site.index+1));
      floor('sand', sand);
      floor('ice', PATCH_CELLS.filter(c=>!sand.some(s=>s.x===c.x&&s.y===c.y)));
    }
    if (pattern.includes('Gravity') || pattern.includes('Repulsion')) {
      const selected = pattern.startsWith('ice') ? sites.slice(0,1) : sites;
      const attract = pattern.endsWith('Gravity');
      for (const site of selected) {
        const sign = attract ? -1 : 1;
        stage.zones.push({ kind: 'radial', x: site.cell.x+.5+sign*site.dx*.14, y: site.cell.y+.5+sign*site.dy*.14,
          radius: settings.radius, strength: settings.force*(attract?1:-1), corner: true });
        stage.labSites.push(site);
        if (pattern.startsWith('ice')) floor('ice',stage.maze.path.slice(site.index-2,site.index+2));
      }
    }
    return;
  }
  if (type === 'ice' || type === 'sand') {
    stage.zones.push({ cells: PATCH_CELLS, kind: type, ...(type === 'ice' ? { kind: 'ice', ...ICE_LAB } : {}), frictionK: settings[type], forceX: 0, forceY: 0 });
  } else if (type === 'gravity' || type === 'repulsion') {
    for (const center of FIELD_CENTERS) stage.zones.push({ kind: 'radial', ...center, radius: settings.radius,
      strength: settings.force * (type === 'gravity' ? 1 : -1) });
  }
}
