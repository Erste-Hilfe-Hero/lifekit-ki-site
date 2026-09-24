// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {createHmac,createHash,randomBytes} from 'node:crypto';
import {stateRequestSignature} from './state-authority.mjs';
export class StateAuthorityClient{
  constructor({url,secret,timeoutMs=8000,nodeId='game',guestOpenBatchMs=3,guestOpenBatchMax=64}={}){this.url=String(url||'').replace(/\/$/,'');this.secret=String(secret||'');this.timeoutMs=timeoutMs;this.nodeId=String(nodeId||'game');this.guestOpenBatchMs=Math.max(0,Math.min(25,Number(guestOpenBatchMs)||0));this.guestOpenBatchMax=Math.max(1,Math.min(128,Number(guestOpenBatchMax)||64));this.guestOpenQueue=[];this.guestOpenTimer=null;this.guestOpenFlushing=false;if(!/^https?:\/\//.test(this.url))throw new Error('STATE_AUTHORITY_URL must be http(s)');if(this.secret.length<32)throw new Error('STATE_AUTHORITY_SECRET must be at least 32 characters');}
  hash(token){return createHash('sha256').update(token).digest('hex');}
  async rpc(op,args={}){const text=JSON.stringify({op,args}),ts=Date.now(),nonce=randomBytes(18).toString('base64url'),signature=stateRequestSignature(this.secret,ts,nonce,text);let response;try{response=await fetch(this.url+'/rpc',{method:'POST',headers:{'Content-Type':'application/json','X-Nyrathen-State-Ts':String(ts),'X-Nyrathen-State-Nonce':nonce,'X-Nyrathen-State-Signature':signature},body:text,signal:AbortSignal.timeout(this.timeoutMs)});}catch(e){throw Object.assign(new Error('State authority unavailable: '+e.message),{status:503});}let payload;try{payload=await response.json();}catch{payload={};}if(!response.ok)throw Object.assign(new Error(payload.error||`State authority HTTP ${response.status}`),{status:response.status,revision:payload.revision});return payload.result;}
  find(token){return this.rpc('profile.find',{token});}
  openSession({token=null,name=null,classId=null}={}){if(token)return this.rpc('session.open',{token,name,classId,nodeId:this.nodeId});return this.queueGuestOpen({name,classId});}
  queueGuestOpen({name,classId}){return new Promise((resolve,reject)=>{this.guestOpenQueue.push({name,classId,resolve,reject});if(this.guestOpenQueue.length>=this.guestOpenBatchMax){if(this.guestOpenTimer){clearTimeout(this.guestOpenTimer);this.guestOpenTimer=null;}void this.flushGuestOpenQueue();}else if(!this.guestOpenTimer)this.guestOpenTimer=setTimeout(()=>{this.guestOpenTimer=null;void this.flushGuestOpenQueue();},this.guestOpenBatchMs);});}
  async flushGuestOpenQueue(){if(this.guestOpenFlushing||!this.guestOpenQueue.length)return;this.guestOpenFlushing=true;try{while(this.guestOpenQueue.length){const batch=this.guestOpenQueue.splice(0,this.guestOpenBatchMax);try{const result=await this.rpc('session.openBatch',{nodeId:this.nodeId,sessions:batch.map(row=>({name:row.name,classId:row.classId}))});if(!Array.isArray(result)||result.length!==batch.length)throw new Error('invalid session.openBatch result');batch.forEach((row,index)=>row.resolve(result[index]));}catch(error){batch.forEach(row=>row.reject(error));}}}finally{this.guestOpenFlushing=false;if(this.guestOpenQueue.length&&!this.guestOpenTimer)this.guestOpenTimer=setTimeout(()=>{this.guestOpenTimer=null;void this.flushGuestOpenQueue();},this.guestOpenBatchMs);}}
  create(name,classId){return this.rpc('profile.create',{name,classId});}
  save(id,profile){return this.rpc('profile.save',{id,profile});}
  delete(id){return this.rpc('profile.delete',{id});}
  persistBatch(batch){return this.rpc('profile.persistBatch',batch);}
  loadWorld(name){return this.rpc('world.load',{name});}
  saveWorld(name,state){return this.rpc('world.save',{name,state});}
  loadSocial(){return this.rpc('social.load');}
  saveSocial(state,expectedRevision){return this.rpc('social.save',{state,expectedRevision});}
  accountInfo(id){return this.rpc('account.info',{id});}
  register(id,username,password){return this.rpc('account.register',{id,username,password});}
  authenticate(username,password){return this.rpc('account.authenticate',{username,password});}
  recover(username,recoveryCode,password){return this.rpc('account.recover',{username,recoveryCode,password});}
  rotateToken(id){return this.rpc('account.rotateToken',{id}).then(r=>r.token);}
  receipt(playerId,requestId){return this.rpc('receipt.get',{playerId,requestId});}
  commerceReceipt(provider,transactionId){return this.rpc('commerce.get',{provider,transactionId});}
  commerceHistory(playerId,limit=100){return this.rpc('commerce.history',{playerId,limit});}
  commerceReport(){return this.rpc('commerce.report');}
  commerceRedeem(value){return this.rpc('commerce.redeem',value);}
  commerceRevoke(provider,transactionId,actor='store-webhook',reason='store refund'){return this.rpc('commerce.revoke',{provider,transactionId,actor,reason});}
  commerceEvent(playerId,event,productId=null){return this.rpc('commerce.event',{playerId,event,productId});}
  recordActivity(playerId,at=Date.now()){return this.rpc('analytics.session',{playerId,at});}
  analyticsReport(){return this.rpc('analytics.report');}
  leaderboards(theme=null){return this.rpc('leaderboards',{theme});}
  safetySummary(id){return this.rpc('safety.summary',{id});}
  safetyBatch(ids){return this.rpc('safety.batchSummary',{ids});}
  safetyBlock(owner,target,enabled){return this.rpc('safety.block',{owner,target,enabled});}
  safetyReport(reporter,target,reason,quote){return this.rpc('safety.report',{reporter,target,reason,quote});}
  canCommunicate(a,b){return this.rpc('safety.canCommunicate',{a,b}).then(r=>!!r.allowed);}
  canChat(id){return this.rpc('safety.canChat',{id}).then(r=>!!r.allowed);}
  banStatus(id){return this.rpc('safety.banStatus',{id});}
  heartbeat(players=0){return this.rpc('node.heartbeat',{nodeId:this.nodeId,players});}
  heartbeatBatch(players=0,leases=[]){return this.rpc('node.heartbeatBatch',{nodeId:this.nodeId,players,leases});}
  nodeDown(){return this.rpc('node.down',{nodeId:this.nodeId});}
  acquireLease(accountId){return this.rpc('lease.acquire',{accountId,nodeId:this.nodeId});}
  renewLease(accountId,epoch){return this.rpc('lease.renew',{accountId,nodeId:this.nodeId,epoch});}
  renewLeases(leases){return this.rpc('lease.renewBatch',{leases,nodeId:this.nodeId});}
  releaseLease(accountId,epoch){return this.rpc('lease.release',{accountId,nodeId:this.nodeId,epoch});}
  acquireLock(key){return this.rpc('lock.acquire',{key,nodeId:this.nodeId});}
  renewLock(key,epoch){return this.rpc('lock.renew',{key,nodeId:this.nodeId,epoch});}
  releaseLock(key,epoch){return this.rpc('lock.release',{key,nodeId:this.nodeId,epoch});}
}

export class DistributedSafetyCache{
  constructor(client){this.client=client;this.cache=new Map();}
  prime(id,value){if(!id)return value;this.cache.set(id,{value:value||{blocked:[],chatMutedUntil:0,chatMuteReason:''},at:Date.now(),blocked:new Set((value?.blocked||[]).map(x=>x.id))});return value;}
  async refresh(id){if(!id)return null;return this.prime(id,await this.client.safetySummary(id));}
  async refreshBatch(ids){const unique=[...new Set((ids||[]).filter(Boolean))];if(!unique.length)return{};const values=await this.client.safetyBatch(unique);for(const id of unique)this.prime(id,values?.[id]);return values||{};}
  async refreshIfStale(id,maxAge=1000){const c=this.cache.get(id);if(!c||Date.now()-c.at>maxAge)return this.refresh(id);return c.value;}
  summary(id){return this.cache.get(id)?.value||{blocked:[],chatMutedUntil:0,chatMuteReason:''};}
  blocked(id){return this.cache.get(id)?.blocked||new Set();}
  banStatus(id,now=Date.now()){const b=this.cache.get(id)?.value?.ban;return b&&b.until>now?b:null;}
  filterChat(owner,messages){const blocked=this.blocked(owner);return messages.filter(m=>m.system||!blocked.has(m.playerId));}
  canCommunicate(a,b){return typeof a==='string'&&typeof b==='string'&&a!==b&&!this.blocked(a).has(b)&&!this.blocked(b).has(a);}
  canTrade(a,b){return this.canCommunicate(a,b);}
  canChat(id){return Number(this.cache.get(id)?.value?.chatMutedUntil||0)<=Date.now();}
  async setBlock(owner,target,enabled){const value=await this.client.safetyBlock(owner,target,enabled);this.cache.set(owner,{value,at:Date.now(),blocked:new Set((value?.blocked||[]).map(x=>x.id))});return true;}
  async report(reporter,target,reason,quote=''){return this.client.safetyReport(reporter,target,reason,quote);}
  prune(){}
  clearCache(){this.cache.clear();}
}
