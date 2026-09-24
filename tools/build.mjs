// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// No network, package install, bundler service or third-party build dependency.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dataSource=readFileSync(resolve(root,'shared/data.mjs'),'utf8');
const versionMatch=dataSource.match(/export const VERSION = '([^']+)'/);
if(!versionMatch)throw new Error('VERSION fehlt in shared/data.mjs');
const VERSION=versionMatch[1];
const publicServer=(process.env.PUBLIC_SERVER_URL||'').trim();
if(publicServer&&!/^https:\/\/[^\s]+$/i.test(publicServer))throw new Error('PUBLIC_SERVER_URL muss leer oder eine HTTPS-Adresse sein.');
const publicServers=[publicServer,...String(process.env.PUBLIC_SERVER_URLS||'').split(',').map(x=>x.trim())].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
for(const url of publicServers)if(!/^https:\/\/[^\s]+$/i.test(url))throw new Error('PUBLIC_SERVER_URLS darf nur HTTPS-Adressen enthalten.');
const legalUrls={
  privacy:(process.env.NYRATHEN_PRIVACY_URL||'').trim(),
  terms:(process.env.NYRATHEN_TERMS_URL||'').trim(),
  support:(process.env.NYRATHEN_SUPPORT_URL||'').trim(),
  deleteAccount:(process.env.NYRATHEN_DELETE_ACCOUNT_URL||'').trim()
};
for(const [name,url] of Object.entries(legalUrls))if(url&&!/^https:\/\/[^\s]+$/i.test(url))throw new Error(`NYRATHEN_${name.replace(/([A-Z])/g,'_$1').toUpperCase()}_URL muss leer oder eine HTTPS-Adresse sein.`);
const attr=value=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const modules=['shared/data.mjs','shared/monetization-data.mjs','shared/endgame-data.mjs','shared/projectile.mjs','shared/engine.mjs','shared/realm-data.mjs','shared/adventure-data.mjs','shared/realm.mjs','shared/social.mjs','shared/adventure.mjs','client/i18n.mjs','client/i18n-extra.mjs','client/presentation.mjs','client/art.mjs','client/renderer.mjs','client/input.mjs','client/audio.mjs','client/protocol.mjs','shared/snapshot-wire.mjs','client/network.mjs','client/commerce.mjs','client/systems.mjs','client/main.mjs'];
let script='"use strict";\n';
script+=`(()=>{
const bootFailure=message=>{const boot=document.getElementById('boot-status');if(!boot||boot.classList.contains('hidden'))return;boot.classList.add('hidden');const panel=document.getElementById('fatal');panel.classList.remove('hidden');document.getElementById('fatal-message').textContent=String(message);document.getElementById('reload-btn').onclick=()=>location.reload();document.getElementById('error-log-btn').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({stage:'initialization',message:String(message),version:'${VERSION}'},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='nyrathen-startfehler.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};};
window.addEventListener('error',e=>bootFailure(e.message));
window.addEventListener('unhandledrejection',e=>bootFailure(e.reason?.message||e.reason));
setTimeout(()=>bootFailure('Start dauert ungewöhnlich lange. Bitte Fehlerbericht speichern und neu laden.'),12000);
})();\n`;
script+='(()=>{\n';
for(const path of modules){
  let code=readFileSync(resolve(root,path),'utf8');
  code=code.replace(/^import\s+[^;]+;\s*$/gm,'').replace(/^export\s+(?=(?:const|let|function|class)\b)/gm,'');
  if(/^\s*(import|export)\s/m.test(code))throw new Error('Unsupported module syntax in '+path);
  script+='\n// --- '+path+' ---\n'+code+'\n';
}
script+='\n})();\n';
// Verify syntax before shipping or copying the client into native projects.
new Function(script);
script=script.replace(/<\/script/gi,'<\\/script');
const css=readFileSync(resolve(root,'client/styles.css'),'utf8');
const html=readFileSync(resolve(root,'client/index.html'),'utf8').replaceAll('VERSION_INSERT',VERSION).replace('PUBLIC_SERVER_INSERT',()=>attr(publicServer)).replace('PUBLIC_SERVERS_INSERT',()=>attr(publicServers.join(','))).replace('PRIVACY_URL_INSERT',()=>attr(legalUrls.privacy)).replace('TERMS_URL_INSERT',()=>attr(legalUrls.terms)).replace('SUPPORT_URL_INSERT',()=>attr(legalUrls.support)).replace('DELETE_ACCOUNT_URL_INSERT',()=>attr(legalUrls.deleteAccount)).replace('/* STYLE_INSERT */',()=>css).replace('/* SCRIPT_INSERT */',()=>script);
const hash=createHash('sha256').update(html).digest('hex').slice(0,12);
const output=resolve(root,'dist');mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'index.html'),html);
const nativeOffline=html.replace('<meta name="nyrathen-hosting" content="integrated">','<meta name="nyrathen-hosting" content="native">');
for(const f of ['icon-192.png','icon-512.png'])if(existsSync(resolve(root,'public',f)))copyFileSync(resolve(root,'public',f),resolve(output,f));
for(const folder of ['native/android/app/src/main/assets/game','native/ios/Nyrathen/Web']){
  const dest=resolve(root,folder);mkdirSync(dest,{recursive:true});writeFileSync(resolve(dest,'index.html'),nativeOffline);
  for(const f of ['icon-192.png','icon-512.png'])if(existsSync(resolve(output,f)))copyFileSync(resolve(output,f),resolve(dest,f));
}
writeFileSync(resolve(output,'build-info.json'),JSON.stringify({version:VERSION,build:hash,sourceModules:modules,bytes:Buffer.byteLength(html),releaseTarget:'native-mobile',browserRelease:false,nativeBinariesBuilt:false},null,2));
console.log(`Built Nyrathen ${hash}: ${Buffer.byteLength(html)} bytes. Android + iOS web assets synchronized.`);
