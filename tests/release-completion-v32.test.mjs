// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const text=p=>readFileSync(resolve(root,p),'utf8');

test('mobile release workflow builds signed Android and iOS artifacts without storing secrets in source',()=>{
 const flow=text('.github/workflows/mobile-store-release.yml');
 for(const token of ['android-actions/setup-android@v3','platforms;android-36','NYRATHEN_KEYSTORE_BASE64','app-release.aab','macos-latest','NYRATHEN_IOS_CERTIFICATE_P12_BASE64','Nyrathen.ipa','PUBLIC_SERVER_URL'])assert.match(flow,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(flow,/BEGIN (RSA )?PRIVATE KEY|storePassword\s*[:=]\s*['\"][^$]/);
});

test('production compose terminates TLS and never publishes game container directly',()=>{
 const compose=text('deploy/production/compose.yaml'),caddy=text('deploy/production/Caddyfile');
 const gameBlock=compose.split(/\n  caddy:/)[0];assert.match(compose,/caddy:/);assert.match(compose,/\"443:443\"/);assert.match(gameBlock,/game:[\s\S]*expose:[\s\S]*\"3000\"/);assert.doesNotMatch(gameBlock,/\n\s+ports:/);
 assert.match(caddy,/reverse_proxy game:3000/);assert.match(caddy,/@metrics path \/metrics/);assert.match(caddy,/Strict-Transport-Security/);
});

test('publisher renderer refuses placeholders and emits final pages only for real HTTPS config',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nyrathen-store-'));try{
  const bad=join(dir,'bad.json');writeFileSync(bad,JSON.stringify({publisherName:'REPLACE ME'}));let r=spawnSync(process.execPath,['tools/render-store-compliance.mjs',bad,join(dir,'bad-out')],{cwd:root,encoding:'utf8'});assert.notEqual(r.status,0);
  const good=join(dir,'good.json');writeFileSync(good,JSON.stringify({publisherName:'Nyrathen Studio GmbH',publisherEmail:'support@nyrathen.test',publisherPostalAddress:'Teststraße 1, 60300 Frankfurt',privacyContact:'privacy@nyrathen.test',effectiveDate:'2026-09-22',productionServerOperator:'Nyrathen Studio GmbH',privacyUrl:'https://legal.nyrathen.test/privacy.html',termsUrl:'https://legal.nyrathen.test/terms.html',supportUrl:'https://legal.nyrathen.test/support.html',deleteAccountUrl:'https://legal.nyrathen.test/delete-account.html',productionServerUrl:'https://api.nyrathen.test'}));
  const out=join(dir,'out');r=spawnSync(process.execPath,['tools/render-store-compliance.mjs',good,out],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);for(const f of ['privacy.html','terms.html','support.html','delete-account.html','imprint.html','store-urls.json'])assert(existsSync(join(out,f)));assert.doesNotMatch(readFileSync(join(out,'privacy.html'),'utf8'),/\[[A-Z_]+\]|REPLACE ME|example\.invalid/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('release remains mobile-only and uses v5.6 native identifiers',()=>{
 assert.equal(JSON.parse(text('package.json')).version,'5.7.0');assert.match(text('native/android/app/build.gradle'),/versionCode 57/);assert.match(text('native/android/app/build.gradle'),/versionName '5\.7\.0'/);assert.match(text('native/ios/Nyrathen.xcodeproj/project.pbxproj'),/MARKETING_VERSION = 5\.7\.0/);assert.match(text('native/ios/Nyrathen.xcodeproj/project.pbxproj'),/CURRENT_PROJECT_VERSION = 57/);
 assert(!existsSync(resolve(root,'release/web')));
});


test('signed store workflow requires public server and in-app legal HTTPS URLs',()=>{
 const flow=text('.github/workflows/mobile-store-release.yml'),main=text('client/main.mjs'),index=text('client/index.html');
 for(const token of ['NYRATHEN_PUBLIC_SERVER_URL','NYRATHEN_PRIVACY_URL','NYRATHEN_TERMS_URL','NYRATHEN_SUPPORT_URL','NYRATHEN_DELETE_ACCOUNT_URL','validate-mobile-urls.mjs'])assert.match(flow,new RegExp(token));
 for(const token of ['nyrathen-privacy-url','nyrathen-terms-url','nyrathen-support-url','nyrathen-delete-account-url'])assert.match(index,new RegExp(token));
 for(const label of ['Datenschutzerklärung öffnen','Nutzungsbedingungen öffnen','Support öffnen','Externe Kontolöschung öffnen'])assert.match(main,new RegExp(label));
 const env={...process.env,PUBLIC_SERVER_URL:'https://api.nyrathen.test',NYRATHEN_PRIVACY_URL:'https://legal.nyrathen.test/privacy',NYRATHEN_TERMS_URL:'https://legal.nyrathen.test/terms',NYRATHEN_SUPPORT_URL:'https://legal.nyrathen.test/support',NYRATHEN_DELETE_ACCOUNT_URL:'https://legal.nyrathen.test/delete'};
 const ok=spawnSync(process.execPath,['tools/validate-mobile-urls.mjs'],{cwd:root,encoding:'utf8',env});assert.equal(ok.status,0,ok.stderr);
 const bad=spawnSync(process.execPath,['tools/validate-mobile-urls.mjs'],{cwd:root,encoding:'utf8',env:{...env,NYRATHEN_PRIVACY_URL:'http://insecure.test/privacy'}});assert.notEqual(bad.status,0);
});

test('native shells only open user-activated HTTPS legal links outside the app',()=>{
 const android=text('native/android/app/src/main/java/game/nyrathen/mobile/MainActivity.java'),ios=text('native/ios/Nyrathen/GameViewController.swift');
 assert.match(android,/request\.isForMainFrame\(\) && request\.hasGesture\(\) && "https"\.equals\(url\.getScheme\(\)\)/);assert.match(android,/Intent\.ACTION_VIEW/);
 assert.match(ios,/navigationAction\.navigationType == \.linkActivated && url\.scheme == "https"/);assert.match(ios,/UIApplication\.shared\.open/);
});


test('manual store build commands gate release archives on production URLs',()=>{
 const mobile=text('tools/build-mobile.mjs');
 assert.match(mobile,/\['android-bundle','ios-archive'\]\.includes\(target\)/);
 assert.match(mobile,/validate-mobile-urls\.mjs/);
});
