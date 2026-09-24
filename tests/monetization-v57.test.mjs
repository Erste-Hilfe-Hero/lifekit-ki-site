// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {cleanAdventureProfile,AdventureEngine} from '../shared/adventure.mjs';
import {STORE_PRODUCTS,SHARD_OFFERS,SHOP_TABS,applyStoreGrant,reverseStoreGrant,storeGrantRecord,spendShardOffer,SHOP_SEASON_ID,vaultCapacity,activeShardOffers,isShardOfferActive,publicStoreCatalog} from '../shared/monetization-data.mjs';
import {accountXPForLevel,SEASON} from '../shared/endgame-data.mjs';
import {ProfileStore} from '../server/store.mjs';
const root=resolve(new URL('..',import.meta.url).pathname),text=r=>readFileSync(resolve(root,r),'utf8');

test('v5.7 launch catalog matches Nyrathen monetization plan without selling combat power',()=>{
  assert(Object.keys(STORE_PRODUCTS).length>=12);assert(Object.keys(SHARD_OFFERS).length>=14);assert.deepEqual(SHOP_TABS,['featured','cosmetics','season','account','bundles','wishlist']);
  const offers=Object.values(SHARD_OFFERS),products=Object.values(STORE_PRODUCTS);
  assert.equal(offers.filter(x=>x.kind==='skin').length,5);assert.equal(offers.filter(x=>x.kind==='weaponStyle').length,3);assert.equal(offers.filter(x=>x.kind==='petStyle').length,3);
  assert.equal(products.filter(x=>x.group==='account'&&x.grant?.characterSlots).length,2);
  assert.equal(products.filter(x=>x.group==='account'&&x.grant?.vaultPages).length,2);
  for(const id of ['nyr.bundle.wanderer','nyr.bundle.founder','nyr.season.veil01','nyr.collection.blackiron'])assert(STORE_PRODUCTS[id]);
  const serialized=JSON.stringify({STORE_PRODUCTS,SHARD_OFFERS}).toLowerCase();
  for(const forbidden of ['damageboost','attackboost','bestinslot','revive','bossdrop','lootbox','gacha'])assert(!serialized.includes(forbidden));
});

test('premium grants, weapon/pet cosmetics and caps survive sanitize round-trip',()=>{
  const p=cleanAdventureProfile({name:'Buyer',classId:'weaver'});for(let i=0;i<12;i++)applyStoreGrant(p,STORE_PRODUCTS['nyr.account.slot']);for(let i=0;i<12;i++)applyStoreGrant(p,STORE_PRODUCTS['nyr.account.vault']);
  assert.equal(p.account.characterSlots,8);assert.equal(vaultCapacity(p.account),64);applyStoreGrant(p,STORE_PRODUCTS['nyr.shards.2400']);assert.equal(p.account.commerce.shards,2400);
  assert(spendShardOffer(p,SHARD_OFFERS['skin-bloodglass']));assert(spendShardOffer(p,SHARD_OFFERS['weapon-blackedge']));assert(spendShardOffer(p,SHARD_OFFERS['pet-veil']));
  const round=cleanAdventureProfile(p);assert(round.account.cosmetics.skins.includes('bloodglass'));assert(round.account.cosmetics.weaponStyles.includes('blackedge'));assert(round.account.cosmetics.petStyles.includes('veil'));
});

test('refund reversal creates shard debt instead of allowing chargeback duplication',()=>{
  const p=cleanAdventureProfile({name:'Refund','classId':'weaver'});applyStoreGrant(p,STORE_PRODUCTS['nyr.shards.1100']);assert(spendShardOffer(p,SHARD_OFFERS['skin-bloodglass']));
  reverseStoreGrant(p,storeGrantRecord(STORE_PRODUCTS['nyr.shards.1100']));assert.equal(p.account.commerce.shards,0);assert.equal(p.account.commerce.shardDebt,540);assert.equal(spendShardOffer(p,SHARD_OFFERS['title-nightwarden']),false);
  applyStoreGrant(p,STORE_PRODUCTS['nyr.shards.500']);assert.equal(p.account.commerce.shardDebt,40);assert.equal(p.account.commerce.shards,0);
});

