import test from 'node:test';
import assert from 'node:assert/strict';
import { createEscapeInput } from '../src/input/escapeInput.js';
import { createStagePlay } from '../src/game/stagePlay.js';
import { challengeDifficulty } from '../src/game/challenge.js';
import { BASE } from '../src/config/gameConfig.js';

test('80ms間隔の6タップで3回短縮し、拘束開始から500msで脱出する', t => {
 const previous=globalThis.window;globalThis.window=new EventTarget();
 t.after(()=>{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;});
 let stamp=0;t.mock.method(performance,'now',()=>stamp);
 const board=new EventTarget(),play=createStagePlay(7919,challengeDifficulty(3,'easy'));
 const tile=play.stage.sticky[0];play.teleport(tile.x,tile.y);
 const advance=ms=>{stamp+=ms;play.advance({dt:0,elapsedMs:ms,tilt:{x:0,y:0},base:BASE});};
 advance(0);assert.ok(play.trap);
 createEscapeInput(board,()=>Boolean(play.trap)&&play.status==='playing',()=>play.assistEscape());
 function tap(id){for(const type of ['pointerdown','pointerup']){const e=new Event(type);Object.assign(e,{pointerId:id,isPrimary:true,button:0,clientX:20,clientY:20,pointerType:'touch'});(type==='pointerdown'?board:window).dispatchEvent(e);}}
 for(let i=0;i<6;i++){if(i)advance(80);tap(i+1);}
 assert.equal(play.trap.target,.5,'3組すべてが短縮として認識される');
 advance(99);assert.ok(play.trap,'499msではまだ拘束中');
 advance(1);assert.equal(play.trap,null,'500msで脱出');
});
