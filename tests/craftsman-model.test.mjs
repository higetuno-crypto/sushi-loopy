import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Mesh, InstancedMesh, Matrix4, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createServer } from 'vite';
const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {buildTown}=await vite.ssrLoadModule('/src/game/rendering/townModels.ts');
const {createTown,townTier}=await vite.ssrLoadModule('/src/game/logic/town.ts');
const {FACILITIES}=await vite.ssrLoadModule('/src/game/data/facilities.ts');
const {PLOTS}=await vite.ssrLoadModule('/src/game/rendering/townField.ts');
// Geometry checks need no real rasterizer; browser checks cover the actual painted signs.
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
after(()=>{delete globalThis.document;});

test('luna levels launch above the tower, coast, reignite and land continuously on every plot',async()=>{
  const load=async path=>{const b=await readFile(path);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
  const craftsman=await load('public/assets/models/01-craftsman/craftsman-lv1.glb');
  for(const [level,count,tris] of [[1,1,4420],[2,5,5312],[3,10,6856],[4,25,8780]]) {
    const luna=await load(`public/assets/models/07-luna-sea/luna-lv${level}.glb`),source=[];
    luna.traverse(o=>{if(o instanceof Mesh)source.push(o);});
    assert.equal(source.reduce((n,o)=>n+o.geometry.index.count/3,0),tris);
    assert.ok(source.every(o=>!o.material.transparent&&!o.material.map));
    let disposed=false;for(const o of source)for(const r of [o.geometry,o.material])r.addEventListener('dispose',()=>{disposed=true;});
    const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,f.id==='luna_sea'?count:f.id==='craftsman'?1:0]));
    for(let slot=0;slot<9;slot++) {
      const town=createTown();[town.plots[6],town.plots[slot]]=[slot,6];
      const model=buildTown(counts,town,craftsman,1,null,null,null,null,null,luna);
      const imported=model.root.getObjectByName(`Luna_L${level}`);assert.ok(imported,'the authored lunar base replaces the generic rocket');
      const asset=imported.parent,[x,z]=PLOTS[slot],find=name=>{let found;asset.traverse(o=>{if(!found&&o.name.startsWith(name))found=o;});return found;};
      const rocket=find('Luna_Rocket'),exhaust=find('Luna_Exhaust'),dish=find('Luna_Dish');assert.ok(rocket&&exhaust&&dish);
      model.tick(0,0);const rest=rocket.position.y,azimuth=dish.quaternion.clone();assert.equal(exhaust.visible,false);
      assert.equal(exhaust.parent,rocket,'the flame belongs to the rocket');
      let previous=rest;
      for(let t=0;t<=64;t+=.125) {
        model.tick(t,.125);const b=new Box3().setFromObject(asset);
        assert.ok(b.min.x>=x-2.4&&b.max.x<=x+2.4&&b.min.z>=z-1.8&&b.max.z<=z+3.25,'the flight stays inside its plot');
        assert.ok(Math.abs(b.min.y-.03)<.001,'foundation remains grounded');
        assert.equal(rocket.visible,true);assert.ok(rocket.position.y>=rest&&rocket.position.y<=rest+9.001);
        assert.ok(Math.abs(rocket.position.y-previous)<.27,'the ascent and return never teleport');previous=rocket.position.y;
        if(exhaust.visible)assert.ok(rocket.position.y+exhaust.position.y-exhaust.scale.y>=rocket.userData.pad_top+.039,'plume never penetrates the launch pad');
      }
      assert.equal(rocket.position.y,rest);
      model.tick(11.5,0);assert.ok(rocket.position.y-rest>5&&exhaust.visible,'the vehicle actually leaves the tower');
      model.tick(14,0);assert.ok(rocket.position.y-rest>8.9&&!exhaust.visible,'engine cuts off during the high coast');
      model.tick(18,0);assert.ok(rocket.position.y-rest>3&&rocket.position.y-rest<4&&exhaust.visible,'engine relights on the return');
      model.tick(23.5,0);assert.ok(rocket.position.y-rest<.03&&exhaust.visible,'landing burn slows the last approach');
      model.tick(24,0);assert.equal(rocket.position.y,rest);assert.equal(exhaust.visible,false);
      assert.ok(dish.quaternion.angleTo(azimuth)>.1);
      for(const boundary of [6,7,12,16,20,24,32]) {
        model.tick(boundary-.001,0);const before=rocket.position.y;model.tick(boundary,0);const center=rocket.position.y;model.tick(boundary+.001,0);const after=rocket.position.y;
        assert.ok(Math.abs(after-before)<.005,'flight segments are position-continuous');
        assert.ok(Math.abs((center-before)-(after-center))<.00001,'flight segments are velocity-continuous');
      }
      model.tick(105,0,14);assert.ok(rocket.position.y-rest>8.9,'a new purchase uses its own uninterrupted flight clock');
      assert.ok(model.targets.some(t=>t.key==='luna_sea'));model.dispose();assert.equal(disposed,false);
    }
    for(const o of source){o.geometry.dispose();o.material.dispose();}
  }
  craftsman.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('fusion levels keep sushi inside the chamber and the sun ring clear on every plot',async()=>{
  const load=async path=>{const b=await readFile(path);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
  const craftsman=await load('public/assets/models/01-craftsman/craftsman-lv1.glb');
  for(const [level,count,tris] of [[1,1,4068],[2,5,5400],[3,10,6984],[4,25,8240]]) {
    const fusion=await load(`public/assets/models/06-fusion-sushi-converter/fusion-lv${level}.glb`),source=[];
    fusion.traverse(o=>{if(o instanceof Mesh)source.push(o);});
    assert.equal(source.reduce((n,o)=>n+o.geometry.index.count/3,0),tris);
    assert.ok(source.every(o=>!o.material.transparent&&!o.material.map),'opaque texture-free materials avoid glass sorting and texture downloads');
    let disposed=false;for(const o of source)for(const r of [o.geometry,o.material])r.addEventListener('dispose',()=>{disposed=true;});
    const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,f.id==='fusion_sushi_converter'?count:f.id==='craftsman'?1:0]));
    for(let slot=0;slot<9;slot++) {
      const town=createTown();[town.plots[5],town.plots[slot]]=[slot,5];
      const model=buildTown(counts,town,craftsman,1,null,null,null,null,fusion);
      const imported=model.root.getObjectByName(`Fusion_L${level}`);assert.ok(imported,'the authored fusion reactor replaces the generic energy model');
      const asset=imported.parent,[x,z]=PLOTS[slot],find=name=>{let found;asset.traverse(o=>{if(!found&&o.name.startsWith(name))found=o;});return found;};
      const rotor=find('Fusion_Rotor'),halo=find('Fusion_Halo');assert.ok(rotor);assert.equal(!!halo,level===4);
      const core=[];asset.traverse(o=>{if(o instanceof Mesh&&o.material.name.includes('_Core'))core.push(o.material);});assert.ok(core.length);
      const position=rotor.position.clone();model.tick(0,0);const start=rotor.quaternion.clone(),light=core[0].emissiveIntensity,haloStart=halo?.quaternion.clone();
      for(let t=0;t<=60;t+=.5) {
        model.tick(t,.5);const b=new Box3().setFromObject(asset);
        assert.ok(b.min.x>=x-2.4&&b.max.x<=x+2.4&&b.min.z>=z-1.8&&b.max.z<=z+3.25,'moving parts stay inside the plot');
        assert.ok(Math.abs(b.min.y-.03)<.001,'foundation rests on the plot');
        assert.ok(rotor.position.equals(position),'the bearing remains attached');
        assert.ok(core.every(m=>m.emissiveIntensity>=.28&&m.emissiveIntensity<=.46));
      }
      model.tick(2,0);assert.ok(rotor.quaternion.angleTo(start)>.1);assert.notEqual(core[0].emissiveIntensity,light);
      if(halo)assert.ok(halo.quaternion.angleTo(haloStart)>.1);
      rotor.traverse(o=>{if(o instanceof Mesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getY(i))<rotor.userData.chamber_radius,'sushi clears the chamber throughout rotation');}});
      if(halo)halo.traverse(o=>{if(o instanceof Mesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getY(i))>=halo.userData.inner_radius-.001,'the rotating sun ring has an open centre');}});
      assert.ok(model.targets.some(t=>t.key==='fusion_sushi_converter'));model.dispose();assert.equal(disposed,false);
    }
    for(const o of source){o.geometry.dispose();o.material.dispose();}
  }
  craftsman.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('ocean mining levels keep the drill, ore hoist, crown and fishing boat intact across all plots',async()=>{
  const load=async path=>{const b=await readFile(path);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
  const craftsman=await load('public/assets/models/01-craftsman/craftsman-lv1.glb');
  for(const [level,count,tris] of [[1,1,4636],[2,5,5124],[3,10,6876],[4,25,7884]]) {
    const mining=await load(`public/assets/models/05-sushi-ocean-mining/ocean-mining-lv${level}.glb`),source=[];
    mining.traverse(o=>{if(o instanceof Mesh)source.push(o);});
    assert.equal(source.reduce((n,o)=>n+o.geometry.index.count/3,0),tris);
    let disposed=false;for(const o of source)for(const r of [o.geometry,o.material])r.addEventListener('dispose',()=>{disposed=true;});
    const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,f.id==='sushi_ocean_mining'?count:f.id==='craftsman'?1:0]));
    for(let slot=0;slot<9;slot++) {
      const town=createTown();[town.plots[4],town.plots[slot]]=[slot,4];
      const model=buildTown(counts,town,craftsman,1,null,null,null,mining);
      const imported=model.root.getObjectByName(`Mining_L${level}`);assert.ok(imported,'the GLB replaces the old mining crane');
      const asset=imported.parent,[x,z]=PLOTS[slot],bounds=new Box3().setFromObject(asset);
      assert.ok(bounds.min.x>=x-2.4&&bounds.max.x<=x+2.4&&bounds.min.z>=z-1.8&&bounds.max.z<=z+3.25);
      assert.ok(Math.abs(bounds.min.y-.03)<.001,'all four pylons rest on the plot');
      const find=name=>{let found;asset.traverse(o=>{if(!found&&o.name.startsWith(name))found=o;});return found;};
      const hoist=find('Mining_Hoist'),cable=find('Mining_Cable'),drill=find('Mining_Drill'),crown=find('Mining_Crown');
      assert.ok(hoist&&cable&&drill);assert.equal(!!crown,level===4);
      model.tick(0,0);const first=hoist.position.y,rotation=drill.quaternion.clone(),ore=crown?.quaternion.clone();
      for(let t=0;t<=10;t+=.25) {
        model.tick(t,.25);model.root.updateMatrixWorld(true);
        assert.ok(Math.abs(cable.position.y+cable.scale.y/2-cable.userData.anchor_z)<1e-5);
        assert.ok(Math.abs(cable.position.y-cable.scale.y/2-hoist.position.y-hoist.userData.sling_height)<1e-5);
        assert.ok(cable.scale.y>.1&&hoist.position.y>1.39,'cargo stays above the deck and rope stays taut');
        assert.equal(cable.position.x,hoist.position.x);assert.equal(cable.position.z,hoist.position.z);
        const swept=new Box3().setFromObject(asset);assert.ok(swept.min.x>=x-2.4&&swept.max.x<=x+2.4&&swept.min.z>=z-1.8&&swept.max.z<=z+3.25);
      }
      assert.ok(Math.abs(hoist.position.y-first)<1e-8);model.tick(2.5,0);
      assert.ok(hoist.position.y-first>.15&&drill.quaternion.angleTo(rotation)>.1);
      if(crown)assert.ok(crown.quaternion.angleTo(ore)>.1);
      // Measure the actual authored vertices against the deck bore and crown's inner radius.
      for(const [object,radius] of [[drill,.27],...(crown?[[crown,.58]]:[])])object.traverse(o=>{
        if(!(o instanceof Mesh))return;
        const p=o.geometry.attributes.position;
        for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getZ(i))<radius,'rotating part clears its surrounding collar');
      });
      assert.ok(model.targets.some(t=>t.key==='boat'),'buying mining still unlocks the fishing boat');
      model.react('boat');model.tick(2.8,.3);model.dispose();assert.equal(disposed,false);
    }
    for(const o of source){o.geometry.dispose();o.material.dispose();}
  }
  craftsman.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('marine plant levels fit every plot, keep the hoist attached and preserve delivery routing',async()=>{
  const load=async path=>{const b=await readFile(path);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
  const craftsman=await load('public/assets/models/01-craftsman/craftsman-lv1.glb');
  for(const [level,count,tris] of [[1,1,2644],[2,5,3588],[3,10,5144],[4,25,6392]]) {
    const plant=await load(`public/assets/models/04-marine-food-plant/marine-plant-lv${level}.glb`),source=[];
    plant.traverse(o=>{if(o instanceof Mesh)source.push(o);});
    assert.equal(source.reduce((n,o)=>n+o.geometry.index.count/3,0),tris);
    let disposed=false;for(const o of source)for(const resource of [o.geometry,o.material])resource.addEventListener('dispose',()=>{disposed=true;});
    const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,f.id==='marine_food_plant'?count:f.id==='craftsman'?1:0]));
    for(let slot=0;slot<9;slot++) {
      const town=createTown();[town.plots[3],town.plots[slot]]=[slot,3];
      const model=buildTown(counts,town,craftsman,1,null,null,plant);
      const imported=model.root.getObjectByName(`Plant_L${level}`);assert.ok(imported,'the authored marine plant replaces the placeholder');
      const asset=imported.parent,[x,z]=PLOTS[slot],bounds=new Box3().setFromObject(asset);
      assert.ok(bounds.min.x>=x-2.4&&bounds.max.x<=x+2.4);assert.ok(bounds.min.z>=z-1.8&&bounds.max.z<=z+3.25);
      assert.ok(Math.abs(bounds.min.y-.03)<.001,'foundation is on the plot');
      const find=name=>{let found;asset.traverse(o=>{if(!found&&o.name.startsWith(name))found=o;});return found;};
      const hoist=find('Plant_Hoist'),cable=find('Plant_Cable'),valve=find('Plant_Valve'),beacon=find('Plant_Beacon');
      assert.ok(hoist&&cable&&valve);assert.equal(!!beacon,level===4);
      model.tick(0,0);const first=hoist.position.y,rotation=valve.quaternion.clone(),light=beacon?.quaternion.clone();
      for(let t=0;t<=12;t+=.25) {
        model.tick(t,.25);model.root.updateMatrixWorld(true);
        assert.ok(Math.abs(cable.position.y+cable.scale.y/2-cable.userData.anchor_z)<1e-5,'rope remains fixed to the boom');
        assert.ok(Math.abs(cable.position.y-cable.scale.y/2-hoist.position.y-hoist.userData.sling_height)<1e-5,'rope remains attached to the load');
        assert.ok(cable.scale.y>.1);assert.ok(hoist.position.y>.5,'cargo clears the dock and waiting crates');
        assert.equal(cable.position.x,hoist.position.x);assert.equal(cable.position.z,hoist.position.z);
        const swept=new Box3().setFromObject(asset);assert.ok(swept.min.x>=x-2.4&&swept.max.x<=x+2.4&&swept.min.z>=z-1.8&&swept.max.z<=z+3.25);
      }
      assert.ok(Math.abs(hoist.position.y-first)<1e-8,'hoist cycle closes without a jump');
      model.tick(3,0);assert.ok(Math.abs(hoist.position.y-first)>.1);assert.ok(valve.quaternion.angleTo(rotation)>.01);
      if(beacon)assert.ok(beacon.quaternion.angleTo(light)>.01);
      assert.equal(model.delivery.source,town.plots[3]);assert.equal(model.delivery.destination,town.plots[0]);
      model.dispose();assert.equal(disposed,false,'rebuilding cannot dispose the cached GLB');
    }
    for(const o of source){o.geometry.dispose();o.material.dispose();}
  }
  craftsman.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('approved craftsman levels fit every plot, retain their geometry, and own their recolored resources',async()=>{
  for(const [level,count,tris] of [[1,1,3520],[2,5,4352],[3,10,5376],[4,25,7006]]) {
    assert.equal(townTier(count),level);
    const data=await readFile(`public/assets/models/01-craftsman/craftsman-lv${level}.glb`);
    const {scene}=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
    const source=[];scene.traverse(o=>{if(o instanceof Mesh)source.push(o);});
    assert.equal(source.reduce((n,o)=>n+o.geometry.index.count/3,0),tris);
    assert.equal(source.length,level===4?8:7);
    let sourceDisposed=false;
    for(const o of source)for(const resource of [o.geometry,o.material])resource.addEventListener('dispose',()=>{sourceDisposed=true;});
    const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,f.id==='craftsman'?count:0]));
    for(const slot of [0,1,2,3,4,5,6,7,8]) {
      const town=createTown();town.color='indigo';[town.plots[0],town.plots[slot]]=[slot,0];
      const model=buildTown(counts,town,scene,level);
      const imported=model.root.getObjectByName(`Craftsman_L${level}`);
      assert.ok(imported,'the GLB replaces the first shop');
      const bounds=new Box3().setFromObject(imported),[x,z]=PLOTS[slot];
      assert.ok(bounds.min.x>=x-2.4&&bounds.max.x<=x+2.4,`Lv.${level} width`);
      assert.ok(bounds.min.z>=z-1.8&&bounds.max.z<=z+3.25,`Lv.${level} depth`);
      assert.ok(Math.abs(bounds.min.y-.03)<.001,'base rests on the garden pad');
      let fabric=0;
      imported.traverse(o=>{
        if(!(o instanceof Mesh))return;
        const original=source.find(s=>s.material.name===o.material.name);
        assert.notEqual(o.geometry,original.geometry);assert.notEqual(o.material,original.material);
        if(o.material.name==='Craftsman_Noren') {fabric++;assert.equal(o.material.color.getHexString(),'426575');}
        else assert.equal(o.material.color.getHexString(),original.material.color.getHexString(),'roof, seats and sushi keep approved colors');
      });
      assert.equal(fabric,1);model.tick(1,1/60);model.dispose();
      assert.equal(sourceDisposed,false,'changing levels or plots cannot dispose the cached model');
    }
    for(const o of source){o.geometry.dispose();o.material.dispose();}
  }
});

