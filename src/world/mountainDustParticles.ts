import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

export type MountainRockMaterial =
  | 'sandstone'
  | 'volcanic_crag'
  | 'stepped_mesa'
  | 'fault_monocline'
  | 'canyon_spire'
  | 'granite'
  | 'basalt'
  | 'caliche'
  | 'calcite'
  | 'tuff'
  | 'gneiss'
  | 'quartz_gold'
  | 'quartz'
  | 'silver_ore'
  | 'amethyst'
  | 'copper'
  | 'pyrite_gravel'
  | 'dirt';

export interface MaterialIntensityConfig {
  name: string;
  hardness: number; // 1 (softest/loose) to 6 (bonanza quartz bedrock)
  intensity: number; // 0.1 to 1.0 (material resistance/density factor)
  dustColors: number[]; // Primary and secondary dust cloud colors
  sparkColor: number;
  baseCloudRadius: number; // Cloud size bloom radius in meters
  billowCount: number; // Number of volumetric dust puffs (density)
  microDustCount: number; // Micro-silt powder count (atmospheric density)
  sparkCount: number; // Incandescent friction sparks
  chipCount: number; // Angular flying stone fragments
  chipScale: number; // Fragment size
  expansionSpeed: number; // Outward expansion rate
  baseOpacity: number; // Optical thickness of dust
  dustLifetime: number; // Duration of dust lingering in seconds
  description: string;
}

