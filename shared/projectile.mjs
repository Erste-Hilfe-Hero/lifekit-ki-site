// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Original Nyrathen projectile normalization. Uses only Nyrathen's own runtime field names.
const projectileFinite=(value,fallback,min,max)=>{const n=value===undefined?fallback:Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new RangeError('Invalid projectile value');return n;};
export function projectileSpec(raw={}){
  return Object.freeze({
    damage:projectileFinite(raw.damage,0,0,100000),
    speed:projectileFinite(raw.speed,500,0,5000),
    lifetime:projectileFinite(raw.lifetime,1,.001,30),
    multiHit:raw.multiHit===true,
    piercing:raw.piercing===true
  });
}
