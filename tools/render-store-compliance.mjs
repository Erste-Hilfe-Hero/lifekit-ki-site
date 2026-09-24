#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=process.argv[2]||resolve(root,'store/publisher-config.json');
const target=process.argv[3]||resolve(root,'release/compliance-site');
let config;try{config=JSON.parse(readFileSync(source,'utf8'));}catch(error){console.error('Publisher-Konfiguration konnte nicht gelesen werden:',error.message);process.exit(1);}
const required=['publisherName','publisherEmail','publisherPostalAddress','privacyContact','effectiveDate','productionServerOperator','privacyUrl','termsUrl','supportUrl','deleteAccountUrl','productionServerUrl'];
for(const key of required){const value=String(config[key]||'').trim();if(!value||/REPLACE ME|example\.invalid/i.test(value)){console.error(`Ungültiger oder nicht ersetzter Wert: ${key}`);process.exit(1);}config[key]=value;}
for(const key of ['publisherEmail','privacyContact'])if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config[key])){console.error(`Ungültige E-Mail: ${key}`);process.exit(1);}
for(const key of ['privacyUrl','termsUrl','supportUrl','deleteAccountUrl','productionServerUrl']){let u;try{u=new URL(config[key]);}catch{console.error(`Ungültige URL: ${key}`);process.exit(1);}if(u.protocol!=='https:'||u.username||u.password||u.hash){console.error(`Nur saubere HTTPS-URL erlaubt: ${key}`);process.exit(1);}}
const replacements={
  '[PUBLISHER_NAME]':config.publisherName,
  '[PUBLISHER_EMAIL]':config.publisherEmail,
  '[PUBLISHER_POSTAL_ADDRESS]':config.publisherPostalAddress,
  '[PRIVACY_CONTACT]':config.privacyContact,
  '[EFFECTIVE_DATE]':config.effectiveDate,
  '[PRODUCTION_SERVER_OPERATOR]':config.productionServerOperator
};
mkdirSync(target,{recursive:true});
for(const name of readdirSync(resolve(root,'store-compliance-site')).filter(n=>n.endsWith('.html'))){let html=readFileSync(resolve(root,'store-compliance-site',name),'utf8');for(const [from,to] of Object.entries(replacements))html=html.split(from).join(to);if(/\[[A-Z_]+\]/.test(html)){console.error(`Nicht ersetzter Platzhalter in ${name}`);process.exit(1);}writeFileSync(resolve(target,name),html);}
writeFileSync(resolve(target,'store-urls.json'),JSON.stringify({privacy:config.privacyUrl,terms:config.termsUrl,support:config.supportUrl,deleteAccount:config.deleteAccountUrl,server:config.productionServerUrl},null,2));
console.log(`Store-Compliance-Seiten erzeugt: ${target}`);
