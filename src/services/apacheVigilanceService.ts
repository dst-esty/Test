/**
 * Apache Territory, Sacred Grounds & Peak Vigilance System
 * 
 * Implements historical lore of the Western Apache / Tonto Apache in the Superstition Mountains:
 * - Sacred Peaks (Weaver's Needle / El Sombrero, Peralta Canyon / Massacre Grounds, Black Rock, Hieroglyphic Canyon).
 * - "Peak Vigilance" threat calculation driven by mountain desecration:
 *     - Dynamite blasting (+large vigilance spikes, sound reverberating through canyons)
 *     - Industrial timber structures & mine portals (+steady ongoing presence)
 *     - Excavating & gouging earth (+blocks dug in sacred perimeter)
 *     - Hoarding unrefined gold ore / dust on sacred ground
 * - Warning & Surveillance Signals:
 *     - Billowing procedural smoke signals puffing on distant inaccessible peaks & ridges
 *     - Echoing canyon war drums and eerie dusk/night owl calls on the wind
 *     - Environmental text warnings when vigilance crosses key thresholds
 */

import { Vector3D } from '../types';

export interface SacredZone {
  id: string;
  name: string;
  nativeName: string;
  x: number;
  z: number;
  radius: number;
  desecrationMultiplier: number;
  description: string;
}

export const SACRED_ZONES: SacredZone[] = [
  {
    id: 'weavers_needle',
    name: "Weaver's Needle",
    nativeName: "Home of the Thunder God (Dawa)",
    x: 120,
    z: 90,
    radius: 95,
    desecrationMultiplier: 2.2,
    description: "The sacred basalt monolith. Blasting or mining here is seen as supreme violation of the Mountain Spirits.",
  },
  {
    id: 'massacre_grounds',
    name: 'Peralta Massacre Grounds',
    nativeName: 'The Bloodied Washes (1848)',
    x: -180,
    z: -140,
    radius: 80,
    desecrationMultiplier: 1.8,
    description: "Where the Mexican Peralta mule-train was crushed. Unquiet warrior spirits guard the scattered ore.",
  },
  {
    id: 'black_rock_ridge',
    name: 'Black Rock Mesa',
    nativeName: 'High Apache Lookout',
    x: 45,
    z: -70,
    radius: 70,
    desecrationMultiplier: 1.5,
    description: "Commanding vantage point overlooking Apache Pass and Dutchman Canyon.",
  },
  {
    id: 'hieroglyphic_canyon',
    name: 'Hieroglyphic Petroglyph Springs',
    nativeName: 'Sacred Water Shrines',
    x: -30,
    z: 140,
    radius: 65,
    desecrationMultiplier: 1.6,
    description: "Ancient etched stones and natural mountain tinajas. Defiling this water source angers the canyon sentinels.",
  },
];

export interface SmokeSignalLocation {
  id: string;
  x: number;
  y: number;
  z: number;
  name: string;
  ridgeDescription: string;
}

export const SMOKE_SIGNAL_LOCATIONS: SmokeSignalLocation[] = [
  {
    id: 'smoke_weaver_crag',
    x: 135,
    y: 92,
    z: 110,
    name: "Weaver's High Spire",
    ridgeDescription: 'Above the southern needle buttress',
  },
  {
    id: 'smoke_north_rim',
    x: -160,
    y: 85,
    z: -165,
    name: 'Peralta North Rim',
    ridgeDescription: 'Ridge above the Massacre Wash',
  },
  {
    id: 'smoke_black_mesa',
    x: 65,
    y: 78,
    z: -95,
    name: 'Black Mesa Promontory',
    ridgeDescription: 'Overlooking the eastern wash',
  },
  {
    id: 'smoke_geronimo_bluff',
    x: -95,
    y: 82,
    z: 75,
    name: 'Geronimo Sentry Bluff',
    ridgeDescription: 'High western parapet',
  },
];

export type VigilanceLevel = 'dormant' | 'watchful' | 'alert' | 'hostile' | 'wrathful';

export interface VigilanceStatus {
  value: number; // 0 - 100
  level: VigilanceLevel;
  levelTitle: string;
  description: string;
  activeSmokeSignals: boolean;
  drumbeatIntensity: number; // 0.0 to 1.0
  activeZone: SacredZone | null;
  nearestZoneDistance: number;
}

