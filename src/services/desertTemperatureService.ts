import { WeatherType, SeasonType } from '../types';
import { seasonService } from './seasonService';
import { dynamicWeatherEngine } from './dynamicWeatherEngine';

export interface DesertTemperatureContext {
  timeOfDay: number; // 0 to 24 hours
  weather: WeatherType;
  season?: SeasonType;
  elevationFt?: number; // USGS altimeter elevation in feet (approx 1,700 to 5,057 ft)
  isInShade?: boolean;
  shadeReason?: string;
  isUnderground?: boolean;
  isInsideMine?: boolean;
  currentMineLevel?: number;
  isHunkeredDown?: boolean;
  nearbyCampfireActive?: boolean;
  distanceToCampfire?: number;
}

export type HeatCategory =
  | 'freezing'      // < 45°F
  | 'cold'          // 45°F - 59°F
  | 'mild'          // 60°F - 79°F
  | 'warm'          // 80°F - 94°F
  | 'hot'           // 95°F - 104°F
  | 'scorching'     // 105°F - 114°F
  | 'hyperthermia'; // >= 115°F

export interface TemperatureReading {
  ambientF: number;
  ambientC: number;
  feelsLikeF: number;
  feelsLikeC: number;
  category: HeatCategory;
  categoryLabel: string;
  badgeColor: string;
  textColor: string;
  iconName: 'thermometer-snowflake' | 'thermometer' | 'thermometer-sun';
  statusSummary: string;
  hydrationMultiplier: number;
  vigourMultiplier: number;
  isDangerousHeat: boolean;
  isDangerousCold: boolean;
}

