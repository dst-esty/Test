import * as THREE from 'three';
import {
  getTerrainHeight,
  getBaseTerrainHeight,
  isHighPointOrPeak,
  DugHole,
  activeDugHoles,
  createRealisticTerrainMaterial,
  generateTerrainNoiseTexture,
  setTerrainHoleListener,
} from './terrain';
import {
  WorldRockCollider,
  DesertFoliageManager,
  createFlutedCylinderGeometry,
  createRealisticBarrelCactusGeometry,
  createRealisticCreosoteGeometry,
  createRealisticBunchgrassGeometry,
  createRealisticPricklyPearGeometry,
  createRealisticChollaGeometry,
  createRealisticOcotilloGeometry,
  createRealisticAgaveGeometry,
} from './foliage';

export const CHUNK_SIZE = 140;
export const CHUNK_SEGMENTS = 28; // Uniform 29 x 29 vertices per chunk (841 vertices) ensures 100% watertight seamless edges with ZERO mesh tearing
export const CHUNK_RADIUS = 4;   // 9x9 grid = 81 chunks = 1260m wide field, blankets expansive mountain horizons

// Deterministic pseudo-random number generator for chunk scatter
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

export type ChunkLOD = 0 | 1 | 2;

export function getSegmentsForLOD(_lod?: ChunkLOD): number {
  // Always use uniform segment density across all chunks.
  // When all adjacent chunks share identical vertex spacing along shared borders,
  // boundary vertices align mathematically to 0.0000mm, completely eliminating
  // T-junction gaps, holes, cracks, and terrain seam tearing.
  return CHUNK_SEGMENTS;
}

export function calculateChunkLOD(_cx: number, _cz: number, _centerCx: number, _centerCz: number): ChunkLOD {
  return 0;
}

export interface TerrainChunk {
  cx: number;
  cz: number;
  key: string;
  lod: ChunkLOD;
  mesh: THREE.Mesh;
  scatterGroup?: THREE.Group;
  colliders?: WorldRockCollider[];
  lastUsedTime: number;
}

export class EndlessTerrainManager {
  private scene: THREE.Scene;
  private foliageManager?: DesertFoliageManager;
  private activeChunks: Map<string, TerrainChunk> = new Map();
  private sharedMaterial: THREE.MeshStandardMaterial;
  private sharedNoiseTexture: THREE.DataTexture;
  private currentCenterCx: number = 999999;
  private currentCenterCz: number = 999999;
  private pendingChunkKeys: Array<{ cx: number; cz: number; distSq: number }> = [];
  private pendingLodUpdates: Array<{ key: string; targetLod: ChunkLOD }> = [];
  private lastScatterLodTime: number = 0;
  private lastUpdateTime: number = 0;

