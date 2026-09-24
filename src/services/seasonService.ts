import { SeasonType, SeasonInfo, WeatherType } from '../types';

const SEASON_ORDER: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_SEASON = 30; // Seasons now last 30 full in-game days (~9 hours of active play per season)

export const SEASONS_DATA: Record<SeasonType, SeasonInfo> = {
  spring: {
    id: 'spring',
    name: 'Spring Bloom',
    icon: '🌸',
    months: 'March – May',
    historicalDate: 'April 18, 1884',
    temperatureRange: '48°F – 80°F (Mild & Pleasant)',
    typicalDaytimeF: 76,
    typicalNighttimeF: 49,
    thirstMultiplier: 0.85,
    vigourMultiplier: 1.15,
    color: 'emerald',
    borderColor: 'border-emerald-500/60',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-950/80',
    summary: 'Mild desert warmth, gentle mountain breezes, and brilliant wildflower blooms.',
    floraAndFauna: 'Golden Arizona poppies, yellow brittlebush, and saguaro blossoms carpet the canyon washes.',
    atmosphereLore: 'The desert awakens with vibrant life. Relaxed dehydration rate and optimum prospecting vigour.',
    defaultWeather: 'clear',
  },
  summer: {
    id: 'summer',
    name: 'Summer Monsoons',
    icon: '☀️',
    months: 'June – August',
    historicalDate: 'July 24, 1884',
    temperatureRange: '78°F – 112°F (Scorching Heat)',
    typicalDaytimeF: 108,
    typicalNighttimeF: 76,
    thirstMultiplier: 1.8,
    vigourMultiplier: 0.85,
    color: 'orange',
    borderColor: 'border-orange-500/70',
    textColor: 'text-orange-400',
    badgeBg: 'bg-orange-950/85',
    summary: 'Blistering solar radiation, shimmering mirages, and towering Haboob dust storms.',
    floraAndFauna: 'Agaves and prickly pear fruits ripen under relentless sun; rattlesnakes seek deep rock crevices.',
    atmosphereLore: 'Intense thermal lift spawns violent afternoon monsoons and choking sand gales. Cliff shade is vital.',
    defaultWeather: 'clear',
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn Harvest',
    icon: '🍂',
    months: 'September – November',
    historicalDate: 'October 16, 1884',
    temperatureRange: '42°F – 78°F (Crisp & Golden)',
    typicalDaytimeF: 74,
    typicalNighttimeF: 44,
    thirstMultiplier: 0.80,
    vigourMultiplier: 1.20,
    color: 'amber',
    borderColor: 'border-amber-500/60',
    textColor: 'text-amber-300',
    badgeBg: 'bg-amber-950/80',
    summary: 'Crisp golden twilight, invigorating canyon breezes, and clear starry night skies.',
    floraAndFauna: 'Golden dry scrub and amber cottonwood canopies; long shadows stretch from Weaver’s Needle.',
    atmosphereLore: 'Optimal prospecting season. Vigour recovery is fast, thirst drain is mild, and heat stroke is zero.',
    defaultWeather: 'clear',
  },
  winter: {
    id: 'winter',
    name: 'Winter Mesa',
    icon: '❄️',
    months: 'December – February',
    historicalDate: 'January 12, 1885',
    temperatureRange: '28°F – 62°F (Brisk Chill & Frost)',
    typicalDaytimeF: 58,
    typicalNighttimeF: 30,
    thirstMultiplier: 0.55,
    vigourMultiplier: 1.0,
    color: 'sky',
    borderColor: 'border-sky-400/70',
    textColor: 'text-sky-300',
    badgeBg: 'bg-sky-950/85',
    summary: 'Brisk mountain sun, freezing nocturnal frost, and crystal clear vistas across Four Peaks.',
    floraAndFauna: 'Morning frost coats saguaro needles and high mesas; crisp mountain air echoes across canyons.',
    atmosphereLore: 'Lowest dehydration in the year. Sub-freezing night chills require stoked campfires or hotel lodging.',
    defaultWeather: 'clear',
  },
};

