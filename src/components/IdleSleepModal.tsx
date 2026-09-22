import React, { useEffect } from 'react';
import { Moon, Sparkles, Compass } from 'lucide-react';
import { idleManager } from '../services/idleManager';

interface IdleSleepModalProps {
  isOpen: boolean;
  onWakeUp: () => void;
}

export const IdleSleepModal: React.FC<IdleSleepModalProps> = ({ isOpen, onWakeUp }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Wake up on any key press
      onWakeUp();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onWakeUp]);

  if (!isOpen) return null;

  return (
    <div
      id="idle-sleep-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md animate-fade-in p-4 select-none cursor-pointer"
      onClick={onWakeUp}
    >
      <div
        className="max-w-md w-full bg-stone-900 border-2 border-amber-600/60 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-600/20 to-stone-800 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
          <Moon className="w-8 h-8 animate-pulse text-amber-300" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-600/40 text-amber-400 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Desert Siesta • Frontier Standby</span>
        </div>

        <h2 className="text-2xl font-serif font-bold text-amber-100 mb-2">
          Resting in the Mesquite Shade
        </h2>

        <p className="text-sm text-stone-300 mb-6 leading-relaxed">
          You stepped away from the trail for a spell. Your prospector hunkered down safely in the shade, and your network telemetry paused to preserve frontier bandwidth.
        </p>

        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5 mb-6 text-xs text-stone-400 font-mono flex items-center justify-center gap-2">
          <Compass className="w-4 h-4 text-amber-500 shrink-0 animate-spin" />
          <span>Your boots, gold dust, and claim deeds are safe and secure.</span>
        </div>

        <button
          id="wake-up-button"
          onClick={onWakeUp}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold tracking-wide shadow-lg border border-amber-400/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 text-base"
        >
          <Sparkles className="w-5 h-5 text-amber-950" />
          <span>Wake Up & Rejoin Expedition</span>
        </button>

        <p className="text-[11px] text-stone-500 mt-3 font-mono">
          Press any key or click anywhere to saddle back up
        </p>
      </div>
    </div>
  );
};
