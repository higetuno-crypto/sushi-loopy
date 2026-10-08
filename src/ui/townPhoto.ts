import type { Town } from '../game/logic/town';

// A small native canvas export avoids WebKit's foreignObject image restrictions.
// Positions come from the frozen live scene, so moves and deliveries use the same layout.
export async function createTownPhoto(scene: HTMLElement, town: Town): Promise<Blob> {
  const images = await Promise.all(['island','facilities','actors'].map(async name => {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}assets/town/${name}.webp`;
    await image.decode();
    return image;
  }));
  const canvas = document.createElement('canvas');
  canvas.width=900; canvas.height=1200;
  const ctx=canvas.getContext('2d')!;
  ctx.drawImage(images[0],0,0,900,1200);
  if(town.weather!=='day') {
    ctx.fillStyle=town.weather==='evening'?'#19283e66':'#4d657a33';
    ctx.fillRect(0,0,900,1200);
  }
  for(const path of scene.querySelectorAll<SVGPathElement>('.town-roads path')) {
    ctx.strokeStyle=path.getAttribute('stroke')!;
    ctx.lineWidth=Number(path.getAttribute('stroke-width'));
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.setLineDash((path.getAttribute('stroke-dasharray')??'').split(' ').filter(Boolean).map(Number));
    ctx.stroke(new Path2D(path.getAttribute('d')!));
  }
  ctx.setLineDash([]);
  const bounds=scene.getBoundingClientRect(), scale=bounds.width/900;
  const level=(element:HTMLElement)=>{
    let z=0, node:HTMLElement|null=element;
    while(node && node!==scene){const value=Number(getComputedStyle(node).zIndex);if(Number.isFinite(value))z=Math.max(z,value);node=node.parentElement;}
    return z;
  };
  const sprites=[...scene.querySelectorAll<HTMLElement>('.town-sprite')]
    .filter(element=>!element.matches('.town-mechanism,.town-rocket'))
    .sort((a,b)=>level(a)-level(b));
  for(const element of sprites) {
    const rect=element.getBoundingClientRect();
    if(!rect.width || !rect.height)continue;
    const style=getComputedStyle(element), image=images[style.backgroundImage.includes('actors')?2:1];
    const sx=parseFloat(style.backgroundPositionX)/50*(image.width/3);
    const sy=parseFloat(style.backgroundPositionY)/50*(image.height/3);
    const x=(rect.x-bounds.x)/scale, y=(rect.y-bounds.y)/scale, w=rect.width/scale,h=rect.height/scale;
    // Tint a temporary sprite, keeping its alpha and all the pixel detail.
    const tile=document.createElement('canvas');tile.width=image.width/3;tile.height=image.height/3;
    const paint=tile.getContext('2d')!;paint.drawImage(image,sx,sy,tile.width,tile.height,0,0,tile.width,tile.height);
    const truck=element.closest('.town-truck');
    if(truck && town.truckColor!=='vermillion'){
      paint.globalCompositeOperation='source-atop';paint.fillStyle=town.truckColor==='indigo'?'#34618a80':'#51874b80';paint.fillRect(0,0,tile.width,tile.height);
    }
    if(element.classList.contains('cloth-'+town.color) && town.color!=='vermillion'){
      paint.save();paint.globalCompositeOperation='source-atop';paint.fillStyle=town.color==='indigo'?'#376c96a0':'#519044a0';
      paint.beginPath();paint.moveTo(tile.width*.13,tile.height*.357);paint.lineTo(tile.width*.74,tile.height*.3);paint.lineTo(tile.width*.74,tile.height*.463);paint.lineTo(tile.width*.13,tile.height*.52);paint.closePath();paint.fill();paint.restore();
    }
    ctx.drawImage(tile,x,y,w,h);
  }
  if(town.weather==='evening'){
    ctx.fillStyle='#51394b20';ctx.fillRect(0,0,900,1200);
  } else if(town.weather==='rain'){
    ctx.strokeStyle='#d5faff40';ctx.lineWidth=1;
    for(let y=0;y<1200;y+=67)for(let x=0;x<900;x+=91){ctx.beginPath();ctx.moveTo(x+(y%91),y);ctx.lineTo(x+(y%91)-9,y+27);ctx.stroke();}
  }
  ctx.font='32px "Yu Mincho", Georgia, serif';
  const labelWidth=Math.min(800,Math.max(330,ctx.measureText(town.name).width+60));
  ctx.fillStyle='#fff6e7ed';ctx.strokeStyle='#f5dfb2';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(40,1030,labelWidth,115,6);ctx.fill();ctx.stroke();
  ctx.fillStyle='#365647';ctx.fillText(town.name,65,1081,labelWidth-50);
  ctx.font='13px Georgia, serif';ctx.fillText('S U S H I   L O O P Y',66,1117);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Photo encoding failed')),'image/png'));
}

