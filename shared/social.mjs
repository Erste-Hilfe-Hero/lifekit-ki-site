// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Shared by the local game and the server. Guild permissions are never client-owned.
import { cleanName } from './engine.mjs';
const socialCopy=v=>JSON.parse(JSON.stringify(v));
export class GuildService {
  constructor(raw=null) {
    this.guilds=new Map();this.membership=new Map();this.messages=[];this.seq=0;this.friends=new Map();this.friendRequests=[];
    if(![1,2].includes(raw?.version)||!Array.isArray(raw.guilds))return;
    for(const entry of raw.guilds.slice(0,2000)) {
      if(!entry||typeof entry.id!=='string'||!Array.isArray(entry.members))continue;
      const members=entry.members.filter(m=>m&&typeof m.id==='string'&&m.id.length<100&&!this.membership.has(m.id)).slice(0,30).map(m=>({id:m.id,name:cleanName(m.name)}));
      if(!members.length)continue;
      const board=String(entry.board||'').normalize('NFKC').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,240);
      const guild={id:entry.id,name:cleanName(entry.name),code:String(entry.code||'').slice(0,20),leader:members.some(m=>m.id===entry.leader)?entry.leader:members[0].id,members,requests:[],bank:Math.max(0,Math.min(1e8,Math.floor(Number(entry.bank)||0))),board};
      this.guilds.set(guild.id,guild);for(const m of members)this.membership.set(m.id,guild.id);
    }
    if(raw.version===2){
      for(const row of Array.isArray(raw.friends)?raw.friends.slice(0,5000):[]){if(!row||typeof row.id!=='string'||!Array.isArray(row.contacts))continue;const map=this.friends.get(row.id)||new Map();for(const c of row.contacts.slice(0,50)){if(c&&typeof c.id==='string'&&c.id!==row.id)map.set(c.id,cleanName(c.name));}if(map.size)this.friends.set(row.id,map);}
      this.friendRequests=(Array.isArray(raw.friendRequests)?raw.friendRequests:[]).filter(r=>r&&typeof r.from==='string'&&typeof r.to==='string'&&r.from!==r.to).slice(-5000).map(r=>({from:r.from,to:r.to,fromName:cleanName(r.fromName),toName:cleanName(r.toName),at:Number.isFinite(r.at)?r.at:0}));
    }
  }
  replace(raw=null){const next=new GuildService(raw);this.guilds=next.guilds;this.membership=next.membership;this.friends=next.friends;this.friendRequests=next.friendRequests;this.messages=[];this.seq=0;return this;}
  get(id){return this.guilds.get(this.membership.get(id));}
  export(){return{version:2,guilds:[...this.guilds.values()].map(g=>({...socialCopy(g),requests:[]})),friends:[...this.friends].map(([id,contacts])=>({id,contacts:[...contacts].map(([friendId,name])=>({id:friendId,name}))})),friendRequests:socialCopy(this.friendRequests)};}
  view(id,onlineIds=new Set()) {
    const g=this.get(id);if(!g)return null;
    return {...socialCopy(g),level:1+Math.min(9,Math.floor(g.bank/500)),requests:g.leader===id?socialCopy(g.requests):[],members:g.members.map(m=>({...m,online:onlineIds.has(m.id),leader:m.id===g.leader}))};
  }
  action(p,a,engine) {
    const g=this.get(p.id),notice=text=>engine.notice(p,text);
    if(a.type==='guildCreate') {
      if(g||p.dead||engine.world(p).kind!=='nexus')return false;
      const name=cleanName(a.name);if(name.length<3)return notice('Gildenname: mindestens 3 Zeichen.');
      if(p.bank<100)return notice('Eine Gildengründung kostet 100 Riftmarken.');
      if([...this.guilds.values()].some(g=>g.name.toLowerCase()===name.toLowerCase()))return notice('Dieser Gildenname wird bereits verwendet.');
      if(this.guilds.size>=2000)return false;
      const unique=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+(++this.seq);
      const id='guild-'+unique,code='G'+unique.replace(/-/g,'').slice(0,9).toUpperCase();
      const guild={id,code,name,leader:p.id,members:[{id:p.id,name:p.name}],requests:[],bank:0,board:''};
      this.guilds.set(id,guild);this.membership.set(p.id,id);p.bank-=100;return true;
    }
    if(a.type==='guildRequest') {
      if(g||typeof a.code!=='string')return false;const target=[...this.guilds.values()].find(q=>q.code===a.code.trim().toUpperCase());
      if(!target||target.members.length>=30||target.requests.length>=30)return notice('Gilde nicht gefunden oder bereits voll.');
      // Only one outstanding request per account; requests cannot be forged for another player.
      for(const q of this.guilds.values())q.requests=q.requests.filter(r=>r.id!==p.id);
      target.requests.push({id:p.id,name:p.name});return true;
    }
    if(!g)return false;
    if(a.type==='guildApprove') {
      if(g.leader!==p.id||g.members.length>=30)return false;
      const request=g.requests.find(q=>q.id===a.playerId);if(!request||this.membership.has(request.id))return false;
      g.requests=g.requests.filter(q=>q.id!==request.id);g.members.push(request);this.membership.set(request.id,g.id);return true;
    }
    if(a.type==='guildDecline') {if(g.leader!==p.id)return false;const before=g.requests.length;g.requests=g.requests.filter(q=>q.id!==a.playerId);return before!==g.requests.length;}
    if(a.type==='guildPromote') {if(g.leader!==p.id||!g.members.some(q=>q.id===a.playerId)||a.playerId===p.id)return false;g.leader=a.playerId;return true;}
    if(a.type==='guildKick'||a.type==='guildLeave') {
      const target=a.type==='guildLeave'?p.id:a.playerId;
      if(a.type==='guildKick'&&(g.leader!==p.id||target===p.id))return false;
      if(!g.members.some(m=>m.id===target))return false;
      g.members=g.members.filter(m=>m.id!==target);this.membership.delete(target);
      if(!g.members.length)this.guilds.delete(g.id);else if(g.leader===target)g.leader=g.members[0].id;return true;
    }
    if(a.type==='guildSetBoard') {
      if(g.leader!==p.id)return false;
      const board=String(a.text||'').normalize('NFKC').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,240);
      if(board===g.board)return false;g.board=board;return true;
    }
    if(a.type==='guildDonate') {
      if(p.dead||engine.world(p).kind!=='nexus'||!Number.isSafeInteger(a.amount)||a.amount<1||a.amount>10000||p.bank<a.amount)return false;
      p.bank-=a.amount;g.bank+=a.amount;return true;
    }
    return false;
  }

  friendView(id,online=new Map()) {
    const contacts=this.friends.get(id)||new Map();
    const incoming=this.friendRequests.filter(r=>r.to===id).map(r=>({id:r.from,name:online.get(r.from)||r.fromName,online:online.has(r.from)}));
    const outgoing=this.friendRequests.filter(r=>r.from===id).map(r=>({id:r.to,name:online.get(r.to)||r.toName,online:online.has(r.to)}));
    return {max:50,contacts:[...contacts].map(([friendId,name])=>({id:friendId,name:online.get(friendId)||name,online:online.has(friendId)})).sort((a,b)=>Number(b.online)-Number(a.online)||a.name.localeCompare(b.name)),incoming,outgoing};
  }
  friendAction(p,a,engine) {
    const contacts=this.friends.get(p.id)||new Map(),notice=text=>engine.notice(p,text);
    if(a.type==='friendRequest') {
      if(typeof a.playerId!=='string'||a.playerId===p.id||contacts.has(a.playerId)||contacts.size>=50)return false;
      const target=engine.players.get(a.playerId);if(!target||target.dead||!target.connected)return notice('Dieser Spieler ist in deiner Region nicht verfügbar.');
      if((this.friends.get(target.id)?.size||0)>=50)return notice('Die Freundesliste des Spielers ist voll.');
      const reciprocal=this.friendRequests.find(r=>r.from===target.id&&r.to===p.id);
      if(reciprocal){this.friendRequests=this.friendRequests.filter(r=>r!==reciprocal);this.#addFriend(p.id,p.name,target.id,target.name);return true;}
      if(this.friendRequests.some(r=>r.from===p.id&&r.to===target.id))return notice('Freundschaftsanfrage wurde bereits gesendet.');
      this.friendRequests.push({from:p.id,to:target.id,fromName:p.name,toName:target.name,at:Date.now()});this.friendRequests=this.friendRequests.slice(-5000);return true;
    }
    if(a.type==='friendAccept') {
      if(typeof a.playerId!=='string'||contacts.size>=50)return false;const req=this.friendRequests.find(r=>r.from===a.playerId&&r.to===p.id);if(!req)return false;
      if((this.friends.get(req.from)?.size||0)>=50)return notice('Die Freundesliste des Spielers ist voll.');
      this.friendRequests=this.friendRequests.filter(r=>r!==req);this.#addFriend(p.id,p.name,req.from,req.fromName);return true;
    }
    if(a.type==='friendDecline') {const before=this.friendRequests.length;this.friendRequests=this.friendRequests.filter(r=>!(r.from===a.playerId&&r.to===p.id)&&!(r.from===p.id&&r.to===a.playerId));return before!==this.friendRequests.length;}
    if(a.type==='friendRemove') {if(typeof a.playerId!=='string'||!contacts.has(a.playerId))return false;contacts.delete(a.playerId);if(!contacts.size)this.friends.delete(p.id);const other=this.friends.get(a.playerId);other?.delete(p.id);if(other&&!other.size)this.friends.delete(a.playerId);return true;}
    return false;
  }
  #addFriend(aId,aName,bId,bName){const a=this.friends.get(aId)||new Map(),b=this.friends.get(bId)||new Map();a.set(bId,cleanName(bName));b.set(aId,cleanName(aName));this.friends.set(aId,a);this.friends.set(bId,b);}
  chat(p,a,engine) {
    const g=this.get(p.id);if(!g||engine.time-(p.lastChat??-10)<.8)return false;
    const text=(typeof a.text==='string'?a.text:'').normalize('NFKC').replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,180);if(!text)return false;
    p.lastChat=engine.time;this.messages.push({id:'gmsg-'+(++this.seq),guildId:g.id,playerId:p.id,name:p.name,text,time:Date.now(),system:false});this.messages=this.messages.slice(-150);return true;
  }
  removeAccount(id){const changed=this.membership.has(id)||this.friends.has(id)||this.friendRequests.some(r=>r.from===id||r.to===id)||[...this.guilds.values()].some(g=>g.requests.some(m=>m.id===id))||[...this.friends.values()].some(contacts=>contacts.has(id));for(const q of this.guilds.values())q.requests=q.requests.filter(m=>m.id!==id);const g=this.get(id);if(g){g.members=g.members.filter(m=>m.id!==id);this.membership.delete(id);if(!g.members.length)this.guilds.delete(g.id);else if(g.leader===id)g.leader=g.members[0].id;}for(const q of this.guilds.values())q.requests=q.requests.filter(m=>m.id!==id);this.friendRequests=this.friendRequests.filter(r=>r.from!==id&&r.to!==id);for(const contacts of this.friends.values())contacts.delete(id);this.friends.delete(id);for(const [key,contacts] of [...this.friends])if(!contacts.size)this.friends.delete(key);return changed;}
}
