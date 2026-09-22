import { GameOverDetails } from '../types';
import { INITIAL_LANDMARKS } from '../world/clues';
import { safeLocalStorage } from '../utils/storage';

export interface CoronersLogEntry {
  id: string;
  expeditionNumber: number;
  timestamp: number;
  formattedDate: string;
  isHistoricalArchive: boolean;
  prospectorName: string;
  reason: 'fall' | 'cave_in' | 'dehydration' | 'bandit' | 'dynamite' | 'drowning' | 'venom' | 'apache_raid';
  title: string;
  subtitle: string;
  cause: string;
  coordinates: { x: number; y: number; z: number };
  locationName: string;
  sectorQuad: string;
  elevationFt: number;
  depthMeters?: number;
  strata?: string;
  goldLost: number;
  blocksDug: number;
  landmarksDiscovered: number;
  timeSurvivedSeconds: number;
  coronerVerdict: string;
  preventionAdvisory: {
    heading: string;
    actionRule: string;
    equipmentRecommended: string;
  };
}

const STORAGE_KEY = 'superstition_coroners_log';
const EXPEDITION_COUNTER_KEY = 'superstition_expedition_count';

/**
 * Historical Territorial Inquests recorded in Pinal County & Arizona Territory (1884 - 1947).
 * Provides immediate lore, historical authenticity, and baseline survival knowledge.
 */
