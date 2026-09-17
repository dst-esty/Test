import React from 'react';
import {
  Pickaxe,
  Hammer,
  Coins,
  Box,
  RotateCw,
  Sparkles,
  Layers,
  Flame,
  ArrowRight,
  ShieldAlert,
  X,
  CheckCircle2,
  Tent,
} from 'lucide-react';
import { MineStructureType, PlayerState, StructureBlueprint } from '../types';
import { STRUCTURE_BLUEPRINTS } from '../world/mineBuilding';

interface MineBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  activeBuildingType: MineStructureType;
  onSelectStructure: (type: MineStructureType) => void;
  onStartStaking: () => void;
  onOpenDeed: () => void;
  onPurchaseRocks?: (amount: number, goldCost: number) => void;
  onOpenRockDepot?: () => void;
  onReinforcePortal?: () => void;
}

export const MineBuilderModal: React.FC<MineBuilderModalProps> = ({
  isOpen,
  onClose,
  playerState,
  activeBuildingType,
  onSelectStructure,
  onStartStaking,
  onOpenDeed,
  onPurchaseRocks,
  onOpenRockDepot,
  onReinforcePortal,
}) => {
  if (!isOpen) return null;

  const blueprints = Object.values(STRUCTURE_BLUEPRINTS);
  const hasClaim = !!playerState.activeClaim;
  const currentGold = typeof playerState.goldFound === 'number' && !isNaN(playerState.goldFound)
    ? playerState.goldFound
    : 0;
  const currentRocks = typeof playerState.blocksDug === 'number' && !isNaN(playerState.blocksDug)
    ? playerState.blocksDug
    : 0;

  const canAfford = (bp: StructureBlueprint) => {
    return currentGold >= bp.goldCost && currentRocks >= bp.rockCost;
  };

  const portal = playerState.portalExcavation;
  const canReinforce =
    portal &&
    !portal.isReinforced &&
    currentRocks >= portal.rocksNeeded &&
    currentGold >= portal.goldNeeded;

  const getStructureIcon = (type: MineStructureType) => {
    switch (type) {
      case 'timber_portal':
        return <Layers className="w-6 h-6 text-amber-500" />;
      case 'headframe_hoist':
        return <Hammer className="w-6 h-6 text-orange-400" />;
      case 'sluice_box':
        return <Sparkles className="w-6 h-6 text-cyan-400" />;
      case 'rail_track':
        return <Box className="w-6 h-6 text-stone-300" />;
      case 'assay_forge':
        return <Flame className="w-6 h-6 text-amber-400" />;
      case 'deep_shaft':
        return <Pickaxe className="w-6 h-6 text-yellow-400" />;
      case 'campfire':
        return <Flame className="w-6 h-6 text-orange-500" />;
      case 'prospector_camp':
        return <Tent className="w-6 h-6 text-amber-300" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-stone-900 border-2 border-amber-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border-b border-amber-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-900/50 border border-amber-600/50 rounded-xl shadow-inner">
              <Hammer className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-100 tracking-wide">
                Mine Construction & Staking Depot
              </h2>
              <p className="text-xs text-amber-300/70">
                Architectural blueprints & mineral patent operations for the Superstition Mountains
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-amber-200 hover:bg-stone-800/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resources & Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-stone-950/60 border-b border-stone-800/80 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900/90 border border-amber-900/40 rounded-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <div>
              <span className="text-stone-400">Raw Gold: </span>
              <span className="font-bold text-yellow-400 font-mono">{currentGold.toFixed(1)} oz</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900/90 border border-amber-900/40 rounded-lg">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-stone-300" />
              <div>
                <span className="text-stone-400">Dug Rocks: </span>
                <span className="font-bold text-amber-200 font-mono">{currentRocks}</span>
              </div>
            </div>
            {onOpenRockDepot && (
              <button
                onClick={onOpenRockDepot}
                className="px-2 py-0.5 bg-amber-600/80 hover:bg-amber-500 text-stone-950 font-bold rounded text-[10px] font-mono shadow"
              >
                + Buy
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900/90 border border-amber-900/40 rounded-lg">
            <Flame className="w-4 h-4 text-orange-400" />
            <div>
              <span className="text-stone-400">Bullion: </span>
              <span className="font-bold text-orange-300 font-mono">{playerState.bullionBars || 0} Bars</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 bg-stone-900/90 border border-amber-900/40 rounded-lg">
            <div className="truncate">
              <span className="text-stone-400">Claim: </span>
              <span className="font-semibold text-amber-300">
                {hasClaim ? playerState.activeClaim!.name.slice(0, 14) + '...' : 'None Staked'}
              </span>
            </div>
            {hasClaim && (
              <button
                onClick={onOpenDeed}
                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold ml-1"
              >
                Deed
              </button>
            )}
          </div>
        </div>

        {/* Portal Excavation Status & Mountain Strain Alert */}
        {portal && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              portal.isReinforced
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                : portal.stability < 65
                ? 'bg-red-950/40 border-red-600/70 shadow-[0_0_20px_rgba(239,68,68,0.25)] text-stone-200'
                : 'bg-amber-950/40 border-amber-600/60 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Pickaxe
                className={`w-5 h-5 shrink-0 ${
                  portal.isReinforced
                    ? 'text-emerald-400'
                    : portal.stability < 65
                    ? 'text-red-400 animate-pulse'
                    : 'text-amber-400'
                }`}
              />
              <div>
                <div className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span>Mountain Portal Drift Excavation</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 font-mono">
                    Progress: {portal.progress}% | Stability: {portal.stability}%
                  </span>
                </div>
                <p className="text-[11px] text-stone-300">
                  {portal.isReinforced
                    ? '✅ Timber portal shored and permanently reinforced against tectonic cave-in.'
                    : portal.stability < 65
                    ? '⚠️ MOUNTAIN CREAKING & GROANING: Bedrock strain high! Need rocks and gold to reinforce.'
                    : 'Unshored drift exposed in mountain rock. Strike with pickaxe to dig.'}
                </p>
              </div>
            </div>

            {!portal.isReinforced && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {onOpenRockDepot && (
                  <button
                    onClick={onOpenRockDepot}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-600/40 rounded-lg text-[11px] font-bold"
                  >
                    Buy Quarry Rocks
                  </button>
                )}
                {onReinforcePortal && (
                  <button
                    onClick={onReinforcePortal}
                    disabled={!canReinforce}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                      canReinforce
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md cursor-pointer'
                        : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                    }`}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>Reinforce Portal ({portal.rocksNeeded}R/{portal.goldNeeded}G)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Claim Notice / Staking Banner */}
        {!hasClaim ? (
          <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/70 border border-amber-700/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200">No Mining Claim Officially Staked Yet</h3>
                <p className="text-xs text-amber-300/80">
                  Stake your 40-acre mineral patent anywhere on the terrain to mark official boundaries with survey cords!
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onStartStaking();
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2 whitespace-nowrap"
            >
              <Hammer className="w-4 h-4" />
              Equip Survey Stake [8]
            </button>
          </div>
        ) : (
          <div className="mx-6 mt-4 p-3 bg-stone-950/50 border border-amber-800/40 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Registered Estate: <strong>{playerState.activeClaim.name}</strong> ({playerState.activeClaim.size} yds²)
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onStartStaking();
              }}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded border border-amber-700/50 text-[11px]"
            >
              Restake New Claim
            </button>
          </div>
        )}

        {/* Blueprint Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {blueprints.map((bp) => {
            const affordable = canAfford(bp);
            const isSelected = activeBuildingType === bp.type;

            return (
              <div
                key={bp.type}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50'
                    : 'bg-stone-950/60 border-stone-800 hover:border-amber-700/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-stone-900 border border-stone-700/70 rounded-xl">
                        {getStructureIcon(bp.type)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-100">{bp.name}</h4>
                        <span className="text-[10px] text-stone-400">
                          {bp.dimensions.width}m × {bp.dimensions.height}m × {bp.dimensions.depth}m footprint
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 font-semibold text-[10px] rounded-full">
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-300 mb-3 leading-relaxed">{bp.description}</p>

                  <div className="p-2.5 bg-stone-900/80 border border-stone-800/80 rounded-lg text-xs text-amber-300/90 mb-3">
                    <strong className="text-amber-400">Function: </strong>
                    {bp.benefit}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-800/80">
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        playerState.goldFound >= bp.goldCost ? 'text-yellow-400' : 'text-red-400'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      {bp.goldCost} oz Gold
                    </span>
                    <span
                      className={`flex items-center gap-1 font-semibold ${
                        playerState.blocksDug >= bp.rockCost ? 'text-stone-300' : 'text-red-400'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      {bp.rockCost} Rocks
                    </span>
                  </div>

                  <button
                    disabled={!affordable}
                    onClick={() => {
                      onSelectStructure(bp.type);
                      onClose();
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      affordable
                        ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md transform hover:scale-105'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <span>{isSelected ? 'Place Now' : 'Select Blueprint'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-amber-400" />
            <span>While placing in 3D: Press <strong>[R]</strong> to rotate 45°, <strong>[Left-Click]</strong> to place.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-stone-800 hover:bg-stone-700 text-amber-200 rounded-lg text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
