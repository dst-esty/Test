import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bed, Flame, Moon, Sun, Clock, CheckCircle2, Sparkles, Droplets, Heart, Shield, Key } from 'lucide-react';
import { soundEngine } from '../audio/soundEffects';

export interface SleepScreenOverlayProps {
  isOpen: boolean;
  sleepType: 'hotel' | 'camp';
  initialTimeOfDay: number;
  seasonName?: string;
  roomNumber?: number;
  paymentLabel?: string;
  onSleepMidpoint: () => void; // Triggered when fully black: applies in-game time, vitals, position
  onComplete: () => void;      // Triggered when dawn fade-out finishes
}

type SleepPhase = 'fade_to_black' | 'sleeping' | 'wake_up';

export const SleepScreenOverlay: React.FC<SleepScreenOverlayProps> = ({
  isOpen,
  sleepType,
  initialTimeOfDay,
  seasonName = 'Sonoran Autumn',
  roomNumber = 4,
  paymentLabel,
  onSleepMidpoint,
  onComplete,
}) => {
  const [phase, setPhase] = useState<SleepPhase>('fade_to_black');
  const [simulatedTime, setSimulatedTime] = useState(initialTimeOfDay);
  const [progress, setProgress] = useState(0); // 0 to 100
  const midpointTriggeredRef = useRef(false);
  const animTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Format decimal hour to 12-hour format e.g. "10:30 PM"
  const formatClock = (time: number) => {
    let normalized = ((time % 24) + 24) % 24;
    const hours24 = Math.floor(normalized);
    const minutes = Math.floor((normalized - hours24) * 60);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const padMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours12}:${padMin} ${period}`;
  };

  const handleWakeEarly = useCallback(() => {
    if (!midpointTriggeredRef.current) {
      midpointTriggeredRef.current = true;
      onSleepMidpoint();
    }
    setSimulatedTime(6.0);
    setProgress(100);
    soundEngine.playMorningDawn();
    setPhase('wake_up');
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = window.setTimeout(() => {
      onComplete();
    }, 900);
  }, [onSleepMidpoint, onComplete]);

  // Main sleep timeline lifecycle
  useEffect(() => {
    if (!isOpen) {
      setPhase('fade_to_black');
      setSimulatedTime(initialTimeOfDay);
      setProgress(0);
      midpointTriggeredRef.current = false;
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setPhase('fade_to_black');
    setSimulatedTime(initialTimeOfDay);
    setProgress(0);
    midpointTriggeredRef.current = false;

    // 1. Play initial bedtime sound
    if (sleepType === 'hotel') {
      soundEngine.playHotelRest();
    } else {
      soundEngine.playCampfire();
    }

    // 2. Transition into 'sleeping' after initial fade (700ms)
    const t1 = window.setTimeout(() => {
      setPhase('sleeping');

      // Calculate hour delta to 6:00 AM Dawn
      let startH = initialTimeOfDay;
      let targetH = 6.0;
      let totalHoursToAdvance = targetH >= startH ? targetH - startH : (24.0 - startH) + targetH;
      if (totalHoursToAdvance < 0.5) totalHoursToAdvance = 8.0;

      const durationMs = 2600;
      const startTime = performance.now();

      intervalRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1.0, elapsed / durationMs);
        const currentProg = Math.round(p * 100);
        setProgress(currentProg);

        // Smooth time interpolation
        const currentH = (startH + totalHoursToAdvance * p) % 24;
        setSimulatedTime(currentH);

        // Halfway point: Apply the in-game state changes (vitally safe while hidden behind dark black)
        if (p >= 0.5 && !midpointTriggeredRef.current) {
          midpointTriggeredRef.current = true;
          onSleepMidpoint();
        }

        if (p >= 1.0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setSimulatedTime(6.0);
          setProgress(100);

          // 3. Dawn reaches! Play morning rooster, bird chimes, and begin fade out
          soundEngine.playMorningDawn();
          setPhase('wake_up');

          animTimerRef.current = window.setTimeout(() => {
            onComplete();
          }, 1100);
        }
      }, 30);
    }, 700);

    return () => {
      clearTimeout(t1);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, sleepType, initialTimeOfDay, onSleepMidpoint, onComplete]);

  // Keyboard shortcut: Space or Enter to wake up early
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleWakeEarly();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleWakeEarly]);

  if (!isOpen) return null;

  const isFadeOut = phase === 'wake_up';
  const isDeepSleep = phase === 'sleeping' || phase === 'wake_up';

  // Contextual flavor text based on night progress
  const getFlavorText = () => {
    if (sleepType === 'hotel') {
      if (progress < 25) return 'Sinking deep into the warm cedar feather tick in Room 4...';
      if (progress < 50) return 'The mountain night breeze rattles the double-glazed panes peacefully...';
      if (progress < 75) return 'Pure artesian spring water in the porcelain pitcher cools the air...';
      if (progress < 95) return 'Gentle pre-dawn glow illuminates the Superstition crags outside...';
      return '🌅 Morning bells & roosters echo across Tortilla Flat — 6:00 AM Dawn!';
    } else {
      if (progress < 25) return 'Wrapping securely in canvas bedroll by the stoked mesquite fire...';
      if (progress < 50) return 'Red embers crackle softly as night chill sweeps Peralta Canyon...';
      if (progress < 75) return 'Coyotes howl in the distant saguaro flats as starlight shifts...';
      if (progress < 95) return 'The eastern horizon turns amber behind Weaver\'s Needle...';
      return '🌅 Dawn breaks over the Superstitions — morning campfire embers warm the air!';
    }
  };

  return (
    <div
      id="sleep-screen-overlay"
      onClick={handleWakeEarly}
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-1000 ease-in-out ${
        isFadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#0a0705',
        backgroundImage: 'radial-gradient(ellipse at center, rgba(30, 20, 12, 0.92) 0%, rgba(10, 6, 4, 1.0) 100%)',
      }}
    >
      {/* Subtle vignette border */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.95)] pointer-events-none" />

      {/* Sleeping Content Container */}
      <div
        className={`max-w-xl w-full px-6 py-8 text-center transition-all duration-700 transform ${
          isDeepSleep ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Western Filigree Banner */}
        <div className="flex items-center justify-center gap-3 text-amber-500/60 mb-3">
          <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-500/60" />
          <span className="font-serif text-xs tracking-[0.25em] uppercase text-amber-400 font-bold">
            {sleepType === 'hotel' ? 'Territorial Hospitality • Est. 1880' : 'Frontier Bivouac • Superstition Wilderness'}
          </span>
          <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500/60" />
        </div>

        {/* Icon & Title */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(217,119,6,0.3)]">
            {sleepType === 'hotel' ? (
              <Bed className="w-6 h-6 animate-pulse" />
            ) : (
              <Flame className="w-6 h-6 animate-pulse text-orange-400" />
            )}
          </div>
          <div className="text-left">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100 tracking-wide drop-shadow-md">
              {sleepType === 'hotel' ? `Superstition Hotel • Room No. ${roomNumber}` : 'Sleeping by the Campfire'}
            </h2>
            <p className="text-xs font-mono text-amber-400/80">
              {sleepType === 'hotel'
                ? 'Upstairs Boarding House • Tortilla Flat'
                : 'Peralta Canyon Bivouac • Arizona Territory'}
            </p>
          </div>
        </div>

        {/* Payment / Barter Notice if applicable */}
        {paymentLabel && (
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-stone-900/90 border border-amber-800/50 text-[11px] font-mono text-amber-300 mb-4">
            <Key className="w-3 h-3 text-amber-400" />
            <span>{paymentLabel}</span>
          </div>
        )}

        {/* Antique Timepiece Display */}
        <div className="my-5 p-5 rounded-2xl bg-stone-950/90 border border-amber-700/40 shadow-inner relative overflow-hidden max-w-md mx-auto">
          {/* Subtle Warm Hearth Radiance */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-600/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '14s' }} />
              <span className="text-xs font-mono uppercase tracking-wider text-stone-400">Time Passing</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-amber-300">
              {progress >= 95 ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-amber-200">6:00 AM Sunrise</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Starlit Night</span>
                </>
              )}
            </div>
          </div>

          {/* Large Clock Display */}
          <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-200 tracking-wider my-1 drop-shadow">
            {formatClock(simulatedTime)}
          </div>

          {/* Time Progress Bar */}
          <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden mt-3 p-[1px] border border-stone-800">
            <div
              className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>

          {/* Atmospheric Night Flavor Text */}
          <p className="text-xs text-amber-200/90 font-serif italic mt-3 min-h-[1.75rem] transition-all duration-300">
            &ldquo;{getFlavorText()}&rdquo;
          </p>
        </div>

        {/* Restored Vitals Checklist Grid */}
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-left mb-6 font-mono text-[11px]">
          <div
            className={`p-2.5 rounded-xl border transition-all duration-500 flex items-center gap-2 ${
              progress >= 30
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-stone-950/40 border-stone-800 text-stone-500'
            }`}
          >
            <Heart className={`w-4 h-4 shrink-0 ${progress >= 30 ? 'text-emerald-400' : 'text-stone-600'}`} />
            <div>
              <div className="font-bold text-xs">Vital Health</div>
              <div className="text-[10px] text-stone-400">100% Full Vigor</div>
            </div>
            {progress >= 30 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />}
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all duration-500 flex items-center gap-2 ${
              progress >= 50
                ? 'bg-sky-950/40 border-sky-500/50 text-sky-200'
                : 'bg-stone-950/40 border-stone-800 text-stone-500'
            }`}
          >
            <Droplets className={`w-4 h-4 shrink-0 ${progress >= 50 ? 'text-sky-400' : 'text-stone-600'}`} />
            <div>
              <div className="font-bold text-xs">Artesian Water</div>
              <div className="text-[10px] text-stone-400">32 oz Canteen Filled</div>
            </div>
            {progress >= 50 && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 ml-auto shrink-0" />}
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all duration-500 flex items-center gap-2 ${
              progress >= 70
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-stone-950/40 border-stone-800 text-stone-500'
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${progress >= 70 ? 'text-amber-400' : 'text-stone-600'}`} />
            <div>
              <div className="font-bold text-xs">Vigour & Stamina</div>
              <div className="text-[10px] text-stone-400">Exhaustion Cleared</div>
            </div>
            {progress >= 70 && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" />}
          </div>

          <div
            className={`p-2.5 rounded-xl border transition-all duration-500 flex items-center gap-2 ${
              progress >= 85
                ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                : 'bg-stone-950/40 border-stone-800 text-stone-500'
            }`}
          >
            <Shield className={`w-4 h-4 shrink-0 ${progress >= 85 ? 'text-indigo-400' : 'text-stone-600'}`} />
            <div>
              <div className="font-bold text-xs">Notoriety Cooloff</div>
              <div className="text-[10px] text-stone-400">Town Heat Reduced</div>
            </div>
            {progress >= 85 && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 ml-auto shrink-0" />}
          </div>
        </div>

        {/* Skip / Wake Up Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleWakeEarly();
          }}
          className="px-5 py-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-amber-600/40 hover:border-amber-400 text-amber-300 hover:text-amber-100 font-mono text-xs transition-all active:scale-95 shadow-md cursor-pointer inline-flex items-center gap-2"
        >
          <Sun className="w-4 h-4 text-amber-400" />
          <span>Wake Up at Dawn [Space]</span>
        </button>

        <p className="text-[10px] text-stone-500 mt-2 font-mono">
          Click anywhere or press Space to rise and shine
        </p>
      </div>
    </div>
  );
};
