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

/**
 * Calculates the pristine, undisturbed procedural elevation of the Superstition Mountains terrain at (x, z).
 */
export function getBaseTerrainHeight(x: number, z: number): number {
  // Boundary falloff so the world feels like a mountain basin surrounded by imposing outer ridges
  const distFromCenter = Math.hypot(x, z);
  const boundaryFalloff = Math.max(0, (distFromCenter - 265) * 0.45);

  // Canyon valley & ridge systems
  const scale1 = 0.008;
  const broadRidges = fbm(x * scale1, z * scale1, 4) * 38;

  // Rugged red rock strata & mesas
  const scale2 = 0.025;
  const rockyCrags = Math.pow(fbm(x * scale2 + 50, z * scale2 + 50, 3), 1.8) * 22;

  // Wash / arroyo carving: dry riverbeds and canyon passes
  const wash = Math.sin(x * 0.015 + z * 0.01) * Math.cos(z * 0.012 - x * 0.008);
  const arroyo = Math.abs(wash) * -8;

  // Special landmark features:
  // 1. Weaver's Needle base hill
  const distToNeedle = Math.hypot(x - 80, z - 15);
  let needleBase = 0;
  if (distToNeedle < 45) {
    needleBase = Math.max(0, (45 - distToNeedle) * 1.1);
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
    // Ridge surrounding the hidden cove
    mineRidge = Math.sin(Math.atan2(z - 110, x - 160) * 2) * 5 + 6;
  }

  const rawHeight = (broadRidges + rockyCrags + arroyo + needleBase + springDepression + mineRidge) * trailheadFlatten + boundaryFalloff;

  return Math.max(0.4, rawHeight);
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
    if (dist < hole.radius) {
      const norm = dist / hole.radius;
      // Parabolic bowl indentation
      const depression = hole.depth * (1.0 - norm * norm);
      h -= depression;
    } else if (dist < hole.radius * 1.5) {
      // Excavated dirt mound rim
      const rimDist = (dist - hole.radius) / (hole.radius * 0.5);
      const mound = Math.sin(rimDist * Math.PI) * (hole.depth * 0.15);
      h += mound;
    }
  }

  // Clamped so mining can never puncture below the world bedrock floor
  return Math.max(0.4, h);
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
  hardness: number; // 1: soft dirt, 2: tough caliche, 3: dense sandstone, 4: hard granite bedrock, 5: deep quartz bonanza
  description: string;
}

