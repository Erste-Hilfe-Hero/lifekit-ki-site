#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Long-running local commerce/entitlement endurance load. No external store calls or credentials.
import {performance} from 'node:perf_hooks';
import {ProfileStore} from '../server/store.mjs';
import {STORE_PRODUCTS,applyStoreGrant,reverseStoreGrant,storeGrantRecord} from '../shared/monetization-data.mjs';

const seconds=Number(process.env.COMMERCE_SOAK_SECONDS||60);
const players=Number(process.env.COMMERCE_SOAK_PLAYERS||24);
const batch=Number(process.env.COMMERCE_SOAK_BATCH||8);
if(!Number.isInteger(seconds)||seconds<5||seconds>86400)throw new Error('COMMERCE_SOAK_SECONDS 5–86400');
if(!Number.isInteger(players)||players<2||players>250)throw new Error('COMMERCE_SOAK_PLAYERS 2–250');
if(!Number.isInteger(batch)||batch<1||batch>64)throw new Error('COMMERCE_SOAK_BATCH 1–64');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const products=Object.values(STORE_PRODUCTS);
const store=new ProfileStore(':memory:');
const ids=[];
for(let i=0;i<players;i++)ids.push(store.create(`CommerceSoak${i}`,i%2?'ranger':'weaver').id);
let sequence=0,grants=0,replays=0,revokes=0,events=0,failures=0;
const started=performance.now();
try{
  while(performance.now()-started<seconds*1000){
    for(let j=0;j<batch;j++){
      const n=sequence++,playerId=ids[n%ids.length],product=products[n%products.length],provider=n%2?'apple':'google',transactionId=`soak-${provider}-${n}`;
      try{
        store.transaction(()=>{
          const profile=store.profileById(playerId);if(!profile)throw new Error('profile missing');
          const existing=store.commerceReceipt(provider,transactionId);
          if(existing){replays++;return;}
          applyStoreGrant(profile,product);const grant=storeGrantRecord(product);
          store.save(playerId,profile);store.saveCommerceReceipt({provider,transactionId,playerId,productId:product.id,grant});
          store.commerceEvent(playerId,'purchase_complete',product.id);grants++;events++;
        });
        // Exercise the real duplicate-handling contract without writing a second ledger row.
        if(n%5===0){const old=store.commerceReceipt(provider,transactionId);if(!old||old.playerId!==playerId||old.productId!==product.id)throw new Error('receipt replay contract failed');replays++;}
        // Refund/revocation churn including shard-debt and cosmetic/account-entitlement reversal.
        if(n%7===0){
          store.transaction(()=>{
            const row=store.commerceReceipt(provider,transactionId);if(!row)throw new Error('receipt missing before revoke');
            if(row.status==='REVOKED'){replays++;return;}
            const profile=store.profileById(playerId);const grant=JSON.parse(row.grantJson||'{}');reverseStoreGrant(profile,grant);store.save(playerId,profile);store.updateCommerceReceipt(provider,transactionId,'REVOKED',grant);store.commerceEvent(playerId,'purchase_refund',product.id);revokes++;events++;
          });
        }
      }catch(error){failures++;console.error('commerce-soak-cycle-failed',error.message);}
    }
    await delay(20);
  }
  const rows=Number(store.db.prepare('SELECT COUNT(*) AS n FROM commerce_receipts').get().n||0);
  const duplicateIds=Number(store.db.prepare('SELECT COUNT(*) AS n FROM (SELECT provider,transaction_id,COUNT(*) c FROM commerce_receipts GROUP BY provider,transaction_id HAVING c>1)').get().n||0);
  const badProfiles=ids.filter(id=>{const p=store.profileById(id);const c=p?.account?.commerce;return !p||!c||c.shards<0||c.shardDebt<0||new Set(c.owned).size!==c.owned.length;});
  const report={ok:failures===0&&duplicateIds===0&&badProfiles.length===0,seconds,players,batch,cycles:sequence,grants,replays,revokes,events,ledgerRows:rows,duplicateTransactionIds:duplicateIds,badProfiles:badProfiles.length,kpis:store.commerceReport()};
  console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
}finally{store.close();}