export const HISTORICAL_INQUEST_ARCHIVE: CoronersLogEntry[] = [
  {
    id: 'hist-1931-ruth',
    expeditionNumber: 0,
    timestamp: new Date('1931-06-14T11:00:00Z').getTime(),
    formattedDate: 'June 14, 1931 • Territorial Inquest',
    isHistoricalArchive: true,
    prospectorName: 'Dr. Adolph Ruth (Explorer & Map Holder)',
    reason: 'bandit',
    title: 'Assassinated for the Peralta Map Cipher',
    subtitle: 'The Infamous Ruth Family Tragedy',
    cause:
      'Remains recovered in a secluded box canyon with two close-range .30-caliber gunshot wounds through the left temporal plate. His handwritten Peralta trail notebook and checkbook were seized from his canvas satchel.',
    coordinates: { x: 18, y: 14, z: -35 },
    locationName: 'West Ravine of Needle Canyon (180 yds NE of Black Top Mesa)',
    sectorQuad: 'USGS Weaver\'s Needle Quad • Sector 2',
    elevationFt: 3410,
    goldLost: 0,
    blocksDug: 0,
    landmarksDiscovered: 4,
    timeSurvivedSeconds: 86400,
    coronerVerdict: 'Homicide by firearm at hands of unknown claim jumpers or desert ambushers.',
    preventionAdvisory: {
      heading: 'Armed Frontier Defense & Ambush Avoidance',
      actionRule:
        'Hostile claim jumpers patrol mineral-rich canyon passes. Keep your Winchester rifle equipped or reload [R] promptly, take cover behind basalt boulders, and engage from distance.',
      equipmentRecommended: 'Winchester Repeating Rifle, .30-06 Ammo, Brass Field Binoculars',
    },
  },
  {
    id: 'hist-1884-bavarian',
    expeditionNumber: 0,
    timestamp: new Date('1884-10-22T23:15:00Z').getTime(),
    formattedDate: 'October 22, 1884 • Pinal County Ledger',
    isHistoricalArchive: true,
    prospectorName: 'Johann "Black Jack" Keppler (Bavarian Miner)',
    reason: 'fall',
    title: 'Fatal Midnight Precipice Plunge',
    subtitle: 'Succumbed to Gravity in Pitch-Black Darkness',
    cause:
      'Prospector lost footing during an unlit night descent over a vertical dacite bluff. Body was discovered fractured at the foot of an 85-foot basalt drop-off onto jagged scree.',
    coordinates: { x: 8, y: 32, z: 22 },
    locationName: 'Northeast Razorback Cliff of Weaver\'s Needle',
    sectorQuad: 'USGS Weaver\'s Needle Quad • Sector 4',
    elevationFt: 4120,
    goldLost: 48,
    blocksDug: 12,
    landmarksDiscovered: 3,
    timeSurvivedSeconds: 43200,
    coronerVerdict: 'Accidental death due to blunt gravitational trauma during nocturnal navigation.',
    preventionAdvisory: {
      heading: 'Nocturnal Cliff & Ledge Avoidance',
      actionRule:
        'Desert night travel (19:30 - 05:30) is lethal along mountain rims and canyon rims. Stop before dusk, establish a campfire [C] or bedroll, or stay upon flat desert ground until sunrise.',
      equipmentRecommended: 'Flint & Steel, Firewood Bundles, Camp Bedroll',
    },
  },
  {
    id: 'hist-1898-cornish',
    expeditionNumber: 0,
    timestamp: new Date('1898-03-04T15:30:00Z').getTime(),
    formattedDate: 'March 4, 1898 • Territorial Coroner Filing',
    isHistoricalArchive: true,
    prospectorName: 'William T. Pascoe (Cornish Shaft Sink)',
    reason: 'cave_in',
    title: 'Catastrophic Pit Overburden Trench Collapse',
    subtitle: 'Crushed Under 14 Tons of Caliche Gravel',
    cause:
      'Excavated a test shaft past 2.8 meters depth into unstable volcanic alluvium without installing lateral timber cribbing or shoring beams. Saturated topsoil sheared away, suffocating the prospector.',
    coordinates: { x: 34, y: -2, z: -88 },
    locationName: 'Dugout Wash (65 yds East of Waltz\'s Abandoned Dugout)',
    sectorQuad: 'USGS East Box Canyons Quad • Sector 1',
    elevationFt: 2840,
    depthMeters: 2.8,
    strata: 'Caliche & Weathered Volcanic Alluvium',
    goldLost: 110,
    blocksDug: 42,
    landmarksDiscovered: 2,
    timeSurvivedSeconds: 28800,
    coronerVerdict: 'Asphyxiation and crush asphyxia due to un-reinforced pit rim failure.',
    preventionAdvisory: {
      heading: 'Geotechnical Trench Shoring Mandate',
      actionRule:
        'Lateral soil pressure causes un-shored excavations exceeding 2.0 meters depth to collapse violently. Always erect timber shoring cribs [T] before continuing deep excavation.',
      equipmentRecommended: 'Sawn Pine Timber Planks, Heavy Iron Pickaxe, Square Cribbing Sets',
    },
  },
  {
    id: 'hist-1947-cravey',
    expeditionNumber: 0,
    timestamp: new Date('1947-07-02T16:45:00Z').getTime(),
    formattedDate: 'July 2, 1947 • Maricopa County Sheriff Report',
    isHistoricalArchive: true,
    prospectorName: 'James A. Cravey (Adventurer & Photographer)',
    reason: 'dehydration',
    title: 'Perished of Extreme Desert Sunstroke',
    subtitle: 'Stranded in Scorching Waterless Badlands',
    cause:
      'Subject departed Tortilla Flat without sufficient water during peak 116°F midsummer heat. Remains found alongside empty galvanized canteen with fractured brass cap in an unshaded boulder wash.',
    coordinates: { x: 88, y: 18, z: -180 },
    locationName: 'Arroyo Wash (140 yds South of Malapais Mountain)',
    sectorQuad: 'USGS Apache Trail Quad • Sector 3',
    elevationFt: 2950,
    goldLost: 0,
    blocksDug: 0,
    landmarksDiscovered: 2,
    timeSurvivedSeconds: 64800,
    coronerVerdict: 'Acute hyperthermia, heat stroke, and systemic dehydration.',
    preventionAdvisory: {
      heading: 'Hydration Management & Shade Preservation',
      actionRule:
        'High Sonoran solar radiation rapidly drains hydration and vigour. Regularly drink from your canteen, rest in boulder shade or ramadas, and refill water at Hieroglyphic Spring or Tortilla Flat.',
      equipmentRecommended: 'Two-Quart Wool-Covered Canteen, Wide-Brimmed Hat, Salt Tablets',
    },
  },
];

/**
 * Resolves closest known landmark and compass bearing relative to world coordinates.
 */
