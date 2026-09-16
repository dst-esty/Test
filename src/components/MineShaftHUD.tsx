import React from 'react';
import { ChevronUp, ChevronDown, Pickaxe, Unlock, Lock, Sparkles, Sun, Layers } from 'lucide-react';
import { MineLayerData } from '../types';

interface MineShaftHUDProps {
  isInsideMine: boolean;
  currentLevel: number; // 0 = surface, 1 to 4
  maxUnlockedLevel: number;
  layers: MineLayerData[];
  onAscend: () => void;
  onDescend: () => void;
  onExitToSurface: () => void;
  onSelectLevel?: (level: number) => void;
  onDigDown?: () => void;
  isNearExcavationPit?: boolean;
}

export const MineShaftHUD: React.FC<MineShaftHUDProps> = ({
  isInsideMine,
  currentLevel,
  maxUnlockedLevel,
  layers,
  onAscend,
  onDescend,
  onExitToSurface,
  onSelectLevel,
  onDigDown,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!isInsideMine && currentLevel === 0) {
    return null;
  }

  const activeLayer = layers.find((l) => l.level === currentLevel);
  const nextLayer = layers.find((l) => l.level === currentLevel + 1);

  return (
    <div id="mine-shaft-hud" className="pointer-events-auto absolute left-3 sm:left-5 top-20 sm:top-24 z-30 flex flex-col gap-2 max-w-[280px] sm:max-w-xs font-mono select-none">
      {/* Main Depth & Stratum Card */}
      <div className="bg-stone-950/92 backdrop-blur-md text-amber-100 border-2 border-amber-700/70 rounded-2xl shadow-[0_0_24px_rgba(0,0,0,0.85)] p-3.5 flex flex-col gap-2.5">
        {/* Header: Current Geological Layer */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">
                Subterranean Shaft
              </span>
              <span className="text-xs font-bold text-amber-200">
                {activeLayer ? activeLayer.name : 'Desert Surface Collar'}
              </span>
            </div>
          </div>
          <button
            id="btn-toggle-shaft-hud"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-stone-400 hover:text-amber-300 rounded hover:bg-stone-800 transition cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Current Depth & Strata Details */}
        {activeLayer && (
          <div className="flex flex-col gap-1 bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Depth:</span>
              <span className="font-bold text-amber-300">-{activeLayer.depthMeters.toFixed(1)}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Strata:</span>
              <span className="text-right text-stone-200 font-sans font-medium text-[10px] max-w-[170px] truncate" title={activeLayer.strata}>
                {activeLayer.strata}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Primary Ore:</span>
              <span className="text-amber-400 text-[10px] font-semibold">{activeLayer.primaryMineral}</span>
            </div>
          </div>
        )}

        {/* Dig Down Progress towards next layer */}
        {currentLevel > 0 && currentLevel < 4 && nextLayer && (
          <div className="flex flex-col gap-1 bg-amber-950/40 p-2 rounded-xl border border-amber-700/40 text-[11px]">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Pickaxe className="w-3 h-3 text-amber-400" /> Sinking Shaft to Layer {currentLevel + 1}:
              </span>
              <span className="font-mono text-amber-400">
                {activeLayer?.currentHits || 0}/{activeLayer?.hitsNeeded || 4} ({activeLayer?.digProgress || 0}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-amber-800/50">
              <div
                className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 h-full transition-all duration-300"
                style={{ width: `${activeLayer?.digProgress || 0}%` }}
              />
            </div>

            {/* Dig Action Button */}
            {onDigDown && (
              <button
                id="btn-dig-bedrock-down"
                onClick={onDigDown}
                className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-md transition transform active:scale-95 cursor-pointer"
              >
                <Pickaxe className="w-3.5 h-3.5" />
                <span>DIG BEDROCK DOWN</span>
                <span className="text-[9px] bg-stone-950/70 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                  CLICK / E
                </span>
              </button>
            )}
          </div>
        )}

        {/* Mother Lode celebration banner when at Layer 4 */}
        {currentLevel === 4 && (
          <div className="flex items-center gap-2 bg-yellow-950/70 p-2.5 rounded-xl border border-yellow-500/70 text-yellow-300 text-xs font-serif">
            <Sparkles className="w-4 h-4 text-yellow-400 shrink-0 animate-pulse" />
            <span>You have reached the legendary Lost Dutchman Mother Lode Chimney!</span>
          </div>
        )}

        {/* Expanded Layer Navigation Map */}
        {isExpanded && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-stone-800/80">
            <span className="text-[9px] text-stone-400 uppercase tracking-wider font-bold">
              Pregenerated Strata Layers:
            </span>
            <div className="flex flex-col gap-1">
              {layers.map((layer) => {
                const isCurrent = layer.level === currentLevel;
                const isUnlocked = layer.level <= maxUnlockedLevel;

                return (
                  <button
                    key={layer.id}
                    id={`btn-layer-nav-${layer.level}`}
                    disabled={!isUnlocked}
                    onClick={() => onSelectLevel && isUnlocked && onSelectLevel(layer.level)}
                    className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-bold'
                        : isUnlocked
                        ? 'bg-stone-900/60 text-stone-300 hover:bg-stone-800/80 border-stone-800'
                        : 'bg-stone-950/40 text-stone-600 border-transparent cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isUnlocked ? (
                        <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="block truncate font-serif">
                          L{layer.level}: {layer.name}
                        </span>
                        <span className="text-[9px] text-stone-400 font-mono">
                          -{layer.depthMeters.toFixed(0)}m
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[9px] bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                        YOU
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Shaft Elevator Controls */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-stone-800">
          <button
            id="btn-shaft-ascend"
            onClick={onAscend}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-amber-200 rounded-xl border border-stone-700 text-[10px] transition cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentLevel <= 1 ? 'Surface' : `Layer ${currentLevel - 1}`}</span>
          </button>

          <button
            id="btn-shaft-descend"
            onClick={onDescend}
            disabled={currentLevel >= maxUnlockedLevel}
            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border text-[10px] transition ${
              currentLevel < maxUnlockedLevel
                ? 'bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-amber-200 border-stone-700 cursor-pointer'
                : 'bg-stone-950/50 text-stone-600 border-stone-800/40 cursor-not-allowed'
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentLevel >= 4 ? 'Max Depth' : `Layer ${currentLevel + 1}`}</span>
          </button>
        </div>

        {/* Exit to Desert Surface Button */}
        <button
          id="btn-exit-to-surface"
          onClick={onExitToSurface}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-stone-900/60 hover:bg-amber-950/60 text-stone-400 hover:text-amber-200 rounded-lg text-[10px] transition border border-stone-800 cursor-pointer"
        >
          <Sun className="w-3 h-3 text-amber-400" />
          <span>Exit to Desert Surface</span>
        </button>
      </div>
    </div>
  );
};
