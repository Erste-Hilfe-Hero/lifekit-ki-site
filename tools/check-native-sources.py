#!/usr/bin/env python3
"""Static resources and optional Swift syntax only. This is NOT a native build."""
from pathlib import Path
import json, plistlib, shutil, subprocess, xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
xmls=list((root/'native/android').rglob('*.xml'))+list((root/'native/ios').rglob('*.storyboard'))
for f in xmls:ET.parse(f)
plists=list((root/'native/ios').rglob('*.plist'))
for f in plists:plistlib.loads(f.read_bytes())
swift=list((root/'native/ios').rglob('*.swift'));compiler=shutil.which('swiftc')
swift_status='not available'
if compiler:
    result=subprocess.run([compiler,'-frontend','-parse',*map(str,swift)],capture_output=True,text=True)
    if result.returncode:raise SystemExit(result.stderr)
    swift_status='syntax parsed only; Apple frameworks not type-checked or linked'
report={'xmlResourcesParsed':len(xmls),'plistsParsed':len(plists),'swiftFiles':len(swift),'swift':swift_status,'androidSdkBuild':False,'xcodeBuild':False,'apkAabIpaBuilt':False,'deviceRuntimeTest':False}
out=root/'artifacts/v05/native-source-check.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
