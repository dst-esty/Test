import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTerrainHeight, updateTerrainHoleCutouts, applyMountainHoleShaderToMaterial } from './terrain';
import { DebrisType } from '../types';
import { MountainHoleManager } from './mountainHoles';
import { MountainDustParticleSystem } from './mountainDustParticles';

/**
 * Safely merges multiple geometries by normalizing attributes (non-indexed + common attributes).
 * Prevents BufferGeometryUtils.mergeGeometries from failing on indexed/non-indexed attribute mismatches.
 */
export function safeMergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (!geos || geos.length === 0) return new THREE.BufferGeometry();
  if (geos.length === 1) return geos[0];

  // 1. Convert all to non-indexed to guarantee compatible index structures
  const prepared = geos.map((g) => {
    return g.index ? g.toNonIndexed() : g.clone();
  });

  // 2. Identify common attributes shared across ALL geometries
  const allKeys = Object.keys(prepared[0].attributes);
  const commonKeys = allKeys.filter((key) => prepared.every((g) => !!g.attributes[key]));

  // 3. Strip mismatched attributes and ensure normals exist
  for (const g of prepared) {
    for (const key of Object.keys(g.attributes)) {
      if (!commonKeys.includes(key)) {
        g.deleteAttribute(key);
      }
    }
    if (!g.attributes.normal) {
      g.computeVertexNormals();
    }
  }

  const merged = mergeGeometries(prepared, false);
  if (merged) {
    merged.computeVertexNormals();
    return merged;
  }
  return prepared[0];
}

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
  const radialSegments = 10;
  const heightSegments = 24;
  const geo = new THREE.CylinderGeometry(2.2, 5.4, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Smooth, strictly monotonic profile without any sudden overhang steps
    let profileScale = 1.0;
    if (t >= 0.80) {
      // Jagged summit crest with asymmetric knife-edge peaks (tapering inwards to summits)
      const crest = Math.cos(angle * 2.0 + 0.6) * 0.25;
      profileScale = (1.0 - (t - 0.80) / 0.20 * 0.55) * (1.0 + crest);
      py += Math.pow(Math.max(0, Math.sin(angle * 2.0)), 2.0) * 1.8;
    } else {
      // Continuous smooth column with subtle vertical weathering
      profileScale = 1.0 - t * 0.12 + Math.sin(t * 12.0) * 0.03;
    }

    // Columnar vertical jointing & rock faceting
    const jointFacet = Math.cos(angle * 4.0) * 0.14 + Math.sin(angle * 8.0) * 0.06;
    const strataGroove = Math.sin(py * 2.8) * 0.04;

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
  const height = 14.0;
  const radialSegments = 12;
  const heightSegments = 24;
  const geo = new THREE.CylinderGeometry(3.8, 6.8, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Natural receding geological benches (each tier steps inward, NEVER outward)
    const terraceCount = 3.0;
    const terraceFrac = (t * terraceCount) % 1.0;
    const shelfRecede = Math.pow(terraceFrac, 2.5) * 0.06;
    const generalTaper = (1.0 - t * 0.20);
    const profileScale = generalTaper - shelfRecede;

    // Angular blocky corners (quadrangular mesa)
    const blocky = Math.cos(angle * 4.0) * 0.10 + Math.sin(angle * 2.0) * 0.05;
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
  const radialSegments = 10;
  const heightSegments = 22;
  const geo = new THREE.CylinderGeometry(2.0, 4.8, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Smooth tilted monocline: shear along X axis, continuous gentle taper
    const tiltShift = Math.sin(angle) * (t * 2.2);
    const scarpCut = Math.cos(angle) > 0.2 ? 0.90 : 1.10;

    // Continuous monotonic profile with no jump discontinuities
    const profileScale = (1.0 - t * 0.28) * scarpCut;
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
  const geo = new THREE.CylinderGeometry(1.2, 4.6, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    const t = (py + height / 2) / height;
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // Completely smooth continuous taper from subterranean base to needle pinnacle
    const fluting = Math.sin(angle * 5.0) * 0.08;
    const profileScale = (1.0 - t * 0.35) * (1.0 + fluting);

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
 * Ensures the Tortilla Flat settlement (0, -252), Peralta Base Camp (-120, -120), and Player Spawns
 * are completely clear of randomly spawned boulders, cacti, scrub, and mountain outcroppings.
 */
export function isNearPeraltaCamp(x: number, z: number, clearanceRadius: number = 22): boolean {
  const distTrailhead = Math.hypot(x - (-120), z - (-120));
  const distSpawn = Math.hypot(x - (-115), z - (-115));
  const distCenter = Math.hypot(x - (-117.5), z - (-117.5));
  const distTortilla = Math.hypot(x - 0, z - (-250));
  const isTortillaTownBox = Math.abs(x) < 30 && z < -218 && z > -285;
  return distTrailhead < clearanceRadius || distSpawn < clearanceRadius || distCenter < clearanceRadius || distTortilla < Math.max(clearanceRadius, 48) || isTortillaTownBox;
}

/**
 * Procedural fluted cylinder for realistic pleated Saguaro cacti.
 */
export function createFlutedCylinderGeometry(
  radiusBottom: number,
  radiusTop: number,
  height: number,
  radialSegments: number = 24,
  pleatCount: number = 16,
  pleatDepth: number = 0.08,
  domeTop: boolean = true
): THREE.BufferGeometry {
  const heightSegments = domeTop ? 14 : 8;
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const theta = Math.atan2(z, x);
    const r = Math.hypot(x, z);

    // Fluted vertical accordion rib modulation
    const pleat = 1.0 + pleatDepth * Math.cos(theta * pleatCount);

    // Dome top at summit
    let dome = 1.0;
    if (domeTop && y > height * 0.35) {
      const t = (y - height * 0.35) / (height * 0.15);
      dome = Math.sqrt(Math.max(0.04, 1.0 - Math.min(1.0, t * t) * 0.82));
    }

    const newR = r * pleat * dome;
    pos.setXYZ(i, Math.cos(theta) * newR, y, Math.sin(theta) * newR);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Authentic Sonoran Creosote Bush (Larrea tridentata)
 * Open, multi-stemmed gnarled branches radiating from soil with airy leafy clusters.
 */
export function createRealisticCreosoteGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Root collar & base woody branches
  const branchCount = 6;
  for (let i = 0; i < branchCount; i++) {
    const angle = (i / branchCount) * Math.PI * 2 + ((i * 1.618) % 0.5);
    const tilt = 0.35 + (i % 3) * 0.12;
    const length = 0.75 + (i % 2) * 0.25;

    const branchGeo = new THREE.CylinderGeometry(0.022, 0.045, length, 5);
    branchGeo.translate(0, length / 2, 0);
    branchGeo.rotateZ(tilt);
    branchGeo.rotateY(angle);
    parts.push(branchGeo);

    // Secondary sub-branch
    if (i % 2 === 0) {
      const subLength = 0.42;
      const subGeo = new THREE.CylinderGeometry(0.016, 0.028, subLength, 4);
      subGeo.translate(0, subLength / 2, 0);
      subGeo.rotateZ(tilt + 0.32);
      subGeo.rotateY(angle + 0.45);
      const mx = Math.sin(tilt) * Math.cos(angle) * (length * 0.55);
      const my = Math.cos(tilt) * (length * 0.55);
      const mz = Math.sin(tilt) * Math.sin(angle) * (length * 0.55);
      subGeo.translate(mx, my, mz);
      parts.push(subGeo);
    }
  }

  // 2. Airy, clustered botanical foliage sprigs at branch tips (leaves the woody center open!)
  const sprigCount = 9;
  for (let s = 0; s < sprigCount; s++) {
    const angle = (s / sprigCount) * Math.PI * 2 + ((s * 2.3) % 0.4);
    const r = 0.5 + (s % 3) * 0.16;
    const y = 0.38 + (s % 3) * 0.22;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    const sprigGeo = new THREE.DodecahedronGeometry(0.24 + (s % 2) * 0.08, 0);
    sprigGeo.scale(1.3, 0.72, 1.3);
    sprigGeo.rotateY(s * 1.1);
    sprigGeo.translate(x, y, z);
    parts.push(sprigGeo);
  }

  return safeMergeGeometries(parts);
}

/**
 * Authentic Desert Bunchgrass / Purple Three-Awn (Aristida)
 * Multi-blade tussock of curved, arching blades radiating outwards with seed plumes.
 */
export function createRealisticBunchgrassGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bladeCount = 14;

  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2 + ((i * 0.85) % 0.3);
    const bladeHeight = 0.68 + (i % 3) * 0.18;

    // Segment 1: erect base
    const seg1 = new THREE.BoxGeometry(0.045, bladeHeight * 0.42, 0.008);
    seg1.translate(0, (bladeHeight * 0.42) / 2, 0);
    seg1.rotateZ(0.12);

    // Segment 2: arching outward
    const seg2 = new THREE.BoxGeometry(0.035, bladeHeight * 0.35, 0.006);
    seg2.translate(0, (bladeHeight * 0.35) / 2, 0);
    seg2.rotateZ(0.42);
    seg2.translate(0.08, bladeHeight * 0.38, 0);

    // Segment 3: drooping fine tip
    const seg3 = new THREE.ConeGeometry(0.02, bladeHeight * 0.28, 3);
    seg3.rotateZ(0.72);
    seg3.translate(0.22, bladeHeight * 0.62, 0);

    const bladeGeo = safeMergeGeometries([seg1, seg2, seg3]);
    bladeGeo.rotateY(angle);
    parts.push(bladeGeo);
  }

  // Central seed plume awns
  for (let p = 0; p < 3; p++) {
    const pAngle = (p / 3) * Math.PI * 2 + 0.4;
    const plume = new THREE.ConeGeometry(0.028, 0.36, 4);
    plume.translate(0, 0.88, 0);
    plume.rotateZ(0.18);
    plume.rotateY(pAngle);
    parts.push(plume);
  }

  return safeMergeGeometries(parts);
}

/**
 * Authentic Arizona Fishhook Barrel Cactus (Ferocactus wislizeni)
 * Cylindrical accordion pleats with curved dome crown and golden spine tuft cap.
 */
export function createRealisticBarrelCactusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const radialSegments = 32;
  const heightSegments = 12;
  const bodyHeight = 0.95;
  const bodyRadius = 0.42;

  const bodyGeo = new THREE.CylinderGeometry(bodyRadius * 0.78, bodyRadius, bodyHeight, radialSegments, heightSegments);
  const pos = bodyGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const theta = Math.atan2(z, x);
    const r = Math.hypot(x, z);

    // 16 deep accordion pleats
    const pleat = 1.0 + 0.12 * Math.cos(theta * 16);

    // Curvature at summit
    const normY = (y + bodyHeight / 2) / bodyHeight;
    let profile = 1.0;
    if (normY > 0.72) {
      const domeT = (normY - 0.72) / 0.28;
      profile = Math.sqrt(Math.max(0.02, 1.0 - domeT * domeT * 0.78));
    } else if (normY < 0.15) {
      profile = 0.85 + 0.15 * (normY / 0.15);
    }

    const newR = r * pleat * profile;
    pos.setXYZ(i, Math.cos(theta) * newR, y, Math.sin(theta) * newR);
  }
  bodyGeo.computeVertexNormals();
  parts.push(bodyGeo);

  // Spiny crown summit with yellow flower buds
  const crownGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.08, 12);
  crownGeo.translate(0, bodyHeight / 2 + 0.03, 0);
  parts.push(crownGeo);

  for (let s = 0; s < 8; s++) {
    const sAngle = (s / 8) * Math.PI * 2;
    const spine = new THREE.ConeGeometry(0.024, 0.12, 4);
    spine.rotateX(0.35);
    spine.rotateY(sAngle);
    spine.translate(Math.cos(sAngle) * 0.13, bodyHeight / 2 + 0.06, Math.sin(sAngle) * 0.13);
    parts.push(spine);
  }

  return safeMergeGeometries(parts);
}

