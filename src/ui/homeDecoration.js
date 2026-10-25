import { createToyBall } from '../render/toyBall.js';
import { drawToyCandy } from '../render/toyCandy.js';
import { drawLeaf } from '../render/toyFeatures.js';
import { drawToyGoal, drawToyWall } from '../render/toyWorld.js';
import { drawHourglass } from '../render/toyHourglass.js';

/** タイトルと結果に本編と同じ小物・壁を描く。ゲームループや音を起動しない。 */
export function initHomeDecoration(root) {
  const ball = createToyBall();
  ball.update({ x: 1, y: 1, r: .4, character: { appearance: 'pearl' } });
  const canvases = [...root.querySelectorAll('#screen-mode [data-toy], #screen-run-result [data-toy], [data-wall-divider]')];
  const draw = () => {
    for (const canvas of canvases) {
      const c = canvas.getContext('2d');
      if (!c || c.isContextLost?.()) continue;
      c.clearRect(0, 0, canvas.width, canvas.height);
      if(canvas.dataset.wallDivider){
        drawToyWall(c,{x:4,y:3,w:canvas.width-8,h:18,materialId:canvas.dataset.wallDivider},{toScreen:(x,y)=>({px:x,py:y}),toPx:n=>n});
        continue;
      }
      switch (canvas.dataset.toy) {
        case 'ball': ball.draw(c, 90, 84, 67); break;
        case 'leaf': drawLeaf(c, 72, 56, 43); break;
        case 'goal': drawToyGoal(c, 72, 56, 36); break;
        case 'candy': drawToyCandy(c, 72, 56, 67, 0, true); break;
        case 'hourglass': drawHourglass(c, 72, 56, 35); break;
      }
    }
    root.querySelector('#screen-mode').dataset.artReady = 'true';
  };
  canvases.forEach(canvas => canvas.addEventListener('contextrestored', () => { ball.invalidate(); draw(); }));
  draw();
}
