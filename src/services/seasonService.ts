import { SeasonType, SeasonInfo, WeatherType } from '../types';

const SEASON_ORDER: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];

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
  private calendarDay: number = 1; // 1 to 28 days per season cycle
  private year: number = 1884;
  private subscribers: Set<(season: SeasonType, info: SeasonInfo) => void> = new Set();
  private onBannerCallback?: (message: string) => void;

  constructor() {
    try {
      const savedSeason = localStorage.getItem('superstition_current_season') as SeasonType;
      if (savedSeason && SEASONS_DATA[savedSeason]) {
        this.currentSeason = savedSeason;
      }
      const savedDay = parseInt(localStorage.getItem('superstition_calendar_day') || '1', 10);
      if (!isNaN(savedDay) && savedDay >= 1 && savedDay <= 120) {
        this.calendarDay = savedDay;
      }
      const savedYear = parseInt(localStorage.getItem('superstition_calendar_year') || '1884', 10);
      if (!isNaN(savedYear)) {
        this.year = savedYear;
      }
    } catch {
      // Safe fallback in sandboxed iframes
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

  public getFormattedDate(): string {
    const info = this.getSeasonInfo();
    // Deterministic month and day calculation based on calendar day (1-7 per season for brisk progression)
    const monthNames: Record<SeasonType, string[]> = {
      spring: ['March', 'April', 'May'],
      summer: ['June', 'July', 'August'],
      autumn: ['September', 'October', 'November'],
      winter: ['December', 'January', 'February'],
    };
    const months = monthNames[this.currentSeason];
    const monthIdx = Math.min(months.length - 1, Math.floor(((this.calendarDay - 1) / 7) * months.length));
    const dayOfMonth = (((this.calendarDay - 1) * 4 + 7) % 28) + 1;
    return `${months[monthIdx]} ${dayOfMonth}, ${this.year}`;
  }

  public setSeason(season: SeasonType, announce: boolean = true): SeasonInfo {
    if (!SEASONS_DATA[season]) return this.getSeasonInfo();
    this.currentSeason = season;
    try {
      localStorage.setItem('superstition_current_season', season);
    } catch {
      // Ignore
    }

    const info = this.getSeasonInfo();
    this.notifySubscribers();

    if (announce && this.onBannerCallback) {
      this.onBannerCallback(
        `${info.icon} ${info.name.toUpperCase()} has arrived! (${info.temperatureRange}). ${info.summary}`
      );
    }

    return info;
  }

  public cycleSeason(announce: boolean = true): SeasonInfo {
    const currentIndex = SEASON_ORDER.indexOf(this.currentSeason);
    const nextSeason = SEASON_ORDER[(currentIndex + 1) % SEASON_ORDER.length];
    return this.setSeason(nextSeason, announce);
  }

  /**
   * Advances the calendar by 1 day (e.g., at midnight rollover or when resting until dawn)
   */
  public advanceDay(): { newSeason: SeasonType; isSeasonChanged: boolean; dateStr: string } {
    this.calendarDay += 1;
    let isSeasonChanged = false;

    // 7 in-game days per season (~1 real-life hour of active play per season)
    if (this.calendarDay > 7) {
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
    fn(this.currentSeason, this.getSeasonInfo());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notifySubscribers() {
    const info = this.getSeasonInfo();
    this.subscribers.forEach((fn) => {
      try {
        fn(this.currentSeason, info);
      } catch (err) {
        console.error('Error notifying season subscriber:', err);
      }
    });
  }
}

export const seasonService = new SeasonService();
