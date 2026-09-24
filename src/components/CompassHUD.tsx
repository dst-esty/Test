import React, { useState, useEffect } from 'react';
import { Compass, Sun, Moon, MapPin, Flame, Mountain, Globe, Eye, Users, User, Navigation, Sparkles, Thermometer, Snowflake } from 'lucide-react';
import { getUsgsElevation, formatUsgsDistance, WorldScaleMode, getFourPeaksSightlineStatus } from '../world/superstitionTopography';
import { MultiplayerPlayer, WeatherType, SeasonType, SeasonInfo } from '../types';
import { getLunarPhaseInfo } from '../world/atmosphere';
import { desertTemperatureService } from '../services/desertTemperatureService';
import { seasonService } from '../services/seasonService';

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
  onlinePlayers?: MultiplayerPlayer[];
  selfName?: string;
  onTrackPlayer?: (p: MultiplayerPlayer) => void;
  onOpenMultiplayerModal?: () => void;
  lunarPhase?: number;
  onCycleLunarPhase?: () => void;
  weather?: WeatherType;
  temperatureF?: number;
  temperatureFeelsLikeF?: number;
  isInShade?: boolean;
  shadeReason?: string;
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
  onlinePlayers = [],
  selfName,
  onTrackPlayer,
  onOpenMultiplayerModal,
  lunarPhase = 0.5,
  onCycleLunarPhase,
  weather = 'clear',
  temperatureF,
  temperatureFeelsLikeF,
  isInShade,
  shadeReason,
}) => {
  // Convert yaw to degrees (0 to 360)
  const deg = Math.round(((-yaw * 180) / Math.PI + 360) % 360);
  const phaseInfo = getLunarPhaseInfo(lunarPhase);

  const [tempUnit, setTempUnit] = useState<'F' | 'C'>(() => desertTemperatureService.getUnit());
  const [season, setSeason] = useState<SeasonType>(() => seasonService.getSeason());
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo>(() => seasonService.getSeasonInfo());
  const [calendarDate, setCalendarDate] = useState<string>(() => seasonService.getFormattedDate());

  useEffect(() => {
    return desertTemperatureService.subscribeUnit((u) => setTempUnit(u));
  }, []);

  useEffect(() => {
    return seasonService.subscribe((s, info) => {
      setSeason(s);
      setSeasonInfo(info);
      setCalendarDate(seasonService.getFormattedDate());
    });
  }, []);

  const handleCycleSeason = () => {
    const nextInfo = seasonService.cycleSeason(true);
    setSeason(nextInfo.id);
    setSeasonInfo(nextInfo);
    setCalendarDate(seasonService.getFormattedDate());
  };

  const elevationFt = playerCoords && playerCoords.y !== undefined
    ? getUsgsElevation(playerCoords.y, playerCoords.x, playerCoords.z).feet
    : 2050;

  const tempReading = desertTemperatureService.queryTemperature({
    timeOfDay,
    weather,
    elevationFt,
    isInShade,
    shadeReason,
    isUnderground: isInsideMine,
  });

  const displayAmbientF = temperatureF !== undefined ? temperatureF : tempReading.ambientF;
  const displayFeelsLikeF = temperatureFeelsLikeF !== undefined ? temperatureFeelsLikeF : tempReading.feelsLikeF;
  const displayAmbient = desertTemperatureService.formatTemp(displayAmbientF, tempUnit);
  const displayFeelsLike = desertTemperatureService.formatTemp(displayFeelsLikeF, tempUnit);
  const hasFeelsDiff = Math.abs(displayFeelsLikeF - displayAmbientF) >= 5;

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

  // Calculate relative angles and distances to fellow online prospectors
  const fellowProspectors = (onlinePlayers || [])
    .filter((p) => p && p.id && (!selfName || p.name !== selfName))
    .map((p) => {
      const dx = p.x - (playerCoords?.x ?? 0);
      const dz = p.z - (playerCoords?.z ?? 0);
      const dist = Math.hypot(dx, dz);
      const angleRad = Math.atan2(dx, -dz);
      const bearingDeg = ((angleRad * 180 / Math.PI) + 360) % 360;
      let relDeg = bearingDeg - deg;
      while (relDeg > 180) relDeg -= 360;
      while (relDeg < -180) relDeg += 360;
      return {
        ...p,
        distance: dist,
        bearingDeg,
        relDeg,
      };
    })
    .sort((a, b) => a.distance - b.distance);

  const nearestProspector = fellowProspectors[0];

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
          {/* Authentic Mini Brass Compass with Real-Time Magnetic Needle */}
          <div
            className="relative w-6 h-6 flex items-center justify-center shrink-0"
            title={`Compass Bearing: ${deg}° ${getCardinal(deg)} • Magnetic Needle points toward True North`}
          >
            {/* Outer Brass Bezel */}
            <div className="absolute inset-0 rounded-full border border-amber-400/90 bg-stone-950 shadow-inner flex items-center justify-center">
              {/* Forward Heading Sightline notch */}
              <div className="absolute top-0.5 w-1 h-0.5 bg-amber-400 rounded-full" title="Forward Sightline" />
              <div className="absolute bottom-0.5 w-0.5 h-0.5 bg-stone-600 rounded-full" />
              <div className="absolute left-0.5 w-0.5 h-0.5 bg-stone-600 rounded-full" />
              <div className="absolute right-0.5 w-0.5 h-0.5 bg-stone-600 rounded-full" />
            </div>

            {/* Rotating Magnetic Needle (counter-rotates by -deg so red tip always points True North) */}
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
              style={{ transform: `rotate(${-deg}deg)` }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" fill="none">
                {/* North Needle Tip (Red Enameled) */}
                <polygon points="12,2.5 14.5,12 12,10 9.5,12" fill="#ef4444" stroke="#991b1b" strokeWidth="0.5" />
                {/* South Needle Tip (Silver Blued-Steel) */}
                <polygon points="12,21.5 14.5,12 12,14 9.5,12" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />
                {/* Brass Center Pivot */}
                <circle cx="12" cy="12" r="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
              </svg>
            </div>
          </div>

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

        {/* Lunar Phase & Moonlight Indicator */}
        {isNight && (
          <button
            id="hud-lunar-phase-btn"
            type="button"
            onClick={onCycleLunarPhase}
            title={`Moonlight Atmosphere: ${phaseInfo.name} (${Math.round(phaseInfo.illumination * 100)}% Moonlight). ${phaseInfo.description}. Click to cycle lunar phase.`}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 -my-1 rounded-full bg-slate-900/90 hover:bg-slate-800/95 text-sky-200 border border-sky-500/50 text-xs font-mono transition-all cursor-pointer shadow-md group border-r border-amber-800/60"
          >
            <Moon className="w-3.5 h-3.5 text-sky-300 group-hover:rotate-12 transition-transform" />
            <span className="font-semibold text-sky-100 hidden sm:inline">{phaseInfo.name}</span>
            <span className="text-[10px] text-sky-300 font-bold bg-sky-950/90 px-1.5 py-0.5 rounded border border-sky-700/50">
              {Math.round(phaseInfo.illumination * 100)}% Moon
            </span>
          </button>
        )}

        {/* Frontier Brass Thermometer & Climate Indicator (Interactive °F / °C toggle) */}
        <button
          id="hud-thermometer-btn"
          type="button"
          onClick={() => {
            const next = desertTemperatureService.toggleUnit();
            setTempUnit(next);
          }}
          title={`Sonoran Desert Thermometer: True Air ${displayAmbientF}°F (${desertTemperatureService.fToC(displayAmbientF)}°C) | Feels Like ${displayFeelsLikeF}°F (${desertTemperatureService.fToC(displayFeelsLikeF)}°C) • ${tempReading.categoryLabel}. ${isInShade ? `Sheltered in shade (${shadeReason || 'Cool canopy'}).` : isInsideMine ? 'Cool subterranean mine level (68°F).' : 'Direct desert sun thermal load.'} Click to toggle between °F & °C.`}
          className={`pointer-events-auto flex items-center gap-1.5 border-r border-amber-800/60 pr-4 text-xs font-mono px-2 py-1 -my-1 rounded-full transition-all cursor-pointer group hover:bg-stone-800/60 ${tempReading.textColor}`}
        >
          {tempReading.category === 'freezing' || tempReading.category === 'cold' ? (
            <Snowflake className="w-4 h-4 text-sky-300 group-hover:rotate-45 transition-transform" />
          ) : tempReading.category === 'scorching' || tempReading.category === 'hyperthermia' ? (
            <Flame className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform animate-pulse" />
          ) : (
            <Thermometer className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          )}

          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight">{displayAmbient}</span>
            {hasFeelsDiff && (
              <span
                className={`text-[9px] font-sans uppercase px-1.5 py-0.2 rounded border hidden sm:inline-flex items-center gap-1 font-semibold ${
                  displayFeelsLikeF < displayAmbientF
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                    : 'bg-red-950/80 text-red-300 border-red-600/50'
                }`}
              >
                <span>{displayFeelsLikeF < displayAmbientF ? 'Shade' : 'Sun'}</span>
                <strong>{displayFeelsLike}</strong>
              </span>
            )}
          </div>
        </button>

        {/* Frontier Season & Historic Calendar Date Badge (Interactive: click to cycle season) */}
        <button
          id="hud-season-btn"
          type="button"
          onClick={handleCycleSeason}
          title={`Frontier Season: ${seasonInfo.name} (${calendarDate}) • ${seasonInfo.temperatureRange}. ${seasonInfo.summary} Dehydration multiplier: ${seasonInfo.thirstMultiplier}x. Click to cycle seasons (Spring -> Summer -> Autumn -> Winter)!`}
          className="pointer-events-auto flex items-center gap-1.5 border-r border-amber-800/60 pr-3.5 text-xs font-mono px-2.5 py-1 -my-1 rounded-full transition-all cursor-pointer group bg-stone-900/85 hover:bg-stone-800 hover:border-amber-500/70 border border-stone-700/60 active:scale-95 shadow-sm"
        >
          <span className="text-sm group-hover:scale-125 transition-transform">{seasonInfo.icon}</span>
          <div className="flex items-center gap-1">
            <span className={`font-bold ${seasonInfo.textColor}`}>{seasonInfo.name}</span>
            <span className="text-[10px] text-stone-400 font-sans hidden sm:inline">• {calendarDate}</span>
          </div>
          <span className="text-[9px] bg-stone-800/90 text-amber-300/80 border border-amber-500/30 px-1 py-0.2 rounded hidden lg:inline font-mono">
            {seasonInfo.thirstMultiplier}x Thirst
          </span>
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

        {/* Active Player Callsign */}
        {selfName && (
          <div
            onClick={onOpenMultiplayerModal}
            className="pointer-events-auto hidden md:flex items-center gap-1.5 border-l border-amber-800/60 pl-3 text-xs text-amber-200 hover:text-amber-100 cursor-pointer group"
            title="Your Prospector Callsign. Click to open Frontier Telegraph & Roster."
          >
            <User className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-amber-300 max-w-[120px] truncate">{selfName}</span>
          </div>
        )}

        {/* Fellow Online Prospectors Indicator */}
        {fellowProspectors.length > 0 && nearestProspector && (
          <button
            type="button"
            onClick={() => onTrackPlayer ? onTrackPlayer(nearestProspector) : onOpenMultiplayerModal?.()}
            className="pointer-events-auto flex items-center gap-1.5 border-l border-amber-800/60 pl-3 text-xs bg-amber-950/60 hover:bg-amber-900/80 px-2.5 py-1 rounded-full text-amber-300 border border-amber-600/40 cursor-pointer transition-all group"
            title={`Track ${nearestProspector.name} (${Math.round(nearestProspector.distance)}m away)`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold text-amber-200">
              {fellowProspectors.length} {fellowProspectors.length === 1 ? 'Prospector' : 'Prospectors'}
            </span>
            <span className="text-[11px] font-mono text-amber-400/90 hidden lg:inline">
              ({nearestProspector.name} {Math.round(nearestProspector.distance)}m)
            </span>
            <Navigation className="w-3 h-3 text-amber-400 group-hover:rotate-45 transition-transform" />
          </button>
        )}

        {isInsideMine && (
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider bg-amber-900/50 px-2 py-0.5 rounded border border-amber-600/40">
            Inside Dutchman Shaft
          </span>
        )}
      </div>

      {/* Nearby Prospector Direction Indicator */}
      {nearestProspector && (
        <div className="mt-1 flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => onTrackPlayer?.(nearestProspector)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/90 backdrop-blur-md text-amber-300 border border-amber-600/60 text-[11px] font-mono shadow-lg hover:bg-stone-800 cursor-pointer transition-all"
            title={`Click to track ${nearestProspector.name}`}
          >
            {nearestProspector.relDeg < -18 ? (
              <span className="text-amber-400 font-bold">◂ Turn Left</span>
            ) : nearestProspector.relDeg > 18 ? (
              <span className="text-amber-400 font-bold">Turn Right ▸</span>
            ) : (
              <span className="text-emerald-400 font-bold">▲ Directly Ahead</span>
            )}
            <span className="text-stone-300">Fellow Prospector:</span>
            <span className="font-bold text-amber-200">{nearestProspector.name}</span>
            <span className="text-amber-400/90 font-semibold">({Math.round(nearestProspector.distance)}m)</span>
          </button>
        </div>
      )}

      {/* Subtle compass ribbon underneath - 100% synchronized to True Heading */}
      <div className="mt-1 w-72 h-6 overflow-hidden relative flex items-center bg-stone-950/85 border border-amber-900/50 rounded-full px-2 shadow-inner backdrop-blur-sm select-none">
        {/* Left/Right Edge Vignette Gradient Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-stone-950 via-stone-950/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-stone-950 via-stone-950/80 to-transparent z-10 pointer-events-none" />

        {/* Dynamic Continuous Compass Degree Ticks */}
        {(() => {
          const ribbonCenter = 144; // w-72 is 288px, center = 144px
          const pxPerDeg = 1.6; // 15° = 24px, 5° = 8px
          const minAngle = Math.floor((deg - 90) / 5) * 5;
          const maxAngle = Math.ceil((deg + 90) / 5) * 5;
          const ticks = [];
          for (let a = minAngle; a <= maxAngle; a += 5) {
            const diff = a - deg;
            const x = ribbonCenter + diff * pxPerDeg;
            if (x < -20 || x > 308) continue;
            const norm = ((a % 360) + 360) % 360;
            const isCardinal = norm % 90 === 0;
            const isInter = norm % 45 === 0 && !isCardinal;
            const isMajor = norm % 15 === 0;
            const cardinalLabel =
              norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : '';
            const interLabel =
              norm === 45 ? 'NE' : norm === 135 ? 'SE' : norm === 225 ? 'SW' : norm === 315 ? 'NW' : '';

            ticks.push(
              <div
                key={a}
                className="absolute top-0 bottom-0 flex flex-col items-center justify-center pointer-events-none"
                style={{ left: `${x}px`, transform: 'translateX(-50%)' }}
              >
                {isCardinal ? (
                  <strong className="text-amber-200 font-bold text-[11px] font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] leading-none">
                    {cardinalLabel}
                  </strong>
                ) : isInter ? (
                  <span className="text-amber-400 font-semibold text-[9px] font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
                    {interLabel}
                  </span>
                ) : isMajor ? (
                  <span className="text-amber-500/70 text-[8px] font-mono leading-none">
                    {norm}°
                  </span>
                ) : (
                  <div className="w-[1px] h-2 bg-amber-600/50 rounded-full" />
                )}
              </div>
            );
          }
          return ticks;
        })()}

        {/* Center Lubber Line Needle with Optical Glow */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.95)] z-20 pointer-events-none" />
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1 bg-amber-300 rounded-b shadow z-20 pointer-events-none" />
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
