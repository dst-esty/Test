// Frontier Townfolk Voice & Dialogue Audio Engine
// Combines server-side Gemini 3.1 TTS audio (24kHz PCM) with instant Web Speech API fallback

export interface NPCVoiceProfile {
  characterId: string;
  name: string;
  role: string;
  geminiVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  webSpeech: {
    pitch: number;
    rate: number;
    gender: 'male' | 'female';
  };
}

export const NPC_VOICE_PROFILES: Record<string, NPCVoiceProfile> = {
  old_dusty_pete: {
    characterId: 'old_dusty_pete',
    name: 'Old Dusty Pete',
    role: 'Veteran Gold Prospector',
    geminiVoice: 'Charon',
    webSpeech: { pitch: 0.76, rate: 0.86, gender: 'male' },
  },
  barkeep_hank: {
    characterId: 'barkeep_hank',
    name: 'Hank "Dutch" Miller',
    role: 'Superstition Saloon Keeper',
    geminiVoice: 'Puck',
    webSpeech: { pitch: 1.02, rate: 0.98, gender: 'male' },
  },
  hostler_silas: {
    characterId: 'hostler_silas',
    name: 'Silas "Red" McCurdy',
    role: 'Master Hostler & Wrangler',
    geminiVoice: 'Puck',
    webSpeech: { pitch: 0.94, rate: 0.95, gender: 'male' },
  },
  sheriff_wyatt: {
    characterId: 'sheriff_wyatt',
    name: 'Sheriff Wyatt Vance',
    role: 'Territorial Lawman',
    geminiVoice: 'Fenrir',
    webSpeech: { pitch: 0.82, rate: 0.9, gender: 'male' },
  },
  assayer_walker: {
    characterId: 'assayer_walker',
    name: 'Judge Hiram Walker',
    role: 'U.S. Mineral Assayer',
    geminiVoice: 'Charon',
    webSpeech: { pitch: 0.88, rate: 0.92, gender: 'male' },
  },
  stage_jedediah: {
    characterId: 'stage_jedediah',
    name: 'Jedediah "Whip" Cole',
    role: 'Concord Stagecoach Driver',
    geminiVoice: 'Fenrir',
    webSpeech: { pitch: 0.85, rate: 1.02, gender: 'male' },
  },
  clara_miller: {
    characterId: 'clara_miller',
    name: 'Clara Miller',
    role: 'Frontier Homesteader',
    geminiVoice: 'Kore',
    webSpeech: { pitch: 1.16, rate: 0.94, gender: 'female' },
  },
  gus_blacksmith: {
    characterId: 'gus_blacksmith',
    name: 'Gus Trombley',
    role: 'Town Blacksmith & Farrier',
    geminiVoice: 'Charon',
    webSpeech: { pitch: 0.72, rate: 0.88, gender: 'male' },
  },
};

class TownfolkVoiceService {
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentlySpeakingId: string | null = null;
  private pcmCache = new Map<string, string>(); // key -> base64 PCM
  private voiceEnabled: boolean = true;
  private onSpeakingChangeCallbacks = new Set<(speakingId: string | null, text: string | null) => void>();
  private currentSpokenText: string | null = null;

