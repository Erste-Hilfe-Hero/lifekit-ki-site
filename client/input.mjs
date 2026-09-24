// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
export class InputController {
  constructor(canvas, renderer, onAction) {
    this.canvas=canvas;this.renderer=renderer;this.onAction=onAction;this.keys=new Set();
    this.enabled=false;this.auto=false;this.mouseFire=false;this.angle=0;this.pointer={x:0,y:0};
    this.move={x:0,y:0};this.aim={x:0,y:0};this.aiming=false;this.lastOwn=null;this.stickResets=[];
    this.bindStick(document.querySelector('#move-stick'),'move');this.bindStick(document.querySelector('#aim-stick'),'aim');
    window.addEventListener('keydown',e=>{
      if(!this.enabled||e.target.closest('input,textarea,select,[contenteditable]'))return;
      const k=e.key.toLowerCase();
      if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
      if(!e.repeat){if(k===' ')this.onAction({type:'ability'});if(k==='q')this.onAction({type:'ability'});if(k==='e')this.onAction({type:'interact'});if(k==='f')this.onAction({type:'heal'});if(k==='g')this.onAction({type:'mana'});if(k==='n'||k==='r')this.onAction({type:'nexus'});}
      this.keys.add(k);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const r=canvas.getBoundingClientRect();this.pointer={x:e.clientX-r.left,y:e.clientY-r.top};if(this.lastOwn){const w=renderer.screenToWorld(this.pointer.x,this.pointer.y);this.angle=Math.atan2(w.y-this.lastOwn.y,w.x-this.lastOwn.x);}}});
    canvas.addEventListener('pointerdown',e=>{if(this.enabled&&e.pointerType==='mouse'&&e.button===0){this.mouseFire=true;canvas.setPointerCapture(e.pointerId);}});
    canvas.addEventListener('pointerup',()=>this.mouseFire=false);canvas.addEventListener('pointercancel',()=>this.mouseFire=false);
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  }
  bindStick(element,kind) {
    let active=null,center={x:0,y:0};const knob=element.querySelector('.stick-knob');
    const update=e=>{
      const radius=element.getBoundingClientRect().width*.32;
      let x=(e.clientX-center.x)/radius,y=(e.clientY-center.y)/radius;
      const mag=Math.hypot(x,y);if(mag>1){x/=mag;y/=mag;}
      if(mag<.12){x=0;y=0;}
      this[kind]={x,y};if(kind==='aim')this.aiming=Math.hypot(x,y)>.12;
      knob.style.transform=`translate(${x*radius}px, ${y*radius}px)`;
    };
    this.stickResets.push(()=>{if(active!==null&&element.hasPointerCapture(active))element.releasePointerCapture(active);active=null;this[kind]={x:0,y:0};if(kind==='aim')this.aiming=false;knob.style.transform='';element.classList.remove('active');});
    element.addEventListener('pointerdown',e=>{
      if(!this.enabled||active!==null)return;e.preventDefault();active=e.pointerId;
      const r=element.getBoundingClientRect();center={x:r.left+r.width/2,y:r.top+r.height/2};
      element.setPointerCapture(active);element.classList.add('active');update(e);
    });
    element.addEventListener('pointermove',e=>{if(e.pointerId===active){e.preventDefault();update(e);}});
    const release=e=>{if(active===null||e.pointerId!==active)return;active=null;this[kind]={x:0,y:0};if(kind==='aim')this.aiming=false;knob.style.transform='';element.classList.remove('active');};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,release);
  }
  read(own) {
    this.lastOwn=own;
    if(!this.enabled||!own||own.dead)return{dx:0,dy:0,angle:this.angle,fire:false,auto:false};
    let dx=this.move.x+(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0);
    let dy=this.move.y+(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0);
    const mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag;}
    if(this.aiming)this.angle=Math.atan2(this.aim.y,this.aim.x);
    return{dx,dy,angle:this.angle,fire:this.mouseFire||this.aiming,auto:this.auto&&!this.aiming&&!this.mouseFire};
  }
  reset() {for(const clear of this.stickResets)clear();this.keys.clear();this.mouseFire=false;this.move={x:0,y:0};this.aim={x:0,y:0};this.aiming=false;document.querySelectorAll('.stick-knob').forEach(k=>k.style.transform='');}
}
