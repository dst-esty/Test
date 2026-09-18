import * as THREE from 'three';
import { MineLayerData, Vector3D, RoomDirection, ExcavatedRoom, WaterTableState } from '../types';
import { soundEngine } from '../audio/soundEffects';
import { UndergroundVoxelEngine } from './undergroundVoxels';
import { MountainDustParticleSystem } from './mountainDustParticles';
import { MountainHoleManager, MountainHole } from './mountainHoles';

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
    isWaterBearing: false,
    waterLevel: 0,
    aquiferPressure: 0,
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
    isWaterBearing: false,
    waterLevel: 0,
    aquiferPressure: 0,
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
    isWaterBearing: false,
    waterLevel: 0,
    aquiferPressure: 5,
  },
  {
    level: 4,
    id: 'layer_4_motherlode',
    name: 'The Lost Dutchman Mother Lode Vault',
    depthMeters: 65.0,
    strata: 'Volcanic Basalt Caldera & Hydrothermal Quartz Chimney',
    description: 'The legendary mother lode chimney where Jacob Waltz extracted his fabulously rich rose gold. Historic caches, gold bullion, and missing map relics.',
    hitsNeeded: 7,
    primaryMineral: 'Pure Rose Gold Slabs & Bullion Ingots',
    secondaryMineral: 'Jacob Waltz Map Pouch & Spanish Silver Ingots',
    accentColor: '#eab308',
    isWaterBearing: false,
    waterLevel: 0,
    aquiferPressure: 15,
  },
  {
    level: 5,
    id: 'layer_5_pyrite_sump',
    name: 'Hydrothermal Quartz & Pyritic Sump',
    depthMeters: 88.0,
    strata: 'Fractured Quartzite & Chalcopyrite Seepage Zone',
    description: 'Damp, glistening rock walls near the regional groundwater table. Water droplets echo from fractured ceilings, warning of the immense aquifer beneath.',
    hitsNeeded: 8,
    primaryMineral: 'Crystalline Chalcopyrite & Wire Gold',
    secondaryMineral: 'Native Copper Crystals & Pyrite Nodules',
    accentColor: '#22c55e',
    isWaterBearing: true,
    waterLevel: 0.15,
    aquiferPressure: 45,
  },
  {
    level: 6,
    id: 'layer_6_aquifer_fault',
    name: 'Deep Tectonic Aquifer Fault & Water Table',
    depthMeters: 112.0,
    strata: 'Shattered Dolomite & High-Pressure Groundwater Conduit',
    description: 'Breaches the Superstition regional water table! Torrential groundwater gushes from faults. Keep Cornish steam dewatering pumps running to prevent complete flooding!',
    hitsNeeded: 9,
    primaryMineral: 'High-Grade Bonanza Electrum & Tellurides',
    secondaryMineral: 'Aquifer Calcite Spar & Hydrothermal Quartz',
    accentColor: '#06b6d4',
    isWaterBearing: true,
    waterLevel: 0.95,
    aquiferPressure: 90,
  },
  {
    level: 7,
    id: 'layer_7_sunken_bonanza',
    name: 'Submerged Sunken Bonanza Drift',
    depthMeters: 138.0,
    strata: 'Sub-Water Table Metamorphic Schist & Gold Reef',
    description: 'Ancient sunken cavern completely inundated by crystalline groundwater. Swim through flooded stopes to mine fabulously rich gold reefs before oxygen runs out!',
    hitsNeeded: 10,
    primaryMineral: 'Subterranean Gold Reef & Giant Nuggets',
    secondaryMineral: 'Sunken Spanish Pack Train Relics',
    accentColor: '#3b82f6',
    isWaterBearing: true,
    waterLevel: 2.2,
    aquiferPressure: 100,
  },
];

// Helper to generate procedural endless layers beyond level 7
export function generateProceduralMineLayer(level: number): MineLayerData {
  const depth = 138.0 + (level - 7) * 26.0;
  const titles = [
    'Abyssal Basalt Mantle Vault',
    'Geothermal Magma Quartz Chimney',
    'Deep Sub-Volcanic Telluride Gallery',
    'Plutonic Diamond & Rose Gold Stope',
    'Prehistoric Mantle Fissure Sump',
  ];
  const title = titles[(level - 8) % titles.length] + ` (Level ${level})`;
  const strataTypes = [
    'Ultra-Deep Gabbro & Native Gold Lode',
    'Superheated Hydrothermal Silica & Electrum',
    'Metamorphic Eclogite & Sylvanite Vein',
    'Sub-Crustal Basalt Caldera & Gold Wire',
  ];
  const strata = strataTypes[(level - 8) % strataTypes.length];

  return {
    level,
    id: `layer_${level}_procedural`,
    name: title,
    depthMeters: depth,
    strata,
    description: `Endless abyssal depths of the Superstition tectonic fault (-${depth.toFixed(0)}m). Colossal geological pressure and pristine bonanza ore veins.`,
    hitsNeeded: Math.min(14, 8 + Math.floor(level * 0.8)),
    primaryMineral: `Abyssal Bonanza Gold (+${level * 3} oz)`,
    secondaryMineral: 'Deep Earth Diamond & Platinum Crystals',
    accentColor: level % 2 === 0 ? '#ec4899' : '#8b5cf6',
    unlocked: false,
    digProgress: 0,
    currentHits: 0,
    isWaterBearing: true,
    waterLevel: 1.5,
    aquiferPressure: 100,
    excavatedRooms: [],
  };
}

export class UndergroundLayersManager {
  private scene: THREE.Scene;
  private mainGroup: THREE.Group = new THREE.Group();
  private layersGroup: THREE.Group = new THREE.Group();
  private shaftGroup: THREE.Group = new THREE.Group();
  private waterGroup: THREE.Group = new THREE.Group();
  private roomsGroup: THREE.Group = new THREE.Group();
  private particlesGroup: THREE.Group = new THREE.Group();

  public surfacePos: Vector3D = { x: 0, y: 0, z: 0 };
  public surfaceY = 0;
  public currentLevel = 0; // 0 = surface, 1+ = underground layers
  public maxUnlockedLevel = 1;

  public layers: MineLayerData[] = [];
  public shaftExcavationHits: Record<number, number> = {};

  // Water Table & Flooding Simulation
  public waterTable: WaterTableState = {
    waterTableDepth: 92.0, // Water table starts at 92m depth
    waterLevelInLevel: {},
    isFlooding: false,
    floodRate: 0.08, // meters per sec
    pumpActive: false,
    pumpRate: 0.28, // meters per sec reduction when Cornish pump runs
    aquiferBreached: false,
    seepageWarning: false,
  };

  // 3D Visual References
  private layerMeshes: Map<number, THREE.Group> = new Map();
  private pitFissureMeshes: Map<number, THREE.Mesh> = new Map();
  private waterMeshes: Map<number, THREE.Mesh> = new Map();
  private roomMeshes: Map<string, THREE.Group> = new Map();
  private lanternLights: THREE.PointLight[] = [];
  private animatedCrystals: THREE.Mesh[] = [];
  private dustMotesList: THREE.Points[] = [];
  public cavernWallMeshes: THREE.Mesh[] = [];

  // Flying particles during shaft digging / room blasting
  private debrisList: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVel: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  // Pump audio interval timer
  private pumpChugTimer = 0;
  private waterDripTimer = 0;

  public voxelEngine: UndergroundVoxelEngine;
  public dustParticleSystem?: MountainDustParticleSystem;
  public holeManager?: MountainHoleManager;

  constructor(scene: THREE.Scene, dustParticles?: MountainDustParticleSystem, holeManager?: MountainHoleManager) {
    this.scene = scene;
    this.dustParticleSystem = dustParticles;
    this.holeManager = holeManager || new MountainHoleManager(this.scene, dustParticles);
    this.voxelEngine = new UndergroundVoxelEngine(this.scene, dustParticles);
    this.mainGroup.add(this.layersGroup);
    this.mainGroup.add(this.roomsGroup);
    this.mainGroup.add(this.shaftGroup);
    this.mainGroup.add(this.waterGroup);
    this.mainGroup.add(this.particlesGroup);
    this.scene.add(this.mainGroup);

    this.initLayersData();
  }

