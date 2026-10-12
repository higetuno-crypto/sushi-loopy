import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FACILITIES } from '../data/facilities';
import { townTier, type Town } from '../logic/town';
import type { GameState } from '../types';
import { buildField, PLOTS } from './townField';

const cloth = {vermillion:'#b95643',indigo:'#426575',leaf:'#758354'};
const colors = {sand:'#e5d9b7',stone:'#b2bcb0',cream:'#f2e6ce',wood:'#78523c',timber:'#b4885a',roof:'#36575c',red:'#bb5f46',blue:'#64b9c0',ink:'#2f4141',leaf:'#6f966b',gold:'#d6ac60'};

function namedPart(asset:T.Object3D,prefix:string) {
  let found:T.Object3D|undefined;asset.traverse(o=>{if(!found&&o.name.startsWith(prefix))found=o;});return found;
}

/** Geometry is authored at one scale. Static parts are merged by material after assembly. */
export function buildTown(counts: GameState['facilityCounts'], town: Town, craftsman:T.Group, level:number, conveyor:T.Group|null=null, auto:T.Group|null=null, plant:T.Group|null=null, mining:T.Group|null=null, fusion:T.Group|null=null) {
  const root=new T.Group(), materials=new Map<string,T.MeshStandardMaterial>(), geometries=new Set<T.BufferGeometry>();
  const animated: ((time:number,dt:number)=>void)[]=[];
  const targets: {key:string; point:T.Vector3}[]=[];
  const reactions=new Map<string,number>();
  let time=0;
  const material=(color:string)=>{
    if(!materials.has(color)) materials.set(color,new T.MeshStandardMaterial({color,roughness:.88,metalness:0}));
    return materials.get(color)!;
  };
  const cube=new T.BoxGeometry(1,1,1), cylinder=new T.CylinderGeometry(1,1,1,12), sphere=new T.IcosahedronGeometry(1,1), cone=new T.ConeGeometry(1,1,8);
  [cube,cylinder,sphere,cone].forEach(g=>geometries.add(g));
  function part(parent:T.Object3D,geometry:T.BufferGeometry,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number) {
    const mesh=new T.Mesh(geometry,material(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const box=(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number)=>part(p,cube,c,x,y,z,w,h,d);
  const cyl=(p:T.Object3D,c:string,x:number,y:number,z:number,r:number,h:number)=>part(p,cylinder,c,x,y,z,r,h,r);
  const ball=(p:T.Object3D,c:string,x:number,y:number,z:number,r:number)=>part(p,sphere,c,x,y,z,r,r,r);
  const group=(parent:T.Object3D,x=0,y=0,z=0,dynamic=false)=>{const g=new T.Group();g.position.set(x,y,z);g.userData.dynamic=dynamic;parent.add(g);return g;};
  const position=(index:number)=>PLOTS[town.plots[index]];
  function tree(x:number,z:number,pink=false) {
    cyl(root,colors.wood,x,.6,z,.12,1.2);
    for(const [dx,dy,dz,r] of [[0,1.6,0,.85],[-.45,1.4,.15,.65],[.5,1.6,.1,.62],[0,2.15,0,.6]]) ball(root,pink?'#d5a9a1':colors.leaf,x+dx,dy,z+dz,r);
    cyl(root,colors.stone,x,.06,z,.8,.12);
  }
  function sushi(parent:T.Object3D,x:number,y:number,z:number,kind=0) {
    const plate=group(parent,x,y,z);
    cyl(plate,kind%2?'#698a8d':'#c7765d',0,.025,0,.23,.05);
    box(plate,'#fff0cc',0,.11,0,.3,.13,.16);
    box(plate,kind%3===1?'#e9ba57':'#df8a6c',0,.19,0,.36,.08,.2);
    for(const dx of [-.1,0,.1]) box(plate,'#f4bd91',dx,.235,0,.025,.008,.19);
    return plate;
  }
  function person(parent:T.Object3D,x:number,z:number,chef=false) {
    const p=group(parent,x,.12,z,true);
    box(p,colors.ink,-.12,.13,0,.16,.26,.22);box(p,colors.ink,.12,.13,0,.16,.26,.22);
    box(p,chef?'#f3efdb':'#bb745a',0,.46,0,.4,.48,.27);
    box(p,'#eed1a2',0,.88,0,.39,.4,.34);
    box(p,chef?'#fcf4da':'#453d35',0,1.09,0,.43,.12,.38);
    if(chef) {box(p,'#fcf4da',0,1.22,0,.34,.2,.3);box(p,colors.red,0,.63,.146,.4,.055,.015);}
    for(const dx of [-.09,.09]) box(p,colors.ink,dx,.91,.175,.035,.045,.01);
    const arm=group(p,.28,.63,0,true);box(arm,chef?'#f3efdb':'#bb745a',0,-.14,0,.14,.28,.16);ball(arm,'#eed1a2',0,-.3,0,.09);
    const other=group(p,-.28,.63,0,true);box(other,'#f3efdb',0,-.14,0,.14,.28,.16);ball(other,'#eed1a2',0,-.3,0,.09);
    if(chef) animated.push(t=>{
      const beat=t*1.26, press=Math.pow(Math.max(0,Math.sin(beat*Math.PI)),3);
      const greeting=t-(reactions.get('chef')??-99);
      arm.rotation.x=greeting<1.6?-2.5+Math.sin(greeting*9)*.22:-2+press*.2;
      other.rotation.x=-2+press*.2;
      p.rotation.y=greeting<1.6?-.15:.05*Math.sin(beat*Math.PI*.5);
    });
    return {p,arm,other};
  }
  function lantern(parent:T.Object3D,x:number,y:number,z:number) {
    cyl(parent,'#f0c77c',x,y,z,.17,.38);cyl(parent,colors.wood,x,y+.23,z,.14,.08);cyl(parent,colors.wood,x,y-.23,z,.14,.08);
    for(const offset of [-.1,0,.1]) cyl(parent,'#d9a76c',x,y+offset,z,.175,.018);
  }
  function nameSign(parent:T.Object3D,label:string,x:number,y:number,z:number,width:number,height:number) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#efe3c6';ctx.fillRect(0,0,512,128);ctx.fillStyle='#405044';ctx.font='600 46px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,67,480);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const sign=new T.Mesh(new T.BoxGeometry(width,height,.06),new T.MeshStandardMaterial({map:texture,roughness:1}));
    sign.position.set(x,y,z);parent.add(sign);geometries.add(sign.geometry);
  }
  function cloneBuilding(source:T.Group) {
    const asset=source.clone(true),palette=new Map<T.Material,T.Material>();
    asset.traverse(obj=>{
      if(!(obj instanceof T.Mesh))return;
      // Each town owns its resources; replacing a level must not dispose the loader's cache.
      obj.geometry=obj.geometry.clone();
      const cloneMaterial=(source:T.Material)=>{
        if(!palette.has(source)){
          const copy=source.clone();
          if((source.name==='Craftsman_Noren'||source.name.startsWith('Conveyor_Noren'))&&copy instanceof T.MeshStandardMaterial&&town.color!=='vermillion')copy.color.set(cloth[town.color]);
          palette.set(source,copy);
        }
        return palette.get(source)!;
      };
      obj.material=Array.isArray(obj.material)?obj.material.map(cloneMaterial):cloneMaterial(obj.material);
      obj.castShadow=true;obj.receiveShadow=true;
    });
    return asset;
  }
  function craftsmanShop(parent:T.Object3D) {
    // Keep the original counter fixed; Lv.3 grows right and Lv.4 grows behind it.
    const scale=.78,mainX=level>=3?-.85:0,mainZ=level===4?.725:0;
    const building=group(parent,level<3?-.85*scale:0,.03,.96-mainZ*scale,true);
    building.scale.setScalar(scale);building.add(cloneBuilding(craftsman));
    nameSign(building,town.name,mainX,2.31,mainZ+1.32,1.9,.18);
    if(counts.craftsman>0) {
      const chef=person(building,mainX-.5,mainZ+.40,true);chef.p.scale.setScalar(1.3);chef.p.position.y=.24;chef.arm.position.y=.70;chef.other.position.y=.70;
      targets.push({key:'chef',point:new T.Vector3(position(0)[0]+(mainX-.5)*scale+building.position.x,1.1,position(0)[1]+(mainZ+.40)*scale+building.position.z)});
      const plate=sushi(building,mainX+.55,1.13,mainZ+1.03);
      animated.push(t=>{const phase=(t*1.26)%3;plate.visible=phase>1.15;plate.position.z=mainZ+(phase<2?.78+(phase-1.15)*.3:1.03);});
    }
  }
  function plateBatches(prototype:T.Object3D,parent:T.Object3D,count:number,name:string) {
    prototype.visible=false;
    const plates:T.InstancedMesh[]=[];
    prototype.traverse(o=>{
      if(!(o instanceof T.Mesh))return;
      const batch=new T.InstancedMesh(o.geometry,o.material,count);batch.name=name;batch.castShadow=true;batch.receiveShadow=true;
      batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;parent.add(batch);plates.push(batch);
    });
    return plates;
  }
  function animateHoist(hoist:T.Object3D,cable:T.Object3D,amplitude:number,period:number) {
    const rest=hoist.position.y,anchor=cable.userData.anchor_z,sling=hoist.userData.sling_height;
    if(!Number.isFinite(anchor)||!Number.isFinite(sling)||anchor<=rest+amplitude+sling)throw new Error('Invalid hoist cable dimensions');
    animated.push(t=>{
      hoist.position.y=rest+Math.sin(t*Math.PI*2/period)*amplitude;
      // Keep both ends attached while the winch winds the rope in and out.
      const bottom=hoist.position.y+sling;cable.scale.y=anchor-bottom;cable.position.y=(anchor+bottom)/2;
    });
  }
  function conveyorShop(parent:T.Object3D) {
    if(!conveyor)throw new Error('Conveyor model must load before assembly');
    const tier=townTier(counts.conveyor_sushi),building=group(parent,0,.03,.65,true),asset=cloneBuilding(conveyor);
    building.scale.setScalar(.82);building.add(asset);
    const prototype=asset.children.find(o=>o.name.startsWith('Conveyor_Plate'));
    if(!prototype)throw new Error('Conveyor plate prototype missing');
    // One draw per plate material, regardless of how many dishes circle the counter.
    const count=5+tier,plates=plateBatches(prototype,building,count,'Conveyor_Dishes'),matrix=new T.Matrix4();
    const lane=new T.EllipseCurve(0,.93,1.66,.63,0,Math.PI*2,false,0),point=new T.Vector2(),tangent=new T.Vector2();
    const crown=asset.getObjectByName('Crown_Carousel');
    animated.push(t=>{
      for(let i=0;i<count;i++) {
        const progress=(t/20+i/count)%1;
        lane.getPointAt(progress,point);lane.getTangentAt(progress,tangent);
        matrix.makeRotationY(-Math.atan2(tangent.y,tangent.x));matrix.setPosition(point.x,1.162,point.y);
        for(const batch of plates)batch.setMatrixAt(i,matrix);
      }
      for(const batch of plates)batch.instanceMatrix.needsUpdate=true;
      if(crown)crown.rotation.y=-t*.18;
    });
    const chef=person(building,-.6,-.30,true);chef.p.position.y=.20;chef.p.scale.setScalar(1.2);
    targets.push({key:'chef',point:new T.Vector3(position(1)[0]-.6*.82,1.1,position(1)[1]+.65-.30*.82)});
    const seats=tier<3?[-1.12,0,1.12]:[-1.26,-.42,.42,1.26];
    for(const x of seats.slice(0,Math.min(tier,3))) {
      const guest=person(building,x,2.23);guest.p.position.y=.42;guest.p.scale.setScalar(.85);guest.p.rotation.y=Math.PI;
    }
  }
  function autoFactory(parent:T.Object3D) {
    if(!auto)throw new Error('Auto sushi model must load before assembly');
    const tier=townTier(counts.auto_sushi_machine),building=group(parent,0,.03,.48,true),asset=cloneBuilding(auto);
    building.scale.setScalar(.80);building.add(asset);
    const find=(prefix:string)=>namedPart(asset,prefix);
    const prototype=find('Auto_Plate');if(!prototype)throw new Error('Auto sushi plate prototype missing');
    const count=3+tier,plates=plateBatches(prototype,building,count,'Auto_Dishes'),matrix=new T.Matrix4(),lane=new T.Path();
    lane.moveTo(-.98,.56);lane.lineTo(.98,.56);lane.absarc(.98,.95,.39,-Math.PI/2,Math.PI/2,false);
    lane.lineTo(-.98,1.34);lane.absarc(-.98,.95,.39,Math.PI/2,Math.PI*1.5,false);
    const point=new T.Vector2(),tangent=new T.Vector2();
    animated.push(t=>{
      for(let i=0;i<count;i++) {
        const progress=(t/14+i/count)%1;lane.getPointAt(progress,point);lane.getTangentAt(progress,tangent);
        matrix.makeRotationY(-Math.atan2(tangent.y,tangent.x));matrix.setPosition(point.x,1.145,point.y);
        for(const batch of plates)batch.setMatrixAt(i,matrix);
      }
      for(const batch of plates)batch.instanceMatrix.needsUpdate=true;
    });
    for(const [side,sign] of [['L',-1],['R',1]] as const) {
      const shoulder=find(`Robot_${side}_Shoulder`),elbow=find(`Robot_${side}_Elbow`),wrist=find(`Robot_${side}_Wrist`);
      if(!shoulder||!elbow||!wrist)continue;
      const rest=[shoulder.rotation.z,elbow.rotation.z,wrist.rotation.z];
      animated.push(t=>{
        const phase=t*1.4+(sign===1?Math.PI:0),reach=sign*Math.sin(phase)*.09,press=sign*Math.sin(phase+.7)*.14;
        shoulder.rotation.z=rest[0]+reach;elbow.rotation.z=rest[1]+press;
        // The wrist compensates both hinges, keeping the gripper vertical and attached.
        wrist.rotation.z=rest[2]-reach-press;
      });
    }
    for(const name of ['Crown_Gear','Fan_Left','Fan_Right']) {
      const rotor=asset.getObjectByName(name);if(!rotor)continue;
      const rest=rotor.quaternion.clone(),turn=new T.Quaternion(),axis=new T.Vector3(0,1,0);
      animated.push(t=>rotor.quaternion.copy(rest).multiply(turn.setFromAxisAngle(axis,t*(name==='Crown_Gear'?.16:.7))));
    }
  }
  function marinePlant(parent:T.Object3D) {
    if(!plant)throw new Error('Marine plant model must load before assembly');
    const building=group(parent,0,.03,.60,true),asset=cloneBuilding(plant);
    building.scale.setScalar(.80);building.add(asset);
    const find=(prefix:string)=>namedPart(asset,prefix);
    const hoist=find('Plant_Hoist'),cable=find('Plant_Cable'),valve=find('Plant_Valve'),beacon=find('Plant_Beacon');
    if(!hoist||!cable||!valve)throw new Error('Marine plant rig missing');
    animateHoist(hoist,cable,.30,12);
    const valveRest=valve.quaternion.clone(),beaconRest=beacon?.quaternion.clone(),turn=new T.Quaternion(),axis=new T.Vector3(0,1,0);
    animated.push(t=>{
      valve.quaternion.copy(valveRest).multiply(turn.setFromAxisAngle(axis,Math.sin(t*.4)*.32));
      if(beacon&&beaconRest)beacon.quaternion.copy(beaconRest).multiply(turn.setFromAxisAngle(axis,t*.7));
    });
  }
  function factory(parent:T.Object3D,index:number) {
    box(parent,colors.cream,0,.8,-.25,3.6,1.5,2.4);box(parent,colors.roof,0,1.6,-.25,3.9,.18,2.7);
    for(const x of [-1.2,0,1.2]) {box(parent,colors.roof,x,.9,1.0,.74,.73,.08);box(parent,'#8fc5c1',x,.94,1.05,.57,.49,.02);}
    box(parent,colors.red,-1.35,1.55,1.2,.55,.24,.07);
    if(index===7) {
      for(const x of [-.95,.95]) {
        cyl(parent,colors.roof,x,2,-.15,.72,.18);cyl(parent,index===7?'#acd6d5':'#68b7bf',x,2.6,-.15,.62,1.2);
        for(const y of [2.12,3.12]) cyl(parent,'#e1ded0',x,y,-.15,.68,.09);
        cyl(parent,colors.blue,x,3.18,-.15,.59,.025);
        const float=group(parent,x,3.2,-.15,true);box(float,'#eae5cd',0,0,.15,.15,.06,.19);
        animated.push(t=>{float.position.y=3.2+Math.sin(t*.9+x)*.025;float.rotation.y=t*.14;});
        box(parent,colors.gold,x,2.2,.56,.13,.43,.13);
      }
      box(parent,colors.roof,0,2.15,-1.3,2.1,.18,.15);
    }
  }
  function oceanMining(parent:T.Object3D) {
    if(!mining)throw new Error('Ocean mining model must load before assembly');
    const building=group(parent,0,.03,.55,true),asset=cloneBuilding(mining);
    building.scale.setScalar(.80);building.add(asset);
    const hoist=namedPart(asset,'Mining_Hoist'),cable=namedPart(asset,'Mining_Cable'),drill=namedPart(asset,'Mining_Drill'),crown=namedPart(asset,'Mining_Crown');
    if(!hoist||!cable||!drill)throw new Error('Ocean mining rig missing');
    animateHoist(hoist,cable,.22,10);
    animated.push(t=>{drill.rotation.y=t*.70;if(crown)crown.rotation.y=-t*.24;});
  }
  function fusionPlant(parent:T.Object3D) {
    if(!fusion)throw new Error('Fusion model must load before assembly');
    const building=group(parent,0,.03,.50,true),asset=cloneBuilding(fusion);
    building.scale.setScalar(.80);building.add(asset);
    const rotor=namedPart(asset,'Fusion_Rotor'),halo=namedPart(asset,'Fusion_Halo'),core=new Set<T.MeshStandardMaterial>();
    asset.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial&&o.material.name.includes('_Core'))core.add(o.material);});
    if(!rotor||!core.size)throw new Error('Fusion reactor rig missing');
    animated.push(t=>{
      rotor.rotation.z=.18+t*.26;if(halo)halo.rotation.z=-t*.11;
      core.forEach(m=>{m.emissiveIntensity=.37+Math.sin(t*.9)*.09;});
    });
  }
  function energy(parent:T.Object3D,index:number) {
    cyl(parent,colors.stone,0,.2,0,2,.4);cyl(parent,colors.roof,0,.52,0,1.65,.25);
    if(index===6) {
      const rocket=group(parent,0,.65,0,true);
      cyl(rocket,'#eee8d5',0,1.3,0,.42,2.6);part(rocket,cone,colors.red,0,2.9,0,.43,.65,.43);
      cyl(rocket,colors.red,0,.6,0,.43,.4);for(const x of [-.5,.5]) box(rocket,colors.red,x,.35,0,.2,.7,.35);
      ball(rocket,colors.blue,0,1.9,.4,.18);
      const exhaust=part(rocket,cone,colors.gold,0,-.5,0,.3,1,.3);exhaust.rotation.z=Math.PI;
      animated.push(t=>{const p=t%24;rocket.position.y=.65+(p>18?Math.pow(Math.min(p-18,4),2):0);rocket.visible=p<22;exhaust.visible=p>17&&p<22;});
      box(parent,colors.ink,-1,2,-.8,.18,4,.18);box(parent,colors.ink,-.55,3.65,-.8,1,.18,.18);
    } else {
      cyl(parent,colors.cream,0,1.25,0,1.05,1.25);ball(parent,'#99bdbc',0,2.15,0,.83);
      const ring=group(parent,0,2.15,0,true);
      const geometry=new T.TorusGeometry(1.22,.07,6,40);geometries.add(geometry);const mesh=new T.Mesh(geometry,material(colors.gold));ring.add(mesh);
      ring.rotation.x=.8;animated.push(t=>{ring.rotation.y=t*.2;});
      for(const x of [-1.5,1.5]) {cyl(parent,colors.roof,x,1,0,.25,1.4);ball(parent,colors.gold,x,1.85,0,.2);}
    }
  }

  buildField({root,box,cyl,ball,tree,material,geometries});
  if(counts.sushi_ocean_mining>0) {
    const boat=group(root,-13.2,-.85,-5.15,true);box(boat,colors.red,0,0,0,1.7,.5,3);box(boat,colors.cream,0,.26,0,1.7,.2,3);box(boat,colors.roof,0,.45,.2,1.5,.15,2.6);box(boat,colors.cream,0,.9,-.4,1,1,1);box(boat,colors.blue,0,1,-.93,.75,.4,.03);cyl(boat,colors.wood,.3,1.8,-.35,.045,2.5);
    const flag=group(boat,.3,2.8,-.35,true);box(flag,colors.red,.3,0,0,.6,.3,.04);
    animated.push(t=>{const p=t-(reactions.get('boat')??-99);flag.rotation.y=Math.sin(t*1.2)*.08+(p<2?Math.sin(p*8)*.7:0);});
    animated.push(t=>{boat.position.y=-.85+Math.sin(t*.85)*.045;boat.rotation.z=Math.sin(t*.7)*.015;});
    targets.push({key:'boat',point:boat.position.clone()});
  }
  const builders=[craftsmanShop,conveyorShop,autoFactory,marinePlant,oceanMining,fusionPlant,energy,factory,energy];
  FACILITIES.forEach((f,index)=>{
    const [x,z]=position(index), owned=counts[f.id];
    if(owned===0 && index!==0) {tree(x,z);return;}
    const building=group(root,x,0,z);
    if(index>5)box(building,colors.stone,0,.05,0,4.8,.1,3.8);
    builders[index](building,index);
    targets.push({key:f.id,point:new T.Vector3(x,1,z)});
    if(index>5)for(let n=1;n<townTier(owned);n++) {box(building,colors.timber,2.12,.25,-1.5+n*.6,.4,.5,.4);lantern(building,-2.2,.85,-1.5+n*.65);}
  });
  const [shopX,shopZ]=position(0);
  if(town.bench) {
    box(root,colors.timber,shopX-2.9,.42,shopZ+1.1,.55,.13,1.6);box(root,colors.wood,shopX-3.15,.74,shopZ+1.1,.1,.55,1.6);
    for(const z of [-.5,.5])box(root,colors.wood,shopX-2.9,.2,shopZ+1.1+z,.4,.4,.12);
  }
  const cat=group(root,shopX-2.85,town.bench?.52:.1,shopZ+1.15,true);
  box(cat,'#d8a46b',0,.13,0,.32,.28,.52);ball(cat,'#ebc18b',0,.35,.23,.2);
  for(const x of [-.12,.12])part(cat,cone,'#b48558',x,.56,.24,.1,.18,.1);
  const tail=box(cat,'#b48558',0,.28,-.32,.08,.45,.08);tail.rotation.x=-.8;
  animated.push(t=>{const p=t-(reactions.get('cat')??-99);cat.rotation.y=p<1.8?Math.sin(p*Math.PI/1.8)*.4:0;tail.rotation.z=p<1.8?Math.sin(p*5)*.6:.15;});
  targets.push({key:'cat',point:new T.Vector3(shopX-2.85,1,shopZ+1.15)});

  let delivery: {truck:T.Group;cargo:T.Group;wheels:T.Mesh[];source:number;destination:number}|null=null;
  if(counts.marine_food_plant>0) {
    const truck=group(root,0,0,0,true), wheels:T.Mesh[]=[];
    box(truck,colors.ink,0,.35,0,1.25,.17,2.1);
    box(truck,cloth[town.truckColor],0,.8,.64,1.15,.8,.84);
    box(truck,'#a7d6d3',0,1,.107,1.02,.38,.03);box(truck,'#a7d6d3',0,1,1.07,.92,.35,.03);
    for(const x of [-.58,.58])box(truck,'#a7d6d3',x,1,.67,.03,.36,.59);
    box(truck,colors.cream,0,.52,-.48,1.17,.13,1.26);
    for(const x of [-.56,.56])box(truck,cloth[town.truckColor],x,.71,-.48,.07,.3,1.25);
    for(const x of [-.39,.39])box(truck,'#f7e3a6',x,.61,1.081,.18,.13,.04);
    const driver=group(truck,.52,1,.62,true);box(driver,'#eed1a2',0,0,0,.16,.18,.17);
    const wave=group(driver,.1,-.12,0,true);box(wave,'#eed1a2',.1,0,0,.2,.09,.09);
    animated.push(t=>{const p=t-(reactions.get('truck')??-99);wave.rotation.z=p<2?.7+Math.sin(p*10)*.45:0;});
    for(const x of [-.63,.63])for(const z of [-.67,.7]) {const wheel=cyl(truck,colors.ink,x,.27,z,.26,.16);wheel.rotation.z=Math.PI/2;wheels.push(wheel);const hub=cyl(truck,colors.cream,x*1.12,.27,z,.11,.03);hub.rotation.z=Math.PI/2;}
    const cargo=group(truck,0,.76,-.48,true);for(const x of [-.25,.25]){box(cargo,colors.timber,x,0,0,.43,.37,.64);for(const z of [-.2,.2])box(cargo,colors.gold,x,.02,z,.45,.055,.07);}
    delivery={truck,cargo,wheels,source:town.plots[3],destination:town.plots[0]};
    targets.push({key:'truck',point:truck.position});
  }

  root.updateMatrixWorld(true);
  const buckets=new Map<T.Material,T.BufferGeometry[]>(), remove:T.Mesh[]=[];
  root.traverse(object=>{
    if(!(object instanceof T.Mesh)||Array.isArray(object.material))return;
    let ancestor:T.Object3D|null=object;while(ancestor){if(ancestor.userData.dynamic)return;ancestor=ancestor.parent;}
    const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
    const bucket=buckets.get(object.material)??[];bucket.push(geometry);buckets.set(object.material,bucket);remove.push(object);
  });
  for(const mesh of remove)mesh.removeFromParent();
  for(const [mat,parts] of buckets) {
    // Polyhedra and extruded shores are non-indexed; a material can also contain indexed boxes.
    if(parts.some(g=>!g.index)&&parts.some(g=>g.index)) {
      parts.forEach((geometry,index)=>{if(geometry.index){parts[index]=geometry.toNonIndexed();geometry.dispose();}});
    }
    const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    if(merged){geometries.add(merged);const mesh=new T.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  }
  return {root,targets,delivery,position,
    tick(t:number,dt:number){time=t;animated.forEach(update=>update(t,dt));},
    react(key:string){reactions.set(key,time);},
    dispose(){
      const textures=new Set<T.Texture>(),mats=new Set<T.Material>();
      root.traverse(obj=>{if(obj instanceof T.Mesh){if(obj instanceof T.InstancedMesh)obj.dispose();geometries.add(obj.geometry);const list=Array.isArray(obj.material)?obj.material:[obj.material];list.forEach(m=>{mats.add(m);if(m instanceof T.MeshStandardMaterial&&m.map)textures.add(m.map);});}});
      geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    },
  };
}
