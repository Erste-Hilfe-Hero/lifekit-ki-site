#!/usr/bin/env python3
"""Real same-origin HTTP, localStorage, PWA and two-browser networking. Never override browser security."""
from pathlib import Path
import json, os, re, shutil, socket, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/v05';ART.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,value):
    checks.append({'name':name,'pass':bool(value)})
    if not value: raise AssertionError(name)
def state(page):return page.evaluate('window.__nyrathen.state()')
start=time.monotonic();status='not run';error='';contexts=[];base=''
with tempfile.TemporaryDirectory(prefix='nyrathen-browser-') as temp:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    base=f'http://127.0.0.1:{port}'
    logfile=open(ART/'browser-live-server.log','w')
    server=subprocess.Popen(['node','server/server.mjs'],cwd=ROOT,env={**os.environ,'HOST':'127.0.0.1','PORT':str(port),'DATA_PATH':temp+'/world.sqlite'},stdout=logfile,stderr=subprocess.STDOUT)
    try:
        for _ in range(60):
            try:
                with urllib.request.urlopen(base+'/health',timeout=1) as r:
                    if r.status==200:break
            except Exception:time.sleep(.1)
        with sync_playwright() as w:
            browser=w.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                c=browser.new_context(viewport={'width':1440,'height':900});contexts.append(c);page=c.new_page()
                try:
                    response=page.goto(base,wait_until='domcontentloaded',timeout=10000)
                    page.wait_for_selector('#play-offline',timeout=5000)
                except Exception as e:
                    status='environment blocked';error=str(e)[:800]
                    (ART/'browser-http-response.txt').write_text(page.content()[:3000]);raise RuntimeError('LIVE_BROWSER_UNAVAILABLE')
                status='running';check('actual HTTP response is 200',response.status==200)
                page.locator('#player-name').fill('SicherAli');page.locator('#play-offline').click();page.wait_for_selector('#hud:not(.hidden)')
                check('solo writes real localStorage on HTTP origin',page.evaluate("!!localStorage.getItem('nyrathen.save.v3')"))
                page.reload(wait_until='domcontentloaded');page.wait_for_selector('#play-offline');check('reload restores saved name',page.locator('#player-name').input_value()=='SicherAli')
                page.locator('#play-offline').click();page.wait_for_selector('#hud:not(.hidden)');check('reload restores character',state(page)['players'][0]['name']=='SicherAli')
                page.locator('#hud-settings').click();page.locator('#zoom-setting').select_option('1.2');page.locator('#opacity-setting').select_option('0.35');page.locator('#numbers-setting').uncheck();page.locator('#resume-button').click()
                check('preferences actually persist',page.evaluate("JSON.parse(localStorage.getItem('nyrathen.settings.v2')).zoom===1.2"))
                page.locator('#hud-settings').click();page.locator('#reset-button').click();page.locator('#confirm-delete').click();page.locator('#play-offline').click()
                check('destructive reset does not resurrect old bundle',len(state(page)['players'][0]['account']['characters'])==1)
                page.locator('#hud-settings').click();page.locator('#main-menu-button').click()
                page.locator('#play-online').click();page.locator('#probe-server').click();page.wait_for_function("document.querySelector('#server-report').textContent.includes('Bereit')")
                check('server probe reads a live health endpoint', 'Version 5.7.0' in page.locator('#server-report').inner_text())
                page.locator('#room-code').fill('BROWSER');page.locator('#connect-button').click();page.wait_for_function("window.__nyrathen.mode()==='online'")
                c2=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);contexts.append(c2);b=c2.new_page();b.goto(base);b.wait_for_selector('#player-name');b.locator('#player-name').fill('Gefaehrte');b.locator('#play-online').click();b.locator('#room-code').fill('BROWSER');b.locator('#connect-button').click();b.wait_for_function("window.__nyrathen.mode()==='online'&&window.__nyrathen.state().players.length===2")
                page.wait_for_function("window.__nyrathen.state().players.length===2")
                check('two independent browsers share real Nexus',state(page)['seed']==state(b)['seed'])
                for target in [page,b]:target.locator('#atlas-btn').click();target.locator('[data-realm="realm-1"]').click();target.wait_for_function("window.__nyrathen.state().world.id==='realm-1'")
                own=next(p for p in state(page)['players'] if 'inventory' in p);pid=own['id'];start_y=own['y']
                page.keyboard.down('w');page.wait_for_timeout(900);page.keyboard.up('w');b.wait_for_function('(id)=>window.__nyrathen.state().players.some(p=>p.id===id&&p.y<3500)',arg=pid)
                check('mobile browser receives remote keyboard movement',next(p for p in state(b)['players'] if p['id']==pid)['y']<start_y-80)
                check('remote browser cannot inspect other inventory','inventory' not in next(p for p in state(b)['players'] if p['id']==pid))
                page.locator('#nexus-btn').click();b.locator('#nexus-btn').click();page.wait_for_function("window.__nyrathen.state().world.kind==='nexus'")
                c.set_offline(True);time.sleep(1);c.set_offline(False);page.wait_for_function("window.__nyrathen.state().players.some(p=>p.name==='Gefaehrte')",timeout=12000);page.wait_for_timeout(2500)
                check('same account survives browser network interruption',next(p for p in state(page)['players'] if 'inventory' in p)['id']==pid)
                page.locator('#hud-settings').click();page.locator('#connection-button').click();check('invitation never contains account token',page.locator('#share-link').input_value()==base+'/#join=BROWSER')
                page.screenshot(path=str(ART/'connection-live.png'));page.locator('#modal-close').click();page.screenshot(path=str(ART/'multiplayer-live-desktop.png'));b.screenshot(path=str(ART/'multiplayer-live-mobile.png'))
                # The standalone app shell is a separate context and account, never a live online session.
                cp=browser.new_context();contexts.append(cp);pp=cp.new_page();pp.goto(base);pp.wait_for_selector('#play-offline');pp.evaluate('navigator.serviceWorker.ready');pp.reload();pp.wait_for_selector('#play-offline');pp.wait_for_function('!!navigator.serviceWorker.controller')
                cp.set_offline(True);pp.reload();pp.wait_for_selector('#play-offline');pp.locator('#play-offline').click();pp.wait_for_selector('#hud:not(.hidden)');check('installed service worker boots playable solo without network',pp.evaluate("window.__nyrathen.mode()==='offline'"));status='passed'
            finally:
                for context in contexts:context.close()
                browser.close()
    except Exception as e:
        if status!='environment blocked':status='failed';error=str(e)
    finally:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
        logfile.close()
report={'status':status,'checks':len(checks),'passed':sum(c['pass'] for c in checks),'durationSeconds':round(time.monotonic()-start,2),'error':error,'results':checks,'limitations':['Chromium only, no physical device or Safari tests.','Loopback HTTP only, no public TLS deployment.']}
(ART/'browser-live.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
if status=='failed':raise SystemExit(1)
