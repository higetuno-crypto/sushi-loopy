import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium,webkit}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.SUSHI_TEST_URL||'http://127.0.0.1:5180/';
const target=process.env.SUSHI_TEST_FACILITY||'conveyor_sushi';
const facilities={
  conveyor_sushi:{name:'回転寿司オープン',folder:'02-conveyor-sushi',file:'conveyor',status:'conveyor',output:'conveyor-models'},
  auto_sushi_machine:{name:'寿司自動握り器',folder:'03-auto-sushi-machine',file:'auto-sushi',status:'auto',output:'auto-models'},
  marine_food_plant:{name:'海洋食材プラント',folder:'04-marine-food-plant',file:'marine-plant',status:'plant',output:'marine-models'},
  fusion_sushi_converter:{name:'寿司融合発電',folder:'06-fusion-sushi-converter',file:'fusion',status:'fusion',output:'fusion-models'},
  luna_sea:{name:'LUNA_SEA',folder:'07-luna-sea',file:'luna',status:'luna',output:'luna-models'},
  freshness_freezer:{name:'鮮度凍結装置',folder:'08-freshness-freezer',file:'freezer',status:'freezer',output:'freezer-models'},
  sushi_ocean_mining:{name:'SUSHI海洋採掘',folder:'05-sushi-ocean-mining',file:'ocean-mining',status:'mining',output:'mining-models'},
};
assert.ok(Object.hasOwn(facilities,target));
const facility={id:target,...facilities[target]};
const output=process.env.SUSHI_ARTIFACT_DIR||`artifacts/${facility.output}/chrome`;
await mkdir(output,{recursive:true});
const browser=await(process.env.SUSHI_ENGINE==='webkit'?webkit:chromium).launch({headless:true,...(process.env.SUSHI_ENGINE==='webkit'?{}:{channel:'chrome'})});
const ids=['craftsman','conveyor_sushi','auto_sushi_machine','marine_food_plant','sushi_ocean_mining','fusion_sushi_converter','luna_sea','freshness_freezer','global_freshness_sync'];
const errors=[],results=[];
const funds=target==='freshness_freezer'?1e10:target==='luna_sea'?1e9:1e8;
try {
  for(const [level,count] of [[1,1],[2,5],[3,10],[4,25]]) {
    const recordFlight=target==='luna_sea'&&level===4;
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference',...(recordFlight?{recordVideo:{dir:output,size:{width:390,height:844}}}:{})});
    const save={schemaVersion:5,savedAtMs:Date.now(),game:{facilityCounts:Object.fromEntries(ids.map((id,index)=>[id,id==='craftsman'?25:id===facility.id?count-1:index<ids.indexOf(target)?10:0])),sushi:funds,totalSushiEarned:funds,totalClicks:1500,runPlayTimeMs:300000,endingPhase:'playing',collapseElapsedMs:0,syncCount:0,syncElapsedMs:0,previousRun:null,unlockedAchievementIds:[],purchasedUpgradeIds:[],seenNewsIds:[]}};
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
    const page=await context.newPage(),requests=[],videoStart=Date.now();let flight=null;
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('request',r=>{if(r.url().includes('/'+facility.folder+'/'))requests.push(r.url());});
    await page.goto(base);
    await page.locator('.town-viewport[data-craftsman-status=ready]').waitFor();
    if(level===1)assert.deepEqual(requests,[],'unowned facility does not download four models');
    await page.getByRole('button',{name:facility.name+'を購入',exact:true}).click();
    const scene=page.locator(`.town-viewport[data-${facility.status}-level="${level}"][data-${facility.status}-status=ready]`);
    await scene.waitFor();await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
    assert.equal(await scene.getAttribute('data-view'),facility.id);
    assert.equal(await page.locator(`[data-facility=${facility.id}] .facility-owned`).innerText(),`× ${count}`);
    assert.ok(requests.some(url=>url.includes(`${facility.file}-lv${level}.glb`)));
    if(target==='sushi_ocean_mining') {
      await page.locator('.town-interactions summary').click();
      await page.getByRole('button',{name:'漁船に合図する',exact:true}).click();
      await page.locator('.town-interactions summary').click();
    }
    const before=await scene.screenshot({path:`${output}/lv${level}-scene.png`});
    const time=Number(await scene.getAttribute('data-time'));await page.waitForTimeout(1000);
    assert.ok(Number(await scene.getAttribute('data-time'))>time);assert.ok(!before.equals(await scene.screenshot()),'the operating facility changes visually');
    if(target==='marine_food_plant') {
      const position=await scene.getAttribute('data-truck-position');
      await page.waitForTimeout(1200);
      assert.ok(['loading','outbound','unloading','returning'].includes(await scene.getAttribute('data-delivery')));
      assert.notEqual(await scene.getAttribute('data-truck-position'),position,'buying the plant still dispatches a delivery truck');
    }
    if(level===1) {
      const time=Number(await scene.getAttribute('data-time'));
      await page.evaluate(()=>window.testVisibilityBatch());await page.waitForTimeout(400);
      assert.ok(Number(await scene.getAttribute('data-time'))>time,'batched offscreen/onscreen notifications must leave the town animating');
      assert.equal(await page.locator('.mobile-tap-dock').count(),0,'the dock uses the latest visibility notification too');
    }
    await page.screenshot({path:`${output}/lv${level}-mobile.png`});
    if(target==='luna_sea'&&level===4) {
      const start=(Date.now()-videoStart)/1000,bounds=await scene.boundingBox(),stages=[];
      for(const [phase,time] of [['ascent',8.5],['coast',14],['return',19.8],['landing',23],['idle',25]]) {
        await page.waitForFunction(({phase,time})=>{const d=document.querySelector('.town-viewport').dataset,p=Number(d.lunaTime)%32;return d.lunaPhase===phase&&p>=time&&p<time+.3;},{phase,time},{timeout:50000});
        const altitude=Number(await scene.getAttribute('data-luna-altitude'));
        await scene.screenshot({path:`${output}/lv4-${phase}.png`});stages.push({phase,altitude});
      }
      assert.ok(stages[1].altitude>35&&stages[2].altitude<stages[1].altitude&&stages[4].altitude===0);
      flight={start,duration:(Date.now()-videoStart)/1000-start,bounds,stages};
    }
    if(level===4){await page.setViewportSize({width:320,height:568});await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${output}/lv4-320.png`});await page.setViewportSize({width:390,height:844});}
    await page.getByRole('button',{name:'模様替え',exact:true}).click();
    await page.getByRole('group',{name:'のれんの色',exact:true}).getByRole('button',{name:'若葉',exact:true}).click();
    await page.getByRole('button',{name:'わたしの街にするを閉じる',exact:true}).click();
    await page.getByRole('button',{name:'記録と設定を開く',exact:true}).click();
    await page.getByRole('button',{name:'アニメーションを停止',exact:true}).click();
    await page.getByRole('button',{name:'記録と設定を閉じる',exact:true}).click();
    await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
    const stopped=await scene.screenshot({path:`${output}/lv${level}-leaf.png`});await page.waitForTimeout(400);
    assert.ok(stopped.equals(await scene.screenshot()),'all facility motion respects motion stop');
    await page.waitForTimeout(5100);await page.reload();
    await page.locator(`.town-viewport[data-${facility.status}-level="${level}"][data-${facility.status}-status=ready]`).waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sushi-loopy.save')).game.town.color),'leaf');
    if(level===4) {
      await page.getByRole('button',{name:'模様替え',exact:true}).click();
      await page.locator('.town-move-list').getByRole('button',{name:facility.name,exact:false}).click();
      await page.locator('.town-plot-picker').getByRole('button',{name:'職人さん',exact:true}).click();
      await page.getByRole('button',{name:'配置を元に戻す ↶',exact:true}).click();
      await page.getByRole('button',{name:'写真モードを開く',exact:true}).click();
      await page.getByRole('button',{name:'この景色を撮る',exact:true}).click();
      await page.getByRole('link',{name:'写真を保存 ↓',exact:true}).waitFor();
    }
    results.push({level,threshold:count,purchase:true,motion:true,motionStop:true,color:true,reload:true,requests,...(flight?{flight}:{})});
    await context.close();
    if(recordFlight)await page.video().saveAs(`${output}/lv4-flight.webm`);
  }
  assert.deepEqual(errors,[]);await writeFile(`${output}/checks.json`,JSON.stringify({base,results,errors},null,2));console.log({results,errors});
} finally {await browser.close();}
