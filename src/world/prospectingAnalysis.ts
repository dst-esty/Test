import * as THREE from 'three';

export type SurfaceMaterialCategory = 'sand' | 'caliche' | 'rock' | 'quartz';

export interface SurfaceAnalysisResult {
  hit: boolean;
  distance: number;
  position: THREE.Vector3;
  surfaceNormal: THREE.Vector3;
  strataName: string;
  materialType: string;
  materialCategory: SurfaceMaterialCategory;
  mineralization: number; // 0.0 to 100.0%
  goldProbability: number; // 0.0 to 1.0
  signsOfGold: string[];
  primarySign: string;
  recommendedAction: string;
  hasHighGradeAnomaly: boolean;
  isAuriferousContact: boolean;
  estimatedDepth: string;
  elevationMeters: number;
  soilMoisture: string;
}

// Known geological mineral hotspots and auriferous structures in the Superstitions
export interface MineralHotspot {
  x: number;
  z: number;
  radius: number;
  baseMineralization: number; // 0 to 100
  strata: string;
  primarySign: string;
  secondarySigns: string[];
  recommendedTool: string;
}

export const KNOWN_MINERAL_HOTSPOTS: MineralHotspot[] = [
  {
    x: -50,
    z: -40,
    radius: 18,
    baseMineralization: 88,
    strata: 'Peralta Arroyo Placer Alluvium',
    primarySign: 'Coarse Quartz Float with Heavy Black Sand',
    secondarySigns: ['Magnetite sand ribbons', 'Worn placer nuggets in dry plunge pool', 'Caliche-cemented terrace gravel'],
    recommendedTool: 'Shovel [3] or Gold Pan',
  },
  {
    x: 10,
    z: -20,
    radius: 16,
    baseMineralization: 82,
    strata: 'Needle Pass Quartz Contact',
    primarySign: 'Milky Hydrothermal Bull Quartz Outcrop',
    secondarySigns: ['Limonite "iron hat" gossan vugs', 'Visible electrum micro-specks', 'Fractured fault gouge breccia'],
    recommendedTool: 'Pickaxe [4] or Dynamite [6]',
  },
  {
    x: 110,
    z: 20,
    radius: 20,
    baseMineralization: 85,
    strata: 'East Gully Hydrothermal Shear',
    primarySign: 'Reddish-Brown Gossan & Pyrite Boxworks',
    secondarySigns: ['Rotten quartz stringers', 'Manganese dioxide dendritic staining', 'High-density heavy mineral lag'],
    recommendedTool: 'Pickaxe [4] or Shovel [3]',
  },
  {
    x: 145,
    z: 95,
    radius: 26,
    baseMineralization: 95,
    strata: 'Lost Dutchman Ridge Bonanza Fault',
    primarySign: 'Deep-Seated Hydrothermal Quartz-Gold Chimney',
    secondarySigns: ['Virgin wire gold ribbons in fractured granite', 'Porphyry contact metamorphism', 'Arsenopyrite micro-crystals'],
    recommendedTool: 'Pickaxe [4] or Nitro Blasts [6]',
  },
  {
    x: 148,
    z: 98,
    radius: 22,
    baseMineralization: 92,
    strata: 'Mine Portal Vein Face',
    primarySign: 'Exposed Peralta High-Grade Quartz Lode',
    secondarySigns: ['Massive electrum plates', 'Silicified shear zone', 'Heavy iron oxide oxidation'],
    recommendedTool: 'Pickaxe [4] Strike Face',
  },
  {
    x: -108,
    z: -108,
    radius: 14,
    baseMineralization: 76,
    strata: 'Peralta Base Camp Arroyo Outcrop',
    primarySign: 'Hydrothermal Quartz Stringer in Granodiorite',
    secondarySigns: ['Fine alluvial placer flakes in wash gravel', 'Decomposed granite grus', 'Iron gossan crust'],
    recommendedTool: 'Shovel [3] or Pickaxe [4]',
  },
  {
    x: -18,
    z: -65,
    radius: 25,
    baseMineralization: 62,
    strata: 'Salt River Tributary Arroyo Wash',
    primarySign: 'Black Magnetite Sand Concentrations',
    secondarySigns: ['Heavy black sands in eddy bedrock traps', 'Smooth river cobbles', 'Fine placer dust trace'],
    recommendedTool: 'Shovel [3] & Gold Pan',
  },
  {
    x: 80,
    z: -85,
    radius: 18,
    baseMineralization: 58,
    strata: 'Weaver\'s Needle Talus Apron',
    primarySign: 'Volcanic Rhyolite Tuff Breccia Contact',
    secondarySigns: ['Thunder-egg obsidian nodules', 'Chalcedony veinlets', 'Disseminated micro-pyrite'],
    recommendedTool: 'Pickaxe [4]',
  },
];

