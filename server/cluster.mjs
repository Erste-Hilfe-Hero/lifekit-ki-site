// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Small dependency-free HA primitives used by Nyrathen v5 orchestration.
import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
export class ClusterBus extends EventEmitter{
 constructor(){super();this.nodes=new Map();this.setMaxListeners(1024)}
 register(node){if(!node?.id)throw new Error('node id required');this.nodes.set(node.id,{...node,seenAt:Date.now()});this.emit('node:up',this.nodes.get(node.id));return()=>this.unregister(node.id)}
 heartbeat(id,patch={}){const n=this.nodes.get(id);if(!n)return false;Object.assign(n,patch,{seenAt:Date.now()});return true}
 unregister(id){const n=this.nodes.get(id);if(!n)return false;this.nodes.delete(id);this.emit('node:down',n);return true}
 healthy(role,maxAge=5000){const now=Date.now();return [...this.nodes.values()].filter(n=>(!role||n.role===role)&&now-n.seenAt<=maxAge).sort((a,b)=>(a.load||0)-(b.load||0)||a.id.localeCompare(b.id))}
 publish(topic,payload){this.emit('message',{id:randomUUID(),topic,payload,at:Date.now()});this.emit(topic,payload)}
}
export class AccountLeaseRegistry{
 constructor({ttlMs=15000,now=()=>Date.now()}={}){this.ttlMs=ttlMs;this.now=now;this.leases=new Map();this.epochs=new Map()}
 acquire(accountId,nodeId){const at=this.now(),old=this.leases.get(accountId);if(old&&old.until>at&&old.nodeId!==nodeId)return null;if(old&&old.until>at&&old.nodeId===nodeId){old.until=at+this.ttlMs;return {...old};}const epoch=Math.max(old?.epoch||0,this.epochs.get(accountId)||0)+1;this.epochs.set(accountId,epoch);const lease={accountId,nodeId,epoch,until:at+this.ttlMs};this.leases.set(accountId,lease);return {...lease}}
 renew(accountId,nodeId,epoch){const at=this.now(),old=this.leases.get(accountId);if(!old||old.nodeId!==nodeId||old.epoch!==epoch||old.until<=at)return null;old.until=at+this.ttlMs;return {...old}}
 release(accountId,nodeId,epoch){const old=this.leases.get(accountId);if(!old||old.nodeId!==nodeId||old.epoch!==epoch)return false;this.leases.delete(accountId);return true}
 owner(accountId){const old=this.leases.get(accountId);if(!old)return null;if(old.until<=this.now()){this.leases.delete(accountId);return null}return {...old}}
}
export class NodeDirectory{
 constructor(bus){this.bus=bus}
 candidates(role='game'){return this.bus.healthy(role).map(n=>n.base).filter(Boolean)}
 choose(role='game',exclude=''){return this.bus.healthy(role).find(n=>n.id!==exclude)||null}
}

// Short-lived signed handoff metadata for rolling updates/failover. It is not an account bearer
// token and cannot authorize a login by itself; the destination still validates the account token.
import {createHmac,timingSafeEqual} from 'node:crypto';
export class ResumeTicketAuthority{
 constructor({secret,ttlMs=20000,now=()=>Date.now()}={}){if(typeof secret!=='string'||secret.length<32)throw new Error('resume secret must be at least 32 chars');this.secret=secret;this.ttlMs=ttlMs;this.now=now;}
 issue({accountId,nodeId,epoch,room}){const payload={accountId:String(accountId),nodeId:String(nodeId),epoch:Number(epoch)||0,room:String(room||'PUBLIC'),issuedAt:this.now(),expiresAt:this.now()+this.ttlMs,nonce:randomUUID()};const body=Buffer.from(JSON.stringify(payload)).toString('base64url'),sig=createHmac('sha256',this.secret).update(body).digest('base64url');return body+'.'+sig;}
 verify(ticket){if(typeof ticket!=='string'||ticket.length>2048)return null;const [body,sig,extra]=ticket.split('.');if(!body||!sig||extra)return null;const expected=createHmac('sha256',this.secret).update(body).digest('base64url'),a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return null;let payload;try{payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));}catch{return null;}if(!payload||typeof payload.accountId!=='string'||!Number.isFinite(payload.expiresAt)||payload.expiresAt<this.now())return null;return payload;}
}
