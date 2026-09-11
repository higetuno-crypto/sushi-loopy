import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'silent'});
try {
  const load=path=>vite.ssrLoadModule(`/src/game/${path}.ts`);
  const {FACILITIES}=await load('data/facilities'); const {UPGRADES}=await load('data/upgrades');
  const {createInitialGameState}=await load('state/initialState'); const {selectTotalSushiPerSecond:sps,selectSushiPerClick:click}=await load('state/selectors');
  const {calculateCurrentPrice:price}=await load('logic/economy'); const {resolveAchievements:resolve}=await load('logic/progression');const {meetsCondition:meets}=await load('logic/conditions');
  let state=createInitialGameState(); const milestones=[];
  for(let second=1;second<=21600;second++) {
    const gain=sps(state)+(second<=100?click(state):0);
    state=resolve({...state,sushi:state.sushi+gain,totalSushiEarned:state.totalSushiEarned+gain,totalClicks:state.totalClicks+(second<=100?1:0),runPlayTimeMs:second*1000});
    // Illustrative strategy only: among affordable upgrades/facilities choose best SPS gained per cost.
    for(let purchase=0;purchase<20;purchase++) {
      const candidates=[];const current=sps(state);
      for(const f of FACILITIES){const cost=price(f,state.facilityCounts[f.id]);if(!Number.isFinite(cost)||cost>state.sushi)continue;
        const next=resolve({...state,sushi:state.sushi-cost,facilityCounts:{...state.facilityCounts,[f.id]:state.facilityCounts[f.id]+1}});
        candidates.push({id:f.id,cost,next,efficiency:(sps(next)-current)/cost,facility:true});}
      for(const u of UPGRADES){if(state.purchasedUpgradeIds.includes(u.id)||!meets(state,u.condition)||u.cost>state.sushi)continue;
        const next=resolve({...state,sushi:state.sushi-u.cost,purchasedUpgradeIds:[...state.purchasedUpgradeIds,u.id]});
        candidates.push({id:u.id,cost:u.cost,next,efficiency:(sps(next)-current)/u.cost,facility:false});}
      const best=candidates.sort((a,b)=>b.efficiency-a.efficiency)[0];if(!best||best.efficiency<=0)break;
      state=best.next;
      if(best.facility && (state.facilityCounts[best.id]===1 || (best.id==='global_freshness_sync' && state.facilityCounts[best.id]===2)))milestones.push({id:best.id,count:state.facilityCounts[best.id],seconds:second});
    }
    if(state.facilityCounts.global_freshness_sync>=2)break;
  }
  const result={model:'1 click/sec for first 100 seconds, then idle; each second buy best affordable marginal SPS/cost, max20 buys/sec; no offline; illustrative, not optimal or human playtest',milestones,target:{sync1Seconds:9600,sync2Seconds:13200},conclusion:'Economy requires separate long-session pacing calibration; ending not implemented.'};
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/balance-simulation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await vite.close();}
