#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(label,args)=>{const r=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env:process.env});if(r.status!==0)throw new Error(label+' fehlgeschlagen');};
run('Build',['tools/build.mjs']);
run('Check',['tools/check.mjs']);
const tests=readdirSync(resolve(root,'tests')).filter(n=>n.endsWith('.test.mjs')).map(n=>resolve(root,'tests',n));
run('Tests',['--test',...tests]);
const build=JSON.parse(readFileSync(resolve(root,'dist/build-info.json'),'utf8'));
const android=readFileSync(resolve(root,'native/android/app/src/main/assets/game/index.html'),'utf8');
const ios=readFileSync(resolve(root,'native/ios/Nyrathen/Web/index.html'),'utf8');
const source=readFileSync(resolve(root,'dist/index.html'),'utf8').replace('<meta name="nyrathen-hosting" content="integrated">','<meta name="nyrathen-hosting" content="native">');
const allText=[];
for(const folder of ['client','shared','server','native']){
  const walk=d=>{for(const e of readdirSync(d,{withFileTypes:true})){const q=resolve(d,e.name);if(e.isDirectory())walk(q);else if(/\.(mjs|js|java|swift|xml|plist|gradle|html|css|py)$/.test(e.name))try{allText.push(readFileSync(q,'utf8'));}catch{}}};walk(resolve(root,folder));
}
const joined=allText.join('\n');
const checks={
 version:build.version===JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version,
 nativeTarget:build.releaseTarget==='native-mobile'&&build.browserRelease===false,
 androidSynced:android===source,
 iosSynced:ios===source,
 noPublicWebRelease:!existsSync(resolve(root,'release/web'))&&!existsSync(resolve(root,'dist/Nyrathen-offline.html')),
 noSharpAdapter:!existsSync(resolve(root,'shared/sharp-descriptors.mjs'))&&!existsSync(resolve(root,'tools/import-sharp.py')),
 noGplHeaders:!joined.includes('GPL-3.0-only'),
 proprietaryHeaders:joined.includes('LicenseRef-Nyrathen-Proprietary'),
 privacyManifest:existsSync(resolve(root,'native/ios/Nyrathen/PrivacyInfo.xcprivacy')),
 legalChecklist:existsSync(resolve(root,'docs/LEGAL-RELEASE-CHECKLIST.md')),
 communityRulesGate:/COMMUNITY_TERMS_KEY='nyrathen\.community\.v1'/.test(readFileSync(resolve(root,'client/main.mjs'),'utf8'))&&/Ich akzeptiere die Community-Regeln/.test(readFileSync(resolve(root,'client/main.mjs'),'utf8')),
 inAppAccountDeletion:/Onlinekonto dauerhaft löschen/.test(readFileSync(resolve(root,'client/systems.mjs'),'utf8'))&&/Gastdaten dieses Servers löschen/.test(readFileSync(resolve(root,'client/systems.mjs'),'utf8')),
 complianceSiteTemplates:['privacy.html','delete-account.html','support.html','terms.html'].every(f=>existsSync(resolve(root,'store-compliance-site',f))),
 androidNoCleartext:/usesCleartextTraffic="false"/.test(readFileSync(resolve(root,'native/android/app/src/main/AndroidManifest.xml'),'utf8')),
 noAdsTracking:!/(com\.google\.android\.gms\.ads|facebook.*ads|appsflyer|com\.adjust|firebase-analytics|facebook.*analytics)/i.test(joined),
 billingBridges:/com\.android\.billingclient:billing:9\.1\.0/.test(readFileSync(resolve(root,'native/android/app/build.gradle'),'utf8'))&&/import StoreKit/.test(readFileSync(resolve(root,'native/ios/Nyrathen/GameViewController.swift'),'utf8'))&&/api\/store\/verify/.test(readFileSync(resolve(root,'server/server.mjs'),'utf8')),
 monetizationFairness:/Keine Pay-to-Win|keine Kampfstärke|keine Kampfwerte/i.test(joined),
 storeBrandBoundary:!/(Realm of the Mad God|\bRotMG\b|\bDECA\b|\bOryx\b)/i.test(readFileSync(resolve(root,'docs/STORE-LISTING-SAFE-DRAFT.md'),'utf8')),
 serverNoBrowserSurface:/browserGame:false/.test(readFileSync(resolve(root,'server/server.mjs'),'utf8'))&&!/dist\/index\.html/.test(readFileSync(resolve(root,'server/server.mjs'),'utf8')),
 githubParityAudit:existsSync(resolve(root,'docs/GITHUB-SERVER-FUNCTION-AUDIT.md'))&&readFileSync(resolve(root,'docs/GITHUB-SERVER-FUNCTION-AUDIT.md'),'utf8').includes('59f7d377c42b4b605c69ad02c521a50041bd4586'),
 githubParityFeatures:['characterSlotPurchase','guildSetBoard','dropItem'].every(term=>joined.includes(term)),
 signedCiWorkflow:existsSync(resolve(root,'.github/workflows/mobile-store-release.yml'))&&['NYRATHEN_KEYSTORE_BASE64','NYRATHEN_IOS_CERTIFICATE_P12_BASE64','app-release.aab','Nyrathen.ipa'].every(term=>readFileSync(resolve(root,'.github/workflows/mobile-store-release.yml'),'utf8').includes(term)),
 productionTlsStack:existsSync(resolve(root,'deploy/production/Caddyfile'))&&existsSync(resolve(root,'deploy/production/compose.yaml'))&&/reverse_proxy game:3000/.test(readFileSync(resolve(root,'deploy/production/Caddyfile'),'utf8')),
 readinessAndPrivateMetrics:/path==='\/readyz'/.test(readFileSync(resolve(root,'server/server.mjs'),'utf8'))&&/path==='\/metrics'/.test(readFileSync(resolve(root,'server/server.mjs'),'utf8'))&&/METRICS_TOKEN/.test(readFileSync(resolve(root,'server/server.mjs'),'utf8')),
 storeComplianceRenderer:existsSync(resolve(root,'tools/render-store-compliance.mjs'))&&existsSync(resolve(root,'store/publisher-config.example.json')),
 storeDisclosureDrafts:['APPLE-APP-PRIVACY-DRAFT.md','GOOGLE-PLAY-DATA-SAFETY-DRAFT.md','AGE-RATING-PREP.md'].every(f=>existsSync(resolve(root,'store',f))),
 mobileLegalUrlBuild:/NYRATHEN_PRIVACY_URL/.test(readFileSync(resolve(root,'tools/build.mjs'),'utf8'))&&/NYRATHEN_DELETE_ACCOUNT_URL/.test(readFileSync(resolve(root,'.github/workflows/mobile-store-release.yml'),'utf8')),
 safeExternalLegalLinks:/request\.hasGesture\(\)/.test(readFileSync(resolve(root,'native/android/app/src/main/java/game/nyrathen/mobile/MainActivity.java'),'utf8'))&&/navigationAction\.navigationType == \.linkActivated/.test(readFileSync(resolve(root,'native/ios/Nyrathen/GameViewController.swift'),'utf8')),
 releaseBuildRequiresLegalUrls:/validate-mobile-urls\.mjs/.test(readFileSync(resolve(root,'tools/build-mobile.mjs'),'utf8')),
 storePolicy2026:existsSync(resolve(root,'tools/store-policy-preflight.mjs'))&&/targetSdk\s+36/.test(readFileSync(resolve(root,'native/android/app/build.gradle'),'utf8'))&&/Verify Xcode 26\+/.test(readFileSync(resolve(root,'.github/workflows/mobile-store-release.yml'),'utf8')),
 externalEvidenceGate:existsSync(resolve(root,'tools/release-evidence.mjs'))&&existsSync(resolve(root,'release/external-evidence.example.json')),
 productionKubernetesReference:existsSync(resolve(root,'deploy/kubernetes/game-deployment.yaml'))&&existsSync(resolve(root,'deploy/kubernetes/service-hpa-pdb.yaml')),
 securityAndEconomyAudit:existsSync(resolve(root,'tools/security-audit.mjs'))&&existsSync(resolve(root,'tools/economy-health.mjs')),
 v54Runbooks:['RELEASE-GATES-v5.4.md','BETA-DEVICE-MATRIX-v5.4.md','PRODUCTION-RUNBOOK-v5.4.md','SUPPORT-MODERATION-RUNBOOK-v5.4.md','STORE-2026-REQUIREMENTS.md'].every(f=>existsSync(resolve(root,'docs',f)))
};
if(Object.values(checks).some(v=>!v))throw new Error('Mobile release preflight failed: '+JSON.stringify(checks));
mkdirSync(resolve(root,'release'),{recursive:true});
const result={release:build.version,target:'ios+android+multiplayer-server',build:build.build,checks,runtimeSha256:createHash('sha256').update(source).digest('hex'),generatedAt:new Date().toISOString()};
writeFileSync(resolve(root,'release/mobile-preflight.json'),JSON.stringify(result,null,2));
console.log('Mobile release preflight OK',JSON.stringify(result,null,2));
