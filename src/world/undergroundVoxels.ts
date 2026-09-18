import * as THREE from 'three';
import { Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';
import { createGoldVeinStandardMaterial, generateNoiseTexture } from './voxelGoldShader';
import { MountainDustParticleSystem } from './mountainDustParticles';

export type SubterraneanVoxelType =
  | 'sandstone'
  | 'granite'
  | 'quartz_gold'
  | 'silver_ore'
  | 'calcite'
  | 'amethyst'
  | 'basalt'
  | 'copper'
  | 'pyrite_gravel';

export interface MineVoxel {
  id: string;
  level: number;
  gx: number;
  gy: number;
  gz: number;
  worldPos: THREE.Vector3;
  type: SubterraneanVoxelType;
  maxHealth: number;
  currentHealth: number;
  active: boolean;
  isFloor: boolean;
  isWall: boolean;
  meshType: SubterraneanVoxelType;
  instanceIndex: number;
  oreYield: number; // in ounces of gold / mineral value
  strataDepth: number; // depth in meters below surface
}

export interface VoxelDebris {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface PlacedTimberBent {
  id: string;
  position: THREE.Vector3;
  rotationY: number;
  level: number;
  mesh: THREE.Group;
}

export interface ShaftSinkingStats {
  currentLevel: number;
  currentDepth: number;
  targetDepth: number;
  progressPercent: number;
  activeFloorVoxels: number;
  totalFloorVoxels: number;
  goldMinedInLevel: number;
  timberSetsPlaced: number;
  breakthroughReady: boolean;
  strataName: string;
  targetedVoxel: {
    type: SubterraneanVoxelType;
    name: string;
    health: number;
    maxHealth: number;
    oreYield: number;
    isFloor: boolean;
    strataDepth: number;
  } | null;
}

export class UndergroundVoxelEngine {
  // True tactile mini-voxels: 0.25m (25 cm = ~10 inches) cubic blocks!
  public static readonly VOXEL_SIZE = 0.25;

  private scene: THREE.Scene;
  public group: THREE.Group = new THREE.Group();
  private debrisGroup: THREE.Group = new THREE.Group();
  private timbersGroup: THREE.Group = new THREE.Group();
  private cribbingGroup: THREE.Group = new THREE.Group();
  private pitLadderGroup: THREE.Group = new THREE.Group();

  // Instanced Meshes organized by SubterraneanVoxelType
  private instancedMeshes: Map<SubterraneanVoxelType, THREE.InstancedMesh> = new Map();
  private instanceToVoxel: Map<SubterraneanVoxelType, MineVoxel[]> = new Map();
  private materials: Record<SubterraneanVoxelType, THREE.MeshStandardMaterial>;
  private noiseTexture: THREE.DataTexture;

  // Active Voxels collection & spatial lookup
  public voxels: MineVoxel[] = [];
  public voxelsByKey: Map<string, MineVoxel> = new Map(); // key = `${level}_${gx}_${gy}_${gz}`
  private debrisList: VoxelDebris[] = [];
  public placedTimbers: PlacedTimberBent[] = [];

  // Wireframe highlight box with glowing corners for targeted mini-voxel
  private targetBoxMesh: THREE.LineSegments;
  private cornerGlowMesh: THREE.Group = new THREE.Group();
  public targetedVoxel: MineVoxel | null = null;

  // Center coordinate of current subterranean shaft
  public shaftCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public surfaceY = 50;
  public currentLevel = 1;
  public baseStratumDepth = 8.5;
  public targetBreakthroughDepth = 12.5;

  // Statistics & Progress tracking
  public goldMinedInLevel = 0;
  public initialFloorVoxelCount = 0;
  private timberCribbingSetsCreated = 0;
  public dustParticleSystem?: MountainDustParticleSystem;

  constructor(scene: THREE.Scene, dustParticles?: MountainDustParticleSystem) {
    this.scene = scene;
    this.dustParticleSystem = dustParticles;
    this.noiseTexture = generateNoiseTexture(256);

    // Initialize mineral and rock materials with custom shader & procedural detail
    this.materials = this.createVoxelMaterials();

    // Setup visual targeting reticle wireframe sized to mini voxel
    const vs = UndergroundVoxelEngine.VOXEL_SIZE;
    const boxGeo = new THREE.BoxGeometry(vs * 1.05, vs * 1.05, vs * 1.05);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffd700,
      linewidth: 2,
      depthTest: true,
      transparent: true,
      opacity: 0.9,
    });
    this.targetBoxMesh = new THREE.LineSegments(edges, lineMat);
    this.targetBoxMesh.visible = false;

    // Corner brackets for high-precision tactile targeting
    this.setupCornerBrackets(vs);

    this.group.add(this.debrisGroup);
    this.group.add(this.timbersGroup);
    this.group.add(this.cribbingGroup);
    this.group.add(this.pitLadderGroup);
    this.group.add(this.targetBoxMesh);
    this.group.add(this.cornerGlowMesh);
    this.scene.add(this.group);
  }

  public setDustParticleSystem(ps: MountainDustParticleSystem) {
    this.dustParticleSystem = ps;
  }

  private setupCornerBrackets(vs: number) {
    const cornerMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const cSize = vs * 0.12;
    const cThick = vs * 0.035;
    const half = (vs * 1.05) / 2;

    const corners = [
      [-half, -half, -half],
      [half, -half, -half],
      [-half, half, -half],
      [half, half, -half],
      [-half, -half, half],
      [half, -half, half],
      [-half, half, half],
      [half, half, half],
    ];

    corners.forEach(([cx, cy, cz]) => {
      const cBox = new THREE.Mesh(new THREE.BoxGeometry(cSize, cThick, cThick), cornerMat);
      cBox.position.set(cx, cy, cz);
      this.cornerGlowMesh.add(cBox);
    });
    this.cornerGlowMesh.visible = false;
  }

  private createVoxelMaterials(): Record<SubterraneanVoxelType, THREE.MeshStandardMaterial> {
    const timeUniform = { value: 0 };

    // Authentic matte country rocks (no glowing gold veins)
    const sandstone = new THREE.MeshStandardMaterial({
      color: 0x94603e, // Peralta red-ochre sandstone / dacite
      roughness: 0.94,
      metalness: 0.02,
    });

    const granite = new THREE.MeshStandardMaterial({
      color: 0x44403c, // Precambrian granite bedrock
      roughness: 0.92,
      metalness: 0.04,
    });

    const basalt = new THREE.MeshStandardMaterial({
      color: 0x222022, // Deep volcanic caldera basalt
      roughness: 0.88,
      metalness: 0.05,
    });

    const pyrite_gravel = new THREE.MeshStandardMaterial({
      color: 0x5a4836, // Friable iron-stained gravel
      roughness: 0.88,
      metalness: 0.12,
    });

    // Rare hydrothermal veins with procedural metallic reflections
    const { material: quartz_gold } = createGoldVeinStandardMaterial({
      baseColor: 0xf0ede6, // Milky hydrothermal quartz matrix
      roughness: 0.28,
      metalness: 0.90,
      veinIntensity: 2.2,
      noiseTexture: this.noiseTexture,
      sharedTimeUniform: timeUniform,
    });

    const { material: silver_ore } = createGoldVeinStandardMaterial({
      baseColor: 0x7c858e, // Peralta silver galena ore
      roughness: 0.38,
      metalness: 0.82,
      veinIntensity: 1.1,
      noiseTexture: this.noiseTexture,
      sharedTimeUniform: timeUniform,
    });

    const calcite = new THREE.MeshStandardMaterial({
      color: 0xeae4d8, // Calcite crystal / dolomite fault
      roughness: 0.45,
      metalness: 0.08,
    });

    const amethyst = new THREE.MeshStandardMaterial({
      color: 0x5e2968, // Imperial amethyst geode
      roughness: 0.25,
      metalness: 0.25,
    });

    const copper = new THREE.MeshStandardMaterial({
      color: 0x9e4a2c, // Native copper ribbon
      roughness: 0.35,
      metalness: 0.78,
    });

    const iron_ore = new THREE.MeshStandardMaterial({
      color: 0x332822, // Magnetite iron
      roughness: 0.82,
      metalness: 0.42,
    });

    return {
      sandstone,
      granite,
      quartz_gold,
      silver_ore,
      calcite,
      amethyst,
      basalt,
      copper,
      pyrite_gravel,
    };
  }

  // Generate granular mini-voxels for the shaft sinking pit and drift walls
  public generateLevelVoxels(
    level: number,
    center: Vector3D,
    surfaceY: number,
    depthMeters: number
  ) {
    this.currentLevel = level;
    this.shaftCenter.set(center.x, surfaceY - depthMeters, center.z);
    this.surfaceY = surfaceY;
    this.baseStratumDepth = depthMeters;
    this.targetBreakthroughDepth = depthMeters + 2.0; // 2.0m of vertical sinking bedrock
    this.goldMinedInLevel = 0;
    this.timberCribbingSetsCreated = 0;
    this.cribbingGroup.clear();

    // Filter out previous voxels for this level if regenerating
    this.voxels = this.voxels.filter((v) => v.level !== level);
    for (const [key, v] of this.voxelsByKey.entries()) {
      if (v.level === level) {
        this.voxelsByKey.delete(key);
      }
    }

    const vs = UndergroundVoxelEngine.VOXEL_SIZE;
    const floorY = this.shaftCenter.y;
    const newLevelVoxels: MineVoxel[] = [];

    // =========================================================================
    // 1. VERTICAL SINKING SHAFT PIT MINI-VOXELS
    // =========================================================================
    // Pit Span: 3.0m x 3.0m collar area
    // In 0.25m mini voxels: gx from -6 to +5 (12 voxels wide, 12 in Z = 144 per layer)
    // Sinking depth: 8 vertical layers (8 * 0.25m = 2.0m depth of solid sinkable bedrock)
    // Total pit mini-voxels = 144 * 8 = 1,152 mini voxels!
    const shaftHalfSpan = 6; // -6 to +5 => 12 voxels = 3.0m wide pit
    const shaftDepthLayers = 8; // 8 * 0.25m = 2.0m sinkable bedrock

    for (let gx = -shaftHalfSpan; gx < shaftHalfSpan; gx++) {
      for (let gz = -shaftHalfSpan; gz < shaftHalfSpan; gz++) {
        for (let gy = 0; gy < shaftDepthLayers; gy++) {
          const wx = this.shaftCenter.x + (gx + 0.5) * vs;
          const wy = floorY - gy * vs - vs * 0.5; // Top layer flush with floor
          const wz = this.shaftCenter.z + (gz + 0.5) * vs;

          // Multi-frequency noise for rich, organic mineral veins
          const veinNoise = Math.sin(wx * 1.8 + wz * 1.5 + gy * 0.9);
          const goldNoise = Math.cos(wx * 2.2 - wz * 1.9 + gy * 1.4);
          const faultNoise = Math.sin(wx * 0.9 + wz * 2.1 - gy * 1.2);

          let vType: SubterraneanVoxelType = 'sandstone';
          let oreYield = 0;
          let maxHealth = 1;

          if (level === 0) {
            // Surface shaft collar pit (0.0m to -2.0m)
            vType = gy <= 2 ? 'sandstone' : gy <= 5 ? 'pyrite_gravel' : 'granite';
            if (goldNoise > 0.90 && Math.abs(veinNoise) < 0.22) {
              vType = 'quartz_gold';
              oreYield = 1.2 + Math.random() * 1.5;
              maxHealth = 2;
            } else if (veinNoise > 0.82) {
              vType = 'calcite';
            }
          } else if (level === 1) {
            // Strata 1: Peralta Sandstone & Apache Leap Dacite
            vType = gy >= 5 ? 'granite' : 'sandstone';
            if (goldNoise > 0.88 && Math.abs(veinNoise) < 0.22) {
              vType = 'quartz_gold';
              oreYield = 2.5 + Math.random() * 2.5;
              maxHealth = 2;
            } else if (veinNoise > 0.85) {
              vType = 'calcite';
            } else if (faultNoise > 0.85) {
              vType = 'pyrite_gravel';
            }
          } else if (level === 2) {
            // Strata 2: Peralta Red Sandstone & Pinal Schist
            vType = gy >= 4 ? 'granite' : 'sandstone';
            if (goldNoise > 0.86 && Math.abs(veinNoise) < 0.20) {
              vType = 'quartz_gold';
              oreYield = 4.5 + Math.random() * 3.5;
              maxHealth = 2;
            } else if (veinNoise > 0.84) {
              vType = 'silver_ore';
              oreYield = 3.2 + Math.random() * 2.2;
              maxHealth = 2;
            } else if (faultNoise > 0.85) {
              vType = 'calcite';
            }
          } else if (level === 3) {
            // Strata 3: Imperial Granodiorite Bedrock
            vType = 'granite';
            maxHealth = 2;
            if (goldNoise > 0.85 && Math.abs(veinNoise) < 0.20) {
              vType = 'quartz_gold';
              oreYield = 7.5 + Math.random() * 4.5;
            } else if (veinNoise > 0.88) {
              vType = 'amethyst';
              oreYield = 6.0 + Math.random() * 3.5;
            } else if (faultNoise > 0.86) {
              vType = 'calcite';
              maxHealth = 1;
            }
          } else if (level === 4) {
            // Strata 4: Superstition Basalt Caldera
            vType = 'basalt';
            maxHealth = 2;
            if (goldNoise > 0.84 && Math.abs(veinNoise) < 0.18) {
              vType = 'quartz_gold';
              oreYield = 12.0 + Math.random() * 6.0;
            } else if (veinNoise > 0.86) {
              vType = 'silver_ore';
              oreYield = 7.5 + Math.random() * 4.0;
            } else if (faultNoise > 0.86) {
              vType = 'copper';
              oreYield = 5.0 + Math.random() * 3.0;
            }
          } else {
            // Strata 5+: Deep Plutonic Bedrock
            vType = level >= 6 ? 'basalt' : 'granite';
            maxHealth = 2;
            if (goldNoise > 0.82 && Math.abs(veinNoise) < 0.20) {
              vType = 'quartz_gold';
              oreYield = 18.0 + Math.random() * 9.0;
            } else if (veinNoise > 0.85) {
              vType = 'copper';
              oreYield = 10.0 + Math.random() * 5.0;
            }
          }

          const voxelId = `L${level}_floor_${gx}_${gy}_${gz}`;

          const voxel: MineVoxel = {
            id: voxelId,
            level,
            gx,
            gy,
            gz,
            worldPos: new THREE.Vector3(wx, wy, wz),
            type: vType,
            maxHealth,
            currentHealth: maxHealth,
            active: true,
            isFloor: true,
            isWall: false,
            meshType: vType,
            instanceIndex: -1,
            oreYield,
            strataDepth: depthMeters + gy * vs,
          };

          newLevelVoxels.push(voxel);
          this.voxelsByKey.set(`${level}_${gx}_${gy}_${gz}`, voxel);
        }
      }
    }

    this.initialFloorVoxelCount = newLevelVoxels.length;

    this.voxels.push(...newLevelVoxels);
    this.rebuildInstancedMeshes();
    this.updatePitLaddersAndCribbing();
  }

  // Rebuild the high-performance THREE.InstancedMesh clusters for all active voxels
  public rebuildInstancedMeshes() {
    // Remove old instanced meshes
    for (const mesh of this.instancedMeshes.values()) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
    }
    this.instancedMeshes.clear();
    this.instanceToVoxel.clear();

    const vs = UndergroundVoxelEngine.VOXEL_SIZE;
    // Organic faceted bedrock rubble geometry (instead of flat dice cubes)
    const rockGeo = new THREE.DodecahedronGeometry(vs * 0.58, 0);

    // Group active voxels for current level by type
    const byType: Map<SubterraneanVoxelType, MineVoxel[]> = new Map();
    for (const v of this.voxels) {
      if (v.level === this.currentLevel && v.active) {
        if (!byType.has(v.meshType)) {
          byType.set(v.meshType, []);
        }
        byType.get(v.meshType)!.push(v);
      }
    }

    const dummy = new THREE.Object3D();

    for (const [type, voxelsOfType] of byType.entries()) {
      if (voxelsOfType.length === 0) continue;

      const instMesh = new THREE.InstancedMesh(rockGeo, this.materials[type], voxelsOfType.length);
      instMesh.castShadow = true;
      instMesh.receiveShadow = true;

      this.instanceToVoxel.set(type, voxelsOfType);

      voxelsOfType.forEach((v, idx) => {
        v.instanceIndex = idx;
        dummy.position.copy(v.worldPos);
        dummy.rotation.set((v.gx % 4) * 0.35, (v.gz % 3) * 0.45, (v.gy % 2) * 0.25);
        dummy.scale.set(1.02, 0.96, 1.02);
        dummy.updateMatrix();
        instMesh.setMatrixAt(idx, dummy.matrix);
      });

      instMesh.instanceMatrix.needsUpdate = true;
      this.instancedMeshes.set(type, instMesh);
      this.group.add(instMesh);
    }
  }

  // Raycast from camera to determine which mini voxel the player is looking at
  public updateReticle(camera: THREE.Camera, maxRange = 5.2): MineVoxel | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = maxRange;

    // Check intersection with active instanced meshes
    const meshes = Array.from(this.instancedMeshes.values());
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitMesh = hit.object as THREE.InstancedMesh;
      const instanceId = hit.instanceId;

      if (instanceId !== undefined) {
        // Fast direct lookup by mesh type and instanceId
        for (const [vType, mesh] of this.instancedMeshes.entries()) {
          if (mesh === hitMesh) {
            const list = this.instanceToVoxel.get(vType);
            const voxel = list ? list[instanceId] : null;
            if (voxel && voxel.active && voxel.level === this.currentLevel) {
              this.targetedVoxel = voxel;
              this.targetBoxMesh.position.copy(voxel.worldPos);
              this.targetBoxMesh.visible = true;
              this.cornerGlowMesh.position.copy(voxel.worldPos);
              this.cornerGlowMesh.visible = true;
              return voxel;
            }
            break;
          }
        }
      }
    }

    // Fallback: If looking downwards near the shaft pit floor, target closest exposed floor voxel
    const camPos = camera.position;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    if (dir.y < -0.25) {
      const best = this.findClosestFloorVoxelInView(camPos, dir, maxRange);
      if (best) {
        this.targetedVoxel = best;
        this.targetBoxMesh.position.copy(best.worldPos);
        this.targetBoxMesh.visible = true;
        this.cornerGlowMesh.position.copy(best.worldPos);
        this.cornerGlowMesh.visible = true;
        return best;
      }
    }

    this.targetedVoxel = null;
    this.targetBoxMesh.visible = false;
    this.cornerGlowMesh.visible = false;
    return null;
  }

  private findClosestFloorVoxelInView(
    camPos: THREE.Vector3,
    lookDir: THREE.Vector3,
    maxRange: number
  ): MineVoxel | null {
    let bestVoxel: MineVoxel | null = null;
    let bestScore = -1;

    for (const v of this.voxels) {
      if (v.level === this.currentLevel && v.active && v.isFloor) {
        // Check if top face of voxel is exposed
        const aboveKey = `${v.level}_${v.gx}_${v.gy - 1}_${v.gz}`;
        const aboveVoxel = this.voxelsByKey.get(aboveKey);
        if (aboveVoxel && aboveVoxel.active) continue; // Not exposed on top

        const toVoxel = v.worldPos.clone().sub(camPos);
        const dist = toVoxel.length();
        if (dist > maxRange) continue;

        toVoxel.normalize();
        const dot = lookDir.dot(toVoxel);
        if (dot > 0.72 && dot > bestScore) {
          bestScore = dot;
          bestVoxel = v;
        }
      }
    }
    return bestVoxel;
  }

  // Strike and mine a mini-voxel with multi-voxel cleave / explosion mechanics!
  public strikeVoxel(
    voxel: MineVoxel,
    tool: string = 'pickaxe'
  ): {
    destroyed: boolean;
    remainingHealth: number;
    oreYield: number;
    oreType: string;
    message: string;
    isShaftSink: boolean;
    voxelsClearedCount: number;
  } {
    // Pickaxe deals 2 dmg to primary voxel
    // Shovel deals 1 dmg to soft voxels
    // Dynamite deals massive explosive damage in a 1.25m blast sphere!
    const isDynamite = tool === 'dynamite';
    const isShovel = tool === 'shovel';
    const primaryDamage = isDynamite ? 10 : isShovel ? 1 : 2;

    voxel.currentHealth -= primaryDamage;

    // Strike sounds & physical chips
    if (isDynamite) {
      soundEngine.playDynamiteExplosion();
    } else if (voxel.type === 'quartz_gold' || voxel.type === 'amethyst') {
      soundEngine.playOreChime();
      soundEngine.playRockChisel();
    } else {
      soundEngine.playRockChisel();
    }

    this.spawnVoxelDebris(voxel.worldPos, voxel.type, isDynamite ? 24 : 8);

    // High-Fidelity Subterranean Dust Cloud, Mineral Silt & Cleavage Particles
    if (this.dustParticleSystem) {
      const strikeNormal = voxel.isFloor
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(this.shaftCenter.x - voxel.worldPos.x, 0.15, this.shaftCenter.z - voxel.worldPos.z).normalize();
      if (strikeNormal.lengthSq() < 0.01) strikeNormal.set(0, 1, 0);

      this.dustParticleSystem.triggerMountainStrike(
        voxel.worldPos,
        strikeNormal,
        voxel.type,
        isDynamite ? 2.6 : isShovel ? 0.75 : 1.35,
        this.shaftCenter.y
      );
    }

    let totalOre = 0;
    let voxelsCleared = 0;

    if (voxel.currentHealth <= 0) {
      voxel.active = false;
      voxel.currentHealth = 0;
      voxelsCleared++;
      totalOre += voxel.oreYield;
      this.goldMinedInLevel += voxel.oreYield;

      // Hide instance in InstancedMesh
      const instMesh = this.instancedMeshes.get(voxel.meshType);
      if (instMesh && voxel.instanceIndex >= 0) {
        const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
        instMesh.setMatrixAt(voxel.instanceIndex, zeroMat);
        instMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // =========================================================================
    // MULTI-VOXEL CLEAVE / BLAST MECHANICS:
    // =========================================================================
    // 1. Dynamite: Destroys all mini-voxels within a 1.25m sphere!
    // 2. Pickaxe: Cleaves adjacent mini-voxels within 0.38m radius (1 dmg each)
    const blastRadius = isDynamite ? 1.25 : 0.38;
    const splashDamage = isDynamite ? 10 : 1;

    for (const other of this.voxels) {
      if (other !== voxel && other.level === this.currentLevel && other.active) {
        const dist = other.worldPos.distanceTo(voxel.worldPos);
        if (dist <= blastRadius) {
          other.currentHealth -= splashDamage;
          if (other.currentHealth <= 0) {
            other.active = false;
            other.currentHealth = 0;
            voxelsCleared++;
            totalOre += other.oreYield;
            this.goldMinedInLevel += other.oreYield;

            const otherInst = this.instancedMeshes.get(other.meshType);
            if (otherInst && other.instanceIndex >= 0) {
              const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
              otherInst.setMatrixAt(other.instanceIndex, zeroMat);
              otherInst.instanceMatrix.needsUpdate = true;
            }

            this.spawnVoxelDebris(other.worldPos, other.type, 4);

            if (this.dustParticleSystem) {
              const otherNormal = new THREE.Vector3(other.worldPos.x - voxel.worldPos.x, 0.2, other.worldPos.z - voxel.worldPos.z).normalize();
              if (otherNormal.lengthSq() < 0.01) otherNormal.set(0, 1, 0);
              this.dustParticleSystem.triggerMountainStrike(
                other.worldPos,
                otherNormal,
                other.type,
                isDynamite ? 1.4 : 0.6,
                this.shaftCenter.y
              );
            }
          }
        }
      }
    }

    this.updatePitLaddersAndCribbing();

    const isShaftSink = voxel.isFloor;

    if (voxelsCleared > 0) {
      let oreDesc = '';
      if (totalOre > 0) {
        soundEngine.playDiscovery();
        oreDesc = ` 🪙 Yielded +${totalOre.toFixed(1)} oz ${voxel.type.toUpperCase()}!`;
      }

      const countDesc = voxelsCleared > 1 ? ` (${voxelsCleared} mini-voxels excavated!)` : '';
      const actionDesc = isShaftSink
        ? `Sunk shaft floor deeper (-${voxel.strataDepth.toFixed(2)}m)${countDesc}!`
        : `Chiseled drift face${countDesc}!`;

      return {
        destroyed: true,
        remainingHealth: 0,
        oreYield: totalOre,
        oreType: voxel.type,
        message: `⛏️ ${actionDesc}${oreDesc}`,
        isShaftSink,
        voxelsClearedCount: voxelsCleared,
      };
    }

    return {
      destroyed: false,
      remainingHealth: voxel.currentHealth,
      oreYield: 0,
      oreType: voxel.type,
      message: `⛏️ Chipping ${voxel.type.toUpperCase()}: ${voxel.currentHealth}/${voxel.maxHealth} hits left.`,
      isShaftSink,
      voxelsClearedCount: 0,
    };
  }

  // Mine the closest topmost active floor mini-voxel to sink the shaft downward
  public sinkShaftDown(tool: string = 'pickaxe'): {
    destroyed: boolean;
    oreYield: number;
    oreType: string;
    depthReached: number;
    breakthroughReady: boolean;
    message: string;
    voxelsClearedCount: number;
  } {
    // Find topmost exposed floor voxel near center of the shaft
    let bestVoxel: MineVoxel | null = null;
    let minGy = 999;
    let minDist = 999;

    for (const v of this.voxels) {
      if (v.level === this.currentLevel && v.active && v.isFloor) {
        const distFromShaft = Math.hypot(v.worldPos.x - this.shaftCenter.x, v.worldPos.z - this.shaftCenter.z);
        if (v.gy < minGy || (v.gy === minGy && distFromShaft < minDist)) {
          minGy = v.gy;
          minDist = distFromShaft;
          bestVoxel = v;
        }
      }
    }

    if (!bestVoxel) {
      return {
        destroyed: false,
        oreYield: 0,
        oreType: 'Bedrock',
        depthReached: this.targetBreakthroughDepth,
        breakthroughReady: true,
        message: 'Shaft pit bedrock fully cleared! Ready for breakthrough into next layer.',
        voxelsClearedCount: 0,
      };
    }

    const res = this.strikeVoxel(bestVoxel, tool);

    // Count remaining active floor voxels
    const activeFloorCount = this.voxels.filter(
      (v) => v.level === this.currentLevel && v.active && v.isFloor
    ).length;

    // When 80%+ of the floor mini-voxels have been sunk, breakthrough is ready!
    const breakthroughReady =
      activeFloorCount <= Math.max(12, Math.floor(this.initialFloorVoxelCount * 0.18));

    return {
      destroyed: res.destroyed,
      oreYield: res.oreYield,
      oreType: res.oreType,
      depthReached: bestVoxel.strataDepth,
      breakthroughReady,
      message: res.message,
      voxelsClearedCount: res.voxelsClearedCount,
    };
  }

  // Calculate dynamic floor elevation for player locomotion at (x, z)
  public getFloorElevationAt(x: number, z: number, currentLevel: number): number {
    if (currentLevel === 0) {
      // Check surface pit collar
      const dx = x - this.shaftCenter.x;
      const dz = z - this.shaftCenter.z;
      const pitHalf = 1.5;
      if (Math.abs(dx) <= pitHalf && Math.abs(dz) <= pitHalf) {
        return this.getVoxelPitElevationAt(x, z, currentLevel);
      }
      return this.surfaceY;
    }

    const baseFloorY = this.shaftCenter.y;
    const dx = x - this.shaftCenter.x;
    const dz = z - this.shaftCenter.z;
    const pitHalf = 1.55;

    // Check if player is standing over the floor sinking pit
    if (Math.abs(dx) <= pitHalf && Math.abs(dz) <= pitHalf) {
      return this.getVoxelPitElevationAt(x, z, currentLevel);
    }

    // Standard chamber floor
    return baseFloorY;
  }

  private getVoxelPitElevationAt(x: number, z: number, currentLevel: number): number {
    const vs = UndergroundVoxelEngine.VOXEL_SIZE;
    const baseFloorY = this.shaftCenter.y;

    // Find highest active floor voxel under this column
    let highestVoxelY = -999;
    for (const v of this.voxels) {
      if (v.level === currentLevel && v.active && v.isFloor) {
        if (Math.abs(x - v.worldPos.x) <= vs * 0.6 && Math.abs(z - v.worldPos.z) <= vs * 0.6) {
          const topFaceY = v.worldPos.y + vs * 0.5;
          if (topFaceY > highestVoxelY) {
            highestVoxelY = topFaceY;
          }
        }
      }
    }

    if (highestVoxelY !== -999) {
      return highestVoxelY;
    } else {
      // All mini-voxels at this column dug out down to maximum pit depth
      return baseFloorY - 8 * vs;
    }
  }

  // Dynamically update wooden ladder rungs and square timber cribbing frames as the shaft deepens
  private updatePitLaddersAndCribbing() {
    this.pitLadderGroup.clear();
    this.cribbingGroup.clear();

    const vs = UndergroundVoxelEngine.VOXEL_SIZE;
    const baseFloorY = this.shaftCenter.y;

    // Determine deepest excavated pit depth
    let deepestY = baseFloorY;
    for (const v of this.voxels) {
      if (v.level === this.currentLevel && !v.active && v.isFloor) {
        const bottomY = v.worldPos.y - vs * 0.5;
        if (bottomY < deepestY) {
          deepestY = bottomY;
        }
      }
    }

    const pitDepth = baseFloorY - deepestY;
    if (pitDepth <= 0.15) return;

    // 1. EXTEND SHAFT LADDER: Iron/pine rungs down the north pit wall every 0.25m!
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
    const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);

    const ladderZ = this.shaftCenter.z - 1.42;
    const ladderX = this.shaftCenter.x;

    const numRungs = Math.floor(pitDepth / vs);
    for (let r = 0; r <= numRungs; r++) {
      const rung = new THREE.Mesh(rungGeo, r % 2 === 0 ? ironMat : woodMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(ladderX, baseFloorY - r * vs - 0.1, ladderZ);
      this.pitLadderGroup.add(rung);
    }

    // 2. TIMBER CRIBBING COLLAR SETS: Every 0.50m (2 mini voxel layers), install heavy timber frame!
    const cribbingMat = new THREE.MeshStandardMaterial({ color: 0x3e2718, roughness: 0.92 });
    const beamSize = 3.05;
    const beamThick = 0.18;
    const numSets = Math.floor(pitDepth / 0.50);

    for (let s = 1; s <= numSets; s++) {
      const setY = baseFloorY - s * 0.50;
      const setGroup = new THREE.Group();

      // 4 perimeter cribbing beams
      [-beamSize / 2, beamSize / 2].forEach((bx) => {
        const bX = new THREE.Mesh(new THREE.BoxGeometry(beamThick, beamThick, beamSize + beamThick), cribbingMat);
        bX.position.set(this.shaftCenter.x + bx, setY, this.shaftCenter.z);
        setGroup.add(bX);
      });
      [-beamSize / 2, beamSize / 2].forEach((bz) => {
        const bZ = new THREE.Mesh(new THREE.BoxGeometry(beamSize + beamThick, beamThick, beamThick), cribbingMat);
        bZ.position.set(this.shaftCenter.x, setY, this.shaftCenter.z + bz);
        setGroup.add(bZ);
      });

      this.cribbingGroup.add(setGroup);
    }

    if (numSets > this.timberCribbingSetsCreated) {
      this.timberCribbingSetsCreated = numSets;
      soundEngine.playTrenchShoringConstruct();
    }
  }

  // Place historical timber support bent inside a mined tunnel
  public placeTimberBent(playerPos: THREE.Vector3, playerYaw: number): boolean {
    const bentGroup = new THREE.Group();
    bentGroup.position.set(playerPos.x, playerPos.y, playerPos.z);
    bentGroup.rotation.y = playerYaw;

    const timberMat = new THREE.MeshStandardMaterial({ color: 0x422a18, roughness: 0.92 });
    const postHeight = 2.4;
    const postWidth = 0.22;
    const capWidth = 2.0;

    // Left post
    const postL = new THREE.Mesh(new THREE.BoxGeometry(postWidth, postHeight, postWidth), timberMat);
    postL.position.set(-capWidth / 2 + postWidth / 2, postHeight / 2, 0);
    bentGroup.add(postL);

    // Right post
    const postR = new THREE.Mesh(new THREE.BoxGeometry(postWidth, postHeight, postWidth), timberMat);
    postR.position.set(capWidth / 2 - postWidth / 2, postHeight / 2, 0);
    bentGroup.add(postR);

    // Top cap beam
    const cap = new THREE.Mesh(new THREE.BoxGeometry(capWidth, postWidth, postWidth), timberMat);
    cap.position.set(0, postHeight, 0);
    bentGroup.add(cap);

    // Miner candle / lantern on cap
    const light = new THREE.PointLight(0xffa844, 1.2, 8);
    light.position.set(0, postHeight - 0.2, 0);
    bentGroup.add(light);

    this.timbersGroup.add(bentGroup);
    this.placedTimbers.push({
      id: `timber_${Date.now()}`,
      position: playerPos.clone(),
      rotationY: playerYaw,
      level: this.currentLevel,
      mesh: bentGroup,
    });

    soundEngine.playTrenchShoringConstruct();
    return true;
  }

  // Query live sinking statistics for the HUD depth gauge
  public getShaftSinkingStats(): ShaftSinkingStats {
    const vs = UndergroundVoxelEngine.VOXEL_SIZE;
    const baseFloorY = this.shaftCenter.y;

    let deepestY = baseFloorY;
    let activeFloorCount = 0;
    let totalFloorCount = 0;

    for (const v of this.voxels) {
      if (v.level === this.currentLevel && v.isFloor) {
        totalFloorCount++;
        if (v.active) {
          activeFloorCount++;
        } else {
          const bottomY = v.worldPos.y - vs * 0.5;
          if (bottomY < deepestY) {
            deepestY = bottomY;
          }
        }
      }
    }

    const sunkDistance = baseFloorY - deepestY;
    const currentDepth = this.baseStratumDepth + sunkDistance;
    const excavatedPercent = totalFloorCount > 0 ? Math.round(((totalFloorCount - activeFloorCount) / totalFloorCount) * 100) : 0;
    const breakthroughReady = activeFloorCount <= Math.max(12, Math.floor(totalFloorCount * 0.18));

    const strataNames = [
      'Surface Desert Collar',
      'Peralta Sandstone & Placer Quartz',
      'Peralta Quartz & Galena Silver',
      'Imperial Amethyst Geode & Granite Fault',
      'Superstition Caldera Basalt & Electrum',
      'Lost Dutchman Mother Lode Jackpot',
      'Subterranean Abyssal Aquifer',
    ];

    const targeted = this.targetedVoxel
      ? {
          type: this.targetedVoxel.type,
          name: this.targetedVoxel.type.replace('_', ' ').toUpperCase(),
          health: this.targetedVoxel.currentHealth,
          maxHealth: this.targetedVoxel.maxHealth,
          oreYield: this.targetedVoxel.oreYield,
          isFloor: this.targetedVoxel.isFloor,
          strataDepth: this.targetedVoxel.strataDepth,
        }
      : null;

    return {
      currentLevel: this.currentLevel,
      currentDepth,
      targetDepth: this.targetBreakthroughDepth,
      progressPercent: excavatedPercent,
      activeFloorVoxels: activeFloorCount,
      totalFloorVoxels: totalFloorCount,
      goldMinedInLevel: this.goldMinedInLevel,
      timberSetsPlaced: this.timberCribbingSetsCreated,
      breakthroughReady,
      strataName: strataNames[this.currentLevel] || `Level ${this.currentLevel} Strata`,
      targetedVoxel: targeted,
    };
  }

  // Spawn dynamic tumbling mini-debris particles
  private spawnVoxelDebris(pos: THREE.Vector3, type: SubterraneanVoxelType, count = 8) {
    const colorMap: Record<SubterraneanVoxelType, number[]> = {
      sandstone: [0x9b6b43, 0xb87d4f, 0x6e4626],
      granite: [0x48423d, 0x635b54, 0x2e2925],
      quartz_gold: [0xffd700, 0xf7e9b0, 0xd4af37, 0xffffff],
      silver_ore: [0x828b94, 0xa4b0bc, 0x5a6066],
      calcite: [0xf4eee1, 0xd8ceb8, 0xffffff],
      amethyst: [0x6b3074, 0x93439f, 0x3d1743],
      basalt: [0x1e1c1d, 0x2e2b2d, 0x0f0e0f],
      copper: [0xab5838, 0xcc6f4b, 0x73361e],
      pyrite_gravel: [0x7a6344, 0xa3855c, 0x4a3a24],
    };

    const colors = colorMap[type] || [0x888888];

    for (let i = 0; i < count; i++) {
      const size = 0.03 + Math.random() * 0.05;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const geo = Math.random() < 0.6 ? new THREE.BoxGeometry(size, size, size) : new THREE.DodecahedronGeometry(size, 0);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: type === 'quartz_gold' ? 0.2 : 0.85,
        metalness: type === 'quartz_gold' || type === 'silver_ore' ? 0.85 : 0.1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.2,
        pos.y + (Math.random() - 0.5) * 0.2,
        pos.z + (Math.random() - 0.5) * 0.2
      );
      this.debrisGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 2.8;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        1.8 + Math.random() * 2.6,
        Math.sin(angle) * speed
      );

      this.debrisList.push({
        mesh,
        velocity: vel,
        rotSpeed: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
        life: 0,
        maxLife: 0.7 + Math.random() * 0.5,
      });
    }
  }

  // Animation and physics update loop
  public update(delta: number) {
    // Update debris physics
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const p = this.debrisList[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.debrisGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.debrisList.splice(i, 1);
        continue;
      }

      p.velocity.y -= 18.0 * delta; // Gravity
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.rotation.x += p.rotSpeed.x * delta;
      p.mesh.rotation.y += p.rotSpeed.y * delta;
      p.mesh.rotation.z += p.rotSpeed.z * delta;

      const scale = 1.0 - p.life / p.maxLife;
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  public dispose() {
    this.scene.remove(this.group);
    this.group.clear();
    this.instancedMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.instancedMeshes.clear();
    this.instanceToVoxel.clear();
    this.noiseTexture.dispose();
  }
}
