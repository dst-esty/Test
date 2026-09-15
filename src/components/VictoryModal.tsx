import React from 'react';
import { Award, Sparkles, CheckCircle, Flame, ArrowRight, Pickaxe } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  goldFound: number;
  cluesCount: number;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  goldFound,
  cluesCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-stone-900 via-[#26170d] to-stone-950 text-amber-100 rounded-2xl shadow-2xl border-4 border-amber-600/80 p-8 font-serif text-center overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Icon & Trophy */}
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(251,191,36,0.4)]">
          <Award className="w-10 h-10 text-amber-300 animate-bounce" />
        </div>

        <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1">
          Legend Conquered
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-amber-200 mb-3 tracking-wide">
          The Lost Dutchman Found!
        </h2>

        <p className="text-stone-300 text-sm leading-relaxed mb-6 font-sans">
          You penetrated the shadowed box canyon beyond the needle and broke through Jacob Waltz&apos;s sealed timber portal. Before you gleams the fabled quartz vein ribboned with raw native gold, untouched since the late 19th century!
        </p>

        {/* Expedition Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6 font-mono text-left bg-stone-900/80 p-4 rounded-xl border border-amber-800/50">
          <div>
            <span className="text-[10px] text-amber-400/80 uppercase block">Total Gold Ore</span>
            <span className="text-2xl font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              {goldFound + 120} oz
            </span>
          </div>
          <div>
            <span className="text-[10px] text-amber-400/80 uppercase block">Clues Deciphered</span>
            <span className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-5 h-5" />
              {cluesCount} / 7
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-sans text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            Explore the Mine Interior <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
