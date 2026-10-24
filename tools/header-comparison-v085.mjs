/** 同じ寸法の実画面を横に並べ、ユーザーが示したヘッダー境界を白線で示す。 */
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out=process.env.HOME_OUTPUT||'docs/verification/v0.8.5/local';
const data=JSON.parse(await readFile(`${out}/header-alignment.json`,'utf8'));
const row=data.rows.find(r=>r.width===390&&r.height===844&&r.camera===47);
const images=await Promise.all(['play-390-844-47.png','home-390-844-47.png'].map(async name=>'data:image/png;base64,'+(await readFile(`${out}/${name}`)).toString('base64')));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:792,height:920}});
 await page.setContent(`<style>html,body{margin:0;background:#0f1513;color:#f7eddb;font:14px sans-serif}main{display:flex;gap:12px;position:relative}figure{margin:0;width:390px}figcaption{height:28px;line-height:28px;text-align:center}img{display:block;width:390px;height:auto}.boundary{position:absolute;top:${28+row.play.meter.y}px;left:0;right:0;border-top:1px solid white;pointer-events:none}</style><main><figure><figcaption>プレイ画面（基準）</figcaption><img src="${images[0]}"></figure><figure><figcaption>トップ（修正後）</figcaption><img src="${images[1]}"></figure><div class="boundary"></div></main>`);
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 await page.screenshot({path:`${out}/comparison.png`,fullPage:true});
}finally{await browser.close();}
