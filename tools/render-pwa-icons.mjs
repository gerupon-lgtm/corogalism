import { readFile, mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();const svg=await readFile('assets/pwa/icon.svg','utf8');
 for(const n of [192,512]) { await page.setViewportSize({width:n,height:n});await page.setContent(`<style>body{margin:0}svg{width:100vw;height:100vh;display:block}</style>${svg}`);await page.screenshot({path:`assets/pwa/icon-${n}.png`}); }
} finally {await browser.close();}
