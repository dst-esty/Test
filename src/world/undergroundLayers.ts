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
  private undergroundAmbient?: THREE.AmbientLight;
  private animatedCrystals: THREE.Mesh[] = [];
  private dustMotesList: THREE.Points[] = [];
  public cavernWallMeshes: THREE.Mesh[] = [];

  public getLayerData(level: number): MineLayerData | undefined {
    return this.layers.find((l) => l.level === level);
  }

  // Open Mine Shaft Visual References & Atmospheric Lighting
  private skyPortalMesh?: THREE.Mesh;
  private sunbeamMesh?: THREE.Mesh;
  private sunbeamDustPoints?: THREE.Points;
  private sheaveWheelGroup?: THREE.Group;
  private skyTexDay?: THREE.CanvasTexture;
  private skyTexSunset?: THREE.CanvasTexture;
  private skyTexNight?: THREE.CanvasTexture;

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
  public wallUniformsList: {
    uHolePositions: { value: THREE.Vector3[] };
    uHoleDirs: { value: THREE.Vector3[] };
    uHoleRadii: { value: Float32Array };
    uHoleDepths: { value: Float32Array };
    uHoleCount: { value: number };
  }[] = [];

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

  public updateCavernWallHoleCutouts(): void {
    if (!this.holeManager) return;
    const undergroundHoles = this.holeManager.holes.filter(
      (h) => h.position.y < this.surfaceY - 1.5
    );
    for (let u = 0; u < this.wallUniformsList.length; u++) {
      const uniforms = this.wallUniformsList[u];
      const layer = this.layers[u];
      const layerFloorY = layer ? this.surfaceY - layer.depthMeters : this.surfaceY - 8.5;
      const sortedHoles = [...undergroundHoles].sort(
        (a, b) => Math.abs(a.position.y - layerFloorY) - Math.abs(b.position.y - layerFloorY)
      );
      const count = Math.min(8, sortedHoles.length);
      uniforms.uHoleCount.value = count;
      for (let i = 0; i < count; i++) {
        const h = sortedHoles[i];
        uniforms.uHolePositions.value[i].copy(h.position);
        const boreDir = new THREE.Vector3(0, 0, -1).applyQuaternion(h.group.quaternion).normalize();
        uniforms.uHoleDirs.value[i].copy(boreDir);
        uniforms.uHoleRadii.value[i] = h.radius * 1.04;
        uniforms.uHoleDepths.value[i] = h.depth;
      }
    }
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
    if (this.undergroundAmbient) {
      if (level >= 5) {
        this.undergroundAmbient.color.setHex(0x6699bb);
        this.undergroundAmbient.intensity = 0.7;
      } else {
        this.undergroundAmbient.color.setHex(0xd4a070);
        this.undergroundAmbient.intensity = 0.8;
      }
    }
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

    if (!this.undergroundAmbient) {
      this.undergroundAmbient = new THREE.AmbientLight(0xd4a070, 0.8);
      this.mainGroup.add(this.undergroundAmbient);
    }

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

    const holeUniforms = {
      uHolePositions: {
        value: Array.from({ length: 8 }, () => new THREE.Vector3(0, -9999, 0)),
      },
      uHoleDirs: {
        value: Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, 1)),
      },
      uHoleRadii: { value: new Float32Array(8) },
      uHoleDepths: { value: new Float32Array(8) },
      uHoleCount: { value: 0 },
    };
    this.wallUniformsList.push(holeUniforms);

    wallMat.onBeforeCompile = (shader) => {
      shader.uniforms.uHolePositions = holeUniforms.uHolePositions;
      shader.uniforms.uHoleDirs = holeUniforms.uHoleDirs;
      shader.uniforms.uHoleRadii = holeUniforms.uHoleRadii;
      shader.uniforms.uHoleDepths = holeUniforms.uHoleDepths;
      shader.uniforms.uHoleCount = holeUniforms.uHoleCount;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPositionCustom;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vWorldPositionCustom = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPositionCustom;
         uniform vec3 uHolePositions[8];
         uniform vec3 uHoleDirs[8];
         uniform float uHoleRadii[8];
         uniform float uHoleDepths[8];
         uniform int uHoleCount;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         for (int i = 0; i < 8; i++) {
           if (i >= uHoleCount) break;
           vec3 p = vWorldPositionCustom;
           vec3 a = uHolePositions[i];
           vec3 dir = uHoleDirs[i];
           float d = uHoleDepths[i];
           float r = uHoleRadii[i];

           float t = clamp(dot(p - a, dir), -0.6, d + 0.35);
           vec3 axisPoint = a + dir * t;
           if (distance(p, axisPoint) < r) {
             discard;
           }
         }`
      );
    };

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

    // 3. Cavern Ceiling with smooth collar seat, stalactite crags, and open mine shaft breakthrough aperture
    const roofGeo = new THREE.RingGeometry(1.72, radius * 1.3, 48);
    const roofPos = roofGeo.attributes.position;
    for (let i = 0; i < roofPos.count; i++) {
      const rx = roofPos.getX(i);
      const rz = roofPos.getY(i); // RingGeometry lies in XY before rotation
      const dist = Math.hypot(rx, rz);
      // Keep collar perimeter perfectly flat so it seats cleanly against ceiling timber beams
      const edgeBlend = Math.min(1.0, Math.max(0.0, (dist - 2.2) / 1.5));
      const roughness = Math.sin(rx * 0.8) * Math.cos(rz * 0.8) * 0.45 * edgeBlend;
      const stalactite = dist > 3.0 && dist < radius * 0.7 ? Math.pow(Math.abs(Math.sin(rx * 1.4 + rz * 1.2)), 3.0) * 0.65 : 0;
      roofPos.setZ(i, roughness - stalactite);
    }
    roofGeo.computeVertexNormals();

    const roofMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.95,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    const caveRoof = new THREE.Mesh(roofGeo, roofMat);
    caveRoof.position.y = height;
    caveRoof.rotation.x = Math.PI / 2;
    caveRoof.name = `cavern_roof_level_${layer.level}`;
    group.add(caveRoof);
    this.cavernWallMeshes.push(caveRoof);

    // Thick solid rock cap above the ceiling to completely block any exterior daylight or sky
    const capGeo = new THREE.RingGeometry(1.72, radius * 1.35, 36);
    const capMesh = new THREE.Mesh(capGeo, roofMat);
    capMesh.position.y = height + 0.35;
    capMesh.rotation.x = Math.PI / 2;
    group.add(capMesh);

    // Ceiling timber collar framing the vertical mine shaft breakthrough
    const ceilingCollarMat = new THREE.MeshStandardMaterial({ color: 0x3d2718, roughness: 0.92 });
    [-1.75, 1.75].forEach((bx) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 3.85), ceilingCollarMat);
      beam.position.set(bx, height - 0.175, 0);
      group.add(beam);
    });
    [-1.75, 1.75].forEach((bz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.35, 0.35), ceilingCollarMat);
      beam.position.set(0, height - 0.175, bz);
      group.add(beam);
    });

    // Central Shaft Station Overhead Lantern illuminating the breakthrough and pit
    const stationLantern = new THREE.PointLight(layer.level >= 5 ? 0x88ccff : 0xffa442, 2.8, 22, 1.4);
    stationLantern.position.set(0, height - 0.85, 0);
    group.add(stationLantern);
    this.lanternLights.push(stationLantern);

    // 4. Bedrock Floor with central shaft opening seamlessly seated under timber collar
    const floorGeo = new THREE.RingGeometry(1.68, radius * 1.25, 48);
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

    // Sub-floor bedrock base plate and solid rock shaft walls deep beneath the voxel layers
    const fissureMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.95,
      emissive: layer.level >= 5 ? 0x113355 : 0x331a00,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
    });

    // Solid bedrock pit basin walls preventing any void gaps around excavation pit
    const pitDepth = 3.6;
    const pWallN = new THREE.Mesh(new THREE.BoxGeometry(3.9, pitDepth, 0.25), fissureMat);
    pWallN.position.set(0, -pitDepth / 2, -1.9);
    pitCollar.add(pWallN);

    const pWallS = new THREE.Mesh(new THREE.BoxGeometry(3.9, pitDepth, 0.25), fissureMat);
    pWallS.position.set(0, -pitDepth / 2, 1.9);
    pitCollar.add(pWallS);

    const pWallW = new THREE.Mesh(new THREE.BoxGeometry(0.25, pitDepth, 3.9), fissureMat);
    pWallW.position.set(-1.9, -pitDepth / 2, 0);
    pitCollar.add(pWallW);

    const pWallE = new THREE.Mesh(new THREE.BoxGeometry(0.25, pitDepth, 3.9), fissureMat);
    pWallE.position.set(1.9, -pitDepth / 2, 0);
    pitCollar.add(pWallE);

    // Floor plate at the bottom of the excavation pit basin
    const fissureMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 4.2), fissureMat);
    fissureMesh.position.set(0, -pitDepth, 0);
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

  // Dynamic Canvas Texture for Open Desert Sky Aperture viewed from underground
  private createSkyPortalTexture(mode: 'day' | 'sunset' | 'night' = 'day'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const cx = 256;
    const cy = 256;

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 256);
    if (mode === 'night') {
      grad.addColorStop(0, '#1c2e4a');
      grad.addColorStop(0.45, '#0e1726');
      grad.addColorStop(1, '#050a12');
    } else if (mode === 'sunset') {
      grad.addColorStop(0, '#ffe49e');
      grad.addColorStop(0.35, '#ff8c3b');
      grad.addColorStop(0.7, '#a23924');
      grad.addColorStop(1, '#3b1d28');
    } else {
      // Clear Arizona Desert Sky
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.12, '#fff4cc');
      grad.addColorStop(0.35, '#68b5e8');
      grad.addColorStop(0.75, '#2b7ec9');
      grad.addColorStop(1, '#1b5b9c');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    if (mode === 'night') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 90; i++) {
        const sx = (i * 97) % 512;
        const sy = (i * 139) % 512;
        const sr = (i % 3) * 0.5 + 0.6;
        ctx.globalAlpha = 0.4 + ((i % 5) * 0.15);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#e8f0fe';
      ctx.beginPath();
      ctx.arc(cx - 40, cy - 30, 32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = mode === 'sunset' ? 'rgba(255, 200, 160, 0.45)' : 'rgba(255, 255, 255, 0.55)';
      for (let c = 0; c < 5; c++) {
        const cloudY = 120 + c * 60 + Math.sin(c) * 20;
        const cloudX = 80 + c * 80;
        ctx.beginPath();
        ctx.ellipse(cloudX, cloudY, 90, 22, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 95);
      sunGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      sunGrad.addColorStop(0.2, 'rgba(255, 250, 210, 0.95)');
      sunGrad.addColorStop(0.5, 'rgba(255, 220, 130, 0.6)');
      sunGrad.addColorStop(1, 'rgba(255, 180, 50, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 95, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // Continuous vertical shaft with timber cribbing, lagging, climbable ladder, surface gallows headframe, and open sky portal
  public rebuildShaftInfrastructure() {
    this.shaftGroup.clear();

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

    const deepestLayer = this.layers.find((l) => l.level === this.maxUnlockedLevel) || this.layers[0];
    const deepestFloorY = this.surfaceY - deepestLayer.depthMeters;
    const shaftTopY = this.surfaceY + 0.35;
    const totalShaftHeight = shaftTopY - deepestFloorY;
    const collarRadius = 1.65;

    // =========================================================================
    // 1. SOLID SUBTERRANEAN SHAFT BEDROCK BASE & COLLAR LIGHTING
    // =========================================================================
    // Pure dark bedrock floor beneath the deepest mine level
    const voidFloorGeo = new THREE.BoxGeometry(collarRadius * 2.5, 0.5, collarRadius * 2.5);
    const voidFloorMat = new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.96 });
    const voidFloor = new THREE.Mesh(voidFloorGeo, voidFloorMat);
    voidFloor.position.set(0, deepestFloorY - 3.5, 0);
    this.shaftGroup.add(voidFloor);

    // Faint Miner's Collar Lantern (hung on the inner timber set just below the rim)
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(-collarRadius + 0.32, this.surfaceY - 0.75, -collarRadius + 0.35);

    const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.28, 6), ironMat);
    lanternGroup.add(lanternBody);

    const lanternGlobe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.14, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffaa44,
        emissive: 0xff8822,
        emissiveIntensity: 0.85,
        transparent: true,
        opacity: 0.85,
      })
    );
    lanternGlobe.position.set(0, -0.02, 0);
    lanternGroup.add(lanternGlobe);

    const collarLanternLight = new THREE.PointLight(0xff8822, 1.2, 4.8);
    collarLanternLight.position.set(0, -0.02, 0);
    lanternGroup.add(collarLanternLight);
    this.shaftGroup.add(lanternGroup);

    // Helper: determine if an elevation Y falls within an open stope/chamber level
    const isOpenStope = (y: number) => {
      return this.layers.some((l) => {
        const fY = this.surfaceY - l.depthMeters;
        const cH = l.level === 1 ? 5.0 : l.level === 2 ? 5.4 : l.level === 3 ? 6.2 : 6.6;
        return y >= fY + 0.35 && y <= fY + cH - 0.35;
      });
    };

    // =========================================================================
    // 2. VERTICAL TIMBER SHAFT GUIDE POSTS & CRIBBING
    // =========================================================================
    const cornerPositions = [
      { x: -collarRadius, z: -collarRadius },
      { x: collarRadius, z: -collarRadius },
      { x: collarRadius, z: collarRadius },
      { x: -collarRadius, z: collarRadius },
    ];

    cornerPositions.forEach((pos) => {
      const guidePost = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, totalShaftHeight + 0.8, 0.32),
        darkTimberMat
      );
      guidePost.position.set(pos.x, (shaftTopY + deepestFloorY) / 2, pos.z);
      this.shaftGroup.add(guidePost);
    });

    // Square Timber Cribbing Sets every 1.1m
    const numSets = Math.floor(totalShaftHeight / 1.1);
    const beamThick = 0.22;
    const beamLength = collarRadius * 2 + beamThick;

    for (let s = 0; s <= numSets; s++) {
      const setY = deepestFloorY + s * 1.1 + 0.2;
      const inStope = isOpenStope(setY);

      // North wall beam (supports ladder backing)
      const bZNorth = new THREE.Mesh(new THREE.BoxGeometry(beamLength, beamThick, beamThick), darkTimberMat);
      bZNorth.position.set(0, setY, -collarRadius);
      this.shaftGroup.add(bZNorth);

      // In solid rock (overburden or between levels), build full cribbing sets on all 4 sides
      if (!inStope) {
        const bZSouth = new THREE.Mesh(new THREE.BoxGeometry(beamLength, beamThick, beamThick), darkTimberMat);
        bZSouth.position.set(0, setY, collarRadius);
        this.shaftGroup.add(bZSouth);

        [-collarRadius, collarRadius].forEach((bx) => {
          const bX = new THREE.Mesh(new THREE.BoxGeometry(beamThick, beamThick, beamLength), darkTimberMat);
          bX.position.set(bx, setY, 0);
          this.shaftGroup.add(bX);
        });
      }
    }

    // Heavy Timber Shaft Lagging Planks
    const plankSpacing = 0.38;
    const plankCount = Math.floor(totalShaftHeight / plankSpacing);
    for (let p = 0; p < plankCount; p++) {
      const py = deepestFloorY + p * plankSpacing + 0.15;
      const curMat = p % 2 === 0 ? woodMat : altWoodMat;
      const inStope = isOpenStope(py);

      // North wall backing behind ladder is always placed for structure and climb safety
      const plankN = new THREE.Mesh(new THREE.BoxGeometry(collarRadius * 1.8, 0.26, 0.08), curMat);
      plankN.position.set(0, py, -collarRadius + 0.04);
      this.shaftGroup.add(plankN);

      // East, West, South walls only have lagging planks when cutting through solid rock
      // Inside active stope chambers, sides remain open so miners can freely see and walk into the cavern
      if (!inStope) {
        const plankE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, collarRadius * 1.8), curMat);
        plankE.position.set(collarRadius - 0.04, py, 0);
        this.shaftGroup.add(plankE);

        const plankW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, collarRadius * 1.8), curMat);
        plankW.position.set(-collarRadius + 0.04, py, 0);
        this.shaftGroup.add(plankW);

        const plankS = new THREE.Mesh(new THREE.BoxGeometry(collarRadius * 1.8, 0.26, 0.08), curMat);
        plankS.position.set(0, py, collarRadius - 0.04);
        this.shaftGroup.add(plankS);
      }
    }

    // Continuous Pine Access Ladder (North wall, reaching 1.25m above surface collar)
    const ladderWidth = 0.55;
    const rungSpacing = 0.32;
    const ladderTopY = this.surfaceY + 1.25;
    const ladderHeight = ladderTopY - deepestFloorY;
    const rungCount = Math.floor(ladderHeight / rungSpacing);

    [-ladderWidth / 2, ladderWidth / 2].forEach((lx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, ladderHeight, 0.12),
        woodMat
      );
      rail.position.set(lx, (ladderTopY + deepestFloorY) / 2, -collarRadius + 0.20);
      this.shaftGroup.add(rail);
    });

    const rungMatWood = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.88 });
    const rungGeo = new THREE.CylinderGeometry(0.024, 0.024, ladderWidth - 0.04, 8);
    for (let r = 0; r < rungCount; r++) {
      const rungY = ladderTopY - r * rungSpacing - 0.15;
      const rung = new THREE.Mesh(rungGeo, r % 3 === 0 ? ironMat : rungMatWood);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, rungY, -collarRadius + 0.20);
      this.shaftGroup.add(rung);
    }

    // Extended Iron Safety Grab Rails at the Top of the Ladder
    [-ladderWidth / 2, ladderWidth / 2].forEach((lx) => {
      const grabRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 1.15, 8),
        ironMat
      );
      grabRail.position.set(lx, this.surfaceY + 0.9, -collarRadius + 0.18);
      this.shaftGroup.add(grabRail);

      // Curved top grab handle
      const grabCurve = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.022, 8, 12, Math.PI),
        ironMat
      );
      grabCurve.position.set(lx, this.surfaceY + 1.45, -collarRadius + 0.06);
      grabCurve.rotation.y = Math.PI / 2;
      this.shaftGroup.add(grabCurve);
    });

    // =========================================================================
    // 3. SURFACE PLATFORM & HEAVY TIMBER COLLAR DECKING
    // =========================================================================
    // 4 Heavy Foundation Sill Timbers (Framing the collar on the desert bedrock)
    const sillThickness = 0.42;
    const sillLength = 5.6;
    const sillY = this.surfaceY + 0.18;

    [-2.2, 2.2].forEach((sx) => {
      const sillZ = new THREE.Mesh(new THREE.BoxGeometry(sillThickness, sillThickness, sillLength), darkTimberMat);
      sillZ.position.set(sx, sillY, 0);
      sillZ.castShadow = true;
      this.shaftGroup.add(sillZ);
    });
    [-2.2, 2.2].forEach((sz) => {
      const sillX = new THREE.Mesh(new THREE.BoxGeometry(sillLength, sillThickness, sillThickness), darkTimberMat);
      sillX.position.set(0, sillY, sz);
      sillX.castShadow = true;
      this.shaftGroup.add(sillX);
    });

    // Timber Staging Deck Flooring Planks around the pit collar
    const plankWidth = 0.28;
    for (let px = -2.3; px <= 2.3; px += plankWidth) {
      if (Math.abs(px) < collarRadius - 0.1) {
        // Front and back plank segments flanking the open mouth
        [-1.85, 1.85].forEach((pz) => {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(plankWidth * 0.92, 0.09, 0.9), altWoodMat);
          plank.position.set(px, this.surfaceY + 0.22, pz);
          plank.receiveShadow = true;
          this.shaftGroup.add(plank);
        });
      } else {
        // Full side staging planks
        const fullPlank = new THREE.Mesh(new THREE.BoxGeometry(plankWidth * 0.92, 0.09, 4.4), altWoodMat);
        fullPlank.position.set(px, this.surfaceY + 0.22, 0);
        fullPlank.receiveShadow = true;
        this.shaftGroup.add(fullPlank);
      }
    }

    // Protective Raised Safety Coaming Curb surrounding the open pit rim (0.35m high)
    const curbHeight = 0.35;
    const curbThick = 0.18;
    const curbY = this.surfaceY + 0.34;
    [-collarRadius, collarRadius].forEach((cz) => {
      const curbX = new THREE.Mesh(new THREE.BoxGeometry(collarRadius * 2 + 0.36, curbHeight, curbThick), woodMat);
      curbX.position.set(0, curbY, cz);
      curbX.castShadow = true;
      this.shaftGroup.add(curbX);
    });
    [-collarRadius, collarRadius].forEach((cx) => {
      const curbZ = new THREE.Mesh(new THREE.BoxGeometry(curbThick, curbHeight, collarRadius * 2), woodMat);
      curbZ.position.set(cx, curbY, 0);
      curbZ.castShadow = true;
      this.shaftGroup.add(curbZ);
    });

    // Timber Safety Handrails on East & West flanks
    [-2.2, 2.2].forEach((rx) => {
      // Stanchions
      [-1.8, 0, 1.8].forEach((rz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), woodMat);
        post.position.set(rx, this.surfaceY + 0.75, rz);
        this.shaftGroup.add(post);
      });
      // Top Rail
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 4.0), woodMat);
      topRail.position.set(rx, this.surfaceY + 1.25, 0);
      this.shaftGroup.add(topRail);
      // Mid Rail
      const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.0), woodMat);
      midRail.position.set(rx, this.surfaceY + 0.75, 0);
      this.shaftGroup.add(midRail);
    });

    // =========================================================================
    // 4. FULLY BUILT-OUT 1880s WESTERN TIMBER HEADFRAME (GALLOWS TOWER)
    // =========================================================================
    const gallowsHeight = 6.8;
    const gallowsTopY = this.surfaceY + gallowsHeight;

    // 4 Main Incline Gallows Posts (12"x12" squared pine timber columns)
    const legGeo = new THREE.BoxGeometry(0.36, gallowsHeight * 1.05, 0.36);
    const legBaseX = 1.75;
    const legBaseZ = 1.35;
    const legTopX = 0.95;

    [
      { bx: -legBaseX, bz: -legBaseZ, tx: -legTopX, tz: 0 },
      { bx: legBaseX, bz: -legBaseZ, tx: legTopX, tz: 0 },
      { bx: legBaseX, bz: legBaseZ, tx: legTopX, tz: 0 },
      { bx: -legBaseX, bz: legBaseZ, tx: -legTopX, tz: 0 },
    ].forEach((c) => {
      const leg = new THREE.Mesh(legGeo, darkTimberMat);
      leg.position.set((c.bx + c.tx) / 2, this.surfaceY + gallowsHeight / 2, (c.bz + c.tz) / 2);
      const angleX = (c.tx - c.bx) / gallowsHeight;
      const angleZ = (c.tz - c.bz) / gallowsHeight;
      leg.rotation.set(angleZ, 0, -angleX);
      leg.castShadow = true;
      this.shaftGroup.add(leg);

      // Heavy Forged Iron Footing Bracket with square bolts at base
      const footPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.55), ironMat);
      footPlate.position.set(c.bx, this.surfaceY + 0.3, c.bz);
      this.shaftGroup.add(footPlate);
    });

    // Iconic Diagonal Backstays (Heavy Rear Angled Thrust Braces ~50 degrees)
    const backstayLength = 7.6;
    const backstayGeo = new THREE.BoxGeometry(0.36, backstayLength, 0.36);
    [-1.5, 1.5].forEach((bsx) => {
      const backstay = new THREE.Mesh(backstayGeo, darkTimberMat);
      // Runs from rear winch base (z = -4.2) up to headframe crown (z = -0.2)
      backstay.position.set(bsx * 0.85, this.surfaceY + gallowsHeight * 0.48, -2.2);
      backstay.rotation.x = -0.58; // Angled back brace
      backstay.castShadow = true;
      this.shaftGroup.add(backstay);

      // Cast iron anchor footing plate at the rear
      const rearFoot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), ironMat);
      rearFoot.position.set(bsx * 1.1, this.surfaceY + 0.3, -4.2);
      this.shaftGroup.add(rearFoot);
    });

    // Horizontal & Diagonal Braces between the two Backstays
    const backstayCrossGirt = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 0.28), woodMat);
    backstayCrossGirt.position.set(0, this.surfaceY + 3.2, -2.3);
    this.shaftGroup.add(backstayCrossGirt);

    [-1, 1].forEach((dir) => {
      const bsDiagonal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), woodMat);
      bsDiagonal.position.set(0, this.surfaceY + 2.2, -2.9);
      bsDiagonal.rotation.set(-0.58, 0, dir * 0.45);
      this.shaftGroup.add(bsDiagonal);
    });

    // Iron Tension Rods with Turnbuckles connecting backstays to front posts
    [-1.1, 1.1].forEach((tx) => {
      const tieRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.2, 6), ironMat);
      tieRod.rotation.x = Math.PI / 2;
      tieRod.position.set(tx, this.surfaceY + 3.8, -1.2);
      this.shaftGroup.add(tieRod);

      const turnbuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 6), ironMat);
      turnbuckle.rotation.x = Math.PI / 2;
      turnbuckle.position.set(tx, this.surfaceY + 3.8, -1.2);
      this.shaftGroup.add(turnbuckle);
    });

    // 3 Tiers of Horizontal Collar Girts & Structural "X" Bracing
    const tiers = [
      { y: this.surfaceY + 2.1, wX: 3.1, wZ: 2.3, beamThick: 0.28 },
      { y: this.surfaceY + 4.0, wX: 2.5, wZ: 1.8, beamThick: 0.26 },
      { y: this.surfaceY + 5.7, wX: 2.1, wZ: 1.4, beamThick: 0.24 },
    ];

    tiers.forEach((tier) => {
      // Front & Back horizontal collar girts
      [-tier.wZ / 2, tier.wZ / 2].forEach((gz) => {
        const girtX = new THREE.Mesh(new THREE.BoxGeometry(tier.wX, tier.beamThick, tier.beamThick), woodMat);
        girtX.position.set(0, tier.y, gz);
        girtX.castShadow = true;
        this.shaftGroup.add(girtX);
      });
      // Left & Right horizontal collar girts
      [-tier.wX / 2, tier.wX / 2].forEach((gx) => {
        const girtZ = new THREE.Mesh(new THREE.BoxGeometry(tier.beamThick, tier.beamThick, tier.wZ), woodMat);
        girtZ.position.set(gx, tier.y, 0);
        girtZ.castShadow = true;
        this.shaftGroup.add(girtZ);
      });
    });

    // Flank "X" Bracing Timbers (Left & Right sides)
    [-1, 1].forEach((side) => {
      const sideX = side * 1.35;
      // Lower Tier X
      [-1, 1].forEach((dir) => {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.7, 0.18), woodMat);
        brace.position.set(sideX, this.surfaceY + 3.0, 0);
        brace.rotation.x = dir * 0.48;
        this.shaftGroup.add(brace);
      });
      // Upper Tier X
      [-1, 1].forEach((dir) => {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), woodMat);
        brace.position.set(sideX * 0.85, this.surfaceY + 4.8, 0);
        brace.rotation.x = dir * 0.46;
        this.shaftGroup.add(brace);
      });
    });

    // Top Crown Double Beams & Bearing Pillow Blocks
    const crownBeamGeo = new THREE.BoxGeometry(2.4, 0.38, 0.38);
    [-0.35, 0.35].forEach((cz) => {
      const crownBeam = new THREE.Mesh(crownBeamGeo, darkTimberMat);
      crownBeam.position.set(0, gallowsTopY, cz);
      crownBeam.castShadow = true;
      this.shaftGroup.add(crownBeam);
    });

    // Pillow block bearing housings
    [-0.85, 0.85].forEach((bx) => {
      const bearingBlock = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.95), ironMat);
      bearingBlock.position.set(bx, gallowsTopY + 0.28, 0);
      this.shaftGroup.add(bearingBlock);
    });

    // Weathered Pitched Canopy Roof over the Sheave Wheel
    const canopyRafterGeo = new THREE.BoxGeometry(0.14, 0.14, 2.6);
    [-0.9, 0, 0.9].forEach((rx) => {
      const rafter = new THREE.Mesh(canopyRafterGeo, woodMat);
      rafter.position.set(rx, gallowsTopY + 1.25, 0);
      this.shaftGroup.add(rafter);
    });

    const canopyRoofGeo = new THREE.BoxGeometry(2.6, 0.08, 1.4);
    [-1, 1].forEach((side) => {
      const roofSlope = new THREE.Mesh(canopyRoofGeo, rustTinMat);
      roofSlope.position.set(0, gallowsTopY + 1.35, side * 0.6);
      roofSlope.rotation.x = side * 0.26;
      roofSlope.castShadow = true;
      this.shaftGroup.add(roofSlope);
    });

    // Detailed Realistic Spoked Sheave Wheel (Hoist Pulley)
    const sheaveGroup = new THREE.Group();
    sheaveGroup.position.set(0, gallowsTopY + 0.28, 0);

    // Cast-iron outer grooved rim
    const rimRadius = 0.82;
    const sheaveRim = new THREE.Mesh(
      new THREE.TorusGeometry(rimRadius, 0.08, 12, 36),
      ironMat
    );
    sheaveRim.rotation.y = Math.PI / 2;
    sheaveGroup.add(sheaveRim);

    // Cable groove channel inner rim
    const innerRim = new THREE.Mesh(
      new THREE.TorusGeometry(rimRadius - 0.04, 0.05, 8, 36),
      ironMat
    );
    innerRim.rotation.y = Math.PI / 2;
    sheaveGroup.add(innerRim);

    // Center iron hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 16), ironMat);
    hub.rotation.z = Math.PI / 2;
    sheaveGroup.add(hub);

    // Axle shaft
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 12), ironMat);
    axle.rotation.z = Math.PI / 2;
    sheaveGroup.add(axle);

    // 10 Radial Forged Iron Spokes
    const spokeGeo = new THREE.CylinderGeometry(0.022, 0.022, rimRadius - 0.1, 8);
    for (let s = 0; s < 10; s++) {
      const angle = (s / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, ironMat);
      spoke.position.set(0, Math.sin(angle) * (rimRadius / 2), Math.cos(angle) * (rimRadius / 2));
      spoke.rotation.x = angle + Math.PI / 2;
      sheaveGroup.add(spoke);
    }

    this.shaftGroup.add(sheaveGroup);
    this.sheaveWheelGroup = sheaveGroup;

    // =========================================================================
    // 5. HOIST CABLES, HARDWARE & SUSPENDED MINING ORE BUCKET (KIBBLE)
    // =========================================================================
    // Cable 1: From rear winch drum up to sheave wheel top groove
    const winchDrumPos = new THREE.Vector3(0, this.surfaceY + 0.85, -3.8);
    const sheaveTopPos = new THREE.Vector3(0, gallowsTopY + 0.28 + rimRadius, -0.1);
    const rearCableLength = winchDrumPos.distanceTo(sheaveTopPos);
    const rearCable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, rearCableLength, 8),
      ironMat
    );
    rearCable.position.copy(winchDrumPos).lerp(sheaveTopPos, 0.5);
    rearCable.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      sheaveTopPos.clone().sub(winchDrumPos).normalize()
    );
    this.shaftGroup.add(rearCable);

    // Cable 2: Descending vertically from sheave front rim down into center of dark shaft
    const bucketY = this.surfaceY + 1.25;
    const vertCableLength = (gallowsTopY + 0.28 + rimRadius) - bucketY;
    const vertCable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, vertCableLength, 8),
      ironMat
    );
    vertCable.position.set(0, (gallowsTopY + 0.28 + rimRadius + bucketY) / 2, 0.4);
    this.shaftGroup.add(vertCable);

    // Forged Iron Shackle & Heavy Swivel Hoist Hook
    const hookGroup = new THREE.Group();
    hookGroup.position.set(0, bucketY + 0.7, 0.4);

    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 16), ironMat);
    hookGroup.add(shackle);

    const swivelHook = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI * 1.3),
      ironMat
    );
    swivelHook.position.set(0, -0.15, 0);
    swivelHook.rotation.z = Math.PI / 2;
    hookGroup.add(swivelHook);
    this.shaftGroup.add(hookGroup);

    // Suspended Heavy Mining Ore Bucket (Kibble / Iron-banded tub)
    const bucketGroup = new THREE.Group();
    bucketGroup.position.set(0, bucketY, 0.4);

    // Timber Bucket Body with taper
    const bucketBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.36, 0.72, 12),
      woodMat
    );
    bucketBody.castShadow = true;
    bucketGroup.add(bucketBody);

    // Riveted Iron Reinforcement Hoops
    [-0.28, 0, 0.28].forEach((hy) => {
      const hoop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.465 - (0.28 - hy) * 0.12, 0.465 - (0.28 - hy) * 0.12, 0.05, 12),
        ironMat
      );
      hoop.position.set(0, hy, 0);
      bucketGroup.add(hoop);
    });

    // Curved Iron Bail Handle
    const bail = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.03, 8, 16, Math.PI),
      ironMat
    );
    bail.position.set(0, 0.36, 0);
    bucketGroup.add(bail);

    // 3 Forged Suspension Chains linking bail to the hoist hook
    [-0.38, 0.38].forEach((cx) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), ironMat);
      chain.position.set(cx * 0.5, 0.56, 0);
      chain.rotation.z = (cx < 0 ? 0.32 : -0.32);
      bucketGroup.add(chain);
    });

    // Sparkling Gold-Bearing Quartz Float Chunks inside the bucket
    for (let r = 0; r < 7; r++) {
      const a = (r / 7) * Math.PI * 2;
      const rockRadius = 0.12 + (r % 3) * 0.04;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rockRadius, 0),
        r % 2 === 0 ? goldOreMat : quartzMat
      );
      rock.position.set(Math.cos(a) * 0.22, 0.28 + (r % 2) * 0.05, Math.sin(a) * 0.22);
      rock.rotation.set(r * 0.5, r * 0.7, 0);
      bucketGroup.add(rock);
    }
    this.shaftGroup.add(bucketGroup);

    // =========================================================================
    // 6. SURFACE WINCH DRUM & OPERATOR HOIST ENGINE STATION
    // =========================================================================
    const winchGroup = new THREE.Group();
    winchGroup.position.set(0, this.surfaceY + 0.2, -3.8);

    // Heavy Timber Skid Sills
    [-0.75, 0.75].forEach((wx) => {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 2.2), darkTimberMat);
      skid.position.set(wx, 0.17, 0);
      winchGroup.add(skid);

      // Bearing pedestals
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.35), ironMat);
      pedestal.position.set(wx, 0.65, 0);
      winchGroup.add(pedestal);
    });

    // Cast-iron Winch Cable Drum with steel wire cable coils
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.25, 16), ironMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.75, 0);
    winchGroup.add(drum);

    // Cable Coil Wraps around the drum
    const coil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.95, 16),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.4 })
    );
    coil.rotation.z = Math.PI / 2;
    coil.position.set(0, 0.75, 0);
    winchGroup.add(coil);

    // Drum Flange Rims
    [-0.62, 0.62].forEach((fx) => {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 16), ironMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.set(fx, 0.75, 0);
      winchGroup.add(flange);
    });

    // Large Spoked Brake Gear Wheel on operator side
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 20), ironMat);
    gear.rotation.z = Math.PI / 2;
    gear.position.set(0.72, 0.75, 0);
    winchGroup.add(gear);

    // Long Iron Friction Brake Lever with Wood Grip
    const brakeLever = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.2, 8), ironMat);
    brakeLever.position.set(0.85, 1.15, -0.2);
    brakeLever.rotation.x = 0.35;
    winchGroup.add(brakeLever);

    const brakeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.28, 8), woodMat);
    brakeHandle.position.set(0.85, 1.65, -0.38);
    brakeHandle.rotation.x = 0.35;
    winchGroup.add(brakeHandle);

    // Hand Crank Windlass Handle on opposite side
    const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), ironMat);
    crankArm.position.set(-0.78, 0.92, 0);
    winchGroup.add(crankArm);

    const crankHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 8), woodMat);
    crankHandle.rotation.z = Math.PI / 2;
    crankHandle.position.set(-0.9, 1.12, 0);
    winchGroup.add(crankHandle);

    this.shaftGroup.add(winchGroup);

    // =========================================================================
    // 7. UNDERGROUND VOLUMETRIC SUNBEAM ILLUMINATION (OPEN SKY SHAFT)
    // =========================================================================
    // Looking up from underground directly reveals the open surface collar and real 3D sky above.
    // Volumetric Sun Shaft / Sunlight Beam (top clamped strictly below surface collar)
    const beamTopY = this.surfaceY - 0.6;
    const beamHeight = beamTopY - deepestFloorY;
    const sunbeamGeo = new THREE.CylinderGeometry(0.8, 1.4, Math.max(2, beamHeight), 24, 1, true);
    const sunbeamMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sunbeam = new THREE.Mesh(sunbeamGeo, sunbeamMat);
    sunbeam.position.set(0, (beamTopY + deepestFloorY) / 2, 0);
    sunbeam.name = 'shaft_sunbeam';
    sunbeam.visible = this.currentLevel > 0;
    this.shaftGroup.add(sunbeam);
    this.sunbeamMesh = sunbeam;

    // Floating Sunbeam Dust Motes inside the light column
    const beamMoteCount = 100;
    const beamMoteGeo = new THREE.BufferGeometry();
    const beamMotePositions = new Float32Array(beamMoteCount * 3);
    for (let i = 0; i < beamMoteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.25;
      beamMotePositions[i * 3] = Math.cos(a) * r;
      beamMotePositions[i * 3 + 1] = deepestFloorY + 0.5 + Math.random() * Math.max(1, beamHeight - 1.0);
      beamMotePositions[i * 3 + 2] = Math.sin(a) * r;
    }
    beamMoteGeo.setAttribute('position', new THREE.BufferAttribute(beamMotePositions, 3));
    const beamMoteMat = new THREE.PointsMaterial({
      color: 0xfffae0,
      size: 0.12,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamMotes = new THREE.Points(beamMoteGeo, beamMoteMat);
    beamMotes.visible = this.currentLevel > 0;
    this.shaftGroup.add(beamMotes);
    this.sunbeamDustPoints = beamMotes;
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

  // Check if player is directly aligned and close to the shaft ladder on the North wall
  public isNearShaftLadder(pos: Vector3D, horizontalTolerance = 1.45): boolean {
    const ladderX = this.surfacePos.x;
    const ladderZ = this.surfacePos.z - 1.45;
    const dx = pos.x - ladderX;
    const dz = pos.z - ladderZ;
    const horizDist = Math.hypot(dx, dz);
    if (horizDist > horizontalTolerance) return false;

    const deepestLayer = this.layers.find((l) => l.level === this.maxUnlockedLevel) || this.layers[0];
    const minY = this.surfaceY - deepestLayer.depthMeters - 1.5;
    const maxY = this.surfaceY + 2.5;
    return pos.y >= minY && pos.y <= maxY;
  }

  // Retrieve exact world coordinates of the vertical mine shaft ladder
  public getShaftLadderPosition(): { x: number; z: number; surfaceY: number; topY: number; bottomY: number } {
    const deepestLayer = this.layers.find((l) => l.level === this.maxUnlockedLevel) || this.layers[0];
    return {
      x: this.surfacePos.x,
      z: this.surfacePos.z - 1.45,
      surfaceY: this.surfaceY,
      topY: this.surfaceY + 1.25,
      bottomY: this.surfaceY - deepestLayer.depthMeters,
    };
  }

  // Determine which stratum layer level corresponds to a given vertical elevation Y
  public getLevelAtY(y: number): number {
    if (y >= this.surfaceY - 0.5) return 0;

    // Filter to only unlocked layers and sort ascending by level (1, 2, ...)
    const unlockedLayers = this.layers
      .filter((l) => l.level <= this.maxUnlockedLevel)
      .sort((a, b) => a.level - b.level);

    if (unlockedLayers.length === 0) return 0;

    for (let i = 0; i < unlockedLayers.length; i++) {
      const layer = unlockedLayers[i];
      const floorY = this.surfaceY - layer.depthMeters;
      const nextLayer = unlockedLayers[i + 1];

      // If there is a deeper unlocked layer, transition halfway between the two floors
      if (nextLayer) {
        const nextFloorY = this.surfaceY - nextLayer.depthMeters;
        const transitionY = (floorY + nextFloorY) / 2;
        if (y >= transitionY) {
          return layer.level;
        }
      } else {
        // Deepest unlocked layer contains everything down to its floor and pit
        return layer.level;
      }
    }

    return unlockedLayers[unlockedLayers.length - 1].level;
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
    maxDistance = 7.5
  ): {
    hit: boolean;
    point?: THREE.Vector3;
    normal?: THREE.Vector3;
    mesh?: THREE.Mesh;
    distance?: number;
    existingHole?: MountainHole;
    isCeiling?: boolean;
    isSideWall?: boolean;
    isBackFace?: boolean;
  } {
    if (this.currentLevel === 0) return { hit: false };

    // 1. First test existing excavated holes in the cavern
    if (this.holeManager) {
      const holeHit = this.holeManager.raycastMountainHoles(raycaster, maxDistance);
      if (holeHit.hit && holeHit.hole && holeHit.point) {
        return {
          hit: true,
          point: holeHit.point,
          normal: holeHit.strikeNormal ? holeHit.strikeNormal.clone() : holeHit.hole.normal.clone(),
          distance: holeHit.distance,
          existingHole: holeHit.hole,
          isCeiling: holeHit.isCeiling,
          isSideWall: holeHit.isSideWall,
          isBackFace: holeHit.isBackFace,
        };
      }
    }

    // 2. Test intersection with cavern perimeter wall or roof meshes
    if (this.cavernWallMeshes.length > 0) {
      const hits = raycaster.intersectObjects(this.cavernWallMeshes, false);
      if (hits.length > 0 && hits[0].distance <= maxDistance) {
        const hit = hits[0];
        const isRoofMesh = (hit.object.name && hit.object.name.startsWith('cavern_roof')) || raycaster.ray.direction.y > 0.45;

        if (isRoofMesh) {
          // Overhead ceiling strike: normal points straight down into cavern
          return {
            hit: true,
            point: hit.point,
            normal: new THREE.Vector3(0, -1, 0),
            mesh: hit.object as THREE.Mesh,
            distance: hit.distance,
            isCeiling: true,
          };
        }

        // Calculate inward normal from wall face pointing into cavern toward shaft center (never into the rock)
        const toShaft = new THREE.Vector3(
          this.surfacePos.x - hit.point.x,
          0,
          this.surfacePos.z - hit.point.z
        ).normalize();
        toShaft.y = 0.05;
        toShaft.normalize();

        return {
          hit: true,
          point: hit.point,
          normal: toShaft,
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
    customNormal?: THREE.Vector3,
    existingHoleTarget?: MountainHole
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

    // Calculate normal vector pointing strictly inward from the wall face into the cavern towards shaft
    const toShaft = new THREE.Vector3(
      this.surfacePos.x - hitPoint.x,
      0,
      this.surfacePos.z - hitPoint.z
    ).normalize();
    toShaft.y = 0.05;
    toShaft.normalize();

    let wallNormal = customNormal?.clone();
    if (!wallNormal || wallNormal.lengthSq() < 0.01) {
      wallNormal = toShaft.clone();
    }

    // Procedural volumetric hole excavation inside the mine!
    let createdHole: MountainHole | undefined;
    let holeDepth = 0.42;
    let holeResult: { goldAwarded: number; message: string } | null = null;

    if (this.holeManager) {
      const digTargetColor = wallColorHex;
      const digTargetType = particleMatType;

      const digRes = this.holeManager.digMountainHole(
        hitPoint,
        wallNormal,
        digTargetColor,
        digTargetType,
        tool,
        false
      );
      createdHole = digRes.hole;
      holeDepth = digRes.depthReached;
      holeResult = {
        goldAwarded: digRes.goldAwarded,
        message: digRes.message,
      };
      this.updateCavernWallHoleCutouts();
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

    let message = holeResult?.message || `⛏️ Chiseled ${compassLabel} Cavern Wall (-${holeDepth.toFixed(1)}m): Solid ${rockType} host rock.`;
    if (struckVein && oreYield > 0 && !holeResult?.goldAwarded) {
      message = `🪙 Struck Hydrothermal Quartz Vein in Cavern Wall at ${compassLabel} (-${holeDepth.toFixed(1)}m)! Yielded +${oreYield} oz ${oreType}!`;
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
  public update(delta: number, now: number, timeOfDay?: number, weather?: string) {
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

    // 6. Dynamic open sky portal & volumetric sunbeam illumination
    // Sky portal and sunbeam are ONLY visible when looking up from underground (currentLevel > 0)
    const isUnderground = this.currentLevel > 0;
    if (this.skyPortalMesh) {
      this.skyPortalMesh.visible = isUnderground;
    }
    if (this.sunbeamMesh) {
      this.sunbeamMesh.visible = isUnderground;
    }
    if (this.sunbeamDustPoints) {
      this.sunbeamDustPoints.visible = isUnderground;
    }

    // Continuously spin the large cast-iron sheave wheel on the headframe crown
    if (this.sheaveWheelGroup) {
      this.sheaveWheelGroup.rotation.x += delta * 0.45;
    }

    if (this.sunbeamMesh && timeOfDay !== undefined) {
      let skyMode: 'day' | 'sunset' | 'night' = 'day';
      let beamColor = 0xfffae0;
      let beamOpacity = 0.26;

      if (timeOfDay >= 19.5 || timeOfDay < 5.0) {
        skyMode = 'night';
        beamColor = 0x5070a8;
        beamOpacity = 0.12;
      } else if ((timeOfDay >= 5.0 && timeOfDay < 6.5) || (timeOfDay >= 17.5 && timeOfDay < 19.5)) {
        skyMode = 'sunset';
        beamColor = 0xff9c42;
        beamOpacity = 0.28;
      }

      if (weather === 'storm' || weather === 'light_rain') {
        beamOpacity *= 0.6;
        beamColor = 0x8fa4b8;
      }

      if (this.skyPortalMesh) {
        const portalMat = this.skyPortalMesh.material as THREE.MeshBasicMaterial;
        if (portalMat) {
          if (skyMode === 'night' && this.skyTexNight) portalMat.map = this.skyTexNight;
          else if (skyMode === 'sunset' && this.skyTexSunset) portalMat.map = this.skyTexSunset;
          else if (this.skyTexDay) portalMat.map = this.skyTexDay;
          portalMat.needsUpdate = true;
        }
      }

      const sunbeamMat = this.sunbeamMesh.material as THREE.MeshBasicMaterial;
      if (sunbeamMat) {
        sunbeamMat.color.setHex(beamColor);
        sunbeamMat.opacity = beamOpacity;
      }
    }

    // 7. Sunbeam dust motes drifting along the vertical daylight column
    if (this.sunbeamDustPoints) {
      const posAttr = this.sunbeamDustPoints.geometry.attributes.position;
      if (posAttr) {
        const deepestLayer = this.layers.find((l) => l.level === this.maxUnlockedLevel) || this.layers[0];
        const minY = this.surfaceY - deepestLayer.depthMeters + 0.5;
        const maxY = this.surfaceY + 0.2;
        for (let i = 0; i < posAttr.count; i++) {
          let y = posAttr.getY(i) + Math.sin(now * 0.0012 + i * 0.4) * delta * 0.25;
          let x = posAttr.getX(i) + Math.cos(now * 0.0009 + i * 0.2) * delta * 0.08;
          let z = posAttr.getZ(i) + Math.sin(now * 0.0007 + i * 0.3) * delta * 0.08;
          if (y < minY) y = maxY - 0.2;
          if (y > maxY) y = minY + 0.2;
          posAttr.setXYZ(i, x, y, z);
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  public dispose() {
    this.voxelEngine.dispose();
    this.scene.remove(this.mainGroup);
    this.mainGroup.clear();
  }
}
