import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/higes/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless:true, channel:'msedge' });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5178');
  const audio = await page.evaluate(async()=>{
    const { BPM, notesAtStep } = await import('/src/game/audio/score.ts');
    const { createVoice } = await import('/src/game/audio/voice.ts');
    const seconds=128 * 60/BPM/2 + 4;
    const sampleRate=44100;
    const ctx=new OfflineAudioContext(1,Math.ceil(seconds*sampleRate),sampleRate);
    const master=ctx.createGain();master.gain.value=0.35*0.4;
    const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=8;
    master.connect(compressor);compressor.connect(ctx.destination);
    for(let step=0;step<128;step++) {
      const layers=Math.min(5,1+Math.floor(step/24));
      for(const note of notesAtStep(step,layers))createVoice(ctx,master,note,step*60/BPM/2+0.05);
    }
    const buffer=await ctx.startRendering();
    const data=buffer.getChannelData(0);let peak=0,sum=0,invalid=0;
    const wav=new ArrayBuffer(44+data.length*2);const view=new DataView(wav);
    const str=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
    str(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);
    view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
    str(36,'data');view.setUint32(40,data.length*2,true);
    for(let i=0;i<data.length;i++){const x=data[i];peak=Math.max(peak,Math.abs(x));sum+=x*x;if(!Number.isFinite(x))invalid++;view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,x))*32767),true);}
    const bytes=new Uint8Array(wav);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return { base64:btoa(binary), peak, rms:Math.sqrt(sum/data.length), invalid, duration:seconds, sampleRate, layers:'1 to 5, accelerated showcase' };
  });
  assert.equal(audio.invalid,0);assert.ok(audio.peak>0.005 && audio.peak<0.9);assert.ok(audio.rms>0.0005);
  const out='assets/prototypes/music';await mkdir(out,{recursive:true});
  await writeFile(`${out}/sushi-loopy-layers-v1.wav`,Buffer.from(audio.base64,'base64'));
  const {base64: _base64,...metrics}=audio;await writeFile(`${out}/audio-metrics.json`,JSON.stringify(metrics,null,2));console.log(metrics);
} finally {await browser.close();}
