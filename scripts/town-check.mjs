import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.SUSHI_TEST_URL||'http://127.0.0.1:5180/';
const output=process.env.SUSHI_ARTIFACT_DIR||'artifacts/town-3d';
await mkdir(output,{recursive:true});
const ids=['craftsman','conveyor_sushi','auto_sushi_machine','marine_food_plant','sushi_ocean_mining','fusion_sushi_converter','luna_sea','freshness_freezer','global_freshness_sync'];
const seed=()=>({schemaVersion:5,savedAtMs:Date.now(),game:{facilityCounts:Object.fromEntries(ids.map(id=>[id,id==='global_freshness_sync'?0:1])),sushi:1e10,totalSushiEarned:1e10,totalClicks:1500,runPlayTimeMs:300000,endingPhase:'playing',collapseElapsedMs:0,syncCount:0,syncElapsedMs:0,previousRun:null,unlockedAchievementIds:[],purchasedUpgradeIds:[],seenNewsIds:[]}});
const browser=await(process.env.SUSHI_ENGINE==='webkit'?webkit:chromium).launch({headless:true,...(process.env.SUSHI_ENGINE==='webkit'?{}:{channel:'chrome'})});
const errors=[],results=[];
async function fresh(width,height,save){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<700,reducedMotion:'no-preference'});
  if(save)await context.addInitScript(data=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('sushi-loopy.save',JSON.stringify(data));sessionStorage.setItem('seeded','yes');}},save);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('.town-viewport[data-ready="true"]').first().waitFor({timeout:20000});
  return {page,context};
}
try {
  for(const [width,height] of [[320,568],[390,844],[1280,720]]) {
    const {page,context}=await fresh(width,height);
    assert.equal(await page.locator('canvas').count(),1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),'equipment can scroll');
    assert.equal(await page.getByText('ひと皿、いい？',{exact:true}).count(),0);
    await page.screenshot({path:`${output}/${width}-start.png`});
    const button=page.getByRole('button',{name:'寿司をタップする。長押しでも握れます',exact:true});
    for(let i=0;i<10;i++)await button.click();
    await page.getByRole('button',{name:'職人さんを購入',exact:true}).click();
    await page.waitForTimeout(900);
    assert.equal(await page.locator('[data-facility="craftsman"] .facility-owned').innerText(),'× 1');
    await page.screenshot({path:`${output}/${width}-craftsman.png`});
    results.push({width,height,firstPurchase:true,drawCalls:await page.locator('.town-viewport').getAttribute('data-draw-calls')});
    await context.close();
  }
  const {page,context}=await fresh(390,844,seed());
  await page.screenshot({path:`${output}/390-grown.png`});
  await page.getByRole('button',{name:'港',exact:true}).click();await page.waitForTimeout(1100);
  await page.screenshot({path:`${output}/390-port.png`});
  const truck=await page.locator('.town-viewport').getAttribute('data-truck-position');
  await page.waitForTimeout(1500);
  assert.notEqual(await page.locator('.town-viewport').getAttribute('data-truck-position'),truck,'truck moves on road');
  await page.getByRole('button',{name:'全景',exact:true}).click();await page.waitForTimeout(1200);
  await page.screenshot({path:`${output}/390-overview.png`});
  await page.getByRole('button',{name:'記録と設定を開く',exact:true}).click();
  await page.getByRole('button',{name:'アニメーションを停止',exact:true}).click();
  await page.getByRole('button',{name:'記録と設定を閉じる',exact:true}).click();
  await page.waitForTimeout(200);
  const stopped=await page.locator('.town-viewport').getAttribute('data-time');await page.waitForTimeout(400);
  assert.equal(await page.locator('.town-viewport').getAttribute('data-time'),stopped,'reduced motion freezes model clock');
  const canvas=page.locator('.town-viewport canvas');
  const beforeDrag=await canvas.screenshot();
  const area=await canvas.boundingBox();
  await page.mouse.move(area.x+area.width*.6,area.y+area.height*.3);await page.mouse.down();
  await page.mouse.move(-200,area.y+area.height+300,{steps:15});await page.mouse.up();
  assert.ok(beforeDrag.equals(await canvas.screenshot()),'a drag cannot move the fixed composition');
  await page.getByRole('button',{name:'模様替え',exact:true}).click();
  await page.getByLabel('お店の名前',{exact:true}).fill('青い海のおすし');
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await page.getByRole('button',{name:'夕暮れ',exact:true}).click();
  await page.locator('.town-move-list').getByRole('button',{name:'職人さん',exact:false}).click();
  await page.locator('.town-plot-picker').getByRole('button',{name:'海洋食材プラント',exact:true}).click();
  await page.getByRole('button',{name:'配置を元に戻す ↶',exact:true}).click();
  await page.getByRole('button',{name:'写真モードを開く' ,exact:true}).click();
  await page.getByRole('button',{name:'この景色を撮る',exact:true}).click();
  await page.getByRole('link',{name:'写真を保存 ↓',exact:true}).waitFor();
  const download=page.waitForEvent('download');await page.getByRole('link',{name:'写真を保存 ↓',exact:true}).click();
  await(await download).saveAs(`${output}/town-photo.png`);
  await page.getByRole('button',{name:'街に戻る',exact:true}).click();
  await page.waitForTimeout(5200);await page.reload();
  await page.locator('.town-viewport[data-ready=true]').waitFor();
  assert.equal(await page.getByRole('heading',{level:1}).innerText(),'青い海のおすし');
  assert.equal(await page.locator('.weather-evening').count(),1);
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('sushi-loopy.save')));
  assert.equal(save.schemaVersion,6);assert.deepEqual(save.game.town.plots,[0,1,2,3,4,5,6,7,8]);
  // Losing WebGL affects the scene only; the shop and saves keep working.
  if(process.env.SUSHI_ENGINE!=='webkit') {
    await page.locator('.town-viewport canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.getByRole('button',{name:'街を再表示',exact:true}).waitFor();
    await page.getByRole('button',{name:'街を再表示',exact:true}).click();
    await page.locator('.town-viewport[data-ready=true] canvas').waitFor();
    await page.waitForTimeout(400);assert.equal(await page.locator('.town-render-fallback').count(),0);
  }
  results.push({legacyMigration:true,motionStop:true,photo:true,customization:true,layoutUndo:true,reload:true,cameraEscapePrevented:true});
  await context.close();
  const ending=seed();Object.assign(ending.game,{endingPhase:'collapse',collapseElapsedMs:0,syncCount:2,syncElapsedMs:18000});ending.game.facilityCounts.global_freshness_sync=3;
  const endingCase=await fresh(390,844,ending);
  const endingTime=await endingCase.page.locator('.town-viewport').getAttribute('data-time');
  await endingCase.page.locator('.world-fracture.is-rendered').waitFor({timeout:20000});
  assert.equal(await endingCase.page.locator('.fracture-fallback').count(),0);
  assert.equal(await endingCase.page.locator('.town-viewport').getAttribute('data-time'),endingTime);
  await endingCase.page.screenshot({path:`${output}/fracture-snapshot.png`});
  await endingCase.page.waitForTimeout(5500);
  await endingCase.page.screenshot({path:`${output}/fracture.png`});
  results.push({webglSceneInFracture:true,collapsePausesTown:true});
  await endingCase.context.close();assert.deepEqual(errors,[]);
  await writeFile(`${output}/checks.json`,JSON.stringify({results,errors},null,2));console.log({results,errors});
} finally {await browser.close();}
