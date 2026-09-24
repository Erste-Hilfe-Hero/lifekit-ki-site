#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Release gate: one frozen set of IAP identifiers across shared catalog and native shells.
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {STORE_PRODUCTS} from '../shared/monetization-data.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(resolve(root,'store/product-catalog.v5.7.json'),'utf8'));
const expected=[...manifest.products].map(x=>x.id).sort(),actual=Object.keys(STORE_PRODUCTS).sort();
const fail=(message)=>{throw new Error('Store product contract: '+message);};
if(JSON.stringify(expected)!==JSON.stringify(actual))fail(`manifest mismatch\nexpected ${expected.join(', ')}\nactual   ${actual.join(', ')}`);
if(new Set(actual).size!==actual.length)fail('duplicate product ID');
for(const id of actual){if(!/^nyr\.[a-z0-9]+(?:\.[a-z0-9]+)+$/.test(id))fail('invalid product ID '+id);if(STORE_PRODUCTS[id].id!==id)fail('object key/id mismatch '+id);}
const android=readFileSync(resolve(root,'native/android/app/build.gradle'),'utf8');
const ios=readFileSync(resolve(root,'native/ios/Nyrathen.xcodeproj/project.pbxproj'),'utf8');
if(!/applicationId\s+["']game\.nyrathen\.mobile["']/.test(android))fail('Android applicationId is not game.nyrathen.mobile');
if(!/PRODUCT_BUNDLE_IDENTIFIER = game\.nyrathen\.mobile;/.test(ios))fail('iOS bundle identifier is not game.nyrathen.mobile');
for(const file of ['native/android/app/src/main/assets/game/index.html','native/ios/Nyrathen/Web/index.html']){
 const body=readFileSync(resolve(root,file),'utf8');for(const id of actual)if(!body.includes(`'${id}'`)&&!body.includes(`\"${id}\"`))fail(`${file} missing ${id}`);
}
const canonical=actual.map(id=>({id,kind:STORE_PRODUCTS[id].kind,consumable:STORE_PRODUCTS[id].consumable===true,repeatable:STORE_PRODUCTS[id].repeatable===true,priceHint:STORE_PRODUCTS[id].priceHint||null}));
const sha256=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
console.log(JSON.stringify({ok:true,package:'game.nyrathen.mobile',productCount:actual.length,productIds:actual,sha256},null,2));
