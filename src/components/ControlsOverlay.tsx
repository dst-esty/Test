import React, { useState, useEffect } from 'react';
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
  Volume2,
  VolumeX,
  Eye,
  Droplets,
  Coins,
  Sun,
  Moon,
  Clock,
  Cloud,
  CloudLightning,
  CloudSun,
  Play,
  Pause,
  SlidersHorizontal,
  Hammer,
  RotateCw,
  Award,
  Box,
  ShieldAlert,
  Shovel,
  Music,
  SkipForward,
  DollarSign,
  Layers,
  TreePine,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react';
import { MineStructureType, PlayerState, WeatherType } from '../types';
import { STRUCTURE_BLUEPRINTS } from '../world/mineBuilding';
import { westernMusic, WESTERN_TRACKS } from '../audio/westernMusic';
import { InventoryModal } from './InventoryModal';

interface ControlsOverlayProps {
  playerState: PlayerState;
  onSelectTool: (tool: PlayerState['equippedTool']) => void;
  onOpenMap: () => void;
  onOpenJournal: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
  onToggleCamera: () => void;
  viewMode: 'first' | 'third';
  timeOfDay: number;
  onSetTimeOfDay: (hour: number) => void;
  weather: WeatherType;
  onSetWeather: (w: WeatherType) => void;
  autoCycleTime: boolean;
  onToggleAutoCycleTime: () => void;
  onDig?: () => void;
  interactionPrompt?: string;
  onInteract?: () => void;
  onMineDeposit?: () => void;
  canMine?: boolean;
  damageFlash?: boolean;
  hitMarker?: boolean;
  bannerMessage?: string | null;
  onOpenBuilder?: () => void;
  onOpenClaimDeed?: () => void;
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
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  playerState,
  onSelectTool,
  onOpenMap,
  onOpenJournal,
  onToggleSound,
  soundEnabled,
  onToggleCamera,
  viewMode,
  timeOfDay,
  onSetTimeOfDay,
  weather,
  onSetWeather,
  autoCycleTime,
  onToggleAutoCycleTime,
  onDig,
  interactionPrompt,
  onInteract,
  onMineDeposit,
  canMine,
  damageFlash,
  hitMarker,
  bannerMessage,
  onOpenBuilder,
  onOpenClaimDeed,
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
}) => {
  const [showAtmospherePanel, setShowAtmospherePanel] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(westernMusic.getIsPlaying());
  const [currentTrack, setCurrentTrack] = useState(westernMusic.getCurrentTrack());
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isExcavationPanelCollapsed, setIsExcavationPanelCollapsed] = useState(true);
  const [isTrenchPanelCollapsed, setIsTrenchPanelCollapsed] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        setIsInventoryOpen((prev) => !prev);
      } else if (e.code === 'Escape' && isInventoryOpen) {
        setIsInventoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInventoryOpen]);

  useEffect(() => {
    return westernMusic.subscribe(() => {
      setMusicPlaying(westernMusic.getIsPlaying());
      setCurrentTrack(westernMusic.getCurrentTrack());
    });
  }, []);

  const tools: { id: PlayerState['equippedTool']; label: string; icon: React.ReactNode; key: string }[] = [
    { id: 'compass', label: 'Compass', icon: <Compass className="w-4 h-4" />, key: '1' },
    { id: 'lantern', label: 'Lantern', icon: <Flashlight className="w-4 h-4" />, key: '2' },
    { id: 'shovel', label: 'Spade Shovel', icon: <Shovel className="w-4 h-4" />, key: '3' },
    { id: 'pickaxe', label: 'Rock Pickaxe', icon: <Pickaxe className="w-4 h-4" />, key: '4' },
    { id: 'rifle', label: 'Rifle', icon: <Crosshair className="w-4 h-4" />, key: '5' },
    { id: 'dynamite', label: 'Dynamite', icon: <Flame className="w-4 h-4" />, key: '6' },
    { id: 'detector', label: 'Detector', icon: <Radio className="w-4 h-4" />, key: '7' },
    { id: 'binoculars', label: 'Field Glass', icon: <Search className="w-4 h-4" />, key: '8' },
    { id: 'stake', label: 'Claim Stake', icon: <Flag className="w-4 h-4" />, key: '9' },
    { id: 'builder', label: 'Mine Builder', icon: <Hammer className="w-4 h-4" />, key: '0' },
  ];

  const weatherOptions: { id: WeatherType; label: string; icon: React.ReactNode }[] = [
    { id: 'clear', label: 'Clear Sky', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'clouds', label: 'Clouds', icon: <Cloud className="w-3.5 h-3.5" /> },
    { id: 'sunset', label: 'Golden Hour', icon: <CloudSun className="w-3.5 h-3.5" /> },
    { id: 'storm', label: 'Monsoon Storm', icon: <CloudLightning className="w-3.5 h-3.5" /> },
    { id: 'night', label: 'Starry Night', icon: <Moon className="w-3.5 h-3.5" /> },
  ];

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    const mStr = m < 10 ? `0${m}` : `${m}`;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${mStr} ${period}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none z-20">
      {/* Damage Flash Red Vignette */}
      {damageFlash && (
        <div className="absolute inset-0 bg-red-600/30 pointer-events-none transition-opacity duration-150 animate-pulse border-8 border-red-600" />
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

      {/* Top Left: Player Survival & Mine Statistics */}
      <div className="pointer-events-auto flex flex-col gap-2 max-w-sm">
        {/* Sleek Compact Vitals & Inventory Pill Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Streamlined Health & Hydration Pill */}
          <div className="flex items-center gap-2.5 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-700/60 shadow-lg text-[10px] font-mono">
            {/* Health */}
            <div className="flex items-center gap-1.5" title={`Health: ${Math.round(playerState.health)}%`}>
              <Heart
                className={`w-3.5 h-3.5 ${
                  playerState.health < 30 ? 'text-red-500 animate-ping' : 'text-red-400'
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
            </div>

            <div className="w-px h-3 bg-stone-700/60" />

            {/* Hydration */}
            <div className="flex items-center gap-1.5" title={`Hydration: ${Math.round(playerState.hydration)}%`}>
              <Droplets
                className={`w-3.5 h-3.5 ${
                  playerState.hydration < 25 ? 'text-sky-400 animate-bounce' : 'text-sky-400'
                }`}
              />
              <div className="w-12 bg-stone-800 h-2 rounded-full overflow-hidden border border-stone-700/50">
                <div
                  className={`h-full transition-all duration-300 ${
                    playerState.hydration < 25
                      ? 'bg-red-500'
                      : playerState.hydration < 50
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                  }`}
                  style={{ width: `${playerState.hydration}%` }}
                />
              </div>
              <span className="text-stone-300">{Math.round(playerState.hydration)}%</span>
            </div>
          </div>

          {/* Minimizable Inventory & Supplies Trigger Tab */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsInventoryOpen(true)}
              className="flex items-center gap-2 bg-stone-900/90 hover:bg-stone-850 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-600/50 hover:border-amber-400 text-stone-200 shadow-lg text-xs font-mono transition-all group cursor-pointer"
              title="Open Expedition Saddlebag & Supplies [Press I or Tab]"
            >
              <Box className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-amber-300">Inventory [I]</span>
              <div className="w-px h-3 bg-stone-700/60" />
              <span className="text-emerald-400 font-semibold">${(playerState.cashDollars || 0).toFixed(2)}</span>
              <span className="text-amber-300 font-semibold">
                {(typeof playerState.goldFound === 'number' && !isNaN(playerState.goldFound) ? playerState.goldFound : 0).toFixed(1)} oz
              </span>
              <span className="text-stone-400 text-[10px]">🪵 {playerState.woodPlanks || 0}</span>
              <span className="text-stone-400 text-[10px]">🪨 {playerState.blocksDug || 0}</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400/80 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {onRedeemAllGold && (playerState.goldFound || 0) > 0.05 && (
              <button
                onClick={onRedeemAllGold}
                className="px-2 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-full text-[10px] font-mono shadow transition-colors flex items-center gap-1 cursor-pointer"
                title="Sell all raw gold ore to frontier assayer ($20.67/oz standard)"
              >
                <Coins className="w-3 h-3" />
                <span>Cash Out</span>
              </button>
            )}
          </div>
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

                {nearbyTrench.depth >= 0.8 && onInteract && (
                  <button
                    onClick={onInteract}
                    className="mt-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[10px] rounded-lg shadow font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full border border-amber-300"
                  >
                    <span>⛏️ Enter Subterranean Mine Shaft [E]</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Claim Status Badge */}
        <div className="flex items-center gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-700/50 text-amber-200 text-xs font-mono shadow-md w-fit">
          <Flag className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {playerState.activeClaim?.isClaimed
              ? `Claim: ${playerState.activeClaim.name}`
              : 'Claim: Unstaked'}
          </span>
          {playerState.activeClaim?.isClaimed && onOpenClaimDeed ? (
            <button
              onClick={onOpenClaimDeed}
              className="ml-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-sans font-bold text-[10px] rounded shadow transition-colors flex items-center gap-1"
            >
              <Award className="w-3 h-3" />
              Deed
            </button>
          ) : (
            <button
              onClick={() => onSelectTool('stake')}
              className="ml-1 px-1.5 py-0.5 bg-stone-800 hover:bg-amber-900/60 text-amber-300 font-sans text-[10px] rounded border border-amber-800/40"
            >
              Stake Now
            </button>
          )}
        </div>
      </div>

      {/* Top Right: Atmosphere / Weather Control Toggle & Weapons */}
      <div className="pointer-events-auto absolute top-12 sm:top-4 right-3 sm:right-5 flex flex-col items-end gap-2 z-30">
        {/* Toggle Atmosphere Bar */}
        <button
          onClick={() => setShowAtmospherePanel((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition shadow-lg backdrop-blur-md text-xs font-mono ${
            showAtmospherePanel
              ? 'bg-amber-600 text-stone-950 font-bold border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'bg-stone-900/85 text-stone-300 hover:text-white border-stone-700/60'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span>Sky & Weather ({formatTime(timeOfDay)})</span>
        </button>

        {/* Expanded Atmosphere & Sun Dial Panel */}
        {showAtmospherePanel && (
          <div className="flex flex-col gap-2.5 bg-stone-950/95 backdrop-blur-xl p-3.5 rounded-2xl border border-amber-600/50 shadow-2xl w-72 text-stone-200 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                Time: {formatTime(timeOfDay)}
              </span>
              <button
                onClick={onToggleAutoCycleTime}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition ${
                  autoCycleTime
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {autoCycleTime ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{autoCycleTime ? 'Cycle Active' : 'Auto Cycle'}</span>
              </button>
            </div>

            {/* Sun Time Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>Dawn (6:00)</span>
                <span className="text-amber-300 font-bold">4 PM Legend</span>
                <span>Dusk (19:30)</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.25"
                value={timeOfDay}
                onChange={(e) => onSetTimeOfDay(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-800 rounded-lg appearance-none"
              />
            </div>

            {/* Weather Mode Buttons */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-stone-400 font-mono">ATMOSPHERIC WEATHER:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {weatherOptions.map((w) => {
                  const isActive = weather === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => onSetWeather(w.id)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] font-mono transition ${
                        isActive
                          ? 'bg-amber-600/80 text-white font-bold border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800 border-stone-800'
                      }`}
                    >
                      {w.icon}
                      <span className="truncate">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick 4 PM needle legend preset */}
            <button
              onClick={() => {
                onSetTimeOfDay(16.0);
                onSetWeather('sunset');
              }}
              className="w-full py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-600/50 rounded-xl text-[10px] font-mono tracking-wide transition text-center"
            >
              ⛰️ 4:00 PM Needle Shadow Alignment
            </button>

            {/* Browser Graphics Hardware Acceleration Status */}
            <div className="pt-2 border-t border-stone-800 flex flex-col gap-1 text-[10px] font-mono text-stone-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  GPU Hardware Acceleration
                </span>
                <span className="text-stone-300">WebGL2 Active</span>
              </div>
              <div className="flex justify-between text-[9px] text-stone-500">
                <span>Filtering: 16x Anisotropic</span>
                <span>Tone: ACES Filmic</span>
              </div>
            </div>
          </div>
        )}

        {/* Weapons Info */}
        {playerState.equippedTool === 'rifle' && (
          <div className="flex items-center gap-2.5 bg-stone-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-amber-600/70 text-amber-200 shadow-xl font-mono">
            <Crosshair className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-stone-400">WINCHESTER .44</span>
              <span className="text-sm font-bold text-amber-300">
                {playerState.ammo} <span className="text-[10px] font-normal text-stone-400">ROUNDS</span>
              </span>
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
      </div>

      {/* Center Interaction Prompt */}
      {interactionPrompt && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-12 pointer-events-auto flex flex-col items-center z-30">
          <button
            onClick={onInteract}
            className="flex items-center gap-2 bg-amber-500/95 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-full shadow-[0_0_25px_rgba(251,191,36,0.6)] backdrop-blur-sm border border-amber-300 transition transform hover:scale-105 active:scale-95 animate-pulse"
          >
            <span className="w-6 h-6 rounded-full bg-stone-900 text-amber-300 text-xs flex items-center justify-center font-mono">
              E
            </span>
            <span className="text-sm">{interactionPrompt}</span>
          </button>
        </div>
      )}

      {/* Center Crosshair for first person view */}
      {viewMode === 'first' && (
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
          ) : (
            <div className="w-2 h-2 rounded-full bg-amber-200/60 border border-amber-400/80 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
          )}
        </div>
      )}

      {/* Bottom Area: Tool Action Button + Bottom Bar */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Prominent Action Button for Spade Shovel Hole Digging! */}
        {playerState.equippedTool === 'shovel' && (
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              onClick={onDig}
              className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black px-6 py-3 rounded-full shadow-[0_0_28px_rgba(245,158,11,0.65)] border-2 border-amber-200 transition-all transform hover:scale-105 active:scale-95 text-xs sm:text-sm font-mono tracking-wider cursor-pointer"
            >
              <Shovel className="w-4 h-4 text-stone-950" />
              <span>DIG HOLE IN GROUND</span>
              <span className="text-[10px] bg-stone-950/70 text-amber-300 px-2 py-0.5 rounded-md font-mono">
                LEFT CLICK
              </span>
            </button>
          </div>
        )}

        {/* Prominent Action Button for Equipped Tool (Especially Pickaxe Digging!) */}
        {playerState.equippedTool === 'pickaxe' && (
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              onClick={onDig}
              className="flex items-center gap-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black px-6 py-3 rounded-full shadow-[0_0_28px_rgba(245,158,11,0.65)] border-2 border-amber-300 transition-all transform hover:scale-105 active:scale-95 text-xs sm:text-sm font-mono tracking-wider cursor-pointer"
            >
              <Pickaxe className="w-4 h-4 text-stone-950 fill-stone-950" />
              <span>⛏️ MINE ROCK / ORE VEIN</span>
              <span className="text-[10px] bg-stone-950/70 text-amber-300 px-2 py-0.5 rounded-md font-mono">
                LEFT CLICK
              </span>
            </button>
          </div>
        )}

        {/* Holographic Blueprint Builder Ribbon */}
        {playerState.equippedTool === 'builder' && (
          <div className="pointer-events-auto flex items-center gap-3 bg-stone-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)] text-xs">
            <div className="flex items-center gap-2">
              <Hammer className="w-4 h-4 text-amber-400" />
              <span className="text-stone-300">Blueprint:</span>
              <span className="font-bold text-amber-200">
                {STRUCTURE_BLUEPRINTS[activeBuildingType]?.name || 'Structure'}
              </span>
            </div>

            <button
              onClick={onRotateBlueprint}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg border border-amber-600/40 text-[11px]"
              title="Rotate structure 45 degrees"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate [R]</span>
            </button>

            {onOpenBuilder && (
              <button
                onClick={onOpenBuilder}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-[11px]"
              >
                Change Blueprint [B]
              </button>
            )}

            {onOpenRockDepot && (
              <button
                onClick={onOpenRockDepot}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-600/40 rounded-lg text-[11px] font-bold"
                title="Open Rock & Mining Supply Depot"
              >
                🛒 Buy Rocks
              </button>
            )}

            <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
              [Left-Click] {activeBuildingType === 'timber_portal' ? 'Excavate Portal / Build' : 'Place in 3D'}
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

        {/* Bottom Bar: Quick settings and Tool Rack */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none w-full">
          {/* Left Side: Time Presets & Camera toggle */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-stone-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-stone-700/60 shadow-lg">
            <button
              title="Sunrise (7:00)"
              onClick={() => onSetTimeOfDay(7.0)}
              className={`p-2 rounded-xl transition ${
                timeOfDay >= 6 && timeOfDay < 11
                  ? 'bg-amber-600/60 text-amber-200'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              title="4:00 PM Needle Shadow Alignment"
              onClick={() => {
                onSetTimeOfDay(16.0);
                onSetWeather('sunset');
              }}
              className={`p-2 rounded-xl transition ${
                timeOfDay >= 15 && timeOfDay < 18
                  ? 'bg-amber-600/60 text-amber-200'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              title="Monsoon Storm (Cloud & Lightning)"
              onClick={() => onSetWeather(weather === 'storm' ? 'clear' : 'storm')}
              className={`p-2 rounded-xl transition ${
                weather === 'storm'
                  ? 'bg-amber-600/60 text-amber-200'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <CloudLightning className="w-4 h-4" />
            </button>
            <button
              title="Desert Night (22:00)"
              onClick={() => onSetTimeOfDay(22.0)}
              className={`p-2 rounded-xl transition ${
                timeOfDay < 6 || timeOfDay >= 19
                  ? 'bg-amber-600/60 text-amber-200'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-stone-700 mx-0.5" />
            <button
              title={`Switch to ${viewMode === 'first' ? '3rd Person' : '1st Person'} View`}
              onClick={onToggleCamera}
              className="p-2 rounded-xl text-stone-300 hover:text-white transition flex items-center gap-1 text-xs"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden md:inline font-mono">{viewMode === 'first' ? '1P' : '3P'}</span>
            </button>
            <button
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
              onClick={onToggleSound}
              className="p-2 rounded-xl text-stone-300 hover:text-white transition"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-500" />
              )}
            </button>
            <div className="relative">
              <button
                title={musicPlaying ? `Western Soundtrack: ${currentTrack.title} (Playing)` : 'Play Western Soundtrack'}
                onClick={() => setShowMusicMenu((prev) => !prev)}
                className={`p-2 rounded-xl transition flex items-center gap-1.5 ${
                  musicPlaying
                    ? 'text-amber-300 bg-amber-950/60 border border-amber-600/60 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
                }`}
              >
                <Music className={`w-4 h-4 ${musicPlaying ? 'animate-bounce text-amber-400' : ''}`} />
                <span className="hidden lg:inline text-[11px] font-mono whitespace-nowrap">
                  {musicPlaying ? currentTrack.title : 'Western Music'}
                </span>
              </button>

              {/* Western Music Popover Menu */}
              {showMusicMenu && (
                <div className="absolute bottom-12 left-0 z-50 w-72 bg-stone-950/95 backdrop-blur-xl border-2 border-amber-800/80 rounded-2xl p-3.5 shadow-2xl text-stone-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                        Old West Soundtrack
                      </span>
                    </div>
                    <button
                      onClick={() => westernMusic.togglePlay()}
                      className={`p-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 ${
                        musicPlaying
                          ? 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                          : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                      }`}
                    >
                      {musicPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{musicPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {WESTERN_TRACKS.map((t) => {
                      const isCurr = t.id === currentTrack.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            westernMusic.switchTrack(t.id);
                            if (!westernMusic.getIsPlaying()) westernMusic.play();
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition flex flex-col ${
                            isCurr
                              ? 'bg-amber-900/60 border border-amber-600/70 text-amber-100 shadow-md'
                              : 'hover:bg-stone-800/80 text-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>{t.title}</span>
                            {isCurr && musicPlaying && (
                              <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                                Playing
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 mt-0.5">{t.subtitle}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-[11px] font-mono">
                    <button
                      onClick={() => westernMusic.nextTrack()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 transition"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Next Track</span>
                    </button>
                    <button
                      onClick={() => setShowMusicMenu(false)}
                      className="text-stone-400 hover:text-stone-200 px-2 py-1"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Tool Rack (1-7) */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-stone-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-stone-700/80 shadow-2xl overflow-x-auto max-w-full">
            {tools.map((t) => {
              const isSelected = playerState.equippedTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTool(t.id)}
                  className={`flex flex-col items-center px-2 sm:px-2.5 py-1.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-amber-600 text-stone-950 font-bold shadow-[0_0_12px_rgba(251,191,36,0.5)] scale-105'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                  }`}
                >
                  {t.icon}
                  <span className="text-[9px] sm:text-[10px] mt-0.5 font-mono whitespace-nowrap">
                    {t.label}
                  </span>
                  <span className="text-[8px] opacity-60 hidden sm:inline font-mono">[{t.key}]</span>
                </button>
              );
            })}
          </div>

          {/* Right Side: Build Mine, Map [M] and Journal [J] buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            {onOpenBuilder && (
              <button
                onClick={onOpenBuilder}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 px-3.5 py-2 rounded-xl shadow-lg border border-amber-300 transition backdrop-blur-md text-xs font-black tracking-wide transform hover:scale-105"
                title="Open Mine Construction & Staking Depot [B]"
              >
                <Hammer className="w-4 h-4 text-stone-950 fill-stone-950" />
                <span>Build Mine</span>
                <span className="text-[10px] bg-stone-950/20 text-stone-950 px-1.5 py-0.2 rounded font-mono hidden sm:inline">[B]</span>
              </button>
            )}

            <button
              onClick={onOpenMap}
              className="flex items-center gap-2 bg-stone-900/85 hover:bg-stone-800 text-amber-200 border border-amber-800/60 px-3.5 py-2 rounded-xl shadow-lg transition backdrop-blur-md text-xs font-bold"
            >
              <MapIcon className="w-4 h-4 text-amber-400" />
              <span>Map</span>
              <span className="text-[10px] text-amber-400/60 font-mono hidden sm:inline">[M]</span>
            </button>

            <button
              onClick={onOpenJournal}
              className="flex items-center gap-2 bg-stone-900/85 hover:bg-stone-800 text-amber-200 border border-amber-800/60 px-3.5 py-2 rounded-xl shadow-lg transition backdrop-blur-md text-xs font-bold"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Journal</span>
              <span className="text-[10px] text-amber-400/60 font-mono hidden sm:inline">[J]</span>
            </button>
          </div>
        </div>
      </div>

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
      />
    </div>
  );
};
