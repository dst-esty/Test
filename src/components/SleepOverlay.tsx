import React, { useEffect, useState, useRef } from 'react';
import { Bed, Flame, Moon, Sun, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEffects';

export interface SleepOverlayProps {
  isOpen: boolean;
  sleepType: 'hotel' | 'camp';
  initialTimeOfDay: number;
  onApplySleepEffects: () => void;
  onFinished: () => void;
  roomNumber?: number;
}

type SleepPhase = 'closing' | 'deep' | 'opening';

export const SleepOverlay: React.FC<SleepOverlayProps> = ({
  isOpen,
  sleepType,
  initialTimeOfDay,
  onApplySleepEffects,
  onFinished,
  roomNumber = 4,
}) => {
  const [phase, setPhase] = useState<SleepPhase>('closing');
  const [displayTime, setDisplayTime] = useState<string>('');
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const effectsAppliedRef = useRef<boolean>(false);
  const audioPlayedRef = useRef<boolean>(false);

  // Format initial time
  useEffect(() => {
    if (!isOpen) {
      setPhase('closing');
      setCanSkip(false);
      effectsAppliedRef.current = false;
      audioPlayedRef.current = false;
      return;
    }

    // Format time display
    const hours = Math.floor(initialTimeOfDay);
    const minutes = Math.floor((initialTimeOfDay - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    setDisplayTime(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);

    // Play lock or fire sound at start of slumber
    if (!audioPlayedRef.current) {
      audioPlayedRef.current = true;
      if (sleepType === 'hotel') {
        soundEngine.playHotelKeyLock();
      } else {
        soundEngine.playCampfire();
      }
    }

    // Phase 1 -> Phase 2: Enter deep sleep after eyelids close (1.1s)
    const deepTimer = setTimeout(() => {
      setPhase('deep');

      // Apply the actual state changes (time = 6.0, restore vitals, etc.) while screen is 100% blacked out!
      if (!effectsAppliedRef.current) {
        effectsAppliedRef.current = true;
        onApplySleepEffects();
      }

      // Allow clicking or pressing space to wake up after a moment
      const skipTimer = setTimeout(() => {
        setCanSkip(true);
      }, 800);

      // Auto awaken after 3.2 seconds
      const wakeTimer = setTimeout(() => {
        handleAwaken();
      }, 3200);

      return () => {
        clearTimeout(skipTimer);
        clearTimeout(wakeTimer);
      };
    }, 1100);

    return () => {
      clearTimeout(deepTimer);
    };
  }, [isOpen, initialTimeOfDay, sleepType, onApplySleepEffects]);

  const handleAwaken = () => {
    if (phase === 'opening') return;
    setPhase('opening');
    soundEngine.playMorningDawn();

    // After eyelids fully part open (1.2s), finish sleep sequence
    setTimeout(() => {
      onFinished();
    }, 1200);
  };

  // Keyboard shortcut to wake up early
  useEffect(() => {
    if (!isOpen || !canSkip || phase === 'opening') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleAwaken();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canSkip, phase]);

  if (!isOpen) return null;

  const isHotel = sleepType === 'hotel';

  return (
    <div
      id="sleep-blackout-overlay"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none overflow-hidden"
      onClick={() => {
        if (canSkip && phase !== 'opening') {
          handleAwaken();
        }
      }}
    >
      {/* TOP EYELID CURTAIN */}
      <div
        className={`absolute inset-x-0 top-0 bg-[#090604] transition-all duration-1000 ease-in-out z-20 ${
          phase === 'closing' || phase === 'deep'
            ? 'h-1/2 translate-y-0 shadow-[0_20px_50px_rgba(0,0,0,0.95)]'
            : 'h-1/2 -translate-y-full'
        }`}
      >
        {/* Soft rounded eyelash blur gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent opacity-90 pointer-events-none" />
      </div>

      {/* BOTTOM EYELID CURTAIN */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-[#090604] transition-all duration-1000 ease-in-out z-20 ${
          phase === 'closing' || phase === 'deep'
            ? 'h-1/2 translate-y-0 shadow-[0_-20px_50px_rgba(0,0,0,0.95)]'
            : 'h-1/2 translate-y-full'
        }`}
      >
        {/* Soft rounded eyelash blur gradient */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent opacity-90 pointer-events-none" />
      </div>

      {/* AMBIENT SUNRISE REVEAL WASH (Flashes warm golden dawn light as eyes open) */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-amber-500/25 via-amber-200/10 to-transparent pointer-events-none transition-opacity duration-1000 z-10 ${
          phase === 'opening' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* DEEP SLEEP CINEMATIC CONTENT (Visible when screen is dark) */}
      <div
        className={`relative z-30 flex flex-col items-center justify-center max-w-lg px-6 text-center transition-all duration-700 ${
          phase === 'deep'
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Warm Golden Lamp / Candle Embers */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/30 to-amber-950/80 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.35)]">
            {isHotel ? (
              <Bed className="w-8 h-8 text-amber-300 animate-pulse" />
            ) : (
              <Flame className="w-8 h-8 text-amber-400 animate-pulse" />
            )}
          </div>
          <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        {/* Location Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900/90 border border-amber-600/40 text-amber-300 text-xs font-mono mb-2 shadow-inner">
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {isHotel ? `Superstition Hotel • Room No. ${roomNumber}` : 'Frontier Campfire • Peralta Canyon'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100 tracking-wide mb-2 drop-shadow-md">
          {isHotel ? 'Asleep in the Feather Bed' : 'Sleeping by the Warm Embers'}
        </h2>

        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-serif max-w-md mb-6 drop-shadow">
          {isHotel
            ? 'Tucked beneath thick wool blankets with the brass bolt secured. The howling desert winds and mountain perils pass harmlessly outside your pine room window.'
            : 'Wrapped tightly in your canvas bedroll with the cedar campfire crackling quietly. The desert frost is kept safely at bay.'}
        </p>

        {/* TIME ADVANCEMENT PROGRESS CARD */}
        <div className="w-full bg-stone-900/90 border border-amber-700/50 rounded-2xl p-4 shadow-2xl space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1.5 text-stone-400">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Retires: <strong className="text-stone-200">{displayTime}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
              Dawn: 6:00 AM Sunrise
            </span>
          </div>

          {/* Animated Night to Morning Progression Bar */}
          <div className="relative h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-amber-700 to-amber-400 animate-pulse" />
          </div>

          {/* Vitals Replenishment Indicators */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-1.5 bg-stone-950/80 rounded-lg border border-emerald-900/40 flex items-center justify-center gap-1 text-[11px] font-mono text-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>100% Health</span>
            </div>
            <div className="p-1.5 bg-stone-950/80 rounded-lg border border-cyan-900/40 flex items-center justify-center gap-1 text-[11px] font-mono text-cyan-300">
              <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>100% Hydrated</span>
            </div>
            <div className="p-1.5 bg-stone-950/80 rounded-lg border border-amber-900/40 flex items-center justify-center gap-1 text-[11px] font-mono text-amber-300">
              <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Full Vigour</span>
            </div>
          </div>
        </div>

        {/* Awaken Prompt */}
        <div className="h-6">
          {canSkip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAwaken();
              }}
              className="text-xs font-mono text-amber-300/90 hover:text-amber-100 flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/90 border border-amber-600/50 hover:bg-stone-800 transition cursor-pointer shadow animate-bounce"
            >
              <span>Wake Up at Dawn [Space / Click]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
