import * as THREE from 'three';
import { DebrisType } from '../types';

// Simplex-like 2D noise implementation for self-contained, high-performance procedural terrain
function fract(x: number) {
  return x - Math.floor(x);
}

function hash(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return fract(h);
}

function smoothNoise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fX = fract(x);
  const fY = fract(y);

  // Smooth interpolation curve
  const u = fX * fX * (3.0 - 2.0 * fX);
  const v = fY * fY * (3.0 - 2.0 * fY);

  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);

  return a * (1 - u) * (1 - v) +
         b * u * (1 - v) +
         c * (1 - u) * v +
         d * u * v;
}

function fbm(x: number, y: number, octaves = 5): number {
  let v = 0.0;
  let a = 0.5;
  let shift = 100.0;
  for (let i = 0; i < octaves; ++i) {
    v += a * smoothNoise(x, y);
    x = x * 2.0 + shift;
    y = y * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

export interface DugHole {
  id: string;
  x: number;
  z: number;
  depth: number;
  radius: number;
  excavationCount: number;
  createdAt: number;
  maxLayerReached?: number;
  lastStrataName?: string;
  // Geotechnical pit wall stability, overburden slumping & shoring
  stability: number; // 0 to 100% (decreases with depth if not reinforced)
  isShored: boolean; // True when timber cribbing and walers actively support current depth
  shoredUntilDepth?: number; // Depth (meters) up to which the current timber framing protects
  totalSlumpedDepth?: number;
  lastSlumpTime?: number;
  shoringMesh?: THREE.Group;
}

export const WORLD_SIZE = 700;
export const TERRAIN_SEGMENTS = 240;
export const TERRAIN_VERTICES_PER_ROW = TERRAIN_SEGMENTS + 1;
export const HALF_WORLD_SIZE = WORLD_SIZE / 2;
export const TERRAIN_SEG_SIZE = WORLD_SIZE / TERRAIN_SEGMENTS;

export const activeDugHoles: DugHole[] = [];
let activeTerrainMesh: THREE.Mesh | null = null;
let activeTerrainHoleListener: ((hole: DugHole) => void) | null = null;

export function setTerrainHoleListener(listener: ((hole: DugHole) => void) | null) {
  activeTerrainHoleListener = listener;
}

/**
 * Calculates the pristine, undisturbed procedural elevation of the Superstition Mountains terrain at (x, z).
 */
export function getBaseTerrainHeight(x: number, z: number): number {
  // Canyon valley & ridge systems
  const scale1 = 0.008;
  const broadRidges = fbm(x * scale1, z * scale1, 4) * 36;

  // Rugged red rock strata & mesas
  const scale2 = 0.024;
  const rockyCrags = Math.pow(fbm(x * scale2 + 50, z * scale2 + 50, 3), 1.7) * 24;

  // Geological stepped cliff-and-bench terracing (resistant caprock & sandstone ledges)
  let rawElev = broadRidges + rockyCrags;
  if (rawElev > 6.0) {
    const terraceStep = 5.2;
    const terraceBlend = Math.min(1.0, (rawElev - 6.0) / 10.0);
    const step = Math.floor(rawElev / terraceStep);
    const frac = (rawElev % terraceStep) / terraceStep;
    // Smooth Hermite blend creates continuous cliff drop-offs and broad plateau shelves without sharp polygon creases
    const sCurve = frac * frac * (3.0 - 2.0 * frac);
    const terraced = step * terraceStep + (frac * 0.35 + sCurve * 0.65) * terraceStep;
    rawElev = rawElev * (1.0 - terraceBlend * 0.55) + terraced * (terraceBlend * 0.55);
  }

  // 4. RICH CANYON NETWORK: Multiple Interconnected & Characterful Canyons
  // (All with sheer sidewalls and navigable, smooth alluvial canyon floors)

  // Canyon A: Peralta & Hieroglyphic Canyon Gorge (Southwest)
  // Winding canyon pass from Peralta Trailhead (-120, -120) through Hieroglyphic Spring (-70, -20) to Massacre Grounds (-40, 90)
  const peraltaCanyonX = -74 + Math.sin(z * 0.018 - 0.4) * 28 + Math.cos(z * 0.009) * 14;
  const distToPeralta = Math.abs(x - peraltaCanyonX);
  let peraltaCarve = 0;
  if (distToPeralta < 28 && z > -150 && z < 140 && x < 15) {
    const factor = 1.0 - distToPeralta / 28;
    peraltaCarve = -Math.pow(factor, 0.48) * 15.0;
  }

  // Canyon B: Needle Canyon Gorge & East Chasm (East of Weaver's Needle towards Mine)
  // Sweeps east of Weaver's Needle (80, 15) and winds between Eye Bluff and Lost Dutchman approach
  const needleCanyonX = 118 + Math.sin(z * 0.024 + 0.6) * 30 + Math.cos(z * 0.01) * 16;
  const distToNeedleCanyon = Math.abs(x - needleCanyonX);
  let needleCanyonCarve = 0;
  if (distToNeedleCanyon < 28 && z > -90 && z < 155 && x > 35) {
    const factor = 1.0 - distToNeedleCanyon / 28;
    needleCanyonCarve = -Math.pow(factor, 0.52) * 16.5;
  }

  // Canyon C: Rattlesnake Slot Canyon (Central Narrows)
  // A tight, deep winding slot canyon cutting across the central red-rock ridge
  const slotCanyonZ = -54 + Math.sin(x * 0.038 + 0.8) * 16 + Math.cos(x * 0.018) * 8;
  const distToSlot = Math.abs(z - slotCanyonZ);
  let slotCarve = 0;
  if (distToSlot < 16 && x > -45 && x < 55) {
    const factor = 1.0 - distToSlot / 16;
    slotCarve = -Math.pow(factor, 0.4) * 13.0;
  }

  // Canyon D: Historic Box Canyon & East Gulch (Main Central-North Gorge)
  const canyonCurve = Math.sin(x * 0.013 + 0.9) * 38 + Math.cos(x * 0.006) * 20;
  const distToCanyon = Math.abs(z - canyonCurve);
  let centralCanyonCarve = 0;
  if (distToCanyon < 26 && Math.abs(x) < 210 && z > -165) {
    const cFactor = 1.0 - distToCanyon / 26;
    centralCanyonCarve = -Math.pow(cFactor, 0.55) * 13.5;
  }

  // Canyon E: Black Cross Box Canyon Amphitheater (Southeast Cleft, near Mine)
  const distToAmphitheater = Math.hypot(x - 165, z - 145);
  let amphitheaterCarve = 0;
  if (distToAmphitheater < 34) {
    const factor = 1.0 - distToAmphitheater / 34;
    amphitheaterCarve = -Math.pow(factor, 0.6) * 14.5;
  }

  // Canyon F: Fish Creek Canyon Tributary (Northwest Gorge cutting toward Salt River)
  const fishCreekCurve = -200 + Math.sin(x * 0.02 + 1.2) * 24 + (x + 90) * 0.65;
  const distToFishCreek = Math.abs(z - fishCreekCurve);
  let fishCreekCarve = 0;
  if (distToFishCreek < 24 && x < -45 && z < -170 && z > -290) {
    const factor = 1.0 - distToFishCreek / 24;
    fishCreekCarve = -Math.pow(factor, 0.55) * 15.0;
  }

  // Canyon G: Pistol Canyon (Historic box canyon tributary between Peters Mesa & Malapais Mountain)
  // Famous site where Dutch Hunter Roy Bradford lost his revolver in the 1920s while searching for the Lost Dutchman Mine
  const pistolCanyonX = -46 + Math.sin(z * 0.026 - 1.1) * 20 + Math.cos(z * 0.012) * 9;
  const distToPistolCanyon = Math.abs(x - pistolCanyonX);
  let pistolCanyonCarve = 0;
  if (distToPistolCanyon < 25 && z < -60 && z > -190 && x > -92 && x < 5) {
    const factor = 1.0 - distToPistolCanyon / 25;
    pistolCanyonCarve = -Math.pow(factor, 0.52) * 15.5;
  }

  // Combined Canyon Carving
  const totalCanyonCarve = Math.min(
    0,
    peraltaCarve + needleCanyonCarve + slotCarve + centralCanyonCarve + amphitheaterCarve + fishCreekCarve + pistolCanyonCarve
  );

  // 5. Wash / arroyo carving: dry riverbeds, alluvial fans, and gravel drainage
  const wash1 = Math.sin(x * 0.015 + z * 0.01) * Math.cos(z * 0.012 - x * 0.008);
  const wash2 = Math.sin(x * 0.028 - z * 0.02) * Math.cos(x * 0.018 + z * 0.015);
  const arroyo = Math.abs(wash1) * -6.0 + Math.max(0, wash2) * -3.5;

  // 6. Superstition Massif mountain ranges & endless Arizona desert frontier
  // Features rich geomorphic mountain archetypes across different compass headings:
  // - Northwest: Flat-topped Peters Mesa & Tablelands (horizontal basalt caprock with sheer cliffs)
  // - South: Serrated Knife-Edge Volcanic Arêtes & Sawtooth Peaks
  // - East: Asymmetric Fault-Block Monoclines & Cuestas (tilted dip-slopes with 45m fault scarps)
  // - West: Stepped Dacite Domes & Resurgent Buttes
  // - Mountain Passes & Saddles (Fremont Saddle, Terrapin Pass, Peralta Pass, Bluff Springs Gap)
  const distFromCenter = Math.hypot(x, z);
  let perimeterMountains = 0;
  if (distFromCenter > 200) {
    const angle = Math.atan2(z, x); // -PI to +PI

    // Archetype 1: Peters Mesa & Flat-Topped Tablelands (Northwest / North-Northwest)
    const mesaNoise = fbm(x * 0.012 + 25.5, z * 0.012 + 64.2, 3);
    let mesaElev = 0;
    if (mesaNoise > 0.46) {
      const mFrac = (mesaNoise - 0.46) / 0.54;
      const mesaTop = Math.min(1.0, Math.pow(mFrac * 2.2, 0.45));
      mesaElev = mesaTop * 38.0 + Math.sin(x * 0.025 + z * 0.025) * 1.5;
    }

    // Archetype 2: Knife-Edge Volcanic Arêtes & Serrated Spires (South / Southeast)
    const sharpArête = Math.pow(1.0 - Math.abs(fbm(x * 0.018 + 75, z * 0.018 + 75, 4) * 2.0 - 1.0), 1.6) * 44;
    const jaggedTeeth = Math.pow(fbm(x * 0.032 + 180, z * 0.032 + 180, 4), 2.1) * 38;
    const serratedElev = sharpArête * 0.65 + jaggedTeeth * 0.55 + 16.0;

    // Archetype 3: Asymmetric Fault-Block Monoclines & Cuestas (East)
    const dipRamp = Math.sin((x - 140) * 0.018 - z * 0.008);
    const cuestaFactor = Math.max(0, dipRamp);
    const faultScarp = Math.pow(cuestaFactor, 1.8) * 48 + fbm(x * 0.022, z * 0.022, 3) * 14;

    // Archetype 4: Stepped Volcanic Dacite Domes & Buttes (West / Southwest)
    const domeNoise = Math.pow(fbm(x * 0.015 - 45, z * 0.015 - 45, 4), 1.7) * 44;
    const steppedDome = Math.floor(domeNoise / 6.5) * 6.5 + Math.min(6.0, (domeNoise % 6.5) * 1.7);

    // Directional blending of mountain archetypes
    const wNW = Math.max(0, Math.cos(angle - (-2.35)));
    const wS = Math.max(0, Math.cos(angle - 1.57));
    const wE = Math.max(0, Math.cos(angle - 0.2));
    const wW = Math.max(0, Math.cos(angle - (-1.2)));
    const totalW = (wNW + wS + wE + wW) || 1.0;

    const blendedMountainArchetype =
      (mesaElev * wNW + serratedElev * wS + faultScarp * wE + steppedDome * wW) / totalW;

    // Endless procedural mountain chains & broad desert passes
    const mountainChains = Math.pow(fbm(x * 0.005 + 12.3, z * 0.005 + 87.1, 4), 1.7) * 44;
    const valleyPasses = Math.min(1.0, Math.max(0.15, fbm(x * 0.003 - 45.2, z * 0.003 + 33.8, 3) * 1.5));

    if (distFromCenter <= 340) {
      // The iconic historic Superstition Massif rim encircling the central wilderness
      const pDist = (distFromCenter - 200) / 140;
      const rimFactor = Math.sin(pDist * (Math.PI * 0.5));
      perimeterMountains = rimFactor * Math.min(62, 22 + blendedMountainArchetype);
    } else {
      // Smooth transition into the endless Sonoran wilderness mountain ranges and valleys
      const tEndless = Math.min(1.0, (distFromCenter - 340) / 120);
      const rimElevation = Math.min(62, 22 + blendedMountainArchetype);
      const endlessElevation = (16 + blendedMountainArchetype * 0.6 + mountainChains) * valleyPasses;
      perimeterMountains = rimElevation * (1.0 - tEndless) + Math.min(66, endlessElevation) * tEndless;
    }

    // Authentic Mountain Passes & Wind Gaps (carved saddles allowing trail exploration):
    let passCarveFactor = 1.0;

    // 1. Fremont Saddle (South Pass, x: 30, z: 220):
    const distFremont = Math.hypot(x - 30, z - 220);
    if (distFremont < 36) {
      const f = 1.0 - distFremont / 36;
      passCarveFactor = Math.min(passCarveFactor, Math.max(0.20, 1.0 - f * 0.80));
    }

    // 2. Terrapin Pass (East Pass, x: 210, z: -10):
    const distTerrapin = Math.hypot(x - 210, z - (-10));
    if (distTerrapin < 34) {
      const f = 1.0 - distTerrapin / 34;
      passCarveFactor = Math.min(passCarveFactor, Math.max(0.22, 1.0 - f * 0.78));
    }

    // 3. Peralta Pass (Southwest Pass, x: -160, z: 120):
    const distPeraltaPass = Math.hypot(x - (-160), z - 120);
    if (distPeraltaPass < 36) {
      const f = 1.0 - distPeraltaPass / 36;
      passCarveFactor = Math.min(passCarveFactor, Math.max(0.22, 1.0 - f * 0.78));
    }

    // 4. Bluff Springs Gap (West Pass, x: -190, z: -20):
    const distBluffPass = Math.hypot(x - (-190), z - (-20));
    if (distBluffPass < 34) {
      const f = 1.0 - distBluffPass / 34;
      passCarveFactor = Math.min(passCarveFactor, Math.max(0.24, 1.0 - f * 0.76));
    }

    perimeterMountains *= passCarveFactor;

    // Accessible Mountain Summit Trail Ramps & Plateau Saddles:
    // 1. Peters Mesa Summit Pack Trail (NW): Gentle switchback ramp from Peralta Pass (x: -160, z: 120)
    //    climbing up onto the broad, flat basalt tableland (x: -210, z: 170)
    const distToPetersTrail = Math.hypot(x - (-185), z - 145);
    if (distToPetersTrail < 32) {
      const trailT = 1.0 - distToPetersTrail / 32;
      const targetElev = 16.0 + (-(x - (-160)) * 0.42 + (z - 120) * 0.38);
      perimeterMountains = perimeterMountains * (1.0 - trailT * 0.72) + Math.min(38, targetElev) * (trailT * 0.72);
    }

    // 2. Fremont Ridge Crest Trail (South): Gentle arête trail from Fremont Saddle (x: 30, z: 220)
    //    ascending to the southern panoramic summit lookout (x: 65, z: 235)
    const distToFremontRidge = Math.hypot(x - 48, z - 228);
    if (distToFremontRidge < 26) {
      const ridgeT = 1.0 - distToFremontRidge / 26;
      const targetElev = 18.0 + (x - 30) * 0.65;
      perimeterMountains = perimeterMountains * (1.0 - ridgeT * 0.65) + Math.min(42, targetElev) * (ridgeT * 0.65);
    }

    // 3. Eastern Escarpment Rim Trail (East): Ascends from Terrapin Pass (x: 210, z: -10)
    //    up to the high fault-block scarp rim (x: 235, z: 20)
    const distToEastRim = Math.hypot(x - 222, z - 8);
    if (distToEastRim < 25) {
      const rimT = 1.0 - distToEastRim / 25;
      const targetElev = 17.0 + (x - 210) * 0.75;
      perimeterMountains = perimeterMountains * (1.0 - rimT * 0.65) + Math.min(44, targetElev) * (rimT * 0.65);
    }

    // 4. Western Dacite Butte Trail (West): Step-ramp ascending from Bluff Springs Gap (x: -190, z: -20)
    //    up to the weathered volcanic summit (x: -225, z: -20)
    const distToWestButte = Math.hypot(x - (-208), z - (-20));
    if (distToWestButte < 25) {
      const butteT = 1.0 - distToWestButte / 25;
      const targetElev = 18.0 + (-(x - (-190))) * 0.68;
      perimeterMountains = perimeterMountains * (1.0 - butteT * 0.65) + Math.min(40, targetElev) * (butteT * 0.65);
    }

    // Apache Trail Mountain Pass & Northern Salt River Basin opening:
    // Carves an authentic canyon gap connecting Superstition Wilderness to the Salt River
    if (z < -160 && distFromCenter < 380) {
      if (Math.abs(x) < 40 && z >= -225) {
        // Stagecoach pass through perimeter mountains from the south
        const passCarve = 1.0 - Math.abs(x) / 40;
        perimeterMountains *= Math.max(0.02, 1.0 - passCarve * 0.96);
      } else if (Math.abs(x) < 55 && z < -220 && z >= -286) {
        // Broad, completely clear canyon basin for the Tortilla Flat settlement
        const valleyCarve = Math.max(0, 1.0 - Math.abs(x) / 55);
        perimeterMountains *= (1.0 - valleyCarve);
      } else if (z < -286) {
        // Northern Salt River canyon basin opening
        perimeterMountains *= 0.08;
      }
    }
  }

  // Special landmark features:
  // 1. Weaver's Needle base hill (prominent volcanic plug pedestal)
  const distToNeedle = Math.hypot(x - 80, z - 15);
  let needleBase = 0;
  if (distToNeedle < 55) {
    needleBase = Math.pow((55 - distToNeedle) / 55, 1.6) * 28;
  }

  // 2. Hieroglyphic canyon wash (oasis depression with pool)
  const distToSpring = Math.hypot(x - (-70), z - (-20));
  let springDepression = 0;
  if (distToSpring < 25) {
    springDepression = -Math.max(0, (25 - distToSpring) * 0.35);
  }

  // 3. Trailhead gentle clearing
  const distToTrailhead = Math.hypot(x - (-120), z - (-120));
  let trailheadFlatten = 1.0;
  if (distToTrailhead < 28) {
    trailheadFlatten = Math.min(1.0, distToTrailhead / 28);
  }

  // 4. Lost Dutchman Mine box canyon cliff face
  const distToMine = Math.hypot(x - 160, z - 110);
  let mineRidge = 0;
  if (distToMine < 50) {
    mineRidge = Math.sin(Math.atan2(z - 110, x - 160) * 2) * 5 + 6;
  }

  // 5. The Grand Salt River Canyon Gorge (runs east-to-west across northern expanse, positioned north of town ~ -305)
  const saltRiverZ = -305 + Math.sin(x * 0.016) * 9.0 + Math.cos(x * 0.008) * 5.0;
  const distToSaltRiver = Math.abs(z - saltRiverZ);
  let saltRiverCarve = 0;
  if (distToSaltRiver < 28 && z < -282) {
    const canyonFactor = 1.0 - distToSaltRiver / 28;
    // Carve deep sheer canyon walls down to smooth riverbed
    saltRiverCarve = -Math.pow(canyonFactor, 0.75) * 14.0;
  }

  // Sheer towering northern canyon cliffs on the north wall of the Salt River
  let northCanyonWall = 0;
  if (z < -318) {
    const wallDist = Math.min(1.0, (-z - 318) / 30);
    const wallNoise = Math.pow(fbm(x * 0.022 + 200, z * 0.022 + 200, 3), 1.5) * 20;
    northCanyonWall = wallDist * (26 + wallNoise);
  }

  // 6. Historic Town of Tortilla Flat level river terrace on the south bank of the Salt River
  // Encompasses Saloon, Mercantile, Jail, Livery Barn, Water Tower, Campfire, Street & Boardwalks.
  // Core flat box: X: [-27, +27], Z: [-275, -225]. Entire core is strictly 7.5m with zero mountain slope.
  let tortillaFlatBlend = 0;
  let isRiverTrail = false;
  let riverTrailTarget = 7.5;

  if (z >= -275 && z <= -225 && Math.abs(x) <= 27) {
    tortillaFlatBlend = 1.0;
  } else if (z < -275 && z >= -306 && Math.abs(x) <= 16) {
    // Gentle scenic wagon trail sloping down from town (7.5m) to Salt River Pier (2.8m)
    isRiverTrail = true;
    const trailT = Math.min(1.0, ((-275) - z) / 30);
    riverTrailTarget = 7.5 * (1.0 - trailT) + 2.8 * trailT;
    tortillaFlatBlend = 1.0;
  } else {
    const dxBox = Math.max(0, Math.abs(x) - 27);
    let dzBox = 0;
    if (z > -225) {
      dzBox = z - (-225);
    } else if (z < -275) {
      dzBox = (-275) - z;
    }
    const distToTownBox = Math.hypot(dxBox, dzBox);
    if (distToTownBox < 26) {
      const t = distToTownBox / 26;
      // Smooth Hermite S-curve
      tortillaFlatBlend = 1.0 - (t * t * (3 - 2 * t));
    }
  }

  // 7. Malapais Mountain Massif (USGS Elev. 4,229 ft / 1,289m - Historic "Black Mountain")
  // Prominent towering volcanic basalt/dacite mountain north of Weaver's Needle (80, 15) & east of Pistol Canyon (-46, -130)
  // Perfectly matches the USGS Weavers Needle 7.5-minute topographic quadrangle!
  const distToMalapais = Math.hypot(x - 95, z - (-155));
  let malapaisElevation = 0;
  if (distToMalapais < 75) {
    const mFrac = 1.0 - distToMalapais / 75;
    // Base mountain dome slope (smooth Hermite curve)
    const baseDome = Math.pow(mFrac, 1.4) * 38.0;
    // Stepped volcanic caprock (Malpaís black basalt plateau cap, elev. up to ~62m)
    const capNoise = fbm(x * 0.024 + 115, z * 0.024 + 115, 3);
    let caprock = 0;
    if (mFrac > 0.32) {
      const capFrac = (mFrac - 0.32) / 0.68;
      caprock = Math.pow(capFrac, 0.62) * (22.0 + capNoise * 5.0);
    }
    // Southwest volcanic ridgeline trail (natural walkable ramp from the pass allowing scrambling to summit plateau)
    const ridgeDist = Math.hypot(x - (95 - (1.0 - mFrac) * 38), z - (-155 + (1.0 - mFrac) * 28));
    const ridgeRamp = Math.max(0, 1.0 - ridgeDist / 20.0) * 8.5;

    malapaisElevation = baseDome + caprock + ridgeRamp;
  }

  let rawHeight =
    (rawElev + totalCanyonCarve + arroyo + needleBase + springDepression + mineRidge + saltRiverCarve) *
      trailheadFlatten +
    perimeterMountains * (totalCanyonCarve < -1 ? Math.max(0.08, 1.0 + totalCanyonCarve / 18.0) : 1.0) +
    northCanyonWall +
    malapaisElevation;

  // Level out the Tortilla Flat town terrace smoothly to an elevated, dry 7.5m (or sloping river trail)
  if (tortillaFlatBlend > 0) {
    const targetH = isRiverTrail ? riverTrailTarget : 7.5;
    rawHeight = rawHeight * (1.0 - tortillaFlatBlend) + targetH * tortillaFlatBlend;
  }

  return Math.max(0.6, rawHeight);
}

/**
 * Calculates the exact elevation of the terrain at (x, z), factoring in any physical dug holes or berms.
 * Impermeable bedrock basement prevents any hole from punching through the world floor or out the other side.
 */
export function getTerrainHeight(x: number, z: number): number {
  let h = getBaseTerrainHeight(x, z);

  for (let i = 0; i < activeDugHoles.length; i++) {
    const hole = activeDugHoles[i];
    const dist = Math.hypot(x - hole.x, z - hole.z);

    // Smooth, continuous excavation collar pit on 2D heightfield mesh:
    // Surface collar depth gently sinks to ~2.2m (the collar staging bench), while the vertical shaft descends down to underground layers.
    // The influence radius spans 5.8m+ to cover multiple grid vertices smoothly, with continuous cosine-squared falloff to eliminate mesh tearing.
    const collarDepth = Math.min(2.2, Math.max(0.2, hole.depth * 0.55 + 0.15));
    const collarRadius = Math.max(5.8, (hole.radius || 2.0) * 2.2);

    if (dist < collarRadius) {
      const norm = dist / collarRadius;
      // Cosine-squared curve guarantees horizontal tangent at center (norm=0) and perimeter (norm=1)
      const factor = Math.cos(norm * Math.PI * 0.5);
      const depression = collarDepth * (factor * factor);
      h -= depression;

      // Subtle excavated dirt spoil berm around perimeter rim
      if (dist > collarRadius * 0.75) {
        const rimPhase = (dist - collarRadius * 0.75) / (collarRadius * 0.25);
        const rimMound = Math.sin(rimPhase * Math.PI) * (collarDepth * 0.08);
        h += rimMound;
      }
    }
  }

  // Clamped so surface mining can never puncture through the world bedrock floor or tear geometry
  return Math.max(2.5, h);
}

export interface GeologicalLayer {
  index: number;
  id: string;
  name: string;
  strata: string;
  minDepth: number;
  maxDepth: number;
  rockType: 'dirt' | 'calcite' | 'sandstone' | 'granite' | 'quartz_gold';
  debrisType: DebrisType;
  color: number;
  vertexColor: [number, number, number];
  hardness: number; // 1: loose sand/dirt, 2: caliche, 3: volcanic tuff, 4: banded gneiss, 5: granite bedrock, 6: bonanza quartz
  shoringRequirement: 'heavy' | 'moderate' | 'minimal' | 'none';
  stabilityFactor: number; // 0.25 (sand) to 1.0 (granite/bonanza)
  description: string;
  shoringAdvice: string;
}

export const GEOLOGICAL_STRATA_LAYERS: GeologicalLayer[] = [
  {
    index: 0,
    id: 'strata_sand',
    name: 'Desert Dune Sand & Wash Gravel',
    strata: 'Loose Quaternary Aeolian Sand & Wash Alluvium',
    minDepth: 0.0,
    maxDepth: 1.4,
    rockType: 'dirt',
    debrisType: 'dirt',
    color: 0xc89e67,
    vertexColor: [0.78, 0.62, 0.40],
    hardness: 1,
    shoringRequirement: 'heavy',
    stabilityFactor: 0.20,
    description: 'Loose, shifting silica sand and dry wash gravel. Prone to swift sidewall slumping unless shored with wooden timber lagging.',
    shoringAdvice: '⚠️ High Sand Slump Risk! Install wooden timber shoring with dense pine lagging boards to prevent sand cave-in.',
  },
  {
    index: 1,
    id: 'strata_caliche',
    name: 'Desert Caliche Hardpan (Duricrust)',
    strata: 'Chalky Calcite Cemented Carbonate Crust',
    minDepth: 1.4,
    maxDepth: 2.8,
    rockType: 'calcite',
    debrisType: 'calcite',
    color: 0xede4d4,
    vertexColor: [0.72, 0.70, 0.62],
    hardness: 2,
    shoringRequirement: 'moderate',
    stabilityFactor: 0.65,
    description: 'Dense calcium carbonate duricrust. Moderately cohesive; requires timber sets past 2.2m depth.',
    shoringAdvice: 'Moderate stability. Timber sets recommended beyond 2.2m depth.',
  },
  {
    index: 2,
    id: 'strata_tuff',
    name: 'Superstition Volcanic Tuff & Welded Ash',
    strata: 'Welded Rhyolite Volcanic Ash-Flow Tuff',
    minDepth: 2.8,
    maxDepth: 5.5,
    rockType: 'sandstone',
    debrisType: 'sandstone',
    color: 0x9e8874,
    vertexColor: [0.60, 0.52, 0.44],
    hardness: 3,
    shoringRequirement: 'minimal',
    stabilityFactor: 0.88,
    description: 'Consolidated volcanic ash-flow tuff from ancient Superstition calderas. Solid, cohesive rock requiring minimal timber shoring.',
    shoringAdvice: '🌋 Competent volcanic rock; naturally arched and self-supporting with minimal shoring needed.',
  },
  {
    index: 3,
    id: 'strata_gneiss',
    name: 'Banded Gneiss & Metamorphic Schist',
    strata: 'Precambrian Foliated Crystalline Gneiss',
    minDepth: 5.5,
    maxDepth: 8.5,
    rockType: 'granite',
    debrisType: 'granite',
    color: 0x48494c,
    vertexColor: [0.28, 0.29, 0.31],
    hardness: 4,
    shoringRequirement: 'minimal',
    stabilityFactor: 0.96,
    description: 'Ancient Precambrian banded quartz-feldspar gneiss. Extremely rigid structural bedrock that holds high vertical faces without shoring.',
    shoringAdvice: '💎 High compressive shear strength; very stable bedrock requiring little to no shoring.',
  },
  {
    index: 4,
    id: 'strata_granite',
    name: 'Peralta Granodiorite & Granite Bedrock',
    strata: 'Massive Crystalline Igneous Pluton',
    minDepth: 8.5,
    maxDepth: 13.0,
    rockType: 'granite',
    debrisType: 'granite',
    color: 0x363433,
    vertexColor: [0.21, 0.20, 0.20],
    hardness: 5,
    shoringRequirement: 'none',
    stabilityFactor: 1.0,
    description: 'Massive plutonic granite bedrock. Compressive strength exceeds 22,000 PSI; 100% self-supporting subterranean rock walls with zero slump risk.',
    shoringAdvice: '🛡️ Rock-solid crystalline granite. Zero shoring needed; self-supporting bedrock caverns.',
  },
  {
    index: 5,
    id: 'strata_bonanza',
    name: 'Hydrothermal Quartz Gold Chimney',
    strata: 'Native Gold Wire in Crystalline Quartz Vein',
    minDepth: 13.0,
    maxDepth: 25.0,
    rockType: 'quartz_gold',
    debrisType: 'quartz',
    color: 0xf5df65,
    vertexColor: [0.96, 0.88, 0.40],
    hardness: 6,
    shoringRequirement: 'none',
    stabilityFactor: 1.0,
    description: 'Legendary hydrothermal quartz bonanza vein glittering with native wire gold and tellurides.',
    shoringAdvice: 'Native gold bonanza in competent quartz bedrock. 100% self-supporting.',
  },
];

export function getGeologicalLayerAtDepth(depth: number): GeologicalLayer {
  for (let i = GEOLOGICAL_STRATA_LAYERS.length - 1; i >= 0; i--) {
    if (depth >= GEOLOGICAL_STRATA_LAYERS[i].minDepth) {
      return GEOLOGICAL_STRATA_LAYERS[i];
    }
  }
  return GEOLOGICAL_STRATA_LAYERS[0];
}

export function getTerrainExcavationDepthAt(x: number, z: number): { depth: number; layer: GeologicalLayer; hole?: DugHole } {
  let closestHole: DugHole | undefined;
  let maxLocalDepth = 0;

  for (const hole of activeDugHoles) {
    const dist = Math.hypot(x - hole.x, z - hole.z);
    if (dist < hole.radius) {
      const norm = dist / hole.radius;
      const depression = hole.depth * (1.0 - norm * norm);
      if (depression > maxLocalDepth) {
        maxLocalDepth = depression;
        closestHole = hole;
      }
    }
  }

  return {
    depth: maxLocalDepth,
    layer: getGeologicalLayerAtDepth(maxLocalDepth),
    hole: closestHole,
  };
}

export interface DigResult {
  hole: DugHole;
  isNew: boolean;
  totalDepth: number;
  layer: GeologicalLayer;
  strataMessage: string;
  rocksAwarded: number;
  woodAwarded?: number;
  goldAwarded: number;
  itemFound?: {
    name: string;
    type: 'gold' | 'relic' | 'mineral';
    value: number; // ounces of gold or item score
    description: string;
  };
  // Overburden slumping & shoring telemetry
  slumpOccurred: boolean;
  slumpAmount: number;
  stability: number; // 0 to 100%
  needsShoring: boolean;
  slumpDamage: number; // Physical crush damage dealt to careless prospector
  slumpFatal: boolean; // True if overburden burial was completely fatal
  shaftCollarEstablished?: boolean;
  breakthroughToMine?: boolean;
}

/**
 * Physically digs progressively deeper into the terrain at (x, z), deforming the 3D geometry vertices in real-time,
 * penetrating through distinct geological rock strata down to deep bedrock, altering vertex colors to match exposed rock layers,
 * and uncovering strata-specific minerals, quarry stones, and historic artifacts.
 * Cannot dig through to the other side of a mountain or puncture the world basement.
 */
export function digHoleInTerrain(
  x: number,
  z: number,
  depthIncrement: number = 0.50,
  radius: number = 1.85,
  tool: 'shovel' | 'pickaxe' | 'dynamite' = 'shovel'
): DigResult {
  // Generous proximity matching so digging within an excavation zone expands the same trench (and preserves shoring)
  let hole = activeDugHoles.find((h) => Math.hypot(h.x - x, h.z - z) <= Math.max(2.8, (h.radius || 2) * 1.15));
  let isNew = false;
  const prevDepth = hole ? hole.depth : 0;
  const currentLayer = getGeologicalLayerAtDepth(prevDepth);

  // Tool effectiveness based on rock strata hardness
  let effectiveIncrement = depthIncrement;
  if (tool === 'shovel') {
    if (currentLayer.hardness <= 2) {
      effectiveIncrement = depthIncrement;
    } else if (currentLayer.hardness === 3) {
      effectiveIncrement = Math.max(0.20, depthIncrement * 0.45);
    } else {
      // Hard granite or quartz chimney resists the shovel blade
      effectiveIncrement = Math.max(0.12, depthIncrement * 0.25);
    }
  } else if (tool === 'pickaxe') {
    if (currentLayer.hardness >= 2) {
      // Pickaxe fractures hard rock strata with high efficiency
      effectiveIncrement = Math.max(0.60, depthIncrement * 1.25);
    }
  } else if (tool === 'dynamite') {
    effectiveIncrement = Math.max(2.2, depthIncrement * 1.5);
  }

  // Maximum surface open-trench excavation depth clamped to solid bedrock (~4.8m)
  // Prevents the 2D surface heightfield mesh from tearing, stretching into the void, or puncturing the world floor.
  const baseElev = getBaseTerrainHeight(x, z);
  const maxSafeDepth = Math.max(2.0, Math.min(4.8, baseElev - 2.5));

  if (hole) {
    const targetDepth = Math.min(maxSafeDepth, hole.depth + effectiveIncrement);
    hole.depth = targetDepth;
    // Expand pit radius as it gets deeper to maintain walkable natural excavation slope
    hole.radius = Math.min(4.8, 1.85 + hole.depth * 0.18);
    hole.excavationCount++;
  } else {
    const initialDepth = Math.min(maxSafeDepth, effectiveIncrement);
    hole = {
      id: `hole_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      x,
      z,
      depth: initialDepth,
      radius,
      excavationCount: 1,
      createdAt: Date.now(),
      maxLayerReached: 0,
      stability: 100,
      isShored: false,
    };
    activeDugHoles.push(hole);
    isNew = true;
  }

  // --- Geotechnical Overburden Stress, Slumping & Lethal Danger Mechanics ---
  let slumpOccurred = false;
  let slumpAmount = 0;
  let needsShoring = false;
  let slumpDamage = 0;
  let slumpFatal = false;

  const shoredUntil = hole.shoredUntilDepth || 0;
  const currentStrata = getGeologicalLayerAtDepth(hole.depth);

  // Timber shoring secures the pit up to shoredUntilDepth!
  // Digging past that depth exposes un-shored lower walls, requiring the next tier of shoring.
  if (hole.depth <= shoredUntil) {
    hole.isShored = true;
    hole.stability = 100;
  } else {
    hole.isShored = false;

    // Strata-dependent geotechnical stability & slump resistance:
    // - Granite (index 4) & Bonanza Quartz (index 5): Massive bedrock, 100% self-supporting, zero shoring needed!
    // - Banded Gneiss (index 3): Dense crystalline metamorphic rock, virtually self-supporting.
    // - Volcanic Tuff (index 2): Solid welded ash, competent rock, minimal shoring needed.
    // - Caliche (index 1): Cemented hardpan, moderate slump risk past 2.2m.
    // - Loose Sand (index 0): Unconsolidated sand/gravel wash, HIGH slump risk past 0.70m without wooden lagging!
    if (currentStrata.shoringRequirement === 'none') {
      hole.stability = 100; // Completely self-supporting bedrock!
    } else {
      const rockResistance = currentStrata.stabilityFactor;
      // In loose sand, even 0.70m without wooden timber lagging risks sidewall slumping.
      // In volcanic tuff and gneiss, cohesive rock arches hold vertical faces naturally!
      const criticalDepth =
        currentStrata.id === 'strata_sand' ? 0.70 :
        currentStrata.id === 'strata_caliche' ? 2.2 :
        currentStrata.id === 'strata_tuff' ? 4.8 : 7.0;

      if (hole.depth >= criticalDepth) {
        const soilStressMultiplier = Math.max(0.02, 1.0 - rockResistance);
        const unShoredDepth = hole.depth - shoredUntil;
        const depthStress = (1.6 + Math.pow(unShoredDepth, 1.2) * 2.4) * soilStressMultiplier;
        hole.stability = Math.max(0, (hole.stability !== undefined ? hole.stability : 100) - depthStress);

        if (hole.stability <= 20) {
          // Pit rim slump: unsupported earth slumps back down into trench
          slumpAmount = Math.min(hole.depth * (currentStrata.id === 'strata_sand' ? 0.35 : 0.15), 0.20 + Math.random() * 0.20);
          // Slump fills back un-shored bench, but timbers protect upper shored bench
          hole.depth = Math.max(Math.max(0.5, shoredUntil), hole.depth - slumpAmount);
          hole.totalSlumpedDepth = (hole.totalSlumpedDepth || 0) + slumpAmount;
          hole.lastSlumpTime = Date.now();
          slumpOccurred = true;

          // Controlled, survivable slump damage (6-12 HP) with warning
          slumpDamage = currentStrata.id === 'strata_sand' ? 5 + Math.floor(Math.random() * 5) : 8 + Math.floor(Math.random() * 5);
          slumpFatal = false;
          hole.stability = 50;
        } else if (hole.stability <= 55) {
          needsShoring = true;
        }
      } else {
        hole.stability = 100;
      }
    }
  }

  const newLayer = getGeologicalLayerAtDepth(hole.depth);
  const layerChanged = !hole.maxLayerReached || newLayer.index > hole.maxLayerReached;
  hole.maxLayerReached = Math.max(hole.maxLayerReached || 0, newLayer.index);
  hole.lastStrataName = newLayer.name;

  // If shored, keep the timber shoring mesh synchronized to the supported depth
  if (hole.shoringMesh && hole.shoringMesh.parent) {
    const parentScene = hole.shoringMesh.parent as THREE.Scene;
    parentScene.remove(hole.shoringMesh);
    const updatedMesh = createTrenchShoringMesh(hole);
    parentScene.add(updatedMesh);
    hole.shoringMesh = updatedMesh;
  }

  // Deform terrain vertices and shade excavation pit according to real geological strata in real-time
  updateTerrainMeshForHole(hole);

  // Calculate strata-specific rock yields
  let rocksAwarded = 1;
  let woodAwarded = 0;
  if (newLayer.index === 1) rocksAwarded = 2; // Caliche crust blocks
  else if (newLayer.index === 2) rocksAwarded = 3; // Quarry sandstone
  else if (newLayer.index === 3) rocksAwarded = 4; // Granite blocks
  else if (newLayer.index === 4) rocksAwarded = 3; // Bonanza quartz

  // Procedural discovery generation tailored to depth & geological stratum
  let goldAwarded = 0;
  let itemFound: DigResult['itemFound'] = undefined;
  const roll = Math.random();

  if (newLayer.index === 0) {
    // Surface Dune Sand & Wash Alluvium: loose placer flakes & prospector debris
    if (roll < 0.45) {
      goldAwarded = parseFloat((0.3 + Math.random() * 0.8).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz Desert Sand Placer Flakes`,
        type: 'gold',
        value: goldAwarded,
        description: 'Fine alluvial gold flakes sifted from loose desert dune sand and dry wash gravel.',
      };
    } else if (roll < 0.62) {
      itemFound = {
        name: 'Pioneer Mule Horseshoe',
        type: 'relic',
        value: 0.5,
        description: 'Hand-forged 1870s iron shoe from a prospector pack train buried in desert sand.',
      };
    } else if (roll < 0.85) {
      woodAwarded = 1;
      itemFound = {
        name: 'Desert Ironwood Timber Plank',
        type: 'mineral',
        value: 0.5,
        description: 'Seasoned desert timber plank salvaged from the dry wash—ready for wooden shoring in sand!',
      };
    }
  } else if (newLayer.index === 1) {
    // Caliche Hardpan: Spanish colonial relics & cemented coarse nuggets
    if (roll < 0.50) {
      goldAwarded = parseFloat((0.8 + Math.random() * 1.5).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz Caliche-Coated Gold Nugget`,
        type: 'gold',
        value: goldAwarded,
        description: 'Dense nugget trapped in ancient calcium carbonate cement.',
      };
    } else if (roll < 0.70) {
      const relics = [
        { name: '1789 Spanish Silver 2-Reales Coin', value: 1.8, desc: 'Tarnished colonial silver minted under King Charles IV of Spain.' },
        { name: 'Peralta Mission Cast Iron Cross', value: 2.2, desc: '1840s Jesuit missionary crucifix buried beneath caliche.' },
        { name: 'Prehistoric Obsidian Arrowhead', value: 1.2, desc: 'Flaked volcanic glass Apache projectile point.' },
      ];
      const picked = relics[Math.floor(Math.random() * relics.length)];
      itemFound = { name: picked.name, type: 'relic', value: picked.value, description: picked.desc };
    }
  } else if (newLayer.index === 2) {
    // Superstition Volcanic Tuff: Rhyolitic quartz stringers & volcanic geodes
    if (roll < 0.58) {
      goldAwarded = parseFloat((1.6 + Math.random() * 2.2).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz Volcanic Tuff Gold Stringer`,
        type: 'gold',
        value: goldAwarded,
        description: 'Coarse wire gold embedded in welded rhyolitic ash-flow tuff.',
      };
    } else if (roll < 0.75) {
      itemFound = {
        name: 'Superstition Obsidian Geode',
        type: 'mineral',
        value: 1.8,
        description: 'Volcanic thunder-egg nodule filled with sparkling micro-quartz crystals!',
      };
    } else if (roll < 0.88) {
      itemFound = {
        name: 'Apache Basalt Mortar Fragment',
        type: 'relic',
        value: 2.2,
        description: 'Prehistoric stone grinding basin pecked from dense volcanic basalt.',
      };
    }
  } else if (newLayer.index === 3) {
    // Banded Gneiss: Crystalline metamorphic electrum & silver veins
    if (roll < 0.65) {
      goldAwarded = parseFloat((2.4 + Math.random() * 2.8).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz Foliated Gneiss Electrum Ore`,
        type: 'gold',
        value: goldAwarded,
        description: 'High-purity crystalline electrum interlaced along foliated quartz-gneiss bands.',
      };
    } else if (roll < 0.82) {
      itemFound = {
        name: 'Deep Almandine Garnet Cluster',
        type: 'mineral',
        value: 2.4,
        description: 'Deep ruby-red dodecahedral garnet crystals embedded in mica schist.',
      };
    } else if (roll < 0.92) {
      itemFound = {
        name: 'Native Horn Silver (Cerargyrite)',
        type: 'mineral',
        value: 3.2,
        description: 'Waxy high-grade silver ore cleaved from deep metamorphic fracture joints.',
      };
    }
  } else if (newLayer.index === 4) {
    // Peralta Granite Bedrock: High-grade electrum ore & royal amethyst
    if (roll < 0.72) {
      goldAwarded = parseFloat((3.4 + Math.random() * 3.8).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz Peralta Granite Gold Lode Ore`,
        type: 'gold',
        value: goldAwarded,
        description: 'Dense crystalline gold-silver alloy fractured from the massive igneous granite basement.',
      };
    } else if (roll < 0.88) {
      itemFound = {
        name: 'Sparkling Deep Amethyst Geode',
        type: 'mineral',
        value: 3.0,
        description: 'Spectacular royal-purple quartz crystal cluster extracted from a granite pluton tectonic fissure.',
      };
    }
  } else {
    // Hydrothermal Quartz Chimney: BONANZA MOTHER LODE!
    goldAwarded = parseFloat((5.5 + Math.random() * 7.5).toFixed(1));
    itemFound = {
      name: `${goldAwarded} oz Pure Bonanza Rose Gold Slab`,
      type: 'gold',
      value: goldAwarded,
      description: 'The legendary mother lode chimney! Massive gleaming virgin gold locked in crystalline quartz.',
    };
  }

  // Construct informative strata announcement banner
  let strataMessage = '';
  if (slumpOccurred) {
    strataMessage = `⚠️ Loose sand slumped into pit (${slumpAmount.toFixed(2)}m). Current depth: ${hole.depth.toFixed(1)}m.`;
  } else if (layerChanged && hole.depth >= 1.0) {
    strataMessage = `⚡ PENETRATED NEW STRATA: [${newLayer.name.toUpperCase()}] at ${hole.depth.toFixed(1)}m deep!`;
  } else if (itemFound && itemFound.type === 'gold') {
    strataMessage = `⛏️ Depth ${hole.depth.toFixed(1)}m (${newLayer.name}): Uncovered ${itemFound.name}!`;
  } else if (itemFound) {
    strataMessage = `⛏️ Depth ${hole.depth.toFixed(1)}m (${newLayer.name}): Excavated ${itemFound.name}!`;
  } else if (needsShoring) {
    strataMessage = `⛏️ Depth ${hole.depth.toFixed(1)}m | ${newLayer.name} (${Math.round(hole.stability)}% stability)`;
  } else {
    strataMessage = `⛏️ Depth ${hole.depth.toFixed(1)}m | ${newLayer.name} (+${rocksAwarded} Quarry Stones)`;
  }

  return {
    hole,
    isNew,
    totalDepth: hole.depth,
    layer: newLayer,
    strataMessage,
    rocksAwarded,
    woodAwarded,
    goldAwarded,
    itemFound,
    slumpOccurred,
    slumpAmount,
    stability: hole.stability,
    needsShoring,
    slumpDamage,
    slumpFatal,
    shaftCollarEstablished: false,
    breakthroughToMine: false,
  };
}

/**
 * Updates terrain mesh vertices and rock-strata shading colors around a specific dug hole.
 */
export function updateTerrainMeshForHole(hole: DugHole) {
  if (activeTerrainHoleListener) {
    activeTerrainHoleListener(hole);
  }
  if (!activeTerrainMesh) return;
  const geom = activeTerrainMesh.geometry as THREE.BufferGeometry;
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = geom.attributes.color as THREE.BufferAttribute;

  const R = Math.max(9.5, (hole.radius || 2.0) * 3.4);
  const segSize = TERRAIN_SEG_SIZE;
  const minIX = Math.max(0, Math.floor((hole.x - R + HALF_WORLD_SIZE) / segSize));
  const maxIX = Math.min(TERRAIN_SEGMENTS, Math.ceil((hole.x + R + HALF_WORLD_SIZE) / segSize));
  const minIZ = Math.max(0, Math.floor((hole.z - R + HALF_WORLD_SIZE) / segSize));
  const maxIZ = Math.min(TERRAIN_SEGMENTS, Math.ceil((hole.z + R + HALF_WORLD_SIZE) / segSize));

  for (let iz = minIZ; iz <= maxIZ; iz++) {
    for (let ix = minIX; ix <= maxIX; ix++) {
      const i = iz * TERRAIN_VERTICES_PER_ROW + ix;
      if (i < 0 || i >= pos.count) continue;
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const dist = Math.hypot(vx - hole.x, vz - hole.z);
      if (dist <= R) {
        const newY = getTerrainHeight(vx, vz);
        pos.setY(i, newY);

        if (dist <= hole.radius * 1.8 && colors) {
          const baseY = getBaseTerrainHeight(vx, vz);
          const vertexDepth = Math.max(0, baseY - newY);
          const vLayer = getGeologicalLayerAtDepth(Math.max(vertexDepth, hole.depth * 0.7));
          const blendFactor = Math.min(1.0, Math.max(0.2, vertexDepth / 0.5));

          colors.setXYZ(
            i,
            THREE.MathUtils.lerp(colors.getX(i), vLayer.vertexColor[0], blendFactor),
            THREE.MathUtils.lerp(colors.getY(i), vLayer.vertexColor[1], blendFactor),
            THREE.MathUtils.lerp(colors.getZ(i), vLayer.vertexColor[2], blendFactor)
          );
        }
      }
    }
  }

  pos.needsUpdate = true;
  if (colors) colors.needsUpdate = true;
  geom.computeVertexNormals();
}

/**
 * Creates authentic 19th-Century American West Underground Mine Shoring:
 * - In Sand (depth <= 1.4m): Heavy wooden timber box cribbing with dense horizontal pine lagging planks
 *   lining all four walls to prevent loose desert sand cave-ins, plus corner stakes and wedges.
 * - In Deep Rock Strata (depth > 1.4m): Complete Comstock square-set underground mine framing with
 *   heavy posts (stulls), cap beams, 45-degree angle knee braces, iron drift plates, hanging brass
 *   miner's kerosene lantern with dynamic warm PointLight, overhead ore-hoist gallows with cast-iron
 *   pulley wheel and hanging iron ore bucket, floor tramway railway ties, and full-depth access ladder!
 */
export function createTrenchShoringMesh(hole: DugHole): THREE.Group {
  const group = new THREE.Group();
  group.name = `shoring_${hole.id}`;

  const baseY = getBaseTerrainHeight(hole.x, hole.z);
  const shoringDepth = Math.max(0.75, Math.min(hole.depth, hole.shoredUntilDepth || hole.depth));
  const R = Math.max(1.3, hole.radius * 0.85);
  const isInSand = hole.depth <= 1.4;

  // Authentic 19th-Century Mine Materials
  const pineWoodMat = new THREE.MeshStandardMaterial({
    color: 0x684424,
    roughness: 0.88,
    metalness: 0.05,
  });

  const altPinePlankMat = new THREE.MeshStandardMaterial({
    color: 0x5a391c,
    roughness: 0.90,
    metalness: 0.05,
  });

  const lightPinePlankMat = new THREE.MeshStandardMaterial({
    color: 0x77502c,
    roughness: 0.86,
    metalness: 0.04,
  });

  const darkTimberMat = new THREE.MeshStandardMaterial({
    color: 0x3d2411,
    roughness: 0.92,
    metalness: 0.05,
  });

  const weatheredPlankMat = new THREE.MeshStandardMaterial({
    color: 0x826950,
    roughness: 0.94,
    metalness: 0.02,
  });

  const forgedIronMat = new THREE.MeshStandardMaterial({
    color: 0x22201e,
    roughness: 0.60,
    metalness: 0.85,
  });

  const galvanizedBucketMat = new THREE.MeshStandardMaterial({
    color: 0x4a4c50,
    roughness: 0.50,
    metalness: 0.75,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xb88e36,
    roughness: 0.38,
    metalness: 0.82,
  });

  const dressedStoneMat = new THREE.MeshStandardMaterial({
    color: 0x48423d,
    roughness: 0.94,
    metalness: 0.04,
  });

  const lanternFlameMat = new THREE.MeshStandardMaterial({
    color: 0xfff0a0,
    emissive: 0xff8c1a,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });

  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0x9b8560,
    roughness: 0.96,
    metalness: 0.02,
  });

  // 1. Surface Timber Collar Frame (Heavy interlocking rough-sawn pine beams)
  const collarSize = R * 2.05;
  const collarThickness = 0.28;
  const collarHeight = 0.26;

  // North & South surface header beams
  [-R * 1.02, R * 1.02].forEach((posZ) => {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(collarSize + 0.44, collarHeight, collarThickness),
      darkTimberMat
    );
    beam.position.set(0, 0.13, posZ);
    beam.castShadow = true;
    group.add(beam);
  });

  // East & West surface header beams
  [-R * 1.02, R * 1.02].forEach((posX) => {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(collarThickness, collarHeight, collarSize + 0.44),
      darkTimberMat
    );
    beam.position.set(posX, 0.13, 0);
    beam.castShadow = true;
    group.add(beam);
  });

  // Iron corner joint dog spikes
  const cornerOffsets = [
    [-R * 0.94, -R * 0.94],
    [R * 0.94, -R * 0.94],
    [-R * 0.94, R * 0.94],
    [R * 0.94, R * 0.94],
  ];

  cornerOffsets.forEach(([cx, cz]) => {
    const ironPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6),
      forgedIronMat
    );
    ironPin.position.set(cx, 0.22, cz);
    group.add(ironPin);
  });

  // 2. Corner Upright Timber Posts (Stulls)
  const postThickness = 0.26;
  cornerOffsets.forEach(([cx, cz]) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(postThickness, shoringDepth + 0.32, postThickness),
      pineWoodMat
    );
    post.position.set(cx, -shoringDepth / 2 + 0.10, cz);
    post.castShadow = true;
    group.add(post);

    // Dressed granite footer stone pad at pit bottom
    const footer = new THREE.Mesh(
      new THREE.BoxGeometry(postThickness * 1.5, 0.16, postThickness * 1.5),
      dressedStoneMat
    );
    footer.position.set(cx, -shoringDepth + 0.08, cz);
    group.add(footer);

    // Iron corner drift plate at top
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(postThickness * 1.18, 0.10, postThickness * 1.18),
      forgedIronMat
    );
    plate.position.set(cx, 0.18, cz);
    group.add(plate);
  });

  // 3. Wooden Shoring in Sand: Dense Horizontal Pine Lagging Planks
  // In sand (0.0 to 1.4m), tight continuous horizontal wooden planks line all 4 walls to brace loose sand
  const sandLaggingHeight = Math.min(shoringDepth, 1.4);
  const plankTiers = Math.max(3, Math.floor(sandLaggingHeight / 0.19));
  const plankMats = [pineWoodMat, altPinePlankMat, lightPinePlankMat, weatheredPlankMat];

  for (let p = 0; p < plankTiers; p++) {
    const py = -0.10 - p * 0.19;
    const curMat = plankMats[p % plankMats.length];

    // North wall sand lagging plank
    const plankN = new THREE.Mesh(
      new THREE.BoxGeometry(collarSize * 0.94, 0.16, 0.09),
      curMat
    );
    plankN.position.set(0, py, -R * 0.96);
    plankN.castShadow = true;
    group.add(plankN);

    // South wall sand lagging plank
    const plankS = new THREE.Mesh(
      new THREE.BoxGeometry(collarSize * 0.94, 0.16, 0.09),
      curMat
    );
    plankS.position.set(0, py, R * 0.96);
    plankS.castShadow = true;
    group.add(plankS);

    // East wall sand lagging plank
    const plankE = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.16, collarSize * 0.94),
      curMat
    );
    plankE.position.set(R * 0.96, py, 0);
    plankE.castShadow = true;
    group.add(plankE);

    // West wall sand lagging plank
    const plankW = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.16, collarSize * 0.94),
      curMat
    );
    plankW.position.set(-R * 0.96, py, 0);
    plankW.castShadow = true;
    group.add(plankW);
  }

  // Solid timber plank floor deck across the pit bottom inside the collar
  const floorDeck = new THREE.Mesh(
    new THREE.BoxGeometry(collarSize * 0.94, 0.08, collarSize * 0.94),
    darkTimberMat
  );
  floorDeck.position.set(0, -shoringDepth + 0.04, 0);
  floorDeck.receiveShadow = true;
  group.add(floorDeck);

  // Wooden stakes driven into sand at the perimeter corners
  if (isInSand) {
    [
      [-R * 1.15, -R * 1.15],
      [R * 1.15, -R * 1.15],
      [-R * 1.15, R * 1.15],
      [R * 1.15, R * 1.15],
    ].forEach(([sx, sz]) => {
      const stake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.02, 0.55, 6),
        darkTimberMat
      );
      stake.position.set(sx, 0.08, sz);
      stake.rotation.z = (Math.random() - 0.5) * 0.2;
      group.add(stake);
    });
  }

  // 4. Deep Underground Mine Features (for Depth > 1.4m):
  // Comstock Square Sets, Knee Braces, Timber Wedges, Gallows Hoist, Iron Pulley, Ore Bucket, Tramway Ties!
  if (!isInSand || shoringDepth > 1.4) {
    // 45-degree angle timber knee braces under top collar
    const braceLen = 0.65;
    const braceGeom = new THREE.BoxGeometry(0.18, braceLen, 0.18);
    [
      { x: -R * 0.94 + 0.22, y: -0.22, z: -R * 0.94, rz: Math.PI / 4 },
      { x: R * 0.94 - 0.22, y: -0.22, z: -R * 0.94, rz: -Math.PI / 4 },
      { x: -R * 0.94 + 0.22, y: -0.22, z: R * 0.94, rz: Math.PI / 4 },
      { x: R * 0.94 - 0.22, y: -0.22, z: R * 0.94, rz: -Math.PI / 4 },
    ].forEach((b) => {
      const brace = new THREE.Mesh(braceGeom, pineWoodMat);
      brace.position.set(b.x, b.y, b.z);
      brace.rotation.z = b.rz;
      group.add(brace);
    });

    // Multi-tier square set cross-timbers (caps and girts) every 1.35m depth
    const tiers = Math.max(1, Math.floor(shoringDepth / 1.35));
    for (let tier = 1; tier <= tiers; tier++) {
      const tierY = -(tier * (shoringDepth / (tiers + 1)));

      // Cross-girt X
      const beamX = new THREE.Mesh(
        new THREE.BoxGeometry(collarSize * 0.92, 0.22, 0.22),
        pineWoodMat
      );
      beamX.position.set(0, tierY, 0);
      beamX.castShadow = true;
      group.add(beamX);

      // Cross-girt Z
      const beamZ = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, collarSize * 0.92),
        pineWoodMat
      );
      beamZ.position.set(0, tierY - 0.11, 0);
      beamZ.castShadow = true;
      group.add(beamZ);

      // Iron center crossing plate & bolts
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.28),
        forgedIronMat
      );
      plate.position.set(0, tierY - 0.05, 0);
      group.add(plate);

      // Timber wedges pinning posts to subterranean rock walls
      cornerOffsets.forEach(([cx, cz]) => {
        const wedge = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.22, 4),
          lightPinePlankMat
        );
        wedge.position.set(cx * 1.04, tierY, cz * 1.04);
        wedge.rotation.y = Math.PI / 4;
        group.add(wedge);
      });
    }

    // Authentic Mine Ore-Hoist Gallows (Overhead A-Frame / Cross-arm & Iron Pulley Wheel)
    const gallowsHeight = 1.35;
    // Left & Right overhead gallows posts
    [-R * 0.70, R * 0.70].forEach((gx) => {
      const gPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, gallowsHeight, 0.20),
        darkTimberMat
      );
      gPost.position.set(gx, gallowsHeight / 2 + 0.12, 0);
      gPost.castShadow = true;
      group.add(gPost);
    });

    // Overhead heavy cross-arm timber
    const crossArm = new THREE.Mesh(
      new THREE.BoxGeometry(R * 1.65, 0.22, 0.22),
      darkTimberMat
    );
    crossArm.position.set(0, gallowsHeight + 0.12, 0);
    crossArm.castShadow = true;
    group.add(crossArm);

    // Cast-iron hoist pulley wheel hanging from the cross-arm
    const pulleyWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.035, 8, 16),
      forgedIronMat
    );
    pulleyWheel.position.set(0, gallowsHeight - 0.08, 0);
    pulleyWheel.rotation.y = Math.PI / 2;
    group.add(pulleyWheel);

    const pulleyHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8),
      forgedIronMat
    );
    pulleyHub.position.set(0, gallowsHeight - 0.08, 0);
    pulleyHub.rotation.z = Math.PI / 2;
    group.add(pulleyHub);

    // Hemp hoist rope descending down shaft
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6),
      ropeMat
    );
    rope.position.set(0, gallowsHeight - 0.65, 0);
    group.add(rope);

    // Galvanized iron ore haulage bucket suspended over the shaft mouth
    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.20, 0.40, 10),
      galvanizedBucketMat
    );
    bucket.position.set(0, gallowsHeight - 1.25, 0);
    bucket.castShadow = true;
    group.add(bucket);

    // Bucket bail handle
    const bail = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.02, 6, 12, Math.PI),
      forgedIronMat
    );
    bail.position.set(0, gallowsHeight - 1.05, 0);
    group.add(bail);

    // Ore Cart Tramway Floor Sleepers & Dual Iron Rails at pit bottom
    for (let s = -1; s <= 1; s++) {
      const sleeper = new THREE.Mesh(
        new THREE.BoxGeometry(collarSize * 0.70, 0.10, 0.18),
        darkTimberMat
      );
      sleeper.position.set(0, -shoringDepth + 0.05, s * (R * 0.50));
      group.add(sleeper);
    }
    // Dual iron guide rails
    [-0.28, 0.28].forEach((rx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.06, collarSize * 0.85),
        forgedIronMat
      );
      rail.position.set(rx, -shoringDepth + 0.11, 0);
      group.add(rail);
    });

    // Weathered wooden mine shaft placard mounted on South top header
    const placard = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.16, 0.03),
      weatheredPlankMat
    );
    placard.position.set(0, 0.18, R * 1.02 + 0.15);
    group.add(placard);
  }

  // 5. Miner's Sturdy Wooden Access Ladder (Affixed along the West wall)
  const ladderX = -R * 0.88;
  const ladderZ = 0;
  const ladderHeight = shoringDepth + 0.35;
  [-0.18, 0.18].forEach((offsetZ) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, ladderHeight, 0.08),
      darkTimberMat
    );
    rail.position.set(ladderX, -ladderHeight / 2 + 0.20, ladderZ + offsetZ);
    group.add(rail);
  });
  // Rungs every 0.30m
  const rungCount = Math.floor(ladderHeight / 0.30);
  for (let r = 0; r < rungCount; r++) {
    const rungY = 0.10 - r * 0.30;
    const rung = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.36, 6),
      pineWoodMat
    );
    rung.position.set(ladderX, rungY, ladderZ);
    rung.rotation.x = Math.PI / 2;
    group.add(rung);
  }

  // 6. Authentic Hanging Brass Miner's Lantern with Warm Glowing THREE.PointLight
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(isInSand ? 0 : 0.35, -0.45, isInSand ? 0 : 0.25);

  // Iron suspension ring & chain
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.015, 6, 12),
    forgedIronMat
  );
  ring.position.set(0, 0.24, 0);
  lanternGroup.add(ring);

  // Brass lantern hood & ventilator
  const lanternHood = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.10, 8),
    brassMat
  );
  lanternHood.position.set(0, 0.15, 0);
  lanternGroup.add(lanternHood);

  // Brass base oil fount
  const lanternBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.08, 8),
    brassMat
  );
  lanternBase.position.set(0, -0.12, 0);
  lanternGroup.add(lanternBase);

  // Glowing kerosene flame core
  const flame = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8),
    lanternFlameMat
  );
  flame.position.set(0, 0.01, 0);
  lanternGroup.add(flame);

  // Protective wire cage bars
  for (let w = 0; w < 4; w++) {
    const angle = (w / 4) * Math.PI * 2;
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.20, 4),
      forgedIronMat
    );
    wire.position.set(Math.cos(angle) * 0.09, 0.01, Math.sin(angle) * 0.09);
    lanternGroup.add(wire);
  }

  // Real 3D Underground PointLight illuminating timbers and rock strata with warm amber ambiance
  const lanternLight = new THREE.PointLight(0xffa238, 1.8, 11.0, 1.2);
  lanternLight.position.set(0, 0, 0);
  lanternGroup.add(lanternLight);

  group.add(lanternGroup);

  group.position.set(hole.x, baseY, hole.z);
  return group;
}