test('conveyor levels fit all plots and the instanced dishes follow a closed, constant-speed belt',async()=>{
  const load=async path=>{const b=await readFile(path);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
  const craftsman=await load('public/assets/models/01-craftsman/craftsman-lv1.glb');
  for(const [level,count,tris,visibleTris] of [[1,1,3980,4500],[2,5,4516,5140],[3,10,5296,6024],[4,25,6916,7748]]) {
    const conveyor=await load(`public/assets/models/02-conveyor-sushi/conveyor-lv${level}.glb`);
    const source=[];conveyor.traverse(o=>{if(o instanceof Mesh)source.push(o);});
    assert.equal(source.reduce((n,o)=>n+o.geometry.index.count/3,0),tris);
    let disposed=false;for(const o of source)for(const resource of [o.geometry,o.material])resource.addEventListener('dispose',()=>{disposed=true;});
    const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,f.id==='conveyor_sushi'?count:f.id==='craftsman'?1:0]));
    for(let slot=0;slot<9;slot++) {
      const town=createTown();town.color='leaf';[town.plots[1],town.plots[slot]]=[slot,1];
      const model=buildTown(counts,town,craftsman,1,conveyor);
      const asset=model.root.getObjectByName(`Conveyor_L${level}`).parent;
      const bounds=new Box3().setFromObject(asset),[x,z]=PLOTS[slot];
      assert.ok(bounds.min.x>=x-2.4&&bounds.max.x<=x+2.4);
      assert.ok(bounds.min.z>=z-1.8&&bounds.max.z<=z+3.25);
      assert.ok(Math.abs(bounds.min.y-.03)<.001);
      const prototype=asset.children.find(o=>o.name.startsWith('Conveyor_Plate'));
      assert.equal(prototype.visible,false);
      const plates=[];model.root.traverse(o=>{if(o instanceof InstancedMesh&&o.name==='Conveyor_Dishes')plates.push(o);});
      assert.equal(plates.length,level===4?3:2);assert.ok(plates.every(o=>o.count===5+level));
      assert.equal(tris+(4+level)*plates.reduce((n,o)=>n+o.geometry.index.count/3,0),visibleTris);
      asset.traverse(o=>{if(o instanceof Mesh&&o.material.name.startsWith('Conveyor_Noren'))assert.equal(o.material.color.getHexString(),'758354');});
      const matrix=new Matrix4(),point=new Vector3(),speeds=[];
      for(let sample=0;sample<20;sample++) {
        model.tick(sample,.05);plates[0].getMatrixAt(0,matrix);const before=new Vector3().setFromMatrixPosition(matrix);
        assert.ok(Math.abs((before.x/1.66)**2+((before.z-.93)/.63)**2-1)<.0001,'dish stays on the belt');
        assert.ok(Math.abs(before.y-1.162)<.0001);
        model.tick(sample+.05,.05);plates[0].getMatrixAt(0,matrix);point.setFromMatrixPosition(matrix);speeds.push(point.distanceTo(before));
      }
      assert.ok(Math.max(...speeds)/Math.min(...speeds)<1.04,'dishes do not surge through the elliptical turns');
      model.tick(0,0);const initial=plates[0].instanceMatrix.array.slice();model.tick(20,0);
      assert.deepEqual(plates[0].instanceMatrix.array,initial,'one full loop has no seam jump');
      const crown=asset.getObjectByName('Crown_Carousel');assert.equal(!!crown,level===4);
      if(crown){const angle=crown.rotation.y;model.tick(21,1);assert.notEqual(crown.rotation.y,angle);}
      model.dispose();assert.equal(disposed,false);
    }
    for(const o of source){o.geometry.dispose();o.material.dispose();}
  }
  craftsman.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
});

