import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

// No browser profile or player localStorage is touched by these tests.
class MemoryStorage {
  data = new Map();
  failWrites = false;
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { if (this.failWrites) throw Error('quota'); this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
  clear() { this.data.clear(); this.failWrites = false; }
}
const storage = new MemoryStorage();
const intervals = new Map();
let sequence = 0;
const win = Object.assign(new EventTarget(), { localStorage: storage,
  setInterval(fn, delay) { const id = ++sequence; intervals.set(id, { fn, delay }); return id; },
  clearInterval(id) { intervals.delete(id); },
});
const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
Object.defineProperty(doc, 'hidden', { get: () => doc.visibilityState === 'hidden' });
Object.assign(globalThis, { window: win, document: doc, localStorage: storage });
const vite = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'silent' });
after(async () => { await vite.close(); });
const load = path => vite.ssrLoadModule(`/src/game/${path}.ts`);
const { useGameStore: store, selectTapGain } = await load('state/store');
const { createInitialGameState: initial } = await load('state/initialState');
const { FACILITIES } = await load('data/facilities');
const { ACHIEVEMENTS } = await load('data/achievements');
const { UPGRADES } = await load('data/upgrades');
const { NEWS } = await load('data/news');
const { calculateModifiers } = await load('logic/effects');
const { meetsCondition } = await load('logic/conditions');
const { resolveAchievements, chooseNews } = await load('logic/progression');
const { selectTotalSushiPerSecond: sps, selectSushiPerClick: click } = await load('state/selectors');
const { createSaveSnapshot: snapshot, createHydratedGameState: hydrate } = await load('save/snapshot');
const { migrateSaveData: migrate } = await load('save/migrations');
const { parseCurrentSaveData: validate, parseSaveDataV1 } = await load('save/validation');
const { saveGameState: save, loadMainSave: loadSave, MAIN_SAVE_KEY } = await load('save/storage');
const { importSaveCode: importCode, exportSaveCode: exportCode, SAVE_CODE_PREFIX } = await load('save/saveCode');
const { createFacilityCheckpointIfAbsent: checkpoint, listFacilityCheckpoints: list, restoreFacilityCheckpoint: restore, FACILITY_CHECKPOINT_STORAGE_KEY: CP_KEY } = await load('save/facilityCheckpoints');
const { startFacilityCheckpointTracking: track } = await load('runtime/facilityCheckpointTracking');
const { calculateOfflineProduction: offline, MAX_OFFLINE_SECONDS } = await load('runtime/offlineProduction');
const { applyOfflineProduction: catchUp } = await load('runtime/offlineCatchUp');
const { startAutoSave, AUTO_SAVE_INTERVAL_MS } = await load('runtime/autoSave');
const { bootstrapGame } = await load('runtime/bootstrap');
const oldSave = (game = {}) => ({ schemaVersion: 1, savedAtMs: 1000, game: { sushi: 20, facilityCounts: initial().facilityCounts, runPlayTimeMs: 1200, ...game } });
const currentSave = () => ({ ...snapshot(store.getState()), savedAtMs: 1000 });
const encode = data => SAVE_CODE_PREFIX + Buffer.from(JSON.stringify(data)).toString('base64');
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-7 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
beforeEach(() => { storage.clear(); intervals.clear(); doc.visibilityState = 'visible'; store.setState({ ...initial(), debugFastClick: false }); });

test('debug click override is exact, reversible and excluded from saves', () => {
  assert.equal(store.getState().debugFastClick, false);
  store.setState({ purchasedUpgradeIds: ['warm_hands'] });
  assert.equal(selectTapGain(store.getState()), 2);
  store.getState().setDebugFastClick(true);
  assert.equal(selectTapGain(store.getState()), 10_000);
  store.getState().tapSushi();
  assert.equal(store.getState().sushi, 10_000);
  assert.equal(store.getState().totalSushiEarned, 10_000);
  assert.equal(store.getState().totalClicks, 1);
  assert.equal(click(store.getState()), 2);
  assert.equal(sps(store.getState()), 0);
  const saved = snapshot(store.getState());
  assert.equal(saved.schemaVersion, 3);
  assert.equal('debugFastClick' in saved.game, false);
  assert.equal('setDebugFastClick' in saved.game, false);
  store.getState().setDebugFastClick(false);
  store.getState().tapSushi();
  assert.equal(store.getState().sushi, 10_002);
});

