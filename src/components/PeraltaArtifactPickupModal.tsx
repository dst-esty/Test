import React, { useEffect } from 'react';
import { X, Sparkles, CheckCircle2, MapPin, Compass, ArrowRight, ShieldCheck, Scroll, Mountain } from 'lucide-react';
import { PeraltaStoneArtifact, peraltaStoneMapService } from '../services/peraltaStoneMapService';
import { soundEngine } from '../audio/soundEffects';

interface PeraltaArtifactPickupModalProps {
  artifact: PeraltaStoneArtifact | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMap?: () => void;
}

export const PeraltaArtifactPickupModal: React.FC<PeraltaArtifactPickupModalProps> = ({
  artifact,
  isOpen,
  onClose,
  onOpenMap,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundEngine.playDiscovery();
      soundEngine.playCoins();
    }
  }, [isOpen]);

  if (!isOpen || !artifact) return null;

  const collectedCount = peraltaStoneMapService.getCollectedCount();
  const totalCount = peraltaStoneMapService.getTotalArtifactCount();
  const isAllCollected = peraltaStoneMapService.hasAllFragments();
  const missingArtifacts = peraltaStoneMapService.getMissingArtifacts();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-stone-900 via-[#26170d] to-stone-950 text-amber-100 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border-4 border-amber-600/80 p-6 sm:p-8 font-serif text-center overflow-hidden max-h-[92vh] flex flex-col">
        {/* Amber glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Top Tag & Close */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-800/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
              Physical Artifact Unearthed • Peralta Stone Map
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

        {/* Stone Icon & Name */}
        <div className="my-2 shrink-0">
          <div className="mx-auto w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-700/40 to-stone-800 border-2 border-amber-400/80 flex items-center justify-center mb-2 shadow-[0_0_25px_rgba(251,191,36,0.35)]">
            <Scroll className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-amber-200 leading-tight">
            {artifact.name}
          </h2>
          <p className="text-xs text-amber-400/90 font-mono italic mt-0.5">
            {artifact.spanishName}
          </p>
        </div>

        {/* Scrollable Details */}
        <div className="space-y-3 overflow-y-auto pr-1 text-sm text-stone-300 custom-scrollbar my-2 text-left">
          {/* Biome Tag */}
          <div className="flex items-center justify-between p-2.5 bg-stone-900/90 rounded-xl border border-amber-800/40 text-xs">
            <div>
              <span className="text-[10px] text-amber-400/80 uppercase font-mono block">Desert Biome</span>
              <span className="font-bold text-amber-100">{artifact.biome}</span>
            </div>
            <span className="font-mono text-[11px] text-stone-400 bg-stone-800/80 px-2 py-1 rounded border border-stone-700">
              {artifact.locationName}
            </span>
          </div>

          {/* Spanish Inscription Panel */}
          <div className="p-3.5 bg-[#321c10]/90 rounded-xl border-l-4 border-amber-500 shadow-inner">
            <span className="text-[10px] text-amber-400 uppercase font-mono tracking-wider block mb-1">
              Chiseled Spanish Inscription (1847)
            </span>
            <p className="font-serif italic text-amber-200 text-xs sm:text-sm font-semibold mb-1">
              &ldquo;{artifact.spanishInscription}&rdquo;
            </p>
            <p className="text-xs text-stone-300 font-sans">
              &ldquo;{artifact.englishTranslation}&rdquo;
            </p>
          </div>

          {/* Glyphs & Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800">
              <span className="text-[10px] text-amber-400/80 uppercase block mb-1">Carved Glyphs</span>
              <ul className="space-y-0.5 text-[11px] text-stone-300">
                {artifact.carvedGlyphs.map((glyph, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-amber-400 text-[10px]">❖</span> {glyph}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-amber-400/80 uppercase block mb-0.5">Physical Specimen</span>
                <span className="text-[11px] text-stone-300 font-sans">{artifact.dimensions}</span>
              </div>
              <div className="pt-2 border-t border-stone-800 mt-2">
                <span className="text-[10px] text-emerald-400 uppercase block mb-0.5">Unearthing Bounty</span>
                <span className="text-emerald-300 font-bold text-xs">
                  +{artifact.unearthingReward.goldOz} oz Gold • +${artifact.unearthingReward.cash}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Lore */}
          <p className="text-xs text-stone-400 leading-relaxed font-sans italic bg-stone-900/40 p-2.5 rounded-lg border border-stone-800">
            {artifact.historicalLore}
          </p>

          {/* Progression Status Bar */}
          <div className="p-3 bg-stone-900/90 rounded-xl border border-amber-500/40 text-center font-mono">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-amber-200">Peralta Stone Map Assembly:</span>
              <span className="font-bold text-amber-400">
                {collectedCount} / {totalCount} Fragments
              </span>
            </div>
            <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden border border-stone-700">
              <div
                className="bg-gradient-to-r from-amber-600 via-amber-400 to-emerald-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${(collectedCount / totalCount) * 100}%` }}
              />
            </div>

            {isAllCollected ? (
              <div className="mt-2 text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All 3 Stone Fragments Assembled! The Lost Dutchman Mine entrance is UNLOCKED!</span>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-stone-400 font-sans text-left">
                <span className="text-amber-300 font-semibold">Remaining Fragment to Unseal Mine: </span>
                {missingArtifacts.map((m) => `${m.name} (${m.biomeShort})`).join(', ')}
              </div>
            )}
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
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-200 font-serif font-bold text-xs sm:text-sm rounded-xl border border-amber-600/50 transition flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Inspect Stone Map</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-sans text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Pocket Artifact &amp; Continue Expedition [Enter]</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
