import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagePlay } from '../src/game/stagePlay.js';
import { challengeDifficulty } from '../src/game/challenge.js';
import { themeAt } from '../src/world/themes.js';
import { solvePath, countTurns } from '../src/maze/path.js';
import { checkReachability } from '../src/maze/validator.js';

test('床テーマを早期に紹介し、通常10面だけに専用構成がある',()=>{
 assert.deepEqual([3,4,5,6,7,8].map(n=>themeAt(n).id),['sand','iceRubber','gravityAssist','iceSand','repulsionAssist','iceAssist']);
 assert.equal(themeAt(10,'normal').special,true);
 assert.equal(Boolean(themeAt(10,'easy').special),false);
 assert.equal(themeAt(11).id,'sticky');
});
test('加工後の最短経路・折れ数とBFSを全テーマ・複数シードで再現する',()=>{
 for(let seed=1;seed<=35;seed++)for(let n=1;n<=22;n++)for(const level of ['normal','easy']){
  const a=createStagePlay(seed*7919,challengeDifficulty(n,level));
  const b=createStagePlay(seed*7919,challengeDifficulty(n,level));
  assert.deepEqual(a.stage,b.stage);
  assert.equal(checkReachability(a.stage.maze).ok,true);
  assert.deepEqual(a.stage.maze.path,solvePath(a.stage.maze));
  assert.equal(a.stage.maze.pathLength,a.stage.maze.path.length);
  assert.equal(a.stage.maze.turns,countTurns(a.stage.maze.path));
  if(a.stage.theme.floorPattern){
   assert.ok(a.stage.walls.every(w=>['cork','rubber'].includes(w.materialId)));
   assert.equal(a.stage.sticky.length,0);
   for(const z of a.stage.zones.filter(z=>z.kind==='radial')){
    assert.ok(Math.hypot(z.x-.5,z.y-.5)>z.radius+.35);
    assert.ok(Math.hypot(z.x-6.5,z.y-6.5)>z.radius+.35);
   }
  }
 }
});
