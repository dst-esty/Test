import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  createTerrainMesh,
  getTerrainHeight,
  digHoleInTerrain,
  getNearbyDugHole,
  shoreExcavationPit,
  resetAllDugHoles,
  getGeologicalLayerAtDepth,
  DugHole,
  activeDugHoles,
  createTrenchShoringMesh,
  syncRemoteDugHole,
} from '../world/terrain';
import { createDesertFoliage, GoldDeposit, DesertFoliageManager } from '../world/foliage';
import { createLandmarkStructures } from '../world/landmarks';
import { MiningSystem } from '../world/mining';
import { WildlifeManager } from '../world/wildlife';
import { CombatManager } from '../world/combat';
import { AtmosphereManager } from '../world/atmosphere';
import { MineBuildingSystem, STRUCTURE_BLUEPRINTS } from '../world/mineBuilding';
import { soundEngine } from '../audio/soundEffects';
import {
  ClaimInfo,
  ClueItem,
  Landmark,
  MineStructureType,
  PlayerState,
  Vector3D,
  WeatherType,
  MineLayerData,
  GameOverDetails,
  RoomDirection,
  WaterTableState,
  TerritoryClaim,
  GraphicsQuality,
} from '../types';
import { territoryClaims } from '../services/territoryClaimService';
import { generateNoiseTexture, createGoldVeinVoxelMaterials, VoxelShaderUniforms } from '../world/voxelGoldShader';
import { UndergroundLayersManager } from '../world/undergroundLayers';
import { MovableRockManager } from '../world/movableRocks';
import { ShaftSinkingStats } from '../world/undergroundVoxels';
import { RemoteProspector } from '../world/remoteProspector';
import { multiplayer } from '../multiplayer/multiplayerService';
import { isMobileDevice } from '../utils/device';
import { DesertHydrologyEngine } from '../world/hydrology';
import { resolveKinematicMovement } from '../physics/collisionEngine';
import { MountainDustParticleSystem } from '../world/mountainDustParticles';
import { friendshipService } from '../services/friendshipService';

interface WorldCanvasProps {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  landmarks: Landmark[];
  clues: ClueItem[];
  timeOfDay: number;
  weather: WeatherType;
  viewMode: 'first' | 'third';
  onPromptInteract: (prompt: string, action: () => void) => void;
  onClearPrompt: () => void;
  onDiscoverClue: (clueId: string, landmarkId: string) => void;
  onMineDeposit: (depositId: string, ounces: number) => void;
  onRefillWater: () => void;
  onEnterMine: () => void;
  onTriggerHitMarker?: () => void;
  onTriggerDamageFlash?: () => void;
  onShowBanner?: (msg: string) => void;
  onRegisterDigHandler?: (fn: () => void) => void;
  isUIOpen?: boolean;
  isGameOver?: boolean;
  onPlayerDeath?: (details: GameOverDetails) => void;
  onRegisterRestartHandler?: (fn: () => void) => void;
  onStakeClaim?: (name: string, pos: Vector3D) => void;
  onPayDirtHit?: (ounces: number) => void;
  onBuildStructure?: (type: MineStructureType, pos: Vector3D, rotationY: number) => void;
  onOpenDeedModal?: (claim: ClaimInfo) => void;
  onOpenBuilder?: () => void;
  onOpenCamp?: () => void;
  activeBuildingType?: MineStructureType;
  onRegisterReinforceHandler?: (fn: () => void) => void;
  onRegisterExcavateHandler?: (fn: () => void) => void;
  onRegisterShaftTraverseHandler?: (fn: (level: number) => void) => void;
  onRegisterShaftExitHandler?: (fn: () => void) => void;
  onRegisterShaftDigHandler?: (fn: () => void) => void;
  onRegisterExcavateRoomHandler?: (fn: (dir: RoomDirection) => void) => void;
  onRegisterTimberRoomHandler?: (fn: (dir: RoomDirection) => void) => void;
  onRegisterTogglePumpHandler?: (fn: () => void) => void;
  onUpdateWaterTable?: (waterTable: WaterTableState) => void;
  onUpdateOxygen?: (oxygenPercent: number, isSubmerged: boolean) => void;
  onUpdateShaftLayers?: (layers: MineLayerData[]) => void;
  onUpdateShaftLevel?: (level: number, maxLevel: number) => void;
  onNearbyTrenchChange?: (
    trench: {
      depth: number;
      stability: number;
      isShored: boolean;
      shoredUntilDepth?: number;
      rocksNeeded: number;
      woodNeeded?: number;
      strataName?: string;
      strataId?: string;
      materialType?: 'wood' | 'stone' | 'timber_rock' | 'none';
      strataAdvice?: string;
      canShore: boolean;
    } | null
  ) => void;
  onRegisterShoreHandler?: (fn: () => void) => void;
  trackedPlayerPos?: Vector3D | null;
  onUpdateShaftSinkingStats?: (stats: ShaftSinkingStats | null) => void;
  onRegisterStrikeVoxelHandler?: (fn: () => void) => void;
  onRegisterPlaceTimberHandler?: (fn: () => void) => void;
  onOpenTortillaFlat?: () => void;
  onRegisterMobileActionHandler?: (fn: () => void) => void;
  onRegisterMobileJumpHandler?: (fn: () => void) => void;
  onRegisterMobileInteractHandler?: (fn: () => void) => void;
  onRegisterMobileMoveHandler?: (fn: (move: { forward: number; right: number }) => void) => void;
  graphicsQuality?: GraphicsQuality;
  onFpsUpdate?: (fps: number) => void;
}

