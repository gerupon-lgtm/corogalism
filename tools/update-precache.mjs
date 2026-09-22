/** 配信前に実行。実行資材の変更に連動するキャッシュ名と一覧を生成する。 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = new URL('../',import.meta.url);
async function walk(dir) {
  const files=[];
  for(const e of await readdir(new URL(dir,base),{withFileTypes:true})) {
    const name=dir+e.name;
    if(e.isDirectory()) files.push(...await walk(name+'/'));
    else if(/\.(js|png|svg|wav|woff2)$/.test(name)) files.push(name);
  }
  return files;
}
const files=['index.html','style.css','floor-lab.html','floor-lab.css','manifest.webmanifest',...await walk('src/'),...await walk('assets/')].sort();
const hash=createHash('sha256');
for(const f of [...files,'sw.js']) {hash.update(f);hash.update(await readFile(new URL(f,base)));}
const version=hash.digest('hex').slice(0,16);
await writeFile(new URL('precache.js',base),`self.PRECACHE_VERSION = '${version}';\nself.PRECACHE_FILES = ${JSON.stringify(files,null,2)};\n`);
console.log(`Precache ${version}: ${files.length} files`);
