import test from 'node:test';
import assert from 'node:assert/strict';
import { featureHintPosition } from '../src/ui/featureHintPosition.js';
test('四辺・四隅でもヒントは球に重ならず盤内に収まる',()=>{
 for(const boardWidth of [280,360,560]) for(const x of [18,boardWidth/2,boardWidth-18]) for(const y of [18,boardWidth/2,boardWidth-18]) {
  const radius=12,width=170,height=45;
  const p=featureHintPosition({x,y,radius,width,height,boardWidth,boardHeight:boardWidth});
  assert.ok(p.left>=0&&p.top>=0&&p.left+width<=boardWidth&&p.top+height<=boardWidth);
  assert.ok(p.left+width<x-radius || p.left>x+radius || p.top+height<y-radius || p.top>y+radius);
 }
});
