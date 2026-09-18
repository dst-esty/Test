import * as THREE from 'three';
import { BuiltStructure, ClaimInfo, MineStructureType, PortalExcavationState, StructureBlueprint, TerritoryClaim, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';

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

  constructor(scene: THREE.Scene, getTerrainHeight: (x: number, z: number) => number) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;

    this.scene.add(this.claimGroup);
    this.scene.add(this.structuresGroup);
    this.scene.add(this.excavationSiteGroup);
    this.scene.add(this.ghostGroup);
    this.scene.add(this.particlesGroup);
  }

  // ==========================================
  // CLAIM STAKING ENGINE
  // ==========================================

  public stakeClaim(name: string, pos: Vector3D, size = 42): ClaimInfo {
    this.claimGroup.clear();

    const claim: ClaimInfo = {
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

    // Engraved Brass Legal Notice Plate
    const noticePlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.06), brassMat);
    noticePlate.position.set(0, 2.1, 0.2);
    monument.add(noticePlate);

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
      const isOwner = localProspectorId && claim.ownerId === localProspectorId;
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

      const noticePlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), brassMat);
      noticePlate.position.set(0, 1.8, 0.18);
      monument.add(noticePlate);

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

    // Rock retaining walls flanking the portal
    for (let r = 0; r < 8; r++) {
      const rockL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.4, 0), rockMat);
      rockL.position.set(-2.8 - Math.random() * 0.8, 0.8 + r * 0.45, -Math.random() * 2);
      rockL.castShadow = true;
      group.add(rockL);

      const rockR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.4, 0), rockMat);
      rockR.position.set(2.8 + Math.random() * 0.8, 0.8 + r * 0.45, -Math.random() * 2);
      rockR.castShadow = true;
      group.add(rockR);
    }

    // Working Hanging Miner's Lantern
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 6), ironMat);
    lantern.position.set(0, 3.8, 0.2);
    group.add(lantern);

    const lanternLight = new THREE.PointLight(0xffa544, 2.2, 18);
    lanternLight.position.set(0, 3.6, 0.2);
    group.add(lanternLight);

    // Dark subterranean void plane
    const voidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 4.2),
      new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.DoubleSide })
    );
    voidPlane.position.set(0, 2.1, -5.6);
    group.add(voidPlane);

    return group;
  }

  // Structure 2: Shaft Headframe & Hoist Tower
  private createHeadframeMesh(_structure: BuiltStructure): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x422d1b, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.4 });

    // 4 Inclined Timber Legs (A-frame tower ~7.5m high)
    const legGeo = new THREE.BoxGeometry(0.4, 7.8, 0.4);
    const legPositions = [
      { x: -1.6, z: -1.6, rotZ: -0.12, rotX: -0.12 },
      { x: 1.6, z: -1.6, rotZ: 0.12, rotX: -0.12 },
      { x: 1.6, z: 1.6, rotZ: 0.12, rotX: 0.12 },
      { x: -1.6, z: 1.6, rotZ: -0.12, rotX: 0.12 },
    ];

    legPositions.forEach((l) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(l.x, 3.8, l.z);
      leg.rotation.z = l.rotZ;
      leg.rotation.x = l.rotX;
      leg.castShadow = true;
      group.add(leg);
    });

    // Horizontal & X Cross-bracing timbers
    [2.2, 4.5, 6.8].forEach((h) => {
      const w = 3.6 - (h / 7.8) * 1.6;
      const braceX1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, 0.25), woodMat);
      braceX1.position.set(0, h, -w / 2);
      group.add(braceX1);

      const braceX2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, 0.25), woodMat);
      braceX2.position.set(0, h, w / 2);
      group.add(braceX2);

      const braceZ1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, w), woodMat);
      braceZ1.position.set(-w / 2, h, 0);
      group.add(braceZ1);

      const braceZ2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, w), woodMat);
      braceZ2.position.set(w / 2, h, 0);
      group.add(braceZ2);
    });

    // Top Sheave Wheel Housing & Rotating Iron Pulley
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.8), woodMat);
    topCap.position.y = 7.4;
    group.add(topCap);

    const sheaveWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.09, 8, 24),
      ironMat
    );
    sheaveWheel.position.set(0, 8.2, 0);
    sheaveWheel.rotation.y = Math.PI / 2;
    sheaveWheel.castShadow = true;
    group.add(sheaveWheel);
    this.sheaveWheels.push(sheaveWheel);

    // Steel Hoist Cable
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 6.5, 4),
      ironMat
    );
    cable.position.set(0, 4.8, 0.5);
    group.add(cable);

    // Heavy Timber & Iron Ore Bucket
    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.45, 0.9, 10),
      ironMat
    );
    bucket.position.set(0, 1.5, 0.5);
    bucket.castShadow = true;
    group.add(bucket);

    // Raw quartz gold ore chunks in the bucket
    const goldOreInBucket = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.35, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.25,
        emissive: 0x664400,
        emissiveIntensity: 0.5,
      })
    );
    goldOreInBucket.position.set(0, 1.9, 0.5);
    group.add(goldOreInBucket);

    // Ground Winch Drum & Hand Crank
    const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), woodMat);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(0, 0.8, -1.2);
    group.add(winchDrum);

    const crankHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), ironMat);
    crankHandle.position.set(0.65, 0.9, -1.2);
    group.add(crankHandle);

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
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4f3627, roughness: 0.95 });

    // Square Timber Shaft Collar
    const collarSize = 4.2;
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

    // Wooden Ladder leading down into the pit
    const ladderL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 5), woodMat);
    ladderL.position.set(-1.4, 1.4, -1.8);
    ladderL.rotation.x = -0.15;
    group.add(ladderL);

    const ladderR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 5), woodMat);
    ladderR.position.set(-0.8, 1.4, -1.8);
    ladderR.rotation.x = -0.15;
    group.add(ladderR);

    // Ladder rungs
    for (let r = 0; r < 9; r++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), woodMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(-1.1, 0.2 + r * 0.38, -1.8 + r * 0.05);
      group.add(rung);
    }

    // Pit Bedrock Floor with Exposed Quartz Gold Vein
    const pitFloor = new THREE.Mesh(
      new THREE.BoxGeometry(collarSize * 0.9, 0.4, collarSize * 0.9),
      rockMat
    );
    pitFloor.position.set(0, -0.4, 0);
    group.add(pitFloor);

    // Glowing quartz gold vein outcrop inside the excavation pit
    const vein = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.6, 1.4),
      new THREE.MeshStandardMaterial({
        color: 0xffdf66,
        metalness: 0.85,
        roughness: 0.25,
        emissive: 0x885500,
        emissiveIntensity: 0.75,
      })
    );
    vein.position.set(0.5, 0.1, 0.3);
    group.add(vein);

    // Yellow safety warning sign: "DANGER - ACTIVE SHAFT"
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.6, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xe6b800, roughness: 0.4 })
    );
    sign.position.set(0, 1.9, collarSize / 2 + 0.1);
    group.add(sign);

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
      // Campfires or rails can be stepped over / walked past
      if (s.type === 'campfire' || s.type === 'rail_track') continue;
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

  public dispose() {
    this.structuresGroup.clear();
    this.excavationSiteGroup.clear();
    this.ghostGroup.clear();
    this.claimGroup.clear();
    this.particlesGroup.clear();
  }
}
