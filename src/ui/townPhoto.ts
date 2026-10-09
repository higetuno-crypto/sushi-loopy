/** Export rendered geometry, including shadows and the physical shop sign. */
export function createTownPhoto(scene:HTMLElement):Promise<Blob> {
  return new Promise((resolve,reject)=>scene.dispatchEvent(new CustomEvent('town-photo',{detail:{resolve,reject}})));
}
