import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WeatherType, SeasonType, SeasonInfo } from '../types';
import {
  CloudRain,
  Wind,
  Sun,
  CloudLightning,
  Sunset,
  Cloud,
  Shield,
  Snowflake,
  Flame,
  Sparkles,
  X,
  RotateCw,
} from 'lucide-react';
import { multiplayer } from '../multiplayer/multiplayerService';
import { dynamicWeatherEngine, WeatherEngineStatus } from '../services/dynamicWeatherEngine';
import { desertTemperatureService } from '../services/desertTemperatureService';
import { seasonService } from '../services/seasonService';

interface WeatherCanvasOverlayProps {
  weather: WeatherType;
  timeOfDay: number;
  isUnderground?: boolean;
  lightningFlashIntensity?: number;
  isHunkeredDown?: boolean;
  temperatureF?: number;
  temperatureFeelsLikeF?: number;
  isInShade?: boolean;
  isNearCampfire?: boolean;
  vigour?: number;
  onToggleHunkerDown?: () => void;
  onTriggerSandstorm?: () => void;
  onOpenCamp?: () => void;
  isRidingMount?: boolean;
}

interface RainDroplet {
  x: number;
  y: number;
  r: number;
  speed: number;
  life: number;
  maxLife: number;
  trail: { y: number; alpha: number }[];
}

interface SandGrain {
  x: number;
  y: number;
  len: number;
  speed: number;
  width: number;
  alpha: number;
  color: string;
}

interface ScreenDustMote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  pulse: number;
}

interface HeatThermalPlume {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  alpha: number;
  phase: number;
  freq: number;
}

interface FrostMote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  pulse: number;
}

interface MeltingDroplet {
  x: number;
  y: number;
  vy: number;
  r: number;
  alpha: number;
  life: number;
  maxLife: number;
}

/**
 * Draws a glittering ice sparkle star at crystal tips
 */
function drawIceSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  alpha: number,
  rotation: number
) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // 4-pointed diamond star
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(0, 0, size, 0);
  ctx.quadraticCurveTo(0, 0, 0, size);
  ctx.quadraticCurveTo(0, 0, -size, 0);
  ctx.quadraticCurveTo(0, 0, 0, -size);
  ctx.fill();

  // Subtle cold cyan halo
  ctx.fillStyle = `rgba(180, 235, 255, ${alpha * 0.4})`;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Procedurally draws branching fractal ice crystal dendrites
 * matching the hexagonal 60° symmetry of natural desert frost.
 */
