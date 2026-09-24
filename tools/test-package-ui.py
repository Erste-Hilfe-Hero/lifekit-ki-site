#!/usr/bin/env python3
"""Additional v0.5 UI coverage on the actual bundled client; no game-state injection."""
from pathlib import Path
import os,shutil,json,time
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'artifacts/v05';out.mkdir(parents=True,exist_ok=True)
html=(root/'dist/Nyrathen-offline.html').read_text();results=[];start=time.monotonic()
def check(name,value):
 results.append({'name':name,'pass':bool(value)})
 if not value:raise AssertionError(name)
with sync_playwright() as w:
 b=w.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height,touch in [('desktop',1440,900,False),('portrait',390,844,True),('landscape',844,390,True),('compact',360,640,True)]:
  c=b.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch,device_scale_factor=2);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(html,wait_until='load');p.locator('#play-online').click()
  p.locator('.invite-details summary').click();p.locator('#invite-input').fill('https://game.example/#join=FRANKFURT');p.locator('#apply-invite').click()
  check(name+': invitation fills server',p.locator('#server-url').input_value()=='https://game.example')
  check(name+': invitation fills region',p.locator('#room-code').input_value()=='FRANKFURT')
  check(name+': invitation does not auto-connect',p.evaluate("window.__nyrathen.mode()")=='menu')
  p.locator('#invite-input').fill('https://user:secret@game.example/#join=PUBLIC');p.locator('#apply-invite').click()
  check(name+': credential URL visibly rejected',bool(p.locator('#connect-error').inner_text()) and p.locator('#room-code').input_value()=='FRANKFURT')
  p.locator('#modal-close').click();p.locator('#play-offline').click();p.locator('#mobile-settings' if touch else '#hud-settings').click()
  for field in ['#volume-setting','#numbers-setting','#objectives-setting','#zoom-setting','#opacity-setting']:
   check(name+': new field present '+field,p.locator(field).count()==1)
  p.locator('#volume-setting').press('End');p.locator('#volume-setting').press('ArrowLeft')
  p.locator('#zoom-setting').select_option('1.4');p.locator('#opacity-setting').select_option('0.35');p.locator('#numbers-setting').uncheck();p.locator('#objectives-setting').uncheck();p.locator('#quality-setting').select_option('low')
  p.locator('#modal-close').click();p.wait_for_timeout(180)
  check(name+': low-power mode keeps game active',p.evaluate('window.__nyrathen.state().world.id')=='nexus' and p.locator('#fatal').is_hidden())
  p.locator('#mobile-settings' if touch else '#hud-settings').click()
  check(name+': volume retained within running app',p.locator('#volume-setting').input_value()=='99')
  check(name+': zoom retained within running app',p.locator('#zoom-setting').input_value()=='1.4')
  check(name+': ally visibility retained',p.locator('#opacity-setting').input_value()=='0.35')
  check(name+': damage toggle retained',not p.locator('#numbers-setting').is_checked())
  check(name+': objective toggle retained',not p.locator('#objectives-setting').is_checked())
  check(name+': low-power option retained',p.locator('#quality-setting').input_value()=='low')
  check(name+': no horizontal settings overflow',p.evaluate('document.documentElement.scrollWidth <= innerWidth'))
  p.locator('#modal').evaluate('(e)=>e.scrollTop=0');p.screenshot(path=str(out/f'package-settings-{name}.png'))
  p.locator('#zoom-setting').select_option('0.8');p.locator('#opacity-setting').select_option('1');p.locator('#numbers-setting').check();p.locator('#objectives-setting').check();p.locator('#quality-setting').select_option('high');p.locator('#modal-close').click()
  p.locator('#atlas-btn').click();p.locator('[data-realm="realm-1"]').click();p.wait_for_timeout(200)
  check(name+': new renderer settings allow Realm entry',p.evaluate("window.__nyrathen.state().world.id==='realm-1'"))
  check(name+': settings do not cause uncaught runtime errors',not errors)
  c.close()
 b.close()
report={'method':'Actual Chromium UI at DPR 2; invitations never connected to example host; no engine mutation','checks':len(results),'passed':sum(x['pass'] for x in results),'failed':sum(not x['pass'] for x in results),'durationSeconds':round(time.monotonic()-start,2),'limitations':['Settings retained in the current app instance; durable browser storage not certified.','No physical devices, native runtime, public hosting or live browser HTTP tested.'],'results':results}
(out/'package-ui-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False,indent=2))