/**
 * Reinforces an active excavation trench with heavy wooden mine timber cribbing & sand lagging,
 * protecting it from overburden collapse. Adapts material cost to geological strata:
 * - Sand: Uses 2 Wood Planks for dense horizontal pine wall lagging.
 * - Caliche: Uses 1 Wood Plank + 1 Stone.
 * - Volcanic Tuff & Gneiss: Cohesive bedrock; requires minimal timber (1 Wood Plank, 0 Stone).
 * - Granite & Bonanza: 100% self-supporting bedrock; requires 0 materials!
 */
export function shoreExcavationPit(
  holeId: string,
  scene?: THREE.Scene
): {
  success: boolean;
  message: string;
  rocksUsed: number;
  woodUsed: number;
  materialType: 'wood' | 'stone' | 'timber_rock' | 'none';
  hole?: DugHole;
} {
  const hole = activeDugHoles.find((h) => h.id === holeId);
  if (!hole) {
    return { success: false, message: 'Excavation trench not found.', rocksUsed: 0, woodUsed: 0, materialType: 'wood' };
  }

  const currentLayer = getGeologicalLayerAtDepth(hole.depth);

  // In loose sand, allow shoring from 0.50m so prospectors can brace loose walls immediately!
  const minRequiredDepth = currentLayer.id === 'strata_sand' ? 0.50 : 0.85;
  if (hole.depth < minRequiredDepth) {
    return {
      success: false,
      message: `Trench is too shallow to require timber shoring (depth < ${minRequiredDepth.toFixed(1)}m). Dig deeper first!`,
      rocksUsed: 0,
      woodUsed: 0,
      materialType: 'wood',
      hole,
    };
  }

  const prevShored = hole.shoredUntilDepth || 0;
  // If already shored for the current depth with significant margin remaining:
  if (hole.isShored && prevShored > hole.depth + 0.35) {
    return {
      success: false,
      message: `Trench is already securely timbered down to ${prevShored.toFixed(1)}m! Dig deeper to the next depth tier before extending framing.`,
      rocksUsed: 0,
      woodUsed: 0,
      materialType: 'wood',
      hole,
    };
  }

  // Extend shoring to protect the next depth tier (+1.25m from current depth)
  const nextShoredDepth = Math.max(hole.depth + 1.25, prevShored + 1.25);
  hole.isShored = true;
  hole.shoredUntilDepth = nextShoredDepth;
  hole.stability = 100;

  // Also extend shoring in overlapping adjacent pits in this excavation zone
  activeDugHoles.forEach((other) => {
    if (other.id !== hole.id && Math.hypot(other.x - hole.x, other.z - hole.z) <= 3.6) {
      other.isShored = true;
      other.shoredUntilDepth = Math.max(other.depth + 1.25, nextShoredDepth);
      other.stability = 100;
    }
  });

  if (scene) {
    if (hole.shoringMesh) {
      scene.remove(hole.shoringMesh);
    }
    const mesh = createTrenchShoringMesh(hole);
    scene.add(mesh);
    hole.shoringMesh = mesh;
  }

  const isExtension = prevShored > 0;
  let shoreMsg = '';
  let woodUsed = 1;
  let rocksUsed = 0;
  let materialType: 'wood' | 'stone' | 'timber_rock' | 'none' = 'wood';

  if (currentLayer.id === 'strata_sand') {
    woodUsed = 2;
    rocksUsed = 0;
    materialType = 'wood';
    shoreMsg = isExtension
      ? `🪵 Extended Wooden Mine Shoring in Sand! Side lagging planks and corner timber sets secured down to ${nextShoredDepth.toFixed(1)}m depth.`
      : `🪵 Installed Wooden Mine Shoring in Sand! Dense pine lagging planks and stull frames lock loose desert sand down to ${nextShoredDepth.toFixed(1)}m depth.`;
  } else if (currentLayer.id === 'strata_caliche') {
    woodUsed = 1;
    rocksUsed = 1;
    materialType = 'timber_rock';
    shoreMsg = isExtension
      ? `⛏️ Extended Caliche Hardpan Timbering with stone footers down to ${nextShoredDepth.toFixed(1)}m depth.`
      : `⛏️ Caliche Hardpan Shored! Heavy timber sets and stone footers secured down to ${nextShoredDepth.toFixed(1)}m depth.`;
  } else if (currentLayer.id === 'strata_tuff') {
    woodUsed = 1;
    rocksUsed = 0;
    materialType = 'wood';
    shoreMsg = isExtension
      ? `🌋 Volcanic Tuff Shoring Extended! Cohesive ash-flow rock arch braced down to ${nextShoredDepth.toFixed(1)}m depth.`
      : `🌋 Superstition Volcanic Tuff Shored! Cohesive volcanic ash rock is naturally arched; light timber set secured down to ${nextShoredDepth.toFixed(1)}m.`;
  } else if (currentLayer.id === 'strata_gneiss') {
    woodUsed = 1;
    rocksUsed = 0;
    materialType = 'wood';
    shoreMsg = isExtension
      ? `💎 Banded Gneiss Shoring Extended down to ${nextShoredDepth.toFixed(1)}m depth.`
      : `💎 Banded Gneiss Crystalline Bedrock Shored! High shear-strength metamorphic rock braced down to ${nextShoredDepth.toFixed(1)}m.`;
  } else if (currentLayer.shoringRequirement === 'none') {
    woodUsed = 0;
    rocksUsed = 0;
    materialType = 'none';
    shoreMsg = `🛡️ Massive ${currentLayer.name} is 100% self-supporting! Access ladder and hanging lantern secured down to ${nextShoredDepth.toFixed(1)}m with zero shoring needed.`;
  }

  return {
    success: true,
    message: shoreMsg,
    woodUsed,
    rocksUsed,
    materialType,
    hole,
  };
}

