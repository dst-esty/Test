import * as THREE from 'three';
import { getTerrainHeight, updateTerrainHoleCutouts, applyMountainHoleShaderToMaterial } from './terrain';
import { DebrisType } from '../types';
import { MountainHoleManager } from './mountainHoles';
import { MountainDustParticleSystem } from './mountainDustParticles';

export interface GoldDeposit {
  id: string;
  position: THREE.Vector3;
  mined: boolean;
  ounces: number;
  mesh: THREE.Group;
}

export interface HarvestableTree {
  id: string;
  name: string;
  springName: string;
  position: THREE.Vector3;
  group: THREE.Group;
  trunkMesh: THREE.Mesh;
  crownMesh: THREE.Mesh;
  stumpMesh: THREE.Mesh;
  maxHealth: number;
  health: number;
  isFelled: boolean;
  woodPerChop: number;
  felledBonusWood: number;
}

export interface StrikeFoliageResult {
  hit: boolean;
  type?: 'tree' | 'boulder' | 'outcropping' | 'gold_deposit' | 'saguaro' | 'barrel' | 'prickly' | 'cholla' | 'scrub';
  hitPoint?: THREE.Vector3;
  surfaceNormal?: THREE.Vector3;
  rockMaterial?: string;
  debrisType?: DebrisType;
  goldAwarded?: number;
  blocksDug?: number;
  woodAwarded?: number;
  hydrationAwarded?: number;
  message?: string;
  depositId?: string;
  spawnPhysicalRock?: {
    position: THREE.Vector3;
    color: number;
    scale: number;
    weightLbs: number;
    ejectionDir?: THREE.Vector3;
    isChippedFragment?: boolean;
  };
}

/**
 * Calculates realistic weight of desert field stones and giant boulders.
 * Scaled volumetrically based on 3-axis dimensions:
 * Scree cobble (~0.5m) is ~9-15 lbs; field stone (~0.7m) is ~25-32 lbs;
 * Human limit is 55 lbs (~0.9m); giant boulders (1.2m - 2.8m) weigh 130 to 1,600+ lbs!
 */
export function calculateInstancedBoulderWeight(scaleX: number, scaleY: number, scaleZ: number): number {
  const avgDim = (scaleX + scaleY + scaleZ) / 3.0;
  return Math.max(6, Math.round(75 * Math.pow(avgDim, 3)));
}

export interface ExplodeFoliageResult {
  goldBlasted: number;
  rocksBlasted: number;
  woodBlasted: number;
  hydrationBlasted: number;
  destroyedPoints: Array<{ pos: THREE.Vector3; type: DebrisType }>;
  bannerMessage?: string;
}

// Palette of authentic mineral colors found across the Superstition Mountains and Sonoran desert
const DESERT_ROCK_PALETTES = [
  // Weathered iron terracotta sandstone (Supai / Redwall formations)
  new THREE.Color(0x8f4327),
  new THREE.Color(0xa24d2d),
  new THREE.Color(0x7c3820),
  new THREE.Color(0xb25833),
  // Dark manganese desert varnish & weathered basalt
  new THREE.Color(0x2d241f),
  new THREE.Color(0x382e28),
  new THREE.Color(0x433730),
  new THREE.Color(0x322822),
  // Buff & golden tan sandstone (Coconino / Navajo strata)
  new THREE.Color(0xb5824e),
  new THREE.Color(0xc69460),
  new THREE.Color(0xa77543),
  new THREE.Color(0x9d6c3e),
  // Weathered granite & quartzite gray (salt & pepper bedrock)
  new THREE.Color(0x6a645d),
  new THREE.Color(0x7b746c),
  new THREE.Color(0x8a837b),
  // Deep hematite / burnt umber
  new THREE.Color(0x562b1e),
  new THREE.Color(0x653324),
];

/**
 * 1. Angular Chiseled Talus Block (Fractured Basalt & Dacite)
 * Sharp cleavage facets, directional fracture shearing, and a flat seating base.
 */
function createAngularRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(1.05, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Flatten underside so it rests naturally on desert soil
    if (y < 0) {
      y = -0.28 + (y + 0.28) * 0.42;
    }
    // Asymmetric directional cleavage & fracture facet displacement
    x += Math.sin(y * 3.2 + z * 2.1) * 0.22;
    z += Math.cos(x * 2.6 + y * 1.9) * 0.20;
    y += Math.sin(x * 3.5) * 0.14;

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * 2. Flat Tabular Sandstone Slab / Flagstone
 * Thin, layered rectangular-polygonal slab common in desert washes and scree slopes.
 */
function createSlabRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1.2, 1.45, 0.42, 7, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);

    const angle = Math.atan2(z, x);
    const rad = Math.hypot(x, z);
    const perturb = 1.0 + Math.sin(angle * 3.0) * 0.25 + Math.cos(angle * 5.0) * 0.14;

    x = Math.cos(angle) * rad * perturb;
    z = Math.sin(angle) * rad * perturb;

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * 3. Weathered Desert Granite Corestone / Whaleback Boulder
 * Oblong, sub-rounded, heavily pitted corestone with natural erosion hollows and flat base.
 */
function createWeatheredCorestoneGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1.0, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Oblong elongation
    z *= 1.35;
    y *= 0.72;
    x *= 1.12;

    if (y < -0.1) {
      y = -0.18 + (y + 0.1) * 0.35;
    }
    const d = Math.sin(x * 3.5) * Math.cos(z * 2.8) * 0.12;
    x += d;
    z += d;

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Outcrop A: Jagged Volcanic Crag / Cliff Fin (Massif Dacite Buttress)
 * Sheer vertical columnar jointing, talus apron, and serrated jagged knife-edge summit (NO mushroom cap!).
 */
