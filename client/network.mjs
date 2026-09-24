// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { SnapshotAssembler, SNAPSHOT_CODEC } from '../shared/snapshot-wire.mjs';
import { PROTOCOL } from '../shared/data.mjs';
import { normalizeServerAddress, normalizeRegion, SnapshotDecoder } from './protocol.mjs';
// A new generation invalidates every pending response; a replaced login never reconnects itself.
export class GameNetwork {
  constructor(onSnapshot,onStatus,options={}) {
    this.onSnapshot=onSnapshot; this.onStatus=onStatus;
    this.connected=false; this.base=''; this.bases=[]; this.baseIndex=0; this.token=''; this.id=''; this.room='';
    this.abort=null; this.sequence=0; this.busy=false; this.closed=true; this.generation=0;
    this.retryTimer=null; this.retryResolve=null; this.config=null;
    this.lastRevision=-1; this.epoch=null; this.lastSnapshotAt=0;
    this.metrics={rtt:0,reconnects:0,snapshots:0,retry:0,wireBytes:0,deltaFrames:0,fullFrames:0,inputs:0};
    this.inputLease=0;this.lastInputPayload='';this.lastInputSentAt=0;
    this.retryDelays=options.retryDelays||[500,1000,2000,4000,5000];
    this.streamTimeout=options.streamTimeout||7000;this.sessionTimeout=options.sessionTimeout||10000;
    this.fetch=options.fetch||((...args)=>globalThis.fetch(...args));
  }
  static validBase(value) { return normalizeServerAddress(value); }
  validGeneration(g) { return !this.closed && g===this.generation; }
  acceptSnapshot(state,generation) {
    if (!this.validGeneration(generation)) return false;
    if (!state || state.version!==PROTOCOL || !Array.isArray(state.players) || !Array.isArray(state.enemies)) throw Object.assign(new Error('Unpassende Protokollversion.'),{terminal:true});
    if (state.wireEpoch && Number.isSafeInteger(state.revision)) {
      if(this.epoch && this.epoch!==state.wireEpoch) return false;
      if(state.revision<=this.lastRevision) return false;
      this.epoch=state.wireEpoch; this.lastRevision=state.revision;
    }
    this.lastSnapshotAt=Date.now(); this.metrics.snapshots++; this.onSnapshot(state); return true;
  }
  async openSession(generation) {
    const response=await this.fetch(this.base+'/api/session',{
      method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},
      body:JSON.stringify({...this.config,protocol:PROTOCOL}),signal:GameNetwork.timeout(this.sessionTimeout),credentials:'omit'
    });
    const result=await response.json();
    if(!response.ok) throw Object.assign(new Error(result.error||'Spielserver nicht erreichbar.'),{terminal:[400,401,403].includes(response.status)||(response.status===409&&result.retryable!==true)});
    if(!this.validGeneration(generation))throw Object.assign(new Error('Verbindung abgebrochen.'),{terminal:true});
    if(result.protocol!==PROTOCOL)throw Object.assign(new Error('Unpassende Spielversion.'),{terminal:true});
    this.token=result.token; this.id=result.playerId; this.room=result.room;
    this.sequence=result.nextSequence; this.busy=false;this.inputLease++;this.lastInputPayload='';this.lastInputSentAt=0; this.epoch=null; this.lastRevision=-1;
    this.acceptSnapshot(result.snapshot,generation); return result;
  }
  async connect({base,bases=[],name,classId,room,token=''}) {
    this.disconnect(); this.bases=[base,...bases].filter(Boolean).map(GameNetwork.validBase).filter((v,i,a)=>a.indexOf(v)===i); this.baseIndex=0; this.base=this.bases[0]; this.config={name,classId,room:normalizeRegion(room)};
    this.closed=false; this.token=token; const generation=++this.generation; this.onStatus('connecting');
    let lastError=null;
    for(let attempt=0;attempt<this.bases.length;attempt++) {
      this.baseIndex=attempt;this.base=this.bases[attempt];
      try {
        const result=await this.openSession(generation);
        this.streamLoop(generation).catch(error=>{if(this.validGeneration(generation)){this.connected=false;this.onStatus('disconnected',error.message);}});
        return result;
      } catch(error) {lastError=error;if(error.terminal)break;}
    }
    if(this.validGeneration(generation))this.disconnect();throw lastError||new Error('Spielserver nicht erreichbar.');
  }
  async waitRetry(ms) {
    await new Promise(resolve=>{this.retryResolve=resolve;this.retryTimer=setTimeout(()=>{this.retryTimer=null;this.retryResolve=null;resolve();},ms);});
  }
  async streamLoop(generation) {
    let failures=0;
    while(this.validGeneration(generation)) {
      const before=this.metrics.snapshots;
      try { await this.readStream(generation); }
      catch(error) {
        if(!this.validGeneration(generation))return;
        this.connected=false;
        if(error.terminal)throw error;
        if(this.metrics.snapshots-before>=10)failures=0; // Only a genuinely recovered stream resets the budget.
        let reopened=false;
        while(this.validGeneration(generation)&&failures<this.retryDelays.length) {
          const wait=this.retryDelays[failures++];this.metrics.retry=failures;if(this.bases.length>1){this.baseIndex=(this.baseIndex+1)%this.bases.length;this.base=this.bases[this.baseIndex];}
          this.onStatus('reconnecting',`Verbindung unterbrochen. Neuer Versuch ${failures}/${this.retryDelays.length} … Deine Figur ist zunächst weiter verwundbar.`);
          await this.waitRetry(wait); if(!this.validGeneration(generation))return;
          try {await this.openSession(generation);this.metrics.reconnects++;reopened=true;break;}
          catch(next){if(next.terminal)throw next;}
        }
        if(!reopened)throw new Error('Automatische Wiederverbindung beendet. Prüfe das Netz und wähle „Neu verbinden“.');
      }
    }
  }
  async readStream(generation) {
    const controller=new AbortController();this.abort=controller;
    let idle=setTimeout(()=>controller.abort(),this.streamTimeout);
    try {
      const response=await this.fetch(this.base+'/api/stream?codec='+SNAPSHOT_CODEC,{headers:{Authorization:`Bearer ${this.token}`},signal:controller.signal,credentials:'omit'});
      if(!response.ok||!response.body)throw Object.assign(new Error('Spielverbindung unterbrochen.'),{terminal:[401,403,409].includes(response.status)});
      if(!this.validGeneration(generation))return;
      const reader=response.body.getReader();
      const assembler=new SnapshotAssembler();
      const decoder=new SnapshotDecoder(message=>{
        if(!this.validGeneration(generation))return;
        if(message.type==='replaced'||message.type==='maintenance')throw Object.assign(new Error(message.message||(message.type==='replaced'?'Diese Figur wurde in einem anderen Fenster geöffnet.':'Spielserver im Wartungsmodus.')),{terminal:true});
        if(message.type==='snapshot'||message.type==='delta') {
          const next=assembler.accept(message);this.metrics[message.type==='delta'?'deltaFrames':'fullFrames']++;
          if(!this.acceptSnapshot(next,generation))return;
          if(!this.connected){this.connected=true;this.metrics.retry=0;this.onStatus('connected');}
        }
      });
      try {while(this.validGeneration(generation)) {
        const {value,done}=await reader.read();if(done)break;
        clearTimeout(idle);idle=setTimeout(()=>controller.abort(),this.streamTimeout);this.metrics.wireBytes+=value.byteLength;decoder.push(value);
      }} finally {try{await reader.cancel();}catch{}reader.releaseLock();}
      if(this.validGeneration(generation))throw new Error('Verbindung verloren.');
    } finally {clearTimeout(idle);controller.abort();if(this.abort===controller)this.abort=null;}
  }
  async sendInput(input,{urgent=false}={}) {
    if(!this.connected||(this.busy&&!urgent))return;
    const payload=JSON.stringify(input),start=Date.now();
    if(!urgent&&payload===this.lastInputPayload&&start-this.lastInputSentAt<250)return;
    this.lastInputPayload=payload;this.lastInputSentAt=start;
    const lease=++this.inputLease,generation=this.generation;this.busy=true;this.metrics.inputs++;
    try {
      const r=await this.fetch(this.base+'/api/input',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.token}`},body:JSON.stringify({sequence:++this.sequence,input}),signal:GameNetwork.timeout(2500),credentials:'omit'});
      if(!this.validGeneration(generation))return;
      this.metrics.rtt=Math.round(this.metrics.rtt*.75+(Date.now()-start)*.25);
      if(r.status===401){this.disconnect();this.onStatus('disconnected','Zugang nicht mehr gültig. Bitte erneut anmelden.');}
    } catch { /* Stream watchdog owns reconnect. Inputs are deliberately NOT replayed. */ }
    finally {if(generation===this.generation&&lease===this.inputLease)this.busy=false;}
  }
  releaseInput(){return this.sendInput({dx:0,dy:0,angle:0,fire:false,auto:false},{urgent:true});}
  async action(action) {
    if(!this.connected)return false; const generation=this.generation;
    const requestId=globalThis.crypto?.randomUUID?.()||`a-${Date.now()}-${++GameNetwork.actionCounter}`;
    const body=JSON.stringify({...action,requestId});
    // At most one transport retry, with the SAME receipt ID. Never replay after a new session generation.
    for(let attempt=0;attempt<2;attempt++) {
      try {
        const r=await this.fetch(this.base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.token}`},body,signal:GameNetwork.timeout(5000),credentials:'omit'});
        if(!this.validGeneration(generation)||!r.ok)return false;
        const result=await r.json();if(!this.validGeneration(generation))return false;
        if(result.snapshot)this.acceptSnapshot(result.snapshot,generation);return result.accepted===true;
      } catch {if(!this.validGeneration(generation)||!this.connected)return false;}
    }
    return false;
  }
  async api(path,method='GET',data=null) {
    const generation=this.generation;
    const r=await this.fetch(this.base+path,{method,headers:{Authorization:`Bearer ${this.token}`,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:GameNetwork.timeout(12000),credentials:'omit'});
    const result=await r.json();if(!this.validGeneration(generation))throw new Error('Verbindung wurde gewechselt.');
    if(!r.ok)throw new Error(result.error||'Serveranfrage fehlgeschlagen.');return result;
  }
  static timeout(ms) {if(typeof AbortSignal.timeout==='function')return AbortSignal.timeout(ms);const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;}
  static async authenticate(base,data,recovery=false) {
    base=GameNetwork.validBase(base);const r=await fetch(base+'/api/account/'+(recovery?'recover':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:GameNetwork.timeout(12000),credentials:'omit'});
    const result=await r.json();if(!r.ok)throw new Error(result.error||'Anmeldung fehlgeschlagen.');return result;
  }
  disconnect() {
    this.closed=true;this.connected=false;this.generation++;this.busy=false;this.abort?.abort();this.abort=null;
    if(this.retryTimer)clearTimeout(this.retryTimer);this.retryTimer=null;this.retryResolve?.();this.retryResolve=null;
  }
}
GameNetwork.actionCounter=0;
