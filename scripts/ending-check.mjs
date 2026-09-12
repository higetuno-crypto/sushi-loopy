import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.SUSHI_TEST_URL||'http://127.0.0.1:5178';
await mkdir('artifacts/sync-v2',{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.SUSHI_BROWSER_CHANNEL||'msedge'});
const results=[],errors=[];
try{
 for(const mobile of [false,true]){
  const name=mobile?'mobile':'desktop';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},
    isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference',
    recordVideo:{dir:'artifacts/sync-v2',size:mobile?{width:390,height:844}:{width:1280,height:900}}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:'寿司をタップする'}).waitFor();
  // Seed only a fresh isolated context. No player profile/localStorage is accessed.
  const facilityCounts=Object.fromEntries(['craftsman','conveyor_sushi','auto_sushi_machine','marine_food_plant','sushi_ocean_mining','fusion_sushi_converter','luna_sea','freshness_freezer','global_freshness_sync'].map(id=>[id,id==='global_freshness_sync'?0:1]));
  const legacy={schemaVersion:3,savedAtMs:Date.now(),game:{facilityCounts,sushi:5e9,totalSushiEarned:5e9,totalClicks:1500,runPlayTimeMs:3600000,
    endingPhase:'playing',collapseElapsedMs:0,unlockedAchievementIds:[],purchasedUpgradeIds:[],seenNewsIds:[]}};
  await page.addInitScript(save=>{if(!sessionStorage.getItem('seeded-sync')){
    localStorage.setItem('sushi-loopy.save',JSON.stringify(save));sessionStorage.setItem('seeded-sync','yes');
  }},legacy);
  await page.reload();
  const buy=page.getByRole('button',{name:'世界鮮度同期装置を購入',exact:true});
  await buy.click();
  await page.getByRole('dialog',{name:'鮮度同期を実施しますか？'}).waitFor();
  await page.getByRole('button',{name:'あとで',exact:true}).click();
  assert.equal(await page.locator('.game-screen').getAttribute('data-anomaly'),'0');
  await page.getByRole('button',{name:'鮮度同期を設定'}).click();
  await page.getByRole('button',{name:'同期する',exact:true}).click();
  assert.equal(await page.locator('.game-screen').getAttribute('data-anomaly'),'1');
  assert.equal(await page.locator('.ending-screen').count(),0);
  assert.equal(await page.getByText(/最後の一歩|結末まで約/).count(),0);
  await page.getByRole('button',{name:'寿司をタップする'}).click();
  await page.screenshot({path:`artifacts/sync-v2/${name}-01.png`});
  await buy.click();await page.getByRole('button',{name:'同期する',exact:true}).click();
  assert.equal(await page.locator('.game-screen').getAttribute('data-anomaly'),'2');
  assert.ok(await buy.isDisabled());
  await page.getByRole('button',{name:'寿司をタップする'}).click();
  await page.screenshot({path:`artifacts/sync-v2/${name}-02.png`});
  // Real elapsed time: medium develops into large while the shop remains playable.
  await page.waitForFunction(()=>document.querySelector('.game-screen')?.dataset.anomaly==='3',{},{timeout:25000});
  await page.screenshot({path:`artifacts/sync-v2/${name}-03.png`});
  assert.ok(await buy.isEnabled());
  await buy.click();
  assert.equal(await page.locator('.game-screen').getAttribute('data-anomaly'),'4');
  await page.screenshot({path:`artifacts/sync-v2/${name}-04.png`});
  await page.locator('.world-fracture.is-rendered canvas').waitFor({timeout:15000});
  await page.waitForFunction(()=>Number(document.querySelector('.world-fracture')?.getAttribute('data-elapsed'))>=14500);
  await page.screenshot({path:`artifacts/sync-v2/${name}-fracture.png`});
  assert.equal(await page.locator('.fracture-fallback').count(),0);
  assert.ok(await page.getByRole('button',{name:'音をつける',exact:true}).isVisible());
  if(mobile){
    // Mid-collapse reload preserves phase and rebuilds the renderer safely.
    await page.reload();await page.locator('.world-fracture.is-rendered canvas').waitFor({timeout:10000});
  }
  await page.getByRole('button',{name:'寿司を握る',exact:true}).waitFor({timeout:25000});
  await page.screenshot({path:`artifacts/sync-v2/${name}-last.png`});
  await page.getByRole('button',{name:'寿司を握る',exact:true}).click();
  await page.getByText('1周目 CLEAR',{exact:true}).waitFor();
  assert.equal(await page.locator('.world-fracture').count(),0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sushi-loopy.save')));
  assert.equal(saved.schemaVersion,4);assert.equal(saved.game.syncCount,3);assert.equal(saved.game.endingPhase,'cleared');
  await page.reload();await page.getByText('1周目 CLEAR',{exact:true}).waitFor();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'同期装置の購入前から試す'}).click();
  await page.getByRole('button',{name:'寿司をタップする'}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sushi-loopy.before-sync-replay')).game.endingPhase),'cleared');
  assert.equal(await page.locator('.game-screen').getAttribute('data-anomaly'),'0');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const video=page.video();await context.close();await video.saveAs(`artifacts/sync-v2/${name}-flow.webm`);
  results.push({device:name,status:'PASS',renderer:'Three.js / WebGL',reducedMotion:mobile});
  console.log(`PASS ${name}: two confirmations, escalation, third purchase, Three.js fracture, clear, replay`);
 }
 assert.deepEqual(errors,[]);
 await writeFile('artifacts/sync-v2/results.json',JSON.stringify({results,errors},null,2));
}finally{await browser.close();}