test('Black Counter rotation exposes a curated selection plus permanent account offers',()=>{
  const a=activeShardOffers(Date.UTC(2026,8,23)),b=activeShardOffers(Date.UTC(2026,8,30));
  assert(a.rotation.rotating.length<=6);assert(a.offers.some(o=>o.group==='account'));assert(a.offers.some(o=>o.group==='guild'));
  assert.notDeepEqual(a.rotation.rotating,b.rotation.rotating);for(const id of a.rotation.rotating)assert(isShardOfferActive(id,Date.UTC(2026,8,23)));
});

test('premium season track is separate, retroactive and cosmetic-only',()=>{
  const e=new AdventureEngine(),p=e.addPlayer('p','Buyer','weaver');p.account.accountXP=accountXPForLevel(50);p.seasonal=true;p.seasonId=SEASON.id;p.account.season.id=SEASON.id;p.account.season.xp=999999;
  p.account.commerce.seasonPremium.push(SHOP_SEASON_ID);p.seasonId=p.account.season.id;
  assert(e.action('p',{type:'claimSeasonPremium',level:5}));assert(p.account.season.premiumClaims.includes(5));assert(p.account.cosmetics.titles.includes('Nachtwächter'));assert(!e.action('p',{type:'claimSeasonPremium',level:5}));
});

test('commerce ledger supports history, status changes and KPI report',()=>{
  const store=new ProfileStore(':memory:');try{const p=store.create('Buyer','weaver');store.saveCommerceReceipt({provider:'apple',transactionId:'as:1',playerId:p.id,productId:'nyr.bundle.wanderer',grant:storeGrantRecord(STORE_PRODUCTS['nyr.bundle.wanderer'])});store.commerceEvent(p.id,'shop_open');store.commerceEvent(p.id,'product_view','nyr.bundle.wanderer');store.commerceEvent(p.id,'purchase_start','nyr.bundle.wanderer');store.commerceEvent(p.id,'purchase_complete','nyr.bundle.wanderer');assert.equal(store.commerceHistory(p.id).length,1);assert.equal(store.updateCommerceReceipt('apple','as:1','REVOKED').status,'REVOKED');const report=store.commerceReport();assert.equal(report.uniqueShopOpeners,1);assert.equal(report.refundedReceipts,1);assert.equal(report.viewToPurchase,1);}finally{store.close();}
});

test('native mobile shells use official store bridges and server-side verification',()=>{
  assert.match(text('native/android/app/build.gradle'),/com\.android\.billingclient:billing:9\.1\.0/);
  const android=text('native/android/app/src/main/java/game/nyrathen/mobile/StoreBridge.java');assert.match(android,/queryProductDetailsAsync/);assert.match(android,/launchBillingFlow/);assert.match(android,/queryPurchasesAsync/);assert.match(android,/consumeAsync/);assert.match(android,/acknowledgePurchase/);
  assert.match(android,/Purchase\.PurchaseState\.PURCHASED/);assert.match(android,/PENDING|enablePendingPurchases/i);
  const ios=text('native/ios/Nyrathen/GameViewController.swift');assert.match(ios,/import StoreKit/);assert.match(ios,/Product\.products/);assert.match(ios,/jwsRepresentation/);assert.match(ios,/Transaction\.currentEntitlements/);assert.match(ios,/transaction\.finish\(\)/);
  assert.match(ios,/case \.verified|guard case \.verified/);
  const server=text('server/server.mjs');assert.match(server,/\/api\/store\/verify/);assert.match(server,/storeVerifier\.verify/);assert.match(server,/commerceRedeem/);assert.match(server,/storeGrantRecord/);
});

