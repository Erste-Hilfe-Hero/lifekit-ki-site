#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
from pathlib import Path
import os, shutil, json
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'dist/index.html').read_text()
checks={
 'de':('Einstellungen','Magier','Sternenbruch'),
 'en':('Settings','Mage','Starbreak'),
 'fr':('Paramètres','Mage','Brise-Étoile'),
 'es':('Ajustes','Mago','Ruptura Estelar'),
 'it':('Impostazioni','Mago','Frattura Stellare'),
 'pt':('Configurações','Mago','Ruptura Estelar'),
 'tr':('Ayarlar','Büyücü','YILDIZ KIRILMASI'),
}
out=ROOT/'release/verification/v5.7/locales7';out.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as pw:
 exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
 browser=pw.chromium.launch(executable_path=exe,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 locale_tags={'de':'de-DE','en':'en-US','fr':'fr-FR','es':'es-ES','it':'it-IT','pt':'pt-BR','tr':'tr-TR'}
 for loc,(settings_name,class_name,ability_name) in checks.items():
  ctx=browser.new_context(viewport={'width':1280,'height':720},locale=locale_tags[loc])
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content(HTML,wait_until='load');page.wait_for_selector('#menu-screen:not(.hidden)',timeout=6000)
  mage=page.locator('[data-class="weaver"]');mage.click();page.wait_for_timeout(80)
  body=page.locator('body').inner_text();ok_class=class_name.casefold() in body.casefold();ok_ability=ability_name.casefold() in body.casefold()
  page.locator('#menu-settings').click();page.wait_for_selector('#language-setting',timeout=3000);page.wait_for_timeout(80)
  body2=page.locator('#modal').inner_text();select=page.locator('#language-setting');options=select.locator('option').count();current=select.input_value()
  ok=settings_name in body2 and ok_class and ok_ability and options==7 and current==loc and not errors
  page.screenshot(path=str(out/f'{loc}.png'),full_page=True)
  rows.append({'locale':loc,'ok':ok,'settings':settings_name in body2,'class':ok_class,'ability':ok_ability,'options':options,'current':current,'pageErrors':errors})
  ctx.close()
 browser.close()
report={'ok':all(r['ok'] for r in rows),'locales':rows}
(out/'locales7-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if not report['ok']: raise SystemExit(1)