export class ApacheVigilanceManager {
  private vigilance: number = 0; // 0 - 100
  private lastPlayerPos: Vector3D = { x: 0, y: 0, z: -246 };
  private lastDecayTime: number = Date.now();
  private lastDrumTime: number = 0;
  private lastWarningMsg: string | null = null;
  private warnedLevels: Set<VigilanceLevel> = new Set();

  constructor() {
    this.vigilance = 8; // Starting quiet frontier tension
  }

  public getVigilance(): number {
    return this.vigilance;
  }

  public setVigilance(v: number) {
    this.vigilance = Math.max(0, Math.min(100, v));
  }

  /**
   * Called when player blasts dynamite anywhere in the mountains.
   * Explosions reverberate through canyons and provoke major vigilance spikes.
   */
  public reportDynamiteBlast(pos: Vector3D): { spike: number; zone: SacredZone | null } {
    const zone = this.getZoneAt(pos.x, pos.z);
    const baseSpike = 16;
    const mult = zone ? zone.desecrationMultiplier : 1.0;
    const totalSpike = Math.round(baseSpike * mult);

    this.vigilance = Math.min(100, this.vigilance + totalSpike);
    return { spike: totalSpike, zone };
  }

  /**
   * Called when player digs earth/rock in the mountain.
   */
  public reportExcavation(pos: Vector3D, blockCount: number = 1): number {
    const zone = this.getZoneAt(pos.x, pos.z);
    if (!zone) {
      // Normal digs far from sacred grounds generate very slight vigilance
      this.vigilance = Math.min(100, this.vigilance + 0.05 * blockCount);
      return 0.05 * blockCount;
    }
    const spike = 0.35 * blockCount * zone.desecrationMultiplier;
    this.vigilance = Math.min(100, this.vigilance + spike);
    return spike;
  }

  /**
   * Called when building industrial mining structures (portals, winches, etc.).
   */
  public reportStructureBuilt(pos: Vector3D, structureType: string): number {
    const zone = this.getZoneAt(pos.x, pos.z);
    let base = 8;
    if (structureType === 'timber_portal') base = 12;
    if (structureType === 'headframe') base = 16;
    const spike = base * (zone ? zone.desecrationMultiplier : 1.0);
    this.vigilance = Math.min(100, this.vigilance + spike);
    return spike;
  }

  /**
   * Reduce vigilance heat by a specific amount (e.g. repelling raids, resting, or gifting).
   */
  public coolDown(amount: number): number {
    this.vigilance = Math.max(0, this.vigilance - amount);
    return this.vigilance;
  }

  /**
   * Retrieve the current vigilance status without advancing the time delta.
   */
  public getStatus(playerPos?: Vector3D): VigilanceStatus {
    const pos = playerPos || this.lastPlayerPos;
    const activeZone = this.getZoneAt(pos.x, pos.z);
    let nearestZoneDistance = Infinity;
    for (const z of SACRED_ZONES) {
      const d = Math.hypot(pos.x - z.x, pos.z - z.z);
      if (d < nearestZoneDistance) nearestZoneDistance = d;
    }

    const level = this.calculateLevel(this.vigilance);
    const { title, description } = this.getLevelDetails(level);

    let drumbeatIntensity = 0;
    if (this.vigilance > 25) {
      drumbeatIntensity = (this.vigilance - 25) / 75;
    }

    return {
      value: Math.round(this.vigilance),
      level,
      levelTitle: title,
      description,
      activeSmokeSignals: this.vigilance >= 28,
      drumbeatIntensity,
      activeZone,
      nearestZoneDistance,
    };
  }

