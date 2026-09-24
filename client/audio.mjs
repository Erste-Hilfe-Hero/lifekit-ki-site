// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Locally synthesized original effects; no external recordings or downloaded assets.
export class GameAudio {
  constructor(){this.enabled=false;this.context=null;this.lastShot=0;this.volume=.22;}
  async unlock(){
    try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.context ||= new A();if(this.context.state==='suspended')await this.context.resume();}catch{this.enabled=false;}
  }
  play(type){
    if(!this.enabled||!this.context||this.context.state!=='running')return;
    const now=this.context.currentTime;
    if(type==='shoot'&&now-this.lastShot<.09)return;if(type==='shoot')this.lastShot=now;
    const presets={shoot:[240,95,.06,'triangle'],hit:[110,60,.045,'sine'],hurt:[80,36,.13,'sawtooth'],heal:[420,800,.3,'sine'],loot:[660,1040,.15,'triangle'],level:[330,1320,.5,'sine'],ability:[160,520,.24,'triangle'],death:[160,30,.6,'sawtooth'],victory:[440,880,.7,'triangle'],dash:[180,80,.09,'triangle'],coin:[900,1400,.07,'sine']};
    const p=presets[type];if(!p)return;
    const osc=this.context.createOscillator(),gain=this.context.createGain();osc.type=p[3];osc.frequency.setValueAtTime(p[0],now);osc.frequency.exponentialRampToValueAtTime(p[1],now+p[2]);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.volume*(type==='shoot'?.16:.35),now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+p[2]);
    osc.connect(gain);gain.connect(this.context.destination);osc.start(now);osc.stop(now+p[2]+.02);
  }
  suspend(){this.context?.suspend().catch(()=>{});}
}