test('Black Counter and class dossier replace generic card-wall hierarchy',()=>{
  const html=text('client/index.html'),css=text('client/styles.css'),systems=text('client/systems.mjs');assert.match(html,/Schwarzer Tresen/);assert.match(html,/class-dossier/);assert.match(html,/selected-class-portrait/);assert.match(css,/BLACK IRON \/ RIFT ARCHIVE/);assert.match(css,/counter-preview-stage/);assert.match(css,/class-index-rail/);assert.match(systems,/Kein Basar|kein Glücksrad/i);assert.match(systems,/counter-tabs/);assert.match(systems,/keine Stärke|Keine Stärke/);
});

test('GM tooling exposes purchase history, commerce report and audited refund path',()=>{const admin=text('tools/admin.mjs');assert.match(admin,/purchases PLAYER_ID/);assert.match(admin,/commerce-report/);assert.match(admin,/refund PROVIDER TRANSACTION_ID/);assert.match(admin,/commerce:revoke/);});

test('safe shop experiment changes presentation only and never prices or grants',()=>{
  const ledger=publicStoreCatalog(Date.UTC(2026,8,23),{variant:'ledger'}),preview=publicStoreCatalog(Date.UTC(2026,8,23),{variant:'preview-first'});
  assert.equal(ledger.variant,'ledger');assert.equal(preview.variant,'preview-first');
  const compact=x=>({store:x.store.map(p=>[p.id,p.priceHint,p.kind,p.group]),offers:x.offers.map(o=>[o.id,o.cost,o.kind,o.value])});
  assert.deepEqual(compact(ledger),compact(preview));
  const systems=text('client/systems.mjs'),css=text('client/styles.css');assert.match(systems,/variant-\$\{variant\}/);assert.match(systems,/VORSCHAU-FOKUS/);assert.match(css,/variant-preview-first/);
});

test('shop liveops rotation is server-controlled and limited to safe known offer ids',()=>{
  const custom=activeShardOffers(Date.UTC(2026,8,23),['skin-bloodglass','weapon-blackedge','not-real']);
  assert.deepEqual(custom.rotation.rotating,['skin-bloodglass','weapon-blackedge']);
  assert(custom.offers.some(x=>x.id==='account-vault'));assert(custom.offers.some(x=>x.id==='account-slot'));
  const server=text('server/server.mjs');assert.match(server,/SHOP_ROTATION_IDS/);assert.match(server,/SHOP_EXPERIMENT_VARIANT/);
});


test('purchase retry after client crash is safe and pending purchases cannot be granted by native bridges',()=>{
  const android=text('native/android/app/src/main/java/game/nyrathen/mobile/StoreBridge.java'),ios=text('native/ios/Nyrathen/GameViewController.swift'),server=text('server/server.mjs');
  assert.match(android,/Purchase\.PurchaseState\.PURCHASED/);assert.match(android,/queryPurchasesAsync/);
  assert.match(ios,/Transaction\.currentEntitlements/);assert.match(ios,/verified/);
  assert.match(server,/if\(old\)/);assert.match(server,/duplicate:true/);assert.match(server,/commerceReceipt/);
});

test('v5.7 RC exposes premium wallet separately in desktop and mobile HUD',()=>{
  const html=text('client/index.html'),main=text('client/main.mjs'),css=text('client/styles.css');
  assert.match(html,/id="premium-shards"/);assert.match(html,/id="mobile-premium-shards"/);assert.match(html,/NYR-SPLITTER/);
  assert.match(main,/premium-shards/);assert.match(main,/mobile-premium-shards/);assert.match(css,/mobile-wallet-rail/);assert.match(css,/wallet-premium/);
});

