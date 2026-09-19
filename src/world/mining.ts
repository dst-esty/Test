import * as THREE from 'three';
import { ClaimInfo, MiningOreDrop, Vector3D, VoxelType, DebrisType } from '../types';
import { soundEngine } from '../audio/soundEffects';
import { createGoldVeinVoxelMaterials, generateNoiseTexture } from './voxelGoldShader';
import { digHoleInTerrain } from './terrain';
import { createRealisticOreSpecimen } from './realisticSpecimens';
import { MountainHoleManager } from './mountainHoles';
import { MountainDustParticleSystem } from './mountainDustParticles';

export interface VoxelInstanceData {
  x: number;
  y: number;
  z: number;
  type: VoxelType;
  instanceIndex: number;
  meshType: VoxelType;
  active: boolean;
}

export interface DebrisParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  particleType: 'macro' | 'micro_grit' | 'dust_puff';
  baseScale: number;
  initialOpacity?: number;
}

export class MiningSystem {
  public claim: ClaimInfo = {
    isClaimed: false,
    name: "Dutchman's Gold Ridge Claim",
    position: { x: 155, y: 50.8, z: 105 },
    size: 40,
    extractedGold: 0,
    blocksDug: 0,
  };

  // Instanced meshes by voxel type
  private instancedMeshes: Map<VoxelType, THREE.InstancedMesh> = new Map();
  private materials: Record<VoxelType, THREE.MeshStandardMaterial>;
  private getTerrainHeightFn?: (x: number, z: number) => number;
  private voxelData: VoxelInstanceData[] = [];
  private debrisList: DebrisParticle[] = [];
  private oreDrops: { data: MiningOreDrop; mesh: THREE.Group }[] = [];
  private scene: THREE.Scene;
  private terrainMesh?: THREE.Mesh;
  private claimGroup: THREE.Group = new THREE.Group();
  private particleGroup: THREE.Group = new THREE.Group();
  private oreGroup: THREE.Group = new THREE.Group();

  public readonly blockSize = 0.55;
  public mountainHoleManager?: MountainHoleManager;
  public dustParticleSystem?: MountainDustParticleSystem;

  constructor(
    scene: THREE.Scene,
    terrainMesh?: THREE.Mesh,
    getTerrainHeightFn?: (x: number, z: number) => number,
    customMaterials?: Record<VoxelType, THREE.MeshStandardMaterial>
  ) {
    this.scene = scene;
    this.terrainMesh = terrainMesh;
    this.getTerrainHeightFn = getTerrainHeightFn;
    this.materials = customMaterials || createGoldVeinVoxelMaterials(generateNoiseTexture(256)).materials;
    this.scene.add(this.claimGroup);
    this.scene.add(this.particleGroup);
    this.scene.add(this.oreGroup);
    this.initClaimStructures();
    this.initVoxelField();
  }

  public setTerrainMesh(mesh: THREE.Mesh) {
    this.terrainMesh = mesh;
  }

  public setMountainHoleManager(mgr: MountainHoleManager) {
    this.mountainHoleManager = mgr;
  }

  public setDustParticleSystem(ps: MountainDustParticleSystem) {
    this.dustParticleSystem = ps;
  }

  public getInstancedMeshes(): Map<VoxelType, THREE.InstancedMesh> {
    return this.instancedMeshes;
  }

  public getMaterials(): Record<VoxelType, THREE.MeshStandardMaterial> {
    return this.materials;
  }

