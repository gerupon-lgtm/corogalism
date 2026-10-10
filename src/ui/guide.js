/** タイトルを離れず読めるガイド。本文と実際のゲーム描画を共有する。 */
import { drawFloorArt } from '../render/floorArt.js';
import { drawToyWall } from '../render/toyWorld.js';
import { drawToyCandy } from '../render/toyCandy.js';
import { drawLeaf, drawFeatureFloors } from '../render/toyFeatures.js';
import { drawHourglass } from '../render/toyHourglass.js';
import { createToyBall } from '../render/toyBall.js';
import { drawRackets } from '../render/movingWalls.js';
import { RECOVERY, REST, HOURGLASS } from '../config/gameConfig.js';
export const walls=[['default','標準','いつもの壁。'],['rubber','ゴム','よくはねる・ゴム自体は無傷。'],['cork','コルク','ほどよくはねる・痛み少なめ。'],['stone','石','はねにくい・痛み大きめ。'],['spike','とげ','ぶつかると大きなダメージ。'],['moss','こけ','はねにくい・痛み少なめ。'],['cotton','綿','壁へ向かう勢いを受け止める。横にはすべる、痛みなし。']];
export const movingWalls=[['racket','ラケット','中心はまっすぐ、端は斜めへ。動かして狙おう。ダメージなし。'],['gate','通路の戸','傾けて動かすと、道が開く。打ち分けず、壁としてはね返す。']];
export const items=[['candy','キャンディ',`${RECOVERY.healRatio*100}％回復。満タンなら残る。`],['leaf','葉っぱのまもり','ダメージを肩代わり。'],['hourglass','砂時計',`のこりじかん ＋${HOURGLASS.bonusSec}秒。`]];
export const floorMaterials=[['ice','氷','勢いが残る！早めに逆へ傾けてブレーキ。'],['sand','砂','すべる勢いを落とす、曲がり角の味方。'],['gravity','重力','中心へ引く。軌道が内側へ曲がる。'],['repulsion','反重力','外へ押す。抜けるときの加速に注意。']];
export const floors=[['rest','ひとやすみ',`${REST.durationSec}秒じっとすると げんき回復＆じかん＋${REST.durationSec}秒。`],['sticky','とりもち','迷路内連続タップで最短0.5秒で脱出可能。']];
const card=([id,title,body])=>`<article class="guide-card"><canvas data-guide-art="${id}" width="144" height="112" aria-hidden="true"></canvas><div><h3>${title}</h3><p>${body}</p></div></article>`;
export function initGuide(canOpen) {
 const dialog=document.querySelector('#play-guide');
 let opener=document.querySelector('#btn-guide');
 dialog.innerHTML=`<header class="guide-heading"><h2 id="guide-title"><canvas data-guide-art="leaf" width="144" height="112" aria-hidden="true"></canvas> あそびのガイド</h2><button type="button" class="guide-x" aria-label="ガイドを閉じる" autofocus>×</button><p>すべって、曲がって、ゴールへ。</p></header>
 <div class="guide-showcase"><article><canvas width="240" height="140" data-guide-art="slide-demo" aria-hidden="true"></canvas><strong>すべる</strong><span>氷 × はずむ壁</span></article><article><canvas width="240" height="140" data-guide-art="brake-demo" aria-hidden="true"></canvas><strong>曲がる</strong><span>砂でブレーキ</span></article><article><canvas width="240" height="140" data-guide-art="force-demo" aria-hidden="true"></canvas><strong>軌道が変わる</strong><span>引く力・押す力</span></article></div>
 <div class="guide-group"><h2>床で変わる、ころがり方</h2><div class="guide-floor-grid">${floorMaterials.map(card).join('')}</div><p class="guide-tip">小さな迷路も、大きな迷路も。入り組んだ道と反発の広場を行き来しよう。氷は早めに減速、力場は色と矢印が目印。床の練習なら、時間を気にせずくらべられます。</p></div>
 <div class="guide-group guide-moving"><h2>傾けて、道をつくる</h2><div class="guide-moving-grid">${movingWalls.map(card).join('')}</div><p class="guide-tip">傾きを戻すと壁は止まり、球は勢いで進む。綿で落ち着き、道を開き、タイミングを合わせよう。やさしい・通常、どちらにも登場します。</p></div>
 <div class="guide-group guide-walls"><h2>壁のいろいろ</h2><div class="guide-wall-grid">${walls.map(card).join('')}</div></div>
 <p class="guide-tip">壁にぶつかる強さで、げんきの減り方が変わります。</p><div class="guide-group"><h2>うれしいアイテム</h2><div class="guide-list">${items.map(card).join('')}</div></div>
 <div class="guide-group"><h2>床のしかけ</h2><div class="guide-list guide-floors">${floors.map(card).join('')}</div></div>
 <button type="button" class="guide-close">とじる</button><p class="guide-dismiss-note">背景をタップしても閉じられます</p>`;
 let scrollY=0,outsideDown=false;
 function draw() {
  for(const canvas of dialog.querySelectorAll('canvas')) {
   drawGuideArt(canvas,canvas.dataset.guideArt);
  }

 }
 const texture=new Image();texture.addEventListener('load',()=>{if(dialog.open)draw();});texture.src=new URL('../../assets/toy-wall-atlas.png',import.meta.url).href;
 for(const trigger of document.querySelectorAll('#btn-guide, #btn-pause-guide'))trigger.addEventListener('click',()=>{
  if(!canOpen(trigger.id)||dialog.open)return;
  opener=trigger;
  scrollY=window.scrollY;document.body.classList.add('guide-open');dialog.showModal();dialog.scrollTop=0;draw();
 });
 for(const b of dialog.querySelectorAll('button'))b.addEventListener('click',()=>dialog.close());
 const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 dialog.addEventListener('pointerdown',e=>{outsideDown=outside(e);});
 dialog.addEventListener('click',e=>{if(outsideDown&&outside(e))dialog.close();outsideDown=false;});
 dialog.addEventListener('close',()=>{document.body.classList.remove('guide-open');opener.focus({preventScroll:true});window.scrollTo(0,scrollY);});
}