/**
 * Finds the closest excavation pit to coordinates (x, z) within maxDist meters.
 */
export function getNearbyDugHole(x: number, z: number, maxDist: number = 3.8): DugHole | undefined {
  let closest: DugHole | undefined;
  let minDist = maxDist;
  for (const h of activeDugHoles) {
    const dist = Math.hypot(x - h.x, z - h.z);
    if (dist < minDist) {
      minDist = dist;
      closest = h;
    }
  }
  return closest;
}

/**
 * Returns all active dug excavation pits.
 */
export function getActiveDugHoles(): DugHole[] {
  return activeDugHoles;
}

/**
 * Synchronizes an excavation hole from a remote multiplayer prospector,
 * updating local terrain deformation and shoring timber geometry.
 */
export function syncRemoteDugHole(remoteHole: Partial<DugHole> & { x: number; z: number; depth: number }, scene?: THREE.Scene): DugHole {
  let hole = activeDugHoles.find((h) => Math.hypot(h.x - remoteHole.x, h.z - remoteHole.z) <= Math.max(2.8, (h.radius || 2) * 1.15));
  if (!hole) {
    hole = {
      id: remoteHole.id || `hole_${Math.round(remoteHole.x)}_${Math.round(remoteHole.z)}`,
      x: remoteHole.x,
      z: remoteHole.z,
      depth: remoteHole.depth,
      radius: remoteHole.radius || 1.85,
      excavationCount: remoteHole.excavationCount || 1,
      createdAt: remoteHole.createdAt || Date.now(),
      maxLayerReached: remoteHole.maxLayerReached || 0,
      stability: remoteHole.stability ?? 100,
      isShored: !!remoteHole.isShored,
      shoredUntilDepth: remoteHole.shoredUntilDepth,
      lastStrataName: remoteHole.lastStrataName,
    };
    activeDugHoles.push(hole);
  } else {
    hole.depth = Math.max(hole.depth, remoteHole.depth);
    if (remoteHole.isShored) {
      hole.isShored = true;
      hole.stability = remoteHole.stability ?? 100;
      hole.shoredUntilDepth = remoteHole.shoredUntilDepth ?? hole.depth;
    }
  }

  // Update terrain vertices for this excavation
  updateTerrainMeshForHole(hole);

  // If shored, ensure shoring mesh is rendered in scene
  if (hole.isShored && scene) {
    if (hole.shoringMesh && hole.shoringMesh.parent) {
      hole.shoringMesh.parent.remove(hole.shoringMesh);
    }
    const mesh = createTrenchShoringMesh(hole);
    scene.add(mesh);
    hole.shoringMesh = mesh;
  }

  return hole;
}

