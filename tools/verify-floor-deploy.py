import json, hashlib, urllib.request, concurrent.futures
from pathlib import Path
root=Path('.')
paths=['index.html','package.json','style.css','precache.js','sw.js','src/main.js','src/config/gameConfig.js','src/pwa.js','src/world/floorThemes.js','src/world/themes.js','src/world/stage.js','src/world/materials.js','src/world/recovery.js','src/world/stageFeatures.js','src/game/challenge.js','src/game/progression.js','src/game/stagePlay.js','src/render/floorArt.js','src/render/floorVisuals.js','src/render/canvasRenderer.js','src/render/materialAppearance.js','src/render/toyWorld.js','src/audio/floorJingle.js','src/audio/soundManager.js','src/ui/guide.js','src/ui/floorPresentation.js','src/ui/runScreens.js','src/record/storage.js']
def check(path):
 url='https://corogalism.sikumilab.com/'+path+'?verify=v060-d01733d'
 with urllib.request.urlopen(url,timeout=40) as r: data=r.read();status=r.status
 actual=hashlib.sha256(data).hexdigest();expected=hashlib.sha256((root/path).read_bytes()).hexdigest()
 return dict(path=path,status=status,sha256=actual,match=actual==expected)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: rows=list(pool.map(check,paths))
Path('docs/verification/floor-challenge/deploy-hashes.json').write_text(json.dumps(rows,indent=2))
print('files',len(rows),'matched',sum(r['match'] for r in rows))
assert all(r['status']==200 and r['match'] for r in rows)