export function resolveLocationName(coords: { x: number; y: number; z: number }): {
  locationName: string;
  sectorQuad: string;
  elevationFt: number;
} {
  let closest = INITIAL_LANDMARKS[0];
  let minDist = Infinity;

  for (const lm of INITIAL_LANDMARKS) {
    const dist = Math.hypot(lm.position.x - coords.x, lm.position.z - coords.z);
    if (dist < minDist) {
      minDist = dist;
      closest = lm;
    }
  }

  // Calculate compass direction from landmark to death coordinates
  const dx = coords.x - closest.position.x;
  const dz = coords.z - closest.position.z;
  const angleDeg = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;

  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const dirIndex = Math.round(angleDeg / 22.5) % 16;
  const compassDir = directions[dirIndex];

  const yards = Math.round(minDist * 1.09361);
  let locationName = '';

  if (minDist < 18) {
    locationName = `At ${closest.name}`;
  } else {
    locationName = `${yards} yards ${compassDir} of ${closest.name}`;
  }

  // Determine USGS Quad
  let sectorQuad = 'USGS Weaver\'s Needle Quad • Sector 1';
  if (coords.z < -150) {
    sectorQuad = 'USGS Apache Trail & Tortilla Flat Quad • Sector 5';
  } else if (coords.z > 50) {
    sectorQuad = 'USGS Peralta Canyon & South Trailhead Quad • Sector 3';
  } else if (coords.x > 50) {
    sectorQuad = 'USGS Needle Canyon & Box Canyons Quad • Sector 2';
  } else if (coords.x < -50) {
    sectorQuad = 'USGS Hieroglyphic & Massacre Grounds Quad • Sector 4';
  }

  const baseElevation = closest.elevationFt || 2400;
  const elevationDelta = Math.round((coords.y - closest.position.y) * 3.28084);
  const elevationFt = Math.max(1700, baseElevation + elevationDelta);

  return { locationName, sectorQuad, elevationFt };
}

/**
 * Returns structured prevention advisory based on cause of death.
 */
export function getPreventionAdvisory(
  reason: CoronersLogEntry['reason'],
  details?: Partial<GameOverDetails>
): { heading: string; actionRule: string; equipmentRecommended: string } {
  switch (reason) {
    case 'fall':
      return {
        heading: 'Nocturnal Gravity & Cliff Navigation',
        actionRule:
          'Desert night visibility (19:30 - 05:30) obscures sheer cliffs, fissures, and vertical drops. Do not run or jump along unknown ridgelines in the dark. Build a campfire [C] or wait until sunrise before proceeding.',
        equipmentRecommended: 'Campfire Materials, Frontier Lantern, Sturdy Climbing Boots',
      };
    case 'cave_in':
      return {
        heading: 'Geotechnical Shoring & Overburden Control',
        actionRule:
          `Excavations reaching past 2.0m depth experience tremendous lateral soil loads. Pit rim collapses are instant and fatal. Always place Timber Shoring cribs [T] before digging deep paydirt pockets.`,
        equipmentRecommended: 'Heavy Timber Shoring Planks [T], Iron Trenching Pickaxe',
      };
    case 'dehydration':
      return {
        heading: 'Hydration & Desert Heat-Stroke Prevention',
        actionRule:
          'Midday Arizona sun drains stamina and fluid rapidly. Never let your canteen run dry. Refill at Hieroglyphic Spring, Tortilla Flat barrels, or mountain seeps. Rest in shade when vigour is low.',
        equipmentRecommended: 'Filled Frontier Canteen, Shade Ramada, Salt Tablets',
      };
    case 'bandit':
      return {
        heading: 'Hostile Claim Jumper Engagements',
        actionRule:
          'Outlaws patrol high canyons and lucrative claims. Maintain weapon awareness, keep your rifle chambered with ammo [R], and use boulders as tactical cover when ambushed.',
        equipmentRecommended: 'Winchester Repeating Rifle, .30-06 Ammo, Defensive Parapet',
      };
    case 'apache_raid':
      return {
        heading: 'Sacred Territory Respect & Vigilance',
        actionRule:
          'The sacred high summits of the Superstitions are protected by native mountain guardians. Avoid brandishing firearms near sentinels, heed warning drums, and avoid marked territorial shrines.',
        equipmentRecommended: 'Peace Token, Holstered Weapon, Retreat to Base Camp',
      };
    case 'drowning':
      return {
        heading: 'Subterranean Stope Dewatering',
        actionRule:
          'Deep mine levels breach underground water tables. Never descend into submerged stopes without powering the Cornish Steam Dewatering Pump in the Mine Shaft HUD to drain standing floodwaters.',
        equipmentRecommended: 'Cornish Steam Pump, Boiler Timber Fuel, Heavy Iron Pipe Shoring',
      };
    case 'venom':
      return {
        heading: 'Sonoran Predator Awareness',
        actionRule:
          'Rattlesnakes and scorpions hide in brush, rock crevices, and mine entrances. Listen carefully for warning rattles, stay clear of low scrub, or neutralize hostile serpents with firearms from range.',
        equipmentRecommended: 'Snakebite Antivenom, High Leather Boots, Winchester Rifle',
      };
    case 'dynamite':
      return {
        heading: 'Blasting Powder Safety Protocols',
        actionRule:
          'Dynamite detonates on a rapid fuse. Always throw blasting sticks at maximum range and sprint behind solid bedrock outcroppings before the charge fires.',
        equipmentRecommended: 'Long-Burn Blasting Fuses, Detonator Shielding',
      };
    default:
      return {
        heading: 'General Frontier Preparedness',
        actionRule:
          'Keep your health and hydration replenished, carry adequate survival tools, and document landmark bearings in Waltz\'s Journal.',
        equipmentRecommended: 'Canteen, Pickaxe, Map & Compass',
      };
  }
}

