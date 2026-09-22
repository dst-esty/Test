import React from 'react';
import { Compass, Sun, Moon, MapPin, Flame, Mountain, Globe, Eye } from 'lucide-react';
import { getUsgsElevation, formatUsgsDistance, WorldScaleMode, getFourPeaksSightlineStatus } from '../world/superstitionTopography';

interface CompassHUDProps {
  yaw: number; // in radians
  timeOfDay: number;
  nearestLandmarkName?: string;
  nearestLandmarkDist?: number;
  hydration: number;
  goldFound: number;
  isInsideMine: boolean;
  onToggleDayNight?: () => void;
  playerCoords?: { x: number; y?: number; z: number };
  worldScaleMode?: WorldScaleMode;
  onToggleWorldScaleMode?: () => void;
}

export const CompassHUD: React.FC<CompassHUDProps> = ({
  yaw,
  timeOfDay,
  nearestLandmarkName,
  nearestLandmarkDist,
  hydration,
  goldFound,
  isInsideMine,
  onToggleDayNight,
  playerCoords,
  worldScaleMode = '1:1',
  onToggleWorldScaleMode,
}) => {
  // Convert yaw to degrees (0 to 360)
  const deg = Math.round(((-yaw * 180) / Math.PI + 360) % 360);

  const getCardinal = (angle: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(angle / 45) % 8;
    return directions[index];
  };

  // Format time of day
  const hour = Math.floor(timeOfDay);
  const minute = Math.floor((timeOfDay - hour) * 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const isNight = timeOfDay < 5.2 || timeOfDay > 20.2;
  const isSunset = timeOfDay >= 17.5 && timeOfDay <= 20.2;

  // Dynamic Four Peaks sightline calculations based on player position
  const sightline = playerCoords && !isInsideMine
    ? getFourPeaksSightlineStatus(playerCoords.x, playerCoords.z)
    : null;
  const isLookingNorth = deg >= 340 || deg <= 20;

  return (
    <div className="pointer-events-none absolute top-3 left-0 right-0 z-20 flex flex-col items-center select-none px-4">
      {/* Top Banner: Compass Tape & Info */}
      <div className="flex items-center gap-3 bg-stone-900/85 backdrop-blur-md text-amber-100 border border-amber-800/60 rounded-full px-5 py-2 shadow-xl">
        {/* Compass Cardinal & Degree */}
        <div className="flex items-center gap-2 border-r border-amber-800/60 pr-4">
          <Compass className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-serif font-bold text-lg text-amber-200 tracking-wider">
            {getCardinal(deg)}
          </span>
          <span className="text-xs font-mono text-amber-400/80">
            {deg}°
          </span>
        </div>

        {/* Time of Day (Interactive Day/Night & Festive Town Illumination toggle) */}
        <button
          id="hud-time-toggle-btn"
          type="button"
          onClick={onToggleDayNight}
          title="Toggle Day/Night Cycle [N] — Tortilla Flat illuminates with torches and festive string lights at night"
          className="pointer-events-auto flex items-center gap-1.5 border-r border-amber-800/60 pr-4 text-xs font-mono hover:text-amber-300 hover:bg-stone-800/60 px-2 py-1 -my-1 rounded-full transition-all cursor-pointer group"
        >
          {isNight ? (
            <Moon className="w-4 h-4 text-sky-300 group-hover:rotate-12 transition-transform" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
          )}
          <span className="font-semibold">{timeStr}</span>
          <span className="text-amber-500/70 text-[10px] hidden sm:inline">
            {isNight ? 'NIGHT' : isSunset ? 'SUNSET' : timeOfDay >= 12 ? 'AFTERNOON' : 'MORNING'}
          </span>
          {isNight && (
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/50 text-[9px] font-sans tracking-wide">
              <Flame className="w-2.5 h-2.5 text-amber-400" />
              TOWN LIT
            </span>
          )}
          <kbd className="hidden lg:inline-block ml-1 px-1 py-0.2 text-[9px] bg-stone-800/90 text-amber-400/70 rounded border border-stone-700">
            N
          </kbd>
        </button>

        {/* Nearest Landmark */}
        {nearestLandmarkName && (
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[130px] sm:max-w-[180px] truncate text-stone-200">
              {nearestLandmarkName}
            </span>
            {nearestLandmarkDist !== undefined && (
              <span className="text-amber-400/90 font-mono text-[11px]" title={`Distance in ${worldScaleMode === '1:1' ? '1:1 USGS Scale' : 'Compact Scale'}`}>
                ({formatUsgsDistance(nearestLandmarkDist, worldScaleMode).formatted})
              </span>
            )}
          </div>
        )}

        {/* 1:1 Scale Mode Switcher Badge */}
        {onToggleWorldScaleMode && (
          <button
            type="button"
            onClick={onToggleWorldScaleMode}
            className="pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide transition-all cursor-pointer border shadow-sm bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border-amber-600/50"
            title={`Active: ${worldScaleMode === '1:1' ? '1:1 True USGS Quadrangle Scale (Real Kilometers)' : 'Compact Exploration Scale'}. Click to toggle scale mode.`}
          >
            <Globe className="w-3 h-3 text-amber-400" />
            <span>{worldScaleMode === '1:1' ? '1:1 USGS' : 'Compact'}</span>
          </button>
        )}

        {/* Global Coordinates & Endless Territory Indicator */}
        {playerCoords && (
          <div className="hidden sm:flex items-center gap-2 border-l border-amber-800/60 pl-3 text-xs font-mono text-amber-300/80">
            <span>
              {Math.round(playerCoords.x)}X, {Math.round(playerCoords.z)}Z
            </span>
            {/* Real-world USGS Calibrated Elevation Altimeter */}
            <span
              className="flex items-center gap-1 text-amber-200/90 font-mono bg-stone-800/70 px-1.5 py-0.5 rounded border border-amber-700/40"
              title="USGS Topographic Elevation Benchmark"
            >
              <Mountain className="w-3 h-3 text-amber-400" />
              <span className="font-semibold text-amber-300">
                {getUsgsElevation(playerCoords.y ?? 0, playerCoords.x, playerCoords.z).feet.toLocaleString()} ft
              </span>
              <span className="text-[10px] text-amber-500/70 hidden md:inline">
                ({getUsgsElevation(playerCoords.y ?? 0, playerCoords.x, playerCoords.z).meters}m)
              </span>
            </span>
            {Math.hypot(playerCoords.x, playerCoords.z) > 340 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 text-[9px] border border-amber-600/50 uppercase tracking-wider font-sans font-semibold">
                Endless Frontier
              </span>
            )}
          </div>
        )}

        {isInsideMine && (
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider bg-amber-900/50 px-2 py-0.5 rounded border border-amber-600/40">
            Inside Dutchman Shaft
          </span>
        )}
      </div>

      {/* Subtle compass ribbon underneath */}
      <div className="mt-1 w-64 h-5 overflow-hidden relative flex justify-center items-center bg-stone-950/60 border border-amber-900/40 rounded-full px-2 shadow-inner opacity-85">
        <div
          className="flex whitespace-nowrap text-[10px] font-mono text-amber-300/80 transition-transform duration-75 ease-out"
          style={{ transform: `translateX(${-172 - deg * 1.6}px)` }}
        >
          {Array.from({ length: 49 }).map((_, i) => {
            const angle = -180 + i * 15;
            const norm = ((angle % 360) + 360) % 360;
            const isCardinal = norm % 90 === 0;
            const isInter = norm % 45 === 0 && !isCardinal;
            const cardinalLabel = norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : isInter ? (norm === 45 ? 'NE' : norm === 135 ? 'SE' : norm === 225 ? 'SW' : 'NW') : '';
            return (
              <span key={i} className="inline-flex items-center justify-center w-[24px] text-center shrink-0">
                {isCardinal ? (
                  <strong className="text-amber-200 font-bold text-[11px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{cardinalLabel}</strong>
                ) : isInter ? (
                  <span className="text-amber-400/90 font-semibold text-[9px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{cardinalLabel}</span>
                ) : (
                  <span className="text-stone-500/80 text-[10px]">|</span>
                )}
              </span>
            );
          })}
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-10" />
      </div>

      {/* Dynamic Four Peaks Sightline & Alignment Status */}
      {sightline && (isLookingNorth || sightline.isAlignedAsOne) && (
        <div className="mt-1.5 flex items-center gap-2">
          {sightline.isAlignedAsOne ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/95 text-amber-200 border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-[11px] font-serif font-bold tracking-wide animate-pulse">
              <span className="text-amber-400">✦</span>
              <span>FOUR PEAKS ALIGNED AS ONE</span>
              <span className="text-[9px] font-mono text-amber-300 bg-stone-900/90 px-1.5 py-0.2 rounded border border-amber-600/50">
                Waltz Dutchman Transit
              </span>
            </div>
          ) : isLookingNorth ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900/85 backdrop-blur-sm text-stone-300 border border-amber-900/50 text-[10px] font-mono shadow-sm">
              <Mountain className="w-3 h-3 text-amber-400" />
              <span className="text-amber-200 font-semibold">Four Peaks:</span>
              <span className="text-stone-300">{sightline.spreadDeg.toFixed(1)}° crown</span>
              <span className="text-stone-500">|</span>
              <span className="text-amber-400/90">
                Transit: {sightline.perpDistanceM < 150 ? `${Math.round(sightline.perpDistanceM)}m away` : `${(sightline.perpDistanceM / 1000).toFixed(1)}km`}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