function createVolcanicCragGeometry(): THREE.BufferGeometry {
  const height = 18.0;
  const radialSegments = 8;
  const heightSegments = 22;
  const geo = new THREE.CylinderGeometry(2.4, 5.2, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Base talus apron (t < 0.20)
    let profileScale = 1.0;
    if (t < 0.20) {
      profileScale = 1.1 + Math.pow((0.20 - t) / 0.20, 2.0) * 0.9;
    } else if (t >= 0.82) {
      // Jagged serrated summit crest with asymmetric knife-edge fangs (NO mushroom!)
      const crest = Math.cos(angle * 2.0 + 0.6) * 0.32;
      profileScale = Math.max(0.25, (1.0 - (t - 0.82) / 0.18 * 0.65) * (1.0 + crest));
      py += Math.pow(Math.max(0, Math.sin(angle * 2.0)), 2.0) * 2.4;
    } else {
      // Sheer vertical column with subtle terracing
      profileScale = 0.94 + Math.sin(t * 18.0) * 0.06;
    }

    // Columnar vertical jointing & rock faceting
    const jointFacet = Math.cos(angle * 4.0) * 0.18 + Math.sin(angle * 8.0) * 0.08;
    const strataGroove = Math.sin(py * 3.8) * 0.06;

    const newRadius = radius * profileScale * (1.0 + jointFacet + strataGroove);
    px = Math.cos(angle) * newRadius;
    pz = Math.sin(angle) * newRadius;

    pos.setXYZ(i, px, py, pz);

    // Weathered volcanic rock colors (desert varnish on summit, iron red body, dacite brown)
    const band = Math.sin(py * 1.8 + angle * 0.5) * 0.5 + 0.5;
    let r = 0.55, g = 0.28, b = 0.19;
    if (t > 0.78) {
      // Dark desert varnish patina
      r = 0.32 + band * 0.06;
      g = 0.23 + band * 0.05;
      b = 0.20 + band * 0.03;
    } else if (band > 0.5) {
      // Iron-rich terracotta
      r = 0.66 + band * 0.08;
      g = 0.32 + band * 0.06;
      b = 0.20 + band * 0.04;
    } else {
      // Dacite ash brown
      r = 0.48 + band * 0.06;
      g = 0.27 + band * 0.04;
      b = 0.19 + band * 0.03;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Outcrop B: Stepped Mesa Butte / Sandstone Shelf Outcrop
 * Authentic flat-top caprock mesa with stepped horizontal benches and vertical drops.
 */
function createSteppedMesaGeometry(): THREE.BufferGeometry {
  const height = 13.0;
  const radialSegments = 12;
  const heightSegments = 24;
  const geo = new THREE.CylinderGeometry(4.5, 6.8, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Stepped horizontal benches with vertical drops
    let profileScale = 1.0;
    if (t < 0.18) {
      // Talus scree base
      profileScale = 1.05 + (0.18 - t) * 1.8;
    } else if (t >= 0.88) {
      // Distinct flat mesa caprock plateau
      profileScale = 1.02;
    } else {
      // S-curve steps (distinct horizontal benches)
      const stepIdx = Math.floor((t - 0.18) * 6.0);
      const stepFrac = ((t - 0.18) * 6.0) % 1.0;
      const stepTerrace = stepIdx * 0.07 + Math.pow(stepFrac, 3.2) * 0.07;
      profileScale = 0.90 + stepTerrace;
    }

    // Angular blocky corners (quadrangular mesa)
    const blocky = Math.cos(angle * 4.0) * 0.12 + Math.sin(angle * 2.0) * 0.06;
    const newRadius = radius * profileScale * (1.0 + blocky);

    px = Math.cos(angle) * newRadius;
    pz = Math.sin(angle) * newRadius;

    pos.setXYZ(i, px, py, pz);

    // Horizontal sedimentary strata banding (buff Coconino sandstone & red Supai)
    const strata = Math.sin(py * 3.5) * 0.5 + 0.5;
    let r = 0.74, g = 0.46, b = 0.28;
    if (t > 0.86) {
      // Dark caprock patina
      r = 0.36 + strata * 0.06;
      g = 0.26 + strata * 0.05;
      b = 0.21 + strata * 0.04;
    } else if (strata > 0.52) {
      // Buff sandstone bench
      r = 0.78 + strata * 0.06;
      g = 0.52 + strata * 0.06;
      b = 0.32 + strata * 0.04;
    } else {
      // Deep terracotta siltstone
      r = 0.62 + strata * 0.06;
      g = 0.28 + strata * 0.04;
      b = 0.17 + strata * 0.03;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Outcrop C: Tilted Fault-Block Monocline / Sandstone Fin
 * Tectonic fault block with smooth sloping 35-degree dip face and sheer vertical scarp.
 */
function createFaultMonoclineGeometry(): THREE.BufferGeometry {
  const height = 15.0;
  const radialSegments = 8;
  const heightSegments = 20;
  const geo = new THREE.CylinderGeometry(2.2, 4.5, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Tilted monocline: shear along X axis
    const tiltShift = Math.sin(angle) * (t * 2.8);
    const scarpCut = Math.cos(angle) > 0.2 ? 0.85 : 1.15;

    const profileScale = (t < 0.2 ? 1.2 : 0.95 - t * 0.3) * scarpCut;
    const newRadius = radius * profileScale;

    px = Math.cos(angle) * newRadius + tiltShift;
    pz = Math.sin(angle) * newRadius;

    pos.setXYZ(i, px, py, pz);

    const band = Math.sin(py * 2.4 + px * 0.6) * 0.5 + 0.5;
    let r = 0.65, g = 0.34, b = 0.21;
    if (Math.cos(angle) > 0.2) {
      // Sheltered scarp face with dark varnish
      r = 0.35 + band * 0.06;
      g = 0.24 + band * 0.05;
      b = 0.20 + band * 0.03;
    } else {
      // Exposed sunlit dip-slope (rich red sandstone)
      r = 0.72 + band * 0.08;
      g = 0.38 + band * 0.06;
      b = 0.24 + band * 0.04;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Outcrop D: Weathered Tapering Canyon Spire / Needle
 * Slender volcanic pinnacle tapering gracefully to a craggy pointed summit (NO mushroom cap!).
 */
function createNeedleSpireGeometry(): THREE.BufferGeometry {
  const height = 21.0;
  const radialSegments = 10;
  const heightSegments = 26;
  const geo = new THREE.CylinderGeometry(1.1, 4.8, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Continuous tapering from talus base to needle tip
    let profileScale = 1.0;
    if (t < 0.22) {
      profileScale = 1.35 + Math.pow((0.22 - t) / 0.22, 1.8) * 0.85;
    } else {
      const fluting = Math.sin(angle * 5.0) * 0.12;
      profileScale = (1.0 - (t - 0.22) * 0.65) * (1.0 + fluting);
    }

    const newRadius = radius * profileScale;
    px = Math.cos(angle) * newRadius;
    pz = Math.sin(angle) * newRadius;

    pos.setXYZ(i, px, py, pz);

    const band = Math.sin(py * 2.0) * 0.5 + 0.5;
    let r = 0.56, g = 0.29, b = 0.20;
    if (t > 0.8) {
      // Dark needle summit
      r = 0.34 + band * 0.05;
      g = 0.24 + band * 0.04;
      b = 0.19 + band * 0.03;
    } else if (band > 0.5) {
      r = 0.68 + band * 0.08;
      g = 0.35 + band * 0.06;
      b = 0.22 + band * 0.04;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export interface WorldRockCollider {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  type: 'boulder' | 'mountain' | 'cactus';
  meshIdx?: number;
  instanceId?: number;
  active: boolean;
}

/**
 * Ensures the Peralta Base Camp, Trailhead (-120, -120), and Player Spawn (-115, -115)
 * are completely clear of randomly spawned boulders, cacti, scrub, and mountain outcroppings.
 */
export function isNearPeraltaCamp(x: number, z: number, clearanceRadius: number = 22): boolean {
  const distTrailhead = Math.hypot(x - (-120), z - (-120));
  const distSpawn = Math.hypot(x - (-115), z - (-115));
  const distCenter = Math.hypot(x - (-117.5), z - (-117.5));
  return distTrailhead < clearanceRadius || distSpawn < clearanceRadius || distCenter < clearanceRadius;
}

const _scratchFoliageBoreDirs = Array.from({ length: 16 }, () => new THREE.Vector3());

export class DesertFoliageManager {
  public goldDeposits: GoldDeposit[] = [];
  public springTrees: HarvestableTree[] = [];
  public interactiveMeshes: THREE.Object3D[] = [];
  public saguaroGroup: THREE.Group = new THREE.Group();
  public barrelMesh!: THREE.InstancedMesh;
  public boulderMesh!: THREE.InstancedMesh;
  public boulderMeshes: THREE.InstancedMesh[] = [];
  public scrubMesh!: THREE.InstancedMesh;
  public grassMesh!: THREE.InstancedMesh;
  public pricklyMesh!: THREE.InstancedMesh;
  public chollaMesh!: THREE.InstancedMesh;
  public outcroppingMesh!: THREE.InstancedMesh;
  public outcroppingMeshes: THREE.InstancedMesh[] = [];
  public boulderHitsMap: Map<string, number> = new Map();
  public rockColliders: WorldRockCollider[] = [];
  public mountainHoleManager: MountainHoleManager;
  public dustParticleSystem?: MountainDustParticleSystem;
  public mountainHoleUniformsList: Array<{
    uMountainHolePositions: { value: THREE.Vector3[] };
    uMountainHoleDirs: { value: THREE.Vector3[] };
    uMountainHoleRadii: { value: Float32Array };
    uMountainHoleDepths: { value: Float32Array };
    uMountainHolePassThrough: { value: Float32Array };
    uMountainHoleCount: { value: number };
  }> = [];

  private scene: THREE.Scene;
  private readonly zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene, dustParticles?: MountainDustParticleSystem) {
    this.scene = scene;
    this.dustParticleSystem = dustParticles;
    this.mountainHoleManager = new MountainHoleManager(this.scene, dustParticles, 'surface');
    // Wire rock check callback so mountain holes can detect when they pierce through outcroppings
    this.mountainHoleManager.setRockCheckCallback((pos: THREE.Vector3) => {
      for (let i = 0; i < this.rockColliders.length; i++) {
        const c = this.rockColliders[i];
        if (!c.active || c.type !== 'mountain') continue;
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        if (Math.hypot(dx, dz) <= c.radius && pos.y >= c.y - 0.6 && pos.y <= c.y + c.height + 0.6) {
          return true;
        }
      }
      return false;
    });
    // Auto-update terrain and rock cutouts whenever tunnels are dug or expanded
    this.mountainHoleManager.onHolesChanged = () => {
      this.updateMountainHoleCutouts();
    };
    this.init();
    this.updateMountainHoleCutouts();
  }

  public setDustParticleSystem(ps: MountainDustParticleSystem) {
    this.dustParticleSystem = ps;
    this.mountainHoleManager.setDustParticleSystem(ps);
  }

  public updateMountainHoleCutouts(): void {
    if (!this.mountainHoleManager) return;
    const surfaceHoles = this.mountainHoleManager.holes.filter(
      (h) => h.position.y >= -1.5
    );
    const count = Math.min(16, surfaceHoles.length);

    // Precompute bore directions once for all holes without memory allocations
    for (let i = 0; i < count; i++) {
      _scratchFoliageBoreDirs[i].set(0, 0, -1).applyQuaternion(surfaceHoles[i].group.quaternion).normalize();
    }

    for (let u = 0; u < this.mountainHoleUniformsList.length; u++) {
      const uniforms = this.mountainHoleUniformsList[u];
      uniforms.uMountainHoleCount.value = count;
      for (let i = 0; i < count; i++) {
        const h = surfaceHoles[i];
        uniforms.uMountainHolePositions.value[i].copy(h.position);
        uniforms.uMountainHoleDirs.value[i].copy(_scratchFoliageBoreDirs[i]);
        uniforms.uMountainHoleRadii.value[i] = h.radius * 0.96;
        uniforms.uMountainHoleDepths.value[i] = h.depth;
        uniforms.uMountainHolePassThrough.value[i] = h.isPassThrough ? 1.0 : 0.0;
      }
    }
    // Also cut out hollow tunnel bore in surface terrain mesh
    updateTerrainHoleCutouts(surfaceHoles);
  }

  private init() {
    const dummy = new THREE.Object3D();

    // ==========================================
    // 1. Saguaro Cacti Generation
    // ==========================================
    const saguaroCount = 450;
    const saguaroMat = new THREE.MeshStandardMaterial({
      color: 0x2e5a27,
      roughness: 0.85,
      metalness: 0.05,
      bumpScale: 0.05,
    });

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 6, 8);
    const armVerticalGeo = new THREE.CylinderGeometry(0.25, 0.28, 2.5, 6);
    const armHorizontalGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.4, 6);
    armHorizontalGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < saguaroCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 280;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getTerrainHeight(x, z);

      // Skip steep high summits or right on top of trailhead & spawn camp
      if (y > 45 || isNearPeraltaCamp(x, z, 18)) continue;

      const scale = 0.7 + Math.random() * 0.8;
      const singleCactus = new THREE.Group();
      singleCactus.position.set(x, y + 3 * scale - 0.2, z);
      singleCactus.scale.set(scale, scale, scale);

      const trunk = new THREE.Mesh(trunkGeo, saguaroMat);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      singleCactus.add(trunk);

      const hasLeftArm = Math.random() > 0.3;
      const hasRightArm = Math.random() > 0.4;

      if (hasLeftArm) {
        const armH = new THREE.Mesh(armHorizontalGeo, saguaroMat);
        armH.position.set(-0.9, 0.6, 0);
        armH.castShadow = false;
        singleCactus.add(armH);

        const armV = new THREE.Mesh(armVerticalGeo, saguaroMat);
        armV.position.set(-1.5, 1.8, 0);
        armV.castShadow = false;
        singleCactus.add(armV);
      }

      if (hasRightArm) {
        const armH = new THREE.Mesh(armHorizontalGeo, saguaroMat);
        armH.position.set(0.9, 1.2, 0);
        armH.castShadow = false;
        singleCactus.add(armH);

        const armV = new THREE.Mesh(armVerticalGeo, saguaroMat);
        armV.position.set(1.5, 2.3, 0);
        armV.castShadow = false;
        singleCactus.add(armV);
      }

      singleCactus.rotation.y = Math.random() * Math.PI * 2;
      this.saguaroGroup.add(singleCactus);

      // Register solid physical trunk collider for large saguaro cacti
      if (scale >= 0.75) {
        this.rockColliders.push({
          id: `saguaro_${i}`,
          x,
          y,
          z,
          radius: 0.45 * scale,
          height: 5.5 * scale,
          type: 'cactus',
          active: true,
        });
      }
    }
    this.scene.add(this.saguaroGroup);

    // ==========================================
    // 2. Barrel Cacti & Prickly Pears (Instanced)
    // ==========================================
    const barrelCount = 280;
    const barrelGeo = new THREE.SphereGeometry(0.55, 6, 6);
    barrelGeo.scale(1, 1.3, 1);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x486b38,
      roughness: 0.9,
    });
    this.barrelMesh = new THREE.InstancedMesh(barrelGeo, barrelMat, barrelCount);
    this.barrelMesh.castShadow = true;
    this.barrelMesh.frustumCulled = false;

    let bIdx = 0;
    for (let i = 0; i < barrelCount; i++) {
      const rx = (Math.random() - 0.5) * 360;
      const rz = (Math.random() - 0.5) * 360;
      const ry = getTerrainHeight(rx, rz);
      if (ry > 50 || isNearPeraltaCamp(rx, rz, 16)) continue;

      const bScale = 0.5 + Math.random() * 0.7;
      dummy.position.set(rx, ry + 0.3 * bScale, rz);
      dummy.scale.set(bScale, bScale, bScale);
      dummy.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
      dummy.updateMatrix();
      this.barrelMesh.setMatrixAt(bIdx++, dummy.matrix);
    }
    this.barrelMesh.count = bIdx;
    this.barrelMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.barrelMesh);

    // ==========================================
    // 3. Desert Boulders, Talus Scree & Flat Sandstone Slabs (Instanced with Mineral Color Variation)
    // ==========================================
    // Replace uniform round red balls with 3 authentic geological rock archetypes:
    // A. Angular Chiseled Talus Blocks (fractured basalt/dacite with sharp cleavage planes)
    // B. Flat Tabular Sandstone Slabs (horizontal flagstones layered in washes and slopes)
    // C. Weathered Granite Corestones (pitted, oblong whaleback corestones)
    const rockArchetypes = [
      { geo: createAngularRockGeometry(), count: 180, flatShading: true, baseScale: 1.1 },
      { geo: createSlabRockGeometry(), count: 140, flatShading: true, baseScale: 1.2 },
      { geo: createWeatheredCorestoneGeometry(), count: 110, flatShading: false, baseScale: 1.15 },
    ];

    this.boulderMeshes = [];

    for (let archIdx = 0; archIdx < rockArchetypes.length; archIdx++) {
      const arch = rockArchetypes[archIdx];
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.94,
        metalness: 0.08,
        side: THREE.DoubleSide,
        flatShading: arch.flatShading,
      });
      applyMountainHoleShaderToMaterial(mat, `boulder_${archIdx}`);

      const mesh = new THREE.InstancedMesh(arch.geo, mat, arch.count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      let rCount = 0;
      for (let i = 0; i < arch.count; i++) {
        const rx = (Math.random() - 0.5) * 380;
        const rz = (Math.random() - 0.5) * 380;
        if (isNearPeraltaCamp(rx, rz, 20)) continue;
        const ry = getTerrainHeight(rx, rz);

        // Natural scale variation: pebbles/scree (0.5), typical stones (1.0-1.8), large monolith boulders (2.0-2.8)
        const scaleRoll = Math.random();
        let s = 1.0;
        if (scaleRoll < 0.25) {
          s = 0.5 + Math.random() * 0.4; // Scree gravel & small stones
        } else if (scaleRoll < 0.85) {
          s = 0.9 + Math.random() * 0.9; // Medium field rocks
        } else {
          s = 1.9 + Math.random() * 0.9; // Monumental weathered boulders
        }
        s *= arch.baseScale;

        // Position on surface, sunken slightly so flat bottom is embedded in soil
        dummy.position.set(rx, ry + s * 0.15, rz);

        if (archIdx === 1) {
          // Sandstone slabs: flatter aspect ratio, subtle tilt following slope
          dummy.scale.set(s * (1.0 + Math.random() * 0.5), s * 0.45, s * (1.0 + Math.random() * 0.5));
          dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.25);
        } else {
          // Angular and corestones: natural 3D proportioning
          dummy.scale.set(s * (0.8 + Math.random() * 0.4), s * (0.75 + Math.random() * 0.35), s * (0.8 + Math.random() * 0.4));
          dummy.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3);
        }

        dummy.updateMatrix();
        mesh.setMatrixAt(rCount, dummy.matrix);

        // Assign individual natural mineral color to every rock:
        // Manganese desert varnish, terracotta red sandstone, buff tan, or salt-and-pepper granite
        const randColor = DESERT_ROCK_PALETTES[Math.floor(Math.random() * DESERT_ROCK_PALETTES.length)];
        mesh.setColorAt(rCount, randColor);

        // Register solid physical rock collider for medium and large boulders
        const bRadius = Math.max(dummy.scale.x, dummy.scale.z) * 0.95;
        const bHeight = dummy.scale.y * 1.6;
        if (bRadius >= 0.52) {
          this.rockColliders.push({
            id: `boulder_${archIdx}_${rCount}`,
            x: rx,
            y: ry,
            z: rz,
            radius: bRadius,
            height: bHeight,
            type: 'boulder',
            meshIdx: archIdx,
            instanceId: rCount,
            active: true,
          });
        }

        rCount++;
      }

      mesh.count = rCount;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      this.scene.add(mesh);
      this.boulderMeshes.push(mesh);
    }

    // Keep primary boulderMesh pointing to first mesh for legacy access
    this.boulderMesh = this.boulderMeshes[0];

    // ==========================================
    // 4. Desert Scrub & Creosote Bushes
    // ==========================================
    const scrubCount = 350;
    const scrubGeo = new THREE.IcosahedronGeometry(0.8, 1);
    const scrubMat = new THREE.MeshStandardMaterial({
      color: 0x6e7845,
      roughness: 0.9,
    });
    this.scrubMesh = new THREE.InstancedMesh(scrubGeo, scrubMat, scrubCount);
    this.scrubMesh.frustumCulled = false;
    let sIdx = 0;
    for (let i = 0; i < scrubCount; i++) {
      const rx = (Math.random() - 0.5) * 380;
      const rz = (Math.random() - 0.5) * 380;
      if (isNearPeraltaCamp(rx, rz, 14)) continue;
      const ry = getTerrainHeight(rx, rz);

      const s = 0.5 + Math.random() * 0.8;
      dummy.position.set(rx, ry + s * 0.4, rz);
      dummy.scale.set(s * 1.3, s * 0.8, s * 1.3);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      this.scrubMesh.setMatrixAt(sIdx++, dummy.matrix);
    }
    this.scrubMesh.count = sIdx;
    this.scrubMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.scrubMesh);

    // ==========================================
    // 4B. Realistic Desert Bunchgrass & Needlegrass
    // ==========================================
    const grassCount = 650;
    const grassBladeGeo = new THREE.ConeGeometry(0.35, 1.1, 4);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xb59e5f,
      roughness: 0.95,
    });
    this.grassMesh = new THREE.InstancedMesh(grassBladeGeo, grassMat, grassCount);
    this.grassMesh.frustumCulled = false;
    let gIdx = 0;
    for (let i = 0; i < grassCount; i++) {
      const gx = (Math.random() - 0.5) * 360;
      const gz = (Math.random() - 0.5) * 360;
      const gy = getTerrainHeight(gx, gz);
      if (gy > 42) continue;

      const scale = 0.6 + Math.random() * 0.7;
      dummy.position.set(gx, gy + 0.45 * scale, gz);
      dummy.scale.set(scale * 1.4, scale, scale * 1.4);
      dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(gIdx++, dummy.matrix);
    }
    this.grassMesh.count = gIdx;
    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.grassMesh);

    // ==========================================
    // 4C. Prickly Pear Cacti Clusters (Opuntia)
    // ==========================================
    const pricklyPearCount = 180;
    const padGeo = new THREE.BoxGeometry(0.5, 0.6, 0.08);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3d6e38,
      roughness: 0.8,
    });
    this.pricklyMesh = new THREE.InstancedMesh(padGeo, padMat, pricklyPearCount * 3);
    this.pricklyMesh.frustumCulled = false;
    let ppIdx = 0;
    for (let i = 0; i < pricklyPearCount; i++) {
      const px = (Math.random() - 0.5) * 340;
      const pz = (Math.random() - 0.5) * 340;
      const py = getTerrainHeight(px, pz);
      if (py > 38) continue;

      const clusterRot = Math.random() * Math.PI * 2;
      dummy.position.set(px, py + 0.35, pz);
      dummy.scale.set(0.8, 0.9, 0.8);
      dummy.rotation.set(0.1, clusterRot, 0.15);
      dummy.updateMatrix();
      this.pricklyMesh.setMatrixAt(ppIdx++, dummy.matrix);

      dummy.position.set(px - 0.25, py + 0.75, pz);
      dummy.scale.set(0.7, 0.75, 0.7);
      dummy.rotation.set(0.2, clusterRot + 0.3, -0.3);
      dummy.updateMatrix();
      this.pricklyMesh.setMatrixAt(ppIdx++, dummy.matrix);

      dummy.position.set(px + 0.28, py + 0.7, pz);
      dummy.scale.set(0.65, 0.7, 0.65);
      dummy.rotation.set(-0.1, clusterRot - 0.2, 0.35);
      dummy.updateMatrix();
      this.pricklyMesh.setMatrixAt(ppIdx++, dummy.matrix);
    }
    this.pricklyMesh.count = ppIdx;
    this.pricklyMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.pricklyMesh);

    // ==========================================
    // 4D. Jumping Cholla Cacti (Cylindropuntia)
    // ==========================================
    const chollaCount = 120;
    const chollaGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.65, 6);
    const chollaMat = new THREE.MeshStandardMaterial({
      color: 0x98a36c,
      roughness: 0.9,
    });
    this.chollaMesh = new THREE.InstancedMesh(chollaGeo, chollaMat, chollaCount * 2);
    this.chollaMesh.frustumCulled = false;
    let cIdx = 0;
    for (let i = 0; i < chollaCount; i++) {
      const cx = (Math.random() - 0.5) * 320;
      const cz = (Math.random() - 0.5) * 320;
      const cy = getTerrainHeight(cx, cz);
      if (cy > 35) continue;

      dummy.position.set(cx, cy + 0.45, cz);
      dummy.scale.set(1, 1.4, 1);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      this.chollaMesh.setMatrixAt(cIdx++, dummy.matrix);

      dummy.position.set(cx + 0.15, cy + 0.95, cz + 0.1);
      dummy.scale.set(0.9, 0.9, 0.9);
      dummy.rotation.set(0.4, Math.random() * Math.PI, 0.3);
      dummy.updateMatrix();
      this.chollaMesh.setMatrixAt(cIdx++, dummy.matrix);
    }
    this.chollaMesh.count = cIdx;
    this.chollaMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.chollaMesh);

    // ==========================================
    // 4E. Monumental Southwestern Outcroppings & Canyon Formations (4 Geological Archetypes)
    // ==========================================
    // Replaces uniform mushroom hoodoos with authentic Arizona geology:
    // 1. Jagged Volcanic Crags / Cliff Fins (serrated knife-edge crests, columnar jointing)
    // 2. Stepped Mesa Buttes (horizontal sedimentary benches, sheer drops, flat caprock)
    // 3. Tilted Fault Monoclines (35-degree dipping slip-faces & sheer fault scarps)
    // 4. Weathered Canyon Spire Needles (tall pinnacles tapering gracefully to pointed summits)
    const outcroppingArchetypes = [
      {
        name: 'volcanic_crag',
        geo: createVolcanicCragGeometry(),
        count: 16,
        baseHeight: 18.0,
        heightOffsetFrac: 0.44,
      },
      {
        name: 'stepped_mesa',
        geo: createSteppedMesaGeometry(),
        count: 16,
        baseHeight: 13.0,
        heightOffsetFrac: 0.46,
      },
      {
        name: 'fault_monocline',
        geo: createFaultMonoclineGeometry(),
        count: 14,
        baseHeight: 15.0,
        heightOffsetFrac: 0.45,
      },
      {
        name: 'canyon_spire',
        geo: createNeedleSpireGeometry(),
        count: 12,
        baseHeight: 21.0,
        heightOffsetFrac: 0.42,
      },
    ];

    this.outcroppingMeshes = [];
    const totalOutcrops = 58;
    const globalAngles = Array.from({ length: totalOutcrops }, (_, i) => (i / totalOutcrops) * Math.PI * 2);
    let globalAngleIdx = 0;

    for (let archIdx = 0; archIdx < outcroppingArchetypes.length; archIdx++) {
      const arch = outcroppingArchetypes[archIdx];
      const mat = new THREE.MeshStandardMaterial({
        name: `rock_outcrop_${arch.name}`,
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.06,
        side: THREE.DoubleSide,
        flatShading: false,
      });
      applyMountainHoleShaderToMaterial(mat, `outcrop_${arch.name}`);

      const mesh = new THREE.InstancedMesh(arch.geo, mat, arch.count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      let ocCount = 0;
      for (let i = 0; i < arch.count; i++) {
        const baseAngle = globalAngles[globalAngleIdx % totalOutcrops];
        globalAngleIdx++;
        const angle = baseAngle + (Math.random() - 0.5) * 0.28;
        const r = 45 + Math.random() * 155;
        const ox = Math.cos(angle) * r;
        const oz = Math.sin(angle) * r;
        // Keep Peralta Base Camp and player spawn clear of soaring outcropping geometry
        if (isNearPeraltaCamp(ox, oz, 30)) continue;
        const oy = getTerrainHeight(ox, oz);

        // Aspect ratio variations: some wide massif bluffs, some high soaring towers
        const baseScale = 0.85 + Math.random() * 1.35;
        let sx = baseScale;
        let sy = baseScale;
        let sz = baseScale;

        if (arch.name === 'stepped_mesa') {
          // Broad, imposing flat-topped mesas
          sx *= 1.3 + Math.random() * 0.5;
          sy *= 0.8 + Math.random() * 0.4;
          sz *= 1.3 + Math.random() * 0.5;
        } else if (arch.name === 'canyon_spire') {
          // Slender, soaring canyon needle pinnacles
          sx *= 0.75 + Math.random() * 0.3;
          sy *= 1.25 + Math.random() * 0.5;
          sz *= 0.75 + Math.random() * 0.3;
        } else if (arch.name === 'volcanic_crag') {
          // Asymmetric crag buttresses
          sx *= 1.2 + Math.random() * 0.5;
          sy *= 0.95 + Math.random() * 0.4;
          sz *= 0.9 + Math.random() * 0.35;
        } else {
          // Fault monoclines: elongated along fault strike
          sx *= 1.1 + Math.random() * 0.4;
          sy *= 1.0 + Math.random() * 0.35;
          sz *= 1.4 + Math.random() * 0.5;
        }

        dummy.position.set(ox, oy + (arch.baseHeight * arch.heightOffsetFrac) * sy, oz);
        dummy.scale.set(sx, sy, sz);
        dummy.rotation.set((Math.random() - 0.5) * 0.12, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.12);
        dummy.updateMatrix();
        mesh.setMatrixAt(ocCount, dummy.matrix);

        // Register solid physical mountain outcropping collider
        const baseRadiusMap: Record<string, number> = {
          volcanic_crag: 4.8,
          stepped_mesa: 6.2,
          fault_monocline: 4.2,
          canyon_spire: 3.8,
        };
        const baseRad = baseRadiusMap[arch.name] || 4.5;
        const oRadius = baseRad * ((sx + sz) * 0.5);
        this.rockColliders.push({
          id: `outcrop_${archIdx}_${ocCount}`,
          x: ox,
          y: oy,
          z: oz,
          radius: oRadius,
          height: arch.baseHeight * sy,
          type: 'mountain',
          meshIdx: archIdx,
          instanceId: ocCount,
          active: true,
        });

        ocCount++;
      }

      mesh.count = ocCount;
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      this.outcroppingMeshes.push(mesh);
    }

    // Keep primary outcroppingMesh pointing to first mesh for legacy access
    this.outcroppingMesh = this.outcroppingMeshes[0];

    // ==========================================
    // 5. Rich Gold Quartz Deposits for Mining
    // ==========================================
    const goldLocations = [
      { x: -50, z: -40, ounces: 8, name: 'Peralta Arroyo Nugget' },
      { x: 10, z: -20, ounces: 14, name: 'Needle Pass Quartz Pocket' },
      { x: 110, z: 20, ounces: 22, name: 'East Gully Vein' },
      { x: 145, z: 95, ounces: 35, name: 'Mine Approach Bonanza' },
    ];

    goldLocations.forEach((loc, idx) => {
      const gy = getTerrainHeight(loc.x, loc.z);
      const goldGroup = new THREE.Group();
      goldGroup.position.set(loc.x, gy + 0.4, loc.z);

      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7, 1),
        new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.7 })
      );
      goldGroup.add(rock);

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x443300,
        emissiveIntensity: 0.3,
      });
      for (let k = 0; k < 4; k++) {
        const nugget = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), goldMat);
        nugget.position.set((Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6);
        goldGroup.add(nugget);
      }

      goldGroup.name = `gold_${idx}`;
      this.scene.add(goldGroup);
      this.interactiveMeshes.push(goldGroup);

      this.goldDeposits.push({
        id: `gold_${idx}`,
        position: new THREE.Vector3(loc.x, gy + 0.5, loc.z),
        mined: false,
        ounces: loc.ounces,
        mesh: goldGroup,
      });
    });

    // ==========================================
    // 9. Riparian Desert Trees Around Springs
    // ==========================================
    this.initSpringTrees();
  }

  /**
   * Generates harvestable native trees (Cottonwoods, Mesquites, Desert Willows)
   * exclusively around desert springs and tinajas.
   */
  private initSpringTrees() {
    const springLocations = [
      { id: 'hieroglyphic', name: 'Hieroglyphic Oasis Spring', x: -70, z: -20, treeCount: 8, poolRadius: 5.5 },
      { id: 'tortilla', name: 'Tortilla Creek Spring & Wash', x: -15, z: -145, treeCount: 7, poolRadius: 6.5 },
      { id: 'needle', name: "Weaver's Needle Basin Tinaja", x: 68, z: 32, treeCount: 6, poolRadius: 4.5 },
      { id: 'peralta', name: 'Peralta Canyon Tinaja', x: -35, z: 75, treeCount: 6, poolRadius: 4.0 },
    ];

    const barkMatCottonwood = new THREE.MeshStandardMaterial({
      color: 0x483a2b,
      roughness: 0.95,
      bumpScale: 0.08,
    });
    const barkMatMesquite = new THREE.MeshStandardMaterial({
      color: 0x2b1d14,
      roughness: 0.96,
      bumpScale: 0.08,
    });
    const crownMatCottonwood = new THREE.MeshStandardMaterial({
      color: 0x4d6c2a,
      roughness: 0.8,
    });
    const crownMatMesquite = new THREE.MeshStandardMaterial({
      color: 0x364e22,
      roughness: 0.85,
    });
    const stumpMat = new THREE.MeshStandardMaterial({
      color: 0x8a6d4d,
      roughness: 0.9,
    });

    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.52, 4.4, 8);
    const crownGeo = new THREE.DodecahedronGeometry(2.4, 1);
    const stumpGeo = new THREE.CylinderGeometry(0.52, 0.62, 0.65, 8);

    springLocations.forEach((spring) => {
      for (let i = 0; i < spring.treeCount; i++) {
        const angle = (i / spring.treeCount) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.4);
        const dist = spring.poolRadius + 2.4 + (i % 3) * 2.6;
        const tx = spring.x + Math.cos(angle) * dist;
        const tz = spring.z + Math.sin(angle) * dist;
        const ty = getTerrainHeight(tx, tz);

        const isCottonwood = i % 2 === 0;
        const treeType = isCottonwood ? 'Riparian Cottonwood Tree' : 'Velvet Mesquite Tree';
        const barkMat = isCottonwood ? barkMatCottonwood : barkMatMesquite;
        const crownMat = isCottonwood ? crownMatCottonwood : crownMatMesquite;

        const treeGroup = new THREE.Group();
        treeGroup.position.set(tx, ty, tz);

        const scale = 0.85 + ((i * 17) % 35) * 0.01;
        treeGroup.scale.set(scale, scale, scale);

        // Trunk
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.y = 2.2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);

        // Foliage Crown
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.y = 5.2;
        crown.castShadow = true;
        treeGroup.add(crown);

        // Cut Stump (hidden initially, shown when felled)
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.y = 0.32;
        stump.castShadow = true;
        stump.receiveShadow = true;
        stump.visible = false;
        treeGroup.add(stump);

        this.scene.add(treeGroup);
        this.interactiveMeshes.push(treeGroup);

        this.springTrees.push({
          id: `tree_${spring.id}_${i}`,
          name: treeType,
          springName: spring.name,
          position: new THREE.Vector3(tx, ty, tz),
          group: treeGroup,
          trunkMesh: trunk,
          crownMesh: crown,
          stumpMesh: stump,
          maxHealth: 3,
          health: 3,
          isFelled: false,
          woodPerChop: 2,
          felledBonusWood: 4,
        });
      }
    });
  }

  /**
   * Deactivate collider when boulder is mined, picked up, or blasted
   */
  public deactivateRockCollider(meshIdx: number, instanceId: number): void {
    for (let i = 0; i < this.rockColliders.length; i++) {
      const c = this.rockColliders[i];
      if (c.meshIdx === meshIdx && c.instanceId === instanceId && c.active) {
        c.active = false;
        break;
      }
    }
  }

  /**
   * Dynamically adjusts shadows and fidelity on environmental foliage based on graphics quality.
   */
  public setGraphicsQuality(quality: 'performance' | 'balanced' | 'high') {
    const isPerf = quality === 'performance';

    if (this.barrelMesh) {
      this.barrelMesh.castShadow = !isPerf;
    }
    if (this.boulderMeshes) {
      this.boulderMeshes.forEach((mesh) => {
        mesh.castShadow = !isPerf;
      });
    }
    if (this.saguaroGroup) {
      this.saguaroGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = !isPerf;
        }
      });
    }
    if (this.outcroppingMeshes) {
      this.outcroppingMeshes.forEach((mesh) => {
        mesh.castShadow = !isPerf;
      });
    }
  }

  /**
   * Checks horizontal distance and vertical overlap with all physical boulders, mountain outcroppings, and cacti
   * Supports de-penetration: if player started already embedded inside this obstacle, moving away is permitted.
   */
  public checkObstacleCollision(
    x: number,
    y: number,
    z: number,
    playerRadius: number = 0.42,
    startX?: number,
    startZ?: number
  ): { hit: boolean; collider?: WorldRockCollider; normal?: { x: number; z: number } } {
    for (let i = 0; i < this.rockColliders.length; i++) {
      const c = this.rockColliders[i];
      if (!c.active) continue;
      const combinedRadius = c.radius + playerRadius;
      const dx = x - c.x;
      if (Math.abs(dx) > combinedRadius) continue;
      const dz = z - c.z;
      if (Math.abs(dz) > combinedRadius) continue;

      const distSq = dx * dx + dz * dz;
      if (distSq < combinedRadius * combinedRadius) {
        // De-penetration tolerance: If player started already embedded inside this collider,
        // and candidate position is moving further away from the collider's center, ALLOW IT!
        if (startX !== undefined && startZ !== undefined) {
          const startDistSq = (startX - c.x) * (startX - c.x) + (startZ - c.z) * (startZ - c.z);
          if (startDistSq < combinedRadius * combinedRadius && distSq > startDistSq) {
            continue; // Player is stepping out of / away from the obstacle - do not block
          }
        }

        // Vertical check: is player within elevation range of this obstacle?
        if (y >= c.y - 1.0 && y <= c.y + c.height + 0.6) {
          const dist = Math.sqrt(distSq);
          return {
            hit: true,
            collider: c,
            normal: {
              x: dist > 0.0001 ? dx / dist : 1,
              z: dist > 0.0001 ? dz / dist : 0,
            },
          };
        }
      }
    }
    return { hit: false };
  }

  /**
   * Regrow felled trees (e.g. overnight or after sleeping at camp)
   */
  public regrowFelledTrees() {
    for (const tree of this.springTrees) {
      if (tree.isFelled) {
        tree.isFelled = false;
        tree.health = tree.maxHealth;
        tree.trunkMesh.visible = true;
        tree.crownMesh.visible = true;
        tree.stumpMesh.visible = false;
        tree.group.scale.set(1, 1, 1);
      }
    }
  }

  /**
   * Strike foliage, boulders, cacti, spring trees, or quartz deposits with axe, pickaxe, shovel, or rifle
   */
  public strikeFoliageOrRock(
    raycaster: THREE.Raycaster,
    maxDist: number = 6.5,
    equippedTool?: string
  ): StrikeFoliageResult {
    // -1. Check Active Excavated Mountain Holes (Direct Pickaxe Bore Strikes)
    const holeHit = this.mountainHoleManager.raycastMountainHoles(raycaster, maxDist);
    if (holeHit.hit && holeHit.hole) {
      const hole = holeHit.hole;
      const strikePoint = holeHit.point || hole.position;
      const strikeNormal = holeHit.strikeNormal || hole.normal;
      const holeRes = this.mountainHoleManager.digMountainHole(
        strikePoint,
        strikeNormal,
        hole.rockColor,
        hole.rockType,
        equippedTool || 'pickaxe',
        true,
        hole,
        { isBranch: holeHit.isSideWall, isCeiling: holeHit.isCeiling }
      );
      this.updateMountainHoleCutouts();
      const holeMaterial = hole.hasExposedGoldVein ? 'quartz_gold' : hole.rockType;
      return {
        hit: true,
        type: 'outcropping',
        hitPoint: holeRes.hitPoint,
        surfaceNormal: strikeNormal.clone(),
        rockMaterial: holeMaterial,
        debrisType: holeRes.debrisType,
        blocksDug: holeRes.rocksAwarded,
        goldAwarded: holeRes.goldAwarded,
        spawnPhysicalRock: {
          position: holeRes.hitPoint.clone().add(strikeNormal.clone().multiplyScalar(0.2)),
          color: hole.rockColor,
          scale: 0.48,
          weightLbs: 12,
          ejectionDir: strikeNormal,
          isChippedFragment: true,
        },
        message: holeRes.message,
      };
    }

    // 0. Check Spring Riparian Trees (Specially harvestable with Frontier Axe)
    for (const tree of this.springTrees) {
      if (tree.isFelled) continue;
      const trunkHits = raycaster.intersectObject(tree.trunkMesh, false);
      const crownHits = trunkHits.length === 0 ? raycaster.intersectObject(tree.crownMesh, false) : [];
      const hit = trunkHits[0] || crownHits[0];
      if (hit && hit.distance <= maxDist) {
        const isAxe = equippedTool === 'axe';
        const chopDamage = isAxe ? 1.0 : 0.4;
        tree.health -= chopDamage;

        // Tree tilt recoil
        tree.group.rotation.z = (Math.random() - 0.5) * 0.12;
        setTimeout(() => {
          if (tree.group) tree.group.rotation.z = 0;
        }, 120);

        const woodYield = isAxe ? tree.woodPerChop : 1;
        let bonusWood = 0;
        let message = `🪓 Chopped ${tree.name} (+${woodYield} Cut Wood Log${woodYield > 1 ? 's' : ''})`;
        if (!isAxe) {
          message += ' [💡 Equip Felling Axe (X) for maximum timber yield!]';
        }

        if (tree.health <= 0) {
          tree.isFelled = true;
          bonusWood = tree.felledBonusWood;
          tree.trunkMesh.visible = false;
          tree.crownMesh.visible = false;
          tree.stumpMesh.visible = true;
          message = `🪓 Felled ${tree.name}! Harvested +${woodYield + bonusWood} Cut Wood Logs for campfire fuel & timber!`;
        }

        return {
          hit: true,
          type: 'tree',
          hitPoint: hit.point.clone(),
          debrisType: 'wood',
          woodAwarded: woodYield + bonusWood,
          message,
        };
      }
    }

    // 1. Check Gold Quartz Deposits
    const unminedDeposits = this.goldDeposits.filter((d) => !d.mined && d.mesh.visible);
    for (const gd of unminedDeposits) {
      const hits = raycaster.intersectObject(gd.mesh, true);
      if (hits.length > 0 && hits[0].distance <= maxDist) {
        gd.mined = true;
        gd.mesh.scale.set(0, 0, 0);
        gd.mesh.visible = false;
        const hitPoint = hits[0].point.clone();
        const normal = hits[0].face ? hits[0].face.normal.clone().normalize() : new THREE.Vector3(0, 1, 0);
        if (this.dustParticleSystem) {
          this.dustParticleSystem.triggerMountainStrike(hitPoint, normal, 'quartz_gold', 1.3);
        }
        return {
          hit: true,
          type: 'gold_deposit',
          hitPoint,
          surfaceNormal: normal,
          rockMaterial: 'quartz_gold',
          debrisType: 'quartz_gold',
          goldAwarded: gd.ounces,
          depositId: gd.id,
          message: `🌟 Shattered Gold Quartz Vein! (+${gd.ounces} oz High-Grade Gold)`,
        };
      }
    }

    // 2. Check Desert Boulders & Rock Formations
    for (let meshIdx = 0; meshIdx < this.boulderMeshes.length; meshIdx++) {
      const bMesh = this.boulderMeshes[meshIdx];
      const boulderHits = raycaster.intersectObject(bMesh, false);
      if (boulderHits.length > 0 && boulderHits[0].distance <= maxDist && boulderHits[0].instanceId !== undefined) {
        const id = boulderHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        bMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          const weightLbs = calculateInstancedBoulderWeight(scale.x, scale.y, scale.z);
          const boulderKey = `${meshIdx}_${id}`;
          const currentHits = (this.boulderHitsMap.get(boulderKey) || 0) + 1;
          const maxHitsNeeded = weightLbs > 150 ? 4 : weightLbs > 55 ? 3 : 2;

          let color = 0x8f4327;
          if (bMesh.instanceColor) {
            const col = new THREE.Color();
            bMesh.getColorAt(id, col);
            color = col.getHex();
          }

          const goldRoll = Math.random() < 0.35 ? 1 : 0;
          const hitPoint = boulderHits[0].point.clone();
          const normal = boulderHits[0].face ? boulderHits[0].face.normal.clone() : new THREE.Vector3(0, 1, 0);
          const chunkScale = Number((0.46 + Math.random() * 0.12).toFixed(2));
          const chunkWeight = Math.max(8, Math.round(65 * Math.pow(chunkScale, 3))); // 8-15 lbs

          if (this.dustParticleSystem) {
            this.dustParticleSystem.triggerMountainStrike(hitPoint, normal, 'sandstone', 0.95);
          }

          if (currentHits < maxHitsNeeded) {
            // Chipping away at large boulder!
            this.boulderHitsMap.set(boulderKey, currentHits);
            return {
              hit: true,
              type: 'boulder',
              hitPoint,
              surfaceNormal: normal,
              rockMaterial: 'sandstone',
              debrisType: 'granite',
              blocksDug: 1,
              goldAwarded: goldRoll,
              spawnPhysicalRock: {
                position: hitPoint.clone().add(normal.clone().multiplyScalar(0.2)),
                color,
                scale: chunkScale,
                weightLbs: chunkWeight,
                ejectionDir: normal,
                isChippedFragment: true,
              },
              message: `⛏️ Chipped ${chunkWeight} lb stone from ${weightLbs.toLocaleString()} lb Boulder [${currentHits}/${maxHitsNeeded} strikes]! (+1 Building Stone)`,
            };
          } else {
            // Final strike breaks the remaining core
            this.boulderHitsMap.delete(boulderKey);
            bMesh.setMatrixAt(id, this.zeroMatrix);
            bMesh.instanceMatrix.needsUpdate = true;
            this.deactivateRockCollider(meshIdx, id);

            return {
              hit: true,
              type: 'boulder',
              hitPoint,
              surfaceNormal: normal,
              rockMaterial: 'sandstone',
              debrisType: 'granite',
              blocksDug: 2,
              goldAwarded: goldRoll,
              spawnPhysicalRock: {
                position: hitPoint.clone().add(new THREE.Vector3(0, 0.25, 0)),
                color,
                scale: 0.68,
                weightLbs: 20,
                ejectionDir: new THREE.Vector3(0, 1, 0),
                isChippedFragment: true,
              },
              message:
                goldRoll > 0
                  ? `💥 Shattered remaining core of ${weightLbs.toLocaleString()} lb Boulder! (+2 Quarry Rocks, +1 oz Gold)!`
                  : `💥 Shattered remaining core of ${weightLbs.toLocaleString()} lb Boulder! (+2 Quarry Rocks)!`,
            };
          }
        }
      }
    }

    // 3. Check Monumental Mountain Outcroppings & Canyon Crags
    // Authentic Geological Law: Mountain cliffs are permanent bedrock monoliths (thousands of tons).
    // A prospector's pickaxe bores deep excavation cavities, test adits, and exposes glittering veins in the rock!
    const archetypeNames = ['volcanic_crag', 'stepped_mesa', 'fault_monocline', 'canyon_spire'];
    for (let meshIdx = 0; meshIdx < this.outcroppingMeshes.length; meshIdx++) {
      const ocMesh = this.outcroppingMeshes[meshIdx];
      const archetypeRock = archetypeNames[meshIdx] || 'volcanic_crag';
      const ocHits = raycaster.intersectObject(ocMesh, false);
      if (ocHits.length > 0 && ocHits[0].distance <= maxDist && ocHits[0].instanceId !== undefined) {
        const id = ocHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        ocMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          const hitPoint = ocHits[0].point.clone();
          const localNormal = ocHits[0].face ? ocHits[0].face.normal.clone() : new THREE.Vector3(0, 0, 1);
          // Transform local normal to world space
          const normal = localNormal.clone().transformDirection(matrix).normalize();
          // Ensure normal points outward from rock face toward camera/player
          if (normal.dot(raycaster.ray.direction) > 0) {
            normal.negate();
          }

          let rockColor = 0x7c3820;
          if (ocMesh.instanceColor) {
            const col = new THREE.Color();
            ocMesh.getColorAt(id, col);
            rockColor = col.getHex();
          }

          // Carve or deepen a real, visible physical 3D hole into the mountain rock face!
          const frontX = hitPoint.x + normal.x * 1.8;
          const frontZ = hitPoint.z + normal.z * 1.8;
          const groundY = getTerrainHeight(frontX, frontZ);
          const holeRes = this.mountainHoleManager.digMountainHole(
            hitPoint,
            normal,
            rockColor,
            archetypeRock,
            equippedTool || 'pickaxe',
            true,
            undefined,
            undefined,
            groundY
          );
          this.updateMountainHoleCutouts();

          // Trigger particle system with exact material intensity
          if (this.dustParticleSystem) {
            this.dustParticleSystem.triggerMountainStrike(hitPoint, normal, archetypeRock, 1.15);
          }

          const chunkScale = Number((0.44 + Math.random() * 0.14).toFixed(2));
          const chunkWeight = Math.max(8, Math.round(65 * Math.pow(chunkScale, 3)));
          const spawnPos = hitPoint.clone().add(normal.clone().multiplyScalar(0.25));

          return {
            hit: true,
            type: 'outcropping',
            hitPoint,
            surfaceNormal: normal,
            rockMaterial: archetypeRock,
            debrisType: holeRes.debrisType,
            blocksDug: holeRes.rocksAwarded,
            goldAwarded: holeRes.goldAwarded,
            spawnPhysicalRock: {
              position: spawnPos,
              color: rockColor,
              scale: chunkScale,
              weightLbs: chunkWeight,
              ejectionDir: normal,
              isChippedFragment: true,
            },
            message: holeRes.message,
          };
        }
      }
    }

    // 4. Check Saguaro Cacti
    if (this.saguaroGroup) {
      const sagHits = raycaster.intersectObjects(this.saguaroGroup.children, true);
      if (sagHits.length > 0 && sagHits[0].distance <= maxDist) {
        let topObj: THREE.Object3D | null = sagHits[0].object;
        while (topObj && topObj.parent !== this.saguaroGroup) {
          topObj = topObj.parent;
        }
        if (topObj && topObj.scale.x > 0.05) {
          topObj.scale.set(0, 0, 0);
          topObj.visible = false;
          return {
            hit: true,
            type: 'saguaro',
            hitPoint: sagHits[0].point.clone(),
            debrisType: 'cactus',
            hydrationAwarded: 15,
            message: '🌵 Chopped Saguaro Cactus: Extracted emergency desert water! (+15% Hydration)',
          };
        }
      }
    }

    // 5. Check Barrel Cacti
    if (this.barrelMesh) {
      const barrelHits = raycaster.intersectObject(this.barrelMesh, false);
      if (barrelHits.length > 0 && barrelHits[0].distance <= maxDist && barrelHits[0].instanceId !== undefined) {
        const id = barrelHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        this.barrelMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          this.barrelMesh.setMatrixAt(id, this.zeroMatrix);
          this.barrelMesh.instanceMatrix.needsUpdate = true;
          return {
            hit: true,
            type: 'barrel',
            hitPoint: barrelHits[0].point.clone(),
            debrisType: 'cactus',
            hydrationAwarded: 10,
            message: '🌵 Sliced Barrel Cactus: Tapped water reservoir! (+10% Hydration)',
          };
        }
      }
    }

    // 6. Check Prickly Pear Cacti
    if (this.pricklyMesh) {
      const pricklyHits = raycaster.intersectObject(this.pricklyMesh, false);
      if (pricklyHits.length > 0 && pricklyHits[0].distance <= maxDist && pricklyHits[0].instanceId !== undefined) {
        const id = pricklyHits[0].instanceId;
        this.pricklyMesh.setMatrixAt(id, this.zeroMatrix);
        this.pricklyMesh.instanceMatrix.needsUpdate = true;
        return {
          hit: true,
          type: 'prickly',
          hitPoint: pricklyHits[0].point.clone(),
          debrisType: 'cactus',
          hydrationAwarded: 8,
          message: '🌵 Harvested Prickly Pear: Crisp desert moisture! (+8% Hydration)',
        };
      }
    }

    // 7. Check Jumping Cholla
    if (this.chollaMesh) {
      const chollaHits = raycaster.intersectObject(this.chollaMesh, false);
      if (chollaHits.length > 0 && chollaHits[0].distance <= maxDist && chollaHits[0].instanceId !== undefined) {
        const id = chollaHits[0].instanceId;
        this.chollaMesh.setMatrixAt(id, this.zeroMatrix);
        this.chollaMesh.instanceMatrix.needsUpdate = true;
        return {
          hit: true,
          type: 'cholla',
          hitPoint: chollaHits[0].point.clone(),
          debrisType: 'cactus',
          hydrationAwarded: 6,
          message: '🌵 Cleared Jumping Cholla: Disintegrated spiny cactus! (+6% Hydration)',
        };
      }
    }

    // 8. Check Creosote Scrub Bushes
    if (this.scrubMesh) {
      const scrubHits = raycaster.intersectObject(this.scrubMesh, false);
      if (scrubHits.length > 0 && scrubHits[0].distance <= maxDist && scrubHits[0].instanceId !== undefined) {
        const id = scrubHits[0].instanceId;
        this.scrubMesh.setMatrixAt(id, this.zeroMatrix);
        this.scrubMesh.instanceMatrix.needsUpdate = true;
        return {
          hit: true,
          type: 'scrub',
          hitPoint: scrubHits[0].point.clone(),
          debrisType: 'wood',
          blocksDug: 1,
          woodAwarded: 2,
          message: '🌿 Chopped Desert Ironwood Scrub (+2 Timber Planks for Pit Shoring, +1 Stone)',
        };
      }
    }

    return { hit: false };
  }

  /**
   * Check if the player is looking at an instanced desert boulder within reach with bare hands.
   * Calculates volumetric weight and determines if it is liftable by human hands (<= 55 lbs).
   */
  public checkNearbyBoulder(raycaster: THREE.Raycaster, maxDist: number = 3.5): {
    hit: boolean;
    hitPoint?: THREE.Vector3;
    distance?: number;
    weightLbs: number;
    canLift: boolean;
    scale: number;
  } | null {
    for (const bMesh of this.boulderMeshes) {
      const boulderHits = raycaster.intersectObject(bMesh, false);
      if (boulderHits.length > 0 && boulderHits[0].distance <= maxDist && boulderHits[0].instanceId !== undefined) {
        const id = boulderHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        bMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          const avgScale = (scale.x + scale.y + scale.z) / 3.0;
          const weightLbs = calculateInstancedBoulderWeight(scale.x, scale.y, scale.z);
          const canLift = weightLbs <= 55;
          return {
            hit: true,
            hitPoint: boulderHits[0].point.clone(),
            distance: boulderHits[0].distance,
            weightLbs,
            canLift,
            scale: avgScale,
          };
        }
      }
    }
    return null;
  }

  /**
   * Pick up an instanced desert boulder with bare hands.
   * If the rock is within human lifting limits (<= 55 lbs), it is removed from the world.
   * If it exceeds 55 lbs, it remains anchored and returns canLift: false.
   */
  public pickUpWorldBoulder(raycaster: THREE.Raycaster, maxDist: number = 3.5): {
    hit: boolean;
    canLift: boolean;
    weightLbs: number;
    position?: THREE.Vector3;
    color?: number;
    scale?: number;
  } | null {
    for (const bMesh of this.boulderMeshes) {
      const boulderHits = raycaster.intersectObject(bMesh, false);
      if (boulderHits.length > 0 && boulderHits[0].distance <= maxDist && boulderHits[0].instanceId !== undefined) {
        const id = boulderHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        bMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          const avgScale = (scale.x + scale.y + scale.z) / 3.0;
          const weightLbs = calculateInstancedBoulderWeight(scale.x, scale.y, scale.z);
          const canLift = weightLbs <= 55;

          // If too heavy, do NOT hide or delete from world!
          if (!canLift) {
            return {
              hit: true,
              canLift: false,
              weightLbs,
              scale: avgScale,
            };
          }

          const pos = new THREE.Vector3();
          pos.setFromMatrixPosition(matrix);

          let color = 0x8f4327;
          if (bMesh.instanceColor) {
            const col = new THREE.Color();
            bMesh.getColorAt(id, col);
            color = col.getHex();
          }

          // Hide this instance
          bMesh.setMatrixAt(id, this.zeroMatrix);
          bMesh.instanceMatrix.needsUpdate = true;
          this.deactivateRockCollider(this.boulderMeshes.indexOf(bMesh), id);

          return {
            hit: true,
            canLift: true,
            weightLbs,
            position: pos,
            color,
            scale: Math.min(0.95, Math.max(0.45, avgScale * 0.85)),
          };
        }
      }
    }
    return null;
  }

  /**
   * Blast destruction of foliage, cacti, boulders and quartz veins from dynamite detonations
   */
  public explodeFoliageAt(center: THREE.Vector3, radius: number = 4.8): ExplodeFoliageResult {
    let goldBlasted = 0;
    let rocksBlasted = 0;
    let woodBlasted = 0;
    let hydrationBlasted = 0;
    let bannerMsg: string | undefined;
    const destroyedPoints: Array<{ pos: THREE.Vector3; type: DebrisType }> = [];

    // Gold deposits
    for (const gd of this.goldDeposits) {
      if (!gd.mined && gd.position.distanceTo(center) <= radius) {
        gd.mined = true;
        gd.mesh.scale.set(0, 0, 0);
        gd.mesh.visible = false;
        goldBlasted += gd.ounces;
        destroyedPoints.push({ pos: gd.position.clone(), type: 'quartz_gold' });
      }
    }

    // Boulders & Rocks
    for (const bMesh of this.boulderMeshes) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < bMesh.count; i++) {
        bMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius) {
            bMesh.setMatrixAt(i, this.zeroMatrix);
            bMesh.instanceMatrix.needsUpdate = true;
            this.deactivateRockCollider(this.boulderMeshes.indexOf(bMesh), i);
            rocksBlasted += 2;
            if (Math.random() < 0.35) goldBlasted += 1;
            destroyedPoints.push({ pos: pos.clone(), type: 'granite' });
          }
        }
      }
    }

    // Outcroppings
    for (const ocMesh of this.outcroppingMeshes) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < ocMesh.count; i++) {
        ocMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius * 1.3) {
            // Mountain monoliths are permanent bedrock: dynamite dislodges quarry stones and blasts a deep visible hole
            rocksBlasted += 3;
            if (Math.random() < 0.35) goldBlasted += 1;
            destroyedPoints.push({ pos: pos.clone(), type: 'sandstone' });

            const blastNormal = center.clone().sub(pos).normalize();
            const holeRes = this.mountainHoleManager.digMountainHole(
              center,
              blastNormal.lengthSq() > 0.1 ? blastNormal : new THREE.Vector3(0, 1, 0),
              0x7c3820,
              'volcanic_crag',
              'dynamite',
              true
            );
            if (holeRes.message) {
              bannerMsg = holeRes.message;
            }
            this.updateMountainHoleCutouts();
          }
        }
      }
    }

    // Saguaros
    if (this.saguaroGroup) {
      for (const c of this.saguaroGroup.children) {
        if (c.scale.x > 0.05 && c.position.distanceTo(center) <= radius) {
          c.scale.set(0, 0, 0);
          c.visible = false;
          hydrationBlasted += 15;
          destroyedPoints.push({ pos: c.position.clone(), type: 'cactus' });
        }
      }
    }

    // Barrel cacti
    if (this.barrelMesh) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < this.barrelMesh.count; i++) {
        this.barrelMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius) {
            this.barrelMesh.setMatrixAt(i, this.zeroMatrix);
            this.barrelMesh.instanceMatrix.needsUpdate = true;
            hydrationBlasted += 10;
            destroyedPoints.push({ pos: pos.clone(), type: 'cactus' });
          }
        }
      }
    }

    // Prickly Pear
    if (this.pricklyMesh) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < this.pricklyMesh.count; i++) {
        this.pricklyMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius) {
            this.pricklyMesh.setMatrixAt(i, this.zeroMatrix);
            this.pricklyMesh.instanceMatrix.needsUpdate = true;
            destroyedPoints.push({ pos: pos.clone(), type: 'cactus' });
          }
        }
      }
    }

    // Desert Scrub Bushes (yield wood planks)
    if (this.scrubMesh) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < this.scrubMesh.count; i++) {
        this.scrubMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius) {
            this.scrubMesh.setMatrixAt(i, this.zeroMatrix);
            this.scrubMesh.instanceMatrix.needsUpdate = true;
            woodBlasted += 2;
            destroyedPoints.push({ pos: pos.clone(), type: 'wood' });
          }
        }
      }
    }

    return { goldBlasted, rocksBlasted, woodBlasted, hydrationBlasted, destroyedPoints, bannerMessage: bannerMsg };
  }

  public dispose() {
    if (this.saguaroGroup) {
      this.scene.remove(this.saguaroGroup);
    }
    if (this.barrelMesh) {
      this.scene.remove(this.barrelMesh);
      this.barrelMesh.geometry.dispose();
    }
    for (const bMesh of this.boulderMeshes) {
      this.scene.remove(bMesh);
      bMesh.geometry.dispose();
    }
    if (this.scrubMesh) {
      this.scene.remove(this.scrubMesh);
      this.scrubMesh.geometry.dispose();
    }
    if (this.grassMesh) {
      this.scene.remove(this.grassMesh);
      this.grassMesh.geometry.dispose();
    }
    if (this.pricklyMesh) {
      this.scene.remove(this.pricklyMesh);
      this.pricklyMesh.geometry.dispose();
    }
    if (this.chollaMesh) {
      this.scene.remove(this.chollaMesh);
      this.chollaMesh.geometry.dispose();
    }
    for (const ocMesh of this.outcroppingMeshes) {
      this.scene.remove(ocMesh);
      ocMesh.geometry.dispose();
    }
    for (const gd of this.goldDeposits) {
      this.scene.remove(gd.mesh);
    }
    this.mountainHoleManager.dispose();
  }
}

/**
 * Creates instanced saguaro cacti, barrel cacti, boulders, and desert scrub.
 */
export function createDesertFoliage(scene: THREE.Scene): {
  goldDeposits: GoldDeposit[];
  interactiveMeshes: THREE.Object3D[];
  manager: DesertFoliageManager;
} {
  const manager = new DesertFoliageManager(scene);
  return {
    goldDeposits: manager.goldDeposits,
    interactiveMeshes: manager.interactiveMeshes,
    manager,
  };
}
