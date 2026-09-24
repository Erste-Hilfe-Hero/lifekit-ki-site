// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { TILE, CLASSES, ENEMY_TYPES, clamp, dist } from '../shared/data.mjs';
import { makeRealmMap, isBoss, weaponFamily } from '../shared/realm-data.mjs';
import { PixelArt } from './art.mjs';
import { selectObjective, edgeMarker } from './presentation.mjs';
const DESKTOP_SIDEBAR_WIDTH=240;
export class Renderer {
  constructor(canvas,minimap){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.minimap=minimap;this.art=new PixelArt();this.camera={x:880,y:820};this.scale=1;this.lastEvent=0;this.particles=[];this.texts=[];this.positions=new Map();this.explored=new Map();this.zoom=1;this.allyOpacity=1;this.damageNumbers=true;this.objectives=true;this.lowQuality=false;this.reducedMotion=false;this.t=0;this.mapKey='';this.resize();}
  resize(){this.w=innerWidth;this.h=innerHeight;this.dpr=Math.min(devicePixelRatio||1,this.lowQuality?1:2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.canvas.style.width=this.w+'px';this.canvas.style.height=this.h+'px';this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.ctx.imageSmoothingEnabled=false;this.boardW=this.w>=1100?this.w-DESKTOP_SIDEBAR_WIDTH:this.w;this.scale=(this.w>=1100?1.12:this.w>700?1:.82)*(this.zoom||1);this.centerX=this.boardW/2;this.centerY=this.h<500?this.h*.50:this.h*.47;}
  sprite(kind){return this.art.sprite(kind);}
  screenToWorld(x,y){return{x:(x-this.centerX)/this.scale+this.camera.x,y:(y-this.centerY)/this.scale+this.camera.y};}
  pos(e,dt){let p=this.positions.get(e.id);if(!p||dist(p,e)>300)p={x:e.x,y:e.y};else{const a=Math.min(1,dt*18);p.x+=(e.x-p.x)*a;p.y+=(e.y-p.y)*a;}this.positions.set(e.id,p);return p;}
  draw(state,ownId,dt,{menu=false}={}){
    if(!state)return;this.t+=dt;const own=state.players.find(p=>p.id===ownId);if(!own)return;
    const key=state.world.id+':'+state.seed;if(key!==this.mapKey){this.map=makeRealmMap(state.world.kind,state.seed,state.world.theme);this.mapKey=key;this.mapLastDraw=-1;this.positions.clear();this.camera.x=own.x;this.camera.y=own.y;this.texts=[];if(!this.explored.has(key))this.explored.set(key,new Set());}
    const target=menu?{x:1020,y:720}:this.pos(own,dt);const amount=this.reducedMotion?1:Math.min(1,dt*11);this.camera.x+=(target.x-this.camera.x)*amount;this.camera.y+=(target.y-this.camera.y)*amount;
    this.boardW=!menu&&this.w>=1100?this.w-DESKTOP_SIDEBAR_WIDTH:this.w;this.centerX=this.boardW/2;
    const g=this.ctx;g.setTransform(this.dpr,0,0,this.dpr,0,0);g.fillStyle='#1e383c';g.fillRect(0,0,this.w,this.h);g.save();g.beginPath();g.rect(0,0,this.boardW,this.h);g.clip();
    g.translate(this.centerX,this.centerY);g.scale(this.scale,this.scale);g.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
    const left=this.camera.x-this.centerX/this.scale,top=this.camera.y-this.centerY/this.scale,right=left+this.boardW/this.scale,bottom=top+this.h/this.scale;
    const minx=Math.max(0,Math.floor(left/TILE)),maxx=Math.min(this.map.width-1,Math.ceil(right/TILE)),miny=Math.max(0,Math.floor(top/TILE)),maxy=Math.min(this.map.height-1,Math.ceil(bottom/TILE));
    for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){const t=this.map.tiles[y*this.map.width+x];g.drawImage(this.art.tile(t.biome,t.type,t.variant+(t.biome==='water'?Math.floor(this.t*2)%2:0)),x*TILE,y*TILE,TILE,TILE);}
    const visible=e=>e.x>left-150&&e.x<right+150&&e.y>top-180&&e.y<bottom+150;
    // Nexus paths and architectural inlay are part of the actual map, not a backdrop.
    if(state.world.kind==='nexus'){
      g.strokeStyle='#d1c39b';g.lineWidth=3;for(const r of [65,105]){g.beginPath();g.arc(880,820,r,0,Math.PI*2);g.stroke();}g.fillStyle='#d3c29c';for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillRect(876+Math.cos(a)*86,816+Math.sin(a)*86,8,8);}
    }
    if(state.world.kind==='realm'){for(const b of this.map.landmarks){g.fillStyle='#aedfcc15';g.beginPath();g.arc(b.x,b.y,92,0,Math.PI*2);g.fill();g.strokeStyle='#badfd15c';g.lineWidth=2;g.stroke();}}
    for(const q of state.portals||[]){if(!visible(q))continue;const color=q.kind==='realm'?q.color||'#a5d19c':q.kind==='nexus'?'#d4d1ab':'#b59ddd';
      g.fillStyle='#253a42b8';g.beginPath();g.ellipse(q.x,q.y+5,39,13,0,0,Math.PI*2);g.fill();g.save();g.translate(q.x,q.y-30);g.strokeStyle=color;g.lineWidth=4;g.beginPath();g.ellipse(0,0,22,35,0,0,Math.PI*2);g.stroke();g.fillStyle=color+'60';g.fill();
      for(let i=0;i<8;i++){const a=i*Math.PI/4+(this.reducedMotion?0:this.t);g.fillStyle=i%2?color:'#eff1d6';g.fillRect(Math.cos(a)*17-2,Math.sin(a)*26-2,4,4);}g.restore();
      g.font='bold 11px monospace';g.textAlign='center';g.lineWidth=4;g.strokeStyle='#20383e';g.strokeText(q.name,q.x,q.y+30);g.fillStyle='#fff0c5';g.fillText(q.name,q.x,q.y+30);
      if(q.life>0){g.fillStyle='#dde8d2';g.font='10px monospace';g.fillText(Math.ceil(q.life)+' s',q.x,q.y+45);}
    }
    for(const l of state.loot){if(l.kind!=='item'||!visible(l))continue;const bag=this.art.lootBag(l.item.rarity);if(l.item.shiny){const pulse=this.reducedMotion?18:18+Math.sin(this.t*5)*4;g.strokeStyle='#ffe7a0bb';g.lineWidth=2;g.beginPath();g.arc(l.x,l.y-13,pulse,0,Math.PI*2);g.stroke();g.fillStyle='#fff3b8';for(let k=0;k<4;k++){const a=this.t*2+k*Math.PI/2,r=25;g.fillRect(Math.round(l.x+Math.cos(a)*r)-2,Math.round(l.y-13+Math.sin(a)*r)-2,4,4);}}g.fillStyle='#15242b77';g.fillRect(l.x-13,l.y+3,26,5);g.drawImage(bag,l.x-16,l.y-32,32,38);if(l.item.rarity===3||l.item.shiny){g.fillStyle='#ffe7a0';const d=this.reducedMotion?0:Math.round(Math.sin(this.t*3)*3);g.fillRect(l.x-23,l.y-18+d,3,3);g.fillRect(l.x+20,l.y-27-d,3,3);}}