  /**
   * Natural decay when player is quiet, resting at town, or not blasting.
   */
  public update(deltaSeconds: number, playerPos: Vector3D, isInsideTown: boolean): VigilanceStatus {
    this.lastPlayerPos = playerPos;
    // Decay slowly over time (faster if in town / safe area)
    const decayRate = isInsideTown ? 0.35 : 0.08; // points per second
    this.vigilance = Math.max(0, this.vigilance - decayRate * deltaSeconds);

    const activeZone = this.getZoneAt(playerPos.x, playerPos.z);
    let nearestZoneDistance = Infinity;
    for (const z of SACRED_ZONES) {
      const d = Math.hypot(playerPos.x - z.x, playerPos.z - z.z);
      if (d < nearestZoneDistance) nearestZoneDistance = d;
    }

    // Passive trespassing heat if lingering deep inside a sacred boundary
    if (activeZone) {
      this.vigilance = Math.min(100, this.vigilance + 0.12 * activeZone.desecrationMultiplier * deltaSeconds);
    }

    const level = this.calculateLevel(this.vigilance);
    const { title, description } = this.getLevelDetails(level);

    // Drumbeat intensity increases as vigilance climbs
    let drumbeatIntensity = 0;
    if (this.vigilance > 25) {
      drumbeatIntensity = (this.vigilance - 25) / 75; // 0 to 1
    }

    return {
      value: Math.round(this.vigilance),
      level,
      levelTitle: title,
      description,
      activeSmokeSignals: this.vigilance >= 28,
      drumbeatIntensity,
      activeZone,
      nearestZoneDistance,
    };
  }

  public getZoneAt(x: number, z: number): SacredZone | null {
    for (const zone of SACRED_ZONES) {
      const dist = Math.hypot(x - zone.x, z - zone.z);
      if (dist <= zone.radius) {
        return zone;
      }
    }
    return null;
  }

  private calculateLevel(v: number): VigilanceLevel {
    if (v < 20) {
      // Clear higher warnings when dropping back down to peace
      this.warnedLevels.delete('watchful');
      this.warnedLevels.delete('alert');
      this.warnedLevels.delete('hostile');
      this.warnedLevels.delete('wrathful');
      return 'dormant';
    }
    if (v < 40) {
      this.warnedLevels.delete('alert');
      this.warnedLevels.delete('hostile');
      this.warnedLevels.delete('wrathful');
      return 'watchful';
    }
    if (v < 65) {
      this.warnedLevels.delete('hostile');
      this.warnedLevels.delete('wrathful');
      return 'alert';
    }
    if (v < 85) {
      this.warnedLevels.delete('wrathful');
      return 'hostile';
    }
    return 'wrathful';
  }

  private getLevelDetails(level: VigilanceLevel): { title: string; description: string } {
    switch (level) {
      case 'dormant':
        return {
          title: 'Dormant Ridges',
          description: 'The mountain spirits are peaceful. Only the desert wind whispers across the mesas.',
        };
      case 'watchful':
        return {
          title: 'Watchful Eyes',
          description: 'Apache lookouts on distant crags have noted unusual commotion in the canyons.',
        };
      case 'alert':
        return {
          title: 'Alert Sentinel Ridges',
          description: 'Smoke signals rise from the high needles. Sentry drums echo through the washes.',
        };
      case 'hostile':
        return {
          title: 'War Party Mobilizing',
          description: 'The mountain guardians are gathering. Intrusions and mine shafts are targeted for destruction.',
        };
      case 'wrathful':
        return {
          title: 'Wrath of the Sacred Peaks',
          description: 'Imminent raid. War parties seek to extinguish campfire light and obliterate mine workings.',
        };
    }
  }

  /**
   * Check if a new warning message should be dispatched to the banner/HUD.
   */
  public checkThresholdWarning(status: VigilanceStatus): string | null {
    if (!this.warnedLevels.has(status.level)) {
      this.warnedLevels.add(status.level);
      if (status.level === 'watchful') {
        return "🦅 Distant movement caught on the canyon ridges... The mountain sentinels have spotted your trail.";
      }
      if (status.level === 'alert') {
        return "💨 Thin columns of smoke rise above Weaver's Needle. Apache lookouts are signaling across the pass.";
      }
      if (status.level === 'hostile') {
        return "🥁 Hollow war drums rumble on the night breeze. The guardians prepare to protect the sacred ground.";
      }
      if (status.level === 'wrathful') {
        return "⚠️ THREAT IMMINENT: The War Party has mobilized! Defend your camp or take cover.";
      }
    }
    return null;
  }
}

export const apacheVigilance = new ApacheVigilanceManager();
