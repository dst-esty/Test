import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, SkipForward, Compass, Sparkles, Shield, Skull, MapPin } from 'lucide-react';
import { soundEngine } from '../audio/soundEffects';

interface CinematicSplashProps {
  onEnterGame: () => void;
}

export const CinematicSplash: React.FC<CinematicSplashProps> = ({ onEnterGame }) => {
  const [phase, setPhase] = useState<'studio' | 'title' | 'menu'>('studio');
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Play deep cinematic orchestral brass / brass chord & wind upon user interaction or start
  const playCinematicSting = useCallback(() => {
    try {
      soundEngine.startAmbiance();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Deep sub boom + resonant brass-like swell
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now); // A1
      subOsc.frequency.exponentialRampToValueAtTime(32.7, now + 2.5); // C1
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.35, now + 0.3);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 4.0);

      // Warm desert acoustic harmonic swell (Western 5th chord)
      [110, 164.8, 220, 329.6].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280 + idx * 80, now);
        filter.frequency.exponentialRampToValueAtTime(900 + idx * 120, now + 1.2);
        filter.frequency.exponentialRampToValueAtTime(180, now + 3.5);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.045 / (idx + 1), now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 3.8);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Autonomous phase timeline progression
  useEffect(() => {
    // 0s -> Studio / Frontier Heritage presentation
    const timer1 = setTimeout(() => {
      setPhase('title');
      playCinematicSting();
    }, 2800);

    // After title reveals, settle into the interactive title menu
    const timer2 = setTimeout(() => {
      setPhase('menu');
    }, 6200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [playCinematicSting]);

  // Atmospheric Canvas: Desert Starfield, Drifting Ember Spores & Mountain Silhouette
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Procedural Stars & Embers
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.75,
      size: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.008,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    const embers = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: height * 0.65 + Math.random() * (height * 0.35),
      vx: (Math.random() - 0.5) * 0.8 + 0.4,
      vy: -(Math.random() * 1.2 + 0.5),
      size: Math.random() * 2.5 + 1.2,
      alpha: Math.random() * 0.8 + 0.2,
      life: Math.random(),
    }));

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Deep Arizona Desert Twilight Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#060309'); // High void night
      bgGrad.addColorStop(0.35, '#130a10'); // Deep dusty plum
      bgGrad.addColorStop(0.65, '#2b1008'); // Distant canyon ember glow
      bgGrad.addColorStop(0.9, '#3d1607'); // Horizon volcanic furnace
      bgGrad.addColorStop(1, '#170802'); // Ground silhouette
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Twinkling Desert Stars
      stars.forEach((star) => {
        const flicker = Math.sin(time * 2 + star.pulseOffset) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(254, 243, 199, ${star.alpha * flicker})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distant Superstition Mountain Ridge Silhouette (Weaver's Needle)
      ctx.fillStyle = '#0a0402';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height * 0.74);
      ctx.quadraticCurveTo(width * 0.15, height * 0.68, width * 0.3, height * 0.73);
      ctx.lineTo(width * 0.42, height * 0.64);
      // Weaver's Needle iconic spire
      ctx.lineTo(width * 0.485, height * 0.46);
      ctx.lineTo(width * 0.515, height * 0.47);
      ctx.lineTo(width * 0.58, height * 0.67);
      ctx.quadraticCurveTo(width * 0.75, height * 0.62, width * 0.88, height * 0.71);
      ctx.lineTo(width, height * 0.69);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Atmospheric Canyon Dust Fog
      const mistGrad = ctx.createLinearGradient(0, height * 0.6, 0, height * 0.88);
      mistGrad.addColorStop(0, 'rgba(217, 119, 6, 0)');
      mistGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.12)');
      mistGrad.addColorStop(1, 'rgba(15, 6, 3, 0.65)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, height * 0.58, width, height * 0.42);

      // Floating campfire gold embers
      embers.forEach((ember) => {
        ember.x += ember.vx + Math.sin(time * 2 + ember.life * 10) * 0.4;
        ember.y += ember.vy;
        ember.life -= 0.005;

        if (ember.life <= 0 || ember.y < height * 0.25) {
          ember.x = Math.random() * width;
          ember.y = height * 0.88 + Math.random() * (height * 0.12);
          ember.life = 1;
        }

        const emberAlpha = ember.alpha * Math.sin(ember.life * Math.PI);
        ctx.fillStyle = `rgba(245, 158, 11, ${emberAlpha})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Quick Skip or Direct Enter
  const handleStartGame = useCallback(() => {
    soundEngine.startAmbiance();
    soundEngine.playGogglesClick(true);
    onEnterGame();
  }, [onEnterGame]);

  const handleSkipToMenu = useCallback(() => {
    setPhase('menu');
    setHasInteracted(true);
    playCinematicSting();
  }, [playCinematicSting]);

  // Key shortcuts: Space or Enter to proceed, Esc to skip straight to game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (phase !== 'menu') {
          handleSkipToMenu();
        } else {
          handleStartGame();
        }
      } else if (e.code === 'Escape') {
        handleStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleSkipToMenu, handleStartGame]);

  return (
    <div
      id="cinematic-splash-root"
      className="fixed inset-0 z-[100] select-none overflow-hidden bg-black text-stone-100 flex flex-col justify-between p-6 sm:p-12 font-serif"
    >
      {/* Background Canvas (Desert Ridge + Embers + Starfield) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Film Vignette & Scanline Texture */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]" />

      {/* Top Header / Cinematic Status Bar */}
      <div className="relative z-20 flex items-center justify-between w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 backdrop-blur-sm">
            <Compass className="w-4 h-4 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-mono tracking-[0.3em] uppercase text-amber-500/90 font-bold block">
              1880s Historic Frontier Simulation
            </span>
            <span className="text-xs sm:text-sm text-stone-400 font-sans">
              Arizona Territory • Salt River Canyon
            </span>
          </div>
        </div>

        {/* Skip controls */}
        <div className="flex items-center gap-3 font-sans">
          {phase !== 'menu' && (
            <button
              id="splash-skip-btn"
              onClick={handleSkipToMenu}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-stone-900/80 hover:bg-amber-950/60 text-stone-300 hover:text-amber-300 border border-stone-700/70 hover:border-amber-600/60 text-xs font-mono tracking-wider uppercase backdrop-blur-md transition-all cursor-pointer"
            >
              <span>Skip</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Center Stage: Transitions between Studio Card, Title Reveal, and Menu */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-auto w-full px-4">
        {/* Phase 1: Studio / Production Card */}
        {phase === 'studio' && (
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-1000">
            <span className="text-xs sm:text-sm font-mono tracking-[0.4em] uppercase text-amber-400/80 font-semibold mb-3">
              A Frontier Exploration Epic
            </span>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mb-6" />
            <h2 className="text-xl sm:text-2xl font-serif tracking-[0.25em] uppercase text-stone-300 font-light">
              SUPERSTITION MOUNTAINS
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-stone-400 font-sans tracking-wide max-w-md">
              Crafted with authentic geological surveys, historic 1880s territory archives, and open-world survival realism.
            </p>
          </div>
        )}

        {/* Phase 2: Main Cinematic Title Reveal */}
        {phase === 'title' && (
          <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-[11px] font-mono tracking-[0.3em] uppercase text-amber-300 mb-5 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              The Legend of Jacob Waltz
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#fff2d6] via-[#f7cf8a] to-[#c2782e] drop-shadow-[0_4px_30px_rgba(245,158,11,0.35)] font-serif mb-4">
              THE LOST DUTCHMAN
            </h1>
            <div className="flex items-center gap-4 w-full max-w-md my-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-600/70" />
              <span className="text-xs sm:text-sm font-mono tracking-[0.4em] uppercase text-amber-500 font-bold">
                GOLD EXPEDITION
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-600/70" />
            </div>
            <p className="text-stone-300/80 text-sm sm:text-base max-w-xl mt-4 font-sans leading-relaxed">
              &ldquo;Where the midday shadow of Weaver&apos;s Needle touches the canyon wall, lies gold richer than the Spanish kings ever dreamed.&rdquo;
            </p>
          </div>
        )}

        {/* Phase 3: Interactive Main Menu Screen */}
        {phase === 'menu' && (
          <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 w-full max-w-2xl">
            {/* Title Lockup */}
            <div className="mb-8">
              <span className="text-xs sm:text-sm font-mono tracking-[0.35em] uppercase text-amber-400 font-bold block mb-1">
                Arizona Frontier 1884
              </span>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-600 font-serif drop-shadow-[0_2px_20px_rgba(217,119,6,0.4)]">
                THE LOST DUTCHMAN
              </h1>
              <span className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-stone-400 block mt-1">
                Gold Mining • Wilderness Survival • Territory multiplayer
              </span>
            </div>

            {/* Primary Action Button (Big Game Style) */}
            <div className="w-full max-w-md space-y-3 mb-8">
              <button
                id="btn-splash-begin-expedition"
                onClick={handleStartGame}
                className="group relative w-full py-4 px-8 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-base sm:text-lg tracking-wider uppercase shadow-[0_10px_35px_rgba(245,158,11,0.5)] border-2 border-amber-300 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <Play className="w-5 h-5 fill-stone-950 text-stone-950 transition-transform group-hover:translate-x-0.5" />
                <span>Begin Expedition</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-950/20 text-stone-900 border border-stone-950/20 ml-2">
                  [Space / Enter]
                </span>
              </button>

              {/* Game Feature Highlights Badge Row */}
              <div className="grid grid-cols-3 gap-2 text-stone-300 font-sans text-xs">
                <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-stone-900/60 border border-stone-800/80 backdrop-blur-sm">
                  <MapPin className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="font-bold text-stone-200">Tortilla Flat</span>
                  <span className="text-[10px] text-stone-400">Historic Town Hub</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-stone-900/60 border border-stone-800/80 backdrop-blur-sm">
                  <Shield className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="font-bold text-stone-200">40-Acre Claims</span>
                  <span className="text-[10px] text-stone-400">Voxel Mining & Shafts</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-stone-900/60 border border-stone-800/80 backdrop-blur-sm">
                  <Skull className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="font-bold text-stone-200">Frontier Perils</span>
                  <span className="text-[10px] text-stone-400">Guardians & Wildlife</span>
                </div>
              </div>
            </div>

            {/* Quick Prompt Hint */}
            <p className="text-[11px] font-mono text-stone-400 tracking-wider">
              Press <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-300 border border-stone-700">Space</kbd> or click button to explore • Press <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-300 border border-stone-700">Esc</kbd> anytime
            </p>
          </div>
        )}
      </div>

      {/* Bottom Footer Credits & Rating */}
      <div className="relative z-20 flex flex-col sm:flex-row items-center justify-between w-full max-w-7xl mx-auto pt-4 border-t border-stone-800/80 text-[11px] text-stone-500 font-sans gap-2">
        <div className="flex items-center gap-4 font-mono">
          <span>SUPERSTITION ENGINE v4.2</span>
          <span>•</span>
          <span>WEAVER&apos;S NEEDLE 4,553 FT</span>
          <span>•</span>
          <span>REAL-TIME MULTIPLAYER READY</span>
        </div>
        <div className="text-center sm:text-right text-stone-400">
          Based on the legendary 1880s Arizona gold rush &amp; Peralta Stone Maps
        </div>
      </div>
    </div>
  );
};
