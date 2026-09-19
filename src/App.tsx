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
import { GameOverModal } from './components/GameOverModal';
import { CompassHUD } from './components/CompassHUD';
import { INITIAL_LANDMARKS, INITIAL_CLUES } from './world/clues';
import { soundEngine } from './audio/soundEffects';
import { westernMusic } from './audio/westernMusic';
import { ClaimInfo, ClueItem, Landmark, MineStructureType, PlayerState, Vector3D, WeatherType, MineLayerData, GameOverDetails, MultiplayerPlayer, MultiplayerChatMessage, RoomDirection, WaterTableState, GraphicsQuality } from './types';
import { MultiplayerHUD } from './components/MultiplayerHUD';
import { ShaftSinkingStats } from './world/undergroundVoxels';
import { multiplayer } from './multiplayer/multiplayerService';
import { getTerrainHeight } from './world/terrain';
import { advanceDiurnalTime } from './world/atmosphere';
import { Compass, BookOpen, Map as MapIcon, Sparkles, AlertCircle } from 'lucide-react';
import { isMobileDevice } from './utils/device';
import { safeLocalStorage } from './utils/storage';

export default function App() {
  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    const startY = getTerrainHeight(0, -246) + 1.7;
    return {
      position: { x: 0, y: startY, z: -246 },
      rotation: { yaw: 0, pitch: 0 },
      health: 100,
      maxHealth: 100,
      hydration: 100,
      isSprinting: false,
      isInsideMine: false,
      equippedTool: 'hands',
      ammo: 24,
      dynamite: 6,
      woodPlanks: 6, // Starting seasoned timber stakes & firewood
      goldFound: 2.0, // 2 oz starting gold from prospecting
      blocksDug: 0,
      bullionBars: 0,
      activeClaim: null,
      builtStructures: [],
      discoveredLandmarks: ['tortilla_flat'],
      collectedClues: ['clue_tortilla_flat'],
    };
  });

  // Multiplayer State
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, MultiplayerPlayer>>({});
  const [chatMessages, setChatMessages] = useState<MultiplayerChatMessage[]>([]);
  const [multiplayerPing, setMultiplayerPing] = useState<number>(35);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [selfName, setSelfName] = useState<string>(() => safeLocalStorage.getItem('prospector_name') || 'Canyon Jack');
  const [selfColor, setSelfColor] = useState<string>(() => safeLocalStorage.getItem('prospector_color') || '#8c5932');
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

    multiplayer.setHandlers({
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
      multiplayer.unsubscribe(handleUpdate);
      multiplayer.disconnect();
    };
  }, []);

  // World Data
  const [landmarks, setLandmarks] = useState<Landmark[]>(INITIAL_LANDMARKS);
  const [clues, setClues] = useState<ClueItem[]>(INITIAL_CLUES);

  // Modals & UI States
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isGuidebookOpen, setIsGuidebookOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [isClaimDeedOpen, setIsClaimDeedOpen] = useState(false);
  const [isDepotOpen, setIsDepotOpen] = useState(false);
  const [isTortillaFlatOpen, setIsTortillaFlatOpen] = useState(false);
  const [activeBuildingType, setActiveBuildingType] = useState<MineStructureType>('timber_portal');
  const [gameOverDetails, setGameOverDetails] = useState<GameOverDetails | null>(null);
  const [claimPrompt, setClaimPrompt] = useState<{ name: string; position: Vector3D } | null>(null);
  const [payDirtAlert, setPayDirtAlert] = useState<{ ounces: number } | null>(null);
  const payDirtTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartHandlerRef = useRef<(() => void) | null>(null);
  const mobileActionHandlerRef = useRef<(() => void) | null>(null);
  const mobileJumpHandlerRef = useRef<(() => void) | null>(null);
  const mobileInteractHandlerRef = useRef<(() => void) | null>(null);
  const mobileMoveHandlerRef = useRef<((move: { forward: number; right: number }) => void) | null>(null);
  const [activeInteractAction, setActiveInteractAction] = useState<(() => void) | null>(null);
  const playerStateRef = useRef<PlayerState>(playerState);

  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

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
      const isMobile = isMobileDevice();
      return isMobile ? 'performance' : 'balanced';
    }
    return 'balanced';
  });
  const [currentFps, setCurrentFps] = useState<number>(60);

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
      canteenOunces: 32,
    }));
    showBanner("🔥 Rested by the fire! Warm coffee brewed and canteen filled (+35 Health, +30 Hydration).");
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
        canteenOunces: 32,
        builtStructures: updatedStructures,
      };
    });
    showBanner("🌅 Slept safely through the cold desert night until 6:00 AM! Campfire consumed ~8h of wood fuel.");
  }, [showBanner]);

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
  const digHandlerRef = useRef<(() => void) | null>(null);
  const reinforceHandlerRef = useRef<(() => void) | null>(null);
  const excavateHandlerRef = useRef<(() => void) | null>(null);

  // Subterranean Mine Shaft & Strata Layer State
  const [shaftLayers, setShaftLayers] = useState<MineLayerData[]>([]);
  const [currentMineLevel, setCurrentMineLevel] = useState<number>(0);
  const [maxUnlockedMineLevel, setMaxUnlockedMineLevel] = useState<number>(1);
  const shaftTraverseHandlerRef = useRef<((level: number) => void) | null>(null);
  const shaftExitHandlerRef = useRef<(() => void) | null>(null);
  const shaftDigHandlerRef = useRef<(() => void) | null>(null);
  const excavateRoomHandlerRef = useRef<((dir: RoomDirection) => void) | null>(null);
  const timberRoomHandlerRef = useRef<((dir: RoomDirection) => void) | null>(null);
  const togglePumpHandlerRef = useRef<(() => void) | null>(null);

  // Mini-Voxel Shaft Sinking & Bedrock Excavation State
  const [shaftSinkingStats, setShaftSinkingStats] = useState<ShaftSinkingStats | null>(null);
  const strikeVoxelHandlerRef = useRef<(() => void) | null>(null);
  const placeTimberHandlerRef = useRef<(() => void) | null>(null);

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
  const shoreHandlerRef = useRef<(() => void) | null>(null);

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

  // Universal continuous sun & celestial progression (shared instance)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay((prev) => advanceDiurnalTime(prev, 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'first' | 'third'>('first');
  const [interactionPrompt, setInteractionPrompt] = useState<string | undefined>(undefined);

  // Global HUD Visibility and Wilderness Telegraph State
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isTelegraphOpen, setIsTelegraphOpen] = useState(false);
  const [unreadTelegraphCount, setUnreadTelegraphCount] = useState(0);

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
      soundEngine.playDiscovery();

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
    [clues, landmarks]
  );

  // Multiplayer Actions
  const handleUpdateProfile = useCallback((name: string, color: string) => {
    multiplayer.updateProfile(name, color);
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
    }));
    setActiveClueDialog({
      isWater: true,
      landmark: {
        id: 'water_point',
        name: 'Fresh Mountain Water',
        shortDesc: 'Cold natural spring water bubbling from the rocks. Canteen fully replenished!',
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
    setPlayerState((prev) => ({
      ...prev,
      isInsideMine: true,
      position: { x: 160, y: mineY - 0.5, z: 132 },
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

  // Fast travel from Map
  const handleFastTravel = (targetPos: Vector3D) => {
    setPlayerState((prev) => ({
      ...prev,
      position: { x: targetPos.x + 1, y: targetPos.y, z: targetPos.z + 1 },
    }));
    setIsMapOpen(false);
    soundEngine.playFootstep();
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
      isSprinting: false,
      isInsideMine: false,
      equippedTool: 'hands',
      ammo: 24,
      dynamite: 6,
      woodPlanks: 6,
      goldFound: 0, // Lost all gold on death
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

  // Keyboard shortcuts (M, J, B, V, 1-9, Esc)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyM') {
        setIsMapOpen((prev) => !prev);
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
        onStakeClaim={(name, pos) => {
          soundEngine.playHammerStake();
          setPayDirtAlert(null);
          setPlayerState((prev) => ({
            ...prev,
            activeClaim: {
              name,
              position: pos,
              size: 40,
              isClaimed: true,
              extractedGold: prev.activeClaim?.extractedGold || 0,
              blocksDug: prev.activeClaim?.blocksDug || 0,
            },
          }));
          showBanner(`Claim "${name}" Legally Staked!`);
          setClaimPrompt({ name, position: pos });
        }}
        onBuildStructure={(_type, _pos, _rot) => {
          soundEngine.playConstruct();
          setIsCampModalOpen(false);
          setIsBuilderOpen(false);
        }}
        onOpenDeedModal={(_claim) => {
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
        onPlayerDeath={(details) => setGameOverDetails(details)}
        onRegisterRestartHandler={(fn) => {
          restartHandlerRef.current = fn;
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
        onOpenTortillaFlat={() => setIsTortillaFlatOpen(true)}
        onToggleDayNight={handleToggleDayNight}
        graphicsQuality={graphicsQuality}
        onFpsUpdate={setCurrentFps}
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
          playerCoords={{ x: playerState.position.x, z: playerState.position.z }}
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
      />

      {/* Main Controls & Inventory Overlay */}
      <ControlsOverlay
        playerState={playerState}
        timeOfDay={timeOfDay}
        nearestLandmark={nearestLandmark}
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
        onOpenClaimDeed={() => setIsClaimDeedOpen(true)}
        activeBuildingType={activeBuildingType}
        onRotateBlueprint={() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
        }}
        onOpenRockDepot={() => setIsDepotOpen(true)}
        onReinforcePortal={handleReinforcePortal}
        onStartPortalExcavation={handleStartExcavation}
        onPurchaseRocks={handlePurchaseRocks}
        onPurchaseWood={handlePurchaseWood}
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
            if (!westernMusic.getIsMuted()) westernMusic.toggleMute();
          } else {
            if (westernMusic.getIsMuted()) westernMusic.toggleMute();
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
      />

      {/* Prospector's Goggles Optical Vignette Lens */}
      {areGogglesActive && (
        <div
          id="prospector-goggles-lens-overlay"
          className="pointer-events-none fixed inset-0 z-20 shadow-[inset_0_0_120px_rgba(180,83,9,0.38)] border-[6px] border-amber-900/40 rounded-3xl transition-all duration-300"
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-950/90 backdrop-blur-md border border-amber-500/70 rounded-full px-4 py-1 text-[11px] font-mono font-bold text-amber-200 flex items-center gap-2 shadow-2xl animate-fade-in">
            <span className="animate-pulse">🥽</span>
            <span>PROSPECTOR'S INSPECTION GOGGLES ACTIVE [G]</span>
          </div>
        </div>
      )}

      {/* Welcome & Expedition Briefing Modal */}
      {!hasShownWelcome && (
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
              Deep in the rugged volcanic crags of Arizona&apos;s Superstition Mountains lies America&apos;s most notorious treasure: the fabled lost gold mine of German immigrant Jacob Waltz. You begin your journey at the historic settlement of <strong>Tortilla Flat</strong> on the south bank of the Salt River Canyon.
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
                westernMusic.play();
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
      />

      {/* Field Journal & Clues Modal */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        clues={clues}
        goldFound={playerState.goldFound}
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
        playerState={playerState}
        onUpdatePlayerState={setPlayerState}
        onFastTravel={handleFastTravel}
        onShowBanner={showBanner}
      />

      {/* Mining Claim Deed & Certificate Modal */}
      <ClaimDeedModal
        isOpen={isClaimDeedOpen}
        onClose={() => setIsClaimDeedOpen(false)}
        claim={playerState.activeClaim}
        builtStructures={playerState.builtStructures || []}
        goldCount={playerState.goldFound}
        onRenameClaim={(newName) => {
          setPlayerState((prev) => ({
            ...prev,
            activeClaim: prev.activeClaim ? { ...prev.activeClaim, name: newName } : null,
          }));
          showBanner(`Claim title recorded as: "${newName}"`);
        }}
        onOpenBuilder={() => {
          setIsClaimDeedOpen(false);
          setIsBuilderOpen(true);
        }}
      />

      {/* Pop-up Dialog when a Claim is Staked: Prompt to build a mine */}
      {claimPrompt && (
        <ClaimStakedModal
          isOpen={Boolean(claimPrompt)}
          claimName={claimPrompt.name}
          position={claimPrompt.position}
          onClose={() => setClaimPrompt(null)}
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
        />
      )}
    </div>
  );
}
