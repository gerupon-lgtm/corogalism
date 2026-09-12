import test from 'node:test';
import assert from 'node:assert/strict';
import { rollQuaternion, inverseRotation } from '../src/render/ballRotation.js';

test('球は移動距離が円周の1/4なら90度回り、逆走すると元に戻る', () => {
  const initial=[0,0,0,1], r=.275, distance=Math.PI*r/2;
  const rolled=rollQuaternion(initial,distance,0,r);
  const matrix=inverseRotation(rolled);
  assert.ok(Math.abs(matrix[2]+1)<1e-12);
  const restored=rollQuaternion(rolled,-distance,0,r);
  restored.forEach((v,i)=>assert.ok(Math.abs(v-initial[i])<1e-12));
});
test('異なる方向の連続回転でも球面の長さを保ち、停止中には姿勢を変えない', () => {
  let q=[0,0,0,1];
  for(let i=0;i<20000;i++) q=rollQuaternion(q,Math.sin(i)*.03,Math.cos(i)*.02,.275);
  assert.ok(Math.abs(Math.hypot(...q)-1)<1e-12);
  const m=inverseRotation(q);
  assert.ok(Math.abs(Math.hypot(m[2],m[5],m[8])-1)<1e-12);
  assert.equal(rollQuaternion(q,0,0,.275),q);
});