test('auto sushi levels fit every plot and keep articulated robots, dishes and crown connected',async()=>{
  const load=async path=>{const b=await readFile(path);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
  const craftsman=await load('public/assets/models/01-craftsman/craftsman-lv1.glb');
  for(const [level,count,tris] of [[1,1,3084],[2,5,4592],[3,10,6276],[4,25,7916]]) {
    const auto=await load(`public/assets/models/03-auto-sushi-machine/auto-sushi-lv${level}.glb`),source=[];
    auto.traverse(o=>{if(o instanceof Mesh)source.push(o);});
    assert.equal(source.reduce((n,o)=>n+o.geometry.index.count/3,0),tris);
    let disposed=false;for(const o of source)for(const r of [o.geometry,o.material])r.addEventListener('dispose',()=>{disposed=true;});
    const counts=Object.fromEntries(FACILITIES.map(f=>[f.id,f.id==='auto_sushi_machine'?count:f.id==='craftsman'?1:0]));
    for(let slot=0;slot<9;slot++) {
      const town=createTown();[town.plots[2],town.plots[slot]]=[slot,2];
      const model=buildTown(counts,town,craftsman,1,null,auto);
      const imported=model.root.getObjectByName(`Auto_L${level}`);assert.ok(imported,'the authored machine replaces the placeholder');
      const asset=imported.parent,[x,z]=PLOTS[slot],bounds=new Box3().setFromObject(asset);
      assert.ok(bounds.min.x>=x-2.4&&bounds.max.x<=x+2.4);assert.ok(bounds.min.z>=z-1.8&&bounds.max.z<=z+3.25);
      assert.ok(Math.abs(bounds.min.y-.03)<.001);
      const find=name=>{let found;asset.traverse(o=>{if(!found&&o.name.startsWith(name))found=o;});return found;};
      assert.equal(find('Auto_Plate').visible,false);
      const shoulder=find('Robot_L_Shoulder'),elbow=find('Robot_L_Elbow'),wrist=find('Robot_L_Wrist');
      assert.equal(elbow.parent,shoulder);assert.equal(wrist.parent,elbow);
      assert.equal(!!find('Robot_R_Shoulder'),level>=2);
      const plates=[];model.root.traverse(o=>{if(o instanceof InstancedMesh&&o.name==='Auto_Dishes')plates.push(o);});
      assert.equal(plates.length,3);assert.ok(plates.every(p=>p.count===3+level));
      const crown=asset.getObjectByName('Crown_Gear');assert.equal(!!crown,level===4);
      model.tick(0,0);const rotation=shoulder.quaternion.clone(),dishes=plates[0].instanceMatrix.array.slice(),gear=crown?.quaternion.clone();
      model.tick(.75,.05);assert.ok(shoulder.quaternion.angleTo(rotation)>.01);assert.notDeepEqual(plates[0].instanceMatrix.array,dishes);
      if(crown)assert.ok(crown.quaternion.angleTo(gear)>.01);
      if(slot===2)for(let t=0;t<14;t+=.25) {
        model.tick(t,.25);model.root.updateMatrixWorld(true);
        const gripper=new Box3().setFromObject(wrist);assert.ok(gripper.min.y>.03+1.15*.80,'gripper stays clear of the belt');
        assert.ok(Math.abs(wrist.getWorldPosition(new Vector3()).z-(z+.48+.53*.80))<.001,'arm joints share a working plane');
        const m=new Matrix4(),point=new Vector3();
        for(let i=0;i<plates[0].count;i++) {
          plates[0].getMatrixAt(i,m);point.setFromMatrixPosition(m);
          const dx=Math.max(0,Math.abs(point.x)-.98),dz=point.z-.95;
          assert.ok(Math.abs(Math.hypot(dx,dz)-.39)<.001,'every dish stays on its capsule belt');
          assert.ok(Math.abs(point.y-1.145)<.001);
        }
      }
      model.tick(14,0);assert.deepEqual(plates[0].instanceMatrix.array,dishes,'dish motion wraps without a jump');
      model.dispose();assert.equal(disposed,false);
    }
    for(const o of source){o.geometry.dispose();o.material.dispose();}
  }
  craftsman.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
});