export const MOUNTAIN_MATERIAL_PRESETS: Record<MountainRockMaterial, MaterialIntensityConfig> = {
  // 1. Sedimentary / Friable Rock: Massive expansive, thick billowing dust cloud, high silt density, low sparks
  sandstone: {
    name: 'Southwestern Red Sandstone',
    hardness: 2,
    intensity: 0.35,
    dustColors: [0xd07c42, 0xd8884e, 0xba6832, 0xe49a64],
    sparkColor: 0xffa500,
    baseCloudRadius: 1.85,
    billowCount: 18,
    microDustCount: 65,
    sparkCount: 1,
    chipCount: 7,
    chipScale: 0.11,
    expansionSpeed: 2.6,
    baseOpacity: 0.78,
    dustLifetime: 1.6,
    description: 'Friable porous sandstone yielding expansive, rolling terracotta dust billows.',
  },
  canyon_spire: {
    name: 'Weathered Canyon Sandstone Spire',
    hardness: 2,
    intensity: 0.38,
    dustColors: [0xc8753d, 0xd48248, 0xaf5f28, 0xdf945c],
    sparkColor: 0xffaa33,
    baseCloudRadius: 1.75,
    billowCount: 17,
    microDustCount: 60,
    sparkCount: 2,
    chipCount: 7,
    chipScale: 0.10,
    expansionSpeed: 2.5,
    baseOpacity: 0.76,
    dustLifetime: 1.5,
    description: 'Aeolian sandstone pinnacle pulverizing into dense desert sand flour.',
  },
  caliche: {
    name: 'Desert Caliche Hardpan',
    hardness: 2,
    intensity: 0.42,
    dustColors: [0xede4d4, 0xded2be, 0xf6eee2, 0xd2c4ae],
    sparkColor: 0xffe4b5,
    baseCloudRadius: 1.70,
    billowCount: 16,
    microDustCount: 55,
    sparkCount: 2,
    chipCount: 6,
    chipScale: 0.09,
    expansionSpeed: 2.4,
    baseOpacity: 0.82,
    dustLifetime: 1.55,
    description: 'Chalky duricrust fracturing into dense, powdery bone-white dust.',
  },
  tuff: {
    name: 'Volcanic Ash-Flow Tuff',
    hardness: 3,
    intensity: 0.52,
    dustColors: [0xb88e74, 0xc79d84, 0xaa7e64, 0xd5ad95],
    sparkColor: 0xffb347,
    baseCloudRadius: 1.55,
    billowCount: 15,
    microDustCount: 50,
    sparkCount: 5,
    chipCount: 8,
    chipScale: 0.10,
    expansionSpeed: 2.3,
    baseOpacity: 0.74,
    dustLifetime: 1.45,
    description: 'Welded volcanic ash with moderate cohesion and warm buff billow clouds.',
  },
  stepped_mesa: {
    name: 'Sedimentary Mesa Butte Caprock',
    hardness: 3,
    intensity: 0.58,
    dustColors: [0xa87e66, 0xb88c74, 0x986f56, 0xc89e86],
    sparkColor: 0xffbf66,
    baseCloudRadius: 1.50,
    billowCount: 14,
    microDustCount: 48,
    sparkCount: 6,
    chipCount: 8,
    chipScale: 0.11,
    expansionSpeed: 2.3,
    baseOpacity: 0.73,
    dustLifetime: 1.4,
    description: 'Layered mesa strata throwing balanced dust plumes and tabular rock wafers.',
  },
  fault_monocline: {
    name: 'Tilted Monocline Quartzite-Sandstone',
    hardness: 4,
    intensity: 0.72,
    dustColors: [0x8c6e60, 0x9c7c6e, 0x7a5c50, 0xae8e80],
    sparkColor: 0xffd27f,
    baseCloudRadius: 1.30,
    billowCount: 12,
    microDustCount: 42,
    sparkCount: 11,
    chipCount: 9,
    chipScale: 0.12,
    expansionSpeed: 2.2,
    baseOpacity: 0.72,
    dustLifetime: 1.3,
    description: 'Metamorphic tilted strata producing ringing sparks and sharp stone flakes.',
  },
  // 2. Hard Bedrock Monoliths: Concentrated, high-velocity powder burst, intense incandescent sparks, high-speed chips
  volcanic_crag: {
    name: 'Superstition Rhyolite & Basalt Crag',
    hardness: 5,
    intensity: 0.86,
    dustColors: [0x543c34, 0x644c42, 0x442c24, 0x74584c],
    sparkColor: 0xffa040,
    baseCloudRadius: 1.15,
    billowCount: 11,
    microDustCount: 38,
    sparkCount: 16,
    chipCount: 10,
    chipScale: 0.12,
    expansionSpeed: 2.8,
    baseOpacity: 0.85,
    dustLifetime: 1.25,
    description: 'Dense volcanic monolith resisting the chisel with sharp sparks and high-speed rock shards.',
  },
  basalt: {
    name: 'Dark Columnar Basalt',
    hardness: 5,
    intensity: 0.88,
    dustColors: [0x3c3836, 0x484240, 0x2e2b2a, 0x585250],
    sparkColor: 0xff9436,
    baseCloudRadius: 1.10,
    billowCount: 10,
    microDustCount: 36,
    sparkCount: 18,
    chipCount: 11,
    chipScale: 0.12,
    expansionSpeed: 2.9,
    baseOpacity: 0.86,
    dustLifetime: 1.2,
    description: 'Extremely tough volcanic basalt throwing incandescent orange sparks.',
  },
  gneiss: {
    name: 'Precambrian Banded Gneiss',
    hardness: 5,
    intensity: 0.88,
    dustColors: [0x504e4c, 0x605e5a, 0x403e3c, 0x706c68],
    sparkColor: 0xffdf80,
    baseCloudRadius: 1.10,
    billowCount: 10,
    microDustCount: 36,
    sparkCount: 17,
    chipCount: 10,
    chipScale: 0.12,
    expansionSpeed: 2.8,
    baseOpacity: 0.84,
    dustLifetime: 1.25,
    description: 'Foliated metamorphic bedrock creating dense gray powder bursts and flying stone chips.',
  },
  granite: {
    name: 'Peralta Plutonic Granite Bedrock',
    hardness: 5,
    intensity: 0.92,
    dustColors: [0x625d58, 0x726c66, 0x504c48, 0x827c76],
    sparkColor: 0xfff0aa,
    baseCloudRadius: 1.05,
    billowCount: 10,
    microDustCount: 35,
    sparkCount: 20,
    chipCount: 11,
    chipScale: 0.13,
    expansionSpeed: 3.0,
    baseOpacity: 0.88,
    dustLifetime: 1.2,
    description: 'Massive granite bedrock throwing vivid sparks and concentrated high-pressure dust bursts.',
  },
  // 3. Vitreous Hydrothermal Quartz Vein: Maximum brittle hardness, brilliant sparks, sparkling white-gold dust
  quartz_gold: {
    name: 'Hydrothermal Quartz Gold Vein',
    hardness: 6,
    intensity: 1.0,
    dustColors: [0xfdfbf7, 0xf7edd2, 0xfae588, 0xffffff],
    sparkColor: 0xfff3a8,
    baseCloudRadius: 1.25,
    billowCount: 13,
    microDustCount: 50,
    sparkCount: 26,
    chipCount: 12,
    chipScale: 0.14,
    expansionSpeed: 3.1,
    baseOpacity: 0.85,
    dustLifetime: 1.35,
    description: 'Vitreous quartz shattering with brilliant golden friction sparks and shimmering white mineral dust.',
  },
  quartz: {
    name: 'Crystalline Bull Quartz',
    hardness: 6,
    intensity: 0.96,
    dustColors: [0xf8f8f8, 0xeeeeee, 0xf2ede4, 0xffffff],
    sparkColor: 0xffffff,
    baseCloudRadius: 1.20,
    billowCount: 12,
    microDustCount: 46,
    sparkCount: 22,
    chipCount: 11,
    chipScale: 0.13,
    expansionSpeed: 2.9,
    baseOpacity: 0.82,
    dustLifetime: 1.3,
    description: 'Pure crystalline quartz emitting sharp conchoidal chips and brilliant white sparks.',
  },
  // 4. Subterranean Mine Ores & Mineral Strata
  calcite: {
    name: 'Crystalline Calcite & Spar',
    hardness: 3,
    intensity: 0.48,
    dustColors: [0xf5efe6, 0xe8dfd1, 0xfffcf7, 0xdcd0bf],
    sparkColor: 0xfff5e6,
    baseCloudRadius: 1.60,
    billowCount: 15,
    microDustCount: 52,
    sparkCount: 3,
    chipCount: 7,
    chipScale: 0.10,
    expansionSpeed: 2.3,
    baseOpacity: 0.80,
    dustLifetime: 1.45,
    description: 'Rhomboidal calcite cleavage shearing into fine calcium flour dust.',
  },
  silver_ore: {
    name: 'Argentiferous Galena & Silver Vein',
    hardness: 5,
    intensity: 0.88,
    dustColors: [0x687178, 0x828b94, 0x4e5459, 0xa4b0bc],
    sparkColor: 0xd6f0ff,
    baseCloudRadius: 1.15,
    billowCount: 11,
    microDustCount: 40,
    sparkCount: 22,
    chipCount: 11,
    chipScale: 0.12,
    expansionSpeed: 2.9,
    baseOpacity: 0.86,
    dustLifetime: 1.25,
    description: 'Heavy metallic galena and silver fracture throwing electric blue-silver sparks and dark slate dust.',
  },
  amethyst: {
    name: 'Imperial Amethyst Geode Cavity',
    hardness: 6,
    intensity: 0.96,
    dustColors: [0x783682, 0x9648a4, 0x582460, 0xcaa0d8],
    sparkColor: 0xf5d0ff,
    baseCloudRadius: 1.20,
    billowCount: 13,
    microDustCount: 46,
    sparkCount: 24,
    chipCount: 11,
    chipScale: 0.13,
    expansionSpeed: 3.0,
    baseOpacity: 0.84,
    dustLifetime: 1.35,
    description: 'Vitreous purple quartz geode shattering into shimmering lilac crystal silt and violet sparks.',
  },
  copper: {
    name: 'Native Copper & Malachite Vein',
    hardness: 4,
    intensity: 0.72,
    dustColors: [0xb86444, 0x3d8268, 0xc97250, 0x549e82],
    sparkColor: 0x66ffcc,
    baseCloudRadius: 1.40,
    billowCount: 13,
    microDustCount: 44,
    sparkCount: 14,
    chipCount: 9,
    chipScale: 0.11,
    expansionSpeed: 2.5,
    baseOpacity: 0.80,
    dustLifetime: 1.4,
    description: 'Fibrous malachite and copper throwing teal-green sparks and oxidized terracotta dust.',
  },
  pyrite_gravel: {
    name: "Auriferous Pyrite (Fool's Gold)",
    hardness: 5,
    intensity: 0.84,
    dustColors: [0x826e42, 0x9e8654, 0x645430, 0xba9e64],
    sparkColor: 0xffd700,
    baseCloudRadius: 1.25,
    billowCount: 12,
    microDustCount: 42,
    sparkCount: 20,
    chipCount: 10,
    chipScale: 0.12,
    expansionSpeed: 2.7,
    baseOpacity: 0.84,
    dustLifetime: 1.3,
    description: 'Brassy iron disulfide striking sharp golden sparks and sulfuric ochre dust.',
  },
  // 5. Loose Desert Soil
  dirt: {
    name: 'Desert Wash Alluvium',
    hardness: 1,
    intensity: 0.20,
    dustColors: [0x8e5c38, 0x9f6a44, 0x7c4e2c, 0xb07a50],
    sparkColor: 0xff9933,
    baseCloudRadius: 1.80,
    billowCount: 16,
    microDustCount: 55,
    sparkCount: 0,
    chipCount: 4,
    chipScale: 0.08,
    expansionSpeed: 2.4,
    baseOpacity: 0.75,
    dustLifetime: 1.5,
    description: 'Loose gravel alluvium creating soft, billowing desert dust clouds.',
  },
};

