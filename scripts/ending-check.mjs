import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.SUSHI_TEST_URL || 'http://127.0.0.1:5178';
const browser = await chromium.launch({ headless: true, channel: process.env.SUSHI_BROWSER_CHANNEL || 'msedge' });
const errors = [], results = [];
await mkdir('artifacts', { recursive: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width:390,height:844 } : { width:1280,height:900 }, isMobile:mobile, hasTouch:mobile, reducedMotion: mobile ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name:'寿司をタップする。長押しでも握れます',exact:true }).waitFor();
    // Isolated context only: seed an actual v2 save just before the final purchase.
    const legacy = await page.evaluate(async () => {
      const { createInitialGameState } = await import('/src/game/state/initialState.ts');
      const { endingPhase: _endingPhase, collapseElapsedMs: _collapseElapsedMs, ...game } = createInitialGameState();
      for (const key of Object.keys(game.facilityCounts)) game.facilityCounts[key] = key === 'global_freshness_sync' ? 0 : 1;
      Object.assign(game, { sushi:1e9,totalSushiEarned:2e9,totalClicks:1234,runPlayTimeMs:3600000 });
      return { schemaVersion:2,savedAtMs:Date.now(),game };
    });
    await page.addInitScript(save => {
      if (!sessionStorage.getItem('ending-test-seeded')) {
        localStorage.setItem('sushi-loopy.save', JSON.stringify(save));
        sessionStorage.setItem('ending-test-seeded', 'yes');
      }
    }, legacy);
    await page.reload();
    await page.getByRole('button', { name:'世界鮮度同期装置を購入',exact:true }).click();
    await page.getByRole('button', { name:'世界の同期を実行する' }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sushi-loopy.save.backup-v2')).schemaVersion), 2);
    await page.getByRole('button', { name:'音をつける',exact:true }).click();
    await page.getByRole('button', { name:'世界の同期を実行する' }).click();
    await page.getByRole('heading', { name:'いただきますが、重なった。' }).waitFor();
    assert.equal(await page.getByRole('button', { name:'寿司をタップする。長押しでも握れます',exact:true }).count(), 0);
    assert.equal(await page.getByRole('button', { name:'最後の一貫を握る',exact:false }).count(), 0);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sushi-loopy.save')).game.endingPhase), 'collapse');
    if (mobile) assert.equal(await page.locator('.world-fragment').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.screenshot({ path:`artifacts/ending-${mobile ? 'mobile' : 'desktop'}-sync.png`,fullPage:true });
    await page.getByRole('heading', { name:'海が、皿のふちからこぼれる。' }).waitFor({ timeout:16000 });
    await page.screenshot({ path:`artifacts/ending-${mobile ? 'mobile' : 'desktop'}-collapse.png`,fullPage:true });
    // Reload mid-scene; automatic pagehide save must restore its position.
    await page.reload();
    await page.getByRole('heading', { name:'海が、皿のふちからこぼれる。' }).waitFor();
    await page.getByRole('heading', { name:'鮮度だけが、残った。' }).waitFor({ timeout:16000 });
    await page.getByRole('button', { name:/最後の一貫を握る/ }).waitFor({ timeout:13000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path:`artifacts/ending-${mobile ? 'mobile' : 'desktop'}-last.png`,fullPage:true });
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('sushi-loopy.save')).game.totalClicks);
    await page.getByRole('button', { name:/最後の一貫を握る/ }).click();
    await page.getByText('1周目 CLEAR', { exact:true }).waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sushi-loopy.save')));
    assert.equal(saved.game.endingPhase, 'cleared'); assert.equal(saved.game.totalClicks, before+1);
    assert.equal(saved.schemaVersion,3);
    await page.getByRole('button', { name:'育てたお店の記録を見る' }).click();
    assert.equal(await page.locator('.ending-facility-record li').count(),9);
    await page.screenshot({ path:`artifacts/ending-${mobile ? 'mobile' : 'desktop'}-clear.png`,fullPage:true });
    await page.reload(); await page.getByText('1周目 CLEAR', { exact:true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sushi-loopy.save')).game.totalClicks), before+1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    results.push({ device:mobile?'mobile':'desktop', result:'PASS', checks:['v2 migration','real final purchase','story timing','reload in collapse','one final click','immediate clear persistence','clear reload','no overflow','reduced motion (mobile)'] });
    console.log(`PASS ${mobile?'mobile':'desktop'} first-run ending`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile('artifacts/ending-check.json', JSON.stringify({ results,errors },null,2));
} finally { await browser.close(); }
