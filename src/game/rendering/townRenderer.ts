import * as T from 'three';
import { buildTown } from './townModels';
import type { Town } from '../logic/town';
import type { FacilityId, GameState } from '../types';
import { FACILITIES } from '../data/facilities';

export type TownView = FacilityId | 'all';
const smooth=(n:number)=>n*n*(3-2*n);

// The truck stays on the road network even after a saved layout is rearranged.
function deliveryRoute(source:readonly number[],destination:readonly number[]) {
  const points=[new T.Vector3(source[0],0,source[1]+3.5)];
  if(source[1]!==destination[1])points.push(new T.Vector3(3,0,source[1]+3.5),new T.Vector3(3,0,destination[1]+3.5));
  points.push(new T.Vector3(destination[0],0,destination[1]+3.5));
  const curve=new T.CurvePath<T.Vector3>();
  let last=points[0];
  for(let i=1;i<points.length-1;i++) {
    const corner=points[i], before=corner.clone().lerp(points[i-1],.18),after=corner.clone().lerp(points[i+1],.18);
    curve.add(new T.LineCurve3(last,before));curve.add(new T.QuadraticBezierCurve3(before,corner,after));last=after;
  }
  curve.add(new T.LineCurve3(last,points.at(-1)!));return curve;
}

export function createTownRenderer(host:HTMLElement, onSelect:(key:string)=>void, onLost:()=>void) {
  // Retain the frame for the existing DOM fracture capture and user-initiated photos.
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#97c7c5');
  const camera=new T.OrthographicCamera(-7,7,7,-7,.1,250);
  const ambient=new T.HemisphereLight('#fff0d4','#768f86',1.9);scene.add(ambient);
  const sun=new T.DirectionalLight('#ffe0b4',2.6);sun.position.set(-12,25,16);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21,near:1,far:70});sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;scene.add(sun);
  const seaGeometry=new T.PlaneGeometry(180,180),seaMaterial=new T.MeshStandardMaterial({color:'#83bebc',roughness:1});
  const sea=new T.Mesh(seaGeometry,seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.y=-.75;sea.receiveShadow=true;scene.add(sea);
  const glintGeometry=new T.PlaneGeometry(.45,.035),glintMaterial=new T.MeshBasicMaterial({color:'#bfddcd',transparent:true,opacity:.3});
  const glints=new T.InstancedMesh(glintGeometry,glintMaterial,80), matrix=new T.Matrix4(), rotation=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0));
  for(let i=0;i<80;i++){const x=Math.sin(i*17)*23,z=Math.cos(i*31)*24;matrix.compose(new T.Vector3(x,-.73,z),rotation,new T.Vector3(1+(i%4),1,1));glints.setMatrixAt(i,matrix);}scene.add(glints);
  let model:ReturnType<typeof buildTown>|null=null,route:ReturnType<typeof deliveryRoute>|null=null;
  let width=1,height=1,elapsed=0,last=0,frame=0,visible=true,frozen=false,disposed=false,lost=false,dirty=true,deliveryStart=0;
  let view:TownView='craftsman',span=13,targetSpan=13;
  const target=new T.Vector3(0,0,5),destination=target.clone(),offset=new T.Vector3(10,14,20).normalize().multiplyScalar(80);
  const pointer=new T.Vector3(),truckDirection=new T.Quaternion(),up=new T.Vector3(0,1,0);
  let startPointer:{x:number;y:number}|null=null;
  function motionOff(){const setting=document.documentElement.dataset.motion;return setting==='off'||(setting!=='on'&&matchMedia('(prefers-reduced-motion: reduce)').matches);}
  function focus(next:TownView,instant=false) {
    view=next;
    if(next==='all'){destination.set(0,0,-1.5);targetSpan=33;}
    else {const index=FACILITIES.findIndex(f=>f.id===next),p=model?.position(index);if(p){destination.set(p[0],.8,p[1]+.8);targetSpan=next==='marine_food_plant'?16:9.5;}}
    if(instant||motionOff()){target.copy(destination);span=targetSpan;}dirty=true;
  }
  function resize(){const rect=host.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);renderer.setSize(width,height);dirty=true;}
  const observer=new ResizeObserver(resize);observer.observe(host);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;last=0;dirty=true;});intersection.observe(host);
  const settings=new MutationObserver(()=>{dirty=true;});settings.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),preferenceChange=()=>{dirty=true;};preference.addEventListener('change',preferenceChange);
  function render(now:number) {
    if(disposed||lost)return;
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    const paused=frozen||motionOff();
    if(visible&&!document.hidden&&model&&(!paused||dirty)) {
      if(!paused)elapsed+=dt;
      const ease=paused?1:1-Math.exp(-dt*5);
      target.lerp(destination,ease);span+=(targetSpan-span)*ease;
      const aspect=width/height,halfHeight=span*.5/Math.min(1,aspect);
      camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
      camera.position.copy(target).add(offset);camera.lookAt(target);
      model.tick(elapsed,dt);
      if(model.delivery&&route) {
        const cycle=(elapsed-deliveryStart)%24;
        const outbound=cycle<12,progress=outbound?smooth(Math.max(0,Math.min(1,(cycle-2)/8))):1-smooth(Math.max(0,Math.min(1,(cycle-14)/8)));
        const truck=model.delivery.truck;
        truck.position.copy(route.getPointAt(progress));
        const tangent=route.getTangentAt(Math.max(.001,Math.min(.999,progress))).multiplyScalar(outbound?1:-1);
        truckDirection.setFromAxisAngle(up,Math.atan2(tangent.x,tangent.z));truck.quaternion.slerp(truckDirection,1-Math.exp(-dt*7));
        const driving=(cycle>2&&cycle<10)||(cycle>14&&cycle<22);
        if(driving&&!paused)model.delivery.wheels.forEach(w=>{w.rotation.x+=dt*5;});
        model.delivery.cargo.visible=cycle<11;
        model.delivery.cargo.position.y=.76+(cycle>10&&cycle<11?(cycle-10)*.4:0);
        host.dataset.delivery=cycle<2?'loading':cycle<10?'outbound':cycle<14?'unloading':cycle<22?'returning':'loading';
        host.dataset.truckPosition=truck.position.toArray().map(n=>n.toFixed(3)).join(',');
      }
      glintMaterial.opacity=.27+Math.sin(elapsed*.45)*.035;
      renderer.render(scene,camera);dirty=false;
      host.dataset.ready='true';host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);
      host.dataset.time=elapsed.toFixed(3);host.dataset.view=view;
    }
    frame=requestAnimationFrame(render);
  }
  function down(event:PointerEvent){if(event.button===0)startPointer={x:event.clientX,y:event.clientY};}
  function cancel(){startPointer=null;}
  function select(event:PointerEvent){
    const start=startPointer;startPointer=null;
    if(!start||frozen||!model||Math.hypot(start.x-event.clientX,start.y-event.clientY)>8)return;
    const rect=host.getBoundingClientRect();let nearest=30,key='';
    for(const item of model.targets) {
      pointer.copy(item.point).project(camera);
      const distance=Math.hypot((pointer.x+1)*width/2-(event.clientX-rect.left),(1-pointer.y)*height/2-(event.clientY-rect.top));
      if(distance<nearest){nearest=distance;key=item.key;}
    }
    if(key)onSelect(key);
  }
  function contextLost(event:Event){event.preventDefault();lost=true;host.dataset.ready='false';cancelAnimationFrame(frame);onLost();}
  host.addEventListener('pointerdown',down);host.addEventListener('pointerup',select);host.addEventListener('pointercancel',cancel);
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  resize();frame=requestAnimationFrame(render);
  return {
    update(counts:GameState['facilityCounts'],town:Town) {
      const hadModel=!!model;
      const hadDelivery=!!model?.delivery;
      const truckRotation=model?.delivery?.truck.quaternion.clone();
      if(model){scene.remove(model.root);model.dispose();}model=buildTown(counts,town);scene.add(model.root);
      if(truckRotation&&model.delivery)model.delivery.truck.quaternion.copy(truckRotation);
      route=model.delivery?deliveryRoute(model.delivery.source,model.delivery.destination):null;
      if(!hadDelivery&&model.delivery)deliveryStart=elapsed;
      const evening=town.weather==='evening',rain=town.weather==='rain';
      scene.background=new T.Color(evening?'#9cb5b2':rain?'#9cb6b7':'#97c7c5');seaMaterial.color.set(evening?'#648a91':rain?'#6b929a':'#479fac');
      sun.color.set(evening?'#ffc18d':'#ffe0b4');sun.intensity=rain?1.2:evening?2.3:2.6;ambient.intensity=evening?1.3:rain?1.8:1.9;
      focus(view,!hadModel);dirty=true;
    },
    focus,
    pause(value:boolean){frozen=value;dirty=true;},
    react(key:string){model?.react(key);dirty=true;},
    async photo():Promise<Blob>{
      if(lost||!model)throw new Error('Town renderer unavailable');
      renderer.render(scene,camera);
      return new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('Photo export failed')),'image/png'));
    },
    dispose(){
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();settings.disconnect();preference.removeEventListener('change',preferenceChange);
      host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',select);host.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      model?.dispose();seaGeometry.dispose();seaMaterial.dispose();glintGeometry.dispose();glintMaterial.dispose();glints.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    },
  };
}
