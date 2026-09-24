// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Read-only environment check; never downloads SDKs, accepts licenses, or prints credentials.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
export const PROJECT_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const available=command=>{const r=spawnSync(command,command==='xcodebuild'?['-version']:['--version'],{encoding:'utf8',timeout:4000});return !r.error&&r.status===0;};
const xcodeMajorFromHost=()=>{const r=spawnSync('xcodebuild',['-version'],{encoding:'utf8',timeout:4000});const m=String(r.stdout||'').match(/Xcode\s+(\d+)/);return !r.error&&r.status===0&&m?Number(m[1]):0;};
export function nativeEnvironment({env=process.env,platform=process.platform,root=PROJECT_ROOT,exists=existsSync,read=readFileSync,probe=available,versionProbe=null}={}){
 let sdk=env.ANDROID_HOME||env.ANDROID_SDK_ROOT||'';
 const props=resolve(root,'native/android/local.properties');
 if(!sdk&&exists(props)){const match=String(read(props,'utf8')).match(/^sdk\.dir\s*=\s*(.+)$/m);if(match)sdk=match[1].trim().replace(/\\([\\: ])/g,'$1');}
 const sdkConfigured=!!sdk&&exists(sdk),sdk36=!!sdk&&exists(resolve(sdk,'platforms/android-36/android.jar'));
 const signingReady=!!(env.NYRATHEN_KEYSTORE&&exists(resolve(env.NYRATHEN_KEYSTORE))&&env.NYRATHEN_STORE_PASSWORD&&env.NYRATHEN_KEY_ALIAS&&env.NYRATHEN_KEY_PASSWORD);
 const xcode=platform==='darwin'&&probe('xcodebuild'),xcodeMajor=xcode?(versionProbe?Number(versionProbe('xcodebuild')):(probe===available?xcodeMajorFromHost():26)):0;
 return {android:{java:probe('java'),sdkConfigured,sdk36,releaseSigningConfigured:signingReady,gradleDownloadMayBeRequired:true},ios:{macOS:platform==='darwin',xcode,xcodeMajor,xcode26:xcodeMajor>=26,teamConfigured:!!env.NYRATHEN_DEVELOPMENT_TEAM},nativeBuildPerformed:false};
}
export function missingFor(target,report){
 const missing=[];
 if(target.startsWith('android-')){if(!report.android.java)missing.push('Java/JDK');if(!report.android.sdkConfigured)missing.push('Android SDK (ANDROID_HOME/ANDROID_SDK_ROOT oder local.properties)');if(!report.android.sdk36)missing.push('Android-Plattform 36');if(target==='android-bundle'&&!report.android.releaseSigningConfigured)missing.push('Eigene Release-Signierung über NYRATHEN_KEYSTORE, NYRATHEN_STORE_PASSWORD, NYRATHEN_KEY_ALIAS und NYRATHEN_KEY_PASSWORD');}
 else {if(!report.ios.macOS)missing.push('macOS');if(!report.ios.xcode)missing.push('Xcode');else if(!report.ios.xcode26)missing.push('Xcode 26+ / iOS 26 SDK');if(target==='ios-archive'&&!report.ios.teamConfigured)missing.push('Eigenes NYRATHEN_DEVELOPMENT_TEAM');}
 return missing;
}
