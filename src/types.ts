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
  id?: string;
  isClaimed: boolean;
  name: string;
  position: Vector3D;
  size: number;
  extractedGold: number;
  blocksDug: number;
  ownerId?: string;
  ownerName?: string;
  stakedAt?: number;
  isWildcatOrigin?: boolean;
  forSale?: boolean;
  priceDollars?: number;
  priceGoldOunces?: number;
  description?: string;
  listedAt?: number;
  lastTransferPrice?: number;
  lastTransferAt?: number;
  previousOwnerName?: string;
}

export interface TerritoryClaim {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  x: number;
  z: number;
  radius: number;
  stakedAt: number;
  extractedGold: number;
  blocksDug: number;
  isWildcatOrigin?: boolean;
  forSale?: boolean;
  priceDollars?: number;
  priceGoldOunces?: number;
  description?: string;
  listedAt?: number;
  lastTransferPrice?: number;
  lastTransferAt?: number;
  previousOwnerName?: string;
}

export interface ClaimTradeOffer {
  id: string;
  claimId: string;
  claimName: string;
  targetOwnerId: string;
  buyerId: string;
  buyerName: string;
  cashOffered: number;
  goldOffered: number;
  offeredClaimId?: string;
  offeredClaimName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: number;
}

export interface ClaimInfringement {
  id: string;
  claimId: string;
  claimName: string;
  claimOwnerId: string;
  claimOwnerName: string;
  jumperId: string;
  jumperName: string;
  action: 'wildcat_shaft' | 'claim_jump_ore' | 'boundary_dig';
  x: number;
  y: number;
  z: number;
  timestamp: number;
  resolved?: boolean;
}

export type PardnerStatus = 'none' | 'pending_sent' | 'pending_received' | 'pardner';

export interface Friendship {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  updatedAt?: number;
}

export interface MiningOreDrop {
  id: string;
  position: Vector3D;
  type: 'gold_nugget' | 'quartz_gold' | 'silver_chunk' | 'dynamite';
  value: number; // gold ounces or dynamite count
  rotation: number;
  autoRedeemed?: boolean;
}

