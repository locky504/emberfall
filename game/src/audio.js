// EMBERFALL — all sound is synthesized with WebAudio, no audio files.
// One job: short SFX blips/noise bursts plus a low ambient drone pad.
// The context is created lazily on the first user gesture so headless loads
// and autoplay policies never throw; every call is guarded.

export class AudioBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._padNodes = null;
    this._lastShoot = 0;
  }

  // Call from a user gesture (start button / first key). Safe to call anytime.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.42;
    return this.muted;
  }

  _tone({ type = 'sine', from = 440, to = null, dur = 0.12, vol = 0.2, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t0);
      if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* audio is cosmetic; never break the game */ }
  }

  _noise({ dur = 0.15, vol = 0.2, freq = 1200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t0);
    } catch { /* cosmetic */ }
  }

  shoot() {
    const now = performance.now();
    if (now - this._lastShoot < 40) return; // don't stack machine-gun blips
    this._lastShoot = now;
    this._tone({ type: 'square', from: 880, to: 320, dur: 0.07, vol: 0.08 });
  }

  hit() {
    this._tone({ type: 'triangle', from: 220, to: 140, dur: 0.05, vol: 0.1 });
  }

  enemyDie() {
    this._noise({ dur: 0.18, vol: 0.16, freq: 900 });
    this._tone({ type: 'sawtooth', from: 180, to: 40, dur: 0.18, vol: 0.1 });
  }

  pickup() {
    this._tone({ type: 'sine', from: 660, to: 1320, dur: 0.09, vol: 0.1 });
  }

  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this._tone({ type: 'sine', from: f, dur: 0.22, vol: 0.14, delay: i * 0.07 }));
  }

  dash() {
    this._noise({ dur: 0.16, vol: 0.12, freq: 2400 });
  }

  hurt() {
    this._tone({ type: 'sawtooth', from: 160, to: 60, dur: 0.25, vol: 0.2 });
    this._noise({ dur: 0.12, vol: 0.1, freq: 500 });
  }

  nova() {
    this._tone({ type: 'sine', from: 220, to: 880, dur: 0.3, vol: 0.14 });
    this._noise({ dur: 0.25, vol: 0.08, freq: 1800 });
  }

  bossRoar() {
    this._tone({ type: 'sawtooth', from: 90, to: 45, dur: 0.7, vol: 0.22 });
    this._noise({ dur: 0.6, vol: 0.14, freq: 400 });
  }

  waveHorn() {
    this._tone({ type: 'triangle', from: 392, dur: 0.3, vol: 0.12 });
    this._tone({ type: 'triangle', from: 523, dur: 0.35, vol: 0.12, delay: 0.12 });
  }

  click() {
    this._tone({ type: 'sine', from: 700, to: 900, dur: 0.05, vol: 0.08 });
  }

  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this._tone({ type: 'triangle', from: f, dur: 0.35, vol: 0.14, delay: i * 0.1 }));
  }

  defeat() {
    [392, 330, 262, 196].forEach((f, i) =>
      this._tone({ type: 'triangle', from: f, dur: 0.4, vol: 0.14, delay: i * 0.16 }));
  }

  // A quiet two-oscillator drone that starts once and runs under everything.
  startPad() {
    if (!this.ctx || this._padNodes) return;
    try {
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      g.connect(this.master);
      const o1 = this.ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = 55;
      const o2 = this.ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 82.5;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      o1.connect(g);
      o2.connect(g);
      o1.start();
      o2.start();
      lfo.start();
      this._padNodes = { o1, o2, lfo, g };
    } catch { /* cosmetic */ }
  }
}