/**
 * Resets all excavated pits, removes timber shoring meshes from the scene,
 * and restores deformed terrain vertices to their undisturbed procedural heights.
 */
export function resetAllDugHoles(scene?: THREE.Scene) {
  if (scene) {
    activeDugHoles.forEach((hole) => {
      if (hole.shoringMesh) {
        scene.remove(hole.shoringMesh);
      }
    });
  }
  activeDugHoles.length = 0;

  if (activeTerrainMesh) {
    const geom = activeTerrainMesh.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getBaseTerrainHeight(vx, vz));
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
  }
}

/**
 * Generates a tileable 256x256 multi-scale geological rock texture for realistic terrain shading:
 * - R: Macro sedimentary rock layering & fault turbulence
 * - G: Scree, gravel, and talus pebble micro-relief
 * - B: Fine desert sand grain & quartz grit
 * - A: Desert varnish & mineral patina dark streaks
 */
export function generateTerrainNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // Channel R: Macro rock strata noise
      const r = (smoothNoise(u * 8, v * 8) * 0.65 + smoothNoise(u * 16, v * 16) * 0.35) * 255;

      // Channel G: Scree and pebble relief
      const g = (smoothNoise(u * 28 + 40, v * 28 + 40) * 0.7 + smoothNoise(u * 56, v * 56) * 0.3) * 255;

      // Channel B: Micro sand grain grit
      const b = smoothNoise(u * 70 + 90, v * 70 + 90) * 255;

      // Channel A: Desert varnish erosion streak
      const a = (smoothNoise(u * 4 + 10, v * 12 + 10) * 0.8 + smoothNoise(u * 12, v * 24) * 0.2) * 255;

      const idx = (y * size + x) * 4;
      data[idx] = Math.floor(r);
      data[idx + 1] = Math.floor(g);
      data[idx + 2] = Math.floor(b);
      data[idx + 3] = Math.floor(a);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// Shared hole cutout uniforms for terrain shader to prevent geometry tearing in carved tunnels
