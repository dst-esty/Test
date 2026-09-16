import * as THREE from 'three';
import { MineLayerData, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';

export const PREGENERATED_MINE_LAYERS: Omit<MineLayerData, 'unlocked' | 'digProgress' | 'currentHits'>[] = [
  {
    level: 1,
    id: 'layer_1_caliche',
    name: 'Upper Caliche & Sinter Drift',
    depthMeters: 8.5,
    strata: 'Desert Caliche Crust & Alluvial Gravel',
    description: 'Pliocene desert caliche cemented with quartz river gravels. Early prospectors scratched this shallow drift seeking alluvial placer float.',
    hitsNeeded: 4,
    primaryMineral: 'Alluvial Gold Nuggets & Flakes',
    secondaryMineral: 'Spanish Mule Shoes & Iron Nails',
    accentColor: '#d4af37',
  },
  {
    level: 2,
    id: 'layer_2_peralta',
    name: '1840s Peralta Spanish Timber Drift',
    depthMeters: 22.0,
    strata: 'Hematite Red Sandstone & Vein Quartz',
    description: 'Ancient square-set pine timbers and rusted ore rails carved by the 1848 Peralta mining expedition before the legendary Apache siege.',
    hitsNeeded: 5,
    primaryMineral: 'Rich Vein Quartz-Gold Stringers',
    secondaryMineral: 'Spanish Silver 8-Reales & Jesuit Cross',
    accentColor: '#e06b3a',
  },
  {
    level: 3,
    id: 'layer_3_granite',
    name: 'Great Granite Sump & Amethyst Fissure',
    depthMeters: 42.0,
    strata: 'Precambrian Granodiorite & Crystalline Amethyst',
    description: 'Dense crystalline bedrock fractured by tectonic fissures. Towering purple amethyst geodes and high-grade electrum ore glitter in the darkness.',
    hitsNeeded: 6,
    primaryMineral: 'Solid Electrum & Pyritic Gold Clusters',
    secondaryMineral: 'Sparkling Amethyst Geodes & Galena',
    accentColor: '#a855f7',
  },
  {
    level: 4,
    id: 'layer_4_motherlode',
    name: 'The Lost Dutchman Mother Lode Vault',
    depthMeters: 65.0,
    strata: 'Volcanic Basalt Caldera & Hydrothermal Quartz Chimney',
    description: 'The legendary mother lode chimney where Jacob Waltz extracted his fabulously rich rose gold. Historic caches, gold bullion, and missing map relics.',
    hitsNeeded: 8,
    primaryMineral: 'Pure Rose Gold Slabs & Bullion Ingots',
    secondaryMineral: 'Jacob Waltz Map Pouch & Spanish Silver Ingots',
    accentColor: '#eab308',
  },
];

export class UndergroundLayersManager {
  private scene: THREE.Scene;
  private mainGroup: THREE.Group = new THREE.Group();
  private layersGroup: THREE.Group = new THREE.Group();
  private shaftGroup: THREE.Group = new THREE.Group();
  private particlesGroup: THREE.Group = new THREE.Group();

  public surfacePos: Vector3D = { x: 0, y: 0, z: 0 };
  public surfaceY = 0;
  public currentLevel = 0; // 0 = surface, 1-4 = underground layers
  public maxUnlockedLevel = 1;

  public layers: MineLayerData[] = [];
  public shaftExcavationHits: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  private layerMeshes: Map<number, THREE.Group> = new Map();
  private pitFissureMeshes: Map<number, THREE.Mesh> = new Map();
  private lanternLights: THREE.PointLight[] = [];
  private animatedCrystals: THREE.Mesh[] = [];

  // Flying particles during shaft digging
  private debrisList: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVel: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.mainGroup.add(this.layersGroup);
    this.mainGroup.add(this.shaftGroup);
    this.mainGroup.add(this.particlesGroup);
    this.scene.add(this.mainGroup);

    this.initLayersData();
  }

  private initLayersData() {
    this.layers = PREGENERATED_MINE_LAYERS.map((pl, idx) => ({
      ...pl,
      unlocked: idx === 0, // Layer 1 starts unlocked once mine is built
      digProgress: 0,
      currentHits: 0,
    }));
  }

  // Anchor subterranean mine shaft and pregenerated layers beneath a built mine
  public initAtPosition(pos: Vector3D, surfaceY: number) {
    this.surfacePos = { ...pos };
    this.surfaceY = surfaceY;
    this.mainGroup.position.set(pos.x, 0, pos.z);

    this.rebuildAllLayers();
    this.rebuildShaftInfrastructure();
  }

  public rebuildAllLayers() {
    this.layersGroup.clear();
    this.layerMeshes.clear();
    this.pitFissureMeshes.clear();
    this.lanternLights = [];
    this.animatedCrystals = [];

    this.layers.forEach((layer) => {
      const chamberGroup = this.createLayerChamber(layer);
      this.layersGroup.add(chamberGroup);
      this.layerMeshes.set(layer.level, chamberGroup);
    });
  }

  // Create authentic 3D subterranean chamber for a pregenerated geological layer
  private createLayerChamber(layer: MineLayerData): THREE.Group {
    const group = new THREE.Group();
    const floorY = this.surfaceY - layer.depthMeters;
    group.position.set(0, floorY, 0);

    let wallColor = 0x6e523b;
    let floorColor = 0x5a412e;
    let radius = 13.0;
    let height = 5.0;

    if (layer.level === 1) {
      wallColor = 0x8a6e50; // Sandstone caliche
      floorColor = 0x6e533d;
      radius = 12.0;
      height = 4.6;
    } else if (layer.level === 2) {
      wallColor = 0x783526; // Peralta red hematite sandstone
      floorColor = 0x5c2619;
      radius = 13.5;
      height = 5.2;
    } else if (layer.level === 3) {
      wallColor = 0x363438; // Granite bedrock
      floorColor = 0x27262b;
      radius = 15.0;
      height = 6.2;
    } else if (layer.level === 4) {
      wallColor = 0x1c1a1b; // Black basalt caldera
      floorColor = 0x141213;
      radius = 16.5;
      height = 7.5;
    }

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.94,
      metalness: 0.08,
      side: THREE.BackSide,
    });

    // 1. Irregular Cavern Perimeter Shell
    const caveGeo = new THREE.CylinderGeometry(radius, radius * 0.94, height, 18, 2, true);
    const posAttr = caveGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const noise = Math.sin(vx * 0.8) * Math.cos(vz * 0.8) * 0.45;
      posAttr.setXYZ(i, vx + noise, vy, vz + noise);
    }
    caveGeo.computeVertexNormals();

    const caveWall = new THREE.Mesh(caveGeo, wallMat);
    caveWall.position.y = height / 2;
    group.add(caveWall);

    // Cavern Ceiling with jagged rock protrusions
    const roofGeo = new THREE.CircleGeometry(radius, 18);
    const caveRoof = new THREE.Mesh(roofGeo, wallMat);
    caveRoof.position.y = height;
    caveRoof.rotation.x = Math.PI / 2;
    group.add(caveRoof);

    // Bedrock Floor
    const floorGeo = new THREE.CircleGeometry(radius, 18);
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.96,
    });
    const caveFloor = new THREE.Mesh(floorGeo, floorMat);
    caveFloor.rotation.x = -Math.PI / 2;
    caveFloor.position.y = 0.02;
    caveFloor.receiveShadow = true;
    group.add(caveFloor);

    // 2. Square-Set Heavy Timber Shoring Sets (Historical 1800s drift timbering)
    const timberMat = new THREE.MeshStandardMaterial({
      color: layer.level === 2 ? 0x4a2e1d : 0x3d2718,
      roughness: 0.9,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.85,
      roughness: 0.35,
    });

    const setAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    setAngles.forEach((ang) => {
      const dist = radius * 0.55;
      const tx = Math.cos(ang) * dist;
      const tz = Math.sin(ang) * dist;

      // Timber Bent: Left Post, Right Post, Top Cap
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, height * 0.85, 0.35), timberMat);
      leftPost.position.set(tx - 1.2, height * 0.42, tz);
      group.add(leftPost);

      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, height * 0.85, 0.35), timberMat);
      rightPost.position.set(tx + 1.2, height * 0.42, tz);
      group.add(rightPost);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.35, 0.35), timberMat);
      cap.position.set(tx, height * 0.85, tz);
      group.add(cap);

      // Hanging miner candle lantern
      const lanternMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 6), ironMat);
      lanternMesh.position.set(tx, height * 0.72, tz);
      group.add(lanternMesh);

      const lanternLight = new THREE.PointLight(0xffa844, 1.8, 14);
      lanternLight.position.set(tx, height * 0.7, tz);
      group.add(lanternLight);
      this.lanternLights.push(lanternLight);
    });

    // 3. Diggable Mineral Veins and Lore Artifacts for each Layer
    this.populateLayerFeatures(group, layer, height, radius);

    // 4. Central Shaft Pit Collar and Floor Bedrock Plate for Digging Down
    const pitCollar = new THREE.Group();
    pitCollar.position.set(0, 0, 0);

    // Square timber border around the shaft pit (3.4m x 3.4m)
    const beamSize = 3.6;
    [-beamSize / 2, beamSize / 2].forEach((bx) => {
      const bX = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, beamSize + 0.35), timberMat);
      bX.position.set(bx, 0.18, 0);
      pitCollar.add(bX);
    });
    [-beamSize / 2, beamSize / 2].forEach((bz) => {
      const bZ = new THREE.Mesh(new THREE.BoxGeometry(beamSize + 0.35, 0.35, 0.35), timberMat);
      bZ.position.set(0, 0.18, bz);
      pitCollar.add(bZ);
    });

    // Bedrock floor plate in center of pit
    const fissureMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.95,
      emissive: 0x442200,
      emissiveIntensity: 0.2,
    });
    const fissureMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), fissureMat);
    fissureMesh.position.set(0, 0.08, 0);
    pitCollar.add(fissureMesh);
    this.pitFissureMeshes.set(layer.level, fissureMesh);

    group.add(pitCollar);

    return group;
  }

  // Populate specific historical/geological features for each pregenerated layer
  private populateLayerFeatures(group: THREE.Group, layer: MineLayerData, height: number, radius: number) {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.22,
      emissive: 0x775500,
      emissiveIntensity: 0.55,
    });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4d3829, roughness: 0.95 });

    if (layer.level === 1) {
      // Layer 1: Placer Gold Pockets & Alluvial Sand Benches
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + 0.3;
        const r = radius * 0.72;
        const vein = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.25, 1), goldMat);
        vein.position.set(Math.cos(ang) * r, 0.6 + Math.random() * 1.5, Math.sin(ang) * r);
        vein.rotation.set(Math.random(), Math.random(), Math.random());
        group.add(vein);
      }

      // Spanish mule shoe relic & pioneer pick head on crate
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x543621, roughness: 0.9 })
      );
      crate.position.set(2.8, 0.4, 2.4);
      group.add(crate);

      const relic = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.03, 6, 12, Math.PI * 1.4),
        new THREE.MeshStandardMaterial({ color: 0x8c7853, metalness: 0.8, roughness: 0.4 })
      );
      relic.position.set(2.8, 0.82, 2.4);
      relic.rotation.x = Math.PI / 2;
      group.add(relic);
    } else if (layer.level === 2) {
      // Layer 2: Peralta Spanish Drift - Red Sandstone, Silver & Quartz Veins, Ore Cart Track
      const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.4 });
      for (const rx of [-0.4, 0.4]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 7.0), trackMat);
        rail.position.set(rx + 3.2, 0.08, 0);
        group.add(rail);
      }
      for (let tz = -3.0; tz <= 3.0; tz += 0.8) {
        const tie = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.06, 0.16),
          new THREE.MeshStandardMaterial({ color: 0x422a18, roughness: 0.9 })
        );
        tie.position.set(3.2, 0.04, tz);
        group.add(tie);
      }

      // Spanish Colonial Chest with Silver & Gold
      const chest = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.7, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.85 })
      );
      chest.position.set(-3.5, 0.35, -2.8);
      group.add(chest);

      const silverCoins = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.25 })
      );
      silverCoins.position.set(-3.5, 0.75, -2.8);
      group.add(silverCoins);

      // Vein Quartz Gold Outcrops
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        const r = radius * 0.78;
        const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + Math.random() * 0.3, 1), goldMat);
        ore.position.set(Math.cos(ang) * r, 1.0 + Math.random() * 2.2, Math.sin(ang) * r);
        group.add(ore);
      }
    } else if (layer.level === 3) {
      // Layer 3: Great Granite Sump & Sparkling Amethyst Crystals
      const amethystMat = new THREE.MeshStandardMaterial({
        color: 0x9933dd,
        metalness: 0.3,
        roughness: 0.15,
        emissive: 0x440077,
        emissiveIntensity: 0.85,
        transparent: true,
        opacity: 0.9,
      });

      for (let c = 0; c < 12; c++) {
        const ang = (c / 12) * Math.PI * 2 + 0.2;
        const r = radius * 0.75;
        const geode = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 6), amethystMat);
        geode.position.set(Math.cos(ang) * r, 0.7 + Math.random() * 2.5, Math.sin(ang) * r);
        geode.rotation.set((Math.random() - 0.5) * 0.8, Math.random() * Math.PI, (Math.random() - 0.5) * 0.8);
        group.add(geode);
        this.animatedCrystals.push(geode);
      }

      // Deep Electrum Vein Clusters
      for (let e = 0; e < 8; e++) {
        const ang = (e / 8) * Math.PI * 2 + 0.6;
        const r = radius * 0.82;
        const electrum = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), goldMat);
        electrum.position.set(Math.cos(ang) * r, 1.2 + Math.random() * 2.8, Math.sin(ang) * r);
        group.add(electrum);
      }
    } else if (layer.level === 4) {
      // Layer 4: The Lost Dutchman Mother Lode Vault
      // Colossal Gleaming Mother Lode Wall
      const motherLodeWall = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 4.5, 1.2),
        new THREE.MeshStandardMaterial({
          color: 0xffe066,
          metalness: 0.98,
          roughness: 0.15,
          emissive: 0xaa7700,
          emissiveIntensity: 1.1,
        })
      );
      motherLodeWall.position.set(0, 2.5, -radius * 0.7);
      group.add(motherLodeWall);

      // Gold bullion bars stacked by Jacob Waltz
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.95,
        roughness: 0.15,
        emissive: 0x553300,
        emissiveIntensity: 0.4,
      });
      for (let b = 0; b < 9; b++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.22), barMat);
        bar.position.set(-2.5 + (b % 3) * 0.45, 0.1 + Math.floor(b / 3) * 0.16, 2.5);
        group.add(bar);
      }

      // Historic Miner Skeleton & Lost Map Pouch
      const skeletonBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 1.2), stoneMat);
      skeletonBase.position.set(2.8, 0.15, 1.8);
      group.add(skeletonBase);

      const mapPouch = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x6e4822, roughness: 0.85 })
      );
      mapPouch.position.set(2.8, 0.35, 1.8);
      group.add(mapPouch);

      // Geothermal glowing fissures
      const lavaCrack = new THREE.Mesh(
        new THREE.PlaneGeometry(4.0, 0.8),
        new THREE.MeshBasicMaterial({ color: 0xff5511, side: THREE.DoubleSide })
      );
      lavaCrack.rotation.x = -Math.PI / 2;
      lavaCrack.position.set(0, 0.05, 3.8);
      group.add(lavaCrack);

      const calderaLight = new THREE.PointLight(0xff6611, 2.5, 18);
      calderaLight.position.set(0, 1.2, 3.8);
      group.add(calderaLight);
    }
  }

  // Rebuild the continuous vertical shaft with pine ladders and timber guide posts
  public rebuildShaftInfrastructure() {
    this.shaftGroup.clear();

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.92 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.4 });

    // Maximum depth reached
    const deepestLayer = this.layers.find((l) => l.level === this.maxUnlockedLevel) || this.layers[0];
    const totalShaftHeight = deepestLayer.depthMeters + 4.0;
    const shaftTopY = this.surfaceY + 2.0;

    // 4 Continuous Vertical Timber Corner Posts (forming the vertical shaft collar way)
    const collarRadius = 1.65;
    const cornerPositions = [
      { x: -collarRadius, z: -collarRadius },
      { x: collarRadius, z: -collarRadius },
      { x: collarRadius, z: collarRadius },
      { x: -collarRadius, z: collarRadius },
    ];

    cornerPositions.forEach((pos) => {
      const guidePost = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, totalShaftHeight, 0.3),
        woodMat
      );
      guidePost.position.set(pos.x, shaftTopY - totalShaftHeight / 2, pos.z);
      this.shaftGroup.add(guidePost);
    });

    // Hoist Cable running down center
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, totalShaftHeight, 6), ironMat);
    cable.position.set(0, shaftTopY - totalShaftHeight / 2, 0);
    this.shaftGroup.add(cable);

    // Continuous Heavy Pine Ladder attached to north timber guide wall (Z = -collarRadius + 0.15)
    const ladderX = -0.5;
    const ladderZ = -collarRadius + 0.2;

    const sideRailL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, totalShaftHeight, 6),
      woodMat
    );
    sideRailL.position.set(ladderX - 0.35, shaftTopY - totalShaftHeight / 2, ladderZ);
    this.shaftGroup.add(sideRailL);

    const sideRailR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, totalShaftHeight, 6),
      woodMat
    );
    sideRailR.position.set(ladderX + 0.35, shaftTopY - totalShaftHeight / 2, ladderZ);
    this.shaftGroup.add(sideRailR);

    // Ladder rungs every 0.38m from surface down to deepest floor
    const rungCount = Math.floor(totalShaftHeight / 0.38);
    for (let r = 0; r < rungCount; r++) {
      const ry = shaftTopY - r * 0.38;
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), woodMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(ladderX, ry, ladderZ);
      this.shaftGroup.add(rung);
    }
  }

  // Digging Down Engine: Chipping through the bedrock pit in the active layer to sink the shaft!
  public digDown(
    tool: 'pickaxe' | 'shovel' | string = 'pickaxe',
    playerPos?: THREE.Vector3
  ): {
    breached: boolean;
    progress: number;
    currentHits: number;
    hitsNeeded: number;
    newLayer?: MineLayerData;
    rewardGold?: number;
    rewardName?: string;
    message: string;
  } {
    // If on surface, digging at shaft collar descends to Layer 1 or sinks deeper
    let activeLevel = this.currentLevel;
    if (activeLevel === 0) activeLevel = 1;

    const layer = this.layers.find((l) => l.level === activeLevel);
    if (!layer) {
      return {
        breached: false,
        progress: 0,
        currentHits: 0,
        hitsNeeded: 4,
        message: 'No active mine shaft found to dig down into.',
      };
    }

    // Play strike sounds & spawn debris
    if (tool === 'shovel') {
      soundEngine.playShovelDig();
    } else {
      soundEngine.playRockChisel();
    }

    const hitPos = playerPos
      ? playerPos.clone()
      : new THREE.Vector3(this.surfacePos.x, this.surfaceY - layer.depthMeters + 0.5, this.surfacePos.z);
    this.spawnDigDebris(hitPos);

    // Can we sink deeper?
    if (activeLevel >= 4) {
      // Already at deepest layer (Mother Lode)! Digging produces high-grade jackpot ore!
      soundEngine.playGoldPickup();
      return {
        breached: false,
        progress: 100,
        currentHits: 8,
        hitsNeeded: 8,
        rewardGold: 15.0,
        rewardName: 'Mother Lode Raw Rose Gold Chunk',
        message: '🌟 Mining the Mother Lode Chimney! Dense basalt mantle bedrock secures the drift—excavation has reached the geologic basement and will never breach through to the other side.',
      };
    }

    const currentHits = (this.shaftExcavationHits[activeLevel] || 0) + 1;
    this.shaftExcavationHits[activeLevel] = currentHits;

    const hitsNeeded = layer.hitsNeeded;
    const progress = Math.min(100, Math.round((currentHits / hitsNeeded) * 100));
    layer.digProgress = progress;
    layer.currentHits = currentHits;

    // Visually crack the bedrock fissure mesh
    const fissure = this.pitFissureMeshes.get(activeLevel);
    if (fissure) {
      const mat = fissure.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.2 + (progress / 100) * 0.9;
      }
      fissure.scale.y = 1.0 - (progress / 100) * 0.35;
    }

    // Check for breakthrough into the next layer!
    if (currentHits >= hitsNeeded) {
      const nextLevel = activeLevel + 1;
      this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel, nextLevel);

      const nextLayer = this.layers.find((l) => l.level === nextLevel);
      if (nextLayer) {
        nextLayer.unlocked = true;
      }

      // Rebuild shaft ladder down to the new depth
      this.rebuildShaftInfrastructure();

      soundEngine.playLayerBreakthrough();

      let rewardGold = 6.0;
      let rewardName = 'Excavated Spanish Gold Float';
      if (nextLevel === 2) {
        rewardGold = 8.0;
        rewardName = 'Peralta Quartz Gold Float & Spanish Silver';
      } else if (nextLevel === 3) {
        rewardGold = 16.0;
        rewardName = 'Massive Electrum Specimen & Amethyst Geode';
      } else if (nextLevel === 4) {
        rewardGold = 35.0;
        rewardName = 'Jesuit Stamped Gold Bullion Bar';
      }

      return {
        breached: true,
        progress: 100,
        currentHits,
        hitsNeeded,
        newLayer: nextLayer,
        rewardGold,
        rewardName,
        message: `🎉 BREAKTHROUGH! Sunk shaft down into Layer ${nextLevel}: ${nextLayer?.name || ''}! (${nextLayer?.depthMeters}m depth). Ladder extended! (+${rewardGold} oz Gold found)`,
      };
    }

    return {
      breached: false,
      progress,
      currentHits,
      hitsNeeded,
      message: `⛏️ Sinking Shaft: Layer ${activeLevel} (${currentHits}/${hitsNeeded} strikes, ${progress}%). Strata: ${layer.strata}`,
    };
  }

  // Physical particles when digging in the mine shaft
  private spawnDigDebris(center: THREE.Vector3) {
    const rockColors = [0x78563e, 0x4a3728, 0x9c7450, 0xd4af37];
    for (let i = 0; i < 14; i++) {
      const size = 0.06 + Math.random() * 0.12;
      const geo = Math.random() < 0.5 ? new THREE.DodecahedronGeometry(size, 0) : new THREE.BoxGeometry(size, size, size);
      const color = rockColors[Math.floor(Math.random() * rockColors.length)];
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      mesh.position.set(center.x + (Math.random() - 0.5) * 0.6, center.y + 0.2, center.z + (Math.random() - 0.5) * 0.6);
      this.particlesGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.5;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 2.5 + Math.random() * 3.5, Math.sin(angle) * speed);

      this.debrisList.push({
        mesh,
        velocity: vel,
        rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0,
        maxLife: 0.9 + Math.random() * 0.6,
      });
    }
  }

  // Check if player position is near the surface shaft collar or underground pit
  public isNearShaft(pos: Vector3D, range = 5.0): boolean {
    const dx = pos.x - this.surfacePos.x;
    const dz = pos.z - this.surfacePos.z;
    return Math.sqrt(dx * dx + dz * dz) <= range;
  }

  // Check if player is near the excavation pit in the center of the chamber
  public isNearExcavationPit(pos: Vector3D, range = 3.2): boolean {
    const dx = pos.x - this.surfacePos.x;
    const dz = pos.z - this.surfacePos.z;
    return Math.sqrt(dx * dx + dz * dz) <= range;
  }

  // Get floor elevation for locomotion when underground
  public getFloorElevationForPosition(x: number, z: number, currentLevel: number): number {
    if (currentLevel === 0) return this.surfaceY;
    const layer = this.layers.find((l) => l.level === currentLevel);
    if (!layer) return this.surfaceY;
    return this.surfaceY - layer.depthMeters;
  }

  // Update loop for particles and light flickers
  public update(delta: number, now: number) {
    // 1. Lantern flicker
    this.lanternLights.forEach((light, idx) => {
      light.intensity = 1.8 + Math.sin(now * 0.008 + idx * 1.7) * 0.35 + (Math.random() - 0.5) * 0.12;
    });

    // 2. Crystal pulsating glow
    this.animatedCrystals.forEach((crystal, idx) => {
      const mat = crystal.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.7 + Math.sin(now * 0.004 + idx) * 0.3;
      }
    });

    // 3. Debris particles
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const p = this.debrisList[i];
      p.life += delta;
      p.velocity.y -= 18.0 * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.rotation.x += p.rotVel.x * delta;
      p.mesh.rotation.y += p.rotVel.y * delta;

      if (p.life >= p.maxLife) {
        this.particlesGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.debrisList.splice(i, 1);
      }
    }
  }

  public dispose() {
    this.scene.remove(this.mainGroup);
    this.mainGroup.clear();
  }
}
