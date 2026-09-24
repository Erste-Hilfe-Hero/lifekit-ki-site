// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Nyrathen v5.7 monetization catalog. No combat power, paid revive or loot boxes.
export const PREMIUM_CURRENCY='Nyr-Splitter';
export const SHOP_SEASON_ID='S1-ASHEN-TIDE';
export const SHOP_TABS=Object.freeze(['featured','cosmetics','season','account','bundles','wishlist']);

export const STORE_PRODUCTS=Object.freeze({
  'nyr.shards.180':{id:'nyr.shards.180',kind:'currency',consumable:true,shards:180,priceHint:'1,99 €',title:'180 Nyr-Splitter',group:'splitter',tab:'featured',featured:true,preview:'shards'},
  'nyr.shards.500':{id:'nyr.shards.500',kind:'currency',consumable:true,shards:500,priceHint:'4,99 €',title:'500 Nyr-Splitter',group:'splitter',tab:'featured',featured:true,preview:'shards'},
  'nyr.shards.1100':{id:'nyr.shards.1100',kind:'currency',consumable:true,shards:1100,priceHint:'9,99 €',title:'1.100 Nyr-Splitter',group:'splitter',tab:'featured',preview:'shards'},
  'nyr.shards.2400':{id:'nyr.shards.2400',kind:'currency',consumable:true,shards:2400,priceHint:'19,99 €',title:'2.400 Nyr-Splitter',group:'splitter',tab:'featured',preview:'shards'},
  'nyr.shards.5200':{id:'nyr.shards.5200',kind:'currency',consumable:true,shards:5200,priceHint:'39,99 €',title:'5.200 Nyr-Splitter',group:'splitter',tab:'featured',preview:'shards'},
  'nyr.bundle.wanderer':{id:'nyr.bundle.wanderer',kind:'bundle',consumable:false,priceHint:'6,99 €',title:'Wandererpaket',group:'bundles',tab:'bundles',featured:true,preview:'bundle',grant:{shards:320,characterSlots:1,vaultPages:1,skin:'wayfarer',title:'Grenzgänger'}},
  'nyr.bundle.founder':{id:'nyr.bundle.founder',kind:'bundle',consumable:false,priceHint:'24,99 €',title:'Gründerpaket',group:'bundles',tab:'bundles',featured:true,preview:'bundle',founder:true,grant:{shards:1450,characterSlots:1,vaultPages:1,skin:'gravegold',title:'Gründer der Wacht',emote:'founder'}},
  'nyr.season.veil01':{id:'nyr.season.veil01',kind:'season',consumable:false,priceHint:'8,99 €',title:'Aschenflut-Pass · Saison I',group:'season',tab:'season',featured:true,preview:'season',seasonId:SHOP_SEASON_ID},
  'nyr.account.slot':{id:'nyr.account.slot',kind:'account',consumable:true,repeatable:true,priceHint:'4,99 €',title:'Charakterplatz',group:'account',tab:'account',preview:'slot',grant:{characterSlots:1}},
  'nyr.account.slots3':{id:'nyr.account.slots3',kind:'account',consumable:true,repeatable:true,priceHint:'11,99 €',title:'Drei Charakterplätze',group:'account',tab:'account',preview:'slot',grant:{characterSlots:3}},
  'nyr.account.vault':{id:'nyr.account.vault',kind:'account',consumable:true,repeatable:true,priceHint:'3,99 €',title:'Tresorflügel',group:'account',tab:'account',preview:'vault',grant:{vaultPages:1}},
  'nyr.account.vault2':{id:'nyr.account.vault2',kind:'account',consumable:true,repeatable:true,priceHint:'6,99 €',title:'Zwei Tresorflügel',group:'account',tab:'account',preview:'vault',grant:{vaultPages:2}},
  'nyr.collection.blackiron':{id:'nyr.collection.blackiron',kind:'cosmetic',consumable:false,priceHint:'11,99 €',title:'Schwarzeisen-Kollektion',group:'cosmetics',tab:'cosmetics',featured:true,preview:'collection',grant:{skin:'blackiron',weaponStyle:'blackedge',petStyle:'veil',title:'Schwarzeisen',emote:'veilmark'}}
});

