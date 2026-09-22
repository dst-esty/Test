/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { ControlsOverlay } from './components/ControlsOverlay';
import { MapModal } from './components/MapModal';
import { JournalModal } from './components/JournalModal';
import { GuidebookModal } from './components/GuidebookModal';
import { ClueDialog } from './components/ClueDialog';
import { VictoryModal } from './components/VictoryModal';
import { MineBuilderModal } from './components/MineBuilderModal';
import { CampModal } from './components/CampModal';
import { ClaimDeedModal } from './components/ClaimDeedModal';
import { ClaimStakedModal } from './components/ClaimStakedModal';
import { RockDepotModal } from './components/RockDepotModal';
import { TortillaFlatModal } from './components/TortillaFlatModal';
import { TownfolkDialogueOverlay, DialogueNPCInfo } from './components/TownfolkDialogueOverlay';
import { GameOverModal } from './components/GameOverModal';
import { CompassHUD } from './components/CompassHUD';
import { CinematicSplash } from './components/CinematicSplash';
import { WeatherCanvasOverlay } from './components/WeatherCanvasOverlay';
import { dynamicWeatherEngine } from './services/dynamicWeatherEngine';
import { INITIAL_LANDMARKS, INITIAL_CLUES } from './world/clues';
import { soundEngine } from './audio/soundEffects';
import { westernMusic } from './audio/westernMusic';
import { ClaimInfo, ClueItem, Landmark, MineStructureType, PlayerState, Vector3D, WeatherType, MineLayerData, GameOverDetails, MultiplayerPlayer, MultiplayerChatMessage, RoomDirection, WaterTableState, GraphicsQuality, TerritoryClaim, TortillaFlatTab } from './types';
import { MultiplayerHUD } from './components/MultiplayerHUD';
import { ShaftSinkingStats } from './world/undergroundVoxels';
import { multiplayer } from './multiplayer/multiplayerService';
import { territoryClaims } from './services/territoryClaimService';
import { getTerrainHeight } from './world/terrain';
import { advanceDiurnalTime } from './world/atmosphere';
import { Compass, BookOpen, Map as MapIcon, Sparkles, AlertCircle } from 'lucide-react';
import { isMobileDevice } from './utils/device';
import { safeLocalStorage } from './utils/storage';
import { VigilanceStatus } from './services/apacheVigilanceService';
import { WorldScaleMode, formatUsgsDistance } from './world/superstitionTopography';
import { isScatteredSkullClue } from './services/curseNarrativeEngine';
import { armImmediateFullscreenOnFirstGesture, enterFullscreen } from './utils/fullscreen';
import { recordCoronersLogEntry } from './services/coronersLogService';

