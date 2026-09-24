// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { CLASSES, ENEMY_TYPES, dist, clamp } from '../shared/data.mjs';
import { isBoss, canEquip, EQUIP_SLOTS } from '../shared/realm-data.mjs';
export function cleanDisplaySettings(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  return {
    sound:raw.sound===true,volume:Number.isFinite(raw.volume)?clamp(raw.volume,0,1):.22,
    quality:raw.quality==='low'?'low':'high',reducedMotion:raw.reducedMotion===true,
    zoom:[.8,1,1.2,1.4].includes(Number(raw.zoom))?Number(raw.zoom):1,
    allyOpacity:[.35,.65,1].includes(Number(raw.allyOpacity))?Number(raw.allyOpacity):1,
    damageNumbers:raw.damageNumbers!==false,objectives:raw.objectives!==false
  };
}
export function selectObjective(state,own) {
  if(!state||!own||own.dead||state.world.kind==='nexus'||state.world.completed)return null;
  const enemies=state.enemies.filter(e=>e.hp>0);
  const bosses=enemies.filter(e=>isBoss(e.kind));
  const pool=state.world.kind==='dungeon'||own.level>=8?bosses.length?bosses:enemies:enemies.filter(e=>!isBoss(e.kind));
  const target=[...pool].sort((a,b)=>dist(a,own)-dist(b,own))[0];
  return target?{id:target.id,x:target.x,y:target.y,name:ENEMY_TYPES[target.kind]?.name||'Gegner',distance:Math.round(dist(target,own)/40),boss:isBoss(target.kind),hp:target.hp/maxPositive(target.maxHP)}:null;
}
function maxPositive(v){return Number.isFinite(v)&&v>0?v:1;}
export function edgeMarker(dx,dy,bounds) {
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.001)return null;
  const {cx,cy,left,right,top,bottom}=bounds;
  if(left>right||top>bottom)return null;
  const rates=[];
  if(dx>0)rates.push((right-cx)/dx);else if(dx<0)rates.push((left-cx)/dx);
  if(dy>0)rates.push((bottom-cy)/dy);else if(dy<0)rates.push((top-cy)/dy);
  const rate=Math.min(...rates.filter(n=>n>=0));if(!Number.isFinite(rate)||rate>=1)return null;
  return{x:cx+dx*rate,y:cy+dy*rate,angle:Math.atan2(dy,dx)};
}

// Deliberately compares the actual item value, not an invented damage percentage.
export function compareEquipment(item,player){
  if(!item||!player||!EQUIP_SLOTS.includes(item.slot))return null;
  const current=player.equipment?.[item.slot];
  return {delta:(item.stat||0)-(current?.stat||0),same:current?.id===item.id,currentName:current?.name||'Leerer Ausrüstungsplatz',compatible:canEquip(item,player.classId)};
}
