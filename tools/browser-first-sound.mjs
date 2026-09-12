import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
try {
 for(const selector of ['.challenge-choice [data-level="easy"]','#btn-mode-settings','#btn-practice','#btn-challenge']) {
  const ctx=await browser.newContext();
  await ctx.addInitScript(()=>{
   Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});
   localStorage.setItem('corogalism-settings',JSON.stringify({soundEnabled:true,mode:'pointer'}));
   window.starts=[];const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){window.starts.push({duration:this.buffer?.duration,at:performance.now()});return start.apply(this,args)};
  });
  const pending=[];await ctx.route('**/assets/audio/*',r=>pending.push(r));
  const page=await ctx.newPage();await page.goto(base+'?debug=1');
  await page.locator(selector).click();
  await new Promise(r=>setTimeout(r,250));
  const starts=await page.evaluate(()=>window.starts);
  assert.ok(starts.some(s=>Math.abs(s.duration-.35)<.01),selector+': first action must play select SE while other assets are still loading; actual='+JSON.stringify(starts));
  assert.equal(starts.filter(s=>Math.abs(s.duration-.35)<.01).length,1,'exactly one initial select SE');
  console.log('PASS first action',selector);
  await ctx.close();
 }
}finally{await browser.close()}
