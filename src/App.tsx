/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { CompassHUD } from './components/CompassHUD';
import { ControlsOverlay } from './components/ControlsOverlay';
import { MapModal } from './components/MapModal';
import { JournalModal } from './components/JournalModal';
import { ClueDialog } from './components/ClueDialog';
import { VictoryModal } from './components/VictoryModal';
import { INITIAL_LANDMARKS, INITIAL_CLUES } from './world/clues';
import { soundEngine } from './audio/soundEffects';
import { ClueItem, Landmark, PlayerState, Vector3D } from './types';
import { Compass, BookOpen, Map as MapIcon, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>({
    position: { x: -115, y: 5, z: -115 },
    rotation: { yaw: 0.8, pitch: 0 },
    hydration: 100,
    isSprinting: false,
    isInsideMine: false,
    equippedTool: 'compass',
    goldFound: 0,
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
  const [activeClueDialog, setActiveClueDialog] = useState<{
    clue?: ClueItem;
    landmark?: Landmark;
    isWater?: boolean;
  } | null>(null);

  // Settings
  const [timeOfDay, setTimeOfDay] = useState<number>(16.0); // 4:00 PM needle shadow alignment
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

  // Keyboard shortcuts (M, J, V, 1-5)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyM') {
        setIsMapOpen((prev) => !prev);
      } else if (e.code === 'KeyJ') {
        setIsJournalOpen((prev) => !prev);
      } else if (e.code === 'KeyV') {
        setViewMode((prev) => (prev === 'first' ? 'third' : 'first'));
      } else if (e.code === 'Digit1') {
        setPlayerState((p) => ({ ...p, equippedTool: 'compass' }));
      } else if (e.code === 'Digit2') {
        setPlayerState((p) => ({ ...p, equippedTool: 'lantern' }));
      } else if (e.code === 'Digit3') {
        setPlayerState((p) => ({ ...p, equippedTool: 'binoculars' }));
      } else if (e.code === 'Digit4') {
        setPlayerState((p) => ({ ...p, equippedTool: 'detector' }));
      } else if (e.code === 'Digit5') {
        setPlayerState((p) => ({ ...p, equippedTool: 'pickaxe' }));
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
        viewMode={viewMode}
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
        interactionPrompt={interactionPrompt}
        onInteract={() => {
          if (activeInteractAction) activeInteractAction();
        }}
        onMineDeposit={() => {
          if (activeInteractAction) activeInteractAction();
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
                <span className="font-mono text-[11px] text-stone-700">WASD / Arrow Keys to walk • Mouse to look • Shift to sprint</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Tools:</span>
                <span className="font-mono text-[11px] text-stone-700">[1] Compass, [2] Lantern, [3] Field Glasses, [4] Detector, [5] Pickaxe</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#442710] font-serif">Objective:</span>
                <span>Follow the trail from Peralta Camp, decipher clues, track Weaver&apos;s Needle shadow, and locate the concealed mine shaft!</span>
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
    </div>
  );
}