/**
 * Authentic Engelmann's Prickly Pear Cactus (Opuntia engelmannii)
 * Branching flattened oval paddle pads with scarlet tuna fruits.
 */
export function createRealisticPricklyPearGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const createPad = (
    scaleX: number,
    scaleY: number,
    scaleZ: number,
    posX: number,
    posY: number,
    posZ: number,
    rotX: number,
    rotY: number,
    rotZ: number
  ) => {
    const pad = new THREE.CylinderGeometry(0.36, 0.36, 0.055, 12);
    pad.scale(scaleX, scaleY, scaleZ);
    pad.rotateX(rotX);
    pad.rotateY(rotY);
    pad.rotateZ(rotZ);
    pad.translate(posX, posY, posZ);
    return pad;
  };

  // Base Pad rooted in soil
  parts.push(createPad(1.0, 1.0, 1.25, 0, 0.35, 0, 0.08, 0, -0.05));

  // Tier 1 Daughter Pads
  parts.push(createPad(0.9, 0.95, 1.15, -0.32, 0.78, 0.02, 0.12, 0.25, -0.35));
  parts.push(createPad(0.85, 0.9, 1.1, 0.35, 0.82, -0.02, -0.08, -0.2, 0.32));

  // Tier 2 Daughter Pads
  parts.push(createPad(0.75, 0.85, 1.0, -0.52, 1.22, 0.08, 0.18, 0.45, -0.42));
  parts.push(createPad(0.8, 0.85, 1.05, 0.12, 1.28, 0.03, -0.05, 0.1, 0.08));
  parts.push(createPad(0.7, 0.8, 0.95, 0.62, 1.18, -0.06, -0.15, -0.35, 0.45));

  // Crimson / Magenta Prickly Pear Tuna Fruits
  const fruitPositions = [
    { x: -0.62, y: 1.48, z: 0.12 },
    { x: -0.42, y: 1.54, z: 0.05 },
    { x: 0.05, y: 1.58, z: 0.04 },
    { x: 0.22, y: 1.56, z: 0.02 },
    { x: 0.72, y: 1.42, z: -0.08 },
  ];
  for (const fp of fruitPositions) {
    const fruit = new THREE.CylinderGeometry(0.038, 0.032, 0.11, 6);
    fruit.translate(fp.x, fp.y, fp.z);
    parts.push(fruit);
  }

  return safeMergeGeometries(parts);
}

/**
 * Authentic Jumping / Teddy Bear Cholla (Cylindropuntia fulgida)
 * Densely jointed branching spiny segments with dropping chains.
 */
export function createRealisticChollaGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Central woody stem
  const trunk = new THREE.CylinderGeometry(0.08, 0.11, 0.85, 6);
  trunk.translate(0, 0.42, 0);
  parts.push(trunk);

  // Whorls of jointed spiny branch segments
  const jointCount = 8;
  for (let j = 0; j < jointCount; j++) {
    const angle = (j / jointCount) * Math.PI * 2 + ((j * 1.4) % 0.3);
    const tier = j < 4 ? 0.65 : 0.92;
    const length = 0.38 + (j % 3) * 0.1;
    const jointRadius = 0.08;

    const joint = new THREE.CylinderGeometry(jointRadius, jointRadius * 0.88, length, 6);
    joint.translate(0, length / 2, 0);
    const tilt = 0.48 + (j < 4 ? 0.25 : 0.12);
    joint.rotateZ(tilt);
    joint.rotateY(angle);
    joint.translate(Math.cos(angle) * 0.08, tier, Math.sin(angle) * 0.08);
    parts.push(joint);

    // Dropping chain joint
    if (j % 2 === 0) {
      const dropLength = 0.26;
      const dropJoint = new THREE.CylinderGeometry(jointRadius * 0.9, jointRadius * 0.72, dropLength, 6);
      dropJoint.translate(0, -dropLength / 2, 0);
      dropJoint.rotateZ(0.2);
      dropJoint.rotateY(angle);
      const tipDist = Math.sin(tilt) * length + 0.11;
      const tipY = tier + Math.cos(tilt) * length;
      dropJoint.translate(Math.cos(angle) * tipDist, tipY, Math.sin(angle) * tipDist);
      parts.push(dropJoint);
    }
  }

  return safeMergeGeometries(parts);
}

