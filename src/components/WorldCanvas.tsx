import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createTerrainMesh, getTerrainHeight } from '../world/terrain';
import { createDesertFoliage, GoldDeposit } from '../world/foliage';
import { createLandmarkStructures } from '../world/landmarks';
import { soundEngine } from '../audio/soundEffects';
import { ClueItem, Landmark, PlayerState, Vector3D } from '../types';

interface WorldCanvasProps {
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  landmarks: Landmark[];
  clues: ClueItem[];
  timeOfDay: number;
  viewMode: 'first' | 'third';
  onPromptInteract: (prompt: string, action: () => void) => void;
  onClearPrompt: () => void;
  onDiscoverClue: (clueId: string, landmarkId: string) => void;
  onMineDeposit: (depositId: string, ounces: number) => void;
  onRefillWater: () => void;
  onEnterMine: () => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  playerState,
  setPlayerState,
  landmarks,
  clues,
  timeOfDay,
  viewMode,
  onPromptInteract,
  onClearPrompt,
  onDiscoverClue,
  onMineDeposit,
  onRefillWater,
  onEnterMine,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // References for render loop state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const playerLightRef = useRef<THREE.PointLight | null>(null);
  const characterMeshRef = useRef<THREE.Group | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const goldDepositsRef = useRef<GoldDeposit[]>([]);