const getTargetPixelRatio = (quality: GraphicsQuality) => {
  const isMobile = isMobileDevice();
  const rawDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  if (quality === 'performance') {
    return Math.min(rawDpr, isMobile ? 0.92 : 1.05);
  } else if (quality === 'balanced') {
    return Math.min(rawDpr, isMobile ? 1.0 : 1.35);
  } else {
    return Math.min(rawDpr, 1.8);
  }
};

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  playerState,
  setPlayerState,
  landmarks,
  clues,
  timeOfDay,
  weather,
  viewMode,
  onPromptInteract,
  onClearPrompt,
  onDiscoverClue,
  onMineDeposit,
  onRefillWater,
  onEnterMine,
  onTriggerHitMarker,
  onTriggerDamageFlash,
  onShowBanner,
  onRegisterDigHandler,
  isUIOpen = false,
  isGameOver = false,
  onPlayerDeath,
  onRegisterRestartHandler,
  onStakeClaim,
  onPayDirtHit,
  onBuildStructure,
  onOpenDeedModal,
  onOpenBuilder,
  onOpenCamp,
  activeBuildingType = 'timber_portal',
  onRegisterReinforceHandler,
  onRegisterExcavateHandler,
  onRegisterShaftTraverseHandler,
  onRegisterShaftExitHandler,
  onRegisterShaftDigHandler,
  onRegisterExcavateRoomHandler,
  onRegisterTimberRoomHandler,
  onRegisterTogglePumpHandler,
  onUpdateWaterTable,
  onUpdateOxygen,
  onUpdateShaftLayers,
  onUpdateShaftLevel,
  onNearbyTrenchChange,
  onRegisterShoreHandler,
  trackedPlayerPos,
  onUpdateShaftSinkingStats,
  onRegisterStrikeVoxelHandler,
  onRegisterPlaceTimberHandler,
  onOpenTortillaFlat,
  onRegisterMobileActionHandler,
  onRegisterMobileJumpHandler,
  onRegisterMobileInteractHandler,
  onRegisterMobileMoveHandler,
  graphicsQuality = 'balanced',
  onFpsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUIOpenRef = useRef(isUIOpen);
  const activeBuildingTypeRef = useRef<MineStructureType>(activeBuildingType);

  useEffect(() => {
    activeBuildingTypeRef.current = activeBuildingType;
    if (mineBuildingRef.current) {
      if (playerStateRef.current.equippedTool === 'builder') {
        mineBuildingRef.current.setGhost(activeBuildingType);
      }
    }
  }, [activeBuildingType]);

  useEffect(() => {
    isUIOpenRef.current = isUIOpen;
    if (isUIOpen && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore exit pointer lock failures
      }
    }
  }, [isUIOpen]);

  const isGameOverRef = useRef(isGameOver);
  const deathPos = useRef(new THREE.Vector3());
  const panoramicAngle = useRef(0);
  const expeditionStartTime = useRef(Date.now());

  useEffect(() => {
    isGameOverRef.current = isGameOver;
    if (isGameOver && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore exit pointer lock failures
      }
    }
  }, [isGameOver]);

  const triggerDeath = useCallback(
    (details: GameOverDetails) => {
      if (isGameOverRef.current) return;
      isGameOverRef.current = true;
      deathPos.current.copy(playerPos.current);
      panoramicAngle.current = playerYaw.current;

      try {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      } catch {
        // Ignore
      }

      if (characterMeshRef.current) {
        characterMeshRef.current.visible = true;
        characterMeshRef.current.rotation.z = Math.PI / 2;
      }

      if (onPlayerDeath) {
        onPlayerDeath(details);
      }
    },
    [onPlayerDeath]
  );

  useEffect(() => {
    if (onRegisterRestartHandler) {
      onRegisterRestartHandler(() => {
        isGameOverRef.current = false;
        expeditionStartTime.current = Date.now();
        const campY = getTerrainHeight(-115, -115) + 1.7;
        playerPos.current.set(-115, campY, -115);
        playerYaw.current = 0;
        playerPitch.current = 0;
        verticalVelocity.current = 0;
        isGrounded.current = true;
        if (characterMeshRef.current) {
          characterMeshRef.current.rotation.set(0, 0, 0);
          characterMeshRef.current.visible = viewMode === 'third';
        }
        if (sceneRef.current) {
          resetAllDugHoles(sceneRef.current);
        }
      });
    }
  }, [onRegisterRestartHandler, viewMode]);

  // References for render loop state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const playerLightRef = useRef<THREE.PointLight | null>(null);
  const characterMeshRef = useRef<THREE.Group | null>(null);
  const pickaxeMeshRef = useRef<THREE.Mesh | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const goldDepositsRef = useRef<GoldDeposit[]>([]);
  const fpToolGroupRef = useRef<THREE.Group | null>(null);
  const fpPickGroupRef = useRef<THREE.Group | null>(null);
  const fpShovelGroupRef = useRef<THREE.Group | null>(null);
  const fpAxeGroupRef = useRef<THREE.Group | null>(null);
  const fpCarriedRockGroupRef = useRef<THREE.Group | null>(null);
  const fpCarriedRockMeshRef = useRef<THREE.Mesh | null>(null);
  const campfireFuelTimer = useRef(0);

  // Subsystems
  const foliageManagerRef = useRef<DesertFoliageManager | null>(null);
  const mountainDustParticlesRef = useRef<MountainDustParticleSystem | null>(null);
  const movableRockManagerRef = useRef<MovableRockManager | null>(null);
  const miningSystemRef = useRef<MiningSystem | null>(null);
  const mineBuildingRef = useRef<MineBuildingSystem | null>(null);
  const wildlifeManagerRef = useRef<WildlifeManager | null>(null);
  const combatManagerRef = useRef<CombatManager | null>(null);
  const atmosphereManagerRef = useRef<AtmosphereManager | null>(null);
  const hydrologyEngineRef = useRef<DesertHydrologyEngine | null>(null);
  const undergroundLayersRef = useRef<UndergroundLayersManager | null>(null);
  const isClimbingLadderRef = useRef(false);
  const ladderClimbAudioTimer = useRef(0);
  const voxelUniformsRef = useRef<VoxelShaderUniforms[]>([]);
  const voxelTimeRef = useRef<{ value: number }>({ value: 0 });
  const noiseTextureRef = useRef<THREE.Texture | null>(null);
  const remoteProspectorsRef = useRef<Map<string, RemoteProspector>>(new Map());

  // Synchronized player state reference for event callbacks
  const playerStateRef = useRef<PlayerState>(playerState);
  useEffect(() => {
    playerStateRef.current = playerState;
    // Update ghost preview when tool changes
    if (mineBuildingRef.current) {
      if (playerState.equippedTool === 'stake') {
        mineBuildingRef.current.setGhost('stake');
      } else if (playerState.equippedTool === 'builder') {
        mineBuildingRef.current.setGhost(activeBuildingTypeRef.current);
      } else {
        mineBuildingRef.current.hideGhost();
      }
    }
  }, [playerState.equippedTool, playerState]);

  // Input states
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const virtualJoystickInput = useRef<{ forward: number; right: number }>({ forward: 0, right: 0 });
  const isPointerLocked = useRef<boolean>(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const stepTimer = useRef<number>(0);
  const detectorBeepTimer = useRef<number>(0);

  // 3D Game Engine Locomotion & Physics
  const playerPos = useRef<THREE.Vector3>(
    new THREE.Vector3(playerState.position.x, playerState.position.y, playerState.position.z)
  );
  const playerYaw = useRef<number>(playerState.rotation.yaw);
  const playerPitch = useRef<number>(playerState.rotation.pitch);
  const verticalVelocity = useRef<number>(0);
  const isGrounded = useRef<boolean>(true);
  const headBobTimer = useRef<number>(0);
  const toolSwingProgress = useRef<number>(0);
  const ghostRotationY = useRef<number>(0);
  const groundHitPoint = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const oxygenLevelRef = useRef<number>(100);
  const drowningTimerRef = useRef<number>(0);
  const lastWaterSyncTime = useRef<number>(0);

  // High-performance graphics and frame pacing refs
  const qualityRef = useRef<GraphicsQuality>(graphicsQuality);
  qualityRef.current = graphicsQuality;

  const currentDprRef = useRef<number>(1.0);
  const fpsTrackerRef = useRef<{ frames: number; time: number; lowFpsCount: number }>({
    frames: 0,
    time: 0,
    lowFpsCount: 0,
  });
  const lastHudSyncTime = useRef<number>(0);
  const lastSentPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const lastSentYaw = useRef<number>(0);
  const lastSentPitch = useRef<number>(0);
  const lastMultiplayerSyncTime = useRef<number>(0);
  const interactionCheckTick = useRef<number>(0);

  // Dynamic quality adjustment without rebuilding scene
  useEffect(() => {
    if (!rendererRef.current) return;
    const targetDpr = getTargetPixelRatio(graphicsQuality);
    currentDprRef.current = targetDpr;
    rendererRef.current.setPixelRatio(targetDpr);

    if (foliageManagerRef.current) {
      foliageManagerRef.current.setGraphicsQuality(graphicsQuality);
    }

    if (sunLightRef.current && rendererRef.current) {
      const isPerf = graphicsQuality === 'performance';
      if (isPerf) {
        sunLightRef.current.shadow.mapSize.width = 1024;
        sunLightRef.current.shadow.mapSize.height = 1024;
        rendererRef.current.shadowMap.type = THREE.BasicShadowMap;
      } else if (graphicsQuality === 'balanced') {
        sunLightRef.current.shadow.mapSize.width = 1024;
        sunLightRef.current.shadow.mapSize.height = 1024;
        rendererRef.current.shadowMap.type = THREE.PCFShadowMap;
      } else {
        sunLightRef.current.shadow.mapSize.width = 2048;
        sunLightRef.current.shadow.mapSize.height = 2048;
        rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      sunLightRef.current.shadow.map?.dispose();
      sunLightRef.current.shadow.map = null as any;
      rendererRef.current.shadowMap.needsUpdate = true;
    }
  }, [graphicsQuality]);

  // Sync external position changes (e.g. fast travel or mine teleport)
  useEffect(() => {
    if (
      Math.abs(playerPos.current.x - playerState.position.x) > 2 ||
      Math.abs(playerPos.current.z - playerState.position.z) > 2
    ) {
      const isUnderground = (undergroundLayersRef.current?.currentLevel || 0) > 0;
      const uLayers = undergroundLayersRef.current;
      const groundY =
        isUnderground && uLayers
          ? uLayers.getFloorElevationForPosition(
              playerState.position.x,
              playerState.position.z,
              uLayers.currentLevel
            )
          : getTerrainHeight(playerState.position.x, playerState.position.z);
      playerPos.current.set(
        playerState.position.x,
        groundY + 1.7,
        playerState.position.z
      );
      verticalVelocity.current = 0;
      isGrounded.current = true;
    }
  }, [playerState.position.x, playerState.position.z]);

  // Sync tool lights (Lantern)
  useEffect(() => {
    if (playerLightRef.current) {
      playerLightRef.current.intensity = playerState.equippedTool === 'lantern' ? 2.5 : 0;
    }
    if (cameraRef.current) {
      // Binoculars zoom FOV
      const targetFov = playerState.equippedTool === 'binoculars' ? 22 : 65;
      cameraRef.current.fov = targetFov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [playerState.equippedTool]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0xddaf88, 0.0035);

    // 2. Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.08, 800);
    cameraRef.current = camera;

    // 3. Renderer Setup (Hardware Accelerated WebGL2 Pipeline with Adaptive Mobile Performance)
    const isMobile = isMobileDevice();
    const initQuality = qualityRef.current;
    const isPerf = initQuality === 'performance';

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile || initQuality === 'high',
      powerPreference: 'high-performance',
      precision: isMobile ? 'mediump' : 'highp',
      stencil: false,
      depth: true,
      alpha: false,
    });
    renderer.setSize(width, height);

    const initialDpr = getTargetPixelRatio(initQuality);
    currentDprRef.current = initialDpr;
    renderer.setPixelRatio(initialDpr);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isPerf
      ? THREE.BasicShadowMap
      : initQuality === 'high'
      ? THREE.PCFSoftShadowMap
      : THREE.PCFShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // 4. Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x553311, 0.8);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    sunLight.castShadow = true;
    const shadowRes = isPerf ? 1024 : initQuality === 'high' ? 2048 : 1024;
    sunLight.shadow.mapSize.width = shadowRes;
    sunLight.shadow.mapSize.height = shadowRes;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 380;
    const sCam = isPerf ? 85 : 120;
    sunLight.shadow.camera.left = -sCam;
    sunLight.shadow.camera.right = sCam;
    sunLight.shadow.camera.top = sCam;
    sunLight.shadow.camera.bottom = -sCam;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.025;
    sunLight.shadow.radius = isPerf ? 1.0 : 2.5;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Player Lantern Light
    const playerLight = new THREE.PointLight(0xffaa44, 0, 20);
    scene.add(playerLight);
    playerLightRef.current = playerLight;

    // 5. Build Desert World
    const terrain = createTerrainMesh();
    scene.add(terrain);

    // High-Fidelity Mountain Dust, Micro-silt, and Cleavage Particle System
    const mountainDustParticles = new MountainDustParticleSystem(scene);
    mountainDustParticlesRef.current = mountainDustParticles;

    const foliage = createDesertFoliage(scene);
    goldDepositsRef.current = foliage.goldDeposits;
    foliageManagerRef.current = foliage.manager;
    foliage.manager.setDustParticleSystem(mountainDustParticles);
    foliage.manager.setGraphicsQuality(initQuality);

    const landmarkMeshes = createLandmarkStructures(scene, landmarks);

    // 6. Procedural Gold Vein GLSL Fragment Shader & Noise Texture Initialization
    // Generates a multi-scale seamless procedural noise texture for realistic hydrothermal gold veins across mine voxels
    const noiseTexture = generateNoiseTexture(256);
    noiseTexture.anisotropy = maxAnisotropy;
    noiseTexture.generateMipmaps = true;
    noiseTexture.minFilter = THREE.LinearMipmapLinearFilter;
    noiseTexture.magFilter = THREE.LinearFilter;
    noiseTextureRef.current = noiseTexture;
    const sharedTimeUniform = { value: 0 };
    voxelTimeRef.current = sharedTimeUniform;

    const { materials: customVoxelMaterials, uniformsList: voxelUniforms } = createGoldVeinVoxelMaterials(
      noiseTexture,
      sharedTimeUniform,
      48.5
    );
    voxelUniformsRef.current = voxelUniforms;

    // Instantiate Granular Mining with Custom GLSL Shaded Voxels
    const miningSystem = new MiningSystem(scene, terrain, getTerrainHeight, customVoxelMaterials);
    miningSystem.setMountainHoleManager(foliage.manager.mountainHoleManager);
    miningSystem.setDustParticleSystem(mountainDustParticles);
    miningSystemRef.current = miningSystem;

    const mineBuilding = new MineBuildingSystem(scene, getTerrainHeight);
    mineBuilding.setDustParticleSystem(mountainDustParticles);
    mineBuildingRef.current = mineBuilding;

    const movableRockManager = new MovableRockManager(scene);
    movableRockManagerRef.current = movableRockManager;

    // Restore existing claim or built structures
    if (playerStateRef.current.activeClaim?.isClaimed) {
      mineBuilding.stakeClaim(
        playerStateRef.current.activeClaim.name,
        playerStateRef.current.activeClaim.position,
        playerStateRef.current.activeClaim.size
      );
    }
    if (playerStateRef.current.builtStructures?.length) {
      playerStateRef.current.builtStructures.forEach((s) => {
        mineBuilding.buildStructure(s.type, s.position, s.rotationY);
      });
    }

    const wildlifeManager = new WildlifeManager(scene, getTerrainHeight);
    wildlifeManagerRef.current = wildlifeManager;

    const combatManager = new CombatManager(scene, getTerrainHeight);
    combatManagerRef.current = combatManager;

    const atmosphereManager = new AtmosphereManager(scene);
    atmosphereManagerRef.current = atmosphereManager;
    atmosphereManager.updateAtmosphere(timeOfDay, weather, sunLight, hemiLight);

    const hydrologyEngine = new DesertHydrologyEngine(scene);
    hydrologyEngineRef.current = hydrologyEngine;
    hydrologyEngine.onFlashFloodWarning = (msg: string) => {
      soundEngine.playFlashFloodRoar();
      if (onShowBanner) onShowBanner(msg);
    };
    hydrologyEngine.onFlashFloodReceded = () => {
      if (onShowBanner) onShowBanner('🌊 Flash flood runoff has receded into the gravel wash. Heavy placer gold deposits exposed!');
    };

    // Initialize Subterranean Mine Shaft & Geological Strata System
    const undergroundLayers = new UndergroundLayersManager(scene, mountainDustParticles, foliage.manager.mountainHoleManager);
    undergroundLayers.setDustParticleSystem(mountainDustParticles);
    if (foliage.manager.mountainHoleManager) {
      undergroundLayers.setHoleManager(foliage.manager.mountainHoleManager);
    }
    undergroundLayersRef.current = undergroundLayers;

    const mineStructure = playerStateRef.current.builtStructures?.find(
      (s) => s.type === 'deep_shaft' || s.type === 'timber_portal' || s.type === 'headframe_hoist'
    );
    if (mineStructure) {
      undergroundLayers.initAtPosition(mineStructure.position, mineStructure.position.y);
    } else {
      const dutchmanY = getTerrainHeight(160, 110);
      undergroundLayers.initAtPosition({ x: 160, y: dutchmanY, z: 110 }, dutchmanY);
    }
    if (onUpdateShaftLayers) {
      onUpdateShaftLayers(undergroundLayers.layers);
    }
    if (onUpdateShaftLevel) {
      onUpdateShaftLevel(0, undergroundLayers.maxUnlockedLevel);
    }

    // 6b. First-Person 3D Tool Rig (Rigged directly to camera)
    const fpToolGroup = new THREE.Group();
    fpToolGroup.position.set(0.3, -0.28, -0.55);
    camera.add(fpToolGroup);
    scene.add(camera);
    fpToolGroupRef.current = fpToolGroup;

    // First-Person Tool: 1. Prospector Pickaxe
    const pickGroup = new THREE.Group();
    const pickShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.72, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 })
    );
    pickShaft.rotation.x = -Math.PI / 4;
    const pickHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.42, 6),
      new THREE.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.85, roughness: 0.35 })
    );
    pickHead.position.set(0, 0.28, -0.28);
    pickHead.rotation.x = Math.PI / 4;
    pickGroup.add(pickShaft);
    pickGroup.add(pickHead);
    fpToolGroup.add(pickGroup);
    fpPickGroupRef.current = pickGroup;

    // First-Person Tool: 2. Heavy-Duty Steel Spade Shovel
    const shovelGroup = new THREE.Group();
    // Ash wood handle
    const shovelShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.82, 8),
      new THREE.MeshStandardMaterial({ color: 0x6e482b, roughness: 0.85 })
    );
    shovelShaft.rotation.x = -Math.PI / 4;

    // Top T-Grip cross piece
    const shovelGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0x54351e, roughness: 0.85 })
    );
    shovelGrip.position.set(0, -0.28, 0.28);
    shovelGrip.rotation.z = Math.PI / 2;
    shovelGroup.add(shovelGrip);

    // Steel Neck Socket & Ferrule
    const shovelSocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a3f47, metalness: 0.85, roughness: 0.35 })
    );
    shovelSocket.position.set(0, 0.26, -0.26);
    shovelSocket.rotation.x = -Math.PI / 4;

    // Steel Curved Spade Blade
    const shovelBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.22, 0.022),
      new THREE.MeshStandardMaterial({ color: 0x484e56, metalness: 0.8, roughness: 0.35 })
    );
    shovelBlade.position.set(0, 0.36, -0.36);
    shovelBlade.rotation.x = -Math.PI / 4;

    // Steel Spade Pointed Scoop Tip
    const shovelTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.11, 4),
      new THREE.MeshStandardMaterial({ color: 0x40454d, metalness: 0.8, roughness: 0.35 })
    );
    shovelTip.position.set(0, 0.46, -0.46);
    shovelTip.rotation.x = -Math.PI / 4;
    shovelTip.rotation.y = Math.PI / 4;

    shovelGroup.add(shovelShaft);
    shovelGroup.add(shovelSocket);
    shovelGroup.add(shovelBlade);
    shovelGroup.add(shovelTip);
    fpToolGroup.add(shovelGroup);
    fpShovelGroupRef.current = shovelGroup;

    // First-Person Tool: 3. Frontier Timber Felling Axe
    const axeGroup = new THREE.Group();
    // Hickory wood haft
    const axeShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.85 })
    );
    axeShaft.rotation.x = -Math.PI / 4;

    // Forged steel axe poll & eye
    const axeHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.16, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.85, roughness: 0.3 })
    );
    axeHead.position.set(0, 0.28, -0.28);
    axeHead.rotation.x = -Math.PI / 4;

    // Razor-sharp cutting blade bit
    const axeBlade = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.13, 4),
      new THREE.MeshStandardMaterial({ color: 0x7c8594, metalness: 0.9, roughness: 0.2 })
    );
    axeBlade.position.set(0, 0.35, -0.35);
    axeBlade.rotation.x = -Math.PI / 4;
    axeBlade.rotation.y = Math.PI / 4;

    axeGroup.add(axeShaft);
    axeGroup.add(axeHead);
    axeGroup.add(axeBlade);
    fpToolGroup.add(axeGroup);
    fpAxeGroupRef.current = axeGroup;

    // 7. Character Mesh for Third-Person Mode
    const charGroup = new THREE.Group();
    // Prospector Torso (Coat)
    const coat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.8 })
    );
    coat.position.y = 0.9;
    charGroup.add(coat);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xdcb898 })
    );
    head.position.y = 1.5;
    charGroup.add(head);

    // Slouch Prospector Hat (Wide Brim)
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0x2b1d14 })
    );
    brim.position.y = 1.62;
    charGroup.add(brim);

    const hatCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.26, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0x2b1d14 })
    );
    hatCrown.position.y = 1.74;
    charGroup.add(hatCrown);

    // Prospector Backpack / Bedroll
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x755938 })
    );
    pack.position.set(0, 1.0, -0.3);
    charGroup.add(pack);

    charGroup.visible = viewMode === 'third';
    scene.add(charGroup);
    characterMeshRef.current = charGroup;

    // 8. Night Sky Stars
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let s = 0; s < starCount; s++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 350 + Math.random() * 50;
      starPos[s * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[s * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20; // Dome above
      starPos[s * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    starsRef.current = stars;

    // 8b. Real-Time Multiplayer Event Bridge & Remote Prospectors
    multiplayer.setHandlers({
      onPlayerJoined: (player) => {
        if (player.id === multiplayer.getSelfId()) return;
        if (!remoteProspectorsRef.current.has(player.id)) {
          const rp = new RemoteProspector(player);
          scene.add(rp.group);
          remoteProspectorsRef.current.set(player.id, rp);
        }
      },
      onPlayersSync: (players) => {
        const selfId = multiplayer.getSelfId();
        players.forEach((p) => {
          if (p.id === selfId) return;
          if (!remoteProspectorsRef.current.has(p.id)) {
            const rp = new RemoteProspector(p);
            const pStatus = friendshipService.getPardnerStatus(p.id, p.name);
            rp.setPardnerStatus(pStatus.status === 'pardner');
            scene.add(rp.group);
            remoteProspectorsRef.current.set(p.id, rp);
          } else {
            const rp = remoteProspectorsRef.current.get(p.id)!;
            rp.updateData(p);
            const pStatus = friendshipService.getPardnerStatus(p.id, p.name);
            rp.setPardnerStatus(pStatus.status === 'pardner');
          }
        });
      },
      onPlayerMoved: (data) => {
        if (data.id === multiplayer.getSelfId()) return;
        let rp = remoteProspectorsRef.current.get(data.id);
        if (!rp) {
          rp = new RemoteProspector({
            id: data.id,
            name: 'Prospector',
            outfitColor: '#8c5932',
            x: data.x,
            y: data.y,
            z: data.z,
            yaw: data.yaw,
            pitch: data.pitch,
            action: data.action,
            activeTool: data.activeTool,
            goldFound: data.goldFound,
            rocksGathered: data.rocksGathered,
            health: data.health,
            ping: 0,
            lastUpdate: Date.now(),
          });
          const pStatus = friendshipService.getPardnerStatus(data.id);
          rp.setPardnerStatus(pStatus.status === 'pardner');
          scene.add(rp.group);
          remoteProspectorsRef.current.set(data.id, rp);
        }
        rp.updateData(data);
      },
      onPlayerProfileUpdated: (player) => {
        const rp = remoteProspectorsRef.current.get(player.id);
        if (rp) {
          rp.setProfile(player.name, player.outfitColor);
          const pStatus = friendshipService.getPardnerStatus(player.id, player.name);
          rp.setPardnerStatus(pStatus.status === 'pardner');
        }
      },
      onPlayerAction: (data) => {
        const rp = remoteProspectorsRef.current.get(data.id);
        if (rp) {
          rp.triggerAction(data.action, data.tool);
        }
      },
      onPlayerLeft: (id) => {
        const rp = remoteProspectorsRef.current.get(id);
        if (rp) {
          scene.remove(rp.group);
          rp.dispose();
          remoteProspectorsRef.current.delete(id);
        }
      },
      onTerrainDug: (data) => {
        if (data.dugByPlayerId === multiplayer.getSelfId()) return;
        if (data.hole) {
          syncRemoteDugHole(data.hole, scene);
          if (miningSystemRef.current) {
            miningSystemRef.current.spawnDigDebris(
              new THREE.Vector3(data.hole.x, getTerrainHeight(data.hole.x, data.hole.z), data.hole.z),
              'sandstone',
              1.0
            );
          }
        }
      },
      onTerrainShored: (data) => {
        const h = activeDugHoles.find((dh) => dh.id === data.holeId);
        if (h) {
          h.isShored = true;
          h.stability = data.stability ?? 100;
          h.shoredUntilDepth = data.shoredUntilDepth ?? h.depth;
          if (h.shoringMesh && h.shoringMesh.parent) {
            h.shoringMesh.parent.remove(h.shoringMesh);
          }
          const mesh = createTrenchShoringMesh(h);
          scene.add(mesh);
          h.shoringMesh = mesh;
        }
      },
      onTerrainBlasted: (data) => {
        if (miningSystemRef.current) {
          miningSystemRef.current.spawnDigDebris(new THREE.Vector3(data.x, data.y, data.z), 'granite', 2.5);
        }
        soundEngine.playDynamiteExplosion();
      },
      onMineBuilt: (mine) => {
        if (mineBuildingRef.current) {
          mineBuildingRef.current.buildStructure(
            mine.blueprintId as any,
            { x: mine.x, y: getTerrainHeight(mine.x, mine.z), z: mine.z },
            0
          );
        }
      },
    });

    const unsubFriendships = friendshipService.subscribe(() => {
      remoteProspectorsRef.current.forEach((rp) => {
        const pStatus = friendshipService.getPardnerStatus(rp.id, rp.name);
        rp.setPardnerStatus(pStatus.status === 'pardner');
      });
    });

    // 9. Universal Action Executors (Digging, Shooting, Dynamite)
    const executeDig = () => {
      const cam = cameraRef.current;
      const lookDir = new THREE.Vector3();
      if (cam) cam.getWorldDirection(lookDir);
      else {
        lookDir.set(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current));
      }

      const origin =
        viewMode === 'third'
          ? playerPos.current.clone().add(new THREE.Vector3(0, 1.2, 0))
          : cam
          ? cam.position.clone()
          : playerPos.current.clone().add(new THREE.Vector3(0, 1.6, 0));

      const dir = lookDir.clone();
      if (viewMode === 'third') {
        dir.y -= 0.35;
        dir.normalize();
      }

      // 0. Subterranean Mini-Voxel Bedrock / Vein Strike Check
      if (undergroundLayersRef.current) {
        const uLayers = undergroundLayersRef.current;
        const targetedVoxel = uLayers.voxelEngine.targetedVoxel;
        const isNearShaft = uLayers.isNearShaft(playerPos.current, 5.5) || uLayers.currentLevel > 0;
        if (targetedVoxel || uLayers.currentLevel > 0 || (isNearShaft && uLayers.isNearExcavationPit(playerPos.current))) {
          executeSubterraneanVoxelMine(playerStateRef.current.equippedTool || 'pickaxe');
          return;
        }
      }

      // Wildlife strike check (pickaxe defends against rattlesnakes and scorpions)
      if (wildlifeManagerRef.current) {
        const wildlifeRay = new THREE.Raycaster(origin, dir, 0.1, 4.0);
        const wRes = wildlifeManagerRef.current.hitTestRay(wildlifeRay, 3.8, 25);
        if (wRes.hit) {
          if (onTriggerHitMarker) onTriggerHitMarker();
          if (wRes.message && onShowBanner) onShowBanner(wRes.message);
          return;
        }
      }

      // A. Check if striking near the active Portal Excavation drift
      if (mineBuildingRef.current?.portalExcavation && !mineBuildingRef.current.portalExcavation.isReinforced) {
        const pe = mineBuildingRef.current.portalExcavation;
        const dist = Math.hypot(origin.x - pe.position.x, origin.z - pe.position.z);
        if (dist < 8.5) {
          const res = mineBuildingRef.current.strikeExcavation(
            new THREE.Vector3(pe.position.x, pe.position.y + 1.8, pe.position.z)
          );
          if (res.success) {
            const goldAwarded = res.goldAwarded || 0;
            if (goldAwarded > 0 && onPayDirtHit) {
              onPayDirtHit(goldAwarded);
            }
            const isAutoRedeem = playerStateRef.current.autoRedeemGold !== false;
            const cashEarned = isAutoRedeem && goldAwarded > 0 ? Number((goldAwarded * 20.67).toFixed(2)) : 0;
            if (cashEarned > 0) {
              soundEngine.playCashRegister();
            }
            setPlayerState((prev) => {
              const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
              const currentCash = typeof prev.cashDollars === 'number' && !isNaN(prev.cashDollars) ? prev.cashDollars : 0;
              const currentRocks = typeof prev.blocksDug === 'number' && !isNaN(prev.blocksDug) ? prev.blocksDug : 0;
              return {
                ...prev,
                blocksDug: currentRocks + res.rocksDug,
                goldFound: currentGold + goldAwarded,
                cashDollars: currentCash + cashEarned,
                portalExcavation: { ...pe },
              };
            });
            if (res.message && onShowBanner) {
              onShowBanner(
                cashEarned > 0
                  ? `${res.message} ➔ 🪙 Auto-Redeemed +$${cashEarned.toFixed(2)} Cash!`
                  : res.message
              );
            }
            return;
          }
        }
      }

      // B. Check if striking Desert Foliage, Boulders, Sandstone Hoodoos, or Gold Quartz Veins
      if (foliageManagerRef.current) {
        const raycaster = new THREE.Raycaster(origin, dir, 0.1, 7.5);
        const fRes = foliageManagerRef.current.strikeFoliageOrRock(raycaster, 6.8);
        if (fRes.hit) {
          if (fRes.type === 'outcropping') {
            soundEngine.playRockChisel();
          } else {
            soundEngine.playVoxelDig();
          }
          if (fRes.goldAwarded && fRes.goldAwarded > 0) {
            soundEngine.playOreChime();
          }
          if (miningSystemRef.current && fRes.hitPoint && fRes.debrisType) {
            miningSystemRef.current.spawnDigDebris(
              fRes.hitPoint,
              fRes.debrisType,
              fRes.type === 'outcropping' ? 1.8 : 1.4,
              fRes.surfaceNormal
            );
            if (mountainDustParticlesRef.current && fRes.type === 'outcropping') {
              mountainDustParticlesRef.current.triggerMountainStrike(
                fRes.hitPoint,
                fRes.surfaceNormal || new THREE.Vector3(0, 1, 0),
                fRes.rockMaterial || 'volcanic_crag',
                1.35
              );
            }
            if (fRes.type === 'gold_deposit' && fRes.goldAwarded) {
              miningSystemRef.current.spawnOreDrop(
                new THREE.Vector3(fRes.hitPoint.x, fRes.hitPoint.y + 0.4, fRes.hitPoint.z),
                'quartz_gold',
                fRes.goldAwarded
              );
            } else if (fRes.goldAwarded && fRes.goldAwarded > 0) {
              miningSystemRef.current.spawnOreDrop(
                new THREE.Vector3(fRes.hitPoint.x, fRes.hitPoint.y + 0.4, fRes.hitPoint.z),
                'gold_nugget',
                fRes.goldAwarded
              );
            }
          }

          // If a boulder or mountain cliff was chipped, drop/eject a real physical rock chunk on the ground
          if (fRes.spawnPhysicalRock && movableRockManagerRef.current) {
            if (fRes.spawnPhysicalRock.isChippedFragment) {
              movableRockManagerRef.current.spawnChippedFragment(
                fRes.spawnPhysicalRock.position,
                fRes.spawnPhysicalRock.ejectionDir || new THREE.Vector3(0, 1, 0),
                fRes.spawnPhysicalRock.color,
                fRes.spawnPhysicalRock.scale
              );
            } else {
              movableRockManagerRef.current.spawnPlacedRock(
                fRes.spawnPhysicalRock.position,
                fRes.spawnPhysicalRock.color,
                fRes.spawnPhysicalRock.scale
              );
            }
          }
          const goldAwarded = fRes.goldAwarded || 0;
          if (goldAwarded > 0 && onPayDirtHit) {
            onPayDirtHit(goldAwarded);
          }
          const isAutoRedeem = playerStateRef.current.autoRedeemGold !== false;
          const cashEarned = isAutoRedeem && goldAwarded > 0 ? Number((goldAwarded * 20.67).toFixed(2)) : 0;
          if (cashEarned > 0) {
            soundEngine.playCashRegister();
          }

          setPlayerState((prev) => {
            const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
            const currentCash = typeof prev.cashDollars === 'number' && !isNaN(prev.cashDollars) ? prev.cashDollars : 0;
            const currentRocks = typeof prev.blocksDug === 'number' && !isNaN(prev.blocksDug) ? prev.blocksDug : 0;
            const currentWood = typeof prev.woodPlanks === 'number' && !isNaN(prev.woodPlanks) ? prev.woodPlanks : 0;
            const currentHydration = typeof prev.hydration === 'number' && !isNaN(prev.hydration) ? prev.hydration : 100;
            return {
              ...prev,
              blocksDug: currentRocks + (fRes.blocksDug || 0),
              woodPlanks: currentWood + (fRes.woodAwarded || 0),
              goldFound: currentGold + goldAwarded,
              cashDollars: currentCash + cashEarned,
              hydration: Math.min(100, currentHydration + (fRes.hydrationAwarded || 0)),
            };
          });
          if (fRes.message && onShowBanner) {
            onShowBanner(
              cashEarned > 0
                ? `${fRes.message} ➔ 🪙 Auto-Redeemed +$${cashEarned.toFixed(2)} Cash ($20.67/oz)!`
                : fRes.message
            );
          }
          return;
        }
      }

      // C. Standard Bedrock / Ground Excavation
      if (!miningSystemRef.current) return;
      const raycaster = new THREE.Raycaster(origin, dir, 0.1, 7.5);
      const res = miningSystemRef.current.digVoxelAtRay(raycaster, playerPos.current, lookDir);

      if (res.hit) {
        if (res.slumpOccurred && res.slumpDamage && res.slumpDamage > 0) {
          if (onTriggerDamageFlash) onTriggerDamageFlash();
          const nextHealth = playerStateRef.current.health - (res.slumpDamage || 0);
          if (nextHealth <= 0 || res.slumpFatal) {
            soundEngine.playPlayerDeath();
            const nearbyHole = getNearbyDugHole(playerPos.current.x, playerPos.current.z, 5.0);
            const holeDepth = nearbyHole?.depth || 2.5;
            const layer = getGeologicalLayerAtDepth(holeDepth);
            triggerDeath({
              reason: 'cave_in',
              title: 'Buried in Trench Collapse',
              subtitle: 'Catastrophic Pit Rim Failure',
              cause: `While pickaxing at ${holeDepth.toFixed(1)}m depth in ${layer.name}, un-shored lateral overburden collapsed into the excavation. Over a dozen tons of rock and caliche gravel sheared down, crushing your prospector beneath the debris. Always shore your pits with timber cribbing [T] before digging deep!`,
              depth: holeDepth,
              strata: layer.name,
              goldFound: playerStateRef.current.goldFound || 0,
              blocksDug: (playerStateRef.current.blocksDug || 0) + 1,
              landmarksDiscovered: playerStateRef.current.discoveredLandmarks.length,
              timeSurvivedSeconds: Math.floor((Date.now() - expeditionStartTime.current) / 1000),
              coordinates: { x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z },
            });
            setPlayerState((prev) => ({ ...prev, health: 0 }));
            return;
          } else {
            setPlayerState((prev) => ({ ...prev, health: nextHealth }));
          }
        }

        const goldAwarded = typeof res.goldAwarded === 'number' && !isNaN(res.goldAwarded) ? res.goldAwarded : 0;
        if (goldAwarded > 0 && onPayDirtHit) {
          onPayDirtHit(goldAwarded);
        }
        const isAutoRedeem = playerStateRef.current.autoRedeemGold !== false;
        const cashEarned = isAutoRedeem && goldAwarded > 0 ? Number((goldAwarded * 20.67).toFixed(2)) : 0;
        if (cashEarned > 0) {
          soundEngine.playCashRegister();
        }

        setPlayerState((prev) => {
          const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
          const currentCash = typeof prev.cashDollars === 'number' && !isNaN(prev.cashDollars) ? prev.cashDollars : 0;
          const currentRocks = typeof prev.blocksDug === 'number' && !isNaN(prev.blocksDug) ? prev.blocksDug : 0;
          return {
            ...prev,
            blocksDug: currentRocks + 1,
            goldFound: currentGold + goldAwarded,
            cashDollars: currentCash + cashEarned,
          };
        });
        if (res.message && onShowBanner) {
          onShowBanner(
            cashEarned > 0
              ? `${res.message} ➔ 🪙 Auto-Redeemed +$${cashEarned.toFixed(2)} Cash!`
              : res.message
          );
        }
      } else {
        // Fallback: Pickaxe strikes ground terrain directly
        const forwardXZ = new THREE.Vector2(lookDir.x, lookDir.z).normalize();
        const digX = playerPos.current.x + (forwardXZ.x || 0) * 1.6;
        const digZ = playerPos.current.z + (forwardXZ.y || 0) * 1.6;
        const result = digHoleInTerrain(digX, digZ, 0.42, 1.85, 'pickaxe');
        if (result.hole) {
          multiplayer.broadcastDig(result.hole, 'pickaxe');
        }
        if (result.shaftCollarEstablished && undergroundLayersRef.current) {
          const digY = getTerrainHeight(digX, digZ);
          undergroundLayersRef.current.initAtPosition({ x: digX, y: digY, z: digZ }, digY);
          if (onUpdateShaftLayers) onUpdateShaftLayers(undergroundLayersRef.current.layers);
          if (onUpdateShaftLevel) onUpdateShaftLevel(0, undergroundLayersRef.current.maxUnlockedLevel);
          if (onShowBanner) onShowBanner(`⚒️ Deep Bedrock Shaft Collar Established! Press [E] to Descend into Subterranean Mine Shaft!`);
        } else if (result.strataMessage && onShowBanner) {
          onShowBanner(result.strataMessage);
        }
      }
    };

    const executeShovelDig = () => {
      soundEngine.playShovelDig();
      toolSwingProgress.current = 1.0;

      // Calculate where the shovel blade strikes the ground in front of the prospector
      const cam = cameraRef.current;
      const lookDir = new THREE.Vector3();
      if (cam) cam.getWorldDirection(lookDir);
      else {
        lookDir.set(-Math.sin(playerYaw.current), 0, -Math.cos(playerYaw.current));
      }

      // Check if striking subterranean mini-voxels
      if (undergroundLayersRef.current) {
        const uLayers = undergroundLayersRef.current;
        const targetedVoxel = uLayers.voxelEngine.targetedVoxel;
        const isNearShaft = uLayers.isNearShaft(playerPos.current, 5.5) || uLayers.currentLevel > 0;
        if (targetedVoxel || (isNearShaft && uLayers.isNearExcavationPit(playerPos.current))) {
          executeSubterraneanVoxelMine('shovel');
          return;
        }
      }

      // First check if shovel strikes aggressive wildlife (rattlesnake, scorpion)
      if (wildlifeManagerRef.current) {
        const origin = cam ? cam.position.clone() : playerPos.current.clone().add(new THREE.Vector3(0, 1.4, 0));
        const shovelRay = new THREE.Raycaster(origin, lookDir, 0.1, 4.2);
        const wRes = wildlifeManagerRef.current.hitTestRay(shovelRay, 3.8, 25);
        if (wRes.hit) {
          if (onTriggerHitMarker) onTriggerHitMarker();
          if (wRes.message && onShowBanner) onShowBanner(wRes.message);
          return;
        }
      }

      // First check if shovel blade directly strikes a desert boulder, cactus, or gold deposit
      if (foliageManagerRef.current) {
        const origin = cam ? cam.position.clone() : playerPos.current.clone().add(new THREE.Vector3(0, 1.4, 0));
        const shovelRay = new THREE.Raycaster(origin, lookDir, 0.1, 4.8);
        const fRes = foliageManagerRef.current.strikeFoliageOrRock(shovelRay, 4.5);
        if (fRes.hit) {
          soundEngine.playVoxelDig();
          if (fRes.goldAwarded && fRes.goldAwarded > 0) {
            soundEngine.playOreChime();
          }
          if (miningSystemRef.current && fRes.hitPoint && fRes.debrisType) {
            miningSystemRef.current.spawnDigDebris(fRes.hitPoint, fRes.debrisType, 1.3);
            if (fRes.goldAwarded && fRes.goldAwarded > 0) {
              miningSystemRef.current.spawnOreDrop(
                new THREE.Vector3(fRes.hitPoint.x, fRes.hitPoint.y + 0.4, fRes.hitPoint.z),
                'gold_nugget',
                fRes.goldAwarded
              );
            }
          }
          const goldAwarded = fRes.goldAwarded || 0;
          if (goldAwarded > 0 && onPayDirtHit) {
            onPayDirtHit(goldAwarded);
          }
          const isAutoRedeem = playerStateRef.current.autoRedeemGold !== false;
          const cashEarned = isAutoRedeem && goldAwarded > 0 ? Number((goldAwarded * 20.67).toFixed(2)) : 0;
          if (cashEarned > 0) {
            soundEngine.playCashRegister();
          }
          setPlayerState((prev) => ({
            ...prev,
            blocksDug: (prev.blocksDug || 0) + (fRes.blocksDug || 0),
            woodPlanks: (prev.woodPlanks || 0) + (fRes.woodAwarded || 0),
            goldFound: (prev.goldFound || 0) + goldAwarded,
            cashDollars: (prev.cashDollars || 0) + cashEarned,
            hydration: Math.min(100, (prev.hydration || 100) + (fRes.hydrationAwarded || 0)),
          }));
          if (fRes.message && onShowBanner) {
            onShowBanner(
              cashEarned > 0
                ? `${fRes.message} ➔ 🪙 Auto-Redeemed +$${cashEarned.toFixed(2)} Cash ($20.67/oz)!`
                : fRes.message
            );
          }
          return;
        }
      }

      // Excavate 1.8m ahead on the ground along player gaze
      const forwardXZ = new THREE.Vector2(lookDir.x, lookDir.z).normalize();
      const digX = playerPos.current.x + (forwardXZ.x || 0) * 1.8;
      const digZ = playerPos.current.z + (forwardXZ.y || 0) * 1.8;
      const digY = getTerrainHeight(digX, digZ);
      const digPos = new THREE.Vector3(digX, digY, digZ);

      // Physically deform terrain vertices and penetrate progressive geological rock strata!
      const result = digHoleInTerrain(digX, digZ, 0.48, 1.85, 'shovel');

      // Broadcast shovel excavation to multiplayer peers
      if (result.hole) {
        multiplayer.broadcastDig(result.hole, 'shovel');
      }
      multiplayer.broadcastAction('dig', 'shovel', { x: digX, z: digZ });

      // Geotechnical pit wall collapse / slump audio & cascading gravel
      if (result.slumpOccurred) {
        soundEngine.playTrenchSlump();
        if (result.slumpDamage && result.slumpDamage > 0) {
          if (onTriggerDamageFlash) onTriggerDamageFlash();
          const nextHealth = playerStateRef.current.health - (result.slumpDamage || 0);
          if (nextHealth <= 0 || result.slumpFatal) {
            soundEngine.playPlayerDeath();
            const holeDepth = result.hole.depth;
            const layer = getGeologicalLayerAtDepth(holeDepth);
            triggerDeath({
              reason: 'cave_in',
              title: 'Buried in Trench Collapse',
              subtitle: 'Fatal Overburden Pit Wall Failure',
              cause: `While shovel excavating at ${holeDepth.toFixed(1)}m depth in ${layer.name}, un-shored lateral overburden collapsed into the pit bottom, burying your prospector under tons of rocky debris. Pit walls must be reinforced with Timber Shoring [T] to withstand high geotechnical soil pressure!`,
              depth: holeDepth,
              strata: layer.name,
              goldFound: playerStateRef.current.goldFound || 0,
              blocksDug: (playerStateRef.current.blocksDug || 0) + 1,
              landmarksDiscovered: playerStateRef.current.discoveredLandmarks.length,
              timeSurvivedSeconds: Math.floor((Date.now() - expeditionStartTime.current) / 1000),
              coordinates: { x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z },
            });
            setPlayerState((prev) => ({ ...prev, health: 0 }));
            return;
          } else {
            setPlayerState((prev) => ({ ...prev, health: nextHealth }));
          }
        }
        if (miningSystemRef.current) {
          for (let s = 0; s < 3; s++) {
            const angle = Math.random() * Math.PI * 2;
            const r = result.hole.radius * 0.75;
            miningSystemRef.current.spawnDigDebris(
              new THREE.Vector3(digX + Math.cos(angle) * r, digY + 0.1, digZ + Math.sin(angle) * r),
              'dirt',
              0.85
            );
          }
        }
      }

      // Spawn flying excavated debris matching the active geological stratum
      if (miningSystemRef.current) {
        miningSystemRef.current.spawnDigDebris(digPos, result.layer.debrisType, 1.35);

        // Deep excavations cause unstable rims to slump friable sand & gravel into the pit
        if (result.hole.depth > 1.2 && !result.slumpOccurred) {
          const rimAngle = Math.random() * Math.PI * 2;
          const rimDist = result.hole.radius * 0.85;
          const rimPos = new THREE.Vector3(
            digX + Math.cos(rimAngle) * rimDist,
            digY + 0.1,
            digZ + Math.sin(rimAngle) * rimDist
          );
          miningSystemRef.current.spawnDigDebris(rimPos, result.layer.debrisType, 0.55);
        }
      }

      let bannerText = result.strataMessage;

      if (result.layer.hardness >= 4) {
        bannerText += ` (💡 Shovel struggles on hard bedrock! Switch to Pickaxe [4] or Dynamite [6])`;
      }

      const woodGained = result.woodAwarded || 0;

      if (result.itemFound) {
        const item = result.itemFound;
        const goldVal = item.type === 'gold' ? item.value : (result.goldAwarded || 0);
        if (goldVal > 0 && onPayDirtHit) {
          onPayDirtHit(goldVal);
        }
        const isAutoRedeem = playerStateRef.current.autoRedeemGold !== false;
        const cashEarned = isAutoRedeem && goldVal > 0 ? Number((goldVal * 20.67).toFixed(2)) : 0;

        if (item.type === 'gold') {
          if (cashEarned > 0) {
            soundEngine.playCashRegister();
          } else {
            soundEngine.playOreChime();
          }
          if (miningSystemRef.current) {
            miningSystemRef.current.spawnOreDrop(
              new THREE.Vector3(digX, digY + 0.5, digZ),
              result.layer.rockType === 'quartz_gold' ? 'quartz_gold' : 'gold_nugget',
              Math.max(1, Math.round(item.value))
            );
          }
        } else if (item.type === 'relic') {
          soundEngine.playDiscovery();
        } else {
          soundEngine.playOreChime();
        }

        setPlayerState((prev) => ({
          ...prev,
          blocksDug: (prev.blocksDug || 0) + result.rocksAwarded,
          woodPlanks: (prev.woodPlanks || 0) + woodGained,
          goldFound: (prev.goldFound || 0) + goldVal,
          cashDollars: (prev.cashDollars || 0) + cashEarned,
        }));

        if (cashEarned > 0) {
          bannerText += ` ➔ 🪙 Auto-Redeemed +$${cashEarned.toFixed(2)} ($20.67/oz)!`;
        }
      } else {
        soundEngine.playVoxelDig();
        setPlayerState((prev) => ({
          ...prev,
          blocksDug: (prev.blocksDug || 0) + result.rocksAwarded,
          woodPlanks: (prev.woodPlanks || 0) + woodGained,
        }));
      }

      if (result.shaftCollarEstablished && undergroundLayersRef.current) {
        undergroundLayersRef.current.initAtPosition({ x: digX, y: digY, z: digZ }, digY);
        if (onUpdateShaftLayers) {
          onUpdateShaftLayers(undergroundLayersRef.current.layers);
        }
        if (onUpdateShaftLevel) {
          onUpdateShaftLevel(0, undergroundLayersRef.current.maxUnlockedLevel);
        }
        bannerText = `⚒️ Deep Bedrock Shaft Collar Established! Press [E] to Descend into Subterranean Mine Shaft!`;
      }

      if (onShowBanner) {
        onShowBanner(bannerText);
      }
    };

    const executeChop = () => {
      toolSwingProgress.current = 1.0;
      const cam = cameraRef.current;
      const lookDir = new THREE.Vector3();
      if (cam) cam.getWorldDirection(lookDir);
      else {
        lookDir.set(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current));
      }

      const origin =
        viewMode === 'third'
          ? playerPos.current.clone().add(new THREE.Vector3(0, 1.2, 0))
          : cam
          ? cam.position.clone()
          : playerPos.current.clone().add(new THREE.Vector3(0, 1.6, 0));

      const dir = lookDir.clone();
      if (viewMode === 'third') {
        dir.y -= 0.35;
        dir.normalize();
      }

      if (foliageManagerRef.current) {
        const raycaster = new THREE.Raycaster(origin, dir, 0.1, 7.5);
        const fRes = foliageManagerRef.current.strikeFoliageOrRock(raycaster, 6.8, 'axe');
        if (fRes.hit) {
          if (fRes.type === 'tree') {
            soundEngine.playWoodChop();
          } else {
            soundEngine.playVoxelDig();
          }

          if (miningSystemRef.current && fRes.hitPoint) {
            miningSystemRef.current.spawnDigDebris(fRes.hitPoint, fRes.debrisType || 'wood', 1.5);
          }

          if ((fRes.woodAwarded && fRes.woodAwarded > 0) || (fRes.blocksDug && fRes.blocksDug > 0)) {
            setPlayerState((prev) => ({
              ...prev,
              woodPlanks: (prev.woodPlanks || 0) + (fRes.woodAwarded || 0),
              blocksDug: (prev.blocksDug || 0) + (fRes.blocksDug || 0),
            }));
          }

          if (fRes.message && onShowBanner) {
            onShowBanner(fRes.message);
          }
          return;
        }
      }

      // Air swing sound
      soundEngine.playWoodChop();
    };

    const executePickUpRock = () => {
      const cam = cameraRef.current;
      const lookDir = new THREE.Vector3();
      if (cam) cam.getWorldDirection(lookDir);
      else {
        lookDir.set(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current));
      }

      const origin =
        viewMode === 'third'
          ? playerPos.current.clone().add(new THREE.Vector3(0, 1.2, 0))
          : cam
          ? cam.position.clone()
          : playerPos.current.clone().add(new THREE.Vector3(0, 1.6, 0));

      const raycaster = new THREE.Raycaster(origin, lookDir, 0.1, 4.0);

      // 1. Check existing movable rocks
      if (movableRockManagerRef.current) {
        const mHit = movableRockManagerRef.current.raycastMovableRock(raycaster, 3.8);
        if (mHit.hit && mHit.rock) {
          if (!mHit.canLift) {
            soundEngine.playHeavyExertion();
            if (onShowBanner) {
              onShowBanner(`⚠️ Too heavy to lift! This rock weighs ${mHit.rock.weightLbs} lbs (Human bare-hands limit: 55 lbs). Strike with Pickaxe [4] to break down!`);
            }
            return false;
          }
          const rock = movableRockManagerRef.current.pickUpRock(mHit.rock.id);
          if (rock) {
            soundEngine.playRockPickup();
            setPlayerState((prev) => ({
              ...prev,
              carriedObject: {
                type: 'rock',
                name: `${rock.weightLbs} lb Desert Stone`,
                weightLbs: rock.weightLbs,
                color: rock.color,
                scale: rock.scale,
              },
            }));
            if (onShowBanner) onShowBanner(`🪨 Hoisted ${rock.weightLbs} lb Desert Stone into your hands! Throw [L-Click], Place [R-Click / E], or Stow [F].`);
            return true;
          }
        }
      }

      // 2. Check world instanced boulders
      if (foliageManagerRef.current) {
        const bRes = foliageManagerRef.current.pickUpWorldBoulder(raycaster, 3.8);
        if (bRes && bRes.hit) {
          if (!bRes.canLift) {
            soundEngine.playHeavyExertion();
            if (onShowBanner) {
              onShowBanner(`⚠️ Too heavy to lift! This boulder weighs ~${bRes.weightLbs.toLocaleString()} lbs (Human limit: 55 lbs). Strike with Pickaxe [4] to chisel manageable stones!`);
            }
            return false;
          }
          soundEngine.playRockPickup();
          const scale = bRes.scale || 0.85;
          const weight = bRes.weightLbs;
          setPlayerState((prev) => ({
            ...prev,
            carriedObject: {
              type: 'rock',
              name: `${weight} lb Field Stone`,
              weightLbs: weight,
              color: bRes.color || 0x9b583c,
              scale,
            },
          }));
          if (onShowBanner) onShowBanner(`🪨 Lifted ${weight} lb Field Stone with bare hands! Throw [L-Click], Place [R-Click / E], or Stow [F].`);
          return true;
        }
      }

      return false;
    };

    const executeThrowRock = () => {
      const carried = playerStateRef.current.carriedObject;
      if (!carried || !movableRockManagerRef.current) return;

      soundEngine.playRockThrow();
      toolSwingProgress.current = 1.0;

      const cam = cameraRef.current;
      const lookDir = new THREE.Vector3();
      if (cam) cam.getWorldDirection(lookDir);
      else {
        lookDir.set(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current));
      }

      const spawnPos = cam
        ? cam.position.clone().add(lookDir.clone().multiplyScalar(0.75)).add(new THREE.Vector3(0, -0.2, 0))
        : playerPos.current.clone().add(new THREE.Vector3(0, 1.4, 0)).add(lookDir.clone().multiplyScalar(0.75));

      // Ballistic throw speed inversely scaled to rock mass:
      // A light 10 lb stone is thrown at ~19 m/s; a 50 lb stone is heaved with two hands at ~8 m/s
      const throwSpeed = Math.max(7.0, 22.0 - (carried.weightLbs * 0.28));
      const throwVelocity = lookDir.clone().multiplyScalar(throwSpeed);
      throwVelocity.y += Math.max(1.6, 4.2 - (carried.weightLbs * 0.04));

      movableRockManagerRef.current.spawnThrownRock(
        spawnPos,
        throwVelocity,
        carried.color,
        carried.scale
      );

      setPlayerState((prev) => ({
        ...prev,
        carriedObject: null,
      }));

      if (onShowBanner) onShowBanner(`💨 Threw ${carried.name}!`);
    };

    const executePlaceRock = () => {
      const carried = playerStateRef.current.carriedObject;
      if (!carried || !movableRockManagerRef.current) return;

      soundEngine.playRockImpact(0.2);

      const cam = cameraRef.current;
      const lookDir = new THREE.Vector3();
      if (cam) cam.getWorldDirection(lookDir);
      else {
        lookDir.set(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current));
      }

      const placeX = playerPos.current.x + lookDir.x * 1.6;
      const placeZ = playerPos.current.z + lookDir.z * 1.6;
      const placeY = getTerrainHeight(placeX, placeZ);

      movableRockManagerRef.current.spawnPlacedRock(
        new THREE.Vector3(placeX, placeY + carried.scale * 0.2, placeZ),
        carried.color,
        carried.scale,
        playerYaw.current
      );

      setPlayerState((prev) => ({
        ...prev,
        carriedObject: null,
      }));

      if (onShowBanner) onShowBanner(`🪨 Set down ${carried.name}.`);
    };

    const executeStowRock = () => {
      const carried = playerStateRef.current.carriedObject;
      if (!carried) return;

      soundEngine.playVoxelDig();
      const nextCount = (playerStateRef.current.blocksDug || 0) + 1;
      setPlayerState((prev) => ({
        ...prev,
        blocksDug: nextCount,
        carriedObject: null,
      }));

      if (onShowBanner) onShowBanner(`🎒 Stowed ${carried.name} into backpack (+1 Rock, ${nextCount} total in pack).`);
    };

    const handleActionDig = () => {
      if (playerStateRef.current.carriedObject) {
        executeThrowRock();
        return;
      }
      if (playerStateRef.current.equippedTool === 'hands') {
        executePickUpRock();
        return;
      }
      if (
        undergroundLayersRef.current &&
        undergroundLayersRef.current.currentLevel > 0
      ) {
        const nearbyRoom = undergroundLayersRef.current.getNearbyRoomPortal(playerPos.current, 5.0);
        if (nearbyRoom && !nearbyRoom.room.isComplete) {
          executeExcavateRoom(nearbyRoom.direction);
          return;
        }

        if (undergroundLayersRef.current.isNearExcavationPit(playerPos.current)) {
          executeShaftDig();
          return;
        }
      }
      if (playerStateRef.current.equippedTool === 'shovel') {
        executeShovelDig();
      } else if (playerStateRef.current.equippedTool === 'axe') {
        executeChop();
      } else {
        executeDig();
      }
    };

    if (onRegisterDigHandler) {
      onRegisterDigHandler(handleActionDig);
    }

    const executeReinforcePortal = () => {
      if (!mineBuildingRef.current?.portalExcavation) {
        if (onShowBanner) onShowBanner('No active portal excavation to reinforce. Stake a claim and start excavation!');
        return;
      }
      const pe = mineBuildingRef.current.portalExcavation;
      const res = mineBuildingRef.current.reinforcePortal(
        playerStateRef.current.goldFound || 0,
        playerStateRef.current.blocksDug || 0
      );
      if (res.success) {
        setPlayerState((prev) => ({
          ...prev,
          goldFound: Math.max(0, (prev.goldFound || 0) - res.goldUsed),
          blocksDug: Math.max(0, (prev.blocksDug || 0) - res.rocksUsed),
          portalExcavation: { ...pe },
        }));
      }
      if (res.message && onShowBanner) {
        onShowBanner(res.message);
      }
    };

    const executeStartPortalExcavation = () => {
      if (!mineBuildingRef.current) return;
      const targetPos = groundHitPoint.current;
      const exc = mineBuildingRef.current.initPortalExcavation(
        { x: targetPos.x, y: targetPos.y, z: targetPos.z },
        ghostRotationY.current
      );
      setPlayerState((prev) => ({
        ...prev,
        portalExcavation: { ...exc },
        equippedTool: 'pickaxe',
      }));
      if (onShowBanner) {
        onShowBanner('⛏️ Real Portal Excavation cut into bedrock! Strike with Pickaxe to dig rocks & gold. ⚠️ Unsupported mountain will creak & groan under stress!');
      }
    };

    if (onRegisterReinforceHandler) {
      onRegisterReinforceHandler(executeReinforcePortal);
    }
    if (onRegisterExcavateHandler) {
      onRegisterExcavateHandler(executeStartPortalExcavation);
    }

    const executeShaftDig = () => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers) return;
      const res = uLayers.digDown(playerStateRef.current.equippedTool, playerPos.current);
      if (res.newLayer) {
        if (onUpdateShaftLevel) {
          onUpdateShaftLevel(res.newLayer.level, uLayers.maxUnlockedLevel);
        }
      }
      if (onUpdateShaftLayers) {
        onUpdateShaftLayers([...uLayers.layers]);
      }
      if (res.rewardGold) {
        setPlayerState((prev) => ({
          ...prev,
          goldFound: (prev.goldFound || 0) + (res.rewardGold || 0),
          blocksDug: (prev.blocksDug || 0) + 1,
        }));
      }
      if (res.message && onShowBanner) {
        onShowBanner(res.message);
      }
    };

    const executeSubterraneanVoxelMine = (tool: string = 'pickaxe') => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers) return;

      const activeTool = playerStateRef.current.equippedTool || tool;

      if (uLayers.voxelEngine.targetedVoxel) {
        const res = uLayers.mineTargetedVoxel(activeTool);
        if (res.newLayer && onUpdateShaftLevel) {
          onUpdateShaftLevel(res.newLayer.level, uLayers.maxUnlockedLevel);
        }
        if (onUpdateShaftLayers) {
          onUpdateShaftLayers([...uLayers.layers]);
        }
        if (res.rewardGold || res.oreYield) {
          const goldGain = (res.rewardGold || 0) + (res.oreYield || 0);
          if (goldGain > 0 && onPayDirtHit) {
            onPayDirtHit(goldGain);
          }
          setPlayerState((prev) => ({
            ...prev,
            goldFound: (prev.goldFound || 0) + goldGain,
            blocksDug: (prev.blocksDug || 0) + 1,
          }));
        } else if (res.destroyed) {
          setPlayerState((prev) => ({
            ...prev,
            blocksDug: (prev.blocksDug || 0) + 1,
          }));
        }
        if (res.message && onShowBanner) {
          onShowBanner(res.message);
        }
      } else if (uLayers.currentLevel > 0) {
        // Continuous organic cavern wall strike with true volumetric mountain hole excavation!
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const origin = camera.position.clone();
        const wallRay = new THREE.Raycaster(origin, camDir, 0.1, 7.5);
        const cavernHit = uLayers.raycastCavernWall(wallRay, 6.0);

        const wallHit = cavernHit.hit && cavernHit.point
          ? cavernHit.point
          : new THREE.Vector3(
              playerPos.current.x + camDir.x * 4.5,
              playerPos.current.y + camDir.y * 4.5,
              playerPos.current.z + camDir.z * 4.5
            );

        const wallRes = uLayers.strikeCavernWall(wallHit, activeTool, cavernHit.normal);
        if (wallRes.oreYield > 0) {
          setPlayerState((prev) => ({
            ...prev,
            goldFound: (prev.goldFound || 0) + wallRes.oreYield,
            blocksDug: (prev.blocksDug || 0) + 1,
          }));
        } else {
          setPlayerState((prev) => ({
            ...prev,
            blocksDug: (prev.blocksDug || 0) + 1,
          }));
        }
        if (wallRes.message && onShowBanner) {
          onShowBanner(wallRes.message);
        }
      }
    };

    if (onRegisterStrikeVoxelHandler) {
      onRegisterStrikeVoxelHandler(() => executeSubterraneanVoxelMine(playerStateRef.current.equippedTool));
    }

    const executePlaceUndergroundTimberBent = () => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers || uLayers.currentLevel === 0) return;
      const wood = playerStateRef.current.woodPlanks || 0;
      if (wood < 1) {
        if (onShowBanner) onShowBanner('Need 1 Wood Plank to place a drift timber support bent.');
        return;
      }
      uLayers.voxelEngine.placeTimberBent(playerPos.current, playerYaw.current);
      setPlayerState((prev) => ({
        ...prev,
        woodPlanks: Math.max(0, (prev.woodPlanks || 0) - 1),
      }));
      soundEngine.playTrenchShoringConstruct();
      if (onShowBanner) {
        onShowBanner('🛡️ Square-Set Timber Bent Placed! Drift shored with pine posts and miner candle.');
      }
    };

    if (onRegisterPlaceTimberHandler) {
      onRegisterPlaceTimberHandler(executePlaceUndergroundTimberBent);
    }

    const executeTraverseShaft = (level: number) => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers) return;
      if (level === 0) {
        soundEngine.playLadderClimb();
        uLayers.setSubterraneanLevel(0);
        const surfY = getTerrainHeight(uLayers.surfacePos.x + 1.5, uLayers.surfacePos.z + 1.5);
        playerPos.current.set(uLayers.surfacePos.x + 1.5, surfY + 1.7, uLayers.surfacePos.z + 1.5);
        verticalVelocity.current = 0;
        isGrounded.current = true;
        isClimbingLadderRef.current = false;
        setPlayerState((prev) => ({
          ...prev,
          isInsideMine: false,
          currentMineLevel: 0,
          position: { x: playerPos.current.x, y: surfY, z: playerPos.current.z },
        }));
        if (onShowBanner) onShowBanner('Climbed shaft ladder out onto the desert surface.');
        if (onUpdateShaftLevel) onUpdateShaftLevel(0, uLayers.maxUnlockedLevel);
        return;
      }

      if (level > uLayers.maxUnlockedLevel) {
        if (onShowBanner) onShowBanner(`Layer ${level} has not been sunk yet! Dig the bedrock down first.`);
        return;
      }

      soundEngine.playLadderClimb();
      soundEngine.playDeepMineRumble();
      uLayers.setSubterraneanLevel(level);
      const targetLayer = uLayers.layers.find((l) => l.level === level);
      const floorY = uLayers.surfaceY - (targetLayer ? targetLayer.depthMeters : 8.5);
      playerPos.current.set(uLayers.surfacePos.x + 1.2, floorY + 1.7, uLayers.surfacePos.z + 1.2);
      verticalVelocity.current = 0;
      isGrounded.current = true;
      isClimbingLadderRef.current = false;
      setPlayerState((prev) => ({
        ...prev,
        isInsideMine: true,
        currentMineLevel: level,
        position: { x: playerPos.current.x, y: floorY, z: playerPos.current.z },
      }));
      if (onShowBanner) {
        onShowBanner(`Entered Layer ${level}: ${targetLayer?.name || ''} (-${targetLayer?.depthMeters.toFixed(1)}m)`);
      }
      if (onUpdateShaftLevel) onUpdateShaftLevel(level, uLayers.maxUnlockedLevel);
    };

    const executeExitShaft = () => {
      executeTraverseShaft(0);
    };

    if (onRegisterShaftTraverseHandler) {
      onRegisterShaftTraverseHandler(executeTraverseShaft);
    }
    if (onRegisterShaftExitHandler) {
      onRegisterShaftExitHandler(executeExitShaft);
    }
    if (onRegisterShaftDigHandler) {
      onRegisterShaftDigHandler(executeShaftDig);
    }

    const executeExcavateRoom = (dir: RoomDirection) => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers || uLayers.currentLevel === 0) return;
      const res = uLayers.strikeRoomFace(dir, playerStateRef.current.equippedTool, playerPos.current);
      if (res.completed && res.oreAwarded) {
        setPlayerState((prev) => ({
          ...prev,
          goldFound: (prev.goldFound || 0) + (res.oreAwarded || 0),
          blocksDug: (prev.blocksDug || 0) + 1,
        }));
      }
      if (onUpdateShaftLayers) {
        onUpdateShaftLayers([...uLayers.layers]);
      }
      if (res.message && onShowBanner) {
        onShowBanner(res.message);
      }
    };

    const executeTimberRoom = (dir: RoomDirection) => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers || uLayers.currentLevel === 0) return;
      const res = uLayers.timberRoom(dir);
      if (res.success) {
        if (onUpdateShaftLayers) {
          onUpdateShaftLayers([...uLayers.layers]);
        }
      }
      if (res.message && onShowBanner) {
        onShowBanner(res.message);
      }
    };

    const executeToggleCornishPump = () => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers) return;
      const running = uLayers.toggleCornishPump();
      if (onUpdateWaterTable) {
        onUpdateWaterTable({ ...uLayers.waterTable });
      }
      if (onShowBanner) {
        onShowBanner(running ? '⚙️ Cornish Steam Dewatering Pump started.' : '⚙️ Cornish Steam Dewatering Pump halted.');
      }
    };

    if (onRegisterExcavateRoomHandler) {
      onRegisterExcavateRoomHandler(executeExcavateRoom);
    }
    if (onRegisterTimberRoomHandler) {
      onRegisterTimberRoomHandler(executeTimberRoom);
    }
    if (onRegisterTogglePumpHandler) {
      onRegisterTogglePumpHandler(executeToggleCornishPump);
    }

    const executeShoreNearbyTrench = () => {
      const px = playerPos.current.x;
      const pz = playerPos.current.z;
      const nearbyHole = getNearbyDugHole(px, pz, 4.8);
      if (!nearbyHole) {
        if (onShowBanner) onShowBanner("No excavation trench nearby to shore. Dig a pit with Shovel [3] or Pickaxe [4]!");
        return;
      }

      const currentLayer = getGeologicalLayerAtDepth(nearbyHole.depth);
      const minRequiredDepth = currentLayer.id === 'strata_sand' ? 0.50 : 0.85;

      if (nearbyHole.depth < minRequiredDepth) {
        if (onShowBanner) onShowBanner(`Trench is too shallow to require timber shoring (depth < ${minRequiredDepth.toFixed(1)}m). Dig deeper first!`);
        return;
      }
      if (nearbyHole.isShored && nearbyHole.shoredUntilDepth && nearbyHole.shoredUntilDepth > nearbyHole.depth + 0.35) {
        if (onShowBanner) onShowBanner(`Trench is already securely timbered down to ${nearbyHole.shoredUntilDepth.toFixed(1)}m. Dig deeper before adding more framing!`);
        return;
      }

      const woodOwned = playerStateRef.current.woodPlanks ?? 0;
      const rocksOwned = playerStateRef.current.blocksDug ?? 0;

      if (currentLayer.id === 'strata_sand' && woodOwned < 2) {
        if (onShowBanner) onShowBanner(`Need 2 Timber Planks for Wooden Shoring in Sand! (You have ${woodOwned}). Salvage planks from sand washes or chop scrub.`);
        return;
      }
      if (currentLayer.id === 'strata_caliche' && (woodOwned < 1 || rocksOwned < 1)) {
        if (onShowBanner) onShowBanner(`Need 1 Timber Plank & 1 Quarry Stone for Caliche framing! (Wood: ${woodOwned}, Stones: ${rocksOwned}).`);
        return;
      }
      if ((currentLayer.id === 'strata_tuff' || currentLayer.id === 'strata_gneiss') && woodOwned < 1) {
        if (onShowBanner) onShowBanner(`Need 1 Timber Plank for subterranean rock shoring! (You have ${woodOwned}).`);
        return;
      }

      const res = shoreExcavationPit(nearbyHole.id, sceneRef.current || undefined);
      if (res.success) {
        soundEngine.playTrenchShoringConstruct();
        multiplayer.broadcastShore(
          nearbyHole.id,
          nearbyHole.x,
          nearbyHole.z,
          nearbyHole.stability,
          nearbyHole.shoredUntilDepth || nearbyHole.depth
        );
        setPlayerState((prev) => ({
          ...prev,
          woodPlanks: Math.max(0, (prev.woodPlanks ?? 0) - res.woodUsed),
          blocksDug: Math.max(0, (prev.blocksDug ?? 0) - res.rocksUsed),
        }));
        if (onShowBanner) onShowBanner(res.message);
      } else {
        if (onShowBanner) onShowBanner(res.message);
      }
    };

    if (onRegisterShoreHandler) {
      onRegisterShoreHandler(executeShoreNearbyTrench);
    }

    const executeShoot = () => {
      if (!combatManagerRef.current) return;
      const cam = cameraRef.current;
      if (!cam) return;
      const lookDir = new THREE.Vector3();
      cam.getWorldDirection(lookDir);

      if (playerStateRef.current.ammo > 0) {
        setPlayerState((prev) => ({
          ...prev,
          ammo: Math.max(0, prev.ammo - 1),
        }));
        combatManagerRef.current.playerShootRifle(cam.position, lookDir, (bandit) => {
          if (onTriggerHitMarker) onTriggerHitMarker();
          if (bandit.health <= 0) {
            if (onShowBanner) onShowBanner(`Outlaw Bandit Defeated! Picked up .44 ammunition.`);
            setPlayerState((prev) => ({
              ...prev,
              ammo: prev.ammo + 10,
              goldFound: prev.goldFound + 4,
              dynamite: prev.dynamite + 1,
            }));
          }
        });

        // High-caliber bullet strike against dangerous wildlife (rattlesnakes, scorpions)
        if (wildlifeManagerRef.current) {
          const wRay = new THREE.Raycaster(cam.position, lookDir, 0.5, 65.0);
          const wRes = wildlifeManagerRef.current.hitTestRay(wRay, 60.0, 50);
          if (wRes.hit) {
            if (onTriggerHitMarker) onTriggerHitMarker();
            if (wRes.message && onShowBanner) onShowBanner(wRes.message);
          }
        }

        // High-caliber bullet impact on desert foliage, rocks, and quartz outcroppings
        if (foliageManagerRef.current) {
          const rifleRay = new THREE.Raycaster(cam.position, lookDir, 0.5, 65.0);
          const fRes = foliageManagerRef.current.strikeFoliageOrRock(rifleRay, 60.0);
          if (fRes.hit && fRes.hitPoint && fRes.debrisType && miningSystemRef.current) {
            miningSystemRef.current.spawnDigDebris(fRes.hitPoint, fRes.debrisType, 1.8);
            if (fRes.goldAwarded && fRes.goldAwarded > 0) {
              soundEngine.playOreChime();
              miningSystemRef.current.spawnOreDrop(
                new THREE.Vector3(fRes.hitPoint.x, fRes.hitPoint.y + 0.4, fRes.hitPoint.z),
                'gold_nugget',
                fRes.goldAwarded
              );
            }
            if (fRes.message && onShowBanner) {
              onShowBanner(fRes.message);
            }
          }
        }
      }
    };

    const executeThrowDynamite = () => {
      if (!combatManagerRef.current) return;
      const cam = cameraRef.current;
      if (!cam) return;
      const lookDir = new THREE.Vector3();
      cam.getWorldDirection(lookDir);

      if (playerStateRef.current.dynamite > 0) {
        setPlayerState((prev) => ({
          ...prev,
          dynamite: Math.max(0, prev.dynamite - 1),
        }));
        combatManagerRef.current.throwDynamite(cam.position, lookDir);
      }
    };

    const executeStakeClaim = () => {
      if (!mineBuildingRef.current) return;
      const targetPos = groundHitPoint.current;
      const claimName = playerStateRef.current.activeClaim?.name || "Lost Dutchman Discovery Mine";
      const claim = mineBuildingRef.current.stakeClaim(claimName, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
      });

      setPlayerState((prev) => ({
        ...prev,
        activeClaim: claim,
        equippedTool: 'builder',
      }));

      if (onStakeClaim) {
        onStakeClaim(claimName, { x: targetPos.x, y: targetPos.y, z: targetPos.z });
      }

      if (onShowBanner) {
        onShowBanner(`Claim Staked! 40-Acre Perimeter marked with yellow survey cord.`);
      }
    };

    const executeBuildStructure = () => {
      if (!mineBuildingRef.current) return;
      const targetPos = groundHitPoint.current;
      const type = activeBuildingTypeRef.current || 'timber_portal';
      const blueprint = STRUCTURE_BLUEPRINTS[type];

      // Special Handling for Timber Portal Excavation:
      if (type === 'timber_portal') {
        const hasGold = (playerStateRef.current.goldFound || 0) >= blueprint.goldCost;
        const hasRocks = (playerStateRef.current.blocksDug || 0) >= blueprint.rockCost;

        if (!hasGold || !hasRocks) {
          // Player starts the rough bedrock excavation cut!
          const exc = mineBuildingRef.current.initPortalExcavation(
            { x: targetPos.x, y: targetPos.y, z: targetPos.z },
            ghostRotationY.current
          );
          setPlayerState((prev) => ({
            ...prev,
            portalExcavation: { ...exc },
            equippedTool: 'pickaxe',
          }));
          if (onShowBanner) {
            onShowBanner(
              `⛏️ Real Mine Portal Excavation Started! Strike rock face with Pickaxe [Click/Space] to dig. ⚠️ Unsupported mountain will creak & groan! Need ${blueprint.rockCost} Rocks & ${blueprint.goldCost} oz Gold to reinforce.`
            );
          }
          return;
        }
      }

      const woodCost = blueprint.woodCost || 0;
      if (
        (playerStateRef.current.goldFound || 0) < blueprint.goldCost ||
        (playerStateRef.current.blocksDug || 0) < blueprint.rockCost ||
        (playerStateRef.current.woodPlanks || 0) < woodCost
      ) {
        if (onShowBanner) {
          if (type === 'frontier_torch') {
            onShowBanner(`Need ${woodCost} Cut Wood Log to stake a Frontier Ground Torch! Harvest wood with Axe [X] or buy at Tortilla Flat.`);
          } else if (type === 'campfire') {
            onShowBanner(`Need ${blueprint.rockCost} Rocks & ${woodCost} Cut Wood Logs to build a Frontier Campfire! Chop trees at springs with Axe [X].`);
          } else if (type === 'prospector_camp') {
            onShowBanner(`Need ${blueprint.goldCost} oz Gold, ${blueprint.rockCost} Rocks & ${woodCost} Wood to pitch an Outpost Camp!`);
          } else {
            onShowBanner(`Need ${blueprint.goldCost} Gold, ${blueprint.rockCost} Rocks & ${woodCost} Wood to build ${blueprint.name}!`);
          }
        }
        return;
      }

      const structure = mineBuildingRef.current.buildStructure(
        type,
        { x: targetPos.x, y: targetPos.y, z: targetPos.z },
        ghostRotationY.current
      );

      // If staking torches and player still has wood, keep torch equipped so they can stake 3 or 4 in a row!
      const remainingWood = Math.max(0, (playerStateRef.current.woodPlanks || 0) - woodCost);
      const keepTorchEquipped = type === 'frontier_torch' && remainingWood >= (blueprint.woodCost || 1);

      if (!keepTorchEquipped && mineBuildingRef.current) {
        mineBuildingRef.current.hideGhost();
      }

      setPlayerState((prev) => ({
        ...prev,
        goldFound: Math.max(0, (prev.goldFound || 0) - blueprint.goldCost),
        blocksDug: Math.max(0, (prev.blocksDug || 0) - blueprint.rockCost),
        woodPlanks: remainingWood,
        builtStructures: [...(prev.builtStructures || []), structure],
        equippedTool: keepTorchEquipped ? 'builder' : 'pickaxe',
      }));

      if (onBuildStructure) {
        onBuildStructure(type, { x: targetPos.x, y: targetPos.y, z: targetPos.z }, ghostRotationY.current);
      }

      // If building a mine portal or shaft, anchor subterranean layers to this structure!
      if (type === 'timber_portal' || type === 'deep_shaft' || type === 'headframe_hoist') {
        const sY = getTerrainHeight(targetPos.x, targetPos.z);
        if (undergroundLayersRef.current) {
          undergroundLayersRef.current.initAtPosition({ x: targetPos.x, y: sY, z: targetPos.z }, sY);
          if (onUpdateShaftLayers) onUpdateShaftLayers(undergroundLayersRef.current.layers);
          if (onUpdateShaftLevel) onUpdateShaftLevel(0, undergroundLayersRef.current.maxUnlockedLevel);
        }
      }

      if (onShowBanner) {
        if (type === 'frontier_torch') {
          if (keepTorchEquipped) {
            onShowBanner(`🔥 Ground Torch Staked! Warm firelight illuminates the area. Aim & Left-Click to stake another torch (${remainingWood} wood left, Esc to finish).`);
          } else {
            onShowBanner(`🔥 Frontier Ground Torch Staked! Beautiful warm firelight illuminates your camp and surroundings.`);
          }
        } else if (type === 'campfire') {
          onShowBanner(`🔥 Frontier Campfire Built! Crackling mesquite embers provide light & warmth. Press [E] to rest, brew coffee, and fill canteen.`);
        } else if (type === 'prospector_camp') {
          onShowBanner(`⛺ Prospector Outpost Camp Pitched! Canvas tent, bedroll, and campfire ready for wilderness shelter.`);
        } else {
          onShowBanner(`${blueprint.name} Constructed on your Claim!`);
        }
      }
    };

    // Event Handlers (Keyboard, Mouse PointerLock, Touch, Mining & Combat)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOverRef.current) return;
      keysPressed.current[e.code] = true;
      soundEngine.startAmbiance();

      if (e.code === 'Escape') {
        if (playerStateRef.current.equippedTool === 'builder') {
          if (mineBuildingRef.current) {
            mineBuildingRef.current.hideGhost();
          }
          setPlayerState((prev) => ({ ...prev, equippedTool: 'pickaxe' }));
        }
      }

      if (e.code === 'KeyE') {
        checkInteractions(true);
      }
      if (e.code === 'Space') {
        const uLayers = undergroundLayersRef.current;
        if (uLayers && uLayers.isNearShaftLadder(playerPos.current, 1.45)) {
          isClimbingLadderRef.current = true;
          isGrounded.current = false;
        } else if (isGrounded.current) {
          verticalVelocity.current = 7.5;
          isGrounded.current = false;
          soundEngine.playJump();
        }
      }
      if (e.code === 'KeyR') {
        ghostRotationY.current = (ghostRotationY.current + Math.PI / 4) % (Math.PI * 2);
      }
      if (e.code === 'KeyB') {
        if (onOpenBuilder) onOpenBuilder();
      }
      if (e.code === 'KeyC') {
        if (onOpenCamp) onOpenCamp();
      }
      if (e.code === 'KeyT') {
        if (undergroundLayersRef.current && undergroundLayersRef.current.currentLevel > 0) {
          executePlaceUndergroundTimberBent();
        } else {
          executeShoreNearbyTrench();
        }
      }

      if (e.code === 'KeyF') {
        if (playerStateRef.current.carriedObject) {
          executeStowRock();
          return;
        }
      }

      // Hotkeys for tools
      const toolHotkeys: Record<string, PlayerState['equippedTool']> = {
        Backquote: 'hands',
        Digit1: 'compass',
        Digit2: 'lantern',
        Digit3: 'shovel',
        Digit4: 'pickaxe',
        Digit5: 'rifle',
        Digit6: 'dynamite',
        Digit7: 'detector',
        Digit8: 'binoculars',
        Digit9: 'stake',
        Digit0: 'builder',
        KeyX: 'axe',
      };
      if (toolHotkeys[e.code]) {
        setPlayerState((prev) => ({
          ...prev,
          equippedTool: toolHotkeys[e.code],
        }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current || isGameOverRef.current) return;
      const sensitivity = 0.0022;
      playerYaw.current -= e.movementX * sensitivity;
      playerPitch.current -= e.movementY * sensitivity;
      playerPitch.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, playerPitch.current));
    };

    const isLockPending = { current: false };

    const safeRequestPointerLock = () => {
      if (isUIOpenRef.current || isGameOverRef.current) return;
      if (document.pointerLockElement === renderer.domElement) {
        isPointerLocked.current = true;
        return;
      }
      if (isLockPending.current) return;
      if (!renderer.domElement.requestPointerLock) return;

      isLockPending.current = true;
      try {
        const lockPromise = renderer.domElement.requestPointerLock() as unknown;
        if (lockPromise && typeof (lockPromise as Promise<void>).then === 'function') {
          (lockPromise as Promise<void>)
            .then(() => {
              isLockPending.current = false;
              isPointerLocked.current = document.pointerLockElement === renderer.domElement;
            })
            .catch((_err: unknown) => {
              // Expected browser rejection when user exits lock early or presses ESC:
              // "DOMException: The user has exited the lock before this request was completed."
              isLockPending.current = false;
              isPointerLocked.current = false;
            });
        } else {
          setTimeout(() => {
            isLockPending.current = false;
          }, 300);
        }
      } catch (_err) {
        isLockPending.current = false;
      }
    };

    const executePrimaryAction = () => {
      if (isUIOpenRef.current || isGameOverRef.current) return;
      soundEngine.startAmbiance();
      toolSwingProgress.current = 1.0; // Trigger physical 3D tool swing animation

      if (playerStateRef.current.carriedObject) {
        executeThrowRock();
        return;
      }

      const tool = playerStateRef.current.equippedTool;
      if (tool === 'hands') {
        executePickUpRock();
        return;
      }

      if (
        undergroundLayersRef.current &&
        undergroundLayersRef.current.currentLevel > 0
      ) {
        if (tool === 'pickaxe' || tool === 'shovel' || tool === 'dynamite') {
          executeSubterraneanVoxelMine(tool);
          return;
        }
      }
      if (tool === 'shovel') {
        executeShovelDig();
      } else if (tool === 'axe') {
        executeChop();
      } else if (tool === 'pickaxe') {
        executeDig();
      } else if (tool === 'rifle') {
        executeShoot();
      } else if (tool === 'dynamite') {
        executeThrowDynamite();
      } else if (tool === 'stake') {
        executeStakeClaim();
      } else if (tool === 'builder') {
        executeBuildStructure();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isUIOpenRef.current || isGameOverRef.current) return;

      if (e.button === 2) {
        if (playerStateRef.current.carriedObject) {
          executePlaceRock();
          return;
        }
      }

      if (e.button !== 0) return; // Left click only

      safeRequestPointerLock();
      executePrimaryAction();
    };

    const executeJumpAction = () => {
      if (isGameOverRef.current) return;
      if (isGrounded.current) {
        verticalVelocity.current = 7.5;
        isGrounded.current = false;
        soundEngine.playJump();
      }
    };

    if (onRegisterMobileActionHandler) {
      onRegisterMobileActionHandler(executePrimaryAction);
    }
    if (onRegisterMobileJumpHandler) {
      onRegisterMobileJumpHandler(executeJumpAction);
    }
    if (onRegisterMobileInteractHandler) {
      onRegisterMobileInteractHandler(() => checkInteractions(true));
    }
    if (onRegisterMobileMoveHandler) {
      onRegisterMobileMoveHandler((move) => {
        virtualJoystickInput.current = move;
      });
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (playerStateRef.current.carriedObject) {
        executePlaceRock();
      }
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      isPointerLocked.current = locked;
      if (locked) {
        isLockPending.current = false;
      }
    };

    const handlePointerLockError = () => {
      isPointerLocked.current = false;
      isLockPending.current = false;
    };

    // Mobile / Touch controls (Drag-to-look camera tracking)
    let lookTouchId: number | null = null;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      soundEngine.startAmbiance();
      // Find a touch that isn't on an interactive HUD button or in the bottom-left joystick area
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // If lookTouchId is already tracked, skip
        if (lookTouchId !== null) continue;
        
        // Check if touch is in bottom-left quarter (reserved for joystick)
        const isBottomLeft = touch.clientX < window.innerWidth * 0.45 && touch.clientY > window.innerHeight * 0.5;
        if (!isBottomLeft) {
          lookTouchId = touch.identifier;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchId) {
          const deltaX = touch.clientX - lastTouchX;
          const deltaY = touch.clientY - lastTouchY;
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;

          const sensitivity = 0.005;
          playerYaw.current -= deltaX * sensitivity;
          playerPitch.current -= deltaY * sensitivity;
          playerPitch.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, playerPitch.current));
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    renderer.domElement.addEventListener('touchstart', handleTouchStart);
    renderer.domElement.addEventListener('touchmove', handleTouchMove);
    renderer.domElement.addEventListener('touchend', handleTouchEnd);
    renderer.domElement.addEventListener('touchcancel', handleTouchEnd);

    // Resize & Orientation Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const onOrientationChange = () => {
      handleResize();
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 350);
    };
    window.addEventListener('orientationchange', onOrientationChange);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    // ==========================================
    // Interaction Check Function
    // ==========================================
    const checkInteractions = (executeAction = false) => {
      const px = playerPos.current.x;
      const pz = playerPos.current.z;
      const isUnderground = (undergroundLayersRef.current?.currentLevel || 0) > 0;

      // -1. Carried Object (Rock) Placement & Stowing
      if (playerStateRef.current.carriedObject) {
        const carried = playerStateRef.current.carriedObject;
        if (executeAction) {
          executePlaceRock();
        } else {
          onPromptInteract(
            `🪨 Set Down ${carried.name} [E / Right-Click] | Throw [Left-Click] | Stow [F]`,
            () => executePlaceRock()
          );
        }
        return;
      }

      // -1b. Bare Hands Rock Pickup Detection
      if (playerStateRef.current.equippedTool === 'hands' && !playerStateRef.current.carriedObject) {
        const cam = cameraRef.current;
        const lookDir = new THREE.Vector3();
        if (cam) cam.getWorldDirection(lookDir);
        else {
          lookDir.set(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current));
        }
        const origin = cam ? cam.position.clone() : playerPos.current.clone().add(new THREE.Vector3(0, 1.4, 0));
        const handsRay = new THREE.Raycaster(origin, lookDir, 0.1, 3.8);

        let rockTargeted = false;
        let canLift = true;
        let weightLbs = 20;

        if (movableRockManagerRef.current) {
          const mHit = movableRockManagerRef.current.raycastMovableRock(handsRay, 3.5);
          if (mHit.hit && mHit.rock) {
            rockTargeted = true;
            canLift = mHit.canLift ?? true;
            weightLbs = mHit.weightLbs ?? mHit.rock.weightLbs;
          }
        }
        if (!rockTargeted && foliageManagerRef.current) {
          const bHit = foliageManagerRef.current.checkNearbyBoulder(handsRay, 3.5);
          if (bHit && bHit.hit) {
            rockTargeted = true;
            canLift = bHit.canLift;
            weightLbs = bHit.weightLbs;
          }
        }

        if (rockTargeted) {
          if (executeAction) {
            executePickUpRock();
          } else {
            if (canLift) {
              onPromptInteract(`🪨 Lift Stone (${weightLbs} lbs) [E / Left-Click]`, () => executePickUpRock());
            } else {
              onPromptInteract(`🚫 Boulder Too Heavy (~${weightLbs.toLocaleString()} lbs) — Use Pickaxe [4]`, () => executePickUpRock());
            }
          }
          return;
        }
      }

      // Geotechnical Excavation Trench check (only active on surface terrain)
      const nearbyTrench = isUnderground ? null : getNearbyDugHole(px, pz, 4.8);
      const currentLayer = nearbyTrench ? getGeologicalLayerAtDepth(nearbyTrench.depth) : null;
      const minRequiredDepth = currentLayer?.id === 'strata_sand' ? 0.50 : 0.85;
      const shoredUntil = nearbyTrench?.shoredUntilDepth || 0;
      const needsNextShore = Boolean(
        nearbyTrench &&
        nearbyTrench.depth >= minRequiredDepth &&
        (!nearbyTrench.isShored || nearbyTrench.depth >= shoredUntil - 0.25)
      );

      let woodNeeded = 1;
      let rocksNeeded = 0;
      let materialType: 'wood' | 'stone' | 'timber_rock' | 'none' = 'wood';

      if (currentLayer) {
        if (currentLayer.id === 'strata_sand') {
          woodNeeded = 2;
          rocksNeeded = 0;
          materialType = 'wood';
        } else if (currentLayer.id === 'strata_caliche') {
          woodNeeded = 1;
          rocksNeeded = 1;
          materialType = 'timber_rock';
        } else if (currentLayer.id === 'strata_tuff' || currentLayer.id === 'strata_gneiss') {
          woodNeeded = 1;
          rocksNeeded = 0;
          materialType = 'wood';
        } else if (currentLayer.shoringRequirement === 'none') {
          woodNeeded = 0;
          rocksNeeded = 0;
          materialType = 'none';
        }
      }

      const playerWood = playerStateRef.current.woodPlanks ?? 0;
      const playerRocks = playerStateRef.current.blocksDug ?? 0;
      const hasMaterials = playerWood >= woodNeeded && playerRocks >= rocksNeeded;

      if (onNearbyTrenchChange) {
        if (nearbyTrench && nearbyTrench.depth >= minRequiredDepth) {
          onNearbyTrenchChange({
            depth: nearbyTrench.depth,
            stability: nearbyTrench.stability,
            isShored: nearbyTrench.isShored,
            shoredUntilDepth: nearbyTrench.shoredUntilDepth,
            rocksNeeded,
            woodNeeded,
            strataName: currentLayer?.name || 'Stratum',
            strataId: currentLayer?.id || 'strata_sand',
            materialType,
            strataAdvice: currentLayer?.shoringAdvice || '',
            canShore: needsNextShore && hasMaterials,
          });
        } else {
          onNearbyTrenchChange(null);
        }
      }

      // 0. Subterranean Mine Shaft Layer Interactions
      if (undergroundLayersRef.current) {
        const uLayers = undergroundLayersRef.current;
        if (onUpdateShaftSinkingStats) {
          // Never force shaft sinking gauge on the surface unless player is actively targeting a mini-voxel
          const isTargetingVoxel = !!uLayers.voxelEngine.targetedVoxel;
          const isUnderground = uLayers.currentLevel > 0;
          if (isUnderground || isTargetingVoxel) {
            onUpdateShaftSinkingStats(uLayers.voxelEngine.getShaftSinkingStats());
          } else {
            onUpdateShaftSinkingStats(null);
          }
        }

        // Check if targeting a granular mini-voxel
        const targetedVoxel = uLayers.voxelEngine.targetedVoxel;
        if (targetedVoxel) {
          let label = `Mine Voxel`;
          if (targetedVoxel.isFloor) {
            label = `⛏️ Sink Shaft Floor (-${targetedVoxel.strataDepth.toFixed(1)}m)`;
          } else if (targetedVoxel.type === 'quartz_gold') {
            label = `⛏️ Bonanza Quartz-Gold Vein`;
          } else if (targetedVoxel.type === 'silver_ore') {
            label = `⛏️ Silver-Galena Ore Pocket`;
          } else if (targetedVoxel.type === 'amethyst') {
            label = `⛏️ Imperial Amethyst Geode`;
          } else if (targetedVoxel.type === 'copper') {
            label = `⛏️ Native Copper-Gold Lode`;
          } else if (targetedVoxel.type === 'basalt') {
            label = `⛏️ Dense Basalt Stratum`;
          } else {
            const typeName = targetedVoxel.type.replace('_', ' ');
            label = `⛏️ Carve Drift (${typeName.charAt(0).toUpperCase() + typeName.slice(1)})`;
          }

          if (executeAction) {
            executeSubterraneanVoxelMine(playerStateRef.current.equippedTool);
          } else {
            onPromptInteract(label, () => executeSubterraneanVoxelMine(playerStateRef.current.equippedTool));
          }
          return;
        }

        if (uLayers.currentLevel > 0) {

          // Check proximity to excavation pit in center of chamber
          if (uLayers.isNearExcavationPit(playerPos.current)) {
            if (uLayers.currentLevel < 4) {
              if (executeAction) {
                executeShaftDig();
              } else {
                onPromptInteract(`Dig Bedrock Down to Layer ${uLayers.currentLevel + 1} [E]`, () => executeShaftDig());
              }
              return;
            } else {
              if (executeAction) {
                executeShaftDig();
              } else {
                onPromptInteract('Mine Lost Dutchman Mother Lode [E]', () => executeShaftDig());
              }
              return;
            }
          }

          // Check proximity to shaft ladder / hoist
          if (uLayers.isNearShaft(playerPos.current, 4.5)) {
            const isAtLadder = uLayers.isNearShaftLadder(playerPos.current, 1.8);
            if (uLayers.currentLevel === 1) {
              if (executeAction) {
                executeTraverseShaft(0);
              } else {
                const promptText = isAtLadder
                  ? '🪜 Shaft Ladder: [W / Space] Climb Up  •  [S] Climb Down  •  [E] Ascend to Surface'
                  : 'Climb Shaft Ladder to Desert Surface [E]';
                onPromptInteract(promptText, () => executeTraverseShaft(0));
              }
              return;
            } else {
              if (executeAction) {
                executeTraverseShaft(uLayers.currentLevel - 1);
              } else {
                const promptText = isAtLadder
                  ? `🪜 Shaft Ladder: [W / Space] Climb Up  •  [S] Climb Down  •  [E] Ascend to Layer ${uLayers.currentLevel - 1}`
                  : `Climb Shaft Ladder to Layer ${uLayers.currentLevel - 1} [E]`;
                onPromptInteract(promptText, () => executeTraverseShaft(uLayers.currentLevel - 1));
              }
              return;
            }
          }

          // Check if looking at cavern bedrock wall or existing excavated hole
          if (cameraRef.current) {
            const cam = cameraRef.current;
            const lookDir = new THREE.Vector3();
            cam.getWorldDirection(lookDir);
            const wallRay = new THREE.Raycaster(cam.position, lookDir, 0.1, 6.0);
            const cavernHit = uLayers.raycastCavernWall(wallRay, 5.0);
            if (cavernHit.hit) {
              const hole = cavernHit.existingHole;
              let wallLabel = `⛏️ Dig Cavern Wall into Bedrock [Left Click / E]`;
              if (hole) {
                if (hole.hasExposedGoldVein) {
                  wallLabel = `⛏️ Deepen Mine Drift (Exposed Gold Vein, -${hole.depth.toFixed(1)}m) [Left Click / E]`;
                } else {
                  wallLabel = `⛏️ Dig Deeper into Cavern Wall (-${hole.depth.toFixed(1)}m) [Left Click / E]`;
                }
              }

              if (executeAction) {
                executeSubterraneanVoxelMine(playerStateRef.current.equippedTool);
              } else {
                onPromptInteract(wallLabel, () => executeSubterraneanVoxelMine(playerStateRef.current.equippedTool));
              }
              return;
            }
          }
        } else {
          // On surface - check proximity to ANY dug mine pit (depth >= 0.8m) OR shaft collar
          const isNearAnyPit =
            (nearbyTrench && nearbyTrench.depth >= 0.8) ||
            uLayers.isNearShaft(playerPos.current, 5.5) ||
            activeDugHoles.some((h) => h.depth >= 0.8 && Math.hypot(px - h.x, pz - h.z) <= 5.5);

          if (isNearAnyPit) {
            // Anchor subterranean system to this pit collar if not already anchored
            const pitHole =
              (nearbyTrench && nearbyTrench.depth >= 0.8 ? nearbyTrench : null) ||
              activeDugHoles.find((h) => h.depth >= 0.8 && Math.hypot(px - h.x, pz - h.z) <= 5.5);

            if (
              pitHole &&
              (Math.abs(uLayers.surfacePos.x - pitHole.x) > 0.5 || Math.abs(uLayers.surfacePos.z - pitHole.z) > 0.5)
            ) {
              const hBaseY = getTerrainHeight(pitHole.x, pitHole.z);
              uLayers.initAtPosition({ x: pitHole.x, y: hBaseY, z: pitHole.z }, hBaseY);
              if (onUpdateShaftLayers) onUpdateShaftLayers(uLayers.layers);
              if (onUpdateShaftLevel) onUpdateShaftLevel(0, uLayers.maxUnlockedLevel);
            }

            if (executeAction) {
              executeTraverseShaft(1);
            } else {
              const isAtLadder = uLayers.isNearShaftLadder(playerPos.current, 1.8);
              const promptText = isAtLadder
                ? '🪜 Shaft Ladder: [S] Climb Down  •  [E] Descend to Layer 1'
                : 'Descend into Subterranean Mine Shaft (Layer 1) [E]';
              onPromptInteract(promptText, () =>
                executeTraverseShaft(1)
              );
            }
            return;
          }
        }
      }

      // 1. Water refill spots
      for (const wPoint of landmarkMeshes.waterRefillPoints) {
        const dist = Math.hypot(px - wPoint.x, pz - wPoint.z);
        if (dist < 4.5) {
          if (executeAction) {
            onRefillWater();
          } else {
            onPromptInteract('Drink from Fresh Spring [E]', () => onRefillWater());
          }
          return;
        }
      }

      // 2. Mining Claim Monument (Dutchman Ridge Mine)
      const distToClaim = Math.hypot(px - 155, pz - 105);
      if (distToClaim < 8.0) {
        const isClaimed = miningSystemRef.current?.claim.isClaimed;
        if (!isClaimed) {
          const handleClaimDutchman = () => {
            const ok = miningSystemRef.current?.claimMine();
            if (ok) {
              if (onShowBanner) onShowBanner("Claim Staked! Dutchman's Mine is yours to excavate.");
              setPlayerState((prev) => ({
                ...prev,
                activeClaim: { ...miningSystemRef.current!.claim },
              }));
              if (onStakeClaim) {
                onStakeClaim(miningSystemRef.current!.claim.name, miningSystemRef.current!.claim.position);
              }
            }
          };

          if (executeAction) {
            handleClaimDutchman();
          } else {
            onPromptInteract('Stake Mining Claim [E]', handleClaimDutchman);
          }
          return;
        } else {
          if (!executeAction) {
            onPromptInteract('Mine Claimed: Dig with Pickaxe [3] or Nitro Dynamite [5]', () => {});
          }
          return;
        }
      }

      // 2b. Nearby Built Mine Structures
      if (mineBuildingRef.current) {
        const nearby = mineBuildingRef.current.getNearbyStructure(playerPos.current, 4.5);
        if (nearby) {
          if (nearby.type === 'sluice_box') {
            if (executeAction) {
              if (playerStateRef.current.blocksDug >= 5) {
                soundEngine.playSluiceWash();
                setPlayerState((prev) => ({
                  ...prev,
                  blocksDug: prev.blocksDug - 5,
                  goldFound: prev.goldFound + 2.5,
                }));
                if (onShowBanner) onShowBanner("Washed 5 Dug Blocks in Sluice: Extracted +2.5 oz Gold Nuggets!");
              } else {
                if (onShowBanner) onShowBanner("Need at least 5 Dug Blocks to wash in Sluice. Dig with Pickaxe [3]!");
              }
            } else {
              onPromptInteract('Wash Ore in Sluice Box [E] (-5 Blocks -> +2.5 oz Gold)', () => checkInteractions(true));
            }
            return;
          } else if (nearby.type === 'assay_forge') {
            if (executeAction) {
              if (playerStateRef.current.goldFound >= 10) {
                soundEngine.playForgeSmelt();
                setPlayerState((prev) => ({
                  ...prev,
                  goldFound: prev.goldFound - 10,
                  bullionBars: (prev.bullionBars || 0) + 1,
                }));
                if (onShowBanner) onShowBanner("Smelted 10 oz Gold into an Official Stamped Bullion Bar! (+1 Bar)");
              } else {
                if (onShowBanner) onShowBanner("Need 10 oz Gold to smelt a Bullion Bar at Assay Forge!");
              }
            } else {
              onPromptInteract('Smelt Bullion Bar at Assay Forge [E] (-10 oz Gold -> 1 Bar)', () => checkInteractions(true));
            }
            return;
          } else if (nearby.type === 'headframe_hoist') {
            const enterAction = () => {
              const uLayersInst = undergroundLayersRef.current;
              if (uLayersInst) {
                const sY = getTerrainHeight(nearby.position.x, nearby.position.z);
                if (
                  Math.hypot(
                    uLayersInst.surfacePos.x - nearby.position.x,
                    uLayersInst.surfacePos.z - nearby.position.z
                  ) > 1.0
                ) {
                  uLayersInst.initAtPosition(
                    { x: nearby.position.x, y: sY, z: nearby.position.z },
                    sY
                  );
                  if (onUpdateShaftLayers) onUpdateShaftLayers(uLayersInst.layers);
                  if (onUpdateShaftLevel) onUpdateShaftLevel(0, uLayersInst.maxUnlockedLevel);
                }
                executeTraverseShaft(1);
              }
            };
            if (executeAction) {
              enterAction();
            } else {
              onPromptInteract('Ride Headframe Hoist into Shaft [E]', enterAction);
            }
            return;
          } else if (nearby.type === 'rail_track') {
            if (executeAction) {
              soundEngine.playMinecart();
              setPlayerState((prev) => ({
                ...prev,
                goldFound: prev.goldFound + 1.5,
              }));
              if (onShowBanner) onShowBanner("Pushed Ore Minecart: Hauled rubble to tailings dump! (+1.5 oz Gold)");
            } else {
              onPromptInteract('Push Ore Minecart along Rail [E]', () => checkInteractions(true));
            }
            return;
          } else if (
            nearby.type === 'timber_portal' ||
            nearby.type === 'deep_shaft'
          ) {
            const label =
              nearby.type === 'timber_portal'
                ? 'Enter Timber Mine Portal Shaft [E]'
                : 'Descend Deep Bedrock Shaft [E]';

            const enterAction = () => {
              const uLayersInst = undergroundLayersRef.current;
              if (uLayersInst) {
                const sY = getTerrainHeight(nearby.position.x, nearby.position.z);
                if (
                  Math.hypot(
                    uLayersInst.surfacePos.x - nearby.position.x,
                    uLayersInst.surfacePos.z - nearby.position.z
                  ) > 1.0
                ) {
                  uLayersInst.initAtPosition(
                    { x: nearby.position.x, y: sY, z: nearby.position.z },
                    sY
                  );
                  if (onUpdateShaftLayers) onUpdateShaftLayers(uLayersInst.layers);
                  if (onUpdateShaftLevel) onUpdateShaftLevel(0, uLayersInst.maxUnlockedLevel);
                }
                executeTraverseShaft(1);
              }
            };

            if (executeAction) {
              enterAction();
            } else {
              onPromptInteract(label, enterAction);
            }
            return;
          }
        }
      }

      // 3. Lost Dutchman Mine entrance
      const distToMine = Math.hypot(px - 160, pz - 110);
      if (distToMine < 6.5) {
        if (executeAction) {
          onEnterMine();
        } else {
          onPromptInteract('Enter Lost Dutchman Mine [E]', () => onEnterMine());
        }
        return;
      }

      // 3b. Historic Town of Tortilla Flat (Saloon, Mercantile & Campfire)
      const distToTownFire = Math.hypot(px - (-12.5), pz - (-136.5));
      if (distToTownFire < 3.8) {
        const handleRestFire = () => {
          soundEngine.playCampfire();
          setPlayerState((prev) => ({
            ...prev,
            health: Math.min(100, (prev.health || 0) + 25),
          }));
          if (onShowBanner) onShowBanner('Rested by the Tortilla Flat campfire (+25 Health)!');
        };
        if (executeAction) {
          handleRestFire();
        } else {
          onPromptInteract('Rest & Warm Up by Town Campfire [E]', handleRestFire);
        }
        return;
      }

      const distToSaloon = Math.hypot(px - (-15), pz - (-150));
      if (distToSaloon < 24 && onOpenTortillaFlat) {
        if (executeAction) {
          onOpenTortillaFlat();
        } else {
          onPromptInteract('Enter Tortilla Flat Saloon & Mercantile [E]', () => onOpenTortillaFlat());
        }
        return;
      }

      // 3b-2. Sonoran Natural Tinajas, Springs, and Arroyo Wash Channels
      if (hydrologyEngineRef.current) {
        const waterInfo = hydrologyEngineRef.current.queryWaterAtPosition(px, pz);
        if (waterInfo.hasWater && waterInfo.canDrink) {
          const handleWaterInteract = () => {
            soundEngine.playWaterRefill();
            soundEngine.playWaterSplash();
            const isDirty = waterInfo.waterQuality === 'stagnant_alkali' || waterInfo.waterQuality === 'flood_silt';
            const healthDelta = isDirty ? -5 : 5;
            const hydrationGain = isDirty ? 35 : 55;
            setPlayerState((prev) => ({
              ...prev,
              hydration: Math.min(100, (prev.hydration || 0) + hydrationGain),
              health: Math.min(100, Math.max(10, (prev.health || 100) + healthDelta)),
              canteenOunces: 32,
            }));
            if (onShowBanner) {
              if (isDirty) {
                onShowBanner(`⚠️ Drank from silty ${waterInfo.sourceName} (+${hydrationGain}% Hydration, -5 Health). Canteen Refilled!`);
              } else {
                onShowBanner(`💧 Refreshed at ${waterInfo.sourceName}! Canteen Filled (32 oz), +${hydrationGain}% Hydration.`);
              }
            }
          };

          if (executeAction) {
            handleWaterInteract();
          } else {
            onPromptInteract(`Drink & Fill Canteen at ${waterInfo.sourceName} [E]`, handleWaterInteract);
          }
          return;
        }
      }

      // 3c. Player-Built Campfires & Prospector Camps
      if (playerStateRef.current.builtStructures?.length) {
        for (const s of playerStateRef.current.builtStructures) {
          if (s.type === 'campfire' || s.type === 'prospector_camp') {
            const dist = Math.hypot(px - s.position.x, pz - s.position.z);
            if (dist < 4.2) {
              const fuel = s.fuelHoursRemaining !== undefined ? s.fuelHoursRemaining : 12.0;
              const isFireLit = s.isLit !== false && fuel > 0;
              const woodOwned = playerStateRef.current.woodPlanks || 0;

              if (!isFireLit) {
                const handleRekindle = () => {
                  if (woodOwned < 1) {
                    if (onShowBanner) {
                      onShowBanner(`⚠️ Campfire burned out! Chop cottonwood or mesquite trees near desert springs with Axe [X] for cut wood.`);
                    }
                    return;
                  }
                  soundEngine.playCampfire();
                  const newFuel = Math.min(s.maxFuelHours || 24.0, 8.0);
                  if (mineBuildingRef.current) {
                    mineBuildingRef.current.updateCampfireVisuals(s.id, true, newFuel);
                  }
                  setPlayerState((prev) => ({
                    ...prev,
                    woodPlanks: Math.max(0, (prev.woodPlanks || 0) - 1),
                    builtStructures: (prev.builtStructures || []).map((item) =>
                      item.id === s.id
                        ? { ...item, fuelHoursRemaining: newFuel, isLit: true }
                        : item
                    ),
                  }));
                  if (onShowBanner) onShowBanner(`🔥 Rekindled ${s.name} with 1 Wood Log! Fire blazing (+8h fuel).`);
                };

                if (executeAction) {
                  handleRekindle();
                } else {
                  if (woodOwned >= 1) {
                    onPromptInteract(`🪵 Rekindle Campfire with 1 Cut Wood [E] (${woodOwned} logs owned)`, handleRekindle);
                  } else {
                    onPromptInteract(`🔥 Campfire Burned Out — Need Cut Wood [Axe: X] [E]`, handleRekindle);
                  }
                }
                return;
              }

              // Fire is lit: allow resting and warming
              const handleRest = () => {
                soundEngine.playCampfire();
                soundEngine.playWaterRefill();
                setPlayerState((prev) => ({
                  ...prev,
                  health: Math.min(100, (prev.health || 0) + 35),
                  hydration: Math.min(100, (prev.hydration || 0) + 30),
                  canteenOunces: 32,
                }));
                if (onShowBanner) onShowBanner(`🔥 Rested by ${s.name}! Coffee brewed & canteen filled (${fuel.toFixed(1)}h fuel remaining).`);
              };

              if (executeAction) {
                handleRest();
              } else {
                onPromptInteract(`Rest by Fire & Brew Coffee [E] (${fuel.toFixed(1)}h fuel)`, handleRest);
              }
              return;
            }
          }
        }
      }

      // 4. Landmarks & Clues
      for (const lm of landmarks) {
        const dist = Math.hypot(px - lm.position.x, pz - lm.position.z);
        if (dist < lm.radius) {
          const associatedClue = clues.find((c) => c.landmarkId === lm.id);
          if (associatedClue && !associatedClue.discovered) {
            if (executeAction) {
              onDiscoverClue(associatedClue.id, lm.id);
            } else {
              onPromptInteract(`Inspect ${associatedClue.title} [E]`, () => {
                onDiscoverClue(associatedClue.id, lm.id);
              });
            }
            return;
          }
        }
      }

      // 5. Buried Gold Deposits (Pickaxe)
      for (const gd of goldDepositsRef.current) {
        if (!gd.mined) {
          const dist = Math.hypot(px - gd.position.x, pz - gd.position.z);
          if (dist < 3.5) {
            const handleMineDeposit = () => {
              onMineDeposit(gd.id, gd.ounces);
              gd.mined = true;
              gd.mesh.scale.set(0, 0, 0);
              gd.mesh.visible = false;
              soundEngine.playVoxelDig();
              soundEngine.playOreChime();
              if (miningSystemRef.current) {
                miningSystemRef.current.spawnDigDebris(gd.position, 'quartz_gold', 1.8);
                miningSystemRef.current.spawnOreDrop(
                  new THREE.Vector3(gd.position.x, gd.position.y + 0.5, gd.position.z),
                  'quartz_gold',
                  gd.ounces
                );
              }
              if (onShowBanner) {
                onShowBanner(`🌟 Disintegrated Gold Quartz Vein! Extracted +${gd.ounces} oz Gold!`);
              }
            };

            if (executeAction) {
              handleMineDeposit();
            } else {
              onPromptInteract(`Mine Gold Quartz Vein [E]`, handleMineDeposit);
            }
            return;
          }
        }
      }

      // 5b. Mountain & Cavern Excavation Holes & Walk-in Adits
      const currentULayers = undergroundLayersRef.current;
      const isUndergroundNow = (currentULayers?.currentLevel || 0) > 0;
      const mtnMgr = isUndergroundNow ? currentULayers?.holeManager : foliageManagerRef.current?.mountainHoleManager;
      if (mtnMgr) {
        const tunnelStatus = mtnMgr.isInsideMountainTunnel(
          playerPos.current.x,
          playerPos.current.y,
          playerPos.current.z,
          0.8
        );
        const mtnHole = (tunnelStatus.inside && tunnelStatus.hole)
          ? tunnelStatus.hole
          : mtnMgr.getNearbyHole(playerPos.current, 3.5);

        if (mtnHole) {
          const isDeepAdit = mtnHole.depth >= 2.0;
          const veinText = mtnHole.hasExposedGoldVein ? ' | ✨ High-Grade Gold Vein' : '';
          const label = tunnelStatus.inside
            ? `⛏️ Inside Mountain Adit (Bore: -${mtnHole.depth.toFixed(1)}m${veinText}) [Strike Working-Face with Pickaxe [3] or Blast Dynamite [5]]`
            : isDeepAdit
            ? `🚪 Mountain Drift Portal (Depth: -${mtnHole.depth.toFixed(1)}m${veinText}) [Step Inside or Strike to Bore Deeper]`
            : `⛏️ Mountain Excavation (Depth: -${mtnHole.depth.toFixed(1)}m${veinText}) [Strike Pickaxe to Bore Deeper]`;

          if (executeAction) {
            if (mtnHole.hasExposedGoldVein && Math.random() < 0.4) {
              setPlayerState((prev) => ({
                ...prev,
                goldFound: (prev.goldFound || 0) + 1,
              }));
              soundEngine.playOreChime();
              if (onShowBanner) {
                onShowBanner(`✨ Chiseled 1 oz Native Gold Specimen from deep mountain cavity!`);
              }
            } else if (onShowBanner) {
              onShowBanner(
                isDeepAdit
                  ? `⛏️ Mountain Adit: -${mtnHole.depth.toFixed(1)}m deep. Step inside to explore timbered drift, or strike the back face to bore further!`
                  : `⛏️ Mountain Hole: -${mtnHole.depth.toFixed(1)}m deep. Strike with Pickaxe [3] or toss Dynamite [5] to expand into a walk-in adit!`
              );
            }
          } else {
            onPromptInteract(label, () => checkInteractions(true));
          }
          return;
        }
      }

      if (!executeAction) {
        onClearPrompt();
      }
    };

    // ==========================================
    // Main Animation Loop
    // ==========================================
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Dynamic Resolution Scaling (DRS) & Real-Time FPS Tracker
      fpsTrackerRef.current.frames++;
      fpsTrackerRef.current.time += delta;
      if (fpsTrackerRef.current.time >= 0.5) {
        const measuredFps = fpsTrackerRef.current.frames / fpsTrackerRef.current.time;
        fpsTrackerRef.current.frames = 0;
        fpsTrackerRef.current.time = 0;

        if (onFpsUpdate) {
          onFpsUpdate(Math.round(measuredFps));
        }

        // Automatic DRS downscaling if mobile/browser drops below 32 FPS for consecutive intervals
        if (measuredFps < 32) {
          fpsTrackerRef.current.lowFpsCount++;
          if (fpsTrackerRef.current.lowFpsCount >= 2 && currentDprRef.current > 0.72) {
            currentDprRef.current = Math.max(0.70, currentDprRef.current - 0.1);
            renderer.setPixelRatio(currentDprRef.current);
            fpsTrackerRef.current.lowFpsCount = 0;
          }
        } else if (measuredFps > 56) {
          fpsTrackerRef.current.lowFpsCount = 0;
          const targetDpr = getTargetPixelRatio(qualityRef.current);
          if (currentDprRef.current < targetDpr) {
            currentDprRef.current = Math.min(targetDpr, currentDprRef.current + 0.05);
            renderer.setPixelRatio(currentDprRef.current);
          }
        }
      }

      // Update custom GLSL gold vein shader uniforms for metallic glint & torchlight shimmer
      if (voxelTimeRef.current) {
        voxelTimeRef.current.value = now * 0.001;
      }

      // 1. Player Physics & Locomotion (Crisp, Responsive, Ground-Snapped Controls)
      const keys = keysPressed.current;
      const carried = playerStateRef.current.carriedObject;
      let encumbranceFactor = 1.0;
      let allowSprint = true;

      if (carried && carried.weightLbs) {
        // Carrying 50 lbs reduces walking speed by ~30%
        encumbranceFactor = Math.max(0.68, 1.0 - (carried.weightLbs / 160.0));
        // You cannot sprint while carrying rocks heavier than 25 lbs
        if (carried.weightLbs > 25) {
          allowSprint = false;
        }
      }

      const isSprinting = !isGameOverRef.current && allowSprint && (keys['ShiftLeft'] || keys['ShiftRight']);
      const moveSpeed = (isSprinting ? 12.0 : 6.5) * encumbranceFactor * delta;

      const forward = new THREE.Vector3(-Math.sin(playerYaw.current), 0, -Math.cos(playerYaw.current));
      const right = new THREE.Vector3(Math.cos(playerYaw.current), 0, -Math.sin(playerYaw.current));
      const moveDir = new THREE.Vector3();

      if (!isGameOverRef.current) {
        if (keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp']) moveDir.add(forward);
        if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
        if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
        if (keys['KeyA'] || keys['KeyQ'] || keys['ArrowLeft']) moveDir.sub(right);

        // Virtual joystick contribution (mobile)
        const vj = virtualJoystickInput.current;
        if (Math.abs(vj.forward) > 0.05 || Math.abs(vj.right) > 0.05) {
          moveDir.add(forward.clone().multiplyScalar(vj.forward));
          moveDir.add(right.clone().multiplyScalar(vj.right));
        }
      }

      const isMoving = moveDir.lengthSq() > 0.001;
      if (isMoving) {
        moveDir.normalize();
        const targetDx = moveDir.x * moveSpeed;
        const targetDz = moveDir.z * moveSpeed;

        // Boundary & Obstacle checks: if underground, constrain to cavern chamber; if surface, resolve rock/mountain/slope collisions
        const isUnderground = (undergroundLayersRef.current?.currentLevel || 0) > 0;
        if (isUnderground && undergroundLayersRef.current) {
          const candX = playerPos.current.x + targetDx;
          const candZ = playerPos.current.z + targetDz;
          const dx = candX - undergroundLayersRef.current.surfacePos.x;
          const dz = candZ - undergroundLayersRef.current.surfacePos.z;
          const dist = Math.hypot(dx, dz);
          const maxRadius = 12.0;
          if (dist <= maxRadius) {
            playerPos.current.x = candX;
            playerPos.current.z = candZ;
          } else {
            const ratio = maxRadius / dist;
            playerPos.current.x = undergroundLayersRef.current.surfacePos.x + dx * ratio;
            playerPos.current.z = undergroundLayersRef.current.surfacePos.z + dz * ratio;
          }
        } else {
          // Terrain slope, steep hills, boulders, and mountain outcropping collision resolution with smooth wall sliding
          const currentGroundY = getTerrainHeight(playerPos.current.x, playerPos.current.z);
          const colRes = resolveKinematicMovement(
            playerPos.current.x,
            playerPos.current.z,
            targetDx,
            targetDz,
            currentGroundY,
            getTerrainHeight,
            foliageManagerRef.current,
            movableRockManagerRef.current,
            mineBuildingRef.current,
            !isGrounded.current
          );

          playerPos.current.x = colRes.x;
          playerPos.current.z = colRes.z;
        }

        // Footstep sounds & Surface Water Splash
        if (isGrounded.current) {
          stepTimer.current += delta * (isSprinting ? 2.8 : 1.8);
          if (stepTimer.current > 1.0) {
            stepTimer.current = 0;
            const inSurfaceWater = !isUnderground && hydrologyEngineRef.current?.queryWaterAtPosition(playerPos.current.x, playerPos.current.z).hasWater;
            if (inSurfaceWater) {
              soundEngine.playWaterSplash();
            } else {
              soundEngine.playFootstep();
            }
          }
        }

        // Hydration drain - balanced rate so the player does not become dehydrated too quickly
        setPlayerState((prev) => {
          if (isGameOverRef.current) return prev;
          const isRaining = weather === 'storm' || weather === 'light_rain';
          const rainRelief = isRaining ? 0.2 : 1.0;
          const drainRate = (isSprinting ? 0.35 : 0.12) * delta * rainRelief;
          const nextHydration = Math.max(0, prev.hydration - drainRate);
          let nextHealth = prev.health;

          // Gradual sunstroke damage if completely out of water
          if (nextHydration <= 0) {
            nextHealth = Math.max(0, prev.health - delta * 2.5);
            if (nextHealth <= 0 && prev.health > 0) {
              soundEngine.playPlayerDeath();
              triggerDeath({
                reason: 'dehydration',
                title: 'Perished of Sunstroke',
                subtitle: 'Exhausted Under the Scorching Arizona Sun',
                cause: 'Blistering desert heat and an empty canteen brought fatal sunstroke in the Superstition wilderness. Always keep your canteen filled at mountain springs or the base camp water barrel!',
                goldFound: prev.goldFound || 0,
                blocksDug: prev.blocksDug || 0,
                landmarksDiscovered: prev.discoveredLandmarks?.length || 1,
                timeSurvivedSeconds: Math.floor((Date.now() - expeditionStartTime.current) / 1000),
                coordinates: { x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z },
              });
            }
          }

          return {
            ...prev,
            hydration: nextHydration,
            health: nextHealth,
            isSprinting,
          };
        });
      }

      // Vertical Gravity, Ladder Climbing, and Ground Clamping
      const isUnderground = (undergroundLayersRef.current?.currentLevel || 0) > 0;
      const uLayers = undergroundLayersRef.current;
      const nearShaftLadder = !!(uLayers && uLayers.isNearShaftLadder(playerPos.current, 1.45));

      // Handle real-time shaft ladder climbing
      if (nearShaftLadder) {
        const wantsClimbUp = keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp'] || keys['Space'] || (virtualJoystickInput.current.forward > 0.15);
        const wantsClimbDown = keys['KeyS'] || keys['ArrowDown'] || keys['ShiftLeft'] || keys['ShiftRight'] || (virtualJoystickInput.current.forward < -0.15);
        const ladderPos = uLayers.getShaftLadderPosition();

        if (wantsClimbUp) {
          if (!isClimbingLadderRef.current) {
            soundEngine.playLadderInitiate(true);
          }
          isClimbingLadderRef.current = true;
          isGrounded.current = false;
          verticalVelocity.current = 0;
          const climbSpeed = (isSprinting ? 5.2 : 3.8) * delta;
          playerPos.current.y += climbSpeed;

          // Gently align horizontal position towards ladder rungs
          playerPos.current.x = THREE.MathUtils.lerp(playerPos.current.x, ladderPos.x, 0.14);
          playerPos.current.z = THREE.MathUtils.lerp(playerPos.current.z, ladderPos.z + 0.38, 0.14);

          ladderClimbAudioTimer.current += delta;
          if (ladderClimbAudioTimer.current >= 0.28) {
            ladderClimbAudioTimer.current = 0;
            soundEngine.playLadderClimb(true);
          }

          // Check if climbed out past top of shaft onto desert surface
          if (playerPos.current.y >= uLayers.surfaceY + 0.6) {
            isClimbingLadderRef.current = false;
            executeTraverseShaft(0);
          } else {
            // Update current stratum level as player ascends between subterranean stopes
            const lvlAtY = uLayers.getLevelAtY(playerPos.current.y);
            if (lvlAtY !== uLayers.currentLevel && lvlAtY > 0) {
              uLayers.setSubterraneanLevel(lvlAtY);
              setPlayerState((prev) => ({ ...prev, currentMineLevel: lvlAtY }));
              if (onUpdateShaftLevel) onUpdateShaftLevel(lvlAtY, uLayers.maxUnlockedLevel);
            }
          }
        } else if (wantsClimbDown) {
          // If on surface, stepping down onto ladder transitions into mine shaft
          if (!isUnderground) {
            uLayers.setSubterraneanLevel(1);
            setPlayerState((prev) => ({ ...prev, isInsideMine: true, currentMineLevel: 1 }));
            if (onUpdateShaftLevel) onUpdateShaftLevel(1, uLayers.maxUnlockedLevel);
          }

          let currentFloorY = uLayers.getFloorElevationForPosition(
            playerPos.current.x,
            playerPos.current.z,
            uLayers.currentLevel
          );
          const deepestLayer =
            uLayers.layers.find((l) => l.level === uLayers.maxUnlockedLevel) || uLayers.layers[0];
          const lowestAllowedY = uLayers.surfaceY - deepestLayer.depthMeters + 1.7;

          // Prevent climbing downward through the floor of the deepest unlocked stope
          if (
            uLayers.currentLevel >= uLayers.maxUnlockedLevel &&
            playerPos.current.y <= lowestAllowedY + 0.05
          ) {
            playerPos.current.y = currentFloorY + 1.7;
            isGrounded.current = true;
            isClimbingLadderRef.current = false;
            verticalVelocity.current = 0;
          } else {
            if (!isClimbingLadderRef.current) {
              soundEngine.playLadderInitiate(true);
            }
            isClimbingLadderRef.current = true;
            isGrounded.current = false;
            verticalVelocity.current = 0;
            const climbSpeed = (isSprinting ? 5.2 : 3.8) * delta;
            playerPos.current.y -= climbSpeed;

            playerPos.current.x = THREE.MathUtils.lerp(playerPos.current.x, ladderPos.x, 0.14);
            playerPos.current.z = THREE.MathUtils.lerp(playerPos.current.z, ladderPos.z + 0.38, 0.14);

            ladderClimbAudioTimer.current += delta;
            if (ladderClimbAudioTimer.current >= 0.28) {
              ladderClimbAudioTimer.current = 0;
              soundEngine.playLadderClimb(true);
            }

            // Check if reached bottom or layer floor
            currentFloorY = uLayers.getFloorElevationForPosition(
              playerPos.current.x,
              playerPos.current.z,
              uLayers.currentLevel
            );
            if (playerPos.current.y <= currentFloorY + 1.7) {
              playerPos.current.y = currentFloorY + 1.7;
              isGrounded.current = true;
              isClimbingLadderRef.current = false;
            } else {
              const lvlAtY = uLayers.getLevelAtY(playerPos.current.y);
              if (lvlAtY !== uLayers.currentLevel && lvlAtY > 0) {
                uLayers.setSubterraneanLevel(lvlAtY);
                setPlayerState((prev) => ({ ...prev, currentMineLevel: lvlAtY }));
                if (onUpdateShaftLevel) onUpdateShaftLevel(lvlAtY, uLayers.maxUnlockedLevel);
              }
            }
          }
        } else if (isClimbingLadderRef.current) {
          // Player holding onto ladder rungs
          verticalVelocity.current = 0;
          isGrounded.current = false;
        }
      } else {
        isClimbingLadderRef.current = false;
      }

      // Compute ground elevation for positioning and camera
      let currentGroundY = 0;
      if (isUnderground && uLayers) {
        const tunnelCheck = uLayers.holeManager?.isInsideMountainTunnel(
          playerPos.current.x,
          playerPos.current.y,
          playerPos.current.z,
          0.5
        );
        if (tunnelCheck?.inside && tunnelCheck.floorY !== undefined) {
          currentGroundY = tunnelCheck.floorY;
        } else {
          currentGroundY = uLayers.getFloorElevationForPosition(
            playerPos.current.x,
            playerPos.current.z,
            uLayers.currentLevel
          );
        }
      } else {
        // Check if player is walking inside a carved mountain adit tunnel!
        const tunnelCheck = foliageManagerRef.current?.mountainHoleManager?.isInsideMountainTunnel(
          playerPos.current.x,
          playerPos.current.y,
          playerPos.current.z,
          0.45
        );
        if (tunnelCheck?.inside && tunnelCheck.floorY !== undefined) {
          currentGroundY = tunnelCheck.floorY;
        } else {
          currentGroundY = getTerrainHeight(playerPos.current.x, playerPos.current.z);
        }
      }

      // Vertical Gravity and Ground Clamping (when not holding or climbing ladder)
      if (!isClimbingLadderRef.current) {
        const targetEyeY = currentGroundY + 1.7;

        if (isGrounded.current) {
          // Cleanly clamped to terrain - walking up/down dunes and ridges is buttery smooth!
          playerPos.current.y = targetEyeY;
          verticalVelocity.current = 0;
        } else {
          // Airborne jump physics
          verticalVelocity.current -= 22.0 * delta;
          playerPos.current.y += verticalVelocity.current * delta;

          if (playerPos.current.y <= targetEyeY) {
            playerPos.current.y = targetEyeY;
            verticalVelocity.current = 0;
            isGrounded.current = true;
            soundEngine.playLand();
          }
        }
      }

      // Subterranean & surface abyss safety net - hard catch prevents falling into void
      if (isUnderground && uLayers) {
        const deepestL =
          uLayers.layers.find((l) => l.level === uLayers.maxUnlockedLevel) || uLayers.layers[0];
        const minSafeY = uLayers.surfaceY - deepestL.depthMeters - 2.5;
        if (playerPos.current.y < minSafeY || isNaN(playerPos.current.y)) {
          playerPos.current.y = currentGroundY + 1.7;
          verticalVelocity.current = 0;
          isGrounded.current = true;
        }
      } else {
        const tunnelCheck = foliageManagerRef.current?.mountainHoleManager?.isInsideMountainTunnel(
          playerPos.current.x,
          playerPos.current.y,
          playerPos.current.z,
          0.6
        );
        const minSurfaceY =
          tunnelCheck?.inside && tunnelCheck.floorY !== undefined
            ? tunnelCheck.floorY
            : getTerrainHeight(playerPos.current.x, playerPos.current.z);

        if (playerPos.current.y < minSurfaceY - 4.0 || isNaN(playerPos.current.y)) {
          playerPos.current.y = minSurfaceY + 1.7;
          verticalVelocity.current = 0;
          isGrounded.current = true;
        }
      }

      // Subterranean Water Table Physics, Swimming & Oxygen Simulation
      if (isUnderground && undergroundLayersRef.current) {
        const waterStatus = undergroundLayersRef.current.getWaterStatusForPlayer(
          playerPos.current,
          undergroundLayersRef.current.currentLevel
        );

        if (waterStatus.isSwimming) {
          const swimSurfaceY = waterStatus.waterSurfaceY + 0.5;
          if (keys['Space']) {
            playerPos.current.y = Math.min(swimSurfaceY + 0.4, playerPos.current.y + 4.0 * delta);
            verticalVelocity.current = 0;
            isGrounded.current = false;
          } else if (playerPos.current.y < swimSurfaceY) {
            // Natural buoyant lift in flooded stope
            playerPos.current.y = Math.min(swimSurfaceY, playerPos.current.y + 2.4 * delta);
            verticalVelocity.current = 0;
            isGrounded.current = false;
          }
        }

        if (waterStatus.isSubmerged) {
          oxygenLevelRef.current = Math.max(0, oxygenLevelRef.current - delta * 15.0);
          if (oxygenLevelRef.current <= 0 && !isGameOverRef.current) {
            drowningTimerRef.current += delta;
            if (drowningTimerRef.current >= 0.9) {
              drowningTimerRef.current = 0;
              if (onTriggerDamageFlash) onTriggerDamageFlash();
              soundEngine.playWaterSplash();
              setPlayerState((prev) => {
                const nextHealth = Math.max(0, (prev.health || 100) - 18);
                if (nextHealth <= 0) {
                  soundEngine.playPlayerDeath();
                  const uLayers = undergroundLayersRef.current;
                  const activeL = uLayers?.layers.find((l) => l.level === uLayers.currentLevel);
                  triggerDeath({
                    reason: 'drowning',
                    title: 'Drowned in Flooded Mine Shaft',
                    subtitle: 'Submerged Beneath Regional Water Table',
                    cause: `Groundwater filled the stopes of Layer ${uLayers?.currentLevel || 6}. Without running the Cornish Steam Dewatering Pump, oxygen depleted and your prospector drowned in the dark subterranean depths. Operate the Cornish Pump in the Mine Shaft HUD to dewater flooded stopes!`,
                    goldFound: prev.goldFound || 0,
                    blocksDug: prev.blocksDug || 0,
                    depth: activeL?.depthMeters || 92.0,
                    strata: activeL?.name || 'Flooded Aquifer Fault',
                    landmarksDiscovered: prev.discoveredLandmarks?.length || 1,
                    timeSurvivedSeconds: Math.floor((Date.now() - expeditionStartTime.current) / 1000),
                    coordinates: { x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z },
                  });
                }
                return { ...prev, health: nextHealth };
              });
            }
          }
        } else {
          oxygenLevelRef.current = Math.min(100, oxygenLevelRef.current + delta * 35.0);
        }

        if (onUpdateOxygen) {
          onUpdateOxygen(oxygenLevelRef.current, waterStatus.isSubmerged);
        }
        if (onUpdateWaterTable && Math.floor(now / 400) !== Math.floor(lastWaterSyncTime.current / 400)) {
          lastWaterSyncTime.current = now;
          onUpdateWaterTable({ ...undergroundLayersRef.current.waterTable });
        }
      } else {
        if (oxygenLevelRef.current < 100) {
          oxygenLevelRef.current = 100;
          if (onUpdateOxygen) onUpdateOxygen(100, false);
        }
      }

      // Sync character model position and rotation (Third Person)
      if (characterMeshRef.current) {
        characterMeshRef.current.position.set(
          playerPos.current.x,
          currentGroundY,
          playerPos.current.z
        );
        characterMeshRef.current.rotation.y = playerYaw.current;
        characterMeshRef.current.visible = viewMode === 'third';
      }

      // Sync lantern point light
      if (playerLightRef.current) {
        playerLightRef.current.position.set(
          playerPos.current.x,
          playerPos.current.y + 0.5,
          playerPos.current.z
        );
      }

      // 2. Camera Positioning (Panoramic Death Cam vs First-Person vs Third-Person)
      if (isGameOverRef.current) {
        // Slow cinematic panoramic orbit around the fallen prospector sweeping across desert vistas
        panoramicAngle.current += delta * 0.16;
        const orbitDist = 7.5;
        const orbitY = deathPos.current.y + 3.2;
        const camX = deathPos.current.x + Math.sin(panoramicAngle.current) * orbitDist;
        const camZ = deathPos.current.z + Math.cos(panoramicAngle.current) * orbitDist;
        camera.position.set(camX, orbitY, camZ);
        camera.lookAt(deathPos.current.x, deathPos.current.y + 0.5, deathPos.current.z);
      } else if (viewMode === 'first') {
        camera.position.copy(playerPos.current);

        // Subtle, natural head bobbing only when moving while grounded
        if (isMoving && isGrounded.current) {
          headBobTimer.current += delta * (isSprinting ? 12.0 : 8.0);
          const bobOffset = Math.sin(headBobTimer.current) * (isSprinting ? 0.035 : 0.018);
          camera.position.y += bobOffset;
        }

        const lookDir = new THREE.Vector3(
          -Math.sin(playerYaw.current) * Math.cos(playerPitch.current),
          Math.sin(playerPitch.current),
          -Math.cos(playerYaw.current) * Math.cos(playerPitch.current)
        );
        camera.lookAt(camera.position.clone().add(lookDir));
      } else {
        // Third-person camera behind and above character
        if (isUnderground && undergroundLayersRef.current) {
          const uLayers = undergroundLayersRef.current;
          const currentLvl = uLayers.currentLevel > 0 ? uLayers.currentLevel : 1;
          const layerData = uLayers.getLayerData(currentLvl);
          const chamberHeight = layerData?.level === 1 ? 5.0 : 5.8;
          const chamberRadius = layerData?.level === 1 ? 13.0 : 14.5;
          const floorY = uLayers.surfaceY - (layerData?.depthMeters || 8.5);
          const ceilY = floorY + chamberHeight;

          // Distance check from central shaft station
          const dxFromShaft = playerPos.current.x - uLayers.surfacePos.x;
          const dzFromShaft = playerPos.current.z - uLayers.surfacePos.z;
          const distToShaft = Math.hypot(dxFromShaft, dzFromShaft);

          // Close over-shoulder camera underground to prevent wall clipping
          const distBehind = distToShaft <= 2.2 ? 1.8 : 2.5;
          const camYOffset = 1.35;

          let camX = playerPos.current.x + Math.sin(playerYaw.current) * distBehind;
          let camZ = playerPos.current.z + Math.cos(playerYaw.current) * distBehind;

          // Chamber wall boundary constraint
          const camDx = camX - uLayers.surfacePos.x;
          const camDz = camZ - uLayers.surfacePos.z;
          const camDist = Math.hypot(camDx, camDz);
          const maxAllowedRadius = chamberRadius - 1.2;
          if (camDist > maxAllowedRadius && camDist > 0.001) {
            const scale = maxAllowedRadius / camDist;
            camX = uLayers.surfacePos.x + camDx * scale;
            camZ = uLayers.surfacePos.z + camDz * scale;
          }

          // Ceiling and floor height constraints
          let camY = playerPos.current.y + camYOffset + Math.sin(playerPitch.current) * 1.2;
          camY = Math.max(floorY + 0.6, Math.min(ceilY - 0.45, camY));

          camera.position.set(camX, camY, camZ);
          camera.lookAt(playerPos.current.x, playerPos.current.y + 0.35, playerPos.current.z);
        } else {
          const distBehind = 4.2;
          const camYOffset = 1.8;
          const camX = playerPos.current.x + Math.sin(playerYaw.current) * distBehind;
          const camZ = playerPos.current.z + Math.cos(playerYaw.current) * distBehind;
          const camGroundY = getTerrainHeight(camX, camZ);
          const camY = Math.max(
            camGroundY + 0.65,
            currentGroundY + 1.2,
            playerPos.current.y + camYOffset + Math.sin(playerPitch.current) * 2.0
          );

          camera.position.set(camX, camY, camZ);
          camera.lookAt(playerPos.current.x, playerPos.current.y + 0.3, playerPos.current.z);
        }
      }

      // First-Person Tool Swing & Idle Breathing Animation
      if (fpToolGroupRef.current) {
        const tool = playerStateRef.current.equippedTool;
        const carried = playerStateRef.current.carriedObject;
        const isToolVisible = viewMode === 'first' && (Boolean(carried) || tool === 'shovel' || tool === 'pickaxe' || tool === 'axe');
        fpToolGroupRef.current.visible = isToolVisible;

        if (fpPickGroupRef.current) fpPickGroupRef.current.visible = !carried && tool === 'pickaxe';
        if (fpShovelGroupRef.current) fpShovelGroupRef.current.visible = !carried && tool === 'shovel';
        if (fpAxeGroupRef.current) fpAxeGroupRef.current.visible = !carried && tool === 'axe';

        if (fpCarriedRockGroupRef.current) {
          fpCarriedRockGroupRef.current.visible = Boolean(carried);
          if (carried && fpCarriedRockMeshRef.current) {
            fpCarriedRockMeshRef.current.scale.setScalar(carried.scale || 1.0);
            (fpCarriedRockMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(carried.color || 0x9b583c);
          }
        }

        const breathe = Math.sin(now * 0.0022) * 0.006;
        if (carried) {
          if (toolSwingProgress.current > 0) {
            toolSwingProgress.current = Math.max(0, toolSwingProgress.current - delta * 4.5);
            const heave = Math.sin(toolSwingProgress.current * Math.PI);
            fpToolGroupRef.current.rotation.set(-heave * 0.45, 0, 0);
            fpToolGroupRef.current.position.set(0, -0.05 + breathe - heave * 0.12, -0.45 - heave * 0.15);
          } else {
            fpToolGroupRef.current.rotation.set(0, 0, 0);
            fpToolGroupRef.current.position.set(0, -0.05 + breathe, -0.45);
          }
        } else if (toolSwingProgress.current > 0) {
          toolSwingProgress.current = Math.max(0, toolSwingProgress.current - delta * 4.2);
          const swing = Math.sin(toolSwingProgress.current * Math.PI);
          fpToolGroupRef.current.rotation.x = -swing * (tool === 'shovel' ? 0.85 : tool === 'axe' ? 0.95 : 0.7);
          fpToolGroupRef.current.rotation.z = -swing * (tool === 'axe' ? 0.45 : 0.35);
          fpToolGroupRef.current.position.y = -0.28 - swing * (tool === 'shovel' ? 0.22 : tool === 'axe' ? 0.25 : 0.12) + breathe;
        } else {
          fpToolGroupRef.current.rotation.set(0, 0, 0);
          fpToolGroupRef.current.position.set(0.3, -0.28 + breathe, -0.55);
        }
      }

      // Ground Raycast for Mine Construction & Claim Staking
      const camLookDir = new THREE.Vector3();
      camera.getWorldDirection(camLookDir);
      const reachDist = 8.5;
      const targetGX = playerPos.current.x + camLookDir.x * reachDist;
      const targetGZ = playerPos.current.z + camLookDir.z * reachDist;
      const targetGY = getTerrainHeight(targetGX, targetGZ);
      groundHitPoint.current.set(targetGX, targetGY, targetGZ);

      if (mineBuildingRef.current) {
        const tool = playerStateRef.current.equippedTool;
        if (tool === 'stake') {
          mineBuildingRef.current.setGhost('stake');
          mineBuildingRef.current.updateGhostPosition(groundHitPoint.current, ghostRotationY.current, true);
        } else if (tool === 'builder') {
          const type = activeBuildingTypeRef.current || 'timber_portal';
          const blueprint = STRUCTURE_BLUEPRINTS[type];
          const canAfford =
            playerStateRef.current.goldFound >= blueprint.goldCost &&
            playerStateRef.current.blocksDug >= blueprint.rockCost &&
            (playerStateRef.current.woodPlanks || 0) >= (blueprint.woodCost || 0);
          mineBuildingRef.current.setGhost(type);
          mineBuildingRef.current.updateGhostPosition(groundHitPoint.current, ghostRotationY.current, canAfford);
        } else {
          mineBuildingRef.current.hideGhost();
        }
        mineBuildingRef.current.update(delta);

        // Campfire Fuel Burn Loop (every 2.5s real-time = 0.10 game hours consumed)
        campfireFuelTimer.current += delta;
        if (campfireFuelTimer.current >= 2.5) {
          const elapsedGameHours = campfireFuelTimer.current * 0.04;
          campfireFuelTimer.current = 0;

          const structures = playerStateRef.current.builtStructures;
          if (structures && structures.length > 0) {
            let stateChanged = false;
            const updated = structures.map((s) => {
              if ((s.type === 'campfire' || s.type === 'prospector_camp') && s.isLit !== false) {
                const currentFuel = s.fuelHoursRemaining !== undefined ? s.fuelHoursRemaining : 12.0;
                const newFuel = Math.max(0, currentFuel - elapsedGameHours);
                const isLitNow = newFuel > 0;

                if (mineBuildingRef.current) {
                  mineBuildingRef.current.updateCampfireVisuals(s.id, isLitNow, newFuel);
                }

                if (isLitNow !== s.isLit || Math.abs(currentFuel - newFuel) >= 0.08) {
                  stateChanged = true;
                  return {
                    ...s,
                    fuelHoursRemaining: newFuel,
                    isLit: isLitNow,
                  };
                }
              }
              return s;
            });

            if (stateChanged) {
              setPlayerState((prev) => ({
                ...prev,
                builtStructures: updated,
              }));
            }
          }
        }
      }

      // 3. Update Granular Mining System (Drops, Voxels & Debris)
      if (miningSystemRef.current) {
        miningSystemRef.current.update(delta, playerPos.current, (drop) => {
          if (drop.type === 'dynamite') {
            const count = typeof drop.value === 'number' && !isNaN(drop.value) ? Math.max(1, Math.round(drop.value)) : 1;
            setPlayerState((prev) => ({
              ...prev,
              dynamite: (prev.dynamite || 0) + count,
            }));
            if (onShowBanner) {
              onShowBanner(`+${count} Stick${count > 1 ? 's' : ''} of Mining Dynamite recovered!`);
            }
            return;
          }
          const goldAmount = typeof drop.value === 'number' && !isNaN(drop.value) ? drop.value : 1;
          if (goldAmount > 0 && onPayDirtHit) {
            onPayDirtHit(goldAmount);
          }
          const isAutoRedeem = playerStateRef.current.autoRedeemGold !== false;
          const cashEarned = isAutoRedeem && goldAmount > 0 ? Number((goldAmount * 20.67).toFixed(2)) : 0;

          if (cashEarned > 0) {
            soundEngine.playCashRegister();
          } else {
            soundEngine.playGoldPickup();
          }

          setPlayerState((prev) => {
            const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
            const currentCash = typeof prev.cashDollars === 'number' && !isNaN(prev.cashDollars) ? prev.cashDollars : 0;
            return {
              ...prev,
              goldFound: currentGold + goldAmount,
              cashDollars: currentCash + cashEarned,
            };
          });

          if (onShowBanner) {
            if (cashEarned > 0) {
              onShowBanner(
                `🪙 Auto-Redeemed +${goldAmount.toFixed(1)} oz ${drop.type === 'silver_chunk' ? 'Silver' : 'Gold'} ➔ +$${cashEarned.toFixed(2)} Cash!`
              );
            } else {
              onShowBanner(
                drop.type === 'silver_chunk'
                  ? `+${goldAmount} oz Silver Ore collected!`
                  : `+${goldAmount} oz Gold collected from ore deposit!`
              );
            }
          }
        });
      }

      // 3b. Update High-Fidelity Mountain Stone Dust & Cleavage Particle System
      if (mountainDustParticlesRef.current) {
        mountainDustParticlesRef.current.update(delta);
      }

      // 4. Update Desert Wildlife (Rabbits, Rattlesnakes, Scorpions, Bighorn Sheep, Vultures)
      if (wildlifeManagerRef.current) {
        wildlifeManagerRef.current.update(
          delta,
          playerPos.current,
          getTerrainHeight,
          (dmg, creatureType, creatureName) => {
            if (onTriggerDamageFlash) onTriggerDamageFlash();
            setPlayerState((prev) => {
              const nextHealth = prev.health - dmg;
              if (nextHealth <= 0 && prev.health > 0) {
                soundEngine.playPlayerDeath();
                triggerDeath({
                  reason: 'venom',
                  title: creatureType === 'snake' ? 'Fatal Rattlesnake Envenomation' : 'Lethal Scorpion Neurotoxin',
                  subtitle: 'Succumbed to Sonoran Desert Predator',
                  cause: `Struck down by a venomous ${creatureName} in the Superstition Mountain wilderness. The potent desert toxins took hold before you could reach medical aid.`,
                  goldFound: prev.goldFound || 0,
                  blocksDug: prev.blocksDug || 0,
                  landmarksDiscovered: prev.discoveredLandmarks?.length || 1,
                  timeSurvivedSeconds: Math.floor((Date.now() - expeditionStartTime.current) / 1000),
                  coordinates: { x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z },
                });
                return {
                  ...prev,
                  health: 0,
                };
              }
              return {
                ...prev,
                health: nextHealth,
              };
            });
          },
          (bannerMsg) => {
            if (onShowBanner) onShowBanner(bannerMsg);
          }
        );
      }

      // 5. Update Outlaw Bandits & Combat
      if (combatManagerRef.current) {
        combatManagerRef.current.update(
          delta,
          playerPos.current,
          getTerrainHeight,
          (dmg) => {
            if (onTriggerDamageFlash) onTriggerDamageFlash();
            setPlayerState((prev) => {
              const nextHealth = prev.health - dmg;
              if (nextHealth <= 0 && prev.health > 0) {
                soundEngine.playPlayerDeath();
                triggerDeath({
                  reason: 'bandit',
                  title: 'Shot Down by Claim Jumpers',
                  subtitle: 'Ambushed in Frontier Gunfight',
                  cause: 'Ambushed by ruthless claim jumpers defending territory in the canyon. The outlaws shot you down and claimed your prospecting equipment.',
                  goldFound: prev.goldFound || 0,
                  blocksDug: prev.blocksDug || 0,
                  landmarksDiscovered: prev.discoveredLandmarks?.length || 1,
                  timeSurvivedSeconds: Math.floor((Date.now() - expeditionStartTime.current) / 1000),
                  coordinates: { x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z },
                });
                return {
                  ...prev,
                  health: 0,
                };
              }
              return {
                ...prev,
                health: nextHealth,
              };
            });
          },
          (blastPos) => {
            // Dynamite blast triggers voxel & foliage/rock destruction
            let goldBlasted = 0;
            if (miningSystemRef.current) {
              goldBlasted += miningSystemRef.current.explodeDynamiteAt(blastPos, 3.4);
            }
            let extraRocks = 0;
            let extraWood = 0;
            let extraHydration = 0;
            if (foliageManagerRef.current) {
              const fBlast = foliageManagerRef.current.explodeFoliageAt(blastPos, 5.0);
              goldBlasted += fBlast.goldBlasted;
              extraRocks = fBlast.rocksBlasted;
              extraWood = fBlast.woodBlasted || 0;
              extraHydration = fBlast.hydrationBlasted;

              // Spawn exploding rock/cactus/quartz debris fragments for everything shattered
              fBlast.destroyedPoints.forEach((dp) => {
                miningSystemRef.current?.spawnDigDebris(dp.pos, dp.type, 2.4);
              });
            }

            // Check if blast affects shaft mini-voxels
            if (undergroundLayersRef.current) {
              const uLayers = undergroundLayersRef.current;
              const distToShaft = Math.hypot(blastPos.x - uLayers.surfacePos.x, blastPos.z - uLayers.surfacePos.z);
              if (distToShaft < 4.5 || uLayers.currentLevel > 0) {
                const sinkRes = uLayers.voxelEngine.sinkShaftDown('dynamite');
                if (sinkRes.destroyed) {
                  goldBlasted += sinkRes.oreYield || 0;
                  extraRocks += sinkRes.voxelsClearedCount || 6;
                  if (sinkRes.breakthroughReady) {
                    const breachRes = uLayers.digDown('dynamite');
                    if (breachRes.newLayer && onUpdateShaftLevel) {
                      onUpdateShaftLevel(breachRes.newLayer.level, uLayers.maxUnlockedLevel);
                    }
                    if (onUpdateShaftLayers) {
                      onUpdateShaftLayers([...uLayers.layers]);
                    }
                    if (breachRes.message && onShowBanner) {
                      onShowBanner(breachRes.message);
                    }
                  }
                }
              }
            }

            const isAutoRedeem = playerStateRef.current.autoRedeemGold !== false;
            const cashEarned = isAutoRedeem && goldBlasted > 0 ? Number((goldBlasted * 20.67).toFixed(2)) : 0;
            if (cashEarned > 0) {
              soundEngine.playCashRegister();
            }

            if (goldBlasted > 0 && onPayDirtHit) {
              onPayDirtHit(goldBlasted);
            }
            if (goldBlasted > 0 || extraRocks > 0 || extraWood > 0 || extraHydration > 0) {
              setPlayerState((prev) => ({
                ...prev,
                goldFound: (prev.goldFound || 0) + goldBlasted,
                cashDollars: (prev.cashDollars || 0) + cashEarned,
                blocksDug: (prev.blocksDug || 0) + extraRocks,
                woodPlanks: (prev.woodPlanks || 0) + extraWood,
                hydration: Math.min(100, (prev.hydration || 100) + extraHydration),
              }));
              if (onShowBanner) {
                const autoMsg = cashEarned > 0 ? ` ➔ 🪙 Auto-Redeemed +$${cashEarned.toFixed(2)}!` : '';
                onShowBanner(`💥 Blast Shattered Deposits! (+${goldBlasted} oz Gold${autoMsg}, +${extraRocks} Stones${extraWood > 0 ? `, +${extraWood} Timber Planks` : ''})`);
              }
            }
          }
        );
      }

      // 5b. Atmospheric sky, clouds, and weather updates
      if (atmosphereManagerRef.current) {
        atmosphereManagerRef.current.update(
          delta,
          playerPos.current,
          sunLightRef.current || undefined,
          hemiLightRef.current || undefined
        );
      }

      // 5b-2. Sonoran Desert Hydrology, Water Table & Arroyos
      if (hydrologyEngineRef.current) {
        hydrologyEngineRef.current.update(delta, weather);
      }

      // 5b-3. Movable Rocks & Ballistics Simulation
      if (movableRockManagerRef.current) {
        movableRockManagerRef.current.update(delta, getTerrainHeight, (vol) => {
          soundEngine.playRockImpact(vol);
        });
      }

      // 5c. Subterranean Mine Shaft & Granular Mini-Voxel Engine
      if (undergroundLayersRef.current) {
        undergroundLayersRef.current.update(delta, performance.now(), timeOfDay, weather);
        undergroundLayersRef.current.voxelEngine.updateReticle(camera, 6.5);
        undergroundLayersRef.current.voxelEngine.update(delta);
      }

      // 6. Metal Detector Audio Radar
      if (playerState.equippedTool === 'detector') {
        detectorBeepTimer.current += delta;
        // Find nearest unmined deposit
        let nearestDist = 999;
        for (const gd of goldDepositsRef.current) {
          if (!gd.mined) {
            const d = Math.hypot(playerPos.current.x - gd.position.x, playerPos.current.z - gd.position.z);
            if (d < nearestDist) nearestDist = d;
          }
        }
        if (nearestDist < 30) {
          const beepInterval = Math.max(0.12, nearestDist * 0.05);
          if (detectorBeepTimer.current > beepInterval) {
            detectorBeepTimer.current = 0;
            soundEngine.playDetectorBeep(nearestDist / 30);
          }
        }
      }

      // 7. Periodic Interaction Check (Throttled to every 4 frames / ~15Hz for high CPU savings)
      interactionCheckTick.current++;
      if (interactionCheckTick.current % 4 === 0) {
        checkInteractions(false);
      }

      // 8. Update State for HUD (Throttled to ~10Hz or on movement threshold to eliminate 60Hz React re-render churn!)
      const nowMs = performance.now();
      const posDistSq = lastSentPos.current.distanceToSquared(playerPos.current);
      const yawDiff = Math.abs(lastSentYaw.current - playerYaw.current);
      const pitchDiff = Math.abs(lastSentPitch.current - playerPitch.current);
      const timeSinceLastSync = nowMs - lastHudSyncTime.current;

      if (timeSinceLastSync > 100 || posDistSq > 0.08 || yawDiff > 0.05 || pitchDiff > 0.05) {
        lastHudSyncTime.current = nowMs;
        lastSentPos.current.copy(playerPos.current);
        lastSentYaw.current = playerYaw.current;
        lastSentPitch.current = playerPitch.current;

        setPlayerState((prev) => ({
          ...prev,
          position: {
            x: playerPos.current.x,
            y: playerPos.current.y,
            z: playerPos.current.z,
          },
          rotation: {
            yaw: playerYaw.current,
            pitch: playerPitch.current,
          },
        }));
      }

      // Render scene
      renderer.render(scene, camera);

      // Update remote prospectors smooth interpolation and animations
      remoteProspectorsRef.current.forEach((rp) => {
        rp.update(delta, playerPos.current);
      });

      // Transmit local position & action to multiplayer server (Throttled to 10Hz network tick)
      if (nowMs - lastMultiplayerSyncTime.current > 100) {
        lastMultiplayerSyncTime.current = nowMs;
        multiplayer.queuePositionUpdate({
          x: playerPos.current.x,
          y: playerPos.current.y,
          z: playerPos.current.z,
          yaw: playerYaw.current,
          pitch: playerPitch.current,
          action: isSprinting ? 'run' : (isMoving ? 'walk' : 'idle'),
          activeTool: playerStateRef.current.equippedTool,
          goldFound: playerStateRef.current.goldFound || 0,
          rocksGathered: playerStateRef.current.blocksDug || 0,
          health: playerStateRef.current.health || 100,
        });
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      unsubFriendships();
      cancelAnimationFrame(animationFrameId);
      remoteProspectorsRef.current.forEach((rp) => {
        scene.remove(rp.group);
        rp.dispose();
      });
      remoteProspectorsRef.current.clear();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      if (document.pointerLockElement === renderer.domElement) {
        try {
          document.exitPointerLock();
        } catch {
          // ignore
        }
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);
      renderer.domElement.removeEventListener('touchcancel', handleTouchEnd);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (miningSystemRef.current && typeof miningSystemRef.current.dispose === 'function') {
        miningSystemRef.current.dispose();
      }
      if (noiseTextureRef.current) {
        noiseTextureRef.current.dispose();
        noiseTextureRef.current = null;
      }
      if (wildlifeManagerRef.current && typeof wildlifeManagerRef.current.dispose === 'function') {
        wildlifeManagerRef.current.dispose();
      }
      if (combatManagerRef.current && typeof combatManagerRef.current.dispose === 'function') {
        combatManagerRef.current.dispose();
      }
      if (atmosphereManagerRef.current && typeof atmosphereManagerRef.current.dispose === 'function') {
        atmosphereManagerRef.current.dispose();
      }
      if (mineBuildingRef.current && typeof mineBuildingRef.current.dispose === 'function') {
        mineBuildingRef.current.dispose();
      }
      if (undergroundLayersRef.current && typeof undergroundLayersRef.current.dispose === 'function') {
        undergroundLayersRef.current.dispose();
      }
      if (foliageManagerRef.current && typeof foliageManagerRef.current.dispose === 'function') {
        foliageManagerRef.current.dispose();
      }
      if (mountainDustParticlesRef.current && typeof mountainDustParticlesRef.current.dispose === 'function') {
        mountainDustParticlesRef.current.dispose();
      }
      if (movableRockManagerRef.current && typeof movableRockManagerRef.current.dispose === 'function') {
        movableRockManagerRef.current.dispose();
      }
      renderer.dispose();
    };
  }, [viewMode]);

  // Update Sun & Atmosphere when timeOfDay or weather changes
  useEffect(() => {
    if (atmosphereManagerRef.current) {
      atmosphereManagerRef.current.updateAtmosphere(
        timeOfDay,
        weather,
        sunLightRef.current || undefined,
        hemiLightRef.current || undefined
      );
    }
  }, [timeOfDay, weather]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-stone-900">
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* Binoculars Overlay (if equipped) */}
      {playerState.equippedTool === 'binoculars' && (
        <div className="pointer-events-none absolute inset-0 z-15 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full border-[28px] border-stone-950/90 shadow-[0_0_0_9999px_rgba(10,8,6,0.92)] flex items-center justify-center">
            {/* Crosshairs */}
            <div className="w-full h-[1px] bg-amber-400/40 absolute" />
            <div className="h-full w-[1px] bg-amber-400/40 absolute" />
            <div className="w-16 h-16 rounded-full border border-amber-400/60" />
            <span className="absolute bottom-6 font-mono text-amber-300 text-xs tracking-widest">
              FIELD GLASSES 8X
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
