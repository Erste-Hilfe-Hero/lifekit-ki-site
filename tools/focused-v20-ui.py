#!/usr/bin/env python3
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'/'v20-focused'; ART.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'dist/Nyrathen-offline.html').read_text()
checks=[]
def check(name, ok, detail=''):
    checks.append({'name':name,'pass':bool(ok),'detail':str(detail)})
    if not ok: print('FAIL',name,detail,flush=True)

def own(page):
    st=page.evaluate('window.__nyrathen.state()')
    return next(p for p in st['players'] if p['id']=='local')

def tab(page,id):
    page.locator(f'[data-system="{id}"]').click(); page.wait_for_timeout(40)

def run_view(browser,name,w,h,mobile):
    ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
    page=ctx.new_page(); errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(HTML,wait_until='load'); page.wait_for_selector('#menu-screen:not(.hidden)')
    check(f'{name}: boot',page.locator('#fatal').is_hidden(),errors)
    check(f'{name}: version',page.evaluate('window.__nyrathen.version')=='5.7.0')
    check(f'{name}: 19 class menu cards',page.locator('[data-class]').count()==19,page.locator('[data-class]').count())
    check(f'{name}: druid present',page.locator('[data-class="druid"]').count()==1)
    page.locator('[data-class="druid"]').click(); page.locator('#player-name').fill('TestDruid')
    page.locator('#play-offline').click(); page.wait_for_selector('#hud:not(.hidden)'); page.wait_for_timeout(120)
    check(f'{name}: nexus',page.evaluate('window.__nyrathen.state().world.kind')=='nexus')
    page.locator('#journal-btn' if mobile else '#side-journal').click(); page.wait_for_selector('#modal[open]')
    check(f'{name}: class selector 19',page.locator('#new-character-class option').count()==19)
    tab(page,'progression')
    check(f'{name}: account level visible','STUFE 1 / 50' in page.locator('.system-body').inner_text())
    check(f'{name}: 4 unlock rows',page.locator('.progression-row').count()==4,page.locator('.progression-row').count())
    check(f'{name}: 19 ascension cards',page.locator('.mastery-card').count()==19,page.locator('.mastery-card').count())
    page.screenshot(path=str(ART/f'progression-{name}.png'),full_page=False)
    tab(page,'season')
    check(f'{name}: 6 season missions',page.locator('[data-season-mission]').count()==6,page.locator('[data-season-mission]').count())
    check(f'{name}: 20 season pass levels',page.locator('[data-pass-level]').count()==20,page.locator('[data-pass-level]').count())
    check(f'{name}: 3 crucible modes',page.locator('[data-crucible]').count()==3,page.locator('[data-crucible]').count())
    page.screenshot(path=str(ART/f'season-{name}.png'),full_page=False)
    tab(page,'pets')
    txt=page.locator('.system-body').inner_text()
    check(f'{name}: pet lock at account level 5','Kontostufe 5' in txt,txt[:180])
    tab(page,'enchanter'); check(f'{name}: enchanter lock 17','Kontostufe 17' in page.locator('.system-body').inner_text())
    tab(page,'forge')
    check(f'{name}: forge lock 23','Kontostufe 23' in page.locator('.system-body').inner_text())
    check(f'{name}: 3 forge recipes',page.locator('[data-forge-recipe]').count()==3,page.locator('[data-forge-recipe]').count())
    tab(page,'mastery'); check(f'{name}: 19 mastery cards',page.locator('.mastery-card').count()==19,page.locator('.mastery-card').count())
    tab(page,'dungeons'); check(f'{name}: 14 dungeons',page.locator('[data-dungeon]').count()==14,page.locator('[data-dungeon]').count())
    page.locator('#modal-close').click(); page.wait_for_timeout(60)
    page.locator('#atlas-btn').click(); page.wait_for_selector('#modal[open]')
    page.locator('[data-realm="realm-1"]').click(); page.wait_for_function("window.__nyrathen.state().world.kind==='realm'")
    page.wait_for_timeout(1000)
    check(f'{name}: realm enemies',len(page.evaluate('window.__nyrathen.state().enemies'))>0)
    check(f'{name}: no JS page errors',len(errors)==0,errors)
    check(f'{name}: no horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
    page.screenshot(path=str(ART/f'game-{name}.png'),full_page=False)
    ctx.close()

with sync_playwright() as pw:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
    browser=pw.chromium.launch(**({'executable_path':exe} if exe else {}),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    run_view(browser,'desktop',1440,900,False)
    run_view(browser,'mobile',390,844,True)
    browser.close()

result={'checks':len(checks),'passed':sum(x['pass'] for x in checks),'failed':[x for x in checks if not x['pass']]}
(ART/'focused-ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if result['failed'] else 0)
