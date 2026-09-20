/**
 * Procedural Ghostly Frontier Homage Synthesizer
 *
 * Designed specifically as a very rare, ghostly acoustic tribute at Dawn and Dusk:
 * - Haunting solo nylon-string acoustic fingerpicking arpeggios
 * - Ethereal, lone whistler melody echoing like a phantom through the Superstition canyons
 * - No continuous background music, no drums, no spurs
 * - Triggers solely as a rare homage once during the golden twilight of dawn and dusk,
 *   plays a single poignant 8-bar tribute, then softly fades away into the mountain breeze.
 */

export type WesternTrackId = 'ghostly_homage' | 'campfire' | 'high_noon' | 'prospector_waltz';

export interface WesternTrackInfo {
  id: WesternTrackId;
  title: string;
  subtitle: string;
  bpm: number;
  timeSignature: '4/4' | '3/4';
}

export const WESTERN_TRACKS: WesternTrackInfo[] = [
  {
    id: 'ghostly_homage',
    title: 'Ghostly Tribute of the Superstitions',
    subtitle: 'Rare Dawn & Dusk Homage • Ethereal Nylon Guitar & Phantom Whistler',
    bpm: 64,
    timeSignature: '4/4',
  },
  {
    id: 'campfire',
    title: 'Superstition Campfire (Homage)',
    subtitle: 'Acoustic Fingerpicking & Lone Whistler',
    bpm: 68,
    timeSignature: '4/4',
  },
  {
    id: 'high_noon',
    title: 'High Noon Standoff (Homage)',
    subtitle: 'Spanish Minor Arpeggios & Harmonica',
    bpm: 64,
    timeSignature: '4/4',
  },
  {
    id: 'prospector_waltz',
    title: 'Prospector’s Frontier Waltz (Homage)',
    subtitle: 'Gentle 3/4 Acoustic Trail Ballad',
    bpm: 72,
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
  'D#4': 311.13,
  E4: 329.63,
  F4: 349.23,
  'F#4': 369.99,
  G4: 392.0,
  'G#4': 415.3,
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

// Gentle, ghostly atmospheric volume
const GHOSTLY_TRIBUTE_VOLUME = 0.10;

class WesternMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = GHOSTLY_TRIBUTE_VOLUME;
  private currentTrackId: WesternTrackId = 'ghostly_homage';
  private loopTimer: number | null = null;
  private currentStep: number = 0;
  private totalStepsInTribute: number = 8; // Exactly 8 bars for a single poignant homage
  private listeners: Array<() => void> = [];

  // Diurnal rare tribute state tracking
  private diurnalTime: number = 12;
  private inDiurnalWindow: boolean = false;
  private diurnalPhaseName: 'dawn' | 'dusk' | 'none' = 'none';
  private lastTributePhaseTriggered: 'dawn' | 'dusk' | 'none' = 'none';

  constructor() {
    this.currentTrackId = 'ghostly_homage';
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isPlaying && !this.isMuted ? this.volume : 0,
        this.ctx.currentTime
      );
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
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
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        // ignore listener errors
      }
    });
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

  public getDiurnalStatus(): { inWindow: boolean; phase: 'dawn' | 'dusk' | 'none'; timeOfDay: number } {
    return {
      inWindow: this.inDiurnalWindow,
      phase: this.diurnalPhaseName,
      timeOfDay: this.diurnalTime,
    };
  }

  public getCurrentTrack(): WesternTrackInfo {
    return (
      WESTERN_TRACKS.find((t) => t.id === this.currentTrackId) || WESTERN_TRACKS[0]
    );
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      const targetGain = this.isPlaying && !this.isMuted ? this.volume : 0;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isPlaying && !this.isMuted ? this.volume : 0;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
    }
    this.notify();
    return this.isMuted;
  }

  public unmute(): void {
    if (this.isMuted) {
      this.isMuted = false;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.isPlaying ? this.volume : 0, this.ctx.currentTime, 0.15);
      }
      this.notify();
    }
  }

  public mute(): void {
    if (!this.isMuted) {
      this.isMuted = true;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      }
      this.notify();
    }
  }

  /**
   * Called continuously by diurnal time ticker in game.
   * Handles rare ghostly homage tributes strictly at dawn (5:45 - 6:30) and dusk (18:15 - 19:00).
   * It plays a single poignant homage phrase (8 bars), then automatically concludes and silences.
   */
  public updateDiurnalTime(timeOfDay: number) {
    this.diurnalTime = timeOfDay;

    // Dawn golden window: 5.7 to 6.3 (approx 5:42 AM to 6:18 AM sunrise)
    const isDawn = timeOfDay >= 5.7 && timeOfDay <= 6.3;
    // Dusk twilight window: 18.2 to 18.8 (approx 6:12 PM to 6:48 PM sunset)
    const isDusk = timeOfDay >= 18.2 && timeOfDay <= 18.8;
    const inWindow = isDawn || isDusk;
    const currentPhase: 'dawn' | 'dusk' | 'none' = isDawn ? 'dawn' : isDusk ? 'dusk' : 'none';

    this.inDiurnalWindow = inWindow;
    this.diurnalPhaseName = currentPhase;

    // Reset the triggered state once outside dawn and dusk
    if (!inWindow) {
      if (this.lastTributePhaseTriggered !== 'none') {
        this.lastTributePhaseTriggered = 'none';
      }
      // If currently playing outside the window, smoothly fade out
      if (this.isPlaying) {
        this.fadeOutAndStop(2.0);
      }
      return;
    }

    // Trigger the rare tribute ONCE per dawn or dusk transition
    if (currentPhase !== 'none' && this.lastTributePhaseTriggered !== currentPhase && !this.isPlaying) {
      this.lastTributePhaseTriggered = currentPhase;
      this.playGhostlyHomage();
    }
  }

  /**
   * Plays a single, ethereal, haunting 8-bar tribute homage.
   * Does NOT loop; fades gently to silence upon completion.
   */
  public playGhostlyHomage() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (this.loopTimer) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    this.isPlaying = true;
    this.currentStep = 0;
    this.currentTrackId = 'ghostly_homage';

    // Gentle 1.5s fade-in of the master gain
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(
      this.isMuted ? 0 : this.volume,
      this.ctx.currentTime + 1.5
    );

    this.scheduleNextBar();
    this.notify();
  }

  public play() {
    // Treat explicit play requests as triggering the single homage phrase
    this.playGhostlyHomage();
  }

  public stop() {
    this.isPlaying = false;
    if (this.loopTimer) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.notify();
  }

  private fadeOutAndStop(fadeDurationSec: number = 2.0) {
    if (!this.isPlaying) return;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeDurationSec);
    }
    if (this.loopTimer) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    window.setTimeout(() => {
      this.stop();
    }, fadeDurationSec * 1000);
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.playGhostlyHomage();
    }
  }

  // ==========================================
  // Ghostly Tribute Musical Sequences
  // ==========================================

  // Ethereal Minor Homage: Am - Em - Fmaj7 - Em - Dm - Am - E7 - Am
  private getGhostlyHomageSequence(): { chords: ChordPattern[]; melodies: MelodyNote[][] } {
    const chords: ChordPattern[] = [
      // Bar 1: Am ethereal fingerpicking
      { bass: 'A2', arpeggio: ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'E4', 'A3'] },
      // Bar 2: Em echoing in canyon
      { bass: 'E2', arpeggio: ['G3', 'B3', 'E4', 'G4', 'E4', 'B3', 'E4', 'G3'] },
      // Bar 3: Fmaj7 melancholic twilight
      { bass: 'F2', arpeggio: ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'E4', 'A3'] },
      // Bar 4: Em resolving softly
      { bass: 'E2', arpeggio: ['G3', 'B3', 'E4', 'G4', 'E4', 'B3', 'E4', 'G3'] },
      // Bar 5: Dm gentle yearning
      { bass: 'D3', arpeggio: ['A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A3'] },
      // Bar 6: Am sorrowful memory
      { bass: 'A2', arpeggio: ['E3', 'A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'E3'] },
      // Bar 7: E7 twilight resolution
      { bass: 'E2', arpeggio: ['G#4', 'B3', 'D4', 'E4', 'D4', 'B3', 'D4', 'G#4'] },
      // Bar 8: Am final fade into the canyon breeze
      { bass: 'A2', arpeggio: ['A3', 'C4', 'E4', 'A4'] },
    ];

    const melodies: MelodyNote[][] = [
      // Bar 1: Phantom whistle floats in on beat 2
      [
        { note: 'E5', beatOffset: 1.5, durationBeats: 1.8, vibratoDelay: 0.4 },
      ],
      // Bar 2:
      [
        { note: 'G5', beatOffset: 0.5, durationBeats: 2.2, vibratoDelay: 0.5 },
      ],
      // Bar 3:
      [
        { note: 'A5', beatOffset: 0.5, durationBeats: 1.8, vibratoDelay: 0.4 },
        { note: 'E5', beatOffset: 2.8, durationBeats: 1.0, vibratoDelay: 0.3 },
      ],
      // Bar 4:
      [
        { note: 'B4', beatOffset: 0.5, durationBeats: 2.8, vibratoDelay: 0.6 },
      ],
      // Bar 5:
      [
        { note: 'D5', beatOffset: 0.5, durationBeats: 2.0, vibratoDelay: 0.4 },
      ],
      // Bar 6:
      [
        { note: 'C5', beatOffset: 0.5, durationBeats: 1.6, vibratoDelay: 0.3 },
        { note: 'B4', beatOffset: 2.5, durationBeats: 1.2, vibratoDelay: 0.3 },
      ],
      // Bar 7:
      [
        { note: 'B4', beatOffset: 0.5, durationBeats: 2.4, vibratoDelay: 0.5 },
      ],
      // Bar 8: Final lone ghostly note fading into mountain silence
      [
        { note: 'A4', beatOffset: 0.2, durationBeats: 3.6, vibratoDelay: 0.6 },
      ],
    ];

    return { chords, melodies };
  }

  // ==========================================
  // Ethereal Ghostly Sound Synthesis
  // ==========================================

  // Haunting solo acoustic nylon guitar pluck
  private playGuitarPluck(freq: number, time: number, gainVal: number = 0.12) {
    if (!this.ctx || !this.masterGain) return;

    // Body resonance filter
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(freq * 1.4, time);
    bodyFilter.Q.setValueAtTime(3.5, time);

    // Warm highpass to eliminate rumble
    const lowFilter = this.ctx.createBiquadFilter();
    lowFilter.type = 'highpass';
    lowFilter.frequency.setValueAtTime(80, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    // Soft, long acoustic decay
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.0, time);
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.04, time);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    osc2.connect(osc2Gain);
    osc2Gain.connect(bodyFilter);

    osc1.connect(bodyFilter);
    bodyFilter.connect(lowFilter);
    lowFilter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc1.stop(time + 1.3);
    osc2.start(time);
    osc2.stop(time + 0.6);
  }

  // Phantom Whistler / Ghostly Wind Melody
  private playLoneWhistle(
    freq: number,
    time: number,
    duration: number,
    vibratoDelay: number = 0.4
  ) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    // Gentle natural portamento slide up to note
    osc.frequency.setValueAtTime(freq * 0.985, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.12);

    // Gentle, expressive vibrato LFO (5.0 Hz)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.0, time);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.0, time);
    lfoGain.gain.setValueAtTime(0.0, time + vibratoDelay);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.012, time + vibratoDelay + 0.5);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Ethereal bandpass filter simulating distance and canyon air
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.setValueAtTime(6.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0, time);
    // Smooth swell in and slow fade out like a ghostly breath
    gain.gain.linearRampToValueAtTime(0.12, time + 0.25);
    gain.gain.setValueAtTime(0.12, time + Math.max(0.2, duration - 0.4));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.2);
    lfo.start(time);
    lfo.stop(time + duration + 0.2);
  }

  // Schedule next bar of the 8-bar ghostly homage
  private scheduleNextBar() {
    if (!this.isPlaying || !this.ctx) return;

    const track = this.getCurrentTrack();
    const data = this.getGhostlyHomageSequence();
    const chords = data.chords;
    const melodies = data.melodies;

    // Check if we reached the end of the 8-bar homage tribute
    if (this.currentStep >= this.totalStepsInTribute) {
      // Single tribute has completed! Smoothly fade out and stop until the next dawn/dusk
      this.fadeOutAndStop(2.5);
      return;
    }

    const barIdx = this.currentStep % chords.length;
    const currentChord = chords[barIdx];
    const currentMelody = melodies[barIdx] || [];

    const beatDuration = 60 / track.bpm;
    const beatsPerBar = 4;
    const barDuration = beatsPerBar * beatDuration;
    const startTime = this.ctx.currentTime + 0.05;

    // 1. Subtle acoustic bass note on root
    const bassFreq = NOTE_FREQS[currentChord.bass] || 110;
    this.playGuitarPluck(bassFreq, startTime, 0.14);

    // 2. Ethereal nylon guitar fingerpicking arpeggio
    const numPicks = currentChord.arpeggio.length;
    const pickInterval = barDuration / numPicks;
    for (let p = 0; p < numPicks; p++) {
      const pickNote = currentChord.arpeggio[p];
      const pickFreq = NOTE_FREQS[pickNote];
      if (pickFreq) {
        const pickTime = startTime + p * pickInterval;
        const gain = p === 0 ? 0.12 : 0.09;
        this.playGuitarPluck(pickFreq, pickTime, gain);
      }
    }

    // 3. Phantom Whistler Melody note
    for (const m of currentMelody) {
      const noteFreq = NOTE_FREQS[m.note];
      if (noteFreq) {
        const noteTime = startTime + m.beatOffset * beatDuration;
        const noteDuration = m.durationBeats * beatDuration;
        this.playLoneWhistle(noteFreq, noteTime, noteDuration, m.vibratoDelay || 0.4);
      }
    }

    // Step counter
    this.currentStep++;

    const scheduleDelayMs = Math.max(200, (barDuration - 0.12) * 1000);
    this.loopTimer = window.setTimeout(() => {
      if (this.isPlaying) {
        this.scheduleNextBar();
      }
    }, scheduleDelayMs);
  }
}

export const westernMusic = new WesternMusicEngine();
