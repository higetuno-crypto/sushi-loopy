import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{window.__longTasks=[];new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(x=>x.duration))).observe({entryTypes:['longtask']});});
  const page=await context.newPage();const errors=[];const origins=new Set();
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>origins.add(new URL(r.url()).origin));
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto('http://127.0.0.1:4178',{waitUntil:'networkidle'});
  await page.screenshot({path:'artifacts/mobile-production.png',fullPage:true});
  for(let i=0;i<10;i++)await page.getByRole('button',{name:'寿司をタップする'}).tap();
  await page.getByRole('button',{name:'職人さんを購入',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelector('[data-facility=craftsman] .facility-owned')?.textContent.includes('1'));
  await page.locator('.content-panel').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'さっと寿司を握る'}).waitFor();
  await page.getByRole('button',{name:'さっと寿司を握る'}).tap();
  await page.screenshot({path:'artifacts/mobile-dock-production.png'});
  const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    domNodes:document.querySelectorAll('*').length, resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,bytes:r.encodedBodySize,duration:r.duration})),
    longTasks:window.__longTasks.length, maxLongTaskMs:Math.max(0,...window.__longTasks),
  }));
  assert.equal(metrics.width,390);assert.ok(metrics.scrollWidth<=390);assert.deepEqual(errors,[]);assert.deepEqual([...origins],['http://127.0.0.1:4178']);
  // No remote font/analytics/model downloads; Three.js/model prototypes must not load in normal play.
  assert.ok(metrics.resources.every(r=>!r.name.endsWith('.glb')));
  await writeFile('artifacts/production-results.json',JSON.stringify({status:'PASS',browser:'installed Edge, mobile touch emulation, CPU 4x slowdown; not physical iPhone/Safari',errors,origins:[...origins],metrics},null,2));
  console.log(JSON.stringify({status:'PASS',metrics},null,2));
}finally{await browser.close();}
