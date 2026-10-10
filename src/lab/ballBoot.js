// 旧PWAの物理と新しい試遊素材を混在させない。
try{
 const source=await fetch(new URL('../physics/resolveParams.js',import.meta.url));
 const code=await source.text();
 const stageSource=await fetch(new URL('../world/stage.js',import.meta.url));
 const stageCode=await stageSource.text();
 const [materials,lab]=await Promise.all([fetch(new URL('../world/materials.js',import.meta.url)),fetch(new URL('./ballLabStage.js',import.meta.url))]);
 const [materialCode,labCode]=await Promise.all([materials.text(),lab.text()]);
 if(!source.ok||!code.includes('ch.fieldK')||!code.includes('ch.bounce')||!code.includes('policy?.unrestricted')||!stageSource.ok||!stageCode.includes("z.kind === 'ice' && !stage.physicsPolicy?.unrestricted")||!materials.ok||!materialCode.includes('cotton:')||!lab.ok||!labCode.includes('mixCotton')){
  document.getElementById('status').textContent='ゲームの更新が必要です。上の「コロガリズムへ」から「更新チェック」で更新したあと、このページを開き直してください。';
  document.querySelectorAll('button,select,input').forEach(el=>el.disabled=true);
 }else await import('./ballLab.js');
}catch{document.getElementById('status').textContent='読み込めませんでした。通信状態を確認してページを開き直してください。';}
