import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Mesh } from 'three';
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
