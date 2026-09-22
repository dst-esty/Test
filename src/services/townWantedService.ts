import { soundEngine } from '../audio/soundEffects';

export type WantedLevel = 0 | 1 | 2 | 3;

export interface OutlawCrime {
  id: string;
  description: string;
  timestamp: number;
  bountyAdded: number;
}

export interface WantedRecord {
  wantedLevel: WantedLevel;
  bounty: number; // in legal tender USD
  isMobilized: boolean;
  hasMostWantedBadge: boolean;
  mostWantedUnlockedAt: number | null;
  totalTownfolkShot: number;
  npcsDowned: string[];
  crimes: OutlawCrime[];
  lastCrimeTime: number;
  alarmCooldown: number;
}

const STORAGE_KEY = 'superstition_outlaw_wanted_state';

class TownWantedService {
  private record: WantedRecord;
  private listeners: Set<(rec: WantedRecord) => void> = new Set();
  private bellIntervalId: number | null = null;
  private playerPos: { x: number; z: number } = { x: 0, z: -250 };

  public updatePlayerPosition(x: number, z: number) {
    this.playerPos = { x, z };
  }

  public getBellVolume(): number {
    const dist = Math.hypot(this.playerPos.x, this.playerPos.z - (-250.0));
    if (dist <= 30.0) return 0.14;
    if (dist >= 120.0) return 0;
    // Smooth attenuation between 30m and 120m
    const factor = 1 - (dist - 30.0) / (120.0 - 30.0);
    return Math.max(0, 0.14 * factor);
  }

  constructor() {
    this.record = this.loadRecord();
  }