test('registries: unique stable IDs, 9 facility achievements + 100 clicks, valid rewards and references', () => {
  assert.equal(ACHIEVEMENTS.length, 10);
  for (const items of [ACHIEVEMENTS, UPGRADES, NEWS]) assert.equal(new Set(items.map(x => x.id)).size, items.length);
  for (const facility of FACILITIES) assert.ok(ACHIEVEMENTS.some(x => x.condition.kind === 'facility' && x.condition.id === facility.id && x.condition.count === 1));
  for (const x of [...ACHIEVEMENTS, ...UPGRADES]) for (const effect of x.effects) assert.ok(Number.isFinite(effect.amount) && effect.amount > 0);
});
test('100 actual clicks unlock once, balance and lifetime gains track clicks', () => {
  for (let i=0;i<99;i++) store.getState().tapSushi();
  assert.equal(store.getState().unlockedAchievementIds.length, 0);
  store.getState().tapSushi(); store.getState().tapSushi();
  assert.deepEqual(store.getState().unlockedAchievementIds, ['click_100']);
  assert.equal(store.getState().totalClicks,101); assert.equal(store.getState().totalSushiEarned,101);
});
test('every facility purchase grants exactly its achievement with data-defined reward', () => {
  for (const f of FACILITIES) {
    store.setState(initial()); store.setState({ sushi: f.basePrice * 10 });
    store.getState().buyFacility(f.id); store.getState().buyFacility(f.id);
    assert.deepEqual(store.getState().unlockedAchievementIds, [`first_${f.id}`]);
    const bonus = ACHIEVEMENTS.find(x => x.id === `first_${f.id}`).effects[0].amount;
    near(sps(store.getState()), f.baseProduction*2*(1+bonus));
  }
});
test('insufficient/unknown/overflow facility purchase does not change state', () => {
  const before = snapshot(store.getState()); store.getState().buyFacility('craftsman'); store.getState().buyFacility('bad');
  assert.deepEqual(snapshot(store.getState()),before);
  store.setState({ sushi: Number.MAX_VALUE, facilityCounts: { ...initial().facilityCounts, craftsman: 10000 } });
  const huge = snapshot(store.getState()); store.getState().buyFacility('craftsman'); assert.deepEqual(snapshot(store.getState()),huge);
});
test('upgrades enforce unlock, affordability, and one-time purchase', () => {
  store.setState({ sushi: 1000 }); store.getState().buyUpgrade('warm_hands'); assert.deepEqual(store.getState().purchasedUpgradeIds,[]);
  store.setState({ totalClicks:25, sushi:49 }); store.getState().buyUpgrade('warm_hands'); assert.equal(store.getState().sushi,49);
  store.setState({ sushi:50 }); store.getState().buyUpgrade('warm_hands'); assert.equal(store.getState().sushi,0); assert.equal(click(store.getState()),2);
  store.getState().buyUpgrade('warm_hands'); store.getState().buyUpgrade('unknown'); assert.deepEqual(store.getState().purchasedUpgradeIds,['warm_hands']);
  store.getState().tapSushi(); assert.equal(store.getState().sushi,2);
});
test('facility and global effects apply identically online/offline without double compounding', () => {
  store.setState({ sushi:1000, facilityCounts: { ...initial().facilityCounts, craftsman:3 }, unlockedAchievementIds:['first_craftsman'], purchasedUpgradeIds:['craftsman_knife','house_recipe'] });
  near(sps(store.getState()),3*2*1.102);
  const expected = sps(store.getState())*2; store.getState().applyProduction(2); near(store.getState().sushi,1000+expected);
  near(offline(store.getState(),1000,3000).offlineGain,expected);
  assert.equal(calculateModifiers(store.getState()),calculateModifiers({ ...store.getState(), sushi:0 }));
});
test('conditions compose all/any and unlocked/purchased requirements', () => {
  const state = { ...initial(), totalClicks:100, purchasedUpgradeIds:['warm_hands'] };
  assert.ok(meetsCondition(state,{kind:'all',conditions:[{kind:'stat',stat:'totalClicks',atLeast:100},{kind:'upgrade',id:'warm_hands'}]}));
  assert.equal(meetsCondition(state,{kind:'any',conditions:[{kind:'facility',id:'craftsman',count:1},{kind:'achievement',id:'click_100'}]}),false);
});
test('achievement reconciliation is idempotent and only targeted dependencies are scanned', () => {
  const state = {...initial(),totalClicks:100}; assert.equal(resolveAchievements(state,['sushi']),state);
  const next=resolveAchievements(state); assert.deepEqual(next.unlockedAchievementIds,['click_100']); assert.equal(resolveAchievements(next),next);
});
test('v1 frozen parser and migration preserve 9 IDs, currency and time; grant owned facility achievements', () => {
  const old=oldSave({facilityCounts:{...initial().facilityCounts,craftsman:4,luna_sea:1}});
  const before=JSON.stringify(old); assert.ok(parseSaveDataV1(old)); const result=migrate(old);
  assert.equal(JSON.stringify(old),before); assert.equal(result.schemaVersion,3); assert.equal(result.savedAtMs,1000);
  assert.deepEqual(result.game.facilityCounts,old.game.facilityCounts); assert.equal(result.game.sushi,20); assert.equal(result.game.runPlayTimeMs,1200);
  assert.equal(result.game.totalClicks,0); assert.equal(result.game.totalSushiEarned,20);
  assert.deepEqual(result.game.unlockedAchievementIds,['first_craftsman','first_luna_sea']); assert.ok(validate(result));
});
test('validation rejects future, missing fields, negative/NaN/infinite values, bad/duplicate IDs', () => {
  assert.equal(migrate({...currentSave(),schemaVersion:99}),null);
  for (const bad of [-1,NaN,Infinity,'1',null]) assert.equal(validate({...currentSave(),game:{...currentSave().game,sushi:bad}}),null);
  for (const bad of [-1,1.1,Number.MAX_SAFE_INTEGER+1]) assert.equal(validate({...currentSave(),game:{...currentSave().game,totalClicks:bad}}),null);
  for (const bad of [['a','a'],[null],['<script>'], 'a']) assert.equal(validate({...currentSave(),game:{...currentSave().game,seenNewsIds:bad}}),null);
  const missing=currentSave(); delete missing.game.totalClicks; assert.equal(validate(missing),null);
  assert.equal(migrate({...oldSave(),game:{...oldSave().game, facilityCounts:{craftsman:1}}}),null);
});
test('unknown content IDs survive current save round trip and confer no bonus', () => {
  store.setState({unlockedAchievementIds:['future_achievement'],purchasedUpgradeIds:['future_upgrade'],seenNewsIds:['future_news']});
  const result=migrate(currentSave()); assert.deepEqual(result.game,snapshot(store.getState()).game); assert.equal(calculateModifiers(result.game).production,1);
});
test('snapshot/hydration clone collections and exclude derived values/actions', () => {
  const data=currentSave(); assert.equal(Object.keys(data.game).length,10); assert.equal(data.game.tapSushi,undefined);
  const state=hydrate(data); state.facilityCounts.craftsman=7; state.seenNewsIds.push('tea'); assert.equal(data.game.facilityCounts.craftsman,0); assert.deepEqual(data.game.seenNewsIds,[]);
});
test('Main Save/Load persists all current fields and backs up v1 once without mutation', () => {
  const raw=JSON.stringify(oldSave()); storage.setItem(MAIN_SAVE_KEY,raw); store.setState(migrate(oldSave()).game);
  assert.ok(save(store.getState()).success); assert.equal(storage.getItem('sushi-loopy.save.backup-v1'),raw);
  assert.deepEqual(loadSave().save.game,snapshot(store.getState()).game); assert.ok(save(store.getState()).success); assert.equal(storage.getItem('sushi-loopy.save.backup-v1'),raw);
});
test('corrupt/future Main Saves are not overwritten by automatic writes', () => {
  for (const raw of ['{bad',JSON.stringify({...currentSave(),schemaVersion:99})]) {
    storage.setItem(MAIN_SAVE_KEY,raw); const result=save(store.getState()); assert.equal(result.success,false); assert.equal(result.reason,'protected-existing-save'); assert.equal(storage.getItem(MAIN_SAVE_KEY),raw);
  }
});
test('storage quota failures are reported', () => { storage.failWrites=true; assert.equal(save(store.getState()).success,false); });
test('Save Code exports v3, imports all fields, keeps actions, and applies no offline gain', () => {
  store.setState({sushi:55,totalClicks:100,totalSushiEarned:500,unlockedAchievementIds:['click_100'],purchasedUpgradeIds:['warm_hands'],seenNewsIds:['tea']});
  const expected=snapshot(store.getState()).game; const code=exportCode(); assert.ok(code.startsWith('SUSHILOOPY1:'));
  store.setState(initial()); assert.equal(importCode(code).ok,true); assert.deepEqual(snapshot(store.getState()).game,expected); assert.equal(typeof store.getState().tapSushi,'function');
});
test('v1 code migration applies no offline gain and does not generate checkpoints', () => {
  const stop=track(); const old=oldSave({facilityCounts:{...initial().facilityCounts,craftsman:1}});
  assert.equal(importCode(encode(old)).ok,true); assert.equal(store.getState().sushi,20); assert.equal(list().length,0); stop();
});
test('invalid Save Codes leave store and storage unchanged', () => {
  const before=snapshot(store.getState());
  for (const code of ['', 'bad','SUSHILOOPY1:@@@@',encode({...currentSave(),schemaVersion:99}),SAVE_CODE_PREFIX+Buffer.from('{').toString('base64')]) assert.equal(importCode(code).ok,false);
  assert.deepEqual(snapshot(store.getState()),before); assert.equal(storage.getItem(MAIN_SAVE_KEY),null);
});
test('checkpoint captures achievement on first real purchase, never overwrites, full restore has no offline', () => {
  const stop=track(); store.setState({sushi:1000}); store.getState().buyFacility('craftsman');
  assert.equal(list().length,1); const first=list()[0]; assert.deepEqual(first.save.game.unlockedAchievementIds,['first_craftsman']);
  const raw=storage.getItem(CP_KEY); store.getState().buyFacility('craftsman'); assert.equal(storage.getItem(CP_KEY),raw);
  store.setState({totalClicks:100, purchasedUpgradeIds:['warm_hands'],seenNewsIds:['tea']}); assert.equal(restore('craftsman').success,true);
  assert.deepEqual(snapshot(store.getState()).game,first.save.game); assert.equal(storage.getItem(CP_KEY),raw); stop();
});
test('checkpoint refuses unsuccessful purchases and preserves unsupported existing entries', () => {
  const stop=track(); store.getState().buyFacility('craftsman'); assert.equal(list().length,0);
  storage.setItem(CP_KEY,JSON.stringify({craftsman:{save:{schemaVersion:99}}})); store.setState({sushi:100}); store.getState().buyFacility('craftsman');
  assert.equal(JSON.parse(storage.getItem(CP_KEY)).craftsman.save.schemaVersion,99); assert.equal(list().length,0); stop();
  assert.equal(checkpoint('conveyor_sushi',store.getState()).success,false);
});
test('v1 checkpoint restores via migration without replacing archive', () => {
  const old=oldSave({facilityCounts:{...initial().facilityCounts,craftsman:1}});
  storage.setItem(CP_KEY,JSON.stringify({craftsman:{facilityId:'craftsman',createdAtMs:1000,save:old}})); const raw=storage.getItem(CP_KEY);
  assert.equal(restore('craftsman').success,true); assert.equal(store.getState().sushi,20); assert.deepEqual(store.getState().unlockedAchievementIds,['first_craftsman']); assert.equal(storage.getItem(CP_KEY),raw);
});
test('corrupt checkpoint archive is preserved instead of replaced on next purchase', () => {
  storage.setItem(CP_KEY,'{broken'); const before=storage.getItem(CP_KEY);
  const savedWarn=console.warn; console.warn=()=>{};
  try { const result=checkpoint('craftsman',{...initial(),facilityCounts:{...initial().facilityCounts,craftsman:1}}); assert.equal(result.success,false); assert.equal(storage.getItem(CP_KEY),before); }
  finally { console.warn=savedWarn; }
});
test('offline clamps future/invalid/long intervals and never advances active playtime or clicks', () => {
  store.setState({facilityCounts:{...initial().facilityCounts,craftsman:1}});
  assert.equal(offline(store.getState(),1000,0).offlineGain,0); assert.equal(offline(store.getState(),NaN,5000).offlineGain,0);
  assert.equal(offline(store.getState(),0,1e12).offlineSeconds,MAX_OFFLINE_SECONDS);
  catchUp(1000,3000); assert.equal(store.getState().sushi,2); assert.equal(store.getState().totalSushiEarned,2); assert.equal(store.getState().runPlayTimeMs,0); assert.equal(store.getState().totalClicks,0);
});
test('startup hydration applies offline once, refreshes savedAt, and keeps current fields', () => {
  const now=Date.now; Date.now=()=>10000;
  try { const data=currentSave(); data.savedAtMs=5000; data.game.facilityCounts.craftsman=1; data.game.totalClicks=42;
    storage.setItem(MAIN_SAVE_KEY,JSON.stringify(data)); const stop=bootstrapGame(); assert.equal(store.getState().sushi,5); assert.equal(store.getState().totalClicks,42); stop();
    const stopAgain=bootstrapGame(); assert.equal(store.getState().sushi,5); assert.equal(loadSave().save.savedAtMs,10000); stopAgain();
  } finally { Date.now=now; }
});
test('Auto Save persists progress on 5s timer and stops cleanly', () => {
  const stop=startAutoSave(); store.getState().tapSushi(); const timer=[...intervals.values()].find(x=>x.delay===AUTO_SAVE_INTERVAL_MS); assert.ok(timer); timer.fn();
  assert.equal(loadSave().save.game.totalClicks,1); stop(); assert.equal(intervals.size,0);
});
test('hidden interval is settled once; pagehide cannot erase pending offline time', () => {
  const now=Date.now; let time=10000; Date.now=()=>time;
  try { store.setState({facilityCounts:{...initial().facilityCounts,craftsman:1}}); const stop=startAutoSave();
    doc.visibilityState='hidden'; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(loadSave().save.savedAtMs,10000);
    time=12000; win.dispatchEvent(new Event('pagehide')); assert.equal(loadSave().save.savedAtMs,10000);
    time=14000; doc.visibilityState='visible'; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(store.getState().sushi,4);
    doc.dispatchEvent(new Event('visibilitychange')); assert.equal(store.getState().sushi,4); assert.equal(store.getState().runPlayTimeMs,0); stop();
  } finally {Date.now=now;}
});
test('News respects conditions, prioritizes unread and avoids immediate repeats', () => {
  const state=initial(); assert.equal(chooseNews(state).id,'opening');
  state.seenNewsIds=['opening']; assert.equal(chooseNews(state).id,'tea');
  state.facilityCounts.global_freshness_sync=1; assert.equal(chooseNews(state).id,'sync');
  state.seenNewsIds=NEWS.map(x=>x.id); assert.notEqual(chooseNews(state,'sync').id,'sync');
});


