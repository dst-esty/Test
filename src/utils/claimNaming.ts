import { Vector3D } from '../types';

export interface ExistingClaimLike {
  name: string;
  x?: number;
  z?: number;
  id?: string;
}

interface LandmarkAnchor {
  name: string;
  x: number;
  z: number;
  templates: string[];
}

const LANDMARK_ANCHORS: LandmarkAnchor[] = [
  {
    name: "Weaver's Needle",
    x: 80,
    z: 15,
    templates: [
      "Weaver's Needle Lode",
      "Weaver's Placer Claim",
      "Needle Spire Bench",
      "Basalt Spire Bonanza",
      "Peralta Needle Claim",
    ],
  },
  {
    name: 'Hieroglyphic Spring',
    x: -70,
    z: -20,
    templates: [
      'Hieroglyphic Canyon Wash',
      'Petroglyph Oasis Lode',
      'Hieroglyphic Basin Claim',
      'Spring Water Gulch Placer',
      'Ancient Glyphs Bench',
    ],
  },
  {
    name: 'Peralta Trailhead',
    x: -120,
    z: -120,
    templates: [
      'Peralta Trail Gulch Claim',
      'Trailhead Canyon Lode',
      'Don’s Creek Placer',
      'Western Pass Bonanza',
      'Peralta Bench Claim',
    ],
  },
  {
    name: '1848 Peralta Massacre Grounds',
    x: -40,
    z: 90,
    templates: [
      'Massacre Ridge Lode',
      '1848 Peralta Strike',
      'Silver Cross Gulch Claim',
      'Spanish Retribution Bench',
      'Lost Vaquero Placer',
    ],
  },
  {
    name: "Jacob Waltz's Dugout",
    x: 30,
    z: -90,
    templates: [
      "Waltz's Hidden Bench",
      'Old Dutchman Drift Claim',
      "Jacob's Secret Lode",
      'Dugout Canyon Placer',
      'Waltz Ridge Bonanza',
    ],
  },
  {
    name: "Dutchman's Lost Mine Ridge",
    x: 155,
    z: 105,
    templates: [
      'Dutchman Ridge Discovery',
      'Lost Dutchman Lode',
      'Peralta Mother Lode',
      'Ridgecrest Quartz Claim',
      'Golden Crown Bonanza',
    ],
  },
  {
    name: 'Tortilla Flat',
    x: 0,
    z: -246,
    templates: [
      'Tortilla Wash Claim',
      'Salt River Bench Lode',
      'Stagecoach Gulch Placer',
      'Flatland Creek Claim',
      'Apache Trail Bonanza',
    ],
  },
  {
    name: 'Malapais Mountain',
    x: 95,
    z: -205,
    templates: [
      'Malapais Basalt Lode',
      'Black Crest Mountain Claim',
      'Malapais Summit Strike',
      'Volcanic Cap Placer',
      'Eastern Wilderness Bench',
    ],
  },
  {
    name: 'Pistol Canyon',
    x: -46,
    z: -130,
    templates: [
      'Pistol Canyon Gorge Claim',
      'Apache Tears Quartz Claim',
      'Outlaw Hollow Lode',
      'Gunsmoke Arroyo Placer',
      'Pistol Creek Bench',
    ],
  },
  {
    name: 'Peters Mesa',
    x: -105,
    z: -155,
    templates: [
      'Peters Mesa Basalt Lode',
      'Peter Henderson Old Pasture Claim',
      'High Tableland Bonanza',
      'Peters Rim Quartz Placer',
      'Western Mesa Bench Claim',
    ],
  },
  {
    name: 'Peters Canyon',
    x: -155,
    z: -160,
    templates: [
      'Peters Canyon Wash Placer',
      'Canyon Lake Drainage Lode',
      'Salt River Gateway Claim',
      'Peters Gulch Alluvial Diggings',
      'Red Rim Gulch Claim',
    ],
  },
  {
    name: 'Black Rock Gulch',
    x: -115,
    z: 145,
    templates: [
      'Black Rock Quartz Lode',
      'Black Rock Gulch Claim',
      'Darkstone Wash Placer',
      'Obsidian Canyon Lode',
      'Black Ridge Bonanza',
    ],
  },
];

const WILDERNESS_TEMPLATES_HIGH: string[] = [
  'Superstition Peak Strike',
  'Geronimo Ridge Lode',
  'Eagle Eye Mountain Claim',
  'Cloud Crest Bonanza',
  'Thunder Mountain Placer',
  'Red Butte Gold Claim',
  'Apache Pass Quartz Lode',
  'Highland Mesa Strike',
];

const WILDERNESS_TEMPLATES_LOW: string[] = [
  'Dry Wash Placer Claim',
  'Cactus Basin Gulch',
  'Ironwood Arroyo Claim',
  'Cholla Canyon Lode',
  'Saguaro Ridge Strike',
  'Goldfield Wash Placer',
  'Desert Arroyo Bonanza',
  'Prickly Pear Bench Lode',
  'Palo Verde Gulch Claim',
  'Coyote Wash Placer',
];

/**
 * Generates an authentic, geographic, and unique mining claim name based on the staking location.
 * Takes existing registered claims into account so it never duplicates an existing name.
 */
export function generateContextualClaimName(
  pos: Vector3D | { x: number; y?: number; z: number },
  existingClaims: ExistingClaimLike[] = []
): string {
  const existingNames = new Set(
    existingClaims.map((c) => (c.name ? c.name.toLowerCase().trim() : ''))
  );

  const px = pos.x;
  const pz = pos.z;
  const py = pos.y ?? 0;

  // 1. Find nearest landmark anchor
  let nearestAnchor: LandmarkAnchor | null = null;
  let nearestDist = Infinity;

  for (const anchor of LANDMARK_ANCHORS) {
    const dist = Math.hypot(anchor.x - px, anchor.z - pz);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestAnchor = anchor;
    }
  }

  const candidateList: string[] = [];

  // Proximity threshold: 140 meters from known landmark
  if (nearestAnchor && nearestDist < 140) {
    candidateList.push(...nearestAnchor.templates);
  }

  // Add terrain elevation context
  if (py > 42) {
    candidateList.push(...WILDERNESS_TEMPLATES_HIGH);
  } else {
    candidateList.push(...WILDERNESS_TEMPLATES_LOW);
  }

  // Shuffle slightly based on coordinates for determinism yet variety
  const seed = Math.abs(Math.round(px * 13 + pz * 37 + py * 7));
  const pool = [...candidateList];

  // Try picking a base candidate name that has not been used yet
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(seed + i) % pool.length];
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // If base candidates exist, append number suffix (#1, #2, #3, ...)
  const primaryBase = pool[seed % pool.length] || 'Superstition Ridge Claim';
  for (let num = 1; num <= 99; num++) {
    const numbered = `${primaryBase} #${num}`;
    if (!existingNames.has(numbered.toLowerCase())) {
      return numbered;
    }
  }

  return `${primaryBase} #${Math.floor(Math.random() * 900 + 100)}`;
}