    // Telegraphs are drawn below entities; projectiles remain the highest-contrast layer.
    for(const fx of state.effects||[]){if(!visible(fx))continue;g.save();g.globalAlpha=fx.kind==='danger'?(fx.warn>0?.6:.9):.65;g.strokeStyle=fx.kind==='danger'?'#ff9874':fx.color||'#cfb5ee';g.fillStyle=fx.kind==='danger'?(fx.warn>0?'#e4834320':'#e95d434b'):(fx.color||'#cfb5ee')+'25';g.lineWidth=2;
      if(fx.kind==='lightning'){g.beginPath();g.moveTo(fx.x,fx.y-20);const ex=fx.toX??fx.x,ey=fx.toY??fx.y;g.lineTo((fx.x+ex)/2+12,(fx.y+ey)/2-30);g.lineTo(ex,ey-15);g.stroke();}
      else if(!['summon','decoy'].includes(fx.kind)){g.beginPath();g.arc(fx.x,fx.y,fx.radius||75,0,Math.PI*2);g.fill();g.setLineDash(fx.kind==='danger'&&fx.warn>0?[9,5]:[]);g.stroke();g.setLineDash([]);if(fx.kind==='trap'){g.strokeRect(fx.x-18,fx.y-18,36,36);g.strokeRect(fx.x-12,fx.y-12,24,24);}if(fx.kind==='danger'&&fx.warn>0){g.font='bold 14px monospace';g.textAlign='center';g.fillStyle='#ffe1a7';g.fillText('!',fx.x,fx.y+5);}}
      g.restore();}
    const objects=this.map.decorations.filter(visible).map(v=>({...v,render:'prop'}));
    for(const e of state.enemies)if(visible(e))objects.push({...e,...this.pos(e,dt),render:'enemy'});
    for(const p of state.players)if(!p.dead&&visible(p))objects.push({...p,...this.pos(p,dt),render:'player'});
    for(const p of state.pets||[])if(visible(p))objects.push({...p,render:'pet'});
    for(const p of state.effects||[])if(['summon','decoy'].includes(p.kind)&&visible(p))objects.push({...p,render:'companion'});
    for(const p of state.graves||[])if(visible(p))objects.push({...p,render:'grave'});
    objects.sort((a,b)=>a.y-b.y);
    for(const e of objects){
      if(e.render==='prop'){const art=this.art.prop(e.kind,e.variant),size=['arch','vault','merchant','guildhall','forge','questboard','petgarden'].includes(e.kind)?1.5:['fountain','tree','pine','palm'].includes(e.kind)?1.4:1;g.fillStyle='#233c3340';g.beginPath();g.ellipse(e.x,e.y,25*size,10*size,0,0,7);g.fill();g.drawImage(art,e.x-36*size,e.y-80*size,72*size,88*size);}
      else if(e.render==='pet'){const art=this.art.pet(e.kind,Math.floor(this.t*4)%2,e.style||'default');g.fillStyle='#172e3540';g.fillRect(e.x-9,e.y+2,18,3);g.drawImage(art,e.x-15,e.y-27,30,30);}
      else if(e.render==='companion'){const art=e.kind==='summon'?this.art.pet('moth',Math.floor(this.t*4)%2):this.art.sprite('trickster');g.globalAlpha=.65;g.drawImage(art,e.x-16,e.y-35,32,38);g.globalAlpha=1;}
      else if(e.render==='grave'){g.fillStyle='#a2aba3';g.fillRect(e.x-10,e.y-25,20,28);g.fillStyle='#46535a';g.fillRect(e.x-2,e.y-21,4,15);g.fillRect(e.x-7,e.y-17,14,3);g.fillStyle='#d8d4bc';g.font='10px monospace';g.textAlign='center';g.fillText(e.name,e.x,e.y+18);}
      else{
        const player=e.render==='player',boss=!player&&isBoss(e.kind),kind=player?e.classId:e.kind,walking=this.reducedMotion?0:player?(e.moving?Math.floor(this.t*7)%2:0):Math.floor(this.t*5)%2;
        const sprite=this.art.sprite(kind,walking,player?(e.skin||'default'):'default'),size=boss?2.2:1.7;
        g.fillStyle='#172e354f';g.beginPath();g.ellipse(e.x,e.y+2,boss?35:18,boss?11:6,0,0,7);g.fill();
        if(player&&e.id===ownId){g.strokeStyle='#eff1c3';g.lineWidth=1.5;g.beginPath();g.ellipse(e.x,e.y,22,9,0,0,7);g.stroke();}
        if(e.telegraph>0){g.strokeStyle='#ecae7d';g.fillStyle='#ed906630';g.lineWidth=3;g.beginPath();g.arc(e.x,e.y,48+e.telegraph*35,0,7);g.fill();g.stroke();}
        g.globalAlpha=(player&&e.id!==ownId?this.allyOpacity:1)*(e.invisible>0?.45:1);g.save();g.translate(Math.round(e.x),Math.round(e.y));if(Math.cos(e.angle||0)<0)g.scale(-1,1);g.drawImage(sprite,-Math.round(sprite.width*size/2),-Math.round(sprite.height*size)+9,sprite.width*size,sprite.height*size);g.restore();g.globalAlpha=1;
        if(e.hitFlash>0){g.fillStyle='#fff2c746';g.fillRect(e.x-14,e.y-35,28,30);}
        if(e.shield>0){g.strokeStyle='#f0d996';g.lineWidth=3;g.beginPath();g.ellipse(e.x,e.y-20,27,34,0,0,7);g.stroke();}
        if(e.berserk>0){g.fillStyle='#f1c578';g.fillRect(e.x-3,e.y-58,6,8);}
        if(player){g.font='bold 11px monospace';g.textAlign='center';g.strokeStyle='#20303b';g.lineWidth=3;g.strokeText(e.name,e.x,e.y-48);g.fillStyle=e.id===ownId?'#f5e5b2':e.partyId&&e.partyId===own.partyId?'#b7e2bb':'#e4e9d5';g.fillText(e.name,e.x,e.y-48);if(e.guildTag){g.font='9px monospace';g.fillStyle='#a9c8db';g.strokeText('<'+e.guildTag+'>',e.x,e.y-61);g.fillText('<'+e.guildTag+'>',e.x,e.y-61);}if(e.empowered>0||e.inspired>0||e.haste>0){g.fillStyle=e.empowered>0?'#f2c96d':e.inspired>0?'#a8d7ef':'#a0e5b5';g.fillRect(e.x-3,e.y-77,6,6);}if(e.id!==ownId){g.fillStyle='#27363c';g.fillRect(e.x-18,e.y+10,36,4);g.fillStyle='#86b573';g.fillRect(e.x-18,e.y+10,36*e.hp/e.maxHP,4);}}
        else if(e.hp<e.maxHP||boss){g.fillStyle='#354348';g.fillRect(e.x-20,e.y+12,40,4);g.fillStyle=boss?'#d5ad64':'#d68c78';g.fillRect(e.x-20,e.y+12,40*e.hp/e.maxHP,4);}
      }
    }
    const owners=new Map(state.players.map(p=>[p.id,p]));
    for(const b of state.bullets){if(!visible(b))continue;const enemy=b.team==='enemy',owner=owners.get(b.owner),art=this.art.shot(owner?weaponFamily(owner.classId):'staff',enemy,owner?.weaponStyle||'default');g.save();g.globalAlpha=!enemy&&b.owner!==ownId?Math.max(.6,this.allyOpacity):1;g.translate(Math.round(b.x),Math.round(b.y));g.rotate(b.angle||0);g.drawImage(art,-10,-7,20,14);g.restore();}

