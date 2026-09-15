import React from 'react';
import {
  Compass,
  Flashlight,
  Search,
  Radio,
  Pickaxe,
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
  HelpCircle,
} from 'lucide-react';
import { PlayerState } from '../types';

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
  interactionPrompt?: string;
  onInteract?: () => void;
  onMineDeposit?: () => void;
  canMine?: boolean;
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
  interactionPrompt,
  onInteract,
  onMineDeposit,
  canMine,
}) => {
  const tools: { id: PlayerState['equippedTool']; label: string; icon: React.ReactNode; key: string }[] = [
    { id: 'compass', label: 'Compass', icon: <Compass className="w-5 h-5" />, key: '1' },
    { id: 'lantern', label: 'Lantern', icon: <Flashlight className="w-5 h-5" />, key: '2' },
    { id: 'binoculars', label: 'Binoculars', icon: <Search className="w-5 h-5" />, key: '3' },
    { id: 'detector', label: 'Detector', icon: <Radio className="w-5 h-5" />, key: '4' },
    { id: 'pickaxe', label: 'Pickaxe', icon: <Pickaxe className="w-5 h-5" />, key: '5' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Left: Hydration & Gold Stats */}
      <div className="pointer-events-auto flex flex-col gap-2 mt-12 sm:mt-2">
        {/* Hydration / Canteen */}
        <div className="flex items-center gap-2.5 bg-stone-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-stone-700/60 text-stone-200 shadow-lg w-fit">
          <Droplets
            className={`w-5 h-5 ${
              playerState.hydration < 25
                ? 'text-red-500 animate-bounce'
                : playerState.hydration < 50
                ? 'text-amber-400'
                : 'text-sky-400'
            }`}
          />
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[10px] font-mono gap-3">
              <span className="text-stone-400">CANTEEN WATER</span>
              <span className="font-bold text-sky-300">{Math.round(playerState.hydration)}%</span>
            </div>
            <div className="w-28 sm:w-36 h-2 bg-stone-800 rounded-full overflow-hidden mt-1 border border-stone-700">
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
          </div>
        </div>

        {/* Gold Pouch */}
        <div className="flex items-center gap-2.5 bg-stone-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-stone-700/60 text-stone-200 shadow-lg w-fit">
          <Coins className="w-5 h-5 text-amber-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-stone-400 font-mono">GOLD POUCH</span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {playerState.goldFound} oz
            </span>
          </div>
        </div>
      </div>

      {/* Center Prompt when near interactable */}
      {interactionPrompt && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-12 pointer-events-auto flex flex-col items-center">
          <button
            onClick={onInteract}
            className="flex items-center gap-2 bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.6)] backdrop-blur-sm border border-amber-300 transition transform hover:scale-105 active:scale-95 animate-pulse"
          >
            <span className="w-6 h-6 rounded-full bg-stone-900 text-amber-300 text-xs flex items-center justify-center font-mono">
              E
            </span>
            <span className="text-sm">{interactionPrompt}</span>
          </button>
        </div>
      )}

      {/* Mine deposit action when pickaxe is equipped and deposit is near */}
      {canMine && !interactionPrompt && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-12 pointer-events-auto">
          <button
            onClick={onMineDeposit}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-stone-950 font-bold px-5 py-2.5 rounded-full shadow-lg border border-yellow-300 transition"
          >
            <Pickaxe className="w-5 h-5 text-stone-900" />
            <span className="text-sm">Mine Gold Quartz [Space / Tap]</span>
          </button>
        </div>
      )}

      {/* Center Crosshair for first person view */}
      {viewMode === 'first' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-2 h-2 rounded-full bg-amber-200/50 border border-amber-400/80 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
      )}

      {/* Bottom Bar: Action buttons and Tool Rack */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none w-full">
        {/* Left Side: Time Presets & Camera toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-stone-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-stone-700/60 shadow-lg">
          <button
            title="Sunrise / Morning (7:00)"
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
            onClick={() => onSetTimeOfDay(16.0)}
            className={`p-2 rounded-xl transition ${
              timeOfDay >= 15 && timeOfDay < 18
                ? 'bg-amber-600/60 text-amber-200'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-4 h-4" />
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
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>
        </div>

        {/* Center: Tool Rack (1-5) */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-stone-700/80 shadow-2xl">
          {tools.map((t) => {
            const isSelected = playerState.equippedTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTool(t.id)}
                className={`flex flex-col items-center px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-amber-600 text-stone-950 font-bold shadow-[0_0_12px_rgba(251,191,36,0.5)] scale-105'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                }`}
              >
                {t.icon}
                <span className="text-[10px] mt-0.5 font-mono">{t.label}</span>
                <span className="text-[9px] opacity-60 hidden sm:inline font-mono">[{t.key}]</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Map [M] and Journal [J] buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onOpenMap}
            className="flex items-center gap-2 bg-stone-900/85 hover:bg-stone-800 text-amber-200 border border-amber-800/60 px-4 py-2.5 rounded-xl shadow-lg transition backdrop-blur-md text-xs font-bold"
          >
            <MapIcon className="w-4 h-4 text-amber-400" />
            <span>Map</span>
            <span className="text-[10px] text-amber-400/60 font-mono hidden sm:inline">[M]</span>
          </button>

          <button
            onClick={onOpenJournal}
            className="flex items-center gap-2 bg-stone-900/85 hover:bg-stone-800 text-amber-200 border border-amber-800/60 px-4 py-2.5 rounded-xl shadow-lg transition backdrop-blur-md text-xs font-bold"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Journal</span>
            <span className="text-[10px] text-amber-400/60 font-mono hidden sm:inline">[J]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