export function getMaterialConfig(materialName: string): MaterialIntensityConfig {
  const normalized = materialName.toLowerCase().replace(/[\s-]+/g, '_');
  if (MOUNTAIN_MATERIAL_PRESETS[normalized as MountainRockMaterial]) {
    return MOUNTAIN_MATERIAL_PRESETS[normalized as MountainRockMaterial];
  }
  // Subterranean & Geological Strata Alias Mapping
  if (normalized.includes('silver') || normalized.includes('galena')) return MOUNTAIN_MATERIAL_PRESETS.silver_ore;
  if (normalized.includes('amethyst') || normalized.includes('purple')) return MOUNTAIN_MATERIAL_PRESETS.amethyst;
  if (normalized.includes('copper') || normalized.includes('malachite')) return MOUNTAIN_MATERIAL_PRESETS.copper;
  if (normalized.includes('pyrite')) return MOUNTAIN_MATERIAL_PRESETS.pyrite_gravel;
  if (normalized.includes('calcite')) return MOUNTAIN_MATERIAL_PRESETS.calcite;
  if (normalized.includes('gold') || normalized.includes('electrum')) return MOUNTAIN_MATERIAL_PRESETS.quartz_gold;
  if (normalized.includes('quartz')) return MOUNTAIN_MATERIAL_PRESETS.quartz;
  if (normalized.includes('basalt') || normalized.includes('caldera')) return MOUNTAIN_MATERIAL_PRESETS.basalt;
  if (normalized.includes('granit') || normalized.includes('granodiorite') || normalized.includes('diorite')) return MOUNTAIN_MATERIAL_PRESETS.granite;
  if (normalized.includes('schist') || normalized.includes('gneiss')) return MOUNTAIN_MATERIAL_PRESETS.gneiss;
  if (normalized.includes('dacite') || normalized.includes('crag')) return MOUNTAIN_MATERIAL_PRESETS.volcanic_crag;
  if (normalized.includes('tuff')) return MOUNTAIN_MATERIAL_PRESETS.tuff;
  if (normalized.includes('caliche')) return MOUNTAIN_MATERIAL_PRESETS.caliche;
  if (normalized.includes('dirt') || normalized.includes('sand') || normalized.includes('gravel')) return MOUNTAIN_MATERIAL_PRESETS.dirt;
  return MOUNTAIN_MATERIAL_PRESETS.sandstone;
}