/**
 * Authentic Sonoran Desert Ocotillo (Fouquieria splendens)
 * 12 tall whiplike thorny canes radiating outward in an inverted vase shape with scarlet tips.
 */
export function createRealisticOcotilloGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const caneCount = 12;

  for (let i = 0; i < caneCount; i++) {
    const angle = (i / caneCount) * Math.PI * 2 + ((i * 1.3) % 0.25);
    const caneHeight = 3.2 + (i % 3) * 0.45;
    const flare = 0.25 + (i % 4) * 0.05;

    // Lower cane segment
    const seg1 = new THREE.CylinderGeometry(0.032, 0.052, caneHeight * 0.5, 5);
    seg1.translate(0, (caneHeight * 0.5) / 2, 0);
    seg1.rotateZ(flare * 0.75);
    seg1.rotateY(angle);
    parts.push(seg1);

    // Upper cane segment with graceful flare
    const seg2 = new THREE.CylinderGeometry(0.018, 0.032, caneHeight * 0.5, 5);
    seg2.translate(0, (caneHeight * 0.5) / 2, 0);
    seg2.rotateZ(flare * 1.22);
    seg2.rotateY(angle);

    const midX = Math.sin(flare * 0.75) * Math.cos(angle) * (caneHeight * 0.5);
    const midY = Math.cos(flare * 0.75) * (caneHeight * 0.5);
    const midZ = Math.sin(flare * 0.75) * Math.sin(angle) * (caneHeight * 0.5);
    seg2.translate(midX, midY, midZ);
    parts.push(seg2);

    // Scarlet blossom cone at tip
    const flower = new THREE.ConeGeometry(0.065, 0.32, 5);
    flower.rotateZ(flare * 1.25);
    flower.rotateY(angle);
    const tipX = midX + Math.sin(flare * 1.22) * Math.cos(angle) * (caneHeight * 0.5);
    const tipY = midY + Math.cos(flare * 1.22) * (caneHeight * 0.5);
    const tipZ = midZ + Math.sin(flare * 1.22) * Math.sin(angle) * (caneHeight * 0.5);
    flower.translate(tipX, tipY, tipZ);
    parts.push(flower);
  }

  return safeMergeGeometries(parts);
}

/**
 * Authentic Desert Century Plant / Agave (Agave chrysantha)
 * Rosette of thick fleshy spear-shaped succulent leaves with central bloom mast.
 */
export function createRealisticAgaveGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const leafCount = 16;

  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2 + i * 0.618;
    const tier = i / leafCount;
    const leafLength = 0.65 + (1.0 - tier) * 0.5;
    const archAngle = 0.42 + (1.0 - tier) * 0.42;

    const blade = new THREE.ConeGeometry(0.08 * (1.2 - tier * 0.35), leafLength, 4);
    blade.scale(1.35, 1.0, 0.42);
    blade.translate(0, leafLength / 2, 0);
    blade.rotateZ(archAngle);
    blade.rotateY(angle);
    blade.translate(Math.cos(angle) * 0.08 * tier, 0.05 + 0.12 * tier, Math.sin(angle) * 0.08 * tier);
    parts.push(blade);
  }

  // Tall candelabra flower mast (~3.4m tall)
  const mast = new THREE.CylinderGeometry(0.035, 0.075, 3.4, 6);
  mast.translate(0, 1.7, 0);
  parts.push(mast);

  for (let b = 0; b < 5; b++) {
    const bAngle = (b / 5) * Math.PI * 2;
    const branch = new THREE.CylinderGeometry(0.015, 0.024, 0.42, 4);
    branch.rotateZ(Math.PI / 2.3);
    branch.rotateY(bAngle);
    branch.translate(0, 2.3 + b * 0.18, 0);
    parts.push(branch);
  }

  return safeMergeGeometries(parts);
}

/**
 * Twisted, gnarled multi-limbed trunk for Riparian Trees (Cottonwood & Mesquite).
 */
export function createRealisticTreeTrunkGeometry(isCottonwood: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const trunkHeight = isCottonwood ? 4.8 : 3.8;
  const baseRadius = isCottonwood ? 0.48 : 0.42;

  // Main twisted trunk
  const mainTrunk = new THREE.CylinderGeometry(baseRadius * 0.72, baseRadius, trunkHeight * 0.6, 8, 4);
  const pos = mainTrunk.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    x += Math.sin(y * 1.8) * 0.12;
    z += Math.cos(y * 1.5) * 0.12;
    pos.setXYZ(i, x, y, z);
  }
  mainTrunk.computeVertexNormals();
  mainTrunk.translate(0, (trunkHeight * 0.6) / 2, 0);
  parts.push(mainTrunk);

  // 3 Major spreading scaffold boughs
  const branchAngles = [0.2, 2.3, 4.4];
  for (let b = 0; b < branchAngles.length; b++) {
    const angle = branchAngles[b];
    const bLength = trunkHeight * 0.55;
    const bRadius = baseRadius * 0.48;
    const bGeo = new THREE.CylinderGeometry(bRadius * 0.55, bRadius, bLength, 6);
    bGeo.translate(0, bLength / 2, 0);
    const tilt = 0.48 + (b % 2) * 0.22;
    bGeo.rotateZ(tilt);
    bGeo.rotateY(angle);
    bGeo.translate(Math.cos(angle) * 0.12, trunkHeight * 0.52, Math.sin(angle) * 0.12);
    parts.push(bGeo);
  }

  return safeMergeGeometries(parts);
}

/**
 * Layered, asymmetrical cloud canopy with negative space between foliage masses.
 */
export function createRealisticTreeCanopyGeometry(isCottonwood: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const clusterCount = isCottonwood ? 8 : 7;
  for (let c = 0; c < clusterCount; c++) {
    const angle = (c / clusterCount) * Math.PI * 2 + c * 0.75;
    const dist = 1.1 + (c % 3) * 0.7;
    const yOffset = (c % 3) * 0.85 + (c / clusterCount) * 0.9;
    const scale = 1.2 + (c % 2) * 0.6;

    const cluster = new THREE.DodecahedronGeometry(scale, 1);
    const pos = cluster.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      x += Math.sin(y * 3.1 + z * 2.2) * (scale * 0.16);
      y += Math.cos(x * 2.8 + z * 1.9) * (scale * 0.12);
      z += Math.sin(x * 2.5 + y * 2.0) * (scale * 0.16);
      pos.setXYZ(i, x, y, z);
    }
    cluster.computeVertexNormals();
    cluster.scale(1.2, 0.75, 1.2);
    cluster.translate(Math.cos(angle) * dist, yOffset, Math.sin(angle) * dist);
    parts.push(cluster);
  }

  return safeMergeGeometries(parts);
}

const _scratchFoliageBoreDirs = Array.from({ length: 16 }, () => new THREE.Vector3());

export interface FloraChunk {
  name: string;
  cx: number;
  cz: number;
  center: THREE.Vector3;
  radius: number;
  boundingSphere: THREE.Sphere;
  boundingBox: THREE.Box3;
  group: THREE.Group;
  saguaroMeshes: THREE.InstancedMesh[];
  barrelMesh?: THREE.InstancedMesh;
  boulderMeshes: THREE.InstancedMesh[];
  scrubMesh?: THREE.InstancedMesh;
  grassMesh?: THREE.InstancedMesh;
  pricklyMesh?: THREE.InstancedMesh;
  chollaMesh?: THREE.InstancedMesh;
  ocotilloMesh?: THREE.InstancedMesh;
  agaveMesh?: THREE.InstancedMesh;
  outcroppingMeshes: THREE.InstancedMesh[];
}