/**
 * Gets all coroner log entries from storage, merged with historical archive.
 */
export function getCoronersLog(): CoronersLogEntry[] {
  let playerEntries: CoronersLogEntry[] = [];
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      playerEntries = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse coroner log from storage:', e);
  }

  // Return player entries sorted latest first, followed by historical archive
  return [...playerEntries, ...HISTORICAL_INQUEST_ARCHIVE];
}

/**
 * Records a new player death into the persistent coroner log.
 */
export function recordCoronersLogEntry(details: GameOverDetails): CoronersLogEntry {
  let playerEntries: CoronersLogEntry[] = [];
  let expeditionCount = 1;

  try {
    const rawCount = safeLocalStorage.getItem(EXPEDITION_COUNTER_KEY);
    if (rawCount) {
      expeditionCount = Math.max(1, parseInt(rawCount, 10) + 1);
    }
    safeLocalStorage.setItem(EXPEDITION_COUNTER_KEY, expeditionCount.toString());

    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      playerEntries = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read prior coroner logs:', e);
  }

  const { locationName, sectorQuad, elevationFt } = resolveLocationName(details.coordinates);
  const advisory = getPreventionAdvisory(details.reason, details);

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const entry: CoronersLogEntry = {
    id: `death-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    expeditionNumber: expeditionCount,
    timestamp: Date.now(),
    formattedDate: dateFormatted,
    isHistoricalArchive: false,
    prospectorName: `Expedition #${expeditionCount} (Your Fallen Prospector)`,
    reason: details.reason,
    title: details.title,
    subtitle: details.subtitle,
    cause: details.cause,
    coordinates: {
      x: Math.round(details.coordinates.x * 10) / 10,
      y: Math.round(details.coordinates.y * 10) / 10,
      z: Math.round(details.coordinates.z * 10) / 10,
    },
    locationName,
    sectorQuad,
    elevationFt,
    depthMeters: details.depth,
    strata: details.strata,
    goldLost: details.goldFound || 0,
    blocksDug: details.blocksDug || 0,
    landmarksDiscovered: details.landmarksDiscovered || 0,
    timeSurvivedSeconds: details.timeSurvivedSeconds || 0,
    coronerVerdict: `Fatal frontier demise due to ${details.title.toLowerCase()}.`,
    preventionAdvisory: advisory,
  };

  // Prepend to player entries (latest first) and keep up to 30 past deaths
  playerEntries.unshift(entry);
  if (playerEntries.length > 30) {
    playerEntries = playerEntries.slice(0, 30);
  }

  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(playerEntries));
  } catch (e) {
    console.warn('Failed to persist coroner entry:', e);
  }

  return entry;
}

/**
 * Clears player-recorded coroner inquests (keeps historical archive).
 */
export function clearPlayerCoronersLog(): void {
  try {
    safeLocalStorage.removeItem(STORAGE_KEY);
    safeLocalStorage.removeItem(EXPEDITION_COUNTER_KEY);
  } catch (e) {
    console.warn('Failed to clear player coroner logs:', e);
  }
}
