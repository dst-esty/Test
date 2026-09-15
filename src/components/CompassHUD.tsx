import React from 'react';
import { Compass, Sun, Moon, MapPin } from 'lucide-react';

interface CompassHUDProps {
  yaw: number; // in radians
  timeOfDay: number;
  nearestLandmarkName?: string;
  nearestLandmarkDist?: number;
  hydration: number;
  goldFound: number;
  isInsideMine: boolean;
}

export const CompassHUD: React.FC<CompassHUDProps> = ({
  yaw,
  timeOfDay,
  nearestLandmarkName,
  nearestLandmarkDist,
  hydration,
  goldFound,
  isInsideMine,
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
  const isNight = timeOfDay < 6 || timeOfDay > 18.5;

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

        {/* Time of Day */}
        <div className="flex items-center gap-1.5 border-r border-amber-800/60 pr-4 text-xs font-mono">
          {isNight ? (
            <Moon className="w-4 h-4 text-sky-300" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
          <span>{timeStr}</span>
          <span className="text-amber-500/70 text-[10px] hidden sm:inline">
            {isNight ? 'NIGHT' : timeOfDay > 15 ? 'AFTERNOON' : 'DAYLIGHT'}
          </span>
        </div>

        {/* Nearest Landmark */}
        {nearestLandmarkName && (
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[130px] sm:max-w-[200px] truncate text-stone-200">
              {nearestLandmarkName}
            </span>
            {nearestLandmarkDist !== undefined && (
              <span className="text-amber-400/90 font-mono text-[11px]">
                ({Math.round(nearestLandmarkDist)}m)
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
      <div className="mt-1 w-64 h-5 overflow-hidden relative flex justify-center items-center opacity-70">
        <div
          className="flex whitespace-nowrap text-[10px] font-mono text-amber-300/80 transition-transform duration-75"
          style={{ transform: `translateX(${-deg * 2 + 180}px)` }}
        >
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = i * 10;
            const isCardinal = angle % 90 === 0;
            const cardinalLabel = angle === 0 ? 'N' : angle === 90 ? 'E' : angle === 180 ? 'S' : angle === 270 ? 'W' : '';
            return (
              <span key={i} className="inline-block w-[20px] text-center">
                {isCardinal ? (
                  <strong className="text-amber-200 font-bold">{cardinalLabel}</strong>
                ) : (
                  <span className="text-stone-400">|</span>
                )}
              </span>
            );
          })}
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      </div>
    </div>
  );
};
