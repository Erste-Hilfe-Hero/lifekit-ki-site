// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Locally synthesized original effects; no external recordings or downloaded assets.
export class GameAudio {
  constructor(){this.enabled=false;this.context=null;this.lastShot=0;this.lastHit=0;this.volume=.22;}
  async unlock(){
    try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.context ||= new A();if(this.context.state==='suspended')await this.context.resume();}catch{this.enabled=false;}
  }
  // --- synthesis helpers -------------------------------------------------
  // White noise burst through a gain envelope. Returns a cleanup fn.
  noise(now,duration,gainAmount,{filterType,filterFreq}={}){
    const ctx=this.context,rate=ctx.sampleRate,length=Math.max(1,Math.floor(rate*duration));
    const buffer=ctx.createBuffer(1,length,rate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
    const src=ctx.createBufferSource();src.buffer=buffer;
    const gain=ctx.createGain();gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume*gainAmount,now+.005);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    if(filterType){const filter=ctx.createBiquadFilter();filter.type=filterType;filter.frequency.setValueAtTime(filterFreq||1000,now);src.connect(filter);filter.connect(gain);}
    else src.connect(gain);
    gain.connect(ctx.destination);src.start(now);src.stop(now+duration+.02);
    return ()=>{try{src.stop();}catch{}src.disconnect();gain.disconnect();};
  }
  // Sharp attack/decay oscillator hit, good for percussive taps.
  impact(now,freq,duration,gainAmount,type='triangle'){
    const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.5),now+duration);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume*gainAmount,now+.004);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.02);
    return ()=>{try{osc.stop();}catch{}osc.disconnect();gain.disconnect();};
  }
  // Low sine with a long decay, good for deep thuds/rumbles.
  rumble(now,freq,duration,gainAmount){
    const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(freq,now);osc.frequency.linearRampToValueAtTime(freq*.6,now+duration);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume*gainAmount,now+.02);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.02);
    return ()=>{try{osc.stop();}catch{}osc.disconnect();gain.disconnect();};
  }
  // Exponential frequency sweep from startFreq to endFreq.
  rise(now,startFreq,endFreq,duration,gainAmount,type='sine'){
    const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(Math.max(1,startFreq),now);osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),now+duration);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume*gainAmount,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.02);
    return ()=>{try{osc.stop();}catch{}osc.disconnect();gain.disconnect();};
  }
  // Multiple oscillators tuned to given frequencies, played together as a chord.
  chord(now,freqs,duration,gainAmount,type='sine'){
    const ctx=this.context,cleanups=[];
    for(const freq of freqs){
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=type;osc.frequency.setValueAtTime(freq,now);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume*gainAmount/freqs.length,now+.012);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.03);
      cleanups.push(()=>{try{osc.stop();}catch{}osc.disconnect();gain.disconnect();});
    }
    return ()=>cleanups.forEach(fn=>fn());
  }
  play(type){
    if(!this.enabled||!this.context||this.context.state!=='running')return;
    const now=this.context.currentTime;
    if(type==='shoot'){if(now-this.lastShot<.1)return;this.lastShot=now;}
    if(type==='hit'){if(now-this.lastHit<.125)return;this.lastHit=now;}
    switch(type){
      case 'shoot': this.rise(now,800,300,.08,.18,'triangle'); break;
      case 'hit': this.impact(now,400,.05,.3,'square'); break;
      case 'hurt': this.rumble(now,250,.3,.4); break;
      case 'kill': this.chord(now,[660,880,1320],.25,.35,'triangle'); break;
      case 'burst': {
        for(let i=0;i<3;i++)this.impact(now+i*.06,220-i*30,.08,.3,'sawtooth');
        break;
      }
      case 'ability': this.rise(now,600,900,.24,.32,'triangle'); break;
      case 'dash': this.impact(now,1000,.06,.22,'triangle'); break;
      case 'heal': this.chord(now,[440,554,660],.35,.3,'sine'); break;
      case 'loot': {
        [520,660,880].forEach((f,i)=>this.impact(now+i*.05,f,.1,.24,'sine'));
        break;
      }
      case 'shiny': {
        this.impact(now,2000,.05,.2,'sine');
        this.impact(now+.05,2600,.06,.18,'sine');
        this.impact(now+.1,3200,.08,.16,'sine');
        break;
      }
      case 'coin': this.rise(now,1400,700,.12,.25,'square'); break;
      case 'equip': {
        this.impact(now,500,.09,.25,'triangle');
        this.impact(now+.06,750,.12,.22,'triangle');
        break;
      }
      case 'bank': this.rumble(now,120,.4,.32); break;
      case 'level': this.chord(now,[440,660,880,1100],.55,.4,'triangle'); break;
      case 'rebirth': {
        this.impact(now,880,.7,.3,'sine');
        this.chord(now+.05,[660,990,1320],.6,.28,'sine');
        break;
      }
      case 'teleport': {
        for(let i=0;i<5;i++)this.impact(now+i*.03,900+Math.random()*600,.05,.16,'square');
        break;
      }
      case 'travel': this.rise(now,300,900,.4,.22,'sine'); break;
      case 'channel': this.rumble(now,220,1.1,.22); break;
      case 'wave': {
        const ctx=this.context,osc=ctx.createOscillator(),lfo=ctx.createOscillator(),lfoGain=ctx.createGain(),gain=ctx.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(180,now);
        lfo.type='sine';lfo.frequency.setValueAtTime(6,now);lfoGain.gain.setValueAtTime(40,now);
        lfo.connect(lfoGain);lfoGain.connect(osc.frequency);
        gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume*.3,now+.02);gain.gain.exponentialRampToValueAtTime(.001,now+.6);
        osc.connect(gain);gain.connect(ctx.destination);osc.start(now);lfo.start(now);osc.stop(now+.65);lfo.stop(now+.65);
        break;
      }
      case 'boss': this.rumble(now,80,.9,.5); break;
      case 'victory': this.chord(now,[523,659,784,1046],.8,.42,'triangle'); break;
      case 'death': this.rise(now,300,40,.6,.4,'sawtooth'); break;
      case 'notice': this.impact(now,700,.12,.22,'square'); break;
      case 'drop': this.rise(now,500,150,.18,.24,'sine'); break;
      default: break;
    }
  }
  suspend(){this.context?.suspend().catch(()=>{});}
}
