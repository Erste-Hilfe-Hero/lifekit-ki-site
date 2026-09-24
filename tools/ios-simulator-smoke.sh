#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="${NYRATHEN_IOS_APP_PATH:-$ROOT/native/ios/build/Build/Products/Debug-iphonesimulator/Nyrathen.app}"
BUNDLE_ID="${NYRATHEN_IOS_BUNDLE_ID:-game.nyrathen.mobile}"
OUT="${NYRATHEN_IOS_SMOKE_OUT:-$ROOT/release/ios-ci/latest}"
mkdir -p "$OUT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "iOS simulator smoke test requires macOS." >&2
  exit 2
fi
command -v xcodebuild >/dev/null
command -v xcrun >/dev/null
[[ -d "$APP_PATH" ]] || { echo "Simulator app missing: $APP_PATH" >&2; exit 3; }

xcodebuild -version | tee "$OUT/xcode-version.txt"
xcrun simctl list devices available -j > "$OUT/devices.json"

UDID="$(python3 - "$OUT/devices.json" <<'PY'
import json,re,sys
p=sys.argv[1]
d=json.load(open(p,encoding='utf-8'))
rows=[]
for runtime,devices in d.get('devices',{}).items():
    if 'iOS-' not in runtime:
        continue
    m=re.search(r'iOS-(\d+)(?:-(\d+))?',runtime)
    version=(int(m.group(1)),int(m.group(2) or 0)) if m else (0,0)
    for dev in devices:
        if not dev.get('isAvailable',True):
            continue
        name=str(dev.get('name',''))
        if not name.startswith('iPhone'):
            continue
        # Prefer current runtime, then Pro-class phones, then all other iPhones.
        rank=2 if 'Pro' in name else (0 if 'SE' in name else 1)
        rows.append((version,rank,name,dev.get('udid','')))
if not rows:
    raise SystemExit('No available iPhone simulator found')
rows.sort(reverse=True)
print(rows[0][3])
PY
)"

[[ -n "$UDID" ]] || { echo "No iPhone simulator UDID selected" >&2; exit 4; }
python3 - "$OUT/devices.json" "$UDID" > "$OUT/simulator-device.json" <<'PY'
import json,sys
src,udid=sys.argv[1:]
d=json.load(open(src,encoding='utf-8'))
for runtime,devices in d.get('devices',{}).items():
    for dev in devices:
        if dev.get('udid')==udid:
            print(json.dumps({'runtime':runtime,'name':dev.get('name'),'udid':udid,'state':dev.get('state')},indent=2))
            raise SystemExit(0)
raise SystemExit('selected simulator not found')
PY

cleanup() {
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl uninstall "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl install "$UDID" "$APP_PATH"

{
  echo "bundle_id=$BUNDLE_ID"
  echo "app_path=$APP_PATH"
  /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PATH/Info.plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Info.plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP_PATH/Info.plist" 2>/dev/null || true
} > "$OUT/app-metadata.txt"

LAUNCH="$(xcrun simctl launch "$UDID" "$BUNDLE_ID")"
printf '%s\n' "$LAUNCH" | tee "$OUT/launch.txt"
PID="$(printf '%s\n' "$LAUNCH" | sed -nE 's/.*: ([0-9]+)$/\1/p' | tail -1)"
[[ -n "$PID" ]] || { echo "Could not determine simulator process id" >&2; exit 5; }

sleep "${NYRATHEN_IOS_SMOKE_SECONDS:-12}"
xcrun simctl spawn "$UDID" ps -Ao pid,comm > "$OUT/processes.txt" || true
if ! grep -Eq "^[[:space:]]*${PID}[[:space:]]" "$OUT/processes.txt"; then
  echo "Nyrathen exited before the smoke window completed (pid $PID)." >&2
  xcrun simctl spawn "$UDID" log show --style compact --last 3m --predicate 'process == "Nyrathen"' > "$OUT/simulator.log" 2>&1 || true
  exit 6
fi

xcrun simctl io "$UDID" screenshot "$OUT/nyrathen-ios-simulator.png"
xcrun simctl spawn "$UDID" log show --style compact --last 3m --predicate 'process == "Nyrathen"' > "$OUT/simulator.log" 2>&1 || true

python3 - "$OUT" "$PID" <<'PY'
import json,os,sys,time
out,pid=sys.argv[1:]
report={
  'status':'passed',
  'kind':'unsigned-ios-simulator-smoke',
  'pid':int(pid),
  'screenshot':os.path.join(out,'nyrathen-ios-simulator.png'),
  'appleDeveloperMembershipRequired':False,
  'physicalDeviceTestPerformed':False,
  'testFlightUploadPerformed':False,
  'finishedAtEpoch':int(time.time()),
}
with open(os.path.join(out,'result.json'),'w',encoding='utf-8') as f:
  json.dump(report,f,indent=2)
print(json.dumps(report,indent=2))
PY
