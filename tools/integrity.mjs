#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import{readdirSync,readFileSync,writeFileSync,lstatSync}from'node:fs';
import{resolve,dirname,relative,sep}from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const manifest=resolve(root,'SHA256SUMS');
const ignored=new Set(['.git','.data','.env','node_modules','__pycache__','.gradle','DerivedData','build']);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
try{
 if(process.argv.includes('--write')){
  const files=[];const walk=dir=>{for(const f of readdirSync(dir,{withFileTypes:true})){
   if(ignored.has(f.name)||f.name==='SHA256SUMS')continue;const path=resolve(dir,f.name);if(f.isSymbolicLink())throw new Error('Symlink im Paket: '+path);
   if(f.isDirectory())walk(path);else if(f.isFile()){
    if(/\.(sqlite|jks|keystore|p12|mobileprovision|zip)(?:$|[.-])/.test(f.name))throw new Error('Private oder verschachtelte Paketdatei: '+path);
    files.push(relative(root,path).split(sep).join('/'));
   }
  }};walk(root);files.sort();writeFileSync(manifest,files.map(f=>hash(resolve(root,f))+'  '+f).join('\n')+'\n');console.log(`SHA256SUMS: ${files.length} Dateien erfasst.`);
 }else{
  const rows=readFileSync(manifest,'utf8').trim().split('\n');let count=0;
  for(const row of rows){const match=row.match(/^([a-f0-9]{64})  (.+)$/);if(!match)throw new Error('Ungültige Manifestzeile.');const path=resolve(root,match[2]);if(!path.startsWith(root+sep)||match[2].split('/').includes('..')||lstatSync(path).isSymbolicLink())throw new Error('Unsicherer Dateipfad.');if(hash(path)!==match[1])throw new Error('Abweichende Datei: '+match[2]);count++;}
  console.log(JSON.stringify({verifiedFiles:count,allHashesMatch:true},null,2));
 }
}catch(e){console.error('Paketprüfung fehlgeschlagen:',e.message);process.exitCode=1;}