  // 1. Build the Claim Stakes and Claim Marker Cairn
  private initClaimStructures() {
    this.claimGroup.clear();

    const cx = this.claim.position.x;
    const cz = this.claim.position.z;
    const cy = this.getTerrainHeightFn ? this.getTerrainHeightFn(cx, cz) : this.claim.position.y;
    this.claim.position.y = cy;
    const half = this.claim.size / 2;

    // Corner Stakes
    const corners = [
      { x: cx - half, z: cz - half },
      { x: cx + half, z: cz - half },
      { x: cx + half, z: cz + half },
      { x: cx - half, z: cz + half },
    ];

    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.9 });

    corners.forEach((c) => {
      const stakeY = this.getTerrainHeightFn ? this.getTerrainHeightFn(c.x, c.z) : cy;
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 6), stakeMat);
      stake.position.set(c.x, stakeY + 1.2, c.z);
      stake.castShadow = true;
      this.claimGroup.add(stake);

      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.25, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xe5a93b })
      );
      flag.position.set(c.x + 0.2, stakeY + 2.1, c.z);
      this.claimGroup.add(flag);
    });

    // Central Monument: Stone Cairn + Claim Post
    const monument = new THREE.Group();
    monument.position.set(cx, cy, cz);

    for (let i = 0; i < 9; i++) {
      const stoneGeo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.3, 0);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x8a5a36 : 0x6e492e,
        roughness: 0.9,
      });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      const angle = (i / 9) * Math.PI * 2;
      const r = 0.8 + Math.random() * 0.4;
      stone.position.set(Math.cos(angle) * r, 0.4 + (i > 4 ? 0.5 : 0), Math.sin(angle) * r);
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      stone.castShadow = true;
      monument.add(stone);
    }

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 3.4, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x422d1f, roughness: 0.85 })
    );
    post.position.y = 1.7;
    post.castShadow = true;
    monument.add(post);

    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.75, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 })
    );
    plaque.position.set(0, 2.2, 0.2);
    monument.add(plaque);

    const claimFlag = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.5, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x8b2500, roughness: 0.9 })
    );
    claimFlag.position.set(0.48, 3.1, 0);
    monument.add(claimFlag);

    this.claimGroup.add(monument);
  }

  // 2. Initialize Voxel Fields (Camp Outcrop + Dutchman Ridge Claim + Interior Chamber)
  private initVoxelField() {
    const materials = this.materials;

    const typeBuckets: Record<VoxelType, { x: number; y: number; z: number }[]> = {
      sandstone: [],
      granite: [],
      quartz_gold: [],
      silver_ore: [],
      calcite: [],
      dirt: [],
    };

    const bs = this.blockSize;

    // A. Dutchman Ridge Claim Mine Field (Mountain Cutting beside Mine Portal)
    const dutchmanX = 148;
    const dutchmanZ = 98;
    const dutchmanBaseY = this.getTerrainHeightFn ? this.getTerrainHeightFn(dutchmanX, dutchmanZ) - 1.2 : 46.5;
    const dutchmanOrigin = new THREE.Vector3(dutchmanX, dutchmanBaseY, dutchmanZ);

    for (let gx = 0; gx < 20; gx++) {
      for (let gy = 0; gy < 14; gy++) {
        for (let gz = 0; gz < 20; gz++) {
          const wx = dutchmanOrigin.x + gx * bs;
          const wy = dutchmanOrigin.y + gy * bs;
          const wz = dutchmanOrigin.z + gz * bs;

          const vein = Math.abs(Math.sin(wx * 0.42 + wz * 0.36) * 2.2 + (wy - 48.0) * 0.85);
          const silver = Math.abs(Math.cos(wz * 0.4) * 2.0 + (wy - 46.5));

          let vType: VoxelType = 'sandstone';
          if (vein < 0.65) vType = 'quartz_gold';
          else if (silver < 0.5) vType = 'silver_ore';
          else if (gy < 3) vType = 'granite';
          else if (gy > 11) vType = 'dirt';
          else if (Math.random() < 0.08) vType = 'calcite';

          typeBuckets[vType].push({ x: wx, y: wy, z: wz });
        }
      }
    }

    // B. Peralta Camp Gold-Quartz Outcrop (Right beside starting camp for instant exploration)
    const campX = -108;
    const campZ = -108;
    const campBaseY = this.getTerrainHeightFn ? this.getTerrainHeightFn(campX, campZ) - 0.6 : 15.2;
    const campOrigin = new THREE.Vector3(campX, campBaseY, campZ);

    for (let gx = 0; gx < 8; gx++) {
      for (let gy = 0; gy < 6; gy++) {
        for (let gz = 0; gz < 8; gz++) {
          const wx = campOrigin.x + gx * bs;
          const wy = campOrigin.y + gy * bs;
          const wz = campOrigin.z + gz * bs;

          let vType: VoxelType = 'sandstone';
          if (gy >= 2 && gy <= 4 && (gx + gz) % 3 === 0) {
            vType = 'quartz_gold';
          } else if (Math.random() < 0.3) {
            vType = 'quartz_gold';
          } else if (Math.random() < 0.25) {
            vType = 'granite';
          }

          typeBuckets[vType].push({ x: wx, y: wy, z: wz });
        }
      }
    }

    // C. Hidden Mine Drift Chamber Vein Face (Inside the Lost Dutchman underground chamber)
    const chamberX = 156.5;
    const chamberZ = 137.2;
    const chamberBaseY = this.getTerrainHeightFn ? this.getTerrainHeightFn(160, 110) - 1.0 : 47.3;
    const chamberOrigin = new THREE.Vector3(chamberX, chamberBaseY, chamberZ);

    for (let gx = 0; gx < 14; gx++) {
      for (let gy = 0; gy < 9; gy++) {
        for (let gz = 0; gz < 5; gz++) {
          const wx = chamberOrigin.x + (gx - 7) * bs;
          const wy = chamberOrigin.y + gy * bs;
          const wz = chamberOrigin.z + gz * bs;

          const vein = Math.abs(Math.sin(wx * 0.45 + wz * 0.38) * 2.0 + (wy - 49.0) * 0.8);
          let vType: VoxelType = 'granite';
          if (vein < 0.7) vType = 'quartz_gold';
          else if (Math.random() < 0.15) vType = 'calcite';
          else if (Math.random() < 0.2) vType = 'silver_ore';
          else if (gy > 6) vType = 'sandstone';

          typeBuckets[vType].push({ x: wx, y: wy, z: wz });
        }
      }
    }

    // Create instanced meshes with the procedural gold vein GLSL materials
    const cubeGeo = new THREE.BoxGeometry(bs * 0.98, bs * 0.98, bs * 0.98);
    (Object.keys(typeBuckets) as VoxelType[]).forEach((type) => {
      const positions = typeBuckets[type];
      if (positions.length === 0) return;

      const instancedMesh = new THREE.InstancedMesh(cubeGeo, materials[type], positions.length);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      positions.forEach((pos, idx) => {
        dummy.position.set(pos.x, pos.y, pos.z);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(idx, dummy.matrix);

        this.voxelData.push({
          x: pos.x,
          y: pos.y,
          z: pos.z,
          type,
          instanceIndex: idx,
          meshType: type,
          active: true,
        });
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMeshes.set(type, instancedMesh);
      this.scene.add(instancedMesh);
    });
  }

  // 3. Staking the Claim
  public claimMine(): boolean {
    if (this.claim.isClaimed) return false;
    this.claim.isClaimed = true;
    soundEngine.playClaimStake();
    return true;
  }

  // 4. Universal Digging Engine: Hits voxels or carves terrain mesh dynamically
  public digVoxelAtRay(
    raycaster: THREE.Raycaster,
    playerPos?: THREE.Vector3,
    playerDir?: THREE.Vector3
  ): {
    hit: boolean;
    type?: VoxelType;
    goldAwarded?: number;
    hitPoint?: THREE.Vector3;
    message?: string;
    slumpOccurred?: boolean;
    slumpDamage?: number;
    slumpFatal?: boolean;
  } {
    // A. Check for direct strike on existing mountain hole
    if (this.mountainHoleManager) {
      const mtnHit = this.mountainHoleManager.raycastMountainHoles(raycaster, 6.5);
      if (mtnHit.hit && mtnHit.hole) {
        const res = this.mountainHoleManager.digMountainHole(
          mtnHit.hole.position,
          mtnHit.hole.normal,
          mtnHit.hole.rockColor,
          mtnHit.hole.rockType,
          'pickaxe'
        );
        soundEngine.playRockChisel();
        this.spawnDigDebris(res.hitPoint, res.debrisType, 1.6);
        this.claim.blocksDug += res.rocksAwarded;
        if (res.goldAwarded > 0) {
          this.spawnOreDrop(
            new THREE.Vector3(res.hitPoint.x, res.hitPoint.y + 0.4, res.hitPoint.z),
            'quartz_gold',
            res.goldAwarded
          );
          soundEngine.playOreChime();
        }
        return {
          hit: true,
          type: 'quartz_gold',
          goldAwarded: res.goldAwarded,
          hitPoint: res.hitPoint,
          message: res.message,
        };
      }
    }

    // A2. Check for instanced voxel hit
    const activeMeshes = Array.from(this.instancedMeshes.values());
    const voxelHits = raycaster.intersectObjects(activeMeshes, false);

    if (voxelHits.length > 0 && voxelHits[0].distance <= 5.8 && voxelHits[0].instanceId !== undefined) {
      const firstHit = voxelHits[0];
      let hitMeshType: VoxelType | null = null;
      for (const [type, mesh] of this.instancedMeshes.entries()) {
        if (mesh === firstHit.object) {
          hitMeshType = type;
          break;
        }
      }

      if (hitMeshType) {
        const instanceId = firstHit.instanceId!;
        const instancedMesh = this.instancedMeshes.get(hitMeshType)!;
        const entry = this.voxelData.find(
          (v) => v.meshType === hitMeshType && v.instanceIndex === instanceId && v.active
        );

        if (entry) {
          entry.active = false;
          instancedMesh.setMatrixAt(instanceId, new THREE.Matrix4().makeScale(0, 0, 0));
          instancedMesh.instanceMatrix.needsUpdate = true;

          soundEngine.playVoxelDig();
          this.spawnDigDebris(new THREE.Vector3(entry.x, entry.y, entry.z), entry.type);
          this.claim.blocksDug += 1;

          let goldAwarded = 0;
          let msg = '+1 Mined Voxel';
          if (entry.type === 'quartz_gold') {
            goldAwarded = 3 + Math.floor(Math.random() * 5);
            this.spawnOreDrop(new THREE.Vector3(entry.x, entry.y + 0.3, entry.z), 'quartz_gold', goldAwarded);
            soundEngine.playOreChime();
            msg = `+${goldAwarded} oz High-Grade Gold Quartz!`;
          } else if (entry.type === 'silver_ore') {
            goldAwarded = 1 + Math.floor(Math.random() * 2);
            this.spawnOreDrop(new THREE.Vector3(entry.x, entry.y + 0.3, entry.z), 'silver_chunk', goldAwarded);
            msg = `+${goldAwarded} oz Silver Ore!`;
          } else if (Math.random() < 0.25) {
            goldAwarded = 1;
            this.spawnOreDrop(new THREE.Vector3(entry.x, entry.y + 0.3, entry.z), 'gold_nugget', 1);
            soundEngine.playOreChime();
            msg = '+1 oz Gold Nugget!';
          }

          return {
            hit: true,
            type: entry.type,
            goldAwarded,
            hitPoint: new THREE.Vector3(entry.x, entry.y, entry.z),
            message: msg,
          };
        }
      }
    }

    // B. Check for direct terrain hit or fallback ground excavation
    let targetPoint: THREE.Vector3 | null = null;
    let hitNormal: THREE.Vector3 | null = null;
    if (this.terrainMesh) {
      const terrainHits = raycaster.intersectObject(this.terrainMesh, false);
      if (terrainHits.length > 0 && terrainHits[0].distance <= 6.5) {
        targetPoint = terrainHits[0].point;
        if (terrainHits[0].face) {
          hitNormal = terrainHits[0].face.normal.clone();
        }
      }
    }

    // Fallback: If player aimed near horizon or is in 3rd person, strike ground 2m in front
    if (!targetPoint && playerPos && playerDir) {
      targetPoint = new THREE.Vector3(
        playerPos.x + playerDir.x * 2.0,
        playerPos.y - 0.4,
        playerPos.z + playerDir.z * 2.0
      );
    }

    if (targetPoint) {
      // If striking a steep mountain cliff face, carve a visible 3D hole into the mountain rock!
      let mountainHoleMsg = '';
      let mtnGold = 0;
      if (hitNormal && hitNormal.y < 0.76 && this.mountainHoleManager) {
        const norm = hitNormal.clone().normalize();
        if (raycaster && norm.dot(raycaster.ray.direction) > 0) {
          norm.negate();
        }
        const mRes = this.mountainHoleManager.digMountainHole(
          targetPoint,
          norm,
          0x7c3820,
          'granite',
          'pickaxe',
          true
        );
        mountainHoleMsg = mRes.message;
        mtnGold = mRes.goldAwarded;
      }

      // Progressively excavate into real subterranean geological rock strata!
      const digResult = digHoleInTerrain(targetPoint.x, targetPoint.z, 0.65, 2.0, 'pickaxe');
      if (mtnGold > 0) {
        digResult.goldAwarded = (digResult.goldAwarded || 0) + mtnGold;
      }

      if (digResult.slumpOccurred) {
        soundEngine.playTrenchSlump();
        this.spawnDigDebris(targetPoint, 'dirt', 0.9);
      }

      soundEngine.playVoxelDig();
      this.spawnDigDebris(targetPoint, digResult.layer.debrisType, 1.25, hitNormal || new THREE.Vector3(0, 1, 0));
      this.claim.blocksDug += digResult.rocksAwarded;

      if (digResult.goldAwarded > 0) {
        const dropType = digResult.layer.rockType === 'quartz_gold' ? 'quartz_gold' : 'gold_nugget';
        this.spawnOreDrop(
          new THREE.Vector3(targetPoint.x, targetPoint.y + 0.4, targetPoint.z),
          dropType,
          Math.max(1, Math.round(digResult.goldAwarded))
        );
        soundEngine.playOreChime();
      }

      return {
        hit: true,
        type: digResult.layer.rockType,
        goldAwarded: digResult.goldAwarded,
        hitPoint: targetPoint,
        message: mountainHoleMsg || digResult.strataMessage,
        slumpOccurred: digResult.slumpOccurred,
        slumpDamage: digResult.slumpDamage,
        slumpFatal: digResult.slumpFatal,
      };
    }

    return { hit: false };
  }

  // Real-time Terrain Vertex Deformation
  public excavateTerrainMesh(center: THREE.Vector3, radius: number = 2.0, maxDepth: number = 0.5) {
    if (!this.terrainMesh) return;
    const geometry = this.terrainMesh.geometry as THREE.BufferGeometry;
    const pos = geometry.attributes.position;
    if (!pos) return;

    let modified = false;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const dist = Math.hypot(vx - center.x, vz - center.z);
      if (dist < radius) {
        const falloff = (1 + Math.cos((dist / radius) * Math.PI)) * 0.5;
        const currentY = pos.getY(i);
        pos.setY(i, currentY - maxDepth * falloff);
        modified = true;
      }
    }

    if (modified) {
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  }

  // 5. Blast Excavation with Dynamite
  public explodeDynamiteAt(center: THREE.Vector3, blastRadius: number = 3.4): number {
    let totalGold = 0;
    soundEngine.playDynamiteExplosion();

    // Crater the terrain down into deeper geological rock strata!
    const blastRes = digHoleInTerrain(center.x, center.z, 2.2, blastRadius * 1.25, 'dynamite');
    if (blastRes.slumpOccurred) {
      soundEngine.playTrenchSlump();
      this.spawnDigDebris(center, 'dirt', 1.2);
    }
    this.spawnDigDebris(center, blastRes.layer.debrisType, 2.4);
    totalGold += blastRes.goldAwarded;
    this.claim.blocksDug += blastRes.rocksAwarded;

    // Shatter nearby voxels
    this.voxelData.forEach((voxel) => {
      if (!voxel.active) return;
      const d = Math.hypot(voxel.x - center.x, voxel.y - center.y, voxel.z - center.z);
      if (d <= blastRadius) {
        voxel.active = false;
        const mesh = this.instancedMeshes.get(voxel.meshType);
        if (mesh) {
          mesh.setMatrixAt(voxel.instanceIndex, new THREE.Matrix4().makeScale(0, 0, 0));
          mesh.instanceMatrix.needsUpdate = true;
        }

        this.spawnDigDebris(new THREE.Vector3(voxel.x, voxel.y, voxel.z), voxel.type, 2.2);
        this.claim.blocksDug += 1;

        if (voxel.type === 'quartz_gold') {
          const gold = 4 + Math.floor(Math.random() * 4);
          totalGold += gold;
          this.spawnOreDrop(new THREE.Vector3(voxel.x, voxel.y, voxel.z), 'quartz_gold', gold);
        } else if (voxel.type === 'silver_ore') {
          totalGold += 2;
          this.spawnOreDrop(new THREE.Vector3(voxel.x, voxel.y, voxel.z), 'silver_chunk', 2);
        }
      }
    });

    // Always yield nuggets from the blast earth
    const extraNuggets = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < extraNuggets; k++) {
      const dropPos = new THREE.Vector3(
        center.x + (Math.random() - 0.5) * 2,
        center.y + 0.8 + Math.random() * 0.5,
        center.z + (Math.random() - 0.5) * 2
      );
      this.spawnOreDrop(dropPos, 'gold_nugget', 1);
      totalGold += 1;
    }

    return totalGold;
  }

  // 6. Spawn multi-tier friable rock & sand debris (macro cleavage shards, micro sand grit, atmospheric dust billows)
  public spawnDigDebris(pos: THREE.Vector3, type: DebrisType, speedMult: number = 1.0, surfaceNormal?: THREE.Vector3) {
    if (this.dustParticleSystem) {
      const debrisToMaterialMap: Record<DebrisType, string> = {
        sandstone: 'sandstone',
        granite: 'granite',
        quartz_gold: 'quartz_gold',
        quartz: 'quartz',
        calcite: 'caliche',
        dirt: 'dirt',
        silver_ore: 'gneiss',
        cactus: 'dirt',
        wood: 'dirt',
      };
      const rockMat = debrisToMaterialMap[type] || 'sandstone';
      const normal = surfaceNormal || new THREE.Vector3(0, 1, 0);
      this.dustParticleSystem.triggerMountainStrike(pos, normal, rockMat, speedMult);
    }

    const strataColors: Record<DebrisType, { macro: number; grit: number; dust: number }> = {
      sandstone: { macro: 0xc87d46, grit: 0xba6e38, dust: 0xd48750 },
      granite: { macro: 0x5a504a, grit: 0x48423c, dust: 0x6e6660 },
      quartz_gold: { macro: 0xf5f0e1, grit: 0xe8e4d8, dust: 0xfbf9f5 },
      silver_ore: { macro: 0x7c858b, grit: 0x687278, dust: 0x8a9298 },
      calcite: { macro: 0xede4d4, grit: 0xe2d8c6, dust: 0xf4eee2 },
      dirt: { macro: 0x825432, grit: 0x96643c, dust: 0x906038 },
      cactus: { macro: 0x3d7034, grit: 0x4d8044, dust: 0x5c8e54 },
      wood: { macro: 0x7a5031, grit: 0x8a5e3d, dust: 0x805435 },
      quartz: { macro: 0xeeeeee, grit: 0xdddddd, dust: 0xf2f2f2 },
    };

    const colorConfig = strataColors[type] || strataColors.dirt;

    // 1. TIER 1: Macro Cleavage Chunks (3-6 pieces shaped by natural geological cleavage)
    const macroCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < macroCount; i++) {
      let geo: THREE.BufferGeometry;
      const baseSize = 0.08 + Math.random() * 0.11;

      if (type === 'sandstone') {
        // Flat tabular wafer flagstones along bedding planes
        geo = new THREE.BoxGeometry(baseSize * 1.6, baseSize * 0.32, baseSize * 1.2);
      } else if (type === 'granite') {
        // Sharp angular multifaceted blocks
        geo = new THREE.DodecahedronGeometry(baseSize, 0);
      } else if (type === 'calcite') {
        // Chalky crumbly irregular nodule
        geo = new THREE.DodecahedronGeometry(baseSize * 1.1, 0);
      } else if (type === 'quartz_gold' || type === 'quartz') {
        // Sharp vitreous quartz shard
        geo = new THREE.ConeGeometry(baseSize * 0.7, baseSize * 1.4, 5);
      } else {
        // Wash gravel / dirt pebble
        geo = new THREE.DodecahedronGeometry(baseSize, 0);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: colorConfig.macro,
        roughness: 0.85,
        metalness: type === 'silver_ore' ? 0.8 : (type === 'quartz_gold' && i === 0 ? 0.6 : 0.05),
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.25,
        pos.y + 0.1 + Math.random() * 0.18,
        pos.z + (Math.random() - 0.5) * 0.25
      );
      mesh.castShadow = true;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5.2 * speedMult,
        (Math.random() * 4.2 + 2.2) * speedMult,
        (Math.random() - 0.5) * 5.2 * speedMult
      );

      this.particleGroup.add(mesh);
      this.debrisList.push({
        mesh,
        velocity: vel,
        rotSpeed: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        life: 0,
        maxLife: 0.75 + Math.random() * 0.45,
        particleType: 'macro',
        baseScale: 1.0,
      });
    }

    // 2. TIER 2: Friable Micro-Grit / Sand Grains (24-36 fine sand & stone particles)
    const gritCount = 22 + Math.floor(Math.random() * 14);
    const gritMat = new THREE.MeshBasicMaterial({ color: colorConfig.grit });
    for (let i = 0; i < gritCount; i++) {
      const gSize = 0.022 + Math.random() * 0.024;
      const gGeo = new THREE.BoxGeometry(gSize, gSize, gSize);
      const mesh = new THREE.Mesh(gGeo, gritMat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.22,
        pos.y + 0.05 + Math.random() * 0.15,
        pos.z + (Math.random() - 0.5) * 0.22
      );

      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() * 4.0 + 1.2) * speedMult;
      const vel = new THREE.Vector3(
        Math.cos(angle) * spread,
        (Math.random() * 4.0 + 2.0) * speedMult,
        Math.sin(angle) * spread
      );

      this.particleGroup.add(mesh);
      this.debrisList.push({
        mesh,
        velocity: vel,
        rotSpeed: new THREE.Vector3(Math.random() * 16, Math.random() * 16, Math.random() * 16),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        particleType: 'micro_grit',
        baseScale: 1.0,
      });
    }

    // 3. TIER 3: Atmospheric Strata Dust / Silt Billow Puffs (4-6 soft clouds that expand & rise)
    const dustCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < dustCount; i++) {
      const dRadius = 0.14 + Math.random() * 0.12;
      const dGeo = new THREE.IcosahedronGeometry(dRadius, 1);
      const dMat = new THREE.MeshBasicMaterial({
        color: colorConfig.dust,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(dGeo, dMat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.2,
        pos.y + 0.1 + Math.random() * 0.15,
        pos.z + (Math.random() - 0.5) * 0.2
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.3 * speedMult,
        (Math.random() * 0.8 + 0.45) * speedMult,
        (Math.random() - 0.5) * 1.3 * speedMult
      );

      this.particleGroup.add(mesh);
      this.debrisList.push({
        mesh,
        velocity: vel,
        rotSpeed: new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 0),
        life: 0,
        maxLife: 0.85 + Math.random() * 0.45,
        particleType: 'dust_puff',
        baseScale: 1.0,
        initialOpacity: 0.38,
      });
    }
  }

  // 7. Spawn collectible realistic 3D Ore Specimen / Nugget drop
  public spawnOreDrop(pos: THREE.Vector3, type: MiningOreDrop['type'], value: number) {
    const group = createRealisticOreSpecimen(type, value);
    group.position.copy(pos);

    this.oreGroup.add(group);
    this.oreDrops.push({
      data: {
        id: `ore_${Date.now()}_${Math.random()}`,
        position: { x: pos.x, y: pos.y, z: pos.z },
        type,
        value,
        rotation: Math.random() * Math.PI,
      },
      mesh: group,
    });
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    onCollectOre: (drop: MiningOreDrop) => void
  ) {
    // 1. Update multi-tier debris particles
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const p = this.debrisList[i];
      p.life += delta;
      const progress = p.life / p.maxLife;

      if (p.particleType === 'dust_puff') {
        // Atmospheric dust billows expand in the desert heat & drift upward
        const expand = p.baseScale * (1.0 + progress * 2.8);
        p.mesh.scale.setScalar(expand);

        p.velocity.y += 0.2 * delta; // thermal lift
        p.velocity.x *= 0.96;
        p.velocity.z *= 0.96;
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.rotation.x += p.rotSpeed.x * delta;
        p.mesh.rotation.y += p.rotSpeed.y * delta;

        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (p.initialOpacity || 0.38) * (1.0 - progress));
      } else if (p.particleType === 'micro_grit') {
        // Micro sand particles have steep gravity and settle fast
        p.velocity.y -= 22 * delta;
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.rotation.x += p.rotSpeed.x * delta;
        p.mesh.rotation.y += p.rotSpeed.y * delta;

        const scale = Math.max(0.01, 1 - progress * 0.8);
        p.mesh.scale.setScalar(scale);
      } else {
        // Macro rock cleavage chunks tumble with standard gravity
        p.velocity.y -= 18 * delta;
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.rotation.x += p.rotSpeed.x * delta;
        p.mesh.rotation.y += p.rotSpeed.y * delta;

        const scale = Math.max(0.01, 1 - progress);
        p.mesh.scale.setScalar(scale);
      }

      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.debrisList.splice(i, 1);
      }
    }

    // 2. Animate and collect ore drops
    for (let i = this.oreDrops.length - 1; i >= 0; i--) {
      const ore = this.oreDrops[i];
      ore.mesh.rotation.y += delta * 2.2;
      ore.mesh.position.y += Math.sin(Date.now() * 0.004 + i) * 0.0018;

      // Vacuum pickup range
      const dist = ore.mesh.position.distanceTo(playerPos);
      if (dist < 2.6) {
        soundEngine.playPickaxe();
        onCollectOre(ore.data);
        this.oreGroup.remove(ore.mesh);
        this.oreDrops.splice(i, 1);
      }
    }
  }

  public getClaimBounds() {
    return {
      center: this.claim.position,
      size: this.claim.size,
    };
  }

  public dispose() {
    this.scene.remove(this.claimGroup);
    this.scene.remove(this.particleGroup);
    this.scene.remove(this.oreGroup);

    this.instancedMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.instancedMeshes.clear();

    this.debrisList.forEach((d) => {
      this.particleGroup.remove(d.mesh);
      d.mesh.geometry.dispose();
      if (Array.isArray(d.mesh.material)) {
        d.mesh.material.forEach((m) => m.dispose());
      } else {
        d.mesh.material.dispose();
      }
    });
    this.debrisList = [];

    this.oreDrops.forEach((o) => {
      this.oreGroup.remove(o.mesh);
      o.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    });
    this.oreDrops = [];

    this.claimGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
}
