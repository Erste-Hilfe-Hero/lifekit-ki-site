#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Offline GM/admin console. No public admin HTTP API; every write requires attribution + explicit WRITE confirmation.
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {ProfileStore} from '../server/store.mjs';
import {SafetyStore} from '../server/safety.mjs';
import {AdminAudit} from '../server/production.mjs';
import {acquireDataLock} from '../server/operations.mjs';
import {parseConfig} from './config.mjs';
import {reverseStoreGrant} from '../shared/monetization-data.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),argv=process.argv.slice(2),command=argv.shift();
const option=name=>{const p=argv.find(v=>v.startsWith(`--${name}=`));return p?p.slice(name.length+3):'';};
const actor=option('actor'),confirmed=option('confirm')==='WRITE';
const help=`Read: npm run admin -- status | find QUERY | inspect PLAYER_ID | reports | audit | economy | purchases PLAYER_ID | commerce-report
Write (server stopped): npm run admin -- mute|ban PLAYER_ID MINUTES "Reason" --actor=NAME --confirm=WRITE
Unban: npm run admin -- unban PLAYER_ID "Reason" --actor=NAME --confirm=WRITE
Refund: npm run admin -- refund PROVIDER TRANSACTION_ID "Reason" --actor=NAME --confirm=WRITE
Review: npm run admin -- review REPORT_ID actioned|dismissed "Reason" --actor=NAME --confirm=WRITE`;
let release,store;
try{
 if(!command||command==='--help'){console.log(help);process.exit(0);}
 const envFile=resolve(root,'.env'),cfg=existsSync(envFile)?parseConfig(readFileSync(envFile,'utf8')):{};
 const file=resolve(root,process.env.DATA_PATH||cfg.DATA_PATH||'.data/nyrathen.sqlite');if(!existsSync(file))throw new Error('Keine bestehende Serverdatenbank gefunden.');
 const readOnly=['status','find','inspect','reports','audit','economy','purchases','commerce-report'].includes(command);
 if(readOnly){const db=new DatabaseSync(file,{readOnly:true});try{
   if(command==='status'){const table=name=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name),one=(q,fallback=0)=>{try{return Number(db.prepare(q).get()?.n||0);}catch{return fallback;}};console.log(JSON.stringify({players:one('SELECT COUNT(*) AS n FROM players'),openReports:table('player_reports')?one("SELECT COUNT(*) AS n FROM player_reports WHERE status='open'"):0,activeBans:table('account_bans')?one('SELECT COUNT(*) AS n FROM account_bans WHERE until>'+Date.now()):0,activeMutes:table('chat_restrictions')?one('SELECT COUNT(*) AS n FROM chat_restrictions WHERE until>'+Date.now()):0,economyReceipts:table('economy_ledger')?one('SELECT COUNT(*) AS n FROM economy_ledger'):0,adminAuditRows:table('admin_audit')?one('SELECT COUNT(*) AS n FROM admin_audit'):0},null,2));}
   else if(command==='find'){const q=String(argv[0]||'').toLowerCase();if(q.length<2)throw new Error('QUERY benötigt mindestens 2 Zeichen.');const rows=db.prepare('SELECT id,profile,updated_at AS updatedAt FROM players ORDER BY updated_at DESC LIMIT 5000').all();const out=[];for(const row of rows){let p;try{p=JSON.parse(row.profile);}catch{continue;}if(row.id.toLowerCase().includes(q)||String(p.name||'').toLowerCase().includes(q))out.push({id:row.id,name:p.name,classId:p.classId,level:p.level,updatedAt:row.updatedAt});if(out.length>=50)break;}console.log(JSON.stringify(out,null,2));}
   else if(command==='inspect'){const id=argv[0];const row=db.prepare('SELECT id,profile,updated_at AS updatedAt FROM players WHERE id=?').get(id);if(!row)throw new Error('Spieler nicht gefunden.');const ban=db.prepare('SELECT until,reason FROM account_bans WHERE player_id=? AND until>?').get(id,Date.now()),mute=db.prepare('SELECT until,reason FROM chat_restrictions WHERE player_id=? AND until>?').get(id,Date.now());console.log(JSON.stringify({id:row.id,profile:JSON.parse(row.profile),updatedAt:row.updatedAt,ban:ban||null,mute:mute||null},null,2));}
   else if(command==='reports')console.log(JSON.stringify(db.prepare('SELECT id,reporter,target,reason,quote,created_at AS createdAt,status,reviewed_at AS reviewedAt,review_note AS reviewNote FROM player_reports ORDER BY created_at DESC LIMIT 200').all(),null,2));
   else if(command==='economy')console.log(JSON.stringify(db.prepare('SELECT tx_id AS txId,player_id AS playerId,kind,created_at AS createdAt FROM economy_ledger ORDER BY created_at DESC LIMIT 200').all(),null,2));
   else if(command==='purchases'){const id=String(argv[0]||'');if(!id)throw new Error('PLAYER_ID fehlt.');console.log(JSON.stringify(db.prepare('SELECT provider,transaction_id AS transactionId,product_id AS productId,status,grant_json AS grantJson,created_at AS createdAt,updated_at AS updatedAt FROM commerce_receipts WHERE player_id=? ORDER BY created_at DESC LIMIT 200').all(id),null,2));}
   else if(command==='commerce-report'){const counts=Object.fromEntries(db.prepare('SELECT event,COUNT(*) AS n FROM commerce_events GROUP BY event').all().map(r=>[r.event,Number(r.n)])),payers=Number(db.prepare("SELECT COUNT(DISTINCT player_id) AS n FROM commerce_receipts WHERE status='GRANTED'").get()?.n||0),grants=Number(db.prepare("SELECT COUNT(*) AS n FROM commerce_receipts WHERE status='GRANTED'").get()?.n||0),refunds=Number(db.prepare("SELECT COUNT(*) AS n FROM commerce_receipts WHERE status IN ('REFUNDED','REVOKED')").get()?.n||0);console.log(JSON.stringify({events:counts,payers,grants,refunds,viewToPurchase:counts.product_view?Number(counts.purchase_complete||0)/counts.product_view:0,startToPurchase:counts.purchase_start?Number(counts.purchase_complete||0)/counts.purchase_start:0},null,2));}
   else console.log(JSON.stringify(db.prepare('SELECT id,actor,action,target,reason,created_at AS createdAt FROM admin_audit ORDER BY created_at DESC LIMIT 200').all(),null,2));
  }finally{db.close();}
 }else{
   if(!['mute','ban','unban','review','refund'].includes(command)||!confirmed||!actor||actor.length<2)throw new Error('Schreiboperation benötigt --actor=NAME und --confirm=WRITE.\n'+help);
   release=acquireDataLock(file);store=new ProfileStore(file);const safety=new SafetyStore(store.db),audit=new AdminAudit(store.db);
   store.transaction(()=>{
    if(command==='mute'||command==='ban'){if(argv.length<3)throw new Error(help);const [id,rawMinutes,reason]=argv;const minutes=Number(rawMinutes);if(!Number.isInteger(minutes))throw new Error('MINUTES muss ganzzahlig sein.');if(command==='mute')safety.mute(id,minutes,reason);else safety.ban(id,minutes,reason);audit.record(actor,command,id,reason);}
    else if(command==='unban'){const [id,reason]=argv;if(!id||!reason)throw new Error(help);safety.ban(id,0,reason);audit.record(actor,'unban',id,reason);}
    else if(command==='refund'){const [provider,transactionId,reason]=argv;if(!provider||!transactionId||!reason)throw new Error(help);const receipt=store.commerceReceipt(provider,transactionId);if(!receipt)throw new Error('Store-Transaktion nicht gefunden.');if(!['REFUNDED','REVOKED'].includes(receipt.status)){const profile=store.profileById(receipt.playerId);if(!profile)throw new Error('Konto der Transaktion fehlt.');let grant={};try{grant=JSON.parse(receipt.grantJson||'{}');}catch{}reverseStoreGrant(profile,grant);store.save(receipt.playerId,profile);store.updateCommerceReceipt(provider,transactionId,'REVOKED',grant);store.commerceEvent(receipt.playerId,'purchase_refund',receipt.productId);audit.record(actor,'commerce:revoke',receipt.playerId,reason);}}
    else {const [id,status,reason]=argv;if(!safety.review(id,status,reason))throw new Error('Meldung nicht gefunden.');audit.record(actor,'review:'+status,id,reason);}
   });console.log(JSON.stringify({ok:true,operation:command,actor}));
 }
}catch(error){console.error(error.message);process.exitCode=1;}finally{store?.close();release?.();}