// Packed into two compact vec4 arrays (Pos+Radius, Dir+SignedDepth) to strictly respect MAX_FRAGMENT_UNIFORM_VECTORS
export const MAX_MOUNTAIN_HOLES = 4;

export const terrainHoleUniforms = {
  uMountainHolePosRadius: {
    value: Array.from({ length: MAX_MOUNTAIN_HOLES }, () => new THREE.Vector4(0, -9999, 0, 0)),
  },
  uMountainHoleDirDepth: {
    value: Array.from({ length: MAX_MOUNTAIN_HOLES }, () => new THREE.Vector4(0, 0, -1, 0)),
  },
  uMountainHoleCount: { value: 0 },
};

const _scratchTerrainBoreDir = new THREE.Vector3();

export function updateTerrainHoleCutouts(
  holes: Array<{ position: THREE.Vector3; depth: number; radius: number; group: THREE.Group; isPassThrough?: boolean }>
): void {
  const count = Math.min(MAX_MOUNTAIN_HOLES, holes.length);
  terrainHoleUniforms.uMountainHoleCount.value = count;
  for (let i = 0; i < count; i++) {
    const h = holes[i];
    terrainHoleUniforms.uMountainHolePosRadius.value[i].set(
      h.position.x,
      h.position.y,
      h.position.z,
      h.radius * 0.98
    );

    // Bore direction points along local -Z into the mountain (zero-allocation)
    _scratchTerrainBoreDir.set(0, 0, -1).applyQuaternion(h.group.quaternion).normalize();
    // Negative depth encodes pass-through tunnel (clean zero-uniform-overhead encoding)
    const signedDepth = (h.isPassThrough ? -1.0 : 1.0) * Math.max(0.05, h.depth);
    terrainHoleUniforms.uMountainHoleDirDepth.value[i].set(
      _scratchTerrainBoreDir.x,
      _scratchTerrainBoreDir.y,
      _scratchTerrainBoreDir.z,
      signedDepth
    );
  }
}

