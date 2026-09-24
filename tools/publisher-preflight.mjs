#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
const fields={publisherName:process.env.NYRATHEN_PUBLISHER_NAME,publisherEmail:process.env.NYRATHEN_PUBLISHER_EMAIL,publisherPostalAddress:process.env.NYRATHEN_PUBLISHER_POSTAL_ADDRESS,privacyContact:process.env.NYRATHEN_PRIVACY_CONTACT,legalEffectiveDate:process.env.NYRATHEN_LEGAL_EFFECTIVE_DATE,serverOperator:process.env.NYRATHEN_SERVER_OPERATOR};
const missing=Object.entries(fields).filter(([,v])=>!String(v||'').trim()).map(([k])=>k);
const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;const invalid=[];if(fields.publisherEmail&&!email.test(fields.publisherEmail))invalid.push('publisherEmail');if(fields.privacyContact&&!email.test(fields.privacyContact))invalid.push('privacyContact');
const base=String(process.env.PUBLIC_URL||process.env.NYRATHEN_PUBLIC_URL||'').replace(/\/$/,'');const routes=['privacy','terms','support','delete-account','imprint'];
const ok=!missing.length&&!invalid.length;console.log(JSON.stringify({ok,missing,invalid,publicBase:base||null,urls:base?Object.fromEntries(routes.map(x=>[x,`${base}/legal/${x}`])):null,behaviorWithoutIdentity:'HTTP 503 fail-closed'},null,2));if(!ok)process.exitCode=1;
