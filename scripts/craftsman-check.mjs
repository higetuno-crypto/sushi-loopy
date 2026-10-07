import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url = process.env.SUSHI_TEST_URL || 'http://127.0.0.1:5178/';
const prefix = process.env.SUSHI_CAPTURE_PREFIX || 'craftsman';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
await mkdir('artifacts/craftsman', { recursive: true });
try {
  for (const width of [390, 320, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    const box = page.locator('.sushi-box');
    await page.screenshot({ path: `artifacts/craftsman/${prefix}-${width}-page-empty.png` });
    await box.scrollIntoViewIfNeeded();
    await box.screenshot({ path: `artifacts/craftsman/${prefix}-${width}-empty.png` });
    const tap = page.getByRole('button', { name: '寿司をタップする。長押しでも握れます', exact: true });
    for (let i = 0; i < 10; i++) await tap.click();
    await page.getByRole('button', { name: '音をつける', exact: true }).click();
    const hire = page.getByRole('button', { name: '職人さんを購入', exact: true });
    if (width === 1440) { await hire.focus(); await page.keyboard.press('Enter'); }
    else await hire.click();
    await box.screenshot({ path: `artifacts/craftsman/${prefix}-${width}-first-hire.png` });
    await page.screenshot({ path: `artifacts/craftsman/${prefix}-${width}-page-first-hire.png` });
    assert.equal(await box.locator('.shop-art .shop-chef').count(), 1, 'first purchase must add the illustrated chef');
    assert.equal(await box.getAttribute('data-arriving'), 'true', 'only a real first purchase starts the entrance');
    assert.match(await box.locator('.sushi-box-facilities').innerText(), /職人さん/);
    assert.equal(await page.locator('.sound-control button').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('.sound-control small').innerText(), /●●○○○/);
    const chef = page.locator('.chef-body');
    const transform = await chef.evaluate(element => getComputedStyle(element).transform);
    await page.waitForTimeout(250);
    assert.notEqual(await chef.evaluate(element => getComputedStyle(element).transform), transform, 'chef must actually move');
    if (url.includes(':5178')) {
      const drift = await page.evaluate(async () => {
        // Vite adds an HMR timestamp: importing the bare URL would create another audio singleton.
        const audioUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/game/audio/engine.ts').name;
        const { getMusicTimeMs } = await import(audioUrl);
        const animation = document.querySelector('.chef-body').getAnimations()[0];
        const audioTime = getMusicTimeMs();
        return audioTime === null ? null : Math.abs(animation.currentTime - audioTime);
      });
      assert.ok(drift !== null && drift < 60, `visual and audio clocks drifted by ${drift}ms`);
    }
    await page.getByRole('button', { name: 'アニメーションを停止', exact: true }).click();
    assert.equal(await chef.evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.getByRole('button', { name: '端末設定に戻す', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await chef.evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.getByRole('button', { name: 'アニメーションを再生', exact: true }).click();
    assert.notEqual(await chef.evaluate(element => getComputedStyle(element).animationName), 'none');
    await page.getByRole('button', { name: '音を消す', exact: true }).click();
    await page.waitForTimeout(4500);
    assert.equal(await box.getAttribute('data-arriving'), 'false');
    await box.scrollIntoViewIfNeeded();
    await box.screenshot({ path: `artifacts/craftsman/${prefix}-${width}-working.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`);
    // Reload uses this disposable browser context's own save. It must retain the chef without replaying the entrance.
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.shop-chef').count(), 1);
    assert.equal(await page.locator('.sushi-box').getAttribute('data-arriving'), 'false');
    await page.getByRole('button', { name: '職人さんを購入', exact: true }).click();
    assert.equal(await page.locator('.sushi-box').getAttribute('data-arriving'), 'false', 'another hire must not replay the entrance');
    assert.deepEqual(errors, []);
    results.push({ width, audioClockTested: url.includes(':5178'), checks: 'first purchase, real motion, stop/reduced/override, save reload, second purchase, overflow, console' });
    await context.close();
  }
  await writeFile('artifacts/craftsman/results.json', JSON.stringify({ status: 'PASS', url, browser: 'isolated installed Chrome; physical iPhone/Safari untested', results }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', results }, null, 2));
} finally { await browser.close(); }