  // Shared geometries and materials for endless wilderness scatter
  private saguaroMat: THREE.MeshStandardMaterial;
  private trunkGeo: THREE.BufferGeometry;
  private armVerticalGeo: THREE.BufferGeometry;
  private armHorizontalGeo: THREE.BufferGeometry;
  private boulderGeo: THREE.DodecahedronGeometry;
  private boulderMat: THREE.MeshStandardMaterial;
  private scrubGeo: THREE.BufferGeometry;
  private scrubMat: THREE.MeshStandardMaterial;
  private barrelGeo: THREE.BufferGeometry;
  private barrelMat: THREE.MeshStandardMaterial;
  private pricklyGeo: THREE.BufferGeometry;
  private pricklyMat: THREE.MeshStandardMaterial;
  private chollaGeo: THREE.BufferGeometry;
  private chollaMat: THREE.MeshStandardMaterial;
  private ocotilloGeo: THREE.BufferGeometry;
  private ocotilloMat: THREE.MeshStandardMaterial;
  private agaveGeo: THREE.BufferGeometry;
  private agaveMat: THREE.MeshStandardMaterial;
  private goldOutcropMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, foliageManager?: DesertFoliageManager) {
    this.scene = scene;
    this.foliageManager = foliageManager;

    this.sharedNoiseTexture = generateTerrainNoiseTexture(256);
    this.sharedMaterial = createRealisticTerrainMaterial(this.sharedNoiseTexture);

    // Initialize reusable scatter geometries and materials
    this.saguaroMat = new THREE.MeshStandardMaterial({
      color: 0x2e5a27,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.trunkGeo = createFlutedCylinderGeometry(0.35, 0.45, 6, 20, 14, 0.08, true);
    this.armVerticalGeo = createFlutedCylinderGeometry(0.24, 0.28, 2.5, 16, 10, 0.07, true);
    this.armHorizontalGeo = createFlutedCylinderGeometry(0.24, 0.24, 1.4, 16, 10, 0.06, false);
    this.armHorizontalGeo.rotateZ(Math.PI / 2);

    // Sculpted desert boulder geometry with natural cleavage facets and flat subterranean base
    const bGeo = new THREE.DodecahedronGeometry(1.5, 1);
    const bPos = bGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bPos.count; i++) {
      let x = bPos.getX(i);
      let y = bPos.getY(i);
      let z = bPos.getZ(i);

      // Deep subterranean anchor profile so underside is never exposed on slopes
      if (y < 0) {
        y = -0.55 + (y + 0.55) * 0.45;
      }
      // Directional cleavage fracture facets
      x += Math.sin(y * 2.8 + z * 1.8) * 0.22;
      z += Math.cos(x * 2.4 + y * 1.6) * 0.20;
      y += Math.sin(x * 3.0) * 0.12;

      bPos.setXYZ(i, x, y, z);
    }
    bGeo.computeVertexNormals();
    this.boulderGeo = bGeo;

    this.boulderMat = new THREE.MeshStandardMaterial({
      color: 0x7c4b31,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });

    this.scrubGeo = createRealisticCreosoteGeometry();
    this.scrubMat = new THREE.MeshStandardMaterial({
      color: 0x5a6d3b,
      roughness: 0.82,
    });

    this.barrelGeo = createRealisticBarrelCactusGeometry();
    this.barrelMat = new THREE.MeshStandardMaterial({
      color: 0x3d6632,
      roughness: 0.82,
    });

    this.pricklyGeo = createRealisticPricklyPearGeometry();
    this.pricklyMat = new THREE.MeshStandardMaterial({
      color: 0x3d6635,
      roughness: 0.8,
    });

    this.chollaGeo = createRealisticChollaGeometry();
    this.chollaMat = new THREE.MeshStandardMaterial({
      color: 0xa6b872,
      roughness: 0.85,
    });

    this.ocotilloGeo = createRealisticOcotilloGeometry();
    this.ocotilloMat = new THREE.MeshStandardMaterial({
      color: 0x544030,
      roughness: 0.88,
    });

    this.agaveGeo = createRealisticAgaveGeometry();
    this.agaveMat = new THREE.MeshStandardMaterial({
      color: 0x486b5d,
      roughness: 0.78,
    });

    this.goldOutcropMat = new THREE.MeshStandardMaterial({
      color: 0xffdf78,
      emissive: 0x664411,
      roughness: 0.35,
      metalness: 0.85,
    });

    // Wire hole deformation listener from terrain.ts
    setTerrainHoleListener((hole: DugHole) => {
      this.updateChunksForHole(hole);
    });
  }

  /**
   * Updates chunk streaming based on the player's world position.
   */
  public update(playerPos: THREE.Vector3, delta: number = 0.016): void {
    const now = performance.now();
    const cx = Math.floor((playerPos.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
    const cz = Math.floor((playerPos.z + CHUNK_SIZE / 2) / CHUNK_SIZE);

    // If player moved into a new chunk or on initial boot
    if (cx !== this.currentCenterCx || cz !== this.currentCenterCz) {
      this.currentCenterCx = cx;
      this.currentCenterCz = cz;
      this.recomputeNeededChunks(cx, cz);
      this.recomputeChunkLODs(cx, cz);
    }

    // Process queued chunk creations (1 per frame to guarantee 60 FPS without frame micro-stutter)
    let chunksCreated = 0;
    while (this.pendingChunkKeys.length > 0 && chunksCreated < 1) {
      const target = this.pendingChunkKeys.shift()!;
      const key = `${target.cx},${target.cz}`;
      if (!this.activeChunks.has(key)) {
        this.createChunk(target.cx, target.cz);
        chunksCreated++;
      }
    }

    // Process queued LOD upgrades/downgrades (1 per frame when no new chunk is created)
    if (chunksCreated === 0 && this.pendingLodUpdates.length > 0) {
      const update = this.pendingLodUpdates.shift()!;
      const chunk = this.activeChunks.get(update.key);
      if (chunk && chunk.lod !== update.targetLod) {
        const oldGeo = chunk.mesh.geometry;
        const newGeo = this.buildChunkGeometry(chunk.cx, chunk.cz, update.targetLod);
        chunk.mesh.geometry = newGeo;
        chunk.lod = update.targetLod;
        oldGeo.dispose();
      }
    }

    // Flora scatter distance LOD (throttled to ~5 Hz)
    if (now - this.lastScatterLodTime > 200) {
      this.lastScatterLodTime = now;
      this.updateScatterLOD(playerPos);
    }

    // Periodically prune distant chunks (every ~2 seconds)
    if (now - this.lastUpdateTime > 2000) {
      this.lastUpdateTime = now;
      this.pruneDistantChunks(cx, cz);
    }
  }

  private recomputeChunkLODs(centerCx: number, centerCz: number): void {
    this.pendingLodUpdates = [];
    this.activeChunks.forEach((chunk) => {
      const neededLod = calculateChunkLOD(chunk.cx, chunk.cz, centerCx, centerCz);
      if (chunk.lod !== neededLod) {
        this.pendingLodUpdates.push({ key: chunk.key, targetLod: neededLod });
      }
    });

    // Sort so closest LOD upgrades are processed first
    this.pendingLodUpdates.sort((a, b) => {
      const ca = this.activeChunks.get(a.key);
      const cb = this.activeChunks.get(b.key);
      if (!ca || !cb) return 0;
      const distA = Math.hypot(ca.cx - centerCx, ca.cz - centerCz);
      const distB = Math.hypot(cb.cx - centerCx, cb.cz - centerCz);
      return distA - distB;
    });
  }

  private updateScatterLOD(playerPos: THREE.Vector3): void {
    const px = playerPos.x;
    const pz = playerPos.z;
    this.activeChunks.forEach((chunk) => {
      if (chunk.scatterGroup) {
        const chunkWorldX = chunk.cx * CHUNK_SIZE;
        const chunkWorldZ = chunk.cz * CHUNK_SIZE;
        const dist = Math.hypot(chunkWorldX - px, chunkWorldZ - pz);
        // Flora scatter LOD: cull scatter beyond 220m
        chunk.scatterGroup.visible = dist <= 220;
      }
    });

    // Update macro-quadrant foliage LOD and detail tiers
    if (this.foliageManager) {
      this.foliageManager.updateLOD(playerPos);
    }
  }

  private recomputeNeededChunks(centerCx: number, centerCz: number): void {
    const R = CHUNK_RADIUS;
    const candidates: Array<{ cx: number; cz: number; distSq: number }> = [];

    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const key = `${cx},${cz}`;
        if (!this.activeChunks.has(key)) {
          const distSq = dx * dx + dz * dz;
          candidates.push({ cx, cz, distSq });
        } else {
          // Touch existing chunk
          const c = this.activeChunks.get(key)!;
          c.lastUsedTime = performance.now();
        }
      }
    }

    // Sort closest chunks first so the terrain under the player loads immediately
    candidates.sort((a, b) => a.distSq - b.distSq);
    this.pendingChunkKeys = candidates;
  }

  /**
   * Generates analytical chunk terrain geometry conforming to LOD vertex resolution.
   */
  public buildChunkGeometry(cx: number, cz: number, lod: ChunkLOD): THREE.BufferGeometry {
    const segments = getSegmentsForLOD(lod);
    const geometry = new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE,
      segments,
      segments
    );
    geometry.rotateX(-Math.PI / 2);

    const worldOriginX = cx * CHUNK_SIZE;
    const worldOriginZ = cz * CHUNK_SIZE;
    const pos = geometry.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);

    const eps = 0.6;

    for (let i = 0; i < count; i++) {
      const localX = pos.getX(i);
      const localZ = pos.getZ(i);
      const worldX = worldOriginX + localX;
      const worldZ = worldOriginZ + localZ;

      const worldY = getTerrainHeight(worldX, worldZ);
      pos.setY(i, worldY);

      // Analytical finite-difference normal calculation (ensures 100% zero seams between chunks)
      const hL = getTerrainHeight(worldX - eps, worldZ);
      const hR = getTerrainHeight(worldX + eps, worldZ);
      const hD = getTerrainHeight(worldX, worldZ - eps);
      const hU = getTerrainHeight(worldX, worldZ + eps);

      const nx = hL - hR;
      const ny = 2.0 * eps;
      const nz = hD - hU;
      const len = Math.hypot(nx, ny, nz) || 1.0;

      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;

      // Arizona Red-Rock Geology & Geomorphic Strata Vertex Coloring
      const normalY = ny / len; // 1.0 is horizontal, <0.72 is steep cliff face
      const distToSpring = Math.hypot(worldX - (-70), worldZ - (-20));
      let r = 0.82;
      let g = 0.63;
      let b = 0.44;

      if (distToSpring < 22) {
        // Lush riparian oasis vegetation
        const factor = 1.0 - distToSpring / 22;
        r = 0.42 * factor + r * (1.0 - factor);
        g = 0.54 * factor + g * (1.0 - factor);
        b = 0.26 * factor + b * (1.0 - factor);
      } else if (normalY < 0.72) {
        // Sheer canyon walls & mountain cliffs: layered red sandstone & desert varnish patina
        const strata = Math.sin(worldY * 0.95 + worldX * 0.04) * 0.09;
        const varnish = Math.sin(worldX * 0.25 + worldZ * 0.25) > 0.4 ? -0.12 : 0.0;
        r = 0.74 + strata + varnish;
        g = 0.28 + strata * 0.5 + varnish * 0.6;
        b = 0.16 + strata * 0.3 + varnish * 0.4;
      } else if (worldY > 34 && normalY > 0.86 && worldX < 20 && worldZ < -40) {
        // Flat-topped Peters Mesa plateau caprock: dark weathered basalt & desert pavement
        r = 0.44;
        g = 0.36;
        b = 0.30;
      } else if (worldY > 36) {
        // High volcanic arête ridge & craggy summit
        const varnish = Math.sin(worldX * 0.15) * 0.04;
        r = 0.46 + varnish;
        g = 0.36 + varnish * 0.8;
        b = 0.30 + varnish * 0.6;
      } else if (worldY > 18) {
        // Terracotta mountain slopes & bench ledges
        const strata = Math.sin(worldY * 0.8) * 0.07;
        r = 0.74 + strata;
        g = 0.42 + strata * 0.5;
        b = 0.26 + strata * 0.3;
      } else if (worldY > 6) {
        // Lower bajada desert slope
        r = 0.80;
        g = 0.54;
        b = 0.36;
      } else {
        // Smooth sandy wash / canyon riverbed floor
        const sandRipple = Math.sin(worldX * 0.12) * 0.03 + Math.cos(worldZ * 0.12) * 0.02;
        r = 0.86 + sandRipple;
        g = 0.70 + sandRipple * 0.8;
        b = 0.50 + sandRipple * 0.6;
      }

      // Check if hole excavation pit darkens this vertex (persists across LOD transitions)
      for (let h = 0; h < activeDugHoles.length; h++) {
        const hole = activeDugHoles[h];
        const distToHole = Math.hypot(worldX - hole.x, worldZ - hole.z);
        if (distToHole <= (hole.radius || 2.0) * 1.8) {
          r = 0.45;
          g = 0.32;
          b = 0.22;
          break;
        }
      }

      colors[i * 3] = Math.max(0.1, Math.min(1.0, r));
      colors[i * 3 + 1] = Math.max(0.1, Math.min(1.0, g));
      colors[i * 3 + 2] = Math.max(0.1, Math.min(1.0, b));
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    // High-precision bounding computation for accurate Frustum Culling
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }

  private createChunk(cx: number, cz: number, initialLod?: ChunkLOD): TerrainChunk {
    const key = `${cx},${cz}`;
    const worldOriginX = cx * CHUNK_SIZE;
    const worldOriginZ = cz * CHUNK_SIZE;
    const lod = initialLod !== undefined
      ? initialLod
      : calculateChunkLOD(cx, cz, this.currentCenterCx, this.currentCenterCz);

    const geometry = this.buildChunkGeometry(cx, cz, lod);

    const mesh = new THREE.Mesh(geometry, this.sharedMaterial);
    mesh.position.set(worldOriginX, 0, worldOriginZ);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.frustumCulled = true;

    this.scene.add(mesh);

    // Procedural deterministic scatter for endless wilderness chunks
    let scatterGroup: THREE.Group | undefined;
    let chunkColliders: WorldRockCollider[] | undefined;

    // Chunks with |cx| > 1 or |cz| > 1 are outside the original handcrafted central settlement
    if (Math.abs(cx) > 1 || Math.abs(cz) > 1) {
      const scatterResult = this.createChunkScatter(cx, cz, worldOriginX, worldOriginZ);
      scatterGroup = scatterResult.group;
      chunkColliders = scatterResult.colliders;
      this.scene.add(scatterGroup);
    }

    const chunk: TerrainChunk = {
      cx,
      cz,
      key,
      lod,
      mesh,
      scatterGroup,
      colliders: chunkColliders,
      lastUsedTime: performance.now(),
    };

    this.activeChunks.set(key, chunk);
    return chunk;
  }

  /**
   * Generates deterministic procedural desert scatter (Saguaros, Barrel Cacti, Desert Scrub, Mineable Boulders)
   * for endless chunks outside the central handcrafted area.
   */
  private createChunkScatter(
    cx: number,
    cz: number,
    originX: number,
    originZ: number
  ): { group: THREE.Group; colliders: WorldRockCollider[] } {
    const group = new THREE.Group();
    const colliders: WorldRockCollider[] = [];
    const seed = (cx * 73856093) ^ (cz * 19349663);

    // 1. Saguaro Cacti (6 to 12 per chunk)
    const saguaroCount = 6 + Math.floor(pseudoRandom(seed + 1) * 7);
    for (let i = 0; i < saguaroCount; i++) {
      const rx = (pseudoRandom(seed + 10 + i * 4) - 0.5) * (CHUNK_SIZE - 12);
      const rz = (pseudoRandom(seed + 11 + i * 4) - 0.5) * (CHUNK_SIZE - 12);
      const worldX = originX + rx;
      const worldZ = originZ + rz;
      const y = getTerrainHeight(worldX, worldZ);
      const slope = Math.hypot(
        getTerrainHeight(worldX + 1.2, worldZ) - getTerrainHeight(worldX - 1.2, worldZ),
        getTerrainHeight(worldX, worldZ + 1.2) - getTerrainHeight(worldX, worldZ - 1.2)
      ) / 2.4;

      // Exclude high points, summits, and steep cliff faces
      if (isHighPointOrPeak(worldX, worldZ, y, slope)) continue;

      const scale = 0.75 + pseudoRandom(seed + 12 + i * 4) * 0.7;
      const cactusGroup = new THREE.Group();
      cactusGroup.position.set(worldX, y + 3 * scale - 0.2, worldZ);
      cactusGroup.scale.set(scale, scale, scale);

      const trunk = new THREE.Mesh(this.trunkGeo, this.saguaroMat);
      trunk.castShadow = true;
      cactusGroup.add(trunk);

      const hasLeft = pseudoRandom(seed + 13 + i * 4) > 0.35;
      const hasRight = pseudoRandom(seed + 14 + i * 4) > 0.45;

      if (hasLeft) {
        const armH = new THREE.Mesh(this.armHorizontalGeo, this.saguaroMat);
        armH.position.set(-0.85, 0.5, 0);
        armH.castShadow = true;
        cactusGroup.add(armH);

        const armV = new THREE.Mesh(this.armVerticalGeo, this.saguaroMat);
        armV.position.set(-1.45, 1.6, 0);
        armV.castShadow = true;
        cactusGroup.add(armV);
      }

      if (hasRight) {
        const armH = new THREE.Mesh(this.armHorizontalGeo, this.saguaroMat);
        armH.position.set(0.85, -0.2, 0);
        armH.castShadow = true;
        cactusGroup.add(armH);

        const armV = new THREE.Mesh(this.armVerticalGeo, this.saguaroMat);
        armV.position.set(1.45, 0.8, 0);
        armV.castShadow = true;
        cactusGroup.add(armV);
      }

      group.add(cactusGroup);
    }

    // 2. Mineable Boulders & Rock Outcrops (3 to 6 per chunk)
    const boulderCount = 3 + Math.floor(pseudoRandom(seed + 50) * 4);
    for (let i = 0; i < boulderCount; i++) {
      const rx = (pseudoRandom(seed + 60 + i * 3) - 0.5) * (CHUNK_SIZE - 16);
      const rz = (pseudoRandom(seed + 61 + i * 3) - 0.5) * (CHUNK_SIZE - 16);
      const worldX = originX + rx;
      const worldZ = originZ + rz;
      const worldY = getTerrainHeight(worldX, worldZ);
      const slope = Math.hypot(
        getTerrainHeight(worldX + 1.2, worldZ) - getTerrainHeight(worldX - 1.2, worldZ),
        getTerrainHeight(worldX, worldZ + 1.2) - getTerrainHeight(worldX - 1.2, worldZ)
      ) / 2.4;
      if (slope > 0.55 || (worldY > 48 && slope > 0.35)) continue;

      const bScale = 0.8 + pseudoRandom(seed + 62 + i * 3) * 1.1;
      const bMesh = new THREE.Mesh(this.boulderGeo, this.boulderMat);
      // Deeply embed boulder into terrain slope so underside is 100% subterranean
      bMesh.position.set(worldX, worldY + bScale * 0.25, worldZ);
      bMesh.scale.set(bScale, bScale * 0.95, bScale);
      bMesh.rotation.set(
        (pseudoRandom(seed + 63 + i) - 0.5) * 0.35,
        pseudoRandom(seed + 64 + i) * Math.PI * 2,
        (pseudoRandom(seed + 65 + i) - 0.5) * 0.35
      );
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      group.add(bMesh);

      // Register collision so pickaxe strikes and physical collisions work in endless frontier
      const collider: WorldRockCollider = {
        id: `endless_rock_${cx}_${cz}_${i}`,
        x: worldX,
        y: worldY,
        z: worldZ,
        radius: bScale * 1.5,
        height: bScale * 2.2,
        type: 'boulder',
        active: true,
      };
      colliders.push(collider);

      if (this.foliageManager) {
        this.foliageManager.rockColliders.push(collider);
      }
    }

    // 3. Authentic Sonoran Desert Flora Distribution (10 to 18 plants per chunk)
    const floraCount = 10 + Math.floor(pseudoRandom(seed + 100) * 8);
    for (let i = 0; i < floraCount; i++) {
      const rx = (pseudoRandom(seed + 110 + i * 3) - 0.5) * (CHUNK_SIZE - 10);
      const rz = (pseudoRandom(seed + 111 + i * 3) - 0.5) * (CHUNK_SIZE - 10);
      const worldX = originX + rx;
      const worldZ = originZ + rz;
      const worldY = getTerrainHeight(worldX, worldZ);
      const slope = Math.hypot(
        getTerrainHeight(worldX + 1.2, worldZ) - getTerrainHeight(worldX - 1.2, worldZ),
        getTerrainHeight(worldX, worldZ + 1.2) - getTerrainHeight(worldX - 1.2, worldZ)
      ) / 2.4;
      if (isHighPointOrPeak(worldX, worldZ, worldY, slope)) continue;
      const floraTypeVal = pseudoRandom(seed + 112 + i * 5);

      if (floraTypeVal < 0.28) {
        // Creosote Bush
        const scrub = new THREE.Mesh(this.scrubGeo, this.scrubMat);
        const sScale = 0.65 + pseudoRandom(seed + 113 + i) * 0.55;
        scrub.position.set(worldX, worldY, worldZ);
        scrub.scale.set(sScale, sScale, sScale);
        scrub.rotation.y = pseudoRandom(seed + 114 + i) * Math.PI * 2;
        group.add(scrub);
      } else if (floraTypeVal < 0.48) {
        // Fishhook Barrel Cactus
        const barrel = new THREE.Mesh(this.barrelGeo, this.barrelMat);
        const bScale = 0.65 + pseudoRandom(seed + 115 + i) * 0.5;
        barrel.position.set(worldX, worldY + 0.42 * bScale, worldZ);
        barrel.scale.set(bScale, bScale, bScale);
        barrel.rotation.y = pseudoRandom(seed + 116 + i) * Math.PI * 2;
        group.add(barrel);
      } else if (floraTypeVal < 0.68) {
        // Prickly Pear Cactus
        const prickly = new THREE.Mesh(this.pricklyGeo, this.pricklyMat);
        const pScale = 0.7 + pseudoRandom(seed + 117 + i) * 0.45;
        prickly.position.set(worldX, worldY, worldZ);
        prickly.scale.set(pScale, pScale, pScale);
        prickly.rotation.y = pseudoRandom(seed + 118 + i) * Math.PI * 2;
        group.add(prickly);
      } else if (floraTypeVal < 0.82) {
        // Jumping Cholla Cactus
        const cholla = new THREE.Mesh(this.chollaGeo, this.chollaMat);
        const cScale = 0.7 + pseudoRandom(seed + 119 + i) * 0.4;
        cholla.position.set(worldX, worldY, worldZ);
        cholla.scale.set(cScale, cScale, cScale);
        cholla.rotation.y = pseudoRandom(seed + 120 + i) * Math.PI * 2;
        group.add(cholla);
      } else if (floraTypeVal < 0.92) {
        // Whiplike Ocotillo
        const ocotillo = new THREE.Mesh(this.ocotilloGeo, this.ocotilloMat);
        const oScale = 0.75 + pseudoRandom(seed + 121 + i) * 0.45;
        ocotillo.position.set(worldX, worldY, worldZ);
        ocotillo.scale.set(oScale, oScale, oScale);
        ocotillo.rotation.y = pseudoRandom(seed + 122 + i) * Math.PI * 2;
        group.add(ocotillo);
      } else {
        // Desert Century Agave
        const agave = new THREE.Mesh(this.agaveGeo, this.agaveMat);
        const aScale = 0.7 + pseudoRandom(seed + 123 + i) * 0.45;
        agave.position.set(worldX, worldY, worldZ);
        agave.scale.set(aScale, aScale, aScale);
        agave.rotation.y = pseudoRandom(seed + 124 + i) * Math.PI * 2;
        group.add(agave);
      }
    }

    // 4. Occasional Hydrothermal Gold Vein Outcrop (18% chance per chunk)
    const hasGoldVein = pseudoRandom(seed + 200) > 0.82;
    if (hasGoldVein) {
      const rx = (pseudoRandom(seed + 201) - 0.5) * (CHUNK_SIZE - 24);
      const rz = (pseudoRandom(seed + 202) - 0.5) * (CHUNK_SIZE - 24);
      const worldX = originX + rx;
      const worldZ = originZ + rz;
      const worldY = getTerrainHeight(worldX, worldZ);

      const goldVein = new THREE.Mesh(this.boulderGeo, this.goldOutcropMat);
      goldVein.position.set(worldX, worldY + 0.15, worldZ);
      goldVein.scale.set(1.1, 0.7, 1.1);
      goldVein.castShadow = true;
      group.add(goldVein);

      const goldCollider: WorldRockCollider = {
        id: `endless_gold_${cx}_${cz}`,
        x: worldX,
        y: worldY,
        z: worldZ,
        radius: 1.8,
        height: 2.0,
        type: 'boulder',
        active: true,
      };
      colliders.push(goldCollider);
      if (this.foliageManager) {
        this.foliageManager.rockColliders.push(goldCollider);
      }
    }

    return { group, colliders };
  }

  private pruneDistantChunks(centerCx: number, centerCz: number): void {
    const maxRadius = CHUNK_RADIUS + 1;
    const toRemove: string[] = [];

    this.activeChunks.forEach((chunk, key) => {
      const dx = Math.abs(chunk.cx - centerCx);
      const dz = Math.abs(chunk.cz - centerCz);
      if (dx > maxRadius || dz > maxRadius) {
        toRemove.push(key);
      }
    });

    toRemove.forEach((key) => {
      const chunk = this.activeChunks.get(key);
      if (chunk) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();

        if (chunk.scatterGroup) {
          this.scene.remove(chunk.scatterGroup);
        }

        // Deactivate chunk colliders from foliage manager
        if (chunk.colliders && this.foliageManager) {
          chunk.colliders.forEach((c) => {
            c.active = false;
          });
        }

        this.activeChunks.delete(key);
      }
    });
  }

  /**
   * Deforms loaded chunks when a player digs a hole with shovel or collapses an excavation.
   */
  public updateChunksForHole(hole: DugHole): void {
    const R = Math.max(9.5, (hole.radius || 2.0) * 3.4);
    const eps = 0.6;

    this.activeChunks.forEach((chunk) => {
      const worldOriginX = chunk.cx * CHUNK_SIZE;
      const worldOriginZ = chunk.cz * CHUNK_SIZE;

      // Check if hole bounding box overlaps this chunk
      const chunkMinX = worldOriginX - CHUNK_SIZE / 2;
      const chunkMaxX = worldOriginX + CHUNK_SIZE / 2;
      const chunkMinZ = worldOriginZ - CHUNK_SIZE / 2;
      const chunkMaxZ = worldOriginZ + CHUNK_SIZE / 2;

      if (
        hole.x + R < chunkMinX ||
        hole.x - R > chunkMaxX ||
        hole.z + R < chunkMinZ ||
        hole.z - R > chunkMaxZ
      ) {
        return;
      }

      const geom = chunk.mesh.geometry as THREE.BufferGeometry;
      const pos = geom.attributes.position;
      const normals = geom.attributes.normal;
      const colors = geom.attributes.color;
      let modified = false;

      for (let i = 0; i < pos.count; i++) {
        const localX = pos.getX(i);
        const localZ = pos.getZ(i);
        const worldX = worldOriginX + localX;
        const worldZ = worldOriginZ + localZ;

        const dist = Math.hypot(worldX - hole.x, worldZ - hole.z);
        if (dist <= R + 1.0) {
          const newY = getTerrainHeight(worldX, worldZ);
          pos.setY(i, newY);

          // Update normal
          const hL = getTerrainHeight(worldX - eps, worldZ);
          const hR = getTerrainHeight(worldX + eps, worldZ);
          const hD = getTerrainHeight(worldX, worldZ - eps);
          const hU = getTerrainHeight(worldX, worldZ + eps);

          const nx = hL - hR;
          const ny = 2.0 * eps;
          const nz = hD - hU;
          const len = Math.hypot(nx, ny, nz) || 1.0;

          normals.setXYZ(i, nx / len, ny / len, nz / len);

          // Darken strata in excavation pit
          if (dist <= hole.radius * 1.8 && colors) {
            colors.setXYZ(i, 0.45, 0.32, 0.22);
          }
          modified = true;
        }
      }

      if (modified) {
        pos.needsUpdate = true;
        normals.needsUpdate = true;
        if (colors) colors.needsUpdate = true;
      }
    });
  }

  public getLoadedChunkCount(): number {
    return this.activeChunks.size;
  }

  public getChunkMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.activeChunks.forEach((c) => meshes.push(c.mesh));
    return meshes;
  }

  public raycast(raycaster: THREE.Raycaster): THREE.Intersection[] {
    const meshes = this.getChunkMeshes();
    return raycaster.intersectObjects(meshes, false);
  }

  public dispose(): void {
    this.activeChunks.forEach((chunk) => {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      if (chunk.scatterGroup) {
        this.scene.remove(chunk.scatterGroup);
      }
    });
    this.activeChunks.clear();
    this.sharedMaterial.dispose();
    this.sharedNoiseTexture.dispose();
  }
}
