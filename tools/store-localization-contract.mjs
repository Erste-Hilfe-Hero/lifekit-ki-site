#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const apple=JSON.parse(readFileSync(resolve(root,'store/apple-iap-metadata.v5.7.json'),'utf8'));
const google=JSON.parse(readFileSync(resolve(root,'store/google-one-time-products.v5.7.json'),'utf8'));
const app=JSON.parse(readFileSync(resolve(root,'store/app-localizations.v5.7.json'),'utf8'));
const catalog=JSON.parse(readFileSync(resolve(root,'store/product-catalog.v5.7.json'),'utf8'));
const fail=m=>{throw new Error('Store localization contract: '+m)};
const expected=catalog.products.map(x=>x.id).sort(),a=apple.products.map(x=>x.id).sort(),g=google.products.map(x=>x.id).sort();
if(JSON.stringify(expected)!==JSON.stringify(a)||JSON.stringify(expected)!==JSON.stringify(g))fail('product ID set mismatch');
const requiredLocales=['de-DE','en-US','fr-FR','es-ES','it-IT','pt-BR','tr-TR'];
for(const p of apple.products){for(const locale of requiredLocales){const x=p.localizations?.[locale];if(!x)fail(`${p.id} missing ${locale}`);if(x.displayName.length<2||x.displayName.length>30)fail(`${p.id} ${locale} displayName length ${x.displayName.length}`);if(!x.description||x.description.length>45)fail(`${p.id} ${locale} description length ${x.description?.length}`);}}
for(const p of google.products){for(const locale of requiredLocales){const x=p.localizations?.[locale];if(x.displayName.length>55)fail(`${p.id} ${locale} Google title too long`);if(x.description.length>200)fail(`${p.id} ${locale} Google description too long`);}}
for(const locale of requiredLocales)if(!app[locale]?.description||!app[locale]?.shortDescription)fail(`app listing missing ${locale}`);
console.log(JSON.stringify({ok:true,products:expected.length,productLocales:requiredLocales,appLocales:Object.keys(app),appleLimits:{displayName:30,description:45},googleLimits:{title:55,description:200}},null,2));
