import React from 'react';
import {
  Flame,
  Tent,
  Coffee,
  Sun,
  X,
  Coins,
  Box,
  RotateCw,
  Sparkles,
  Shield,
  Clock,
  Compass,
  TreePine,
  Axe,
} from 'lucide-react';
import { BuiltStructure, MineStructureType, PlayerState } from '../types';
import { STRUCTURE_BLUEPRINTS } from '../world/mineBuilding';
import { soundEngine } from '../audio/soundEffects';

interface CampModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onSelectCampStructure: (type: MineStructureType) => void;
  onRestAtCamp?: () => void;
  onSleepUntilDawn?: () => void;
  onStokeCamp?: () => void;
  nearbyCamp?: BuiltStructure | null;
  timeOfDay?: number;
}

export const CampModal: React.FC<CampModalProps> = ({
  isOpen,
  onClose,
  playerState,
  onSelectCampStructure,
  onRestAtCamp,
  onSleepUntilDawn,
  onStokeCamp,
  nearbyCamp,
  timeOfDay = 12,
}) => {
  if (!isOpen) return null;

  const currentGold = typeof playerState.goldFound === 'number' && !isNaN(playerState.goldFound)
    ? playerState.goldFound
    : 0;
  const currentRocks = typeof playerState.blocksDug === 'number' && !isNaN(playerState.blocksDug)
    ? playerState.blocksDug
    : 0;
  const currentWood = typeof playerState.woodPlanks === 'number' && !isNaN(playerState.woodPlanks)
    ? playerState.woodPlanks
    : 0;

  const campfireBp = STRUCTURE_BLUEPRINTS['campfire'];
  const outpostBp = STRUCTURE_BLUEPRINTS['prospector_camp'];
  const torchBp = STRUCTURE_BLUEPRINTS['frontier_torch'];

  const canAffordCampfire =
    currentRocks >= campfireBp.rockCost &&
    currentGold >= campfireBp.goldCost &&
    currentWood >= (campfireBp.woodCost || 0);
  const canAffordOutpost =
    currentRocks >= outpostBp.rockCost &&
    currentGold >= outpostBp.goldCost &&
    currentWood >= (outpostBp.woodCost || 0);
  const canAffordTorch =
    currentRocks >= (torchBp?.rockCost || 0) &&
    currentGold >= (torchBp?.goldCost || 0) &&
    currentWood >= (torchBp?.woodCost || 1);

  const isNight = timeOfDay < 5.5 || timeOfDay > 19.5;
  const campFuel = nearbyCamp?.fuelHoursRemaining ?? 12.0;
  const isCampLit = nearbyCamp?.isLit !== false && campFuel > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-stone-900 border-2 border-amber-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-stone-900 via-amber-950/50 to-stone-900 border-b border-amber-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-950/70 border border-orange-600/60 rounded-xl shadow-inner text-orange-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-100 tracking-wide flex items-center gap-2">
                <span>Wilderness Camp & Campfire</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-600/50 text-amber-300 font-mono">
                  HOTKEY [C]
                </span>
              </h2>
              <p className="text-xs text-amber-300/80">
                Frontier shelter, firewood fuel, and warmth in the Superstition Mountains
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-amber-200 hover:bg-stone-800/80 rounded-lg transition-colors cursor-pointer"
            title="Close [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resources Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-stone-950/70 border-b border-stone-800 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-stone-400">Gold:</span>
              <span className="font-bold text-yellow-300">{currentGold.toFixed(1)} oz</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Box className="w-3.5 h-3.5 text-stone-300" />
              <span className="text-stone-400">Rocks:</span>
              <span className="font-bold text-amber-200">{currentRocks}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <TreePine className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-stone-400">Cut Wood:</span>
              <span className="font-bold text-emerald-300">{currentWood} Logs</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Time: {Math.floor(timeOfDay).toString().padStart(2, '0')}:{Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}</span>
            {isNight && (
              <span className="text-amber-400 font-bold ml-1">🌙 Desert Night Chill</span>
            )}
          </div>
        </div>

        {/* Active Nearby Camp Section (if player is close to a built campfire/camp) */}
        {nearbyCamp && (
          <div className="mx-5 mt-4 p-4 bg-gradient-to-r from-orange-950/60 via-stone-900 to-amber-950/50 border-2 border-orange-500/80 rounded-xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-900/60 border border-orange-500/60 rounded-xl text-orange-400">
                <Flame className={`w-5 h-5 ${isCampLit ? 'animate-pulse text-orange-400' : 'text-stone-500'}`} />
              </div>
              <div>
                <div className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span>At {nearbyCamp.name}</span>
                  {isCampLit ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono">
                      🔥 {campFuel.toFixed(1)}h Fuel Lit
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 border border-red-600 text-red-300 font-mono">
                      ⚠️ Out of Wood (Cold)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-300">
                  {isCampLit
                    ? 'Mesquite coals burning. Rest to regain health, brew coffee, or stoke with fresh wood.'
                    : 'Campfire has burned down to cold ash. Stoke with 1 Cut Wood Log to reignite!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
              {onStokeCamp && (
                <button
                  disabled={currentWood < 1}
                  onClick={() => {
                    onStokeCamp();
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentWood >= 1
                      ? 'bg-emerald-700 hover:bg-emerald-600 text-stone-100 shadow cursor-pointer'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                  title="Add 1 Cut Wood Log (+8.0h fuel)"
                >
                  <TreePine className="w-4 h-4" />
                  <span>{isCampLit ? 'Stoke Wood (+8h)' : 'Rekindle Fire (1 Log)'}</span>
                </button>
              )}

              {isCampLit && onRestAtCamp && (
                <button
                  onClick={() => {
                    onRestAtCamp();
                    onClose();
                  }}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Rest & Brew</span>
                </button>
              )}

              {isCampLit && onSleepUntilDawn && (
                <button
                  onClick={() => {
                    onSleepUntilDawn();
                    onClose();
                  }}
                  className="px-3 py-2 bg-stone-850 hover:bg-stone-800 text-amber-300 border border-amber-600/60 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Sleep safely through the dark until 6:00 AM dawn (consumes ~8h fuel)"
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Sleep Til Dawn</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Camp Crafting Choices Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Frontier Ground Torch */}
          <div className="flex flex-col justify-between p-4 bg-stone-950/70 border border-amber-500/70 rounded-xl shadow-md hover:border-amber-400 transition-all">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-950/70 border border-amber-500/60 rounded-lg text-amber-400">
                    <Flame className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-amber-100">Frontier Ground Torch</h3>
                    <span className="text-[10px] text-amber-300/80">Pine stake & pitch sconce</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-300 mb-3 leading-relaxed">
                Old West timber stake torch driven firmly into the earth with pitch-soaked linen, glowing embers, and beautiful warm flickering firelight.
              </p>

              <div className="space-y-1.5 mb-4 text-[11px] text-stone-300">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Warm <strong>20m firelight</strong> with realistic wind flicker</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <TreePine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Place <strong>3 or 4 in a row</strong> like frontier tiki torches</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-300">
                  <Shield className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Lights up camps, mine drifts & night trails</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={currentWood >= (torchBp?.woodCost || 1) ? 'text-emerald-300 font-bold' : 'text-red-400'}>
                  {torchBp?.woodCost || 1} Cut Wood Log
                </span>
              </div>

              <button
                disabled={!canAffordTorch}
                onClick={() => {
                  soundEngine.playConstruct();
                  onSelectCampStructure('frontier_torch');
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  canAffordTorch
                    ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md cursor-pointer hover:scale-105'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Stake Torch</span>
              </button>
            </div>
          </div>

          {/* Card 2: Frontier Campfire */}
          <div className="flex flex-col justify-between p-4 bg-stone-950/70 border border-amber-700/60 rounded-xl shadow-md hover:border-amber-500 transition-all">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-950/60 border border-orange-600/50 rounded-lg text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-100">Frontier Campfire</h3>
                    <span className="text-[10px] text-stone-400">Stone fire ring & mesquite coals</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-300 mb-3 leading-relaxed">
                Circular river stone ring with glowing mesquite charcoal, iron tripod kettle, and brewing coffee pot.
                Burns for ~12-16 hours per cycle before needing wood.
              </p>

              <div className="space-y-1.5 mb-4 text-[11px] text-stone-300">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Restores <strong>+35 Health</strong> & <strong>+30 Hydration</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Initial fuel lasts <strong>12 hours</strong> (re-stokable with wood)</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-300">
                  <Shield className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Night illumination & repels rattlesnakes/predators</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={currentRocks >= campfireBp.rockCost ? 'text-amber-200' : 'text-red-400'}>
                  {campfireBp.rockCost} Rocks
                </span>
                <span className="text-stone-500">|</span>
                <span className={currentWood >= (campfireBp.woodCost || 0) ? 'text-emerald-300' : 'text-red-400'}>
                  {campfireBp.woodCost} Wood
                </span>
              </div>

              <button
                disabled={!canAffordCampfire}
                onClick={() => {
                  soundEngine.playConstruct();
                  onSelectCampStructure('campfire');
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  canAffordCampfire
                    ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md cursor-pointer hover:scale-105'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Build Campfire</span>
              </button>
            </div>
          </div>

          {/* Card 2: Prospector Outpost Camp */}
          <div className="flex flex-col justify-between p-4 bg-stone-950/70 border border-amber-700/60 rounded-xl shadow-md hover:border-amber-500 transition-all">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-950/60 border border-amber-600/50 rounded-lg text-amber-300">
                    <Tent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-100">Prospector Outpost Camp</h3>
                    <span className="text-[10px] text-stone-400">Canvas tent, bedroll, & campfire</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-300 mb-3 leading-relaxed">
                Full expedition forward operations camp with weatherproof canvas tent, lantern pole, bedroll, and campfire.
                Burns for ~16 hours per wood cycle.
              </p>

              <div className="space-y-1.5 mb-4 text-[11px] text-stone-300">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Weather shelter from monsoons & flash rains</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Safe overnight sleep spot (skip night to 6:00 AM)</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-300">
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Campfire with 16h fuel (stokable with cut logs)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={currentGold >= outpostBp.goldCost ? 'text-yellow-400' : 'text-red-400'}>
                  {outpostBp.goldCost} oz Gold
                </span>
                <span className="text-stone-500">|</span>
                <span className={currentRocks >= outpostBp.rockCost ? 'text-amber-200' : 'text-red-400'}>
                  {outpostBp.rockCost} Rocks
                </span>
                <span className="text-stone-500">|</span>
                <span className={currentWood >= (outpostBp.woodCost || 0) ? 'text-emerald-300' : 'text-red-400'}>
                  {outpostBp.woodCost} Wood
                </span>
              </div>

              <button
                disabled={!canAffordOutpost}
                onClick={() => {
                  soundEngine.playConstruct();
                  onSelectCampStructure('prospector_camp');
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  canAffordOutpost
                    ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md cursor-pointer hover:scale-105'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Tent className="w-3.5 h-3.5" />
                <span>Pitch Camp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation & Controls Tip */}
        <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
          <div className="flex items-center gap-2 text-[11px]">
            <Axe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Chop riparian cottonwood & mesquite trees around desert springs with <strong>Felling Axe [X]</strong> for firewood!</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 rounded-lg text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
