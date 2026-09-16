/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { CompassHUD } from './components/CompassHUD';
import { ControlsOverlay } from './components/ControlsOverlay';
import { MapModal } from './components/MapModal';
import { JournalModal } from './components/JournalModal';
import { ClueDialog } from './components/ClueDialog';
import { VictoryModal } from './components/VictoryModal';
import { MineBuilderModal } from './components/MineBuilderModal';
import { ClaimDeedModal } from './components/ClaimDeedModal';
import { RockDepotModal } from './components/RockDepotModal';
import { MineShaftHUD } from './components/MineShaftHUD';
import { INITIAL_LANDMARKS, INITIAL_CLUES } from './world/clues';
import { soundEngine } from './audio/soundEffects';
import { ClaimInfo, ClueItem, Landmark, MineStructureType, PlayerState, Vector3D, WeatherType, MineLayerData } from './types';
import { Compass, BookOpen, Map as MapIcon, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>({
    position: { x: -115, y: 5, z: -115 },
    rotation: { yaw: 0.8, pitch: 0 },
    health: 100,
    maxHealth: 100,
    hydration: 100,
    isSprinting: false,
    isInsideMine: false,
    equippedTool: 'pickaxe',
    ammo: 24,
    dynamite: 6,
    goldFound: 2.0, // 2 oz starting gold from prospecting
    blocksDug: 0,
    bullionBars: 0,
    activeClaim: null,
    builtStructures: [],
    discoveredLandmarks: ['trailhead'],
    collectedClues: ['clue_trailhead'],
  });

  // World Data
  const [landmarks, setLandmarks] = useState<Landmark[]>(INITIAL_LANDMARKS);
  const [clues, setClues] = useState<ClueItem[]>(INITIAL_CLUES);

  // Modals & UI States
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isClaimDeedOpen, setIsClaimDeedOpen] = useState(false);
  const [isDepotOpen, setIsDepotOpen] = useState(false);
  const [activeBuildingType, setActiveBuildingType] = useState<MineStructureType>('timber_portal');

  const [activeClueDialog, setActiveClueDialog] = useState<{
    clue?: ClueItem;
    landmark?: Landmark;
    isWater?: boolean;
  } | null>(null);

  const isAnyModalOpen =
    isMapOpen ||
    isJournalOpen ||
    isVictoryOpen ||
    isBuilderOpen ||
    isClaimDeedOpen ||
    isDepotOpen ||
    Boolean(activeClueDialog);

  // Visual Combat & Notification Feedback
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

  // Atmosphere, Time & Weather Settings
  const [timeOfDay, setTimeOfDay] = useState<number>(16.0); // 4:00 PM needle shadow alignment
  const [weather, setWeather] = useState<WeatherType>('sunset');
  const [autoCycleTime, setAutoCycleTime] = useState<boolean>(false);
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

  // Geotechnical Pit Wall Shoring State
  const [nearbyTrench, setNearbyTrench] = useState<{
    depth: number;
    stability: number;
    isShored: boolean;
    shoredUntilDepth?: number;
    rocksNeeded: number;
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

  // Auto Day/Night & Sun Arc Movement
  useEffect(() => {
    if (!autoCycleTime) return;
    const interval = setInterval(() => {
      setTimeOfDay((prev) => (prev + 0.05) % 24);
    }, 100);
    return () => clearInterval(interval);
  }, [autoCycleTime]);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'first' | 'third'>('first');
  const [interactionPrompt, setInteractionPrompt] = useState<string | undefined>(undefined);
  const [activeInteractAction, setActiveInteractAction] = useState<(() => void) | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

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
    },
    [clues, landmarks]
  );

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
    setPlayerState((prev) => ({
      ...prev,
      isInsideMine: true,
      position: { x: 160, y: 35, z: 132 },
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

  // Keyboard shortcuts (M, J, B, V, 1-9, Esc)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyM') {
        setIsMapOpen((prev) => !prev);
      } else if (e.code === 'KeyJ') {
        setIsJournalOpen((prev) => !prev);
      } else if (e.code === 'KeyB') {
        setIsBuilderOpen((prev) => !prev);
      } else if (e.code === 'KeyV') {
        setViewMode((prev) => (prev === 'first' ? 'third' : 'first'));
      } else if (e.code === 'Escape') {
        setIsMapOpen(false);
        setIsJournalOpen(false);
        setIsVictoryOpen(false);
        setIsBuilderOpen(false);
        setIsClaimDeedOpen(false);
        setIsDepotOpen(false);
        setActiveClueDialog(null);
      } else if (e.code === 'Digit1') {
        setPlayerState((p) => ({ ...p, equippedTool: 'compass' }));
      } else if (e.code === 'Digit2') {
        setPlayerState((p) => ({ ...p, equippedTool: 'lantern' }));
      } else if (e.code === 'Digit3') {
        setPlayerState((p) => ({ ...p, equippedTool: 'shovel' }));
      } else if (e.code === 'Digit4') {
        setPlayerState((p) => ({ ...p, equippedTool: 'pickaxe' }));
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
        setPlayerState((p) => ({ ...p, equippedTool: 'builder' }));
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

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
        onStakeClaim={(name, pos) => {
          soundEngine.playHammerStake();
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
            equippedTool: 'builder',
          }));
          showBanner(`Claim "${name}" Staked! Equipped Construction Blueprint [B].`);
        }}
        onBuildStructure={(_type, _pos, _rot) => {
          soundEngine.playConstruct();
        }}
        onOpenDeedModal={(_claim) => {
          setIsClaimDeedOpen(true);
        }}
        onOpenBuilder={() => setIsBuilderOpen(true)}
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
      />

      {/* Subterranean Mine Shaft & Strata HUD */}
      <MineShaftHUD
        isInsideMine={playerState.isInsideMine || currentMineLevel > 0}
        currentLevel={currentMineLevel}
        maxUnlockedLevel={maxUnlockedMineLevel}
        layers={shaftLayers}
        onAscend={() => {
          if (shaftTraverseHandlerRef.current) {
            shaftTraverseHandlerRef.current(Math.max(0, currentMineLevel - 1));
          }
        }}
        onDescend={() => {
          if (shaftTraverseHandlerRef.current) {
            shaftTraverseHandlerRef.current(Math.min(maxUnlockedMineLevel, currentMineLevel + 1));
          }
        }}
        onExitToSurface={() => {
          if (shaftExitHandlerRef.current) {
            shaftExitHandlerRef.current();
          }
        }}
        onSelectLevel={(lvl) => {
          if (shaftTraverseHandlerRef.current) {
            shaftTraverseHandlerRef.current(lvl);
          }
        }}
        onDigDown={() => {
          if (shaftDigHandlerRef.current) {
            shaftDigHandlerRef.current();
          }
        }}
      />

      {/* Top Floating Compass HUD */}
      <CompassHUD
        yaw={playerState.rotation.yaw}
        timeOfDay={timeOfDay}
        nearestLandmarkName={nearestLandmark?.name}
        nearestLandmarkDist={nearestLandmark?.dist}
        hydration={playerState.hydration}
        goldFound={playerState.goldFound}
        isInsideMine={playerState.isInsideMine}
      />

      {/* Main Controls & Inventory Overlay */}
      <ControlsOverlay
        playerState={playerState}
        onSelectTool={(tool) => setPlayerState((p) => ({ ...p, equippedTool: tool }))}
        onOpenMap={() => setIsMapOpen(true)}
        onOpenJournal={() => setIsJournalOpen(true)}
        onOpenBuilder={() => setIsBuilderOpen(true)}
        onOpenClaimDeed={() => setIsClaimDeedOpen(true)}
        activeBuildingType={activeBuildingType}
        onRotateBlueprint={() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
        }}
        onOpenRockDepot={() => setIsDepotOpen(true)}
        onReinforcePortal={handleReinforcePortal}
        onStartPortalExcavation={handleStartExcavation}
        onPurchaseRocks={handlePurchaseRocks}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          soundEngine.setMuted(!next);
        }}
        soundEnabled={soundEnabled}
        onToggleCamera={() => setViewMode((prev) => (prev === 'first' ? 'third' : 'first'))}
        viewMode={viewMode}
        timeOfDay={timeOfDay}
        onSetTimeOfDay={(hour) => setTimeOfDay(hour)}
        weather={weather}
        onSetWeather={setWeather}
        autoCycleTime={autoCycleTime}
        onToggleAutoCycleTime={() => setAutoCycleTime((prev) => !prev)}
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
        onShoreTrench={() => {
          if (shoreHandlerRef.current) shoreHandlerRef.current();
        }}
      />

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
              Deep in the rugged volcanic crags of Arizona&apos;s Superstition Mountains lies America&apos;s most notorious treasure: the fabled lost gold mine of German immigrant Jacob Waltz.
            </p>

            <div className="bg-[#e4d4b3] p-3.5 rounded-xl border border-[#c2aa83] text-xs text-stone-800 space-y-2 mb-6 font-sans">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Controls:</span>
                <span className="font-mono text-[11px] text-stone-700">WASD to walk • Left Click to Mine / Shoot / Throw • Shift sprint • [V] Toggle 1st/3rd Person</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Arsenal:</span>
                <span className="font-mono text-[11px] text-stone-700">[1] Compass [2] Lantern [3] Pickaxe [4] Winchester Rifle [5] Dynamite [6] Detector</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Claim & Dig:</span>
                <span>Stake a claim at the mining boundary monument [E]. Carve out realistic rock layers, ore veins, and quartz voxels with your pickaxe or blasts!</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Frontier Perils:</span>
                <span>Watch out for rattlesnakes, desert wildlife, and hostile outlaw bandits defending territory with firearms!</span>
              </div>
            </div>

            <button
              onClick={() => {
                setHasShownWelcome(true);
                soundEngine.startAmbiance();
              }}
              className="w-full py-3 bg-[#5c3e21] hover:bg-[#432a13] text-amber-100 font-bold text-sm tracking-wider uppercase rounded-xl shadow-lg transition flex items-center justify-center gap-2 font-sans"
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

      {/* Rock Quarry & Mining Supply Depot Modal */}
      <RockDepotModal
        isOpen={isDepotOpen}
        onClose={() => setIsDepotOpen(false)}
        playerState={playerState}
        onPurchaseRocks={handlePurchaseRocks}
        onReinforcePortal={handleReinforcePortal}
        onStartExcavation={handleStartExcavation}
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
    </div>
  );
}
