import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.SUSHI_TEST_URL||'http://127.0.0.1:5180/';
const output=process.env.SUSHI_ARTIFACT_DIR||'artifacts/conveyor-models/chrome';
await mkdir(output,{recursive:true});
const browser=await(process.env.SUSHI_ENGINE==='webkit'?webkit:chromium).launch({headless:true,...(process.env.SUSHI_ENGINE==='webkit'?{}:{channel:'chrome'})});
const ids=['craftsman','conveyor_sushi','auto_sushi_machine','marine_food_plant','sushi_ocean_mining','fusion_sushi_converter','luna_sea','freshness_freezer','global_freshness_sync'];
const errors=[],results=[];
try {
  for(const [level,count] of [[1,1],[2,5],[3,10],[4,25]]) {
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
    const save={schemaVersion:5,savedAtMs:Date.now(),game:{facilityCounts:Object.fromEntries(ids.map(id=>[id,id==='craftsman'?25:id==='conveyor_sushi'?count-1:0])),sushi:1e8,totalSushiEarned:1e8,totalClicks:1500,runPlayTimeMs:300000,endingPhase:'playing',collapseElapsedMs:0,syncCount:0,syncElapsedMs:0,previousRun:null,unlockedAchievementIds:[],purchasedUpgradeIds:[],seenNewsIds:[]}};
    await context.addInitScript(save=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('sushi-loopy.save',JSON.stringify(save));sessionStorage.setItem('seeded','yes');}},save);
    if(level===1)await context.addInitScript(()=>{
      const Native=window.IntersectionObserver,observers=new Map();
      window.IntersectionObserver=class extends Native {
        constructor(callback,options){super(callback,options);this.callback=callback;}
        observe(target){super.observe(target);observers.set(this,target);}
        disconnect(){super.disconnect();observers.delete(this);}
      };
      window.testVisibilityBatch=()=>{for(const [observer,target] of observers)observer.callback([false,true].map((isIntersecting,time)=>({target,isIntersecting,time})),observer);};
    });
    const page=await context.newPage(),requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('request',r=>{if(r.url().includes('/02-conveyor-sushi/'))requests.push(r.url());});
    await page.goto(base);
    await page.locator('.town-viewport[data-craftsman-status=ready]').waitFor();
    if(level===1)assert.deepEqual(requests,[],'unowned facility does not download four models');
    await page.getByRole('button',{name:'回転寿司オープンを購入',exact:true}).click();
    const scene=page.locator(`.town-viewport[data-conveyor-level="${level}"][data-conveyor-status=ready]`);
    await scene.waitFor();await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
    assert.equal(await scene.getAttribute('data-view'),'conveyor_sushi');
    assert.equal(await page.locator('[data-facility=conveyor_sushi] .facility-owned').innerText(),`× ${count}`);
    assert.ok(requests.some(url=>url.includes(`conveyor-lv${level}.glb`)));
    const before=await scene.screenshot({path:`${output}/lv${level}-scene.png`});
    const time=Number(await scene.getAttribute('data-time'));await page.waitForTimeout(1000);
    assert.ok(Number(await scene.getAttribute('data-time'))>time);assert.ok(!before.equals(await scene.screenshot()),'the operating facility changes visually');
    if(level===1) {
      const time=Number(await scene.getAttribute('data-time'));
      await page.evaluate(()=>window.testVisibilityBatch());await page.waitForTimeout(400);
      assert.ok(Number(await scene.getAttribute('data-time'))>time,'batched offscreen/onscreen notifications must leave the town animating');
      assert.equal(await page.locator('.mobile-tap-dock').count(),0,'the dock uses the latest visibility notification too');
    }
    await page.screenshot({path:`${output}/lv${level}-mobile.png`});
    if(level===4){await page.setViewportSize({width:320,height:568});await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${output}/lv4-320.png`});await page.setViewportSize({width:390,height:844});}
    await page.getByRole('button',{name:'模様替え',exact:true}).click();
    await page.getByRole('group',{name:'のれんの色',exact:true}).getByRole('button',{name:'若葉',exact:true}).click();
    await page.getByRole('button',{name:'わたしの街にするを閉じる',exact:true}).click();
    await page.getByRole('button',{name:'記録と設定を開く',exact:true}).click();
    await page.getByRole('button',{name:'アニメーションを停止',exact:true}).click();
    await page.getByRole('button',{name:'記録と設定を閉じる',exact:true}).click();
    await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
    const stopped=await scene.screenshot({path:`${output}/lv${level}-leaf.png`});await page.waitForTimeout(400);
    assert.ok(stopped.equals(await scene.screenshot()),'plates and the roof carousel respect motion stop');
    await page.waitForTimeout(5100);await page.reload();
    await page.locator(`.town-viewport[data-conveyor-level="${level}"][data-conveyor-status=ready]`).waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sushi-loopy.save')).game.town.color),'leaf');
    if(level===4) {
      await page.getByRole('button',{name:'模様替え',exact:true}).click();
      await page.locator('.town-move-list').getByRole('button',{name:'回転寿司オープン',exact:false}).click();
      await page.locator('.town-plot-picker').getByRole('button',{name:'職人さん',exact:true}).click();
      await page.getByRole('button',{name:'配置を元に戻す ↶',exact:true}).click();
      await page.getByRole('button',{name:'写真モードを開く',exact:true}).click();
      await page.getByRole('button',{name:'この景色を撮る',exact:true}).click();
      await page.getByRole('link',{name:'写真を保存 ↓',exact:true}).waitFor();
    }
    results.push({level,threshold:count,purchase:true,motion:true,motionStop:true,color:true,reload:true,requests});
    await context.close();
  }
  assert.deepEqual(errors,[]);await writeFile(`${output}/checks.json`,JSON.stringify({base,results,errors},null,2));console.log({results,errors});
} finally {await browser.close();}