test('v2 migrates without losing progress and backs up the original once', () => {
  const { endingPhase: _endingPhase, collapseElapsedMs: _collapseElapsedMs, ...game } = initial();
  game.facilityCounts.global_freshness_sync = 1;
  game.totalSushiEarned = 5e9;
  const old = { schemaVersion: 2, savedAtMs: 1000, game };
  const raw = JSON.stringify(old);
  const result = migrate(old);
  assert.ok(result); assert.equal(result.schemaVersion, 3);
  assert.equal(result.game.endingPhase, 'playing'); assert.equal(result.game.collapseElapsedMs, 0);
  assert.deepEqual(result.game.facilityCounts, game.facilityCounts);
  assert.equal(result.game.totalSushiEarned, 5e9);
  assert.equal(JSON.stringify(old), raw);
  storage.setItem(MAIN_SAVE_KEY, raw); store.setState(result.game);
  assert.ok(save(store.getState()).success);
  assert.equal(storage.getItem('sushi-loopy.save.backup-v2'), raw);
  assert.ok(save(store.getState()).success);
  assert.equal(storage.getItem('sushi-loopy.save.backup-v2'), raw);
  assert.ok(importCode(encode(old)).ok);
  assert.equal(store.getState().endingPhase, 'playing');
});

test('first-run ending requires the last facility, waits for the story, and clears exactly once', () => {
  store.getState().startCollapse(); store.getState().finishFirstRun();
  assert.equal(store.getState().endingPhase, 'playing');
  store.setState({ sushi: 1e9 });
  store.getState().buyFacility('global_freshness_sync');
  store.getState().setDebugFastClick(true);
  store.getState().startCollapse();
  assert.equal(store.getState().endingPhase, 'collapse');
  assert.equal(store.getState().debugFastClick, false);
  assert.equal(sps(store.getState()), 0);
  const before = snapshot(store.getState());
  store.getState().tapSushi(); store.getState().buyFacility('craftsman');
  store.getState().buyUpgrade('warm_hands'); store.getState().applyProduction(3600);
  store.getState().finishFirstRun();
  assert.deepEqual(snapshot(store.getState()), before);
  store.getState().addRunPlayTime(12000);
  store.getState().startCollapse();
  assert.equal(store.getState().collapseElapsedMs, 12000);
  store.getState().addRunPlayTime(15999); store.getState().finishFirstRun();
  assert.equal(store.getState().endingPhase, 'collapse');
  store.getState().addRunPlayTime(1); store.getState().finishFirstRun();
  assert.equal(store.getState().endingPhase, 'cleared');
  assert.equal(store.getState().totalClicks, before.game.totalClicks + 1);
  assert.equal(store.getState().sushi, before.game.sushi + 1);
  assert.equal(store.getState().totalSushiEarned, before.game.totalSushiEarned + 1);
  const cleared = snapshot(store.getState());
  store.getState().finishFirstRun(); store.getState().tapSushi(); store.getState().addRunPlayTime(60000);
  store.getState().applyProduction(60000); store.getState().startCollapse();
  assert.deepEqual(snapshot(store.getState()), cleared);
  assert.ok(validate({ ...cleared, savedAtMs: 1000 }));
});

