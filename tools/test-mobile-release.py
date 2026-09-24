#!/usr/bin/env python3
from pathlib import Path
import json, os, shutil, time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'/'v40'; ART.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'native/android/app/src/main/assets/game/index.html').read_text()
LEGAL_HTML=HTML.replace('name=\"nyrathen-privacy-url\" content=\"\"','name=\"nyrathen-privacy-url\" content=\"https://legal.nyrathen.test/privacy\"').replace('name=\"nyrathen-terms-url\" content=\"\"','name=\"nyrathen-terms-url\" content=\"https://legal.nyrathen.test/terms\"').replace('name=\"nyrathen-support-url\" content=\"\"','name=\"nyrathen-support-url\" content=\"https://legal.nyrathen.test/support\"').replace('name=\"nyrathen-delete-account-url\" content=\"\"','name=\"nyrathen-delete-account-url\" content=\"https://legal.nyrathen.test/delete\"')
checks=[]
def ck(name, cond, detail=''):
    checks.append({'name':name,'pass':bool(cond),'detail':detail})
    if not cond: print('FAIL',name,detail,flush=True)
def box(page,sel): return page.locator(sel).bounding_box()
def within(r,w,h): return bool(r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1)
start=time.monotonic()
with sync_playwright() as pw:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
    browser=pw.chromium.launch(**({'executable_path':exe} if exe else {}),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for name,w,h in [('iphone',390,844),('android',412,915)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=True,has_touch=True)
        page=ctx.new_page(); errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(LEGAL_HTML,wait_until='load'); page.wait_for_selector('#menu-screen:not(.hidden)',timeout=6000)
        ck(name+' boot',page.locator('#fatal').is_hidden())
        ck(name+' version',page.evaluate('window.__nyrathen.version')=='5.7.0')
        ck(name+' 19 classes',page.locator('[data-class]').count()==19)
        ck(name+' no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.locator('#menu-settings').click(); page.wait_for_selector('#legal-button',timeout=3000); page.locator('#legal-button').click();
        page.wait_for_selector('.legal-link',timeout=3000); links=page.locator('.legal-link'); ck(name+' legal links',links.count()==4,str(links.count()))
        hrefs=links.evaluate_all("els=>els.map(e=>e.href)"); ck(name+' legal https',all(x.startswith('https://legal.nyrathen.test/') for x in hrefs),str(hrefs))
        page.locator('#legal-back').click(); page.locator('#modal-close').click()
        page.locator('#player-name').fill('MobileQA'); page.locator('[data-class="druid"]').click()
        page.locator('#play-online').click(); page.wait_for_selector('#community-rules-accept',timeout=3000)
        ck(name+' community gate',page.locator('#community-rules-continue').is_disabled())
        page.locator('#community-rules-accept').check(); page.locator('#community-rules-continue').click(); page.wait_for_selector('#room-code',timeout=3000)
        ck(name+' online region',page.locator('#room-code').input_value()=='PUBLIC')
        ck(name+' no fake server',page.locator('#server-url').input_value()=='')
        page.locator('#modal-close').click(); page.locator('#play-offline').click(); page.wait_for_selector('#hud:not(.hidden)',timeout=3000)
        st=page.evaluate('window.__nyrathen.state()')
        ck(name+' nexus',st['world']['id']=='nexus')
        for sel in ['#move-stick','#aim-stick','#heal-btn','#ability-btn','#inventory-btn','#journal-btn','#mobile-settings']:
            r=box(page,sel); ck(name+' viewport '+sel,within(r,w,h),str(r))
        for sel in ['#heal-btn','#ability-btn','#move-stick','#aim-stick']:
            r=box(page,sel); ck(name+' touch '+sel,r and r['width']>=44 and r['height']>=44,str(r))
        page.locator('#journal-btn').click(); page.wait_for_selector('.character-roster',timeout=3000)
        body=page.locator('#modal').inner_text()
        ck(name+' four base slots','4 freigeschaltete Charakterplätze' in body)
        ck(name+' character selector 19',page.locator('#new-character-class option').count()==19)
        page.locator('#modal-close').click(); page.locator('#inventory-btn').click(); page.wait_for_selector('.item-grid',timeout=3000)
        ck(name+' inventory 8',page.locator('.item-grid .item-cell').count()==8)
        page.screenshot(path=str(ART/f'mobile-release-{name}.png'))
        ck(name+' no JS errors',not errors,str(errors))
        ctx.close()
    browser.close()
report={'release':'5.7.0','kind':'Embedded native WebView runtime mobile release checks','checks':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'viewports':['390x844 iPhone-like','412x915 Android-like'],'durationSeconds':round(time.monotonic()-start,2),'results':checks}
(ART/'mobile-ui-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False,indent=2))
if report['failed']: raise SystemExit(1)
