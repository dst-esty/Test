import React from 'react';
import { X, Lock, CheckCircle2, AlertTriangle, Compass, MapPin, ArrowRight, Scroll } from 'lucide-react';
import {
  PERALTA_STONE_ARTIFACTS,
  PeraltaStoneArtifact,
  peraltaStoneMapService,
} from '../services/peraltaStoneMapService';

interface PeraltaMineLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMap?: () => void;
}

export const PeraltaMineLockModal: React.FC<PeraltaMineLockModalProps> = ({
  isOpen,
  onClose,
  onOpenMap,
}) => {
  if (!isOpen) return null;

  const collectedCount = peraltaStoneMapService.getCollectedCount();
  const totalCount = peraltaStoneMapService.getTotalArtifactCount();
  const collectedIds = new Set(peraltaStoneMapService.getCollectedArtifactIds());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-stone-900 via-[#26170d] to-stone-950 text-amber-100 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border-4 border-amber-700/80 p-6 sm:p-8 font-serif text-center overflow-hidden max-h-[92vh] flex flex-col">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-600/15 blur-3xl pointer-events-none" />

        {/* Top Tag & Close */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-800/40 shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
              Peralta Stone Cipher Mechanism Sealed
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-amber-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Icon & Header */}
        <div className="my-2 shrink-0">
          <div className="mx-auto w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-950 to-stone-850 border-2 border-amber-600/80 flex items-center justify-center mb-2 shadow-[0_0_25px_rgba(217,119,6,0.3)]">
            <Lock className="w-8 h-8 sm:w-9 sm:h-9 text-amber-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-amber-200 leading-tight">
            Lost Dutchman Mine Entrance Sealed
          </h2>
          <p className="text-xs text-amber-400/90 font-mono mt-0.5">
            Peralta Stone Keyway Incomplete • {collectedCount} / {totalCount} Fragments Recovered
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="space-y-3 overflow-y-auto pr-1 text-sm text-stone-300 custom-scrollbar my-2 text-left">
          {/* Lore Warning Box */}
          <div className="p-3.5 bg-[#321c10]/90 rounded-xl border-l-4 border-amber-600 text-xs text-amber-100/95 leading-relaxed font-sans shadow-inner">
            Heavy ironwood crossbeams mortared with caliche cement and carved basalt boulders block the drift. In the center of the timber frame sits a recessed stone triad with three empty tablet mortises. You must recover all <strong>three distinct physical Peralta Stone Map fragments</strong> scattered across different desert biomes to decipher the lock mechanism.
          </div>

          {/* Fragments Checklist across Biomes */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
              Required Stone Fragments &amp; Desert Biomes:
            </span>

            {PERALTA_STONE_ARTIFACTS.map((artifact, idx) => {
              const isCollected = collectedIds.has(artifact.id);
              return (
                <div
                  key={artifact.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isCollected
                      ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-100'
                      : 'bg-stone-900/80 border-stone-700 text-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {isCollected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-amber-500/60 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-mono font-bold text-amber-400">{idx + 1}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-xs sm:text-sm font-serif">
                          {artifact.name}
                        </span>
                        <span className="block text-[10px] font-mono text-amber-400/90">
                          {artifact.spanishName}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                        isCollected
                          ? 'bg-emerald-900/80 border-emerald-500 text-emerald-200'
                          : 'bg-amber-950/80 border-amber-600/60 text-amber-300'
                      }`}
                    >
                      {isCollected ? 'Recovered ✓' : 'Missing ✗'}
                    </span>
                  </div>

                  <div className="text-[11px] font-sans text-stone-400 pl-6 space-y-0.5">
                    <div>
                      <span className="font-semibold text-stone-300">Desert Biome: </span>
                      <span className="text-amber-200/90">{artifact.biome}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-300">Field Search Hint: </span>
                      <span className="italic text-stone-400">{artifact.hint}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="p-3 bg-stone-900/90 rounded-xl border border-amber-800/40 font-mono text-center">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-amber-200">Seal Decipherment Progress:</span>
              <span className="font-bold text-amber-400">
                {Math.round((collectedCount / totalCount) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden border border-stone-700">
              <div
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${(collectedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">
              {totalCount - collectedCount} more physical stone fragment(s) required to break the mine seal.
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2 shrink-0">
          {onOpenMap && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMap();
              }}
              className="px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-stone-950 font-serif font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Compass className="w-4 h-4 text-stone-950" />
              <span>Track Biomes on Peralta Stone Map</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-200 font-sans font-bold text-xs sm:text-sm rounded-xl border border-stone-600 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Return to Wilderness [Close]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