test('collapse and clear survive Save Code, startup and offline without story skipping', () => {
  store.setState({ facilityCounts: { ...initial().facilityCounts, global_freshness_sync: 1 } });
  store.getState().startCollapse(); store.getState().addRunPlayTime(14000);
  for (const phase of ['collapse', 'cleared']) {
    if (phase === 'cleared') { store.getState().addRunPlayTime(14000); store.getState().finishFirstRun(); }
    const before = snapshot(store.getState());
    assert.equal(offline(store.getState(), 0, 1e9).offlineGain, 0);
    assert.equal(catchUp(0, 1e9), 0);
    assert.deepEqual(snapshot(store.getState()), before);
    const code = encode({ ...before, savedAtMs: 0 });
    store.setState(initial()); assert.ok(importCode(code).ok);
    assert.deepEqual(snapshot(store.getState()), before);
    storage.setItem(MAIN_SAVE_KEY, JSON.stringify({ ...before, savedAtMs: 0 }));
    store.setState(initial()); const stop = bootstrapGame();
    assert.deepEqual(snapshot(store.getState()), before); stop();
  }
});

test('v3 rejects inconsistent ending states and preserves invalid saves', () => {
  for (const game of [
    { ...initial(), endingPhase: 'unknown' },
    { ...initial(), collapseElapsedMs: 1 },
    { ...initial(), endingPhase: 'collapse', collapseElapsedMs: 0 },
    { ...initial(), endingPhase: 'cleared', collapseElapsedMs: 28000 },
    { ...initial(), endingPhase: 'cleared', collapseElapsedMs: 20000, facilityCounts: { ...initial().facilityCounts, global_freshness_sync: 1 } },
    ...[-1, NaN, Infinity, 28001].map(collapseElapsedMs => ({ ...initial(), collapseElapsedMs })),
  ]) assert.equal(validate({ schemaVersion: 3, savedAtMs: 1000, game }), null);
});