/**
 * 2D Simplex/Perlin-style smooth continuous noise function for procedural mineral veins
 */
function mineralNoise2D(x: number, z: number): number {
  const n1 = Math.sin(x * 0.045 + z * 0.038);
  const n2 = Math.cos(x * 0.082 - z * 0.071);
  const n3 = Math.sin(x * 0.16 + z * 0.13) * 0.5;
  const n4 = Math.sin((x + z) * 0.015);
  return (n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1 + 1.0) * 0.5; // normalized 0..1
}

/**
 * Evaluates the authentic geological surface analysis at any 3D coordinate.
 */
export function analyzeSurfaceAtPosition(
  pos: THREE.Vector3,
  normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
  distance: number = 0,
  targetObject?: THREE.Object3D | null
): SurfaceAnalysisResult {
  const x = pos.x;
  const y = pos.y;
  const z = pos.z;

  // 1. Proximity to known mineral hotspots
  let maxHotspotMineralization = 0;
  let dominantHotspot: MineralHotspot | null = null;

  for (const spot of KNOWN_MINERAL_HOTSPOTS) {
    const dist2D = Math.hypot(x - spot.x, z - spot.z);
    if (dist2D <= spot.radius) {
      // Smooth bell curve falloff from center of hotspot
      const factor = 1 - (dist2D / spot.radius);
      const score = spot.baseMineralization * (0.35 + factor * 0.65);
      if (score > maxHotspotMineralization) {
        maxHotspotMineralization = score;
        dominantHotspot = spot;
      }
    }
  }

  // 2. Procedural geological background noise (fault lines & arroyo veins)
  const baseGeologicalNoise = mineralNoise2D(x, z);
  // Narrow auriferous fault lines: where noise is near specific threshold bands
  const faultBand1 = Math.exp(-Math.pow((baseGeologicalNoise - 0.72) / 0.08, 2));
  const faultBand2 = Math.exp(-Math.pow((baseGeologicalNoise - 0.38) / 0.06, 2));
  const proceduralVeinScore = Math.max(faultBand1 * 68, faultBand2 * 54);

  // 3. Object-specific mineralization bonuses
  let objectBonus = 0;
  let specificStrata = '';
  let specificSign = '';

  if (targetObject) {
    const name = targetObject.name || '';
    if (name.includes('gold') || name.includes('vein')) {
      objectBonus += 45;
      specificStrata = 'Hydrothermal Quartz-Gold Outcropping';
      specificSign = 'Massive Virgin Gold Ribbons in Quartz Matrix';
    } else if (name.includes('boulder') || name.includes('rock')) {
      objectBonus += 12;
      specificStrata = 'Weathered Granitic Desert Monolith';
      specificSign = 'Iron Oxide Weathering Crust & Micro-Pyrite Specks';
    } else if (name.includes('hole') || name.includes('shaft') || name.includes('mine')) {
      objectBonus += 30;
      specificStrata = 'Exposed Bedrock Excavation Face';
      specificSign = 'Shattered Fracture Wall with Mineralized Gouge';
    }
  }

  // 4. Combined Mineralization Index (0.0 to 100.0%)
  let totalMineralization = Math.max(
    maxHotspotMineralization,
    proceduralVeinScore + (baseGeologicalNoise * 14) + objectBonus
  );

  // Natural desert bedrock has a very low background rate (2 - 8%)
  totalMineralization = Math.min(99.4, Math.max(1.8, totalMineralization));
  totalMineralization = Math.round(totalMineralization * 10) / 10;

  // 5. Derive Gold Probability (steep sigmoid so gold is genuinely rare unless in a high-mineral zone)
  // Low ground (< 30%) has negligible chance (1-6%).
  // High ground (>= 60%) has high chance (45-85%).
  let goldProbability = 0.03;
  if (totalMineralization < 25) {
    goldProbability = 0.02 + (totalMineralization / 25) * 0.05; // 2% - 7%
  } else if (totalMineralization < 55) {
    goldProbability = 0.08 + ((totalMineralization - 25) / 30) * 0.22; // 8% - 30%
  } else {
    goldProbability = 0.35 + ((totalMineralization - 55) / 45) * 0.55; // 35% - 90%
  }
  goldProbability = Math.min(0.92, Math.max(0.02, Math.round(goldProbability * 100) / 100));

  // 6. Geological Strata & Signs of Gold identification
  const signs: string[] = [];
  let strata = dominantHotspot?.strata || specificStrata;
  let primarySign = dominantHotspot?.primarySign || specificSign;
  let recommendedAction = dominantHotspot?.recommendedTool || 'Scout with Goggles [G]';

  if (!strata) {
    if (y < 20) {
      strata = 'Alluvial Dry Wash Sand & River Gravel';
    } else if (y < 40) {
      strata = 'Caliche-Cemented Desert Hardpan';
    } else if (y < 65) {
      strata = 'Superstition Volcanic Rhyolite Tuff';
    } else if (y < 95) {
      strata = 'Banded Gneiss & Metamorphic Schist';
    } else {
      strata = 'Peralta Igneous Granodiorite Bedrock';
    }
  }

  // Signs selection based on mineralization
  if (totalMineralization >= 75) {
    if (!primarySign) primarySign = 'Dense Hydrothermal Quartz Float with Iron Vugs';
    signs.push(primarySign);
    signs.push('Visible electrum / native gold micro-specks');
    signs.push('Rusty limonite gossan capping (decomposed pyrite)');
    signs.push('Heavy black magnetite placer concentrate');
    recommendedAction = 'High Paydirt! Strike with Pickaxe [4] or Shovel [3]';
  } else if (totalMineralization >= 45) {
    if (!primarySign) primarySign = 'Rusty Iron Gossan ("Iron Hat") & Quartz Float';
    signs.push(primarySign);
    signs.push('Concentrated black sand (magnetite & ilmenite)');
    signs.push('Hydrothermal quartz stringers along joint fracture');
    recommendedAction = 'Favorable Contact! Shovel test trench or pick outcropping';
  } else if (totalMineralization >= 20) {
    if (!primarySign) primarySign = 'Faint Pyrite Weathering & Micro-Quartz Grit';
    signs.push(primarySign);
    signs.push('Disseminated iron staining along fracture plane');
    signs.push('Sparse alluvial black sand placer trace');
    recommendedAction = 'Low trace indication. Follow float upstream toward ridge';
  } else {
    primarySign = 'Barren Desert Overburden (Clean Sand / Silt)';
    signs.push(primarySign);
    signs.push('No hydrothermal quartz or heavy mineral concentration');
    signs.push('Barren alluvial wash sediment');
    recommendedAction = 'Barren Ground. Scout canyon washes and quartz contacts';
  }

  const estimatedDepth =
    totalMineralization >= 80
      ? 'Surface Float to Shallow Bedrock (0.1m - 0.8m)'
      : totalMineralization >= 50
      ? 'Subsurface Placer / Vein Contact (0.8m - 1.8m)'
      : 'Deep Bedrock (2.5m+ or Barren)';

  const soilMoisture =
    y < 18 ? 'Damp Subsurface Capillary Fringe' : y < 35 ? 'Bone Dry Alluvium' : 'Arid Volcanic Cap';

  // 7. Geological Material Classification (sand vs caliche vs rock vs quartz)
  let materialCategory: SurfaceMaterialCategory = 'sand';
  let formattedMaterial = 'Desert Alluvial Sand & Gravel';
  const slope = 1.0 - Math.abs(normal.y);
  const objName = (targetObject?.name || '').toLowerCase();

  if (objName.includes('gold') || objName.includes('vein') || (totalMineralization >= 65 && strata.toLowerCase().includes('quartz'))) {
    materialCategory = 'quartz';
    formattedMaterial = 'Hydrothermal Quartz Vein & Iron Gossan';
  } else if (
    objName.includes('boulder') ||
    objName.includes('rock') ||
    slope > 0.32 ||
    y > 50 ||
    strata.toLowerCase().includes('granite') ||
    strata.toLowerCase().includes('volcanic') ||
    strata.toLowerCase().includes('gneiss')
  ) {
    materialCategory = 'rock';
    formattedMaterial = slope > 0.32 ? 'Exposed Canyon Rock Face' : 'Weathered Granodiorite Boulder';
  } else if (strata.toLowerCase().includes('caliche') || (y >= 19 && y <= 38 && normal.y > 0.75)) {
    materialCategory = 'caliche';
    formattedMaterial = 'Caliche-Cemented Desert Hardpan';
  } else {
    materialCategory = 'sand';
    formattedMaterial = 'Alluvial Dry Wash Sand & Placer Gravel';
  }

  return {
    hit: true,
    distance: Math.round(distance * 10) / 10,
    position: pos.clone(),
    surfaceNormal: normal.clone(),
    strataName: strata,
    materialType: formattedMaterial,
    materialCategory,
    mineralization: totalMineralization,
    goldProbability,
    signsOfGold: signs,
    primarySign,
    recommendedAction,
    hasHighGradeAnomaly: totalMineralization >= 55,
    isAuriferousContact: totalMineralization >= 25,
    estimatedDepth,
    elevationMeters: Math.round(y * 10) / 10,
    soilMoisture,
  };
}
