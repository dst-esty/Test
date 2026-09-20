import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Compass,
  Flashlight,
  Search,
  Radio,
  Pickaxe,
  Crosshair,
  Flame,
  Flag,
  Heart,
  Map as MapIcon,
  BookOpen,
  Droplets,
  Coins,
  Clock,
  Hammer,
  RotateCw,
  Award,
  Box,
  ShieldAlert,
  ShieldCheck,
  Shovel,
  Music,
  DollarSign,
  Layers,
  TreePine,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
  Backpack,
  Scroll,
  Axe,
  Hand,
  Smartphone,
  Maximize,
  Minimize,
  Gauge,
  MapPin,
  Store,
  Eye,
  Mountain,
  Wind,
  AlertTriangle,
  Film,
} from 'lucide-react';
import { MineStructureType, PlayerState, GraphicsQuality, ClaimInfo, TerritoryClaim } from '../types';
import { STRUCTURE_BLUEPRINTS } from '../world/mineBuilding';
import { westernMusic } from '../audio/westernMusic';
import { soundEngine } from '../audio/soundEffects';
import { InventoryModal } from './InventoryModal';
import { territoryClaims } from '../services/territoryClaimService';
import { VirtualJoystick } from './VirtualJoystick';
import { isMobileDevice } from '../utils/device';
import { VigilanceStatus, SACRED_ZONES } from '../services/apacheVigilanceService';