/**
 * Applies the universal mountain hole cutout shader to any rock or outcropping material,
 * allowing tunnels and mine portals to pierce cleanly through boulders and cliff outcroppings.
 */
export function applyMountainHoleShaderToMaterial(
  material: THREE.MeshStandardMaterial,
  cacheKeySuffix: string = 'rock'
): void {
  material.customProgramCacheKey = () => `mtn_hole_cutout_${cacheKeySuffix}_v2`;
  const prevOnBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    if (prevOnBeforeCompile) {
      prevOnBeforeCompile(shader, renderer);
    }
    shader.uniforms.uMountainHolePosRadius = terrainHoleUniforms.uMountainHolePosRadius;
    shader.uniforms.uMountainHoleDirDepth = terrainHoleUniforms.uMountainHoleDirDepth;
    shader.uniforms.uMountainHoleCount = terrainHoleUniforms.uMountainHoleCount;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying highp vec3 vRockWorldPos;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      #if defined( USE_INSTANCING )
        vRockWorldPos = (modelMatrix * (instanceMatrix * vec4(transformed, 1.0))).xyz;
      #else
        vRockWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform vec4 uMountainHolePosRadius[4];
      uniform vec4 uMountainHoleDirDepth[4];
      uniform int uMountainHoleCount;
      varying highp vec3 vRockWorldPos;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      // Cut hollow opening through rock for excavated mine portals
      for (int i = 0; i < 4; i++) {
        if (i >= uMountainHoleCount) break;
        vec3 holePos = uMountainHolePosRadius[i].xyz;
        float holeRadius = uMountainHolePosRadius[i].w;
        vec3 holeDir = uMountainHoleDirDepth[i].xyz;
        float rawDepth = abs(uMountainHoleDirDepth[i].w);
        bool isPassThrough = uMountainHoleDirDepth[i].w < 0.0;

        vec3 toFrag = vRockWorldPos - holePos;
        float distAlong = dot(toFrag, holeDir);
        float maxDepth = isPassThrough ? (rawDepth + 4.0) : (rawDepth + 0.35);
        if (distAlong > -0.65 && distAlong < maxDepth) {
          vec3 radial = toFrag - distAlong * holeDir;
          float r2 = dot(radial, radial);
          if (r2 < holeRadius * holeRadius) {
            discard;
          }
        }
      }`
    );
  };
}

/**
 * Creates a photorealistic PBR terrain material using GLSL shaders for slope-based rock blending,
 * sedimentary cliff strata, desert varnish, and dynamic mountain excavation portal cutouts.
 */
export function createRealisticTerrainMaterial(noiseTexture: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: false,
    side: THREE.DoubleSide,
    shadowSide: THREE.FrontSide,
  });

  material.customProgramCacheKey = () => 'superstition_terrain_material_v5';

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTerrainNoise = { value: noiseTexture };
    shader.uniforms.uMountainHolePosRadius = terrainHoleUniforms.uMountainHolePosRadius;
    shader.uniforms.uMountainHoleDirDepth = terrainHoleUniforms.uMountainHoleDirDepth;
    shader.uniforms.uMountainHoleCount = terrainHoleUniforms.uMountainHoleCount;

    // Vertex shader: pass 3D world position and accurate world normal with matching highp precision
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying highp vec3 vWorldPos;
      varying highp vec3 vWorldNormal;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);`
    );

    // Fragment shader: slope-based blending, sedimentary strata & desert varnish
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D uTerrainNoise;
      uniform vec4 uMountainHolePosRadius[4];
      uniform vec4 uMountainHoleDirDepth[4];
      uniform int uMountainHoleCount;
      varying highp vec3 vWorldPos;
      varying highp vec3 vWorldNormal;`
    );

    // Discard terrain fragments inside hollowed mountain excavation tunnels and adits
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      for (int i = 0; i < 4; i++) {
        if (i >= uMountainHoleCount) break;
        vec3 holePos = uMountainHolePosRadius[i].xyz;
        float holeRadius = uMountainHolePosRadius[i].w;
        vec3 holeDir = uMountainHoleDirDepth[i].xyz;
        float rawDepth = abs(uMountainHoleDirDepth[i].w);
        bool isPassThrough = uMountainHoleDirDepth[i].w < 0.0;

        vec3 toFrag = vWorldPos - holePos;
        float distAlong = dot(toFrag, holeDir);
        float maxDepth = isPassThrough ? (rawDepth + 4.0) : (rawDepth + 0.35);
        if (distAlong > -0.65 && distAlong < maxDepth) {
          vec3 radial = toFrag - distAlong * holeDir;
          float r2 = dot(radial, radial);
          if (r2 < holeRadius * holeRadius) {
            discard;
          }
        }
      }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      highp vec3 tNorm = normalize(vWorldNormal);
      highp float slope = 1.0 - clamp(tNorm.y, 0.0, 1.0);

      // Triplanar procedural sampling of geological texture
      vec4 texX = texture2D(uTerrainNoise, vWorldPos.yz * 0.06);
      vec4 texY = texture2D(uTerrainNoise, vWorldPos.xz * 0.06);
      vec4 texZ = texture2D(uTerrainNoise, vWorldPos.xy * 0.06);
      vec3 blend = abs(tNorm);
      blend /= max(0.001, blend.x + blend.y + blend.z);
      vec4 rockTex = texX * blend.x + texY * blend.y + texZ * blend.z;

      // Multi-layer sedimentary geological strata (Coconino sandstone, Supai terracing, Hermit shale)
      float fineBanding = sin(vWorldPos.y * 2.1 + rockTex.r * 3.2) * 0.5 + 0.5;
      float coarseStrata = sin(vWorldPos.y * 0.52 + rockTex.g * 1.4) * 0.5 + 0.5;

      vec3 terracotta = vec3(0.66, 0.30, 0.18);
      vec3 buffSand = vec3(0.77, 0.50, 0.32);
      vec3 deepHematite = vec3(0.48, 0.18, 0.12);
      vec3 darkVarnish = vec3(0.22, 0.16, 0.14);

      vec3 cliffRock = mix(terracotta, buffSand, coarseStrata * 0.55);
      cliffRock = mix(cliffRock, deepHematite, fineBanding * 0.35);
      cliffRock = mix(cliffRock, darkVarnish, rockTex.a * 0.42);

      // Sandy wash / arroyo base with micro pebble grit
      vec3 sandBase = diffuseColor.rgb * (0.86 + rockTex.g * 0.22);

      // Blend based on steepness of the terrain surface
      diffuseColor.rgb = mix(sandBase, cliffRock, smoothstep(0.24, 0.65, slope));
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      roughnessFactor = mix(0.94, 0.68, smoothstep(0.3, 0.7, slope));
      `
    );
  };

  return material;
}

