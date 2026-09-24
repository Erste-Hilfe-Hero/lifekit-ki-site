import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('iOS CI uses a GitHub macOS runner and Xcode 26+ without Apple signing',()=>{
  const w=read('.github/workflows/ios-simulator-ci.yml');
  assert.match(w,/runs-on: macos-latest/);
  assert.match(w,/Verify Xcode 26\+/);
  assert.match(w,/npm run build:ios/);
  assert.doesNotMatch(w,/NYRATHEN_DEVELOPMENT_TEAM/);
  assert.doesNotMatch(w,/PROVISIONING_PROFILE/);
});

test('iOS CI boots an actual iPhone simulator, installs Nyrathen and captures evidence',()=>{
  const w=read('.github/workflows/ios-simulator-ci.yml');
  const s=read('tools/ios-simulator-smoke.sh');
  assert.match(w,/ios-simulator-smoke\.sh/);
  assert.match(s,/simctl bootstatus/);
  assert.match(s,/simctl install/);
  assert.match(s,/simctl launch/);
  assert.match(s,/simctl io .* screenshot/);
  assert.match(s,/game\.nyrathen\.mobile/);
  assert.ok((statSync(new URL('../tools/ios-simulator-smoke.sh',import.meta.url)).mode & 0o111)!==0);
});

test('iOS simulator evidence explicitly does not pretend to be TestFlight or physical-device evidence',()=>{
  const s=read('tools/ios-simulator-smoke.sh');
  assert.match(s,/appleDeveloperMembershipRequired.*False/);
  assert.match(s,/physicalDeviceTestPerformed.*False/);
  assert.match(s,/testFlightUploadPerformed.*False/);
});
