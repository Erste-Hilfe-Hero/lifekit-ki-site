// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Transport-only patches. The authoritative simulation and stored profiles stay exact.
// A baseline belongs to ONE SSE stream; HTTP action replies must never advance it.
export const SNAPSHOT_CODEC = 'delta-v1';
const WIRE_COLLECTIONS = Object.freeze({players:'id', enemies:'id', bullets:'id', loot:'id', portals:'id', graves:'id', effects:'id', pets:'id', events:'seq', chat:'id'});
const WIRE_UNSAFE = new Set(['__proto__','prototype','constructor']);
const wireClone = value => typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const wireEqual = (a,b) => {if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;return JSON.stringify(a)===JSON.stringify(b);};
const wireKey = id => typeof id+':'+id;
const wireRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function wireAssert(condition,message='Ungültige Differenznachricht.') { if(!condition) throw new Error(message); }
function wireSafe(value,depth=0) {
  wireAssert(depth<24,'Servernachricht ist zu tief verschachtelt.');
  if(value===null||typeof value!=='object')return;
  wireAssert(Object.keys(value).length<=10000,'Zu viele Einträge in einer Servernachricht.');
  for(const key of Object.keys(value)){wireAssert(!WIRE_UNSAFE.has(key),'Unzulässiger Feldname.');wireSafe(value[key],depth+1);}
}
function wireIndex(records,key) {
  if(!Array.isArray(records)||records.length>5000)return null;
  const map=new Map();
  for(const item of records){
    if(!wireRecord(item)||!['number','string'].includes(typeof item[key]))return null;
    const id=wireKey(item[key]);if(map.has(id))return null;map.set(id,item);
  }
  return map;
}
function wireObjectPatch(previous,next) {
  const set={},remove=[];
  for(const key of Object.keys(previous))if(!Object.hasOwn(next,key))remove.push(key);
  for(const key of Object.keys(next))if(!Object.hasOwn(previous,key)||!wireEqual(previous[key],next[key]))set[key]=next[key];
  return {set,remove};
}
function wireArrayPatch(previous,next,key) {
  const before=wireIndex(previous,key),after=wireIndex(next,key);if(!before||!after)return null;
  const remove=[],add=[],change=[];
  for(const [id,item] of before)if(!after.has(id))remove.push(item[key]);
  for(const [id,item] of after){
    if(!before.has(id)){add.push(item);continue;}
    const patch=wireObjectPatch(before.get(id),item);
    if(Object.keys(patch.set).length||patch.remove.length)change.push([item[key],patch.set,patch.remove]);
  }
  const natural=[...before.keys()].filter(id=>after.has(id)).concat(add.map(item=>wireKey(item[key])));
  const finalKeys=[...after.keys()];
  const order=natural.every((id,i)=>id===finalKeys[i])?null:next.map(item=>item[key]);
  return {remove,add,change,...(order?{order}:{})};
}
function wireApplyObject(previous,patch) {
  wireAssert(wireRecord(previous)&&wireRecord(patch)&&wireRecord(patch.set)&&Array.isArray(patch.remove));
  const result={...previous};
  for(const key of patch.remove){wireAssert(typeof key==='string'&&!WIRE_UNSAFE.has(key));delete result[key];}
  for(const [key,value] of Object.entries(patch.set)){wireAssert(!WIRE_UNSAFE.has(key));result[key]=value;}
  return result;
}
function wireApplyArray(previous,patch,key) {
  const map=wireIndex(previous,key);wireAssert(map&&wireRecord(patch));
  wireAssert(Array.isArray(patch.remove)&&Array.isArray(patch.add)&&Array.isArray(patch.change));
  for(const id of patch.remove)wireAssert(map.delete(wireKey(id)),'Entferntes Objekt fehlt in der Zustandsbasis.');
  for(const item of patch.add){wireAssert(wireRecord(item)&&['number','string'].includes(typeof item[key]));const id=wireKey(item[key]);wireAssert(!map.has(id),'Doppelte Objektkennung.');map.set(id,item);}
  for(const change of patch.change){
    wireAssert(Array.isArray(change)&&change.length===3);const [id,set,remove]=change,hash=wireKey(id);
    wireAssert(map.has(hash),'Geändertes Objekt fehlt in der Zustandsbasis.');
    const item=wireApplyObject(map.get(hash),{set,remove});wireAssert(wireKey(item[key])===hash,'Objektkennung darf nicht verändert werden.');map.set(hash,item);
  }
  wireAssert(map.size<=5000);
  if(patch.order){
    wireAssert(Array.isArray(patch.order)&&patch.order.length===map.size);
    const keys=patch.order.map(wireKey);wireAssert(new Set(keys).size===map.size&&keys.every(id=>map.has(id)));
    return keys.map(id=>map.get(id));
  }
  return [...map.values()];
}
export class SnapshotEncoder {
  constructor({keyframeEvery=50,trustInput=false,measureReference=true}={}){
    this.previous=null;this.frames=0;this.keyframeEvery=Math.max(1,keyframeEvery);this.trustInput=trustInput;this.measureReference=measureReference;this.lastFullBytes=0;
  }
  reset(){this.previous=null;this.frames=0;this.lastFullBytes=0;}
  encode(raw) {
    // Server snapshots are freshly allocated and can opt into trustInput to avoid a complete deep
    // clone on every 10 Hz frame. Tests/default callers keep defensive cloning semantics.
    const state=this.trustInput?raw:wireClone(raw),previous=this.previous;
    const keyframe=!previous||this.frames%this.keyframeEvery===0||previous.wireEpoch!==state.wireEpoch||previous.world?.id!==state.world?.id||previous.seed!==state.seed||previous.version!==state.version;
    let message,text,fullText=null,referenceBytes=this.lastFullBytes;
    if(keyframe){
      message={type:'snapshot',codec:SNAPSHOT_CODEC,state};text=JSON.stringify(message);fullText=text;referenceBytes=typeof Buffer!=='undefined'?Buffer.byteLength(text):text.length;this.lastFullBytes=referenceBytes;
    }else{
      const set={},remove=[],entities={};
      for(const key of Object.keys(previous))if(!Object.hasOwn(state,key))remove.push(key);
      for(const [key,value] of Object.entries(state)){
        if(Object.hasOwn(WIRE_COLLECTIONS,key)){
          const delta=wireArrayPatch(previous[key],value,WIRE_COLLECTIONS[key]);
          if(delta){
            const changed=delta.remove.length||delta.add.length||delta.change.length||delta.order;
            if(changed)entities[key]=delta;
            continue;
          }
        }
        if(!wireEqual(previous[key],value))set[key]=value;
      }
      const candidate={type:'delta',codec:SNAPSHOT_CODEC,base:previous.revision,epoch:state.wireEpoch,revision:state.revision,set,remove,entities};
      const candidateText=JSON.stringify(candidate);
      if(this.measureReference){
        const full={type:'snapshot',codec:SNAPSHOT_CODEC,state};fullText=JSON.stringify(full);referenceBytes=typeof Buffer!=='undefined'?Buffer.byteLength(fullText):fullText.length;this.lastFullBytes=referenceBytes;
        if(candidateText.length<fullText.length){message=candidate;text=candidateText;}else{message=full;text=fullText;}
      }else if(!this.lastFullBytes||candidateText.length>this.lastFullBytes*.9){
        const full={type:'snapshot',codec:SNAPSHOT_CODEC,state};fullText=JSON.stringify(full);referenceBytes=typeof Buffer!=='undefined'?Buffer.byteLength(fullText):fullText.length;this.lastFullBytes=referenceBytes;
        if(candidateText.length<fullText.length){message=candidate;text=candidateText;}else{message=full;text=fullText;}
      }else{message=candidate;text=candidateText;}
    }
    this.previous=state;this.frames++;
    return {message,text,fullText,referenceBytes};
  }
}
export class SnapshotAssembler {
  constructor(){this.state=null;}
  reset(){this.state=null;}
  accept(message){
    wireAssert(wireRecord(message));wireSafe(message);
    if(message.type==='snapshot'){
      wireAssert(wireRecord(message.state)&&Array.isArray(message.state.players)&&Array.isArray(message.state.enemies));
      this.state=wireClone(message.state);return wireClone(this.state);
    }
    wireAssert(message.type==='delta'&&message.codec===SNAPSHOT_CODEC);
    wireAssert(this.state&&message.epoch===this.state.wireEpoch&&message.base===this.state.revision,'Zustandsbasis fehlt. Erneute Synchronisierung erforderlich.');
    wireAssert(Number.isSafeInteger(message.revision)&&message.revision>message.base);
    let next=wireApplyObject(this.state,message);
    wireAssert(wireRecord(message.entities));
    for(const [key,patch] of Object.entries(message.entities)){
      wireAssert(Object.hasOwn(WIRE_COLLECTIONS,key)&&!Object.hasOwn(message.set,key)&&!message.remove.includes(key));
      next[key]=wireApplyArray(this.state[key],patch,WIRE_COLLECTIONS[key]);
    }
    wireAssert(next.revision===message.revision&&next.wireEpoch===message.epoch&&next.world?.id===this.state.world?.id);
    this.state=wireClone(next);return wireClone(this.state);
  }
}
