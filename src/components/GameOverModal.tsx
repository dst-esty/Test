import React, { useState } from 'react';
import { GameOverDetails } from '../types';
import {
  Skull,
  Mountain,
  Sun,
  Crosshair,
  RotateCcw,
  Eye,
  Coins,
  Pickaxe,
  Compass,
  Clock,
  Layers,
  ChevronDown,
  Droplets,
  Flame,
} from 'lucide-react';

interface GameOverModalProps {
  details: GameOverDetails;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ details, onRestart }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getDeathTheme = () => {
    switch (details.reason) {
      case 'cave_in':
        return {
          badge: 'GEOTECHNICAL OVERBURDEN FAILURE',
          color: 'text-amber-400',
          borderColor: 'border-amber-700/60',
          glow: 'from-amber-950/80 via-stone-950/90 to-black/95',
          icon: <Mountain className="w-8 h-8 text-amber-400 animate-pulse" />,
          epitaphHeader: 'BURIED ALIVE BENEATH COLLAPSED STRATA',
        };
      case 'dehydration':
        return {
          badge: 'ARIZONA DESERT SUNSTROKE',
          color: 'text-orange-400',
          borderColor: 'border-orange-700/60',
          glow: 'from-orange-950/80 via-stone-950/90 to-black/95',
          icon: <Sun className="w-8 h-8 text-orange-400 animate-pulse" />,
          epitaphHeader: 'DRIED TO BONE UNDER SCORCHING ARROYOS',
        };
      case 'bandit':
        return {
          badge: 'AMBUSHED BY CLAIM JUMPERS',
          color: 'text-red-400',
          borderColor: 'border-red-700/60',
          glow: 'from-red-950/80 via-stone-950/90 to-black/95',
          icon: <Crosshair className="w-8 h-8 text-red-400 animate-pulse" />,
          epitaphHeader: 'SHOT DOWN IN AN UNMARKED CANYON',
        };
      case 'apache_raid':
        return {
          badge: 'DEFENDERS OF SACRED SUPERSTITIONS',
          color: 'text-rose-400',
          borderColor: 'border-rose-700/60',
          glow: 'from-rose-950/80 via-stone-950/90 to-black/95',
          icon: <Flame className="w-8 h-8 text-rose-400 animate-pulse" />,
          epitaphHeader: 'SACRED GROUND RECLAIMED BY APACHE GUARDIANS',
        };
      case 'drowning':
        return {
          badge: 'SUBTERRANEAN AQUIFER DROWNING',
          color: 'text-cyan-400',
          borderColor: 'border-cyan-700/60',
          glow: 'from-blue-950/80 via-stone-950/90 to-black/95',
          icon: <Droplets className="w-8 h-8 text-cyan-400 animate-pulse" />,
          epitaphHeader: 'DROWNED IN FLOODED MINE DRIFTS',
        };
      case 'venom':
        return {
          badge: 'LETHAL DESERT ENVENOMATION',
          color: 'text-emerald-400',
          borderColor: 'border-emerald-700/60',
          glow: 'from-emerald-950/80 via-stone-950/90 to-black/95',
          icon: <Skull className="w-8 h-8 text-emerald-400 animate-pulse" />,
          epitaphHeader: 'OVERCOME BY DEADLY DESERT VENOM',
        };
      case 'dynamite':
      default:
        return {
          badge: 'HIGH-EXPLOSIVE BLAST ACCIDENT',
          color: 'text-yellow-400',
          borderColor: 'border-yellow-700/60',
          glow: 'from-yellow-950/80 via-stone-950/90 to-black/95',
          icon: <Skull className="w-8 h-8 text-yellow-400 animate-pulse" />,
          epitaphHeader: 'SHATTERED BY NITRO DYNAMITE',
        };
    }
  };

  const theme = getDeathTheme();

  // If player minimized the modal to enjoy the panoramic 3D camera flight:
  if (isMinimized) {
    return (
      <div className="fixed inset-x-0 bottom-6 z-50 flex items-center justify-center pointer-events-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 bg-stone-950/85 backdrop-blur-md border border-stone-700/70 px-5 py-3 rounded-full shadow-2xl text-stone-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono tracking-wider font-semibold text-amber-300 uppercase">
              Panoramic Wilderness Flyover
            </span>
          </div>
          <div className="h-4 w-px bg-stone-700" />
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-stone-800 hover:bg-stone-700 text-stone-100 transition-colors cursor-pointer border border-stone-600"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Show Ledger</span>
          </button>
          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Expedition</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
      {/* Panoramic Widescreen Container */}
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#1c1714] via-[#120f0d] to-[#0a0807] text-stone-100 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] border-2 border-[#5c4028]/80 p-5 sm:p-8 font-serif overflow-hidden">
        
        {/* Subtle Ornamental Frontier Corner Brackets */}
        <div className="absolute top-2 left-2 text-[#7d5635] text-xs font-mono pointer-events-none select-none">⌜ 1884 ⌟</div>
        <div className="absolute top-2 right-2 text-[#7d5635] text-xs font-mono pointer-events-none select-none">⌜ PERALTA ⌟</div>
        <div className="absolute bottom-2 left-2 text-[#7d5635] text-xs font-mono pointer-events-none select-none">⌞ LOST DUTCHMAN ⌟</div>
        <div className="absolute bottom-2 right-2 text-[#7d5635] text-xs font-mono pointer-events-none select-none">⌞ EXPEDITION ⌟</div>

        {/* Top Header & Epitaph */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-5 mb-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-700/80 shadow-inner">
              {theme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest font-bold uppercase bg-stone-900 border border-stone-700 text-stone-300">
                  {theme.badge}
                </span>
                <span className="text-[11px] font-mono text-stone-500">
                  Sector: {details.coordinates.x.toFixed(0)}, {details.coordinates.z.toFixed(0)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-stone-100 uppercase">
                {details.title}
              </h1>
              <p className={`text-xs font-mono font-semibold tracking-wider ${theme.color} uppercase mt-0.5`}>
                {theme.epitaphHeader}
              </p>
            </div>
          </div>

          {/* Panoramic Camera Spectate Toggle */}
          <button
            onClick={() => setIsMinimized(true)}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 transition-colors cursor-pointer shadow"
            title="Minimize ledger to watch the panoramic 3D camera sweep over the Superstitions"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Spectate Panoramic View</span>
          </button>
        </div>

        {/* The Narrative Cause of Death Card */}
        <div className="bg-[#241c17]/60 border border-[#4d3622]/60 rounded-xl p-4 sm:p-5 mb-6 text-stone-300 text-sm leading-relaxed relative">
          <div className="text-[10px] font-mono tracking-widest text-amber-500/80 uppercase mb-1 font-bold">
            Expedition Coroner&apos;s Inquest & Historical Record
          </div>
          <p className="font-sans text-stone-300 text-[13px] sm:text-[14px]">
            {details.cause}
          </p>
          {details.depth && details.depth > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 flex flex-wrap items-center gap-4 text-xs font-mono text-stone-400">
              <span>Excavation Depth: <strong className="text-amber-300">{details.depth.toFixed(1)}m</strong></span>
              {details.strata && (
                <span>Strata: <strong className="text-stone-200">{details.strata}</strong></span>
              )}
              <span className="text-stone-500">💡 Tip: Timber shoring [T] must be extended as you penetrate each new depth.</span>
            </div>
          )}
        </div>

        {/* Panoramic Ledger Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono text-center">
          <div className="bg-stone-900/70 border border-stone-800 p-3 rounded-xl">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 uppercase mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Gold Found</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400">
              {details.goldFound.toFixed(1)} <span className="text-xs font-normal text-stone-400">oz</span>
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              ~${(details.goldFound * 20.67).toFixed(0)} (1884 Standard)
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-800 p-3 rounded-xl">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 uppercase mb-1">
              <Pickaxe className="w-3.5 h-3.5 text-stone-400" />
              <span>Rock Excavated</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-stone-200">
              {details.blocksDug} <span className="text-xs font-normal text-stone-400">blocks</span>
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              Displaced Overburden
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-800 p-3 rounded-xl">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 uppercase mb-1">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>Landmarks</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-stone-200">
              {details.landmarksDiscovered} <span className="text-xs font-normal text-stone-400">sites</span>
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              Wilderness Explored
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-800 p-3 rounded-xl">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 uppercase mb-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>Time Survived</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-stone-200">
              {formatTime(details.timeSurvivedSeconds)}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              In Superstitions
            </div>
          </div>
        </div>

        {/* Frontier Warning / Lore Epitaph */}
        <p className="text-stone-400 text-xs italic text-center mb-6 max-w-xl mx-auto leading-relaxed">
          &ldquo;The red volcanic crags of the Superstitions do not yield their treasures lightly. Jacob Waltz took his secrets to the grave, and the desert winds soon erase every footprint.&rdquo;
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-mono text-sm font-bold bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 transition-all shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Expedition</span>
          </button>

          <button
            onClick={() => setIsMinimized(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-mono text-sm font-semibold bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Watch Panoramic Vista</span>
          </button>
        </div>

      </div>
    </div>
  );
};
