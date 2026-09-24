#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const need=(p)=>{const ok=existsSync(resolve(root,p));return {path:p,ok};};
const files=[
 '.github/workflows/mobile-beta.yml',
 '.apple-actions/test-information.json',
 'release/beta-v5.7/BETA-README.md',
 'release/beta-v5.7/TESTER-INSTRUCTIONS.md',
 'release/beta-v5.7/device-results.csv',
 'release/beta-v5.7/google-play/whatsnew/whatsnew-de-DE',
 'release/beta-v5.7/google-play/whatsnew/whatsnew-en-US',
 'release/beta-v5.7/google-play/whatsnew/whatsnew-fr-FR',
 'release/beta-v5.7/google-play/whatsnew/whatsnew-es-ES',
 'release/beta-v5.7/google-play/whatsnew/whatsnew-it-IT',
 'release/beta-v5.7/google-play/whatsnew/whatsnew-pt-BR',
 'release/beta-v5.7/google-play/whatsnew/whatsnew-tr-TR'
];
const checks=Object.fromEntries(files.map(p=>[p,need(p).ok]));
const android=readFileSync(resolve(root,'native/android/app/build.gradle'),'utf8');
const ios=readFileSync(resolve(root,'native/ios/Nyrathen.xcodeproj/project.pbxproj'),'utf8');
checks.androidPackage=/applicationId\s+'game\.nyrathen\.mobile'/.test(android);
checks.androidTarget36=/targetSdk\s+36/.test(android)&&/compileSdk\s+36/.test(android);
checks.iosBundle=/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*game\.nyrathen\.mobile/.test(ios);
checks.version57=/versionName\s+'5\.7\.0'/.test(android)&&/MARKETING_VERSION\s*=\s*5\.7\.0/.test(ios);
const info=JSON.parse(readFileSync(resolve(root,'.apple-actions/test-information.json'),'utf8'));
checks.testflightBundle=info.bundleId==='game.nyrathen.mobile';
checks.testflightLocale=info.locale==='en-US';
checks.testflightDescription=typeof info.description==='string'&&info.description.length>=20;
const ci=process.argv.includes('--require-credentials');
const credentialNames=[
 'NYRATHEN_KEYSTORE_BASE64','NYRATHEN_STORE_PASSWORD','NYRATHEN_KEY_ALIAS','NYRATHEN_KEY_PASSWORD',
 'NYRATHEN_IOS_CERTIFICATE_P12_BASE64','NYRATHEN_IOS_CERTIFICATE_PASSWORD','NYRATHEN_IOS_PROVISIONING_PROFILE_BASE64','NYRATHEN_CI_KEYCHAIN_PASSWORD','NYRATHEN_DEVELOPMENT_TEAM',
 'NYRATHEN_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON','APPSTORE_ISSUER_ID','APPSTORE_API_KEY_ID','APPSTORE_API_PRIVATE_KEY'
];
const missingCredentials=credentialNames.filter(k=>!String(process.env[k]||'').trim());
const publicVars=['PUBLIC_SERVER_URL','NYRATHEN_PRIVACY_URL','NYRATHEN_TERMS_URL','NYRATHEN_SUPPORT_URL','NYRATHEN_DELETE_ACCOUNT_URL'];
const missingUrls=[];
for(const k of publicVars){const v=String(process.env[k]||'').trim();try{const u=new URL(v);if(u.protocol!=='https:')missingUrls.push(k);}catch{missingUrls.push(k);}}
const ok=Object.values(checks).every(Boolean)&&(!ci||(!missingCredentials.length&&!missingUrls.length));
const result={release:'5.7.0',kind:'closed-beta-preflight',checks,credentialsConfigured:missingCredentials.length===0,missingCredentials,publicUrlsConfigured:missingUrls.length===0,missingUrls,uploadReady:ci&&ok,localPreparationReady:Object.values(checks).every(Boolean)};
mkdirSync(resolve(root,'release/verification/v5.7'),{recursive:true});
writeFileSync(resolve(root,'release/verification/v5.7/beta-preflight.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(!ok)process.exit(1);
