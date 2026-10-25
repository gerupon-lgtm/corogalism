/** 紹介・練習の見出しと、共通操作を基準にした表示領域。物理座標は変更しない。 */
export function createPlayLayout(root) {
  const find=id=>root.getElementById(id);
  const wrap=root.querySelector('.wrap'),heading=find('play-heading'),hud=find('challenge-hud');
  const card=find('play-mode-card'),title=find('mode-card-title'),description=find('mode-card-description');
  const icon=find('mode-card-icon'),comment=find('practice-comment'),count=find('practice-stage');
  const board=find('board'),panel=find('screen-game'),toolbar=find('play-toolbar');
  const calibrate=find('btn-calibrate').closest('.row'),exit=find('btn-game-exit');
  const probe=hud.cloneNode(true);
  probe.removeAttribute('id');probe.classList.remove('home-header-space');probe.hidden=false;
  probe.setAttribute('aria-hidden','true');probe.inert=true;
  probe.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  probe.style.cssText='position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none';
  root.body.append(probe);
  let mode=null,visible=false,fitting=false;
  const rect=e=>e.getBoundingClientRect();
  function setMode(value) {
    mode=value.mode;visible=value.visible;
    heading.hidden=!visible||mode==='floor-practice';
    if(visible&&mode==='floor-practice'){
      board.style.removeProperty('width');panel.style.removeProperty('height');
      for(const e of [heading,toolbar,panel])e.style.removeProperty('width');
      root.body.classList.remove('compact-play-band');
      calibrate.style.removeProperty('top');exit.style.removeProperty('top');
      toolbar.querySelector('.play-labels').style.removeProperty('padding-left');
    }
    card.hidden=!visible||!['practice','tutorial'].includes(mode);
    count.hidden=!visible||mode!=='practice';
    if(card.hidden)return;
    card.dataset.kind=mode;
    title.textContent=mode==='practice'?'プラクティス':'チュートリアル';
    description.textContent=mode==='practice'?'時間制限なしで、くり返し練習。':'げんきが0になっても続けられます。';
    const source=root.querySelector(mode==='practice'?'.hero-ball':'[data-toy="candy"]');
    icon.src=source.toDataURL();
    count.textContent=`${value.stageIndex??1}面目 / ${value.stageCount??5}`;
    comment.hidden=mode!=='practice';
  }
  function setComment(text) { if(comment.textContent!==text)comment.textContent=text; }
  function fit() {
    if(fitting||!visible||mode==='floor-practice'||board.hidden)return;
    fitting=true;
    try {
      const viewport=Math.min(innerHeight,visualViewport?.height||innerHeight);
      const width=wrap.clientWidth-parseFloat(getComputedStyle(wrap).paddingLeft)-parseFloat(getComputedStyle(wrap).paddingRight);
      const setWidth=size=>{
        for(const e of [heading,toolbar,panel])e.style.width=size+'px';
        root.body.classList.toggle('compact-play-band',size<320);
      };
      setWidth(width);
      probe.style.width=width+'px';
      heading.style.height=Math.ceil(rect(probe).height)+'px';
      const end=viewport-parseFloat(getComputedStyle(wrap).paddingBottom);
      const exitBottom=end-(viewport<=800?5:9);
      const calTop=exitBottom-rect(exit).height-6-rect(calibrate).height;
      const lesson=find('tutorial-lesson');
      for(let i=0;i<5;i++) {
        const content=mode==='tutorial'?rect(lesson).height+6:rect(panel.querySelector('.hud')).height+6+rect(find('game-status')).height+6;
        const gap=rect(panel).top-rect(board).bottom;
        const padding=parseFloat(getComputedStyle(panel).paddingTop)+1;
        const size=Math.max(240,Math.floor(Math.min(width,calTop-rect(board).top-gap-padding-content)));
        if(Math.abs(rect(board).width-size)>.5)board.style.width=size+'px';
        setWidth(size);
        const inset=Math.max(0,rect(board).left+3-rect(toolbar).left);
        toolbar.querySelector('.play-labels').style.paddingLeft=inset+'px';
        count.style.marginLeft=inset+'px';
      }
      panel.style.height=Math.max(1,end-rect(panel).top)+'px';
      for(const e of [calibrate,exit])e.style.top='0px';
      calibrate.style.top=(calTop-rect(calibrate).top)+'px';
      exit.style.top=(exitBottom-rect(exit).bottom)+'px';
    } finally { fitting=false; }
  }
  return {setMode,setComment,fit};
}
