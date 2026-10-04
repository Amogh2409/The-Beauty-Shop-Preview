import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
async function files(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]))).flat();}
const all=await files('dist');
for(const path of all){
 assert(!/\.(xlsx|csv|map|env|pem|key)$/.test(path),`Unexpected public file: ${path}`);
 if(!/\.(js|css|html|json|txt)$/.test(path))continue;
 const s=await readFile(path,'utf8');
 assert(!/(localhost|127\.0\.0\.1|mongodb:\/\/|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|BEGIN PRIVATE KEY|\/Users\/|\/home\/|purchaseCost|supplierCost|costPrice)/.test(s),`Private or backend content in ${path}`);
 assert(!/(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(s),`Unexpected runtime network call in ${path}`);
 assert(!/\/api\/admin|inventory-template/.test(s),`Admin feature in ${path}`);
}
const html=await readFile('dist/index.html','utf8');
assert(html.includes('noindex,nofollow'));
assert(html.includes('/The-Beauty-Shop-Preview/assets/'));
console.log(`Public build review passed: ${all.length} files; repository base, noindex, no backend calls or private fields.`);