  // Input states
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isPointerLocked = useRef<boolean>(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const stepTimer = useRef<number>(0);
  const detectorBeepTimer = useRef<number>(0);

  // Player position & orientation in 3D physics
  const playerPos = useRef<THREE.Vector3>(
    new THREE.Vector3(playerState.position.x, playerState.position.y, playerState.position.z)
  );
  const playerYaw = useRef<number>(playerState.rotation.yaw);
  const playerPitch = useRef<number>(playerState.rotation.pitch);

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

    const landmarkMeshes = createLandmarkStructures(scene, landmarks);

    // 6. Character Mesh for Third-Person Mode
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

    // 7. Night Sky Stars
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

    // 8. Event Handlers (Keyboard, Mouse PointerLock, Touch)
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      // Start audio ambiance on first interaction
      soundEngine.startAmbiance();

      if (e.code === 'KeyE') {
        checkInteractions(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current) return;
      const sensitivity = 0.0022;
      playerYaw.current -= e.movementX * sensitivity;
      playerPitch.current -= e.movementY * sensitivity;
      playerPitch.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, playerPitch.current));
    };

    const handleClickCanvas = () => {
      if (!isPointerLocked.current && renderer.domElement.requestPointerLock) {
        renderer.domElement.requestPointerLock();
      }
      soundEngine.startAmbiance();
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === renderer.domElement;
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
    renderer.domElement.addEventListener('click', handleClickCanvas);
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

      // 2. Lost Dutchman Mine entrance
      const distToMine = Math.hypot(px - 160, pz - 110);
      if (distToMine < 6.5) {
        if (executeAction) {
          onEnterMine();
        } else {
          onPromptInteract('Enter Lost Dutchman Mine [E]', () => onEnterMine());
        }
        return;
      }

      // 3. Landmarks & Clues
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

      // 4. Buried Gold Deposits (Pickaxe)
      for (const gd of goldDepositsRef.current) {
        if (!gd.mined) {
          const dist = Math.hypot(px - gd.position.x, pz - gd.position.z);
          if (dist < 3.5) {
            if (executeAction) {
              onMineDeposit(gd.id, gd.ounces);
              gd.mined = true;
              gd.mesh.visible = false;
            } else {
              onPromptInteract(`Mine Gold Quartz Vein [E]`, () => {
                onMineDeposit(gd.id, gd.ounces);
                gd.mined = true;
                gd.mesh.visible = false;
              });
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

      // 1. Player Physics & Input Handling
      const keys = keysPressed.current;
      const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
      const baseSpeed = isSprinting ? 14 : 7;
      const moveSpeed = baseSpeed * delta;

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

        // Boundaries check (-190 to 190)
        playerPos.current.x = Math.max(-190, Math.min(190, playerPos.current.x));
        playerPos.current.z = Math.max(-190, Math.min(190, playerPos.current.z));

        // Footstep sounds
        stepTimer.current += delta * (isSprinting ? 2.8 : 1.8);
        if (stepTimer.current > 1.0) {
          stepTimer.current = 0;
          soundEngine.playFootstep();
        }

        // Hydration drain
        setPlayerState((prev) => {
          const drainRate = (isSprinting ? 0.8 : 0.25) * delta;
          return {
            ...prev,
            hydration: Math.max(0, prev.hydration - drainRate),
            isSprinting,
          };
        });
      }

      // Height clamping
      const groundY = getTerrainHeight(playerPos.current.x, playerPos.current.z);
      playerPos.current.y = groundY + 1.7; // eye height

      // Sync character model position and rotation
      if (characterMeshRef.current) {
        characterMeshRef.current.position.set(
          playerPos.current.x,
          groundY,
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

      // 2. Camera Positioning (First-Person vs Third-Person)
      if (viewMode === 'first') {
        camera.position.copy(playerPos.current);
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
          groundY + 1.2,
          playerPos.current.y + camYOffset + Math.sin(playerPitch.current) * 2.0
        );

        camera.position.set(camX, camY, camZ);
        camera.lookAt(playerPos.current.x, playerPos.current.y + 0.3, playerPos.current.z);
      }

      // 3. Metal Detector Audio Radar
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

      // 4. Periodic Interaction Check
      checkInteractions(false);

      // 5. Update State for HUD (yaw, position)
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
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClickCanvas);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [viewMode]);

  // Update Sun & Sky Colors when timeOfDay changes
  useEffect(() => {
    if (!sunLightRef.current || !hemiLightRef.current || !sceneRef.current) return;

    // Time: 0 to 24
    // Noon is 12 (sun at zenith)
    // 16 is 4 PM (low western sun casting long shadows eastward from Weaver's Needle!)
    // 20 is dusk/sunset
    // 22-5 is night
    const angle = ((timeOfDay - 6) / 24) * Math.PI * 2;
    const sunDist = 200;
    const sunX = Math.cos(angle) * sunDist;
    const sunY = Math.sin(angle) * sunDist;
    const sunZ = Math.sin(angle * 0.5) * 60;

    sunLightRef.current.position.set(sunX, Math.max(sunY, -50), sunZ);

    const isDay = sunY > 0;
    const isSunset = timeOfDay >= 15.5 && timeOfDay <= 19;
    const isNight = timeOfDay < 5.5 || timeOfDay > 19.5;

    if (isSunset) {
      // Warm golden hour on Arizona red rock
      sceneRef.current.background = new THREE.Color(0xd66b38);
      if (sceneRef.current.fog) sceneRef.current.fog.color = new THREE.Color(0xd66b38);
      sunLightRef.current.color = new THREE.Color(0xff8c42);
      sunLightRef.current.intensity = 2.4;
      hemiLightRef.current.color = new THREE.Color(0xffa552);
      hemiLightRef.current.groundColor = new THREE.Color(0x5c2b16);
      if (starsRef.current) starsRef.current.visible = false;
    } else if (isNight) {
      // Arizona desert starry night
      sceneRef.current.background = new THREE.Color(0x0a0c16);
      if (sceneRef.current.fog) sceneRef.current.fog.color = new THREE.Color(0x0a0c16);
      sunLightRef.current.color = new THREE.Color(0x384a75);
      sunLightRef.current.intensity = 0.25;
      hemiLightRef.current.color = new THREE.Color(0x1a233a);
      hemiLightRef.current.groundColor = new THREE.Color(0x05070e);
      if (starsRef.current) starsRef.current.visible = true;
    } else {
      // Crisp Arizona desert daylight
      sceneRef.current.background = new THREE.Color(0x7ab6d6);
      if (sceneRef.current.fog) sceneRef.current.fog.color = new THREE.Color(0xddaf88);
      sunLightRef.current.color = new THREE.Color(0xfff3d6);
      sunLightRef.current.intensity = 1.8;
      hemiLightRef.current.color = new THREE.Color(0xffeedd);
      hemiLightRef.current.groundColor = new THREE.Color(0x553311);
      if (starsRef.current) starsRef.current.visible = false;
    }
  }, [timeOfDay]);

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
