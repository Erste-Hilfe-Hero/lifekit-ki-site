// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let modules=0;
function walk(dir){for(const file of readdirSync(dir,{withFileTypes:true})){const p=join(dir,file.name);if(file.isDirectory()&&!['.git','.data','node_modules','dist','artifacts','native','public','__pycache__'].includes(file.name))walk(p);else if(file.isFile()&&p.endsWith('.mjs')){const result=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);modules++;}}}
walk(root);
const html=readFileSync(join(root,'dist/index.html'),'utf8');
assert(!html.includes('/* SCRIPT_INSERT */'));assert(!html.includes('/* STYLE_INSERT */'));
const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];new Function(inline);
const info=JSON.parse(readFileSync(join(root,'dist/build-info.json'),'utf8'));
assert.equal(info.build,createHash('sha256').update(html).digest('hex').slice(0,12));assert.equal(info.bytes,Buffer.byteLength(html));
const nativeOffline=html.replace('<meta name="nyrathen-hosting" content="integrated">','<meta name="nyrathen-hosting" content="native">');
for(const dir of ['native/android/app/src/main/assets/game','native/ios/Nyrathen/Web'])assert.equal(readFileSync(join(root,dir,'index.html'),'utf8'),nativeOffline);
for(const p of ['LICENSE','THIRD_PARTY_NOTICES.md','third_party/reference/ALLOY-MIT-LICENSE.txt','native/android/app/src/main/AndroidManifest.xml','native/ios/Nyrathen.xcodeproj/project.pbxproj','native/ios/Nyrathen/Info.plist','native/ios/Nyrathen/PrivacyInfo.xcprivacy'])assert(existsSync(join(root,p)),p);
assert.equal(info.nativeBinariesBuilt,false);
assert(!existsSync(join(root,'dist/Nyrathen-offline.html')));
console.log(JSON.stringify({syntaxCheckedModules:modules,build:info.build,embeddedClientBytes:Buffer.byteLength(nativeOffline),nativeAssetsInSync:true,standaloneBrowserArtifact:false,nativeBinariesBuilt:false},null,2));
