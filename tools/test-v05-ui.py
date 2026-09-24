#!/usr/bin/env python3
"""Actual offline bundle UI; no fake API and no injected game state."""
from pathlib import Path
import json, os, shutil, time
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'artifacts/v05';out.mkdir(parents=True,exist_ok=True)
html=(root/'dist/Nyrathen-offline.html').read_text();checks=[];start=time.monotonic()
def check(name,value):
 checks.append({'name':name,'pass':bool(value)})
 if not value:raise AssertionError(name)
with sync_playwright() as w:
 b=w.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height,mobile in [('desktop',1440,900,False),('portrait',390,844,True),('landscape',844,390,True),('compact',360,640,True)]:
  c=b.new_context(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile,device_scale_factor=1);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(html,wait_until='load');p.locator('[data-class="ranger"]').click();p.locator('#play-offline').click()
  check(name+': current version',p.evaluate('window.__nyrathen.version')=='5.7.0')
  own="window.__nyrathen.state().players.find(p=>p.id==='local')"
  p.wait_for_timeout(120);check(name+': stationary actor marked stationary',p.evaluate(own+'.moving')==False)
  p.keyboard.down('d');p.wait_for_timeout(250);check(name+': movement flag follows actual keyboard input',p.evaluate(own+'.moving')==True)
  p.keyboard.up('d');p.wait_for_timeout(160);check(name+': released actor stops animation state',p.evaluate(own+'.moving')==False)
  p.locator('#inventory-btn').click();p.locator('.equipment-grid [data-item]').first.click()
  check(name+': real item comparison exists',p.locator('.equipment-comparison').count()==1)
  check(name+': equipped item clearly identified',p.locator('.equipment-comparison span').inner_text()=='ANGELEGT' and p.locator('.equipment-comparison b').inner_text()=='Aktiv')
  check(name+': comparison fits modal width',p.locator('#modal').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
  p.locator('.equipment-comparison').scroll_into_view_if_needed();p.screenshot(path=str(out/f'comparison-{name}.png'))
  p.locator('#modal-close').click();check(name+': comparison can be closed',p.locator('#modal').is_hidden())
  check(name+': no JavaScript errors',not errors);c.close()
 b.close()
report={'method':'Actual Chromium offline bundle, DOM/keyboard only; no mocked API or engine mutations','checks':len(checks),'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'durationSeconds':round(time.monotonic()-start,2),'limitations':['Online safety API is tested separately in Node HTTP tests, not an online browser session.','No physical device, persistent storage, native or browser HTTP proof.'],'results':checks}
(out/'v05-ui-results.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
