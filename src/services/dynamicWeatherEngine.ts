import { WeatherType, SeasonType } from '../types';
import { soundEngine } from '../audio/soundEffects';
import { seasonService } from './seasonService';

export type SandstormPhase = 'calm' | 'warning' | 'active' | 'clearing';

export type SeasonalEventType =
  | 'none'
  | 'summer_haboob' // Convective Haboob sandstorm with towering red dust wall
  | 'summer_monsoon_storm' // Severe monsoon thunderstorm with heavy lightning & arroyo flash floods
  | 'winter_frost_gale' // Sub-zero arctic front off Four Peaks plunging temperatures into freezing frost
  | 'winter_mountain_sleet' // Freezing mountain drizzle/sleet with dense frozen mountain fog
  | 'spring_superbloom_shower' // Refreshing rainbow sun shower over blossoming poppies (+hydration/vigour)
  | 'spring_pollen_zephyr' // Warm desert breeze lifting golden poppy and brittlebush pollen
  | 'autumn_santa_ana_gale' // Whistling dry canyon downdraft whipping golden dust devils
  | 'autumn_harvest_twilight'; // Crisp golden twilight with long mountain shadows and infinite clarity

export interface WeatherEngineStatus {
  currentWeather: WeatherType;
  phase: SandstormPhase;
  activeSeasonalEvent: SeasonalEventType;
  seasonalEventLabel: string;
  secondsUntilEvent: number;
  sandstormTimeRemaining: number;
  sandstormWarningSeconds: number;
  seasonalTimeRemaining: number;
  isSandstorm: boolean;
  thirstMultiplier: number;
  tempOffsetF: number;
}

export type WeatherChangeHandler = (weather: WeatherType) => void;
export type BannerAlertHandler = (message: string) => void;

class DynamicWeatherEngine {
  private currentWeather: WeatherType = 'clear';
  private phase: SandstormPhase = 'calm';
  private activeSeasonalEvent: SeasonalEventType = 'none';
  private seasonalTempOffsetF: number = 0;

  // Timer settings (in seconds)
  private timeUntilNextEvent: number = 600;
  private warningTimer: number = 0;
  private readonly warningDuration: number = 20;
  private eventDurationTimer: number = 0;
  private activeEventDuration: number = 40;
  private clearingTimer: number = 0;
  private readonly clearingDuration: number = 12;

  private onWeatherChangeCallback?: WeatherChangeHandler;
  private onBannerCallback?: BannerAlertHandler;
  private listeners: Set<(status: WeatherEngineStatus) => void> = new Set();
  private hasWarnedThisEvent: boolean = false;
  private lastParchedCoughTime: number = 0;

  constructor() {
    // Initial delay before first dynamic seasonal event (~6-10 minutes into expedition)
    this.timeUntilNextEvent = 380 + Math.random() * 240;
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
    return () => this.listeners.delete(listener);
  }

  public notifyListeners(isHunkered: boolean = false) {
    const status = this.getStatus(isHunkered);
    queueMicrotask(() => {
      this.listeners.forEach((fn) => {
        try {
          fn(status);
        } catch (err) {
          console.error('Error notifying dynamic weather listener:', err);
        }
      });
    });
  }

  public getCurrentSeasonalEvent(): SeasonalEventType {
    return this.activeSeasonalEvent;
  }

  public getSeasonalTempOffset(): number {
    return this.seasonalTempOffsetF;
  }

