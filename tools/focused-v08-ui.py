#!/usr/bin/env python3
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'/'v08'; ART.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'dist/Nyrathen-offline.html').read_text()
checks=[]
def chk(name,ok,detail=''):
    checks.append({'name':name,'pass':bool(ok),'detail':detail})
    if not ok: print('FAIL',name,detail,flush=True)
with sync_playwright() as pw:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
    browser=pw.chromium.launch(**({'executable_path':exe} if exe else {}),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for name,w,h,mobile in [('desktop',1440,900,False),('mobile',390,844,True)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
        page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML,wait_until='load');page.wait_for_selector('#menu-screen:not(.hidden)',timeout=10000)
        chk(name+' version',page.evaluate('window.__nyrathen.version')=='5.7.0')
        chk(name+' classes',page.locator('[data-class]').count()==18)
        page.locator('[data-class="weaver"]').click();page.locator('#player-name').fill('MasteryTest');page.locator('#play-offline').click();page.wait_for_selector('#hud:not(.hidden)',timeout=10000)
        page.locator('#journal-btn' if mobile else '#side-journal').click();page.wait_for_selector('#modal[open]')
        page.locator('[data-system="mastery"]').click();page.wait_for_timeout(120)
        chk(name+' mastery cards',page.locator('.mastery-card').count()==18,str(page.locator('.mastery-card').count()))
        chk(name+' mastery total',page.locator('.mastery-total').inner_text().startswith('0 / 90 ★'))
        chk(name+' mastery visible',page.locator('.mastery-grid').is_visible())
        chk(name+' no modal overflow',page.locator('#modal').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
        page.screenshot(path=str(ART/f'mastery-{name}.png'),full_page=False)
        page.locator('#modal-close').click();page.locator('#atlas-btn').click();page.locator('[data-realm="realm-1"]').click();page.wait_for_function("window.__nyrathen.state().world.id==='realm-1'",timeout=10000);page.wait_for_timeout(500)
        st=page.evaluate('window.__nyrathen.state()');chk(name+' realm',st['world']['kind']=='realm' and len(st['enemies'])>0)
        chk(name+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        chk(name+' no JS errors',not errors,str(errors))
        page.screenshot(path=str(ART/f'game-{name}.png'),full_page=False)
        ctx.close()
    browser.close()
report={'checks':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'viewports':['1440x900','390x844'],'results':checks}
(ART/'focused-ui.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False,indent=2))
if report['failed']: raise SystemExit(1)
