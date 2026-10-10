// Versioned entry avoids mixing a new experiment with an old saved module graph.
const status=document.getElementById('status');
try {
  const required=['../config/gameConfig.js','../world/stage.js','../physics/resolveParams.js','../render/canvasRenderer.js'];
  const sources=await Promise.all(required.map(async path=>{const response=await fetch(new URL(path,import.meta.url));if(!response.ok)throw Error('missing');return response.text();}));
  if(!sources[0].includes('LAB_EXPLORATION')||!sources[1].includes("z.kind === 'ice' && !stage.physicsPolicy?.unrestricted")||!sources[2].includes('policy?.unrestricted')||!sources[3].includes('drawExtras')){
    status.textContent='ゲームの更新が必要です。上の「コロガリズムへ」から「更新チェック」で更新し、このページを開き直してください。';
    document.querySelectorAll('button,select,input').forEach(element=>element.disabled=true);
  }else await import('./racketLab.js');
}catch{status.textContent='読み込めませんでした。通信状態を確認してページを開き直してください。';}
