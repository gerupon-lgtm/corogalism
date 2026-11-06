import test from 'node:test';
import assert from 'node:assert/strict';
import {materialTutorialHint} from '../src/game/tutorialCoach.js';
import {createTutorialStage} from '../src/world/tutorialStage.js';
test('素材面のどのマスでも、壁で塞がれていない隣のマスへ案内する',()=>{
 const maze=createTutorialStage().maze,before=JSON.stringify(maze);
 for(let y=0;y<maze.size;y++)for(let x=0;x<maze.size;x++){
  const h=materialTutorialHint(maze,{x:x+.5,y:y+.5,vx:0,vy:0});
  const dx=h.target.x-x-.5,dy=h.target.y-y-.5,cell=maze.cells[y*maze.size+x];
  assert.ok(Math.abs(dx)+Math.abs(dy)<=1);assert.ok(Number.isFinite(h.direction.x)&&Number.isFinite(h.direction.y));
  if(dx>0)assert.equal(cell.r,0);if(dx<0)assert.equal(cell.l,0);if(dy>0)assert.equal(cell.b,0);if(dy<0)assert.equal(cell.t,0);
 }
 assert.equal(JSON.stringify(maze),before);
});
test('勢いが強い時の案内は逆方向へのブレーキになり、文言と図の方向が一致する',()=>{
 const maze=createTutorialStage().maze;
 const normal=materialTutorialHint(maze,{x:.5,y:.5,vx:0,vy:0}),fast=materialTutorialHint(maze,{x:.5,y:.5,vx:6,vy:0});
 assert.ok(normal.direction.x>0);assert.match(normal.text,/右/);assert.ok(fast.direction.x<0);assert.match(fast.text,/左/);
});
