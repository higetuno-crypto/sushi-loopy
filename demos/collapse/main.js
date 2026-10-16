import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTown } from '../../src/game/rendering/townModels.ts';
import { createTown } from '../../src/game/logic/town.ts';
import { FACILITIES } from '../../src/game/data/facilities.ts';
import { deliveryRoute } from '../../src/game/rendering/townField.ts';
import { createScore, wavData, DURATION, IMPACT } from './score.js';

const $=id=>document.getElementById(id);
const canvas=$('film'), ink=canvas.getContext('2d',{alpha:false});
const capture=new URLSearchParams(location.search).has('render');
const W=capture?1920:Math.min(1600,Math.max(960,Math.round($('stage').clientWidth*devicePixelRatio)));
const H=Math.round(W*9/16);canvas.width=W;canvas.height=H;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const fade=(a,b,c,d,t)=>smooth(a,b,t)*(1-smooth(c,d,t));
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#080e13');scene.fog=new T.FogExp2('#080e13',.009);
const camera=new T.PerspectiveCamera(38,16/9,.1,300);
const hemi=new T.HemisphereLight('#c6e9eb','#344443',2);scene.add(hemi);
const sun=new T.DirectionalLight('#ffdb9e',3.2);sun.position.set(-10,24,12);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:.1,far:100});sun.shadow.normalBias=.028;sun.shadow.bias=-.00015;scene.add(sun);
const rim=new T.DirectionalLight('#77c6dc',2);rim.position.set(12,8,-18);scene.add(rim);
const flash=new T.PointLight('#ff9859',0,75,1.4);flash.position.set(-.4,3,-1.7);scene.add(flash);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new T.Vector2(W,H),.45,.65,.85);composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade=new ShaderPass({
  uniforms:{tDiffuse:{value:null},uTime:{value:0},uAberration:{value:0},uFade:{value:1}},
  vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uAberration,uFade;varying vec2 vUv;
    float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec2 p=vUv;vec2 d=(p-.5)*uAberration;
      vec3 c=vec3(texture2D(tDiffuse,p+d).r,texture2D(tDiffuse,p).g,texture2D(tDiffuse,p-d).b);
      float vignette=1.-.38*pow(length((p-.5)*vec2(1.,.8)),1.4);
      c*=vignette;c+=(noise(p*1900.+floor(uTime*24.))-.5)*.018;
      gl_FragColor=vec4(c*uFade,1.);}`
});composer.addPass(grade);

const sea=new T.Mesh(new T.PlaneGeometry(600,600),new T.MeshStandardMaterial({color:'#183e43',roughness:.55,metalness:.35,transparent:true}));
sea.rotation.x=-Math.PI/2;sea.position.y=-1.65;scene.add(sea);
const world=new T.Group();scene.add(world);
const fracture={uBreak:{value:0},uStress:{value:0}};

/** Bake the existing town into one draw call, with cell-coherent GPU fracture.
 * ponytail: cinematic cells, not rigid-body simulation; use real physics only for interactive collisions.
 */
function fractureTown(root) {
  const p=[],n=[],c=[],pivots=[],seeds=[];
  root.updateMatrixWorld(true);
  const v=new T.Vector3(),normalMatrix=new T.Matrix3(),matrix=new T.Matrix4(),instance=new T.Matrix4();
  function emit(a,b,d,color,depth=0) {
    const dist=(x,y)=>(x[0]-y[0])**2+(x[1]-y[1])**2+(x[2]-y[2])**2;
    const edges=[dist(a,b),dist(b,d),dist(d,a)],longest=Math.max(...edges);
    if(longest>5.8&&depth<6) {
      const k=edges.indexOf(longest),q=[a,b,d],x=q[k],y=q[(k+1)%3],z=q[(k+2)%3],mid=x.map((value,i)=>(value+y[i])/2);
      emit(x,mid,z,color,depth+1);emit(mid,y,z,color,depth+1);return;
    }
    const center=[0,1,2].map(i=>Math.floor((a[i]+b[i]+d[i])/3/1.15)*1.15+.575);
    const seed=rand(center[0]*13+center[1]*71+center[2]*31);
    for(const q of [a,b,d]){p.push(...q.slice(0,3));n.push(...q.slice(3));c.push(color.r,color.g,color.b);pivots.push(...center);seeds.push(seed);}
  }
  root.traverseVisible(obj=>{
    if(!obj.isMesh)return;
    const g=obj.geometry,positions=g.getAttribute('position'),normals=g.getAttribute('normal');
    const count=g.index?g.index.count:positions.count;
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    for(let inst=0;inst<(obj.isInstancedMesh?obj.count:1);inst++) {
      matrix.copy(obj.matrixWorld);if(obj.isInstancedMesh){obj.getMatrixAt(inst,instance);matrix.multiply(instance);}
      normalMatrix.getNormalMatrix(matrix);
      for(let i=0;i<count;i+=3) {
        const mat=Array.isArray(obj.material)?materials[g.groups.find(group=>i>=group.start&&i<group.start+group.count)?.materialIndex??0]:obj.material;
        const color=(mat.color??new T.Color('#e1d6bf')).clone();
        if(mat.emissive)color.add(mat.emissive.clone().multiplyScalar((mat.emissiveIntensity??1)*.2));
        const corners=[];
        for(let j=0;j<3;j++){
          const ix=g.index?g.index.getX(i+j):i+j;
          v.fromBufferAttribute(positions,ix).applyMatrix4(matrix);const corner=v.toArray();
          if(normals)v.fromBufferAttribute(normals,ix).applyNormalMatrix(normalMatrix);else v.set(0,1,0);
          corner.push(v.x,v.y,v.z);corners.push(corner);
        }
        emit(...corners,color);
      }
    }
  });
  const geometry=new T.BufferGeometry();
  for(const [key,values,size] of [['position',p,3],['normal',n,3],['color',c,3],['aPivot',pivots,3],['aSeed',seeds,1]])geometry.setAttribute(key,new T.Float32BufferAttribute(values,size));
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.76,metalness:.12,side:T.DoubleSide,transparent:true});
  const animateShader=shader=>{
    Object.assign(shader.uniforms,fracture);
    shader.vertexShader=`attribute vec3 aPivot;attribute float aSeed;uniform float uBreak;uniform float uStress;
      vec3 rotateShard(vec3 p,vec3 axis,float angle){return p*cos(angle)+cross(axis,p)*sin(angle)+axis*dot(axis,p)*(1.-cos(angle));}
      float shardTime(){return max(0.,uBreak-length(aPivot.xz)*.026-aSeed*.4);}
      vec3 shardAxis(){return normalize(vec3(sin(aSeed*41.)+.01,cos(aSeed*17.),sin(aSeed*73.)));}
      vec3 shardPosition(vec3 p){
        float bt=shardTime();vec3 radial=normalize(vec3(aPivot.x+.4,.01,aPivot.z+1.7));
        vec3 offset=radial*(pow(bt,1.15)*(2.2+aSeed*2.8));
        offset.y=(4.+aSeed*5.)*bt-2.*bt*bt;
        offset+=radial*uStress*.075*sin(aSeed*84.);
        return rotateShard(p-aPivot,shardAxis(),bt*(aSeed-.5)*2.5)+aPivot+offset;
      }
      ${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
      vec3 objectNormal=rotateShard(normal,shardAxis(),shardTime()*(aSeed-.5)*2.5);
    `).replace('#include <begin_vertex>',`
      vec3 transformed=shardPosition(position);
    `);
  };
  material.onBeforeCompile=animateShader;
  const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});mesh.customDepthMaterial.onBeforeCompile=animateShader;
  world.add(mesh);
  return {mesh,triangles:p.length/9,cells:new Set(seeds).size};
}

function line(points,color,opacity=1) {
  const material=new T.LineBasicMaterial({color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false});
  const mesh=new T.Line(new T.BufferGeometry().setFromPoints(points),material);scene.add(mesh);return mesh;
}
const rings=[];
for(let k=0;k<4;k++) {
  const points=Array.from({length:181},(_,i)=>{const a=i/180*Math.PI*2;return new T.Vector3(Math.cos(a)*(6+k*2.3),0,Math.sin(a)*(6+k*2.3));});
  const r=line(points,'#a4e0df',0);r.position.set(-.4,2+k*.4,-1.7);rings.push(r);
}
const links=FACILITIES.map((_,i)=>{
  const a=i/9*Math.PI*2,points=[];
  for(let j=0;j<=48;j++){const q=j/48;points.push(new T.Vector3(-.4+Math.cos(a)*14*q,1+Math.sin(q*Math.PI)*3,-1.7+Math.sin(a)*14*q));}
  return line(points,'#efbd75',0);
});
const shock=new T.Mesh(new T.RingGeometry(.996,1,180),new T.MeshBasicMaterial({color:new T.Color(4,1.9,.65),transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));
shock.rotation.x=-Math.PI/2;shock.position.set(-.4,.3,-1.7);scene.add(shock);
const echo=shock.clone();echo.material=shock.material.clone();scene.add(echo);

const dustCount=4500,dustPositions=[],dustSeeds=[];
for(let i=0;i<dustCount;i++){dustPositions.push((rand(i+8)-.5)*26,rand(i+21)*5,(rand(i+72)-.5)*27);dustSeeds.push(rand(i+104));}
const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.Float32BufferAttribute(dustPositions,3));dustGeometry.setAttribute('aSeed',new T.Float32BufferAttribute(dustSeeds,1));
const dustMaterial=new T.ShaderMaterial({
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{uBreak:{value:0},uOpacity:{value:0},uScale:{value:H/1080}},
  vertexShader:`attribute float aSeed;uniform float uBreak,uScale;varying float vSeed;
    void main(){vSeed=aSeed;float t=max(0.,uBreak-aSeed*.5);vec3 p=position;
      vec3 radial=normalize(vec3(p.x+.4,.01,p.z+1.7));p+=radial*t*(3.+aSeed*5.);
      p.y+=(3.+aSeed*8.)*t-1.45*t*t;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.5+aSeed*3.)*uScale*40./-mv.z,1.,9.);}`,
  fragmentShader:`uniform float uOpacity;varying float vSeed;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
    gl_FragColor=vec4(mix(vec3(.5,.75,.8),vec3(1.,.65,.3),vSeed),pow(1.-d,2.)*uOpacity);}`
});
const dust=new T.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;scene.add(dust);

function heroSushi() {
  const g=new T.Group();
  const make=(geo,color,x,y,z)=>{const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.58,metalness:0}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  make(new T.CylinderGeometry(1.9,1.78,.14,96),'#35545a',0,-.39,0);
  make(new T.CylinderGeometry(1.68,1.68,.035,96),'#688287',0,-.3,0);
  const border=new T.Mesh(new T.TorusGeometry(1.82,.022,6,96),new T.MeshStandardMaterial({color:'#e9c588',metalness:.6,roughness:.3}));border.rotation.x=Math.PI/2;border.position.y=-.31;g.add(border);
  make(new RoundedBoxGeometry(2.04,.56,1.03,4,.22),'#fff1cf',0,.05,0);
  const grains=new T.InstancedMesh(new T.CapsuleGeometry(.032,.065,3,6),new T.MeshStandardMaterial({color:'#f7ead4',roughness:.8}),360);
  const dummy=new T.Object3D();
  for(let i=0;i<360;i++){
    const side=i%4,x=side<2?(rand(i+310)-.5)*1.68:(side===2?1:-1)*1.01,z=side<2?(side===0?1:-1)*.51:(rand(i+525)-.5)*.64;
    dummy.position.set(x,-.14+rand(i+123)*.34,z);dummy.rotation.set(rand(i)*2,rand(i+22)*3,rand(i+40)*2);dummy.scale.setScalar(.9+rand(i+41)*.25);dummy.updateMatrix();grains.setMatrixAt(i,dummy.matrix);
  }g.add(grains);
  const salmon=make(new RoundedBoxGeometry(2.42,.3,1.27,5,.14),'#df7054',0,.43,0);salmon.rotation.z=-.025;salmon.material.roughness=.43;
  for(let i=0;i<9;i++) {
    const x=-1.04+i*.25,points=[];
    for(let j=0;j<13;j++){const z=-.51+j/12*1.02;points.push(new T.Vector3(x+z*.2,.582-x*.025-Math.abs(z)**5*.6,z));}
    const curve=new T.CatmullRomCurve3(points),stripe=new T.Mesh(new T.TubeGeometry(curve,18,.021,5,false),new T.MeshStandardMaterial({color:'#ffd4b4',roughness:.6}));g.add(stripe);
  }
  g.position.set(0,2,0);g.visible=false;scene.add(g);return g;
}
const sushi=heroSushi();
let town,scoreBuffer;

const cameraKeys=[
  [0,[34,27,43],[-4,1,-1]],
  [5,[30,25,37],[0,1,-2]],
  [10.8,[21,22,31],[0,1,-2]],
  [12.3,[20,21,30],[0,1,-2]],
  [13.3,[27,24,39],[0,2,-2]],
  [17.8,[13,24,47],[0,2,-2]],
  [22.5,[-4,17,47],[0,-1,-1]],
  [24.3,[5,5.5,10],[0,2,0]],
  [34,[4.4,4.5,9],[0,2,0]],
];
function placeCamera(t,reduced) {
  let i=0;while(i<cameraKeys.length-2&&t>cameraKeys[i+1][0])i++;
  const a=cameraKeys[i],b=cameraKeys[i+1],p=smooth(a[0],b[0],t);
  const eye=new T.Vector3(...a[1]).lerp(new T.Vector3(...b[1]),p),target=new T.Vector3(...a[2]).lerp(new T.Vector3(...b[2]),p);
  const kick=Math.exp(-Math.max(0,t-IMPACT)*4)*(t>=IMPACT?1:0)*(reduced?0:.3);
  eye.x+=Math.sin(t*83)*kick;eye.y+=Math.sin(t*69)*kick;
  camera.position.copy(eye);camera.lookAt(target);
}
function label(text,x,y,size,color='#eee8d5',align='left',font='Arial',tracking=0) {
  ink.font=`${size}px ${font}`;ink.fillStyle=color;ink.textAlign=align;
  if(!tracking){ink.fillText(text,x,y);return;}
  const widths=[...text].map(ch=>ink.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0)+tracking*(widths.length-1);
  let dx=x-(align==='center'?total/2:align==='right'?total:0);ink.textAlign='left';
  [...text].forEach((ch,i)=>{ink.fillText(ch,dx,y);dx+=widths[i]+tracking;});
}
function overlay(t) {
  ink.save();ink.scale(W/1920,H/1080);
  // Quiet, fixed typography is a deliberate counterpoint to the moving world.
  ink.globalAlpha=.66*(1-smooth(21,23,t));
  label('SUSHI LOOPY',84,72,15,'#e5e8dc','left','Arial',4);
  label('THE LAST PIECE',1836,72,13,'#e5e8dc','right','Arial',3);
  ink.strokeStyle='#d2ddd3';ink.lineWidth=1;ink.globalAlpha*=.35;ink.beginPath();ink.moveTo(84,94);ink.lineTo(1836,94);ink.stroke();
  const title=fade(.15,1.5,3.9,5.2,t);ink.globalAlpha=title;
  label('ひとつずつ、',125,275+(1-title)*22,35,'#d5dccc','left','"Yu Mincho",serif',5);
  label('世界になった。',125,336+(1-title)*22,45,'#f0ead5','left','"Yu Mincho",serif',6);
  label('A WORLD, ONE PIECE AT A TIME.',128,382,11,'#aebeb4','left','Arial',2.2);
  ink.globalAlpha=fade(4.8,5.3,10.5,11.2,t)*.85;
  label('FRESHNESS / SYNCHRONIZATION',84,974,12,'#c7dbd3','left','Arial',2.6);
  const progress=clamp((t-5)/6.6);ink.fillStyle='#bed7cd';ink.fillRect(84,997,320*progress,1);
  for(let i=0;i<3;i++){ink.globalAlpha=fade(5+i*2.1,5.3+i*2.1,11.3,11.8,t)*.7;label(`0${i+1}`,84+i*112,1030,12,'#c7dbd3','left','monospace',1.5);}
  ink.globalAlpha=fade(10.75,11.05,11.75,12.05,t)*.65;
  label('同期応答なし',960,954,17,'#f2b288','center','"Yu Gothic",sans-serif',4);
  ink.globalAlpha=1;
  const dark=fade(22.1,23.25,23.6,24.75,t);
  if(dark){ink.fillStyle=`rgba(4,8,11,${dark})`;ink.fillRect(0,0,1920,1080);}
  const ending=smooth(26,28,t);
  ink.globalAlpha=ending;label('握る',960,828,27,'#eee3cc','center','"Yu Mincho",serif',13);
  ink.globalAlpha=ending*.46;label('もう一度。',960,885,13,'#d7d6c8','center','"Yu Gothic",sans-serif',4);
  ink.globalAlpha=smooth(29,31,t)*.65;
  label('SUSHI LOOPY',960,1008,13,'#d9dcca','center','Arial',6);
  ink.globalAlpha=1;
  // A small amber exposure pulse; never a full-screen white flash or a strobe.
  const pulse=t>=IMPACT?Math.exp(-(t-IMPACT)*13)*.16:0;
  if(pulse){ink.fillStyle=`rgba(255,188,105,${pulse})`;ink.fillRect(0,0,1920,1080);}
  ink.restore();
}

function draw(t) {
  t=Math.max(0,Math.min(DURATION,Number.isFinite(t)?t:0));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches&&!capture;
  placeCamera(t,reduced);
  const elapsed=Math.max(0,t-IMPACT);
  const physical=elapsed<.9?elapsed*1.9:elapsed<5.8?1.71+(elapsed-.9)*.36:3.474+(elapsed-5.8)*1.35;
  fracture.uBreak.value=physical;fracture.uStress.value=smooth(9.5,11.8,t)*(1-smooth(IMPACT,IMPACT+.2,t));
  world.visible=t<24;town.mesh.material.opacity=1-smooth(20.3,23,t);
  sea.material.opacity=1-smooth(11,15,t);sea.visible=t<15;
  hemi.intensity=2-.7*smooth(7,12,t)+smooth(24,27,t)*.5;
  sun.intensity=3.2-smooth(8,12,t)*1.1+smooth(24,27,t)*.6;
  flash.intensity=t>=IMPACT?75*Math.exp(-elapsed*1.6):smooth(9,11.8,t)*6;
  bloom.strength=.3+smooth(8,11.8,t)*.25*(1-smooth(15,19,t));
  for(let k=0;k<rings.length;k++){
    const r=rings[k],alignment=smooth(5+k*.7,11.1,t);
    r.rotation.set((1-alignment)*(.25+k*.16),t*(.07+k*.03),Math.sin(t*.4+k)*.18*(1-alignment));
    r.material.opacity=fade(4.5+k*.65,5.5+k*.65,12.6,14,t)*(.38+k*.08);
    r.scale.setScalar(1+smooth(12.6,14,t)*2.5);r.position.y=2+k*.4-alignment*k*.4;
  }
  links.forEach((l,i)=>{l.material.opacity=fade(7+i*.12,8+i*.12,11.8,12.05,t)*.16;});
  for(const [i,m] of [shock,echo].entries()){
    const q=elapsed-i*.14;m.visible=q>0&&q<2.4;m.scale.setScalar(Math.max(.001,1+q*34));
    m.material.opacity=Math.max(0,.85*(1-q/2.4));
  }
  dustMaterial.uniforms.uBreak.value=physical;dustMaterial.uniforms.uOpacity.value=fade(IMPACT,IMPACT+.25,20,23.5,t)*1.2;
  sushi.visible=t>23.4;sushi.scale.setScalar(.84+smooth(24,34,t)*.06);sushi.rotation.y=-.35+smooth(24,34,t)*.23;
  grade.uniforms.uTime.value=t;
  const glitch=fade(10.3,11.3,11.8,12.1,t);
  grade.uniforms.uAberration.value=reduced?0:glitch*.005+(t>=IMPACT?Math.exp(-elapsed*6)*.016:0);
  grade.uniforms.uFade.value=smooth(0,.75,t);
  composer.render();ink.drawImage(renderer.domElement,0,0,W,H);overlay(t);
  $('seek').value=String(t);$('time').value=`00:${String(Math.floor(t)).padStart(2,'0')} / 00:34`;
  return {time:t,triangles:town.triangles,cells:town.cells,drawCalls:renderer.info.render.calls};
}

let playing=false,current=0,started=0,audioContext,audioSource,audioGain,muted=false,frame=0;
function stopAudio(){if(audioSource){audioSource.stop();audioSource.disconnect();audioSource=null;}}
function pause(){if(playing)current=Math.min(DURATION,(performance.now()-started)/1000);playing=false;stopAudio();$('play').textContent='再生';$('play').setAttribute('aria-label','映像を再生');}
async function play(){
  if(playing){pause();return;}
  if(current>=DURATION)current=0;
  if(scoreBuffer){
    const Audio=window.AudioContext||window.webkitAudioContext;
    audioContext??=new Audio();await audioContext.resume();
    audioGain??=audioContext.createGain();audioGain.gain.value=muted?0:1;audioGain.disconnect();audioGain.connect(audioContext.destination);
    stopAudio();audioSource=audioContext.createBufferSource();audioSource.buffer=scoreBuffer;audioSource.connect(audioGain);audioSource.start(0,current);
  }
  started=performance.now()-current*1000;playing=true;$('start').hidden=true;$('play').textContent='一時停止';$('play').setAttribute('aria-label','映像を一時停止');
  $('status').textContent='再生中';
}
function loop(){
  if(playing){current=Math.min(DURATION,(performance.now()-started)/1000);draw(current);if(current>=DURATION){pause();$('status').textContent='もう一度、最初から再生できます';}}
  frame=requestAnimationFrame(loop);
}
$('begin').onclick=play;$('play').onclick=play;
$('restart').onclick=()=>{pause();current=0;draw(0);void play();};
$('seek').oninput=()=>{pause();current=Number($('seek').value);$('start').hidden=true;draw(current);$('status').textContent='一時停止';};
$('sound').onclick=()=>{muted=!muted;if(audioGain)audioGain.gain.value=muted?0:1;$('sound').textContent=muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!muted));};
$('fullscreen').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen().catch(()=>{$('status').textContent='このブラウザーでは全画面表示を利用できません';});};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);stopAudio();audioContext?.close();composer.dispose();renderer.dispose();});

try {
  const loader=new GLTFLoader();
  const models=['01-craftsman/craftsman','02-conveyor-sushi/conveyor','03-auto-sushi-machine/auto-sushi','04-marine-food-plant/marine-plant','05-sushi-ocean-mining/ocean-mining','06-fusion-sushi-converter/fusion','07-luna-sea/luna','08-freshness-freezer/freezer','09-global-freshness-sync/sync'];
  const [assets,audio]=await Promise.all([Promise.all(models.map(p=>loader.loadAsync(`/assets/models/${p}-lv4.glb`).then(g=>g.scene))),createScore()]);
  const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,25]));
  const model=buildTown(counts,{...createTown(),name:'ルーピー'},assets[0],4,...assets.slice(1));
  model.tick(2,.016,2);
  if(model.delivery)model.delivery.truck.position.copy(deliveryRoute(3,0).getPointAt(.5));
  town=fractureTown(model.root);model.dispose();scoreBuffer=audio;
  window.collapseDemo={draw,duration:DURATION,ready:true,stats:{triangles:town.triangles,cells:town.cells,width:W,height:H,audio:!!scoreBuffer},
    audioWav:()=>{const a=wavData(scoreBuffer);let binary='';for(let i=0;i<a.length;i+=32768)binary+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(binary);},
    seek:t=>{pause();current=clamp(t/DURATION)*DURATION;draw(current);},
    getState:()=>({playing,time:current,muted,hasAudio:!!audioSource})};
  draw(1.6);for(const id of ['begin','play','restart','seek'])$(id).disabled=false;
  $('begin').textContent=scoreBuffer?'音とともに再生':'映像を再生（音なし）';
  $('status').textContent=scoreBuffer?'34秒 / オリジナル楽曲・効果音':'このブラウザーは音声生成に未対応です。音付きMP4で鑑賞できます。';
  if(!scoreBuffer){$('sound').disabled=true;$('sound').textContent='音声非対応';$('sound').setAttribute('aria-pressed','false');}
  if(!capture)loop();
} catch(error) {
  console.error(error);$('status').textContent=`読み込みに失敗しました: ${error.message}`;$('begin').textContent='再読み込みしてください';
}
