import React, { useState, useEffect } from 'react';
import { ShaftSinkingStats } from '../world/undergroundVoxels';
import { Pickaxe, Shield, Sparkles, AlertCircle, ArrowDownCircle, X } from 'lucide-react';

interface ShaftSinkingGaugeProps {
  stats: ShaftSinkingStats | null;
  onStrikeVoxel?: () => void;
  onPlaceTimber?: () => void;
  equippedTool: string;
}

export const ShaftSinkingGauge: React.FC<ShaftSinkingGaugeProps> = ({
  stats,
  onStrikeVoxel,
  onPlaceTimber,
  equippedTool,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastLevel, setLastLevel] = useState<number | null>(null);

  useEffect(() => {
    if (stats && stats.currentLevel !== lastLevel) {
      setIsDismissed(false);
      setLastLevel(stats.currentLevel);
    }
  }, [stats?.currentLevel, lastLevel]);

  if (!stats || isDismissed) return null;

  const {
    currentLevel,
    currentDepth,
    targetDepth,
    progressPercent,
    activeFloorVoxels,
    totalFloorVoxels,
    goldMinedInLevel,
    timberSetsPlaced,
    breakthroughReady,
    strataName,
    targetedVoxel,
  } = stats;

  return (
    <div className="pointer-events-auto absolute top-20 sm:top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Main Tactical Sinking Card */}
      <div className="bg-stone-950/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border-2 border-amber-700/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-stone-200 w-[92vw] max-w-md font-sans">
        {/* Top Header: Strata & Depth meter */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-1.5 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-amber-900/60 rounded-lg border border-amber-600/50">
              <Pickaxe className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">
                {currentLevel === 0 ? 'Surface Shaft Collar' : `Subterranean Layer ${currentLevel}`}
              </span>
              <span className="text-[10px] text-stone-400 font-serif italic truncate max-w-[210px]">
                {strataName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-amber-200 font-mono font-bold text-xs">
                <ArrowDownCircle className="w-3 h-3 text-amber-400" />
                <span>-{currentDepth.toFixed(2)}m</span>
              </div>
              <span className="text-[9px] font-mono text-stone-400">
                Breakthrough: -{targetDepth.toFixed(1)}m
              </span>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-amber-300 transition cursor-pointer border border-stone-800 hover:border-amber-700/60 ml-1"
              title="Close Shaft Gauge"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sinking Excavation Progress Bar */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-stone-300">Bedrock Sunk ({totalFloorVoxels - activeFloorVoxels}/{totalFloorVoxels} Mini-Voxels)</span>
            <span className="text-amber-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-stone-900/90 h-2 rounded-full overflow-hidden border border-stone-800 flex">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                breakthroughReady
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 animate-pulse'
                  : 'bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
            />
          </div>
        </div>

        {/* Breakthrough Alert Banner */}
        {breakthroughReady ? (
          <div className="flex items-center justify-between bg-emerald-950/80 border border-emerald-500/80 rounded-xl px-2.5 py-1.5 mb-2 text-emerald-200 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-bounce" />
              Breakthrough Ready! Strike floor to penetrate!
            </span>
            {onStrikeVoxel && (
              <button
                onClick={onStrikeVoxel}
                className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded text-[10px] transition cursor-pointer"
              >
                BREACH
              </button>
            )}
          </div>
        ) : null}

        {/* Targeted Mini-Voxel Specimen Badge */}
        {targetedVoxel ? (
          <div className="flex items-center justify-between bg-stone-900/90 border border-amber-800/60 rounded-xl px-2.5 py-1.5 mb-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-3.5 h-3.5 rounded-sm border ${
                  targetedVoxel.type === 'quartz_gold'
                    ? 'bg-amber-400 border-yellow-200 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : targetedVoxel.type === 'silver_ore'
                    ? 'bg-slate-300 border-slate-100'
                    : targetedVoxel.type === 'amethyst'
                    ? 'bg-purple-600 border-purple-300'
                    : targetedVoxel.type === 'copper'
                    ? 'bg-orange-600 border-orange-300'
                    : 'bg-amber-800 border-amber-600'
                }`}
              />
              <div className="flex flex-col">
                <span className="font-mono font-bold text-amber-200 text-[11px]">
                  {targetedVoxel.name}
                </span>
                <span className="text-[9px] text-stone-400 font-mono">
                  Durability: {targetedVoxel.health}/{targetedVoxel.maxHealth} hits
                  {targetedVoxel.oreYield > 0 ? ` • +${targetedVoxel.oreYield.toFixed(1)} oz Gold` : ''}
                </span>
              </div>
            </div>

            {onStrikeVoxel && (
              <button
                onClick={onStrikeVoxel}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[10px] font-mono rounded-lg shadow transition cursor-pointer"
              >
                Mine [L-Click/E]
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 bg-stone-900/50 border border-stone-800/60 rounded-xl py-1 text-[10px] text-stone-400 font-mono mb-1.5">
            <Pickaxe className="w-3 h-3 text-stone-500" />
            <span>Aim reticle at floor mini-voxels to chip bedrock</span>
          </div>
        )}

        {/* Footer: Timber Cribbing & Gold Recovered stats */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-800/70 text-[10px] font-mono text-stone-400">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-600" />
            <span>Timber Sets: <strong className="text-amber-300">{timberSetsPlaced}</strong></span>
          </div>

          <div className="flex items-center gap-1 text-amber-300">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Shaft Gold: <strong>+{goldMinedInLevel.toFixed(1)} oz</strong></span>
          </div>

          {onPlaceTimber && (
            <button
              onClick={onPlaceTimber}
              title="Place Square-Set Timber Support Bent [T]"
              className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-amber-200 rounded border border-amber-800/40 text-[9px] transition cursor-pointer"
            >
              Bent [T]
            </button>
          )}
        </div>
      </div>

      {/* Mini Hint Banner for Tool Cleave & Explosives */}
      <div className="bg-stone-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-stone-700/60 text-[10px] font-mono text-stone-300 flex items-center gap-2 shadow">
        <span className="text-amber-400 font-bold">Tool:</span>
        {equippedTool === 'dynamite' ? (
          <span className="text-red-300">💥 Dynamite equipped: Blasts a 1.25m cavity of mini-voxels!</span>
        ) : equippedTool === 'shovel' ? (
          <span className="text-amber-200">Shovel equipped: Clears soft sandstone and sump voxels</span>
        ) : (
          <span className="text-amber-300">⛏️ Pickaxe equipped: Chipping deals cleave damage to adjacent mini-voxels!</span>
        )}
      </div>
    </div>
  );
};
