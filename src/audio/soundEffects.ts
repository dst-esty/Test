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

  // Tortilla Flat Ambient Town Noise & Life
  private townAmbianceGain: GainNode | null = null;
  private townChatterFilter: BiquadFilterNode | null = null;
  private townPresence: number = 0;
  private townAmbianceTimer: number = 0;
  private nextHorseEventDelay: number = 0.6; // Trigger quickly on spawn so player hears horses immediately
  private nextTownEventDelay: number = 2.5;

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
    if (this.townAmbianceGain) {
      this.townAmbianceGain.gain.setValueAtTime(muted ? 0 : this.townPresence * 0.16, this.ctx?.currentTime || 0);
    }
  }

  public startAmbiance() {
    this.init();
    if (this.windGain || this.isMuted) return;
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

      // Initialize Tortilla Flat town ambiance immediately
      this.initTownAmbiance();
    } catch (e) {
      console.warn('Audio ambiance init warning:', e);
    }
  }

  /**
   * Initializes natural background acoustic murmur & room ambiance for Tortilla Flat.
   * Completely noise-based (NO pure sine waves or synthesizer drones) mimicking distant saloon/porch voices.
   */
  private initTownAmbiance() {
    if (this.townAmbianceGain || !this.ctx) return;
    try {
      this.townAmbianceGain = this.ctx.createGain();
      this.townAmbianceGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.townAmbianceGain.connect(this.ctx.destination);

      // Procedural 6-second organic conversational murmur buffer (pink noise shaped by human vocal tract cadence)
      const sampleRate = this.ctx.sampleRate;
      const bufferLength = sampleRate * 6;
      const buffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferLength; i++) {
        const tSec = i / sampleRate;

        // Human conversational speech rhythm envelopes (syllabic rise and fall without pure musical tones)
        const syl1 = Math.max(0, Math.sin(2 * Math.PI * 3.1 * tSec));
        const syl2 = Math.max(0, Math.sin(2 * Math.PI * 4.7 * tSec + 1.8));
        const syl3 = Math.max(0, Math.sin(2 * Math.PI * 1.9 * tSec + 3.1));
        const phraseEnv = (syl1 * 0.45 + syl2 * 0.35 + syl3 * 0.2);

        // Pink noise filtering
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        const pink = (b0 + b1 + b2) * 0.2;

        data[i] = pink * phraseEnv * 0.35;
      }

      const chatterSource = this.ctx.createBufferSource();
      chatterSource.buffer = buffer;
      chatterSource.loop = true;

      // Human speech vowel formant filter (F1 ~540Hz)
      const formantF1 = this.ctx.createBiquadFilter();
      formantF1.type = 'bandpass';
      formantF1.frequency.setValueAtTime(540, this.ctx.currentTime);
      formantF1.Q.setValueAtTime(2.2, this.ctx.currentTime);

      // Saloon porch wooden wall dampening (soft lowpass)
      const wallDampening = this.ctx.createBiquadFilter();
      wallDampening.type = 'lowpass';
      wallDampening.frequency.setValueAtTime(1100, this.ctx.currentTime);

      this.townChatterFilter = formantF1;

      chatterSource.connect(formantF1);
      formantF1.connect(wallDampening);
      wallDampening.connect(this.townAmbianceGain);

      chatterSource.start();
    } catch (e) {
      console.warn('Town ambiance setup error:', e);
    }
  }

  /**
   * Updates Tortilla Flat town presence & triggers organic horse and settlement sounds.
   */
  public updateTownAmbiance(playerX: number, playerZ: number, delta: number, isUnderground: boolean = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Tortilla Flat center: (0, -246)
    const distToTown = Math.hypot(playerX - 0, playerZ - (-246));

    // Full presence within 40m of town, tapering out smoothly to 0 at 95m
    let targetPresence = 0;
    if (!isUnderground) {
      if (distToTown <= 40) {
        targetPresence = 1.0;
      } else if (distToTown < 95) {
        targetPresence = (95 - distToTown) / 55;
      }
    }

    // Fast responsiveness so presence is ready immediately on spawn
    this.townPresence += (targetPresence - this.townPresence) * Math.min(delta * 3.5, 1.0);

    if (this.townPresence > 0.02 && !this.townAmbianceGain) {
      this.initTownAmbiance();
    }

    if (this.townAmbianceGain) {
      const targetGain = this.isMuted ? 0 : this.townPresence * 0.18;
      this.townAmbianceGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.3);
    }

    // Trigger audible horse chuffs/nickers & town activity sounds when at Tortilla Flat
    if (this.townPresence > 0.12 && !this.isMuted) {
      this.townAmbianceTimer += delta;

      // 1. Realistic horse events (chuff, soft nicker, snort, hoof shuffle)
      if (this.townAmbianceTimer > this.nextHorseEventDelay) {
        this.nextHorseEventDelay = this.townAmbianceTimer + 4.5 + Math.random() * 5.5;
        const roll = Math.random();
        if (roll < 0.5) {
          this.playHorseChuff(this.townPresence);
        } else if (roll < 0.78) {
          this.playHorseSnort(this.townPresence);
        } else {
          this.playHorseNicker(this.townPresence);
        }
      }

      // 2. Town boardwalk and outpost events (wood creak, saloon porch life)
      if (this.townAmbianceTimer > this.nextTownEventDelay) {
        this.nextTownEventDelay = this.townAmbianceTimer + 6.0 + Math.random() * 7.0;
        const roll = Math.random();
        if (roll < 0.55) {
          this.playTownPorchCreak(this.townPresence);
        } else if (roll < 0.82) {
          this.playHorseHoofShift(this.townPresence);
        } else {
          this.playSaloonGlassClink(this.townPresence);
        }
      }
    }
  }

  /**
   * Authentic, realistic horse nostril flutter & lip chuff ("prrr-ffffhhhh").
   * 100% organic noise-based breath and lip vibration with zero electronic tones.
   */
  public playHorseChuff(volumeScale = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gainVal = Math.min(0.42, 0.32 * volumeScale);
    if (gainVal <= 0.005) return;

    // 0.85s breath + lip flutter buffer
    const duration = 0.85;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const tSec = i / this.ctx.sampleRate;
      const white = Math.random() * 2 - 1;
      // Pink noise filtering for warm organic air
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      const pink = (b0 + b1 + b2) * 0.35;

      // 14.5 Hz realistic equine lip vibration modulation
      const flutter = Math.sin(2 * Math.PI * 14.5 * tSec + Math.sin(tSec * 45) * 0.4) * 0.5 + 0.5;

      // Amplitude envelope: strong initial lip buzz, tapering into a smooth warm nose exhale
      let env = 0;
      if (tSec < 0.55) {
        env = (0.2 + flutter * 0.8) * Math.sin((tSec / 0.55) * Math.PI);
      } else {
        env = 0.45 * Math.exp(-(tSec - 0.55) * 5.0);
      }

      data[i] = pink * env;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Lowpass filter modeling deep horse nasal cavity (warm 360Hz -> 180Hz downward roll)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, t);
    filter.frequency.exponentialRampToValueAtTime(190, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal * 0.3, t);
    gain.gain.linearRampToValueAtTime(gainVal, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noiseSource.start(t);
    noiseSource.stop(t + duration);
  }

  /**
   * Crisp horse nasal snort / blow through flared nostrils.
   */
  public playHorseSnort(volumeScale = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gainVal = Math.min(0.38, 0.28 * volumeScale);
    if (gainVal <= 0.005) return;

    // Two rapid turbulent air puffs (0.35s total)
    const duration = 0.35;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const tSec = i / this.ctx.sampleRate;
      const white = Math.random() * 2 - 1;
      const puff1 = Math.exp(-Math.pow((tSec - 0.08) / 0.05, 2));
      const puff2 = Math.exp(-Math.pow((tSec - 0.22) / 0.06, 2)) * 0.75;
      data[i] = white * (puff1 + puff2) * 0.4;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(460, t);
    filter.Q.setValueAtTime(1.4, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noiseSource.start(t);
    noiseSource.stop(t + duration);
  }

  /**
   * Soft, warm, low-frequency horse greeting nicker at the hitching post.
   */
  public playHorseNicker(volumeScale = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gainVal = Math.min(0.32, 0.22 * volumeScale);
    if (gainVal <= 0.005) return;

    // Warm guttural throat rumble (140-190 Hz) heavily lowpassed
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.linearRampToValueAtTime(195, t + 0.14);
    osc.frequency.linearRampToValueAtTime(130, t + 0.48);

    // 10 Hz throat vibrato
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(10.5, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(22, t);
    lfo.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(gainVal, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(t);
    osc.start(t);
    lfo.stop(t + 0.55);
    osc.stop(t + 0.55);
  }

  /**
   * Horse shifting weight in dry desert dirt with muffled leather harness tension.
   */
  public playHorseHoofShift(volumeScale = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gainVal = Math.min(0.24, 0.16 * volumeScale);
    if (gainVal <= 0.005) return;

    // Low dirt scuff (filtered noise, NO high-pitched sine pings)
    const duration = 0.28;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const tSec = i / this.ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-tSec * 10);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + duration);
  }

  /**
   * Weathered pine timber porch boardwalk creaking under desert heat.
   * Granular noise friction bursts (no synthesizer sawtooth buzz).
   */
  public playTownPorchCreak(volumeScale = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gainVal = Math.min(0.22, 0.15 * volumeScale);
    if (gainVal <= 0.005) return;

    const duration = 0.38;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const tSec = i / this.ctx.sampleRate;
      // Irregular wood grain friction bursts
      const grainFriction = Math.sin(2 * Math.PI * 45 * tSec) * Math.sin(2 * Math.PI * 115 * tSec);
      data[i] = (Math.random() * 2 - 1) * Math.abs(grainFriction) * Math.exp(-tSec * 4.5);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(460, t);
    filter.Q.setValueAtTime(3.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + duration);
  }

  /**
   * Muffled clink of thick saloon glassware or tin camp cup.
   */
  public playSaloonGlassClink(volumeScale = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gainVal = Math.min(0.16, 0.10 * volumeScale);
    if (gainVal <= 0.005) return;

    const duration = 0.08;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const tSec = i / this.ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-tSec * 35);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.Q.setValueAtTime(8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + duration);
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

  /**
   * Thirsty audio cue played when player hydration levels drop below 20%.
   * Organic dry throat gasp, tight parched swallow, and dry breath exhalation.
   */
  public playThirstCue(intensity: number = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const gainVal = Math.min(0.28, 0.20 * intensity);

    // 1. Dry raspy throat gasp (0.45s pink noise shaped by dry vocal tract filter)
    const breathDuration = 0.45;
    const bufferSize = Math.floor(this.ctx.sampleRate * breathDuration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const tSec = i / this.ctx.sampleRate;
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      const pink = (b0 + b1 + b2) * 0.25;

      // Inhalation gasp envelope with slight raspy flutter
      const gaspEnv = Math.sin((tSec / breathDuration) * Math.PI);
      const raspy = 1.0 + Math.sin(tSec * 120) * 0.15;
      data[i] = pink * gaspEnv * raspy;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const throatFilter = this.ctx.createBiquadFilter();
    throatFilter.type = 'bandpass';
    throatFilter.frequency.setValueAtTime(750, t);
    throatFilter.frequency.exponentialRampToValueAtTime(1150, t + breathDuration);
    throatFilter.Q.setValueAtTime(2.2, t);

    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0.001, t);
    breathGain.gain.linearRampToValueAtTime(gainVal, t + 0.12);
    breathGain.gain.exponentialRampToValueAtTime(0.001, t + breathDuration);

    noiseSource.connect(throatFilter);
    throatFilter.connect(breathGain);
    breathGain.connect(this.ctx.destination);
    noiseSource.start(t);
    noiseSource.stop(t + breathDuration);

    // 2. Parched, tight dry swallow click at t + 0.38s
    const swallowTime = t + 0.38;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, swallowTime);
    osc.frequency.exponentialRampToValueAtTime(75, swallowTime + 0.09);

    const swallowGain = this.ctx.createGain();
    swallowGain.gain.setValueAtTime(gainVal * 0.75, swallowTime);
    swallowGain.gain.exponentialRampToValueAtTime(0.001, swallowTime + 0.1);

    osc.connect(swallowGain);
    swallowGain.connect(this.ctx.destination);
    osc.start(swallowTime);
    osc.stop(swallowTime + 0.11);

    // 3. Faint hollow dry canteen metallic tap at t + 0.52s
    const tapTime = t + 0.52;
    const tapOsc = this.ctx.createOscillator();
    tapOsc.type = 'sine';
    tapOsc.frequency.setValueAtTime(680, tapTime);
    tapOsc.frequency.exponentialRampToValueAtTime(320, tapTime + 0.14);

    const tapFilter = this.ctx.createBiquadFilter();
    tapFilter.type = 'bandpass';
    tapFilter.frequency.setValueAtTime(520, tapTime);
    tapFilter.Q.setValueAtTime(4.0, tapTime);

    const tapGain = this.ctx.createGain();
    tapGain.gain.setValueAtTime(gainVal * 0.28, tapTime);
    tapGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.14);

    tapOsc.connect(tapFilter);
    tapFilter.connect(tapGain);
    tapGain.connect(this.ctx.destination);
    tapOsc.start(tapTime);
    tapOsc.stop(tapTime + 0.15);
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

  public playEatFood() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Satisfying two-crunch chewing sound
    const t = this.ctx.currentTime;
    [0, 0.12, 0.24].forEach((offset, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 - idx * 40, t + offset);
      osc.frequency.exponentialRampToValueAtTime(140, t + offset + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t + offset);

      gain.gain.setValueAtTime(0.18, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + offset);
      osc.stop(t + offset + 0.095);
    });
  }

  public playHarvestGame() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Field dressing knife slide & leather rustle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
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

  // Prospector's Inspection Goggles Ratchet / Lens Click Sound
  public playGogglesClick(active: boolean = true) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Brass lens shutter click / optics alignment ratchet
    const freq = active ? 1420 : 920;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(active ? 2200 : 640, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);

    // Second mechanical ratchet click
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(active ? 1800 : 780, t + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(active ? 2600 : 420, t + 0.12);

    gain2.gain.setValueAtTime(0.18, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.14);
  }

  /**
   * Prospector Goggles surface scan optical ratchet click.
   */
  public playGogglesScan() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.04);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Prospector Goggles gold signature detection resonance chime.
   * High pure crystal harmonic resonance signaling auriferous minerals.
   */
  public playGoldDetectedChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Dual bell chime (E6 + B6 harmonic)
    const freqs = [1318.5, 1975.5, 2637.0];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.04);

      gain.gain.setValueAtTime(0.12 / (idx + 1), t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + idx * 0.04 + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.75);
    });
  }

  // Mine Shaft Ladder Climbing Audio: Rhythmic metal rung clanking & boot thuds
  public playLadderClimb(isMetal: boolean = true) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    if (isMetal) {
      // 1. Heavy boot heel impact on iron rung
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(140 + Math.random() * 20, t);
      thud.frequency.exponentialRampToValueAtTime(45, t + 0.09);
      thudGain.gain.setValueAtTime(0.26, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thud.start(t);
      thud.stop(t + 0.11);

      // 2. Resonant metallic rung clank & harmonic ping
      const rungFreq = 720 + Math.random() * 80;
      const rungOsc = this.ctx.createOscillator();
      const rungGain = this.ctx.createGain();
      rungOsc.type = 'triangle';
      rungOsc.frequency.setValueAtTime(rungFreq, t + 0.01);
      rungOsc.frequency.exponentialRampToValueAtTime(rungFreq * 0.92, t + 0.16);
      rungGain.gain.setValueAtTime(0.18, t + 0.01);
      rungGain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      rungOsc.connect(rungGain);
      rungGain.connect(this.ctx.destination);
      rungOsc.start(t + 0.01);
      rungOsc.stop(t + 0.18);

      // 3. High metal harmonic shimmer
      const overtone = this.ctx.createOscillator();
      const overtoneGain = this.ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(rungFreq * 2.14, t + 0.01);
      overtoneGain.gain.setValueAtTime(0.08, t + 0.01);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      overtone.connect(overtoneGain);
      overtoneGain.connect(this.ctx.destination);
      overtone.start(t + 0.01);
      overtone.stop(t + 0.13);
    } else {
      // Wood rung creak and boot impact
      const woodThud = this.ctx.createOscillator();
      const woodGain = this.ctx.createGain();
      woodThud.type = 'triangle';
      woodThud.frequency.setValueAtTime(180, t);
      woodThud.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      woodGain.gain.setValueAtTime(0.24, t);
      woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      woodThud.connect(woodGain);
      woodGain.connect(this.ctx.destination);
      woodThud.start(t);
      woodThud.stop(t + 0.14);
    }
  }

  // Initial Ladder Grip / Mounting Clank
  public playLadderInitiate(isMetal: boolean = true) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.playLadderClimb(isMetal);

    // Additional grip grasp rattle
    const rattleOsc = this.ctx.createOscillator();
    const rattleGain = this.ctx.createGain();
    rattleOsc.type = 'sawtooth';
    rattleOsc.frequency.setValueAtTime(420, t + 0.05);
    rattleOsc.frequency.exponentialRampToValueAtTime(260, t + 0.12);
    rattleGain.gain.setValueAtTime(0.12, t + 0.05);
    rattleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    rattleOsc.connect(rattleGain);
    rattleGain.connect(this.ctx.destination);
    rattleOsc.start(t + 0.05);
    rattleOsc.stop(t + 0.14);
  }

  // Mountain Tunnel Daylight Breakthrough Sound
  public playMountainBreakthrough() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Heavy bedrock rupture boom & low-frequency shockwave
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(120, t);
    boomOsc.frequency.exponentialRampToValueAtTime(32, t + 0.8);
    boomGain.gain.setValueAtTime(0.5, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.start(t);
    boomOsc.stop(t + 1.2);

    // 2. Cascading rock shatter and gravel tumble
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(350, t + 0.9);
    noiseFilter.Q.setValueAtTime(1.5, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.9);

    // 3. Canyon mountain wind rush rushing through newly opened tunnel
    const windBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 1.5), this.ctx.sampleRate);
    const wData = windBuffer.getChannelData(0);
    for (let i = 0; i < wData.length; i++) {
      wData[i] = (Math.random() * 2 - 1) * 0.2;
    }
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = windBuffer;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(450, t + 0.1);
    windFilter.frequency.exponentialRampToValueAtTime(950, t + 0.7);
    windFilter.frequency.exponentialRampToValueAtTime(320, t + 1.5);
    windFilter.Q.setValueAtTime(4.0, t);
    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.01, t);
    windGain.gain.linearRampToValueAtTime(0.28, t + 0.35);
    windGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ctx.destination);
    windSrc.start(t + 0.05);
    windSrc.stop(t + 1.5);

    // 4. Resonant mountain breakthrough brass/chime fanfare
    const freqs = [293.66, 369.99, 440.0, 587.33]; // D major mountain chord
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + 0.2 + idx * 0.08);
      g.gain.setValueAtTime(0.12, t + 0.2 + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4 + idx * 0.08);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t + 0.2 + idx * 0.08);
      osc.stop(t + 1.5 + idx * 0.08);
    });
  }

  /**
   * Authentic Sonoran desert pack burro bray ("Hee-haw!")
   * Resonant harmonic dual-phase vocalization with descending rasp
   */
  public playBurroBray() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // First bray syllable: "HEE" (higher harmonic pitch)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter1 = this.ctx.createBiquadFilter();
    osc1.type = 'sawtooth';
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(680, t);
    filter1.frequency.exponentialRampToValueAtTime(860, t + 0.35);
    filter1.Q.setValueAtTime(4.0, t);

    osc1.frequency.setValueAtTime(310, t);
    osc1.frequency.linearRampToValueAtTime(420, t + 0.25);
    osc1.frequency.linearRampToValueAtTime(360, t + 0.45);

    gain1.gain.setValueAtTime(0.01, t);
    gain1.gain.linearRampToValueAtTime(0.22, t + 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.02, t + 0.48);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.5);

    // Second bray syllable: "HAW" (deep guttural raspy exhalation)
    const tHaw = t + 0.42;
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    const filter2 = this.ctx.createBiquadFilter();
    osc2.type = 'sawtooth';
    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(480, tHaw);
    filter2.frequency.exponentialRampToValueAtTime(240, tHaw + 0.6);

    osc2.frequency.setValueAtTime(220, tHaw);
    osc2.frequency.exponentialRampToValueAtTime(140, tHaw + 0.55);

    gain2.gain.setValueAtTime(0.01, tHaw);
    gain2.gain.linearRampToValueAtTime(0.26, tHaw + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, tHaw + 0.65);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(tHaw);
    osc2.stop(tHaw + 0.7);

    // Pack saddle bell jingle
    this.playBurroBell(tHaw + 0.1);
  }

  /**
   * Pack saddle brass bell chime
   */
  public playBurroBell(customTime?: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = customTime !== undefined ? customTime : this.ctx.currentTime;

    const bellFreqs = [1567.98, 2093.0]; // G6, C7 bright small brass bell
    bellFreqs.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.03);
      gain.gain.setValueAtTime(0.07, t + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35 + i * 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.03);
      osc.stop(t + 0.4 + i * 0.03);
    });
  }

  /**
   * Mountain Mustang Pony whinny / neigh
   */
  public playHorseWhinny() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(1700, t + 0.2);
    filter.frequency.exponentialRampToValueAtTime(750, t + 0.7);
    filter.Q.setValueAtTime(3.5, t);

    // Pitch envelope: rising then fluttering down
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.linearRampToValueAtTime(780, t + 0.18);
    osc.frequency.linearRampToValueAtTime(620, t + 0.35);
    osc.frequency.linearRampToValueAtTime(710, t + 0.45);
    osc.frequency.linearRampToValueAtTime(440, t + 0.75);

    // Tremolo LFO flutter
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(18, t); // 18Hz vibrato flutter
    lfoGain.gain.setValueAtTime(28, t);
    lfo.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + 0.8);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.85);
  }

  /**
   * Rhythmic two-beat wooden/rocky hoof clip-clop
   */
  public playHoofTrot(isGallop = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const duration = isGallop ? 0.045 : 0.06;
    const gap = isGallop ? 0.07 : 0.11;

    // Two hooves hitting earth/gravel in cadence
    [0, gap].forEach((delay, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      const basePitch = (idx === 0 ? 120 : 95) + Math.random() * 15;
      osc.frequency.setValueAtTime(basePitch, t + delay);
      osc.frequency.exponentialRampToValueAtTime(45, t + delay + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, t + delay);

      gain.gain.setValueAtTime(0.16, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + duration + 0.01);
    });
  }

  /**
   * Leather saddle creak & stirrup clink on mount/dismount
   */
  public playMountSaddle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Leather creak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.linearRampToValueAtTime(180, t + 0.28);
    filter.Q.setValueAtTime(5.0, t);

    osc.frequency.setValueAtTime(85, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.15);
    osc.frequency.linearRampToValueAtTime(70, t + 0.28);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);

    // Brass stirrup chime
    const stirrupOsc = this.ctx.createOscillator();
    const stirrupGain = this.ctx.createGain();
    stirrupOsc.type = 'sine';
    stirrupOsc.frequency.setValueAtTime(2480, t + 0.08);
    stirrupGain.gain.setValueAtTime(0.08, t + 0.08);
    stirrupGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    stirrupOsc.connect(stirrupGain);
    stirrupGain.connect(this.ctx.destination);
    stirrupOsc.start(t + 0.08);
    stirrupOsc.stop(t + 0.38);
  }

  /**
   * Distant Apache canyon war drums reverberating through the Superstition Mountains.
   * Procedural resonant low-frequency rawhide drum pulse.
   */
  public playApacheWarDrum(intensity: number = 0.5) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const volume = Math.min(0.28, 0.08 + intensity * 0.18);

    // Double beat rhythm (ta-TUM heartbeat pattern)
    [0, 0.18].forEach((offset, idx) => {
      if (!this.ctx) return;
      const beatTime = t + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      // Rawhide drum membrane pitch drop
      const startPitch = idx === 0 ? 92 : 80;
      const endPitch = idx === 0 ? 54 : 44;
      osc.frequency.setValueAtTime(startPitch, beatTime);
      osc.frequency.exponentialRampToValueAtTime(endPitch, beatTime + 0.35);

      // Warm cavernous body filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, beatTime);
      filter.frequency.exponentialRampToValueAtTime(140, beatTime + 0.4);

      const beatVol = idx === 0 ? volume * 0.7 : volume;
      gain.gain.setValueAtTime(0.001, beatTime);
      gain.gain.linearRampToValueAtTime(beatVol, beatTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, beatTime + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(beatTime);
      osc.stop(beatTime + 0.7);
    });
  }

  /**
   * Eerie desert night horned owl warning call echoing from high rocky bluffs.
   */
  public playApacheSentinelCall() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Classic Great Horned Owl "Whoo-hoo-o-o, whoo-o-o"
    const notes = [
      { delay: 0.0, dur: 0.28, freq: 360 },
      { delay: 0.38, dur: 0.22, freq: 380 },
      { delay: 0.72, dur: 0.42, freq: 340 },
    ];

    notes.forEach(({ delay, dur, freq }) => {
      if (!this.ctx) return;
      const st = t + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq - 15, st);
      osc.frequency.linearRampToValueAtTime(freq + 10, st + dur * 0.4);
      osc.frequency.linearRampToValueAtTime(freq - 25, st + dur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, st);
      filter.Q.setValueAtTime(3.0, st);

      gain.gain.setValueAtTime(0.001, st);
      gain.gain.linearRampToValueAtTime(0.07, st + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, st + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + dur + 0.02);
    });
  }

  /**
   * Distant Apache battle war cry echoing through the rocky canyon passes.
   * Modulated vocal formant sweep with canyon resonance.
   */
  public playApacheWarCry() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const tremolo = this.ctx.createOscillator();
    const tremoloGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(1150, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(550, t + 0.65);

    // Rapid trill / ululation modulation
    tremolo.type = 'sine';
    tremolo.frequency.setValueAtTime(14, t);
    tremoloGain.gain.setValueAtTime(160, t);
    tremolo.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, t);
    filter.Q.setValueAtTime(4.5, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    tremolo.start(t);
    osc.start(t);
    tremolo.stop(t + 0.72);
    osc.stop(t + 0.72);
  }

  /**
   * Aerodynamic arrow whistling whoosh passing close by.
   */
  public playArrowWhoosh() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(650, t + 0.22);
    filter.Q.setValueAtTime(6.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.25);
  }

  /**
   * Arrow striking ground, rock, or wooden headframe with sharp thud.
   */
  public playArrowImpact() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.09);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Heavy galloping desert war pony hooves on hard canyon gravel.
   */
  public playWarHorseGallop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Double-strike hoofbeat (ba-dump)
    [0.0, 0.09].forEach((delay) => {
      if (!this.ctx) return;
      const st = t + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, st);
      osc.frequency.exponentialRampToValueAtTime(45, st + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, st);

      gain.gain.setValueAtTime(0.16, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + 0.1);
    });
  }

  /**
   * Eerie mountain wind whisper and tumbling pebbles as a high-ridge scout disappears.
   */
  public playScoutVanish() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.38);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.42);
  }

  /**
   * Heavy rockfall, burning timber crackle, and catastrophic collapse when Apache saboteurs strike a mine.
   */
  public playMineSabotageRumble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Deep seismic subterranean rumble
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 1.2);

    const oscFilter = this.ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(160, t);
    oscFilter.frequency.exponentialRampToValueAtTime(45, t + 1.2);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.001, t);
    oscGain.gain.linearRampToValueAtTime(0.35, t + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.45);

    // 2. Tumbled boulders and falling scree noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.3);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.45));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(320, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(90, t + 1.2);
    noiseFilter.Q.setValueAtTime(1.8, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, t);
    noiseGain.gain.linearRampToValueAtTime(0.28, t + 0.15);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 1.35);

    // 3. Sharp timber snap
    const snap = this.ctx.createOscillator();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(420, t + 0.08);
    snap.frequency.exponentialRampToValueAtTime(60, t + 0.28);
    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.001, t + 0.08);
    snapGain.gain.linearRampToValueAtTime(0.22, t + 0.1);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    snap.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snap.start(t + 0.08);
    snap.stop(t + 0.32);
  }

  /**
   * Procedural rustle of mesquite branches, ironwood sticks, and tumbling scree stones (Jacob Waltz concealment).
   */
  public playBrushCamouflage() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Foliage rustle noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.65);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Modulate noise with crinkly bursts
      const mod = Math.sin((i / 44100) * 45) * 0.5 + 0.5;
      data[i] = (Math.random() * 2 - 1) * (0.4 + 0.6 * mod);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.linearRampToValueAtTime(950, t + 0.5);
    filter.Q.setValueAtTime(2.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.65);

    // Stone thud as berm rocks are stacked
    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(140, t + 0.22);
    thud.frequency.exponentialRampToValueAtTime(45, t + 0.45);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.001, t + 0.22);
    thudGain.gain.linearRampToValueAtTime(0.14, t + 0.25);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thud.start(t + 0.22);
    thud.stop(t + 0.5);
  }

  /**
   * Chilling high-canyon Apache war cry / warning call signaling an aggressive assault.
   */
  public playWarWhoop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Undulating frequency sweep mimicking canyon war call
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    // Vibrato LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(14, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(110, t);
    lfo.connect(osc.frequency);

    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(920, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.7);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, t);
    filter.Q.setValueAtTime(3.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(t);
    osc.start(t);
    lfo.stop(t + 0.8);
    osc.stop(t + 0.8);
  }

  /**
   * Heavy visceral bone-jarring impact of a mounted warrior's lance strike or war horse trample.
   */
  public playLanceStrike() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Heavy low-frequency body thud
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.35);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.38, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    // 2. Leather and wooden shaft impact crack
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(850, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.16);
  }

  /**
   * Authentic US Cavalry Brass Bugle Call (Fort McDowell 6th/8th Cavalry).
   * Generates traditional military bugle harmonic notes (C4, G4, C5, E5, G5)
   * with brass tube formant filtering, bell flare resonances, and outdoor mountain echo.
   * Scaled down to gentle, distant, atmospheric levels.
   */
  public playCavalryBugleCall(
    pattern: 'assembly' | 'boots_and_saddles' | 'charge' = 'boots_and_saddles',
    volumeScale: number = 0.12
  ) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Harmonic overtone bugle pitches in standard Bb cavalry regulation bugle:
    // Eb4 ~ 311.1Hz, Bb4 ~ 466.2Hz, Eb5 ~ 622.3Hz, G5 ~ 784.0Hz, Bb5 ~ 932.3Hz
    const Bb_BUGLE: Record<string, number> = {
      low: 311.1,     // Root harmonic
      mid: 466.2,     // 5th
      high: 622.3,    // Octave
      third: 784.0,   // Major 3rd above octave
      top: 932.3,     // High 5th
    };

    type BugleNote = { note: number; time: number; dur: number; vol: number };
    let sequence: BugleNote[] = [];

    if (pattern === 'boots_and_saddles') {
      // Classic "Boots and Saddles" cavalry mount call
      sequence = [
        { note: Bb_BUGLE.mid, time: 0.0, dur: 0.22, vol: 0.20 },
        { note: Bb_BUGLE.high, time: 0.26, dur: 0.20, vol: 0.22 },
        { note: Bb_BUGLE.mid, time: 0.48, dur: 0.18, vol: 0.20 },
        { note: Bb_BUGLE.high, time: 0.68, dur: 0.35, vol: 0.25 },
        { note: Bb_BUGLE.third, time: 1.08, dur: 0.22, vol: 0.22 },
        { note: Bb_BUGLE.high, time: 1.34, dur: 0.20, vol: 0.20 },
        { note: Bb_BUGLE.mid, time: 1.56, dur: 0.45, vol: 0.18 },
      ];
    } else if (pattern === 'charge') {
      // Gallop / Charge fanfare
      sequence = [
        { note: Bb_BUGLE.mid, time: 0.0, dur: 0.12, vol: 0.22 },
        { note: Bb_BUGLE.high, time: 0.14, dur: 0.12, vol: 0.24 },
        { note: Bb_BUGLE.third, time: 0.28, dur: 0.14, vol: 0.26 },
        { note: Bb_BUGLE.top, time: 0.44, dur: 0.60, vol: 0.28 },
      ];
    } else {
      // Assembly / Routine Trail Patrol
      sequence = [
        { note: Bb_BUGLE.mid, time: 0.0, dur: 0.18, vol: 0.20 },
        { note: Bb_BUGLE.mid, time: 0.22, dur: 0.18, vol: 0.20 },
        { note: Bb_BUGLE.high, time: 0.44, dur: 0.32, vol: 0.22 },
        { note: Bb_BUGLE.third, time: 0.80, dur: 0.24, vol: 0.24 },
        { note: Bb_BUGLE.high, time: 1.08, dur: 0.50, vol: 0.20 },
      ];
    }

    const safeVolScale = Math.max(0.01, Math.min(1.0, volumeScale));

    sequence.forEach(({ note, time: noteTime, dur, vol }) => {
      if (!this.ctx) return;
      const startTime = t + noteTime;

      // 1. Dual harmonic brass oscillators (sawtooth + triangle)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(note, startTime);
      osc2.frequency.setValueAtTime(note * 1.002, startTime); // Slight chorus thickness

      // 2. Brass lip-buzz envelope & bell resonance filter
      const brassFilter = this.ctx.createBiquadFilter();
      brassFilter.type = 'bandpass';
      brassFilter.frequency.setValueAtTime(note * 1.8, startTime);
      brassFilter.Q.setValueAtTime(3.2, startTime);

      // 3. Warm low-pass filter to simulate open-air canyon acoustic distance
      const distanceFilter = this.ctx.createBiquadFilter();
      distanceFilter.type = 'lowpass';
      distanceFilter.frequency.setValueAtTime(1200, startTime);

      // 4. Amplitude envelope with brass tonguing attack and smooth decay
      const gainNode = this.ctx.createGain();
      const targetGain = vol * safeVolScale * 0.35;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(targetGain, startTime + 0.04);
      gainNode.gain.setValueAtTime(targetGain * 0.9, startTime + dur - 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.12);

      // Reverb / Mountain canyon delay simulation
      const echoGain = this.ctx.createGain();
      echoGain.gain.setValueAtTime(targetGain * 0.2, startTime + 0.22);
      echoGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.6);

      osc1.connect(brassFilter);
      osc2.connect(brassFilter);
      brassFilter.connect(distanceFilter);
      distanceFilter.connect(gainNode);
      distanceFilter.connect(echoGain);

      gainNode.connect(this.ctx.destination);
      echoGain.connect(this.ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + dur + 0.7);
      osc2.stop(startTime + dur + 0.7);
    });
  }

  /**
   * Sound of mounted cavalry horses trotting together with leather tack and sabre jingle.
   * Gentle, quiet, realistic earthen stride.
   */
  public playCavalryTroopHooves(volumeScale: number = 0.2) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const safeScale = Math.max(0, Math.min(1.0, volumeScale));
    if (safeScale <= 0.01) return;

    // Troop of horses trotting slightly out of phase
    const offsets = [0, 0.08, 0.18, 0.26];
    offsets.forEach((dt, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      const basePitch = (i % 2 === 0 ? 100 : 85) + (Math.random() * 8 - 4);
      osc.frequency.setValueAtTime(basePitch, t + dt);
      osc.frequency.exponentialRampToValueAtTime(35, t + dt + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, t + dt);

      // Soft muted earthen hooves
      gain.gain.setValueAtTime(0.015 * safeScale, t + dt);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.06);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + dt);
      osc.stop(t + dt + 0.07);
    });

    // Extremely faint metallic scabbard / bit chain jingle
    const jingleOsc = this.ctx.createOscillator();
    const jingleGain = this.ctx.createGain();
    const jingleFilter = this.ctx.createBiquadFilter();

    jingleOsc.type = 'sine';
    jingleOsc.frequency.setValueAtTime(2800 + Math.random() * 600, t);
    jingleFilter.type = 'bandpass';
    jingleFilter.frequency.setValueAtTime(3000, t);
    jingleFilter.Q.setValueAtTime(6, t);

    jingleGain.gain.setValueAtTime(0.002 * safeScale, t);
    jingleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    jingleOsc.connect(jingleFilter);
    jingleFilter.connect(jingleGain);
    jingleGain.connect(this.ctx.destination);

    jingleOsc.start(t);
    jingleOsc.stop(t + 0.14);
  }
}

export const soundEngine = new SoundEngine();
