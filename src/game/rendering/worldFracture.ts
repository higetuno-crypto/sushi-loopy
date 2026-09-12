import {
  WebGLRenderer, Scene, PerspectiveCamera, CanvasTexture, MeshBasicMaterial,
  BufferGeometry, Float32BufferAttribute, Mesh, DoubleSide, SRGBColorSpace, Group,
} from 'three';
import html2canvas from 'html2canvas';
import { FRACTURE_AT_MS } from '../logic/loop';

const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
export function reducedWorldMotion(): boolean {
  const setting = document.documentElement.dataset.motion;
  return setting === 'off' || (setting !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Capture only this game's DOM; no browser/desktop capture or remote service. */
export async function createWorldFracture(host: HTMLElement, signal: AbortSignal, readElapsed: () => number): Promise<() => void> {
  const width = innerWidth, height = innerHeight;
  const snapshot = await html2canvas(document.body, {
    backgroundColor: '#f5f1e7', width, height, x:scrollX, y:scrollY,
    scale: Math.min(devicePixelRatio, 1.25), logging:false, imageTimeout:3000,
    ignoreElements: element => element.hasAttribute('data-world-overlay') || element.hasAttribute('data-preserve-ui'),
  });
  if (signal.aborted) return () => {};
  const renderer = new WebGLRenderer({ antialias:false, alpha:false, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(width, height);
  renderer.setClearColor('#101211');
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, width / height, 0.1, 12000);
  camera.position.z = height / (2 * Math.tan(Math.PI / 8));
  const texture = new CanvasTexture(snapshot);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({ map:texture, side:DoubleSide });
  const group = new Group(); scene.add(group);
  const columns = width < 600 ? 6 : 10;
  const rows = Math.min(24, Math.ceil(height / (width / columns)));
  const pieces: { mesh:Mesh; x:number; y:number; delay:number; speed:number; spin:number; drift:number }[] = [];
  // Adjacent triangles share jittered vertices, so the frozen UI initially fits exactly.
  const points = Array.from({length:rows+1}, (_, row) => Array.from({length:columns+1}, (_, col) => ({
    x: col * width / columns + (col === 0 || col === columns ? 0 : (random(row*37+col)-0.5)*width/columns*0.65),
    y: row * height / rows + (row === 0 || row === rows ? 0 : (random(row*43+col+71)-0.5)*height/rows*0.65),
  })));
  for (let row=0; row<rows; row++) for (let col=0; col<columns; col++) {
    const a=points[row][col], b=points[row][col+1], c=points[row+1][col], d=points[row+1][col+1];
    for (const vertices of [[a,b,c],[b,d,c]]) {
      const x=vertices.reduce((sum,p)=>sum+p.x,0)/3, y=vertices.reduce((sum,p)=>sum+p.y,0)/3;
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(vertices.flatMap(p=>[p.x-x,y-p.y,0]),3));
      geometry.setAttribute('uv', new Float32BufferAttribute(vertices.flatMap(p=>[p.x/width,1-p.y/height]),2));
      const mesh=new Mesh(geometry,material);
      mesh.position.set(x-width/2,height/2-y,0); group.add(mesh);
      const id=pieces.length;
      pieces.push({mesh,x:mesh.position.x,y:mesh.position.y,delay:random(id+2)*3.5,
        speed:60+random(id+3)*130,spin:(random(id+4)-0.5)*1.8,drift:(random(id+5)-0.5)*140});
    }
  }
  let frame=0, lastElapsed=-1, updatedAt=performance.now(), disposed=false;
  const resize=()=>{
    renderer.setSize(innerWidth,innerHeight);
    camera.aspect=innerWidth/innerHeight;
    camera.position.z=innerHeight/(2*Math.tan(Math.PI/8)); camera.updateProjectionMatrix();
    group.scale.set(innerWidth/width,innerHeight/height,1);
  };
  const render=(now:number)=>{
    if(disposed) return;
    if(!document.hidden) {
      const elapsed=readElapsed();
      if(elapsed!==lastElapsed){lastElapsed=elapsed;updatedAt=now;}
      const seconds=Math.max(0,(elapsed+Math.min(now-updatedAt,250)-FRACTURE_AT_MS)/1000);
      const reduced=reducedWorldMotion();
      for(const piece of pieces){
        const t=Math.max(0,seconds-piece.delay);
        if(reduced){
          // Static cracks/missing tiles convey failure without camera movement.
          piece.mesh.visible=seconds<1 || (seconds<8 && piece.delay>seconds/3);
          piece.mesh.position.set(piece.x+(seconds>1?piece.spin*4:0),piece.y,0);
          piece.mesh.rotation.set(0,0,0);
        }else{
          piece.mesh.visible=t<12;
          piece.mesh.position.set(piece.x+piece.drift*t,piece.y+piece.speed*t*0.15-65*t*t,-t*42);
          piece.mesh.rotation.set(piece.spin*t*0.7,piece.spin*t,piece.spin*t*0.25);
        }
      }
      renderer.render(scene,camera);
      host.dataset.elapsed = String(Math.floor(elapsed));
      host.dataset.drawCalls = String(renderer.info.render.calls);
    }
    frame=requestAnimationFrame(render);
  };
  const lost=(event:Event)=>{event.preventDefault();dispose();host.dispatchEvent(new Event('fracture-lost'));};
  const dispose=()=>{
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);removeEventListener('resize',resize);
    renderer.domElement.removeEventListener('webglcontextlost',lost);
    for(const piece of pieces)piece.mesh.geometry.dispose();
    material.dispose();texture.dispose();renderer.dispose();renderer.domElement.remove();
    snapshot.width=1;snapshot.height=1;
  };
  renderer.domElement.addEventListener('webglcontextlost',lost);
  addEventListener('resize',resize);
  frame=requestAnimationFrame(render);
  return dispose;
}