  private loadRecord(): WantedRecord {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          wantedLevel: parsed.wantedLevel || 0,
          bounty: parsed.bounty || 0,
          isMobilized: false, // Mobilization resets on fresh load
          hasMostWantedBadge: Boolean(parsed.hasMostWantedBadge),
          mostWantedUnlockedAt: parsed.mostWantedUnlockedAt || null,
          totalTownfolkShot: parsed.totalTownfolkShot || 0,
          npcsDowned: parsed.npcsDowned || [],
          crimes: Array.isArray(parsed.crimes) ? parsed.crimes : [],
          lastCrimeTime: parsed.lastCrimeTime || 0,
          alarmCooldown: 0,
        };
      }
    } catch {
      // Fallback
    }

    return {
      wantedLevel: 0,
      bounty: 0,
      isMobilized: false,
      hasMostWantedBadge: false,
      mostWantedUnlockedAt: null,
      totalTownfolkShot: 0,
      npcsDowned: [],
      crimes: [],
      lastCrimeTime: 0,
      alarmCooldown: 0,
    };
  }

  private saveRecord() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.record));
    } catch {
      // ignore
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.record }));
  }

  public subscribe(listener: (rec: WantedRecord) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.record });
    return () => this.listeners.delete(listener);
  }

  public getRecord(): WantedRecord {
    return { ...this.record };
  }

  /**
   * Called when player shoots a gun within Tortilla Flat municipal borders
   */
  public reportGunfireInTown(): { levelChanged: boolean; newLevel: WantedLevel; message?: string } {
    const prevLevel = this.record.wantedLevel;
    const now = Date.now();

    // If already law-abiding, escalate to Level 1 (Disturbing the peace)
    if (this.record.wantedLevel === 0) {
      this.record.wantedLevel = 1;
      this.record.bounty += 25;
      this.record.crimes.unshift({
        id: `crime_${now}`,
        description: 'Reckless Gunfire & Disturbing the Peace in Tortilla Flat',
        timestamp: now,
        bountyAdded: 25,
      });
      this.record.lastCrimeTime = now;
      this.saveRecord();
      return {
        levelChanged: true,
        newLevel: 1,
        message: '⚠️ MUNICIPAL VIOLATION: Unlawful Gunplay in Town Limits! $25 Bounty Posted.',
      };
    }

    return { levelChanged: false, newLevel: this.record.wantedLevel };
  }

  /**
   * Called when player strikes a town NPC with gunfire or dynamite
   */
  public reportAssaultNPC(
    npcId: string,
    npcName: string,
    damage: number,
    isSheriff: boolean
  ): { levelChanged: boolean; newLevel: WantedLevel; earnedMostWanted: boolean; message: string } {
    const prevLevel = this.record.wantedLevel;
    const now = Date.now();
    this.record.totalTownfolkShot++;
    this.record.lastCrimeTime = now;

    let addedBounty = isSheriff ? 150 : 75;
    let crimeDesc = isSheriff
      ? `Armed Assault upon Territorial Lawman Sheriff Vance`
      : `Aggravated Assault with Deadly Weapon upon ${npcName}`;

    this.record.bounty += addedBounty;
    this.record.crimes.unshift({
      id: `assault_${now}_${npcId}`,
      description: crimeDesc,
      timestamp: now,
      bountyAdded: addedBounty,
    });

    let earnedMostWanted = false;

    // Escalate wanted level
    if (isSheriff || this.record.totalTownfolkShot >= 3 || this.record.bounty >= 500) {
      if (this.record.wantedLevel < 3) {
        this.record.wantedLevel = 3;
        if (!this.record.hasMostWantedBadge) {
          this.record.hasMostWantedBadge = true;
          this.record.mostWantedUnlockedAt = now;
          earnedMostWanted = true;
          soundEngine.playOutlawBadgeEarned();
        }
      }
    } else if (this.record.wantedLevel < 2) {
      this.record.wantedLevel = 2;
    }

    // Mobilize the town immediately
    this.triggerMobilization();

    this.saveRecord();

    const levelChanged = this.record.wantedLevel !== prevLevel;
    let message = isSheriff
      ? `🚨 FELONY: Assault on Sheriff Wyatt Vance! Wanted Bounty now $${this.record.bounty}!`
      : `🚨 ASSAULT: Shot ${npcName}! Town Law Alerted! Bounty: $${this.record.bounty}`;

    if (earnedMostWanted) {
      message = `★ UNLOCKED: "TERRITORIAL MOST WANTED" OUTLAW BADGE! Full Posse Mobilized!`;
    }

    return {
      levelChanged,
      newLevel: this.record.wantedLevel,
      earnedMostWanted,
      message,
    };
  }

  /**
   * Called when an NPC is downed / incapacitated by player fire
   */
  public reportDownedNPC(
    npcId: string,
    npcName: string,
    isSheriff: boolean
  ): { levelChanged: boolean; newLevel: WantedLevel; earnedMostWanted: boolean; message: string } {
    const now = Date.now();
    const prevLevel = this.record.wantedLevel;

    if (!this.record.npcsDowned.includes(npcId)) {
      this.record.npcsDowned.push(npcId);
    }

    const addedBounty = isSheriff ? 300 : 150;
    this.record.bounty += addedBounty;
    this.record.crimes.unshift({
      id: `downed_${now}_${npcId}`,
      description: isSheriff
        ? 'Incapacitated Pinal County Sheriff Wyatt Vance in Line of Duty'
        : `Grievous Bodily Harm / Incapacitated ${npcName}`,
      timestamp: now,
      bountyAdded: addedBounty,
    });

    let earnedMostWanted = false;
    this.record.wantedLevel = 3; // Any downed citizen triggers Territorial Most Wanted
    if (!this.record.hasMostWantedBadge) {
      this.record.hasMostWantedBadge = true;
      this.record.mostWantedUnlockedAt = now;
      earnedMostWanted = true;
      soundEngine.playOutlawBadgeEarned();
    }

    this.triggerMobilization();
    this.saveRecord();

    return {
      levelChanged: this.record.wantedLevel !== prevLevel,
      newLevel: 3,
      earnedMostWanted,
      message: `☠️ VIOLENT CRIME: ${npcName} Downed! TERRITORIAL MOST WANTED! Bounty: $${this.record.bounty}`,
    };
  }

  /**
   * Sounds the town alarm bell and activates armed defense
   */
  public triggerMobilization() {
    const wasMobilized = this.record.isMobilized;
    this.record.isMobilized = true;

    // Initial alert: realistic 2-stroke warning chime (toll, pause 1.2s, toll)
    if (!wasMobilized) {
      const vol = this.getBellVolume();
      if (vol > 0.005) {
        soundEngine.playTownAlarmBell(vol);
        setTimeout(() => {
          if (this.record.isMobilized) {
            soundEngine.playTownAlarmBell(this.getBellVolume() * 0.85);
          }
        }, 1200);
      }
    }

    if (!this.bellIntervalId) {
      // Much less frequent reminder: toll only once every 50 seconds (was 4.5s)
      this.bellIntervalId = window.setInterval(() => {
        if (this.record.isMobilized) {
          const vol = this.getBellVolume();
          if (vol > 0.005) {
            soundEngine.playTownAlarmBell(vol * 0.7); // Softer ambient reminder
          }
        } else if (this.bellIntervalId) {
          clearInterval(this.bellIntervalId);
          this.bellIntervalId = null;
        }
      }, 50000);
    }
  }

  public standDownMobilization() {
    this.record.isMobilized = false;
    if (this.bellIntervalId) {
      clearInterval(this.bellIntervalId);
      this.bellIntervalId = null;
    }
    this.notify();
  }

  /**
   * Pay off bounty at the Assayer or Territorial Marshal
   */
  public payOffBounty(): boolean {
    if (this.record.bounty <= 0) return false;
    this.record.bounty = 0;
    this.record.wantedLevel = 0;
    this.record.isMobilized = false;
    this.record.npcsDowned = [];
    this.standDownMobilization();
    this.saveRecord();
    return true;
  }

  /**
   * Reset on jail sentence or fresh restart
   */
  public serveJailSentence() {
    this.record.bounty = 0;
    this.record.wantedLevel = 0;
    this.record.isMobilized = false;
    this.record.npcsDowned = [];
    this.standDownMobilization();
    this.saveRecord();
  }

  /**
   * Clears outlaw record and badge
   */
  public isTownMobilized(): boolean {
    return this.record.isMobilized;
  }

  public clearAllRecords() {
    this.record = {
      wantedLevel: 0,
      bounty: 0,
      isMobilized: false,
      hasMostWantedBadge: false,
      mostWantedUnlockedAt: null,
      totalTownfolkShot: 0,
      npcsDowned: [],
      crimes: [],
      lastCrimeTime: 0,
      alarmCooldown: 0,
    };
    this.standDownMobilization();
    this.saveRecord();
  }
}

export const townWantedService = new TownWantedService();