class SeasonService {
  private currentSeason: SeasonType = 'spring';
  private calendarDay: number = 1; // 1 to DAYS_PER_SEASON days per season
  private year: number = 1884;
  private subscribers: Set<(season: SeasonType, info: SeasonInfo) => void> = new Set();
  private onBannerCallback?: (message: string) => void;

  /**
   * Deterministic Universal Synchronized Season:
   * Uses real-world epoch time to guarantee that even before a WebSocket connection connects,
   * every player on any device calculates the EXACT same season, calendar day, and historic year in lockstep.
   * 1 in-game day = ~18 real minutes.
   * 30 in-game days per season = 9 real hours per season.
   * Full 4-season year = 36 real hours.
   */
  public static getUniversalEpochState(): { season: SeasonType; day: number; year: number } {
    const epochOffsetMs = 1704067200000; // Reference epoch (Jan 1, 2024 UTC)
    const elapsedMs = Math.max(0, Date.now() - epochOffsetMs);
    const dayLengthMs = 18 * 60 * 1000; // 18 minutes per in-game day
    const seasonLengthMs = DAYS_PER_SEASON * dayLengthMs; // 9 hours per season
    const yearLengthMs = 4 * seasonLengthMs; // 36 hours per frontier year

    const totalDays = Math.floor(elapsedMs / dayLengthMs);
    const dayInSeason = (totalDays % DAYS_PER_SEASON) + 1;
    const seasonIndex = Math.floor((elapsedMs % yearLengthMs) / seasonLengthMs);
    const year = 1884 + Math.floor(elapsedMs / yearLengthMs);

    return {
      season: SEASON_ORDER[seasonIndex % SEASON_ORDER.length],
      day: dayInSeason,
      year,
    };
  }

  constructor() {
    // Default initialize to the deterministic universal synchronized epoch state
    const epochState = SeasonService.getUniversalEpochState();
    this.currentSeason = epochState.season;
    this.calendarDay = epochState.day;
    this.year = epochState.year;

    try {
      const savedSeason = localStorage.getItem('superstition_current_season') as SeasonType;
      if (savedSeason && SEASONS_DATA[savedSeason]) {
        this.currentSeason = savedSeason;
      }
      const savedDay = parseInt(localStorage.getItem('superstition_calendar_day') || '', 10);
      if (!isNaN(savedDay) && savedDay >= 1 && savedDay <= DAYS_PER_SEASON) {
        this.calendarDay = savedDay;
      }
      const savedYear = parseInt(localStorage.getItem('superstition_calendar_year') || '', 10);
      if (!isNaN(savedYear) && savedYear >= 1880) {
        this.year = savedYear;
      }
    } catch {
      // Safe fallback in sandboxed environments
    }
  }

  public setBannerCallback(fn: (msg: string) => void) {
    this.onBannerCallback = fn;
  }

  public getSeason(): SeasonType {
    return this.currentSeason;
  }

  public getSeasonInfo(season?: SeasonType): SeasonInfo {
    const key = season || this.currentSeason;
    return SEASONS_DATA[key] || SEASONS_DATA.spring;
  }

  public getCalendarDay(): number {
    return this.calendarDay;
  }

  public getYear(): number {
    return this.year;
  }