/**
 * Creates the terrain mesh with vertex colors representing Arizona red-rock geology,
 * sandstone strata, desert washes, and mountain crests.
 */
export function createTerrainMesh(): THREE.Mesh {
  const worldSize = WORLD_SIZE;
  const segments = TERRAIN_SEGMENTS; // High resolution for crisp ridges, box canyon cliffs, and arroyos
  const geometry = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // Arizona desert palette:
  // Wash sand: #d4a373 (0.83, 0.64, 0.45)
  // Terracotta sandstone: #c85a32 (0.78, 0.35, 0.20)
  // Deep red canyon rock: #8f3422 (0.56, 0.20, 0.13)
  // Dark basalt cap: #4a3b32 (0.29, 0.23, 0.20)
  // Desert oasis green tint: #606c38 (0.37, 0.42, 0.22)

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    pos.setY(i, vy);

    // Compute surface slope via finite difference
    const eps = 1.2;
    const hL = getTerrainHeight(vx - eps, vz);
    const hR = getTerrainHeight(vx + eps, vz);
    const hD = getTerrainHeight(vx, vz - eps);
    const hU = getTerrainHeight(vx, vz + eps);
    const slope = Math.hypot(hR - hL, hU - hD) / (2.0 * eps); // > 0.8 represents sheer canyon/mountain cliff

    // Color computation
    const distToSpring = Math.hypot(vx - (-70), vz - (-20));
    const distToMalapais = Math.hypot(vx - 95, vz - (-155));
    const pistolCanyonX = -46 + Math.sin(vz * 0.026 - 1.1) * 20 + Math.cos(vz * 0.012) * 9;
    const distToPistol = Math.abs(vx - pistolCanyonX);

    let r = 0.82;
    let g = 0.63;
    let b = 0.44;

    if (distToSpring < 22) {
      // Lush vegetation near spring
      const factor = 1 - distToSpring / 22;
      r = 0.42 * factor + r * (1 - factor);
      g = 0.54 * factor + g * (1 - factor);
      b = 0.26 * factor + b * (1 - factor);
    } else if (distToMalapais < 68 && vy > 26) {
      // Malapais Mountain ("Black Mountain") dark volcanic basalt caprock & desert varnish
      const basaltNoise = Math.sin(vx * 0.35) * Math.cos(vz * 0.35) * 0.06;
      const strata = Math.sin(vy * 0.8) * 0.04;
      r = 0.28 + basaltNoise + strata;
      g = 0.23 + basaltNoise * 0.8 + strata * 0.5;
      b = 0.20 + basaltNoise * 0.6 + strata * 0.3;
    } else if (distToPistol < 24 && vz < -60 && vz > -188) {
      // Pistol Canyon: sheer volcanic breccia walls and sun-bleached alluvial wash gravel
      if (slope > 0.65) {
        // Red-purple volcanic breccia canyon walls
        r = 0.68 + Math.sin(vy * 0.85) * 0.07;
        g = 0.26 + Math.sin(vy * 0.85) * 0.03;
        b = 0.18 + Math.sin(vy * 0.85) * 0.02;
      } else {
        // Smooth gravel wash floor
        r = 0.85;
        g = 0.68;
        b = 0.48;
      }
    } else if (slope > 0.75) {
      // Sheer canyon walls & mountain cliff faces: exposed layered red sandstone & desert varnish
      const strata = Math.sin(vy * 0.95 + vx * 0.04) * 0.09;
      const varnish = Math.sin(vx * 0.25 + vz * 0.25) > 0.4 ? -0.12 : 0.0;
      r = 0.74 + strata + varnish;
      g = 0.28 + strata * 0.5 + varnish * 0.6;
      b = 0.16 + strata * 0.3 + varnish * 0.4;
    } else if (vy > 34 && slope < 0.42 && vx < 20 && vz < -40) {
      // Flat-topped Peters Mesa plateau caprock: weathered dark basalt & desert pavement
      r = 0.44;
      g = 0.36;
      b = 0.30;
    } else if (vy > 36) {
      // High volcanic arête ridge & craggy summit
      const varnish = Math.sin(vx * 0.15) * 0.04;
      r = 0.46 + varnish;
      g = 0.36 + varnish * 0.8;
      b = 0.30 + varnish * 0.6;
    } else if (vy > 18) {
      // Terracotta mountain slopes & bench ledges
      const strata = Math.sin(vy * 0.8) * 0.07;
      r = 0.74 + strata;
      g = 0.42 + strata * 0.5;
      b = 0.26 + strata * 0.3;
    } else if (vy > 6) {
      // Lower bajada desert slope
      r = 0.80;
      g = 0.54;
      b = 0.36;
    } else {
      // Smooth sandy wash / canyon riverbed floor
      const sandRipple = Math.sin(vx * 0.12) * 0.03 + Math.cos(vz * 0.12) * 0.02;
      r = 0.86 + sandRipple;
      g = 0.70 + sandRipple * 0.8;
      b = 0.50 + sandRipple * 0.6;
    }

    colors[i * 3] = Math.max(0.1, Math.min(1.0, r));
    colors[i * 3 + 1] = Math.max(0.1, Math.min(1.0, g));
    colors[i * 3 + 2] = Math.max(0.1, Math.min(1.0, b));
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const noiseTexture = generateTerrainNoiseTexture(256);
  const material = createRealisticTerrainMaterial(noiseTexture);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  activeTerrainMesh = mesh;
  return mesh;
}