// Procedural Particle Texture Generators
function createOrganicDustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  // Layered soft radial gradients with organic turbulence
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.22, 'rgba(255, 255, 255, 0.80)');
  grad.addColorStop(0.50, 'rgba(240, 240, 240, 0.38)');
  grad.addColorStop(0.78, 'rgba(220, 220, 220, 0.10)');
  grad.addColorStop(1.0, 'rgba(200, 200, 200, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  // Add subtle organic mottling so billows don't look like flat billiard balls
  for (let i = 0; i < 28; i++) {
    const ox = 64 + (Math.random() - 0.5) * 55;
    const oy = 64 + (Math.random() - 0.5) * 55;
    const rad = 10 + Math.random() * 24;
    const subGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, rad);
    subGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.22)');
    subGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = subGrad;
    ctx.beginPath();
    ctx.arc(ox, oy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createFrictionSparkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);

  // Intense incandescent core with soft bloom halo
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(255, 245, 190, 0.95)');
  grad.addColorStop(0.5, 'rgba(255, 180, 50, 0.45)');
  grad.addColorStop(0.85, 'rgba(255, 90, 0, 0.12)');
  grad.addColorStop(1.0, 'rgba(255, 50, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createShockwaveRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 35, 64, 64, 60);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

interface ActiveDustPuff {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  rotSpeed: number;
  initialScale: number;
  maxScale: number;
  initialOpacity: number;
  life: number;
  maxLife: number;
  expansionFactor: number;
  liftSpeed: number;
  drag: number;
}

interface ActiveFrictionSpark {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
}

interface ActiveStoneChip {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
  groundY: number;
  hasBounced: boolean;
}

interface ActiveMicroDust {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
}

interface ActiveShockwave {
  mesh: THREE.Mesh;
  initialScale: number;
  maxScale: number;
  initialOpacity: number;
  life: number;
  maxLife: number;
}

/**
 * High-Performance Mountain Pickaxe Strike Particle System.
 * Generates volumetric billowing dust clouds, high-velocity incandescent friction sparks,
 * and physical 3D flying stone chips scaled directly to the rock's material intensity.
 */
export class MountainDustParticleSystem {
  private scene: THREE.Scene;
  private readonly rootGroup: THREE.Group;

  // Procedural Textures
  private readonly dustTexture: THREE.CanvasTexture;
  private readonly sparkTexture: THREE.CanvasTexture;
  private readonly shockwaveTexture: THREE.CanvasTexture;

  // Active Particle Arrays
  private dustPuffs: ActiveDustPuff[] = [];
  private sparks: ActiveFrictionSpark[] = [];
  private stoneChips: ActiveStoneChip[] = [];
  private microDust: ActiveMicroDust[] = [];
  private shockwaves: ActiveShockwave[] = [];

  // Geometries for stone chips & micro grit (preallocated for zero GC)
  private readonly chipGeos: THREE.BufferGeometry[] = [];
  private readonly microDustGeo: THREE.BufferGeometry;
  private readonly shockwaveGeo: THREE.BufferGeometry;

  // Cached, pooled materials to prevent WebGL program re-allocation & GC freezing
  private readonly sharedSpriteMats: Map<number, THREE.SpriteMaterial> = new Map();
  private readonly sharedMicroMats: Map<number, THREE.MeshBasicMaterial> = new Map();
  private readonly sharedChipMats: Map<string, THREE.MeshLambertMaterial> = new Map();
  private readonly sharedShockMats: Map<number, THREE.MeshBasicMaterial> = new Map();
  private sharedSparkMat: THREE.SpriteMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'MountainDustParticleSystem';
    this.scene.add(this.rootGroup);

    this.dustTexture = createOrganicDustTexture();
    this.sparkTexture = createFrictionSparkTexture();
    this.shockwaveTexture = createShockwaveRingTexture();

    // Pre-create angular cleavage geometries for chipped stone shards
    this.chipGeos.push(
      new THREE.DodecahedronGeometry(1.0, 0),
      new THREE.TetrahedronGeometry(1.1, 0),
      new THREE.ConeGeometry(0.8, 1.4, 5),
      new THREE.BoxGeometry(1.4, 0.45, 1.0)
    );

    this.microDustGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.shockwaveGeo = new THREE.RingGeometry(0.05, 1.0, 32);
  }

  /**
   * Triggers the mountain pickaxe dust cloud & chip particle effect.
   * Size, density, sparks, and stone chip behavior depend directly on rock material intensity!
   *
   * @param hitPoint World position where the pickaxe struck the mountain or mine
   * @param surfaceNormal Outward normal vector of the rock face (or strike reflection dir)
   * @param material Rock material name (e.g. 'sandstone', 'granite', 'quartz_gold', 'silver_ore', 'amethyst', 'copper')
   * @param intensityMultiplier Optional scaling factor for blow strength or excavation depth (default 1.0)
   * @param floorY Optional floor elevation for subterranean mines / shafts (defaults to local mine elevation if below terrain)
   */
  public triggerMountainStrike(
    hitPoint: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    material: MountainRockMaterial | string = 'sandstone',
    intensityMultiplier: number = 1.0,
    floorY?: number
  ) {
    const config = getMaterialConfig(material);
    const normal = surfaceNormal.clone().normalize();
    if (normal.lengthSq() < 0.01) normal.set(0, 1, 0);

    // Dynamic material physics calculation:
    // Friable softer rocks produce expansive, wide-blooming, high-density billowing dust clouds
    // Tough, crystalline hard rocks produce high-speed sparks, high-pressure concentrated powder bursts, and sharp flying chips
    const friability = Math.max(0.1, 1.0 - config.intensity * 0.45);
    const hardnessFactor = Math.max(0.1, config.intensity);

    // 1. TIER 1: Volumetric Billow Dust Cloud (Size and Density governed by material intensity)
    const maxPuffs = Math.max(3, 24 - this.dustPuffs.length);
    const billowCount = Math.min(
      maxPuffs,
      Math.max(
        4,
        Math.round(config.billowCount * (0.8 + friability * 0.5) * Math.min(1.5, intensityMultiplier))
      )
    );
    const cloudBloomRadius = config.baseCloudRadius * (0.75 + friability * 0.65) * Math.pow(intensityMultiplier, 0.35);
    const cloudOpacity = Math.min(0.92, config.baseOpacity * (0.85 + (1 - friability) * 0.3));

    // Spawn origin slightly outside the rock face so billboard sprites don't z-fight or clip inside mountain
    const dustOrigin = hitPoint.clone().add(normal.clone().multiplyScalar(0.12));

    for (let i = 0; i < billowCount; i++) {
      // Pick randomized harmonious color from the material's geological spectrum
      const colorHex = config.dustColors[i % config.dustColors.length];
      let mat = this.sharedSpriteMats.get(colorHex);
      if (!mat) {
        mat = new THREE.SpriteMaterial({
          map: this.dustTexture,
          color: colorHex,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          fog: true,
        });
        this.sharedSpriteMats.set(colorHex, mat);
      }

      const sprite = new THREE.Sprite(mat);

      // Start tight at impact point with slight jitter
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.18,
        (Math.random() - 0.5) * 0.18,
        (Math.random() - 0.5) * 0.18
      );
      sprite.position.copy(dustOrigin).add(jitter);

      // Random starting scale
      const baseScale = (0.28 + Math.random() * 0.22) * cloudBloomRadius;
      sprite.scale.set(baseScale, baseScale, 1.0);

      // Ejection velocity: Outward along surface normal with radial hemisphere bloom
      const spreadDir = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      );
      const vel = normal
        .clone()
        .multiplyScalar(config.expansionSpeed * (0.5 + Math.random() * 0.7))
        .add(spreadDir.multiplyScalar(config.expansionSpeed * 0.4 * friability));

      this.rootGroup.add(sprite);
      this.dustPuffs.push({
        sprite,
        velocity: vel,
        rotSpeed: (Math.random() - 0.5) * 1.6,
        initialScale: baseScale,
        maxScale: baseScale * (2.4 + friability * 1.8), // Softer rock blooms significantly larger
        initialOpacity: cloudOpacity * (0.85 + Math.random() * 0.15),
        life: 0,
        maxLife: config.dustLifetime * (0.75 + Math.random() * 0.5),
        expansionFactor: 1.8 + friability * 1.6,
        liftSpeed: 0.35 + Math.random() * 0.45, // Warm desert thermal convection
        drag: 0.94 - friability * 0.02, // Drag decelerates plume as it billows
      });
    }

    // 2. TIER 2: Micro-Dust / Fine Silt Powder Spray (Fine particle density)
    const maxMicro = Math.max(3, 20 - this.microDust.length);
    const microCount = Math.min(maxMicro, Math.round(config.microDustCount * (0.7 + friability * 0.6)));
    const microColor = config.dustColors[0];
    let microMat = this.sharedMicroMats.get(microColor);
    if (!microMat) {
      microMat = new THREE.MeshBasicMaterial({
        color: microColor,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      this.sharedMicroMats.set(microColor, microMat);
    }

    for (let i = 0; i < microCount; i++) {
      const mesh = new THREE.Mesh(this.microDustGeo, microMat);
      const mSize = 0.022 + Math.random() * 0.035;
      mesh.scale.set(mSize, mSize, mSize);
      mesh.position.copy(dustOrigin).add(
        new THREE.Vector3((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15)
      );

      // Fast conical spray away from impact point
      const angle = Math.random() * Math.PI * 2;
      const spreadDist = Math.random() * 2.8 + 1.2;
      const vel = normal
        .clone()
        .multiplyScalar(Math.random() * 3.5 + 1.8)
        .add(new THREE.Vector3(Math.cos(angle) * spreadDist, (Math.random() - 0.3) * 2.5, Math.sin(angle) * spreadDist));

      this.rootGroup.add(mesh);
      this.microDust.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4,
        initialScale: mSize,
      });
    }

    // 3. TIER 3: Flying 3D Chipped Stone Shards (Direct visual feedback that stone is physically chipped!)
    const maxChips = Math.max(2, 14 - this.stoneChips.length);
    const chipCount = Math.min(maxChips, Math.max(2, Math.round(config.chipCount * (0.8 + hardnessFactor * 0.4))));
    const chipColor = config.dustColors[1] || config.dustColors[0];
    const chipMatKey = `${material}_${chipColor}`;
    let chipMat = this.sharedChipMats.get(chipMatKey);
    if (!chipMat) {
      chipMat = new THREE.MeshLambertMaterial({
        color: chipColor,
      });
      this.sharedChipMats.set(chipMatKey, chipMat);
    }

    const terrainY = getTerrainHeight(hitPoint.x, hitPoint.z);
    const groundY =
      floorY !== undefined
        ? floorY
        : hitPoint.y < terrainY - 1.2
        ? hitPoint.y - 0.45
        : terrainY;

    for (let i = 0; i < chipCount; i++) {
      const geo = this.chipGeos[i % this.chipGeos.length];
      const mesh = new THREE.Mesh(geo, chipMat);
      const scale = config.chipScale * (0.55 + Math.random() * 0.85);
      mesh.scale.set(scale, scale, scale);
      mesh.position.copy(hitPoint).add(normal.clone().multiplyScalar(0.1));
      mesh.castShadow = false; // Disable dynamic shadow map updates for fleeting debris

      // High ejection velocity outward along normal + hemisphere cone
      const coneJitter = new THREE.Vector3(
        (Math.random() - 0.5) * 4.2,
        Math.random() * 3.8 + 1.2,
        (Math.random() - 0.5) * 4.2
      );
      const ejectionSpeed = (4.5 + hardnessFactor * 4.0) * (0.85 + Math.random() * 0.4);
      const vel = normal.clone().multiplyScalar(ejectionSpeed).add(coneJitter);

      this.rootGroup.add(mesh);
      this.stoneChips.push({
        mesh,
        velocity: vel,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 22
        ),
        life: 0,
        maxLife: 1.1 + Math.random() * 0.6,
        initialScale: scale,
        groundY,
        hasBounced: false,
      });
    }

    // 4. TIER 4: Incandescent Friction Sparks (Steel pickaxe striking hard crystalline rock)
    // Hard rocks (granite, basalt, quartz) emit a shower of glowing hot sparks!
    const maxSparks = Math.max(0, 18 - this.sparks.length);
    const sparkCount = Math.min(maxSparks, Math.round(config.sparkCount * hardnessFactor * intensityMultiplier));
    if (sparkCount > 0) {
      if (!this.sharedSparkMat) {
        this.sharedSparkMat = new THREE.SpriteMaterial({
          map: this.sparkTexture,
          color: config.sparkColor,
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
      }
      const sparkMat = this.sharedSparkMat;

      for (let i = 0; i < sparkCount; i++) {
        const sprite = new THREE.Sprite(sparkMat);
        const sSize = 0.07 + Math.random() * 0.08;
        sprite.scale.set(sSize, sSize, 1.0);
        sprite.position.copy(hitPoint).add(
          new THREE.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06)
        );

        // High velocity tangential and reflective sparks (8 to 14 m/s)
        const sparkSpread = new THREE.Vector3(
          (Math.random() - 0.5) * 8.5,
          (Math.random() - 0.2) * 8.0,
          (Math.random() - 0.5) * 8.5
        );
        const sparkVel = normal.clone().multiplyScalar(7.5 + Math.random() * 6.5).add(sparkSpread);

        this.rootGroup.add(sprite);
        this.sparks.push({
          sprite,
          velocity: sparkVel,
          life: 0,
          maxLife: 0.16 + Math.random() * 0.22,
          initialScale: sSize,
        });
      }
    }

    // 5. TIER 5: Compressive Surface Shockwave Ring
    // Visual indicator of physical pickaxe concussion traveling across the rock face
    const shockColor = config.dustColors[0];
    let shockMat = this.sharedShockMats.get(shockColor);
    if (!shockMat) {
      shockMat = new THREE.MeshBasicMaterial({
        map: this.shockwaveTexture,
        color: shockColor,
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.sharedShockMats.set(shockColor, shockMat);
    }
    const shockMesh = new THREE.Mesh(this.shockwaveGeo, shockMat);
    shockMesh.position.copy(hitPoint).add(normal.clone().multiplyScalar(0.04));

    // Align ring flat to rock surface normal
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    shockMesh.quaternion.copy(quat);

    const initialShockScale = 0.15;
    shockMesh.scale.set(initialShockScale, initialShockScale, initialShockScale);
    this.rootGroup.add(shockMesh);

    this.shockwaves.push({
      mesh: shockMesh,
      initialScale: initialShockScale,
      maxScale: cloudBloomRadius * 0.95,
      initialOpacity: 0.68,
      life: 0,
      maxLife: 0.32,
    });
  }

  /**
   * Main per-frame update loop.
   * Animates expanding billow dust clouds, convective thermal rise,
   * flying stone chip gravity & tumbling, friction spark fade, and shockwaves.
   */
  public update(delta: number) {
    if (delta <= 0) return;
    const clampedDelta = Math.min(0.1, delta);

    // 1. Update Volumetric Dust Cloud Billows
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const p = this.dustPuffs[i];
      p.life += clampedDelta;
      const progress = p.life / p.maxLife;

      if (progress >= 1.0) {
        this.rootGroup.remove(p.sprite);
        this.dustPuffs.splice(i, 1);
        continue;
      }

      // Physics: Smooth aerodynamic deceleration + warm thermal convection lift
      p.velocity.x *= p.drag;
      p.velocity.z *= p.drag;
      p.velocity.y += p.liftSpeed * clampedDelta; // Dust rises in the desert heat
      p.sprite.position.addScaledVector(p.velocity, clampedDelta);

      // Expansion: Rapid initial bloom, steady volumetric billow
      const scaleCurve = Math.sin(progress * Math.PI * 0.5);
      const currentScale = THREE.MathUtils.lerp(p.initialScale, p.maxScale, scaleCurve);
      p.sprite.scale.set(currentScale, currentScale, 1.0);

      // Rotation of dust puff for rolling atmospheric look
      p.sprite.material.rotation += p.rotSpeed * clampedDelta;
    }

    // 2. Update Micro-Dust Silt Particles
    for (let i = this.microDust.length - 1; i >= 0; i--) {
      const m = this.microDust[i];
      m.life += clampedDelta;
      const progress = m.life / m.maxLife;

      if (progress >= 1.0) {
        this.rootGroup.remove(m.mesh);
        this.microDust.splice(i, 1);
        continue;
      }

      // Fast settling gravity
      m.velocity.y -= 14.0 * clampedDelta;
      m.velocity.x *= 0.93;
      m.velocity.z *= 0.93;
      m.mesh.position.addScaledVector(m.velocity, clampedDelta);

      const scale = THREE.MathUtils.lerp(m.initialScale, m.initialScale * 0.3, progress);
      m.mesh.scale.set(scale, scale, scale);
    }

    // 3. Update Chipped Stone Fragments (Flying 3D rock shards)
    for (let i = this.stoneChips.length - 1; i >= 0; i--) {
      const chip = this.stoneChips[i];
      chip.life += clampedDelta;
      const progress = chip.life / chip.maxLife;

      if (progress >= 1.0) {
        this.rootGroup.remove(chip.mesh);
        this.stoneChips.splice(i, 1);
        continue;
      }

      // Realistic ballistic gravity and aerodynamic spin
      chip.velocity.y -= 19.6 * clampedDelta; // Arizona standard gravity
      chip.mesh.position.addScaledVector(chip.velocity, clampedDelta);

      chip.mesh.rotation.x += chip.rotSpeed.x * clampedDelta;
      chip.mesh.rotation.y += chip.rotSpeed.y * clampedDelta;
      chip.mesh.rotation.z += chip.rotSpeed.z * clampedDelta;

      // Ground bounce check
      if (chip.mesh.position.y <= chip.groundY + 0.1 && !chip.hasBounced) {
        chip.hasBounced = true;
        chip.velocity.y = Math.abs(chip.velocity.y) * 0.32;
        chip.velocity.x *= 0.55;
        chip.velocity.z *= 0.55;
        chip.mesh.position.y = chip.groundY + 0.1;
      }

      // Shrink / fade out as life expires
      if (progress > 0.7) {
        const fadeScale = THREE.MathUtils.lerp(chip.initialScale, 0.01, (progress - 0.7) / 0.3);
        chip.mesh.scale.setScalar(fadeScale);
      }
    }

    // 4. Update Incandescent Friction Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.life += clampedDelta;
      const progress = spark.life / spark.maxLife;

      if (progress >= 1.0) {
        this.rootGroup.remove(spark.sprite);
        this.sparks.splice(i, 1);
        continue;
      }

      // Sparks shoot fast, decelerate rapidly, and arc down with gravity
      spark.velocity.y -= 9.8 * clampedDelta;
      spark.velocity.x *= 0.91;
      spark.velocity.z *= 0.91;
      spark.sprite.position.addScaledVector(spark.velocity, clampedDelta);

      // Fast linear scale down
      const scale = THREE.MathUtils.lerp(spark.initialScale, spark.initialScale * 0.2, progress);
      spark.sprite.scale.set(scale, scale, 1.0);
    }

    // 5. Update Surface Concussion Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += clampedDelta;
      const progress = sw.life / sw.maxLife;

      if (progress >= 1.0) {
        this.rootGroup.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
        continue;
      }

      // Fast expansion along the rock plane
      const scale = THREE.MathUtils.lerp(sw.initialScale, sw.maxScale, Math.sqrt(progress));
      sw.mesh.scale.set(scale, scale, 1.0);
    }
  }

  /**
   * Cleans up all particle meshes and procedural textures.
   */
  public dispose() {
    for (const p of this.dustPuffs) {
      this.rootGroup.remove(p.sprite);
    }
    this.dustPuffs = [];

    for (const s of this.sparks) {
      this.rootGroup.remove(s.sprite);
    }
    this.sparks = [];

    for (const c of this.stoneChips) {
      this.rootGroup.remove(c.mesh);
    }
    this.stoneChips = [];

    for (const m of this.microDust) {
      this.rootGroup.remove(m.mesh);
    }
    this.microDust = [];

    for (const sw of this.shockwaves) {
      this.rootGroup.remove(sw.mesh);
    }
    this.shockwaves = [];

    // Dispose cached materials
    this.sharedSpriteMats.forEach((m) => m.dispose());
    this.sharedSpriteMats.clear();
    this.sharedMicroMats.forEach((m) => m.dispose());
    this.sharedMicroMats.clear();
    this.sharedChipMats.forEach((m) => m.dispose());
    this.sharedChipMats.clear();
    this.sharedShockMats.forEach((m) => m.dispose());
    this.sharedShockMats.clear();
    if (this.sharedSparkMat) {
      this.sharedSparkMat.dispose();
      this.sharedSparkMat = null;
    }

    for (const geo of this.chipGeos) {
      geo.dispose();
    }
    this.microDustGeo.dispose();
    this.shockwaveGeo.dispose();

    this.dustTexture.dispose();
    this.sparkTexture.dispose();
    this.shockwaveTexture.dispose();

    this.scene.remove(this.rootGroup);
  }
}