class DesertTemperatureService {
  private temperatureUnit: 'F' | 'C' = 'F';
  private listeners: Set<(unit: 'F' | 'C') => void> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem('superstition_temp_unit');
      if (saved === 'C' || saved === 'F') {
        this.temperatureUnit = saved;
      }
    } catch {
      // Ignore localStorage issues in sandboxed iframes
    }
  }

  public getUnit(): 'F' | 'C' {
    return this.temperatureUnit;
  }

  public toggleUnit(): 'F' | 'C' {
    this.temperatureUnit = this.temperatureUnit === 'F' ? 'C' : 'F';
    try {
      localStorage.setItem('superstition_temp_unit', this.temperatureUnit);
    } catch {
      // Ignore
    }
    this.listeners.forEach((fn) => fn(this.temperatureUnit));
    return this.temperatureUnit;
  }

  public subscribeUnit(fn: (unit: 'F' | 'C') => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public fToC(f: number): number {
    return Math.round(((f - 32) * 5) / 9);
  }

  public formatTemp(f: number, unit?: 'F' | 'C'): string {
    const activeUnit = unit || this.temperatureUnit;
    if (activeUnit === 'C') {
      return `${this.fToC(f)}°C`;
    }
    return `${Math.round(f)}°F`;
  }

  /**
   * Calculates real-time Sonoran Desert atmospheric and perceived temperature.
   */
  public queryTemperature(ctx: DesertTemperatureContext): TemperatureReading {
    const {
      timeOfDay,
      weather,
      elevationFt = 2050,
      isInShade = false,
      isUnderground = false,
      isInsideMine = false,
      currentMineLevel = 0,
      isHunkeredDown = false,
      nearbyCampfireActive = false,
      distanceToCampfire = 999,
    } = ctx;

    const subterranean = isUnderground || isInsideMine || currentMineLevel > 0;

    // 1. Subterranean mine shafts & deep caves: stable geothermal 68°F (20°C)
    if (subterranean) {
      const ambientF = 68;
      const feelsLikeF = 68;
      return this.buildReading(ambientF, feelsLikeF, 'Subterranean Cavern & Mine Shaft', 'mild');
    }

    // 2. Base Diurnal Curve tailored to the active Sonoran Desert Season:
    const activeSeason = ctx.season || seasonService.getSeason();
    let baseMidF = 66;
    let waveAmplitudeF = 15;

    switch (activeSeason) {
      case 'spring':
        // Spring (March - May): Mild & pleasant (~48°F nocturnal low to ~81°F midday peak)
        baseMidF = 66;
        waveAmplitudeF = 15;
        break;
      case 'summer':
        // Summer (June - August): Scorching Sonoran heat (~72°F night to ~112°F peak)
        baseMidF = 88;
        waveAmplitudeF = 24;
        break;
      case 'autumn':
        // Autumn (September - November): Crisp, dry, golden twilight (~42°F night to ~76°F peak)
        baseMidF = 58;
        waveAmplitudeF = 16;
        break;
      case 'winter':
        // Winter (December - February): Brisk mountain chill & frosty sub-freezing nights (~26°F night to ~62°F peak)
        baseMidF = 44;
        waveAmplitudeF = 18;
        break;
    }

    const cyclical = Math.cos(((timeOfDay - 15.0) / 24) * 2 * Math.PI);
    let ambientF = baseMidF + cyclical * waveAmplitudeF;

    // Active dynamic seasonal weather event temperature offset (e.g. -18°F winter frost gale, +6°F haboob)
    const seasonalEventOffset = dynamicWeatherEngine.getSeasonalTempOffset();
    ambientF += seasonalEventOffset;

    // 3. Weather offsets on true air temperature:
    switch (weather) {
      case 'storm':
        ambientF -= activeSeason === 'summer' ? 18 : 22; // Monsoonal microburst downpour chilling the desert
        break;
      case 'light_rain':
        ambientF -= activeSeason === 'winter' ? 16 : 10;
        break;
      case 'clouds':
        ambientF -= 6; // Cumulus cloud shade
        break;
      case 'sandstorm':
        ambientF += activeSeason === 'summer' ? 6 : 2; // Hot convective Haboob dust wall
        break;
      case 'sunset':
        ambientF -= 3;
        break;
      case 'clear':
      default:
        break;
    }

    // 4. Atmospheric elevation lapse rate:
    // Temperatures cool by ~3.5°F per 1,000 ft above the valley floor (~1,800 ft USGS).
    const elevAboveBase = Math.max(0, elevationFt - 1800);
    const elevationCooling = (elevAboveBase / 1000) * 3.5;
    ambientF -= elevationCooling;

    // Clamp realistic desert air temperature range (14°F freezing winter to 122°F scorching summer)
    ambientF = Math.max(14, Math.min(122, ambientF));

    // 5. Perceived ("Feels Like") Temperature:
    let feelsLikeF = ambientF;

    // Solar radiation impact (Daylight hours: 06:15 to 18:45)
    const isDaylight = timeOfDay >= 6.25 && timeOfDay <= 18.75;
    if (isDaylight) {
      if (isInShade) {
        // Deep shade eliminates direct sun thermal load and adds breeze comfort
        feelsLikeF -= 18;
      } else {
        // Direct baking Sonoran Desert solar radiation
        const sunIntensity = Math.sin(((timeOfDay - 6.25) / 12.5) * Math.PI);
        feelsLikeF += Math.max(0, sunIntensity * 12);
      }
    }

    // Active campfire radiant warmth
    if (nearbyCampfireActive && distanceToCampfire < 12) {
      const proximity = Math.max(0, 1 - distanceToCampfire / 12);
      const campfireBoost = proximity * 28; // Up to +28°F near campfire
      feelsLikeF += campfireBoost;
    }

    // Weather effects on perceived temperature
    if (weather === 'storm' || weather === 'light_rain') {
      feelsLikeF -= 6; // Wet evaporative chilling
    } else if (weather === 'sandstorm' && !isHunkeredDown) {
      feelsLikeF += 8; // Choking thermal dust friction
    }

    if (isHunkeredDown) {
      // Wind shielding and body warmth
      if (feelsLikeF < 65) feelsLikeF += 6; // Warmth retention in cold
      if (feelsLikeF > 95) feelsLikeF -= 5; // Radiation shielding under bedroll
    }

    feelsLikeF = Math.round(feelsLikeF);
    ambientF = Math.round(ambientF);

    // Determine category
    let category: HeatCategory = 'mild';
    if (feelsLikeF < 45) category = 'freezing';
    else if (feelsLikeF < 60) category = 'cold';
    else if (feelsLikeF < 80) category = 'mild';
    else if (feelsLikeF < 95) category = 'warm';
    else if (feelsLikeF < 105) category = 'hot';
    else if (feelsLikeF < 115) category = 'scorching';
    else category = 'hyperthermia';

    return this.buildReading(ambientF, feelsLikeF, ctx.shadeReason, category);
  }

  private buildReading(
    ambientF: number,
    feelsLikeF: number,
    shadeReason?: string,
    category: HeatCategory = 'mild'
  ): TemperatureReading {
    const ambientC = this.fToC(ambientF);
    const feelsLikeC = this.fToC(feelsLikeF);

    let categoryLabel = 'Comfortable';
    let badgeColor = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200';
    let textColor = 'text-emerald-400';
    let iconName: TemperatureReading['iconName'] = 'thermometer';
    let hydrationMultiplier = 1.0;
    let vigourMultiplier = 1.0;
    let isDangerousHeat = false;
    let isDangerousCold = false;

    const activeSeason = seasonService.getSeason();
    const seasonInfo = seasonService.getSeasonInfo(activeSeason);

    switch (category) {
      case 'freezing':
        categoryLabel = 'Freezing Chill';
        badgeColor = 'bg-sky-950/90 border-sky-400/70 text-sky-200 shadow-sky-900/50';
        textColor = 'text-sky-300';
        iconName = 'thermometer-snowflake';
        vigourMultiplier = 0.15; // Severe frost shivering halts recovery without fire
        hydrationMultiplier = 0.8;
        isDangerousCold = true;
        break;
      case 'cold':
        categoryLabel = 'Crisp Desert Chill';
        badgeColor = 'bg-blue-950/80 border-blue-400/50 text-blue-200';
        textColor = 'text-blue-300';
        iconName = 'thermometer-snowflake';
        vigourMultiplier = 0.6; // Chilled muscles recover sluggishly
        hydrationMultiplier = 0.85;
        break;
      case 'mild':
        categoryLabel = 'Temperate & Pleasant';
        badgeColor = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200';
        textColor = 'text-emerald-300';
        iconName = 'thermometer';
        hydrationMultiplier = 0.9;
        vigourMultiplier = 1.35; // Optimum comfort / campfire warmth
        break;
      case 'warm':
        categoryLabel = 'Warm Sun';
        badgeColor = 'bg-amber-950/80 border-amber-500/50 text-amber-200';
        textColor = 'text-amber-300';
        iconName = 'thermometer';
        hydrationMultiplier = 1.2;
        vigourMultiplier = 1.0;
        break;
      case 'hot':
        categoryLabel = 'Intense Desert Heat';
        badgeColor = 'bg-orange-950/85 border-orange-500/60 text-orange-200';
        textColor = 'text-orange-400';
        iconName = 'thermometer-sun';
        hydrationMultiplier = 1.7;
        vigourMultiplier = 0.55;
        break;
      case 'scorching':
        categoryLabel = 'Scorching Heat Wave';
        badgeColor = 'bg-red-950/90 border-red-500/80 text-red-200 shadow-red-900/50';
        textColor = 'text-red-400';
        iconName = 'thermometer-sun';
        hydrationMultiplier = 2.4; // 2.4x thirst drain under scorching sun
        vigourMultiplier = 0.2; // Heat exhaustion suppresses recovery without shade
        isDangerousHeat = true;
        break;
      case 'hyperthermia':
        categoryLabel = 'Dangerous Sunstroke Heat';
        badgeColor = 'bg-rose-950/95 border-rose-500 text-rose-100 ring-2 ring-rose-500/70 animate-pulse';
        textColor = 'text-rose-400';
        iconName = 'thermometer-sun';
        hydrationMultiplier = 3.2; // 3.2x critical thirst drain
        vigourMultiplier = 0.05; // Stamina collapse in direct sun
        isDangerousHeat = true;
        break;
    }

    // Apply Sonoran seasonal thirst & vigour modifiers
    hydrationMultiplier = Math.round(hydrationMultiplier * seasonInfo.thirstMultiplier * 100) / 100;
    vigourMultiplier = Math.round(vigourMultiplier * seasonInfo.vigourMultiplier * 100) / 100;

    const diff = feelsLikeF - ambientF;
    let statusSummary = `${this.formatTemp(ambientF)}`;
    const eventLabel = dynamicWeatherEngine.getSeasonalEventLabel();
    if (dynamicWeatherEngine.getCurrentSeasonalEvent() !== 'none') {
      statusSummary += ` • ${eventLabel}`;
    } else if (diff <= -12) {
      statusSummary += ` • Feels ${this.formatTemp(feelsLikeF)} (${shadeReason || 'Cool Shade'})`;
    } else if (diff >= 8) {
      statusSummary += ` • Feels ${this.formatTemp(feelsLikeF)} (Direct Sun)`;
    }

    return {
      ambientF,
      ambientC,
      feelsLikeF,
      feelsLikeC,
      category,
      categoryLabel,
      badgeColor,
      textColor,
      iconName,
      statusSummary,
      hydrationMultiplier,
      vigourMultiplier,
      isDangerousHeat,
      isDangerousCold,
    };
  }
}

export const desertTemperatureService = new DesertTemperatureService();