    for(const e of state.events||[]){if(e.seq<=this.lastEvent)continue;this.lastEvent=e.seq;if((this.damageNumbers||e.type==='level')&&['hit','hurt','level'].includes(e.type)&&Number.isFinite(e.x))this.texts.push({x:e.x,y:e.y-44,text:e.type==='level'?'STUFE '+e.level:(e.type==='hurt'?'-':'')+e.value,color:e.type==='hurt'?'#ffc2ab':e.type==='level'?'#ffe3a0':'#f5efce',life:.8});}
    this.texts=this.texts.filter(t=>(t.life-=dt)>0).slice(-45);g.font='bold 13px monospace';g.textAlign='center';for(const t of this.texts){t.y-=dt*30;g.globalAlpha=Math.min(1,t.life*3);g.fillStyle=t.color;g.strokeStyle='#263d42';g.lineWidth=3;g.strokeText(t.text,t.x,t.y);g.fillText(t.text,t.x,t.y);}g.globalAlpha=1;
    if(state.world.kind==='nexus')for(const b of this.map.landmarks){g.font='bold 12px monospace';g.textAlign='center';g.fillStyle='#293e42';g.fillRect(b.x-55,b.y+20,110,21);g.fillStyle='#eddfb7';g.fillText(b.label,b.x,b.y+35);}
    g.restore();
    // A restrained edge shade keeps the pixel world legible, including in portrait.
    if(own.hp/own.maxHP<.3&&!own.safe&&!menu){g.strokeStyle='#bd655c';g.lineWidth=7;g.strokeRect(3,3,this.boardW-6,this.h-6);}
    const objective=this.objectives&&!menu?selectObjective(state,own):null;
    if(objective){
      const dx=(objective.x-this.camera.x)*this.scale,dy=(objective.y-this.camera.y)*this.scale;
      const marker=edgeMarker(dx,dy,{cx:this.centerX,cy:this.centerY,left:30,right:this.boardW-30,top:this.w<1100?(this.h<500?122:200):180,bottom:this.h-(this.w<1100?240:140)});
      if(marker){g.save();g.translate(marker.x,marker.y);g.rotate(marker.angle);g.fillStyle='#171923';g.beginPath();g.moveTo(15,0);g.lineTo(-8,-11);g.lineTo(-8,11);g.closePath();g.fill();g.fillStyle=objective.boss?'#f1b55d':'#ece9bd';g.beginPath();g.moveTo(10,0);g.lineTo(-5,-7);g.lineTo(-5,7);g.closePath();g.fill();g.restore();g.font='bold 10px monospace';g.textAlign=marker.x<100?'left':marker.x>this.boardW-100?'right':'center';g.fillStyle='#f7e6bd';g.strokeStyle='#1a2230';g.lineWidth=3;const text=(objective.boss?'HÜTER':'ZIEL')+' · '+objective.distance;g.strokeText(text,marker.x,marker.y+24);g.fillText(text,marker.x,marker.y+24);}
    }
    if(this.t-(this.mapLastDraw||-1)>.12){this.drawMap(state,own);this.mapLastDraw=this.t;}if(this.positions.size>1600)this.positions.clear();
  }
  drawMap(state,own){
    const c=this.minimap,g=c.getContext('2d'),w=c.width,h=c.height,map=this.map,sx=w/map.width,sy=h/map.height,seen=this.explored.get(this.mapKey);
    const px=Math.floor(own.x/TILE),py=Math.floor(own.y/TILE);for(let y=py-10;y<=py+10;y++)for(let x=px-10;x<=px+10;x++)if(x>=0&&y>=0&&x<map.width&&y<map.height)seen.add(y*map.width+x);
    g.fillStyle='#263e44';g.fillRect(0,0,w,h);const colors={water:'#366d81',sand:'#c9b378',grass:'#73975b',forest:'#547757',path:'#b7a982',highland:'#999b98',snow:'#c5d7d2',rift:'#88758c',stone:'#a6a58d',garden:'#6c8e60',tide:'#a0a179',crypt:'#9994a7',grove:'#688860',citadel:'#b0a18b'};
    for(const t of map.tiles){if(map.kind!=='nexus'&&!seen.has(t.y*map.width+t.x))continue;g.fillStyle=t.type===2?'#4f5c60':colors[t.biome]||'#888777';g.fillRect(t.x*sx,t.y*sy,Math.ceil(sx),Math.ceil(sy));}
    for(const b of map.landmarks.filter(b=>b.beacon)){g.fillStyle='#b5e4e6';g.fillRect(b.x/TILE*sx-2,b.y/TILE*sy-2,4,4);}
    for(const q of state.portals){g.fillStyle='#d3b5f1';g.fillRect(q.x/TILE*sx-2,q.y/TILE*sy-2,4,4);}
    for(const e of state.enemies.filter(e=>e.hp>0&&isBoss(e.kind))){const x=e.x/TILE*sx,y=e.y/TILE*sy;g.fillStyle='#f5a958';g.fillRect(x-2,y-2,5,5);g.fillStyle='#382732';g.fillRect(x,y,1,1);}
    for(const p of state.players){g.fillStyle=p.id===own.id?'#fff2b8':'#a2dcba';g.beginPath();g.arc(p.x/TILE*sx,p.y/TILE*sy,p.id===own.id?3:2,0,7);g.fill();}
  }
}