interface ControlsOverlayProps {
  playerState: PlayerState;
  onSelectTool: (tool: PlayerState['equippedTool']) => void;
  onOpenMap: () => void;
  onOpenJournal: () => void;
  onOpenGuidebook?: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
  onToggleCamera: () => void;
  viewMode: 'first' | 'third';
  onDig?: () => void;
  interactionPrompt?: string;
  onInteract?: () => void;
  onMineDeposit?: () => void;
  canMine?: boolean;
  damageFlash?: boolean;
  hitMarker?: boolean;
  bannerMessage?: string | null;
  onOpenBuilder?: () => void;
  onOpenCamp?: () => void;
  onOpenClaimDeed?: (claim?: ClaimInfo | TerritoryClaim) => void;
  registeredClaims?: TerritoryClaim[];
  activeBuildingType?: MineStructureType;
  onRotateBlueprint?: () => void;
  onOpenRockDepot?: () => void;
  onReinforcePortal?: () => void;
  onStartPortalExcavation?: () => void;
  onPurchaseRocks?: (amount: number, goldCost: number) => void;
  onPurchaseWood?: (amount: number, goldCost: number) => void;
  onToggleAutoRedeem?: () => void;
  onRedeemAllGold?: () => void;
  nearbyTrench?: {
    depth: number;
    stability: number;
    isShored: boolean;
    shoredUntilDepth?: number;
    rocksNeeded: number;
    woodNeeded?: number;
    strataName?: string;
    strataId?: string;
    materialType?: 'wood' | 'stone' | 'timber_rock' | 'none';
    strataAdvice?: string;
    canShore: boolean;
  } | null;
  onShoreTrench?: () => void;
  hudVisible?: boolean;
  onToggleHud?: () => void;
  isTelegraphOpen?: boolean;
  onToggleTelegraph?: () => void;
  unreadTelegraphCount?: number;
  payDirtAlert?: { ounces: number } | null;
  onDismissPayDirtAlert?: () => void;
  onStakePayDirt?: () => void;
  timeOfDay?: number;
  nearestLandmark?: { name: string; dist: number } | null;
  onMobileAction?: () => void;
  onMobileJump?: () => void;
  onMobileMove?: (move: { forward: number; right: number }) => void;
  onMobileInteract?: () => void;
  graphicsQuality?: GraphicsQuality;
  fps?: number;
  onCycleGraphicsQuality?: () => void;
  areGogglesActive?: boolean;
  onToggleGoggles?: () => void;
  onToggleMount?: () => void;
  isAimingRifle?: boolean;
  scopeZoom?: number;
  onToggleAimRifle?: () => void;
  onZoomInScope?: () => void;
  onZoomOutScope?: () => void;
  onConsumeFood?: (type: 'venison' | 'bighorn' | 'rabbit' | 'provisions') => void;
  onPurchaseProvisions?: (amount: number, goldCost: number) => void;
  onDrinkCanteen?: () => void;
  vigilanceStatus?: VigilanceStatus | null;
  onOpenTitleScreen?: () => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  playerState,
  vigilanceStatus,
  onOpenTitleScreen,
  onSelectTool,
  onOpenMap,
  onOpenJournal,
  onOpenGuidebook,
  onToggleSound,
  soundEnabled,
  onToggleCamera,
  viewMode,
  onToggleMount,
  onDrinkCanteen,
  onDig,
  interactionPrompt,
  onInteract,
  onMineDeposit,
  canMine,
  damageFlash,
  hitMarker,
  bannerMessage,
  onOpenBuilder,
  onOpenCamp,
  onOpenClaimDeed,
  registeredClaims,
  activeBuildingType = 'timber_portal',
  onRotateBlueprint,
  onOpenRockDepot,
  onReinforcePortal,
  onStartPortalExcavation,
  onPurchaseRocks,
  onPurchaseWood,
  onToggleAutoRedeem,
  onRedeemAllGold,
  nearbyTrench,
  onShoreTrench,
  payDirtAlert,
  onDismissPayDirtAlert,
  onStakePayDirt,
  hudVisible: propHudVisible,
  onToggleHud,
  isTelegraphOpen = false,
  onToggleTelegraph,
  unreadTelegraphCount = 0,
  timeOfDay = 12,
  nearestLandmark,
  onMobileAction,
  onMobileJump,
  onMobileMove,
  onMobileInteract,
  graphicsQuality = 'balanced',
  fps,
  onCycleGraphicsQuality,
  areGogglesActive = false,
  onToggleGoggles,
  isAimingRifle = false,
  scopeZoom = 3.0,
  onToggleAimRifle,
  onZoomInScope,
  onZoomOutScope,
  onConsumeFood,
  onPurchaseProvisions,
}) => {
  const [musicPlaying, setMusicPlaying] = useState(westernMusic.getIsPlaying());
  const [musicMuted, setMusicMuted] = useState(westernMusic.getIsMuted());
  const [currentTrack, setCurrentTrack] = useState(westernMusic.getCurrentTrack());
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isExcavationPanelCollapsed, setIsExcavationPanelCollapsed] = useState(true);
  const [isTrenchPanelCollapsed, setIsTrenchPanelCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileDevice());
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => isMobileDevice());

  // Fullscreen Detection & Mobile Immersive View Handler
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const doc = document as any;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  });

  // Mobile Orientation Detection (Portrait vs Landscape) for genuine mobile devices
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isMobileDevice() && window.innerHeight > window.innerWidth;
  });

  const [isLandscapeMobile, setIsLandscapeMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isMobileDevice() && window.innerWidth > window.innerHeight && window.innerHeight <= 600;
  });

  const [dismissRotatePrompt, setDismissRotatePrompt] = useState<boolean>(false);
  const [isVigilanceModalOpen, setIsVigilanceModalOpen] = useState<boolean>(false);

  // Release pointer lock whenever modals open so the user has full mouse/touch interaction
  useEffect(() => {
    if (isVigilanceModalOpen || isInventoryOpen) {
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {
          // ignore
        }
      }
    }
  }, [isVigilanceModalOpen, isInventoryOpen]);

  useEffect(() => {
    const handleOrientationCheck = () => {
      if (typeof window === 'undefined') return;
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      // Automatically activate mobile touch controls if in fact a mobile device
      setShowTouchControls((prev) => (mobile ? true : prev));
      const isPortrait = mobile && window.innerHeight > window.innerWidth;
      const isLandscape = mobile && window.innerWidth > window.innerHeight && window.innerHeight <= 600;
      setIsPortraitMobile(isPortrait);
      setIsLandscapeMobile(isLandscape);
    };

    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);
    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
    };
  }, []);

  // Thirst warning audio cue & periodic reminder when hydration < 20%
  const lastThirstCueTimeRef = useRef<number>(0);
  const wasDehydratedRef = useRef<boolean>(playerState.hydration < 20);

  useEffect(() => {
    const isDehydrated = playerState.hydration < 20 && playerState.hydration > 0 && (playerState.health || 0) > 0;
    const now = Date.now();

    if (isDehydrated) {
      // Just crossed into dehydrated (< 20%), or periodic reminder every 16 seconds
      if (!wasDehydratedRef.current || (now - lastThirstCueTimeRef.current > 16000)) {
        if (soundEnabled) {
          const intensity = playerState.hydration < 10 ? 1.3 : 1.0;
          soundEngine.playThirstCue(intensity);
        }
        lastThirstCueTimeRef.current = now;
      }
    }
    wasDehydratedRef.current = isDehydrated;
  }, [playerState.hydration, playerState.health, soundEnabled]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFull = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const doc = document as any;
    const docEl = document.documentElement as any;

    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFull) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
      // Attempt orientation lock if on mobile device (best-effort, gracefully ignored if unsupported)
      if (screen?.orientation && typeof (screen.orientation as any).lock === 'function') {
        try {
          (screen.orientation as any).lock('landscape').catch(() => {});
        } catch {
          // ignore orientation lock rejection
        }
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      if (screen?.orientation && typeof (screen.orientation as any).unlock === 'function') {
        try {
          (screen.orientation as any).unlock();
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleEnterLandscapeFullscreen = useCallback(() => {
    handleToggleFullscreen();
    setDismissRotatePrompt(true);
  }, [handleToggleFullscreen]);
  
  // HUD Visibility (controlled or internal fallback)
  const [internalHudVisible, setInternalHudVisible] = useState(true);
  const hudVisible = typeof propHudVisible === 'boolean' ? propHudVisible : internalHudVisible;
  const toggleHud = () => {
    if (onToggleHud) {
      onToggleHud();
    } else {
      setInternalHudVisible((prev) => !prev);
    }
  };

  // Vitals, Supplies, Inventory, and Records collapse states for ultra-compact HUD (starts collapsed)
  const [isVitalsCollapsed, setIsVitalsCollapsed] = useState(true);
  const [isSupplyCollapsed, setIsSupplyCollapsed] = useState(true);
  const [isInventoryCollapsed, setIsInventoryCollapsed] = useState(true);
  const [isRecordsCollapsed, setIsRecordsCollapsed] = useState(true);

  const isLanternLit = playerState.equippedTool === 'lantern';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        setIsInventoryOpen((prev) => !prev);
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        onOpenCamp?.();
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        toggleHud();
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        onToggleGoggles?.();
      } else if (e.code === 'KeyM') {
        if (playerState.isRidingMount && onToggleMount) {
          e.preventDefault();
          onToggleMount();
        }
      } else if (e.code === 'Escape') {
        if (isVigilanceModalOpen) {
          e.preventDefault();
          setIsVigilanceModalOpen(false);
        } else if (isInventoryOpen) {
          e.preventDefault();
          setIsInventoryOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVigilanceModalOpen, isInventoryOpen, toggleHud, onToggleGoggles, playerState.isRidingMount, onToggleMount]);

  useEffect(() => {
    return westernMusic.subscribe(() => {
      setMusicPlaying(westernMusic.getIsPlaying());
      setMusicMuted(westernMusic.getIsMuted());
      setCurrentTrack(westernMusic.getCurrentTrack());
    });
  }, []);

  const isMusicActive = musicPlaying && !musicMuted;
  const handleToggleMusic = () => {
    if (isMusicActive) {
      westernMusic.toggleMute();
    } else {
      if (musicMuted) {
        westernMusic.toggleMute();
      }
      if (!musicPlaying) {
        westernMusic.play();
      }
    }
  };

  const tools: { id: PlayerState['equippedTool']; label: string; icon: React.ReactNode; key: string }[] = [
    { id: 'hands', label: 'Bare Hands', icon: <Hand className="w-4 h-4" />, key: '~' },
    { id: 'compass', label: 'Compass', icon: <Compass className="w-4 h-4" />, key: '1' },
    { id: 'lantern', label: 'Lantern', icon: <Flashlight className="w-4 h-4" />, key: '2' },
    { id: 'shovel', label: 'Spade Shovel', icon: <Shovel className="w-4 h-4" />, key: '3' },
    { id: 'pickaxe', label: 'Rock Pickaxe', icon: <Pickaxe className="w-4 h-4" />, key: '4' },
    { id: 'axe', label: 'Felling Axe', icon: <Axe className="w-4 h-4" />, key: 'X' },
    { id: 'rifle', label: 'Rifle', icon: <Crosshair className="w-4 h-4" />, key: '5' },
    { id: 'dynamite', label: 'Dynamite', icon: <Flame className="w-4 h-4" />, key: '6' },
    { id: 'detector', label: 'Detector', icon: <Radio className="w-4 h-4" />, key: '7' },
    { id: 'binoculars', label: 'Field Glass', icon: <Search className="w-4 h-4" />, key: '8' },
    { id: 'stake', label: 'Claim Stake', icon: <Flag className="w-4 h-4" />, key: '9' },
    { id: 'builder', label: 'Mine Builder', icon: <Hammer className="w-4 h-4" />, key: '0' },
  ];

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 select-none z-20"
      style={{
        paddingTop: 'max(0.6rem, env(safe-area-inset-top))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Damage Flash Red Vignette */}
      {damageFlash && (
        <div className="absolute inset-0 bg-red-600/30 pointer-events-none transition-opacity duration-150 animate-pulse border-8 border-red-600 z-20" />
      )}

      {/* Dehydration Critical Screen-Edge Vignette & Visual Pulse (< 20% Hydration) */}
      {playerState.hydration < 20 && (playerState.health || 0) > 0 && (
        <div
          id="hud-hydration-vignette"
          aria-label="Dehydration warning vignette"
          className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-700 overflow-hidden"
          style={{
            background:
              playerState.hydration < 10
                ? 'radial-gradient(ellipse at center, transparent 44%, rgba(180, 83, 9, 0.22) 72%, rgba(120, 53, 15, 0.55) 100%)'
                : 'radial-gradient(ellipse at center, transparent 52%, rgba(180, 83, 9, 0.15) 78%, rgba(120, 53, 15, 0.38) 100%)',
          }}
        >
          {/* Subtle pulsating inner heat-haze tunnel ring */}
          <div
            className="absolute inset-0 animate-thirst-vignette"
            style={{
              background:
                playerState.hydration < 10
                  ? 'radial-gradient(ellipse at center, transparent 44%, rgba(217, 119, 6, 0.18) 72%, rgba(180, 83, 9, 0.42) 100%)'
                  : 'radial-gradient(ellipse at center, transparent 50%, rgba(217, 119, 6, 0.12) 76%, rgba(180, 83, 9, 0.26) 100%)',
              boxShadow:
                playerState.hydration < 10
                  ? 'inset 0 0 80px 24px rgba(180, 83, 9, 0.45)'
                  : 'inset 0 0 50px 16px rgba(180, 83, 9, 0.28)',
            }}
          />

          {/* Parched horizon heat gradient (sun baked desert haze) */}
          <div className="absolute inset-x-0 bottom-0 h-16 sm:h-24 bg-gradient-to-t from-amber-950/40 via-amber-900/15 to-transparent pointer-events-none animate-thirst-haze" />
          <div className="absolute inset-x-0 top-0 h-14 sm:h-20 bg-gradient-to-b from-amber-950/30 via-amber-900/10 to-transparent pointer-events-none animate-thirst-haze" />
        </div>
      )}

      {/* Turn Phone Sideways (Landscape) Tip for Mobile Viewers */}
      {isPortraitMobile && !dismissRotatePrompt && (
        <div className="fixed inset-x-3 bottom-24 sm:bottom-28 z-50 pointer-events-auto flex justify-center animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-full max-w-sm bg-stone-950/95 backdrop-blur-md text-amber-100 border-2 border-amber-500/80 rounded-2xl p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400 shrink-0">
                  <RotateCw className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-300 font-serif tracking-wide">
                    Turn Phone Sideways
                  </h4>
                  <p className="text-[11px] text-stone-300 leading-snug mt-0.5">
                    Rotating horizontally unlocks full panoramic canyon view and ergonomic dual-thumb controls!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDismissRotatePrompt(true)}
                className="text-stone-400 hover:text-stone-100 p-1 rounded-full hover:bg-stone-850 transition-colors"
                title="Dismiss"
                aria-label="Dismiss rotation prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-stone-800">
              <button
                onClick={handleEnterLandscapeFullscreen}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span>Go Landscape & Fullscreen</span>
              </button>
              <button
                onClick={() => setDismissRotatePrompt(true)}
                className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-700/70 text-stone-300 text-xs font-mono transition-colors cursor-pointer"
              >
                Keep Portrait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discovery / Action Banner Notification */}
      {bannerMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-bold px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.6)] border border-amber-300 animate-bounce">
            <Coins className="w-4 h-4" />
            <span className="text-xs sm:text-sm tracking-wide">{bannerMessage}</span>
          </div>
        </div>
      )}

      {/* Pay Dirt Alert: Compact, centered, unobtrusive toast with quick fade and optional one-click stake */}
      {payDirtAlert && !playerState.activeClaim?.isClaimed && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-fade-in transition-all">
          <div className="flex items-center gap-2.5 bg-stone-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-amber-500/70 shadow-[0_4px_20px_rgba(0,0,0,0.6)] text-stone-100 text-xs font-mono">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            </span>

            <span className="font-bold text-amber-300 tracking-wide text-[11px] whitespace-nowrap">
              Pay Dirt Struck!
            </span>

            <span className="text-[10px] bg-amber-500/25 text-amber-200 px-1.5 py-0.5 rounded font-bold border border-amber-500/40 whitespace-nowrap">
              +{payDirtAlert.ounces.toFixed(1)} oz
            </span>

            <button
              onClick={() => {
                if (onStakePayDirt) {
                  onStakePayDirt();
                } else {
                  onSelectTool('stake');
                }
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-sans font-bold text-[10px] rounded-full shadow transition-all cursor-pointer whitespace-nowrap"
              title="Equip claim stake to secure ground [9]"
            >
              <Flag className="w-2.5 h-2.5 fill-stone-950" />
              <span>Stake [9]</span>
            </button>

            {onDismissPayDirtAlert && (
              <button
                onClick={onDismissPayDirtAlert}
                className="text-stone-400 hover:text-stone-100 p-0.5 rounded-full hover:bg-stone-800 transition cursor-pointer shrink-0 ml-0.5"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Left: Player Survival & Mine Statistics */}
      {hudVisible && (
        <div className="pointer-events-auto flex flex-col gap-2 max-w-sm items-start">
          {/* Collapsible Vitals & Survival Pill - Collapsed to Just the Red Heart */}
          {isVitalsCollapsed ? (
            <button
              onClick={() => setIsVitalsCollapsed(false)}
              className={`group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-stone-900/90 hover:bg-stone-850 backdrop-blur-md rounded-full border shadow-lg transition-all transform hover:scale-110 active:scale-95 cursor-pointer ${
                playerState.hydration < 20
                  ? 'border-amber-500/90 shadow-amber-950/60 ring-2 ring-amber-500/60 animate-pulse'
                  : 'border-red-500/40 hover:border-red-400 shadow-red-950/50'
              }`}
              title={`Health: ${Math.round(playerState.health)}% | Hydration: ${Math.round(playerState.hydration)}%${playerState.hydration < 20 ? ' (THIRST CRITICAL - Click to expand)' : ' (Click to view full vitals)'}`}
            >
              {playerState.hydration < 20 && playerState.health >= 30 ? (
                <Droplets className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
              ) : (
                <Heart
                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 fill-red-500 text-red-500 transition-transform group-hover:scale-110 ${
                    playerState.health < 30
                      ? 'animate-ping'
                      : playerState.health < 50
                      ? 'animate-pulse'
                      : ''
                  }`}
                />
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 animate-fade-in">
              {/* Streamlined Health & Hydration Pill */}
              <div className={`flex items-center gap-2.5 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-lg text-[10px] font-mono transition-all ${
                playerState.hydration < 20
                  ? 'border-amber-500/80 ring-2 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                  : 'border-stone-700/60'
              }`}>
                {/* Health - Clicking heart collapses back down */}
                <button
                  onClick={() => setIsVitalsCollapsed(true)}
                  className="flex items-center gap-1.5 cursor-pointer group"
                  title={`Health: ${Math.round(playerState.health)}% (Click to collapse to heart)`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 fill-red-500 text-red-500 group-hover:scale-110 transition-transform ${
                      playerState.health < 30 ? 'animate-ping' : ''
                    }`}
                  />
                  <div className="w-12 bg-stone-800 h-2 rounded-full overflow-hidden border border-stone-700/50">
                    <div
                      className={`h-full transition-all duration-300 ${
                        playerState.health < 30
                          ? 'bg-red-600'
                          : playerState.health < 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${playerState.health}%` }}
                    />
                  </div>
                  <span className="text-stone-300">{Math.round(playerState.health)}%</span>
                </button>

                <div className="w-px h-3 bg-stone-700/60" />

                {/* Hydration with visual pulse and click to drink */}
                <div
                  onClick={onDrinkCanteen}
                  className={`flex items-center gap-1.5 cursor-pointer group transition-all ${
                    onDrinkCanteen ? 'hover:opacity-90 active:scale-95' : ''
                  }`}
                  title={`Hydration: ${Math.round(playerState.hydration)}%${
                    playerState.hydration < 20 ? ' (THIRST CRITICAL!)' : ''
                  }${onDrinkCanteen ? ' • Click to drink canteen' : ''}`}
                >
                  <Droplets
                    className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                      playerState.hydration < 20
                        ? 'text-amber-400 fill-amber-400 animate-bounce'
                        : playerState.hydration < 25
                        ? 'text-sky-400 fill-sky-400/40 animate-bounce'
                        : 'text-sky-400 fill-sky-400/40'
                    }`}
                  />
                  <div
                    className={`w-12 bg-stone-800 h-2 rounded-full overflow-hidden border transition-all ${
                      playerState.hydration < 20
                        ? 'border-amber-500/90 ring-1 ring-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        : 'border-stone-700/50'
                    }`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        playerState.hydration < 20
                          ? 'bg-gradient-to-r from-red-600 to-amber-500 animate-pulse'
                          : playerState.hydration < 25
                          ? 'bg-red-500'
                          : playerState.hydration < 50
                          ? 'bg-amber-400'
                          : 'bg-sky-400'
                      }`}
                      style={{ width: `${playerState.hydration}%` }}
                    />
                  </div>
                  <span
                    className={`font-mono transition-colors ${
                      playerState.hydration < 20
                        ? 'text-amber-300 font-bold animate-pulse'
                        : 'text-stone-300'
                    }`}
                  >
                    {Math.round(playerState.hydration)}%
                  </span>
                </div>

                {/* Collapse Button */}
                <button
                  onClick={() => setIsVitalsCollapsed(true)}
                  className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white cursor-pointer ml-0.5 transition-colors"
                  title="Collapse to red heart"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Critical Dehydration Warning Pill (Directly Under Vitals) */}
          {playerState.hydration < 20 && (playerState.health || 0) > 0 && (
            <div
              id="hud-dehydration-alert"
              onClick={onDrinkCanteen}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/80 shadow-[0_0_14px_rgba(245,158,11,0.5)] backdrop-blur-md text-[10px] font-mono text-amber-200 animate-pulse select-none ${
                onDrinkCanteen ? 'cursor-pointer hover:bg-amber-900 active:scale-95' : ''
              }`}
              title="Hydration is critical (< 20%)! Drink from canteen or refill at mountain springs / base camp water trough."
            >
              <Droplets className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce shrink-0" />
              <span className="font-bold tracking-wide">THIRST CRITICAL • {Math.round(playerState.hydration)}%</span>
              {onDrinkCanteen && <span className="text-[9px] text-amber-300/80 underline ml-0.5">DRINK</span>}
            </div>
          )}

          {/* Multiplayer Online Status Slot (Directly Under Red Heart) */}
          <div id="multiplayer-status-slot" className="w-fit" />

          {/* Active Tunneling Domain Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900/90 backdrop-blur-md border shadow-md text-[10px] font-mono select-none"
            style={{
              borderColor: (playerState.currentMineLevel || 0) > 0 ? '#d97706' : '#78716c',
            }}
            title={(playerState.currentMineLevel || 0) > 0
              ? `Subterranean Mine Tunneling active (Level ${playerState.currentMineLevel}). Drifts are fortified with square-set timbers and rock bolts.`
              : 'Above-Ground Mountain Tunneling active. Excavations carve walk-in adits into mountain ridges with natural pass-through portals.'}
          >
            {(playerState.currentMineLevel || 0) > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-400 font-semibold tracking-wider">MINE DRIFT • L{playerState.currentMineLevel}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                <span className="text-stone-300 tracking-wider">MOUNTAIN ADIT</span>
              </>
            )}
          </div>

          {/* Apache Peak Vigilance Indicator */}
          {vigilanceStatus && (
            <button
              onClick={() => setIsVigilanceModalOpen(true)}
              className={`group flex items-center gap-2 px-2.5 py-1 rounded-full backdrop-blur-md border shadow-md text-[10px] font-mono select-none transition-all cursor-pointer hover:scale-[1.03] active:scale-95 ${
                vigilanceStatus.level === 'wrathful'
                  ? 'bg-red-950/95 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse'
                  : vigilanceStatus.level === 'hostile'
                  ? 'bg-rose-950/90 border-rose-600/80 shadow-[0_0_8px_rgba(225,29,72,0.5)]'
                  : vigilanceStatus.level === 'alert'
                  ? 'bg-orange-950/85 border-orange-500/70 shadow-orange-900/30'
                  : vigilanceStatus.level === 'watchful'
                  ? 'bg-amber-950/75 border-amber-600/60 shadow-amber-900/20'
                  : 'bg-stone-900/90 border-stone-700/60'
              }`}
              title="Apache Peak Vigilance & Mountain Sentinels Surveillance. Click to view Sacred Lore & Threat Status."
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    vigilanceStatus.level === 'wrathful'
                      ? 'bg-red-500 animate-ping'
                      : vigilanceStatus.level === 'hostile'
                      ? 'bg-rose-500 animate-pulse'
                      : vigilanceStatus.level === 'alert'
                      ? 'bg-orange-500 animate-pulse'
                      : vigilanceStatus.level === 'watchful'
                      ? 'bg-amber-400'
                      : 'bg-stone-400'
                  }`}
                />
                <Mountain
                  className={`w-3.5 h-3.5 ${
                    vigilanceStatus.level === 'wrathful'
                      ? 'text-red-400'
                      : vigilanceStatus.level === 'hostile'
                      ? 'text-rose-400'
                      : vigilanceStatus.level === 'alert'
                      ? 'text-orange-400'
                      : vigilanceStatus.level === 'watchful'
                      ? 'text-amber-400'
                      : 'text-stone-400'
                  }`}
                />
                <span
                  className={`font-semibold tracking-wider uppercase ${
                    vigilanceStatus.level === 'wrathful'
                      ? 'text-red-300 font-bold'
                      : vigilanceStatus.level === 'hostile'
                      ? 'text-rose-300'
                      : vigilanceStatus.level === 'alert'
                      ? 'text-orange-300'
                      : vigilanceStatus.level === 'watchful'
                      ? 'text-amber-300'
                      : 'text-stone-300'
                  }`}
                >
                  VIGILANCE: {vigilanceStatus.value}%
                </span>
              </div>

              {vigilanceStatus.activeSmokeSignals && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-600/40 text-[9px] animate-pulse">
                  <Wind className="w-2.5 h-2.5" />
                  SMOKE
                </span>
              )}

              {vigilanceStatus.activeZone && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700/50 text-[9px]">
                  <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                  SACRED
                </span>
              )}
            </button>
          )}

          {/* Collapsible Supply Icon & Panel (Field Supplies & Tools) */}
          {isSupplyCollapsed ? (
            <button
              onClick={() => setIsSupplyCollapsed(false)}
              className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900/90 hover:bg-stone-850 text-stone-300 border transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md shadow-lg ${
                isLanternLit
                  ? 'border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.5)]'
                  : 'border-amber-600/40 hover:border-amber-400/80 shadow-black/40'
              }`}
              title={`Field Supplies & Tools (Active: ${tools.find((t) => t.id === playerState.equippedTool)?.label || 'Tool'}) - Click to open tool rack`}
            >
              <Backpack className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-colors" />
              <Pickaxe className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-300 transition-colors" />
              {isLanternLit && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,1)] animate-ping" />
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-2 bg-stone-900/95 backdrop-blur-md p-3 rounded-2xl border border-amber-600/60 shadow-2xl text-stone-200 text-xs font-mono animate-fade-in w-72 select-none">
              {/* Header with Title & Collapse */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Backpack className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] uppercase tracking-wider">Field Supplies & Tools</span>
                </div>
                <button
                  onClick={() => setIsSupplyCollapsed(true)}
                  className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white cursor-pointer transition-colors"
                  title="Collapse to supply icon"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tools Selection Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {tools.map((t) => {
                  const isSelected = playerState.equippedTool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTool(t.id);
                        setIsSupplyCollapsed(true);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600/90 text-stone-950 font-bold border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-[1.02]'
                          : 'bg-stone-850 hover:bg-stone-800 text-stone-300 border-stone-700/60 hover:text-stone-100 hover:border-amber-500/40'
                      }`}
                      title={`Equip ${t.label} [${t.key}]`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={isSelected ? 'text-stone-950' : 'text-amber-400'}>{t.icon}</span>
                        <span className="truncate">{t.label}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono shrink-0 ml-1 ${
                          isSelected ? 'text-stone-950/80 font-bold' : 'text-stone-400'
                        }`}
                      >
                        [{t.key}]
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Prospector's Inspection Goggles Mode Toggle */}
              {onToggleGoggles && (
                <button
                  onClick={() => {
                    onToggleGoggles();
                    setIsSupplyCollapsed(true);
                  }}
                  className={`w-full mt-2 flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer font-bold text-[11px] shadow-md ${
                    areGogglesActive
                      ? 'border-amber-400 bg-amber-600/90 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'border-stone-700/70 bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-amber-300 hover:border-amber-500/50'
                  }`}
                  title="Toggle Prospector's Inspection Goggles [G] (Displays subterranean bedrock and shaft diagnostics)"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm">🥽</span>
                    <span>Prospector Goggles</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono shrink-0 ml-1 ${
                      areGogglesActive ? 'text-stone-950 font-bold' : 'text-amber-400'
                    }`}
                  >
                    {areGogglesActive ? '[Active]' : '[G]'}
                  </span>
                </button>
              )}

              {/* Companion Mount (Burro / Pony) row */}
              {playerState.ownedMount && onToggleMount && (
                <button
                  onClick={() => {
                    onToggleMount();
                    setIsSupplyCollapsed(true);
                  }}
                  className={`w-full mt-2 flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer font-bold text-[11px] shadow-md ${
                    playerState.isRidingMount
                      ? 'border-amber-400 bg-amber-600/90 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'border-amber-600/60 bg-stone-850 hover:bg-stone-800 text-amber-200 hover:text-amber-100 hover:border-amber-400'
                  }`}
                  title="Mount or Dismount companion [M]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm">
                      {playerState.ownedMount === 'burro' ? '🫏' : '🐎'}
                    </span>
                    <span className="truncate">
                      {playerState.mountName || (playerState.ownedMount === 'burro' ? 'Pack Burro' : 'Mountain Pony')}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono shrink-0 ml-1 ${
                      playerState.isRidingMount ? 'text-stone-950 font-bold' : 'text-amber-400'
                    }`}
                  >
                    {playerState.isRidingMount ? 'Dismount [M]' : 'Mount [M]'}
                  </span>
                </button>
              )}

              {/* Quick Camp & Campfire Action */}
              {onOpenCamp && (
                <button
                  onClick={onOpenCamp}
                  className="w-full mt-2 flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-orange-600/70 bg-gradient-to-r from-orange-950/70 via-stone-900 to-amber-950/60 hover:border-orange-400 text-orange-200 hover:text-stone-100 transition-all cursor-pointer font-bold text-[11px] shadow-md group"
                  title="Make Camp & Build Campfire [C]"
                >
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform animate-pulse" />
                    <span>Make Camp & Fire</span>
                  </div>
                  <span className="text-[10px] font-mono text-orange-400/90 font-bold group-hover:text-amber-300">[C]</span>
                </button>
              )}
            </div>
          )}

          {/* Collapsible Inventory Tray - Just the square icon when collapsed, placed below supplies */}
          {isInventoryCollapsed ? (
            <button
              onClick={() => setIsInventoryCollapsed(false)}
              className="group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900/90 hover:bg-stone-850 text-stone-300 border border-amber-600/40 hover:border-amber-400/80 shadow-lg shadow-black/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md"
              title={`Expedition Inventory ($${(playerState.cashDollars || 0).toFixed(2)}, ${(playerState.goldFound || 0).toFixed(1)} oz) - Click to expand`}
            >
              <Box className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            </button>
          ) : (
            <div className="flex flex-col gap-2 bg-stone-900/95 backdrop-blur-md p-3 rounded-2xl border border-amber-600/60 shadow-2xl text-stone-200 text-xs font-mono animate-fade-in w-72 select-none">
              {/* Header with Title & Collapse */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Box className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] uppercase tracking-wider">Expedition Inventory</span>
                </div>
                <button
                  onClick={() => setIsInventoryCollapsed(true)}
                  className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white cursor-pointer transition-colors"
                  title="Collapse to square icon"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inventory Resource Details */}
              <div className="grid grid-cols-2 gap-1.5 bg-stone-950/70 p-2 rounded-xl border border-stone-800/80 text-[11px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-stone-400">Cash:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ${(playerState.cashDollars || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-stone-400">Gold:</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {(typeof playerState.goldFound === 'number' && !isNaN(playerState.goldFound) ? playerState.goldFound : 0).toFixed(1)} oz
                  </span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-stone-400">Wood:</span>
                  <span className="text-stone-200 font-mono">
                    🪵 {playerState.woodPlanks || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-stone-400">Rock:</span>
                  <span className="text-stone-200 font-mono">
                    🪨 {playerState.blocksDug || 0}
                  </span>
                </div>
                {(playerState.dynamite || 0) > 0 && (
                  <div className="col-span-2 flex items-center justify-between px-1 pt-1 border-t border-stone-800">
                    <span className="text-stone-400">Dynamite:</span>
                    <span className="text-red-400 font-bold font-mono">
                      🧨 {playerState.dynamite} sticks
                    </span>
                  </div>
                )}
              </div>

              {/* Open Full Saddlebag Modal Button */}
              <button
                onClick={() => setIsInventoryOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-stone-950 font-bold border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] transition cursor-pointer text-[11px]"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Open Full Saddlebag [I]</span>
              </button>
            </div>
          )}

          {/* Collapsible Records / Field Log (Map, Journal & Guidebook) - Directly Under Expedition Inventory */}
          {isRecordsCollapsed ? (
            <button
              onClick={() => setIsRecordsCollapsed(false)}
              className="group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900/90 hover:bg-stone-850 text-stone-300 border border-amber-600/40 hover:border-amber-400/80 shadow-lg shadow-black/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md"
              title="Expedition Records: Map, Journal & Guidebook [M, J, G] - Click to expand"
            >
              <MapIcon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <div className="flex flex-col gap-2 bg-stone-900/95 backdrop-blur-md p-3 rounded-2xl border border-amber-600/60 shadow-2xl text-stone-200 text-xs font-mono animate-fade-in w-72 sm:w-80 select-none">
              {/* Header with Title & Collapse */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] uppercase tracking-wider">Expedition Records</span>
                </div>
                <button
                  onClick={() => setIsRecordsCollapsed(true)}
                  className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white cursor-pointer transition-colors"
                  title="Collapse records"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Combined Map, Journal, Guidebook & Camp Action Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={onOpenMap}
                  className="flex items-center justify-center gap-1 bg-stone-850 hover:bg-amber-600/90 text-amber-200 hover:text-stone-950 border border-amber-700/60 hover:border-amber-300 px-1 py-2 rounded-xl shadow transition-all cursor-pointer font-bold group text-[11px]"
                  title="Open Frontier Survey Map [M]"
                >
                  <MapIcon className="w-3.5 h-3.5 text-amber-400 group-hover:text-stone-950 transition-colors" />
                  <span>Map</span>
                  <span className="text-[9px] text-amber-400/80 group-hover:text-stone-950/80 font-mono">[M]</span>
                </button>

                <button
                  onClick={onOpenJournal}
                  className="flex items-center justify-center gap-1 bg-stone-850 hover:bg-amber-600/90 text-amber-200 hover:text-stone-950 border border-amber-700/60 hover:border-amber-300 px-1 py-2 rounded-xl shadow transition-all cursor-pointer font-bold group text-[11px]"
                  title="Open Prospector's Field Journal [J]"
                >
                  <Scroll className="w-3.5 h-3.5 text-amber-400 group-hover:text-stone-950 transition-colors" />
                  <span>Journal</span>
                  <span className="text-[9px] text-amber-400/80 group-hover:text-stone-950/80 font-mono">[J]</span>
                </button>

                <button
                  onClick={onOpenGuidebook}
                  className="flex items-center justify-center gap-1 bg-stone-850 hover:bg-amber-600/90 text-amber-200 hover:text-stone-950 border border-amber-700/60 hover:border-amber-300 px-1 py-2 rounded-xl shadow transition-all cursor-pointer font-bold group text-[11px]"
                  title="Open Prospector's Field Guidebook [G]"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400 group-hover:text-stone-950 transition-colors" />
                  <span>Guide</span>
                  <span className="text-[9px] text-amber-400/80 group-hover:text-stone-950/80 font-mono">[G]</span>
                </button>

                <button
                  onClick={onOpenCamp}
                  className="flex items-center justify-center gap-1 bg-stone-850 hover:bg-orange-600/90 text-orange-200 hover:text-stone-950 border border-orange-700/60 hover:border-orange-400 px-1 py-2 rounded-xl shadow transition-all cursor-pointer font-bold group text-[11px]"
                  title="Make Camp & Build Campfire [C]"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400 group-hover:text-stone-950 transition-colors animate-pulse" />
                  <span>Camp</span>
                  <span className="text-[9px] text-orange-400/80 group-hover:text-stone-950/80 font-mono">[C]</span>
                </button>
              </div>

              {/* Claims & Deeds District Exchange Entry Button */}
              {onOpenClaimDeed && (
                <button
                  onClick={() => onOpenClaimDeed()}
                  className="w-full mt-0.5 flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-amber-600/60 bg-gradient-to-r from-amber-950/60 via-stone-850 to-stone-900 hover:border-amber-400 text-amber-200 hover:text-amber-100 transition-all cursor-pointer font-bold text-[11px] shadow-md group"
                  title="Open Mineral Claims, Deeds & District Claims Exchange [K]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Scroll className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Claims, Deeds & Exchange</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400/90 font-bold group-hover:text-amber-300 shrink-0 ml-1">[K]</span>
                </button>
              )}
            </div>
          )}

      {/* Right Vertical Utility Toolbar: Touch Joystick, Fullscreen, FPS, and Western Music */}
      <div
        id="utility-controls-stack"
        className="pointer-events-auto fixed right-2.5 sm:right-4 top-16 sm:top-18 flex flex-col items-center gap-2 select-none z-30"
        style={{
          right: 'max(0.6rem, env(safe-area-inset-right))',
        }}
      >
        {/* 1. Touch / Mobile Joystick Controls HUD Toggle Button */}
        <button
          id="btn-touch-joystick-toggle"
          onClick={() => setShowTouchControls((prev) => !prev)}
          className={`group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900/90 hover:bg-stone-850 border transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md shadow-lg ${
            showTouchControls
              ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_14px_rgba(245,158,11,0.5)] text-amber-300'
              : 'border-stone-700/60 text-stone-500 hover:text-stone-300'
          }`}
          title={
            showTouchControls
              ? 'Touch & Virtual Joystick Controls (Active) - Click to hide'
              : 'Touch & Virtual Joystick Controls (Hidden) - Click to show'
          }
          aria-label="Touch Joystick Controls"
        >
          <Smartphone
            className={`w-4 h-4 ${
              showTouchControls ? 'text-amber-400' : 'text-stone-500 group-hover:text-stone-300'
            }`}
          />
        </button>

        {/* 2. Fullscreen Mode Toggle Button */}
        <button
          id="btn-fullscreen-toggle"
          onClick={handleToggleFullscreen}
          className={`group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900/90 hover:bg-stone-850 border transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md shadow-lg ${
            isFullscreen
              ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_14px_rgba(245,158,11,0.5)] text-amber-300'
              : 'border-stone-700/60 text-stone-400 hover:text-stone-200'
          }`}
          title={
            isFullscreen
              ? 'Exit Fullscreen'
              : 'Fullscreen Mode (Expands viewport & hides browser bars on mobile)'
          }
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 text-amber-400" />
          ) : (
            <Maximize className="w-4 h-4 text-stone-400 group-hover:text-stone-200" />
          )}
        </button>

        {/* 3. Graphics Quality & FPS Performance Indicator Button */}
        {onCycleGraphicsQuality && (
          <button
            id="btn-fps-quality-toggle"
            onClick={onCycleGraphicsQuality}
            className={`group flex flex-col items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900/90 hover:bg-stone-850 border transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md shadow-lg ${
              graphicsQuality === 'performance'
                ? 'border-emerald-500/80 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : graphicsQuality === 'balanced'
                ? 'border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'border-purple-400/80 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
            }`}
            title={`Graphics Engine & FPS: ${fps || 60} FPS (${graphicsQuality}) - Click to switch`}
            aria-label="Graphics Quality & FPS"
          >
            <Gauge
              className={`w-3.5 h-3.5 ${
                graphicsQuality === 'performance'
                  ? 'text-emerald-400'
                  : graphicsQuality === 'balanced'
                  ? 'text-amber-400'
                  : 'text-purple-400'
              } group-hover:rotate-45 transition-transform`}
            />
            <span className="text-[7.5px] font-mono font-bold leading-none mt-0.5">
              {fps ? `${fps}` : '60'}
            </span>
          </button>
        )}

        {/* 4. Western Music Icon Button */}
        <button
          id="btn-western-music-toggle"
          onClick={handleToggleMusic}
          className={`group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900/90 hover:bg-stone-850 border transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md shadow-lg ${
            isMusicActive
              ? 'border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.5)] text-amber-300'
              : 'border-amber-600/40 hover:border-amber-400/80 shadow-black/40 text-stone-500 hover:text-stone-300'
          }`}
          title={
            isMusicActive
              ? `Western Music: ${currentTrack.title} (Playing) - Click to silence`
              : 'Western Music (Silenced) - Click to play'
          }
          aria-label="Western Music"
        >
          {isMusicActive ? (
            <Music className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform animate-pulse" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Music className="w-4 h-4 text-stone-500 group-hover:text-stone-300 transition-colors" />
              <span className="absolute w-[18px] h-[1.5px] bg-red-500/80 rotate-45 pointer-events-none rounded-full" />
            </div>
          )}
        </button>

        {/* 5. Replay Cinematic Splash / Title Screen Button */}
        {onOpenTitleScreen && (
          <button
            id="btn-cinematic-splash-toggle"
            onClick={onOpenTitleScreen}
            className="group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900/90 hover:bg-stone-850 border border-amber-600/50 hover:border-amber-400/90 text-stone-400 hover:text-amber-300 transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none backdrop-blur-md shadow-lg"
            title="Cinematic Title Screen & Game Overview"
            aria-label="Cinematic Title Screen"
          >
            <Film className="w-4 h-4 text-amber-400/90 group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>

        {/* Portal Excavation & Mountain Strain Warning Card (Collapsible) */}
        {playerState.portalExcavation && (
          <div
            className={`flex flex-col gap-1.5 p-2 rounded-2xl border backdrop-blur-md shadow-xl transition-all ${
              playerState.portalExcavation.isReinforced
                ? 'bg-emerald-950/80 border-emerald-600/60'
                : playerState.portalExcavation.stability < 65
                ? 'bg-red-950/90 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                : 'bg-stone-900/90 border-amber-600/60'
            }`}
          >
            <div
              onClick={() => setIsExcavationPanelCollapsed((p) => !p)}
              className="flex items-center justify-between cursor-pointer hover:opacity-90 select-none"
            >
              <div className="flex items-center gap-1.5">
                <Pickaxe
                  className={`w-3.5 h-3.5 ${
                    playerState.portalExcavation.isReinforced
                      ? 'text-emerald-400'
                      : playerState.portalExcavation.stability < 65
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}
                />
                <span className="text-[11px] font-bold text-stone-100 font-mono">
                  {playerState.portalExcavation.isReinforced
                    ? 'PORTAL SHORED & SECURE'
                    : 'PORTAL EXCAVATION'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-stone-300">
                  {playerState.portalExcavation.progress}% dug
                </span>
                {isExcavationPanelCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                )}
              </div>
            </div>

            {!isExcavationPanelCollapsed && !playerState.portalExcavation.isReinforced && (
              <>
                {/* Bedrock Stability Bar */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[9px] font-mono text-stone-400">
                    <span>Bedrock Stability</span>
                    <span
                      className={
                        playerState.portalExcavation.stability < 65
                          ? 'text-red-400 font-bold'
                          : 'text-emerald-400'
                      }
                    >
                      {playerState.portalExcavation.stability}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        playerState.portalExcavation.stability < 65 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${playerState.portalExcavation.stability}%` }}
                    />
                  </div>
                </div>

                {/* Creak and Groan Alert Message */}
                {playerState.portalExcavation.stability < 65 ? (
                  <div className="flex items-center gap-1 text-[10px] text-red-300 font-semibold leading-tight">
                    <ShieldAlert className="w-3 h-3 shrink-0 text-red-400" />
                    <span>⚠️ Mountain groaning! Overburden shear high. Reinforce with rocks & timber!</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-stone-400 leading-tight">
                    Strike bedrock with pickaxe. Unsupported drift creaks under stress!
                  </div>
                )}

                {/* Shoring Requirements & Action Buttons */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-800 text-[10px] font-mono">
                  <span className="text-stone-300">
                    Need: <strong className="text-amber-300">{playerState.portalExcavation.rocksNeeded}R</strong> /{' '}
                    <strong className="text-amber-300">{playerState.portalExcavation.goldNeeded}G</strong>
                  </span>

                  <div className="flex items-center gap-1">
                    {onOpenRockDepot && (
                      <button
                        onClick={onOpenRockDepot}
                        className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded border border-amber-700/40 text-[9px]"
                      >
                        Buy Rocks
                      </button>
                    )}
                    {onReinforcePortal && (
                      <button
                        onClick={onReinforcePortal}
                        disabled={
                          (playerState.blocksDug || 0) < playerState.portalExcavation.rocksNeeded ||
                          (playerState.goldFound || 0) < playerState.portalExcavation.goldNeeded
                        }
                        className={`px-2 py-0.5 rounded font-bold text-[9px] transition ${
                          (playerState.blocksDug || 0) >= playerState.portalExcavation.rocksNeeded &&
                          (playerState.goldFound || 0) >= playerState.portalExcavation.goldNeeded
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow'
                            : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                        }`}
                      >
                        Reinforce
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Geotechnical Excavation Pit Stability & Timber Shoring Card (Collapsible) */}
        {nearbyTrench && (
          <div
            className={`flex flex-col gap-1.5 p-2 rounded-2xl border backdrop-blur-md shadow-xl transition-all ${
              nearbyTrench.isShored
                ? 'bg-emerald-950/80 border-emerald-600/60'
                : nearbyTrench.stability <= 35
                ? 'bg-red-950/90 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-amber-950/80 border-amber-600/60'
            }`}
          >
            <div
              onClick={() => setIsTrenchPanelCollapsed((p) => !p)}
              className="flex items-center justify-between cursor-pointer hover:opacity-90 select-none"
            >
              <div className="flex items-center gap-1.5">
                <Shovel
                  className={`w-3.5 h-3.5 ${
                    nearbyTrench.isShored
                      ? 'text-emerald-400'
                      : nearbyTrench.stability <= 35
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}
                />
                <span className="text-[11px] font-bold text-stone-100 font-mono">
                  {nearbyTrench.isShored
                    ? 'TRENCH TIMBER SHORED'
                    : nearbyTrench.shoredUntilDepth
                    ? 'EXTEND TIMBERS'
                    : nearbyTrench.strataId === 'strata_sand'
                    ? 'WOODEN SHORING IN SAND'
                    : 'MINE TIMBERING'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-stone-300">
                  {nearbyTrench.depth.toFixed(1)}m{' '}
                  {nearbyTrench.shoredUntilDepth
                    ? `(to ${nearbyTrench.shoredUntilDepth.toFixed(1)}m)`
                    : 'Deep'}
                </span>
                {isTrenchPanelCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                )}
              </div>
            </div>

            {!isTrenchPanelCollapsed && (
              <>
                {/* Geological Strata Badge */}
                <div className="flex items-center justify-between text-[9px] font-mono bg-stone-900/60 px-2 py-0.5 rounded border border-stone-800">
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" />
                    {nearbyTrench.strataName || 'Desert Stratum'}
                  </span>
                  <span className="text-stone-400">
                    {nearbyTrench.materialType === 'wood'
                      ? 'High Timber Need'
                      : nearbyTrench.materialType === 'timber_rock'
                      ? 'Timber & Stone Anchor'
                      : nearbyTrench.materialType === 'none'
                      ? 'Self-Supporting'
                      : 'Rock Shoring'}
                  </span>
                </div>

                {!nearbyTrench.isShored ? (
                  <>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] font-mono text-stone-400">
                        <span>Wall Stability</span>
                        <span
                          className={
                            nearbyTrench.stability <= 35
                              ? 'text-red-400 font-bold'
                              : nearbyTrench.stability <= 65
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {Math.round(nearbyTrench.stability)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            nearbyTrench.stability <= 35
                              ? 'bg-red-500'
                              : nearbyTrench.stability <= 65
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, nearbyTrench.stability)}%` }}
                        />
                      </div>
                    </div>

                    {nearbyTrench.stability <= 35 ? (
                      <div className="flex items-center gap-1 text-[10px] text-red-300 font-semibold leading-tight">
                        <ShieldAlert className="w-3 h-3 shrink-0 text-red-400" />
                        <span>⚠️ Trench walls buckling! High lateral pressure. Install wooden shoring before fatal cave-in!</span>
                      </div>
                    ) : nearbyTrench.shoredUntilDepth ? (
                      <div className="text-[10px] text-amber-300 leading-tight font-mono">
                        ⚠️ Trench dug deeper than timber collar ({nearbyTrench.shoredUntilDepth.toFixed(1)}m). Extend cribbing to secure the next depth.
                      </div>
                    ) : (
                      <div className="text-[10px] text-stone-400 leading-tight">
                        {nearbyTrench.strataAdvice || 'Install timber shoring to resist geotechnical soil shear and prevent trench cave-ins.'}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-800 text-[10px] font-mono">
                      <span className="text-stone-300">
                        Cost:{' '}
                        <strong className="text-amber-300">
                          {nearbyTrench.materialType === 'wood'
                            ? `${nearbyTrench.woodNeeded ?? 2} Timber Planks`
                            : nearbyTrench.materialType === 'timber_rock'
                            ? '1 Plank + 1 Stone'
                            : nearbyTrench.materialType === 'none'
                            ? '0 Materials'
                            : `${nearbyTrench.rocksNeeded} Quarry Stones`}
                        </strong>
                      </span>
                      {onShoreTrench && (
                        <button
                          onClick={onShoreTrench}
                          disabled={!nearbyTrench.canShore}
                          className={`px-2 py-0.5 rounded font-bold text-[9px] transition ${
                            nearbyTrench.canShore
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow'
                              : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                          }`}
                        >
                          {nearbyTrench.shoredUntilDepth ? 'Extend [T]' : 'Shore [T]'}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] text-emerald-300 flex items-center justify-between font-mono">
                      <span>🛡️ Secured down to {(nearbyTrench.shoredUntilDepth || nearbyTrench.depth).toFixed(1)}m depth</span>
                      {nearbyTrench.canShore && onShoreTrench && (
                        <button
                          onClick={onShoreTrench}
                          className="px-2 py-0.5 rounded font-bold text-[9px] bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow font-mono"
                        >
                          Extend [T]
                        </button>
                      )}
                    </div>
                    <div className="text-[9px] text-stone-400 leading-tight font-sans">
                      {nearbyTrench.strataAdvice || `Timbers support walls down to ${(nearbyTrench.shoredUntilDepth || nearbyTrench.depth).toFixed(1)}m.`}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* Top Right: Weapons & Equipment Status (placed beside utility rail) */}
      <div className="pointer-events-auto fixed top-16 sm:top-18 right-14 sm:right-16 flex flex-col items-end gap-2 z-30">
        {hudVisible && (
          <>
            {/* Weapons Info */}
            {playerState.equippedTool === 'rifle' && (
              <div className="flex items-center gap-2.5 bg-stone-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-amber-600/70 text-amber-200 shadow-xl font-mono">
                <Crosshair className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-stone-400">WINCHESTER 1873 • 3X-10X SCOPE</span>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleAimRifle) onToggleAimRifle();
                      }}
                      className="pointer-events-auto px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-[10px] text-amber-300 font-bold border border-amber-500/40 cursor-pointer transition active:scale-95"
                    >
                      {isAimingRifle ? `SCOPED ${scopeZoom ? scopeZoom.toFixed(1) + 'X' : ''}` : '[V / RMB] AIM'}
                    </button>
                    <span className="text-sm font-bold text-amber-300">
                      {playerState.ammo} <span className="text-[10px] font-normal text-stone-400">ROUNDS</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {playerState.equippedTool === 'dynamite' && (
              <div className="flex items-center gap-2.5 bg-stone-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-red-600/70 text-red-200 shadow-xl font-mono">
                <Flame className="w-4 h-4 text-red-400" />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-stone-400">NITRO DYNAMITE</span>
                  <span className="text-sm font-bold text-red-300">
                    {playerState.dynamite} <span className="text-[10px] font-normal text-stone-400">STICKS</span>
                  </span>
                </div>
              </div>
            )}

            {playerState.carriedObject && (
              <div className="flex items-center gap-2.5 bg-stone-950/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-amber-500/80 text-amber-100 shadow-2xl font-mono">
                <span className="text-xl">🪨</span>
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">HELD OBJECT</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 font-bold">
                      {playerState.carriedObject.weightLbs} LBS
                    </span>
                  </div>
                  <span className="text-xs text-stone-200">
                    [L-Click] Throw • [R-Click / E] Place • [F] Stow
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Center Interaction Prompt (Touch and Click friendly) */}
      {interactionPrompt && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 pointer-events-auto flex flex-col items-center z-40 max-w-[90vw]">
          <button
            onClick={onInteract}
            className="flex items-center gap-2 bg-stone-950/90 hover:bg-stone-900 text-stone-100 font-medium px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-amber-500/60 transition-all hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
          >
            <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-xs flex items-center justify-center font-mono font-bold shrink-0">
              E
            </span>
            <span className="text-xs font-sans tracking-wide text-stone-200 font-semibold truncate max-w-[260px] sm:max-w-none">
              {interactionPrompt}
            </span>
            <span className="text-[9px] bg-stone-800 text-amber-300 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider shrink-0">
              TAP
            </span>
          </button>
        </div>
      )}

      {/* Center Crosshair for first person view (hidden while looking through scope) */}
      {viewMode === 'first' && !isAimingRifle && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          {playerState.equippedTool === 'rifle' ? (
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute w-full h-[1.5px] bg-amber-300/80" />
              <div className="absolute h-full w-[1.5px] bg-amber-300/80" />
              <div className="w-3 h-3 rounded-full border border-amber-400/80" />
              {hitMarker && (
                <div className="absolute inset-0 border-2 border-red-500 rotate-45 animate-ping" />
              )}
            </div>
          ) : playerState.equippedTool === 'shovel' ? (
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-amber-400/80 border-dashed animate-spin" style={{ animationDuration: '8s' }} />
              <div className="absolute w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,1)]" />
              <div className="absolute -bottom-5 text-[9px] font-mono tracking-widest text-amber-300 font-bold whitespace-nowrap drop-shadow">
                DIG HOLE
              </div>
            </div>
          ) : playerState.equippedTool === 'pickaxe' ? (
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,1)] animate-ping" />
              <div className="absolute w-2 h-2 rounded-full bg-amber-300" />
            </div>
          ) : playerState.equippedTool === 'axe' ? (
            <div className="relative flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border border-amber-400/80 border-dashed animate-pulse" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)]" />
              <div className="absolute -bottom-5 text-[9px] font-mono tracking-widest text-amber-300 font-bold whitespace-nowrap drop-shadow">
                CHOP TIMBER [X]
              </div>
            </div>
          ) : playerState.carriedObject ? (
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-amber-400/80 border-dashed animate-pulse" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)]" />
              <div className="absolute -bottom-5 text-[9px] font-mono tracking-widest text-amber-300 font-bold whitespace-nowrap drop-shadow">
                THROW [L-CLICK] • PLACE [R-CLICK / E]
              </div>
            </div>
          ) : playerState.equippedTool === 'hands' ? (
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border border-amber-400/70" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/90" />
              <div className="absolute -bottom-5 text-[9px] font-mono tracking-widest text-amber-300/90 font-bold whitespace-nowrap drop-shadow">
                BARE HANDS [L-CLICK / E TO PICK UP]
              </div>
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-amber-200/60 border border-amber-400/80 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
          )}
        </div>
      )}

      {/* Bottom Area: Tool Action Button + Bottom Bar */}
      {hudVisible && (
        <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Holographic Blueprint Builder Ribbon */}
        {playerState.equippedTool === 'builder' && (
          <div className="pointer-events-auto flex items-center gap-3 bg-stone-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)] text-xs">
            <div className="flex items-center gap-2">
              {activeBuildingType === 'campfire' || activeBuildingType === 'prospector_camp' || activeBuildingType === 'frontier_torch' ? (
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              ) : (
                <Hammer className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-stone-300">
                {activeBuildingType === 'frontier_torch'
                  ? 'Torch:'
                  : activeBuildingType === 'campfire' || activeBuildingType === 'prospector_camp'
                  ? 'Campsite:'
                  : 'Blueprint:'}
              </span>
              <span className="font-bold text-amber-200">
                {STRUCTURE_BLUEPRINTS[activeBuildingType]?.name || 'Structure'}
              </span>
              {STRUCTURE_BLUEPRINTS[activeBuildingType]?.woodCost ? (
                <span className="text-[10px] text-emerald-300 font-mono">
                  🪵 {STRUCTURE_BLUEPRINTS[activeBuildingType].woodCost}w
                </span>
              ) : null}
            </div>

            <button
              onClick={onRotateBlueprint}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg border border-amber-600/40 text-[11px] cursor-pointer"
              title="Rotate structure 45 degrees"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate [R]</span>
            </button>

            {/* Remove Change Blueprint when placing campsite/campfire/torch */}
            {activeBuildingType !== 'campfire' && activeBuildingType !== 'prospector_camp' && activeBuildingType !== 'frontier_torch' && onOpenBuilder && (
              <button
                onClick={onOpenBuilder}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-[11px] cursor-pointer"
              >
                Change Blueprint [B]
              </button>
            )}

            {activeBuildingType !== 'campfire' && activeBuildingType !== 'prospector_camp' && activeBuildingType !== 'frontier_torch' && onOpenRockDepot && (
              <button
                onClick={onOpenRockDepot}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-600/40 rounded-lg text-[11px] font-bold cursor-pointer"
                title="Open Rock & Mining Supply Depot"
              >
                🛒 Buy Rocks
              </button>
            )}

            <button
              onClick={() => onSelectTool('pickaxe')}
              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 border border-stone-600/50 rounded-lg text-[11px] cursor-pointer"
              title="Cancel placement [Esc]"
            >
              Cancel [Esc]
            </button>

            <span className="text-[10px] font-mono hidden sm:inline">
              {activeBuildingType === 'headframe_hoist' ? (
                <span className="text-amber-200 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                  ⚠️ <strong>Requires level surface ground (&lt;16° slope)</strong> • Use <strong>Timber Portal</strong> for mountain tunnels
                </span>
              ) : activeBuildingType === 'timber_portal' ? (
                <span className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  ⛰️ <strong>Mountain Adit Portal</strong> • Face mountain rock face to cut entrance
                </span>
              ) : activeBuildingType === 'frontier_torch' ? (
                <span className="text-amber-300">
                  🔥 <strong>Stake Ground Torch</strong> • Place along paths or drifts (1 Wood Log)
                </span>
              ) : (
                <span className="text-emerald-400">
                  🔨 [Left-Click / E] Place in 3D • [R] Rotate
                </span>
              )}
            </span>
          </div>
        )}

        {/* Claim Staking Ribbon */}
        {playerState.equippedTool === 'stake' && (
          <div className="pointer-events-auto flex items-center gap-3 bg-stone-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.4)] text-xs">
            <Flag className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-amber-100">Staking Survey Claim:</span>
            <span className="text-stone-300 text-[11px]">
              Look at terrain • <strong>[Left-Click]</strong> to drive Survey Stake & string 40-acre boundary cords!
            </span>
          </div>
        )}
      </div>
      )}

      {/* Dedicated Dismount Button - Always prominent when riding mount */}
      {playerState.isRidingMount && onToggleMount && (
        <div
          id="mount-dismount-banner"
          className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center justify-center animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <button
            id="btn-dedicated-dismount"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleMount();
            }}
            className="group flex items-center gap-3 px-5 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-[0_6px_30px_rgba(245,158,11,0.7)] border-2 border-amber-200 hover:border-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer touch-manipulation font-sans select-none"
            title="Dismount companion [M]"
            aria-label="Dismount companion"
          >
            <span className="text-xl leading-none">
              {playerState.ownedMount === 'burro' ? '🫏' : '🐎'}
            </span>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-stone-950 leading-tight">
                Dismount {playerState.mountName || (playerState.ownedMount === 'burro' ? 'Burro' : 'Horse')}
              </span>
              <span className="text-[10px] text-stone-900 font-mono font-bold leading-tight">
                Click or press [M] to dismount
              </span>
            </div>
            <span className="ml-1 text-[11px] font-mono font-black bg-stone-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/60 shadow">
              [M]
            </span>
          </button>
        </div>
      )}

      {/* Full Expedition Inventory Saddlebag & Frontier Assayer Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        playerState={playerState}
        onRedeemAllGold={onRedeemAllGold}
        onToggleAutoRedeem={onToggleAutoRedeem}
        onPurchaseWood={onPurchaseWood}
        onOpenRockDepot={onOpenRockDepot}
        onSelectTool={onSelectTool}
        onConsumeFood={onConsumeFood}
        onPurchaseProvisions={onPurchaseProvisions}
      />

      {/* Apache Lore & Peak Vigilance Tactical Modal */}
      {isVigilanceModalOpen && (
        <div
          id="apache-vigilance-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md pointer-events-auto select-auto cursor-default animate-in fade-in duration-200"
          onClick={() => setIsVigilanceModalOpen(false)}
        >
          <div
            id="apache-vigilance-modal-content"
            className="relative w-full max-w-2xl bg-stone-950/95 border-2 border-amber-600/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-5 sm:p-6 text-stone-200 overflow-y-auto max-h-[85vh] font-sans overscroll-contain pointer-events-auto touch-pan-y"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              id="btn-close-vigilance-top"
              onClick={() => setIsVigilanceModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/80 transition-colors cursor-pointer z-20 shadow-md"
              title="Close [Esc]"
              aria-label="Close vigilance modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-stone-800 pb-4 mb-5">
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-400">
                <Mountain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-wide text-amber-100 uppercase">
                  Apache Lore & Peak Vigilance
                </h2>
                <p className="text-xs text-stone-400">
                  Surveillance of the Sacred Superstitions & Mountain Guardian Wrath
                </p>
              </div>
            </div>

            {/* Current Threat Level Banner */}
            {vigilanceStatus && (
              <div className="space-y-4 mb-6">
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                    vigilanceStatus.level === 'wrathful'
                      ? 'bg-red-950/70 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : vigilanceStatus.level === 'hostile'
                      ? 'bg-rose-950/60 border-rose-600/70'
                      : vigilanceStatus.level === 'alert'
                      ? 'bg-orange-950/50 border-orange-600/60'
                      : vigilanceStatus.level === 'watchful'
                      ? 'bg-amber-950/40 border-amber-600/50'
                      : 'bg-stone-900/60 border-stone-700/60'
                  }`}
                >
                  <div>
                    <div className="text-[11px] font-mono font-semibold tracking-wider text-stone-400 uppercase">
                      Current Mountain Threat Level
                    </div>
                    <div
                      className={`text-base font-bold tracking-wide mt-0.5 ${
                        vigilanceStatus.level === 'wrathful'
                          ? 'text-red-300'
                          : vigilanceStatus.level === 'hostile'
                          ? 'text-rose-300'
                          : vigilanceStatus.level === 'alert'
                          ? 'text-orange-300'
                          : vigilanceStatus.level === 'watchful'
                          ? 'text-amber-300'
                          : 'text-stone-300'
                      }`}
                    >
                      {vigilanceStatus.level === 'wrathful'
                        ? '⚡ WRATH OF THE SACRED PEAKS'
                        : vigilanceStatus.level === 'hostile'
                        ? '🏹 WAR PARTY MOBILIZING'
                        : vigilanceStatus.level === 'alert'
                        ? '🔥 ALERT SENTINEL RIDGES'
                        : vigilanceStatus.level === 'watchful'
                        ? '👁️ WATCHFUL EYES ON HIGH CRAGS'
                        : '🌲 DORMANT / DRIFTING PEACE'}
                    </div>
                    <p className="text-xs text-stone-300 mt-1 max-w-md">
                      {vigilanceStatus.description}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black font-mono text-amber-400">
                      {vigilanceStatus.value}%
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">Peak Vigilance</div>
                  </div>
                </div>

                {/* Progress Bar with Notches */}
                <div className="space-y-1.5">
                  <div className="relative w-full bg-stone-900 h-3 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        vigilanceStatus.level === 'wrathful'
                          ? 'bg-gradient-to-r from-orange-600 via-rose-600 to-red-600'
                          : vigilanceStatus.level === 'hostile'
                          ? 'bg-gradient-to-r from-amber-600 to-rose-600'
                          : vigilanceStatus.level === 'alert'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : vigilanceStatus.level === 'watchful'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, vigilanceStatus.value)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-stone-400 px-1">
                    <span>DORMANT (0-20%)</span>
                    <span>WATCHFUL (20%)</span>
                    <span>ALERT (40%)</span>
                    <span>HOSTILE (65%)</span>
                    <span className="text-red-400">WRATH (85%+)</span>
                  </div>
                </div>

                {/* Active Signs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center gap-3">
                    <Wind className={`w-5 h-5 ${vigilanceStatus.activeSmokeSignals ? 'text-amber-400 animate-pulse' : 'text-stone-500'}`} />
                    <div>
                      <div className="text-xs font-semibold text-stone-200">Smoke Signals</div>
                      <div className="text-[11px] text-stone-400">
                        {vigilanceStatus.activeSmokeSignals
                          ? 'Active puffs rising from Weaver’s Needle & Peralta Rim'
                          : 'No active smoke telegraphs detected on ridgelines'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${vigilanceStatus.activeZone ? 'text-red-400 animate-bounce' : 'text-stone-500'}`} />
                    <div>
                      <div className="text-xs font-semibold text-stone-200">Sacred Territory</div>
                      <div className="text-[11px] text-stone-400">
                        {vigilanceStatus.activeZone
                          ? `Inside ${vigilanceStatus.activeZone.name} (${vigilanceStatus.activeZone.desecrationMultiplier}x Desecration Heat)`
                          : 'Operating outside designated sacred sanctuary perimeters'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sacred Grounds Reference */}
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-300">
                Sacred Mountain Grounds & Desecration Multipliers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SACRED_ZONES.map((zone) => {
                  const isPlayerInside = vigilanceStatus?.activeZone?.name === zone.name;
                  return (
                    <div
                      key={zone.name}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isPlayerInside
                          ? 'bg-amber-950/60 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-stone-900/40 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className={`font-semibold ${isPlayerInside ? 'text-amber-200' : 'text-stone-300'}`}>
                            {zone.name}
                          </span>
                          <span className="text-[10px] text-stone-400 block font-serif italic">
                            "{zone.nativeName}"
                          </span>
                        </div>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-amber-400 font-bold self-start">
                          {zone.desecrationMultiplier}x Heat
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-snug mt-1">
                        {zone.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prospector Cause & Effect Lore */}
            <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800 text-xs text-stone-300 space-y-2">
              <div className="font-bold text-amber-200 font-mono text-[11px] uppercase tracking-wider">
                Historical Lore of the Superstition Apache
              </div>
              <p className="leading-relaxed text-[11px] text-stone-300">
                To the Tonto Apache, the Superstition Mountains were the sacred home of the Thunder God and sacred ancestral spirits. Digging for gold or blasting rock with black powder was considered a severe violation of the earth. When Mexican mining expeditions (the Peralta family in 1848) and foreign prospectors entered to extract wealth, the Apache defended the range, destroyed timber shafts, and collapsed mine portals under stone avalanches to return the mountains to peace.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-mono">
                <div className="bg-stone-950/60 p-2 rounded border border-stone-800">
                  <span className="text-red-400 font-bold">💥 Dynamite Blasting:</span>
                  <p className="text-stone-400 mt-0.5">+16 to 35 Vigilance. Rattles canyon walls for miles.</p>
                </div>
                <div className="bg-stone-950/60 p-2 rounded border border-stone-800">
                  <span className="text-amber-400 font-bold">⛏️ Excavation & Sinking:</span>
                  <p className="text-stone-400 mt-0.5">Digging inside sacred zones steadily escalates alert.</p>
                </div>
                <div className="bg-stone-950/60 p-2 rounded border border-stone-800">
                  <span className="text-orange-400 font-bold">🏗️ Industrial Timbers:</span>
                  <p className="text-stone-400 mt-0.5">Building mine portals permanently agitates lookouts.</p>
                </div>
                <div className="bg-stone-950/60 p-2 rounded border border-stone-800">
                  <span className="text-emerald-400 font-bold">🏕️ Tortilla Flat Sanctuary:</span>
                  <p className="text-stone-400 mt-0.5">Vigilance steadily cools down while resting in town.</p>
                </div>
              </div>
            </div>

            {/* Bottom Dismiss / Return to Frontier Button */}
            <div className="mt-5 pt-3 border-t border-stone-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-mono">
                Click anywhere outside or press [Esc] to close
              </span>
              <button
                id="btn-close-vigilance-footer"
                onClick={() => setIsVigilanceModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs font-mono tracking-wider uppercase transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>Close Lore</span>
                <span className="text-[10px] bg-stone-950/40 text-stone-950 px-1.5 py-0.5 rounded font-mono font-bold">
                  [Esc]
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Mobile Virtual Controls (Joystick & Action Buttons) */}
      {showTouchControls && (
        <div className="pointer-events-none fixed inset-0 z-25">
          {/* Virtual Movement Joystick on bottom-left with safe-area spacing */}
          {onMobileMove && (
            <div
              className="absolute pointer-events-auto select-none"
              style={{
                left: 'max(1.25rem, env(safe-area-inset-left))',
                bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
              }}
            >
              <VirtualJoystick onMove={onMobileMove} />
            </div>
          )}

          {/* Action, Jump & Interact Touch Buttons on bottom-right - horizontal cluster in landscape! */}
          <div
            className="absolute flex flex-col landscape:flex-row items-end landscape:items-end gap-2.5 sm:gap-3 pointer-events-auto select-none"
            style={{
              right: 'max(1.25rem, env(safe-area-inset-right))',
              bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Mobile Interact / Use Button */}
            {(onMobileInteract || onInteract) && (
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onMobileInteract) onMobileInteract();
                  else if (onInteract) onInteract();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMobileInteract) onMobileInteract();
                  else if (onInteract) onInteract();
                }}
                className={`w-13 h-13 landscape:w-12 landscape:h-12 rounded-full border-2 shadow-xl backdrop-blur-md flex flex-col items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  interactionPrompt
                    ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.9)] animate-pulse'
                    : 'bg-stone-900/85 text-stone-200 border-stone-600 active:bg-amber-600/90 active:border-amber-300'
                }`}
                title="Interact / Examine / Enter [E]"
                aria-label="Interact"
              >
                <span className="text-base leading-none">✋</span>
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase mt-0.5">USE [E]</span>
              </button>
            )}

            {/* Mobile Mount / Dismount button */}
            {playerState.ownedMount && onToggleMount && (
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleMount();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMount();
                }}
                className={`w-13 h-13 landscape:w-12 landscape:h-12 rounded-full border-2 shadow-xl backdrop-blur-md flex flex-col items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  playerState.isRidingMount
                    ? 'bg-amber-600 border-amber-300 text-stone-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                    : 'bg-stone-900/85 border-amber-500/70 text-amber-200'
                }`}
                title="Mount / Dismount [M]"
                aria-label="Mount or Dismount"
              >
                <span className="text-base leading-none">
                  {playerState.ownedMount === 'burro' ? '🫏' : '🐎'}
                </span>
                <span className="text-[8px] font-mono font-bold tracking-wider uppercase mt-0.5">
                  {playerState.isRidingMount ? 'DISMOUNT' : 'MOUNT'}
                </span>
              </button>
            )}

            {/* Mobile Jump Button */}
            {onMobileJump && (
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMobileJump();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMobileJump();
                }}
                className="w-13 h-13 landscape:w-12 landscape:h-12 rounded-full bg-stone-900/85 active:bg-amber-600/90 border-2 border-stone-600 active:border-amber-300 shadow-xl backdrop-blur-md flex flex-col items-center justify-center text-stone-200 active:text-stone-950 transition-all active:scale-95 touch-manipulation cursor-pointer"
                title="Jump [Space]"
                aria-label="Jump"
              >
                <span className="text-base leading-none">⬆️</span>
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase mt-0.5">JUMP</span>
              </button>
            )}

            {/* Mobile Rifle Scope Toggle Button */}
            {playerState.equippedTool === 'rifle' && onToggleAimRifle && (
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleAimRifle();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAimRifle();
                }}
                className={`w-14 h-14 rounded-full ${
                  isAimingRifle
                    ? 'bg-amber-500 text-stone-950 border-2 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.9)]'
                    : 'bg-stone-900/90 text-amber-300 border-2 border-amber-600/70'
                } backdrop-blur-md flex flex-col items-center justify-center transition-all active:scale-90 touch-manipulation cursor-pointer font-bold`}
                title="Toggle Malcolm Scope [V / Right-Click]"
                aria-label="Scope Toggle"
              >
                <Crosshair className="w-5 h-5" />
                <span className="text-[9px] font-mono tracking-tighter">
                  {isAimingRifle ? (scopeZoom ? `${scopeZoom.toFixed(1)}X` : 'LOWER') : 'SCOPE'}
                </span>
              </button>
            )}

            {/* Primary Action Button (Dig / Mine / Shoot / Chop / Throw / Use) */}
            {onMobileAction && (
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMobileAction();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMobileAction();
                }}
                className="w-16 h-16 landscape:w-15 landscape:h-15 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 active:from-amber-400 active:to-amber-200 border-2 border-amber-200 text-stone-950 shadow-[0_0_25px_rgba(245,158,11,0.7)] backdrop-blur-md flex flex-col items-center justify-center transition-all active:scale-90 touch-manipulation cursor-pointer font-black"
                title={`Use ${playerState.equippedTool} [Action]`}
                aria-label="Action"
              >
                <span className="text-xl leading-none">
                  {playerState.carriedObject
                    ? '💨'
                    : playerState.equippedTool === 'shovel'
                    ? '⛏️'
                    : playerState.equippedTool === 'pickaxe'
                    ? '⛏️'
                    : playerState.equippedTool === 'axe'
                    ? '🪓'
                    : playerState.equippedTool === 'rifle'
                    ? '🎯'
                    : playerState.equippedTool === 'dynamite'
                    ? '🧨'
                    : playerState.equippedTool === 'hands'
                    ? '✋'
                    : '⚡'}
                </span>
                <span className="text-[10px] font-mono tracking-wider uppercase mt-0.5">
                  {playerState.carriedObject
                    ? 'THROW'
                    : playerState.equippedTool === 'shovel'
                    ? 'DIG'
                    : playerState.equippedTool === 'pickaxe'
                    ? 'MINE'
                    : playerState.equippedTool === 'axe'
                    ? 'CHOP'
                    : playerState.equippedTool === 'rifle'
                    ? 'FIRE'
                    : playerState.equippedTool === 'dynamite'
                    ? 'IGNITE'
                    : playerState.equippedTool === 'hands'
                    ? 'LIFT'
                    : 'USE'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
