import { WeatherType } from '../types';

/**
 * Procedural Web Audio synthesizer for desert ambiance, footsteps, and discovery sounds.
 * No external asset loading required, 100% self-contained and instant.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.windGain) {
      this.windGain.gain.setValueAtTime(muted ? 0 : 0.08, this.ctx?.currentTime || 0);
    }
  }

  public startAmbiance() {
    if (this.windGain || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Wind generator using pink-ish buffer
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      // Low frequency modulation for wind gusts
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      this.windFilter = filter;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);

      whiteNoise.start();
      lfo.start();
    } catch (e) {
      console.warn('Audio ambiance init warning:', e);
    }
  }

  public updateWeatherAmbiance(weather: WeatherType, isUnderground: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    let targetGain = 0.06;
    let targetFreq = 400;

    if (isUnderground) {
      targetGain = 0.02;
      targetFreq = 220;
    } else if (weather === 'sandstorm') {
      targetGain = 0.16; // Howling desert dust storm
      targetFreq = 780;
    } else if (weather === 'storm') {
      targetGain = 0.13; // Monsoon rain and storm winds
      targetFreq = 560;
    } else if (weather === 'light_rain') {
      targetGain = 0.08; // Gentle desert shower
      targetFreq = 480;
    } else if (weather === 'sunset') {
      targetGain = 0.05; // Calm evening breeze
      targetFreq = 360;
    } else {
      targetGain = 0.06;
      targetFreq = 400;
    }

    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(targetGain, t, 0.6);
    }
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(targetFreq, t, 0.6);
    }
  }

  public playFootstep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.09);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playDrink() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Water glug sound
    for (let i = 0; i < 3; i++) {
      const startTime = t + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 400 + i * 60;
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, startTime + 0.08);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  }

  public playWaterRefill() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Ascending bubbly canteen filling frequency sequence
    for (let i = 0; i < 5; i++) {
      const startTime = t + i * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 300 + i * 110;
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, startTime + 0.07);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.09);
    }
  }

  public playFlashFloodRoar() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 2.5);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.linearRampToValueAtTime(420, t + 1.2);
    filter.frequency.exponentialRampToValueAtTime(140, t + 2.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  public playRattleWarning() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.sin((i / 80) * Math.PI);
    }

    const rattle = this.ctx.createBufferSource();
    rattle.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    rattle.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    rattle.start(t);
  }

  public playSnakeHiss() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.55;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const hiss = this.ctx.createBufferSource();
    hiss.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3600, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + dur);
    filter.Q.setValueAtTime(3.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    hiss.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    hiss.start(t);
  }

  public playSnakeBite() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 1. Sharp bite snap
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(850, t);
    snapOsc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    snapGain.gain.setValueAtTime(0.35, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(t);
    snapOsc.stop(t + 0.14);

    // 2. Aggressive strike hiss noise burst
    const dur = 0.3;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      out[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const strikeHiss = this.ctx.createBufferSource();
    strikeHiss.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, t);
    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(0.24, t);
    hGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    strikeHiss.connect(filter);
    filter.connect(hGain);
    hGain.connect(this.ctx.destination);
    strikeHiss.start(t);
  }

  public playScorpionSting() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 1. Piercing sting whip / barb puncture
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2800, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.15);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);

    // 2. Burning venom buzz
    const buzz = this.ctx.createOscillator();
    const buzzGain = this.ctx.createGain();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(140, t);
    buzz.frequency.linearRampToValueAtTime(95, t + 0.28);
    buzzGain.gain.setValueAtTime(0.18, t);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    buzz.connect(buzzGain);
    buzzGain.connect(this.ctx.destination);
    buzz.start(t);
    buzz.stop(t + 0.3);
  }

  public playScorpionScuttle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Micro chitinous clatter
    for (let j = 0; j < 3; j++) {
      const clickTime = t + j * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600 + Math.random() * 500, clickTime);
      gain.gain.setValueAtTime(0.08, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.02);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(clickTime);
      osc.stop(clickTime + 0.025);
    }
  }

  public playWildlifeDefeated() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.2);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playPickaxe() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // High metallic ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playWoodChop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Deep solid wood trunk thud (axe head bite into timber)
    const trunkOsc = this.ctx.createOscillator();
    const trunkGain = this.ctx.createGain();
    trunkOsc.type = 'triangle';
    trunkOsc.frequency.setValueAtTime(190 + Math.random() * 30, t);
    trunkOsc.frequency.exponentialRampToValueAtTime(55, t + 0.16);

    trunkGain.gain.setValueAtTime(0.45, t);
    trunkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    trunkOsc.connect(trunkGain);
    trunkGain.connect(this.ctx.destination);
    trunkOsc.start(t);
    trunkOsc.stop(t + 0.2);

    // 2. Fibrous timber splinter & wood chip crackle
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100 + Math.random() * 300, t);
    filter.Q.setValueAtTime(2.2, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSource.start(t);

    // 3. Crisp forged axe steel bit ping
    const ringOsc = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(1450 + Math.random() * 150, t);
    ringOsc.frequency.exponentialRampToValueAtTime(700, t + 0.08);

    ringGain.gain.setValueAtTime(0.18, t);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    ringOsc.connect(ringGain);
    ringGain.connect(this.ctx.destination);
    ringOsc.start(t);
    ringOsc.stop(t + 0.1);
  }

  public playShovelDig() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Gritty sand and gravel scrape noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.42);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1300, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(450, t + 0.38);
    noiseFilter.Q.setValueAtTime(2.2, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSource.start(t);

    // 2. Heavy dirt thud as forged steel blade bites soil
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(135, t);
    thud.frequency.exponentialRampToValueAtTime(32, t + 0.18);

    thudGain.gain.setValueAtTime(0.3, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thud.start(t);
    thud.stop(t + 0.2);
  }

  public playGoldPickup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(1760, t); // A6
    osc2.frequency.setValueAtTime(2637, t + 0.08); // E7

    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.2);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.45);
  }

  public playCashRegister() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 1. Mechanical lever click / drawer thud
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(140, t);
    clickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.04);
    clickGain.gain.setValueAtTime(0.15, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.05);

    // 2. Clear brass bell ding (E6 / 1318 Hz + High B6 / 1975 Hz)
    const bell1 = this.ctx.createOscillator();
    const bell2 = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bell1.type = 'sine';
    bell2.type = 'sine';
    bell1.frequency.setValueAtTime(1318.5, t + 0.04);
    bell2.frequency.setValueAtTime(1975.5, t + 0.05);

    bellGain.gain.setValueAtTime(0.22, t + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    bell1.connect(bellGain);
    bell2.connect(bellGain);
    bellGain.connect(this.ctx.destination);
    bell1.start(t + 0.04);
    bell1.stop(t + 0.65);
    bell2.start(t + 0.05);
    bell2.stop(t + 0.65);

    // 3. Crisp cascade of gold/silver coin clinks
    [0.10, 0.16, 0.22].forEach((offset, idx) => {
      if (!this.ctx) return;
      const coinTime = t + offset;
      const coinOsc = this.ctx.createOscillator();
      const coinGain = this.ctx.createGain();
      coinOsc.type = 'triangle';
      coinOsc.frequency.setValueAtTime(2400 + idx * 320, coinTime);
      coinGain.gain.setValueAtTime(0.12, coinTime);
      coinGain.gain.exponentialRampToValueAtTime(0.001, coinTime + 0.15);
      coinOsc.connect(coinGain);
      coinGain.connect(this.ctx.destination);
      coinOsc.start(coinTime);
      coinOsc.stop(coinTime + 0.15);
    });
  }

  public playCoins() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.06, 0.13, 0.19].forEach((offset, idx) => {
      if (!this.ctx) return;
      const coinTime = t + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600 + idx * 280, coinTime);
      gain.gain.setValueAtTime(0.14, coinTime);
      gain.gain.exponentialRampToValueAtTime(0.001, coinTime + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(coinTime);
      osc.stop(coinTime + 0.14);
    });
  }

  public playCampfire() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Low flame whoosh and crackle pops
    const flameOsc = this.ctx.createOscillator();
    const flameGain = this.ctx.createGain();
    flameOsc.type = 'triangle';
    flameOsc.frequency.setValueAtTime(120, t);
    flameOsc.frequency.exponentialRampToValueAtTime(80, t + 0.6);
    flameGain.gain.setValueAtTime(0.1, t);
    flameGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    flameOsc.connect(flameGain);
    flameGain.connect(this.ctx.destination);
    flameOsc.start(t);
    flameOsc.stop(t + 0.6);

    // Crackle sparks
    [0.05, 0.18, 0.29, 0.42].forEach((offset) => {
      if (!this.ctx) return;
      const crackleTime = t + offset;
      const crackleOsc = this.ctx.createOscillator();
      const crackleGain = this.ctx.createGain();
      crackleOsc.type = 'square';
      crackleOsc.frequency.setValueAtTime(800 + Math.random() * 800, crackleTime);
      crackleGain.gain.setValueAtTime(0.08, crackleTime);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, crackleTime + 0.04);
      crackleOsc.connect(crackleGain);
      crackleGain.connect(this.ctx.destination);
      crackleOsc.start(crackleTime);
      crackleOsc.stop(crackleTime + 0.04);
    });
  }

  public playDiscovery() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Major chord arpeggio (C4, E4, G4, C5) with warm reverb decay
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.85);
    });
  }

  public playDetectorBeep(distanceNormalized: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Pitch increases as you get closer (distance 0 = close, 1 = far)
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 400 + (1 - Math.min(1, Math.max(0, distanceNormalized))) * 900;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playRifleShot() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Sharp initial gunshot crack (noise burst + punch oscillator)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    // Deep low end punch
    const punchOsc = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(160, t);
    punchOsc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
    punchGain.gain.setValueAtTime(0.35, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    punchOsc.connect(punchGain);
    punchGain.connect(this.ctx.destination);

    noise.start(t);
    punchOsc.start(t);
    punchOsc.stop(t + 0.16);
  }

  public playBanditShot() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Gunshot with more canyon echo / distance
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playRicochet() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400 + Math.random() * 800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.18);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playDynamiteExplosion() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.7);
    subGain.gain.setValueAtTime(0.6, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    // Blast noise rumble
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    subOsc.start(t);
    subOsc.stop(t + 0.75);
    noise.start(t);
  }

  public playFuseHiss() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400 + Math.random() * 300, t);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playVoxelDig() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Crunching stone fracture
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320 + Math.random() * 120, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.14);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playClaimStake() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Deep wooden stake thud + metallic ring of sledgehammer
    const mallet = this.ctx.createOscillator();
    const malletGain = this.ctx.createGain();
    mallet.type = 'triangle';
    mallet.frequency.setValueAtTime(120, t);
    mallet.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    malletGain.gain.setValueAtTime(0.4, t);
    malletGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(587.33, t); // D5
    chime.frequency.exponentialRampToValueAtTime(880, t + 0.4);
    chimeGain.gain.setValueAtTime(0.2, t);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    mallet.connect(malletGain);
    malletGain.connect(this.ctx.destination);
    chime.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);

    mallet.start(t);
    chime.start(t);
    mallet.stop(t + 0.28);
    chime.stop(t + 0.45);
  }

  public playRockPickup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Heavy rustle and mineral stone lift
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(145, t + 0.12);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playRockThrow() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Whoosh / heave of stone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.18);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playRockImpact(volume: number = 0.3) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Solid stony thud + rocky clatter
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(110 + Math.random() * 30, t);
    thud.frequency.exponentialRampToValueAtTime(40, t + 0.14);

    thudGain.gain.setValueAtTime(Math.min(0.45, volume), t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    const clatter = this.ctx.createOscillator();
    const clatterGain = this.ctx.createGain();
    clatter.type = 'sawtooth';
    clatter.frequency.setValueAtTime(320 + Math.random() * 80, t + 0.02);
    clatter.frequency.exponentialRampToValueAtTime(90, t + 0.16);

    clatterGain.gain.setValueAtTime(Math.min(0.2, volume * 0.7), t + 0.02);
    clatterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    clatter.connect(clatterGain);
    clatterGain.connect(this.ctx.destination);

    thud.start(t);
    thud.stop(t + 0.15);
    clatter.start(t + 0.02);
    clatter.stop(t + 0.17);
  }

  public playHeavyExertion() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Low strained breath/grunt + dull rock scrape
    const grunt = this.ctx.createOscillator();
    const gruntGain = this.ctx.createGain();
    grunt.type = 'sine';
    grunt.frequency.setValueAtTime(95, t);
    grunt.frequency.linearRampToValueAtTime(75, t + 0.22);
    gruntGain.gain.setValueAtTime(0.28, t);
    gruntGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    const scrape = this.ctx.createOscillator();
    const scrapeGain = this.ctx.createGain();
    scrape.type = 'sawtooth';
    scrape.frequency.setValueAtTime(160, t + 0.04);
    scrape.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    scrapeGain.gain.setValueAtTime(0.12, t + 0.04);
    scrapeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    grunt.connect(gruntGain);
    gruntGain.connect(this.ctx.destination);
    scrape.connect(scrapeGain);
    scrapeGain.connect(this.ctx.destination);

    grunt.start(t);
    grunt.stop(t + 0.28);
    scrape.start(t + 0.04);
    scrape.stop(t + 0.25);
  }

  public playPlayerHurt() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Fatal cave-in crush, dehydration, or defeat sound effect
  public playPlayerDeath() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Deep seismic crunch / rumble of rock burial
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(18, t + 1.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.exponentialRampToValueAtTime(35, t + 1.6);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.85);

    // 2. Heartbeat flatline / hollow desert wind tone
    const tone = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(110, t);
    tone.frequency.exponentialRampToValueAtTime(45, t + 2.0);

    toneGain.gain.setValueAtTime(0.3, t);
    toneGain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    tone.connect(toneGain);
    toneGain.connect(this.ctx.destination);
    tone.start(t);
    tone.stop(t + 2.3);
  }

  public playOreChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Sparkling two-tone chime
    [659.25, 987.77].forEach((freq, i) => {
      const st = t + i * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.18, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(st);
      osc.stop(st + 0.38);
    });
  }

  public playThunder() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 2.4;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      const env = Math.sin(p * Math.PI) * Math.exp(-p * 1.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.linearRampToValueAtTime(60, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    // Deep sub-bass boom
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 1.2);
    subGain.gain.setValueAtTime(0.35, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.start(t);
    sub.start(t);
    sub.stop(t + 1.3);
  }

  // Sledgehammer pounding survey claim stake into ground
  public playHammerStake() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const strikes = [0, 0.22, 0.44];
    strikes.forEach((offset, idx) => {
      const t = this.ctx!.currentTime + offset;
      const pitch = 320 + idx * 45;

      // Heavy metallic sledge hit
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.14);

      // High metallic chime harmonic
      const chime = this.ctx!.createOscillator();
      const chimeGain = this.ctx!.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(pitch * 3.8, t);
      chime.frequency.exponentialRampToValueAtTime(pitch * 2.5, t + 0.18);
      chimeGain.gain.setValueAtTime(0.12, t);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      chime.connect(chimeGain);
      chimeGain.connect(this.ctx!.destination);
      chime.start(t);
      chime.stop(t + 0.2);
    });
  }

  // Timber construction & carpenter hammering
  public playConstruct() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Heavy timber thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);

    // Rapid carpenter hammer nails
    [0.08, 0.18, 0.28, 0.38].forEach((timeOffset, i) => {
      const nt = t + timeOffset;
      const nail = this.ctx!.createOscillator();
      const ngain = this.ctx!.createGain();
      nail.type = 'triangle';
      nail.frequency.setValueAtTime(900 + i * 120, nt);
      nail.frequency.exponentialRampToValueAtTime(300, nt + 0.06);
      ngain.gain.setValueAtTime(0.18, nt);
      ngain.gain.exponentialRampToValueAtTime(0.001, nt + 0.06);
      nail.connect(ngain);
      ngain.connect(this.ctx!.destination);
      nail.start(nt);
      nail.stop(nt + 0.07);
    });
  }

  // Running water flowing over sluice riffles
  public playSluiceWash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 1.2;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      const env = Math.sin(p * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.Q.setValueAtTime(2.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);

    // Gold chime at finish
    setTimeout(() => {
      this.playGoldPickup();
    }, 450);
  }

  // Blacksmith forge smelting & anvil ringing
  public playForgeSmelt() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Anvil ring
    const anvil = this.ctx.createOscillator();
    const anvilGain = this.ctx.createGain();
    anvil.type = 'sine';
    anvil.frequency.setValueAtTime(1480, t);
    anvil.frequency.exponentialRampToValueAtTime(1470, t + 0.8);
    anvilGain.gain.setValueAtTime(0.25, t);
    anvilGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    anvil.connect(anvilGain);
    anvilGain.connect(this.ctx.destination);
    anvil.start(t);
    anvil.stop(t + 0.85);

    // Fire sizzle
    const sizzle = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    sizzle.type = 'triangle';
    sizzle.frequency.setValueAtTime(220, t);
    sizzle.frequency.linearRampToValueAtTime(90, t + 0.4);
    sGain.gain.setValueAtTime(0.15, t);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    sizzle.connect(sGain);
    sGain.connect(this.ctx.destination);
    sizzle.start(t);
    sizzle.stop(t + 0.42);
  }

  // Minecart metal rumble on iron rails
  public playMinecart() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.3);
    osc.frequency.linearRampToValueAtTime(70, t + 0.7);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.8);
  }

  // Locomotion: Jump
  public playJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.12);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Locomotion: Land on earth/rock
  public playLand() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.16);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Subterranean Bedrock Mountain Groan (Tectonic stress)
  public playMountainGroan() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    // Low sub-bass shifting frequency
    const baseFreq = 42 + Math.random() * 18;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, t + 0.9);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + 2.2);

    osc2.frequency.setValueAtTime(baseFreq * 0.5, t);
    osc2.frequency.linearRampToValueAtTime(baseFreq * 0.7, t + 1.2);
    osc2.frequency.linearRampToValueAtTime(baseFreq * 0.4, t + 2.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.linearRampToValueAtTime(280, t + 0.8);
    filter.frequency.linearRampToValueAtTime(90, t + 2.2);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.32, t + 0.5);
    gain.gain.linearRampToValueAtTime(0.25, t + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.4);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.5);
    osc2.stop(t + 2.5);
  }

  // Timber Shoring Creak (Heavy wood bending under overburden weight)
  public playTimberCreak() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const count = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const clickTime = t + i * (0.08 + Math.random() * 0.09);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      const freq = 340 + Math.random() * 220;
      osc.frequency.setValueAtTime(freq, clickTime);
      osc.frequency.exponentialRampToValueAtTime(freq * (0.6 + Math.random() * 0.8), clickTime + 0.11);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, clickTime);
      filter.Q.value = 6.0;

      gain.gain.setValueAtTime(0.24, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.12);
    }
  }

  // Falling Pebble and Gravel Shower
  public playPebbleShower() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const pebbleCount = 8 + Math.floor(Math.random() * 6);

    for (let i = 0; i < pebbleCount; i++) {
      const delay = t + Math.random() * 0.75;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 800, delay);
      osc.frequency.exponentialRampToValueAtTime(200, delay + 0.04);

      gain.gain.setValueAtTime(0.08, delay);
      gain.gain.exponentialRampToValueAtTime(0.001, delay + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(delay);
      osc.stop(delay + 0.05);
    }
  }

  // Heavy Rock Chisel Strike
  public playRockChisel() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // High metallic clink
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2200, t);
    osc1.frequency.exponentialRampToValueAtTime(800, t + 0.07);
    gain1.gain.setValueAtTime(0.28, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.09);

    // Deep rock crunch
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(140, t);
    osc2.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    gain2.gain.setValueAtTime(0.3, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.2);
  }

  // Breakthrough when digging down into a new pregenerated layer of the mine
  public playLayerBreakthrough() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Deep mountain bedrock collapse rumble
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(95, t);
    rumbleOsc.frequency.exponentialRampToValueAtTime(28, t + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 1.2);

    rumbleGain.gain.setValueAtTime(0.38, t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    rumbleOsc.connect(filter);
    filter.connect(rumbleGain);
    rumbleGain.connect(this.ctx.destination);
    rumbleOsc.start(t);
    rumbleOsc.stop(t + 1.25);

    // 2. High discovery musical fanfares / crystalline chime
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const delay = t + 0.25 + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, delay);

      gain.gain.setValueAtTime(0.22, delay);
      gain.gain.exponentialRampToValueAtTime(0.001, delay + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(delay);
      osc.stop(delay + 0.65);
    });
  }

  // Deep Subterranean Mountain Groan & Echo
  public playDeepMineRumble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.linearRampToValueAtTime(42, t + 1.5);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.65);
  }

  // Wooden Ladder Climb Step Thump
  public playLadderClimb() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Geotechnical Pit Wall Slump & Loose Gravel Slide
  public playTrenchSlump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Deep earthen collapse sliding tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.9);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, t);
    filter.frequency.exponentialRampToValueAtTime(70, t + 0.9);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.0);

    // 2. Cascade of sand and tumbling pebbles
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(650, t);
    nFilter.Q.value = 1.8;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.28, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.85);
  }

  // Construct Heavy Timber Trench Shoring & Cribbing
  public playTrenchShoringConstruct() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Heavy pine timber placement thud
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(120, t);
    thud.frequency.exponentialRampToValueAtTime(38, t + 0.28);
    thudGain.gain.setValueAtTime(0.4, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thud.start(t);
    thud.stop(t + 0.3);

    // 3 rhythmic sledgehammer spike strikes
    [0.12, 0.28, 0.45].forEach((offset, idx) => {
      const strikeTime = t + offset;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(540 + idx * 75, strikeTime);
      osc.frequency.exponentialRampToValueAtTime(140, strikeTime + 0.08);

      gain.gain.setValueAtTime(0.24, strikeTime);
      gain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(strikeTime);
      osc.stop(strikeTime + 0.09);
    });
  }

  // Water Splash Sound (swimming, wading or striking water table)
  public playWaterSplash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Initial liquid smack / plop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480 + Math.random() * 80, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);

    // 2. Splashing froth noise
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.Q.value = 2.2;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.25, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(t + 0.02);
    noise.stop(t + 0.38);
  }

  // Rushing Groundwater Flood Torrent Rumble
  public playWaterFloodRumble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub-bass hydraulic roar
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(55, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 1.6);
    subGain.gain.setValueAtTime(0.42, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 1.85);

    // Filtered rushing water white noise
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, t);
    filter.frequency.linearRampToValueAtTime(620, t + 0.8);
    filter.frequency.linearRampToValueAtTime(240, t + 1.5);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.32, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 1.55);
  }

  // Cornish Steam Dewatering Pump Piston Chug & Steam Hiss
  public playPumpChug() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Heavy iron cylinder stroke (thump)
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(90, t);
    thud.frequency.exponentialRampToValueAtTime(28, t + 0.22);
    thudGain.gain.setValueAtTime(0.38, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thud.start(t);
    thud.stop(t + 0.25);

    // Steam exhaust release hiss
    const bufferSize = this.ctx.sampleRate * 0.28;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, t + 0.1);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.18, t + 0.1);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(t + 0.08);
    noise.stop(t + 0.38);
  }

  // Cave Water Droplet Ping Echo
  public playWaterDrip() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = 1200 + Math.random() * 600;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.06);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Room Excavated Breakthrough & Timber Creak
  public playRoomExcavated() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Deep rock fracture boom
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(110, t);
    boom.frequency.exponentialRampToValueAtTime(25, t + 0.5);
    boomGain.gain.setValueAtTime(0.45, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    boom.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boom.start(t);
    boom.stop(t + 0.6);

    // Triumphant discovery harmonic chime
    [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
      const noteTime = t + 0.2 + idx * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.42);
    });
  }
}

export const soundEngine = new SoundEngine();
