// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Locally synthesized original effects; no external recordings or downloaded assets.

// Helper: white noise burst
function noise(ctx, duration, volume = 0.3) {
  const now = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  return { source, gain };
}

// Helper: percussive impact
function impact(ctx, freq, duration, decay, volume = 0.4) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + decay);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// Helper: low-frequency rumble
function rumble(ctx, freq, duration, decay, volume = 0.25) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + decay);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// Helper: ascending tone sweep
function rise(ctx, startFreq, endFreq, duration, volume = 0.3) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + duration * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// Helper: harmonic chord
function chord(ctx, frequencies, duration, decay, volume = 0.25) {
  const now = ctx.currentTime;
  frequencies.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume / frequencies.length, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  });
}

export class GameAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.lastShoot = 0;
    this.lastHit = 0;
    this.volume = 0.22;
  }

  async unlock() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.context ||= new AudioContextClass();
      this.enabled = true;
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      this.enabled = false;
    }
  }

  play(type) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;

    // Rate limiting
    if (type === 'shoot' && now - this.lastShoot < 0.1) return;
    if (type === 'shoot') this.lastShoot = now;
    if (type === 'hit' && now - this.lastHit < 0.125) return;
    if (type === 'hit') this.lastHit = now;

    switch (type) {
      case 'shoot':
        // Tight click + impact combo
        impact(this.context, 280, 0.08, 0.04, 0.3);
        impact(this.context, 140, 0.05, 0.02, 0.15);
        break;

      case 'hit':
        // Punchy bass with transient
        impact(this.context, 100, 0.12, 0.06, 0.35);
        noise(this.context, 0.04, 0.2);
        break;

      case 'hurt':
        // Descending dissonant tone
        rise(this.context, 280, 100, 0.2, 0.3);
        rise(this.context, 350, 120, 0.2, 0.15);
        break;

      case 'kill':
        // Satisfying rising chord
        chord(this.context, [220, 330, 440], 0.4, 0.3, 0.3);
        break;

      case 'burst':
        // Rapid clicks building
        for (let i = 0; i < 5; i++) {
          setTimeout(() => impact(this.context, 200 + i * 40, 0.04, 0.02, 0.2), i * 40);
        }
        break;

      case 'ability':
        // Magical ascending sweep
        rise(this.context, 200, 600, 0.3, 0.35);
        noise(this.context, 0.15, 0.15);
        break;

      case 'dash':
        // Quick directional swoop
        rise(this.context, 300, 150, 0.12, 0.25);
        break;

      case 'heal':
        // Warm rising tone
        rise(this.context, 300, 600, 0.4, 0.3);
        chord(this.context, [300, 450], 0.35, 0.25, 0.2);
        break;

      case 'loot':
        // Ascending tones (3-note progression)
        rise(this.context, 440, 660, 0.2, 0.25);
        setTimeout(() => rise(this.context, 660, 880, 0.2, 0.25), 120);
        setTimeout(() => rise(this.context, 880, 1100, 0.25, 0.3), 240);
        break;

      case 'shiny':
        // Crystalline high-frequency sparkle
        rise(this.context, 2000, 3000, 0.15, 0.2);
        noise(this.context, 0.1, 0.15);
        break;

      case 'coin':
        // Characteristic bounce pattern
        rise(this.context, 900, 1100, 0.12, 0.25);
        setTimeout(() => rise(this.context, 800, 900, 0.1, 0.15), 80);
        setTimeout(() => rise(this.context, 700, 750, 0.08, 0.1), 150);
        break;

      case 'equip':
        // Tech/lock sound
        impact(this.context, 600, 0.1, 0.05, 0.25);
        impact(this.context, 800, 0.08, 0.04, 0.2);
        break;

      case 'bank':
        // Confirmation chord
        chord(this.context, [330, 440, 550], 0.35, 0.25, 0.28);
        break;

      case 'level':
        // Triumph fanfare
        rise(this.context, 440, 880, 0.3, 0.3);
        setTimeout(() => chord(this.context, [440, 550, 660], 0.4, 0.3, 0.35), 200);
        break;

      case 'rebirth':
        // Cosmic ascending sweep
        rise(this.context, 100, 800, 0.6, 0.25);
        noise(this.context, 0.3, 0.2);
        break;

      case 'teleport':
        // Sci-fi warble
        rise(this.context, 400, 300, 0.15, 0.25);
        setTimeout(() => rise(this.context, 300, 400, 0.15, 0.25), 100);
        break;

      case 'travel':
        // Journey theme snippet
        chord(this.context, [220, 330], 0.3, 0.2, 0.25);
        setTimeout(() => chord(this.context, [330, 440], 0.3, 0.2, 0.25), 200);
        break;

      case 'channel':
        // Accumulation tone build
        rise(this.context, 200, 400, 0.25, 0.2);
        rise(this.context, 300, 500, 0.3, 0.2);
        break;

      case 'wave':
        // Warning chirp ascending
        rise(this.context, 600, 1000, 0.2, 0.3);
        noise(this.context, 0.12, 0.15);
        break;

      case 'boss':
        // Epic low rumble + tension chord
        rumble(this.context, 50, 0.5, 0.3, 0.3);
        chord(this.context, [165, 220, 275], 0.4, 0.3, 0.2);
        break;

      case 'victory':
        // Major chord progression
        chord(this.context, [440, 550, 660], 0.35, 0.25, 0.3);
        setTimeout(() => chord(this.context, [550, 660, 880], 0.4, 0.3, 0.35), 250);
        break;

      case 'death':
        // Descending dissonant chord
        rise(this.context, 330, 100, 0.4, 0.3);
        rise(this.context, 220, 80, 0.4, 0.25);
        break;

      case 'notice':
        // Alert beep
        rise(this.context, 800, 900, 0.1, 0.25);
        setTimeout(() => rise(this.context, 800, 900, 0.1, 0.25), 150);
        break;

      case 'drop':
        // Falling object sound
        rise(this.context, 600, 200, 0.25, 0.3);
        impact(this.context, 150, 0.1, 0.08, 0.25);
        break;
    }
  }

  suspend() {
    this.context?.suspend().catch(() => {});
  }
}
