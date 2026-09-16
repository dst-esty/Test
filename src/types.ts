export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type VoxelType = 'sandstone' | 'granite' | 'quartz_gold' | 'silver_ore' | 'calcite' | 'dirt';
export type DebrisType = VoxelType | 'cactus' | 'wood' | 'quartz';

export interface VoxelCell {
  x: number;
  y: number;
  z: number;
  type: VoxelType;
  health: number; // 0 = destroyed
}

export interface ClaimInfo {
  isClaimed: boolean;
  name: string;
  position: Vector3D;
  size: number;
  extractedGold: number;
  blocksDug: number;
}

export interface MiningOreDrop {
  id: string;
  position: Vector3D;
  type: 'gold_nugget' | 'quartz_gold' | 'silver_chunk' | 'dynamite';
  value: number; // gold ounces or dynamite count
  rotation: number;
}

export interface DesertAnimal {
  id: string;
  type: 'rabbit' | 'snake' | 'bighorn' | 'vulture';
  position: Vector3D;
  targetPos: Vector3D;
  rotation: number;
  speed: number;
  stateTimer: number;
  fleeing: boolean;
}

export interface EnemyBandit {
  id: string;
  name: string;
  position: Vector3D;
  health: number;
  maxHealth: number;
  state: 'patrol' | 'alert' | 'aiming' | 'dead';
  alertTimer: number;
  shootCooldown: number;
  patrolCenter: Vector3D;
  patrolAngle: number;
}

export interface BulletTracer {
  id: string;
  start: Vector3D;
  end: Vector3D;
  progress: number; // 0 to 1
  isEnemy: boolean;
}

export interface DynamiteEntity {
  id: string;
  position: Vector3D;
  velocity: Vector3D;
  fuseTimer: number; // seconds left
}

export interface Landmark {
  id: string;
  name: string;
  shortDesc: string;
  position: Vector3D;
  radius: number;
  clueId?: string;
  discovered: boolean;
  type: 'camp' | 'needle' | 'ruins' | 'spring' | 'petroglyph' | 'massacre' | 'mine';
}

export interface ClueItem {
  id: string;
  title: string;
  lore: string;
  hint: string;
  discovered: boolean;
  landmarkId: string;
  iconName: string;
  foundAt?: string;
}

export type MineStructureType =
  | 'timber_portal'
  | 'headframe_hoist'
  | 'sluice_box'
  | 'rail_track'
  | 'assay_forge'
  | 'deep_shaft';

export interface BuiltStructure {
  id: string;
  type: MineStructureType;
  name: string;
  position: Vector3D;
  rotationY: number;
  level: number;
  createdAt: number;
  lastUsedAt?: number;
}

export interface StructureBlueprint {
  type: MineStructureType;
  name: string;
  description: string;
  goldCost: number;
  rockCost: number;
  dimensions: { width: number; height: number; depth: number };
  benefit: string;
}

export interface PlayerState {
  position: Vector3D;
  rotation: { yaw: number; pitch: number };
  health: number; // 0 - 100
  maxHealth: number;
  hydration: number; // 0 - 100
  isSprinting: boolean;
  isInsideMine: boolean;
  equippedTool:
    | 'compass'
    | 'lantern'
    | 'shovel'
    | 'pickaxe'
    | 'rifle'
    | 'dynamite'
    | 'detector'
    | 'binoculars'
    | 'stake'
    | 'builder';
  ammo: number;
  dynamite: number;
  goldFound: number; // ounces
  blocksDug: number;
  bullionBars?: number; // smelted bars
  builtStructures?: BuiltStructure[];
  activeClaim: ClaimInfo | null;
  portalExcavation?: PortalExcavationState;
  discoveredLandmarks: string[];
  collectedClues: string[];
  // Subterranean Mine Layers
  currentMineLevel?: number; // 0 for surface, 1 to 4 for underground layers
  maxUnlockedMineLevel?: number; // 1 to 4
  activeShaftState?: ActiveMineShaftState | null;
}

export interface MineLayerData {
  level: number; // 1 to 4
  id: string;
  name: string;
  depthMeters: number;
  strata: string;
  description: string;
  unlocked: boolean;
  digProgress: number; // 0 to 100%
  hitsNeeded: number;
  currentHits: number;
  primaryMineral: string;
  secondaryMineral: string;
  accentColor: string;
}

export interface ActiveMineShaftState {
  id: string;
  surfacePos: Vector3D;
  currentLevel: number; // 0 = surface, 1-4 = layers
  maxUnlockedLevel: number;
  layers: MineLayerData[];
  shaftExcavationHits: Record<number, number>; // hits toward next level per level
}

export interface PortalExcavationState {
  active: boolean;
  position: Vector3D;
  rotationY: number;
  progress: number; // 0 to 100%
  stability: number; // 0 to 100% (decreases as bedrock is excavated without shoring)
  rocksNeeded: number;
  goldNeeded: number;
  isReinforced: boolean;
  lastGroanTime: number;
}

export type WeatherType = 'clear' | 'clouds' | 'sunset' | 'storm' | 'night';

export interface GameSettings {
  timeOfDay: number; // 0 to 24 (hours)
  autoCycleTime: boolean;
  soundEnabled: boolean;
  viewMode: 'first' | 'third';
  weather: WeatherType;
}

export interface GameOverDetails {
  reason: 'cave_in' | 'dehydration' | 'bandit' | 'dynamite';
  title: string;
  subtitle: string;
  cause: string;
  depth?: number;
  strata?: string;
  goldFound: number;
  blocksDug: number;
  landmarksDiscovered: number;
  timeSurvivedSeconds: number;
  coordinates: { x: number; y: number; z: number };
}