export const SHARD_OFFERS=Object.freeze({
  'skin-bloodglass':{id:'skin-bloodglass',kind:'skin',value:'bloodglass',title:'Blutglas-Rüstung',cost:540,group:'rotation',tab:'cosmetics',preview:'character',lore:'Geschliffenes Rotglas aus einem versiegelten Riss.'},
  'skin-ashveil':{id:'skin-ashveil',kind:'skin',value:'ashveil',title:'Aschenschleier',cost:610,group:'rotation',tab:'cosmetics',preview:'character',lore:'Schwärzliche Stofflagen vom Rand eines erkalteten Risses.'},
  'skin-nightwoven':{id:'skin-nightwoven',kind:'skin',value:'nightwoven',title:'Nachtgewebe',cost:580,group:'rotation',tab:'cosmetics',preview:'character',lore:'Schmale Fäden aus Tinte, Bronze und altem Bannstoff.'},
  'skin-cindercoat':{id:'skin-cindercoat',kind:'skin',value:'cindercoat',title:'Glutmantel',cost:560,group:'rotation',tab:'cosmetics',preview:'character',lore:'Verkohlter Stoff mit ruhigen, kupfernen Nähten.'},
  'skin-ivorygrave':{id:'skin-ivorygrave',kind:'skin',value:'ivorygrave',title:'Elfenbeingrab',cost:640,group:'rotation',tab:'cosmetics',preview:'character',lore:'Helles Knochenweiß über stumpfem schwarzem Eisen.'},
  'weapon-riftglass':{id:'weapon-riftglass',kind:'weaponStyle',value:'riftglass',title:'Waffenstil · Rissglas',cost:420,group:'rotation',tab:'cosmetics',preview:'weapon',lore:'Kalte Reflexe laufen über jede Projektilspur.'},
  'weapon-blackedge':{id:'weapon-blackedge',kind:'weaponStyle',value:'blackedge',title:'Waffenstil · Schwarzklinge',cost:460,group:'rotation',tab:'cosmetics',preview:'weapon',lore:'Ruß, Messing und matte Schneiden statt Neonleuchten.'},
  'weapon-ashbone':{id:'weapon-ashbone',kind:'weaponStyle',value:'ashbone',title:'Waffenstil · Aschenknochen',cost:390,group:'rotation',tab:'cosmetics',preview:'weapon',lore:'Helles Knochenharz auf dunklem Stahl.'},
  'pet-veil':{id:'pet-veil',kind:'petStyle',value:'veil',title:'Gefährtenstil · Schleier',cost:360,group:'rotation',tab:'cosmetics',preview:'pet',lore:'Gedämpfte Violettöne und ein schmaler Schleiersaum.'},
  'pet-ember':{id:'pet-ember',kind:'petStyle',value:'ember',title:'Gefährtenstil · Glutkern',cost:390,group:'rotation',tab:'cosmetics',preview:'pet',lore:'Warme Glutpunkte ohne zusätzlichen Gameplayeffekt.'},
  'pet-ivory':{id:'pet-ivory',kind:'petStyle',value:'ivory',title:'Gefährtenstil · Elfenbein',cost:340,group:'rotation',tab:'cosmetics',preview:'pet',lore:'Helles Knochenweiß mit stumpfer Bronze.'},
  'title-nightwarden':{id:'title-nightwarden',kind:'title',value:'Nachtwächter',title:'Titel · Nachtwächter',cost:220,group:'rotation',tab:'cosmetics',preview:'title'},
  'title-cartographer':{id:'title-cartographer',kind:'title',value:'Risskartograf',title:'Titel · Risskartograf',cost:220,group:'rotation',tab:'cosmetics',preview:'title'},
  'account-vault':{id:'account-vault',kind:'vault',title:'Tresorflügel +8',cost:430,group:'account',tab:'account',preview:'vault'},
  'account-slot':{id:'account-slot',kind:'slot',title:'Charakterplatz',cost:520,group:'account',tab:'account',preview:'slot'},
  'guild-iron-banner':{id:'guild-iron-banner',kind:'guildCosmetic',value:'iron-banner',title:'Gildenbanner · Schwarze Wacht',cost:360,group:'guild',tab:'cosmetics',preview:'guild'}
});