  constructor() {
    // Warm up Web Speech voices when available
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
          try {
            window.speechSynthesis.getVoices();
          } catch {}
        };
      }
    } catch {}
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public subscribeSpeakingChange(cb: (speakingId: string | null, text: string | null) => void) {
    this.onSpeakingChangeCallbacks.add(cb);
    return () => this.onSpeakingChangeCallbacks.delete(cb);
  }

  private notifySpeaking(speakingId: string | null, text: string | null) {
    this.currentlySpeakingId = speakingId;
    this.currentSpokenText = text;
    for (const cb of this.onSpeakingChangeCallbacks) {
      cb(speakingId, text);
    }
  }

  public getCurrentlySpeakingId(): string | null {
    return this.currentlySpeakingId;
  }

  public getCurrentSpokenText(): string | null {
    return this.currentSpokenText;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.notifySpeaking(null, null);
  }

  /**
   * Decodes 16-bit little-endian 24kHz PCM from Gemini TTS into AudioBuffer and plays it.
   */
  private playPcmAudio(base64Data: string, sampleRate = 24000): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const numSamples = Math.floor(bytes.length / 2);
        const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const float32 = new Float32Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
          const sample = dataView.getInt16(i * 2, true);
          float32[i] = sample / 32768.0;
        }

        const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
        audioBuffer.copyToChannel(float32, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Subtle vintage warmth filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 7500;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.15;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        this.currentSource = source;

        source.onended = () => {
          if (this.currentSource === source) {
            this.currentSource = null;
          }
          resolve();
        };

        source.start();
      } catch (err) {
        console.warn('[TownfolkVoice] PCM playback error:', err);
        resolve();
      }
    });
  }

  /**
   * Browser SpeechSynthesis fallback with customized character pitch and rate
   */
  private playWebSpeech(text: string, profile: NPCVoiceProfile): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        // Mock timer fallback if speech synthesis not present
        const estDuration = Math.max(1500, text.length * 55);
        setTimeout(resolve, estDuration);
        return;
      }

      window.speechSynthesis.cancel();

      // Clean dialogue text for cleaner pronunciation
      const cleaned = text
        .replace(/\[.*?\]/g, '')
        .replace(/["“”]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.pitch = profile.webSpeech.pitch;
      utterance.rate = profile.webSpeech.rate;

      const voices = window.speechSynthesis.getVoices();
      const engVoices = voices.filter((v) => v.lang.startsWith('en'));

      if (engVoices.length > 0) {
        if (profile.webSpeech.gender === 'female') {
          const female = engVoices.find((v) => /female|zira|samantha|victoria|karen|susan/i.test(v.name));
          if (female) utterance.voice = female;
          else utterance.voice = engVoices[0];
        } else {
          const male = engVoices.find((v) => /male|david|george|daniel|richard|james|alex/i.test(v.name));
          if (male) utterance.voice = male;
          else utterance.voice = engVoices[0];
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Plays spoken dialogue for a given character.
   * Tries Gemini 3.1 TTS via server; falls back gracefully to Web Speech API.
   */
  public async speak(
    characterId: string,
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!this.voiceEnabled) {
      if (onStart) onStart();
      if (onEnd) onEnd();
      return;
    }

    this.stop();
    const profile = NPC_VOICE_PROFILES[characterId] || {
      characterId,
      name: 'Frontier Townsperson',
      role: 'Townsperson',
      geminiVoice: 'Puck',
      webSpeech: { pitch: 1.0, rate: 0.95, gender: 'male' },
    };

    this.notifySpeaking(characterId, text);
    if (onStart) onStart();

    const cacheKey = `${characterId}:${text}`;
    let pcmBase64 = this.pcmCache.get(cacheKey);

    // 1. Try cached server audio
    if (pcmBase64) {
      await this.playPcmAudio(pcmBase64);
      this.notifySpeaking(null, null);
      if (onEnd) onEnd();
      return;
    }

    // 2. Request Gemini TTS from server
    try {
      const res = await fetch('/api/townfolk/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          characterId,
          voiceName: profile.geminiVoice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' && data.audioPcmBase64) {
          this.pcmCache.set(cacheKey, data.audioPcmBase64);
          await this.playPcmAudio(data.audioPcmBase64, data.sampleRate || 24000);
          this.notifySpeaking(null, null);
          if (onEnd) onEnd();
          return;
        }
      }
    } catch (err) {
      console.warn('[TownfolkVoice] Server TTS call failed, using WebSpeech:', err);
    }

    // 3. Fallback: Instant Web Speech API
    await this.playWebSpeech(text, profile);
    this.notifySpeaking(null, null);
    if (onEnd) onEnd();
  }

  /**
   * Ask the NPC a custom question or select a topic chip.
   * Calls Gemini chat on the server, receives an in-character answer + voice audio!
   */
  public async askQuestion(
    characterId: string,
    arg1: string,
    arg2?: string,
    arg3?: string
  ): Promise<{ reply: string; hasAudio: boolean }> {
    const profile = NPC_VOICE_PROFILES[characterId];
    let characterName = profile?.name || 'Townfolk';
    let role = profile?.role || 'Settler';
    let question = arg1;

    if (arg2 && arg3) {
      // 4 argument form: (characterId, characterName, role, question)
      characterName = arg1;
      role = arg2;
      question = arg3;
    }

    try {
      const res = await fetch('/api/townfolk/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          characterName,
          characterRole: role,
          userQuestion: question,
          voiceName: profile?.geminiVoice || 'Puck',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          if (data.audioPcmBase64) {
            const cacheKey = `${characterId}:${data.reply}`;
            this.pcmCache.set(cacheKey, data.audioPcmBase64);
            // Play audio directly
            this.notifySpeaking(characterId, data.reply);
            this.playPcmAudio(data.audioPcmBase64, data.sampleRate || 24000).then(() => {
              this.notifySpeaking(null, null);
            });
            return { reply: data.reply, hasAudio: true };
          } else {
            // Speak reply with WebSpeech
            this.speak(characterId, data.reply);
            return { reply: data.reply, hasAudio: false };
          }
        }
      }
    } catch (err) {
      console.warn('[TownfolkVoice] Server chat request failed:', err);
    }

    // Fallback response if network or server unavailable
    const fallbackReply = `That's a keen question, pardner! Out here in the Superstitions, a miner's best friends are sharp eyes, a sturdy pick, and plenty of fresh spring water. Mind the heat and watch the canyon walls.`;
    this.speak(characterId, fallbackReply);
    return { reply: fallbackReply, hasAudio: false };
  }
}

export const townfolkVoice = new TownfolkVoiceService();