function drawFrostDendrite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  depth: number,
  alpha: number,
  nowSec: number
) {
  if (depth <= 0 || length < 5 || alpha <= 0.02) return;

  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;

  // Pass 1: Diffuse cold blue frost glow
  ctx.strokeStyle = `rgba(165, 225, 255, ${alpha * (0.35 + depth * 0.08)})`;
  ctx.lineWidth = depth * 1.6 + 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Pass 2: Crisp white crystalline core
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * (0.65 + depth * 0.08)})`;
  ctx.lineWidth = depth * 0.8 + 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Twinkling sparkle at branch tip
  if (depth <= 2) {
    const twinkle = 0.5 + 0.5 * Math.sin(nowSec * 3.5 + x * 0.04 + y * 0.04);
    drawIceSparkle(ctx, endX, endY, 2.8 + depth * 1.1, alpha * twinkle * 0.9, nowSec * 0.4);
  }

  // Fractal branching at natural 60° (Math.PI / 3) angles of water ice crystals
  const branchCount = depth >= 3 ? 3 : 2;
  for (let i = 1; i <= branchCount; i++) {
    const t = i / (branchCount + 0.85);
    const bx = x + Math.cos(angle) * length * t;
    const by = y + Math.sin(angle) * length * t;
    const subLength = length * (0.44 - i * 0.06);

    // Left 60° branch
    drawFrostDendrite(
      ctx,
      bx,
      by,
      angle + Math.PI / 3.1,
      subLength,
      depth - 1,
      alpha,
      nowSec
    );

    // Right 60° branch
    drawFrostDendrite(
      ctx,
      bx,
      by,
      angle - Math.PI / 3.1,
      subLength,
      depth - 1,
      alpha,
      nowSec
    );
  }
}

export const WeatherCanvasOverlay: React.FC<WeatherCanvasOverlayProps> = ({
  weather,
  timeOfDay,
  isUnderground = false,
  lightningFlashIntensity = 0,
  isHunkeredDown = false,
  temperatureF,
  temperatureFeelsLikeF,
  isInShade = false,
  isNearCampfire = false,
  vigour = 100,
  onToggleHunkerDown,
  onTriggerSandstorm,
  onOpenCamp,
  isRidingMount = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatHazeRefractionLayerRef = useRef<HTMLDivElement | null>(null);
  const displacementMapRef = useRef<SVGFEDisplacementMapElement | null>(null);

  // Dynamic Weather Engine status subscription
  const [engineStatus, setEngineStatus] = useState<WeatherEngineStatus>(() =>
    dynamicWeatherEngine.getStatus(Boolean(isHunkeredDown))
  );

  // Active Sonoran Desert Season subscription
  const [currentSeason, setCurrentSeason] = useState<SeasonType>(() => seasonService.getSeason());
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo>(() => seasonService.getSeasonInfo());

  useEffect(() => {
    return seasonService.subscribe((s, info) => {
      setCurrentSeason(s);
      setSeasonInfo(info);
    });
  }, []);

  useEffect(() => {
    return dynamicWeatherEngine.subscribe((status) => {
      setEngineStatus(status);
    });
  }, []);

  // Weather Warning Modal Visibility & Auto-Dismiss Lifecycle
  const [isModalVisible, setIsModalVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [autoDismissSeconds, setAutoDismissSeconds] = useState(6);
  const dismissTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Current effective temperature for severe condition detection
  const currentTempCalc = desertTemperatureService.queryTemperature({
    timeOfDay,
    weather,
    season: currentSeason,
    isUnderground,
    isInShade,
    isHunkeredDown,
    nearbyCampfireActive: isNearCampfire,
  });
  const currentEffectiveFeelsLikeF = temperatureFeelsLikeF ?? currentTempCalc.feelsLikeF;

  // Severe environmental condition detection derived directly from physical state
  const isExtremeHeat = currentEffectiveFeelsLikeF >= 96 && !isInShade && !isUnderground;
  const isExtremeFrost = currentEffectiveFeelsLikeF <= 40 && !isNearCampfire && !isUnderground;
  const isCampfireThawing = isNearCampfire && currentEffectiveFeelsLikeF <= 48 && !isUnderground;
  const isHaboobWarning = engineStatus.phase === 'warning' && !isUnderground;
  const isSandstormActive = weather === 'sandstorm' && !isUnderground;
  const isStormActive = weather === 'storm' && !isUnderground;
  const hasActiveSeasonalEvent = engineStatus.activeSeasonalEvent !== 'none';
  const isSevere = hasActiveSeasonalEvent || isHaboobWarning || isSandstormActive || isExtremeHeat || isExtremeFrost || isStormActive;

  // Warning Key: Identifies the active warning, season shift, or atmospheric event to trigger reappearance
  const currentWarningKey = hasActiveSeasonalEvent
    ? `seasonal_event_${engineStatus.activeSeasonalEvent}_${engineStatus.seasonalTimeRemaining}`
    : isHaboobWarning
    ? 'warning_haboob'
    : isSandstormActive
    ? `sandstorm_${isHunkeredDown ? 'hunkered' : 'upright'}`
    : isExtremeFrost
    ? 'warning_frost'
    : isExtremeHeat
    ? 'warning_heat'
    : engineStatus.phase === 'clearing'
    ? 'event_clearing'
    : `season_${currentSeason}_weather_${weather}`;

  const prevWarningKeyRef = useRef<string>(currentWarningKey);

  // When a NEW warning or atmospheric event occurs: reset dismissed state, show modal, and restart timer
  useEffect(() => {
    if (prevWarningKeyRef.current !== currentWarningKey) {
      prevWarningKeyRef.current = currentWarningKey;

      // Reappear on new warning!
      setIsDismissed(false);
      setIsModalVisible(true);

      const durationSec = isSevere ? 9 : 6;
      setAutoDismissSeconds(durationSec);

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      let remaining = durationSec;
      countdownIntervalRef.current = window.setInterval(() => {
        remaining -= 1;
        setAutoDismissSeconds(Math.max(0, remaining));
      }, 1000);

      dismissTimerRef.current = window.setTimeout(() => {
        setIsModalVisible(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }, durationSec * 1000);
    }
  }, [currentWarningKey, isSevere]);

  // Initial mount auto-dismiss
  useEffect(() => {
    const durationSec = 6;
    setAutoDismissSeconds(durationSec);
    let remaining = durationSec;
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      setAutoDismissSeconds(Math.max(0, remaining));
    }, 1000);

    dismissTimerRef.current = window.setTimeout(() => {
      setIsModalVisible(false);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, durationSec * 1000);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleTurnOffModal = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsDismissed(true);
    setIsModalVisible(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  // Keyboard shortcut: Esc dismisses weather warning modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalVisible && !isDismissed) {
        setIsDismissed(true);
        setIsModalVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalVisible, isDismissed]);

  // Dynamic props held in refs for 60fps render loop access
  const isHunkeredDownRef = useRef(isHunkeredDown);
  const isInShadeRef = useRef(isInShade);
  const isNearCampfireRef = useRef(isNearCampfire);
  const vigourRef = useRef(vigour);
  const timeOfDayRef = useRef(timeOfDay);
  const weatherRef = useRef(weather);
  const isUndergroundRef = useRef(isUnderground);
  const tempFRef = useRef(temperatureF);
  const feelsLikeFRef = useRef(temperatureFeelsLikeF);
  const lastUiUpdateRef = useRef<number>(0);

  useEffect(() => {
    isHunkeredDownRef.current = isHunkeredDown;
  }, [isHunkeredDown]);

  useEffect(() => {
    isInShadeRef.current = isInShade;
  }, [isInShade]);

  useEffect(() => {
    isNearCampfireRef.current = isNearCampfire;
  }, [isNearCampfire]);

  useEffect(() => {
    vigourRef.current = vigour;
  }, [vigour]);

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    isUndergroundRef.current = isUnderground;
  }, [isUnderground]);

  useEffect(() => {
    tempFRef.current = temperatureF;
  }, [temperatureF]);

  useEffect(() => {
    feelsLikeFRef.current = temperatureFeelsLikeF;
  }, [temperatureFeelsLikeF]);

  // Smooth transition alphas (0.0 to 1.0)
  const alphasRef = useRef({
    sandstorm: weather === 'sandstorm' ? 1.0 : 0.0,
    lightRain: weather === 'light_rain' ? 1.0 : 0.0,
    storm: weather === 'storm' ? 1.0 : 0.0,
    goldenDust: weather === 'sunset' || weather === 'clear' ? 0.75 : 0.0,
    heatHaze: 0.0,
    freezing: 0.0,
    campfireThaw: 0.0,
  });

  // Persistent particles
  const dropletsRef = useRef<RainDroplet[]>([]);
  const sandGrainsRef = useRef<SandGrain[]>([]);
  const dustMotesRef = useRef<ScreenDustMote[]>([]);
  const heatPlumesRef = useRef<HeatThermalPlume[]>([]);
  const frostMotesRef = useRef<FrostMote[]>([]);
  const meltingDropletsRef = useRef<MeltingDroplet[]>([]);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const gustPhaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initialize sand grains
    const sandGrains: SandGrain[] = [];
    const sandColors = [
      'rgba(235, 170, 105, ',
      'rgba(215, 140, 75, ',
      'rgba(195, 115, 50, ',
      'rgba(245, 195, 135, ',
      'rgba(180, 95, 35, ',
    ];
    for (let i = 0; i < 110; i++) {
      sandGrains.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 40 + Math.random() * 120,
        speed: 1200 + Math.random() * 900,
        width: 1.0 + Math.random() * 1.8,
        alpha: 0.35 + Math.random() * 0.5,
        color: sandColors[Math.floor(Math.random() * sandColors.length)],
      });
    }
    sandGrainsRef.current = sandGrains;

    // Initialize floating screen dust motes
    const dustMotes: ScreenDustMote[] = [];
    for (let i = 0; i < 45; i++) {
      dustMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.2 + Math.random() * 2.2,
        vx: 15 + Math.random() * 25,
        vy: (Math.random() - 0.5) * 12,
        alpha: 0.2 + Math.random() * 0.5,
        pulse: Math.random() * Math.PI * 2,
      });
    }
    dustMotesRef.current = dustMotes;

    // Initialize rising heat thermal convection plumes
    const heatPlumes: HeatThermalPlume[] = [];
    for (let i = 0; i < 36; i++) {
      heatPlumes.push({
        x: Math.random() * width,
        y: height * 0.4 + Math.random() * (height * 0.6),
        vy: 70 + Math.random() * 85,
        width: 1.0 + Math.random() * 1.6,
        height: 45 + Math.random() * 65,
        alpha: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        freq: 1.5 + Math.random() * 2.0,
      });
    }
    heatPlumesRef.current = heatPlumes;

    // Initialize cold frost motes / suspended ice diamond dust
    const frostMotes: FrostMote[] = [];
    for (let i = 0; i < 32; i++) {
      frostMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.0 + Math.random() * 2.0,
        vx: (Math.random() - 0.5) * 14,
        vy: 4 + Math.random() * 12,
        alpha: 0.25 + Math.random() * 0.55,
        pulse: Math.random() * Math.PI * 2,
      });
    }
    frostMotesRef.current = frostMotes;

    const render = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      const nowSec = now * 0.001;
      gustPhaseRef.current += dt * 1.8;

      const isUnd = isUndergroundRef.current;
      const curWeather = weatherRef.current;
      const inShade = isInShadeRef.current;
      const nearFire = isNearCampfireRef.current;
      const isHunkered = isHunkeredDownRef.current;
      const curVigour = vigourRef.current;

      // Query current effective temperatures
      const tempQuery = desertTemperatureService.queryTemperature({
        timeOfDay: timeOfDayRef.current,
        weather: curWeather,
        isUnderground: isUnd,
        isInShade: inShade,
        isHunkeredDown: isHunkered,
        nearbyCampfireActive: nearFire,
      });
      const effectiveFeelsLikeF = feelsLikeFRef.current ?? tempQuery.feelsLikeF;

      // Target alphas
      const targetSandstorm = !isUnd && curWeather === 'sandstorm' ? 1.0 : 0.0;
      const targetLightRain = !isUnd && curWeather === 'light_rain' ? 1.0 : 0.0;
      const targetStorm = !isUnd && curWeather === 'storm' ? 1.0 : 0.0;
      const targetGoldenDust = !isUnd && (curWeather === 'sunset' || curWeather === 'clear') ? 0.75 : 0.0;

      // 1. Shimmering Heat Haze target calculation:
      // Activates when feels-like temperature >= 96°F, ramps to full intensity at 110°F+
      // In shade, heat haze is reduced by 65% (direct heat on player is sheltered, but distant horizon still ripples)
      let targetHeatHaze = 0.0;
      if (!isUnd && effectiveFeelsLikeF >= 96) {
        const heatFactor = Math.min(1.0, (effectiveFeelsLikeF - 96) / 14);
        targetHeatHaze = inShade ? heatFactor * 0.35 : heatFactor;
      }

      // 2. Freezing Frost Vignette target calculation:
      // Activates when feels-like temperature <= 40°F, ramps to full frost at 24°F
      // Campfire warmth melts the frost away quickly
      let targetFreezing = 0.0;
      let targetCampfireThaw = 0.0;
      if (!isUnd && effectiveFeelsLikeF <= 40) {
        const coldFactor = Math.min(1.0, (40 - effectiveFeelsLikeF) / 16);
        if (nearFire) {
          targetFreezing = Math.max(0, coldFactor - 0.9);
          targetCampfireThaw = 1.0;
        } else {
          targetFreezing = coldFactor;
          targetCampfireThaw = 0.0;
        }
      } else if (nearFire) {
        targetCampfireThaw = 0.0;
      }

      // Smooth lerp alphas
      const lerpSpeed = dt * 3.2;
      const alphas = alphasRef.current;
      alphas.sandstorm += (targetSandstorm - alphas.sandstorm) * lerpSpeed;
      alphas.lightRain += (targetLightRain - alphas.lightRain) * lerpSpeed;
      alphas.storm += (targetStorm - alphas.storm) * lerpSpeed;
      alphas.goldenDust += (targetGoldenDust - alphas.goldenDust) * lerpSpeed;
      alphas.heatHaze += (targetHeatHaze - alphas.heatHaze) * (dt * 2.8);
      alphas.freezing += (targetFreezing - alphas.freezing) * (dt * 2.5);
      alphas.campfireThaw += (targetCampfireThaw - alphas.campfireThaw) * (dt * 4.0);

      // Update SVG feDisplacementMap scale & backdrop layer directly via DOM refs without React state churn
      if (displacementMapRef.current) {
        displacementMapRef.current.setAttribute('scale', String(Math.round(15 * alphas.heatHaze)));
      }
      if (heatHazeRefractionLayerRef.current) {
        if (alphas.heatHaze > 0.05 && !isUnd) {
          heatHazeRefractionLayerRef.current.style.opacity = String(Math.min(1.0, alphas.heatHaze * 1.25));
          heatHazeRefractionLayerRef.current.style.display = 'block';
        } else {
          heatHazeRefractionLayerRef.current.style.opacity = '0';
          heatHazeRefractionLayerRef.current.style.display = 'none';
        }
      }

      ctx.clearRect(0, 0, width, height);

      // =========================================================================
      // 1. --- SHIMMERING HEAT HAZE & CONVECTION MIRAGE (EXTREME TEMPERATURE) ---
      // =========================================================================
      if (alphas.heatHaze > 0.01) {
        const hAlpha = alphas.heatHaze;
        const horizonY = height * 0.42;

        // A. Solar Glare & Bleached Incandescent Sun Bloom
        const heatBloom = ctx.createRadialGradient(
          width * 0.5,
          0,
          30,
          width * 0.5,
          height * 0.35,
          Math.max(width, height) * 0.72
        );
        heatBloom.addColorStop(0, `rgba(255, 248, 220, ${0.18 * hAlpha})`);
        heatBloom.addColorStop(0.35, `rgba(255, 215, 140, ${0.08 * hAlpha})`);
        heatBloom.addColorStop(0.75, `rgba(255, 185, 90, ${0.03 * hAlpha})`);
        heatBloom.addColorStop(1, 'rgba(255, 160, 60, 0)');
        ctx.fillStyle = heatBloom;
        ctx.fillRect(0, 0, width, height);

        // B. Horizontal Atmospheric Convection Mirage Bands (Wavy Refraction Waves)
        const bandCount = 14;
        for (let b = 0; b < bandCount; b++) {
          const progress = b / bandCount;
          const bandY = horizonY + progress * (height - horizonY);
          const bandH = (height - horizonY) / bandCount;

          ctx.beginPath();
          ctx.moveTo(0, bandY);

          const waveFreq = 0.012 + progress * 0.01;
          const waveSpeed = 3.2 + progress * 2.0;
          const waveAmp = (4.5 + progress * 7.5) * hAlpha;

          for (let x = 0; x <= width; x += 25) {
            const wave =
              Math.sin(x * waveFreq + nowSec * waveSpeed) *
              Math.cos(x * 0.007 + nowSec * 1.5) *
              waveAmp;
            ctx.lineTo(x, bandY + wave);
          }
          ctx.lineTo(width, bandY + bandH);
          ctx.lineTo(0, bandY + bandH);
          ctx.closePath();

          const bandAlpha = (0.018 + 0.035 * Math.sin(progress * Math.PI)) * hAlpha;
          ctx.fillStyle =
            b % 2 === 0
              ? `rgba(255, 225, 150, ${bandAlpha})`
              : `rgba(255, 245, 210, ${bandAlpha * 0.85})`;
          ctx.fill();
        }

        // C. Desert Floor Inferior Mirage Sheen (Reflecting sky on baking sandstone)
        const mirageY = height * 0.72;
        const mirageGrad = ctx.createLinearGradient(0, mirageY, 0, height);
        mirageGrad.addColorStop(0, 'rgba(215, 238, 255, 0)');
        mirageGrad.addColorStop(0.3, `rgba(225, 245, 255, ${0.11 * hAlpha})`);
        mirageGrad.addColorStop(0.7, `rgba(255, 230, 160, ${0.07 * hAlpha})`);
        mirageGrad.addColorStop(1, 'rgba(215, 238, 255, 0)');
        ctx.fillStyle = mirageGrad;
        ctx.fillRect(0, mirageY, width, height - mirageY);

        // D. Rising Heat Thermal Convection Plumes
        for (const p of heatPlumesRef.current) {
          p.y -= p.vy * dt;
          p.phase += dt * p.freq;
          p.x += Math.sin(p.phase) * 18 * dt;

          if (p.y < horizonY) {
            p.y = height + Math.random() * 80;
            p.x = Math.random() * width;
          }

          const plumeFade = Math.sin(((p.y - horizonY) / (height - horizonY)) * Math.PI);
          const pAlpha = p.alpha * hAlpha * Math.max(0, plumeFade);
          if (pAlpha > 0.005) {
            ctx.strokeStyle = `rgba(255, 235, 175, ${pAlpha})`;
            ctx.lineWidth = p.width;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.quadraticCurveTo(
              p.x + Math.sin(p.phase * 1.5) * 12,
              p.y - p.height * 0.5,
              p.x + Math.sin(p.phase) * 6,
              p.y - p.height
            );
            ctx.stroke();
          }
        }
      }

      // =========================================================================
      // 2. --- FREEZING FROST VIGNETTE EFFECT (BELOW FREEZING TEMPERATURE) ---
      // =========================================================================
      if (alphas.freezing > 0.01) {
        const fAlpha = alphas.freezing;

        // A. Shivering Respiration Vignette (Rhythmically breathing frost radius)
        const shiveringPulse = Math.sin(nowSec * 2.4) * (curVigour < 30 ? 0.05 : 0.025);
        const frostInner = Math.min(width, height) * (0.34 + shiveringPulse);
        const frostOuter = Math.max(width, height) * 0.74;

        const frostGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          frostInner,
          width / 2,
          height / 2,
          frostOuter
        );
        frostGrad.addColorStop(0, 'rgba(190, 230, 255, 0)');
        frostGrad.addColorStop(0.55, `rgba(180, 225, 255, ${0.18 * fAlpha})`);
        frostGrad.addColorStop(0.85, `rgba(210, 240, 255, ${0.52 * fAlpha})`);
        frostGrad.addColorStop(1, `rgba(235, 250, 255, ${0.88 * fAlpha})`);
        ctx.fillStyle = frostGrad;
        ctx.fillRect(0, 0, width, height);

        // B. Procedural Ice Crystal Dendrites Creeping from the 4 Corners
        const baseCornerLength = Math.min(width, height) * 0.42 * fAlpha;

        // 1. Top-Left Corner (radiating ~45° into screen)
        drawFrostDendrite(
          ctx,
          0,
          0,
          Math.PI * 0.25,
          baseCornerLength * (1.0 + 0.05 * Math.sin(nowSec * 1.6)),
          3,
          fAlpha,
          nowSec
        );
        drawFrostDendrite(ctx, width * 0.12, 0, Math.PI * 0.45, baseCornerLength * 0.55, 2, fAlpha, nowSec);
        drawFrostDendrite(ctx, 0, height * 0.12, Math.PI * 0.06, baseCornerLength * 0.55, 2, fAlpha, nowSec);

        // 2. Top-Right Corner (radiating ~135° into screen)
        drawFrostDendrite(
          ctx,
          width,
          0,
          Math.PI * 0.75,
          baseCornerLength * (1.0 + 0.05 * Math.cos(nowSec * 1.6)),
          3,
          fAlpha,
          nowSec
        );
        drawFrostDendrite(ctx, width * 0.88, 0, Math.PI * 0.55, baseCornerLength * 0.55, 2, fAlpha, nowSec);
        drawFrostDendrite(ctx, width, height * 0.12, Math.PI * 0.94, baseCornerLength * 0.55, 2, fAlpha, nowSec);

        // 3. Bottom-Left Corner (radiating ~-45° into screen)
        drawFrostDendrite(
          ctx,
          0,
          height,
          -Math.PI * 0.25,
          baseCornerLength * (1.0 + 0.05 * Math.sin(nowSec * 1.8)),
          3,
          fAlpha,
          nowSec
        );
        drawFrostDendrite(ctx, width * 0.12, height, -Math.PI * 0.45, baseCornerLength * 0.55, 2, fAlpha, nowSec);
        drawFrostDendrite(ctx, 0, height * 0.88, -Math.PI * 0.06, baseCornerLength * 0.55, 2, fAlpha, nowSec);

        // 4. Bottom-Right Corner (radiating ~-135° into screen)
        drawFrostDendrite(
          ctx,
          width,
          height,
          -Math.PI * 0.75,
          baseCornerLength * (1.0 + 0.05 * Math.cos(nowSec * 1.8)),
          3,
          fAlpha,
          nowSec
        );
        drawFrostDendrite(ctx, width * 0.88, height, -Math.PI * 0.55, baseCornerLength * 0.55, 2, fAlpha, nowSec);
        drawFrostDendrite(ctx, width, height * 0.88, -Math.PI * 0.94, baseCornerLength * 0.55, 2, fAlpha, nowSec);

        // C. Jagged Serrated Rime Fringe Along Screen Borders
        const step = 32;
        // Top edge
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let x = 0; x <= width; x += step) {
          const rimeDepth = (8 + Math.sin(x * 0.06 + nowSec * 1.2) * 6 + Math.cos(x * 0.12) * 4) * fAlpha;
          ctx.lineTo(x + step * 0.5, rimeDepth);
          ctx.lineTo(x + step, 0);
        }
        ctx.fillStyle = `rgba(220, 245, 255, ${0.45 * fAlpha})`;
        ctx.fill();

        // Bottom edge
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += step) {
          const rimeDepth = (8 + Math.cos(x * 0.06 + nowSec * 1.2) * 6 + Math.sin(x * 0.12) * 4) * fAlpha;
          ctx.lineTo(x + step * 0.5, height - rimeDepth);
          ctx.lineTo(x + step, height);
        }
        ctx.fillStyle = `rgba(220, 245, 255, ${0.45 * fAlpha})`;
        ctx.fill();

        // D. Drifting Ice Crystal Motes / Frosted Breath
        ctx.save();
        for (const fm of frostMotesRef.current) {
          fm.pulse += dt * 2.0;
          fm.x += fm.vx * dt;
          fm.y += fm.vy * dt;

          if (fm.x < -10) fm.x = width + 10;
          if (fm.x > width + 10) fm.x = -10;
          if (fm.y > height + 10) fm.y = -10;

          const moteTwinkle = 0.6 + 0.4 * Math.sin(fm.pulse);
          ctx.fillStyle = `rgba(225, 245, 255, ${fm.alpha * fAlpha * moteTwinkle})`;
          ctx.beginPath();
          ctx.arc(fm.x, fm.y, fm.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // =========================================================================
      // 3. --- CAMPFIRE RADIANT WARMTH & ICE THAWING EFFECT ---
      // =========================================================================
      if (alphas.campfireThaw > 0.01) {
        const tAlpha = alphas.campfireThaw;

        // Radiant warm amber campfire hearth glow thawing the viewport edges
        const fireGlow = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.35,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.75
        );
        fireGlow.addColorStop(0, 'rgba(255, 180, 70, 0)');
        fireGlow.addColorStop(0.7, `rgba(255, 150, 45, ${0.08 * tAlpha})`);
        fireGlow.addColorStop(1, `rgba(255, 120, 20, ${0.25 * tAlpha})`);
        ctx.fillStyle = fireGlow;
        ctx.fillRect(0, 0, width, height);

        // Spawn melting condensation trickle beads
        if (Math.random() < 0.25 && meltingDropletsRef.current.length < 24) {
          const cornerSide = Math.random();
          meltingDropletsRef.current.push({
            x: cornerSide < 0.5 ? Math.random() * width * 0.25 : width * 0.75 + Math.random() * width * 0.25,
            y: Math.random() * height * 0.3,
            vy: 20 + Math.random() * 45,
            r: 1.5 + Math.random() * 2.0,
            alpha: 0.6,
            life: 0,
            maxLife: 3.5,
          });
        }

        // Draw melting condensation trickles down the screen
        for (let i = meltingDropletsRef.current.length - 1; i >= 0; i--) {
          const d = meltingDropletsRef.current[i];
          d.life += dt;
          d.y += d.vy * dt;
          const dropAlpha = Math.max(0, 1 - d.life / d.maxLife) * tAlpha;
          if (dropAlpha > 0.01) {
            ctx.fillStyle = `rgba(220, 240, 255, ${0.45 * dropAlpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
          }
          if (d.life >= d.maxLife || d.y > height + 20) {
            meltingDropletsRef.current.splice(i, 1);
          }
        }
      }

      // =========================================================================
      // 4. --- SANDSTORM DUST PARTICLES & SCREEN HABOOB EFFECT ---
      // =========================================================================
      if (alphas.sandstorm > 0.01) {
        const a = alphas.sandstorm;
        const gust = 1.0 + 0.35 * Math.sin(gustPhaseRef.current * 0.8) * Math.sin(gustPhaseRef.current * 1.7);

        // A. Atmospheric dusty lens vignette
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * (isHunkered ? 0.2 : 0.28),
          width / 2,
          height / 2,
          Math.max(width, height) * (isHunkered ? 0.65 : 0.72)
        );
        grad.addColorStop(0, 'rgba(180, 95, 35, 0)');
        grad.addColorStop(0.5, `rgba(195, 110, 45, ${(isHunkered ? 0.08 : 0.12) * a * gust})`);
        grad.addColorStop(1, `rgba(165, 80, 25, ${(isHunkered ? 0.65 : 0.48) * a * gust})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // A-2. If Hunkered Down: Protective canvas blanket & neckerchief bandana vignette around edges
        if (isHunkered) {
          const shelterGrad = ctx.createRadialGradient(
            width / 2,
            height / 2,
            Math.min(width, height) * 0.35,
            width / 2,
            height / 2,
            Math.max(width, height) * 0.75
          );
          shelterGrad.addColorStop(0, 'rgba(40, 22, 10, 0)');
          shelterGrad.addColorStop(0.6, 'rgba(50, 28, 14, 0.35)');
          shelterGrad.addColorStop(1, 'rgba(28, 15, 8, 0.88)');
          ctx.fillStyle = shelterGrad;
          ctx.fillRect(0, 0, width, height);
        }

        // B. Whipping horizontal sand dust streaks
        ctx.save();
        const grainIntensity = isHunkered ? 0.38 : 1.0;
        for (const g of sandGrainsRef.current) {
          g.x += g.speed * gust * (isHunkered ? 0.75 : 1.0) * dt;
          g.y += Math.sin(g.x * 0.01 + gustPhaseRef.current) * 35 * dt;

          if (g.x > width + g.len) {
            g.x = -g.len - Math.random() * 100;
            g.y = Math.random() * height;
          }

          ctx.strokeStyle = `${g.color}${g.alpha * a * gust * grainIntensity})`;
          ctx.lineWidth = g.width;
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.lineTo(g.x - g.len * (0.8 + gust * 0.3) * (isHunkered ? 0.65 : 1.0), g.y - 2);
          ctx.stroke();
        }
        ctx.restore();

        // C. Rolling Haboob dust curtains (sweeping transparent gradient waves)
        const waveX1 = ((now * 0.12) % (width + 600)) - 300;
        const waveGrad1 = ctx.createLinearGradient(waveX1 - 250, 0, waveX1 + 250, 0);
        waveGrad1.addColorStop(0, 'rgba(215, 135, 65, 0)');
        waveGrad1.addColorStop(0.5, `rgba(225, 150, 80, ${0.14 * a * gust})`);
        waveGrad1.addColorStop(1, 'rgba(215, 135, 65, 0)');
        ctx.fillStyle = waveGrad1;
        ctx.fillRect(0, 0, width, height);
      }

      // =========================================================================
      // 5. --- LIGHT RAIN & STORM EFFECTS (SCREEN DROPLETS + STREAKS) ---
      // =========================================================================
      const totalRainAlpha = Math.max(alphas.lightRain, alphas.storm);
      if (totalRainAlpha > 0.01) {
        const isIntense = alphas.storm > alphas.lightRain;
        const rainFactor = isIntense ? alphas.storm : alphas.lightRain * 0.6;

        // Screen rainfall streaks
        const streakCount = isIntense ? 85 : 35;
        const streakSpeed = isIntense ? 1600 : 900;
        const streakAngle = isIntense ? 0.32 : 0.14;

        ctx.save();
        ctx.strokeStyle = isIntense
          ? `rgba(210, 235, 255, ${0.45 * rainFactor})`
          : `rgba(220, 240, 255, ${0.28 * rainFactor})`;
        ctx.lineWidth = isIntense ? 1.6 : 1.1;

        for (let i = 0; i < streakCount; i++) {
          const sx = ((now * streakSpeed * 0.3 * streakAngle + i * 193) % (width + 400)) - 200;
          const sy = ((now * streakSpeed * 0.7 + i * 287) % (height + 200)) - 100;
          const len = isIntense ? 65 : 38;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + len * Math.sin(streakAngle), sy + len * Math.cos(streakAngle));
          ctx.stroke();
        }
        ctx.restore();

        // Dynamic Camera Lens Droplets (Spawn & trickle down)
        const spawnChance = isIntense ? 0.42 : 0.16;
        if (Math.random() < spawnChance && dropletsRef.current.length < (isIntense ? 60 : 30)) {
          dropletsRef.current.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: isIntense ? 2.5 + Math.random() * 4.5 : 1.8 + Math.random() * 3.0,
            speed: isIntense ? 25 + Math.random() * 55 : 8 + Math.random() * 18,
            life: 0,
            maxLife: 4.5 + Math.random() * 6.0,
            trail: [],
          });
        }

        // Render and update lens droplets
        const droplets = dropletsRef.current;
        for (let i = droplets.length - 1; i >= 0; i--) {
          const d = droplets[i];
          d.life += dt;

          if (d.r > 3.2) {
            d.y += d.speed * dt;
            if (Math.random() < 0.3) {
              d.trail.push({ y: d.y, alpha: 0.4 });
            }
          }

          const fadeOut = Math.max(0, 1 - d.life / d.maxLife);
          const dropAlpha = fadeOut * totalRainAlpha;

          for (let t = d.trail.length - 1; t >= 0; t--) {
            const tr = d.trail[t];
            tr.alpha -= dt * 0.25;
            if (tr.alpha <= 0) {
              d.trail.splice(t, 1);
            } else {
              ctx.fillStyle = `rgba(220, 240, 255, ${tr.alpha * 0.25 * totalRainAlpha})`;
              ctx.beginPath();
              ctx.arc(d.x, tr.y, d.r * 0.45, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 225, 255, ${0.18 * dropAlpha})`;
          ctx.fill();

          ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * dropAlpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * dropAlpha})`;
          ctx.beginPath();
          ctx.arc(d.x - d.r * 0.32, d.y - d.r * 0.32, d.r * 0.28, 0, Math.PI * 2);
          ctx.fill();

          if (d.life >= d.maxLife || d.y > height + 20) {
            droplets.splice(i, 1);
          }
        }

        // Moisture vignette
        const rainVignette = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.35,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.75
        );
        rainVignette.addColorStop(0, 'rgba(30, 45, 65, 0)');
        rainVignette.addColorStop(1, `rgba(20, 35, 55, ${0.32 * rainFactor})`);
        ctx.fillStyle = rainVignette;
        ctx.fillRect(0, 0, width, height);
      } else {
        dropletsRef.current = [];
      }

      // =========================================================================
      // 6. --- LIGHTNING SPECULAR SCREEN FLASH ---
      // =========================================================================
      if (lightningFlashIntensity > 0.01) {
        ctx.fillStyle = `rgba(225, 240, 255, ${lightningFlashIntensity * 0.55})`;
        ctx.fillRect(0, 0, width, height);
      }

      // =========================================================================
      // 7. --- GOLDEN HOUR / DESERT SUNBEAM DUST MOTES ---
      // =========================================================================
      if (alphas.goldenDust > 0.01) {
        const a = alphas.goldenDust;
        ctx.save();
        for (const m of dustMotesRef.current) {
          m.pulse += dt * 1.5;
          m.x += m.vx * dt;
          m.y += m.vy * dt + Math.sin(m.pulse) * 0.4;

          if (m.x > width + 10) m.x = -10;
          if (m.x < -10) m.x = width + 10;
          if (m.y > height + 10) m.y = -10;
          if (m.y < -10) m.y = height + 10;

          const moteAlpha = m.alpha * a * (0.6 + 0.4 * Math.sin(m.pulse));
          if (currentSeason === 'spring') {
            // Spring Wildflower Pollen & Blossom Petals (golden poppy yellow and soft rose pink)
            ctx.fillStyle = m.r > 2.0
              ? `rgba(244, 114, 182, ${moteAlpha * 0.85})`
              : `rgba(251, 191, 36, ${moteAlpha * 0.9})`;
          } else if (currentSeason === 'autumn') {
            // Autumn Golden Leaf & Dry Grass Flecks
            ctx.fillStyle = `rgba(245, 158, 11, ${moteAlpha * 0.9})`;
          } else if (currentSeason === 'winter') {
            // Winter Frost Ice Crystals
            ctx.fillStyle = `rgba(224, 242, 254, ${moteAlpha * 0.85})`;
          } else {
            // Summer Sunlit Sand Dust
            ctx.fillStyle = `rgba(254, 240, 185, ${moteAlpha})`;
          }
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentSeason]);

  // Weather title and icon mapping
  const getWeatherBadge = () => {
    const tempReading = desertTemperatureService.queryTemperature({
      timeOfDay,
      weather,
      season: currentSeason,
      isUnderground,
      isInShade,
      isHunkeredDown,
      nearbyCampfireActive: isNearCampfire,
    });
    const effectiveTemp = temperatureFeelsLikeF ?? tempReading.feelsLikeF;
    const tempStr = desertTemperatureService.formatTemp(effectiveTemp);

    switch (weather) {
      case 'sandstorm':
        return {
          icon: <Wind className="w-4 h-4 text-amber-400 animate-spin" />,
          title: `Haboob Sandstorm • ${tempStr}`,
          status: `Winds 46 mph • ${tempStr} Stifling Heat • High Dust Suspension`,
          tagColor: 'border-amber-600/40 bg-amber-950/80 text-amber-200',
        };
      case 'light_rain':
        return {
          icon: <CloudRain className="w-4 h-4 text-sky-300 animate-bounce" />,
          title: `Desert Shower • ${tempStr}`,
          status: `Light Rain 0.15 in/hr • ${tempStr} Cool Air • Mountain Mist`,
          tagColor: 'border-sky-600/40 bg-slate-900/80 text-sky-200',
        };
      case 'storm':
        return {
          icon: <CloudLightning className="w-4 h-4 text-cyan-300 animate-pulse" />,
          title: `Monsoon Thunderstorm • ${tempStr}`,
          status: `Flash Flood Caution • ${tempStr} Chilled Air • Torrential Rain`,
          tagColor: 'border-cyan-600/40 bg-slate-950/85 text-cyan-200',
        };
      case 'sunset':
        return {
          icon: <Sunset className="w-4 h-4 text-amber-300" />,
          title: `Golden Hour • ${tempStr}`,
          status: `Weaver's Needle Shadow Aligned • ${tempStr} Desert Twilight`,
          tagColor: 'border-orange-600/40 bg-stone-900/80 text-amber-200',
        };
      case 'clouds':
        return {
          icon: <Cloud className="w-4 h-4 text-slate-300" />,
          title: `Desert Cumulus Banks • ${tempStr}`,
          status: `Overcast Cloud Cover • ${tempStr} Diffused Sun • Mild Breeze`,
          tagColor: 'border-slate-600/40 bg-slate-900/80 text-slate-200',
        };
      case 'night':
        return {
          icon: <Sun className="w-4 h-4 text-indigo-300" />,
          title: `Starry Desert Night • ${tempStr}`,
          status: `Milky Way Overhead • ${tempStr} Crisp Air • Starlight`,
          tagColor: 'border-indigo-600/40 bg-slate-950/85 text-indigo-200',
        };
      case 'clear':
      default: {
        let seasonDesc = `Unobstructed Solar Radiation • ${tempStr} Heat • 0% Cloud Cover`;
        let seasonTitle = `Clear Arizona Sky • ${tempStr}`;
        if (currentSeason === 'spring') {
          seasonTitle = `Spring Bloom • ${tempStr}`;
          seasonDesc = `Mild ${tempStr} Desert Breeze • Poppies in Bloom • 0.85x Thirst Drain`;
        } else if (currentSeason === 'autumn') {
          seasonTitle = `Autumn Harvest • ${tempStr}`;
          seasonDesc = `Crisp ${tempStr} Mountain Twilight • Dry Canyon Air • Optimal Vigour`;
        } else if (currentSeason === 'winter') {
          seasonTitle = `Winter Mesa • ${tempStr}`;
          seasonDesc = `Brisk ${tempStr} Mountain Chill • Clear Vistas • 0.55x Thirst Drain`;
        } else {
          seasonTitle = `Summer Sun • ${tempStr}`;
          seasonDesc = `Intense ${tempStr} Solar Load • Heat Haze Mirages • 1.8x Thirst Drain`;
        }
        return {
          icon: <Sun className="w-4 h-4 text-amber-400" />,
          title: seasonTitle,
          status: seasonDesc,
          tagColor: 'border-amber-600/30 bg-stone-900/75 text-amber-200',
        };
      }
    }
  };

  const badge = getWeatherBadge();

  const handleCycleWeather = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sequence: WeatherType[] = ['clear', 'light_rain', 'storm', 'clouds', 'sunset', 'sandstorm'];
    const curIdx = sequence.indexOf(weather);
    const nextWeather = sequence[(curIdx + 1) % sequence.length];
    multiplayer.changeWeather(nextWeather);
    dynamicWeatherEngine.syncWeather(nextWeather);
  };

  const currentFeelsLikeF =
    temperatureFeelsLikeF ??
    desertTemperatureService.queryTemperature({
      timeOfDay,
      weather,
      isUnderground,
      isInShade,
      isHunkeredDown,
      nearbyCampfireActive: isNearCampfire,
    }).feelsLikeF;

  return (
    <>
      {/* Real-time SVG Optical Displacement Filter for Atmospheric Heat Shimmer */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="desert-heat-haze-refraction" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.045"
              numOctaves="2"
              result="heatNoise"
              seed="7"
            >
              <animate
                attributeName="baseFrequency"
                dur="4.5s"
                values="0.012 0.040;0.016 0.060;0.012 0.040"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              ref={displacementMapRef}
              in="SourceGraphic"
              in2="heatNoise"
              scale={0}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Primary 2D Canvas Weather, Heat Shimmer & Freezing Frost Layer */}
      <canvas
        ref={canvasRef}
        id="dynamic-weather-screen-canvas"
        className="absolute inset-0 pointer-events-none z-10 w-full h-full"
      />

      {/* Shimmering Heat Haze Optical Refraction Backdrop Layer */}
      <div
        ref={heatHazeRefractionLayerRef}
        id="heat-haze-refraction-layer"
        className="absolute inset-x-0 bottom-0 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          top: '38%',
          opacity: 0,
          display: isUnderground ? 'none' : 'block',
          backdropFilter: 'url(#desert-heat-haze-refraction)',
          WebkitBackdropFilter: 'url(#desert-heat-haze-refraction)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.65) 20%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.65) 20%, black 100%)',
        }}
      />

      {/* Dynamic Weather Warning Modal - Positioned Bottom Center with Auto-Dismiss & Manual Turn Off */}
      {isModalVisible && !isDismissed && (
        <div
          id="weather-modal-bottom-center"
          className={`fixed ${
            isRidingMount ? 'bottom-28 sm:bottom-32' : 'bottom-20 sm:bottom-24'
          } left-1/2 -translate-x-1/2 z-35 pointer-events-auto select-none max-w-[95vw] sm:max-w-xl w-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
        >
          {(() => {
            // Determine active warning state & styles
            let cardBorderBg = 'border-amber-600/50 bg-stone-950/95 shadow-[0_8px_32px_rgba(0,0,0,0.8)] text-amber-100';
            let iconBoxStyle = 'bg-stone-900/80 border-amber-500/40 text-amber-400';
            let modalIcon: React.ReactNode = badge.icon;
            let modalTitle: string = badge.title;
            let modalSubtitle: string = badge.status;
            let modalTag: string = 'WEATHER UPDATE';
            let modalTagStyle = 'bg-stone-900 border-amber-600/30 text-amber-300';
            let contextAction: React.ReactNode = null;

            if (isHaboobWarning) {
              cardBorderBg = 'border-red-500 bg-gradient-to-r from-red-950/95 via-stone-950/95 to-red-950/95 shadow-[0_0_35px_rgba(239,68,68,0.7)] text-red-100 animate-pulse';
              iconBoxStyle = 'bg-red-900/50 border-red-400/60 text-red-400';
              modalIcon = <Wind className="w-5 h-5 text-red-400 animate-spin" style={{ animationDuration: '3s' }} />;
              modalTitle = 'HABOOB WARNING • DUST WALL IMMINENT';
              modalSubtitle = `Towering sand front sweeping off Weaver's Needle in ${engineStatus.sandstormWarningSeconds || 20}s! Prepare to Hunker [Q] or seek shelter.`;
              modalTag = 'HAZARD IMMINENT';
              modalTagStyle = 'bg-red-900/60 border-red-400 text-red-200';
              if (onToggleHunkerDown && !isHunkeredDown) {
                contextAction = (
                  <button
                    type="button"
                    id="weather-hunker-down-btn"
                    onClick={onToggleHunkerDown}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-mono text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                    title="Hunker Down into protective survival crouch [Q]"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Hunker [Q]</span>
                  </button>
                );
              }
            } else if (engineStatus.activeSeasonalEvent === 'winter_frost_gale') {
              cardBorderBg = 'border-sky-400 bg-gradient-to-r from-sky-950/95 via-stone-950/95 to-sky-950/95 shadow-[0_0_30px_rgba(56,189,248,0.6)] text-sky-100 animate-pulse';
              iconBoxStyle = 'bg-sky-900/50 border-sky-400 text-sky-300';
              modalIcon = <Snowflake className="w-5 h-5 text-sky-300 animate-spin" style={{ animationDuration: '6s' }} />;
              modalTitle = `FOUR PEAKS FROST GALE • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = `Sub-freezing mountain gale (-18°F chill)! Ice crystals stinging face. ${engineStatus.seasonalTimeRemaining ? `${engineStatus.seasonalTimeRemaining}s remaining` : 'Seek warmth'}.`;
              modalTag = '-18°F ARCTIC CHILL';
              modalTagStyle = 'bg-sky-600/40 border-sky-300 text-sky-100 animate-pulse';
              if (onOpenCamp) {
                contextAction = (
                  <button
                    type="button"
                    id="weather-camp-btn"
                    onClick={onOpenCamp}
                    className="px-3 py-1.5 rounded-xl bg-sky-900 hover:bg-sky-800 border border-sky-400/70 text-sky-100 font-mono text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer shrink-0 flex items-center gap-1"
                    title="Open Camp & Build Campfire [C]"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Camp [C]</span>
                  </button>
                );
              }
            } else if (engineStatus.activeSeasonalEvent === 'winter_mountain_sleet') {
              cardBorderBg = 'border-cyan-400 bg-gradient-to-r from-cyan-950/95 via-stone-950/95 to-cyan-950/95 shadow-[0_0_25px_rgba(34,211,238,0.5)] text-cyan-100';
              iconBoxStyle = 'bg-cyan-900/50 border-cyan-400 text-cyan-300';
              modalIcon = <Snowflake className="w-5 h-5 text-cyan-300" />;
              modalTitle = `MOUNTAIN SLEET & MIST • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = 'Freezing sleet flurries & dense mist envelope the crags. Stiffening joints!';
              modalTag = 'FREEZING SLEET';
              modalTagStyle = 'bg-cyan-600/40 border-cyan-300 text-cyan-100';
            } else if (engineStatus.activeSeasonalEvent === 'spring_superbloom_shower') {
              cardBorderBg = 'border-emerald-400 bg-gradient-to-r from-emerald-950/95 via-stone-950/95 to-emerald-950/95 shadow-[0_0_25px_rgba(52,211,153,0.5)] text-emerald-100';
              iconBoxStyle = 'bg-emerald-900/50 border-emerald-400 text-emerald-300';
              modalIcon = <Sparkles className="w-5 h-5 text-emerald-300 animate-spin" style={{ animationDuration: '8s' }} />;
              modalTitle = `SUPERBLOOM SUN SHOWER • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = 'Refreshing spring rain across blossoming poppies & brittlebush (+15% hydration boost)!';
              modalTag = '+15% HYDRATION BOOST';
              modalTagStyle = 'bg-emerald-600/40 border-emerald-300 text-emerald-100';
            } else if (engineStatus.activeSeasonalEvent === 'spring_pollen_zephyr') {
              cardBorderBg = 'border-lime-400 bg-gradient-to-r from-lime-950/95 via-stone-950/95 to-lime-950/95 shadow-[0_0_25px_rgba(163,230,53,0.5)] text-lime-100';
              iconBoxStyle = 'bg-lime-900/50 border-lime-400 text-lime-300';
              modalIcon = <Wind className="w-5 h-5 text-lime-300" />;
              modalTitle = `FLORAL POLLEN ZEPHYR • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = `Warm desert zephyrs carry yellow poppy pollen across Weaver's Needle. Ideal prospecting!`;
              modalTag = 'SPRING ZEPHYR';
              modalTagStyle = 'bg-lime-600/40 border-lime-300 text-lime-100';
            } else if (engineStatus.activeSeasonalEvent === 'autumn_santa_ana_gale') {
              cardBorderBg = 'border-amber-500 bg-gradient-to-r from-amber-950/95 via-stone-950/95 to-amber-950/95 shadow-[0_0_25px_rgba(245,158,11,0.5)] text-amber-100';
              iconBoxStyle = 'bg-amber-900/50 border-amber-400 text-amber-300';
              modalIcon = <Wind className="w-5 h-5 text-amber-300" />;
              modalTitle = `SANTA ANA CANYON GALE • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = 'Arid canyon downdrafts whip golden dust devils through Peralta Canyon washes!';
              modalTag = 'CANYON GALE';
              modalTagStyle = 'bg-amber-600/40 border-amber-400 text-amber-100';
            } else if (engineStatus.activeSeasonalEvent === 'autumn_harvest_twilight') {
              cardBorderBg = 'border-amber-400 bg-gradient-to-r from-amber-950/95 via-stone-950/95 to-stone-900/95 shadow-[0_0_25px_rgba(251,191,36,0.5)] text-amber-100';
              iconBoxStyle = 'bg-amber-900/50 border-amber-400 text-amber-300';
              modalIcon = <Sunset className="w-5 h-5 text-amber-300" />;
              modalTitle = `INDIAN SUMMER TWILIGHT • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = `Crimson-gold twilight casts dramatic shadows from Weaver's Needle. Mild calm air.`;
              modalTag = 'HARVEST TWILIGHT';
              modalTagStyle = 'bg-amber-500/30 border-amber-400/50 text-amber-200';
            } else if (isSandstormActive) {
              if (isHunkeredDown) {
                cardBorderBg = 'border-amber-500/80 bg-stone-950/95 shadow-[0_0_25px_rgba(245,158,11,0.5)] text-amber-200';
                iconBoxStyle = 'bg-amber-500/20 border-amber-400/50 text-amber-300';
                modalIcon = <Shield className="w-5 h-5 text-amber-300" />;
                modalTitle = 'HUNKERED DOWN • DUST STORM';
                modalSubtitle = `Bracing low behind bedroll & neckerchief. ${engineStatus.sandstormTimeRemaining ? `${engineStatus.sandstormTimeRemaining}s remaining` : 'Gale winds parching air'}.`;
                modalTag = '-80% THIRST DRAIN';
                modalTagStyle = 'bg-amber-500/20 border-amber-400/40 text-amber-200';
                if (onToggleHunkerDown) {
                  contextAction = (
                    <button
                      type="button"
                      id="weather-stand-up-btn"
                      onClick={onToggleHunkerDown}
                      className="px-3 py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-amber-400/60 text-amber-200 font-mono text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                      title="Stand back up [Q]"
                    >
                      Stand [Q]
                    </button>
                  );
                }
              } else {
                cardBorderBg = 'border-red-500 bg-gradient-to-r from-red-950/95 via-stone-950/95 to-red-950/95 shadow-[0_0_35px_rgba(239,68,68,0.7)] text-red-100 animate-pulse';
                iconBoxStyle = 'bg-red-900/50 border-red-500/70 text-red-400';
                modalIcon = <Wind className="w-5 h-5 text-red-400 animate-spin" style={{ animationDuration: '3s' }} />;
                modalTitle = `HABOOB DUST STORM! • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
                modalSubtitle = 'Choking sand wall parches throat (3.5x thirst surge)! Hunker down or seek shelter.';
                modalTag = '3.5x THIRST SURGE';
                modalTagStyle = 'bg-red-600/40 border-red-400 text-red-100 animate-bounce';
                if (onToggleHunkerDown) {
                  contextAction = (
                    <button
                      type="button"
                      id="weather-hunker-down-btn"
                      onClick={onToggleHunkerDown}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-mono text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                      title="Hunker Down into protective survival crouch [Q]"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Hunker [Q]</span>
                    </button>
                  );
                }
              }
            } else if (isExtremeFrost) {
              cardBorderBg = 'border-sky-400/90 bg-gradient-to-r from-sky-950/95 via-stone-950/95 to-sky-950/95 shadow-[0_0_25px_rgba(56,189,248,0.55)] text-sky-100 animate-pulse';
              iconBoxStyle = 'bg-sky-900/40 border-sky-400/60 text-sky-300';
              modalIcon = <Snowflake className="w-5 h-5 text-sky-300 animate-spin" style={{ animationDuration: '8s' }} />;
              modalTitle = `FREEZING FROST • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = 'Ice crystals creeping across vision! Build a campfire [C] or head to town.';
              modalTag = 'STIFFENING CHILL';
              modalTagStyle = 'bg-sky-900/60 border-sky-300 text-sky-200';
              if (onOpenCamp) {
                contextAction = (
                  <button
                    type="button"
                    id="weather-camp-btn"
                    onClick={onOpenCamp}
                    className="px-3 py-1.5 rounded-xl bg-sky-900 hover:bg-sky-800 border border-sky-400/70 text-sky-100 font-mono text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer shrink-0 flex items-center gap-1"
                    title="Open Camp & Build Campfire [C]"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Camp [C]</span>
                  </button>
                );
              }
            } else if (isExtremeHeat) {
              cardBorderBg = 'border-amber-500 bg-gradient-to-r from-amber-950/95 via-orange-950/95 to-amber-950/95 shadow-[0_0_25px_rgba(245,158,11,0.55)] text-amber-100 animate-pulse';
              iconBoxStyle = 'bg-amber-900/40 border-amber-500/60 text-amber-400';
              modalIcon = <Sun className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />;
              modalTitle = `SHIMMERING HEAT HAZE • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = 'Intense solar radiation & desert mirage! Dehydration accelerated. Seek rock or cliff shade.';
              modalTag = 'MIRAGE ACTIVE';
              modalTagStyle = 'bg-amber-900/60 border-amber-400 text-amber-200';
            } else if (isStormActive) {
              cardBorderBg = 'border-cyan-500 bg-gradient-to-r from-cyan-950/95 via-slate-950/95 to-cyan-950/95 shadow-[0_0_25px_rgba(6,182,212,0.5)] text-cyan-100';
              iconBoxStyle = 'bg-cyan-900/40 border-cyan-400/60 text-cyan-300';
              modalIcon = <CloudLightning className="w-5 h-5 text-cyan-300 animate-pulse" />;
              modalTitle = `MONSOON THUNDERSTORM • ${desertTemperatureService.formatTemp(currentFeelsLikeF)}`;
              modalSubtitle = 'Flash flood caution in mountain washes! Torrential rain chilling air.';
              modalTag = 'FLASH FLOOD CAUTION';
              modalTagStyle = 'bg-cyan-900/60 border-cyan-300 text-cyan-200';
            } else if (isCampfireThawing) {
              modalTag = 'THAWING FROST';
              modalTagStyle = 'bg-amber-950/70 border-amber-500/60 text-amber-300';
            }

            return (
              <div
                className={`relative flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-2xl border-2 backdrop-blur-md ${cardBorderBg}`}
              >
                {/* Left Icon Badge */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${iconBoxStyle}`}
                >
                  {modalIcon}
                </div>

                {/* Middle Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono">
                      {modalTitle}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${modalTagStyle}`}>
                      {modalTag}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border border-amber-500/30 bg-stone-900/90 text-amber-300">
                      {seasonInfo.icon} {seasonInfo.name}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-300/90 leading-tight mt-0.5 line-clamp-1">
                    {modalSubtitle}
                  </p>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {contextAction}

                  {/* Trigger Seasonal Event Button */}
                  <button
                    type="button"
                    id="weather-trigger-event-btn"
                    onClick={() => {
                      dynamicWeatherEngine.triggerSeasonalEvent();
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 hover:text-amber-100 border border-amber-500/50 text-xs transition active:scale-95 cursor-pointer shadow font-mono"
                    title={`Trigger unique seasonal event for ${seasonInfo.name}`}
                    aria-label="Trigger seasonal event"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
                    <span className="hidden sm:inline text-[11px] font-bold">Event</span>
                  </button>

                  {/* Cycle Weather Button */}
                  <button
                    type="button"
                    id="weather-status-pill"
                    onClick={handleCycleWeather}
                    className="p-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-850 text-amber-300 hover:text-amber-100 border border-amber-600/40 text-xs transition active:scale-95 cursor-pointer shadow"
                    title="Click to cycle desert weather & summon rain"
                    aria-label="Cycle weather"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Dedicated Turn Off / Dismiss Button */}
                  <button
                    type="button"
                    id="weather-modal-turn-off-btn"
                    onClick={handleTurnOffModal}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-600/70 hover:border-red-400 text-stone-300 hover:text-red-200 text-xs font-mono transition-all active:scale-95 cursor-pointer shadow group"
                    title="Turn off weather warning modal [Esc]"
                    aria-label="Turn off weather modal"
                  >
                    <X className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-400" />
                    <span className="text-[11px] font-bold">Turn Off</span>
                  </button>
                </div>

                {/* Auto-Dismiss Progress Indicator Bar */}
                <div className="absolute -bottom-[2px] left-4 right-4 h-[2px] bg-stone-800/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                      isSevere ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, (autoDismissSeconds / (isSevere ? 9 : 6)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
};
