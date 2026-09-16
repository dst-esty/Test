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
} from '../types';
import { generateNoiseTexture, createGoldVeinVoxelMaterials, VoxelShaderUniforms } from '../world/voxelGoldShader';
import { UndergroundLayersManager } from '../world/undergroundLayers';

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
  onBuildStructure?: (type: MineStructureType, pos: Vector3D, rotationY: number) => void;
  onOpenDeedModal?: (claim: ClaimInfo) => void;
  onOpenBuilder?: () => void;
  activeBuildingType?: MineStructureType;
  onRegisterReinforceHandler?: (fn: () => void) => void;
  onRegisterExcavateHandler?: (fn: () => void) => void;
  onRegisterShaftTraverseHandler?: (fn: (level: number) => void) => void;
  onRegisterShaftExitHandler?: (fn: () => void) => void;
  onRegisterShaftDigHandler?: (fn: () => void) => void;
  onUpdateShaftLayers?: (layers: MineLayerData[]) => void;
  onUpdateShaftLevel?: (level: number, maxLevel: number) => void;
  onNearbyTrenchChange?: (
    trench: {
      depth: number;
      stability: number;
      isShored: boolean;
      shoredUntilDepth?: number;
      rocksNeeded: number;
      canShore: boolean;
    } | null
  ) => void;
  onRegisterShoreHandler?: (fn: () => void) => void;
}

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
  onBuildStructure,
  onOpenDeedModal,
  onOpenBuilder,
  activeBuildingType = 'timber_portal',
  onRegisterReinforceHandler,
  onRegisterExcavateHandler,
  onRegisterShaftTraverseHandler,
  onRegisterShaftExitHandler,
  onRegisterShaftDigHandler,
  onUpdateShaftLayers,
  onUpdateShaftLevel,
  onNearbyTrenchChange,
  onRegisterShoreHandler,
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

  // Subsystems
  const foliageManagerRef = useRef<DesertFoliageManager | null>(null);
  const miningSystemRef = useRef<MiningSystem | null>(null);
  const mineBuildingRef = useRef<MineBuildingSystem | null>(null);
  const wildlifeManagerRef = useRef<WildlifeManager | null>(null);
  const combatManagerRef = useRef<CombatManager | null>(null);
  const atmosphereManagerRef = useRef<AtmosphereManager | null>(null);
  const undergroundLayersRef = useRef<UndergroundLayersManager | null>(null);
  const voxelUniformsRef = useRef<VoxelShaderUniforms[]>([]);
  const voxelTimeRef = useRef<{ value: number }>({ value: 0 });
  const noiseTextureRef = useRef<THREE.Texture | null>(null);

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

  // Sync external position changes (e.g. fast travel or mine teleport)
  useEffect(() => {
    if (
      Math.abs(playerPos.current.x - playerState.position.x) > 2 ||
      Math.abs(playerPos.current.z - playerState.position.z) > 2
    ) {
      playerPos.current.set(
        playerState.position.x,
        getTerrainHeight(playerState.position.x, playerState.position.z) + 1.7,
        playerState.position.z
      );
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
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.2, 800);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x553311, 0.8);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -120;
    sunLight.shadow.camera.right = 120;
    sunLight.shadow.camera.top = 120;
    sunLight.shadow.camera.bottom = -120;
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.normalBias = 0.025;
    sunLight.shadow.radius = 2.5;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Player Lantern Light
    const playerLight = new THREE.PointLight(0xffaa44, 0, 20);
    scene.add(playerLight);
    playerLightRef.current = playerLight;

    // 5. Build Desert World
    const terrain = createTerrainMesh();
    scene.add(terrain);

    const foliage = createDesertFoliage(scene);
    goldDepositsRef.current = foliage.goldDeposits;
    foliageManagerRef.current = foliage.manager;

    const landmarkMeshes = createLandmarkStructures(scene, landmarks);

    // 6. Procedural Gold Vein GLSL Fragment Shader & Noise Texture Initialization
    // Generates a multi-scale seamless procedural noise texture for realistic hydrothermal gold veins across mine voxels
    const noiseTexture = generateNoiseTexture(256);
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
    miningSystemRef.current = miningSystem;

    const mineBuilding = new MineBuildingSystem(scene, getTerrainHeight);
    mineBuildingRef.current = mineBuilding;

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

    // Initialize Subterranean Mine Shaft & Geological Strata System
    const undergroundLayers = new UndergroundLayersManager(scene);
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

      // A. Check if striking near the active Portal Excavation drift
      if (mineBuildingRef.current?.portalExcavation && !mineBuildingRef.current.portalExcavation.isReinforced) {
        const pe = mineBuildingRef.current.portalExcavation;
        const dist = Math.hypot(origin.x - pe.position.x, origin.z - pe.position.z);
        if (dist < 8.5) {
          const res = mineBuildingRef.current.strikeExcavation(
            new THREE.Vector3(pe.position.x, pe.position.y + 1.8, pe.position.z)
          );
          if (res.success) {
            setPlayerState((prev) => {
              const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
              const currentRocks = typeof prev.blocksDug === 'number' && !isNaN(prev.blocksDug) ? prev.blocksDug : 0;
              return {
                ...prev,
                blocksDug: currentRocks + res.rocksDug,
                goldFound: currentGold + res.goldAwarded,
                portalExcavation: { ...pe },
              };
            });
            if (res.message && onShowBanner) {
              onShowBanner(res.message);
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
          soundEngine.playVoxelDig();
          if (fRes.goldAwarded && fRes.goldAwarded > 0) {
            soundEngine.playOreChime();
          }
          if (miningSystemRef.current && fRes.hitPoint && fRes.debrisType) {
            miningSystemRef.current.spawnDigDebris(fRes.hitPoint, fRes.debrisType, 1.4);
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
          setPlayerState((prev) => {
            const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
            const currentRocks = typeof prev.blocksDug === 'number' && !isNaN(prev.blocksDug) ? prev.blocksDug : 0;
            const currentHydration = typeof prev.hydration === 'number' && !isNaN(prev.hydration) ? prev.hydration : 100;
            return {
              ...prev,
              blocksDug: currentRocks + (fRes.blocksDug || 0),
              goldFound: currentGold + (fRes.goldAwarded || 0),
              hydration: Math.min(100, currentHydration + (fRes.hydrationAwarded || 0)),
            };
          });
          if (fRes.message && onShowBanner) {
            onShowBanner(fRes.message);
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

        setPlayerState((prev) => {
          const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
          const currentRocks = typeof prev.blocksDug === 'number' && !isNaN(prev.blocksDug) ? prev.blocksDug : 0;
          return {
            ...prev,
            blocksDug: currentRocks + 1,
            goldFound: currentGold + (typeof res.goldAwarded === 'number' && !isNaN(res.goldAwarded) ? res.goldAwarded : 0),
          };
        });
        if (res.message && onShowBanner) {
          onShowBanner(res.message);
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
          setPlayerState((prev) => ({
            ...prev,
            blocksDug: (prev.blocksDug || 0) + (fRes.blocksDug || 0),
            goldFound: (prev.goldFound || 0) + (fRes.goldAwarded || 0),
            hydration: Math.min(100, (prev.hydration || 100) + (fRes.hydrationAwarded || 0)),
          }));
          if (fRes.message && onShowBanner) {
            onShowBanner(fRes.message);
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

      if (result.itemFound) {
        const item = result.itemFound;
        if (item.type === 'gold') {
          soundEngine.playOreChime();
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
          goldFound: (prev.goldFound || 0) + item.value,
        }));
      } else {
        soundEngine.playVoxelDig();
        setPlayerState((prev) => ({
          ...prev,
          blocksDug: (prev.blocksDug || 0) + result.rocksAwarded,
        }));
      }

      if (onShowBanner) {
        onShowBanner(bannerText);
      }
    };

    const handleActionDig = () => {
      if (
        undergroundLayersRef.current &&
        undergroundLayersRef.current.currentLevel > 0 &&
        undergroundLayersRef.current.isNearExcavationPit(playerPos.current)
      ) {
        executeShaftDig();
        return;
      }
      if (playerStateRef.current.equippedTool === 'shovel') {
        executeShovelDig();
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

    const executeTraverseShaft = (level: number) => {
      const uLayers = undergroundLayersRef.current;
      if (!uLayers) return;
      if (level === 0) {
        soundEngine.playLadderClimb();
        uLayers.currentLevel = 0;
        const surfY = getTerrainHeight(uLayers.surfacePos.x + 1.5, uLayers.surfacePos.z + 1.5);
        playerPos.current.set(uLayers.surfacePos.x + 1.5, surfY + 1.7, uLayers.surfacePos.z + 1.5);
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
      uLayers.currentLevel = level;
      const targetLayer = uLayers.layers.find((l) => l.level === level);
      const floorY = uLayers.surfaceY - (targetLayer ? targetLayer.depthMeters : 8.5);
      playerPos.current.set(uLayers.surfacePos.x + 1.2, floorY + 1.7, uLayers.surfacePos.z + 1.2);
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

    const executeShoreNearbyTrench = () => {
      const px = playerPos.current.x;
      const pz = playerPos.current.z;
      const nearbyHole = getNearbyDugHole(px, pz, 4.5);
      if (!nearbyHole) {
        if (onShowBanner) onShowBanner("No deep excavation trench nearby to shore. Dig a pit with Shovel [3] or Pickaxe [4]!");
        return;
      }
      if (nearbyHole.depth < 0.9) {
        if (onShowBanner) onShowBanner("Trench is too shallow to require timber shoring (depth < 1.0m). Dig deeper first!");
        return;
      }
      if (nearbyHole.isShored && nearbyHole.shoredUntilDepth && nearbyHole.shoredUntilDepth > nearbyHole.depth + 0.35) {
        if (onShowBanner) onShowBanner(`Trench is already securely timbered down to ${nearbyHole.shoredUntilDepth.toFixed(1)}m. Dig deeper into the next depth before adding more shoring!`);
        return;
      }
      const rocksOwned = playerStateRef.current.blocksDug || 0;
      if (rocksOwned < 3) {
        if (onShowBanner) onShowBanner(`Need 3 Quarry Stones to anchor timber shoring! (You have ${rocksOwned}). Mine stones with Pickaxe [4].`);
        return;
      }

      const res = shoreExcavationPit(nearbyHole.id, sceneRef.current || undefined);
      if (res.success) {
        soundEngine.playTrenchShoringConstruct();
        setPlayerState((prev) => ({
          ...prev,
          blocksDug: Math.max(0, (prev.blocksDug || 0) - res.rocksUsed),
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

      if (
        (playerStateRef.current.goldFound || 0) < blueprint.goldCost ||
        (playerStateRef.current.blocksDug || 0) < blueprint.rockCost
      ) {
        if (onShowBanner) {
          onShowBanner(`Need ${blueprint.goldCost} Gold & ${blueprint.rockCost} Rocks to build ${blueprint.name}!`);
        }
        return;
      }

      const structure = mineBuildingRef.current.buildStructure(
        type,
        { x: targetPos.x, y: targetPos.y, z: targetPos.z },
        ghostRotationY.current
      );

      setPlayerState((prev) => ({
        ...prev,
        goldFound: Math.max(0, (prev.goldFound || 0) - blueprint.goldCost),
        blocksDug: Math.max(0, (prev.blocksDug || 0) - blueprint.rockCost),
        builtStructures: [...(prev.builtStructures || []), structure],
      }));

      if (onBuildStructure) {
        onBuildStructure(type, { x: targetPos.x, y: targetPos.y, z: targetPos.z }, ghostRotationY.current);
      }

      if (onShowBanner) {
        onShowBanner(`${blueprint.name} Constructed on your Claim!`);
      }
    };

    // Event Handlers (Keyboard, Mouse PointerLock, Touch, Mining & Combat)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOverRef.current) return;
      keysPressed.current[e.code] = true;
      soundEngine.startAmbiance();

      if (e.code === 'KeyE') {
        checkInteractions(true);
      }
      if (e.code === 'Space') {
        if (isGrounded.current) {
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
      if (e.code === 'KeyT') {
        executeShoreNearbyTrench();
      }

      // Hotkeys for tools
      const toolHotkeys: Record<string, PlayerState['equippedTool']> = {
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

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Left click only
      if (isUIOpenRef.current || isGameOverRef.current) return;

      safeRequestPointerLock();
      soundEngine.startAmbiance();

      toolSwingProgress.current = 1.0; // Trigger physical 3D tool swing animation

      const tool = playerStateRef.current.equippedTool;
      if (
        undergroundLayersRef.current &&
        undergroundLayersRef.current.currentLevel > 0 &&
        undergroundLayersRef.current.isNearExcavationPit(playerPos.current) &&
        (tool === 'pickaxe' || tool === 'shovel')
      ) {
        executeShaftDig();
        return;
      }
      if (tool === 'shovel') {
        executeShovelDig();
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

    // Mobile / Touch controls
    let lastTouchX = 0;
    let lastTouchY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
      soundEngine.startAmbiance();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;

        const sensitivity = 0.004;
        playerYaw.current -= deltaX * sensitivity;
        playerPitch.current -= deltaY * sensitivity;
        playerPitch.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, playerPitch.current));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('touchstart', handleTouchStart);
    renderer.domElement.addEventListener('touchmove', handleTouchMove);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // Interaction Check Function
    // ==========================================
    const checkInteractions = (executeAction = false) => {
      const px = playerPos.current.x;
      const pz = playerPos.current.z;

      // Geotechnical Excavation Trench check
      const nearbyTrench = getNearbyDugHole(px, pz, 4.2);
      const shoredUntil = nearbyTrench?.shoredUntilDepth || 0;
      const needsNextShore = Boolean(
        nearbyTrench &&
        nearbyTrench.depth >= 0.9 &&
        (!nearbyTrench.isShored || nearbyTrench.depth >= shoredUntil - 0.2)
      );

      if (onNearbyTrenchChange) {
        if (nearbyTrench && nearbyTrench.depth >= 0.9) {
          onNearbyTrenchChange({
            depth: nearbyTrench.depth,
            stability: nearbyTrench.stability,
            isShored: nearbyTrench.isShored,
            shoredUntilDepth: nearbyTrench.shoredUntilDepth,
            rocksNeeded: 3,
            canShore: needsNextShore && (playerStateRef.current.blocksDug || 0) >= 3,
          });
        } else {
          onNearbyTrenchChange(null);
        }
      }

      if (needsNextShore && nearbyTrench) {
        const rocks = playerStateRef.current.blocksDug || 0;
        const isExtend = (nearbyTrench.shoredUntilDepth || 0) > 0;
        const actionWord = isExtend ? 'Extend Shoring to Next Depth [T]' : 'Reinforce Trench with Timber Shoring [T]';
        const msg = `${actionWord} (${rocks >= 3 ? '3 Stones' : 'Need 3 Stones'} | Depth: ${nearbyTrench.depth.toFixed(1)}m | Stability: ${Math.round(nearbyTrench.stability)}%)`;
        if (executeAction) {
          executeShoreNearbyTrench();
          return;
        } else {
          onPromptInteract(msg, () => executeShoreNearbyTrench());
          return;
        }
      }

      // 0. Subterranean Mine Shaft Layer Interactions
      if (undergroundLayersRef.current) {
        const uLayers = undergroundLayersRef.current;
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
          if (uLayers.isNearShaft(playerPos.current, 3.8)) {
            if (uLayers.currentLevel === 1) {
              if (executeAction) {
                executeTraverseShaft(0);
              } else {
                onPromptInteract('Climb Shaft Ladder to Desert Surface [E]', () => executeTraverseShaft(0));
              }
              return;
            } else {
              if (executeAction) {
                executeTraverseShaft(uLayers.currentLevel - 1);
              } else {
                onPromptInteract(`Climb Shaft Ladder to Layer ${uLayers.currentLevel - 1} [E]`, () => executeTraverseShaft(uLayers.currentLevel - 1));
              }
              return;
            }
          }
        } else {
          // On surface - check proximity to mine shaft collar
          if (uLayers.isNearShaft(playerPos.current, 5.0)) {
            if (executeAction) {
              executeTraverseShaft(1);
            } else {
              onPromptInteract('Descend into Subterranean Mine Shaft [E]', () => executeTraverseShaft(1));
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
          if (executeAction) {
            const ok = miningSystemRef.current?.claimMine();
            if (ok) {
              if (onShowBanner) onShowBanner("Claim Staked! Dutchman's Mine is yours to excavate.");
              setPlayerState((prev) => ({
                ...prev,
                activeClaim: { ...miningSystemRef.current!.claim },
              }));
            }
          } else {
            onPromptInteract('Stake Mining Claim [E]', () => {
              const ok = miningSystemRef.current?.claimMine();
              if (ok) {
                if (onShowBanner) onShowBanner("Claim Staked! Dutchman's Mine is yours to excavate.");
                setPlayerState((prev) => ({
                  ...prev,
                  activeClaim: { ...miningSystemRef.current!.claim },
                }));
              }
            });
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
            if (executeAction) {
              soundEngine.playPickaxe();
              setPlayerState((prev) => ({
                ...prev,
                goldFound: prev.goldFound + 3.0,
              }));
              if (onShowBanner) onShowBanner("Cranked Deep Hoist: Hauled rich ore bucket from the depths! (+3.0 oz Gold)");
            } else {
              onPromptInteract('Crank Deep Headframe Hoist [E]', () => checkInteractions(true));
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
          } else if (nearby.type === 'timber_portal') {
            if (executeAction) {
              onEnterMine();
            } else {
              onPromptInteract('Enter Timber Mine Portal Shaft [E]', () => onEnterMine());
            }
            return;
          } else if (nearby.type === 'deep_shaft') {
            if (executeAction) {
              soundEngine.playPickaxe();
              setPlayerState((prev) => ({
                ...prev,
                goldFound: prev.goldFound + 4.0,
                blocksDug: prev.blocksDug + 2,
              }));
              if (onShowBanner) onShowBanner("Excavated Deep Bedrock Shaft: Struck rich gold vein! (+4.0 oz Gold)");
            } else {
              onPromptInteract('Excavate Deep Bedrock Shaft [E]', () => checkInteractions(true));
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

      // Update custom GLSL gold vein shader uniforms for metallic glint & torchlight shimmer
      if (voxelTimeRef.current) {
        voxelTimeRef.current.value = now * 0.001;
      }

      // Update subterranean layers & dynamic debris particles
      if (undergroundLayersRef.current) {
        undergroundLayersRef.current.update(delta, now);
      }

      // 1. Player Physics & Locomotion (Crisp, Responsive, Ground-Snapped Controls)
      const keys = keysPressed.current;
      const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
      const moveSpeed = (isSprinting ? 12.0 : 6.5) * delta;

      const forward = new THREE.Vector3(-Math.sin(playerYaw.current), 0, -Math.cos(playerYaw.current));
      const right = new THREE.Vector3(Math.cos(playerYaw.current), 0, -Math.sin(playerYaw.current));
      const moveDir = new THREE.Vector3();

      if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
      if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
      if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(right);

      const isMoving = moveDir.lengthSq() > 0.001;
      if (isMoving) {
        moveDir.normalize();
        playerPos.current.x += moveDir.x * moveSpeed;
        playerPos.current.z += moveDir.z * moveSpeed;

        // Boundary checks: if underground, constrain to cavern chamber; if surface, world bounds
        const isUnderground = (undergroundLayersRef.current?.currentLevel || 0) > 0;
        if (isUnderground && undergroundLayersRef.current) {
          const dx = playerPos.current.x - undergroundLayersRef.current.surfacePos.x;
          const dz = playerPos.current.z - undergroundLayersRef.current.surfacePos.z;
          const dist = Math.hypot(dx, dz);
          const maxRadius = 12.0;
          if (dist > maxRadius) {
            const ratio = maxRadius / dist;
            playerPos.current.x = undergroundLayersRef.current.surfacePos.x + dx * ratio;
            playerPos.current.z = undergroundLayersRef.current.surfacePos.z + dz * ratio;
          }
        } else {
          // Boundaries check (-190 to 190)
          playerPos.current.x = Math.max(-190, Math.min(190, playerPos.current.x));
          playerPos.current.z = Math.max(-190, Math.min(190, playerPos.current.z));
        }

        // Footstep sounds
        if (isGrounded.current) {
          stepTimer.current += delta * (isSprinting ? 2.8 : 1.8);
          if (stepTimer.current > 1.0) {
            stepTimer.current = 0;
            soundEngine.playFootstep();
          }
        }

        // Hydration drain
        setPlayerState((prev) => {
          const drainRate = (isSprinting ? 0.75 : 0.25) * delta;
          return {
            ...prev,
            hydration: Math.max(0, prev.hydration - drainRate),
            isSprinting,
          };
        });
      }

      // Vertical Gravity and Ground Clamping
      const isUnderground = (undergroundLayersRef.current?.currentLevel || 0) > 0;
      let currentGroundY = 0;
      if (isUnderground && undergroundLayersRef.current) {
        currentGroundY = undergroundLayersRef.current.getFloorElevationForPosition(
          playerPos.current.x,
          playerPos.current.z,
          undergroundLayersRef.current.currentLevel
        );
      } else {
        currentGroundY = getTerrainHeight(playerPos.current.x, playerPos.current.z);
      }
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

      // 2. Camera Positioning (First-Person vs Third-Person) with Gentle Head Bobbing
      if (viewMode === 'first') {
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
        const distBehind = 4.2;
        const camYOffset = 1.8;
        const camX = playerPos.current.x + Math.sin(playerYaw.current) * distBehind;
        const camZ = playerPos.current.z + Math.cos(playerYaw.current) * distBehind;
        const camY = Math.max(
          currentGroundY + 1.2,
          playerPos.current.y + camYOffset + Math.sin(playerPitch.current) * 2.0
        );

        camera.position.set(camX, camY, camZ);
        camera.lookAt(playerPos.current.x, playerPos.current.y + 0.3, playerPos.current.z);
      }

      // First-Person Tool Swing & Idle Breathing Animation
      if (fpToolGroupRef.current) {
        const tool = playerStateRef.current.equippedTool;
        const isToolVisible = viewMode === 'first' && (tool === 'shovel' || tool === 'pickaxe');
        fpToolGroupRef.current.visible = isToolVisible;

        if (fpPickGroupRef.current) fpPickGroupRef.current.visible = tool === 'pickaxe';
        if (fpShovelGroupRef.current) fpShovelGroupRef.current.visible = tool === 'shovel';

        const breathe = Math.sin(now * 0.0022) * 0.006;
        if (toolSwingProgress.current > 0) {
          toolSwingProgress.current = Math.max(0, toolSwingProgress.current - delta * 4.2);
          const swing = Math.sin(toolSwingProgress.current * Math.PI);
          fpToolGroupRef.current.rotation.x = -swing * (tool === 'shovel' ? 0.85 : 0.7);
          fpToolGroupRef.current.rotation.z = -swing * 0.35;
          fpToolGroupRef.current.position.y = -0.28 - swing * (tool === 'shovel' ? 0.22 : 0.12) + breathe;
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
            playerStateRef.current.blocksDug >= blueprint.rockCost;
          mineBuildingRef.current.setGhost(type);
          mineBuildingRef.current.updateGhostPosition(groundHitPoint.current, ghostRotationY.current, canAfford);
        } else {
          mineBuildingRef.current.hideGhost();
        }
        mineBuildingRef.current.update(delta);
      }

      // 3. Update Granular Mining System (Drops, Voxels & Debris)
      if (miningSystemRef.current) {
        miningSystemRef.current.update(delta, playerPos.current, (drop) => {
          const goldAmount = typeof drop.value === 'number' && !isNaN(drop.value) ? drop.value : 1;
          setPlayerState((prev) => {
            const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
            return {
              ...prev,
              goldFound: currentGold + goldAmount,
            };
          });
          if (onShowBanner) {
            onShowBanner(`+${goldAmount} oz Gold collected from ore deposit!`);
          }
        });
      }

      // 4. Update Desert Wildlife (Rabbits, Snakes, Bighorn Sheep, Vultures)
      if (wildlifeManagerRef.current) {
        wildlifeManagerRef.current.update(delta, playerPos.current, getTerrainHeight);
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
              if (nextHealth <= 0) {
                // Outlaw ambush defeat: respawn at Peralta Camp
                playerPos.current.set(-115, getTerrainHeight(-115, -115) + 1.7, -115);
                if (onShowBanner) onShowBanner('Ambushed by Claim Jumpers! Rescued at Peralta Base Camp.');
                return {
                  ...prev,
                  health: 100,
                  hydration: 100,
                  position: { x: -115, y: 5, z: -115 },
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
            let extraHydration = 0;
            if (foliageManagerRef.current) {
              const fBlast = foliageManagerRef.current.explodeFoliageAt(blastPos, 5.0);
              goldBlasted += fBlast.goldBlasted;
              extraRocks = fBlast.rocksBlasted;
              extraHydration = fBlast.hydrationBlasted;

              // Spawn exploding rock/cactus/quartz debris fragments for everything shattered
              fBlast.destroyedPoints.forEach((dp) => {
                miningSystemRef.current?.spawnDigDebris(dp.pos, dp.type, 2.4);
              });
            }

            if (goldBlasted > 0 || extraRocks > 0 || extraHydration > 0) {
              setPlayerState((prev) => ({
                ...prev,
                goldFound: (prev.goldFound || 0) + goldBlasted,
                blocksDug: (prev.blocksDug || 0) + extraRocks,
                hydration: Math.min(100, (prev.hydration || 100) + extraHydration),
              }));
              if (onShowBanner) {
                onShowBanner(`💥 Blast Shattered Surrounding Rocks & Deposits! (+${goldBlasted} oz Gold, +${extraRocks} Quarry Rocks)`);
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

      // 7. Periodic Interaction Check
      checkInteractions(false);

      // 8. Update State for HUD (yaw, position)
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

      // Render scene
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
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
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
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

      {/* Click-to-look hint when not locked */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none bg-stone-950/60 backdrop-blur-sm text-stone-300 px-4 py-1.5 rounded-full text-xs font-mono border border-stone-700/40 select-none shadow">
        Click world to look freely with mouse • WASD or Arrows to walk
      </div>
    </div>
  );
};