export const SHOP_EVENT_NAMES=Object.freeze(['shop_open','shop_tab','product_view','preview_start','wishlist_add','wishlist_remove','purchase_start','purchase_cancel','purchase_complete','purchase_failed','purchase_restore','purchase_refund','shard_spend','product_equip','season_pass_open']);
export const PREMIUM_SKINS=Object.freeze(['veilborn','bloodglass','blackiron','gravegold','wayfarer','ashveil','nightwoven','cindercoat','ivorygrave']);
export const PREMIUM_WEAPON_STYLES=Object.freeze(['default','riftglass','blackedge','ashbone']);
export const PREMIUM_PET_STYLES=Object.freeze(['default','veil','ember','ivory']);
export const PREMIUM_TITLES=Object.freeze(['Grenzgänger','Gründer der Wacht','Schwarzeisen','Nachtwächter','Risskartograf']);
export const PREMIUM_EMOTES=Object.freeze(['founder','veilmark']);
export const EARNED_ONLY_COSMETICS=Object.freeze({titles:Object.freeze(['Realmjäger']),skins:Object.freeze(['ashen'])});
export const vaultCapacity=account=>Math.min(64,16+8*Math.max(0,Math.min(6,Number(account?.commerce?.vaultPages)||0)));
const SHOP_ROTATION_MS=7*24*60*60*1000;
const uniq=(v,max=500)=>[...new Set(Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.length<100):[])].slice(0,max);
const capInt=(v,max)=>Math.max(0,Math.min(max,Math.floor(Number(v)||0)));
export function activeShardOffers(now=Date.now(),rotationIds=null){
  const permanent=Object.values(SHARD_OFFERS).filter(o=>o.group!=='rotation'),rotating=Object.values(SHARD_OFFERS).filter(o=>o.group==='rotation');
  const slot=Math.floor(Number(now||0)/SHOP_ROTATION_MS),start=slot*SHOP_ROTATION_MS,endAt=start+SHOP_ROTATION_MS;
  let selected=[];
  if(Array.isArray(rotationIds))selected=rotationIds.map(id=>SHARD_OFFERS[id]).filter(o=>o?.group==='rotation').slice(0,6);
  if(!selected.length)for(let i=0;i<Math.min(6,rotating.length);i++)selected.push(rotating[(slot+i)%rotating.length]);
  return{offers:[...selected,...permanent],rotation:{id:`black-counter-${slot}`,startsAt:start,endsAt:endAt,rotating:selected.map(o=>o.id)}};
}
export function isShardOfferActive(id,now=Date.now(),rotationIds=null){return activeShardOffers(now,rotationIds).offers.some(o=>o.id===id);}
export function publicStoreCatalog(now=Date.now(),{rotationIds=null,variant='ledger'}={}){const live=activeShardOffers(now,rotationIds);const safeVariant=['ledger','preview-first'].includes(variant)?variant:'ledger';return{currency:PREMIUM_CURRENCY,seasonId:SHOP_SEASON_ID,tabs:SHOP_TABS,variant:safeVariant,store:Object.values(STORE_PRODUCTS).map(({grant,...p})=>p),offers:live.offers,rotation:live.rotation};}
export function cleanCommerce(raw={}){const w=raw&&typeof raw==='object'?raw:{};return{
  shards:capInt(w.shards,10000000),shardDebt:capInt(w.shardDebt,10000000),vaultPages:capInt(w.vaultPages,6),founder:w.founder===true,
  seasonPremium:uniq(w.seasonPremium,100),owned:uniq(w.owned,500),wishlist:uniq(w.wishlist,100).filter(v=>Object.hasOwn(SHARD_OFFERS,v)||Object.hasOwn(STORE_PRODUCTS,v)),
  revokedProducts:uniq(w.revokedProducts,500),revokedSkins:uniq(w.revokedSkins,100),revokedWeaponStyles:uniq(w.revokedWeaponStyles,100),revokedPetStyles:uniq(w.revokedPetStyles,100),revokedTitles:uniq(w.revokedTitles,100),revokedEmotes:uniq(w.revokedEmotes,100)
};}
export function storeGrantRecord(product){const grant=product?.grant||{};return{productId:product?.id||'',kind:product?.kind||'',shards:capInt(product?.kind==='currency'?product.shards:grant.shards,10000000),characterSlots:capInt(grant.characterSlots,8),vaultPages:capInt(grant.vaultPages,6),skin:grant.skin||null,weaponStyle:grant.weaponStyle||null,petStyle:grant.petStyle||null,title:grant.title||null,emote:grant.emote||null,seasonId:product?.seasonId||null,founder:product?.founder===true};}
const unRevoke=(c,key,value)=>{if(!value)return;const a=c[key],i=a.indexOf(value);if(i>=0)a.splice(i,1);};
export function applyStoreGrant(profile,product){const c=profile.account.commerce,grant=product?.grant||{};
  if(product?.kind==='currency')c.shards=Math.min(10000000,c.shards+(product.shards||0));if(grant.shards)c.shards=Math.min(10000000,c.shards+grant.shards);
  if(c.shardDebt>0&&c.shards>0){const pay=Math.min(c.shards,c.shardDebt);c.shards-=pay;c.shardDebt-=pay;}
  if(grant.characterSlots)profile.account.characterSlots=Math.min(8,profile.account.characterSlots+grant.characterSlots);if(grant.vaultPages)c.vaultPages=Math.min(6,c.vaultPages+grant.vaultPages);
  if(grant.skin&&!profile.account.cosmetics.skins.includes(grant.skin))profile.account.cosmetics.skins.push(grant.skin);unRevoke(c,'revokedSkins',grant.skin);
  if(grant.weaponStyle&&!profile.account.cosmetics.weaponStyles.includes(grant.weaponStyle))profile.account.cosmetics.weaponStyles.push(grant.weaponStyle);unRevoke(c,'revokedWeaponStyles',grant.weaponStyle);
  if(grant.petStyle&&!profile.account.cosmetics.petStyles.includes(grant.petStyle))profile.account.cosmetics.petStyles.push(grant.petStyle);unRevoke(c,'revokedPetStyles',grant.petStyle);
  if(grant.title&&!profile.account.cosmetics.titles.includes(grant.title))profile.account.cosmetics.titles.push(grant.title);unRevoke(c,'revokedTitles',grant.title);
  if(grant.emote&&!profile.account.cosmetics.emotes.includes(grant.emote))profile.account.cosmetics.emotes.push(grant.emote);unRevoke(c,'revokedEmotes',grant.emote);
  if(product?.seasonId&&!c.seasonPremium.includes(product.seasonId))c.seasonPremium.push(product.seasonId);if(product?.founder)c.founder=true;
  if(!product?.repeatable&&!product?.consumable&&!c.owned.includes(product.id))c.owned.push(product.id);unRevoke(c,'revokedProducts',product?.id);return profile;
}
const remove=(arr,value)=>{const i=arr.indexOf(value);if(i>=0)arr.splice(i,1);};
export function reverseStoreGrant(profile,grant={}){const c=profile.account.commerce,productId=String(grant.productId||'');if(productId&&!c.revokedProducts.includes(productId))c.revokedProducts.push(productId);remove(c.owned,productId);
  const shards=capInt(grant.shards,10000000);if(shards){const fromBalance=Math.min(c.shards,shards);c.shards-=fromBalance;c.shardDebt=Math.min(10000000,c.shardDebt+(shards-fromBalance));}
  if(grant.characterSlots)profile.account.characterSlots=Math.max(4,profile.account.characterSlots-capInt(grant.characterSlots,8));if(grant.vaultPages)c.vaultPages=Math.max(0,c.vaultPages-capInt(grant.vaultPages,6));
  const revokeCosmetic=(list,activeKey,revokedKey,value,base='default')=>{if(!value)return;remove(list,value);if(!c[revokedKey].includes(value))c[revokedKey].push(value);if(profile.account.cosmetics[activeKey]===value)profile.account.cosmetics[activeKey]=base;};
  revokeCosmetic(profile.account.cosmetics.skins,'activeSkin','revokedSkins',grant.skin);revokeCosmetic(profile.account.cosmetics.weaponStyles,'activeWeaponStyle','revokedWeaponStyles',grant.weaponStyle);revokeCosmetic(profile.account.cosmetics.petStyles,'activePetStyle','revokedPetStyles',grant.petStyle);
  if(grant.title){remove(profile.account.cosmetics.titles,grant.title);if(!c.revokedTitles.includes(grant.title))c.revokedTitles.push(grant.title);if(profile.account.cosmetics.activeTitle===grant.title)profile.account.cosmetics.activeTitle='Reisender';}
  if(grant.emote){remove(profile.account.cosmetics.emotes,grant.emote);if(!c.revokedEmotes.includes(grant.emote))c.revokedEmotes.push(grant.emote);}
  if(grant.seasonId)remove(c.seasonPremium,grant.seasonId);if(grant.founder)c.founder=false;profile.title=profile.account.cosmetics.activeTitle;profile.skin=profile.account.cosmetics.activeSkin;return profile;
}
export function spendShardOffer(profile,offer){const c=profile.account.commerce;if(!offer||c.shardDebt>0||c.shards<offer.cost)return false;if(c.owned.includes(offer.id))return false;
  if(offer.kind==='slot'){if(profile.account.characterSlots>=8)return false;profile.account.characterSlots++;}
  if(offer.kind==='vault'){if(c.vaultPages>=6)return false;c.vaultPages++;}
  if(offer.kind==='skin'&&!profile.account.cosmetics.skins.includes(offer.value))profile.account.cosmetics.skins.push(offer.value);
  if(offer.kind==='weaponStyle'&&!profile.account.cosmetics.weaponStyles.includes(offer.value))profile.account.cosmetics.weaponStyles.push(offer.value);
  if(offer.kind==='petStyle'&&!profile.account.cosmetics.petStyles.includes(offer.value))profile.account.cosmetics.petStyles.push(offer.value);
  if(offer.kind==='title'&&!profile.account.cosmetics.titles.includes(offer.value))profile.account.cosmetics.titles.push(offer.value);
  c.shards-=offer.cost;c.owned.push(offer.id);return true;
}
