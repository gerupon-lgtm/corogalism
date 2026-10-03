import json, hashlib, urllib.request, concurrent.futures
from pathlib import Path
import os, re
root=Path('.')
manifest=(root/'precache.js').read_text(encoding='utf-8')
paths=json.loads(re.search(r'self\.PRECACHE_FILES\s*=\s*(\[.*?\]);',manifest,re.S).group(1))
paths=sorted(set(paths+['precache.js','sw.js','package.json']))
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
def check(path):
 url='https://corogalism.sikumilab.com/'+path+'?verify='+version
 with urllib.request.urlopen(url,timeout=40) as r: data=r.read();status=r.status
 actual=hashlib.sha256(data).hexdigest();expected=hashlib.sha256((root/path).read_bytes()).hexdigest()
 return dict(path=path,status=status,sha256=actual,match=actual==expected)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: rows=list(pool.map(check,paths))
Path(os.environ.get('DEPLOY_HASH_OUTPUT','docs/verification/floor-performance/deploy-hashes.json')).write_text(json.dumps(rows,indent=2)+'\n',newline='\n')
print('files',len(rows),'matched',sum(r['match'] for r in rows))
assert all(r['status']==200 and r['match'] for r in rows)
