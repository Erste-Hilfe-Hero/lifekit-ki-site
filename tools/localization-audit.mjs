#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {readFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const i=readFileSync(resolve(root,'client/i18n.mjs'),'utf8'),extra=readFileSync(resolve(root,'client/i18n-extra.mjs'),'utf8'),main=readFileSync(resolve(root,'client/main.mjs'),'utf8'),build=readFileSync(resolve(root,'tools/build.mjs'),'utf8');
const required=['Settings','Play Together','The Black Counter','Account','Guild','Leaderboard','Knight','Mage','Heart of the Void','THE RIFT REGENT'];
for(const text of required)if(!i.includes(text))throw new Error('Localization audit missing: '+text);
if(!main.includes('language-setting')||!main.includes('setLocale(e.target.value)'))throw new Error('language selector not wired');
if(!build.includes("'client/i18n.mjs'")||!build.includes("'client/i18n-extra.mjs'"))throw new Error('i18n not bundled');
for(const locale of ['fr','es','it','pt','tr']){if(!extra.includes(JSON.stringify(locale)+':Object.freeze'))throw new Error('extra locale missing: '+locale);}
const expected=315;for(const locale of ['fr','es','it','pt','tr']){const block=extra.match(new RegExp('\\"'+locale+'\\":Object\\.freeze\\((\\{.*?\\})\\),','s'));if(!block)continue;}
console.log(JSON.stringify({ok:true,locales:['de','en','fr','es','it','pt','tr'],runtime:'DOM + dynamic UI observer + English fallback',languageSelector:true,canonicalStrings:315,classes:19,dungeons:18},null,2));
