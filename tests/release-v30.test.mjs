// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {VERSION} from '../shared/data.mjs';
const root=resolve(new URL('..',import.meta.url).pathname);
const text=rel=>readFileSync(resolve(root,rel),'utf8');
function collect(dir,out=[]){for(const e of readdirSync(resolve(root,dir),{withFileTypes:true})){const rel=dir+'/'+e.name;if(e.isDirectory())collect(rel,out);else if(/\.(mjs|js|java|swift|xml|plist|gradle|html|css|py)$/.test(e.name))out.push(text(rel));}return out;}
test('mobile release is v5.7 and browser distribution is absent',()=>{assert.equal(VERSION,'5.7.0');assert(!existsSync(resolve(root,'release/web')));assert(!existsSync(resolve(root,'tools/package-web.mjs')));});
test('GPL sharp integration is removed from shipped runtime',()=>{assert(!existsSync(resolve(root,'shared/sharp-descriptors.mjs')));assert(!existsSync(resolve(root,'tools/import-sharp.py')));const runtime=collect('shared').concat(collect('client'),collect('server'),collect('native')).join('\n');assert(!runtime.includes('GPL-3.0-only'));assert(!runtime.includes('iDilly/sharp'));});
test('projectile contract uses Nyrathen-only fields',()=>{const source=text('shared/projectile.mjs');assert.match(source,/damage:projectileFinite\(raw\.damage/);assert.match(source,/piercing:raw\.piercing/);assert.doesNotMatch(source,/MinDamage|LifetimeMS|ArmorPiercing/);});
test('native releases carry privacy and secure transport configuration',()=>{assert(existsSync(resolve(root,'native/ios/Nyrathen/PrivacyInfo.xcprivacy')));assert.match(text('native/android/app/src/main/AndroidManifest.xml'),/usesCleartextTraffic="false"/);assert.doesNotMatch(text('native/android/app/build.gradle'),/ads|appsflyer|adjust/i);assert.match(text('native/android/app/build.gradle'),/com\.android\.billingclient:billing:9\.1\.0/);});
test('store listing avoids third-party game branding',()=>{assert.doesNotMatch(text('docs/STORE-LISTING-SAFE-DRAFT.md'),/Realm of the Mad God|\bRotMG\b|\bDECA\b|\bOryx\b/i);});
test('app exposes independent-game notice and mobile-native runtime',()=>{const main=text('client/main.mjs'),html=text('client/index.html');assert.match(main,/eigenständiges Originalspiel/);assert.match(html,/Riftwacht/);assert.doesNotMatch(main,/Zum Home-Bildschirm/);});

test('online UGC is gated by explicit community rules acceptance',()=>{const main=text('client/main.mjs');assert.match(main,/COMMUNITY_TERMS_KEY='nyrathen\.community\.v1'/);assert.match(main,/Ich akzeptiere die Community-Regeln/);assert.match(main,/if\(!communityAccepted\(\)\)/);assert.match(main,/Blockieren und Melden/);});
test('online account and guest data deletion are exposed in app',()=>{const systems=text('client/systems.mjs'),server=text('server/server.mjs');assert.match(systems,/Onlinekonto dauerhaft löschen/);assert.match(systems,/Gastdaten dieses Servers löschen/);assert.match(systems,/\/api\/profile','DELETE'/);assert.match(server,/path==='\/api\/profile'&&req\.method==='DELETE'/);});
test('store compliance site templates exist without shipping a browser game',()=>{for(const f of ['privacy.html','delete-account.html','support.html','terms.html','README.md'])assert(existsSync(resolve(root,'store-compliance-site',f)));assert(!existsSync(resolve(root,'release/web')));});