export class DesertFoliageManager {
  public goldDeposits: GoldDeposit[] = [];
  public springTrees: HarvestableTree[] = [];
  public interactiveMeshes: THREE.Object3D[] = [];
  public floraChunks: FloraChunk[] = [];
  public saguaroGroup: THREE.Group = new THREE.Group();
  public saguaroMeshes: THREE.InstancedMesh[] = [];
  public barrelMesh!: THREE.InstancedMesh;
  public allBarrelMeshes: THREE.InstancedMesh[] = [];
  public boulderMesh!: THREE.InstancedMesh;
  public boulderMeshes: THREE.InstancedMesh[] = [];
  public scrubMesh!: THREE.InstancedMesh;
  public allScrubMeshes: THREE.InstancedMesh[] = [];
  public grassMesh!: THREE.InstancedMesh;
  public allGrassMeshes: THREE.InstancedMesh[] = [];
  public pricklyMesh!: THREE.InstancedMesh;
  public allPricklyMeshes: THREE.InstancedMesh[] = [];
  public chollaMesh!: THREE.InstancedMesh;
  public allChollaMeshes: THREE.InstancedMesh[] = [];
  public ocotilloMesh!: THREE.InstancedMesh;
  public allOcotilloMeshes: THREE.InstancedMesh[] = [];
  public agaveMesh!: THREE.InstancedMesh;
  public allAgaveMeshes: THREE.InstancedMesh[] = [];
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
    // Cut out hollow tunnel bore in surface terrain mesh and rock materials
    updateTerrainHoleCutouts(surfaceHoles);
  }

  private lastLodCheckTime = 0;
  /**
   * Distance-based Level of Detail (LOD) & detail-tier culling for macro-quadrant flora chunks.
   * Grass is culled beyond 130m, low scrub & prickly pear beyond 170m, and cholla/agave/barrel beyond 230m.
   */
  public updateLOD(playerPos: THREE.Vector3): void {
    const now = performance.now();
    if (now - this.lastLodCheckTime < 150) return; // ~6.6 Hz throttle
    this.lastLodCheckTime = now;

    for (let q = 0; q < this.floraChunks.length; q++) {
      const chunk = this.floraChunks[q];
      if (!chunk.group.visible) continue;
      // Distance from player to the closest point of this flora chunk bounding box
      const dist = chunk.boundingBox.distanceToPoint(playerPos);

      // Detail tier 1 (bunchgrass): culled beyond 75m from chunk boundary
      if (chunk.grassMesh) {
        chunk.grassMesh.visible = dist <= 75;
      }
      // Detail tier 2 (scrub & prickly pear): culled beyond 125m from chunk boundary
      if (chunk.scrubMesh) {
        chunk.scrubMesh.visible = dist <= 125;
      }
      if (chunk.pricklyMesh) {
        chunk.pricklyMesh.visible = dist <= 125;
      }
      // Detail tier 3 (cholla, agave, barrel): culled beyond 180m from chunk boundary
      if (chunk.chollaMesh) {
        chunk.chollaMesh.visible = dist <= 180;
      }
      if (chunk.agaveMesh) {
        chunk.agaveMesh.visible = dist <= 180;
      }
      if (chunk.barrelMesh) {
        chunk.barrelMesh.visible = dist <= 180;
      }
      // Monumental saguaros, boulders, and outcroppings remain visible across field of view
    }
  }

  private init() {
    const dummy = new THREE.Object3D();

    // ==========================================
    // 0. Macro-Quadrant Flora Chunks (Frustum Culling & LOD)
    // ==========================================
    const QUADRANTS: Array<{ name: string; cx: number; cz: number }> = [
      { name: 'NW', cx: -95, cz: -95 },
      { name: 'NE', cx: 95, cz: -95 },
      { name: 'SW', cx: -95, cz: 95 },
      { name: 'SE', cx: 95, cz: 95 },
    ];

    this.floraChunks = QUADRANTS.map((q) => {
      const group = new THREE.Group();
      group.name = `flora_chunk_${q.name}`;
      this.scene.add(group);
      const center = new THREE.Vector3(q.cx, 18, q.cz);
      const radius = 185;
      const boundingSphere = new THREE.Sphere(center, radius);
      const boundingBox = new THREE.Box3(
        new THREE.Vector3(q.cx < 0 ? -240 : -15, -5, q.cz < 0 ? -240 : -15),
        new THREE.Vector3(q.cx < 0 ? 15 : 240, 68, q.cz < 0 ? 15 : 240)
      );
      return {
        name: q.name,
        cx: q.cx,
        cz: q.cz,
        center,
        radius,
        boundingSphere,
        boundingBox,
        group,
        saguaroMeshes: [],
        boulderMeshes: [],
        outcroppingMeshes: [],
      };
    });

    const getQIdx = (x: number, z: number): number => {
      if (x < 0) return z < 0 ? 0 : 2;
      return z < 0 ? 1 : 3;
    };

    this.saguaroMeshes = [];
    this.boulderMeshes = [];
    this.outcroppingMeshes = [];
    this.allBarrelMeshes = [];
    this.allScrubMeshes = [];
    this.allGrassMeshes = [];
    this.allPricklyMeshes = [];
    this.allChollaMeshes = [];
    this.allOcotilloMeshes = [];
    this.allAgaveMeshes = [];
    this.rockColliders = [];

    // ==========================================
    // 1. Saguaro Cacti Generation (Instanced Mesh Merging by Quadrant)
    // ==========================================
    const saguaroCount = 450;
    const saguaroMat = new THREE.MeshStandardMaterial({
      color: 0x2e5a27,
      roughness: 0.85,
      metalness: 0.05,
      bumpScale: 0.05,
    });

    const trunkGeo = createFlutedCylinderGeometry(0.35, 0.45, 6, 24, 16, 0.08, true);
    const armVerticalGeo = createFlutedCylinderGeometry(0.24, 0.28, 2.5, 18, 12, 0.07, true);
    const armHorizontalGeo = createFlutedCylinderGeometry(0.24, 0.24, 1.4, 18, 12, 0.06, false);
    armHorizontalGeo.rotateZ(Math.PI / 2);

    // Build 4 merged geometry archetypes for zero-draw-call saguaro rendering
    const geoTrunkOnly = trunkGeo.clone();

    const armHLeft = armHorizontalGeo.clone();
    armHLeft.translate(-0.9, 0.6, 0);
    const armVLeft = armVerticalGeo.clone();
    armVLeft.translate(-1.5, 1.8, 0);

    const armHRight = armHorizontalGeo.clone();
    armHRight.translate(0.9, 1.2, 0);
    const armVRight = armVerticalGeo.clone();
    armVRight.translate(1.5, 2.3, 0);

    const geoLeftArm = safeMergeGeometries([trunkGeo.clone(), armHLeft.clone(), armVLeft.clone()]);
    const geoRightArm = safeMergeGeometries([trunkGeo.clone(), armHRight.clone(), armVRight.clone()]);
    const geoBothArms = safeMergeGeometries([
      trunkGeo.clone(),
      armHLeft.clone(),
      armVLeft.clone(),
      armHRight.clone(),
      armVRight.clone(),
    ]);

    const archGeos = [geoTrunkOnly, geoLeftArm, geoRightArm, geoBothArms];

    interface SaguaroSpawnItem {
      x: number;
      y: number;
      z: number;
      scale: number;
      rotY: number;
    }
    const saguaroItemsByArchQuad: SaguaroSpawnItem[][][] = [
      [[], [], [], []],
      [[], [], [], []],
      [[], [], [], []],
      [[], [], [], []],
    ];

    for (let i = 0; i < saguaroCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 280;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getTerrainHeight(x, z);

      const slope = Math.hypot(
        getTerrainHeight(x + 1.2, z) - getTerrainHeight(x - 1.2, z),
        getTerrainHeight(x, z + 1.2) - getTerrainHeight(x, z - 1.2)
      ) / 2.4;
      if (y > 45 || slope > 0.75 || isNearPeraltaCamp(x, z, 18)) continue;

      const scale = 0.7 + Math.random() * 0.8;
      const hasLeftArm = Math.random() > 0.3;
      const hasRightArm = Math.random() > 0.4;
      const archType = (hasLeftArm && hasRightArm) ? 3 : hasLeftArm ? 1 : hasRightArm ? 2 : 0;
      const rotY = Math.random() * Math.PI * 2;

      saguaroItemsByArchQuad[getQIdx(x, z)][archType].push({ x, y, z, scale, rotY });
    }

    this.scene.add(this.saguaroGroup);

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      for (let archIdx = 0; archIdx < 4; archIdx++) {
        const items = saguaroItemsByArchQuad[q][archIdx];
        const count = Math.max(1, items.length);
        const meshGeo = archGeos[archIdx].clone();
        meshGeo.boundingSphere = chunk.boundingSphere.clone();
        meshGeo.boundingBox = chunk.boundingBox.clone();
        const mesh = new THREE.InstancedMesh(meshGeo, saguaroMat, count);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;

        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          dummy.position.set(item.x, item.y + 3 * item.scale - 0.2, item.z);
          dummy.scale.set(item.scale, item.scale, item.scale);
          dummy.rotation.set(0, item.rotY, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(j, dummy.matrix);

          if (item.scale >= 0.75) {
            this.rockColliders.push({
              id: `saguaro_${q}_${archIdx}_${j}`,
              x: item.x,
              y: item.y,
              z: item.z,
              radius: 0.45 * item.scale,
              height: 5.5 * item.scale,
              type: 'cactus',
              meshIdx: this.saguaroMeshes.length,
              instanceId: j,
              active: true,
            });
          }
        }

        if (items.length === 0) {
          mesh.setMatrixAt(0, this.zeroMatrix);
        }

        mesh.instanceMatrix.needsUpdate = true;
        chunk.group.add(mesh);
        chunk.saguaroMeshes.push(mesh);
        this.saguaroMeshes.push(mesh);
        this.saguaroGroup.add(mesh);
      }
    }

    // ==========================================
    // 2. Barrel Cacti & Prickly Pears (Instanced by Quadrant)
    // ==========================================
    const barrelCount = 280;
    const barrelGeo = createRealisticBarrelCactusGeometry();
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x3d6632,
      roughness: 0.82,
    });

    interface BarrelSpawnItem {
      rx: number;
      ry: number;
      rz: number;
      bScale: number;
      rotX: number;
      rotY: number;
      rotZ: number;
    }
    const barrelByQuad: BarrelSpawnItem[][] = [[], [], [], []];

    for (let i = 0; i < barrelCount; i++) {
      const rx = (Math.random() - 0.5) * 360;
      const rz = (Math.random() - 0.5) * 360;
      const ry = getTerrainHeight(rx, rz);
      if (ry > 50 || isNearPeraltaCamp(rx, rz, 16)) continue;

      const bScale = 0.5 + Math.random() * 0.7;
      barrelByQuad[getQIdx(rx, rz)].push({
        rx,
        ry: ry + 0.45 * bScale,
        rz,
        bScale,
        rotX: Math.random() * 0.1,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * 0.1,
      });
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      const items = barrelByQuad[q];
      const count = Math.max(1, items.length);
      const bGeo = barrelGeo.clone();
      bGeo.boundingSphere = chunk.boundingSphere.clone();
      bGeo.boundingBox = chunk.boundingBox.clone();
      const mesh = new THREE.InstancedMesh(bGeo, barrelMat, count);
      mesh.castShadow = true;
      mesh.frustumCulled = true;

      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        dummy.position.set(it.rx, it.ry, it.rz);
        dummy.scale.set(it.bScale, it.bScale, it.bScale);
        dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, this.zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group.add(mesh);
      chunk.barrelMesh = mesh;
      this.allBarrelMeshes.push(mesh);
    }
    this.barrelMesh = this.allBarrelMeshes[0];

    // ==========================================
    // 3. Desert Boulders, Talus Scree & Flat Sandstone Slabs (Instanced by Quadrant)
    // ==========================================
    const rockArchetypes = [
      { geo: createAngularRockGeometry(), count: 180, flatShading: true, baseScale: 1.1 },
      { geo: createSlabRockGeometry(), count: 140, flatShading: true, baseScale: 1.2 },
      { geo: createWeatheredCorestoneGeometry(), count: 110, flatShading: false, baseScale: 1.15 },
    ];

    const boulderMaterials = rockArchetypes.map((arch, archIdx) => {
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.94,
        metalness: 0.08,
        side: THREE.DoubleSide,
        flatShading: arch.flatShading,
      });
      applyMountainHoleShaderToMaterial(mat, `boulder_${archIdx}`);
      return mat;
    });

    interface BoulderSpawnItem {
      rx: number;
      ry: number;
      rz: number;
      sinkOffset: number;
      scaleX: number;
      scaleY: number;
      scaleZ: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      bRadius: number;
      bHeight: number;
      color: THREE.Color;
    }
    const boulderByQuadArch: BoulderSpawnItem[][][] = [
      [[], [], []],
      [[], [], []],
      [[], [], []],
      [[], [], []],
    ];

    for (let archIdx = 0; archIdx < rockArchetypes.length; archIdx++) {
      const arch = rockArchetypes[archIdx];
      for (let i = 0; i < arch.count; i++) {
        const rx = (Math.random() - 0.5) * 380;
        const rz = (Math.random() - 0.5) * 380;
        if (isNearPeraltaCamp(rx, rz, 20)) continue;
        const ry = getTerrainHeight(rx, rz);

        const scaleRoll = Math.random();
        let s = 1.0;
        if (scaleRoll < 0.25) {
          s = 0.5 + Math.random() * 0.4;
        } else if (scaleRoll < 0.85) {
          s = 0.9 + Math.random() * 0.9;
        } else {
          s = 1.9 + Math.random() * 0.9;
        }
        s *= arch.baseScale;

        const sinkOffset = archIdx === 1 ? -s * 0.06 : -s * 0.12;
        let scaleX = s * (0.8 + Math.random() * 0.4);
        let scaleY = s * (0.85 + Math.random() * 0.35);
        let scaleZ = s * (0.8 + Math.random() * 0.4);
        let rotX = (Math.random() - 0.5) * 0.3;
        const rotY = Math.random() * Math.PI * 2;
        let rotZ = (Math.random() - 0.5) * 0.3;

        if (archIdx === 1) {
          scaleX = s * (1.0 + Math.random() * 0.5);
          scaleY = s * 0.55;
          scaleZ = s * (1.0 + Math.random() * 0.5);
          rotX = (Math.random() - 0.5) * 0.25;
          rotZ = (Math.random() - 0.5) * 0.25;
        }

        const bRadius = Math.max(scaleX, scaleZ) * 0.95;
        const bHeight = scaleY * 1.6;

        const randColor = DESERT_ROCK_PALETTES[Math.floor(Math.random() * DESERT_ROCK_PALETTES.length)];

        boulderByQuadArch[getQIdx(rx, rz)][archIdx].push({
          rx,
          ry,
          rz,
          sinkOffset,
          scaleX,
          scaleY,
          scaleZ,
          rotX,
          rotY,
          rotZ,
          bRadius,
          bHeight,
          color: randColor,
        });
      }
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      for (let archIdx = 0; archIdx < rockArchetypes.length; archIdx++) {
        const arch = rockArchetypes[archIdx];
        const items = boulderByQuadArch[q][archIdx];
        const count = Math.max(1, items.length);
        const bGeo = arch.geo.clone();
        bGeo.boundingSphere = chunk.boundingSphere.clone();
        bGeo.boundingBox = chunk.boundingBox.clone();
        const mesh = new THREE.InstancedMesh(bGeo, boulderMaterials[archIdx], count);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;

        for (let j = 0; j < items.length; j++) {
          const it = items[j];
          dummy.position.set(it.rx, it.ry + it.sinkOffset, it.rz);
          dummy.scale.set(it.scaleX, it.scaleY, it.scaleZ);
          dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
          dummy.updateMatrix();
          mesh.setMatrixAt(j, dummy.matrix);
          mesh.setColorAt(j, it.color);

          if (it.bRadius >= 0.52) {
            this.rockColliders.push({
              id: `boulder_${q}_${archIdx}_${j}`,
              x: it.rx,
              y: it.ry,
              z: it.rz,
              radius: it.bRadius,
              height: it.bHeight,
              type: 'boulder',
              meshIdx: this.boulderMeshes.length,
              instanceId: j,
              active: true,
            });
          }
        }

        if (items.length === 0) {
          mesh.setMatrixAt(0, this.zeroMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        chunk.group.add(mesh);
        chunk.boulderMeshes.push(mesh);
        this.boulderMeshes.push(mesh);
      }
    }
    this.boulderMesh = this.boulderMeshes[0];

    // ==========================================
    // 4. Authentic Sonoran Creosote Bushes (By Quadrant)
    // ==========================================
    const scrubCount = 350;
    const scrubGeo = createRealisticCreosoteGeometry();
    const scrubMat = new THREE.MeshStandardMaterial({
      color: 0x5a6d3b,
      roughness: 0.82,
    });

    interface ScrubSpawnItem {
      rx: number;
      ry: number;
      rz: number;
      s: number;
      rotY: number;
    }
    const scrubByQuad: ScrubSpawnItem[][] = [[], [], [], []];

    for (let i = 0; i < scrubCount; i++) {
      const rx = (Math.random() - 0.5) * 380;
      const rz = (Math.random() - 0.5) * 380;
      if (isNearPeraltaCamp(rx, rz, 14)) continue;
      const ry = getTerrainHeight(rx, rz);

      const s = 0.65 + Math.random() * 0.75;
      scrubByQuad[getQIdx(rx, rz)].push({
        rx,
        ry,
        rz,
        s,
        rotY: Math.random() * Math.PI * 2,
      });
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      const items = scrubByQuad[q];
      const count = Math.max(1, items.length);
      const sGeo = scrubGeo.clone();
      sGeo.boundingSphere = chunk.boundingSphere.clone();
      sGeo.boundingBox = chunk.boundingBox.clone();
      const mesh = new THREE.InstancedMesh(sGeo, scrubMat, count);
      mesh.castShadow = true;
      mesh.frustumCulled = true;

      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        dummy.position.set(it.rx, it.ry, it.rz);
        dummy.scale.set(it.s, it.s, it.s);
        dummy.rotation.set(0, it.rotY, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, this.zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group.add(mesh);
      chunk.scrubMesh = mesh;
      this.allScrubMeshes.push(mesh);
    }
    this.scrubMesh = this.allScrubMeshes[0];

    // ==========================================
    // 5. Realistic Desert Bunchgrass & Purple Three-Awn (By Quadrant)
    // ==========================================
    const grassCount = 650;
    const grassBladeGeo = createRealisticBunchgrassGeometry();
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xb59a58,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    interface GrassSpawnItem {
      gx: number;
      gy: number;
      gz: number;
      scale: number;
      rotX: number;
      rotY: number;
      rotZ: number;
    }
    const grassByQuad: GrassSpawnItem[][] = [[], [], [], []];

    for (let i = 0; i < grassCount; i++) {
      const gx = (Math.random() - 0.5) * 360;
      const gz = (Math.random() - 0.5) * 360;
      const gy = getTerrainHeight(gx, gz);
      if (gy > 42) continue;

      const scale = 0.7 + Math.random() * 0.6;
      grassByQuad[getQIdx(gx, gz)].push({
        gx,
        gy,
        gz,
        scale,
        rotX: (Math.random() - 0.5) * 0.1,
        rotY: Math.random() * Math.PI * 2,
        rotZ: (Math.random() - 0.5) * 0.1,
      });
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      const items = grassByQuad[q];
      const count = Math.max(1, items.length);
      const gGeo = grassBladeGeo.clone();
      gGeo.boundingSphere = chunk.boundingSphere.clone();
      gGeo.boundingBox = chunk.boundingBox.clone();
      const mesh = new THREE.InstancedMesh(gGeo, grassMat, count);
      mesh.castShadow = true;
      mesh.frustumCulled = true;

      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        dummy.position.set(it.gx, it.gy, it.gz);
        dummy.scale.set(it.scale, it.scale, it.scale);
        dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, this.zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group.add(mesh);
      chunk.grassMesh = mesh;
      this.allGrassMeshes.push(mesh);
    }
    this.grassMesh = this.allGrassMeshes[0];

    // ==========================================
    // 6. Authentic Engelmann's Prickly Pear Clusters (By Quadrant)
    // ==========================================
    const pricklyPearCount = 180;
    const padGeo = createRealisticPricklyPearGeometry();
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3d6635,
      roughness: 0.8,
    });

    interface PricklySpawnItem {
      px: number;
      py: number;
      pz: number;
      scale: number;
      rotX: number;
      rotY: number;
      rotZ: number;
    }
    const pricklyByQuad: PricklySpawnItem[][] = [[], [], [], []];

    for (let i = 0; i < pricklyPearCount; i++) {
      const px = (Math.random() - 0.5) * 340;
      const pz = (Math.random() - 0.5) * 340;
      const py = getTerrainHeight(px, pz);
      if (py > 38 || isNearPeraltaCamp(px, pz, 14)) continue;

      const scale = 0.75 + Math.random() * 0.5;
      pricklyByQuad[getQIdx(px, pz)].push({
        px,
        py,
        pz,
        scale,
        rotX: (Math.random() - 0.5) * 0.1,
        rotY: Math.random() * Math.PI * 2,
        rotZ: (Math.random() - 0.5) * 0.1,
      });
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      const items = pricklyByQuad[q];
      const count = Math.max(1, items.length);
      const pGeo = padGeo.clone();
      pGeo.boundingSphere = chunk.boundingSphere.clone();
      pGeo.boundingBox = chunk.boundingBox.clone();
      const mesh = new THREE.InstancedMesh(pGeo, padMat, count);
      mesh.castShadow = true;
      mesh.frustumCulled = true;

      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        dummy.position.set(it.px, it.py, it.pz);
        dummy.scale.set(it.scale, it.scale, it.scale);
        dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, this.zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group.add(mesh);
      chunk.pricklyMesh = mesh;
      this.allPricklyMeshes.push(mesh);
    }
    this.pricklyMesh = this.allPricklyMeshes[0];

    // ==========================================
    // 7. Jumping Cholla Cacti (By Quadrant)
    // ==========================================
    const chollaCount = 130;
    const chollaGeo = createRealisticChollaGeometry();
    const chollaMat = new THREE.MeshStandardMaterial({
      color: 0xa6b872,
      roughness: 0.85,
    });

    interface ChollaSpawnItem {
      cx: number;
      cy: number;
      cz: number;
      scale: number;
      rotX: number;
      rotY: number;
      rotZ: number;
    }
    const chollaByQuad: ChollaSpawnItem[][] = [[], [], [], []];

    for (let i = 0; i < chollaCount; i++) {
      const cx = (Math.random() - 0.5) * 320;
      const cz = (Math.random() - 0.5) * 320;
      const cy = getTerrainHeight(cx, cz);
      if (cy > 36 || isNearPeraltaCamp(cx, cz, 14)) continue;

      const scale = 0.75 + Math.random() * 0.45;
      chollaByQuad[getQIdx(cx, cz)].push({
        cx,
        cy,
        cz,
        scale,
        rotX: (Math.random() - 0.5) * 0.1,
        rotY: Math.random() * Math.PI * 2,
        rotZ: (Math.random() - 0.5) * 0.1,
      });
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      const items = chollaByQuad[q];
      const count = Math.max(1, items.length);
      const cGeo = chollaGeo.clone();
      cGeo.boundingSphere = chunk.boundingSphere.clone();
      cGeo.boundingBox = chunk.boundingBox.clone();
      const mesh = new THREE.InstancedMesh(cGeo, chollaMat, count);
      mesh.castShadow = true;
      mesh.frustumCulled = true;

      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        dummy.position.set(it.cx, it.cy, it.cz);
        dummy.scale.set(it.scale, it.scale, it.scale);
        dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, this.zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group.add(mesh);
      chunk.chollaMesh = mesh;
      this.allChollaMeshes.push(mesh);
    }
    this.chollaMesh = this.allChollaMeshes[0];

    // ==========================================
    // 8. Authentic Sonoran Desert Ocotillo (By Quadrant)
    // ==========================================
    const ocotilloCount = 140;
    const ocotilloGeo = createRealisticOcotilloGeometry();
    const ocotilloMat = new THREE.MeshStandardMaterial({
      color: 0x544030,
      roughness: 0.88,
    });

    interface OcotilloSpawnItem {
      ox: number;
      oy: number;
      oz: number;
      scale: number;
      rotY: number;
    }
    const ocotilloByQuad: OcotilloSpawnItem[][] = [[], [], [], []];

    for (let i = 0; i < ocotilloCount; i++) {
      const ox = (Math.random() - 0.5) * 360;
      const oz = (Math.random() - 0.5) * 360;
      const oy = getTerrainHeight(ox, oz);
      if (oy > 45 || isNearPeraltaCamp(ox, oz, 16)) continue;

      const scale = 0.8 + Math.random() * 0.5;
      ocotilloByQuad[getQIdx(ox, oz)].push({
        ox,
        oy,
        oz,
        scale,
        rotY: Math.random() * Math.PI * 2,
      });
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      const items = ocotilloByQuad[q];
      const count = Math.max(1, items.length);
      const oGeo = ocotilloGeo.clone();
      oGeo.boundingSphere = chunk.boundingSphere.clone();
      oGeo.boundingBox = chunk.boundingBox.clone();
      const mesh = new THREE.InstancedMesh(oGeo, ocotilloMat, count);
      mesh.castShadow = true;
      mesh.frustumCulled = true;

      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        dummy.position.set(it.ox, it.oy, it.oz);
        dummy.scale.set(it.scale, it.scale, it.scale);
        dummy.rotation.set(0, it.rotY, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, this.zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group.add(mesh);
      chunk.ocotilloMesh = mesh;
      this.allOcotilloMeshes.push(mesh);
    }
    this.ocotilloMesh = this.allOcotilloMeshes[0];

    // ==========================================
    // 9. Desert Century Agave (By Quadrant)
    // ==========================================
    const agaveCount = 150;
    const agaveGeo = createRealisticAgaveGeometry();
    const agaveMat = new THREE.MeshStandardMaterial({
      color: 0x486b5d,
      roughness: 0.78,
    });

    interface AgaveSpawnItem {
      ax: number;
      ay: number;
      az: number;
      scale: number;
      rotX: number;
      rotY: number;
      rotZ: number;
    }
    const agaveByQuad: AgaveSpawnItem[][] = [[], [], [], []];

    for (let i = 0; i < agaveCount; i++) {
      const ax = (Math.random() - 0.5) * 350;
      const az = (Math.random() - 0.5) * 350;
      const ay = getTerrainHeight(ax, az);
      if (ay > 48 || isNearPeraltaCamp(ax, az, 14)) continue;

      const scale = 0.75 + Math.random() * 0.5;
      agaveByQuad[getQIdx(ax, az)].push({
        ax,
        ay,
        az,
        scale,
        rotX: (Math.random() - 0.5) * 0.1,
        rotY: Math.random() * Math.PI * 2,
        rotZ: (Math.random() - 0.5) * 0.1,
      });
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      const items = agaveByQuad[q];
      const count = Math.max(1, items.length);
      const aGeo = agaveGeo.clone();
      aGeo.boundingSphere = chunk.boundingSphere.clone();
      aGeo.boundingBox = chunk.boundingBox.clone();
      const mesh = new THREE.InstancedMesh(aGeo, agaveMat, count);
      mesh.castShadow = true;
      mesh.frustumCulled = true;

      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        dummy.position.set(it.ax, it.ay, it.az);
        dummy.scale.set(it.scale, it.scale, it.scale);
        dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(j, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, this.zeroMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      chunk.group.add(mesh);
      chunk.agaveMesh = mesh;
      this.allAgaveMeshes.push(mesh);
    }
    this.agaveMesh = this.allAgaveMeshes[0];

    // ==========================================
    // 10. Monumental Southwestern Outcroppings & Canyon Formations (4 Archetypes by Quadrant)
    // ==========================================
    const outcroppingArchetypes = [
      {
        name: 'volcanic_crag',
        geo: createVolcanicCragGeometry(),
        count: 16,
        baseHeight: 18.0,
        heightOffsetFrac: 0.08,
      },
      {
        name: 'stepped_mesa',
        geo: createSteppedMesaGeometry(),
        count: 16,
        baseHeight: 14.0,
        heightOffsetFrac: 0.08,
      },
      {
        name: 'fault_monocline',
        geo: createFaultMonoclineGeometry(),
        count: 14,
        baseHeight: 15.0,
        heightOffsetFrac: 0.08,
      },
      {
        name: 'canyon_spire',
        geo: createNeedleSpireGeometry(),
        count: 12,
        baseHeight: 21.0,
        heightOffsetFrac: 0.08,
      },
    ];

    const outcropMaterials = outcroppingArchetypes.map((arch) => {
      const mat = new THREE.MeshStandardMaterial({
        name: `rock_outcrop_${arch.name}`,
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.06,
        side: THREE.DoubleSide,
        flatShading: false,
      });
      applyMountainHoleShaderToMaterial(mat, `outcrop_${arch.name}`);
      return mat;
    });

    interface OutcropSpawnItem {
      ox: number;
      oy: number;
      oz: number;
      sx: number;
      sy: number;
      sz: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      oRadius: number;
      oHeight: number;
      archIdx: number;
    }
    const outcropByQuadArch: OutcropSpawnItem[][][] = [
      [[], [], [], []],
      [[], [], [], []],
      [[], [], [], []],
      [[], [], [], []],
    ];

    const totalOutcrops = 58;
    const globalAngles = Array.from({ length: totalOutcrops }, (_, i) => (i / totalOutcrops) * Math.PI * 2);
    let globalAngleIdx = 0;

    const baseRadiusMap: Record<string, number> = {
      volcanic_crag: 4.8,
      stepped_mesa: 6.2,
      fault_monocline: 4.2,
      canyon_spire: 3.8,
    };

    for (let archIdx = 0; archIdx < outcroppingArchetypes.length; archIdx++) {
      const arch = outcroppingArchetypes[archIdx];
      for (let i = 0; i < arch.count; i++) {
        const baseAngle = globalAngles[globalAngleIdx % totalOutcrops];
        globalAngleIdx++;
        const angle = baseAngle + (Math.random() - 0.5) * 0.28;
        const r = 45 + Math.random() * 155;
        const ox = Math.cos(angle) * r;
        const oz = Math.sin(angle) * r;
        if (isNearPeraltaCamp(ox, oz, 30)) continue;
        const oy = getTerrainHeight(ox, oz);

        const baseScale = 0.85 + Math.random() * 1.35;
        let sx = baseScale;
        let sy = baseScale;
        let sz = baseScale;

        if (arch.name === 'stepped_mesa') {
          sx *= 1.3 + Math.random() * 0.5;
          sy *= 0.8 + Math.random() * 0.4;
          sz *= 1.3 + Math.random() * 0.5;
        } else if (arch.name === 'canyon_spire') {
          sx *= 0.75 + Math.random() * 0.3;
          sy *= 1.25 + Math.random() * 0.5;
          sz *= 0.75 + Math.random() * 0.3;
        } else if (arch.name === 'volcanic_crag') {
          sx *= 1.2 + Math.random() * 0.5;
          sy *= 0.95 + Math.random() * 0.4;
          sz *= 0.9 + Math.random() * 0.35;
        } else {
          sx *= 1.1 + Math.random() * 0.4;
          sy *= 1.0 + Math.random() * 0.35;
          sz *= 1.4 + Math.random() * 0.5;
        }

        const rotX = (Math.random() - 0.5) * 0.12;
        const rotY = Math.random() * Math.PI * 2;
        const rotZ = (Math.random() - 0.5) * 0.12;

        const baseRad = baseRadiusMap[arch.name] || 4.5;
        const oRadius = baseRad * ((sx + sz) * 0.5);
        const oHeight = arch.baseHeight * sy;

        outcropByQuadArch[getQIdx(ox, oz)][archIdx].push({
          ox,
          oy: oy + (arch.baseHeight * arch.heightOffsetFrac) * sy,
          oz,
          sx,
          sy,
          sz,
          rotX,
          rotY,
          rotZ,
          oRadius,
          oHeight,
          archIdx,
        });
      }
    }

    for (let q = 0; q < 4; q++) {
      const chunk = this.floraChunks[q];
      for (let archIdx = 0; archIdx < outcroppingArchetypes.length; archIdx++) {
        const arch = outcroppingArchetypes[archIdx];
        const items = outcropByQuadArch[q][archIdx];
        const count = Math.max(1, items.length);
        const ocGeo = arch.geo.clone();
        ocGeo.boundingSphere = chunk.boundingSphere.clone();
        ocGeo.boundingBox = chunk.boundingBox.clone();
        const mesh = new THREE.InstancedMesh(ocGeo, outcropMaterials[archIdx], count);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;

        for (let j = 0; j < items.length; j++) {
          const it = items[j];
          dummy.position.set(it.ox, it.oy, it.oz);
          dummy.scale.set(it.sx, it.sy, it.sz);
          dummy.rotation.set(it.rotX, it.rotY, it.rotZ);
          dummy.updateMatrix();
          mesh.setMatrixAt(j, dummy.matrix);

          this.rockColliders.push({
            id: `outcrop_${q}_${archIdx}_${j}`,
            x: it.ox,
            y: it.oy - (arch.baseHeight * arch.heightOffsetFrac) * it.sy,
            z: it.oz,
            radius: it.oRadius,
            height: it.oHeight,
            type: 'mountain',
            meshIdx: this.outcroppingMeshes.length,
            instanceId: j,
            active: true,
          });
        }

        if (items.length === 0) {
          mesh.setMatrixAt(0, this.zeroMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        chunk.group.add(mesh);
        chunk.outcroppingMeshes.push(mesh);
        this.outcroppingMeshes.push(mesh);
      }
    }

    // Keep primary outcroppingMesh pointing to first mesh for legacy access
    this.outcroppingMesh = this.outcroppingMeshes[0];

    // ==========================================
    // 5. Rare High-Grade Gold Quartz Outcroppings for Prospecting
    // ==========================================
    const goldLocations = [
      { x: -50, z: -40, ounces: 2.5, name: 'Peralta Arroyo Placer Specimen' },
      { x: 10, z: -20, ounces: 4.0, name: 'Needle Pass Quartz Pocket' },
      { x: 110, z: 20, ounces: 6.0, name: 'East Gully Vein Outcrop' },
      { x: 145, z: 95, ounces: 9.0, name: 'Mine Approach Bonanza Lode' },
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
      { id: 'salt_river', name: 'Salt River Fremont Cottonwoods', x: 0, z: -305, treeCount: 14, poolRadius: 14.0 },
      { id: 'needle', name: "Weaver's Needle Basin Tinaja", x: 68, z: 32, treeCount: 6, poolRadius: 4.5 },
      { id: 'peralta', name: 'Peralta Canyon Tinaja', x: -35, z: 75, treeCount: 6, poolRadius: 4.0 },
      { id: 'pistol_canyon', name: 'Pistol Canyon Bedrock Tinaja', x: -46, z: -130, treeCount: 6, poolRadius: 4.5 },
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

    const trunkGeoCottonwood = createRealisticTreeTrunkGeometry(true);
    const trunkGeoMesquite = createRealisticTreeTrunkGeometry(false);
    const crownGeoCottonwood = createRealisticTreeCanopyGeometry(true);
    const crownGeoMesquite = createRealisticTreeCanopyGeometry(false);
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
        const trunkGeo = isCottonwood ? trunkGeoCottonwood : trunkGeoMesquite;
        const crownGeo = isCottonwood ? crownGeoCottonwood : crownGeoMesquite;

        const treeGroup = new THREE.Group();
        treeGroup.position.set(tx, ty, tz);
        treeGroup.rotation.y = (i * 1.618) % (Math.PI * 2);

        const scale = 0.85 + ((i * 17) % 35) * 0.01;
        treeGroup.scale.set(scale, scale, scale);

        // Trunk
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.y = 0;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);

        // Foliage Crown
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.y = isCottonwood ? 3.8 : 3.0;
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
    if (this.scrubMesh) {
      this.scrubMesh.castShadow = !isPerf;
    }
    if (this.pricklyMesh) {
      this.pricklyMesh.castShadow = !isPerf;
    }
    if (this.chollaMesh) {
      this.chollaMesh.castShadow = !isPerf;
    }
    if (this.ocotilloMesh) {
      this.ocotilloMesh.castShadow = !isPerf;
    }
    if (this.agaveMesh) {
      this.agaveMesh.castShadow = !isPerf;
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

          // Rare gold fleck from mineralized boulder contact (5% chance)
          const goldRoll = Math.random() < 0.05 ? 1 : 0;
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

    // 4. Check Saguaro Cacti (Merged InstancedMesh Batches)
    if (this.saguaroMeshes && this.saguaroMeshes.length > 0) {
      const sagHits = raycaster.intersectObjects(this.saguaroMeshes, false);
      if (sagHits.length > 0 && sagHits[0].distance <= maxDist && sagHits[0].instanceId !== undefined) {
        const hitMesh = sagHits[0].object as THREE.InstancedMesh;
        const id = sagHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        hitMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          hitMesh.setMatrixAt(id, this.zeroMatrix);
          hitMesh.instanceMatrix.needsUpdate = true;
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

    // Saguaros (InstancedMesh Batches)
    if (this.saguaroMeshes) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (const sMesh of this.saguaroMeshes) {
        for (let i = 0; i < sMesh.count; i++) {
          sMesh.getMatrixAt(i, matrix);
          scale.setFromMatrixScale(matrix);
          if (scale.x > 0.05) {
            pos.setFromMatrixPosition(matrix);
            if (pos.distanceTo(center) <= radius) {
              sMesh.setMatrixAt(i, this.zeroMatrix);
              sMesh.instanceMatrix.needsUpdate = true;
              hydrationBlasted += 15;
              destroyedPoints.push({ pos: pos.clone(), type: 'cactus' });
            }
          }
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

  public setVisible(visible: boolean) {
    if (this.saguaroGroup) this.saguaroGroup.visible = visible;
    if (this.barrelMesh) this.barrelMesh.visible = visible;
    for (const b of this.boulderMeshes) b.visible = visible;
    if (this.scrubMesh) this.scrubMesh.visible = visible;
    if (this.grassMesh) this.grassMesh.visible = visible;
    if (this.pricklyMesh) this.pricklyMesh.visible = visible;
    if (this.chollaMesh) this.chollaMesh.visible = visible;
    if (this.ocotilloMesh) this.ocotilloMesh.visible = visible;
    if (this.agaveMesh) this.agaveMesh.visible = visible;
    for (const o of this.outcroppingMeshes) o.visible = visible;
    for (const t of this.springTrees) {
      if (t.group) t.group.visible = visible;
    }
  }

  public dispose() {
    if (this.saguaroGroup) {
      this.scene.remove(this.saguaroGroup);
    }
    if (this.saguaroMeshes) {
      this.saguaroMeshes.forEach((m) => {
        m.geometry.dispose();
      });
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
    if (this.ocotilloMesh) {
      this.scene.remove(this.ocotilloMesh);
      this.ocotilloMesh.geometry.dispose();
    }
    if (this.agaveMesh) {
      this.scene.remove(this.agaveMesh);
      this.agaveMesh.geometry.dispose();
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