  public getSeasonalEventLabel(): string {
    switch (this.activeSeasonalEvent) {
      case 'summer_haboob':
        return 'Convective Haboob Sandstorm';
      case 'summer_monsoon_storm':
        return 'Arizona Monsoon Cloudburst';
      case 'winter_frost_gale':
        return 'Freezing Mesa Frost Gale';
      case 'winter_mountain_sleet':
        return 'Mountain Sleet & Freezing Mist';
      case 'spring_superbloom_shower':
        return 'Superbloom Rainbow Shower';
      case 'spring_pollen_zephyr':
        return 'Floral Pollen Zephyr';
      case 'autumn_santa_ana_gale':
        return 'Santa Ana Canyon Gale';
      case 'autumn_harvest_twilight':
        return 'Indian Summer Twilight';
      case 'none':
      default:
        return 'Fair Frontier Weather';
    }
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
      activeSeasonalEvent: this.activeSeasonalEvent,
      seasonalEventLabel: this.getSeasonalEventLabel(),
      secondsUntilEvent: Math.max(0, Math.ceil(this.timeUntilNextEvent)),
      sandstormTimeRemaining: Math.max(0, Math.ceil(this.eventDurationTimer)),
      sandstormWarningSeconds: Math.max(0, Math.ceil(this.warningTimer)),
      seasonalTimeRemaining: Math.max(0, Math.ceil(this.eventDurationTimer)),
      isSandstorm,
      thirstMultiplier,
      tempOffsetF: this.seasonalTempOffsetF,
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
      this.activeSeasonalEvent = 'summer_haboob';
      this.eventDurationTimer = 45;
      this.warningTimer = 0;
    } else {
      if (this.phase === 'active' || this.phase === 'warning') {
        this.phase = 'calm';
        this.activeSeasonalEvent = 'none';
        this.seasonalTempOffsetF = 0;
        this.timeUntilNextEvent = 300 + Math.random() * 180;
      }
    }
    this.notifyListeners();
  }

  /**
   * Instantly trigger or cycle a seasonal weather event tailored to the active season.
   */
  public triggerSeasonalEvent(specificEvent?: SeasonalEventType, customDuration: number = 48) {
    const season = seasonService.getSeason();
    let eventToTrigger: SeasonalEventType = specificEvent || 'none';

    if (!specificEvent || specificEvent === 'none') {
      // Pick appropriate event for season
      if (season === 'summer') {
        eventToTrigger = Math.random() < 0.5 ? 'summer_haboob' : 'summer_monsoon_storm';
      } else if (season === 'winter') {
        eventToTrigger = Math.random() < 0.55 ? 'winter_frost_gale' : 'winter_mountain_sleet';
      } else if (season === 'spring') {
        eventToTrigger = Math.random() < 0.5 ? 'spring_superbloom_shower' : 'spring_pollen_zephyr';
      } else {
        eventToTrigger = Math.random() < 0.5 ? 'autumn_santa_ana_gale' : 'autumn_harvest_twilight';
      }
    }

    this.activeSeasonalEvent = eventToTrigger;
    this.activeEventDuration = customDuration;
    this.eventDurationTimer = customDuration;
    this.phase = 'active';
    this.warningTimer = 0;

    let targetWeather: WeatherType = 'clear';
    let bannerMsg = '';

    switch (eventToTrigger) {
      case 'summer_haboob':
        targetWeather = 'sandstorm';
        this.seasonalTempOffsetF = 6;
        soundEngine.playSandstormWarning();
        bannerMsg = "🌪️ CONVECTIVE HABOOB STRIKES! Towering 3,000-ft red dust wall rolls off Weaver's Needle! Stinging grit surges thirst to 3.5x. Press [Q] to HUNKER DOWN or find cave/tent shelter!";
        break;

      case 'summer_monsoon_storm':
        targetWeather = 'storm';
        this.seasonalTempOffsetF = -14;
        soundEngine.playThunderRumble();
        bannerMsg = "⛈️ ARIZONA MONSOON CLOUDBURST! Violent mountain thunderstorm strikes the Superstitions with lightning, mountain thunder, and arroyo flash floods!";
        break;

      case 'winter_frost_gale':
        targetWeather = 'clear';
        this.seasonalTempOffsetF = -18;
        soundEngine.playWindGust();
        bannerMsg = "❄️ FREEZING MESA FROST GALE! Sub-zero arctic front sweeps off Four Peaks! Ambient temperature plunged by 18°F into freezing chill. Seek campfire warmth or saloon lodging to stave off hypothermia!";
        break;

      case 'winter_mountain_sleet':
        targetWeather = 'light_rain';
        this.seasonalTempOffsetF = -16;
        soundEngine.playWindGust();
        bannerMsg = "🌨️ FREEZING MOUNTAIN SLEET! Icy sleet flurries & dense frozen mist drape the Superstition crags. Light a campfire to fend off hypothermia!";
        break;

      case 'spring_superbloom_shower':
        targetWeather = 'light_rain';
        this.seasonalTempOffsetF = -4;
        soundEngine.playGentleSpringRain();
        bannerMsg = "🌸 SUPERBLOOM RAINBOW SHOWER! Gentle sun shower blankets blooming poppies & brittlebush. Petrichor fills the canyon air, refreshing hydration and vigour (+15% boost)!";
        break;

      case 'spring_pollen_zephyr':
        targetWeather = 'clear';
        this.seasonalTempOffsetF = 2;
        soundEngine.playWindGust();
        bannerMsg = "🌼 FLORAL ZEPHYR: Warm desert zephyrs carry golden poppy petals and saguaro blossom pollen across the canyons. Ideal prospecting conditions!";
        break;

      case 'autumn_santa_ana_gale':
        targetWeather = 'sandstorm';
        this.seasonalTempOffsetF = -2;
        soundEngine.playWindGust();
        bannerMsg = "🍂 SANTA ANA CANYON GALE: Whistling dry autumnal winds rush through Peralta Canyon, whipping golden dust devils across the dry arroyos!";
        break;

      case 'autumn_harvest_twilight':
        targetWeather = 'sunset';
        this.seasonalTempOffsetF = -6;
        soundEngine.playWindGust();
        bannerMsg = "🌅 INDIAN SUMMER TWILIGHT: Rich golden twilight casts half-mile shadows from Weaver's Needle. Crisp canyon air invigorates prospecting stamina!";
        break;
    }

    this.currentWeather = targetWeather;
    if (this.onWeatherChangeCallback) {
      this.onWeatherChangeCallback(targetWeather);
    }
    if (this.onBannerCallback && bannerMsg) {
      this.onBannerCallback(bannerMsg);
    }
    this.notifyListeners();
  }

  /**
   * Backward compatibility for Haboob trigger
   */
  public triggerSandstormNow(durationSeconds: number = 55) {
    this.triggerSeasonalEvent('summer_haboob', durationSeconds);
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

    const activeSeason = seasonService.getSeason();

    // Phase 1: Calm / Fair Weather Countdown
    if (this.phase === 'calm') {
      this.timeUntilNextEvent -= delta;

      // When 20 seconds remain, enter Warning Phase for severe events
      if (this.timeUntilNextEvent <= this.warningDuration && !this.hasWarnedThisEvent) {
        this.hasWarnedThisEvent = true;
        this.phase = 'warning';
        this.warningTimer = this.warningDuration;

        let warnMsg = '';
        if (activeSeason === 'summer') {
          soundEngine.playSandstormWarning();
          warnMsg = "🌪️ HABOOB WARNING! A towering wall of Sonoran red sand is sweeping off Weaver's Needle! Seek shelter or prepare to HUNKER DOWN [Q]!";
        } else if (activeSeason === 'winter') {
          soundEngine.playWindGust();
          warnMsg = "❄️ COLD FRONT WARNING! Biting arctic winds descend from Four Peaks. Temperatures are about to plunge below freezing!";
        } else if (activeSeason === 'spring') {
          soundEngine.playGentleSpringRain();
          warnMsg = "🌸 SPRING SHOWER APPROACHING: Warm clouds gather over Peters Mesa, bringing refreshing mountain rain to blossoming desert flora.";
        } else {
          soundEngine.playWindGust();
          warnMsg = "🍂 GALE ADVISORY: Autumnal downdrafts whipping up through Peralta Canyon with dry golden gusts.";
        }

        if (this.onBannerCallback && warnMsg) {
          this.onBannerCallback(warnMsg);
        }
        this.notifyListeners(isHunkered);
      }
    }
    // Phase 2: Warning Countdown Phase
    else if (this.phase === 'warning') {
      this.warningTimer -= delta;
      if (this.warningTimer <= 0) {
        // Strike of the seasonal event!
        this.triggerSeasonalEvent(undefined, 42);
        this.hasWarnedThisEvent = false;
        this.notifyListeners(isHunkered);
      }
    }
    // Phase 3: Active Seasonal Weather Phase
    else if (this.phase === 'active') {
      this.eventDurationTimer -= delta;

      // Periodic parched throat alert when exposed upright in sandstorm
      const isSandstorm = this.currentWeather === 'sandstorm';
      const now = Date.now();
      if (isSandstorm && !isHunkered && now - this.lastParchedCoughTime > 18000) {
        this.lastParchedCoughTime = now;
        soundEngine.playThirstCue(0.7);
      }

      if (this.eventDurationTimer <= 0) {
        // Event abates, transitioning into clearing phase
        this.phase = 'clearing';
        this.clearingTimer = this.clearingDuration;
        this.seasonalTempOffsetF = 0;

        // Transition back to fair seasonal weather
        let nextWeather: WeatherType = 'clear';
        let clearMsg = '';

        if (activeSeason === 'summer') {
          nextWeather = Math.random() < 0.4 ? 'light_rain' : 'clear';
          clearMsg = nextWeather === 'light_rain'
            ? "🌧️ The Haboob breaks! A cooling desert rain shower sweeps over the Superstitions."
            : "🌅 The summer storm breaks. Gale winds settle and the desert sky clears.";
        } else if (activeSeason === 'winter') {
          nextWeather = 'clear';
          clearMsg = "☀️ The winter frost gale subsides. Crisp brisk sunshine bathes the snow-frosted mountain peaks.";
        } else if (activeSeason === 'spring') {
          nextWeather = 'clear';
          clearMsg = "🌈 Rainbow arches over Weaver's Needle as the spring shower clears! Poppy blossoms glisten in golden sunlight.";
        } else {
          nextWeather = 'clear';
          clearMsg = "🍂 The canyon winds quiet. Golden autumn sunshine stretches across the Superstitions.";
        }

        this.currentWeather = nextWeather;
        this.activeSeasonalEvent = 'none';

        if (this.onWeatherChangeCallback) {
          this.onWeatherChangeCallback(nextWeather);
        }
        if (this.onBannerCallback && clearMsg) {
          this.onBannerCallback(clearMsg);
        }
        this.notifyListeners(isHunkered);
      }
    }
    // Phase 4: Clearing Phase
    else if (this.phase === 'clearing') {
      this.clearingTimer -= delta;
      if (this.clearingTimer <= 0) {
        this.phase = 'calm';
        // Next seasonal event between 450s and 800s (7.5 to 13 minutes)
        this.timeUntilNextEvent = 480 + Math.random() * 320;
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

