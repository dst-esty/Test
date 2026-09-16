import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { DebrisType } from '../types';

export interface GoldDeposit {
  id: string;
  position: THREE.Vector3;
  mined: boolean;
  ounces: number;
  mesh: THREE.Group;
}

export interface StrikeFoliageResult {
  hit: boolean;
  type?: 'boulder' | 'outcropping' | 'gold_deposit' | 'saguaro' | 'barrel' | 'prickly' | 'cholla' | 'scrub';
  hitPoint?: THREE.Vector3;
  debrisType?: DebrisType;
  goldAwarded?: number;
  blocksDug?: number;
  woodAwarded?: number;
  hydrationAwarded?: number;
  message?: string;
  depositId?: string;
}

export interface ExplodeFoliageResult {
  goldBlasted: number;
  rocksBlasted: number;
  woodBlasted: number;
  hydrationBlasted: number;
  destroyedPoints: Array<{ pos: THREE.Vector3; type: DebrisType }>;
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

export class DesertFoliageManager {
  public goldDeposits: GoldDeposit[] = [];
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

  private scene: THREE.Scene;
  private readonly zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
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

      // Skip steep high summits or right on top of trailhead
      if (y > 45 || Math.hypot(x - (-120), z - (-120)) < 15) continue;

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
        armH.castShadow = true;
        singleCactus.add(armH);

        const armV = new THREE.Mesh(armVerticalGeo, saguaroMat);
        armV.position.set(-1.5, 1.8, 0);
        armV.castShadow = true;
        singleCactus.add(armV);
      }

      if (hasRightArm) {
        const armH = new THREE.Mesh(armHorizontalGeo, saguaroMat);
        armH.position.set(0.9, 1.2, 0);
        armH.castShadow = true;
        singleCactus.add(armH);

        const armV = new THREE.Mesh(armVerticalGeo, saguaroMat);
        armV.position.set(1.5, 2.3, 0);
        armV.castShadow = true;
        singleCactus.add(armV);
      }

      singleCactus.rotation.y = Math.random() * Math.PI * 2;
      this.saguaroGroup.add(singleCactus);
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

    let bIdx = 0;
    for (let i = 0; i < barrelCount; i++) {
      const rx = (Math.random() - 0.5) * 360;
      const rz = (Math.random() - 0.5) * 360;
      const ry = getTerrainHeight(rx, rz);
      if (ry > 50) continue;

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
        flatShading: arch.flatShading,
      });

      const mesh = new THREE.InstancedMesh(arch.geo, mat, arch.count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      let rCount = 0;
      for (let i = 0; i < arch.count; i++) {
        const rx = (Math.random() - 0.5) * 380;
        const rz = (Math.random() - 0.5) * 380;
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
    let sIdx = 0;
    for (let i = 0; i < scrubCount; i++) {
      const rx = (Math.random() - 0.5) * 380;
      const rz = (Math.random() - 0.5) * 380;
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
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.06,
        flatShading: false,
      });

      const mesh = new THREE.InstancedMesh(arch.geo, mat, arch.count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      let ocCount = 0;
      for (let i = 0; i < arch.count; i++) {
        const baseAngle = globalAngles[globalAngleIdx % totalOutcrops];
        globalAngleIdx++;
        const angle = baseAngle + (Math.random() - 0.5) * 0.28;
        const r = 45 + Math.random() * 155;
        const ox = Math.cos(angle) * r;
        const oz = Math.sin(angle) * r;
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
        mesh.setMatrixAt(ocCount++, dummy.matrix);
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
  }

  /**
   * Strike foliage, boulders, cacti, or quartz deposits with pickaxe, shovel, or rifle
   */
  public strikeFoliageOrRock(raycaster: THREE.Raycaster, maxDist: number = 6.5): StrikeFoliageResult {
    // 1. Check Gold Quartz Deposits
    const unminedDeposits = this.goldDeposits.filter((d) => !d.mined && d.mesh.visible);
    for (const gd of unminedDeposits) {
      const hits = raycaster.intersectObject(gd.mesh, true);
      if (hits.length > 0 && hits[0].distance <= maxDist) {
        gd.mined = true;
        gd.mesh.scale.set(0, 0, 0);
        gd.mesh.visible = false;
        return {
          hit: true,
          type: 'gold_deposit',
          hitPoint: hits[0].point.clone(),
          debrisType: 'quartz_gold',
          goldAwarded: gd.ounces,
          depositId: gd.id,
          message: `🌟 Shattered Gold Quartz Vein! (+${gd.ounces} oz High-Grade Gold)`,
        };
      }
    }

    // 2. Check Desert Boulders & Rock Formations
    for (const bMesh of this.boulderMeshes) {
      const boulderHits = raycaster.intersectObject(bMesh, false);
      if (boulderHits.length > 0 && boulderHits[0].distance <= maxDist && boulderHits[0].instanceId !== undefined) {
        const id = boulderHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        bMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          bMesh.setMatrixAt(id, this.zeroMatrix);
          bMesh.instanceMatrix.needsUpdate = true;

          const goldRoll = Math.random() < 0.35 ? 1 : 0;
          return {
            hit: true,
            type: 'boulder',
            hitPoint: boulderHits[0].point.clone(),
            debrisType: 'granite',
            blocksDug: 2,
            goldAwarded: goldRoll,
            message:
              goldRoll > 0
                ? '💥 Shattered Desert Stone! (+2 Quarry Rocks, +1 oz Placer Gold)'
                : '💥 Shattered Desert Stone! (+2 Quarry Rocks for Building)',
          };
        }
      }
    }

    // 3. Check Monumental Outcroppings & Canyon Crags
    for (const ocMesh of this.outcroppingMeshes) {
      const ocHits = raycaster.intersectObject(ocMesh, false);
      if (ocHits.length > 0 && ocHits[0].distance <= maxDist && ocHits[0].instanceId !== undefined) {
        const id = ocHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        ocMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          ocMesh.setMatrixAt(id, this.zeroMatrix);
          ocMesh.instanceMatrix.needsUpdate = true;
          return {
            hit: true,
            type: 'outcropping',
            hitPoint: ocHits[0].point.clone(),
            debrisType: 'sandstone',
            blocksDug: 3,
            goldAwarded: Math.random() < 0.35 ? 1 : 0,
            message: '⛏️ Excavated Rock Outcropping! (+3 Building Stones)',
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
   * Blast destruction of foliage, cacti, boulders and quartz veins from dynamite detonations
   */
  public explodeFoliageAt(center: THREE.Vector3, radius: number = 4.8): ExplodeFoliageResult {
    let goldBlasted = 0;
    let rocksBlasted = 0;
    let woodBlasted = 0;
    let hydrationBlasted = 0;
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
            ocMesh.setMatrixAt(i, this.zeroMatrix);
            ocMesh.instanceMatrix.needsUpdate = true;
            rocksBlasted += 3;
            destroyedPoints.push({ pos: pos.clone(), type: 'sandstone' });
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

    return { goldBlasted, rocksBlasted, woodBlasted, hydrationBlasted, destroyedPoints };
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
