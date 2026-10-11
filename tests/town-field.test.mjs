import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite=await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {PLOTS,MAIN_SHORE,ISLET_SHORE,ROAD_NODES,ROAD_EDGES,ROAD_WIDTH,deliveryRoute}=await vite.ssrLoadModule('/src/game/rendering/townField.ts');

function inside(x,z,polygon) {
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [ax,az]=polygon[i],[bx,bz]=polygon[j];
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)result=!result;
  }
  return result;
}
function segmentDistance(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}

test('all nine plots fit dry land and keep their building footprints clear of roads',()=>{
  assert.equal(PLOTS.length,9);
  const failures=[];
  PLOTS.forEach(([x,z],slot)=>{
    for(const dx of [-2.4,0,2.4])for(const dz of [-1.8,0,3.25]) {
      if(![MAIN_SHORE,ISLET_SHORE].some(p=>inside(x+dx,z+dz,p)))failures.push(`slot ${slot} falls in water at ${dx},${dz}`);
      const distance=Math.min(...ROAD_EDGES.map(([a,b])=>segmentDistance(x+dx,z+dz,ROAD_NODES[a],ROAD_NODES[b])));
      if(distance<ROAD_WIDTH/2-.02)failures.push(`road intersects slot ${slot} at ${dx},${dz}`);
    }
  });
  assert.deepEqual(failures,[]);
});

test('every rearranged source/destination stays on the drawn road, including the island bridge',()=>{
  for(let from=0;from<9;from++)for(let to=0;to<9;to++) {
    if(from===to)continue;
    const route=deliveryRoute(from,to),start=route.getPointAt(0),end=route.getPointAt(1);
    assert.deepEqual([start.x,start.z],ROAD_NODES[from]);
    assert.deepEqual([end.x,end.z],ROAD_NODES[to]);
    assert.ok(Number.isFinite(route.getLength())&&route.getLength()>0);
    for(let i=0;i<=200;i++) {
      const p=route.getPointAt(i/200);
      assert.ok(Math.min(...ROAD_EDGES.map(([a,b])=>segmentDistance(p.x,p.z,ROAD_NODES[a],ROAD_NODES[b])))<=ROAD_WIDTH/2-.70,'truck wheels must stay inside the road through turns');
    }
  }
});

test('the full road width is supported by land outside the bridge span',()=>{
  const failures=[];
  for(const [a,b] of ROAD_EDGES) {
    if(a===9&&b===1)continue;
    const [ax,az]=ROAD_NODES[a],[bx,bz]=ROAD_NODES[b],length=Math.hypot(bx-ax,bz-az);
    for(let i=0;i<=40;i++)for(const side of [-1,0,1]) {
      const x=ax+(bx-ax)*i/40+(bz-az)/length*side*ROAD_WIDTH/2;
      const z=az+(bz-az)*i/40-(bx-ax)/length*side*ROAD_WIDTH/2;
      if(![MAIN_SHORE,ISLET_SHORE].some(p=>inside(x,z,p)))failures.push({edge:[a,b],x,z});
    }
  }
  assert.deepEqual(failures,[]);
});