  public setHoleManager(hm: MountainHoleManager) {
    this.holeManager = hm;
  }

  public setDustParticleSystem(ps: MountainDustParticleSystem) {
    this.dustParticleSystem = ps;
    this.voxelEngine.setDustParticleSystem(ps);
  }

  private initLayersData() {
    this.layers = PREGENERATED_MINE_LAYERS.map((pl, idx) => ({
      ...pl,
      unlocked: idx === 0, // Layer 1 starts unlocked
      digProgress: 0,
      currentHits: 0,
      excavatedRooms: this.generateInitialRoomsForLevel(pl.level, pl.depthMeters),
    }));

    // Initialize water levels
    this.layers.forEach((l) => {
      this.waterTable.waterLevelInLevel[l.level] = l.waterLevel || 0;
    });
  }

  private generateInitialRoomsForLevel(level: number, depth: number): ExcavatedRoom[] {
    const directions: RoomDirection[] = ['north', 'south', 'east', 'west'];
    const namesByLevel: Record<number, Record<RoomDirection, { name: string; ore: string; yield: number }>> = {
      1: {
        north: { name: 'North Drift: Desert Sinter Gravel', ore: 'Alluvial Placer Gold', yield: 4.2 },
        south: { name: 'South Crosscut: Quartz Placer Bench', ore: 'Coarse Gold Flakes', yield: 3.8 },
        east: { name: 'East Winze: Spanish Mule Shoe Crevice', ore: 'Spanish Silver 2-Reales', yield: 5.0 },
        west: { name: 'West Stope: Caliche Hardpan Pocket', ore: 'Caliche Gold Nugget', yield: 4.5 },
        crosscut: { name: 'Central Sump Drift', ore: 'River Quartz Sand', yield: 3.0 },
      },
      2: {
        north: { name: 'North Stope: 1848 Peralta Ore Chute', ore: 'Rich Vein Gold Quartz', yield: 7.5 },
        south: { name: 'South Drift: Silver Ingot Crosscut', ore: 'Peralta Cast Silver Bar', yield: 9.0 },
        east: { name: 'East Gallery: Jesuit Relic Vault', ore: 'Spanish Mission Gold Cross', yield: 11.5 },
        west: { name: 'West Crosscut: Hematite Vein Chimney', ore: 'Red Sandstone Wire Gold', yield: 8.0 },
        crosscut: { name: 'Peralta Timbered Winze', ore: 'Raw Gold Ore', yield: 6.5 },
      },
      3: {
        north: { name: 'North Fissure: Imperial Amethyst Geode', ore: 'Sparkling Amethyst Cluster', yield: 12.0 },
        south: { name: 'South Gallery: Electrum Vein Lode', ore: 'Solid Electrum Bonanza', yield: 14.5 },
        east: { name: 'East Stope: Precambrian Galena Chimney', ore: 'Silver-Lead Galena Specimen', yield: 10.0 },
        west: { name: 'West Sump: Deep Fissure Drainage', ore: 'Granite Crystalline Gold', yield: 13.0 },
        crosscut: { name: 'Granite Incline Drift', ore: 'Pyritic Gold Cluster', yield: 11.0 },
      },
      4: {
        north: { name: 'North Vault: Jacob Waltz Secret Bullion Stope', ore: 'Jacob Waltz Rose Gold Ingot', yield: 24.0 },
        south: { name: 'South Chimney: Native Wire Gold Crevice', ore: 'Glittering Gold Wire Specimen', yield: 21.0 },
        east: { name: 'East Drift: Basalt Caldera Vent', ore: 'Hydrothermal Quartz Gold Slab', yield: 19.5 },
        west: { name: 'West Winze: Peralta Map Inscription Hall', ore: 'Spanish Gold Bullion Bar', yield: 26.0 },
        crosscut: { name: 'Mother Lode Central Hearth', ore: 'Pure Rose Gold Slabs', yield: 28.0 },
      },
      5: {
        north: { name: 'North Drift: Damp Quartzite Chimney', ore: 'Chalcopyrite Wire Gold', yield: 22.0 },
        south: { name: 'South Winze: Hydrothermal Copper Ledge', ore: 'Native Copper & Gold Ribbon', yield: 25.0 },
        east: { name: 'East Sump: Aquifer Seepage Fault', ore: 'Glistening Hydrothermal Quartz', yield: 20.0 },
        west: { name: 'West Crosscut: Pyrite Druse Chamber', ore: 'Massive Gold-Pyrite Cube', yield: 23.5 },
        crosscut: { name: 'Sump Water Drainage Drift', ore: 'Native Copper Nugget', yield: 18.0 },
      },
      6: {
        north: { name: 'North Torrent: Aquifer Inflow Chasm', ore: 'Deep Water Bonanza Electrum', yield: 32.0 },
        south: { name: 'South Drift: Submerged Quartz Reef', ore: 'Aquifer Quartz Gold Bonanza', yield: 34.0 },
        east: { name: 'East Winze: High-Pressure Water Table Fault', ore: 'High-Grade Calcite Gold Ore', yield: 30.0 },
        west: { name: 'West Stope: Flooded Timber Drift', ore: 'Deep Fault Electrum Nugget', yield: 31.5 },
        crosscut: { name: 'Central Submerged Sump', ore: 'Shattered Dolomite Gold', yield: 28.0 },
      },
      7: {
        north: { name: 'North Cavern: Sunken Bonanza Reef', ore: 'Colossal Sunken Gold Slab', yield: 45.0 },
        south: { name: 'South Deep: Submerged Spanish Pack Cache', ore: 'Lost Spanish Gold Bullion Chest', yield: 55.0 },
        east: { name: 'East Grotto: Crystalline Groundwater Spire', ore: 'Giant Crystallized Gold Specimen', yield: 42.0 },
        west: { name: 'West Reef: Sub-Water Table Bonanza', ore: 'Virgin Hydrothermal Gold Reef', yield: 48.0 },
        crosscut: { name: 'Abyssal Drowned Chamber', ore: 'Mantle Gold Nuggets', yield: 40.0 },
      },
    };

    return directions.map((dir) => {
      const data = namesByLevel[level]?.[dir] || {
        name: `${dir.toUpperCase()} Drift (Level ${level})`,
        ore: `Abyssal Bonanza Gold (+${level * 4} oz)`,
        yield: 25.0 + level * 5,
      };

      return {
        id: `room_${level}_${dir}`,
        level,
        direction: dir,
        name: data.name,
        depthMeters: depth,
        excavationProgress: 0,
        hitsNeeded: Math.min(8, 4 + Math.floor(level * 0.5)),
        currentHits: 0,
        isComplete: false,
        isTimbered: false,
        oreVeinType: data.ore,
        oreYieldOunces: data.yield,
        waterLevel: level >= 6 ? 0.8 : 0,
        createdAt: Date.now(),
      };
    });
  }

  // Anchor subterranean mine shaft and pregenerated layers beneath a mine location
  public initAtPosition(pos: Vector3D, surfaceY: number) {
    this.surfacePos = { ...pos };
    this.surfaceY = surfaceY;
    this.mainGroup.position.set(pos.x, 0, pos.z);

    this.rebuildAllLayers();
    this.rebuildShaftInfrastructure();

    const activeLvl = this.currentLevel > 0 ? this.currentLevel : 1;
    const activeLayer = this.layers.find((l) => l.level === activeLvl) || this.layers[0];
    this.voxelEngine.generateLevelVoxels(activeLvl, pos, surfaceY, activeLayer.depthMeters);
  }

  public setSubterraneanLevel(level: number) {
    this.currentLevel = level;
    if (level > 0) {
      const activeLayer = this.layers.find((l) => l.level === level) || this.layers[0];
      this.voxelEngine.generateLevelVoxels(level, this.surfacePos, this.surfaceY, activeLayer.depthMeters);
    } else {
      // Surface shaft collar mini-voxels
      this.voxelEngine.generateLevelVoxels(0, this.surfacePos, this.surfaceY, 0);
    }
  }

