import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ channel:'msedge', headless:true });
try {
  const context = await browser.newContext({ reducedMotion:'reduce', viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  const page = await context.newPage();
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/game/state/store.ts');
    useGameStore.setState({ facilityCounts:{...useGameStore.getState().facilityCounts, conveyor_sushi:1} });
  });
  const belt = page.locator('.conveyor-strip > div');
  const name = () => belt.evaluate(e => getComputedStyle(e).animationName);
  const transform = () => belt.evaluate(e => getComputedStyle(e).transform);
  assert.equal(await name(), 'none');
  await page.getByRole('button',{name:'アニメーションを再生',exact:true}).tap();
  assert.equal(await name(), 'conveyor');
  const first = await transform();
  await page.waitForTimeout(250);
  assert.notEqual(await transform(), first);
  await page.locator('.sushi-button').tap();
  assert.equal(await page.locator('.sushi-drop').first().evaluate(e => getComputedStyle(e).display), 'block');
  await page.reload();
  await page.getByRole('button',{name:'アニメーションを停止',exact:true}).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-motion'), 'on');
  await page.getByRole('button',{name:'アニメーションを停止',exact:true}).tap();
  assert.equal(await name(), 'none');
  await page.getByRole('button',{name:'端末設定に戻す',exact:true}).tap();
  assert.equal(await name(), 'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'アニメーションを停止',exact:true}).waitFor();
  console.log('PASS: OS reduced motion, explicit playback and movement, tap effect, persistence, stop, reset, live OS preference change. Edge emulation only; physical Safari unverified.');
} finally { await browser.close(); }
