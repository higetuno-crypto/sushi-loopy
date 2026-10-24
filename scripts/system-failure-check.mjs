import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium, webkit } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.SUSHI_TEST_URL || 'http://127.0.0.1:5198/';
const isWebkit = process.env.SUSHI_ENGINE === 'webkit';
const output = process.env.SUSHI_ARTIFACT_DIR || `artifacts/system-failure-20261024/${isWebkit ? 'webkit' : 'chrome'}`;
await mkdir(output, { recursive: true });
const browser = await (isWebkit ? webkit : chromium).launch({ headless: true, ...(isWebkit ? {} : { channel: 'chrome' }) });
const ids = ['craftsman', 'conveyor_sushi', 'auto_sushi_machine', 'marine_food_plant', 'sushi_ocean_mining', 'fusion_sushi_converter', 'luna_sea', 'freshness_freezer', 'global_freshness_sync'];
const errors = [], results = [];
try {
  for (const [name, mobile, reduced] of [['desktop', false, false], ['mobile', true, false], ['mobile-reduced', true, true]]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference',
      recordVideo: { dir: output, size: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } } });
    // Synthetic progress in a fresh isolated profile, never a player's browser/save.
    const save = { schemaVersion: 5, savedAtMs: Date.now(), game: {
      facilityCounts: Object.fromEntries(ids.map(id => [id, id === 'global_freshness_sync' ? 2 : 25])),
      sushi: 1e12, totalSushiEarned: 1e12, totalClicks: 1500, runPlayTimeMs: 3_600_000,
      endingPhase: 'playing', collapseElapsedMs: 0, syncCount: 2, syncElapsedMs: 18000,
      previousRun: null, unlockedAchievementIds: [], purchasedUpgradeIds: [], seenNewsIds: [] } };
    await context.addInitScript(save => {
      if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sushi-loopy.save', JSON.stringify(save)); sessionStorage.setItem('seeded', 'yes'); }
      window.errorAudioSamples = [];
      if (!window.AudioContext) return;
      const native = AudioContext.prototype.createDynamicsCompressor;
      AudioContext.prototype.createDynamicsCompressor = function () {
        const compressor = native.call(this), analyser = this.createAnalyser(), data = new Float32Array(2048);
        compressor.connect(analyser);
        setInterval(() => {
          analyser.getFloatTimeDomainData(data);
          window.errorAudioSamples.push({ phase: document.querySelector('.system-failure')?.dataset.phase ?? 'playing',
            dialogs: Number(document.querySelector('.system-failure')?.dataset.dialogs ?? 0),
            context: this.state, rms: Math.sqrt(data.reduce((sum, n) => sum + n * n, 0) / data.length) });
        }, 50);
        return compressor;
      };
    }, save);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('dialog', d => { errors.push(`Unexpected real browser dialog: ${d.type()}`); void d.dismiss(); });
    let audioLoaded = false;
    page.on('response', r => { if (r.url().includes('windows-error-reference') && r.ok()) audioLoaded = true; });
    await page.goto(base);
    await page.locator('.town-viewport[data-sync-status=ready]').waitFor();
    const audioSupported = await page.evaluate(() => typeof AudioContext !== 'undefined');
    if (audioSupported) {
      await page.getByRole('button', { name: '記録と設定を開く', exact: true }).click();
      await page.getByRole('button', { name: '音をつける', exact: true }).click();
      await page.getByRole('button', { name: '音を消す', exact: true }).waitFor();
      if (!audioLoaded) await page.waitForResponse(r => r.url().includes('windows-error-reference') && r.ok());
      await page.getByRole('button', { name: '記録と設定を閉じる', exact: true }).click();
    }
    await page.getByRole('button', { name: '世界鮮度同期装置を購入', exact: true }).click();
    const overlay = page.locator('.system-failure');
    await page.waitForFunction(() => document.querySelector('.system-failure')?.dataset.dialogs === '1');
    await page.screenshot({ path: `${output}/${name}-first-error.png` });
    assert.equal(await overlay.getAttribute('data-reduced'), String(reduced));
    if (mobile) {
      await page.waitForFunction(() => Number(document.querySelector('.system-failure')?.dataset.dialogs) > 80);
      if (audioSupported) {
        await page.getByRole('button', { name: '音を消す', exact: true }).click();
        await page.waitForFunction(() => window.errorAudioSamples.at(-1)?.context === 'suspended');
        await page.getByRole('button', { name: '音をつける', exact: true }).click();
        await page.waitForFunction(() => window.errorAudioSamples.at(-1)?.context === 'running' && window.errorAudioSamples.at(-1)?.rms > .01);
      }
      await page.reload();
      await overlay.waitFor();
      assert.notEqual(await overlay.getAttribute('data-phase'), 'normal', 'reload resumes the stored sequence');
    }
    await page.waitForFunction(() => Number(document.querySelector('.system-failure')?.dataset.dialogs) >= 420);
    await page.screenshot({ path: `${output}/${name}-storm.png` });
    const stormCount = Number(await overlay.getAttribute('data-dialogs'));
    await page.waitForFunction(() => document.querySelector('.system-failure')?.dataset.phase === 'crash');
    await page.screenshot({ path: `${output}/${name}-crash.png` });
    await page.waitForFunction(() => document.querySelector('.system-failure')?.dataset.phase === 'blue');
    await page.screenshot({ path: `${output}/${name}-blue.png` });
    await page.waitForFunction(() => document.querySelector('.system-failure')?.dataset.phase === 'hold');
    const hold = await page.screenshot({ path: `${output}/${name}-hold.png` });
    await page.waitForTimeout(450);
    assert.ok(hold.equals(await page.screenshot()), 'the full screen holds still before fracture');
    assert.equal(context.pages().length, 1);
    if (audioSupported && !mobile) {
      const samples = await page.evaluate(() => window.errorAudioSamples);
      assert.ok(samples.some(s => s.phase === 'dialogs' && s.dialogs > 20 && s.rms > .01), 'recorded error audio reaches the output');
      const silence = samples.filter(s => s.phase === 'hold').slice(-4);
      assert.ok(silence.length >= 3 && silence.every(s => s.rms < .00001), 'the hold is silent');
      await writeFile(`${output}/audio-samples.json`, JSON.stringify(samples));
      await page.getByRole('button', { name: '音を消す', exact: true }).click();
      await page.getByRole('button', { name: '音をつける', exact: true }).waitFor();
    }
    await page.locator('.world-fracture.is-rendered').waitFor();
    await page.waitForFunction(() => Number(document.querySelector('.world-fracture')?.dataset.elapsed) > 14500);
    await page.screenshot({ path: `${output}/${name}-fracture.png` });
    assert.equal(await page.locator('.fracture-fallback').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: '寿司を握る', exact: true }).click({ timeout: 25000 });
    await page.locator('.phase-playing').waitFor();
    assert.equal(await overlay.count(), 0);
    assert.equal(await page.locator('.collapse-sound-control').count(), 0);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sushi-loopy.save')));
    assert.equal(saved.schemaVersion, 6);
    assert.equal(saved.game.sushi, 0); assert.equal(saved.game.previousRun.endingPhase, 'cleared');
    assert.equal(saved.game.previousRun.facilityCounts.global_freshness_sync, 3);
    assert.equal(saved.game.previousRun.totalClicks, 1501);
    await page.reload(); await page.locator('.phase-playing').waitFor();
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('sushi-loopy.save')));
    assert.equal(restored.game.previousRun.totalClicks, 1501);
    assert.equal(restored.game.collapseElapsedMs, 0);
    assert.equal(await overlay.count(), 0, 'the completed ending does not replay after reload');
    await page.screenshot({ path: `${output}/${name}-reset.png` });
    await context.close(); await page.video().saveAs(`${output}/${name}-flow.webm`);
    results.push({ name, stormCount, audioSupported, audioLoaded, reducedMotion: reduced, reload: mobile, frozenHold: true, previousRecord: true });
    await writeFile(`${output}/checks.json`, JSON.stringify({ base, results, errors }, null, 2));
    console.log('PASS', results.at(-1));
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/checks.json`, JSON.stringify({ base, results, errors }, null, 2));
} finally { await browser.close(); }