export interface DesertAnimal {
  id: string;
  type: 'rabbit' | 'snake' | 'scorpion' | 'bighorn' | 'vulture' | 'mule_deer' | 'whitetail_deer';
  position: Vector3D;
  targetPos: Vector3D;
  rotation: number;
  speed: number;
  stateTimer: number;
  fleeing: boolean;
  health?: number;
  maxHealth?: number;
  isHostile?: boolean;
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
  gnisName?: string;
  shortDesc: string;
  position: Vector3D;
  radius: number;
  clueId?: string;
  discovered: boolean;
  type: 'camp' | 'needle' | 'ruins' | 'spring' | 'petroglyph' | 'massacre' | 'mine' | 'town' | 'mountain' | 'canyon' | 'mesa' | 'spire';
  elevationFt?: number;
  geology?: string;
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
  | 'deep_shaft'
  | 'campfire'
  | 'prospector_camp'
  | 'frontier_torch'
  | 'rifle_barrier';

export interface BuiltStructure {
  id: string;
  type: MineStructureType;
  name: string;
  position: Vector3D;
  rotationY: number;
  level: number;
  createdAt: number;
  lastUsedAt?: number;
  fuelHoursRemaining?: number; // In game hours (e.g. 12-16 hrs max per day/night without stoking)
  maxFuelHours?: number;
  isLit?: boolean;
  condition?: number; // 0 (ruined/sabotaged) to 100 (pristine)
  sabotaged?: boolean;
  sabotageType?: 'burned' | 'collapsed' | 'dismantled';
  sabotagedAt?: number;
  concealed?: boolean; // Camouflaged with desert brush and stones (Jacob Waltz technique)
  concealmentQuality?: number; // 0 to 100
}

export interface StructureBlueprint {
  type: MineStructureType;
  name: string;
  description: string;
  goldCost: number;
  rockCost: number;
  woodCost?: number;
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
    | 'hands'
    | 'compass'
    | 'lantern'
    | 'shovel'
    | 'pickaxe'
    | 'axe'
    | 'rifle'
    | 'dynamite'
    | 'detector'
    | 'binoculars'
    | 'stake'
    | 'builder';
  carriedObject?: {
    type: 'rock' | 'gold_ore';
    name: string;
    weightLbs: number;
    color: number;
    scale: number;
  } | null;
  ammo: number;
  dynamite: number;
  goldFound: number; // ounces
  cashDollars?: number; // 1880s Gold Standard cash ($20.67/oz)
  autoRedeemGold?: boolean; // When true, auto-redeems dug gold into bank cash
  woodPlanks?: number; // Timber planks for wooden shoring in sand & mine framing
  blocksDug: number;
  bullionBars?: number; // smelted bars
  builtStructures?: BuiltStructure[];
  activeClaim: ClaimInfo | null;
  isWildcatter?: boolean;
  portalExcavation?: PortalExcavationState;
  discoveredLandmarks: string[];
  collectedClues: string[];
  // Subterranean Mine Layers
  currentMineLevel?: number; // 0 for surface, 1+ for underground layers
  maxUnlockedMineLevel?: number; // 1+
  activeShaftState?: ActiveMineShaftState | null;
  // Underwater & Flooding Physics
  oxygen?: number; // 0 to 100 (depletes when submerged)
  isSwimming?: boolean;
  cornishPumpActive?: boolean;
  excavatedRoomsCount?: number;
  canteenOunces?: number; // 0 to 32 oz for desert hydration
  // Wild Game Provisions & Hunting Harvests
  provisionsRations?: number; // General trail jerky rations
  venisonMeat?: number; // Harvested Sonoran Mule Deer & Coues Whitetail Venison
  rabbitMeat?: number; // Harvested Desert Jackrabbit Meat
  bighornMutton?: number; // Harvested Desert Bighorn Mountain Mutton
  // Pack Animal & Mount Companion (Burro / Mountain Pony)
  ownedMount?: 'burro' | 'pony' | null;
  mountName?: string;
  isRidingMount?: boolean;
  mountCarrying?: {
    goldOunces?: number;
    rocks?: number;
    waterOz?: number;
    woodPlanks?: number;
  };
  worldScaleMode?: '1:1' | 'compact'; // '1:1' authentic USGS Quadrangle scale vs 'compact' frontier scale
}

export type GraphicsQuality = 'performance' | 'balanced' | 'high';

export type RoomDirection = 'north' | 'south' | 'east' | 'west' | 'crosscut';

export interface ExcavatedRoom {
  id: string;
  level: number;
  direction: RoomDirection;
  name: string;
  depthMeters: number;
  driftLengthMeters?: number;
  excavationProgress: number; // 0 to 100%
  hitsNeeded: number;
  currentHits: number;
  isComplete: boolean;
  isTimbered: boolean;
  oreVeinType: string;
  oreYieldOunces: number;
  waterLevel: number; // meters above floor
  createdAt: number;
}

export interface WaterTableState {
  waterTableDepth: number; // meters (e.g. 88.0m)
  waterLevelInLevel: Record<number, number>; // level -> water height in meters
  isFlooding: boolean;
  floodRate: number; // meters per second
  pumpActive: boolean;
  pumpRate: number; // meters per second reduction
  aquiferBreached: boolean;
  seepageWarning: boolean;
}

export interface MineLayerData {
  level: number; // 1 to 7+
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
  // Watertable & Hydrological Simulation
  isWaterBearing?: boolean;
  waterLevel?: number; // meters of water on the floor (0 = dry, >0 = flooded)
  isFlooding?: boolean;
  maxFloodHeight?: number; // max water height before filling room
  aquiferPressure?: number; // 0 - 100%
  excavatedRooms?: ExcavatedRoom[];
}

export interface ActiveMineShaftState {
  id: string;
  surfacePos: Vector3D;
  currentLevel: number; // 0 = surface, 1+ = layers
  maxUnlockedLevel: number;
  layers: MineLayerData[];
  shaftExcavationHits: Record<number, number>; // hits toward next level per level
  waterTable: WaterTableState;
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

export type WeatherType = 'clear' | 'clouds' | 'sunset' | 'storm' | 'night' | 'sandstorm' | 'light_rain';

export interface GameSettings {
  timeOfDay: number; // 0 to 24 (hours)
  autoCycleTime: boolean;
  soundEnabled: boolean;
  viewMode: 'first' | 'third';
  weather: WeatherType;
}

export interface GameOverDetails {
  reason: 'cave_in' | 'dehydration' | 'bandit' | 'dynamite' | 'drowning' | 'venom' | 'apache_raid';
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

export interface MultiplayerPlayer {
  id: string;
  name: string;
  outfitColor: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  action: string;
  activeTool: string;
  goldFound: number;
  rocksGathered: number;
  health: number;
  ping: number;
  lastUpdate: number;
  distanceToLocal?: number;
}

export interface MultiplayerChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  type: 'chat' | 'system' | 'shout' | 'discovery';
  timestamp: number;
}

export interface MultiplayerColorPreset {
  name: string;
  hex: string;
}

export interface MultiplayerState {
  connected: boolean;
  selfId: string | null;
  selfName: string;
  selfColor: string;
  ping: number;
  players: Record<string, MultiplayerPlayer>;
  chatMessages: MultiplayerChatMessage[];
  recentEventBanner: {
    id: string;
    text: string;
    type: 'joined' | 'discovery' | 'shored' | 'blasted';
  } | null;
}

export type TortillaFlatTab = 'mercantile' | 'assayer' | 'saloon' | 'hotel' | 'stagecoach' | 'livery';

