import {createRequire} from 'node:module';import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';
const require=createRequire(import.meta.url);const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});const results=[];
try{for(const blocked of[true,false]){
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 await page.addInitScript(blocked=>{
  if(blocked){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args);};}
  const facilityCounts=Object.fromEntries(['craftsman','conveyor_sushi','auto_sushi_machine','marine_food_plant','sushi_ocean_mining','fusion_sushi_converter','luna_sea','freshness_freezer','global_freshness_sync'].map(id=>[id,3]));
  localStorage.setItem('sushi-loopy.save',JSON.stringify({schemaVersion:4,savedAtMs:Date.now(),game:{facilityCounts,sushi:0,totalSushiEarned:5e9,totalClicks:100,runPlayTimeMs:500000,
    endingPhase:'collapse',collapseElapsedMs:21000,syncCount:3,syncElapsedMs:0,unlockedAchievementIds:[],purchasedUpgradeIds:[],seenNewsIds:[]}}));
 },blocked);
 await page.goto(process.env.SUSHI_TEST_URL||'http://127.0.0.1:4178');
 if(!blocked){await page.locator('.world-fracture.is-rendered canvas').waitFor();await page.locator('.world-fracture canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());}
 await page.locator('.fracture-fallback').waitFor();assert.equal(await page.locator('.world-fracture canvas').count(),0);
 await page.getByRole('button',{name:'寿司を握る',exact:true}).waitFor({timeout:15000});await page.getByRole('button',{name:'寿司を握る',exact:true}).click();
 await page.getByRole('button',{name:'寿司をタップする'}).waitFor();assert.equal(await page.locator('.resource-value').textContent(),'0');assert.equal(await page.locator('.world-fracture').count(),0);
 results.push({scenario:blocked?'WebGL unavailable':'WebGL context lost',status:'PASS'});await context.close();
}await writeFile('artifacts/silent-loop/fallback-results.json',JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();}