export const GEOLOGICAL_STRATA_LAYERS: GeologicalLayer[] = [
  {
    index: 0,
    id: 'strata_alluvial',
    name: 'Alluvial Desert Loam & Wash Gravel',
    strata: 'Surface Quaternary Silt & Wash Gravels',
    minDepth: 0.0,
    maxDepth: 1.0,
    rockType: 'dirt',
    debrisType: 'dirt',
    color: 0x825432,
    vertexColor: [0.38, 0.24, 0.14],
    hardness: 1,
    description: 'Loose red silt, dry wash gravel, and desert loam. Rich in fine alluvial placer gold flakes.',
  },
  {
    index: 1,
    id: 'strata_caliche',
    name: 'Desert Caliche Hardpan (Duricrust)',
    strata: 'Chalky Calcite Cemented Carbonate Crust',
    minDepth: 1.0,
    maxDepth: 2.5,
    rockType: 'calcite',
    debrisType: 'calcite',
    color: 0xede4d4,
    vertexColor: [0.72, 0.70, 0.62],
    hardness: 2,
    description: 'Dense, pale calcium carbonate crust that early Spanish explorers and miners had to fracture.',
  },
  {
    index: 2,
    id: 'strata_sandstone',
    name: 'Hematite Red Sandstone Shelf',
    strata: 'Oxidized Sedimentary Red Sandstone',
    minDepth: 2.5,
    maxDepth: 5.5,
    rockType: 'sandstone',
    debrisType: 'sandstone',
    color: 0xc87d46,
    vertexColor: [0.58, 0.24, 0.14],
    hardness: 3,
    description: 'Dense red sandstone stratum bearing rich quartz stringers, fossil tracks, and building stone.',
  },
  {
    index: 3,
    id: 'strata_granite',
    name: 'Precambrian Granite & Basalt Bedrock',
    strata: 'Crystalline Igneous Basement Bedrock',
    minDepth: 5.5,
    maxDepth: 9.0,
    rockType: 'granite',
    debrisType: 'granite',
    color: 0x5a504a,
    vertexColor: [0.22, 0.20, 0.20],
    hardness: 4,
    description: 'Extremely tough dark crystalline bedrock. Sparks fly under the pickaxe; yields quarry granite blocks.',
  },
  {
    index: 4,
    id: 'strata_bonanza',
    name: 'Hydrothermal Quartz Gold Chimney',
    strata: 'The Lost Dutchman Bonanza Quartz Lode',
    minDepth: 9.0,
    maxDepth: 18.0,
    rockType: 'quartz_gold',
    debrisType: 'quartz_gold',
    color: 0xf5f0e1,
    vertexColor: [0.94, 0.84, 0.45],
    hardness: 5,
    description: 'The ancient hydrothermal mother lode! Glistening milky quartz laden with crystalline electrum and raw rose gold.',
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

  // Maximum excavation depth clamped to impermeable mountain bedrock floor
  // Prevents digging through mountain walls to the other side or through the world floor
  const baseElev = getBaseTerrainHeight(x, z);
  const maxSafeDepth = Math.max(2.2, Math.min(16.0, baseElev - 0.4));

  if (hole) {
    hole.depth = Math.min(maxSafeDepth, hole.depth + effectiveIncrement);
    // Expand pit radius as it gets deeper to maintain walkable natural excavation slope
    hole.radius = Math.min(5.2, 1.85 + hole.depth * 0.18);
    hole.excavationCount++;
  } else {
    hole = {
      id: `hole_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      x,
      z,
      depth: Math.min(maxSafeDepth, effectiveIncrement),
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

  // Timber shoring secures the pit up to shoredUntilDepth!
  // Digging past that depth exposes un-shored lower walls, requiring the next tier of shoring.
  if (hole.depth <= shoredUntil) {
    hole.isShored = true;
    hole.stability = 100;
  } else {
    hole.isShored = false;

    if (hole.depth >= 1.15) {
      // Un-shored excavation: Lateral soil pressure & overburden tension on newly exposed deep earth
      const unShoredDepth = hole.depth - shoredUntil;
      const depthStress = 8.0 + Math.pow(unShoredDepth, 1.35) * 4.5;
      hole.stability = Math.max(0, (hole.stability !== undefined ? hole.stability : 100) - depthStress);

      if (hole.stability <= 25) {
        // ⚠️ CATASTROPHIC PIT RIM SLUMP!
        // Unsupported lower earth collapses back into the trench bottom!
        slumpAmount = Math.min(hole.depth * 0.45, 0.4 + Math.random() * 0.5);
        // Slump fills back un-shored bench, but timbers protect upper shored bench
        hole.depth = Math.max(Math.max(0.85, shoredUntil), hole.depth - slumpAmount);
        hole.totalSlumpedDepth = (hole.totalSlumpedDepth || 0) + slumpAmount;
        hole.lastSlumpTime = Date.now();
        slumpOccurred = true;

        // Greedy/desperate prospectors digging without shoring face serious injury or fatal burial
        if (hole.stability <= 5) {
          // Digging blindly at zero stability triggers complete burial!
          slumpDamage = 100;
          slumpFatal = true;
          hole.stability = 45;
        } else {
          slumpDamage = 35 + Math.floor(Math.random() * 25);
          hole.stability = 50;
        }
      } else if (hole.stability <= 65) {
        needsShoring = true;
      }
    } else {
      hole.stability = 100;
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
  if (activeTerrainMesh) {
    const geom = activeTerrainMesh.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const colors = geom.attributes.color as THREE.BufferAttribute;

    const R = hole.radius * 1.65;
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

          if (dist <= hole.radius * 1.35 && colors) {
            const baseY = getBaseTerrainHeight(vx, vz);
            const vertexDepth = Math.max(0, baseY - newY);
            const vLayer = getGeologicalLayerAtDepth(vertexDepth);
            const blendFactor = Math.min(1.0, vertexDepth / 0.45);

            // Interpolate vertex color smoothly towards the exposed geological rock strata color
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

  // Calculate strata-specific rock yields
  let rocksAwarded = 1;
  if (newLayer.index === 1) rocksAwarded = 2; // Caliche crust blocks
  else if (newLayer.index === 2) rocksAwarded = 3; // Quarry sandstone
  else if (newLayer.index === 3) rocksAwarded = 4; // Granite blocks
  else if (newLayer.index === 4) rocksAwarded = 3; // Bonanza quartz

  // Procedural discovery generation tailored to depth & geological stratum
  let goldAwarded = 0;
  let itemFound: DigResult['itemFound'] = undefined;
  const roll = Math.random();

  if (newLayer.index === 0) {
    // Surface Alluvial Layer: fine placer gold, pioneer debris
    if (roll < 0.40) {
      goldAwarded = parseFloat((0.2 + Math.random() * 0.7).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz Alluvial Placer Flakes`,
        type: 'gold',
        value: goldAwarded,
        description: 'Fine alluvial gold flakes scooped from the wash gravels.',
      };
    } else if (roll < 0.55) {
      itemFound = {
        name: 'Pioneer Mule Horseshoe',
        type: 'relic',
        value: 0.5,
        description: 'Hand-forged 1870s iron shoe from a prospector pack train.',
      };
    }
  } else if (newLayer.index === 1) {
    // Caliche Hardpan: Spanish colonial relics & cemented coarse nuggets
    if (roll < 0.50) {
      goldAwarded = parseFloat((0.8 + Math.random() * 1.4).toFixed(1));
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
    // Red Sandstone Strata: Oxidized quartz veins & Peralta maps
    if (roll < 0.60) {
      goldAwarded = parseFloat((1.5 + Math.random() * 2.2).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz Hematite Quartz-Gold Specimen`,
        type: 'gold',
        value: goldAwarded,
        description: 'Rich wire gold stringer embedded in oxidized red sandstone.',
      };
    } else if (roll < 0.75) {
      itemFound = {
        name: 'Carved Peralta Stone Map Piece',
        type: 'relic',
        value: 3.0,
        description: 'Red sandstone fragment carved with mysterious Spanish mining trails.',
      };
    } else if (roll < 0.85) {
      itemFound = {
        name: 'Banded Desert Agate Geode',
        type: 'mineral',
        value: 1.2,
        description: 'Hollow silica nodule filled with sparkling quartz crystals!',
      };
    }
  } else if (newLayer.index === 3) {
    // Granite Bedrock: High-grade electrum ore, silver veins, amethyst geodes
    if (roll < 0.70) {
      goldAwarded = parseFloat((2.8 + Math.random() * 3.4).toFixed(1));
      itemFound = {
        name: `${goldAwarded} oz High-Grade Electrum Bedrock Ore`,
        type: 'gold',
        value: goldAwarded,
        description: 'Dense crystalline gold-silver alloy fractured from the Precambrian granite basement.',
      };
    } else if (roll < 0.85) {
      itemFound = {
        name: 'Sparkling Deep Amethyst Geode',
        type: 'mineral',
        value: 2.5,
        description: 'Spectacular royal-purple quartz crystal cluster extracted from a bedrock tectonic fissure.',
      };
    }
  } else {
    // Hydrothermal Quartz Chimney: BONANZA MOTHER LODE!
    goldAwarded = parseFloat((5.0 + Math.random() * 6.5).toFixed(1));
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
    strataMessage = `⚠️ PIT WALL SLUMP! ${slumpAmount.toFixed(2)}m of unsupported gravel collapsed into the pit! Depth reduced to ${hole.depth.toFixed(1)}m. Press [T] to Shore Trench!`;
  } else if (layerChanged && hole.depth >= 1.0) {
    strataMessage = `⚡ PENETRATED NEW STRATA: [${newLayer.name.toUpperCase()}] at ${hole.depth.toFixed(1)}m deep!`;
  } else if (itemFound && itemFound.type === 'gold') {
    strataMessage = `⛏️ Depth ${hole.depth.toFixed(1)}m (${newLayer.name}): Uncovered ${itemFound.name}!`;
  } else if (itemFound) {
    strataMessage = `⛏️ Depth ${hole.depth.toFixed(1)}m (${newLayer.name}): Excavated ${itemFound.name}!`;
  } else if (needsShoring) {
    strataMessage = `⛏️ Depth ${hole.depth.toFixed(1)}m | ${newLayer.name} (⚠️ Pit unstable: ${Math.round(hole.stability)}%! Overburden slumping—Press [T] to Shore)`;
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
    goldAwarded,
    itemFound,
    slumpOccurred,
    slumpAmount,
    stability: hole.stability,
    needsShoring,
    slumpDamage,
    slumpFatal,
  };
}

/**
 * Updates terrain mesh vertices and rock-strata shading colors around a specific dug hole.
 */
export function updateTerrainMeshForHole(hole: DugHole) {
  if (!activeTerrainMesh) return;
  const geom = activeTerrainMesh.geometry as THREE.BufferGeometry;
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const colors = geom.attributes.color as THREE.BufferAttribute;

  const R = hole.radius * 1.65;
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

        if (dist <= hole.radius * 1.35 && colors) {
          const baseY = getBaseTerrainHeight(vx, vz);
          const vertexDepth = Math.max(0, baseY - newY);
          const vLayer = getGeologicalLayerAtDepth(vertexDepth);
          const blendFactor = Math.min(1.0, vertexDepth / 0.45);

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
 * Creates a detailed 3D historical Timber Trench Shoring & Cribbing structure:
 * - Square pine collar box at ground level
 * - 4 heavy upright timber lagging posts sunk down into the excavation
 * - Heavy horizontal cross-struts (walers) with iron bracket connectors
 * - Stone foundation pads anchoring the upright timbers
 */
export function createTrenchShoringMesh(hole: DugHole): THREE.Group {
  const group = new THREE.Group();
  group.name = `shoring_${hole.id}`;

  const baseY = getBaseTerrainHeight(hole.x, hole.z);
  // Timbers only reach down to the currently shored depth tier
  const shoringDepth = Math.max(1.15, Math.min(hole.depth, hole.shoredUntilDepth || hole.depth));
  const R = hole.radius * 0.88;

  // Authentic 19th-Century Rough-Sawn Pine Timbers
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x6e4a2d,
    roughness: 0.88,
    metalness: 0.08,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x242220,
    roughness: 0.65,
    metalness: 0.85,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x5a504a,
    roughness: 0.9,
    metalness: 0.05,
  });

  // 1. Surface Collar Box (4 interlocking heavy timbers around pit rim)
  const collarSize = R * 2.1;
  const collarThickness = 0.28;
  const collarHeight = 0.28;

  // North & South beams
  [-R * 1.05, R * 1.05].forEach((posZ) => {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(collarSize + 0.35, collarHeight, collarThickness),
      timberMat
    );
    beam.position.set(0, 0.14, posZ);
    beam.castShadow = true;
    group.add(beam);
  });

  // East & West beams
  [-R * 1.05, R * 1.05].forEach((posX) => {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(collarThickness, collarHeight, collarSize + 0.35),
      timberMat
    );
    beam.position.set(posX, 0.14, 0);
    beam.castShadow = true;
    group.add(beam);
  });

  // 2. Corner Upright Timber Lagging Posts (4 vertical legs sinking into the pit)
  const postThickness = 0.26;
  const cornerOffsets = [
    [-R * 0.95, -R * 0.95],
    [R * 0.95, -R * 0.95],
    [-R * 0.95, R * 0.95],
    [R * 0.95, R * 0.95],
  ];

  cornerOffsets.forEach(([cx, cz]) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(postThickness, shoringDepth + 0.35, postThickness),
      timberMat
    );
    post.position.set(cx, -shoringDepth / 2 + 0.1, cz);
    post.castShadow = true;
    group.add(post);

    // Dressed granite foundation pad at bottom of upright
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(postThickness * 1.5, 0.22, postThickness * 1.5),
      stoneMat
    );
    pad.position.set(cx, -shoringDepth + 0.1, cz);
    group.add(pad);
  });

  // 3. Heavy Pine Cross-Struts (Walers bracing against trench wall collapse)
  const tiers = Math.max(1, Math.floor(shoringDepth / 1.4));
  for (let tier = 1; tier <= tiers; tier++) {
    const tierY = -(tier * (shoringDepth / (tiers + 1)));

    // Cross brace X
    const braceX = new THREE.Mesh(
      new THREE.BoxGeometry(collarSize * 0.88, 0.20, 0.20),
      timberMat
    );
    braceX.position.set(0, tierY, 0);
    braceX.castShadow = true;
    group.add(braceX);

    // Cross brace Z
    const braceZ = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.20, collarSize * 0.88),
      timberMat
    );
    braceZ.position.set(0, tierY - 0.11, 0);
    braceZ.castShadow = true;
    group.add(braceZ);

    // Iron connector plates at intersection
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.26, 0.26),
      ironMat
    );
    bracket.position.set(0, tierY - 0.05, 0);
    group.add(bracket);
  }

  // 4. Perimeter Side Lagging Planks (bracing loose side walls)
  const plankCount = 4;
  for (let i = 0; i < plankCount; i++) {
    const angle = (i / plankCount) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(angle) * (R * 1.02);
    const pz = Math.sin(angle) * (R * 1.02);
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, shoringDepth * 0.85, 0.75),
      timberMat
    );
    plank.position.set(px, -shoringDepth * 0.45, pz);
    plank.rotation.y = angle + Math.PI / 2;
    group.add(plank);
  }

  group.position.set(hole.x, baseY, hole.z);
  return group;
}

/**
 * Reinforces an active excavation trench with heavy timber cribbing, protecting it from overburden collapse.
 */
export function shoreExcavationPit(
  holeId: string,
  scene?: THREE.Scene
): { success: boolean; message: string; rocksUsed: number; hole?: DugHole } {
  const hole = activeDugHoles.find((h) => h.id === holeId);
  if (!hole) {
    return { success: false, message: 'Excavation trench not found.', rocksUsed: 0 };
  }

  if (hole.depth < 0.9) {
    return { success: false, message: 'Trench is too shallow to require timber shoring (depth < 1.0m). Dig deeper first!', rocksUsed: 0, hole };
  }

  const prevShored = hole.shoredUntilDepth || 0;
  // If already shored for the current depth with significant margin remaining:
  if (hole.isShored && prevShored > hole.depth + 0.35) {
    return {
      success: false,
      message: `Trench is already securely timbered down to ${prevShored.toFixed(1)}m! Dig deeper to the next depth tier before extending framing.`,
      rocksUsed: 0,
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
  return {
    success: true,
    message: isExtension
      ? `🛡️ Timber Shoring Extended! Lower walls secured down to ${nextShoredDepth.toFixed(1)}m depth for the next excavation tier.`
      : `🛡️ Timber Shoring Installed! Pit walls secured down to ${nextShoredDepth.toFixed(1)}m depth against collapse.`,
    rocksUsed: 3,
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
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a photorealistic PBR terrain material using GLSL shaders for slope-based rock blending,
 * sedimentary cliff strata, desert varnish, and surface micro-relief normal bump mapping.
 */
export function createRealisticTerrainMaterial(noiseTexture: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: false,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTerrainNoise = { value: noiseTexture };

    // Vertex shader: pass true 3D world position and world normal
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWorldNormal = normalize((modelMatrix * vec4(transformedNormal, 0.0)).xyz);`
    );

    // Fragment shader: slope-based blending, sedimentary strata & normal bump mapping
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D uTerrainNoise;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 tNorm = normalize(vWorldNormal);
      float slope = 1.0 - clamp(tNorm.y, 0.0, 1.0);

      // Triplanar procedural sampling of geological texture
      vec4 texX = texture2D(uTerrainNoise, vWorldPos.yz * 0.06);
      vec4 texY = texture2D(uTerrainNoise, vWorldPos.xz * 0.06);
      vec4 texZ = texture2D(uTerrainNoise, vWorldPos.xy * 0.06);
      vec3 blend = abs(tNorm);
      blend /= (blend.x + blend.y + blend.z);
      vec4 rockTex = texX * blend.x + texY * blend.y + texZ * blend.z;

      // Realistic horizontal sedimentary strata bands on cliffs and crags
      float strata = sin(vWorldPos.y * 1.55 + rockTex.r * 2.8) * 0.14 + cos(vWorldPos.y * 0.62) * 0.09;
      vec3 cliffRock = vec3(0.74, 0.29, 0.16) + strata * vec3(0.19, 0.09, 0.05);
      cliffRock = mix(cliffRock, vec3(0.24, 0.18, 0.14), rockTex.a * 0.38); // Desert varnish patina

      // Sandy wash / arroyo base with micro pebble grit
      vec3 sandBase = diffuseColor.rgb * (0.86 + rockTex.g * 0.22);

      // Blend based on steepness of the terrain surface
      diffuseColor.rgb = mix(sandBase, cliffRock, smoothstep(0.26, 0.68, slope));
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
      // Surface micro-relief bump mapping from procedural rock noise
      float h = rockTex.r * 0.5 + rockTex.g * 0.35 + rockTex.b * 0.15;
      vec3 bump = vec3(dFdx(h), dFdy(h), 0.0);
      normal = normalize(normal - bump * 2.6);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      // Sand is high roughness, basalt/sandstone cliff rock is slightly lower roughness with mineral sheen
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

    // Color computation
    const distToSpring = Math.hypot(vx - (-70), vz - (-20));
    let r = 0.82;
    let g = 0.63;
    let b = 0.44;

    if (distToSpring < 22) {
      // Lush vegetation near spring
      const factor = 1 - distToSpring / 22;
      r = 0.42 * factor + r * (1 - factor);
      g = 0.54 * factor + g * (1 - factor);
      b = 0.26 * factor + b * (1 - factor);
    } else if (vy > 35) {
      // High volcanic basalt ridge
      r = 0.42;
      g = 0.33;
      b = 0.28;
    } else if (vy > 18) {
      // Red rock cliffs & spires
      const strata = Math.sin(vy * 0.8) * 0.08;
      r = 0.72 + strata;
      g = 0.32 + strata * 0.5;
      b = 0.18 + strata * 0.3;
    } else if (vy > 6) {
      // Terracotta desert slope
      r = 0.78;
      g = 0.48;
      b = 0.30;
    } else {
      // Sandy wash / arroyo floor
      r = 0.84 + Math.sin(vx * 0.1) * 0.03;
      g = 0.68 + Math.cos(vz * 0.1) * 0.03;
      b = 0.48;
    }

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const noiseTexture = generateTerrainNoiseTexture(256);
  const material = createRealisticTerrainMaterial(noiseTexture);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  activeTerrainMesh = mesh;
  return mesh;
}
