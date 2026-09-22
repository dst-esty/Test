import { WeatherType } from '../types';
import { soundEngine } from '../audio/soundEffects';

export type SandstormPhase = 'calm' | 'warning' | 'active' | 'clearing';

export interface WeatherEngineStatus {
  currentWeather: WeatherType;
  phase: SandstormPhase;
  secondsUntilEvent: number;
  sandstormTimeRemaining: number;
  sandstormWarningSeconds: number;
  isSandstorm: boolean;
  thirstMultiplier: number;
}

export type WeatherChangeHandler = (weather: WeatherType) => void;
export type BannerAlertHandler = (message: string) => void;

class DynamicWeatherEngine {
  private currentWeather: WeatherType = 'clear';
  private phase: SandstormPhase = 'calm';
  
  // Timer settings (in seconds)
  // Sandstorms are rare, dramatic wilderness spectacles (every 20 to 30 minutes)
  private timeUntilNextEvent: number = 1200; 
  private warningTimer: number = 0;
  private readonly warningDuration: number = 22; // 22s pre-haboob warning
  private sandstormTimer: number = 0;
  private sandstormDuration: number = 36; // Swift 36s active blinding sandstorm
  private clearingTimer: number = 0;
  private readonly clearingDuration: number = 14;

  private onWeatherChangeCallback?: WeatherChangeHandler;
  private onBannerCallback?: BannerAlertHandler;
  private listeners: Set<(status: WeatherEngineStatus) => void> = new Set();
  private hasWarnedThisEvent: boolean = false;
  private lastParchedCoughTime: number = 0;

  constructor() {
    // Initial delay before first possible sandstorm (~18-25 minutes into expedition)
    this.timeUntilNextEvent = 1100 + Math.random() * 400;
  }

  public setHandlers(handlers: {
    onWeatherChange?: WeatherChangeHandler;
    onBanner?: BannerAlertHandler;
  }) {
    if (handlers.onWeatherChange) this.onWeatherChangeCallback = handlers.onWeatherChange;
    if (handlers.onBanner) this.onBannerCallback = handlers.onBanner;
  }

  public subscribe(listener: (status: WeatherEngineStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus(false));
    return () => this.listeners.delete(listener);
  }

  public notifyListeners(isHunkered: boolean = false) {
    const status = this.getStatus(isHunkered);
    this.listeners.forEach((fn) => fn(status));
  }

  public getStatus(isHunkered: boolean = false): WeatherEngineStatus {
    const isSandstorm = this.currentWeather === 'sandstorm';
    let thirstMultiplier = 1.0;
    if (isSandstorm) {
      thirstMultiplier = isHunkered ? 0.7 : 3.5;
    }

    return {
      currentWeather: this.currentWeather,
      phase: this.phase,
      secondsUntilEvent: Math.max(0, Math.ceil(this.timeUntilNextEvent)),
      sandstormTimeRemaining: Math.max(0, Math.ceil(this.sandstormTimer)),
      sandstormWarningSeconds: Math.max(0, Math.ceil(this.warningTimer)),
      isSandstorm,
      thirstMultiplier,
    };
  }

  /**
   * Called by external weather sync (e.g. from multiplayer or manual weather click)
   */
  public syncWeather(weather: WeatherType) {
    if (this.currentWeather === weather) return;
    this.currentWeather = weather;
    if (weather === 'sandstorm') {
      this.phase = 'active';
      this.sandstormTimer = this.sandstormDuration;
      this.warningTimer = 0;
    } else {
      if (this.phase === 'active' || this.phase === 'warning') {
        this.phase = 'calm';
        this.timeUntilNextEvent = 300 + Math.random() * 180;
      }
    }
    this.notifyListeners();
  }

  /**
   * Instantly summon or trigger a massive Sonoran Haboob (sandstorm)
   */
  public triggerSandstormNow(durationSeconds: number = 75) {
    this.sandstormDuration = durationSeconds;
    this.phase = 'active';
    this.sandstormTimer = durationSeconds;
    this.warningTimer = 0;
    this.currentWeather = 'sandstorm';
    
    soundEngine.playSandstormWarning();
    if (this.onWeatherChangeCallback) {
      this.onWeatherChangeCallback('sandstorm');
    }
    if (this.onBannerCallback) {
      this.onBannerCallback("🌪️ A MASSIVE HABOOB HAS STRUCK! Choking sandstorm parching throat (+250% thirst drain). Press [Q] to HUNKER DOWN or seek cave/tent shelter!");
    }
    this.notifyListeners();
  }

