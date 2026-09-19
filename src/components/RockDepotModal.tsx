import React from 'react';
import {
  Box,
  Coins,
  Pickaxe,
  Hammer,
  ShieldAlert,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  Sparkles,
  Flame,
} from 'lucide-react';
import { PlayerState, PortalExcavationState } from '../types';

interface RockDepotModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onPurchaseRocks: (rockAmount: number, goldCost: number) => void;
  onReinforcePortal?: () => void;
  onStartExcavation?: () => void;
}

export const RockDepotModal: React.FC<RockDepotModalProps> = ({
  isOpen,
  onClose,
  playerState,
  onPurchaseRocks,
  onReinforcePortal,
  onStartExcavation,
}) => {
  if (!isOpen) return null;

  const currentGold = typeof playerState.goldFound === 'number' && !isNaN(playerState.goldFound)
    ? playerState.goldFound
    : 0;
  const currentRocks = typeof playerState.blocksDug === 'number' && !isNaN(playerState.blocksDug)
    ? playerState.blocksDug
    : 0;

  const portal = playerState.portalExcavation;
  const canReinforce =
    portal &&
    !portal.isReinforced &&
    currentRocks >= portal.rocksNeeded &&
    currentGold >= portal.goldNeeded;

  const packages = [
    {
      name: 'Small Quarry Rubble Pack',
      rocks: 5,
      goldCost: 1.0,
      description: 'Standard cracked field stones hauled from the Peralta stream bed.',
      icon: <Box className="w-5 h-5 text-amber-300" />,
    },
    {
      name: 'Heavy Masonry Stone Crate',
      rocks: 10,
      goldCost: 2.0,
      description: 'Solid granite blocks dressed for arch keystones and timber footing.',
      icon: <Layers className="w-5 h-5 text-amber-400" />,
      recommended: true,
    },
    {
      name: 'Master Builder Granite Bundle',
      rocks: 25,
      goldCost: 4.5,
      description: 'Deep quarry stone slabs sufficient for full portal reinforcement & retaining wall.',
      icon: <Hammer className="w-5 h-5 text-orange-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-stone-900 border-2 border-amber-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border-b border-amber-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-900/50 border border-amber-600/50 rounded-xl shadow-inner">
              <Box className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-100 tracking-wide flex items-center gap-2">
                Prospector Rock & Supply Depot
              </h2>
              <p className="text-xs text-amber-300/70">
                Purchase quarry stones or mine bedrock to reinforce your mountain drift portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inventory Balance Bar */}
        <div className="grid grid-cols-2 gap-3 px-6 py-3 bg-stone-950/70 border-b border-stone-800 text-xs">
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-stone-900 border border-amber-800/40 rounded-xl">
            <Coins className="w-5 h-5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-400 font-mono">AVAILABLE GOLD ORE</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                {currentGold.toFixed(1)} oz
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-stone-900 border border-amber-800/40 rounded-xl">
            <Box className="w-5 h-5 text-stone-300" />
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-400 font-mono">STONES & ROCKS ON HAND</span>
              <span className="text-sm font-bold text-stone-100 font-mono">
                {currentRocks} rocks
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Portal Status Card */}
          {portal && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                portal.isReinforced
                  ? 'bg-emerald-950/30 border-emerald-700/60'
                  : portal.stability < 65
                  ? 'bg-red-950/40 border-red-600/70 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : 'bg-amber-950/30 border-amber-600/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Pickaxe
                    className={`w-5 h-5 ${
                      portal.isReinforced
                        ? 'text-emerald-400'
                        : portal.stability < 65
                        ? 'text-red-400 animate-pulse'
                        : 'text-amber-400'
                    }`}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-stone-100">
                      Mountain Portal Drift Excavation
                    </h3>
                    <p className="text-xs text-stone-300">
                      {portal.isReinforced
                        ? '✅ Permanently shored with heavy pine timber sets & stone masonry.'
                        : portal.stability < 65
                        ? '⚠️ Overburden strain active! Mountain is creaking and groaning. Shoring required!'
                        : 'Rough excavation cut exposed. Timber props under shear strain.'}
                    </p>
                  </div>
                </div>
                {portal.isReinforced && (
                  <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 border border-emerald-500/50 rounded-full text-[10px] font-mono font-bold">
                    Reinforced
                  </span>
                )}
              </div>

              {!portal.isReinforced && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-stone-400">Excavation Progress:</span>
                        <span className="font-bold text-amber-300 font-mono">
                          {portal.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${portal.progress}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-stone-400">Bedrock Stability:</span>
                        <span
                          className={`font-bold font-mono ${
                            portal.stability < 65 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                          }`}
                        >
                          {portal.stability}%
                        </span>
                      </div>
                      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            portal.stability < 65 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${portal.stability}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800/80">
                    <div className="text-xs text-stone-300 flex items-center gap-3">
                      <span>
                        Rocks Needed:{' '}
                        <strong
                          className={
                            currentRocks >= portal.rocksNeeded ? 'text-emerald-400' : 'text-amber-300'
                          }
                        >
                          {currentRocks} / {portal.rocksNeeded}
                        </strong>
                      </span>
                      <span>
                        Gold Needed:{' '}
                        <strong
                          className={
                            currentGold >= portal.goldNeeded ? 'text-emerald-400' : 'text-amber-300'
                          }
                        >
                          {currentGold.toFixed(1)} / {portal.goldNeeded} oz
                        </strong>
                      </span>
                    </div>

                    {onReinforcePortal && (
                      <button
                        onClick={onReinforcePortal}
                        disabled={!canReinforce}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                          canReinforce
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] cursor-pointer'
                            : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                        }`}
                      >
                        <Hammer className="w-3.5 h-3.5" />
                        <span>Reinforce Timber Portal</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* If no portal active, prompt to start excavation */}
          {!portal && onStartExcavation && (
            <div className="p-4 bg-stone-950/50 border border-amber-800/40 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Pickaxe className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-stone-200">
                    No Mine Portal Drift Excavated Yet
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Begin cutting a 3D drift into the mountain bedrock to extract gold veins & stone.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onStartExcavation();
                  onClose();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition-colors"
              >
                Start Excavation
              </button>
            </div>
          )}

          {/* Rock Purchasing Options */}
          <div>
            <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-2.5 font-mono">
              Quarry Stone Purchase Packages
            </h3>
            <div className="space-y-2.5">
              {packages.map((pkg, idx) => {
                const canBuy = currentGold >= pkg.goldCost;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      pkg.recommended
                        ? 'bg-stone-800/90 border-amber-500/70 shadow-md'
                        : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-stone-900 border border-stone-700 rounded-lg">
                        {pkg.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-stone-100">{pkg.name}</h4>
                          {pkg.recommended && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] rounded font-mono font-bold">
                              Best Value
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">{pkg.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="font-bold text-stone-200">+{pkg.rocks} Rocks</span>
                          <span className="text-stone-500">•</span>
                          <span className="text-amber-300 font-mono font-bold">
                            Cost: {pkg.goldCost.toFixed(1)} oz Gold
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onPurchaseRocks(pkg.rocks, pkg.goldCost)}
                      disabled={!canBuy}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        canBuy
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md cursor-pointer active:scale-95'
                          : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>{canBuy ? 'Buy Rocks' : 'Need Gold'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mining Tips */}
          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl text-[11px] text-stone-400 space-y-1">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <Pickaxe className="w-3.5 h-3.5" />
              Prospector's Field Guidance:
            </p>
            <p>
              • <strong>Mine directly:</strong> Equip your pickaxe [4] and strike the bedrock or portal drift with [Left-Click] or [Space] to chip out natural rocks and unearth raw gold quartz veins.
            </p>
            <p>
              • <strong>Mountain Shear Warning:</strong> Digging inside the unreinforced portal lowers Bedrock Stability. Listen for low mountain rumbles, creaking timbers, and pebble showers!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