test('ending milestones immediately persist via Auto Save and preserve writer protection', () => {
  const stop = startAutoSave();
  store.setState({ facilityCounts: { ...initial().facilityCounts, global_freshness_sync: 1 } });
  store.getState().startCollapse();
  assert.equal(loadSave().save.game.endingPhase, 'collapse');
  store.getState().addRunPlayTime(28000); store.getState().finishFirstRun();
  assert.equal(loadSave().save.game.endingPhase, 'cleared');
  stop();
});

test('blocked writer and storage failures cannot silently overwrite a clear record', () => {
  const stop = startAutoSave();
  store.setState({ facilityCounts: { ...initial().facilityCounts, global_freshness_sync: 1 } });
  store.getState().startCollapse();
  const before = storage.getItem(MAIN_SAVE_KEY);
  storage.setItem('sushi-loopy.writer', JSON.stringify({ id:'other-tab',atMs:Date.now() }));
  store.getState().addRunPlayTime(28000); store.getState().finishFirstRun();
  assert.equal(storage.getItem(MAIN_SAVE_KEY), before);
  assert.equal(store.getState().endingPhase, 'cleared');
  storage.removeItem('sushi-loopy.writer');
  storage.failWrites = true;
  assert.equal(save(store.getState()).success, false);
  storage.failWrites = false;
  stop();
  assert.equal(loadSave().save.game.endingPhase, 'cleared');
});
