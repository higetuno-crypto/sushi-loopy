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
