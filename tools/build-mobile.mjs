#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { nativeEnvironment,missingFor,PROJECT_ROOT as root } from './native-environment.mjs';
const target=process.argv[2];
if(!['android-debug','android-bundle','ios-simulator','ios-archive'].includes(target)){console.error('Aufruf: node tools/build-mobile.mjs android-debug | android-bundle | ios-simulator | ios-archive');process.exit(1);}
if(['android-bundle','ios-archive'].includes(target)){const urls=spawnSync(process.execPath,['tools/validate-mobile-urls.mjs'],{cwd:root,stdio:'inherit',env:process.env});if(urls.status!==0)process.exit(urls.status??1);}
const environment=nativeEnvironment(),missing=missingFor(target,environment);
if(missing.length){console.error(JSON.stringify({target,status:'blocked',missing,nativeBuildPerformed:false},null,2));process.exit(1);}
function run(command,args,cwd=root){const p=spawnSync(command,args,{cwd,stdio:'inherit'});if(p.error){console.error(p.error.message);process.exit(1);}if(p.status!==0)process.exit(p.status??1);}
run(process.execPath,['tools/build.mjs']);run(process.execPath,['tools/check.mjs']);
let output;
if(target.startsWith('android-')){
 const cwd=resolve(root,'native/android'),task=target==='android-debug'?':app:assembleDebug':':app:bundleRelease';
 if(process.platform==='win32')run('cmd.exe',['/d','/s','/c',`gradlew.bat ${task} --no-daemon`],cwd);
 else run('sh',['gradlew',task,'--no-daemon'],cwd);
 output=target==='android-debug'?'native/android/app/build/outputs/apk/debug/app-debug.apk':'native/android/app/build/outputs/bundle/release/app-release.aab';
}else{
 const args=['-project','Nyrathen.xcodeproj','-scheme','Nyrathen','-derivedDataPath','build'];
 if(target==='ios-simulator'){args.push('-sdk','iphonesimulator','-configuration','Debug','CODE_SIGNING_ALLOWED=NO','build');output='native/ios/build/Build/Products/Debug-iphonesimulator/Nyrathen.app';}
 else {
  args.push('-destination','generic/platform=iOS','-configuration','Release','-archivePath','build/Nyrathen.xcarchive',`DEVELOPMENT_TEAM=${process.env.NYRATHEN_DEVELOPMENT_TEAM}`);
  if(process.env.NYRATHEN_PROVISIONING_PROFILE){args.push('CODE_SIGN_STYLE=Manual',`PROVISIONING_PROFILE_SPECIFIER=${process.env.NYRATHEN_PROVISIONING_PROFILE}`);}
  args.push('archive');output='native/ios/build/Nyrathen.xcarchive';
 }
 run('xcodebuild',args,resolve(root,'native/ios'));
}
if(!existsSync(resolve(root,output))){console.error('Build beendet, aber erwartetes Artefakt fehlt: '+output);process.exit(1);}
console.log(JSON.stringify({target,status:'built',artifact:output,storeUploadPerformed:false,...(target==='ios-simulator'?{note:'Nur Simulator-App, keine Geräte-IPA.'}:target==='ios-archive'?{note:'Xcode-Archiv; Export/Verteilung und Gerätetest sind separate Schritte.'}:{})},null,2));
