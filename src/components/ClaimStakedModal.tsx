import React from 'react';
import { Flag, Hammer, Compass, X } from 'lucide-react';
import { Vector3D } from '../types';

interface ClaimStakedModalProps {
  isOpen: boolean;
  claimName: string;
  position: Vector3D;
  onClose: () => void;
  onOpenBuilder: () => void;
}

export const ClaimStakedModal: React.FC<ClaimStakedModalProps> = ({
  isOpen,
  claimName,
  position,
  onClose,
  onOpenBuilder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md select-none animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-900/95 border-2 border-amber-600/80 rounded-2xl p-6 shadow-2xl text-stone-100 font-serif">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Flag className="w-7 h-7" />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-amber-400 font-mono font-bold">
            Territorial Mining Act of 1872
          </span>
          <h2 className="text-2xl font-bold text-amber-200 mt-1">
            Mining Claim Staked!
          </h2>
        </div>

        {/* Claim Details Card */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-4 mb-5 text-xs font-mono space-y-1.5">
          <div className="flex justify-between items-center text-stone-300">
            <span className="text-stone-400">Claim Title:</span>
            <span className="font-bold text-amber-300 text-sm font-serif">{claimName}</span>
          </div>
          <div className="flex justify-between items-center text-stone-300">
            <span className="text-stone-400">Survey Perimeter:</span>
            <span className="text-stone-200">40 Acres (Survey Cord Active)</span>
          </div>
          <div className="flex justify-between items-center text-stone-300">
            <span className="text-stone-400">Survey Location:</span>
            <span className="text-amber-400/90 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              X: {Math.round(position.x)}, Z: {Math.round(position.z)}
            </span>
          </div>
        </div>

        {/* Question text */}
        <p className="text-sm font-sans text-stone-300 text-center mb-6 leading-relaxed">
          You hold exclusive mineral and excavation rights for this territory.
          Would you like to open the <strong className="text-amber-300">Mine Builder</strong> to lay down your mine portal, timber shoring, and headframe?
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenBuilder();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold font-mono text-xs rounded-xl shadow-lg border border-amber-300 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Hammer className="w-4 h-4 fill-stone-950" />
            <span>Open Mine Builder</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-mono text-xs rounded-xl border border-stone-700 transition cursor-pointer"
          >
            Explore First
          </button>
        </div>

        <p className="text-[11px] font-sans text-stone-400 text-center mt-4">
          💡 You can always open the Mine Builder later with <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-[10px] border border-stone-700">[B]</kbd> now that you hold a valid claim.
        </p>
      </div>
    </div>
  );
};
