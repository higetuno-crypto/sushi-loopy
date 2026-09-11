import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root=process.cwd();
const baseline=process.env.SUSHI_BASELINE || 'D:/Sushi_Loopy_backups/before-step3-20260909-114708';
const ignored=new Set(['node_modules','dist','.git','artifacts']);
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(path));else files.push(path);}return files;}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=new Map();for(const file of await walk(baseline))before.set(relative(baseline,file).replaceAll('\\','/'),hash(await readFile(file)));
const changes=[];
for(const file of await walk(root)){
  const path=relative(root,file).replaceAll('\\','/');if(path==='docs/CHANGED_FILES.md')continue;
  const bytes=await readFile(file);const after=hash(bytes);const old=before.get(path);before.delete(path);
  if(after!==old)changes.push({path,status:old?'modified':'new',bytes:bytes.length,sha256:after,...old?{baselineSha256:old}:{}});
}
for(const path of before.keys())changes.push({path,status:'removed'});
changes.sort((a,b)=>a.path.localeCompare(b.path));
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/change-manifest.json',JSON.stringify({baseline,ignored:[...ignored],generatedIndex:'docs/CHANGED_FILES.md',changes},null,2));
const sections=['modified','new','removed'].map(status=>`## ${status}\n\n${changes.filter(x=>x.status===status).map(x=>`- [${x.path}](../${x.path})${x.bytes?` (${x.bytes.toLocaleString()} bytes)`:''}`).join('\n')||'なし'}`);
await writeFile('docs/CHANGED_FILES.md',`# 変更ファイル一覧\n\nGit未管理のため、作業前バックアップとのSHA-256比較。node_modules / dist / artifactsを除外。再生成: node scripts/change-manifest.mjs\n\nBaseline: ${baseline}\n\n${sections.join('\n\n')}\n\n## 生成した検証記録\n\n- この一覧: docs/CHANGED_FILES.md\n- artifacts/change-manifest.json\n- artifacts/browser-results.json、production-results.json、balance-simulation.json\n- artifacts/desktop-*.png、mobile-*.png\n\nこれらの自己生成インデックス・検証出力は上のハッシュ対象外。\n`);
console.log(JSON.stringify({modified:changes.filter(x=>x.status==='modified').length,new:changes.filter(x=>x.status==='new').length,removed:changes.filter(x=>x.status==='removed').length}));