export function drawGuideArt(canvas,id) {
   const c=canvas.getContext('2d');c.clearRect(0,0,144,112);
   if(['slide-demo','brake-demo','force-demo',...floorMaterials.map(f=>f[0])].includes(id)){drawFloorArt(canvas,({'slide-demo':'ice','brake-demo':'iceSand','force-demo':'specialFlow'})[id]||id);return;}
   if(['racket','gate','timing-demo'].includes(id)){drawMovingWallArt(canvas,id);return;}
   if(walls.some(w=>w[0]===id)) drawToyWall(c,{x:17,y:35,w:110,h:32,materialId:id},{toScreen:(x,y)=>({px:x,py:y}),toPx:n=>n});
   else if(id==='candy')drawToyCandy(c,72,56,45,0,true);
   else if(id==='leaf')drawLeaf(c,72,56,40);
   else if(id==='hourglass')drawHourglass(c,72,56,43);
   else {
    const at={x:72,y:58};drawFeatureFloors(c,{rest:id==='rest'?{...at,used:false,progress:0}:null,sticky:id==='sticky'?[at]:[]},{toScreen:(x,y)=>({px:x,py:y}),toPx:n=>n*110});
    if(id==='sticky')createToyBall().draw(c,72,43,22);
   }
}

/** 本編と同じ紫の壁を使い、打ち分けと道を開く動きを別の図で示す。 */
function drawMovingWallArt(canvas,id) {
 const c=canvas.getContext('2d'),width=canvas.width,height=canvas.height;
 c.save();c.clearRect(0,0,width,height);c.scale(width/144,height/112);
 const ice=c.createLinearGradient(0,0,144,112);ice.addColorStop(0,'#e1f6ef');ice.addColorStop(1,'#acd8d5');
 c.fillStyle=ice;c.beginPath();c.roundRect(0,0,144,112,10);c.fill();
 c.strokeStyle='#ffffff66';c.lineWidth=1;
 for(const x of [24,61,103]){c.beginPath();c.moveTo(x,0);c.lineTo(x-14,112);c.stroke();}
 const camera={toScreen:(x,y)=>({px:x,py:y}),toPx:n=>n};
 const drawWall=(wall)=>drawRackets(c,camera,{rackets:[wall]},new Map(),0);
 const arrow=(x,y,toX,toY,color='#6f4b89',dashed=false)=>{
  c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2;c.setLineDash(dashed?[3,3]:[]);
  c.beginPath();c.moveTo(x,y);c.lineTo(toX,toY);c.stroke();c.setLineDash([]);
  const angle=Math.atan2(toY-y,toX-x);c.beginPath();c.moveTo(toX,toY);c.lineTo(toX-6*Math.cos(angle-.5),toY-6*Math.sin(angle-.5));c.lineTo(toX-6*Math.cos(angle+.5),toY-6*Math.sin(angle+.5));c.closePath();c.fill();
 };
 if(id==='racket'){
  const wall={id:'guide-racket',x:30,y:34,w:12,h:54,axis:'y',min:19,max:42,bounce:'aim'};
  drawWall(wall);arrow(124,62,47,62,'#cb7044',true);arrow(47,62,108,62);arrow(47,46,103,17);arrow(47,78,105,99);
  createToyBall().draw(c,118,62,7);c.fillStyle='#6f4b89';c.font='bold 10px system-ui';c.textAlign='center';c.fillText('↕',20,61);
 }else{
  drawToyWall(c,{x:0,y:46,w:27,h:12,materialId:'cork'},camera);drawToyWall(c,{x:104,y:46,w:40,h:12,materialId:'cork'},camera);
  c.save();c.globalAlpha=.25;drawWall({id:'guide-closed',x:27,y:46,w:54,h:12,axis:'x',min:27,max:81,bounce:'reflect'});c.restore();
  drawWall({id:'guide-gate',label:'1',x:81,y:46,w:54,h:12,axis:'x',min:27,max:81,bounce:'reflect'});
  arrow(41,34,74,34);arrow(52,90,52,64,'#cb7044');
  createToyBall().draw(c,52,92,7);
  if(id==='timing-demo'){arrow(13,22,52,22,'#cb7044',true);arrow(80,76,41,76);}
 }
 c.restore();
}
