/**
 * Procedural Old West Soundtrack Synthesizer
 * 100% self-contained Web Audio procedural synthesis of authentic 19th-century
 * frontier Western music:
 * - Nylon & steel acoustic guitar fingerpicking arpeggios
 * - Classic Ennio Morricone-style lone desert whistling / harmonica melodies
 * - Deep upright acoustic bass plucks
 * - Subtle cowboy spurs & brushed snare rhythm
 */

export type WesternTrackId = 'campfire' | 'high_noon' | 'prospector_waltz';

export interface WesternTrackInfo {
  id: WesternTrackId;
  title: string;
  subtitle: string;
  bpm: number;
  timeSignature: '4/4' | '3/4';
}

export const WESTERN_TRACKS: WesternTrackInfo[] = [
  {
    id: 'campfire',
    title: 'Superstition Campfire',
    subtitle: 'Acoustic Fingerpicking & Lone Whistler',
    bpm: 76,
    timeSignature: '4/4',
  },
  {
    id: 'high_noon',
    title: 'High Noon Standoff',
    subtitle: 'Spanish Minor Arpeggios & Harmonica',
    bpm: 68,
    timeSignature: '4/4',
  },
  {
    id: 'prospector_waltz',
    title: 'Prospector’s Frontier Waltz',
    subtitle: 'Gentle 3/4 Acoustic Trail Ballad',
    bpm: 88,
    timeSignature: '3/4',
  },
];

// Note frequencies
const NOTE_FREQS: Record<string, number> = {
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
};

interface ChordPattern {
  bass: string;
  arpeggio: string[];
}

interface MelodyNote {
  note: string;
  beatOffset: number;
  durationBeats: number;
  vibratoDelay?: number;
}

class WesternMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.55;
  private currentTrackId: WesternTrackId = 'campfire';
  private loopTimer: number | null = null;
  private currentStep: number = 0;
  private listeners: Array<() => void> = [];

  constructor() {
    // Pick a random track on startup for continuous playlist shuffle
    const randomTrack = WESTERN_TRACKS[Math.floor(Math.random() * WESTERN_TRACKS.length)];
    if (randomTrack) {
      this.currentTrackId = randomTrack.id;
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isPlaying && !this.isMuted ? this.volume : 0,
        this.ctx.currentTime
      );
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTrack(): WesternTrackInfo {
    return (
      WESTERN_TRACKS.find((t) => t.id === this.currentTrackId) || WESTERN_TRACKS[0]
    );
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isPlaying && !this.isMuted ? this.volume : 0,
        this.ctx.currentTime
      );
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isPlaying && !this.isMuted ? this.volume : 0,
        this.ctx.currentTime
      );
    }
    this.notify();
    return this.isMuted;
  }

  public switchTrack(trackId: WesternTrackId) {
    if (this.currentTrackId === trackId) return;
    this.currentTrackId = trackId;
    this.currentStep = 0;
    if (this.isPlaying) {
      this.stop();
      this.play();
    } else {
      this.notify();
    }
  }

  public shuffleNextTrack() {
    const others = WESTERN_TRACKS.filter((t) => t.id !== this.currentTrackId);
    const next = others[Math.floor(Math.random() * others.length)] || WESTERN_TRACKS[0];
    this.currentTrackId = next.id;
    this.currentStep = 0;
    this.notify();
  }

  public nextTrack() {
    this.shuffleNextTrack();
  }

  public play() {
    this.initContext();
    if (this.isPlaying) return;
    this.isPlaying = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    this.currentStep = 0;
    this.scheduleNextBar();
    this.notify();
  }

  public stop() {
    this.isPlaying = false;
    if (this.loopTimer) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  // ==========================================
  // Track Sequences & Chord Progressions
  // ==========================================

  // Theme 1: "Superstition Campfire" (4/4, Am – C – Dm – E7 – F – C – Dm – E7)
  private getCampfireSequence(): { chords: ChordPattern[]; melodies: MelodyNote[][] } {
    const chords: ChordPattern[] = [
      { bass: 'A2', arpeggio: ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'E4', 'A3'] },
      { bass: 'C3', arpeggio: ['G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G3'] },
      { bass: 'D3', arpeggio: ['A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A3'] },
      { bass: 'E2', arpeggio: ['B3', 'E4', 'G4', 'B4', 'G4', 'E4', 'G4', 'B3'] },
      { bass: 'F2', arpeggio: ['A3', 'C4', 'F4', 'A4', 'F4', 'C4', 'F4', 'A3'] },
      { bass: 'C3', arpeggio: ['G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G3'] },
      { bass: 'D3', arpeggio: ['A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A3'] },
      { bass: 'E2', arpeggio: ['G3', 'B3', 'D4', 'E4', 'B3', 'G3', 'B3', 'E3'] },
    ];

    const melodies: MelodyNote[][] = [
      // Bar 1: Intro phrase (Whistling enters on beat 2)
      [
        { note: 'E5', beatOffset: 1.5, durationBeats: 1.2, vibratoDelay: 0.3 },
        { note: 'A5', beatOffset: 3.0, durationBeats: 1.0, vibratoDelay: 0.2 },
      ],
      // Bar 2:
      [
        { note: 'G5', beatOffset: 0.0, durationBeats: 1.5, vibratoDelay: 0.4 },
        { note: 'E5', beatOffset: 2.0, durationBeats: 1.8, vibratoDelay: 0.3 },
      ],
      // Bar 3:
      [
        { note: 'D5', beatOffset: 0.5, durationBeats: 1.2, vibratoDelay: 0.3 },
        { note: 'F5', beatOffset: 2.0, durationBeats: 1.6, vibratoDelay: 0.2 },
      ],
      // Bar 4:
      [
        { note: 'E5', beatOffset: 0.0, durationBeats: 2.5, vibratoDelay: 0.5 },
      ],
      // Bar 5:
      [
        { note: 'A5', beatOffset: 0.5, durationBeats: 1.4, vibratoDelay: 0.3 },
        { note: 'C5', beatOffset: 2.2, durationBeats: 1.5, vibratoDelay: 0.2 },
      ],
      // Bar 6:
      [
        { note: 'B4', beatOffset: 0.0, durationBeats: 1.8, vibratoDelay: 0.4 },
        { note: 'G4', beatOffset: 2.0, durationBeats: 1.6, vibratoDelay: 0.2 },
      ],
      // Bar 7:
      [
        { note: 'A4', beatOffset: 0.5, durationBeats: 2.0, vibratoDelay: 0.3 },
        { note: 'B4', beatOffset: 2.8, durationBeats: 1.0, vibratoDelay: 0.2 },
      ],
      // Bar 8:
      [
        { note: 'A4', beatOffset: 0.0, durationBeats: 3.2, vibratoDelay: 0.5 },
      ],
    ];

    return { chords, melodies };
  }

  // Theme 2: "High Noon Standoff" (4/4, Dm – C – Bb – A7 Spanish Cadence)
  private getHighNoonSequence(): { chords: ChordPattern[]; melodies: MelodyNote[][] } {
    const chords: ChordPattern[] = [
      { bass: 'D3', arpeggio: ['A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A3'] },
      { bass: 'C3', arpeggio: ['G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G3'] },
      { bass: 'B2', arpeggio: ['F3', 'B3', 'D4', 'F4', 'D4', 'B3', 'D4', 'F3'] },
      { bass: 'A2', arpeggio: ['E3', 'A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'E3'] },
      { bass: 'D3', arpeggio: ['A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A3'] },
      { bass: 'C3', arpeggio: ['G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G3'] },
      { bass: 'B2', arpeggio: ['F3', 'B3', 'D4', 'F4', 'D4', 'B3', 'D4', 'F3'] },
      { bass: 'A2', arpeggio: ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'E4', 'A3'] },
    ];

    const melodies: MelodyNote[][] = [
      // Bar 1: Harmonica style
      [
        { note: 'D5', beatOffset: 1.0, durationBeats: 2.2, vibratoDelay: 0.3 },
      ],
      // Bar 2:
      [
        { note: 'E5', beatOffset: 0.5, durationBeats: 1.2, vibratoDelay: 0.2 },
        { note: 'C5', beatOffset: 2.0, durationBeats: 1.8, vibratoDelay: 0.4 },
      ],
      // Bar 3:
      [
        { note: 'D5', beatOffset: 0.0, durationBeats: 1.5, vibratoDelay: 0.3 },
        { note: 'F5', beatOffset: 2.0, durationBeats: 1.5, vibratoDelay: 0.2 },
      ],
      // Bar 4:
      [
        { note: 'E5', beatOffset: 0.0, durationBeats: 3.0, vibratoDelay: 0.5 },
      ],
      // Bar 5:
      [
        { note: 'A5', beatOffset: 0.5, durationBeats: 2.0, vibratoDelay: 0.3 },
      ],
      // Bar 6:
      [
        { note: 'G5', beatOffset: 0.0, durationBeats: 1.5, vibratoDelay: 0.3 },
        { note: 'F5', beatOffset: 2.0, durationBeats: 1.5, vibratoDelay: 0.2 },
      ],
      // Bar 7:
      [
        { note: 'E5', beatOffset: 0.5, durationBeats: 1.2, vibratoDelay: 0.2 },
        { note: 'F5', beatOffset: 2.0, durationBeats: 1.4, vibratoDelay: 0.3 },
      ],
      // Bar 8:
      [
        { note: 'D5', beatOffset: 0.0, durationBeats: 3.2, vibratoDelay: 0.4 },
      ],
    ];

    return { chords, melodies };
  }

  // Theme 3: "Prospector's Frontier Waltz" (3/4 time, Em – G – Am – B7)
  private getWaltzSequence(): { chords: ChordPattern[]; melodies: MelodyNote[][] } {
    const chords: ChordPattern[] = [
      { bass: 'E2', arpeggio: ['G3', 'B3', 'E4', 'B3', 'G3', 'E3'] },
      { bass: 'G2', arpeggio: ['B3', 'D4', 'G4', 'D4', 'B3', 'G3'] },
      { bass: 'A2', arpeggio: ['C4', 'E4', 'A4', 'E4', 'C4', 'A3'] },
      { bass: 'B2', arpeggio: ['D4', 'F4', 'B4', 'F4', 'D4', 'B3'] },
      { bass: 'C3', arpeggio: ['E4', 'G4', 'C5', 'G4', 'E4', 'C4'] },
      { bass: 'G2', arpeggio: ['B3', 'D4', 'G4', 'D4', 'B3', 'G3'] },
      { bass: 'A2', arpeggio: ['C4', 'E4', 'A4', 'E4', 'C4', 'A3'] },
      { bass: 'E2', arpeggio: ['G3', 'B3', 'E4', 'B3', 'G3', 'E3'] },
    ];

    const melodies: MelodyNote[][] = [
      [{ note: 'E5', beatOffset: 0.5, durationBeats: 1.8, vibratoDelay: 0.3 }],
      [{ note: 'G5', beatOffset: 0.0, durationBeats: 2.2, vibratoDelay: 0.4 }],
      [{ note: 'A5', beatOffset: 0.5, durationBeats: 1.8, vibratoDelay: 0.3 }],
      [{ note: 'B5', beatOffset: 0.0, durationBeats: 2.0, vibratoDelay: 0.4 }],
      [{ note: 'C5', beatOffset: 0.5, durationBeats: 1.8, vibratoDelay: 0.3 }],
      [{ note: 'B4', beatOffset: 0.0, durationBeats: 2.0, vibratoDelay: 0.3 }],
      [{ note: 'A4', beatOffset: 0.5, durationBeats: 1.6, vibratoDelay: 0.2 }],
      [{ note: 'E4', beatOffset: 0.0, durationBeats: 2.5, vibratoDelay: 0.4 }],
    ];

    return { chords, melodies };
  }

  // ==========================================
  // Sound Synthesis Helpers
  // ==========================================

  // Acoustic Guitar Pluck Synthesizer
  private playGuitarPluck(freq: number, time: number, gainVal: number = 0.18) {
    if (!this.ctx || !this.masterGain) return;

    // Body resonance filter
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(freq * 1.5, time);
    bodyFilter.Q.setValueAtTime(3.2, time);

    // Warm highpass to avoid sub-rumble
    const lowFilter = this.ctx.createBiquadFilter();
    lowFilter.type = 'highpass';
    lowFilter.frequency.setValueAtTime(75, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    // Fast initial pluck transient decaying into warm resonant body
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.95);

    // Primary plucked string oscillator (triangle with subtle sawtooth shimmer)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 2.01, time); // 1st harmonic
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.08, time);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    osc2.connect(osc2Gain);
    osc2Gain.connect(bodyFilter);

    osc1.connect(bodyFilter);
    bodyFilter.connect(lowFilter);
    lowFilter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc1.stop(time + 1.0);
    osc2.start(time);
    osc2.stop(time + 0.4);
  }

  // Deep Upright Acoustic Bass Pluck
  private playAcousticBass(freq: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, time + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 1.25);
  }

  // Lone Desert Whistler / Harmonica Synthesizer
  private playLoneWhistle(
    freq: number,
    time: number,
    duration: number,
    vibratoDelay: number = 0.35
  ) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    // Gentle natural portamento slide up to note
    osc.frequency.setValueAtTime(freq * 0.97, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.08);

    // Whistle vibrato LFO (5.2 Hz) that swells after note onset
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.4, time);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.0, time);
    lfoGain.gain.setValueAtTime(0.0, time + vibratoDelay);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.015, time + vibratoDelay + 0.4);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Breath tone / whistle resonance filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.setValueAtTime(8.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0, time);
    // Smooth swell in and out like a real human breath
    gain.gain.linearRampToValueAtTime(0.16, time + 0.12);
    gain.gain.setValueAtTime(0.16, time + Math.max(0.15, duration - 0.25));
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
    lfo.start(time);
    lfo.stop(time + duration + 0.1);
  }

  // Subtle Cowboy Spurs & Brushed Shaker Rhythm
  private playSpurOrShaker(time: number, isAccent: boolean = false) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 3800 : 2600, time);
    filter.Q.setValueAtTime(3.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isAccent ? 0.05 : 0.025, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.08);
  }

  // Schedule a complete bar of music
  private scheduleNextBar() {
    if (!this.isPlaying || !this.ctx) return;

    const track = this.getCurrentTrack();
    let chords: ChordPattern[] = [];
    let melodies: MelodyNote[][] = [];

    if (this.currentTrackId === 'campfire') {
      const data = this.getCampfireSequence();
      chords = data.chords;
      melodies = data.melodies;
    } else if (this.currentTrackId === 'high_noon') {
      const data = this.getHighNoonSequence();
      chords = data.chords;
      melodies = data.melodies;
    } else {
      const data = this.getWaltzSequence();
      chords = data.chords;
      melodies = data.melodies;
    }

    const barIdx = this.currentStep % chords.length;
    const currentChord = chords[barIdx];
    const currentMelody = melodies[barIdx] || [];

    const beatDuration = 60 / track.bpm;
    const beatsPerBar = track.timeSignature === '3/4' ? 3 : 4;
    const barDuration = beatsPerBar * beatDuration;
    const startTime = this.ctx.currentTime + 0.05;

    // 1. Play Upright Bass on Downbeat
    const bassFreq = NOTE_FREQS[currentChord.bass] || 110;
    this.playAcousticBass(bassFreq, startTime);

    // In 4/4 time, play a secondary bass note on beat 3
    if (beatsPerBar === 4) {
      const secondaryBassTime = startTime + beatDuration * 2;
      this.playAcousticBass(bassFreq * 1.5, secondaryBassTime);
    }

    // 2. Play Guitar Fingerpicking Arpeggio
    const numPicks = currentChord.arpeggio.length;
    const pickInterval = barDuration / numPicks;
    for (let p = 0; p < numPicks; p++) {
      const pickNote = currentChord.arpeggio[p];
      const pickFreq = NOTE_FREQS[pickNote];
      if (pickFreq) {
        const pickTime = startTime + p * pickInterval;
        const gain = p % 2 === 0 ? 0.16 : 0.12;
        this.playGuitarPluck(pickFreq, pickTime, gain);
      }
    }

    // 3. Play Lone Whistle / Harmonica Melody Notes for this Bar
    for (const m of currentMelody) {
      const noteFreq = NOTE_FREQS[m.note];
      if (noteFreq) {
        const noteTime = startTime + m.beatOffset * beatDuration;
        const noteDuration = m.durationBeats * beatDuration;
        this.playLoneWhistle(noteFreq, noteTime, noteDuration, m.vibratoDelay || 0.3);
      }
    }

    // 4. Play Cowboy Spurs & Subtle Rhythm Shaker
    for (let b = 0; b < beatsPerBar; b++) {
      const beatTime = startTime + b * beatDuration;
      // Off-beat shaker
      this.playSpurOrShaker(beatTime + beatDuration * 0.5, b === 1 || b === 3);
    }

    // Advance step and schedule next bar slightly before completion
    this.currentStep++;

    // When the track finishes its progression, shuffle seamlessly to another track behind the scenes
    const requiredCycles = track.id === 'prospector_waltz' ? 2 : 1;
    if (this.currentStep >= chords.length * requiredCycles) {
      this.shuffleNextTrack();
    }

    const scheduleDelayMs = Math.max(200, (barDuration - 0.15) * 1000);
    this.loopTimer = window.setTimeout(() => {
      if (this.isPlaying) {
        this.scheduleNextBar();
      }
    }, scheduleDelayMs);
  }
}

export const westernMusic = new WesternMusicEngine();
