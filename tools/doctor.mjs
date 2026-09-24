#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {supportedNode} from './config.mjs';
import {nativeEnvironment} from './native-environment.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const command=name=>{const p=spawnSync(name,['--version'],{encoding:'utf8',timeout:4000});return !p.error&&p.status===0;};
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
let sqlite=false;try{const s=await import('node:sqlite');sqlite=!!s.DatabaseSync&&typeof s.backup==='function';}catch{}
const report={node:process.versions.node,nodeSupported:supportedNode(process.versions.node),sqliteWithBackup:sqlite,
 embeddedAndroidRuntime:existsSync(resolve(root,'native/android/app/src/main/assets/game/index.html')),
 embeddedIosRuntime:existsSync(resolve(root,'native/ios/Nyrathen/Web/index.html')),
 build:existsSync(resolve(root,'dist/build-info.json'))?JSON.parse(readFileSync(resolve(root,'dist/build-info.json'),'utf8')).build:null,
 ...nativeEnvironment(),
 nativeBuildPerformed:false,publicDeploymentPerformed:false};
console.log(JSON.stringify(report,null,2));if(!report.nodeSupported||!sqlite)process.exitCode=1;
