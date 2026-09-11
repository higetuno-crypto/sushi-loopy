import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'silent'});
after(async()=>vite.close());
const { notesAtStep, midiFrequency } = await vite.ssrLoadModule('/src/game/audio/score.ts');
test('original score has finite bounded voices, rests, and variation over 4 phrases',()=>{
  let count=0;
  for(let step=0;step<256;step++) for(const note of notesAtStep(step,5)) {
    assert.ok(note.duration>0 && note.duration<8); assert.ok(note.gain>0 && note.gain<0.3); assert.ok(midiFrequency(note.note)>20 && midiFrequency(note.note)<12000); count++;
  }
  assert.ok(count>100); assert.deepEqual(notesAtStep(1,1),[]); assert.notDeepEqual(notesAtStep(0,4),notesAtStep(64,4));
});
