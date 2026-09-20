import * as THREE from 'three';
import { BuiltStructure, ClaimInfo, MineStructureType, PortalExcavationState, StructureBlueprint, TerritoryClaim, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';
import { MountainDustParticleSystem } from './mountainDustParticles';
import { createClaimNoticePlateTexture, createClaimBillboardSprite } from './claimMarkerTextures';
import { isTortillaFlatTownLimits } from './townBoundaries';

export interface StructurePlacementValidationContext {
  getTerrainHeight: (x: number, z: number) => number;
  isUnderground?: boolean;
  currentLevel?: number;
  foliageManager?: any;
  undergroundLayers?: any;
  builtStructures?: BuiltStructure[];
  playerGold?: number;
  playerRocks?: number;
  playerWood?: number;
}

export interface StructurePlacementValidationResult {
  valid: boolean;
  reason?: string;
  slopeDegrees?: number;
  terrainHeightDelta?: number;
}

export function getTerrainSlopeAt(
  x: number,
  z: number,
  getTerrainHeight: (x: number, z: number) => number,
  radius: number = 2.2
): { maxSlope: number; slopeDegrees: number; heightDelta: number } {
  const hC = getTerrainHeight(x, z);
  const angles = [
    0,
    Math.PI / 4,
    Math.PI / 2,
    (3 * Math.PI) / 4,
    Math.PI,
    (5 * Math.PI) / 4,
    (3 * Math.PI) / 2,
    (7 * Math.PI) / 4,
  ];
  let minH = hC;
  let maxH = hC;
  let maxGrad = 0;

  for (const a of angles) {
    const sx = x + Math.cos(a) * radius;
    const sz = z + Math.sin(a) * radius;
    const sh = getTerrainHeight(sx, sz);
    if (sh < minH) minH = sh;
    if (sh > maxH) maxH = sh;
    const grad = Math.abs(sh - hC) / radius;
    if (grad > maxGrad) maxGrad = grad;
  }

  const heightDelta = maxH - minH;
  const slopeDegrees = (Math.atan(maxGrad) * 180) / Math.PI;
  return { maxSlope: maxGrad, slopeDegrees, heightDelta };
}

export function validateStructurePlacement(
  type: MineStructureType | 'stake',
  pos: { x: number; y: number; z: number },
  rotationY: number,
  ctx: StructurePlacementValidationContext
): StructurePlacementValidationResult {
  if (type === 'stake') {
    if (isTortillaFlatTownLimits(pos.x, pos.z, 20)) {
      return {
        valid: false,
        reason: '⚠️ Cannot stake a mining claim within Tortilla Flat settlement limits! Frontier municipal law prohibits mining claims in settlement territory.',
      };
    }
    return { valid: true };
  }

  // Tortilla Flat Settlement Sanctuary & Municipality Constraint: Mine construction prohibited
  if (isTortillaFlatTownLimits(pos.x, pos.z, 0)) {
    return {
      valid: false,
      reason: '⚠️ Cannot build mine structures within Tortilla Flat settlement limits! Frontier municipal law prohibits mining operations and shaft excavation in town. Venture into the Superstition wilderness to build your mine.',
    };
  }

  const bp = STRUCTURE_BLUEPRINTS[type];
  if (!bp) return { valid: true };

  const isUnderground = Boolean(ctx.isUnderground || (ctx.currentLevel && ctx.currentLevel > 0));

  // 1. Underground level placement constraints
  if (isUnderground) {
    if (type === 'headframe_hoist' || type === 'deep_shaft') {
      return {
        valid: false,
        reason: '⚠️ Cannot erect a surface hoisting headframe underground! Headframes must be built on open surface ground to sink vertical shafts.',
      };
    }
    if (type === 'timber_portal') {
      return {
        valid: false,
        reason: '⚠️ Timber mine portals are for surface mountain entry! Use Pickaxe or Dynamite directly on cavern walls to dig underground drifts.',
      };
    }
    if (type === 'campfire' || type === 'prospector_camp' || type === 'assay_forge' || type === 'sluice_box') {
      return {
        valid: false,
        reason: `⚠️ Cannot build ${bp.name} underground in mine drifts. Build at surface camp.`,
      };
    }
  }

  // 2. Mountain Tunnel Interior Constraint
  const insideMtnTunnel = Boolean(
    ctx.foliageManager?.mountainHoleManager?.isInsideMountainTunnel(pos.x, pos.y, pos.z, 1.2)?.inside ||
    ctx.undergroundLayers?.holeManager?.isInsideMountainTunnel(pos.x, pos.y, pos.z, 1.2)?.inside
  );

  if (insideMtnTunnel) {
    if (type === 'headframe_hoist' || type === 'deep_shaft') {
      return {
        valid: false,
        reason: '⚠️ Cannot erect headframe hoist inside a mountain tunnel! Headframes require open surface skies for vertical hoisting sheaves.',
      };
    }
    if (type === 'timber_portal') {
      return {
        valid: false,
        reason: '⚠️ Cannot place an entrance portal inside an existing excavated tunnel!',
      };
    }
  }

  // 3. Mountain Outcroppings & Bedrock Crags Constraint
  if (ctx.foliageManager?.rockColliders && Array.isArray(ctx.foliageManager.rockColliders)) {
    for (const c of ctx.foliageManager.rockColliders) {
      if (!c.active || c.type !== 'mountain') continue;
      const dist = Math.hypot(pos.x - c.x, pos.z - c.z);
      const halfSize = (type === 'headframe_hoist' || type === 'deep_shaft') ? 2.2 : (type === 'frontier_torch' ? 0.3 : 1.4);

      if (type === 'headframe_hoist' || type === 'deep_shaft') {
        if (dist < c.radius + halfSize) {
          return {
            valid: false,
            reason: '⚠️ Cannot erect headframe on solid mountain rock outcroppings! The hoist tower and vertical shaft collar require open ground clear of cliff crags.',
          };
        }
      } else if (type === 'campfire' || type === 'prospector_camp' || type === 'assay_forge') {
        if (dist < c.radius + halfSize) {
          return {
            valid: false,
            reason: '⚠️ Cannot build inside solid mountain rock outcroppings.',
          };
        }
      }
    }
  }

  // 4. Terrain Slope & Mountain Cliff Constraints
  const footprintRadius = (type === 'headframe_hoist' || type === 'deep_shaft') ? 2.4 : 1.8;
  const { slopeDegrees, heightDelta } = getTerrainSlopeAt(pos.x, pos.z, ctx.getTerrainHeight, footprintRadius);

  if (type === 'headframe_hoist' || type === 'deep_shaft') {
    // Headframe requires relatively level ground (under 16° slope / 1.6m elevation variance across footprint)
    if (slopeDegrees > 16.0 || heightDelta > 1.6) {
      return {
        valid: false,
        slopeDegrees,
        terrainHeightDelta: heightDelta,
        reason: `⚠️ Ground is too steep (${Math.round(slopeDegrees)}° slope)! Headframes require open, level ground (under 16° slope) to sink a vertical shaft collar. Build a Timber Adit Portal for mountain slopes instead.`,
      };
    }
  } else if (type === 'sluice_box') {
    if (slopeDegrees > 22.0 || heightDelta > 2.0) {
      return {
        valid: false,
        slopeDegrees,
        terrainHeightDelta: heightDelta,
        reason: `⚠️ Ground is too steep (${Math.round(slopeDegrees)}° slope)! Sluice flumes require gentle ground (under 22° slope) to run water riffles.`,
      };
    }
  } else if (type === 'campfire' || type === 'prospector_camp') {
    if (slopeDegrees > 26.0) {
      return {
        valid: false,
        slopeDegrees,
        terrainHeightDelta: heightDelta,
        reason: `⚠️ Ground is too steep (${Math.round(slopeDegrees)}° slope) to safely pitch camp.`,
      };
    }
  }

  // 5. Perimeter Mountain Massif & Needle Summit Crags
  const distFromCenter = Math.hypot(pos.x, pos.z);
  if (type === 'headframe_hoist' || type === 'deep_shaft') {
    if (distFromCenter > 192) {
      return {
        valid: false,
        reason: '⚠️ Cannot erect headframe on the jagged Superstition perimeter mountain wall! Build on valley floors, washes, or open plateaus.',
      };
    }
    const distToNeedle = Math.hypot(pos.x - 80, pos.z - 15);
    if (distToNeedle < 28) {
      return {
        valid: false,
        reason: "⚠️ Cannot erect headframe on the sheer volcanic pinnacle of Weaver's Needle!",
      };
    }
  }

  // 6. Proximity to Existing Mine Shafts
  if (ctx.builtStructures && (type === 'headframe_hoist' || type === 'deep_shaft')) {
    for (const s of ctx.builtStructures) {
      if (s.type === 'headframe_hoist' || s.type === 'deep_shaft') {
        const d = Math.hypot(pos.x - s.position.x, pos.z - s.position.z);
        if (d < 8.5) {
          return {
            valid: false,
            reason: '⚠️ Too close to an existing mine shaft collar!',
          };
        }
      }
    }
  }

  // 7. Resource Cost Validation
  const goldCost = bp.goldCost || 0;
  const rockCost = bp.rockCost || 0;
  const woodCost = bp.woodCost || 0;

  if (type !== 'timber_portal') {
    if (
      (ctx.playerGold !== undefined && ctx.playerGold < goldCost) ||
      (ctx.playerRocks !== undefined && ctx.playerRocks < rockCost) ||
      (ctx.playerWood !== undefined && ctx.playerWood < woodCost)
    ) {
      return {
        valid: false,
        reason: `Need ${goldCost} oz Gold, ${rockCost} Rocks & ${woodCost} Wood to build ${bp.name}.`,
      };
    }
  }

  return {
    valid: true,
    slopeDegrees,
    terrainHeightDelta: heightDelta,
  };
}

export const STRUCTURE_BLUEPRINTS: Record<MineStructureType, StructureBlueprint> = {
  timber_portal: {
    type: 'timber_portal',
    name: 'Timber Mine Portal',
    description: 'Heavy pine timber adit entrance anchored into bedrock with lantern lighting.',
    goldCost: 4,
    rockCost: 10,
    dimensions: { width: 4.8, height: 5.2, depth: 3.5 },
    benefit: 'Excavates and reinforces the main mine entrance drift and underground access.',
  },
  headframe_hoist: {
    type: 'headframe_hoist',
    name: 'Shaft Headframe & Hoist',
    description: 'Towering A-frame timber hoist with spinning sheave wheel & deep ore bucket.',
    goldCost: 4,
    rockCost: 12,
    dimensions: { width: 4.2, height: 7.6, depth: 4.2 },
    benefit: 'Hauls deep subterranean ore loads; periodic bonus gold deposits.',
  },
  sluice_box: {
    type: 'sluice_box',
    name: 'Gold Washing Sluice',
    description: 'Long wooden riffle flume with flowing water channels to wash gold ore.',
    goldCost: 2,
    rockCost: 8,
    dimensions: { width: 1.8, height: 2.2, depth: 6.0 },
    benefit: 'Converts 5 dug rocks into refined pure gold nuggets on demand.',
  },
  rail_track: {
    type: 'rail_track',
    name: 'Minecart Rails & Ore Cart',
    description: 'Steel tracks on pine cross-ties with a heavy iron ore cart for hauling rocks.',
    goldCost: 3,
    rockCost: 10,
    dimensions: { width: 2.4, height: 2.0, depth: 8.0 },
    benefit: 'Transports excavated rubble; dumps ore for extra currency.',
  },
  assay_forge: {
    type: 'assay_forge',
    name: 'Assay Office & Forge',
    description: 'Stone blast furnace, iron anvil, workbench, and bullion scale to smelt pure bars.',
    goldCost: 8,
    rockCost: 20,
    dimensions: { width: 5.0, height: 3.8, depth: 4.5 },
    benefit: 'Smelts raw gold into official stamped bullion bars (worth 10 oz each).',
  },
  deep_shaft: {
    type: 'deep_shaft',
    name: 'Deep Timbered Shaft',
    description: 'Vertical excavation pit with square-set timber shoring and exposed quartz gold veins.',
    goldCost: 12,
    rockCost: 25,
    dimensions: { width: 5.5, height: 4.0, depth: 5.5 },
    benefit: 'Uncovers subterranean high-yield quartz gold clusters ready to dig.',
  },
  campfire: {
    type: 'campfire',
    name: 'Frontier Campfire',
    description: 'Stone ring campfire with glowing charcoal embers, mesquite logs, and an iron coffee pot.',
    goldCost: 0,
    rockCost: 3,
    woodCost: 2,
    dimensions: { width: 2.2, height: 1.2, depth: 2.2 },
    benefit: 'Provides wilderness night warmth, light, coffee brewing, canteen refills, and repels predators.',
  },
  prospector_camp: {
    type: 'prospector_camp',
    name: 'Prospector Outpost Camp',
    description: 'Expedition canvas wall tent, bedroll, supply crates, lantern pole, and campfire.',
    goldCost: 1,
    rockCost: 6,
    woodCost: 4,
    dimensions: { width: 4.8, height: 2.8, depth: 4.8 },
    benefit: 'Wilderness forward expedition base with weather shelter, safe overnight sleep spot, and campfire.',
  },
  frontier_torch: {
    type: 'frontier_torch',
    name: 'Frontier Ground Torch',
    description: 'Old West pine stake torch driven into the earth with pitch-soaked burlap, glowing coals, and beautiful warm flickering firelight.',
    goldCost: 0,
    rockCost: 0,
    woodCost: 1,
    dimensions: { width: 0.6, height: 2.2, depth: 0.6 },
    benefit: 'Stakes into the earth like a tiki torch to illuminate campsites, claim borders, dark trails, and mine tunnels with warm firelight.',
  },
  rifle_barrier: {
    type: 'rifle_barrier',
    name: 'Frontier Rifle Barrier',
    description: 'Fortified heavy pine timber parapet with packed sandbags and a notched gun rest to steady rifle fire against outlaw ambushes.',
    goldCost: 0,
    rockCost: 3,
    woodCost: 2,
    dimensions: { width: 2.8, height: 1.25, depth: 1.0 },
    benefit: 'Provides high ballistic cover against bandits and a steady gun rest for scoped precision rifle shots.',
  },
};

export class MineBuildingSystem {
  private scene: THREE.Scene;
  private getTerrainHeight: (x: number, z: number) => number;
  private structuresGroup: THREE.Group = new THREE.Group();
  private ghostGroup: THREE.Group = new THREE.Group();
  private claimGroup: THREE.Group = new THREE.Group();
  private particlesGroup: THREE.Group = new THREE.Group();
  private excavationSiteGroup: THREE.Group = new THREE.Group();

  public builtStructures: BuiltStructure[] = [];
  public currentClaim: ClaimInfo | null = null;
  public portalExcavation: PortalExcavationState | null = null;

  // Active ghost preview
  private ghostMesh: THREE.Object3D | null = null;
  private ghostType: MineStructureType | 'stake' | null = null;
  private sheaveWheels: THREE.Mesh[] = [];
  private waterPlanes: THREE.Mesh[] = [];
  private forgeLights: THREE.PointLight[] = [];
  private campfireNodes: Map<
    string,
    {
      light: THREE.PointLight;
      ashBedMat: THREE.MeshStandardMaterial;
      flames: THREE.Group;
      isLit: boolean;
    }
  > = new Map();
  private torchNodes: Map<
    string,
    {
      light: THREE.PointLight;
      flameGroup: THREE.Group;
      emberMat: THREE.MeshStandardMaterial;
      haloMesh?: THREE.Mesh;
      sparkPositions?: Float32Array;
      sparkGeometry?: THREE.BufferGeometry;
      seed: number;
    }
  > = new Map();

  // Apache Sabotage & Jacob Waltz Concealment Visuals
  private sabotageVisuals: Map<string, THREE.Group> = new Map();
  private concealmentVisuals: Map<string, THREE.Group> = new Map();

  // Particle debris systems
  private constructionParticles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  // Physical portal excavation particles
  private rockDebrisList: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVelocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  private dustPlumeList: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    startScale: number;
    maxScale: number;
  }[] = [];

  private sparkList: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  private pebbleShowerList: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  public dustParticleSystem?: MountainDustParticleSystem;

  constructor(scene: THREE.Scene, getTerrainHeight: (x: number, z: number) => number) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;

    this.scene.add(this.claimGroup);
    this.scene.add(this.structuresGroup);
    this.scene.add(this.excavationSiteGroup);
    this.scene.add(this.ghostGroup);
    this.scene.add(this.particlesGroup);
  }

  public setDustParticleSystem(ps: MountainDustParticleSystem) {
    this.dustParticleSystem = ps;
  }

  // ==========================================
  // CLAIM STAKING ENGINE
  // ==========================================

  public stakeClaim(name: string, pos: Vector3D, size = 42, id?: string): ClaimInfo {
    if (isTortillaFlatTownLimits(pos.x, pos.z, 20)) {
      console.warn('[MineBuildingSystem] Cannot stake claim within Tortilla Flat settlement limits');
      return {
        id: id || '',
        isClaimed: false,
        name: 'Invalid Claim (Tortilla Flat Limits)',
        position: { x: pos.x, y: this.getTerrainHeight(pos.x, pos.z), z: pos.z },
        size,
        extractedGold: 0,
        blocksDug: 0,
      };
    }

    this.claimGroup.clear();

    const claim: ClaimInfo = {
      id: id || `claim_${Math.round(pos.x)}_${Math.round(pos.z)}_${Date.now().toString(36)}`,
      isClaimed: true,
      name: name || "Prospector's Lucky Strike",
      position: { x: pos.x, y: this.getTerrainHeight(pos.x, pos.z), z: pos.z },
      size,
      extractedGold: 0,
      blocksDug: 0,
    };
    this.currentClaim = claim;

    const cx = claim.position.x;
    const cz = claim.position.z;
    const cy = claim.position.y;
    const half = size / 2;

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4a3222,
      roughness: 0.92,
      metalness: 0.05,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x7a6352,
      roughness: 0.95,
      metalness: 0.02,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe6b840,
      metalness: 0.88,
      roughness: 0.28,
    });
    const yellowRibbonMat = new THREE.MeshStandardMaterial({
      color: 0xffd23f,
      roughness: 0.4,
      emissive: 0x554400,
      emissiveIntensity: 0.4,
    });

    // 1. Central Monument Cairn
    const monument = new THREE.Group();
    monument.position.set(cx, cy, cz);

    // Stone pile base (12 rocks)
    for (let i = 0; i < 12; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.35, 0), stoneMat);
      const angle = (i / 12) * Math.PI * 2;
      const r = 0.75 + Math.random() * 0.45;
      rock.position.set(Math.cos(angle) * r, 0.35 + (i > 6 ? 0.45 : 0), Math.sin(angle) * r);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.castShadow = true;
      monument.add(rock);
    }

    // Carved Central Pine Survey Post
    const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), woodMat);
    centerPost.position.y = 1.6;
    centerPost.castShadow = true;
    monument.add(centerPost);

    // Engraved Brass Legal Notice Plate with procedural high-contrast text
    const plateTexture = createClaimNoticePlateTexture({
      name: claim.name,
      ownerName: claim.ownerName || 'You',
      isOwner: true,
      stakedAt: claim.stakedAt || Date.now(),
      x: cx,
      z: cz,
      elevation: cy,
    });
    const customPlateMat = new THREE.MeshStandardMaterial({
      map: plateTexture,
      metalness: 0.65,
      roughness: 0.32,
    });

    // Front plate
    const noticePlateFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.05), customPlateMat);
    noticePlateFront.position.set(0, 2.05, 0.2);
    monument.add(noticePlateFront);

    // Back plate for 360-degree readability
    const noticePlateBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.05), customPlateMat);
    noticePlateBack.position.set(0, 2.05, -0.2);
    noticePlateBack.rotation.y = Math.PI;
    monument.add(noticePlateBack);

    // Floating 3D billboard sprite above post
    const billboard = createClaimBillboardSprite({
      name: claim.name,
      ownerName: claim.ownerName || 'You',
      isOwner: true,
    });
    monument.add(billboard);

    // Fluttering Gold/Yellow Survey Pennant
    const flagGeo = new THREE.BufferGeometry();
    const flagVertices = new Float32Array([
      0, 2.9, 0,
      1.1, 2.6, 0.1,
      0, 2.3, 0,
    ]);
    flagGeo.setAttribute('position', new THREE.BufferAttribute(flagVertices, 3));
    flagGeo.computeVertexNormals();
    const pennant = new THREE.Mesh(flagGeo, yellowRibbonMat);
    monument.add(pennant);

    this.claimGroup.add(monument);

    // 2. Four Official Corner Boundary Stakes with Survey Cords
    const corners = [
      { x: cx - half, z: cz - half },
      { x: cx + half, z: cz - half },
      { x: cx + half, z: cz + half },
      { x: cx - half, z: cz + half },
    ];

    const cornerPoints: THREE.Vector3[] = [];

    corners.forEach((c) => {
      const cornerY = this.getTerrainHeight(c.x, c.z);
      const stakeGroup = new THREE.Group();
      stakeGroup.position.set(c.x, cornerY, c.z);

      // Wooden survey post
      const cornerStake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 2.2, 6),
        woodMat
      );
      cornerStake.position.y = 1.1;
      cornerStake.castShadow = true;
      stakeGroup.add(cornerStake);

      // Yellow top surveyor ribbon
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.05), yellowRibbonMat);
      ribbon.position.set(0.18, 1.9, 0);
      stakeGroup.add(ribbon);

      this.claimGroup.add(stakeGroup);
      cornerPoints.push(new THREE.Vector3(c.x, cornerY + 1.2, c.z));
    });

    // 3. Perimeter Boundary Cord Lines in 3D
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffd23f,
      linewidth: 2,
    });
    for (let i = 0; i < 4; i++) {
      const p1 = cornerPoints[i];
      const p2 = cornerPoints[(i + 1) % 4];
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(lineGeo, lineMat);
      this.claimGroup.add(line);
    }

    // Spawn celebratory dust particles and play sledgehammer staking sound
    this.spawnDustBurst(new THREE.Vector3(cx, cy + 0.5, cz), 0x5a3e28, 25);
    soundEngine.playHammerStake();

    return claim;
  }

  // Synchronize all persistent territory claims across the Superstition Mountains
  public syncTerritoryClaims(claims: TerritoryClaim[], localProspectorId?: string) {
    this.claimGroup.clear();

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4a3222,
      roughness: 0.92,
      metalness: 0.05,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x7a6352,
      roughness: 0.95,
      metalness: 0.02,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe6b840,
      metalness: 0.88,
      roughness: 0.28,
    });

    claims.forEach((claim) => {
      const isOwner = Boolean(localProspectorId && claim.ownerId === localProspectorId);
      if (isOwner) {
        // If we already have an active claim, prefer keeping the active one unless this claim matches its ID or this is the first one found
        const shouldSet =
          !this.currentClaim ||
          this.currentClaim.id === claim.id ||
          (!this.currentClaim.id && this.currentClaim.name === claim.name);

        if (shouldSet) {
          this.currentClaim = {
            id: claim.id,
            isClaimed: true,
            name: claim.name,
            position: { x: claim.x, y: this.getTerrainHeight(claim.x, claim.z), z: claim.z },
            size: claim.radius || 40,
            extractedGold: claim.extractedGold || 0,
            blocksDug: claim.blocksDug || 0,
          };
        }
      }
      const ribbonColor = isOwner ? 0xffd23f : 0xef4444; // Yellow for player, red warning for rival prospector
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: ribbonColor,
        roughness: 0.4,
        emissive: isOwner ? 0x554400 : 0x440000,
        emissiveIntensity: 0.5,
      });

      const cx = claim.x;
      const cz = claim.z;
      const cy = this.getTerrainHeight(cx, cz);
      const half = (claim.radius || 40) / 2;

      // Central Monument Cairn
      const monument = new THREE.Group();
      monument.position.set(cx, cy, cz);

      for (let i = 0; i < 8; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.25, 0), stoneMat);
        const angle = (i / 8) * Math.PI * 2;
        const r = 0.65;
        rock.position.set(Math.cos(angle) * r, 0.3, Math.sin(angle) * r);
        monument.add(rock);
      }

      const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.8, 0.3), woodMat);
      centerPost.position.y = 1.4;
      monument.add(centerPost);

      // Engraved Brass Legal Notice Plate with procedural high-contrast text
      const plateTexture = createClaimNoticePlateTexture({
        name: claim.name,
        ownerName: claim.ownerName,
        isOwner,
        stakedAt: claim.stakedAt,
        x: cx,
        z: cz,
        elevation: cy,
        forSale: claim.forSale,
        priceDollars: claim.priceDollars,
        priceGoldOunces: claim.priceGoldOunces,
      });
      const customPlateMat = new THREE.MeshStandardMaterial({
        map: plateTexture,
        metalness: 0.65,
        roughness: 0.32,
      });

      // Front plate
      const noticePlateFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.05), customPlateMat);
      noticePlateFront.position.set(0, 1.85, 0.18);
      monument.add(noticePlateFront);

      // Back plate
      const noticePlateBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.05), customPlateMat);
      noticePlateBack.position.set(0, 1.85, -0.18);
      noticePlateBack.rotation.y = Math.PI;
      monument.add(noticePlateBack);

      // Floating 3D billboard sprite above post
      const billboard = createClaimBillboardSprite({
        name: claim.name,
        ownerName: claim.ownerName,
        isOwner,
        forSale: claim.forSale,
        priceDollars: claim.priceDollars,
      });
      monument.add(billboard);

      // Pennant flag
      const flagGeo = new THREE.BufferGeometry();
      const flagVertices = new Float32Array([
        0, 2.6, 0,
        0.9, 2.3, 0.1,
        0, 2.0, 0,
      ]);
      flagGeo.setAttribute('position', new THREE.BufferAttribute(flagVertices, 3));
      flagGeo.computeVertexNormals();
      monument.add(new THREE.Mesh(flagGeo, ribbonMat));

      this.claimGroup.add(monument);

      // Four corner survey stakes & perimeter cords
      const corners = [
        { x: cx - half, z: cz - half },
        { x: cx + half, z: cz - half },
        { x: cx + half, z: cz + half },
        { x: cx - half, z: cz + half },
      ];

      const cornerPoints: THREE.Vector3[] = [];
      corners.forEach((c) => {
        const cornerY = this.getTerrainHeight(c.x, c.z);
        const stakeGroup = new THREE.Group();
        stakeGroup.position.set(c.x, cornerY, c.z);

        const cornerStake = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.0, 6), woodMat);
        cornerStake.position.y = 1.0;
        stakeGroup.add(cornerStake);

        const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.04), ribbonMat);
        ribbon.position.set(0.15, 1.7, 0);
        stakeGroup.add(ribbon);

        this.claimGroup.add(stakeGroup);
        cornerPoints.push(new THREE.Vector3(c.x, cornerY + 1.1, c.z));
      });

      const lineMat = new THREE.LineBasicMaterial({
        color: ribbonColor,
        linewidth: 2,
      });
      for (let i = 0; i < 4; i++) {
        const p1 = cornerPoints[i];
        const p2 = cornerPoints[(i + 1) % 4];
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        this.claimGroup.add(new THREE.Line(lineGeo, lineMat));
      }
    });
  }

  // ==========================================
  // PORTAL EXCAVATION & MOUNTAIN STRESS ENGINE
  // ==========================================

  public initPortalExcavation(pos: Vector3D, rotationY = 0): PortalExcavationState {
    if (isTortillaFlatTownLimits(pos.x, pos.z, 0)) {
      console.warn('[MineBuildingSystem] Cannot excavate portal inside Tortilla Flat settlement limits');
      return {
        active: false,
        position: { x: pos.x, y: this.getTerrainHeight(pos.x, pos.z), z: pos.z },
        rotationY,
        progress: 0,
        stability: 100,
        rocksNeeded: 10,
        goldNeeded: 4,
        isReinforced: false,
        lastGroanTime: 0,
      };
    }

    const excavation: PortalExcavationState = {
      active: true,
      position: { x: pos.x, y: this.getTerrainHeight(pos.x, pos.z), z: pos.z },
      rotationY,
      progress: 15, // Starts at 15% rough initial cut
      stability: 90, // Starts relatively stable before deeper excavation
      rocksNeeded: 10,
      goldNeeded: 4,
      isReinforced: false,
      lastGroanTime: 0,
    };

    this.portalExcavation = excavation;
    this.rebuildExcavationMesh();

    soundEngine.playVoxelDig();
    this.spawnExcavationParticles(
      new THREE.Vector3(excavation.position.x, excavation.position.y + 1.8, excavation.position.z),
      30
    );

    return excavation;
  }

  public rebuildExcavationMesh() {
    this.excavationSiteGroup.clear();
    if (!this.portalExcavation) return;

    const pe = this.portalExcavation;
    if (pe.isReinforced) return; // When reinforced, the permanent Timber Portal takes its place

    const group = new THREE.Group();
    group.position.set(pe.position.x, pe.position.y, pe.position.z);
    group.rotation.y = pe.rotationY;

    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x4a3b32,
      roughness: 0.95,
      metalness: 0.05,
    });
    const sandstoneMat = new THREE.MeshStandardMaterial({
      color: 0x8a5a3a,
      roughness: 0.9,
    });
    const roughLogMat = new THREE.MeshStandardMaterial({
      color: 0x3d291a,
      roughness: 0.88,
    });
    const goldQuartzMat = new THREE.MeshStandardMaterial({
      color: 0xffd23f,
      roughness: 0.25,
      metalness: 0.8,
      emissive: 0x775500,
      emissiveIntensity: 0.65,
    });
    const warnMat = new THREE.MeshStandardMaterial({
      color: 0xdd2211,
      roughness: 0.5,
    });

    // 1. Excavated Mountain Archway Cut (Dark raw jagged bedrock)
    const archRadius = 2.4;
    const archHeight = 4.2;
    const rockSegments = 14;

    for (let i = 0; i < rockSegments; i++) {
      const angle = (i / (rockSegments - 1)) * Math.PI;
      const rx = Math.cos(angle) * archRadius;
      const ry = Math.sin(angle) * (archHeight * 0.55) + archHeight * 0.45;
      const size = 0.9 + Math.random() * 0.5;

      const rockMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        i % 2 === 0 ? darkRockMat : sandstoneMat
      );
      rockMesh.position.set(rx, ry, -Math.random() * 0.8);
      rockMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rockMesh.castShadow = true;
      group.add(rockMesh);
    }

    // 2. Exposed High-Yield Gold Quartz Veins (Gleaming in the rock wall)
    for (let v = 0; v < 5; v++) {
      const vein = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.2, 1),
        goldQuartzMat
      );
      vein.position.set(
        (Math.random() - 0.5) * 3.2,
        1.2 + Math.random() * 2.5,
        -0.8 - Math.random() * 1.5
      );
      vein.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(vein);
    }

    // 3. Temporary, Creaking Timber Support Props (Raw logs wedged against unreinforced ceiling)
    // As stability degrades, these props visibly tilt and buckle under weight!
    const tiltOffset = (100 - pe.stability) * 0.0035;

    const leftProp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 4.0, 7),
      roughLogMat
    );
    leftProp.position.set(-1.6, 2.0, -0.6);
    leftProp.rotation.z = 0.08 + tiltOffset;
    leftProp.castShadow = true;
    group.add(leftProp);

    const rightProp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 4.0, 7),
      roughLogMat
    );
    rightProp.position.set(1.6, 2.0, -0.6);
    rightProp.rotation.z = -0.08 - tiltOffset;
    rightProp.castShadow = true;
    group.add(rightProp);

    // Cross brace shim
    const crossCap = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.35, 0.35),
      roughLogMat
    );
    crossCap.position.set(0, 3.9, -0.6);
    crossCap.rotation.z = (Math.random() - 0.5) * tiltOffset;
    group.add(crossCap);

    // 4. Shattered Rubble and Ore Tailings Pile at Entrance
    for (let r = 0; r < 9; r++) {
      const rubble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0),
        darkRockMat
      );
      rubble.position.set(
        (Math.random() - 0.5) * 3.8,
        0.25 + Math.random() * 0.3,
        0.8 + Math.random() * 2.0
      );
      rubble.rotation.set(Math.random(), Math.random(), Math.random());
      rubble.castShadow = true;
      group.add(rubble);
    }

    // 5. Caution Flags / Survey Warning Stakes
    [-2.6, 2.6].forEach((sx) => {
      const stake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 1.8, 5),
        roughLogMat
      );
      stake.position.set(sx, 0.9, 1.2);
      group.add(stake);

      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.35, 0.02),
        warnMat
      );
      flag.position.set(sx + (sx > 0 ? 0.3 : -0.3), 1.6, 1.2);
      group.add(flag);
    });

    // 6. Subterranean Void Dark Plane (Interior darkness)
    const voidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.8),
      new THREE.MeshBasicMaterial({ color: 0x070605, side: THREE.DoubleSide })
    );
    voidPlane.position.set(0, 1.9, -2.4);
    group.add(voidPlane);

    this.excavationSiteGroup.add(group);
  }

  // Strike excavation with pickaxe: physical particles, rock debris, audio groaning & mineral yields
  public strikeExcavation(hitPos?: THREE.Vector3): {
    success: boolean;
    progress: number;
    stability: number;
    groaned: boolean;
    rocksDug: number;
    goldAwarded: number;
    message: string;
  } {
    if (!this.portalExcavation || this.portalExcavation.isReinforced) {
      return { success: false, progress: 0, stability: 100, groaned: false, rocksDug: 0, goldAwarded: 0, message: '' };
    }

    const pe = this.portalExcavation;

    // Advance excavation deeper into bedrock
    const progGain = 12 + Math.floor(Math.random() * 6);
    pe.progress = Math.min(100, pe.progress + progGain);

    // Unsupported bedrock shear strain causes stability to degrade
    const stabilityLoss = 12 + Math.floor(Math.random() * 6);
    pe.stability = Math.max(15, pe.stability - stabilityLoss);

    // Audio & Physical Particles
    soundEngine.playRockChisel();
    const particleCenter =
      hitPos ||
      new THREE.Vector3(pe.position.x, pe.position.y + 2.0, pe.position.z);

    this.spawnExcavationParticles(particleCenter, 30);

    // High-Fidelity Mountain Bedrock Dust Cloud & Stone Cleavage Spalls
    if (this.dustParticleSystem) {
      const normal = new THREE.Vector3(Math.sin(pe.rotationY), 0.18, Math.cos(pe.rotationY)).normalize();
      this.dustParticleSystem.triggerMountainStrike(
        particleCenter,
        normal,
        'sandstone',
        1.5,
        pe.position.y
      );
    }

    // Guaranteed masonry rock harvest
    const rocksDug = 1 + (Math.random() < 0.45 ? 1 : 0);

    // Native gold quartz nugget discovery
    let goldAwarded = 0;
    if (Math.random() < 0.48) {
      goldAwarded = 1 + (Math.random() < 0.35 ? 1 : 0);
      soundEngine.playOreChime();
    }

    // Mountain Overburden Groan Check
    let groaned = false;
    const now = Date.now();
    if (pe.stability < 75 && now - pe.lastGroanTime > 3200) {
      pe.lastGroanTime = now;
      groaned = true;
      this.triggerOverburdenGroan(particleCenter);
    }

    this.rebuildExcavationMesh();

    let msg = `Excavated Bedrock (+${rocksDug} Rocks)`;
    if (goldAwarded > 0) {
      msg += `, Dislodged ${goldAwarded} oz Gold Ore!`;
    }
    if (pe.stability < 65) {
      msg += ` [⚠️ MOUNTAIN GROANING! Stability: ${pe.stability}% - Reinforce with 10 Rocks & 4 oz Gold!]`;
    }

    return {
      success: true,
      progress: pe.progress,
      stability: pe.stability,
      groaned,
      rocksDug,
      goldAwarded,
      message: msg,
    };
  }

  // Trigger ominous subterranean mountain groan and ceiling pebble shower
  public triggerOverburdenGroan(center: THREE.Vector3) {
    soundEngine.playMountainGroan();
    setTimeout(() => {
      soundEngine.playTimberCreak();
      soundEngine.playPebbleShower();
    }, 450);

    // Spawn loose pebbles and dust dropping from archway ceiling
    for (let i = 0; i < 16; i++) {
      const pebbleGeo = new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.08, 0);
      const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x5a4638, roughness: 0.9 });
      const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);

      pebble.position.set(
        center.x + (Math.random() - 0.5) * 2.8,
        center.y + 1.8 + Math.random() * 0.5,
        center.z + (Math.random() - 0.5) * 2.0
      );
      this.particlesGroup.add(pebble);

      this.pebbleShowerList.push({
        mesh: pebble,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.8, -3.5 - Math.random() * 4.0, (Math.random() - 0.5) * 0.8),
        life: 0,
        maxLife: 1.2,
      });
    }

    // Billowing dust puff
    this.spawnDustPlumes(center, 4);

    if (this.dustParticleSystem) {
      this.dustParticleSystem.triggerMountainStrike(
        center,
        new THREE.Vector3(0, -1, 0),
        'sandstone',
        1.3,
        center.y - 1.8
      );
    }
  }

  // Reinforce portal with permanent squared pine timber sets and masonry walls
  public reinforcePortal(availableGold: number, availableRocks: number): {
    success: boolean;
    rocksUsed: number;
    goldUsed: number;
    message: string;
  } {
    if (!this.portalExcavation) {
      return { success: false, rocksUsed: 0, goldUsed: 0, message: 'No portal excavation active.' };
    }

    const pe = this.portalExcavation;
    if (pe.isReinforced) {
      return { success: false, rocksUsed: 0, goldUsed: 0, message: 'Portal is already fully reinforced.' };
    }

    if (availableRocks < pe.rocksNeeded || availableGold < pe.goldNeeded) {
      return {
        success: false,
        rocksUsed: 0,
        goldUsed: 0,
        message: `Need ${pe.rocksNeeded} Rocks (have ${availableRocks}) & ${pe.goldNeeded} oz Gold (have ${availableGold.toFixed(1)} oz) to reinforce timber portal!`,
      };
    }

    // Deduct and reinforce
    pe.isReinforced = true;
    pe.stability = 100;
    pe.progress = 100;

    // Convert excavation into permanent Timber Mine Portal
    this.buildStructure('timber_portal', pe.position, pe.rotationY);

    // Clear excavation mesh
    this.excavationSiteGroup.clear();

    soundEngine.playHammerStake();
    soundEngine.playConstruct();
    this.spawnExcavationParticles(new THREE.Vector3(pe.position.x, pe.position.y + 2, pe.position.z), 45);

    return {
      success: true,
      rocksUsed: pe.rocksNeeded,
      goldUsed: pe.goldNeeded,
      message: 'Portal Reinforced! Heavy timber shoring, masonry walls, and lighted drift secured.',
    };
  }

  // Physical particle emitter for portal excavation
  public spawnExcavationParticles(center: THREE.Vector3, count = 25) {
    const rockColors = [0x544033, 0x7c5840, 0x946b52, 0x332822];

    // 1. Angular Rock Debris with realistic physics bounce
    for (let i = 0; i < count; i++) {
      const size = 0.08 + Math.random() * 0.16;
      const geo = Math.random() < 0.5 ? new THREE.DodecahedronGeometry(size, 0) : new THREE.BoxGeometry(size, size, size);
      const color = rockColors[Math.floor(Math.random() * rockColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.copy(center);
      this.particlesGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.0;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 4.5,
        Math.sin(angle) * speed
      );

      this.rockDebrisList.push({
        mesh,
        velocity: vel,
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        ),
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
      });
    }

    // 2. Translucent Expanding Dust Clouds
    this.spawnDustPlumes(center, 5);

    // 3. Golden Sparks on Pickaxe Chisel Friction
    for (let s = 0; s < 12; s++) {
      const sparkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.08);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.copy(center);
      this.particlesGroup.add(spark);

      this.sparkList.push({
        mesh: spark,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          2.0 + Math.random() * 4.5,
          (Math.random() - 0.5) * 6
        ),
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
      });
    }
  }

  private spawnDustPlumes(center: THREE.Vector3, count = 5) {
    const dustGeo = new THREE.DodecahedronGeometry(0.35, 1);
    const dustMat = new THREE.MeshStandardMaterial({
      color: 0xc4a68a,
      roughness: 1.0,
      transparent: true,
      opacity: 0.65,
    });

    for (let d = 0; d < count; d++) {
      const dust = new THREE.Mesh(dustGeo, dustMat.clone());
      dust.position.set(
        center.x + (Math.random() - 0.5) * 0.8,
        center.y + (Math.random() - 0.5) * 0.8,
        center.z + (Math.random() - 0.5) * 0.8
      );
      this.particlesGroup.add(dust);

      this.dustPlumeList.push({
        mesh: dust,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          0.8 + Math.random() * 1.2,
          (Math.random() - 0.5) * 1.5
        ),
        life: 0,
        maxLife: 1.4 + Math.random() * 0.6,
        startScale: 0.3,
        maxScale: 2.2 + Math.random() * 0.8,
      });
    }
  }

  // ==========================================
  // STRUCTURE BUILDERS
  // ==========================================

  public buildStructure(type: MineStructureType, pos: Vector3D, rotationY = 0): BuiltStructure {
    const blueprint = STRUCTURE_BLUEPRINTS[type];

    if (isTortillaFlatTownLimits(pos.x, pos.z, 0)) {
      console.warn(`[MineBuildingSystem] Cannot build ${type} within Tortilla Flat settlement limits`);
      return {
        id: `mine_${type}_rejected`,
        type,
        name: blueprint?.name || type,
        position: { x: pos.x, y: this.getTerrainHeight(pos.x, pos.z), z: pos.z },
        rotationY,
        level: 1,
        createdAt: Date.now(),
      };
    }

    const initialFuel = type === 'campfire' ? 12.0 : type === 'prospector_camp' ? 16.0 : undefined;
    const structure: BuiltStructure = {
      id: `mine_${type}_${Date.now()}`,
      type,
      name: blueprint.name,
      position: { x: pos.x, y: this.getTerrainHeight(pos.x, pos.z), z: pos.z },
      rotationY,
      level: 1,
      createdAt: Date.now(),
      fuelHoursRemaining: initialFuel,
      maxFuelHours: 24.0,
      isLit: initialFuel !== undefined ? true : undefined,
    };

    let mesh: THREE.Group;
    switch (type) {
      case 'timber_portal':
        mesh = this.createTimberPortalMesh(structure);
        break;
      case 'headframe_hoist':
        mesh = this.createHeadframeMesh(structure);
        break;
      case 'sluice_box':
        mesh = this.createSluiceMesh(structure);
        break;
      case 'rail_track':
        mesh = this.createRailTrackMesh(structure);
        break;
      case 'assay_forge':
        mesh = this.createAssayForgeMesh(structure);
        break;
      case 'deep_shaft':
        mesh = this.createDeepShaftMesh(structure);
        break;
      case 'campfire':
        mesh = this.createCampfireMesh(structure);
        break;
      case 'prospector_camp':
        mesh = this.createProspectorCampMesh(structure);
        break;
      case 'frontier_torch':
        mesh = this.createFrontierTorchMesh(structure);
        break;
      case 'rifle_barrier':
        mesh = this.createRifleBarrierMesh(structure);
        break;
    }

    mesh.position.set(structure.position.x, structure.position.y, structure.position.z);
    mesh.rotation.y = rotationY;
    this.structuresGroup.add(mesh);
    this.builtStructures.push(structure);

    // Sound effect & carpenter particles
    soundEngine.playConstruct();
    this.spawnDustBurst(
      new THREE.Vector3(structure.position.x, structure.position.y + 1, structure.position.z),
      0xdcb386,
      35
    );

    return structure;
  }

  // Structure 1: Heavy Timber Portal Adit
  private createTimberPortalMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.92 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.85, roughness: 0.35 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e4a36, roughness: 0.95 });

    // Left & Right upright bents
    const postGeo = new THREE.BoxGeometry(0.55, 4.6, 0.55);
    const leftPost = new THREE.Mesh(postGeo, woodMat);
    leftPost.position.set(-2.0, 2.3, 0);
    leftPost.castShadow = true;
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, woodMat);
    rightPost.position.set(2.0, 2.3, 0);
    rightPost.castShadow = true;
    group.add(rightPost);

    // Cross lintel cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 0.65), woodMat);
    cap.position.set(0, 4.4, 0);
    cap.castShadow = true;
    group.add(cap);

    // Iron corner angle tie-plates with bolts
    [-1.8, 1.8].forEach((bx) => {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), ironMat);
      plate.position.set(bx, 4.3, 0);
      group.add(plate);
    });

    // Secondary inner timber drift set (deeper into hillside)
    for (let depth = -1.8; depth >= -5.4; depth -= 1.8) {
      const innerL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.4), woodMat);
      innerL.position.set(-1.8, 2.1, depth);
      group.add(innerL);

      const innerR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.4), woodMat);
      innerR.position.set(1.8, 2.1, depth);
      group.add(innerR);

      const innerCap = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 0.45), woodMat);
      innerCap.position.set(0, 4.1, depth);
      group.add(innerCap);
    }

    // Portal sign board: "DUTCHMAN DRIFT #1"
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.1), woodMat);
    sign.position.set(0, 5.0, 0.1);
    group.add(sign);

    const brassPlate = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.55, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.3 })
    );
    brassPlate.position.set(0, 5.0, 0.12);
    group.add(brassPlate);

    // Rock retaining walls flanking and overarching the portal
    for (let r = 0; r < 12; r++) {
      const rockL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + Math.random() * 0.45, 0), rockMat);
      rockL.position.set(-2.4 - Math.random() * 0.9, 0.6 + r * 0.42, -Math.random() * 2.6);
      rockL.castShadow = true;
      rockL.frustumCulled = false;
      group.add(rockL);

      const rockR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + Math.random() * 0.45, 0), rockMat);
      rockR.position.set(2.4 + Math.random() * 0.9, 0.6 + r * 0.42, -Math.random() * 2.6);
      rockR.castShadow = true;
      rockR.frustumCulled = false;
      group.add(rockR);
    }

    // Overhead rock brow above the timber lintel
    for (let r = 0; r < 6; r++) {
      const rockTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 + Math.random() * 0.4, 0), rockMat);
      rockTop.position.set(-2.0 + r * 0.8 + (Math.random() - 0.5) * 0.3, 5.3 + (Math.random() - 0.5) * 0.4, -0.6 - Math.random() * 1.5);
      rockTop.castShadow = true;
      rockTop.frustumCulled = false;
      group.add(rockTop);
    }

    // Working Hanging Miner's Lantern
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 6), ironMat);
    lantern.position.set(0, 3.8, 0.2);
    group.add(lantern);

    const lanternLight = new THREE.PointLight(0xffa544, 2.2, 18);
    lanternLight.position.set(0, 3.6, 0.2);
    group.add(lanternLight);

    // Dark tunnel interior lining (walls, ceiling, floor) from entrance to back
    const tunnelLiningMat = new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.BackSide });
    const tunnelLining = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 4.2, 5.8),
      tunnelLiningMat
    );
    tunnelLining.position.set(0, 2.1, -2.9);
    group.add(tunnelLining);

    // Dark subterranean void plane at deepest end of adit
    const voidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 4.2),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
    );
    voidPlane.position.set(0, 2.1, -5.8);
    group.add(voidPlane);

    // Entrance shadow falloff plane (darkens interior depth)
    const shadowPortal = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 4.0),
      new THREE.MeshBasicMaterial({
        color: 0x040302,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      })
    );
    shadowPortal.position.set(0, 2.1, -0.6);
    group.add(shadowPortal);

    return group;
  }

  // Structure 2: Fully Built-Out 1880s Shaft Headframe & Hoist Tower (Gallows Frame)
  private createHeadframeMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.92 });
    const altWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.90 });
    const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x24180e, roughness: 0.95 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.85, roughness: 0.35 });
    const rustTinMat = new THREE.MeshStandardMaterial({ color: 0x543725, metalness: 0.5, roughness: 0.75 });
    const goldOreMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0x664400,
      emissiveIntensity: 0.6,
    });
    const quartzMat = new THREE.MeshStandardMaterial({ color: 0xddd5c4, roughness: 0.45 });

    const gallowsHeight = 7.4;

    // 1. Pit Mouth Void (Inky Black Depth Void)
    const voidBox = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 16.0, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x020101, side: THREE.BackSide })
    );
    voidBox.position.set(0, -8.0, 0);
    group.add(voidBox);

    const voidFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    voidFloor.rotation.x = -Math.PI / 2;
    voidFloor.position.set(0, -15.8, 0);
    group.add(voidFloor);

    // Vignette shadow collar at mouth
    const collarShadow = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x040302,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
      })
    );
    collarShadow.rotation.x = -Math.PI / 2;
    collarShadow.position.set(0, 0.05, 0);
    group.add(collarShadow);

    // 2. Foundation Sills & Staging Platform Decking
    const sillThickness = 0.44;
    [-2.4, 2.4].forEach((sx) => {
      const sill = new THREE.Mesh(new THREE.BoxGeometry(sillThickness, sillThickness, 5.8), darkTimberMat);
      sill.position.set(sx, 0.22, 0);
      sill.castShadow = true;
      group.add(sill);
    });
    [-2.4, 2.4].forEach((sz) => {
      const sill = new THREE.Mesh(new THREE.BoxGeometry(5.8, sillThickness, sillThickness), darkTimberMat);
      sill.position.set(0, 0.22, sz);
      sill.castShadow = true;
      group.add(sill);
    });

    // Staging platform planks
    for (let px = -2.4; px <= 2.4; px += 0.28) {
      if (Math.abs(px) < 1.6) {
        [-2.0, 2.0].forEach((pz) => {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.9), altWoodMat);
          plank.position.set(px, 0.26, pz);
          group.add(plank);
        });
      } else {
        const fullPlank = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 4.8), altWoodMat);
        fullPlank.position.set(px, 0.26, 0);
        group.add(fullPlank);
      }
    }

    // Safety Coaming Curb around the pit rim (0.35m high)
    [-1.7, 1.7].forEach((cz) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.18), woodMat);
      curb.position.set(0, 0.42, cz);
      group.add(curb);
    });
    [-1.7, 1.7].forEach((cx) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 3.6), woodMat);
      curb.position.set(cx, 0.42, 0);
      group.add(curb);
    });

    // Safety Handrails
    [-2.4, 2.4].forEach((rx) => {
      [-2.0, 0, 2.0].forEach((rz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), woodMat);
        post.position.set(rx, 0.8, rz);
        group.add(post);
      });
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 4.4), woodMat);
      topRail.position.set(rx, 1.3, 0);
      group.add(topRail);
    });

    // 3. 4 Main Incline Gallows Columns (12"x12" squared pine timber columns)
    const legGeo = new THREE.BoxGeometry(0.38, gallowsHeight * 1.05, 0.38);
    const legBaseX = 1.85;
    const legBaseZ = 1.45;
    const legTopX = 1.0;

    [
      { bx: -legBaseX, bz: -legBaseZ, tx: -legTopX, tz: 0 },
      { bx: legBaseX, bz: -legBaseZ, tx: legTopX, tz: 0 },
      { bx: legBaseX, bz: legBaseZ, tx: legTopX, tz: 0 },
      { bx: -legBaseX, bz: legBaseZ, tx: -legTopX, tz: 0 },
    ].forEach((c) => {
      const leg = new THREE.Mesh(legGeo, darkTimberMat);
      leg.position.set((c.bx + c.tx) / 2, gallowsHeight / 2, (c.bz + c.tz) / 2);
      const angleX = (c.tx - c.bx) / gallowsHeight;
      const angleZ = (c.tz - c.bz) / gallowsHeight;
      leg.rotation.set(angleZ, 0, -angleX);
      leg.castShadow = true;
      group.add(leg);

      const footPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.55), ironMat);
      footPlate.position.set(c.bx, 0.35, c.bz);
      group.add(footPlate);
    });

    // 4. Iconic Diagonal Backstays (Angled Rear Thrust Braces)
    const backstayGeo = new THREE.BoxGeometry(0.38, 8.2, 0.38);
    [-1.6, 1.6].forEach((bsx) => {
      const backstay = new THREE.Mesh(backstayGeo, darkTimberMat);
      backstay.position.set(bsx * 0.85, gallowsHeight * 0.48, -2.3);
      backstay.rotation.x = -0.58;
      backstay.castShadow = true;
      group.add(backstay);

      const rearFoot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), ironMat);
      rearFoot.position.set(bsx * 1.15, 0.35, -4.4);
      group.add(rearFoot);
    });

    const backstayCrossGirt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28, 0.28), woodMat);
    backstayCrossGirt.position.set(0, 3.4, -2.4);
    group.add(backstayCrossGirt);

    // Diagonal Braces between backstays
    [-1, 1].forEach((dir) => {
      const bsDiag = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 0.18), woodMat);
      bsDiag.position.set(0, 2.4, -3.1);
      bsDiag.rotation.set(-0.58, 0, dir * 0.45);
      group.add(bsDiag);
    });

    // Tension Rods with Turnbuckles
    [-1.15, 1.15].forEach((tx) => {
      const tieRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.4, 6), ironMat);
      tieRod.rotation.x = Math.PI / 2;
      tieRod.position.set(tx, 4.0, -1.3);
      group.add(tieRod);

      const turnbuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 6), ironMat);
      turnbuckle.rotation.x = Math.PI / 2;
      turnbuckle.position.set(tx, 4.0, -1.3);
      group.add(turnbuckle);
    });

    // 5. 3 Tiers of Horizontal Collar Girts & Flank "X" Bracing
    const tiers = [
      { y: 2.3, wX: 3.3, wZ: 2.4, beamThick: 0.28 },
      { y: 4.4, wX: 2.6, wZ: 1.8, beamThick: 0.26 },
      { y: 6.2, wX: 2.2, wZ: 1.4, beamThick: 0.24 },
    ];
    tiers.forEach((tier) => {
      [-tier.wZ / 2, tier.wZ / 2].forEach((gz) => {
        const girtX = new THREE.Mesh(new THREE.BoxGeometry(tier.wX, tier.beamThick, tier.beamThick), woodMat);
        girtX.position.set(0, tier.y, gz);
        group.add(girtX);
      });
      [-tier.wX / 2, tier.wX / 2].forEach((gx) => {
        const girtZ = new THREE.Mesh(new THREE.BoxGeometry(tier.beamThick, tier.beamThick, tier.wZ), woodMat);
        girtZ.position.set(gx, tier.y, 0);
        group.add(girtZ);
      });
    });

    [-1, 1].forEach((side) => {
      const sideX = side * 1.4;
      [-1, 1].forEach((dir) => {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 0.18), woodMat);
        brace.position.set(sideX, 3.3, 0);
        brace.rotation.x = dir * 0.48;
        group.add(brace);
      });
      [-1, 1].forEach((dir) => {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), woodMat);
        brace.position.set(sideX * 0.85, 5.3, 0);
        brace.rotation.x = dir * 0.46;
        group.add(brace);
      });
    });

    // 6. Top Crown Head Beams & Canopy Roof
    const crownBeamGeo = new THREE.BoxGeometry(2.6, 0.4, 0.4);
    [-0.38, 0.38].forEach((cz) => {
      const crown = new THREE.Mesh(crownBeamGeo, darkTimberMat);
      crown.position.set(0, gallowsHeight, cz);
      crown.castShadow = true;
      group.add(crown);
    });

    // Pillow block bearing housings
    [-0.9, 0.9].forEach((bx) => {
      const bearing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 1.0), ironMat);
      bearing.position.set(bx, gallowsHeight + 0.3, 0);
      group.add(bearing);
    });

    // Pitched Canopy Roof
    const canopyRafterGeo = new THREE.BoxGeometry(0.14, 0.14, 2.8);
    [-1.0, 0, 1.0].forEach((rx) => {
      const rafter = new THREE.Mesh(canopyRafterGeo, woodMat);
      rafter.position.set(rx, gallowsHeight + 1.35, 0);
      group.add(rafter);
    });

    const canopyRoofGeo = new THREE.BoxGeometry(2.8, 0.08, 1.5);
    [-1, 1].forEach((side) => {
      const roof = new THREE.Mesh(canopyRoofGeo, rustTinMat);
      roof.position.set(0, gallowsHeight + 1.45, side * 0.65);
      roof.rotation.x = side * 0.26;
      roof.castShadow = true;
      group.add(roof);
    });

    // 7. Detailed Spoked Sheave Wheel (Hoist Pulley)
    const sheaveGroup = new THREE.Group();
    sheaveGroup.position.set(0, gallowsHeight + 0.3, 0);

    const rimRadius = 0.85;
    const sheaveRim = new THREE.Mesh(
      new THREE.TorusGeometry(rimRadius, 0.08, 12, 36),
      ironMat
    );
    sheaveRim.rotation.y = Math.PI / 2;
    sheaveRim.castShadow = true;
    sheaveGroup.add(sheaveRim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 16), ironMat);
    hub.rotation.z = Math.PI / 2;
    sheaveGroup.add(hub);

    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 12), ironMat);
    axle.rotation.z = Math.PI / 2;
    sheaveGroup.add(axle);

    // 10 Forged Spokes
    const spokeGeo = new THREE.CylinderGeometry(0.022, 0.022, rimRadius - 0.1, 8);
    for (let s = 0; s < 10; s++) {
      const angle = (s / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, ironMat);
      spoke.position.set(0, Math.sin(angle) * (rimRadius / 2), Math.cos(angle) * (rimRadius / 2));
      spoke.rotation.x = angle + Math.PI / 2;
      sheaveGroup.add(spoke);
    }
    group.add(sheaveGroup);
    this.sheaveWheels.push(sheaveRim);

    // 8. Steel Hoist Cables & Suspended Mining Ore Bucket (Kibble)
    const winchDrumPos = new THREE.Vector3(0, 0.85, -4.0);
    const sheaveTopPos = new THREE.Vector3(0, gallowsHeight + 0.3 + rimRadius, -0.1);
    const rearCableLen = winchDrumPos.distanceTo(sheaveTopPos);
    const rearCable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rearCableLen, 8), ironMat);
    rearCable.position.copy(winchDrumPos).lerp(sheaveTopPos, 0.5);
    rearCable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sheaveTopPos.clone().sub(winchDrumPos).normalize());
    group.add(rearCable);

    const bucketY = 1.35;
    const vertCableLen = (gallowsHeight + 0.3 + rimRadius) - bucketY;
    const vertCable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, vertCableLen, 8), ironMat);
    vertCable.position.set(0, (gallowsHeight + 0.3 + rimRadius + bucketY) / 2, 0.45);
    group.add(vertCable);

    // Shackle & Swivel Hook
    const hookGroup = new THREE.Group();
    hookGroup.position.set(0, bucketY + 0.7, 0.45);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 16), ironMat);
    hookGroup.add(shackle);
    const swivelHook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI * 1.3), ironMat);
    swivelHook.position.set(0, -0.15, 0);
    swivelHook.rotation.z = Math.PI / 2;
    hookGroup.add(swivelHook);
    group.add(hookGroup);

    // Heavy Mining Ore Bucket
    const bucketGroup = new THREE.Group();
    bucketGroup.position.set(0, bucketY, 0.45);

    const bucketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, 0.75, 12), woodMat);
    bucketBody.castShadow = true;
    bucketGroup.add(bucketBody);

    [-0.28, 0, 0.28].forEach((hy) => {
      const hoop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.485 - (0.28 - hy) * 0.12, 0.485 - (0.28 - hy) * 0.12, 0.05, 12),
        ironMat
      );
      hoop.position.set(0, hy, 0);
      bucketGroup.add(hoop);
    });

    const bail = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.03, 8, 16, Math.PI), ironMat);
    bail.position.set(0, 0.38, 0);
    bucketGroup.add(bail);

    [-0.4, 0.4].forEach((cx) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 6), ironMat);
      chain.position.set(cx * 0.5, 0.58, 0);
      chain.rotation.z = cx < 0 ? 0.32 : -0.32;
      bucketGroup.add(chain);
    });

    for (let r = 0; r < 7; r++) {
      const a = (r / 7) * Math.PI * 2;
      const rockRadius = 0.13 + (r % 3) * 0.04;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 0), r % 2 === 0 ? goldOreMat : quartzMat);
      rock.position.set(Math.cos(a) * 0.22, 0.3 + (r % 2) * 0.05, Math.sin(a) * 0.22);
      bucketGroup.add(rock);
    }
    group.add(bucketGroup);

    // 9. Surface Winch Station
    const winchGroup = new THREE.Group();
    winchGroup.position.set(0, 0.2, -4.0);

    [-0.75, 0.75].forEach((wx) => {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 2.2), darkTimberMat);
      skid.position.set(wx, 0.17, 0);
      winchGroup.add(skid);

      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.35), ironMat);
      pedestal.position.set(wx, 0.65, 0);
      winchGroup.add(pedestal);
    });

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.25, 16), ironMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.75, 0);
    winchGroup.add(drum);

    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 20), ironMat);
    gear.rotation.z = Math.PI / 2;
    gear.position.set(0.72, 0.75, 0);
    winchGroup.add(gear);

    const brakeLever = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.2, 8), ironMat);
    brakeLever.position.set(0.85, 1.15, -0.2);
    brakeLever.rotation.x = 0.35;
    winchGroup.add(brakeLever);

    const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), ironMat);
    crankArm.position.set(-0.78, 0.92, 0);
    winchGroup.add(crankArm);

    const crankHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 8), woodMat);
    crankHandle.rotation.z = Math.PI / 2;
    crankHandle.position.set(-0.9, 1.12, 0);
    winchGroup.add(crankHandle);

    group.add(winchGroup);

    return group;
  }

  // Structure 3: Miner's Sluice Box & Riffle Flume
  private createSluiceMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.88 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });

    // Elevated inclined sluice box trough (6m long)
    const troughLength = 5.8;
    const trough = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.25, troughLength),
      woodMat
    );
    trough.position.set(0, 1.1, 0);
    trough.rotation.x = -0.11; // Slanted downward to wash tailings
    trough.castShadow = true;
    group.add(trough);

    // Sluice Side Boards
    [-0.45, 0.45].forEach((sx) => {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.45, troughLength),
        woodMat
      );
      side.position.set(sx, 1.25, 0);
      side.rotation.x = -0.11;
      group.add(side);
    });

    // Sluice support trestle legs
    [-2.0, 0, 2.0].forEach((tz, idx) => {
      const legHeight = 1.6 - idx * 0.4;
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, legHeight, 5), woodMat);
      legL.position.set(-0.4, legHeight / 2, tz);
      group.add(legL);

      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, legHeight, 5), woodMat);
      legR.position.set(0.4, legHeight / 2, tz);
      group.add(legR);
    });

    // Shimmering Running Water Channel in Sluice
    const waterPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, troughLength * 0.95),
      new THREE.MeshStandardMaterial({
        color: 0x55bbdd,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.75,
      })
    );
    waterPlane.rotation.x = -Math.PI / 2 - 0.11;
    waterPlane.position.set(0, 1.22, 0);
    group.add(waterPlane);
    this.waterPlanes.push(waterPlane);

    // Transverse Wooden Riffle Cleats (where gold settles!)
    for (let r = -2.2; r <= 2.2; r += 0.4) {
      const riffle = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.06), ironMat);
      riffle.position.set(0, 1.23, r);
      riffle.rotation.x = -0.11;
      group.add(riffle);
    }

    // Headbox Hopper (where rocks & water are dumped)
    const hopper = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.2), woodMat);
    hopper.position.set(0, 1.8, -2.8);
    hopper.castShadow = true;
    group.add(hopper);

    // Glistening gold dust caught in the riffles
    for (let g = 0; g < 6; g++) {
      const nugget = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.06, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          metalness: 0.95,
          roughness: 0.2,
          emissive: 0x775500,
          emissiveIntensity: 0.6,
        })
      );
      nugget.position.set((Math.random() - 0.5) * 0.5, 1.25, -1.5 + g * 0.6);
      group.add(nugget);
    }

    return group;
  }

  // Structure 4: Minecart Rails & Heavy Ore Cart
  private createRailTrackMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.95 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.88, roughness: 0.35 });

    const trackLength = 7.6;
    // Wooden Cross-ties
    for (let tz = -trackLength / 2; tz <= trackLength / 2; tz += 0.65) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.28), woodMat);
      tie.position.set(0, 0.06, tz);
      tie.castShadow = true;
      group.add(tie);
    }

    // Dual Steel Rails
    [-0.55, 0.55].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, trackLength), steelMat);
      rail.position.set(rx, 0.18, 0);
      rail.castShadow = true;
      group.add(rail);
    });

    // Minecart on the tracks
    const cartGroup = new THREE.Group();
    cartGroup.position.set(0, 0.22, 0.8);

    // Iron flanged wheels
    for (const wx of [-0.55, 0.55]) {
      for (const wz of [-0.65, 0.65]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), steelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.2, wz);
        wheel.castShadow = true;
        cartGroup.add(wheel);
      }
    }

    // Cart Iron Box Body
    const cartBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 1.9),
      new THREE.MeshStandardMaterial({ color: 0x4b3f38, metalness: 0.75, roughness: 0.5 })
    );
    cartBody.position.y = 0.75;
    cartBody.castShadow = true;
    cartGroup.add(cartBody);

    // Rich gold ore lumps heaped in the cart
    for (let i = 0; i < 5; i++) {
      const oreChunk = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28 + Math.random() * 0.15, 0),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xffd700 : 0xc27c44,
          metalness: i % 2 === 0 ? 0.92 : 0.2,
          roughness: 0.3,
          emissive: i % 2 === 0 ? 0x664400 : 0x000000,
          emissiveIntensity: 0.4,
        })
      );
      oreChunk.position.set((Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 0.15, (Math.random() - 0.5) * 0.8);
      cartGroup.add(oreChunk);
    }

    group.add(cartGroup);
    return group;
  }

  // Structure 5: Assay Office & Blacksmith Forge
  private createAssayForgeMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a483a, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x442c1d, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.85, roughness: 0.3 });

    // Stone Blast Furnace Hearth & Chimney
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 1.8), stoneMat);
    hearth.position.set(-1.4, 0.7, -1.2);
    hearth.castShadow = true;
    group.add(hearth);

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 3.4, 8), stoneMat);
    chimney.position.set(-1.4, 2.8, -1.2);
    chimney.castShadow = true;
    group.add(chimney);

    // Glowing hot coals fire chamber
    const coals = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 1.0),
      new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff4400,
        emissiveIntensity: 2.2,
        roughness: 0.4,
      })
    );
    coals.position.set(-1.4, 1.25, -1.0);
    group.add(coals);

    const fireLight = new THREE.PointLight(0xff5500, 3.0, 14);
    fireLight.position.set(-1.4, 1.5, -0.9);
    group.add(fireLight);
    this.forgeLights.push(fireLight);

    // Heavy Blacksmith Anvil on Oak Stump
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.75, 8), woodMat);
    stump.position.set(0.3, 0.38, -0.6);
    group.add(stump);

    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.85), ironMat);
    anvil.position.set(0.3, 0.88, -0.6);
    anvil.castShadow = true;
    group.add(anvil);

    // Assay Workbench & Tool Rack
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.2), woodMat);
    bench.position.set(1.2, 0.42, 1.0);
    bench.castShadow = true;
    group.add(bench);

    // Brass Assay Balance Scale with pans
    const scaleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 6), brassMat);
    scaleBase.position.set(0.8, 1.15, 1.0);
    group.add(scaleBase);

    const scaleBeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), brassMat);
    scaleBeam.position.set(0.8, 1.45, 1.0);
    group.add(scaleBeam);

    // Gold Bullion Bars on Workbench
    for (let b = 0; b < 3; b++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.08, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          metalness: 0.95,
          roughness: 0.18,
          emissive: 0x443300,
          emissiveIntensity: 0.3,
        })
      );
      bar.position.set(1.4 + b * 0.15, 0.89, 1.0);
      bar.castShadow = true;
      group.add(bar);
    }

    // Heavy Iron Safe / Bullion Chest
    const safe = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.9), ironMat);
    safe.position.set(-1.4, 0.5, 1.2);
    safe.castShadow = true;
    group.add(safe);

    return group;
  }

  // Structure 6: Deep Timbered Shaft Excavation Pit
  private createDeepShaftMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.92 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x22150a, roughness: 0.96 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2e2e2e, metalness: 0.8, roughness: 0.4 });

    const collarSize = 4.2;

    // 1. Deep Subterranean Pit Void (pitch black down 16m)
    const voidBox = new THREE.Mesh(
      new THREE.BoxGeometry(collarSize - 0.4, 16.0, collarSize - 0.4),
      new THREE.MeshBasicMaterial({ color: 0x020101, side: THREE.BackSide })
    );
    voidBox.position.set(0, -8.0, 0);
    group.add(voidBox);

    const voidFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(collarSize - 0.4, collarSize - 0.4),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    voidFloor.rotation.x = -Math.PI / 2;
    voidFloor.position.set(0, -15.8, 0);
    group.add(voidFloor);

    // Collar shadow vignette ring
    const collarShadow = new THREE.Mesh(
      new THREE.RingGeometry((collarSize - 0.6) / 2, (collarSize + 0.4) / 2, 32),
      new THREE.MeshBasicMaterial({
        color: 0x030201,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
      })
    );
    collarShadow.rotation.x = -Math.PI / 2;
    collarShadow.position.set(0, 0.05, 0);
    group.add(collarShadow);

    // 2. Square Timber Shaft Collar (Above ground sets)
    for (let h = 0; h < 3; h++) {
      const y = 0.3 + h * 0.5;
      [-collarSize / 2, collarSize / 2].forEach((cx) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, collarSize + 0.45), woodMat);
        beam.position.set(cx, y, 0);
        beam.castShadow = true;
        group.add(beam);
      });
      [-collarSize / 2, collarSize / 2].forEach((cz) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(collarSize + 0.45, 0.45, 0.45), woodMat);
        beam.position.set(0, y, cz);
        beam.castShadow = true;
        group.add(beam);
      });
    }

    // Sub-surface timber cribbing sets stepping down into darkness
    [-0.5, -1.3, -2.4, -3.8].forEach((subY) => {
      const subSize = collarSize - 0.3;
      [-subSize / 2, subSize / 2].forEach((cx) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, subSize + 0.35), darkWoodMat);
        beam.position.set(cx, subY, 0);
        group.add(beam);
      });
      [-subSize / 2, subSize / 2].forEach((cz) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(subSize + 0.35, 0.35, 0.35), darkWoodMat);
        beam.position.set(0, subY, cz);
        group.add(beam);
      });
    });

    // 3. Wooden Ladder leading deep down into the dark abyss
    const ladderLength = 8.5;
    const ladderL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ladderLength, 5), darkWoodMat);
    ladderL.position.set(-1.4, 1.4 - ladderLength / 2, -1.7);
    group.add(ladderL);

    const ladderR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ladderLength, 5), darkWoodMat);
    ladderR.position.set(-0.8, 1.4 - ladderLength / 2, -1.7);
    group.add(ladderR);

    // Ladder rungs stepping down into darkness
    for (let r = 0; r < 20; r++) {
      const rungY = 1.2 - r * 0.38;
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), darkWoodMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(-1.1, rungY, -1.7);
      group.add(rung);
    }

    // 4. Hanging Miner's Lantern illuminating the collar while depth stays pitch black
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 6), ironMat);
    lantern.position.set(1.4, 1.2, -1.6);
    group.add(lantern);

    const lanternLight = new THREE.PointLight(0xffaa44, 1.4, 6.5);
    lanternLight.position.set(1.4, 1.1, -1.6);
    group.add(lanternLight);

    // Safety warning board: "DANGER - DEEP ACTIVE SHAFT"
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), woodMat);
    signBoard.position.set(0, 1.9, collarSize / 2 + 0.08);
    group.add(signBoard);

    const signPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.45, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xcc9900, roughness: 0.5 })
    );
    signPlate.position.set(0, 1.9, collarSize / 2 + 0.09);
    group.add(signPlate);

    return group;
  }

  // Structure 7: Frontier Campfire
  private createCampfireMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e6155, roughness: 0.95 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.92 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });

    // River stone fire ring
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat);
      stone.position.set(Math.cos(angle) * 0.95, 0.14, Math.sin(angle) * 0.95);
      group.add(stone);
    }

    // Glowing charcoal ash bed
    const ashBedMat = new THREE.MeshStandardMaterial({
      color: 0x1a0904,
      emissive: 0xcc3300,
      emissiveIntensity: 0.85,
      roughness: 0.9,
    });
    const ashBed = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), ashBedMat);
    ashBed.position.set(0, 0.05, 0);
    ashBed.rotation.x = -Math.PI / 2;
    group.add(ashBed);

    // Crossed mesquite logs
    for (let l = 0; l < 4; l++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 7), logMat);
      log.position.set(0, 0.22, 0);
      log.rotation.x = 0.35;
      log.rotation.y = (l * Math.PI) / 2;
      group.add(log);
    }

    // Cast iron coffee kettle on iron tripod
    for (let t = 0; t < 3; t++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9), ironMat);
      const legAngle = (t / 3) * Math.PI * 2;
      leg.position.set(Math.cos(legAngle) * 0.35, 0.45, Math.sin(legAngle) * 0.35);
      leg.rotation.z = Math.cos(legAngle) * 0.35;
      leg.rotation.x = Math.sin(legAngle) * 0.35;
      group.add(leg);
    }

    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 8), ironMat);
    kettle.position.set(0, 0.42, 0);
    group.add(kettle);

    // Dynamic flame cone
    const flameGroup = new THREE.Group();
    const flameGeo = new THREE.ConeGeometry(0.22, 0.65, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0.35, 0);
    flameGroup.add(flame);
    group.add(flameGroup);

    // Warm glowing campfire light
    const fireLight = new THREE.PointLight(0xff6611, 2.6, 14);
    fireLight.position.set(0, 0.8, 0);
    group.add(fireLight);

    const isLit = _structure.isLit !== false && (_structure.fuelHoursRemaining ?? 12) > 0;
    if (!isLit) {
      fireLight.intensity = 0;
      ashBedMat.emissiveIntensity = 0;
      ashBedMat.color.setHex(0x242424);
      flameGroup.visible = false;
    } else if ((_structure.fuelHoursRemaining ?? 12) <= 4.0) {
      fireLight.intensity = 0.75;
      ashBedMat.emissiveIntensity = 0.35;
      ashBedMat.color.setHex(0x441100);
      flameGroup.scale.set(0.4, 0.4, 0.4);
    }

    this.campfireNodes.set(_structure.id, {
      light: fireLight,
      ashBedMat,
      flames: flameGroup,
      isLit,
    });

    return group;
  }

  // Structure 8: Prospector Outpost Camp
  private createProspectorCampMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0xded2b8, roughness: 0.94 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4d321d, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x242424, metalness: 0.85, roughness: 0.35 });
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x822f28, roughness: 0.95 });

    // A-Frame Canvas Wall Tent
    const tentRidge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8), woodMat);
    tentRidge.position.set(0, 2.2, 0);
    tentRidge.rotation.x = Math.PI / 2;
    group.add(tentRidge);

    for (const z of [-1.8, 1.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2), woodMat);
      pole.position.set(0, 1.1, z);
      group.add(pole);
    }

    // Pitched tent roof planes
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 3.6), canvasMat);
      roof.position.set(side * 0.9, 1.15, 0);
      roof.rotation.z = side * 0.65;
      group.add(roof);
    }

    // Tent back triangular wall
    const backWall = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.2, 3), canvasMat);
    backWall.position.set(0, 1.1, -1.8);
    backWall.rotation.y = Math.PI;
    group.add(backWall);

    // Wool bedroll inside tent
    const bedroll = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 2.2), blanketMat);
    bedroll.position.set(0, 0.09, 0);
    group.add(bedroll);

    // Stacked supply crates & mining tools outside
    for (let c = 0; c < 3; c++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.75), woodMat);
      crate.position.set(1.9 + (c % 2) * 0.3, 0.3 + Math.floor(c / 2) * 0.55, -0.6 + c * 0.5);
      group.add(crate);
    }

    // Pickaxe leaning on crate
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1), woodMat);
    handle.position.set(1.6, 0.5, 0.4);
    handle.rotation.z = 0.35;
    group.add(handle);

    // Campfire in front of tent
    const campfire = this.createCampfireMesh(_structure);
    campfire.position.set(0, 0, 2.6);
    group.add(campfire);

    // Lantern pole with hanging brass lantern
    const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6), woodMat);
    lPole.position.set(-1.8, 1.3, 1.8);
    group.add(lPole);

    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), woodMat);
    lArm.position.set(-1.55, 2.4, 1.8);
    lArm.rotation.z = Math.PI / 2;
    group.add(lArm);

    const campLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.28, 6), ironMat);
    campLantern.position.set(-1.3, 2.2, 1.8);
    group.add(campLantern);

    const lanternLight = new THREE.PointLight(0xffb040, 1.8, 10);
    lanternLight.position.copy(campLantern.position);
    group.add(lanternLight);
    this.forgeLights.push(lanternLight);

    return group;
  }

  // Structure 9: Old West Frontier Ground Torch (Pitch-Pine Stake Torch)
  private createFrontierTorchMesh(structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();

    // 1. Natural Weathered Timber Stake Pole
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3d2a19,
      roughness: 0.94,
    });
    // Main pole driven firmly into earth: 2.1m tall, slight taper
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.065, 2.1, 8), woodMat);
    pole.position.y = 1.05;
    group.add(pole);

    // Clustered desert river stones around the ground entry point
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a4332, roughness: 0.95 });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.35;
      const r = 0.13 + (i % 2) * 0.04;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + (i % 2) * 0.025, 0), stoneMat);
      rock.position.set(Math.cos(angle) * r, 0.07, Math.sin(angle) * r);
      rock.rotation.set(i * 0.7, i * 1.1, i * 0.5);
      group.add(rock);
    }

    // Mid-pole forged iron reinforcing ring
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.85,
      roughness: 0.38,
    });
    const midBand = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.007, 4, 12), ironMat);
    midBand.rotation.x = Math.PI / 2;
    midBand.position.y = 1.15;
    group.add(midBand);

    // 2. Old West Forged Iron Sconce Basket & Drip Catcher
    const dripPan = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.07, 0.08, 8), ironMat);
    dripPan.position.y = 1.92;
    group.add(dripPan);

    const sconceRim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 12), ironMat);
    sconceRim.rotation.x = Math.PI / 2;
    sconceRim.position.y = 1.96;
    group.add(sconceRim);

    // 4 vertical curved wrought iron cage straps
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.32, 0.014), ironMat);
      rib.position.set(Math.cos(angle) * 0.105, 2.05, Math.sin(angle) * 0.105);
      rib.rotation.y = -angle;
      group.add(rib);
    }

    // 3. Pitch-Soaked Burlap Linen & Pine Knot Core
    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0x1a130e,
      roughness: 0.96,
    });
    const pitchBundle = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.075, 0.28, 8), pitchMat);
    pitchBundle.position.y = 2.02;
    group.add(pitchBundle);

    // Rusted iron binding wire wrapping
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x4a2a1a, metalness: 0.7, roughness: 0.5 });
    const wire1 = new THREE.Mesh(new THREE.TorusGeometry(0.089, 0.006, 4, 12), wireMat);
    wire1.rotation.x = Math.PI / 2;
    wire1.position.y = 1.98;
    group.add(wire1);
    const wire2 = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.006, 4, 12), wireMat);
    wire2.rotation.x = Math.PI / 2;
    wire2.position.y = 2.08;
    group.add(wire2);

    // 4. Hot Glowing Embers Bed
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff2800,
      emissiveIntensity: 1.4,
      roughness: 0.75,
    });
    const emberBed = new THREE.Mesh(new THREE.DodecahedronGeometry(0.085, 1), emberMat);
    emberBed.position.y = 2.14;
    emberBed.scale.set(1.1, 0.5, 1.1);
    group.add(emberBed);

    // 5. Dynamic Layered Realistic Flame
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0, 2.16, 0);

    // Outer warm orange licking flame
    const outerFlameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4800,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.88,
      roughness: 0.2,
    });
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.44, 8), outerFlameMat);
    outerFlame.position.y = 0.22;
    flameGroup.add(outerFlame);

    // Inner bright blazing yellow-white core
    const coreFlameMat = new THREE.MeshStandardMaterial({
      color: 0xfffae0,
      emissive: 0xffea70,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });
    const coreFlame = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.30, 8), coreFlameMat);
    coreFlame.position.y = 0.15;
    flameGroup.add(coreFlame);

    // Dancing flame tip tongue
    const tipFlame = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.22, 6), outerFlameMat);
    tipFlame.position.set(0.015, 0.28, 0.01);
    flameGroup.add(tipFlame);

    group.add(flameGroup);

    // 6. Atmospheric Fire Glow Halo
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff8c1a,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), haloMat);
    haloMesh.position.set(0, 2.28, 0);
    group.add(haloMesh);

    // 7. Rising Fire Sparks / Embers Particles
    const sparkCount = 8;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = (Math.random() - 0.5) * 0.1;
      sparkPositions[i * 3 + 1] = 2.15 + Math.random() * 0.6;
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xff9922,
      size: 0.045,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    group.add(sparks);

    // 8. Primary Beautiful Warm Point Light
    const fireLight = new THREE.PointLight(0xff942c, 3.6, 20, 2.0);
    fireLight.position.set(0, 2.28, 0);
    group.add(fireLight);

    // Register into torchNodes for individual organic wind flicker & spark animation
    const seed = Math.random() * 500;
    this.torchNodes.set(structure.id, {
      light: fireLight,
      flameGroup,
      emberMat,
      haloMesh,
      sparkPositions,
      sparkGeometry: sparkGeo,
      seed,
    });

    return group;
  }

  // Structure 10: Frontier Rifle Barrier / Fortified Breastwork
  private createRifleBarrierMesh(structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();

    // Weathered timber logs
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4a3220,
      roughness: 0.88,
    });
    // Burlap sandbags
    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0xb59e77,
      roughness: 0.95,
    });
    // Iron brackets & stakes
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x24272a,
      metalness: 0.8,
      roughness: 0.4,
    });

    // 1. Heavy Pine Timber Base Log
    const baseLog = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.6, 10), woodMat);
    baseLog.rotation.z = Math.PI / 2;
    baseLog.position.set(0, 0.18, 0);
    baseLog.castShadow = true;
    baseLog.receiveShadow = true;
    group.add(baseLog);

    // 2. Mid Timber Log
    const midLog = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 2.6, 10), woodMat);
    midLog.rotation.z = Math.PI / 2;
    midLog.position.set(0, 0.5, -0.02);
    midLog.castShadow = true;
    group.add(midLog);

    // 3. Top Split Log Breastwork with Central Rifle Rest Notch
    const leftLog = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.95, 10), woodMat);
    leftLog.rotation.z = Math.PI / 2;
    leftLog.position.set(-0.75, 0.8, -0.04);
    leftLog.castShadow = true;
    group.add(leftLog);

    const rightLog = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.95, 10), woodMat);
    rightLog.rotation.z = Math.PI / 2;
    rightLog.position.set(0.75, 0.8, -0.04);
    rightLog.castShadow = true;
    group.add(rightLog);

    // Central V-shaped rifle rest notch wood
    const notchRest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.28), woodMat);
    notchRest.position.set(0, 0.72, -0.04);
    notchRest.castShadow = true;
    group.add(notchRest);

    // 4. Heavy Stacked Front Sandbags (ballistic shield)
    for (let row = 0; row < 3; row++) {
      const bagCount = row === 0 ? 5 : row === 1 ? 4 : 3;
      const rowY = 0.12 + row * 0.22;
      const startX = -((bagCount - 1) * 0.48) / 2;
      for (let b = 0; b < bagCount; b++) {
        if (row === 2 && b === 1) continue; // leave gun slit
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.28), sandbagMat);
        bag.position.set(startX + b * 0.48, rowY, 0.2);
        bag.rotation.y = Math.sin(b * 1.5 + row) * 0.1;
        bag.rotation.z = Math.cos(b * 2.1) * 0.04;
        bag.castShadow = true;
        bag.receiveShadow = true;
        group.add(bag);
      }
    }

    // 5. Rear Prospector Ammo & Rest Shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.35), woodMat);
    shelf.position.set(0, 0.65, -0.28);
    shelf.castShadow = true;
    group.add(shelf);

    const bracket1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.28), woodMat);
    bracket1.position.set(-0.6, 0.52, -0.24);
    group.add(bracket1);

    const bracket2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.28), woodMat);
    bracket2.position.set(0.6, 0.52, -0.24);
    group.add(bracket2);

    // 6. Brass .44 Cartridge Box on shelf
    const ammoBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x2d4a22, roughness: 0.6 })
    );
    ammoBox.position.set(0.42, 0.71, -0.26);
    ammoBox.rotation.y = 0.2;
    group.add(ammoBox);

    // 7. Ground Iron Anchor Stakes
    for (let s = 0; s < 2; s++) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.9, 6), ironMat);
      stake.position.set(s === 0 ? -1.35 : 1.35, 0.45, 0);
      stake.rotation.z = s === 0 ? 0.15 : -0.15;
      group.add(stake);
    }

    return group;
  }

  // ==========================================
  // HOLOGRAPHIC BLUEPRINT GHOST PREVIEW
  // ==========================================

  public setGhost(type: MineStructureType | 'stake' | null) {
    this.ghostType = type;
    this.ghostGroup.clear();
    this.ghostMesh = null;

    if (!type) return;

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x22ee77,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });

    if (type === 'stake') {
      const stakeGhost = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.8, 6), ghostMat);
      post.position.y = 1.4;
      stakeGhost.add(post);

      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.04), ghostMat);
      flag.position.set(0.4, 2.4, 0);
      stakeGhost.add(flag);

      // Boundary box ring
      const ring = new THREE.Mesh(new THREE.RingGeometry(18, 19, 24), ghostMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
      stakeGhost.add(ring);

      this.ghostMesh = stakeGhost;
    } else if (type === 'frontier_torch') {
      const torchGhost = new THREE.Group();
      // Wooden stake ghost
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 2.1, 8), ghostMat);
      pole.position.y = 1.05;
      torchGhost.add(pole);

      // Sconce basket ghost
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.28, 8), ghostMat);
      basket.position.y = 2.0;
      torchGhost.add(basket);

      // Flame shape ghost
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 8), ghostMat);
      flame.position.y = 2.35;
      torchGhost.add(flame);

      // Ground radius ring showing warm light perimeter
      const lightRing = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.0, 24), ghostMat);
      lightRing.rotation.x = -Math.PI / 2;
      lightRing.position.y = 0.05;
      torchGhost.add(lightRing);

      this.ghostMesh = torchGhost;
    } else if (type === 'rifle_barrier') {
      const barrierGhost = new THREE.Group();
      // Main breastwork log parapet
      const log1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.4), ghostMat);
      log1.position.y = 0.22;
      barrierGhost.add(log1);

      const log2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 0.35), ghostMat);
      log2.position.y = 0.6;
      barrierGhost.add(log2);

      // Gun slit notch preview
      const slitL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.3), ghostMat);
      slitL.position.set(-0.75, 0.9, 0);
      barrierGhost.add(slitL);

      const slitR = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.3), ghostMat);
      slitR.position.set(0.75, 0.9, 0);
      barrierGhost.add(slitR);

      // Sandbag front shelf
      const sandbags = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.3), ghostMat);
      sandbags.position.set(0, 0.25, 0.25);
      barrierGhost.add(sandbags);

      this.ghostMesh = barrierGhost;
    } else if (type === 'headframe_hoist') {
      const hfGhost = new THREE.Group();
      // Collar base timber footprint
      const collar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 4.2), ghostMat);
      collar.position.y = 0.2;
      hfGhost.add(collar);

      // Vertical shaft pit cutout ring
      const shaftRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.5, 16), ghostMat);
      shaftRing.rotation.x = -Math.PI / 2;
      shaftRing.position.y = 0.42;
      hfGhost.add(shaftRing);

      // Four towering A-frame timber legs (7.6m high)
      const legGeo = new THREE.CylinderGeometry(0.12, 0.18, 7.6, 6);
      const leg1 = new THREE.Mesh(legGeo, ghostMat);
      leg1.position.set(-1.35, 3.8, -1.35);
      leg1.rotation.z = -0.14;
      leg1.rotation.x = 0.14;
      hfGhost.add(leg1);

      const leg2 = new THREE.Mesh(legGeo, ghostMat);
      leg2.position.set(1.35, 3.8, -1.35);
      leg2.rotation.z = 0.14;
      leg2.rotation.x = 0.14;
      hfGhost.add(leg2);

      const leg3 = new THREE.Mesh(legGeo, ghostMat);
      leg3.position.set(-1.35, 3.8, 1.35);
      leg3.rotation.z = -0.14;
      leg3.rotation.x = -0.14;
      hfGhost.add(leg3);

      const leg4 = new THREE.Mesh(legGeo, ghostMat);
      leg4.position.set(1.35, 3.8, 1.35);
      leg4.rotation.z = 0.14;
      leg4.rotation.x = -0.14;
      hfGhost.add(leg4);

      // Top cross-beam headpiece
      const headBeam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), ghostMat);
      headBeam.position.set(0, 7.4, 0);
      hfGhost.add(headBeam);

      // Spinning sheave wheel ring at top
      const sheaveRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 8, 16), ghostMat);
      sheaveRing.position.set(0, 7.35, 0);
      sheaveRing.rotation.y = Math.PI / 2;
      hfGhost.add(sheaveRing);

      this.ghostMesh = hfGhost;
    } else if (type === 'deep_shaft') {
      const dsGhost = new THREE.Group();
      // Square timber shaft collar
      const collar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 5.2), ghostMat);
      collar.position.y = 0.3;
      dsGhost.add(collar);

      // Shaft pit opening
      const pitRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.1, 16), ghostMat);
      pitRing.rotation.x = -Math.PI / 2;
      pitRing.position.y = 0.62;
      dsGhost.add(pitRing);

      // Corner cribbing posts
      for (const [cx, cz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), ghostMat);
        post.position.set(cx, 1.6, cz);
        dsGhost.add(post);
      }
      this.ghostMesh = dsGhost;
    } else if (type === 'timber_portal') {
      const tpGhost = new THREE.Group();
      // Adit portal arch
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 0.35), ghostMat);
      postL.position.set(-2.0, 2.4, 0);
      tpGhost.add(postL);

      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 0.35), ghostMat);
      postR.position.set(2.0, 2.4, 0);
      tpGhost.add(postR);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 0.4), ghostMat);
      cap.position.set(0, 4.7, 0);
      tpGhost.add(cap);

      // Tunnel bore corridor outline
      const tunnelBox = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.4, 3.5), ghostMat);
      tunnelBox.position.set(0, 2.3, -1.75);
      tpGhost.add(tunnelBox);

      this.ghostMesh = tpGhost;
    } else {
      const bp = STRUCTURE_BLUEPRINTS[type];
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(bp.dimensions.width, bp.dimensions.height, bp.dimensions.depth),
        ghostMat
      );
      box.position.y = bp.dimensions.height / 2;
      this.ghostMesh = box;
    }

    this.ghostGroup.add(this.ghostMesh);
  }

  public updateGhostPosition(pos: THREE.Vector3, rotationY: number, isValid: boolean) {
    if (!this.ghostMesh) return;

    this.ghostMesh.position.set(pos.x, this.getTerrainHeight(pos.x, pos.z), pos.z);
    this.ghostMesh.rotation.y = rotationY;

    // Color code ghost: Emerald Green if valid, Crimson Red if invalid
    const color = isValid ? 0x22ee77 : 0xff2222;
    this.ghostMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material.color.setHex(color);
      }
    });
  }

  public hideGhost() {
    this.setGhost(null);
  }

  // ==========================================
  // PARTICLES & ANIMATION UPDATE
  // ==========================================

  private spawnDustBurst(pos: THREE.Vector3, color: number, count = 20) {
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      this.particlesGroup.add(p);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );

      this.constructionParticles.push({
        mesh: p,
        velocity: vel,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
      });
    }
  }

  public update(delta: number) {
    // 1. Rotate Headframe Sheave Wheels
    this.sheaveWheels.forEach((wheel) => {
      wheel.rotation.x += delta * 1.8;
    });

    // 2. Shimmer Sluice Water UVs
    this.waterPlanes.forEach((wp) => {
      if (wp.material instanceof THREE.MeshStandardMaterial) {
        wp.material.opacity = 0.7 + Math.sin(Date.now() * 0.005) * 0.12;
      }
    });

    // 3. Flicker Forge Fire Light
    this.forgeLights.forEach((light) => {
      light.intensity = 2.4 + Math.sin(Date.now() * 0.012) * 0.7 + Math.random() * 0.4;
    });

    // 3b. Flicker Lit Campfires & Fuel Embers
    this.campfireNodes.forEach((node) => {
      if (node.isLit) {
        node.light.intensity = 2.3 + Math.sin(Date.now() * 0.015) * 0.5 + Math.random() * 0.3;
        node.flames.scale.y = 0.85 + Math.sin(Date.now() * 0.02) * 0.25 + Math.random() * 0.15;
      }
    });

    // 3c. Flicker Lit Frontier Ground Torches (Realistic wind flicker & rising sparks)
    const nowSec = Date.now() * 0.001;
    this.torchNodes.forEach((node) => {
      const t = nowSec + node.seed;
      // Multi-frequency organic flame flicker
      const flicker =
        Math.sin(t * 13.7) * 0.38 +
        Math.sin(t * 27.3) * 0.22 +
        Math.sin(t * 4.9) * 0.16 +
        (Math.random() - 0.5) * 0.1;
      node.light.intensity = Math.max(1.8, 3.4 + flicker);

      // Subtle light source micro-wander for moving dynamic shadows on rocks
      node.light.position.x = Math.sin(t * 7.9) * 0.035;
      node.light.position.z = Math.cos(t * 9.3) * 0.035;

      // Organic flame fluttering in mountain wind
      node.flameGroup.scale.y = 0.95 + Math.sin(t * 16.2) * 0.18 + (Math.random() - 0.5) * 0.08;
      node.flameGroup.scale.x = 0.98 + Math.cos(t * 11.5) * 0.1;
      node.flameGroup.rotation.z = Math.sin(t * 9.2) * 0.08;
      node.flameGroup.rotation.x = Math.cos(t * 7.8) * 0.07;

      // Luminous halo pulse
      if (node.haloMesh) {
        node.haloMesh.scale.setScalar(1.0 + Math.sin(t * 12.0) * 0.08);
      }

      // Rising sparks animation
      if (node.sparkPositions && node.sparkGeometry) {
        const pos = node.sparkPositions;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i + 1] += delta * (0.65 + (i % 3) * 0.25); // float upwards
          pos[i] += Math.sin(t * 4.0 + i) * delta * 0.15; // wind drift X
          pos[i + 2] += Math.cos(t * 4.0 + i) * delta * 0.15; // wind drift Z
          if (pos[i + 1] > 2.85) {
            pos[i + 1] = 2.15;
            pos[i] = (Math.random() - 0.5) * 0.09;
            pos[i + 2] = (Math.random() - 0.5) * 0.09;
          }
        }
        node.sparkGeometry.attributes.position.needsUpdate = true;
      }
    });

    // 4. Update Standard Construction Particles
    for (let i = this.constructionParticles.length - 1; i >= 0; i--) {
      const p = this.constructionParticles[i];
      p.life += delta;
      p.velocity.y -= 9.8 * delta; // Gravity
      p.mesh.position.addScaledVector(p.velocity, delta);

      const scale = Math.max(0.01, 1 - p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life >= p.maxLife) {
        this.particlesGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.constructionParticles.splice(i, 1);
      }
    }

    // 5. Update Heavy Rock Debris with Ground Collisions & Angular Velocity
    for (let i = this.rockDebrisList.length - 1; i >= 0; i--) {
      const r = this.rockDebrisList[i];
      r.life += delta;
      r.velocity.y -= 22.0 * delta; // Heavy rock gravity
      r.mesh.position.addScaledVector(r.velocity, delta);

      r.mesh.rotation.x += r.rotVelocity.x * delta;
      r.mesh.rotation.y += r.rotVelocity.y * delta;
      r.mesh.rotation.z += r.rotVelocity.z * delta;

      // Ground collision bounce
      const groundY = this.getTerrainHeight(r.mesh.position.x, r.mesh.position.z);
      if (r.mesh.position.y <= groundY + 0.1) {
        r.mesh.position.y = groundY + 0.1;
        if (r.velocity.y < -1.5) {
          r.velocity.y = -r.velocity.y * 0.35; // Elastic bounce
          r.velocity.x *= 0.6; // Ground friction
          r.velocity.z *= 0.6;
        } else {
          r.velocity.set(0, 0, 0);
          r.rotVelocity.set(0, 0, 0);
        }
      }

      const scale = Math.max(0.01, 1 - r.life / r.maxLife);
      r.mesh.scale.setScalar(scale);

      if (r.life >= r.maxLife) {
        this.particlesGroup.remove(r.mesh);
        r.mesh.geometry.dispose();
        this.rockDebrisList.splice(i, 1);
      }
    }

    // 6. Update Translucent Billowing Dust Plumes
    for (let i = this.dustPlumeList.length - 1; i >= 0; i--) {
      const d = this.dustPlumeList[i];
      d.life += delta;
      d.mesh.position.addScaledVector(d.velocity, delta);

      const progress = d.life / d.maxLife;
      const currentScale = d.startScale + (d.maxScale - d.startScale) * progress;
      d.mesh.scale.setScalar(currentScale);

      if (d.mesh.material instanceof THREE.MeshStandardMaterial) {
        d.mesh.material.opacity = Math.max(0, 0.65 * (1 - progress));
      }

      if (d.life >= d.maxLife) {
        this.particlesGroup.remove(d.mesh);
        d.mesh.geometry.dispose();
        this.dustPlumeList.splice(i, 1);
      }
    }

    // 7. Update Golden High-Speed Sparks
    for (let i = this.sparkList.length - 1; i >= 0; i--) {
      const s = this.sparkList[i];
      s.life += delta;
      s.velocity.y -= 14.0 * delta;
      s.mesh.position.addScaledVector(s.velocity, delta);

      const scale = Math.max(0.01, 1 - s.life / s.maxLife);
      s.mesh.scale.setScalar(scale);

      if (s.life >= s.maxLife) {
        this.particlesGroup.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.sparkList.splice(i, 1);
      }
    }

    // 8. Update Ceiling Pebble Showers
    for (let i = this.pebbleShowerList.length - 1; i >= 0; i--) {
      const pb = this.pebbleShowerList[i];
      pb.life += delta;
      pb.velocity.y -= 18.0 * delta;
      pb.mesh.position.addScaledVector(pb.velocity, delta);

      if (pb.life >= pb.maxLife) {
        this.particlesGroup.remove(pb.mesh);
        pb.mesh.geometry.dispose();
        this.pebbleShowerList.splice(i, 1);
      }
    }

    // 9. Ambient Mountain Stress & Groan Warning for Unreinforced Portal
    if (this.portalExcavation && !this.portalExcavation.isReinforced && this.portalExcavation.stability < 65) {
      const now = Date.now();
      if (now - this.portalExcavation.lastGroanTime > 14000) {
        this.portalExcavation.lastGroanTime = now;
        this.triggerOverburdenGroan(
          new THREE.Vector3(
            this.portalExcavation.position.x,
            this.portalExcavation.position.y + 2,
            this.portalExcavation.position.z
          )
        );
      }
    }
  }

  // Find nearest built structure for interaction
  public getNearbyStructure(pos: THREE.Vector3, maxDist = 4.0): BuiltStructure | null {
    let closest: BuiltStructure | null = null;
    let minDist = maxDist;

    for (const struct of this.builtStructures) {
      const d = Math.hypot(pos.x - struct.position.x, pos.z - struct.position.z);
      if (d < minDist) {
        minDist = d;
        closest = struct;
      }
    }
    return closest;
  }

  public updateCampfireVisuals(structureId: string, isLit: boolean, fuelHoursRemaining: number) {
    const node = this.campfireNodes.get(structureId);
    if (!node) return;
    const lit = isLit && fuelHoursRemaining > 0;
    node.isLit = lit;
    if (!lit) {
      node.light.intensity = 0;
      node.ashBedMat.emissiveIntensity = 0;
      node.ashBedMat.color.setHex(0x242424);
      node.flames.visible = false;
    } else if (fuelHoursRemaining <= 4.0) {
      node.light.intensity = 0.75;
      node.ashBedMat.emissiveIntensity = 0.35;
      node.ashBedMat.color.setHex(0x441100);
      node.flames.visible = true;
      node.flames.scale.set(0.4, 0.4, 0.4);
    } else {
      node.light.intensity = 2.6;
      node.ashBedMat.emissiveIntensity = 0.85;
      node.ashBedMat.color.setHex(0x1a0904);
      node.flames.visible = true;
      node.flames.scale.set(1.0, 1.0, 1.0);
    }
  }

  public checkCollision(
    x: number,
    y: number,
    z: number,
    playerRadius: number = 0.42
  ): { hit: boolean; structure?: BuiltStructure } {
    for (let i = 0; i < this.builtStructures.length; i++) {
      const s = this.builtStructures[i];
      // Campfires, rails, torches, and shaft/portal entrances can normally be stepped into / entered without solid block
      if (
        s.type === 'campfire' ||
        s.type === 'rail_track' ||
        s.type === 'timber_portal' ||
        s.type === 'deep_shaft' ||
        s.type === 'headframe_hoist' ||
        s.type === 'frontier_torch'
      ) {
        // If sabotaged by Apache rockfall, portal & shaft are physically impassable barriers until cleared!
        if (s.sabotaged && (s.type === 'timber_portal' || s.type === 'deep_shaft')) {
          const r = 2.0 + playerRadius;
          const dx = x - s.position.x;
          const dz = z - s.position.z;
          if (Math.abs(dx) <= r && Math.abs(dz) <= r && (dx * dx + dz * dz < r * r)) {
            return { hit: true, structure: s };
          }
        }
        continue;
      }
      const bp = STRUCTURE_BLUEPRINTS[s.type];
      const hw = (bp?.dimensions.width || 3.2) * 0.42;
      const hd = (bp?.dimensions.depth || 3.2) * 0.42;
      const r = Math.max(hw, hd) + playerRadius;
      const dx = x - s.position.x;
      const dz = z - s.position.z;
      if (Math.abs(dx) > r || Math.abs(dz) > r) continue;
      if (dx * dx + dz * dz < r * r) {
        return { hit: true, structure: s };
      }
    }
    return { hit: false };
  }

  // ==========================================
  // APACHE SABOTAGE & JACOB WALTZ CONCEALMENT
  // ==========================================

  public sabotageStructure(
    structureId: string,
    sabotageType: 'burned' | 'collapsed' | 'dismantled' = 'collapsed'
  ): BuiltStructure | null {
    const struct = this.builtStructures.find((s) => s.id === structureId);
    if (!struct) return null;

    struct.sabotaged = true;
    struct.sabotagedAt = Date.now();
    struct.sabotageType = sabotageType;
    struct.condition = 0;

    // If it was concealed, the raid strips the camouflage away
    if (struct.concealed) {
      this.removeConcealmentVisual(structureId);
      struct.concealed = false;
      struct.concealmentQuality = 0;
    }

    // Play mine sabotage rumble
    soundEngine.playMineSabotageRumble();

    // Create 3D Sabotage visual (charred timbers, tumbled rock slide blocking entrance)
    this.createSabotageVisual(struct);

    return struct;
  }

  public repairStructure(structureId: string): BuiltStructure | null {
    const struct = this.builtStructures.find((s) => s.id === structureId);
    if (!struct || !struct.sabotaged) return null;

    struct.sabotaged = false;
    struct.condition = 100;
    delete struct.sabotagedAt;
    delete struct.sabotageType;

    // Remove 3D sabotage visual
    this.removeSabotageVisual(structureId);

    // Play construction and pickaxe audio
    soundEngine.playConstruct();
    soundEngine.playHammerStake();

    // Spawn dust burst
    this.spawnDustBurst(
      new THREE.Vector3(struct.position.x, struct.position.y + 1.5, struct.position.z),
      0xdcb386,
      45
    );

    return struct;
  }

  public concealStructure(structureId: string, concealed: boolean): BuiltStructure | null {
    const struct = this.builtStructures.find((s) => s.id === structureId);
    if (!struct || struct.sabotaged) return null;

    struct.concealed = concealed;
    struct.concealmentQuality = concealed ? 95 : 0;

    if (concealed) {
      soundEngine.playBrushCamouflage();
      this.createConcealmentVisual(struct);
      this.spawnDustBurst(
        new THREE.Vector3(struct.position.x, struct.position.y + 1.2, struct.position.z),
        0x786e4a,
        25
      );
    } else {
      soundEngine.playBrushCamouflage();
      this.removeConcealmentVisual(structureId);
    }

    return struct;
  }

  private createSabotageVisual(struct: BuiltStructure) {
    this.removeSabotageVisual(struct.id);

    const group = new THREE.Group();
    group.position.set(struct.position.x, struct.position.y, struct.position.z);
    group.rotation.y = struct.rotationY;

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d2c,
      roughness: 0.96,
    });
    const charredWoodMat = new THREE.MeshStandardMaterial({
      color: 0x181412,
      roughness: 0.98,
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
      roughness: 0.5,
    });

    if (struct.type === 'timber_portal' || struct.type === 'deep_shaft') {
      // 1. Tumbled rockslide mound completely barricading portal opening
      for (let i = 0; i < 22; i++) {
        const radius = 0.55 + Math.random() * 0.5;
        const geo = new THREE.DodecahedronGeometry(radius, 0);
        const boulder = new THREE.Mesh(geo, rockMat);
        const bx = (Math.random() - 0.5) * 3.8;
        const bz = (Math.random() - 0.5) * 1.8;
        const by = 0.4 + Math.random() * 2.6 * (1.0 - Math.abs(bx) / 2.5);
        boulder.position.set(bx, by, bz);
        boulder.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        boulder.castShadow = true;
        group.add(boulder);
      }

      // 2. Charred collapsed timber props tilted and cracked across the rockslide
      for (let t = 0; t < 5; t++) {
        const tGeo = new THREE.BoxGeometry(0.42, 3.2 + Math.random() * 1.2, 0.42);
        const timber = new THREE.Mesh(tGeo, charredWoodMat);
        timber.position.set((Math.random() - 0.5) * 3.0, 1.2 + Math.random() * 1.2, (Math.random() - 0.5) * 1.0);
        timber.rotation.set(
          (Math.random() - 0.5) * 1.2,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 1.2
        );
        timber.castShadow = true;
        group.add(timber);
      }

      // 3. Glowing embers and smoldering ash bed
      for (let e = 0; e < 8; e++) {
        const ember = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), emberMat);
        ember.position.set((Math.random() - 0.5) * 3.2, 0.3 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2);
        group.add(ember);
      }
    } else if (struct.type === 'headframe_hoist') {
      // Buckled hoist shear-legs and snapped cable
      for (let i = 0; i < 14; i++) {
        const geo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.4, 0);
        const rock = new THREE.Mesh(geo, rockMat);
        rock.position.set((Math.random() - 0.5) * 3.5, 0.4 + Math.random() * 1.2, (Math.random() - 0.5) * 3.5);
        group.add(rock);
      }
      for (let t = 0; t < 4; t++) {
        const timber = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.0, 0.4), charredWoodMat);
        timber.position.set((Math.random() - 0.5) * 2.5, 1.5, (Math.random() - 0.5) * 2.5);
        timber.rotation.set(0.6, Math.random() * Math.PI, -0.5);
        group.add(timber);
      }
    } else {
      // Smashed camp / sluice / forge
      for (let i = 0; i < 10; i++) {
        const geo = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0);
        const rock = new THREE.Mesh(geo, rockMat);
        rock.position.set((Math.random() - 0.5) * 3.0, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 3.0);
        group.add(rock);
      }
      for (let t = 0; t < 3; t++) {
        const timber = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), charredWoodMat);
        timber.position.set((Math.random() - 0.5) * 2.0, 0.6, (Math.random() - 0.5) * 2.0);
        timber.rotation.set(Math.random() * 1.2, Math.random() * Math.PI, Math.random() * 1.2);
        group.add(timber);
      }
    }

    this.structuresGroup.add(group);
    this.sabotageVisuals.set(struct.id, group);
  }

  private removeSabotageVisual(structureId: string) {
    const existing = this.sabotageVisuals.get(structureId);
    if (existing) {
      this.structuresGroup.remove(existing);
      this.sabotageVisuals.delete(structureId);
    }
  }

  private createConcealmentVisual(struct: BuiltStructure) {
    this.removeConcealmentVisual(struct.id);

    const group = new THREE.Group();
    group.position.set(struct.position.x, struct.position.y, struct.position.z);
    group.rotation.y = struct.rotationY;

    const brushMat = new THREE.MeshStandardMaterial({
      color: 0x485239, // Arid desert mesquite & creosote green
      roughness: 0.95,
    });
    const dryBrushMat = new THREE.MeshStandardMaterial({
      color: 0x5e5b42, // Sunbaked ironwood scrub
      roughness: 0.98,
    });
    const stickMat = new THREE.MeshStandardMaterial({
      color: 0x423224, // Saguaro ribs & dead ironwood sticks
      roughness: 0.92,
    });
    const bermRockMat = new THREE.MeshStandardMaterial({
      color: 0x76533c, // Mountain hillside sandstone
      roughness: 0.94,
    });

    if (struct.type === 'timber_portal' || struct.type === 'deep_shaft') {
      // 1. Framework of crisscrossing saguaro ribs and desert ironwood poles
      for (let s = 0; s < 10; s++) {
        const stickGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.4 + Math.random() * 0.6, 6);
        const stick = new THREE.Mesh(stickGeo, stickMat);
        stick.position.set(-1.8 + s * 0.4, 2.2 + (Math.random() - 0.5) * 0.4, 0.15 + (Math.random() - 0.5) * 0.2);
        stick.rotation.set((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.45);
        stick.castShadow = true;
        group.add(stick);
      }

      // 2. Thick leafy clusters of desert mesquite and creosote covering the opening
      for (let b = 0; b < 24; b++) {
        const r = 0.55 + Math.random() * 0.4;
        const bGeo = new THREE.DodecahedronGeometry(r, 1);
        const mat = Math.random() > 0.4 ? brushMat : dryBrushMat;
        const foliage = new THREE.Mesh(bGeo, mat);
        const fx = -2.0 + (b % 6) * 0.8 + (Math.random() - 0.5) * 0.3;
        const fy = 0.8 + Math.floor(b / 6) * 0.95 + (Math.random() - 0.5) * 0.3;
        const fz = 0.25 + (Math.random() - 0.5) * 0.4;
        foliage.position.set(fx, fy, fz);
        foliage.scale.set(1.1 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.7 + Math.random() * 0.3);
        foliage.castShadow = true;
        group.add(foliage);
      }

      // 3. Natural rock berm along the ground to blend seamlessly with the mountain scree
      for (let r = 0; r < 12; r++) {
        const geo = new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.35, 0);
        const rock = new THREE.Mesh(geo, bermRockMat);
        rock.position.set(-2.2 + r * 0.4, 0.3 + Math.random() * 0.3, 0.35 + (Math.random() - 0.5) * 0.4);
        rock.castShadow = true;
        group.add(rock);
      }

      // 4. Subtle Jacob Waltz trail marker: small flat capstone balanced on ironwood stake
      const markerStake = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 5), stickMat);
      markerStake.position.set(2.1, 0.6, 0.5);
      group.add(markerStake);

      const markerStone = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.25), bermRockMat);
      markerStone.position.set(2.1, 1.25, 0.5);
      group.add(markerStone);
    } else {
      // General brush screen concealing camp / structure
      for (let b = 0; b < 14; b++) {
        const r = 0.6 + Math.random() * 0.4;
        const bGeo = new THREE.DodecahedronGeometry(r, 1);
        const mat = Math.random() > 0.4 ? brushMat : dryBrushMat;
        const foliage = new THREE.Mesh(bGeo, mat);
        foliage.position.set((Math.random() - 0.5) * 3.5, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 3.5);
        group.add(foliage);
      }
    }

    this.structuresGroup.add(group);
    this.concealmentVisuals.set(struct.id, group);
  }

  private removeConcealmentVisual(structureId: string) {
    const existing = this.concealmentVisuals.get(structureId);
    if (existing) {
      this.structuresGroup.remove(existing);
      this.concealmentVisuals.delete(structureId);
    }
  }

  public dispose() {
    this.sabotageVisuals.clear();
    this.concealmentVisuals.clear();
    this.structuresGroup.clear();
    this.excavationSiteGroup.clear();
    this.ghostGroup.clear();
    this.claimGroup.clear();
    this.particlesGroup.clear();
  }
}
