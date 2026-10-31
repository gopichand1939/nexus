import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
async function walk(dir){let result=[];for(const item of await readdir(dir,{withFileTypes:true})){if(['node_modules','.git','dist'].includes(item.name))continue;const full=path.join(dir,item.name);if(item.isDirectory())result.push(...await walk(full));else result.push(full);}return result;}
const files=await walk(root);let count=0;
for(const file of files){if(file.endsWith('.js')||file.endsWith('.mjs')){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0){console.error(result.stderr);process.exitCode=1;}count++;}}
for(const file of files.filter(f=>f.endsWith('.json')))JSON.parse(await readFile(file,'utf8'));
for(const module of ['auth','users','contacts','reports','admin'])for(const layer of ['routes','controller','service','model'])await readFile(path.join(root,'backend/src/modules',module,`${module}.${layer}.js`));
console.log(`Checked ${count} JavaScript modules, JSON files, and MVC module structure. JSX compilation requires npm run build.`);