  /**
   * Synchronizes the authoritative universal season across all players.
   * Called by the multiplayer server to ensure every prospector experiences the exact same season.
   */
  public syncUniversalSeason(
    season: SeasonType,
    day?: number,
    year?: number,
    announce: boolean = true
  ): SeasonInfo {
    if (!SEASONS_DATA[season]) return this.getSeasonInfo();

    const seasonChanged = this.currentSeason !== season;
    this.currentSeason = season;

    if (typeof day === 'number' && day >= 1 && day <= DAYS_PER_SEASON) {
      this.calendarDay = day;
    }
    if (typeof year === 'number' && year >= 1880) {
      this.year = year;
    }

    try {
      localStorage.setItem('superstition_current_season', this.currentSeason);
      localStorage.setItem('superstition_calendar_day', this.calendarDay.toString());
      localStorage.setItem('superstition_calendar_year', this.year.toString());
    } catch {
      // Ignore
    }

    const info = this.getSeasonInfo();
    this.notifySubscribers();

    if (seasonChanged && announce && this.onBannerCallback) {
      this.onBannerCallback(
        `📅 The season turns! ${info.icon} ${info.name.toUpperCase()} has begun for all prospectors across Arizona! (${info.temperatureRange})`
      );
    }

    return info;
  }

  public getFormattedDate(): string {
    const monthNames: Record<SeasonType, string[]> = {
      spring: ['March', 'April', 'May'],
      summer: ['June', 'July', 'August'],
      autumn: ['September', 'October', 'November'],
      winter: ['December', 'January', 'February'],
    };
    const months = monthNames[this.currentSeason];
    // 30 in-game days per season: 10 days per calendar month
    const monthIdx = Math.min(months.length - 1, Math.floor((this.calendarDay - 1) / 10));
    const dayInMonth = (((this.calendarDay - 1) % 10) * 3) + 1;
    return `${months[monthIdx]} ${dayInMonth}, ${this.year}`;
  }

  /**
   * Players can no longer arbitrarily choose their season — all players share the same synchronized season.
   */
  public cycleSeason(): SeasonInfo {
    console.warn('[SeasonService] Manual season cycling is disabled. Universal seasons are synchronized across all players.');
    return this.getSeasonInfo();
  }

  /**
   * Only allowed via authoritative sync.
   */
  public setSeason(season: SeasonType): SeasonInfo {
    return this.syncUniversalSeason(season, this.calendarDay, this.year, false);
  }

  /**
   * Advances the calendar by 1 day (e.g. on server diurnal day rollover)
   */
  public advanceDay(): { newSeason: SeasonType; isSeasonChanged: boolean; dateStr: string } {
    this.calendarDay += 1;
    let isSeasonChanged = false;

    // 30 full in-game days per season
    if (this.calendarDay > DAYS_PER_SEASON) {
      this.calendarDay = 1;
      const curIdx = SEASON_ORDER.indexOf(this.currentSeason);
      const nextIdx = (curIdx + 1) % SEASON_ORDER.length;
      if (nextIdx === 0) {
        this.year += 1;
        try {
          localStorage.setItem('superstition_calendar_year', this.year.toString());
        } catch {
          // Ignore
        }
      }
      this.currentSeason = SEASON_ORDER[nextIdx];
      isSeasonChanged = true;
      try {
        localStorage.setItem('superstition_current_season', this.currentSeason);
      } catch {
        // Ignore
      }
    }

    try {
      localStorage.setItem('superstition_calendar_day', this.calendarDay.toString());
    } catch {
      // Ignore
    }

    const dateStr = this.getFormattedDate();
    const info = this.getSeasonInfo();

    if (isSeasonChanged) {
      this.notifySubscribers();
      if (this.onBannerCallback) {
        this.onBannerCallback(
          `📅 The season turns! ${info.icon} ${info.name.toUpperCase()} (${dateStr}) — ${info.summary}`
        );
      }
    }

    return {
      newSeason: this.currentSeason,
      isSeasonChanged,
      dateStr,
    };
  }

  public subscribe(fn: (season: SeasonType, info: SeasonInfo) => void): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notifySubscribers() {
    const info = this.getSeasonInfo();
    queueMicrotask(() => {
      this.subscribers.forEach((fn) => {
        try {
          fn(this.currentSeason, info);
        } catch (err) {
          console.error('Error notifying season subscriber:', err);
        }
      });
    });
  }
}

export const seasonService = new SeasonService();
