import React, { useEffect, useRef, useState } from 'react';
import { WeatherType } from '../types';
import { CloudRain, Wind, Sun, CloudLightning, Sunset, Cloud } from 'lucide-react';
import { multiplayer } from '../multiplayer/multiplayerService';

interface WeatherCanvasOverlayProps {
  weather: WeatherType;
  timeOfDay: number;
  isUnderground?: boolean;
  lightningFlashIntensity?: number;
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

export const WeatherCanvasOverlay: React.FC<WeatherCanvasOverlayProps> = ({
  weather,
  timeOfDay,
  isUnderground = false,
  lightningFlashIntensity = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [badgeVisible, setBadgeVisible] = useState(true);
  const badgeTimerRef = useRef<number | null>(null);

  // Smooth weather transition alphas (0.0 to 1.0)
  const alphasRef = useRef({
    sandstorm: weather === 'sandstorm' ? 1.0 : 0.0,
    lightRain: weather === 'light_rain' ? 1.0 : 0.0,
    storm: weather === 'storm' ? 1.0 : 0.0,
    goldenDust: weather === 'sunset' || weather === 'clear' ? 0.8 : 0.0,
  });

  // Persistent particles
  const dropletsRef = useRef<RainDroplet[]>([]);
  const sandGrainsRef = useRef<SandGrain[]>([]);
  const dustMotesRef = useRef<ScreenDustMote[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const gustPhaseRef = useRef<number>(0);

  // Show badge on weather change
  useEffect(() => {
    setBadgeVisible(true);
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = window.setTimeout(() => {
      setBadgeVisible(false);
    }, 4500);
    return () => {
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    };
  }, [weather]);

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

    const render = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      gustPhaseRef.current += dt * 1.8;

      // Target alphas
      const targetSandstorm = !isUnderground && weather === 'sandstorm' ? 1.0 : 0.0;
      const targetLightRain = !isUnderground && weather === 'light_rain' ? 1.0 : 0.0;
      const targetStorm = !isUnderground && weather === 'storm' ? 1.0 : 0.0;
      const targetGoldenDust = !isUnderground && (weather === 'sunset' || weather === 'clear') ? 0.75 : 0.0;

      // Lerp alphas
      const lerpSpeed = dt * 3.2;
      const alphas = alphasRef.current;
      alphas.sandstorm += (targetSandstorm - alphas.sandstorm) * lerpSpeed;
      alphas.lightRain += (targetLightRain - alphas.lightRain) * lerpSpeed;
      alphas.storm += (targetStorm - alphas.storm) * lerpSpeed;
      alphas.goldenDust += (targetGoldenDust - alphas.goldenDust) * lerpSpeed;

      ctx.clearRect(0, 0, width, height);

      // 1. --- SANDSTORM DUST PARTICLES & SCREEN HABOOB EFFECT ---
      if (alphas.sandstorm > 0.01) {
        const a = alphas.sandstorm;
        const gust = 1.0 + 0.35 * Math.sin(gustPhaseRef.current * 0.8) * Math.sin(gustPhaseRef.current * 1.7);

        // A. Atmospheric dusty lens vignette
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.28,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.72
        );
        grad.addColorStop(0, 'rgba(180, 95, 35, 0)');
        grad.addColorStop(0.5, `rgba(195, 110, 45, ${0.12 * a * gust})`);
        grad.addColorStop(1, `rgba(165, 80, 25, ${0.48 * a * gust})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // B. Whipping horizontal sand dust streaks
        ctx.save();
        for (const g of sandGrainsRef.current) {
          g.x += g.speed * gust * dt;
          g.y += (Math.sin(g.x * 0.01 + gustPhaseRef.current) * 35) * dt;

          if (g.x > width + g.len) {
            g.x = -g.len - Math.random() * 100;
            g.y = Math.random() * height;
          }

          ctx.strokeStyle = `${g.color}${g.alpha * a * gust})`;
          ctx.lineWidth = g.width;
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.lineTo(g.x - g.len * (0.8 + gust * 0.3), g.y - 2);
          ctx.stroke();
        }
        ctx.restore();

        // C. Rolling Haboob dust curtains (sweeping transparent gradient waves)
        const waveX1 = (now * 0.12) % (width + 600) - 300;
        const waveGrad1 = ctx.createLinearGradient(waveX1 - 250, 0, waveX1 + 250, 0);
        waveGrad1.addColorStop(0, 'rgba(215, 135, 65, 0)');
        waveGrad1.addColorStop(0.5, `rgba(225, 150, 80, ${0.14 * a * gust})`);
        waveGrad1.addColorStop(1, 'rgba(215, 135, 65, 0)');
        ctx.fillStyle = waveGrad1;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. --- LIGHT RAIN & STORM EFFECTS (SCREEN DROPLETS + STREAKS) ---
      const totalRainAlpha = Math.max(alphas.lightRain, alphas.storm);
      if (totalRainAlpha > 0.01) {
        const isIntense = alphas.storm > alphas.lightRain;
        const rainFactor = isIntense ? alphas.storm : alphas.lightRain * 0.6;

        // A. Screen rainfall streaks
        const streakCount = isIntense ? 85 : 35;
        const streakSpeed = isIntense ? 1600 : 900;
        const streakAngle = isIntense ? 0.32 : 0.14; // radians

        ctx.save();
        ctx.strokeStyle = isIntense
          ? `rgba(210, 235, 255, ${0.45 * rainFactor})`
          : `rgba(220, 240, 255, ${0.28 * rainFactor})`;
        ctx.lineWidth = isIntense ? 1.6 : 1.1;

        for (let i = 0; i < streakCount; i++) {
          const sx = ((now * streakSpeed * 0.3 * streakAngle + i * 193) % (width + 400)) - 200;
          const sy = (now * streakSpeed * 0.7 + i * 287) % (height + 200) - 100;
          const len = isIntense ? 65 : 38;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + len * Math.sin(streakAngle), sy + len * Math.cos(streakAngle));
          ctx.stroke();
        }
        ctx.restore();

        // B. Dynamic Camera Lens Droplets (Spawn & trickle down)
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
            // Heavier droplets trickle down
            d.y += d.speed * dt;
            if (Math.random() < 0.3) {
              d.trail.push({ y: d.y, alpha: 0.4 });
            }
          }

          const fadeOut = Math.max(0, 1 - d.life / d.maxLife);
          const dropAlpha = fadeOut * totalRainAlpha;

          // Droplet trickle trails
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

          // Refraction droplet body
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 225, 255, ${0.18 * dropAlpha})`;
          ctx.fill();

          // Droplet rim highlight
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * dropAlpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();

          // Specular highlight dot (simulating sky bounce)
          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * dropAlpha})`;
          ctx.beginPath();
          ctx.arc(d.x - d.r * 0.32, d.y - d.r * 0.32, d.r * 0.28, 0, Math.PI * 2);
          ctx.fill();

          if (d.life >= d.maxLife || d.y > height + 20) {
            droplets.splice(i, 1);
          }
        }

        // C. Moisture vignette
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

      // 3. --- LIGHTNING SPECULAR SCREEN FLASH ---
      if (lightningFlashIntensity > 0.01) {
        ctx.fillStyle = `rgba(225, 240, 255, ${lightningFlashIntensity * 0.55})`;
        ctx.fillRect(0, 0, width, height);
      }

      // 4. --- GOLDEN HOUR / DESERT SUNBEAM DUST MOTES ---
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
          ctx.fillStyle = `rgba(254, 240, 185, ${moteAlpha})`;
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
  }, [weather, isUnderground, lightningFlashIntensity]);

  // Weather title and icon mapping
  const getWeatherBadge = () => {
    switch (weather) {
      case 'sandstorm':
        return {
          icon: <Wind className="w-4 h-4 text-amber-400 animate-spin" />,
          title: 'Haboob Sandstorm',
          status: 'Winds 46 mph • Visibility 0.2 mi • High Dust Suspension',
          tagColor: 'border-amber-600/40 bg-amber-950/80 text-amber-200',
        };
      case 'light_rain':
        return {
          icon: <CloudRain className="w-4 h-4 text-sky-300 animate-bounce" />,
          title: 'Desert Shower',
          status: 'Light Rain 0.15 in/hr • Desert Air Cools • Mountain Mist',
          tagColor: 'border-sky-600/40 bg-slate-900/80 text-sky-200',
        };
      case 'storm':
        return {
          icon: <CloudLightning className="w-4 h-4 text-cyan-300 animate-pulse" />,
          title: 'Monsoon Thunderstorm',
          status: 'Flash Flood Caution • Cloud-to-Ground Lightning • Heavy Rain',
          tagColor: 'border-cyan-600/40 bg-slate-950/85 text-cyan-200',
        };
      case 'sunset':
        return {
          icon: <Sunset className="w-4 h-4 text-amber-300" />,
          title: 'Golden Hour (16:00)',
          status: "Weaver's Needle Shadow Aligned • Peralta Treasure Marker Visible",
          tagColor: 'border-orange-600/40 bg-stone-900/80 text-amber-200',
        };
      case 'clouds':
        return {
          icon: <Cloud className="w-4 h-4 text-slate-300" />,
          title: 'Desert Cumulus Banks',
          status: 'Overcast Cloud Cover • Diffused Sunlight • Mild Breeze',
          tagColor: 'border-slate-600/40 bg-slate-900/80 text-slate-200',
        };
      case 'night':
        return {
          icon: <Sun className="w-4 h-4 text-indigo-300" />,
          title: 'Starry Desert Night',
          status: 'Milky Way Overhead • Clear Night Sky • Starlight Illumination',
          tagColor: 'border-indigo-600/40 bg-slate-950/85 text-indigo-200',
        };
      case 'clear':
      default:
        return {
          icon: <Sun className="w-4 h-4 text-amber-400" />,
          title: 'Clear Arizona Sky',
          status: 'Unobstructed Solar Radiation • 0% Cloud Cover',
          tagColor: 'border-amber-600/30 bg-stone-900/75 text-amber-200',
        };
    }
  };

  const badge = getWeatherBadge();

  const handleCycleWeather = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sequence: WeatherType[] = ['clear', 'light_rain', 'storm', 'clouds', 'sunset', 'sandstorm'];
    const curIdx = sequence.indexOf(weather);
    const nextWeather = sequence[(curIdx + 1) % sequence.length];
    multiplayer.changeWeather(nextWeather);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        id="dynamic-weather-screen-canvas"
        className="absolute inset-0 pointer-events-none z-10 w-full h-full"
      />

      {/* Synchronized Meteorological Status Pill (Interactive to cycle weather / summon rain) */}
      <div
        id="weather-status-pill"
        onClick={handleCycleWeather}
        title="Click to cycle desert weather & summon rain!"
        className={`absolute top-4 right-4 z-20 transition-all duration-700 pointer-events-auto cursor-pointer select-none hover:scale-105 active:scale-95 ${
          badgeVisible ? 'opacity-100 translate-y-0' : 'opacity-85 translate-y-0 hover:opacity-100'
        }`}
      >
        <div
          className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-lg text-xs font-mono tracking-wide ${badge.tagColor}`}
        >
          {badge.icon}
          <div>
            <span className="font-semibold">{badge.title}</span>
            <span className="opacity-65 ml-2 hidden sm:inline text-[11px]">{badge.status}</span>
            <span className="opacity-50 ml-1.5 hidden md:inline text-[10px] text-amber-200/80">⟳ Click to cycle</span>
          </div>
        </div>
      </div>
    </>
  );
};
