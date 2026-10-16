import { notesAtStep, BPM, midiFrequency } from '../../src/game/audio/score.ts';
import { DURATION, IMPACT, DIALOGS, CRASH, BLUE, HOLD, WORLD_DELAY } from './failure.js';

/** The game's original 76 BPM theme, arranged for this film. No downloaded audio. */
export async function createScore() {
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Offline)return null;
  const ctx = new Offline(2, 44100 * DURATION, 44100);
  const master = ctx.createGain(); master.gain.value = .68;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -13; compressor.knee.value = 15;
  compressor.ratio.value = 4; compressor.attack.value = .003; compressor.release.value = .2;
  master.connect(compressor).connect(ctx.destination);
  const music = ctx.createGain(); music.connect(master);
  music.gain.setValueAtTime(0, 0); music.gain.linearRampToValueAtTime(1.45, 1.1);
  music.gain.setValueAtTime(1.45, 10.9); music.gain.linearRampToValueAtTime(0, 11.85);
  const reverb = ctx.createConvolver(), wet = ctx.createGain(); wet.gain.value = .17;
  const impulse = ctx.createBuffer(2, 88200, 44100);
  let seed = 42;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let c=0;c<2;c++) { const a=impulse.getChannelData(c); for(let i=0;i<a.length;i++)a[i]=(random()*2-1)*Math.exp(-i/16000); }
  reverb.buffer=impulse; reverb.connect(wet).connect(master);
  const noiseBuffer=ctx.createBuffer(1,44100*5,44100), data=noiseBuffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=random()*2-1;

  function tone(t, note, duration, gain, type='sine', pan=0, bus=master, slide=0) {
    const osc=ctx.createOscillator(), envelope=ctx.createGain(), stereo=ctx.createStereoPanner();
    osc.type=type; osc.frequency.setValueAtTime(midiFrequency(note),t);
    if(slide)osc.frequency.exponentialRampToValueAtTime(midiFrequency(note+slide),t+duration);
    envelope.gain.setValueAtTime(0,t); envelope.gain.linearRampToValueAtTime(gain,t+.012);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);
    stereo.pan.value=pan; osc.connect(envelope).connect(stereo).connect(bus);
    if(bus===master)stereo.connect(reverb);
    osc.start(t);osc.stop(t+duration+.02);
  }
  function noise(t, duration, gain, frequency, type='lowpass', pan=0, rise=false) {
    const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), env=ctx.createGain(), stereo=ctx.createStereoPanner();
    src.buffer=noiseBuffer; src.loop=true;filter.type=type;filter.frequency.setValueAtTime(frequency,t);filter.Q.value=.6;
    if(rise)filter.frequency.exponentialRampToValueAtTime(frequency*5,t+duration);
    env.gain.setValueAtTime(rise?.0001:0,t);
    if(rise){env.gain.exponentialRampToValueAtTime(gain,t+duration-.08);env.gain.linearRampToValueAtTime(0,t+duration);}
    else{env.gain.linearRampToValueAtTime(gain,t+.009);env.gain.exponentialRampToValueAtTime(.0001,t+duration);}
    stereo.pan.value=pan; src.connect(filter).connect(env).connect(stereo).connect(master);
    src.start(t,random()*2);src.stop(t+duration+.02);
  }

  const step=60/BPM/2;
  for(let n=0;n*step<11.3;n++) {
    const t=.4+n*step;
    for(const v of notesAtStep(n,4))tone(t,v.note,v.duration,v.gain*1.2,v.wave,(n%5-2)*.15,music);
    if(n%2===0) { tone(t,86+(n%4),.25,.024,'sine',-.4,music); tone(t,98+(n%4),.09,.009,'sine',.4,music); }
  }
  for(const t of [5.1,7.2,9.3]) {
    tone(t,86,1.8,.07,'sine',-.25);tone(t+.04,98,1.3,.026,'sine',.25);
    tone(t,26,1.25,.16,'sine'); noise(t,.3,.06,1500,'bandpass');
  }
  tone(8.2,35,3.6,.16,'triangle',0,music,-2);
  noise(9,2.8,.14,320,'bandpass',0,true);
  // Every window has its own onset. Density increases; gain does not grow without bound.
  DIALOGS.forEach((d,i)=>{
    const pan=Math.max(-.8,Math.min(.8,(d.x+290-960)/1050));
    const gain=i<4?.13:.18;
    if(d.kind===0){tone(d.at,81,.22,.075,'sine',pan);tone(d.at+.09,88,.26,.05,'sine',pan);}
    else {
      tone(d.at,d.kind===3?75:79,.16,gain,'triangle',pan);
      tone(d.at+.045,d.kind===3?68:73,.21,gain*.8,'sine',pan);
      noise(d.at,.035,.026,1800,'bandpass',pan);
    }
  });
  tone(11.5,32,5.8,.13,'triangle',0,master,-4);
  noise(13,4,.09,250,'bandpass',0,true);
  // Audio-buffer failure: a short stuck fragment, then a complete stop.
  for(let i=0;i<18;i++) {
    const t=CRASH+i*.06;
    tone(t,70,.041,.045,'triangle',i%2?.15:-.15);
    noise(t,.018,.035,1100,'bandpass');
  }
  noise(BLUE,.065,.12,650,'lowpass');
  master.gain.setValueAtTime(.68,BLUE+.09);master.gain.linearRampToValueAtTime(0,HOLD);
  master.gain.setValueAtTime(0,IMPACT-.015);master.gain.linearRampToValueAtTime(.68,IMPACT);
  tone(IMPACT,37,3.9,.55,'sine',0,master,-21);
  tone(IMPACT,49,.8,.15,'triangle',0,master,-15);
  noise(IMPACT,2.8,.42,700);noise(IMPACT,.7,.13,2500,'highpass');
  noise(IMPACT+.17,3.8,.2,1300,'bandpass',-.4);
  noise(IMPACT+.32,3.6,.2,900,'bandpass',.4);
  for(let i=0;i<56;i++) {
    const t=13+WORLD_DELAY+random()*7.5, pan=random()*1.7-.85;
    noise(t,.06+random()*.28,.025+random()*.06,800+random()*4500,'bandpass',pan);
    if(i%3===0)tone(t,78+Math.floor(random()*22),.22+random()*.6,.014,'sine',pan);
  }
  for(const [i,n] of [47,54,57,61].entries())tone(14+WORLD_DELAY+i*.15,n,7,.055,'sine',i/3-.5);
  noise(18+WORLD_DELAY,3.5,.07,420,'lowpass');
  tone(24.4+WORLD_DELAY,78,3.9,.12,'sine',-.12);tone(24.4+WORLD_DELAY,90,1.1,.027,'sine',.12);
  for(const [i,n] of [50,57,66,73].entries())tone(27+WORLD_DELAY+i*.36,n,5.4,.09,'sine',i/3-.5);
  tone(31.3+WORLD_DELAY,78,2.4,.075,'sine');
  master.gain.setValueAtTime(.68,DURATION-2);master.gain.linearRampToValueAtTime(0,DURATION);
  return ctx.startRendering();
}

export function wavData(buffer) {
  const bytes=new ArrayBuffer(44+buffer.length*4), view=new DataView(bytes);
  const text=(s,p)=>{for(let i=0;i<s.length;i++)view.setUint8(p+i,s.charCodeAt(i));};
  text('RIFF',0);view.setUint32(4,bytes.byteLength-8,true);text('WAVEfmt ',8);
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);
  view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*4,true);
  view.setUint16(32,4,true);view.setUint16(34,16,true);text('data',36);view.setUint32(40,buffer.length*4,true);
  const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
  for(let i=0;i<buffer.length;i++)for(let c=0;c<2;c++)view.setInt16(44+i*4+c*2,Math.round(Math.max(-1,Math.min(1,c?right[i]:left[i]))*32767),true);
  return new Uint8Array(bytes);
}
