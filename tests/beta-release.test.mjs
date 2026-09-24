import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('closed beta workflow builds Android API 36 AAB and can target Play internal',()=>{
 const w=read('.github/workflows/mobile-beta.yml');
 assert.match(w,/platforms;android-36/);
 assert.match(w,/node tools\/build-mobile\.mjs android-bundle/);
 assert.match(w,/r0adkll\/upload-google-play@v1/);
 assert.match(w,/tracks: internal/);
 assert.match(w,/packageName: game\.nyrathen\.mobile/);
});
test('closed beta workflow builds signed iOS archive and can upload TestFlight',()=>{
 const w=read('.github/workflows/mobile-beta.yml');
 assert.match(w,/Verify Xcode 26\+/);
 assert.match(w,/node tools\/build-mobile\.mjs ios-archive/);
 assert.match(w,/apple-actions\/upload-testflight-build@v5/);
 assert.match(w,/backend: AppStoreAPI/);
 assert.match(w,/APPSTORE_API_PRIVATE_KEY/);
});
test('beta pack includes all seven Play release-note locales and physical device result sheet',()=>{
 for(const locale of ['de-DE','en-US','fr-FR','es-ES','it-IT','pt-BR','tr-TR']){
  assert.equal(existsSync(new URL(`../release/beta-v5.7/google-play/whatsnew/whatsnew-${locale}`,import.meta.url)),true,locale);
 }
 const csv=read('release/beta-v5.7/device-results.csv');
 assert.match(csv,/platform,device,os_version/);
 assert.match(read('release/beta-v5.7/TESTER-INSTRUCTIONS.md'),/30 minutes/);
});
test('beta upload remains explicit and fail-closed rather than automatic on push',()=>{
 const w=read('.github/workflows/mobile-beta.yml');
 assert.match(w,/workflow_dispatch/);
 assert.doesNotMatch(w,/\bpush:/);
 assert.match(w,/if: \$\{\{ inputs\.upload_google_play \}\}/);
 assert.match(w,/if: \$\{\{ inputs\.upload_testflight \}\}/);
});
