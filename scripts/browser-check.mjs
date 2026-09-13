import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.SUSHI_TEST_URL || 'http://127.0.0.1:5178';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.SUSHI_BROWSER_CHANNEL || 'msedge' });
const context = await browser.newContext({ viewport: { width:1280, height:960 }, deviceScaleFactor:1 });
await context.addInitScript(() => {
  const NativeAudio = window.AudioContext;
  window.__audioContexts = [];
  window.AudioContext = class extends NativeAudio { constructor(...args) { super(...args); window.__audioContexts.push(this); } };
});
const page = await context.newPage();
const errors=[];
page.on('pageerror', error=>errors.push(error.message));
page.on('console', message=>{if(message.type()==='error')errors.push(message.text());});
const results=[];
const check=async(name,fn)=>{await fn();results.push({name,status:'PASS'});console.log(`PASS ${name}`);};
const state=()=>page.evaluate(async()=>{const {useGameStore}=await import('/src/game/state/store.ts');const s=useGameStore.getState();return JSON.parse(JSON.stringify(s));});
try {
  await page.goto(base);
  await page.getByRole('button',{name:'寿司をタップする'}).waitFor();
  await check('initial render, optimized image, no autoplay, desktop overflow',async()=>{
    assert.equal(await page.locator('.sushi-button img').evaluate(img=>img.complete && img.naturalWidth>0),true);
    assert.equal(await page.evaluate(()=>window.__audioContexts.length),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'artifacts/desktop-initial.png',fullPage:true});
  });
  await check('10 taps -> real facility purchase -> achievement and v5 checkpoint',async()=>{
    for(let i=0;i<10;i++)await page.getByRole('button',{name:'寿司をタップする'}).click();
    await page.getByRole('button',{name:'職人さんを購入',exact:true}).click();
    const s=await state();assert.equal(s.facilityCounts.craftsman,1);assert.ok(s.unlockedAchievementIds.includes('first_craftsman'));
    const cp=await page.evaluate(()=>JSON.parse(localStorage.getItem('sushi-loopy.facility-checkpoints')));
    assert.equal(cp.craftsman.save.schemaVersion,5);assert.deepEqual(cp.craftsman.save.game.unlockedAchievementIds,['first_craftsman']);
  });
  await check('100 click achievement UI and no duplicates',async()=>{
    for(let i=10;i<100;i++)await page.getByRole('button',{name:'寿司をタップする'}).click();
    const s=await state();assert.equal(s.totalClicks,100);assert.equal(s.unlockedAchievementIds.filter(x=>x==='click_100').length,1);
    await page.getByRole('tab',{name:/実績帳/}).click();await page.getByRole('heading',{name:'百握りの道も、一握りから'}).waitFor();
    await page.screenshot({path:'artifacts/desktop-achievements.png',fullPage:true});
  });
  await check('Upgrade purchase via UI and doubled tap gain',async()=>{
    await page.getByRole('tab',{name:'強化',exact:true}).click();await page.getByRole('button',{name:'手のひらの記憶を購入'}).click();
    assert.ok((await state()).purchasedUpgradeIds.includes('warm_hands'));
    assert.ok(await page.getByRole('button',{name:'手のひらの記憶を購入'}).isDisabled());
    const value=await page.evaluate(async()=>{const {selectSushiPerClick}=await import('/src/game/state/selectors.ts');const {useGameStore}=await import('/src/game/state/store.ts');return selectSushiPerClick(useGameStore.getState());});assert.equal(value,2);
  });
  await check('audio opt-in, running context, volume control and mute',async()=>{
    await page.getByRole('button',{name:'音をつける',exact:true}).click();
    await page.getByRole('button',{name:'音を消す',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__audioContexts[0].state),'running');
    await page.getByRole('slider',{name:'音量'}).fill('20');
    await page.getByRole('button',{name:'音を消す',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__audioContexts[0].state),'suspended');
  });
  await check('Auto Save -> browser reload retains achievements/upgrades',async()=>{
    await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('sushi-loopy.save')||'null');return s?.game.purchasedUpgradeIds.includes('warm_hands');},null,{timeout:8000});
    await page.reload();await page.getByRole('button',{name:'寿司をタップする'}).waitFor();
    const s=await state();assert.equal(s.totalClicks,100);assert.ok(s.purchasedUpgradeIds.includes('warm_hands'));assert.ok(s.unlockedAchievementIds.includes('click_100'));
  });
  await check('Save Code UI exports and confirmed import restores exact click count',async()=>{
    await page.getByText('セーブとバックアップ',{exact:true}).click();
    await page.getByRole('button',{name:'Save Codeを書き出す'}).click();
    const code=await page.getByRole('textbox',{name:'Save Code',exact:true}).inputValue();assert.ok(code.startsWith('SUSHILOOPY1:'));
    await page.getByRole('button',{name:'寿司をタップする'}).click();
    page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Save Codeから復元'}).click();assert.equal((await state()).totalClicks,100);
  });
  await check('Checkpoint restore UI retains first purchase, rolls back all added fields',async()=>{
    await page.getByText(/施設の初回購入へ戻る/).click();
    page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Restore',exact:true}).first().click();
    const s=await state();assert.equal(s.totalClicks,10);assert.equal(s.facilityCounts.craftsman,1);assert.deepEqual(s.purchasedUpgradeIds,[]);assert.deepEqual(s.unlockedAchievementIds,['first_craftsman']);
  });
  await check('progression unlocks new facilities, News publishes and persists history',async()=>{
    // Synthetic balance in this isolated browser only, then genuine UI purchases.
    await page.evaluate(async()=>{const {useGameStore}=await import('/src/game/state/store.ts');useGameStore.setState({sushi:20000,totalSushiEarned:21000});});
    await page.getByRole('button',{name:'回転寿司オープンを購入'}).click();
    await page.getByRole('button',{name:'寿司自動握り器を購入'}).click();
    await page.waitForFunction(()=>document.querySelector('.news-ticker p')?.textContent.includes('自動握り器'),null,{timeout:16000});
    assert.ok((await state()).seenNewsIds.includes('machine'));
    await page.getByText('セーブとバックアップ',{exact:true}).click();await page.getByText(/施設の初回購入へ戻る/).click();
    await page.screenshot({path:'artifacts/desktop-growing.png',fullPage:true});
  });
  await check('iPhone 12 layout (390 x 844), touch-sized controls and reduced motion',async()=>{
    await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
    await page.screenshot({path:'artifacts/mobile-growing.png',fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.ok((await page.getByRole('button',{name:'寿司をタップする'}).boundingBox()).height>=44);
    assert.equal(await page.locator('.conveyor-strip > div').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.getByRole('tab',{name:/実績帳/}).click();await page.screenshot({path:'artifacts/mobile-achievements.png',fullPage:true});
    await page.setViewportSize({width:320,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  });
  await check('fresh browser v1 migration + offline production + v1 backup',async()=>{
    const isolated=await browser.newContext();const p=await isolated.newPage();
    const old=await page.evaluate(async()=>{const {createInitialGameState}=await import('/src/game/state/initialState.ts');return {schemaVersion:1,savedAtMs:Date.now()-60000,game:{sushi:20,facilityCounts:{...createInitialGameState().facilityCounts,craftsman:1},runPlayTimeMs:5000}};});
    await p.addInitScript(data=>localStorage.setItem('sushi-loopy.save',JSON.stringify(data)),old);
    await p.goto(base);await p.getByRole('button',{name:'寿司をタップする'}).waitFor();
    const result=await p.evaluate(()=>({save:JSON.parse(localStorage.getItem('sushi-loopy.save')),backup:JSON.parse(localStorage.getItem('sushi-loopy.save.backup-v1'))}));
    assert.equal(result.save.schemaVersion,5);assert.ok(result.save.game.sushi>=80);assert.equal(result.save.game.totalClicks,0);assert.deepEqual(result.backup,old);await isolated.close();
  });
  await check('invalid browser save protected and warning visible',async()=>{
    const isolated=await browser.newContext();const p=await isolated.newPage();await p.addInitScript(()=>localStorage.setItem('sushi-loopy.save','broken-save'));
    await p.goto(base);await p.getByRole('alert').waitFor({timeout:8000});assert.equal(await p.evaluate(()=>localStorage.getItem('sushi-loopy.save')),'broken-save');await isolated.close();
  });
  await check('no browser runtime/console errors',async()=>assert.deepEqual(errors,[]));
} catch(error) {
  results.push({name:'browser failure',status:'FAIL',error:String(error)});
  await page.screenshot({path:'artifacts/browser-failure.png',fullPage:true});
  throw error;
} finally {
  await writeFile('artifacts/browser-results.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}