  /**
   * Main per-frame delta update driving the dynamic desert weather cycle
   */
  public update(delta: number, isUnderground: boolean = false, isHunkered: boolean = false): {
    thirstMultiplier: number;
    isInSandstorm: boolean;
  } {
    // Underground cavern/mines are insulated from surface weather transitions
    if (isUnderground) {
      return { thirstMultiplier: 1.0, isInSandstorm: false };
    }

    // Phase 1: Calm / Fair Weather Countdown
    if (this.phase === 'calm') {
      this.timeUntilNextEvent -= delta;
      
      // When 22 seconds remain, enter Warning Phase
      if (this.timeUntilNextEvent <= this.warningDuration && !this.hasWarnedThisEvent) {
        this.hasWarnedThisEvent = true;
        this.phase = 'warning';
        this.warningTimer = this.warningDuration;
        
        soundEngine.playSandstormWarning();
        if (this.onBannerCallback) {
          this.onBannerCallback("🌪️ HABOOB WARNING! A towering wall of Sonoran red sand is sweeping off Weaver's Needle! Seek shelter or prepare to HUNKER DOWN [Q]!");
        }
        this.notifyListeners(isHunkered);
      }
    }
    // Phase 2: Warning Countdown Phase
    else if (this.phase === 'warning') {
      this.warningTimer -= delta;
      if (this.warningTimer <= 0) {
        // Strike of the Sandstorm!
        this.phase = 'active';
        this.sandstormTimer = this.sandstormDuration;
        this.currentWeather = 'sandstorm';
        this.hasWarnedThisEvent = false;

        if (this.onWeatherChangeCallback) {
          this.onWeatherChangeCallback('sandstorm');
        }
        if (this.onBannerCallback) {
          this.onBannerCallback("🌪️ BLINDING SANDSTORM STRIKES! Gale winds & stinging grit. Thirst drain surged to 3.5x! Press [Q] to HUNKER DOWN or find shelter!");
        }
        this.notifyListeners(isHunkered);
      }
    }
    // Phase 3: Active Blinding Sandstorm Phase
    else if (this.phase === 'active') {
      this.sandstormTimer -= delta;

      // Periodic parched throat alert / sound when running upright in sandstorm
      const now = Date.now();
      if (!isHunkered && now - this.lastParchedCoughTime > 18000) {
        this.lastParchedCoughTime = now;
        soundEngine.playThirstCue(0.7);
      }

      if (this.sandstormTimer <= 0) {
        // Sandstorm winds abate, transitioning into clearing phase
        this.phase = 'clearing';
        this.clearingTimer = this.clearingDuration;
        
        // Randomly transition to cooling desert shower or crisp clear skies
        const nextWeather: WeatherType = Math.random() < 0.4 ? 'light_rain' : 'clear';
        this.currentWeather = nextWeather;

        if (this.onWeatherChangeCallback) {
          this.onWeatherChangeCallback(nextWeather);
        }
        if (this.onBannerCallback) {
          const detail = nextWeather === 'light_rain' 
            ? "🌧️ The Haboob breaks! A cooling desert rain shower sweeps over the Superstitions."
            : "🌅 The Haboob has broken. Gale winds settle and the desert sky clears.";
          this.onBannerCallback(detail);
        }
        this.notifyListeners(isHunkered);
      }
    }
    // Phase 4: Clearing Phase
    else if (this.phase === 'clearing') {
      this.clearingTimer -= delta;
      if (this.clearingTimer <= 0) {
        this.phase = 'calm';
        // Next sandstorm between 1200s and 1800s (20 to 30 minutes)
        this.timeUntilNextEvent = 1200 + Math.random() * 600;
        this.hasWarnedThisEvent = false;
        this.notifyListeners(isHunkered);
      }
    }

    const isSandstorm = this.currentWeather === 'sandstorm';
    let thirstMultiplier = 1.0;
    if (isSandstorm) {
      // Hunker down reduces sandstorm thirst penalty by 80% (from 3.5x down to 0.7x)
      thirstMultiplier = isHunkered ? 0.7 : 3.5;
    }

    return {
      thirstMultiplier,
      isInSandstorm: isSandstorm,
    };
  }
}

export const dynamicWeatherEngine = new DynamicWeatherEngine();