test('v5.7 RC auto-recovers unfinished store transactions after an app restart',()=>{
  const commerce=text('client/commerce.mjs'),main=text('client/main.mjs'),android=text('native/android/app/src/main/java/game/nyrathen/mobile/StoreBridge.java'),ios=text('native/ios/Nyrathen/GameViewController.swift');
  assert.match(commerce,/recoverPending\(\)/);assert.match(commerce,/type:'recover'/);assert.match(main,/commerce\.recoverPending\(\)/);
  assert.match(android,/case "recover" -> restore\(requestId, true\)/);assert.match(android,/outstandingOnly && p\.isAcknowledged\(\)/);
  assert.match(ios,/case "recover"/);assert.match(ios,/Transaction\.unfinished/);
});

test('v5.7 RC wishlist return signal is server-derived from the active rotation',()=>{
  const server=text('server/server.mjs'),systems=text('client/systems.mjs');
  assert.match(server,/wishlistReturns/);assert.match(server,/SHARD_OFFERS\[id\]\?\.group==='rotation'/);
  assert.match(systems,/WIEDER AM TRESEN/);assert.match(systems,/wishlistReturns/);
});

test('frozen v5.7 store product manifest matches shared catalog exactly',()=>{
  const manifest=JSON.parse(text('store/product-catalog.v5.7.json'));
  assert.equal(manifest.package,'game.nyrathen.mobile');
  assert.deepEqual(manifest.products.map(p=>p.id).sort(),Object.keys(STORE_PRODUCTS).sort());
  assert.equal(new Set(manifest.products.map(p=>p.id)).size,manifest.products.length);
  assert.match(text('package.json'),/store:products/);
});

test('aggregate monetization reporting includes payer conversion, payer retention, ARPPU estimate and revenue-retention indicator',()=>{
  const report=text('tools/monetization-report.mjs'),storeSource=text('server/store.mjs');
  assert.match(report,/payerConversion/);assert.match(report,/catalogARPPUEstimateEUR/);assert.match(report,/payerRetention/);assert.match(report,/qualityIndicator/);
  assert.match(storeSource,/payerConversion/);assert.match(storeSource,/payerRetention/);
});

test('store compliance drafts cover purchase history, premium currency and refund revocation behavior',()=>{
  assert.match(text('store-compliance-site/privacy.html'),/Transaktionskennung|Kaufbeleg/);
  assert.match(text('store-compliance-site/terms.html'),/Nyr-Splitter/);assert.match(text('store-compliance-site/terms.html'),/Erstattungen, Widerrufe und Chargebacks/);
  assert.match(text('store/APPLE-APP-PRIVACY-DRAFT.md'),/StoreKit 2/);assert.doesNotMatch(text('store/APPLE-APP-PRIVACY-DRAFT.md'),/Kein In-App-Purchase-SDK/);
});

test('v5.7 long-soak harness includes parallel commerce and entitlement churn',()=>{
  const soak=text('tools/soak-certify.mjs'),commerce=text('tools/commerce-soak.mjs'),pkg=JSON.parse(text('package.json'));
  assert.match(soak,/commerce-soak\.mjs/);assert.match(soak,/Promise\.all/);assert.match(commerce,/purchase_complete/);assert.match(commerce,/purchase_refund/);assert.match(commerce,/duplicateTransactionIds/);assert.equal(pkg.scripts['test:commerce-soak'],'node tools/commerce-soak.mjs');
});

test('earned-only prestige cosmetics are explicitly separated from every premium catalog',()=>{
  const src=text('shared/monetization-data.mjs');assert.match(src,/EARNED_ONLY_COSMETICS/);assert.match(src,/Realmjäger/);assert.match(src,/ashen/);
  const premium=src.slice(0,src.indexOf('export const EARNED_ONLY_COSMETICS'));assert.doesNotMatch(premium,/['\"]Realmjäger['\"]/);assert.doesNotMatch(premium,/['\"]ashen['\"]/);
  assert.match(text('tools/store-policy-preflight.mjs'),/earnedPrestigeExcludedFromPremium/);
});