  public rebuildAllLayers() {
    this.layersGroup.clear();
    this.layerMeshes.clear();
    this.pitFissureMeshes.clear();
    this.waterMeshes.clear();
    this.roomsGroup.clear();
    this.roomMeshes.clear();
    this.lanternLights = [];
    this.animatedCrystals = [];

    this.layers.forEach((layer) => {
      const chamberGroup = this.createLayerChamber(layer);
      this.layersGroup.add(chamberGroup);
      this.layerMeshes.set(layer.level, chamberGroup);

      // Create excavated rooms for this layer
      this.rebuildRoomsForLevel(layer.level);

      // Create dynamic water mesh if level is in or near the water table
      this.createWaterMeshForLevel(layer);
    });
  }

  // Create authentic 3D subterranean chamber for a geological layer
  private createLayerChamber(layer: MineLayerData): THREE.Group {
    const group = new THREE.Group();
    const floorY = this.surfaceY - layer.depthMeters;
    group.position.set(0, floorY, 0);

    let wallColor = 0x6e523b;
    let floorColor = 0x5a412e;
    let radius = 13.5;
    let height = 5.4;

    if (layer.level === 1) {
      wallColor = 0x84684a; // Desert Dacite & Sandstone caliche
      floorColor = 0x6e533d;
      radius = 13.0;
      height = 5.0;
    } else if (layer.level === 2) {
      wallColor = 0x6e3222; // Peralta red hematite sandstone & schist
      floorColor = 0x542417;
      radius = 14.0;
      height = 5.4;
    } else if (layer.level === 3) {
      wallColor = 0x383536; // Precambrian granodiorite bedrock
      floorColor = 0x27262a;
      radius = 15.0;
      height = 6.2;
    } else if (layer.level === 4) {
      wallColor = 0x1b191a; // Volcanic basalt caldera
      floorColor = 0x141213;
      radius = 16.5;
      height = 7.2;
    } else if (layer.level === 5) {
      wallColor = 0x222e25; // Chlorite schist & pyritic quartz
      floorColor = 0x1a241d;
      radius = 15.8;
      height = 6.0;
    } else if (layer.level >= 6) {
      wallColor = 0x18232d; // Deep tectonic aquifer fault dolomite
      floorColor = 0x111b24;
      radius = 17.0;
      height = 6.6;
    }

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.94,
      metalness: 0.04,
      side: THREE.BackSide,
    });

    // 1. Organic Sculpted Bedrock Cavern Perimeter Mesh (Multi-octave fractal displacement)
    const caveGeo = new THREE.CylinderGeometry(radius, radius * 0.95, height, 48, 16, true);
    const posAttr = caveGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      let vx = posAttr.getX(i);
      let vy = posAttr.getY(i);
      let vz = posAttr.getZ(i);
      const angle = Math.atan2(vz, vx);
      const r = Math.hypot(vx, vz);

      // Geological strata fold & natural rock overhangs
      const macroSwell = Math.sin(angle * 4.0) * 0.45 + Math.cos(angle * 3.0 + vy * 0.8) * 0.35;
      // Chisel scallops, rock cleavage plane & fault crevices
      const rockCrag = Math.sin(vx * 0.75 + vz * 0.85 + vy * 1.4) * 0.32 + Math.cos(vx * 1.8 - vz * 1.6) * 0.16;
      // High-frequency micro-roughness
      const microRough = (Math.sin(vx * 3.6 + vy * 2.8) + Math.cos(vz * 3.6)) * 0.06;

      const newR = r + macroSwell + rockCrag + microRough;
      vx = Math.cos(angle) * newR;
      vz = Math.sin(angle) * newR;
      vy += Math.sin(angle * 4.0) * 0.12 + Math.cos(vx * 1.2) * 0.08;

      posAttr.setXYZ(i, vx, vy, vz);
    }
    caveGeo.computeVertexNormals();

    const caveWall = new THREE.Mesh(caveGeo, wallMat);
    caveWall.position.y = height / 2;
    caveWall.name = `cavern_wall_level_${layer.level}`;
    group.add(caveWall);
    this.cavernWallMeshes.push(caveWall);

    // 2. Embedded Hydrothermal Quartz-Gold Veins (Real 3D Veins cutting diagonally across the rock face)
    const quartzMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ea, // Milky hydrothermal quartz
      roughness: 0.38,
      metalness: 0.12,
    });
    const goldWireMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Metallic native wire gold
      roughness: 0.22,
      metalness: 0.98,
      emissive: 0x553800,
      emissiveIntensity: 0.28,
    });

    const veinBaseAngles = [0.8, 2.9, 5.1];
    veinBaseAngles.forEach((baseAngle, vIdx) => {
      const veinGroup = new THREE.Group();
      const points: THREE.Vector3[] = [];
      const numSteps = 16;
      for (let s = 0; s <= numSteps; s++) {
        const t = s / numSteps;
        const curAngle = baseAngle + (t - 0.5) * 0.95 + Math.sin(t * 7.0 + vIdx) * 0.1;
        const curY = height * 0.88 - t * (height * 0.78) + Math.cos(t * 5.0) * 0.14;
        const curR = radius * 0.958 + Math.sin(t * 6.0) * 0.12;
        points.push(new THREE.Vector3(Math.cos(curAngle) * curR, curY, Math.sin(curAngle) * curR));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const quartzGeo = new THREE.TubeGeometry(curve, 28, 0.16, 6, false);
      const quartzMesh = new THREE.Mesh(quartzGeo, quartzMat);
      veinGroup.add(quartzMesh);

      // Embedded glistening native gold wire thread inside quartz crevice
      const goldGeo = new THREE.TubeGeometry(curve, 24, 0.05, 5, false);
      const goldMesh = new THREE.Mesh(goldGeo, goldWireMat);
      veinGroup.add(goldMesh);

      group.add(veinGroup);
    });

    // 3. Cavern Ceiling with jagged rock protrusions and stalactite crags
    const roofGeo = new THREE.CircleGeometry(radius * 1.05, 36);
    const roofPos = roofGeo.attributes.position;
    for (let i = 0; i < roofPos.count; i++) {
      const rx = roofPos.getX(i);
      const rz = roofPos.getY(i); // CircleGeometry lies in XY before rotation
      const dist = Math.hypot(rx, rz);
      const roughness = Math.sin(rx * 0.8) * Math.cos(rz * 0.8) * 0.45;
      const stalactite = dist < radius * 0.7 ? Math.pow(Math.abs(Math.sin(rx * 1.4 + rz * 1.2)), 3.0) * 0.65 : 0;
      roofPos.setZ(i, roughness - stalactite);
    }
    roofGeo.computeVertexNormals();

    const caveRoof = new THREE.Mesh(roofGeo, wallMat);
    caveRoof.position.y = height;
    caveRoof.rotation.x = Math.PI / 2;
    group.add(caveRoof);

    // 4. Bedrock Floor with central shaft opening for granular bedrock sinking
    const floorGeo = new THREE.RingGeometry(1.85, radius, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.96,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const caveFloor = new THREE.Mesh(floorGeo, floorMat);
    caveFloor.rotation.x = -Math.PI / 2;
    caveFloor.position.y = 0.02;
    caveFloor.receiveShadow = true;
    group.add(caveFloor);

    // 5. Atmospheric Subterranean Dust Motes (Floating golden motes in lantern beam)
    const moteCount = 180;
    const moteGeo = new THREE.BufferGeometry();
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * (radius * 0.82);
      motePositions[i * 3] = Math.cos(a) * d;
      motePositions[i * 3 + 1] = 0.3 + Math.random() * (height - 0.6);
      motePositions[i * 3 + 2] = Math.sin(a) * d;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xffdf9a,
      size: 0.08,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    group.add(motes);
    this.dustMotesList.push(motes);

    // 6. Square-Set Heavy Pine Timbering (Historical Comstock / Peralta drift shoring)
    const timberMat = new THREE.MeshStandardMaterial({
      color: layer.level === 2 ? 0x4a2e1d : 0x3d2718,
      roughness: 0.92,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x242424,
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
      leftPost.castShadow = true;
      group.add(leftPost);

      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, height * 0.85, 0.35), timberMat);
      rightPost.position.set(tx + 1.2, height * 0.42, tz);
      rightPost.castShadow = true;
      group.add(rightPost);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.35, 0.35), timberMat);
      cap.position.set(tx, height * 0.85, tz);
      cap.castShadow = true;
      group.add(cap);

      // Hanging miner brass/iron lantern
      const lanternMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 6), ironMat);
      lanternMesh.position.set(tx, height * 0.72, tz);
      group.add(lanternMesh);

      // Warm atmospheric kerosene amber lighting (2200K)
      const lanternLight = new THREE.PointLight(layer.level >= 6 ? 0x88ccff : 0xffa442, 1.8, 18, 2.0);
      lanternLight.position.set(tx, height * 0.7, tz);
      group.add(lanternLight);
      this.lanternLights.push(lanternLight);
    });

    // 7. Central Shaft Pit Collar and Floor Bedrock Plate for Digging Down
    const pitCollar = new THREE.Group();
    pitCollar.position.set(0, 0, 0);

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

    // Sub-floor bedrock base plate deep beneath the voxel layers
    const fissureMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.95,
      emissive: layer.level >= 5 ? 0x113355 : 0x331a00,
      emissiveIntensity: 0.15,
    });
    const fissureMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 3.6), fissureMat);
    fissureMesh.position.set(0, -3.2, 0);
    pitCollar.add(fissureMesh);
    this.pitFissureMeshes.set(layer.level, fissureMesh);

    group.add(pitCollar);

    return group;
  }

  // Create dynamic animated 3D water surface mesh for a flooded or water-bearing level
  private createWaterMeshForLevel(layer: MineLayerData) {
    const floorY = this.surfaceY - layer.depthMeters;
    const waterHeight = this.waterTable.waterLevelInLevel[layer.level] || (layer.depthMeters >= this.waterTable.waterTableDepth ? 0.8 : 0);

    const radius = 16.5;
    const waterGeo = new THREE.CircleGeometry(radius, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Translucent azure-blue subterranean groundwater
      roughness: 0.1,
      metalness: 0.35,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, floorY + Math.max(0.04, waterHeight), 0);
    waterMesh.visible = waterHeight > 0.02 || layer.depthMeters >= this.waterTable.waterTableDepth;

    this.waterGroup.add(waterMesh);
    this.waterMeshes.set(layer.level, waterMesh);
  }

  // Rebuild 3D visual rooms for a specific layer
  public rebuildRoomsForLevel(level: number) {
    const layer = this.layers.find((l) => l.level === level);
    if (!layer) return;

    const floorY = this.surfaceY - layer.depthMeters;
    const rooms = layer.excavatedRooms || [];

    rooms.forEach((room) => {
      const roomKey = `${level}_${room.direction}`;
      // Remove existing room mesh if present
      const oldMesh = this.roomMeshes.get(roomKey);
      if (oldMesh) {
        this.roomsGroup.remove(oldMesh);
        this.roomMeshes.delete(roomKey);
      }

      const roomGroup = this.createRoomMesh(room, floorY);
      this.roomsGroup.add(roomGroup);
      this.roomMeshes.set(roomKey, roomGroup);
    });
  }

  // Create 3D geometry for a lateral drift room (either unexcavated face or open timbered chamber)
  private createRoomMesh(room: ExcavatedRoom, floorY: number): THREE.Group {
    const group = new THREE.Group();

    // Direction vector & rotation
    let angle = 0;
    let dx = 0;
    let dz = -1;
    if (room.direction === 'north') {
      angle = 0;
      dz = -1;
    } else if (room.direction === 'south') {
      angle = Math.PI;
      dz = 1;
    } else if (room.direction === 'east') {
      angle = Math.PI / 2;
      dx = 1;
      dz = 0;
    } else if (room.direction === 'west') {
      angle = -Math.PI / 2;
      dx = -1;
      dz = 0;
    }

    const chamberRadius = 12.0;
    const portalX = dx * (chamberRadius - 0.5);
    const portalZ = dz * (chamberRadius - 0.5);

    group.position.set(portalX, floorY, portalZ);
    group.rotation.y = angle;

    const timberMat = new THREE.MeshStandardMaterial({ color: 0x422a18, roughness: 0.9 });
    const rockMat = new THREE.MeshStandardMaterial({
      color: room.level >= 5 ? 0x223344 : 0x5a412e,
      roughness: 0.95,
      emissive: room.isComplete ? 0x224411 : 0x111111,
      emissiveIntensity: 0.2,
    });

    // 1. Timber Arch Entry Portal (Always visible at chamber perimeter)
    const portalArch = new THREE.Group();
    const postHeight = 4.2;
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.35, postHeight, 0.35), timberMat);
    postL.position.set(-1.6, postHeight / 2, 0);
    portalArch.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.35, postHeight, 0.35), timberMat);
    postR.position.set(1.6, postHeight / 2, 0);
    portalArch.add(postR);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.38), timberMat);
    cap.position.set(0, postHeight, 0);
    portalArch.add(cap);

    // Signboard with room name
    const signMat = new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.85 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.08), signMat);
    sign.position.set(0, postHeight + 0.3, 0.15);
    portalArch.add(sign);

    group.add(portalArch);

    if (!room.isComplete) {
      // Unexcavated: Solid rock wall blocking the passage with visible mineral cracks
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, postHeight - 0.2, 0.6),
        rockMat
      );
      wallMesh.position.set(0, postHeight / 2, 0);
      group.add(wallMesh);

      // Vein crack indicator on unexcavated face
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x886600,
        emissiveIntensity: 0.6,
      });
      const veinVein = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 8), goldMat);
      veinVein.position.set(0, postHeight / 2, 0.32);
      group.add(veinVein);
    } else {
      // Excavated: 3D Tunnel Chamber extending 9 meters back into the rock!
      const tunnelLength = 9.0;
      const tunnelWidth = 3.6;
      const tunnelHeight = postHeight;

      // Tunnel Walls, Ceiling, Floor
      const tunnelMat = new THREE.MeshStandardMaterial({
        color: room.level >= 5 ? 0x1f2e3d : 0x4a3525,
        roughness: 0.94,
        side: THREE.BackSide,
      });
      const tunnelGeo = new THREE.BoxGeometry(tunnelWidth, tunnelHeight, tunnelLength);
      const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
      tunnelMesh.position.set(0, tunnelHeight / 2, -tunnelLength / 2);
      group.add(tunnelMesh);

      // Floor Planks & Mine Cart Rails
      const floorPlanks = new THREE.Mesh(
        new THREE.BoxGeometry(tunnelWidth * 0.95, 0.06, tunnelLength),
        new THREE.MeshStandardMaterial({ color: 0x3d2718, roughness: 0.9 })
      );
      floorPlanks.position.set(0, 0.03, -tunnelLength / 2);
      group.add(floorPlanks);

      // Rails
      const railMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.85, roughness: 0.3 });
      [-0.45, 0.45].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, tunnelLength), railMat);
        rail.position.set(rx, 0.08, -tunnelLength / 2);
        group.add(rail);
      });

      // Internal timber support bents along tunnel
      for (let t = 2.5; t < tunnelLength; t += 3.0) {
        const bentL = new THREE.Mesh(new THREE.BoxGeometry(0.28, tunnelHeight, 0.28), timberMat);
        bentL.position.set(-tunnelWidth / 2 + 0.18, tunnelHeight / 2, -t);
        group.add(bentL);

        const bentR = new THREE.Mesh(new THREE.BoxGeometry(0.28, tunnelHeight, 0.28), timberMat);
        bentR.position.set(tunnelWidth / 2 - 0.18, tunnelHeight / 2, -t);
        group.add(bentR);

        const bentCap = new THREE.Mesh(new THREE.BoxGeometry(tunnelWidth, 0.28, 0.28), timberMat);
        bentCap.position.set(0, tunnelHeight - 0.14, -t);
        group.add(bentCap);
      }

      // Hanging Lantern at end of excavated drift
      const driftLantern = new THREE.PointLight(0xffb855, 1.6, 12);
      driftLantern.position.set(0, tunnelHeight - 0.6, -tunnelLength + 1.5);
      group.add(driftLantern);
      this.lanternLights.push(driftLantern);

      // Rich Exposed Ore Nodes at back of chamber
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.95,
        roughness: 0.18,
        emissive: 0xaa7700,
        emissiveIntensity: 0.8,
      });

      for (let o = 0; o < 5; o++) {
        const oreNode = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.25, 1), goldMat);
        oreNode.position.set(
          (Math.random() - 0.5) * (tunnelWidth - 1.0),
          0.6 + Math.random() * 2.2,
          -tunnelLength + 0.4 + Math.random() * 0.8
        );
        group.add(oreNode);
      }
    }

    return group;
  }

  // Continuous vertical shaft with pine ladders and timber guide posts
  public rebuildShaftInfrastructure() {
    this.shaftGroup.clear();

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.92 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.4 });

    const deepestLayer = this.layers.find((l) => l.level === this.maxUnlockedLevel) || this.layers[0];
    const totalShaftHeight = deepestLayer.depthMeters + 6.0;
    const shaftTopY = this.surfaceY + 2.5;

    // 4 Vertical Timber Corner Posts (forming the shaft way)
    const collarRadius = 1.65;
    const cornerPositions = [
      { x: -collarRadius, z: -collarRadius },
      { x: collarRadius, z: -collarRadius },
      { x: collarRadius, z: collarRadius },
      { x: -collarRadius, z: collarRadius },
    ];

    cornerPositions.forEach((pos) => {
      const guidePost = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, totalShaftHeight, 0.32),
        woodMat
      );
      guidePost.position.set(pos.x, shaftTopY - totalShaftHeight / 2, pos.z);
      this.shaftGroup.add(guidePost);
    });

    // Hoist Cable running down center
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, totalShaftHeight, 6), ironMat);
    cable.position.set(0, shaftTopY - totalShaftHeight / 2, 0);
    this.shaftGroup.add(cable);

    // Continuous Pine Ladder attached to north timber guide wall (Z = -collarRadius + 0.15)
    const ladderWidth = 0.55;
    const rungSpacing = 0.40;
    const rungCount = Math.floor(totalShaftHeight / rungSpacing);

    [-ladderWidth / 2, ladderWidth / 2].forEach((lx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, totalShaftHeight, 0.12),
        woodMat
      );
      rail.position.set(lx, shaftTopY - totalShaftHeight / 2, -collarRadius + 0.18);
      this.shaftGroup.add(rail);
    });

    // Rungs
    const rungMat = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.88 });
    const rungGeo = new THREE.CylinderGeometry(0.022, 0.022, ladderWidth, 6);
    for (let r = 0; r < rungCount; r++) {
      const rungY = shaftTopY - r * rungSpacing - 0.2;
      const rung = new THREE.Mesh(rungGeo, rungMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, rungY, -collarRadius + 0.18);
      this.shaftGroup.add(rung);
    }
  }

  // Digging downwards through the bedrock shaft floor into the next level
  public digDown(
    tool: string = 'pickaxe',
    playerPos?: Vector3D
  ): {
    breached: boolean;
    progress: number;
    currentHits: number;
    hitsNeeded: number;
    newLayer?: MineLayerData;
    rewardGold?: number;
    rewardName?: string;
    message: string;
    flooded?: boolean;
  } {
    let activeLevel = this.currentLevel;
    if (activeLevel === 0) activeLevel = 1;

    let layer = this.layers.find((l) => l.level === activeLevel);
    if (!layer) {
      return {
        breached: false,
        progress: 0,
        currentHits: 0,
        hitsNeeded: 4,
        message: 'No active subterranean mine shaft found.',
      };
    }

    // Play strike sounds & spawn debris
    if (tool === 'shovel') {
      soundEngine.playShovelDig();
    } else {
      soundEngine.playRockChisel();
    }

    // Visually strike and sink the granular floor voxel downward!
    const voxelResult = this.voxelEngine.sinkShaftDown(tool);

    const hitPos = playerPos
      ? new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z)
      : new THREE.Vector3(this.surfacePos.x, this.surfaceY - layer.depthMeters + 0.5, this.surfacePos.z);
    this.spawnDigDebris(hitPos);

    if (this.dustParticleSystem) {
      const currentStratum = layer.strata.toLowerCase();
      let strataMat = 'caliche';
      if (currentStratum.includes('sandstone')) strataMat = 'sandstone';
      else if (currentStratum.includes('granite') || currentStratum.includes('granodiorite')) strataMat = 'granite';
      else if (currentStratum.includes('basalt')) strataMat = 'basalt';
      else if (currentStratum.includes('schist') || currentStratum.includes('diorite')) strataMat = 'volcanic_crag';
      this.dustParticleSystem.triggerMountainStrike(
        hitPos,
        new THREE.Vector3(0, 1, 0),
        strataMat,
        tool === 'dynamite' ? 2.4 : tool === 'shovel' ? 0.75 : 1.3,
        hitPos.y - 0.25
      );
    }

    const currentHits = (this.shaftExcavationHits[activeLevel] || 0) + 1;
    this.shaftExcavationHits[activeLevel] = currentHits;

    const hitsNeeded = layer.hitsNeeded;
    const progress = Math.min(100, Math.round((currentHits / hitsNeeded) * 100));
    layer.digProgress = progress;
    layer.currentHits = currentHits;

    // Check for breakthrough into the next layer!
    if (currentHits >= hitsNeeded || voxelResult.breakthroughReady) {
      const nextLevel = activeLevel + 1;
      this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel, nextLevel);

      let nextLayer = this.layers.find((l) => l.level === nextLevel);
      if (!nextLayer) {
        // Generate endless procedural deep layer!
        nextLayer = generateProceduralMineLayer(nextLevel);
        nextLayer.excavatedRooms = this.generateInitialRoomsForLevel(nextLevel, nextLayer.depthMeters);
        this.layers.push(nextLayer);

        const chamberGroup = this.createLayerChamber(nextLayer);
        this.layersGroup.add(chamberGroup);
        this.layerMeshes.set(nextLevel, chamberGroup);
        this.rebuildRoomsForLevel(nextLevel);
        this.createWaterMeshForLevel(nextLayer);
      }

      nextLayer.unlocked = true;

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
        rewardName = 'Jacob Waltz Stamped Gold Bullion Bar';
      } else if (nextLevel === 5) {
        rewardGold = 45.0;
        rewardName = 'Hydrothermal Native Copper & Gold Wire Lode';
      } else if (nextLevel === 6) {
        rewardGold = 60.0;
        rewardName = 'Deep Tectonic Fault Bonanza Nugget';
        // Breaches the Water Table!
        this.waterTable.aquiferBreached = true;
        this.waterTable.isFlooding = true;
        soundEngine.playWaterFloodRumble();
      } else {
        rewardGold = 75.0 + nextLevel * 8;
        rewardName = `Abyssal Bonanza Jackpot Lode (Level ${nextLevel})`;
      }

      rewardGold += voxelResult.oreYield;

      let msg = `🎉 BREAKTHROUGH! Sunk shaft into Layer ${nextLevel}: ${nextLayer.name}! (-${nextLayer.depthMeters.toFixed(1)}m). Ladder extended! (+${rewardGold.toFixed(1)} oz Gold)`;
      if (nextLevel === 6) {
        msg += ` ⚠️ WATER TABLE BREACHED! Subterranean aquifer flooding! Start Cornish Dewatering Pump!`;
      }

      return {
        breached: true,
        progress: 100,
        currentHits,
        hitsNeeded,
        newLayer: nextLayer,
        rewardGold,
        rewardName,
        message: msg,
        flooded: nextLevel >= 6,
      };
    }

    const oreNote = voxelResult.oreYield > 0 ? ` (+${voxelResult.oreYield.toFixed(1)} oz ${voxelResult.oreType})` : '';
    return {
      breached: false,
      progress,
      currentHits,
      hitsNeeded,
      rewardGold: voxelResult.oreYield,
      rewardName: voxelResult.oreType,
      message: `⛏️ Sunk Shaft: Layer ${activeLevel} (${currentHits}/${hitsNeeded} strikes, ${progress}%). Strata: ${layer.strata}${oreNote}`,
    };
  }

  // Strike targeted 3D voxel directly (wall, vein, or floor)
  public mineTargetedVoxel(tool: string = 'pickaxe'): {
    success: boolean;
    destroyed: boolean;
    oreYield: number;
    oreType: string;
    message: string;
    isShaftSink: boolean;
    breached?: boolean;
    newLayer?: MineLayerData;
    rewardGold?: number;
    rewardName?: string;
  } {
    const voxel = this.voxelEngine.targetedVoxel;
    if (!voxel) {
      // Fallback: If near excavation pit, sink shaft down
      const res = this.digDown(tool);
      return {
        success: true,
        destroyed: true,
        oreYield: res.rewardGold || 0,
        oreType: 'rock',
        message: res.message,
        isShaftSink: true,
        breached: res.breached,
        newLayer: res.newLayer,
        rewardGold: res.rewardGold,
        rewardName: res.rewardName,
      };
    }

    const strikeRes = this.voxelEngine.strikeVoxel(voxel, tool);

    let breached = false;
    let newLayer: MineLayerData | undefined;
    let rewardGold: number | undefined;
    let rewardName: string | undefined;

    if (strikeRes.isShaftSink && strikeRes.destroyed) {
      // Progress shaft excavation with multi-voxel count
      const clearedCount = strikeRes.voxelsClearedCount || 1;
      const currentHits = (this.shaftExcavationHits[this.currentLevel] || 0) + clearedCount;
      this.shaftExcavationHits[this.currentLevel] = currentHits;
      const layer = this.layers.find((l) => l.level === this.currentLevel);
      if (layer) {
        layer.currentHits = currentHits;
        layer.digProgress = Math.min(100, Math.round((currentHits / layer.hitsNeeded) * 100));
        const sinkingStats = this.voxelEngine.getShaftSinkingStats();
        if (currentHits >= layer.hitsNeeded || sinkingStats.breakthroughReady) {
          const breachRes = this.digDown(tool);
          breached = breachRes.breached;
          newLayer = breachRes.newLayer;
          rewardGold = breachRes.rewardGold;
          rewardName = breachRes.rewardName;
        }
      }
    }

    return {
      success: true,
      destroyed: strikeRes.destroyed,
      oreYield: strikeRes.oreYield,
      oreType: strikeRes.oreType,
      message: strikeRes.message,
      isShaftSink: strikeRes.isShaftSink,
      breached,
      newLayer,
      rewardGold,
      rewardName,
    };
  }

  // Strike and excavate an underground lateral room face
  public strikeRoomFace(
    direction: RoomDirection,
    tool: string = 'pickaxe',
    playerPos?: Vector3D
  ): {
    success: boolean;
    room?: ExcavatedRoom;
    progress: number;
    oreAwarded?: number;
    oreType?: string;
    completed: boolean;
    message: string;
  } {
    const layer = this.layers.find((l) => l.level === this.currentLevel);
    if (!layer || !layer.excavatedRooms) {
      return { success: false, progress: 0, completed: false, message: 'No active mine chamber to excavate.' };
    }

    const room = layer.excavatedRooms.find((r) => r.direction === direction);
    if (!room) {
      return { success: false, progress: 0, completed: false, message: `No ${direction} drift found.` };
    }

    if (room.isComplete) {
      return { success: false, progress: 100, completed: true, message: `${room.name} is already fully excavated!` };
    }

    // Strike audio & particles
    if (tool === 'dynamite') {
      soundEngine.playDynamiteExplosion();
      room.currentHits = Math.min(room.hitsNeeded, room.currentHits + 3);
    } else {
      soundEngine.playRockChisel();
      room.currentHits += 1;
    }

    if (playerPos) {
      this.spawnDigDebris(new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z));

      if (this.dustParticleSystem) {
        const dirMap: Record<RoomDirection, THREE.Vector3> = {
          north: new THREE.Vector3(0, 0, 1),
          south: new THREE.Vector3(0, 0, -1),
          east: new THREE.Vector3(-1, 0, 0),
          west: new THREE.Vector3(1, 0, 0),
          crosscut: new THREE.Vector3(0.707, 0, 0.707),
        };
        const faceNormal = dirMap[direction] || new THREE.Vector3(0, 1, 0);
        const facePoint = new THREE.Vector3(
          playerPos.x - faceNormal.x * 1.5,
          playerPos.y + 1.2,
          playerPos.z - faceNormal.z * 1.5
        );
        this.dustParticleSystem.triggerMountainStrike(
          facePoint,
          faceNormal,
          this.currentLevel >= 4 ? 'basalt' : this.currentLevel >= 3 ? 'granite' : 'sandstone',
          tool === 'dynamite' ? 2.5 : 1.25,
          playerPos.y
        );
      }
    }

    const progress = Math.min(100, Math.round((room.currentHits / room.hitsNeeded) * 100));
    room.excavationProgress = progress;

    if (room.currentHits >= room.hitsNeeded) {
      room.isComplete = true;
      room.excavationProgress = 100;
      soundEngine.playRoomExcavated();

      // Rebuild 3D visual for this room to reveal the open chamber
      this.rebuildRoomsForLevel(this.currentLevel);

      const oreAwarded = room.oreYieldOunces;
      const oreType = room.oreVeinType;

      return {
        success: true,
        room,
        progress: 100,
        oreAwarded,
        oreType,
        completed: true,
        message: `💥 ROOM EXCAVATED! Carved out ${room.name}! Discovered rich vein of ${oreType} (+${oreAwarded} oz Gold/Mineral)!`,
      };
    }

    return {
      success: true,
      room,
      progress,
      completed: false,
      message: `⛏️ Carving ${room.name}: ${room.currentHits}/${room.hitsNeeded} strikes (${progress}%). Keep digging with Pickaxe or blast with Dynamite!`,
    };
  }

  // Timber an excavated lateral room to protect against cave-ins
  public timberRoom(direction: RoomDirection): { success: boolean; message: string } {
    const layer = this.layers.find((l) => l.level === this.currentLevel);
    if (!layer || !layer.excavatedRooms) {
      return { success: false, message: 'No underground chamber found.' };
    }

    const room = layer.excavatedRooms.find((r) => r.direction === direction);
    if (!room) return { success: false, message: 'Room not found.' };

    if (!room.isComplete) {
      return { success: false, message: 'Cannot timber an unexcavated room face! Excavate it first.' };
    }

    if (room.isTimbered) {
      return { success: false, message: `${room.name} is already securely timbered with Comstock square-sets.` };
    }

    room.isTimbered = true;
    soundEngine.playTrenchShoringConstruct();
    return {
      success: true,
      message: `🛡️ Timbered ${room.name} with heavy square-set pine posts and cap beams! Completely reinforced against overburden stress.`,
    };
  }

  // Toggle Cornish Steam Dewatering Pump
  public toggleCornishPump(forceState?: boolean): boolean {
    const nextState = forceState !== undefined ? forceState : !this.waterTable.pumpActive;
    this.waterTable.pumpActive = nextState;

    if (nextState) {
      soundEngine.playPumpChug();
    }

    return nextState;
  }

  // Get current water height in meters above floor for a level
  public getWaterLevelInLevel(level: number): number {
    return this.waterTable.waterLevelInLevel[level] || 0;
  }

  // Water level query for player location (feet/eye check)
  public getWaterStatusForPlayer(pos: Vector3D, currentLevel: number): {
    waterHeight: number;
    waterSurfaceY: number;
    isWading: boolean;
    isSwimming: boolean;
    isSubmerged: boolean;
  } {
    if (currentLevel === 0) {
      return { waterHeight: 0, waterSurfaceY: -999, isWading: false, isSwimming: false, isSubmerged: false };
    }

    const layer = this.layers.find((l) => l.level === currentLevel);
    if (!layer) {
      return { waterHeight: 0, waterSurfaceY: -999, isWading: false, isSwimming: false, isSubmerged: false };
    }

    const floorY = this.surfaceY - layer.depthMeters;
    const waterHeight = this.waterTable.waterLevelInLevel[currentLevel] || 0;
    const waterSurfaceY = floorY + waterHeight;

    const playerFeetY = pos.y - 1.7;
    const playerEyeY = pos.y;

    const isWading = waterHeight > 0.15 && waterSurfaceY > playerFeetY + 0.1;
    const isSwimming = waterHeight >= 1.4 && waterSurfaceY > playerFeetY + 1.2;
    const isSubmerged = waterHeight >= 1.8 && waterSurfaceY >= playerEyeY - 0.05;

    return {
      waterHeight,
      waterSurfaceY,
      isWading,
      isSwimming,
      isSubmerged,
    };
  }

  // Boundary check: allows walking in central chamber (radius ~12m) AND into any excavated lateral room (length ~22m)
  public isInsideCavernOrRooms(x: number, z: number, currentLevel: number): boolean {
    if (currentLevel === 0) return true;

    const dx = x - this.surfacePos.x;
    const dz = z - this.surfacePos.z;
    const dist = Math.hypot(dx, dz);

    // Central circular chamber radius
    if (dist <= 12.0) return true;

    // Granular excavated tunnel boundary (allows walking into mined tunnels)
    if (dist <= 15.5) return true;

    // Check if player is walking down one of the 4 cardinal tunnel drifts
    const layer = this.layers.find((l) => l.level === currentLevel);
    if (!layer || !layer.excavatedRooms) return dist <= 12.0;

    // North Drift (dz < 0, |dx| <= 2.2, dz >= -22.0)
    const northRoom = layer.excavatedRooms.find((r) => r.direction === 'north');
    if (northRoom && northRoom.isComplete && dz < 0 && Math.abs(dx) <= 2.2 && dz >= -22.0) {
      return true;
    }

    // South Drift (dz > 0, |dx| <= 2.2, dz <= 22.0)
    const southRoom = layer.excavatedRooms.find((r) => r.direction === 'south');
    if (southRoom && southRoom.isComplete && dz > 0 && Math.abs(dx) <= 2.2 && dz <= 22.0) {
      return true;
    }

    // East Drift (dx > 0, |dz| <= 2.2, dx <= 22.0)
    const eastRoom = layer.excavatedRooms.find((r) => r.direction === 'east');
    if (eastRoom && eastRoom.isComplete && dx > 0 && Math.abs(dz) <= 2.2 && dx <= 22.0) {
      return true;
    }

    // West Drift (dx < 0, |dz| <= 2.2, dx >= -22.0)
    const westRoom = layer.excavatedRooms.find((r) => r.direction === 'west');
    if (westRoom && westRoom.isComplete && dx < 0 && Math.abs(dz) <= 2.2 && dx >= -22.0) {
      return true;
    }

    return false;
  }

  // Constrain position to chamber and excavated rooms
  public clampPositionToCavern(pos: Vector3D, currentLevel: number): Vector3D {
    if (currentLevel === 0) return pos;

    if (this.isInsideCavernOrRooms(pos.x, pos.z, currentLevel)) {
      return pos;
    }

    // Clamp back towards central chamber boundary (radius 12.0)
    const dx = pos.x - this.surfacePos.x;
    const dz = pos.z - this.surfacePos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.001) {
      const maxRadius = 15.5;
      return {
        x: this.surfacePos.x + (dx / dist) * maxRadius,
        y: pos.y,
        z: this.surfacePos.z + (dz / dist) * maxRadius,
      };
    }
    return pos;
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

  // Check if player is near a specific room portal face
  public getNearbyRoomPortal(pos: Vector3D, range = 3.8): { direction: RoomDirection; room: ExcavatedRoom } | null {
    const layer = this.layers.find((l) => l.level === this.currentLevel);
    if (!layer || !layer.excavatedRooms) return null;

    const chamberRadius = 12.0;
    const portalOffsets: Record<RoomDirection, { x: number; z: number }> = {
      north: { x: 0, z: -chamberRadius + 0.5 },
      south: { x: 0, z: chamberRadius - 0.5 },
      east: { x: chamberRadius - 0.5, z: 0 },
      west: { x: -chamberRadius + 0.5, z: 0 },
      crosscut: { x: 0, z: 0 },
    };

    for (const room of layer.excavatedRooms) {
      const offset = portalOffsets[room.direction];
      const worldPortalX = this.surfacePos.x + offset.x;
      const worldPortalZ = this.surfacePos.z + offset.z;
      const dist = Math.hypot(pos.x - worldPortalX, pos.z - worldPortalZ);
      if (dist <= range) {
        return { direction: room.direction, room };
      }
    }

    return null;
  }

  /**
   * Raycasts directly against active subterranean cavern wall meshes or existing cavern holes.
   */
  public raycastCavernWall(
    raycaster: THREE.Raycaster,
    maxDistance = 6.0
  ): {
    hit: boolean;
    point?: THREE.Vector3;
    normal?: THREE.Vector3;
    mesh?: THREE.Mesh;
    distance?: number;
    existingHole?: MountainHole;
  } {
    if (this.currentLevel === 0) return { hit: false };

    // 1. First test existing excavated holes in the cavern
    if (this.holeManager) {
      const holeHit = this.holeManager.raycastMountainHoles(raycaster, maxDistance);
      if (holeHit.hit && holeHit.point) {
        const wallNormal = new THREE.Vector3(
          this.surfacePos.x - holeHit.point.x,
          0.12,
          this.surfacePos.z - holeHit.point.z
        ).normalize();
        return {
          hit: true,
          point: holeHit.point,
          normal: wallNormal,
          distance: holeHit.distance,
          existingHole: holeHit.hole,
        };
      }
    }

    // 2. Test intersection with cavern perimeter wall meshes
    if (this.cavernWallMeshes.length > 0) {
      const hits = raycaster.intersectObjects(this.cavernWallMeshes, false);
      if (hits.length > 0 && hits[0].distance <= maxDistance) {
        const hit = hits[0];
        // Calculate inward normal from wall face pointing into cavern towards player
        let normal = hit.face?.normal?.clone();
        if (normal) {
          normal.transformDirection(hit.object.matrixWorld);
        } else {
          normal = new THREE.Vector3(
            this.surfacePos.x - hit.point.x,
            0.12,
            this.surfacePos.z - hit.point.z
          ).normalize();
        }
        if (normal.lengthSq() < 0.01) normal.set(0, 1, 0);

        return {
          hit: true,
          point: hit.point,
          normal,
          mesh: hit.object as THREE.Mesh,
          distance: hit.distance,
        };
      }
    }

    return { hit: false };
  }

  // Get floor elevation for locomotion when underground (dynamically follows voxel pit sinking)
  public getFloorElevationForPosition(x: number, z: number, currentLevel: number): number {
    if (currentLevel === 0) return this.surfaceY;
    const layer = this.layers.find((l) => l.level === currentLevel);
    if (!layer) return this.surfaceY;
    return this.voxelEngine.getFloorElevationAt(x, z, currentLevel);
  }

  // Physical particles when digging in the mine shaft
  public spawnDigDebris(center: THREE.Vector3) {
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

  // Strike continuous organic cavern bedrock face at any 0-360° heading
  // Carves true volumetric 3D excavation holes into the subterranean chamber rock wall!
  public strikeCavernWall(
    hitPoint: THREE.Vector3,
    tool: string = 'pickaxe',
    customNormal?: THREE.Vector3
  ): {
    success: boolean;
    heading: number;
    compassLabel: string;
    rockType: string;
    oreYield: number;
    oreType: string;
    message: string;
    hole?: MountainHole;
    depthReached?: number;
  } {
    const isDynamite = tool === 'dynamite';
    const dx = hitPoint.x - this.surfacePos.x;
    const dz = hitPoint.z - this.surfacePos.z;
    const angleRad = Math.atan2(dz, dx);
    const compassHeading = Math.round((angleRad * (180 / Math.PI) + 450) % 360);

    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const dirIdx = Math.round(compassHeading / 45) % 8;
    const compassLabel = `${compassHeading.toString().padStart(3, '0')}° ${dirs[dirIdx]}`;

    // Authentic geological host rock strata & wall color
    let rockType = 'Peralta Red Sandstone';
    let wallColorHex = 0x8a4528;
    let particleMatType = 'sandstone';

    if (this.currentLevel === 1) {
      rockType = 'Desert Dacite & Sandstone';
      wallColorHex = 0x846854;
      particleMatType = 'caliche';
    } else if (this.currentLevel === 2) {
      rockType = 'Peralta Hematite Sandstone & Schist';
      wallColorHex = 0x6e3c28;
      particleMatType = 'sandstone';
    } else if (this.currentLevel === 3) {
      rockType = 'Precambrian Granodiorite Bedrock';
      wallColorHex = 0x48423f;
      particleMatType = 'granite';
    } else if (this.currentLevel === 4) {
      rockType = 'Superstition Basalt Caldera';
      wallColorHex = 0x222226;
      particleMatType = 'basalt';
    } else if (this.currentLevel >= 5) {
      rockType = 'Deep Chlorite Schist & Diorite';
      wallColorHex = 0x1f2e24;
      particleMatType = 'volcanic_crag';
    }

    // Calculate normal vector pointing out from the wall face into the cavern
    const wallNormal = customNormal?.clone() || new THREE.Vector3(
      this.surfacePos.x - hitPoint.x,
      0.18,
      this.surfacePos.z - hitPoint.z
    ).normalize();
    if (wallNormal.lengthSq() < 0.01) wallNormal.set(0, 1, 0);

    // Procedural volumetric hole excavation inside the mine!
    let createdHole: MountainHole | undefined;
    let holeDepth = 0.42;
    let holeResult: { goldAwarded: number; message: string } | null = null;

    if (this.holeManager) {
      const digRes = this.holeManager.digMountainHole(
        hitPoint,
        wallNormal,
        wallColorHex,
        particleMatType,
        tool
      );
      createdHole = digRes.hole;
      holeDepth = digRes.depthReached;
      holeResult = {
        goldAwarded: digRes.goldAwarded,
        message: digRes.message,
      };
    }

    // Rare hydrothermal quartz vein hit detection (~8% probability or bonus with depth)
    const veinNoise = Math.sin(angleRad * 5.0) * Math.cos(hitPoint.y * 1.8);
    const struckVein = veinNoise > 0.82 || (createdHole?.hasExposedGoldVein ?? false);
    let oreYield = holeResult?.goldAwarded || 0;
    let oreType = struckVein ? (this.currentLevel >= 4 ? 'Electrum Wire Gold' : 'Native Wire Gold') : 'none';

    if (struckVein && oreYield === 0) {
      oreYield = Number((1.5 + Math.random() * (this.currentLevel * 2.2)).toFixed(1));
      soundEngine.playOreChime();
      soundEngine.playDiscovery();
    } else if (oreYield > 0) {
      soundEngine.playOreChime();
    }

    if (isDynamite) {
      soundEngine.playDynamiteExplosion();
      this.spawnDigDebris(hitPoint);
      this.spawnDigDebris(hitPoint);
    } else {
      soundEngine.playRockChisel();
      this.spawnDigDebris(hitPoint);
    }

    if (this.dustParticleSystem) {
      const particleMat = struckVein ? 'quartz_gold' : particleMatType;
      this.dustParticleSystem.triggerMountainStrike(
        hitPoint,
        wallNormal,
        particleMat,
        isDynamite ? 2.6 : 1.35,
        hitPoint.y - 0.45
      );
    }

    let message = `⛏️ Chiseled ${compassLabel} Cavern Wall (-${holeDepth.toFixed(1)}m): Solid ${rockType} host rock.`;
    if (struckVein && oreYield > 0) {
      message = `🪙 Struck Hydrothermal Quartz Vein in Cavern Wall at ${compassLabel} (-${holeDepth.toFixed(1)}m)! Yielded +${oreYield} oz ${oreType}!`;
    } else if (holeResult?.message) {
      message = holeResult.message;
    }

    return {
      success: true,
      heading: compassHeading,
      compassLabel,
      rockType,
      oreYield,
      oreType,
      message,
      hole: createdHole,
      depthReached: holeDepth,
    };
  }

  // Main update loop: hydrological flooding, pump mechanics, light flickers, particles
  public update(delta: number, now: number) {
    // 1. Cornish Dewatering Pump & Aquifer Hydrological Simulation
    if (this.waterTable.aquiferBreached || this.currentLevel >= 6) {
      // Flooding rate
      const pumpRunning = this.waterTable.pumpActive;
      const netRate = pumpRunning
        ? -this.waterTable.pumpRate + this.waterTable.floodRate * 0.4
        : this.waterTable.floodRate;

      // Update water in level 6, 7, and spillover into 5
      [5, 6, 7].forEach((lvl) => {
        const curWater = this.waterTable.waterLevelInLevel[lvl] || 0;
        const maxWater = lvl === 7 ? 4.5 : lvl === 6 ? 3.2 : 1.2;
        const newWater = Math.max(0, Math.min(maxWater, curWater + netRate * delta * (lvl >= 6 ? 1.0 : 0.4)));
        this.waterTable.waterLevelInLevel[lvl] = newWater;

        // Update 3D water mesh position & visibility
        const waterMesh = this.waterMeshes.get(lvl);
        if (waterMesh) {
          const layer = this.layers.find((l) => l.level === lvl);
          if (layer) {
            const floorY = this.surfaceY - layer.depthMeters;
            waterMesh.position.y = floorY + Math.max(0.04, newWater);
            waterMesh.visible = newWater > 0.04;

            // Subtle undulating wave ripple
            waterMesh.rotation.z = Math.sin(now * 0.002 + lvl) * 0.02;
          }
        }
      });

      // Pump Audio: rhythmic iron chug and steam hiss
      if (pumpRunning) {
        this.pumpChugTimer += delta;
        if (this.pumpChugTimer >= 1.6) {
          this.pumpChugTimer = 0;
          soundEngine.playPumpChug();
        }
      }
    }

    // 2. Cave water droplet ping audio in deep levels (level >= 4)
    if (this.currentLevel >= 4) {
      this.waterDripTimer += delta;
      if (this.waterDripTimer >= 4.0 + Math.random() * 3.0) {
        this.waterDripTimer = 0;
        soundEngine.playWaterDrip();
      }
    }

    // 3. Lantern flicker
    this.lanternLights.forEach((light, idx) => {
      light.intensity = 1.8 + Math.sin(now * 0.008 + idx * 1.7) * 0.35 + (Math.random() - 0.5) * 0.12;
    });

    // 4. Crystal pulsating glow
    this.animatedCrystals.forEach((crystal, idx) => {
      const mat = crystal.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.7 + Math.sin(now * 0.004 + idx) * 0.3;
      }
    });

    // 4b. Atmospheric dust motes drift in lantern beam
    this.dustMotesList.forEach((motes, mIdx) => {
      const posAttr = motes.geometry.attributes.position;
      if (posAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          let y = posAttr.getY(i) + Math.sin(now * 0.001 + i * 0.3 + mIdx) * delta * 0.1;
          let x = posAttr.getX(i) + Math.cos(now * 0.0008 + i * 0.2) * delta * 0.06;
          let z = posAttr.getZ(i) + Math.sin(now * 0.0009 + i * 0.25) * delta * 0.06;
          if (y < 0.2) y = 4.8;
          if (y > 5.0) y = 0.3;
          posAttr.setXYZ(i, x, y, z);
        }
        posAttr.needsUpdate = true;
      }
    });

    // 5. Debris particles
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
    this.voxelEngine.dispose();
    this.scene.remove(this.mainGroup);
    this.mainGroup.clear();
  }
}
