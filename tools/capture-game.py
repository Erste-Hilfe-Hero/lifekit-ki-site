#!/usr/bin/env python3
"""Actual runtime captures via normal player input; no injected game state or mockups."""
from pathlib import Path
import os,shutil,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'artifacts/v05';html=(root/'dist/Nyrathen-offline.html').read_text();out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as w:
 b=w.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,width,height,touch in [('desktop',1440,900,False),('mobile',390,844,True)]:
  c=b.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch,device_scale_factor=1);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(html,wait_until='load');p.locator('[data-class="ranger"]').click();p.locator('#player-name').fill('Ali');p.locator('#menu-screen').evaluate('(e)=>e.scrollTop=0');p.screenshot(path=str(out/f'release-classes-{label}.png'))
  p.locator('#play-offline').click();p.wait_for_timeout(3700);p.screenshot(path=str(out/f'release-nexus-{label}.png'))
  p.locator('#journal-btn' if touch else '#side-journal').click();p.locator('[data-system="dungeons"]').click();p.screenshot(path=str(out/f'release-dungeons-{label}.png'));p.locator('#modal-close').click()
  p.locator('#atlas-btn').click();p.locator('[data-realm="realm-1"]').click();p.wait_for_timeout(3700)
  # Advance while firing; briefly strafe rather than standing still under the boss.
  p.locator('#auto-btn').click();p.keyboard.down('w');p.wait_for_timeout(1250);p.keyboard.up('w');p.keyboard.down('a');p.keyboard.press('q');p.wait_for_timeout(260);p.keyboard.up('a')
  assert p.locator('#fatal').is_hidden();s=p.evaluate('window.__nyrathen.state()');own=next(q for q in s['players'] if q['id']=='local');assert not own['dead']
  p.screenshot(path=str(out/f'release-combat-{label}.png'));results.append({'viewport':label,'world':s['world']['id'],'alive':not own['dead'],'projectiles':len(s['bullets']),'events':[e['type'] for e in s['events'][-12:]],'errors':errors});assert not errors;c.close()
 b.close()
(out/'capture-proof.json').write_text(json.dumps({'method':'Actual bundled client, normal DOM/keyboard controls, no injected game state','scenes':results},indent=2))
print('Captured actual class selection, Nexus, dungeon codex and live combat in desktop/mobile viewports.')
