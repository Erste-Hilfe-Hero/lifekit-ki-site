#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
const required=['PUBLIC_SERVER_URL','NYRATHEN_PRIVACY_URL','NYRATHEN_TERMS_URL','NYRATHEN_SUPPORT_URL','NYRATHEN_DELETE_ACCOUNT_URL'];
for(const key of required){const raw=String(process.env[key]||'').trim();let url;try{url=new URL(raw);}catch{throw new Error(`${key} fehlt oder ist ungültig.`);}if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new Error(`${key} muss eine saubere öffentliche HTTPS-URL sein.`);}
console.log('Mobile production URLs OK');
