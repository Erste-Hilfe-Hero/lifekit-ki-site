#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Read-only aggregate monetization/retention report. Catalog prices are estimates only;
// actual platform settlement/tax/fees are intentionally not inferred.
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {parseConfig} from './config.mjs';
import {STORE_PRODUCTS} from '../shared/monetization-data.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),envFile=resolve(root,'.env'),cfg=existsSync(envFile)?parseConfig(readFileSync(envFile,'utf8')):{},file=resolve(root,process.env.DATA_PATH||cfg.DATA_PATH||'.data/nyrathen.sqlite');
if(!existsSync(file))throw new Error('Keine bestehende Nyrathen-Datenbank gefunden.');
const euro=p=>{const m=String(p?.priceHint||'').match(/(\d+)(?:[.,](\d{1,2}))?/);return m?Number(m[1])+Number((m[2]||'0').padEnd(2,'0'))/100:0;};
const db=new DatabaseSync(file,{readOnly:true});
try{
 const events=Object.fromEntries(db.prepare('SELECT event,COUNT(*) AS n FROM commerce_events GROUP BY event').all().map(r=>[r.event,Number(r.n)]));
 const unique=event=>Number(db.prepare('SELECT COUNT(DISTINCT player_id) AS n FROM commerce_events WHERE event=?').get(event)?.n||0);
 const grantedRows=db.prepare("SELECT player_id AS playerId,product_id AS productId,created_at AS createdAt FROM commerce_receipts WHERE status='GRANTED'").all();
 const payers=new Set(grantedRows.map(r=>String(r.playerId))),grants=grantedRows.length,refunds=Number(db.prepare("SELECT COUNT(*) AS n FROM commerce_receipts WHERE status IN ('REFUNDED','REVOKED')").get()?.n||0),openers=unique('shop_open');
 const rows=db.prepare('SELECT player_id AS playerId,day FROM player_activity ORDER BY player_id,day').all(),today=Math.floor(Date.now()/86400000),by=new Map();for(const r of rows){if(!by.has(String(r.playerId)))by.set(String(r.playerId),new Set());by.get(String(r.playerId)).add(Number(r.day));}
 const retention=(h,only=null)=>{let eligible=0,returned=0;for(const [id,days] of by){if(only&&!only.has(id))continue;const first=Math.min(...days);if(today-first<h)continue;eligible++;if(days.has(first+h))returned++;}return{eligible,returned,rate:eligible?returned/eligible:0};};
 const productRows=db.prepare("SELECT product_id AS productId,COUNT(*) AS purchases,COUNT(DISTINCT player_id) AS payers FROM commerce_receipts WHERE status='GRANTED' GROUP BY product_id ORDER BY purchases DESC").all().map(r=>({...r,catalogGrossEstimateEUR:Number((Number(r.purchases)*euro(STORE_PRODUCTS[r.productId])).toFixed(2))}));
 const catalogGrossEstimateEUR=Number(grantedRows.reduce((sum,r)=>sum+euro(STORE_PRODUCTS[r.productId]),0).toFixed(2)),payerCount=payers.size,payerConversion=openers?payerCount/openers:0,catalogARPPUEstimateEUR=payerCount?Number((catalogGrossEstimateEUR/payerCount).toFixed(2)):0;
 const d1=retention(1),d7=retention(7),d30=retention(30),pd1=retention(1,payers),pd7=retention(7,payers),pd30=retention(30,payers);
 const quality={metric:'catalog gross estimate × retention',d7:Number((catalogGrossEstimateEUR*d7.rate).toFixed(2)),d30:Number((catalogGrossEstimateEUR*d30.rate).toFixed(2)),payerD7:Number((catalogGrossEstimateEUR*pd7.rate).toFixed(2)),payerD30:Number((catalogGrossEstimateEUR*pd30.rate).toFixed(2))};
 console.log(JSON.stringify({generatedAt:new Date().toISOString(),shop:{opens:events.shop_open||0,uniqueOpeners:openers,views:events.product_view||0,purchaseStarts:events.purchase_start||0,purchases:events.purchase_complete||0,refunds,payers:payerCount,grants,payerConversion,viewToPurchase:(events.product_view||0)?(events.purchase_complete||0)/events.product_view:0,startToPurchase:(events.purchase_start||0)?(events.purchase_complete||0)/events.purchase_start:0},revenue:{catalogGrossEstimateEUR,catalogARPPUEstimateEUR,qualityIndicator:quality,disclaimer:'Catalog price hints only; not App Store/Play settlement, tax or platform-fee accounting.'},retention:{d1,d7,d30},payerRetention:{d1:pd1,d7:pd7,d30:pd30},products:productRows,note:'Aggregierte Entwicklungskennzahlen. Keine individuellen Preise, payer targeting oder automatischen Pay-to-Win-/Economy-Entscheidungen.'},null,2));
}finally{db.close();}
