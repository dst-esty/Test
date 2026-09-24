import React, { useEffect } from 'react';
import { Award, Sparkles, CheckCircle, ArrowRight, Pickaxe, MapPin, Compass, BookOpen, ShieldCheck } from 'lucide-react';
import { PeraltaSolveDef, peraltaStoneMapService, PERALTA_SOLVES } from '../services/peraltaStoneMapService';
import { soundEngine } from '../audio/soundEffects';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldFound: number;
  cluesCount: number;
  activeSolve?: PeraltaSolveDef | null;
  onOpenMap?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  goldFound,
  cluesCount,
  activeSolve,
  onOpenMap,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundEngine.playDiscovery();
      soundEngine.playCoins();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSolve = activeSolve || peraltaStoneMapService.getActiveSolve() || PERALTA_SOLVES[0];
  const completedSolvesCount = peraltaStoneMapService.getCompletedSolvesCount();
  const totalSolves = PERALTA_SOLVES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-stone-900 via-[#26170d] to-stone-950 text-amber-100 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border-4 border-amber-600/80 p-6 sm:p-8 font-serif text-center overflow-hidden max-h-[94vh] flex flex-col">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Trophy / Emblem */}
        <div className="mx-auto w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(251,191,36,0.45)] shrink-0">
          <Award className="w-9 h-9 sm:w-10 sm:h-10 text-amber-300 animate-bounce" />
        </div>

        {/* Category & Theory Header */}
        <div className="mb-2 shrink-0">
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1">
            Peralta Stone Map Solve Conquered • {currentSolve.historicalEra}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-200 leading-tight">
            {currentSolve.victoryTitle}
          </h2>
          <p className="text-xs text-amber-400/90 font-mono mt-0.5">
            {currentSolve.victorySubtitle}
          </p>
        </div>

        {/* Scrollable Narrative Body */}
        <div className="space-y-3.5 overflow-y-auto pr-1 text-sm text-stone-300 custom-scrollbar my-2">
          {/* Historical Theory Credit */}
          <div className="px-3.5 py-2 bg-stone-900/90 rounded-xl border border-amber-800/40 text-left flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-amber-200">Historical Solve Theory: </span>
              <span className="text-stone-300">{currentSolve.theoryTitle}</span>
              <span className="block text-[11px] text-stone-400 italic">
                Pioneered by {currentSolve.historicalResearcher}
              </span>
            </div>
          </div>

          {/* Epilogue Text */}
          <div className="p-4 bg-[#321c10]/80 rounded-xl border-l-4 border-amber-500 text-xs sm:text-sm text-amber-100/90 leading-relaxed text-left shadow-inner">
            {currentSolve.victoryEpilogue}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-left bg-stone-900/90 p-3 rounded-xl border border-amber-800/50">
            <div className="p-2 bg-stone-800/50 rounded-lg">
              <span className="text-[9px] sm:text-[10px] text-amber-400/80 uppercase block">Bonus Gold</span>
              <span className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                +{currentSolve.bonusGoldOz} oz
              </span>
            </div>

            <div className="p-2 bg-stone-800/50 rounded-lg">
              <span className="text-[9px] sm:text-[10px] text-amber-400/80 uppercase block">Frontier Cash</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-1">
                <span className="text-xs">$</span>
                +{currentSolve.bonusCash.toFixed(0)}
              </span>
            </div>

            <div className="p-2 bg-stone-800/50 rounded-lg">
              <span className="text-[9px] sm:text-[10px] text-amber-400/80 uppercase block">Clues Mapped</span>
              <span className="text-sm sm:text-base font-bold text-sky-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                {cluesCount} Clues
              </span>
            </div>

            <div className="p-2 bg-stone-800/50 rounded-lg">
              <span className="text-[9px] sm:text-[10px] text-amber-400/80 uppercase block">Solves Solved</span>
              <span className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {Math.max(1, completedSolvesCount)} / {totalSolves}
              </span>
            </div>
          </div>

          {/* Multiple Solves Hint */}
          <div className="text-[11px] text-stone-400 font-sans italic text-center">
            {completedSolvesCount < totalSolves ? (
              <span>
                💡 The Peralta Stone Maps contain <strong>{totalSolves - Math.max(1, completedSolvesCount)} other competing historical solves</strong>! Inspect the Stone Map to trace other theories across the Superstitions.
              </span>
            ) : (
              <span className="text-amber-300 font-semibold not-italic">
                🌟 Master of the Superstitions! You have conquered ALL {totalSolves} historical solves of the Peralta Stone Maps!
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2 shrink-0">
          {onOpenMap && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMap();
              }}
              className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-200 font-serif font-bold text-xs sm:text-sm rounded-xl border border-amber-600/50 transition flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Review Solves on Stone Map</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-sans text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue Expedition [Enter]</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
