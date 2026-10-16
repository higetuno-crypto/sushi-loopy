import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import path from 'node:path';

const {chromium,webkit}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.COLLAPSE_URL||'http://127.0.0.1:5196/demos/collapse/';
const output=path.resolve('artifacts/collapse-motion-20261016-error-cascade');
await mkdir(output,{recursive:true});
const video=process.argv.includes('--render');
const audioOnly=process.argv.includes('--audio');
const engine=process.argv.includes('--webkit')?'webkit':'chrome';
console.log(`Starting ${engine}`);
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});
console.log('Browser ready');
const errors=[];
let ffmpeg;
try {
  const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
  await page.goto(`${base}?render`);
  console.log('Page loaded');
  await page.waitForFunction(()=>window.collapseDemo?.ready||document.getElementById('status')?.textContent.startsWith('読み込みに失敗'),{},{timeout:90000});
  assert.deepEqual(errors,[],'scene loads and shaders compile');
  const stats=await page.evaluate(()=>window.collapseDemo.stats);
  const {duration,cues}=await page.evaluate(()=>({duration:window.collapseDemo.duration,cues:window.collapseDemo.cues}));
  console.log('Scene ready',stats);
  assert.ok(stats.triangles>10000,'real town geometry is present');
  assert.ok(stats.cells>100,'fracture has distinct spatial pieces');
  const samples=[];
  for(const t of [1.8,7.5,9.2,12,15.9,17.7,18.55,19.2,20.4,21.4,24.5,33.7,38.5]) {
    const frame=await page.evaluate(t=>{
      const state=window.collapseDemo.draw(t),canvas=document.getElementById('film');
      const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let lit=0;for(let i=0;i<p.length;i+=160)if(p[i]+p[i+1]+p[i+2]>160)lit++;
      return {state,lit,image:canvas.toDataURL('image/jpeg',.94).split(',')[1]};
    },t);
    assert.ok(frame.lit>80,`frame ${t} has visible rendered content`);
    await writeFile(path.join(output,`${engine}-${String(t).replace('.','_')}.jpg`),Buffer.from(frame.image,'base64'));
    samples.push({time:t,lit:frame.lit,phase:frame.state.phase,dialogs:frame.state.dialogs});
  }
  assert.equal(samples.find(s=>s.time===7.5).dialogs,1,'the first warning is readable alone');
  assert.ok(samples.find(s=>s.time===15.9).dialogs>50,'the cascade fills the screen');
  assert.deepEqual(samples.filter(s=>s.time>=17.7&&s.time<=21.4).map(s=>s.phase),['crash','blue','hold','hold','collapse']);
  assert.ok(cues.impact-cues.hold>=1.8,'there is a deliberate hold before rupture');
  assert.ok(cues.hold-cues.blue<.3,'blue screen is one short interruption');
  const frameHash=t=>page.evaluate(async t=>{
    window.collapseDemo.draw(t);const c=document.getElementById('film');
    const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const hash=await crypto.subtle.digest('SHA-256',pixels);
    return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
  },t);
  const held=await frameHash(19.2);
  const still=await frameHash(20.4);
  assert.equal(held,still,'the entire image, including grain and cursor, freezes in the hold');
  assert.equal(context.pages().length,1,'simulated dialogs never create browser windows');
  // Seeking is deterministic, including backwards across the rupture.
  await page.evaluate(()=>{
    window.collapseDemo.draw(21.4);const c=document.getElementById('film');
    window.seekPixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  });
  await page.evaluate(()=>window.collapseDemo.draw(38));
  const seekDiff=await page.evaluate(()=>{
    window.collapseDemo.draw(21.4);const c=document.getElementById('film');
    const a=window.seekPixels,b=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let max=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);if(d)changed++;}
    delete window.seekPixels;return {max,changed,fraction:changed/b.length};
  });
  // WebKit readback across event-loop turns can round a few channels by one 8-bit level.
  assert.ok(seekDiff.max<=(engine==='webkit'?1:0)&&seekDiff.fraction<.005,`backward seek reproduces the frame: ${JSON.stringify(seekDiff)}`);
  assert.equal(await page.evaluate(()=>localStorage.length),0,'demo does not create game saves');
  let audioPath;
  if(video||audioOnly) {
    assert.ok(stats.audio,'audio rendering requires a browser with Web Audio');
    const wav=await page.evaluate(()=>window.collapseDemo.audioWav());
    const bytes=Buffer.from(wav,'base64');audioPath=path.join(output,'score.wav');await writeFile(audioPath,bytes);
    const rate=bytes.readUInt32LE(24),rms=(a,b)=>{
      let sum=0,count=0;for(let i=44+Math.floor(a*rate)*4;i<44+Math.floor(b*rate)*4;i+=2){sum+=(bytes.readInt16LE(i)/32768)**2;count++;}
      return Math.sqrt(sum/count);
    };
    let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i))/32768);
    const audioStats={duration:(bytes.length-44)/4/rate,channels:bytes.readUInt16LE(22),rate,peak,musicRms:rms(2,5),errorRms:rms(13,16),silenceRms:rms(cues.hold+.1,cues.impact-.1),impactRms:rms(cues.impact,cues.impact+1),endingRms:rms(35,39)};
    assert.equal(audioStats.duration,duration);assert.equal(audioStats.channels,2);assert.ok(peak<.98,'mix has peak headroom');
    assert.ok(audioStats.errorRms>audioStats.musicRms*.8,'the error cascade is audible');
    assert.ok(audioStats.silenceRms<.00001,'the pre-impact silence is real');
    assert.ok(audioStats.musicRms>.02&&audioStats.endingRms>.015,'quiet sections are audible');
    assert.ok(audioStats.impactRms/audioStats.musicRms<6,'impact retains dynamics without an excessive level jump');
    await writeFile(path.join(output,'audio-checks.json'),JSON.stringify(audioStats,null,2));console.log('AUDIO',audioStats);
  }
  if(video) {
    const fps=30,frames=duration*fps,videoPath=path.join(output,'sushi-loopy-system-failure.mp4');
    ffmpeg=spawn('ffmpeg',['-y','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',audioPath,'-c:v','libx264','-preset','slow','-crf','21','-maxrate','8M','-bufsize','16M','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-movflags','+faststart','-t',String(duration),videoPath],{windowsHide:true,stdio:['pipe','ignore','pipe']});
    let ffmpegError='';ffmpeg.stderr.on('data',b=>{ffmpegError+=b.toString();});
    const done=once(ffmpeg,'close');
    for(let i=0;i<frames;i++) {
      const jpg=await page.evaluate(t=>{window.collapseDemo.draw(t);return document.getElementById('film').toDataURL('image/jpeg',.97).split(',')[1];},i/fps);
      if(!ffmpeg.stdin.write(Buffer.from(jpg,'base64')))await once(ffmpeg.stdin,'drain');
      if(i%90===0)console.log(`Render ${i}/${frames} (${Math.round(i/frames*100)}%)`);
    }
    ffmpeg.stdin.end();const [exit]=await done;assert.equal(exit,0,ffmpegError);ffmpeg=null;
    console.log(`VIDEO ${videoPath}`);
  }
  await context.close();
  // The actual player: pause/resume, mute, scrub, responsive layout and reduced motion.
  const player=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const mobile=await player.newPage();mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(base);await mobile.waitForFunction(()=>window.collapseDemo?.ready,{},{timeout:90000});
  assert.equal(await mobile.evaluate(()=>window.collapseDemo.getState().playing),false,'no autoplay, including reduced-motion users');
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
  await mobile.locator('#begin').click();
  await mobile.waitForTimeout(400);
  assert.equal(await mobile.evaluate(()=>window.collapseDemo.getState().playing),true);
  await mobile.getByRole('button',{name:'映像を一時停止',exact:true}).click();
  const paused=await mobile.evaluate(()=>window.collapseDemo.getState().time);
  await mobile.waitForTimeout(150);
  assert.equal(await mobile.evaluate(()=>window.collapseDemo.getState().time),paused,'pause freezes the timeline');
  if(stats.audio){
    await mobile.getByRole('button',{name:'音 ON',exact:true}).click();
    assert.equal(await mobile.evaluate(()=>window.collapseDemo.getState().muted),true);
  }else assert.equal(await mobile.locator('#sound').isDisabled(),true,'unsupported audio is visibly disabled');
  await mobile.locator('#seek').fill('15.9');await mobile.locator('#seek').dispatchEvent('input');
  assert.equal(await mobile.evaluate(()=>window.collapseDemo.getState().time),15.9,'scrub selects the requested moment');
  await mobile.screenshot({path:path.join(output,`${engine}-mobile.png`)});
  assert.deepEqual(errors,[]);
  const result={engine,stats,cues,duration,samples,seekDiff,checks:{shaders:true,deterministicSeek:true,frozenHold:true,failureSequence:true,noRealPopups:true,noSaveWrites:true,noAutoplay:true,mobileLayout:true,pause:true,mute:stats.audio?'passed':'audio unavailable',scrub:true},errors};
  await writeFile(path.join(output,`${engine}-checks.json`),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  await player.close();
} catch(error) { console.error('Browser errors:',errors);throw error; }
finally {if(ffmpeg)ffmpeg.kill();await browser.close();}