export default function App() {
  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    const startY = getTerrainHeight(0, -246) + 1.7;

    // Restore active claim from local persistence or territory registry
    let initialClaim: ClaimInfo | null = null;
    try {
      const savedClaimStr = safeLocalStorage.getItem('superstition_active_claim');
      if (savedClaimStr) {
        const parsed = JSON.parse(savedClaimStr);
        if (parsed && parsed.isClaimed && parsed.position) {
          initialClaim = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved claim from storage:', e);
    }

    if (!initialClaim) {
      const pClaim = territoryClaims.getPlayerClaim();
      if (pClaim) {
        initialClaim = {
          id: pClaim.id,
          name: pClaim.name,
          position: { x: pClaim.x, y: getTerrainHeight(pClaim.x, pClaim.z), z: pClaim.z },
          size: pClaim.radius || 40,
          isClaimed: true,
          extractedGold: pClaim.extractedGold || 0,
          blocksDug: pClaim.blocksDug || 0,
          ownerId: pClaim.ownerId,
          ownerName: pClaim.ownerName,
          stakedAt: pClaim.stakedAt,
          forSale: pClaim.forSale,
        };
      }
    }

    // Restore stats and harvested meats
    let savedGold = 2.0;
    let savedCash = 45.0;
    let savedBlocks = 0;
    let savedVenison = 0;
    let savedRabbit = 0;
    let savedMutton = 0;
    let savedProvisions = 2;

    try {
      const sg = safeLocalStorage.getItem('superstition_gold_found');
      if (sg !== null) savedGold = parseFloat(sg) || 2.0;
      const sc = safeLocalStorage.getItem('superstition_cash_dollars');
      if (sc !== null) savedCash = parseFloat(sc) || 45.0;
      const sb = safeLocalStorage.getItem('superstition_blocks_dug');
      if (sb !== null) savedBlocks = parseInt(sb, 10) || 0;
      const sv = safeLocalStorage.getItem('superstition_venison_meat');
      if (sv !== null) savedVenison = parseInt(sv, 10) || 0;
      const sr = safeLocalStorage.getItem('superstition_rabbit_meat');
      if (sr !== null) savedRabbit = parseInt(sr, 10) || 0;
      const sm = safeLocalStorage.getItem('superstition_bighorn_mutton');
      if (sm !== null) savedMutton = parseInt(sm, 10) || 0;
      const sp = safeLocalStorage.getItem('superstition_provisions_rations');
      if (sp !== null) savedProvisions = parseInt(sp, 10) || 2;
    } catch {}

    return {
      position: { x: 0, y: startY, z: -246 },
      rotation: { yaw: 0, pitch: 0 },
      health: 100,
      maxHealth: 100,
      hydration: 100,
      vigour: 100,
      maxVigour: 100,
      isInShade: false,
      isExhausted: false,
      isSprinting: false,
      isInsideMine: false,
      equippedTool: 'hands',
      ammo: 24,
      dynamite: 6,
      woodPlanks: 6, // Starting seasoned timber stakes & firewood
      goldFound: savedGold, // Starting gold from prospecting
      cashDollars: savedCash, // Starting territorial currency ($) for provisions and claim deeds
      blocksDug: savedBlocks,
      bullionBars: 0,
      activeClaim: initialClaim,
      builtStructures: [],
      discoveredLandmarks: ['tortilla_flat'],
      collectedClues: ['clue_tortilla_flat'],
      venisonMeat: savedVenison,
      rabbitMeat: savedRabbit,
      bighornMutton: savedMutton,
      provisionsRations: savedProvisions,
    };
  });

  // Territorial Registry Claims
  const [registeredClaims, setRegisteredClaims] = useState<TerritoryClaim[]>(() => territoryClaims.getAllClaims());

  // Multiplayer State
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, MultiplayerPlayer>>({});
  const [chatMessages, setChatMessages] = useState<MultiplayerChatMessage[]>([]);
  const [multiplayerPing, setMultiplayerPing] = useState<number>(35);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [selfName, setSelfName] = useState<string>(() => multiplayer.getSelfName());
  const [selfColor, setSelfColor] = useState<string>(() => multiplayer.getSelfColor());
  const [trackedPlayerPos, setTrackedPlayerPos] = useState<Vector3D | null>(null);

  // Initialize and synchronize real-time multiplayer connection
  useEffect(() => {
    multiplayer.connect();
    const handleUpdate = () => {
      const state = multiplayer.getState();
      setOnlinePlayers({ ...state.players });
      setChatMessages([...state.chatMessages]);
      setMultiplayerPing(state.ping);
      setSelfId(multiplayer.getSelfId());
      setSelfName(multiplayer.getSelfName());
      setSelfColor(multiplayer.getSelfColor());
      if (state.universalWeather) {
        setWeather(state.universalWeather);
      }
      if (typeof state.universalTimeOfDay === 'number') {
        setTimeOfDay(state.universalTimeOfDay);
      }
    };

    const unsubWeather = multiplayer.addEventHandler({
      onWeatherSync: (data) => {
        if (data.weather) {
          setWeather(data.weather);
        }
        if (typeof data.timeOfDay === 'number') {
          setTimeOfDay(data.timeOfDay);
        }
      },
    });

    multiplayer.subscribe(handleUpdate);
    return () => {
      unsubWeather();
      multiplayer.unsubscribe(handleUpdate);
      multiplayer.disconnect();
    };
  }, []);

  // World Data
  const [landmarks, setLandmarks] = useState<Landmark[]>(INITIAL_LANDMARKS);
  const [clues, setClues] = useState<ClueItem[]>(INITIAL_CLUES);

  // Modals & UI States
  const [showSplash, setShowSplash] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [journalInitialTab, setJournalInitialTab] = useState<'all' | 'gold' | 'curse' | 'coroner'>('all');
  const [isGuidebookOpen, setIsGuidebookOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [isClaimDeedOpen, setIsClaimDeedOpen] = useState(false);
  const [selectedDeedClaim, setSelectedDeedClaim] = useState<ClaimInfo | TerritoryClaim | null>(null);
  const [isDepotOpen, setIsDepotOpen] = useState(false);
  const [isTortillaFlatOpen, setIsTortillaFlatOpen] = useState(false);
  const [tortillaFlatTab, setTortillaFlatTab] = useState<TortillaFlatTab>('mercantile');
  const [activeDialogueNPC, setActiveDialogueNPC] = useState<DialogueNPCInfo | null>(null);
  const [activeBuildingType, setActiveBuildingType] = useState<MineStructureType>('timber_portal');
  const [gameOverDetails, setGameOverDetails] = useState<GameOverDetails | null>(null);
  const [claimPrompt, setClaimPrompt] = useState<{ id?: string; name: string; position: Vector3D } | null>(null);
  const [payDirtAlert, setPayDirtAlert] = useState<{ ounces: number } | null>(null);
  const payDirtTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartHandlerRef = useRef<(() => void) | null>(null);
  const teleportHandlerRef = useRef<((pos: Vector3D) => void) | null>(null);
  const mobileActionHandlerRef = useRef<(() => void) | null>(null);
  const mobileJumpHandlerRef = useRef<(() => void) | null>(null);
  const mobileInteractHandlerRef = useRef<(() => void) | null>(null);
  const mobileMoveHandlerRef = useRef<((move: { forward: number; right: number }) => void) | null>(null);
  const toggleScopeHandlerRef = useRef<(() => void) | null>(null);
  const scopeZoomHandlerRef = useRef<((delta: number) => void) | null>(null);
  const digHandlerRef = useRef<(() => void) | null>(null);
  const reinforceHandlerRef = useRef<(() => void) | null>(null);
  const excavateHandlerRef = useRef<(() => void) | null>(null);
  const shaftTraverseHandlerRef = useRef<((level: number) => void) | null>(null);
  const shaftExitHandlerRef = useRef<(() => void) | null>(null);
  const shaftDigHandlerRef = useRef<(() => void) | null>(null);
  const excavateRoomHandlerRef = useRef<((dir: RoomDirection) => void) | null>(null);
  const timberRoomHandlerRef = useRef<((dir: RoomDirection) => void) | null>(null);
  const togglePumpHandlerRef = useRef<(() => void) | null>(null);
  const strikeVoxelHandlerRef = useRef<(() => void) | null>(null);
  const placeTimberHandlerRef = useRef<(() => void) | null>(null);
  const shoreHandlerRef = useRef<(() => void) | null>(null);
  const [activeInteractAction, setActiveInteractAction] = useState<(() => void) | null>(null);
  const playerStateRef = useRef<PlayerState>(playerState);

  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  // Synchronize registered claims from territory service and update player's active claim
  useEffect(() => {
    const myProspectorId = territoryClaims.getOrCreateProspectorId();
    const unsub = territoryClaims.subscribe((claims) => {
      setRegisteredClaims(claims);
      const myClaims = claims.filter((c) => c.ownerId === myProspectorId);
      if (myClaims.length > 0) {
        setPlayerState((prev) => {
          let myClaim: TerritoryClaim | undefined;
          if (prev.activeClaim?.id) {
            myClaim = myClaims.find((c) => c.id === prev.activeClaim?.id);
          }
          if (!myClaim && prev.activeClaim?.position) {
            myClaim = myClaims.find(
              (c) => Math.hypot(c.x - prev.activeClaim!.position.x, c.z - prev.activeClaim!.position.z) < 5
            );
          }
          if (!myClaim) {
            // Pick most recent by stakedAt
            myClaim = myClaims.slice().sort((a, b) => (b.stakedAt || 0) - (a.stakedAt || 0))[0];
          }

          if (myClaim) {
            const hasChanged =
              !prev.activeClaim ||
              prev.activeClaim.id !== myClaim.id ||
              prev.activeClaim.name !== myClaim.name ||
              prev.activeClaim.extractedGold !== myClaim.extractedGold ||
              prev.activeClaim.blocksDug !== myClaim.blocksDug ||
              prev.activeClaim.forSale !== myClaim.forSale;

            if (hasChanged) {
              const updatedClaim: ClaimInfo = {
                id: myClaim.id,
                name: myClaim.name,
                position: { x: myClaim.x, y: getTerrainHeight(myClaim.x, myClaim.z), z: myClaim.z },
                size: myClaim.radius || 40,
                isClaimed: true,
                extractedGold: myClaim.extractedGold || 0,
                blocksDug: myClaim.blocksDug || 0,
                ownerId: myClaim.ownerId,
                ownerName: myClaim.ownerName,
                stakedAt: myClaim.stakedAt,
                forSale: myClaim.forSale,
              };
              safeLocalStorage.setItem('superstition_active_claim', JSON.stringify(updatedClaim));
              return {
                ...prev,
                activeClaim: updatedClaim,
              };
            }
          }
          return prev;
        });
      } else {
        // If the prospector has no active claims, clear any stale active claim
        setPlayerState((prev) => {
          if (prev.activeClaim) {
            safeLocalStorage.removeItem('superstition_active_claim');
            return {
              ...prev,
              activeClaim: null,
            };
          }
          return prev;
        });
      }
    });
    return () => unsub();
  }, []);

  // Ensure music is turned off on load, arm immediate fullscreen, and sound engine is primed on user interaction
  useEffect(() => {
    westernMusic.stop();
    // Arm immediate fullscreen so the game loads / triggers total fullscreen on the earliest possible user interaction or load
    armImmediateFullscreenOnFirstGesture();
    enterFullscreen().catch(() => {});

    const resumeAudioOnGesture = () => {
      soundEngine.startAmbiance();
      enterFullscreen().catch(() => {});
      window.removeEventListener('pointerdown', resumeAudioOnGesture);
      window.removeEventListener('keydown', resumeAudioOnGesture);
    };
    window.addEventListener('pointerdown', resumeAudioOnGesture, { once: true });
    window.addEventListener('keydown', resumeAudioOnGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', resumeAudioOnGesture);
      window.removeEventListener('keydown', resumeAudioOnGesture);
    };
  }, []);

  // Save active claim to local storage whenever it changes
  useEffect(() => {
    if (playerState.activeClaim?.isClaimed) {
      safeLocalStorage.setItem('superstition_active_claim', JSON.stringify(playerState.activeClaim));
    }
  }, [playerState.activeClaim]);

  // Persist currency, gold, blocks excavated, and harvested meats
  useEffect(() => {
    safeLocalStorage.setItem('superstition_gold_found', String(playerState.goldFound));
    safeLocalStorage.setItem('superstition_cash_dollars', String(playerState.cashDollars));
    safeLocalStorage.setItem('superstition_blocks_dug', String(playerState.blocksDug));
    safeLocalStorage.setItem('superstition_venison_meat', String(playerState.venisonMeat || 0));
    safeLocalStorage.setItem('superstition_rabbit_meat', String(playerState.rabbitMeat || 0));
    safeLocalStorage.setItem('superstition_bighorn_mutton', String(playerState.bighornMutton || 0));
    safeLocalStorage.setItem('superstition_provisions_rations', String(playerState.provisionsRations || 0));
  }, [
    playerState.goldFound,
    playerState.cashDollars,
    playerState.blocksDug,
    playerState.venisonMeat,
    playerState.rabbitMeat,
    playerState.bighornMutton,
    playerState.provisionsRations,
  ]);

  const handleMobileMove = useCallback((move: { forward: number; right: number }) => {
    if (mobileMoveHandlerRef.current) mobileMoveHandlerRef.current(move);
  }, []);

  const handleMobileAction = useCallback(() => {
    if (mobileActionHandlerRef.current) mobileActionHandlerRef.current();
  }, []);

  const handleMobileJump = useCallback(() => {
    if (mobileJumpHandlerRef.current) mobileJumpHandlerRef.current();
  }, []);

  const handleMobileInteract = useCallback(() => {
    if (mobileInteractHandlerRef.current) {
      mobileInteractHandlerRef.current();
    } else if (activeInteractAction) {
      activeInteractAction();
    }
  }, [activeInteractAction]);

  const handleShoreTrench = useCallback(() => {
    if (shoreHandlerRef.current) shoreHandlerRef.current();
  }, []);

  const [activeClueDialog, setActiveClueDialog] = useState<{
    clue?: ClueItem;
    landmark?: Landmark;
    isWater?: boolean;
  } | null>(null);

  const isAnyModalOpen =
    showSplash ||
    !hasShownWelcome ||
    isMapOpen ||
    isJournalOpen ||
    isGuidebookOpen ||
    isVictoryOpen ||
    isBuilderOpen ||
    isCampModalOpen ||
    isClaimDeedOpen ||
    isDepotOpen ||
    isTortillaFlatOpen ||
    Boolean(activeDialogueNPC) ||
    Boolean(claimPrompt) ||
    Boolean(activeClueDialog) ||
    Boolean(gameOverDetails);

  const [hitMarkerActive, setHitMarkerActive] = useState(false);
  const [damageFlashActive, setDamageFlashActive] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const triggerHitMarker = useCallback(() => {
    setHitMarkerActive(true);
    setTimeout(() => setHitMarkerActive(false), 220);
  }, []);

  const triggerDamageFlash = useCallback(() => {
    setDamageFlashActive(true);
    setTimeout(() => setDamageFlashActive(false), 300);
  }, []);

  const showBanner = useCallback((msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 4500);
  }, []);

  // Prospector's Inspection Goggles: Toggles detailed subterranean strata & shaft HUD
  const [areGogglesActive, setAreGogglesActive] = useState<boolean>(false);

  // Winchester Rifle Scope State
  const [isAimingRifle, setIsAimingRifle] = useState<boolean>(false);
  const [rifleScopeZoom, setRifleScopeZoom] = useState<number>(3.0);

  const handleToggleGoggles = useCallback(() => {
    setAreGogglesActive((prev) => {
      const next = !prev;
      soundEngine.playGogglesClick(next);
      showBanner(
        next
          ? "🥽 Prospector's Inspection Goggles ON — Subterranean Strata Diagnostics Active [Press G to remove]"
          : "🥽 Prospector's Inspection Goggles OFF — Clean Subterranean View Restored"
      );
      return next;
    });
  }, [showBanner]);

  // Graphics Quality & Frame Pacing Engine (Performance / Balanced / High)
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeLocalStorage.getItem('prospector_graphics_quality') as GraphicsQuality | null;
      if (saved && (saved === 'performance' || saved === 'balanced' || saved === 'high')) {
        return saved;
      }
      return 'performance';
    }
    return 'performance';
  });
  const [currentFps, setCurrentFps] = useState<number>(60);
  const [vigilanceStatus, setVigilanceStatus] = useState<VigilanceStatus | null>(null);

  const handleCycleGraphicsQuality = useCallback(() => {
    setGraphicsQuality((prev) => {
      const next: GraphicsQuality =
        prev === 'performance' ? 'balanced' : prev === 'balanced' ? 'high' : 'performance';
      try {
        safeLocalStorage.setItem('prospector_graphics_quality', next);
      } catch {}
      const label =
        next === 'performance'
          ? '⚡ Fast 60+ FPS Mode (Mobile optimized, 1.0 DPR, fast shadows)'
          : next === 'balanced'
          ? '⚖️ Balanced 60 FPS Mode (Smooth 60 FPS, crisp detail)'
          : '🌟 High Fidelity Mode (Full shadow maps & highest resolution)';
      showBanner(label);
      return next;
    });
  }, [showBanner]);

  // Universal Synchronized Sky & Weather Instance
  const [timeOfDay, setTimeOfDay] = useState<number>(() => multiplayer.getUniversalTimeOfDay());
  const [weather, setWeather] = useState<WeatherType>(() => multiplayer.getUniversalWeather());

  // Register dynamic weather events (sandstorms, haboobs, and dust warnings)
  useEffect(() => {
    dynamicWeatherEngine.setHandlers({
      onWeatherChange: (newWeather) => {
        setWeather(newWeather);
        multiplayer.changeWeather(newWeather);
      },
      onBanner: (message) => {
        showBanner(message);
      },
    });
  }, [showBanner]);

  const toggleHunkerRef = useRef<(() => void) | null>(null);
  const handleToggleHunkerDown = useCallback(() => {
    if (toggleHunkerRef.current) {
      toggleHunkerRef.current();
    } else {
      setPlayerState((prev) => {
        const next = !prev.isHunkeredDown;
        if (next) {
          soundEngine.playHunkerDown();
          showBanner("🛡️ Hunkered Down! Bracing against the elements in canvas bedroll & neckerchief.");
        } else {
          soundEngine.playStandUp();
          showBanner("Standing up from hunker stance.");
        }
        return { ...prev, isHunkeredDown: next };
      });
    }
  }, [showBanner]);

  // World Scale Mode: '1:1' (True USGS 7.5-minute Quadrangle Scale) vs 'compact'
  const [worldScaleMode, setWorldScaleMode] = useState<WorldScaleMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeLocalStorage.getItem('superstition_scale_mode') as WorldScaleMode | null;
      if (saved === '1:1' || saved === 'compact') return saved;
    }
    return '1:1';
  });

  const handleToggleWorldScaleMode = useCallback(() => {
    setWorldScaleMode((prev) => {
      const next = prev === '1:1' ? 'compact' : '1:1';
      safeLocalStorage.setItem('superstition_scale_mode', next);
      showBanner(
        next === '1:1'
          ? '🌍 1:1 True USGS Quadrangle Scale: Real distances (1 unit = 17.4m), 32 m/s horse gallop & 85% hydration endurance active!'
          : '📐 Compact Exploration Scale active.'
      );
      return next;
    });
  }, [showBanner]);

  // Nearby active player-built campfire or outpost camp (within 6.5m)
  const nearbyCamp = useMemo(() => {
    if (!playerState.builtStructures?.length || !playerState.position) return null;
    const px = playerState.position.x;
    const pz = playerState.position.z;
    return (
      playerState.builtStructures.find(
        (s) =>
          (s.type === 'campfire' || s.type === 'prospector_camp') &&
          Math.hypot(px - s.position.x, pz - s.position.z) < 6.5
      ) || null
    );
  }, [playerState.builtStructures, playerState.position]);

  const handleRestAtCamp = useCallback(() => {
    soundEngine.playCampfire();
    soundEngine.playWaterRefill();
    setPlayerState((prev) => ({
      ...prev,
      health: Math.min(100, (prev.health || 0) + 35),
      hydration: Math.min(100, (prev.hydration || 0) + 30),
      vigour: 100,
      isExhausted: false,
      canteenOunces: 32,
    }));
    showBanner("🔥 Rested by the fire! Warm coffee brewed, canteen filled, and vigour fully restored.");
  }, [showBanner]);

  const handleSleepUntilDawn = useCallback(() => {
    soundEngine.playCampfire();
    setTimeOfDay(6.0); // 6:00 AM Sunrise
    setPlayerState((prev) => {
      const updatedStructures = (prev.builtStructures || []).map((s) => {
        if (s.type === 'campfire' || s.type === 'prospector_camp') {
          const newFuel = Math.max(0, (s.fuelHoursRemaining ?? 12.0) - 8.0);
          return {
            ...s,
            fuelHoursRemaining: newFuel,
            isLit: newFuel > 0,
          };
        }
        return s;
      });
      return {
        ...prev,
        health: 100,
        hydration: 100,
        vigour: 100,
        isExhausted: false,
        canteenOunces: 32,
        builtStructures: updatedStructures,
      };
    });
    showBanner("🌅 Slept safely through the cold desert night until 6:00 AM! Vigour, health, and hydration fully restored.");
  }, [showBanner]);

  const handleSleepInHotel = useCallback((paymentMethod: 'cash' | 'gold') => {
    const cash = playerState.cashDollars || 0;
    const gold = playerState.goldFound || 0;

    if (paymentMethod === 'cash') {
      if (cash < 2.0) {
        showBanner("⚠️ Not enough cash to rent a room! ($2.00 required). Cash in gold at the Assayer counter.");
        return false;
      }
    } else {
      if (gold < 0.1) {
        showBanner("⚠️ Not enough gold ore to barter for a room! (0.10 oz required).");
        return false;
      }
    }

    soundEngine.playHotelRest();
    setTimeOfDay(6.0); // 6:00 AM Sunrise
    setPlayerState((prev) => ({
      ...prev,
      cashDollars: paymentMethod === 'cash' ? Math.max(0, (prev.cashDollars || 0) - 2.0) : prev.cashDollars,
      goldFound: paymentMethod === 'gold' ? Math.max(0, (prev.goldFound || 0) - 0.1) : prev.goldFound,
      health: 100,
      hydration: 100,
      vigour: 100,
      isExhausted: false,
      canteenOunces: 32,
    }));

    setIsTortillaFlatOpen(false);
    showBanner("🌅 Rested comfortably in the Superstition Hotel until 6:00 AM! Vigour and vitals fully replenished.");
    return true;
  }, [playerState.cashDollars, playerState.goldFound, showBanner]);

  const handleToggleDayNight = useCallback(() => {
    setTimeOfDay((prev) => {
      const isDay = prev >= 5.5 && prev < 19.5;
      const nextTime = isDay ? 21.0 : 9.5;
      soundEngine.playCampfire();
      showBanner(
        isDay
          ? "🌌 Night has fallen over Tortilla Flat! Main street is illuminated with festive string lights, flickering torches, and warm boardwalk lanterns."
          : "☀️ Morning sun crests over the Superstition Mountains! Tortilla Flat settles into daytime bustle."
      );
      return nextTime;
    });
  }, [showBanner]);

  const handleStokeCamp = useCallback(() => {
    if (!nearbyCamp) return;
    if ((playerState.woodPlanks || 0) < 1) {
      showBanner("⚠️ No cut wood logs! Harvest trees around springs with an Axe [X] or buy wood.");
      return;
    }
    soundEngine.playCampfire();
    const addFuel = 8.0;
    const currentFuel = nearbyCamp.fuelHoursRemaining ?? 0;
    const maxFuel = nearbyCamp.maxFuelHours || 24.0;
    const newFuel = Math.min(maxFuel, currentFuel + addFuel);

    setPlayerState((prev) => ({
      ...prev,
      woodPlanks: Math.max(0, (prev.woodPlanks || 0) - 1),
      builtStructures: (prev.builtStructures || []).map((s) =>
        s.id === nearbyCamp.id
          ? { ...s, fuelHoursRemaining: newFuel, isLit: true }
          : s
      ),
    }));
    showBanner(`🪵 Stoked ${nearbyCamp.name} with 1 Cut Wood Log! Fire rekindled (+8h fuel, ${newFuel.toFixed(1)}h total).`);
  }, [nearbyCamp, playerState.woodPlanks, showBanner]);

  const handleSelectCampStructure = useCallback((type: MineStructureType) => {
    setActiveBuildingType(type);
    setPlayerState((prev) => ({ ...prev, equippedTool: 'builder' }));
    setIsCampModalOpen(false);
    if (type === 'campfire') {
      showBanner("🔥 Frontier Campfire Equipped! Aim at ground & Left-Click to place [R to rotate, Esc to cancel].");
    } else if (type === 'prospector_camp') {
      showBanner("⛺ Prospector Outpost Camp Equipped! Aim at ground & Left-Click to pitch [R to rotate, Esc to cancel].");
    } else if (type === 'frontier_torch') {
      showBanner("🔥 Frontier Ground Torch Equipped! Aim at ground & Left-Click to drive stake into earth (place 3-4 along your trail/camp, Esc to finish).");
    }
  }, [showBanner]);

  // Subterranean Mine Shaft & Strata Layer State
  const [shaftLayers, setShaftLayers] = useState<MineLayerData[]>([]);
  const [currentMineLevel, setCurrentMineLevel] = useState<number>(0);
  const [maxUnlockedMineLevel, setMaxUnlockedMineLevel] = useState<number>(1);

  // Mini-Voxel Shaft Sinking & Bedrock Excavation State
  const [shaftSinkingStats, setShaftSinkingStats] = useState<ShaftSinkingStats | null>(null);

  // Subterranean Hydrology & Water Table State
  const [waterTable, setWaterTable] = useState<WaterTableState>({
    waterTableDepth: 92.0,
    waterLevelInLevel: {},
    isFlooding: false,
    floodRate: 0.08,
    pumpActive: false,
    pumpRate: 0.28,
    aquiferBreached: false,
    seepageWarning: false,
  });
  const [oxygenPercent, setOxygenPercent] = useState<number>(100);
  const [isSubmerged, setIsSubmerged] = useState<boolean>(false);

  // Geotechnical Pit Wall Shoring State
  const [nearbyTrench, setNearbyTrench] = useState<{
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
  } | null>(null);

  const handlePurchaseRocks = useCallback((rockAmount: number, goldCost: number) => {
    setPlayerState((prev) => {
      const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
      const currentRocks = typeof prev.blocksDug === 'number' && !isNaN(prev.blocksDug) ? prev.blocksDug : 0;
      if (currentGold < goldCost) {
        showBanner(`Need ${goldCost.toFixed(1)} oz Gold to purchase ${rockAmount} rocks!`);
        return prev;
      }
      soundEngine.playConstruct();
      showBanner(`Purchased ${rockAmount} Quarry Rocks for ${goldCost.toFixed(1)} oz Gold!`);
      return {
        ...prev,
        goldFound: Math.max(0, currentGold - goldCost),
        blocksDug: currentRocks + rockAmount,
      };
    });
  }, [showBanner]);

  const handlePurchaseWood = useCallback((woodAmount: number, goldCost: number) => {
    setPlayerState((prev) => {
      const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
      const currentWood = typeof prev.woodPlanks === 'number' && !isNaN(prev.woodPlanks) ? prev.woodPlanks : 0;
      if (currentGold < goldCost) {
        showBanner(`Need ${goldCost.toFixed(1)} oz Gold to purchase ${woodAmount} timber planks!`);
        return prev;
      }
      soundEngine.playConstruct();
      showBanner(`Purchased ${woodAmount} Timber Planks for ${goldCost.toFixed(1)} oz Gold!`);
      return {
        ...prev,
        goldFound: Math.max(0, currentGold - goldCost),
        woodPlanks: currentWood + woodAmount,
      };
    });
  }, [showBanner]);

  const handleConsumeFood = useCallback((foodType: 'venison' | 'bighorn' | 'rabbit' | 'provisions') => {
    setPlayerState((prev) => {
      let healthBonus = 0;
      let hydrationBonus = 0;
      let foodName = '';
      let hasFood = false;

      const nextState = { ...prev };

      if (foodType === 'venison' && (prev.venisonMeat || 0) > 0) {
        nextState.venisonMeat = (prev.venisonMeat || 0) - 1;
        healthBonus = 35;
        hydrationBonus = 20;
        foodName = 'Prime Venison Steak';
        hasFood = true;
      } else if (foodType === 'bighorn' && (prev.bighornMutton || 0) > 0) {
        nextState.bighornMutton = (prev.bighornMutton || 0) - 1;
        healthBonus = 45;
        hydrationBonus = 25;
        foodName = 'Mountain Bighorn Mutton';
        hasFood = true;
      } else if (foodType === 'rabbit' && (prev.rabbitMeat || 0) > 0) {
        nextState.rabbitMeat = (prev.rabbitMeat || 0) - 1;
        healthBonus = 25;
        hydrationBonus = 15;
        foodName = 'Roasted Desert Jackrabbit';
        hasFood = true;
      } else if (foodType === 'provisions' && (prev.provisionsRations || 0) > 0) {
        nextState.provisionsRations = (prev.provisionsRations || 0) - 1;
        healthBonus = 20;
        hydrationBonus = 10;
        foodName = 'Trail Hardtack Rations';
        hasFood = true;
      }

      if (!hasFood) {
        showBanner(`⚠️ No ${foodType} available in saddlebag! Hunt wild game or buy trail rations.`);
        return prev;
      }

      soundEngine.playEatFood();
      nextState.health = Math.min(100, (prev.health || 100) + healthBonus);
      nextState.hydration = Math.min(100, (prev.hydration || 100) + hydrationBonus);
      showBanner(`🍖 Consumed ${foodName}! Restored +${healthBonus}% Health & +${hydrationBonus}% Hydration.`);
      return nextState;
    });
  }, [showBanner]);

  const handlePurchaseProvisions = useCallback((amount: number, goldCost: number) => {
    setPlayerState((prev) => {
      const currentGold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
      if (currentGold < goldCost) {
        showBanner(`Need ${goldCost.toFixed(1)} oz Gold to purchase ${amount} trail provisions!`);
        return prev;
      }
      soundEngine.playCashRegister();
      showBanner(`🥫 Purchased ${amount} Trail Provisions for ${goldCost.toFixed(1)} oz Gold!`);
      return {
        ...prev,
        goldFound: Math.max(0, currentGold - goldCost),
        provisionsRations: (prev.provisionsRations || 0) + amount,
      };
    });
  }, [showBanner]);

  const handleToggleAutoRedeem = useCallback(() => {
    setPlayerState((prev) => {
      const nextVal = prev.autoRedeemGold === false ? true : false;
      if (nextVal) {
        soundEngine.playCashRegister();
        showBanner('🪙 Auto-Redeem Active: All excavated gold ore will be instantly redeemed for $20.67/oz cash!');
      } else {
        showBanner('🪙 Auto-Redeem Paused: Gold ore will be kept in raw nugget form in your pouch.');
      }
      return {
        ...prev,
        autoRedeemGold: nextVal,
      };
    });
  }, [showBanner]);

  const handleRedeemAllGold = useCallback(() => {
    setPlayerState((prev) => {
      const gold = typeof prev.goldFound === 'number' && !isNaN(prev.goldFound) ? prev.goldFound : 0;
      if (gold <= 0.05) {
        showBanner('No raw gold in pouch to redeem!');
        return prev;
      }
      const cashGain = Number((gold * 20.67).toFixed(2));
      soundEngine.playCashRegister();
      showBanner(`🪙 Redeemed ${gold.toFixed(1)} oz Raw Gold ➔ +$${cashGain.toFixed(2)} Cash ($20.67/oz)!`);
      return {
        ...prev,
        goldFound: 0,
        cashDollars: (prev.cashDollars || 0) + cashGain,
      };
    });
  }, [showBanner]);

  const handleReinforcePortal = useCallback(() => {
    if (reinforceHandlerRef.current) {
      reinforceHandlerRef.current();
    }
  }, []);

  const handleStartExcavation = useCallback(() => {
    if (excavateHandlerRef.current) {
      excavateHandlerRef.current();
    }
  }, []);

  // Mining Claims & Deeds Exchange Handlers
  const handleBuyClaim = useCallback(
    async (target: TerritoryClaim, method: 'cash' | 'gold') => {
      const priceDollars = target.priceDollars || 150;
      const priceGold = target.priceGoldOunces || Math.round((priceDollars / 20.67) * 10) / 10;
      const currentCash = playerStateRef.current.cashDollars || 0;
      const currentGold = playerStateRef.current.goldFound || 0;

      if (method === 'cash' && currentCash < priceDollars) {
        showBanner(`⚠️ Insufficient cash! $${priceDollars} required. Cash in gold at Tortilla Flat.`);
        return;
      }
      if (method === 'gold' && currentGold < priceGold) {
        showBanner(`⚠️ Insufficient raw gold! ${priceGold} oz required. Mine more paydirt.`);
        return;
      }

      const buyerId = territoryClaims.getOrCreateProspectorId();
      const buyerName = territoryClaims.getProspectorName();

      const res = await territoryClaims.buyClaim({
        claimId: target.id,
        buyerId,
        buyerName,
        paidDollars: method === 'cash' ? priceDollars : 0,
        paidGoldOunces: method === 'gold' ? priceGold : 0,
      });

      if (!res.success) {
        showBanner(`⚠️ Transaction failed: ${res.message || 'Bureau recorded error.'}`);
        return;
      }

      soundEngine.playCoins();
      const claimY = getTerrainHeight(target.x, target.z) + 0.5;
      const newClaim: ClaimInfo = {
        name: target.name,
        position: { x: target.x, y: claimY, z: target.z },
        size: target.radius || 40,
        isClaimed: true,
        extractedGold: target.extractedGold || 0,
        blocksDug: target.blocksDug || 0,
        ownerId: buyerId,
        ownerName: buyerName,
        stakedAt: target.stakedAt || Date.now(),
        forSale: false,
        priceDollars: target.priceDollars,
        priceGoldOunces: target.priceGoldOunces,
        description: target.description,
      };

      setPlayerState((prev) => ({
        ...prev,
        cashDollars: method === 'cash' ? Math.max(0, (prev.cashDollars || 0) - priceDollars) : prev.cashDollars,
        goldFound: method === 'gold' ? Math.max(0, (prev.goldFound || 0) - priceGold) : prev.goldFound,
        activeClaim: newClaim,
      }));

      showBanner(
        `📜 Mineral Patent "${target.name}" Acquired for ${
          method === 'cash' ? `$${priceDollars} Cash` : `${priceGold} oz Gold`
        }! Conveyance registered.`
      );
    },
    [showBanner]
  );

  const handleSellClaimToSyndicate = useCallback(
    async (claimId: string, payoutDollars: number) => {
      const sellerName = territoryClaims.getProspectorName();
      const res = await territoryClaims.sellClaimToSyndicate({
        claimId,
        payoutDollars,
        sellerName,
      });

      if (!res.success) {
        showBanner(`⚠️ Syndicate conveyance error: ${res.message || 'Deed rejected.'}`);
        return;
      }

      soundEngine.playCashRegister();
      setPlayerState((prev) => ({
        ...prev,
        cashDollars: (prev.cashDollars || 0) + payoutDollars,
        activeClaim: null,
      }));

      showBanner(`💰 Claim Deed Surrendered! The Arizona Territorial Mining Syndicate paid +$${payoutDollars}.00 in cash.`);
    },
    [showBanner]
  );

  const handleListClaimForSale = useCallback(
    async (claimId: string, priceDollars: number, priceGold: number, desc: string) => {
      const res = await territoryClaims.listClaimForSale({
        claimId,
        priceDollars,
        priceGoldOunces: priceGold,
        description: desc,
      });

      if (!res.success) {
        showBanner(`⚠️ Listing failed: ${res.message || 'Could not post deed.'}`);
        return;
      }

      setPlayerState((prev) => ({
        ...prev,
        activeClaim: prev.activeClaim
          ? {
              ...prev.activeClaim,
              forSale: true,
              priceDollars,
              priceGoldOunces: priceGold,
              description: desc,
            }
          : null,
      }));

      showBanner(`🏷️ Claim Deed Listed on the District Exchange for $${priceDollars} / ${priceGold} oz gold!`);
    },
    [showBanner]
  );

  const handleCancelListing = useCallback(
    async (claimId: string) => {
      await territoryClaims.cancelSaleListing(claimId);
      setPlayerState((prev) => ({
        ...prev,
        activeClaim: prev.activeClaim ? { ...prev.activeClaim, forSale: false } : null,
      }));
      showBanner(`Deed listing withdrawn from the open exchange.`);
    },
    [showBanner]
  );

  const handleTradeOfferResponse = useCallback(
    async (offerId: string, accept: boolean) => {
      const res = await territoryClaims.respondToTradeOffer(offerId, accept);
      if (!res.success) {
        showBanner(`⚠️ Trade tender response error: ${res.message || 'Offer expired.'}`);
        return;
      }

      if (accept) {
        soundEngine.playCashRegister();
        showBanner(`🤝 Barter Tender Accepted! Land Recorder Horace Miller has filed the deed conveyance.`);
      } else {
        showBanner(`Tender declined and returned to sender.`);
      }
    },
    [showBanner]
  );

  const handleClearAllClaims = useCallback(async () => {
    await territoryClaims.clearAllClaims();
    setRegisteredClaims([]);
    setPlayerState((prev) => ({
      ...prev,
      activeClaim: null,
    }));
    soundEngine.playDiscovery();
    showBanner('🧹 All mineral claims removed for testing!');
  }, [showBanner]);

  // Universal continuous sun & celestial progression (shared instance)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay((prev) => advanceDiurnalTime(prev, 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Diurnal acoustic serenade: Synchronize ambient music to dawn and dusk windows
  useEffect(() => {
    westernMusic.updateDiurnalTime(timeOfDay);
  }, [timeOfDay]);

  // Tortilla Flat Nighttime Hotel Boarding Announcement Banner
  const isNightTime = timeOfDay >= 19.5 || timeOfDay < 5.5;
  const prevNightStateRef = useRef<boolean>(isNightTime);
  useEffect(() => {
    if (isNightTime && !prevNightStateRef.current) {
      const px = playerState.position?.x ?? 0;
      const pz = playerState.position?.z ?? -250;
      const distToTown = Math.hypot(px - 0, pz - (-250));
      if (distToTown < 65) {
        showBanner("🛏️ Night has fallen over Tortilla Flat! You can rent a room at the Superstition Hotel ($2.00) or rest by the campfire until dawn.");
      }
    }
    prevNightStateRef.current = isNightTime;
  }, [isNightTime, playerState.position, showBanner]);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'first' | 'third'>('first');
  const [interactionPrompt, setInteractionPrompt] = useState<string | undefined>(undefined);

  // Global HUD Visibility and Wilderness Telegraph State
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isTelegraphOpen, setIsTelegraphOpen] = useState(false);
  const [unreadTelegraphCount, setUnreadTelegraphCount] = useState(0);
  const [rosterModalTab, setRosterModalTab] = useState<'roster' | 'pardners' | 'customize' | 'chat' | null>(null);

  // Track unread messages when telegraph is closed
  const prevChatCountRef = useRef<number>(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      if (!isTelegraphOpen) {
        setUnreadTelegraphCount((prev) => prev + (chatMessages.length - prevChatCountRef.current));
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages, isTelegraphOpen]);

  useEffect(() => {
    if (isTelegraphOpen) {
      setUnreadTelegraphCount(0);
    }
  }, [isTelegraphOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'KeyH') {
        e.preventDefault();
        setIsHudVisible((prev) => !prev);
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        handleToggleGoggles();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleGoggles]);

  // Handle Companion Mount toggle (Burro / Pony)
  const handleToggleMount = useCallback(() => {
    if (!playerState.ownedMount) return;
    const newRiding = !playerState.isRidingMount;
    setPlayerState((prev) => ({
      ...prev,
      isRidingMount: newRiding,
    }));
    soundEngine.playMountSaddle();
    if (newRiding) {
      if (playerState.ownedMount === 'burro') soundEngine.playBurroBray();
      else soundEngine.playHorseWhinny();
    }
    const mName = playerState.mountName || (playerState.ownedMount === 'burro' ? 'Pack Burro' : 'Mountain Pony');
    showBanner(
      newRiding
        ? `Mounted ${mName}! Press [M] or tap button to dismount.`
        : `Dismounted ${mName}. Your loyal companion follows closely.`
    );
  }, [playerState.ownedMount, playerState.isRidingMount, playerState.mountName, showBanner]);

  // Handle drinking from canteen
  const handleDrinkCanteen = useCallback(() => {
    setPlayerState((prev) => {
      const currentOz = prev.canteenOunces ?? 32;
      if (currentOz <= 0) {
        showBanner("⚠️ Canteen is bone dry! Refill at the Tortilla Flat artesian spring, mountain tinajas, or river.");
        soundEngine.playThirstCue();
        return prev;
      }
      if (prev.hydration >= 98) {
        showBanner("💧 You are already well hydrated!");
        return prev;
      }
      const ozToDrink = Math.min(8, currentOz);
      const remainingOz = currentOz - ozToDrink;
      const hydrationGain = ozToDrink * 4.5; // 8 oz = +36% hydration
      soundEngine.playDrink();
      const newHydration = Math.min(100, (prev.hydration || 0) + hydrationGain);
      const newVigour = Math.min(100, (prev.vigour ?? 100) + 35);
      showBanner(`💧 Took a swig from canteen (+${Math.round(hydrationGain)}% Hydration, +35% Vigour). ${remainingOz} oz left.`);
      return {
        ...prev,
        hydration: newHydration,
        vigour: newVigour,
        isExhausted: false,
        canteenOunces: remainingOz,
      };
    });
  }, [showBanner]);

  // Calculate nearest landmark for Compass HUD
  const nearestLandmark = React.useMemo(() => {
    let nearest: Landmark | null = null;
    let minDist = 9999;
    for (const lm of landmarks) {
      const d = Math.hypot(playerState.position.x - lm.position.x, playerState.position.z - lm.position.z);
      if (d < minDist) {
        minDist = d;
        nearest = lm;
      }
    }
    return nearest ? { name: nearest.name, dist: minDist } : undefined;
  }, [playerState.position.x, playerState.position.z, landmarks]);

  // Handle clue discovery
  const handleDiscoverClue = useCallback(
    (clueId: string, landmarkId: string) => {
      const isSkull = isScatteredSkullClue(clueId);
      if (isSkull) {
        soundEngine.playSkullWhisperDiscovery();
        showBanner('💀 Haunting whispers drift down the canyon as scattered bleached remains are uncovered...');
      } else {
        soundEngine.playDiscovery();
      }

      setClues((prev) =>
        prev.map((c) => (c.id === clueId ? { ...c, discovered: true } : c))
      );

      setLandmarks((prev) =>
        prev.map((lm) => (lm.id === landmarkId ? { ...lm, discovered: true } : lm))
      );

      const targetClue = clues.find((c) => c.id === clueId);
      const targetLm = landmarks.find((l) => l.id === landmarkId);

      setActiveClueDialog({
        clue: targetClue,
        landmark: targetLm,
      });

      // Broadcast historic discovery to multiplayer peers
      if (targetLm) {
        multiplayer.broadcastDiscovery(targetLm.name, targetLm.shortDesc);
      }
    },
    [clues, landmarks, showBanner]
  );

  // Multiplayer Actions
  const handleUpdateProfile = useCallback((name: string, color: string, metadata?: Record<string, any>) => {
    multiplayer.onUpdateProfile(name, color, metadata);
    setSelfName(name);
    setSelfColor(color);
  }, []);

  const handleSendChat = useCallback((text: string, shout = false) => {
    multiplayer.sendChat(text, shout);
  }, []);

  const handleTrackPlayer = useCallback((p: MultiplayerPlayer) => {
    setTrackedPlayerPos({ x: p.x, y: p.y, z: p.z });
    showBanner(`🧭 Tracking fellow prospector ${p.name} (${Math.round(p.distanceToLocal || 0)}m away)`);
  }, [showBanner]);

  // Handle drinking water
  const handleRefillWater = useCallback(() => {
    soundEngine.playDrink();
    setPlayerState((prev) => ({
      ...prev,
      hydration: 100,
      vigour: 100,
      isExhausted: false,
    }));
    setActiveClueDialog({
      isWater: true,
      landmark: {
        id: 'water_point',
        name: 'Fresh Mountain Water',
        shortDesc: 'Cold natural spring water bubbling from the rocks. Canteen and vigour fully replenished!',
        position: playerState.position,
        radius: 5,
        discovered: true,
        type: 'spring',
      },
    });
  }, [playerState.position]);

  // Handle mining a gold deposit
  const handleMineDeposit = useCallback((depositId: string, ounces: number) => {
    soundEngine.playPickaxe();
    setPlayerState((prev) => ({
      ...prev,
      goldFound: prev.goldFound + ounces,
    }));
  }, []);

  // Enter the Lost Dutchman Mine
  const handleEnterMine = useCallback(() => {
    soundEngine.playDiscovery();
    const mineY = getTerrainHeight(160, 110);
    const dest = { x: 160, y: mineY - 0.5, z: 132 };
    if (teleportHandlerRef.current) {
      teleportHandlerRef.current(dest);
    }
    setPlayerState((prev) => ({
      ...prev,
      isInsideMine: true,
      position: dest,
    }));

    // Mark mine landmark and clue as discovered
    setLandmarks((prev) =>
      prev.map((lm) => (lm.id === 'lost_dutchman_mine' ? { ...lm, discovered: true } : lm))
    );
    setClues((prev) =>
      prev.map((c) => (c.id === 'clue_mine' ? { ...c, discovered: true } : c))
    );

    setIsVictoryOpen(true);
  }, []);

  // Fast travel from Map, Claim Deed, or Stagecoach
  const handleFastTravel = (targetPos: Vector3D, destinationLabel?: string) => {
    // If destination is Weaver's Needle monolithic core, place the player safely at the scenic lookout saddle (-25, 18) looking up at the spire!
    let targetX = targetPos.x;
    let targetZ = targetPos.z;
    if (Math.hypot(targetPos.x - 0, targetPos.z - 15) < 16) {
      targetX = -25;
      targetZ = 18;
    }

    const terrainY = getTerrainHeight(targetX, targetZ) + 1.7;
    const dest = { x: targetX, y: terrainY, z: targetZ };

    // Find nearby landmark if any
    const nearbyLm = landmarks.find(
      (lm) => Math.hypot(lm.position.x - targetPos.x, lm.position.z - targetPos.z) < 60
    );
    const label = destinationLabel || nearbyLm?.name || 'Wilderness Destination';

    if (teleportHandlerRef.current) {
      teleportHandlerRef.current(dest);
    }

    setPlayerState((prev) => {
      const discovered = new Set(prev.discoveredLandmarks || []);
      if (nearbyLm) {
        discovered.add(nearbyLm.id);
      }
      return {
        ...prev,
        position: dest,
        isInsideMine: false,
        discoveredLandmarks: Array.from(discovered),
      };
    });

    if (nearbyLm) {
      setLandmarks((prev) =>
        prev.map((lm) => (lm.id === nearbyLm.id ? { ...lm, discovered: true } : lm))
      );
    }

    setIsMapOpen(false);
    setIsClaimDeedOpen(false);
    setIsTortillaFlatOpen(false);
    soundEngine.playFootstep();
    const travelDist = Math.hypot(targetPos.x - playerState.position.x, targetPos.z - playerState.position.z);
    const distStr = formatUsgsDistance(travelDist, worldScaleMode).formatted;
    showBanner(`⚡ Fast-traveled to "${label}" (${distStr})!`);
  };

  // Restart Expedition after Fatal Death (lose all gold & claims, start over at Tortilla Flat)
  const handleRestartExpedition = useCallback(() => {
    const startY = getTerrainHeight(0, -246) + 1.7;
    setPlayerState({
      position: { x: 0, y: startY, z: -246 },
      rotation: { yaw: 0, pitch: 0 },
      health: 100,
      maxHealth: 100,
      hydration: 100,
      vigour: 100,
      maxVigour: 100,
      isInShade: false,
      isExhausted: false,
      isSprinting: false,
      isInsideMine: false,
      equippedTool: 'hands',
      ammo: 24,
      dynamite: 6,
      woodPlanks: 6,
      goldFound: 0, // Lost all gold on death
      cashDollars: 25.0, // Retain modest emergency cash on respawn
      blocksDug: 0,
      bullionBars: 0,
      activeClaim: null, // Lost claim on death
      builtStructures: [],
      discoveredLandmarks: ['tortilla_flat'],
      collectedClues: ['clue_tortilla_flat'],
    });

    setGameOverDetails(null);

    if (restartHandlerRef.current) {
      restartHandlerRef.current();
    }

    showBanner('🌅 A New Expedition Begins at Historic Tortilla Flat! Provision at the Saloon & keep your canteen full.');
  }, [showBanner]);

  const handlePlayerDeath = useCallback((details: GameOverDetails) => {
    setGameOverDetails(details);
    recordCoronersLogEntry(details);
  }, []);

  // Keyboard shortcuts (M, J, B, V, 1-9, Esc)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyM') {
        if (playerStateRef.current.isRidingMount) {
          e.preventDefault();
          handleToggleMount();
        } else {
          setIsMapOpen((prev) => !prev);
        }
      } else if (e.code === 'KeyJ') {
        setIsJournalOpen((prev) => !prev);
      } else if (e.code === 'KeyG') {
        setIsGuidebookOpen((prev) => !prev);
      } else if (e.code === 'KeyB') {
        if (!playerStateRef.current.activeClaim?.isClaimed) {
          showBanner("⚠️ A mine can only be built on a staked claim! Equip Claim Stake [9] to stake territory first.");
        } else {
          setIsBuilderOpen((prev) => !prev);
        }
      } else if (e.code === 'KeyK') {
        setIsClaimDeedOpen((prev) => !prev);
      } else if (e.code === 'KeyV') {
        setViewMode((prev) => (prev === 'first' ? 'third' : 'first'));
      } else if (e.code === 'Escape') {
        setIsMapOpen(false);
        setIsJournalOpen(false);
        setIsGuidebookOpen(false);
        setIsVictoryOpen(false);
        setIsBuilderOpen(false);
        setIsClaimDeedOpen(false);
        setIsDepotOpen(false);
        setClaimPrompt(null);
        setActiveClueDialog(null);
      } else if (e.code === 'Backquote') {
        setPlayerState((p) => ({ ...p, equippedTool: 'hands' }));
      } else if (e.code === 'Digit1') {
        setPlayerState((p) => ({ ...p, equippedTool: 'compass' }));
      } else if (e.code === 'Digit2') {
        setPlayerState((p) => ({ ...p, equippedTool: 'lantern' }));
      } else if (e.code === 'Digit3') {
        setPlayerState((p) => ({ ...p, equippedTool: 'shovel' }));
      } else if (e.code === 'Digit4') {
        setPlayerState((p) => ({ ...p, equippedTool: 'pickaxe' }));
      } else if (e.code === 'KeyX') {
        setPlayerState((p) => ({ ...p, equippedTool: 'axe' }));
      } else if (e.code === 'Digit5') {
        setPlayerState((p) => ({ ...p, equippedTool: 'rifle' }));
      } else if (e.code === 'Digit6') {
        setPlayerState((p) => ({ ...p, equippedTool: 'dynamite' }));
      } else if (e.code === 'Digit7') {
        setPlayerState((p) => ({ ...p, equippedTool: 'detector' }));
      } else if (e.code === 'Digit8') {
        setPlayerState((p) => ({ ...p, equippedTool: 'binoculars' }));
      } else if (e.code === 'Digit9') {
        setPlayerState((p) => ({ ...p, equippedTool: 'stake' }));
      } else if (e.code === 'Digit0') {
        if (!playerStateRef.current.activeClaim?.isClaimed) {
          showBanner("⚠️ Staked claim required for Mine Builder! Equip Claim Stake [9] to stake territory first.");
        } else {
          setPlayerState((p) => ({ ...p, equippedTool: 'builder' }));
        }
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        handleToggleGoggles();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleToggleGoggles]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans select-none">
      {/* 3D World Canvas Viewport */}
      <WorldCanvas
        playerState={playerState}
        setPlayerState={setPlayerState}
        landmarks={landmarks}
        clues={clues}
        timeOfDay={timeOfDay}
        weather={weather}
        viewMode={viewMode}
        onRegisterDigHandler={(fn) => {
          digHandlerRef.current = fn;
        }}
        onPromptInteract={(prompt, action) => {
          setInteractionPrompt(prompt);
          setActiveInteractAction(() => action);
        }}
        onClearPrompt={() => {
          setInteractionPrompt(undefined);
          setActiveInteractAction(null);
        }}
        onDiscoverClue={handleDiscoverClue}
        onMineDeposit={handleMineDeposit}
        onRefillWater={handleRefillWater}
        onEnterMine={handleEnterMine}
        onTriggerHitMarker={triggerHitMarker}
        onTriggerDamageFlash={triggerDamageFlash}
        onShowBanner={showBanner}
        isUIOpen={isAnyModalOpen}
        onPayDirtHit={(ounces) => {
          if (!playerStateRef.current.activeClaim?.isClaimed) {
            setPayDirtAlert({ ounces });
            soundEngine.playOreChime();
            if (payDirtTimerRef.current) {
              clearTimeout(payDirtTimerRef.current);
            }
            // Auto fade-out after 3.2 seconds so it's quick and unobtrusive
            payDirtTimerRef.current = setTimeout(() => {
              setPayDirtAlert(null);
              payDirtTimerRef.current = null;
            }, 3200);
          }
        }}
        onStakeClaim={async (name, pos) => {
          setPayDirtAlert(null);
          const ownerId = territoryClaims.getOrCreateProspectorId();
          const ownerName = territoryClaims.getProspectorName();
          const res = await territoryClaims.stakeClaim({
            name,
            position: pos,
            ownerId,
            ownerName,
          });
          if (!res.success) {
            soundEngine.playGogglesClick(false);
            showBanner(res.message || 'Cannot stake claim: Ground overlaps registered territory!');
            return;
          }
          soundEngine.playHammerStake();
          const actualClaim = res.claim;
          const assignedName = actualClaim?.name || name;
          const claimObj: ClaimInfo = {
            id: actualClaim?.id,
            name: assignedName,
            position: pos,
            size: actualClaim?.radius || 40,
            isClaimed: true,
            extractedGold: actualClaim?.extractedGold || 0,
            blocksDug: actualClaim?.blocksDug || 0,
            ownerId,
            ownerName,
            stakedAt: actualClaim?.stakedAt || Date.now(),
          };
          safeLocalStorage.setItem('superstition_active_claim', JSON.stringify(claimObj));
          setPlayerState((prev) => ({
            ...prev,
            activeClaim: claimObj,
          }));
          showBanner(`Claim "${assignedName}" Legally Staked and Registered!`);
          setClaimPrompt({ id: actualClaim?.id, name: assignedName, position: pos });
        }}
        onBuildStructure={(_type, _pos, _rot) => {
          soundEngine.playConstruct();
          setIsCampModalOpen(false);
          setIsBuilderOpen(false);
        }}
        onOpenDeedModal={(claim) => {
          if (claim) setSelectedDeedClaim(claim as any);
          setIsClaimDeedOpen(true);
        }}
        onOpenBuilder={() => setIsBuilderOpen(true)}
        onOpenCamp={() => setIsCampModalOpen(true)}
        activeBuildingType={activeBuildingType}
        onRegisterReinforceHandler={(fn) => {
          reinforceHandlerRef.current = fn;
        }}
        onRegisterExcavateHandler={(fn) => {
          excavateHandlerRef.current = fn;
        }}
        onRegisterShaftTraverseHandler={(fn) => {
          shaftTraverseHandlerRef.current = fn;
        }}
        onRegisterShaftExitHandler={(fn) => {
          shaftExitHandlerRef.current = fn;
        }}
        onRegisterShaftDigHandler={(fn) => {
          shaftDigHandlerRef.current = fn;
        }}
        onRegisterExcavateRoomHandler={(fn) => {
          excavateRoomHandlerRef.current = fn;
        }}
        onRegisterTimberRoomHandler={(fn) => {
          timberRoomHandlerRef.current = fn;
        }}
        onRegisterTogglePumpHandler={(fn) => {
          togglePumpHandlerRef.current = fn;
        }}
        onUpdateWaterTable={setWaterTable}
        onUpdateOxygen={(ox, sub) => {
          setOxygenPercent(ox);
          setIsSubmerged(sub);
        }}
        onUpdateShaftLayers={(layers) => {
          setShaftLayers(layers);
        }}
        onUpdateShaftLevel={(level, maxLevel) => {
          setCurrentMineLevel(level);
          setMaxUnlockedMineLevel(maxLevel);
          setPlayerState((prev) => ({
            ...prev,
            isInsideMine: level > 0,
            currentMineLevel: level,
            maxUnlockedMineLevel: maxLevel,
          }));
        }}
        onNearbyTrenchChange={setNearbyTrench}
        onRegisterShoreHandler={(fn) => {
          shoreHandlerRef.current = fn;
        }}
        isGameOver={Boolean(gameOverDetails)}
        onPlayerDeath={handlePlayerDeath}
        onRegisterRestartHandler={(fn) => {
          restartHandlerRef.current = fn;
        }}
        onRegisterTeleportHandler={(fn) => {
          teleportHandlerRef.current = fn;
        }}
        trackedPlayerPos={trackedPlayerPos}
        onUpdateShaftSinkingStats={setShaftSinkingStats}
        onRegisterStrikeVoxelHandler={(fn) => {
          strikeVoxelHandlerRef.current = fn;
        }}
        onRegisterPlaceTimberHandler={(fn) => {
          placeTimberHandlerRef.current = fn;
        }}
        onRegisterMobileActionHandler={(fn) => {
          mobileActionHandlerRef.current = fn;
        }}
        onRegisterMobileJumpHandler={(fn) => {
          mobileJumpHandlerRef.current = fn;
        }}
        onRegisterMobileInteractHandler={(fn) => {
          mobileInteractHandlerRef.current = fn;
        }}
        onRegisterMobileMoveHandler={(fn) => {
          mobileMoveHandlerRef.current = fn;
        }}
        onOpenTortillaFlat={(tab) => {
          setTortillaFlatTab(tab || 'mercantile');
          setIsTortillaFlatOpen(true);
        }}
        onOpenTownfolkDialogue={(npc) => {
          setActiveDialogueNPC(npc);
        }}
        onToggleDayNight={handleToggleDayNight}
        graphicsQuality={graphicsQuality}
        onFpsUpdate={setCurrentFps}
        onAimingRifleChange={(aiming, zoom) => {
          setIsAimingRifle(aiming);
          setRifleScopeZoom(zoom);
        }}
        onRegisterToggleScopeHandler={(fn) => {
          toggleScopeHandlerRef.current = fn;
        }}
        onRegisterScopeZoomHandler={(fn) => {
          scopeZoomHandlerRef.current = fn;
        }}
        onUpdateVigilance={setVigilanceStatus}
        areGogglesActive={areGogglesActive}
        onToggleGoggles={handleToggleGoggles}
        worldScaleMode={worldScaleMode}
        onRegisterToggleHunkerHandler={(fn) => {
          toggleHunkerRef.current = fn;
        }}
        onToggleHunkerDown={handleToggleHunkerDown}
      />

      {/* Dynamic Weather Screen Atmosphere & Haboob Sandstorm Overlay */}
      <WeatherCanvasOverlay
        weather={weather}
        timeOfDay={timeOfDay}
        isUnderground={playerState.isInsideMine}
        isHunkeredDown={playerState.isHunkeredDown}
        onToggleHunkerDown={handleToggleHunkerDown}
      />

      {/* Compass & Diurnal Cycle HUD with Day/Night Illumination Toggle & Endless Coordinates */}
      {isHudVisible && (
        <CompassHUD
          yaw={playerState.rotation.yaw}
          timeOfDay={timeOfDay}
          nearestLandmarkName={nearestLandmark?.name}
          nearestLandmarkDist={nearestLandmark?.dist}
          hydration={playerState.hydration}
          goldFound={playerState.goldFound}
          isInsideMine={false}
          onToggleDayNight={handleToggleDayNight}
          playerCoords={{ x: playerState.position.x, y: playerState.position.y, z: playerState.position.z }}
          worldScaleMode={worldScaleMode}
          onToggleWorldScaleMode={handleToggleWorldScaleMode}
          onlinePlayers={Object.values(onlinePlayers)}
          selfName={selfName}
          onTrackPlayer={handleTrackPlayer}
          onOpenMultiplayerModal={() => setRosterModalTab('customize')}
        />
      )}

      {/* Real-time Frontier Multiplayer HUD & Roster Modal */}
      <MultiplayerHUD
        onlinePlayers={onlinePlayers}
        chatMessages={chatMessages}
        ping={multiplayerPing}
        selfId={selfId}
        selfName={selfName}
        selfColor={selfColor}
        onUpdateProfile={handleUpdateProfile}
        onSendChat={handleSendChat}
        onTrackPlayer={handleTrackPlayer}
        visible={isHudVisible}
        isOpen={isTelegraphOpen}
        onToggleOpen={(open) => {
          setIsTelegraphOpen(open);
        }}
        openRosterTab={rosterModalTab}
        onCloseRosterModal={() => setRosterModalTab(null)}
      />

      {/* Main Controls & Inventory Overlay */}
      <ControlsOverlay
        playerState={playerState}
        vigilanceStatus={vigilanceStatus}
        timeOfDay={timeOfDay}
        nearestLandmark={nearestLandmark}
        isAimingRifle={isAimingRifle}
        scopeZoom={rifleScopeZoom}
        onToggleHunkerDown={handleToggleHunkerDown}
        onToggleAimRifle={() => {
          if (toggleScopeHandlerRef.current) toggleScopeHandlerRef.current();
        }}
        onZoomInScope={() => {
          if (scopeZoomHandlerRef.current) scopeZoomHandlerRef.current(0.5);
        }}
        onZoomOutScope={() => {
          if (scopeZoomHandlerRef.current) scopeZoomHandlerRef.current(-0.5);
        }}
        onSelectTool={(tool) => {
          if (tool === 'builder' && !playerState.activeClaim?.isClaimed) {
            showBanner("⚠️ A mine can only be built on a staked claim! Equip Claim Stake [9] to claim territory first.");
            return;
          }
          setPlayerState((p) => ({ ...p, equippedTool: tool }));
        }}
        onOpenMap={() => setIsMapOpen(true)}
        onOpenJournal={() => setIsJournalOpen(true)}
        onOpenGuidebook={() => setIsGuidebookOpen(true)}
        onOpenBuilder={() => setIsBuilderOpen(true)}
        onOpenCamp={() => setIsCampModalOpen(true)}
        onOpenClaimDeed={(claim) => {
          if (claim) setSelectedDeedClaim(claim as any);
          setIsClaimDeedOpen(true);
        }}
        registeredClaims={registeredClaims}
        activeBuildingType={activeBuildingType}
        onRotateBlueprint={() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
        }}
        onOpenRockDepot={() => setIsDepotOpen(true)}
        onReinforcePortal={handleReinforcePortal}
        onStartPortalExcavation={handleStartExcavation}
        onPurchaseRocks={handlePurchaseRocks}
        onPurchaseWood={handlePurchaseWood}
        onConsumeFood={handleConsumeFood}
        onPurchaseProvisions={handlePurchaseProvisions}
        onToggleAutoRedeem={handleToggleAutoRedeem}
        onRedeemAllGold={handleRedeemAllGold}
        payDirtAlert={payDirtAlert}
        onDismissPayDirtAlert={() => {
          if (payDirtTimerRef.current) {
            clearTimeout(payDirtTimerRef.current);
            payDirtTimerRef.current = null;
          }
          setPayDirtAlert(null);
        }}
        onStakePayDirt={() => {
          if (payDirtTimerRef.current) {
            clearTimeout(payDirtTimerRef.current);
            payDirtTimerRef.current = null;
          }
          setPlayerState((p) => ({ ...p, equippedTool: 'stake' }));
          showBanner("Equipped Survey Claim Stake [9]! Aim at this pay dirt ground and Left-Click to secure your 40-acre claim perimeter.");
          setPayDirtAlert(null);
        }}
        hudVisible={isHudVisible}
        onToggleHud={() => setIsHudVisible((prev) => !prev)}
        isTelegraphOpen={isTelegraphOpen}
        onToggleTelegraph={() => {
          setIsTelegraphOpen((prev) => {
            const next = !prev;
            if (next) setUnreadTelegraphCount(0);
            return next;
          });
        }}
        unreadTelegraphCount={unreadTelegraphCount}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          soundEngine.setMuted(!next);
          if (!next) {
            westernMusic.mute();
          }
        }}
        soundEnabled={soundEnabled}
        onToggleCamera={() => setViewMode((prev) => (prev === 'first' ? 'third' : 'first'))}
        viewMode={viewMode}
        onDig={() => {
          if (digHandlerRef.current) digHandlerRef.current();
        }}
        interactionPrompt={interactionPrompt}
        onInteract={() => {
          if (activeInteractAction) activeInteractAction();
        }}
        onMineDeposit={() => {
          if (activeInteractAction) activeInteractAction();
        }}
        hitMarker={hitMarkerActive}
        damageFlash={damageFlashActive}
        bannerMessage={bannerMessage}
        nearbyTrench={nearbyTrench}
        onShoreTrench={handleShoreTrench}
        onMobileAction={handleMobileAction}
        onMobileJump={handleMobileJump}
        onMobileMove={handleMobileMove}
        onMobileInteract={handleMobileInteract}
        graphicsQuality={graphicsQuality}
        fps={currentFps}
        onCycleGraphicsQuality={handleCycleGraphicsQuality}
        areGogglesActive={areGogglesActive}
        onToggleGoggles={handleToggleGoggles}
        onToggleMount={handleToggleMount}
        onDrinkCanteen={handleDrinkCanteen}
        onOpenTitleScreen={() => setShowSplash(true)}
      />

      {/* Cinematic Splash Screen (Triple-A Game Start Style) */}
      {showSplash && (
        <CinematicSplash
          onEnterGame={() => {
            setShowSplash(false);
            setHasShownWelcome(true);
            soundEngine.startAmbiance();
          }}
        />
      )}

      {/* Welcome & Expedition Briefing Modal (accessible if splash dismissed without starting directly) */}
      {!showSplash && !hasShownWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl bg-gradient-to-b from-[#f5ebd2] to-[#ebe0c5] text-stone-900 rounded-2xl shadow-2xl border-4 border-[#7a4f27] p-6 sm:p-8 font-serif">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#5c3e21] text-amber-300 shadow-md">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-900 font-bold uppercase block">
                  Superstition Wilderness Expedition
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#38210f] tracking-wide">
                  The Lost Dutchman Gold
                </h1>
              </div>
            </div>

            <p className="text-stone-700 text-sm leading-relaxed mb-4">
              Deep in the rugged volcanic crags of Arizona&apos;s Superstition Mountains lies America&apos;s most notorious treasure: the fabled lost gold mine of German immigrant Jacob Waltz. You begin your journey at the historic settlement of <strong>Tortilla Flat</strong> nestled along the banks of Tortilla Creek on the Apache Trail.
            </p>

            <div className="bg-[#e4d4b3] p-3.5 rounded-xl border border-[#c2aa83] text-xs text-stone-800 space-y-2 mb-6 font-sans">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Controls:</span>
                <span className="font-mono text-[11px] text-stone-700">WASD to walk • Left Click to Mine / Shoot / Throw • Shift sprint • [V] Toggle 1st/3rd Person</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Arsenal:</span>
                <span className="font-mono text-[11px] text-stone-700">[1] Compass [2] Lantern [3] Shovel [4] Pickaxe [5] Rifle [6] Dynamite [7] Detector [8] Field Glass [9] Claim Stake [0] Mine Builder [X] Axe</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Claim & Dig:</span>
                <span>Stake a claim at the mining boundary monument [E]. Carve out realistic rock layers, ore veins, and quartz voxels with your pickaxe or blasts!</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Frontier Multiplayer:</span>
                <span>Explore with fellow prospectors in real time! Share excavation pits, customize your miner outfit, shout telegraph updates [Enter], and track teammates [Compass].</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Frontier Perils:</span>
                <span>Watch out for rattlesnakes, desert wildlife, and hostile outlaw bandits defending territory with firearms!</span>
              </div>
            </div>

            <button
              id="begin-expedition-btn"
              onClick={() => {
                setHasShownWelcome(true);
                soundEngine.startAmbiance();
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
              className="w-full py-3 bg-[#5c3e21] hover:bg-[#432a13] text-amber-100 font-bold text-sm tracking-wider uppercase rounded-xl shadow-lg transition flex items-center justify-center gap-2 font-sans cursor-pointer"
            >
              Begin Expedition
            </button>
          </div>
        </div>
      )}

      {/* Peralta Stone Map Modal */}
      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        playerPosition={playerState.position}
        playerYaw={playerState.rotation.yaw}
        landmarks={landmarks}
        onFastTravel={handleFastTravel}
        activeClaim={playerState.activeClaim}
        territoryClaims={registeredClaims}
        onClearAllClaims={handleClearAllClaims}
        worldScaleMode={worldScaleMode}
        onToggleWorldScaleMode={handleToggleWorldScaleMode}
      />

      {/* Field Journal & Clues Modal */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        clues={clues}
        goldFound={playerState.goldFound}
        initialTab={journalInitialTab}
        onOpenMap={() => {
          setIsJournalOpen(false);
          setIsMapOpen(true);
        }}
        onOpenGuidebook={() => {
          setIsJournalOpen(false);
          setIsGuidebookOpen(true);
        }}
      />

      {/* Prospector's Field Guidebook & Shoring Lore */}
      <GuidebookModal
        isOpen={isGuidebookOpen}
        onClose={() => setIsGuidebookOpen(false)}
        onOpenJournal={() => {
          setIsGuidebookOpen(false);
          setIsJournalOpen(true);
        }}
        onOpenMap={() => {
          setIsGuidebookOpen(false);
          setIsMapOpen(true);
        }}
      />

      {/* Single Clue / Landmark Inspection Dialog */}
      <ClueDialog
        clue={activeClueDialog?.clue}
        landmark={activeClueDialog?.landmark}
        isWaterSource={activeClueDialog?.isWater}
        onClose={() => setActiveClueDialog(null)}
        onRecord={() => {
          setActiveClueDialog(null);
          setIsJournalOpen(true);
        }}
        onRefillWater={() => {
          handleRefillWater();
        }}
      />

      {/* Victory Celebration when the mine is found */}
      <VictoryModal
        isOpen={isVictoryOpen}
        onClose={() => setIsVictoryOpen(false)}
        goldFound={playerState.goldFound}
        cluesCount={clues.filter((c) => c.discovered).length}
      />

      {/* Mine Construction & Blueprint Depot Modal */}
      <MineBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        playerState={playerState}
        activeBuildingType={activeBuildingType}
        onSelectStructure={(type) => {
          setActiveBuildingType(type);
          setPlayerState((prev) => ({ ...prev, equippedTool: 'builder' }));
          setIsBuilderOpen(false);
          showBanner(`Equipped ${type.replace('_', ' ').toUpperCase()} Blueprint! Aim at terrain & Left-Click to place.`);
        }}
        onStartStaking={() => {
          setPlayerState((prev) => ({ ...prev, equippedTool: 'stake' }));
          setIsBuilderOpen(false);
          showBanner(`Equipped Survey Claim Stake! Aim at terrain & Left-Click to drive stake.`);
        }}
        onOpenDeed={() => {
          setIsBuilderOpen(false);
          setIsClaimDeedOpen(true);
        }}
        onOpenRockDepot={() => {
          setIsBuilderOpen(false);
          setIsDepotOpen(true);
        }}
        onPurchaseRocks={handlePurchaseRocks}
        onReinforcePortal={handleReinforcePortal}
      />

      {/* Wilderness Camp & Campfire Modal */}
      <CampModal
        isOpen={isCampModalOpen}
        onClose={() => setIsCampModalOpen(false)}
        playerState={playerState}
        onSelectCampStructure={handleSelectCampStructure}
        onRestAtCamp={handleRestAtCamp}
        onSleepUntilDawn={handleSleepUntilDawn}
        onStokeCamp={handleStokeCamp}
        nearbyCamp={nearbyCamp}
        timeOfDay={timeOfDay}
      />

      {/* Rock Quarry & Mining Supply Depot Modal */}
      <RockDepotModal
        isOpen={isDepotOpen}
        onClose={() => setIsDepotOpen(false)}
        playerState={playerState}
        onPurchaseRocks={handlePurchaseRocks}
        onReinforcePortal={handleReinforcePortal}
        onStartExcavation={handleStartExcavation}
      />

      {/* Historic Town of Tortilla Flat Saloon & Mercantile Modal */}
      <TortillaFlatModal
        isOpen={isTortillaFlatOpen}
        onClose={() => setIsTortillaFlatOpen(false)}
        initialTab={tortillaFlatTab}
        playerState={playerState}
        onUpdatePlayerState={setPlayerState}
        onFastTravel={handleFastTravel}
        onShowBanner={showBanner}
        registeredClaims={registeredClaims}
        timeOfDay={timeOfDay}
        onSleepInHotel={handleSleepInHotel}
        onOpenTownfolkDialogue={(npc) => {
          setIsTortillaFlatOpen(false);
          setActiveDialogueNPC(npc);
        }}
      />

      {/* Townfolk Real Voice Interactive Dialogue Overlay */}
      {activeDialogueNPC && (
        <TownfolkDialogueOverlay
          npc={activeDialogueNPC}
          isOpen={Boolean(activeDialogueNPC)}
          onClose={() => setActiveDialogueNPC(null)}
          clues={clues}
          onShowBanner={showBanner}
        />
      )}

      {/* Mining Claim Deed & Certificate Modal */}
      <ClaimDeedModal
        isOpen={isClaimDeedOpen}
        onClose={() => {
          setIsClaimDeedOpen(false);
          setSelectedDeedClaim(null);
        }}
        claim={selectedDeedClaim || playerState.activeClaim}
        playerState={playerState}
        builtStructures={playerState.builtStructures || []}
        goldCount={playerState.goldFound}
        blocksDug={playerState.blocksDug}
        onFastTravel={handleFastTravel}
        onRenameClaim={async (newName) => {
          const trimmed = newName.trim().substring(0, 64);
          if (!trimmed) return;
          const activeId = playerState.activeClaim?.id;
          if (activeId) {
            await territoryClaims.renameClaim(activeId, trimmed);
          } else {
            const myProspectorId = territoryClaims.getOrCreateProspectorId();
            const myClaim = territoryClaims.getPlayerClaim(myProspectorId);
            if (myClaim) {
              await territoryClaims.renameClaim(myClaim.id, trimmed);
            }
          }
          setPlayerState((prev) => {
            if (!prev.activeClaim) return prev;
            const updated = { ...prev.activeClaim, name: trimmed };
            safeLocalStorage.setItem('superstition_active_claim', JSON.stringify(updated));
            return {
              ...prev,
              activeClaim: updated,
            };
          });
          showBanner(`Claim title recorded as: "${trimmed}"`);
        }}
        onOpenBuilder={() => {
          setIsClaimDeedOpen(false);
          setIsBuilderOpen(true);
        }}
        onBuyClaim={handleBuyClaim}
        onSellClaimToSyndicate={handleSellClaimToSyndicate}
        onListClaimForSale={handleListClaimForSale}
        onCancelListing={handleCancelListing}
        onTradeOfferResponse={handleTradeOfferResponse}
        onClearAllClaims={handleClearAllClaims}
      />

      {/* Pop-up Dialog when a Claim is Staked: Prompt to build a mine & customize title */}
      {claimPrompt && (
        <ClaimStakedModal
          isOpen={Boolean(claimPrompt)}
          claimId={claimPrompt.id}
          claimName={claimPrompt.name}
          position={claimPrompt.position}
          onClose={() => setClaimPrompt(null)}
          onRenameClaim={async (newName) => {
            const trimmed = newName.trim().substring(0, 64);
            if (!trimmed) return;
            const targetId = claimPrompt.id || playerState.activeClaim?.id;
            if (targetId) {
              await territoryClaims.renameClaim(targetId, trimmed);
            }
            setPlayerState((prev) => {
              if (!prev.activeClaim) return prev;
              const updated = { ...prev.activeClaim, name: trimmed };
              safeLocalStorage.setItem('superstition_active_claim', JSON.stringify(updated));
              return { ...prev, activeClaim: updated };
            });
            setClaimPrompt((prev) => (prev ? { ...prev, name: trimmed } : null));
            showBanner(`Claim deed title registered as: "${trimmed}"`);
          }}
          onOpenBuilder={() => {
            setClaimPrompt(null);
            setIsBuilderOpen(true);
          }}
        />
      )}

      {/* 0 Health Fatal Defeat / Coroner's Inquest & Panoramic Flight Modal */}
      {gameOverDetails && (
        <GameOverModal
          details={gameOverDetails}
          onRestart={handleRestartExpedition}
          onOpenCoronersLog={() => {
            setJournalInitialTab('coroner');
            setIsJournalOpen(true);
          }}
        />
      )}
    </div>
  );
}
