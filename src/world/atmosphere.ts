import * as THREE from 'three';
import { WeatherType } from '../types';
import { soundEngine } from '../audio/soundEffects';

interface CloudCluster {
  mesh: THREE.Group;
  topSprites: THREE.Sprite[];
  baseSprites: THREE.Sprite[];
  speed: number;
  baseY: number;
}

interface OutOfBoundsCloudCluster {
  mesh: THREE.Group;
  topSprites: THREE.Sprite[];
  baseSprites: THREE.Sprite[];
  mistSprites: THREE.Sprite[];
  angle: number;
  radius: number;
  baseY: number;
  driftSpeed: number;
  bobPhase: number;
  bobSpeed: number;
  initialScales: { sprite: THREE.Sprite; scaleX: number; scaleY: number }[];
}

/**
 * Procedural soft radial cumulus puff texture.
 * Generates organic, billowy fractal edges with zero sharp polygon boundaries.
 */
function createCloudPuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Overlapping Gaussian billow puffs creating a soft, voluminous cumulus contour
  const puffs = [
    { x: 128, y: 128, r: 86, a: 0.85 },
    { x: 96, y: 138, r: 72, a: 0.72 },
    { x: 160, y: 134, r: 74, a: 0.72 },
    { x: 128, y: 96, r: 68, a: 0.80 },
    { x: 86, y: 110, r: 58, a: 0.62 },
    { x: 168, y: 106, r: 60, a: 0.62 },
    { x: 128, y: 162, r: 70, a: 0.55 },
    { x: 68, y: 142, r: 48, a: 0.45 },
    { x: 188, y: 140, r: 50, a: 0.45 },
    { x: 144, y: 78, r: 46, a: 0.52 },
    { x: 108, y: 80, r: 44, a: 0.52 },
  ];

  puffs.forEach(({ x, y, r, a }) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${a})`);
    grad.addColorStop(0.42, `rgba(255, 255, 255, ${a * 0.75})`);
    grad.addColorStop(0.72, `rgba(255, 255, 255, ${a * 0.28})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Optical solar corona texture.
 * Features a pure circular radial falloff with high-intensity core and soft golden Mie halo.
 * 100% circular — completely eliminates hard square quad edges.
 */
function createSunCoronaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Outer atmospheric corona halo
  const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 252);
  outerGrad.addColorStop(0, 'rgba(255, 255, 242, 0.95)');
  outerGrad.addColorStop(0.08, 'rgba(255, 242, 190, 0.82)');
  outerGrad.addColorStop(0.24, 'rgba(255, 218, 130, 0.45)');
  outerGrad.addColorStop(0.48, 'rgba(255, 185, 80, 0.18)');
  outerGrad.addColorStop(0.76, 'rgba(255, 155, 45, 0.05)');
  outerGrad.addColorStop(1.0, 'rgba(255, 125, 20, 0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 252, 0, Math.PI * 2);
  ctx.fill();

  // Intense blinding white inner core
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 84);
  innerGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  innerGrad.addColorStop(0.35, 'rgba(255, 255, 235, 0.92)');
  innerGrad.addColorStop(0.70, 'rgba(255, 242, 185, 0.45)');
  innerGrad.addColorStop(1.0, 'rgba(255, 222, 140, 0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 84, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Optical lunar glow texture.
 */
function createMoonGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 124);
  grad.addColorStop(0, 'rgba(235, 244, 255, 0.92)');
  grad.addColorStop(0.20, 'rgba(195, 220, 255, 0.52)');
  grad.addColorStop(0.55, 'rgba(150, 185, 245, 0.18)');
  grad.addColorStop(0.85, 'rgba(110, 150, 235, 0.04)');
  grad.addColorStop(1.0, 'rgba(90, 130, 220, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates an organic radial dust/sand grain texture for particle systems.
 */
function createDustPuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(255, 235, 190, 0.85)');
  grad.addColorStop(0.55, 'rgba(230, 165, 95, 0.35)');
  grad.addColorStop(0.85, 'rgba(190, 115, 55, 0.08)');
  grad.addColorStop(1.0, 'rgba(160, 90, 40, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

interface DiurnalKeyframe {
  time: number;
  zenithColor: THREE.Color;
  horizonColor: THREE.Color;
  sunCoronaColor: THREE.Color;
  sunCoronaIntensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  cloudTopColor: THREE.Color;
  cloudBaseColor: THREE.Color;
  cloudOpacity: number;
  sunAlpha: number;
  moonAlpha: number;
  starAlpha: number;
}

export interface InterpolatedDiurnalState {
  zenithColor: THREE.Color;
  horizonColor: THREE.Color;
  sunCoronaColor: THREE.Color;
  sunCoronaIntensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  cloudTopColor: THREE.Color;
  cloudBaseColor: THREE.Color;
  cloudOpacity: number;
  sunAlpha: number;
  moonAlpha: number;
  starAlpha: number;
}

const DIURNAL_KEYFRAMES: DiurnalKeyframe[] = [
  // 1. Deep Midnight (1:30)
  {
    time: 1.5,
    zenithColor: new THREE.Color(0x02040c),
    horizonColor: new THREE.Color(0x060c1c),
    sunCoronaColor: new THREE.Color(0xffeedd),
    sunCoronaIntensity: 0.0,
    sunColor: new THREE.Color(0x6d85b6),
    sunIntensity: 0.32,
    hemiSkyColor: new THREE.Color(0x142035),
    hemiGroundColor: new THREE.Color(0x080c14),
    fogColor: new THREE.Color(0x070b16),
    fogDensity: 0.00085,
    cloudTopColor: new THREE.Color(0x283448),
    cloudBaseColor: new THREE.Color(0x121824),
    cloudOpacity: 0.40,
    sunAlpha: 0.0,
    moonAlpha: 0.95,
    starAlpha: 1.0,
  },
  // 2. Pre-Dawn (4.4)
  {
    time: 4.4,
    zenithColor: new THREE.Color(0x030612),
    horizonColor: new THREE.Color(0x081022),
    sunCoronaColor: new THREE.Color(0xffeedd),
    sunCoronaIntensity: 0.0,
    sunColor: new THREE.Color(0x6d85b6),
    sunIntensity: 0.32,
    hemiSkyColor: new THREE.Color(0x162238),
    hemiGroundColor: new THREE.Color(0x090e18),
    fogColor: new THREE.Color(0x080e1a),
    fogDensity: 0.00080,
    cloudTopColor: new THREE.Color(0x2a364c),
    cloudBaseColor: new THREE.Color(0x141b28),
    cloudOpacity: 0.45,
    sunAlpha: 0.0,
    moonAlpha: 0.90,
    starAlpha: 1.0,
  },
  // 3. Astronomical to Nautical Dawn (5.2)
  {
    time: 5.2,
    zenithColor: new THREE.Color(0x0a1430),
    horizonColor: new THREE.Color(0x261938),
    sunCoronaColor: new THREE.Color(0xff8844),
    sunCoronaIntensity: 0.15,
    sunColor: new THREE.Color(0x787fa6),
    sunIntensity: 0.40,
    hemiSkyColor: new THREE.Color(0x2a2c4e),
    hemiGroundColor: new THREE.Color(0x121222),
    fogColor: new THREE.Color(0x18172c),
    fogDensity: 0.00075,
    cloudTopColor: new THREE.Color(0x4d4668),
    cloudBaseColor: new THREE.Color(0x221e35),
    cloudOpacity: 0.60,
    sunAlpha: 0.15,
    moonAlpha: 0.55,
    starAlpha: 0.65,
  },
  // 4. Civil Dawn & First Light (5.8)
  {
    time: 5.8,
    zenithColor: new THREE.Color(0x1a386e),
    horizonColor: new THREE.Color(0xe26a32),
    sunCoronaColor: new THREE.Color(0xff9040),
    sunCoronaIntensity: 0.85,
    sunColor: new THREE.Color(0xff9e52),
    sunIntensity: 1.40,
    hemiSkyColor: new THREE.Color(0xffc48e),
    hemiGroundColor: new THREE.Color(0x6a3018),
    fogColor: new THREE.Color(0xc87448),
    fogDensity: 0.00070,
    cloudTopColor: new THREE.Color(0xffd8aa),
    cloudBaseColor: new THREE.Color(0x7884a6),
    cloudOpacity: 0.82,
    sunAlpha: 0.75,
    moonAlpha: 0.15,
    starAlpha: 0.15,
  },
  // 5. Sunrise Peak & Golden Morning (6.5)
  {
    time: 6.5,
    zenithColor: new THREE.Color(0x24529c),
    horizonColor: new THREE.Color(0xf09848),
    sunCoronaColor: new THREE.Color(0xffaf55),
    sunCoronaIntensity: 1.10,
    sunColor: new THREE.Color(0xffb866),
    sunIntensity: 1.85,
    hemiSkyColor: new THREE.Color(0xffdfb2),
    hemiGroundColor: new THREE.Color(0x8c4424),
    fogColor: new THREE.Color(0xda9460),
    fogDensity: 0.00062,
    cloudTopColor: new THREE.Color(0xfff0cc),
    cloudBaseColor: new THREE.Color(0xa4b6d4),
    cloudOpacity: 0.86,
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    starAlpha: 0.0,
  },
  // 6. Mid-Morning (8.0)
  {
    time: 8.0,
    zenithColor: new THREE.Color(0x2c6cc8),
    horizonColor: new THREE.Color(0xbfdcfa),
    sunCoronaColor: new THREE.Color(0xffe8ba),
    sunCoronaIntensity: 1.0,
    sunColor: new THREE.Color(0xfff2dc),
    sunIntensity: 2.05,
    hemiSkyColor: new THREE.Color(0xe6f4fe),
    hemiGroundColor: new THREE.Color(0x94653d),
    fogColor: new THREE.Color(0xc6dff8),
    fogDensity: 0.00052,
    cloudTopColor: new THREE.Color(0xffffff),
    cloudBaseColor: new THREE.Color(0xd4e4f8),
    cloudOpacity: 0.84,
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    starAlpha: 0.0,
  },
  // 7. Midday (12.0)
  {
    time: 12.0,
    zenithColor: new THREE.Color(0x2e70d4),
    horizonColor: new THREE.Color(0xc2ddf8),
    sunCoronaColor: new THREE.Color(0xfffaee),
    sunCoronaIntensity: 1.0,
    sunColor: new THREE.Color(0xfffbf0),
    sunIntensity: 2.15,
    hemiSkyColor: new THREE.Color(0xe0f2fe),
    hemiGroundColor: new THREE.Color(0x94653d),
    fogColor: new THREE.Color(0xc2ddf8),
    fogDensity: 0.00050,
    cloudTopColor: new THREE.Color(0xffffff),
    cloudBaseColor: new THREE.Color(0xdbeafe),
    cloudOpacity: 0.82,
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    starAlpha: 0.0,
  },
  // 8. Late Afternoon (15.5)
  {
    time: 15.5,
    zenithColor: new THREE.Color(0x2a68c4),
    horizonColor: new THREE.Color(0xcbe0f6),
    sunCoronaColor: new THREE.Color(0xfff2d2),
    sunCoronaIntensity: 1.05,
    sunColor: new THREE.Color(0xfff5e4),
    sunIntensity: 2.20,
    hemiSkyColor: new THREE.Color(0xe8f2fe),
    hemiGroundColor: new THREE.Color(0x99643a),
    fogColor: new THREE.Color(0xcae0f8),
    fogDensity: 0.00052,
    cloudTopColor: new THREE.Color(0xffffff),
    cloudBaseColor: new THREE.Color(0xd6e5f8),
    cloudOpacity: 0.84,
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    starAlpha: 0.0,
  },
  // 9. Golden Hour (17.0)
  {
    time: 17.0,
    zenithColor: new THREE.Color(0x2458a8),
    horizonColor: new THREE.Color(0xf4b260),
    sunCoronaColor: new THREE.Color(0xffb855),
    sunCoronaIntensity: 1.25,
    sunColor: new THREE.Color(0xffaa58),
    sunIntensity: 2.40,
    hemiSkyColor: new THREE.Color(0xffdfba),
    hemiGroundColor: new THREE.Color(0xa0552b),
    fogColor: new THREE.Color(0xdda06d),
    fogDensity: 0.00062,
    cloudTopColor: new THREE.Color(0xfef3c7),
    cloudBaseColor: new THREE.Color(0xb0c0d6),
    cloudOpacity: 0.88,
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    starAlpha: 0.0,
  },
  // 10. Sunset & Arizona Alpenglow (18.2)
  {
    time: 18.2,
    zenithColor: new THREE.Color(0x162c5c),
    horizonColor: new THREE.Color(0xf05424),
    sunCoronaColor: new THREE.Color(0xff7a33),
    sunCoronaIntensity: 1.15,
    sunColor: new THREE.Color(0xff6a30),
    sunIntensity: 1.60,
    hemiSkyColor: new THREE.Color(0xf48c5a),
    hemiGroundColor: new THREE.Color(0x6e2814),
    fogColor: new THREE.Color(0xd26838),
    fogDensity: 0.00070,
    cloudTopColor: new THREE.Color(0xffc08a),
    cloudBaseColor: new THREE.Color(0x7e6a8e),
    cloudOpacity: 0.86,
    sunAlpha: 0.80,
    moonAlpha: 0.20,
    starAlpha: 0.05,
  },
  // 11. Civil Dusk & Purple Twilight (19.2)
  {
    time: 19.2,
    zenithColor: new THREE.Color(0x0c1838),
    horizonColor: new THREE.Color(0x5a2448),
    sunCoronaColor: new THREE.Color(0xd45030),
    sunCoronaIntensity: 0.35,
    sunColor: new THREE.Color(0x8a546a),
    sunIntensity: 0.55,
    hemiSkyColor: new THREE.Color(0x50325c),
    hemiGroundColor: new THREE.Color(0x221324),
    fogColor: new THREE.Color(0x34203a),
    fogDensity: 0.00075,
    cloudTopColor: new THREE.Color(0x6a4864),
    cloudBaseColor: new THREE.Color(0x2a1c32),
    cloudOpacity: 0.65,
    sunAlpha: 0.20,
    moonAlpha: 0.65,
    starAlpha: 0.45,
  },
  // 12. Nautical Twilight (20.2)
  {
    time: 20.2,
    zenithColor: new THREE.Color(0x050c20),
    horizonColor: new THREE.Color(0x141834),
    sunCoronaColor: new THREE.Color(0x904030),
    sunCoronaIntensity: 0.0,
    sunColor: new THREE.Color(0x60749e),
    sunIntensity: 0.35,
    hemiSkyColor: new THREE.Color(0x222644),
    hemiGroundColor: new THREE.Color(0x0c0f1e),
    fogColor: new THREE.Color(0x121426),
    fogDensity: 0.00080,
    cloudTopColor: new THREE.Color(0x3a3c56),
    cloudBaseColor: new THREE.Color(0x181a2e),
    cloudOpacity: 0.48,
    sunAlpha: 0.0,
    moonAlpha: 0.90,
    starAlpha: 0.85,
  },
  // 13. Astronomical Twilight into Night (21.5)
  {
    time: 21.5,
    zenithColor: new THREE.Color(0x02040c),
    horizonColor: new THREE.Color(0x060c1c),
    sunCoronaColor: new THREE.Color(0xffeedd),
    sunCoronaIntensity: 0.0,
    sunColor: new THREE.Color(0x6d85b6),
    sunIntensity: 0.32,
    hemiSkyColor: new THREE.Color(0x142035),
    hemiGroundColor: new THREE.Color(0x080c14),
    fogColor: new THREE.Color(0x070b16),
    fogDensity: 0.00085,
    cloudTopColor: new THREE.Color(0x283448),
    cloudBaseColor: new THREE.Color(0x121824),
    cloudOpacity: 0.40,
    sunAlpha: 0.0,
    moonAlpha: 0.95,
    starAlpha: 1.0,
  },
];

function getInterpolatedDiurnalState(time: number, out?: InterpolatedDiurnalState): InterpolatedDiurnalState {
  const result: InterpolatedDiurnalState = out || {
    zenithColor: new THREE.Color(),
    horizonColor: new THREE.Color(),
    sunCoronaColor: new THREE.Color(),
    sunCoronaIntensity: 0,
    sunColor: new THREE.Color(),
    sunIntensity: 0,
    hemiSkyColor: new THREE.Color(),
    hemiGroundColor: new THREE.Color(),
    fogColor: new THREE.Color(),
    fogDensity: 0,
    cloudTopColor: new THREE.Color(),
    cloudBaseColor: new THREE.Color(),
    cloudOpacity: 0,
    sunAlpha: 0,
    moonAlpha: 0,
    starAlpha: 0,
  };

  const normTime = ((time % 24) + 24) % 24;
  const n = DIURNAL_KEYFRAMES.length;
  let k1: DiurnalKeyframe;
  let k2: DiurnalKeyframe;
  let rawT = 0;

  if (normTime >= DIURNAL_KEYFRAMES[n - 1].time || normTime < DIURNAL_KEYFRAMES[0].time) {
    k1 = DIURNAL_KEYFRAMES[n - 1];
    k2 = DIURNAL_KEYFRAMES[0];
    const span = (k2.time - k1.time + 24) % 24;
    const offset = normTime >= k1.time ? normTime - k1.time : normTime + 24 - k1.time;
    rawT = offset / span;
  } else {
    let idx = 0;
    for (let i = 0; i < n - 1; i++) {
      if (normTime >= DIURNAL_KEYFRAMES[i].time && normTime < DIURNAL_KEYFRAMES[i + 1].time) {
        idx = i;
        break;
      }
    }
    k1 = DIURNAL_KEYFRAMES[idx];
    k2 = DIURNAL_KEYFRAMES[idx + 1];
    rawT = (normTime - k1.time) / (k2.time - k1.time);
  }

  // Hermite smoothstep easing for continuous C1 transitions
  const t = rawT * rawT * (3 - 2 * rawT);

  result.zenithColor.lerpColors(k1.zenithColor, k2.zenithColor, t);
  result.horizonColor.lerpColors(k1.horizonColor, k2.horizonColor, t);
  result.sunCoronaColor.lerpColors(k1.sunCoronaColor, k2.sunCoronaColor, t);
  result.sunCoronaIntensity = THREE.MathUtils.lerp(k1.sunCoronaIntensity, k2.sunCoronaIntensity, t);
  result.sunColor.lerpColors(k1.sunColor, k2.sunColor, t);
  result.sunIntensity = THREE.MathUtils.lerp(k1.sunIntensity, k2.sunIntensity, t);
  result.hemiSkyColor.lerpColors(k1.hemiSkyColor, k2.hemiSkyColor, t);
  result.hemiGroundColor.lerpColors(k1.hemiGroundColor, k2.hemiGroundColor, t);
  result.fogColor.lerpColors(k1.fogColor, k2.fogColor, t);
  result.fogDensity = THREE.MathUtils.lerp(k1.fogDensity, k2.fogDensity, t);
  result.cloudTopColor.lerpColors(k1.cloudTopColor, k2.cloudTopColor, t);
  result.cloudBaseColor.lerpColors(k1.cloudBaseColor, k2.cloudBaseColor, t);
  result.cloudOpacity = THREE.MathUtils.lerp(k1.cloudOpacity, k2.cloudOpacity, t);
  result.sunAlpha = THREE.MathUtils.lerp(k1.sunAlpha, k2.sunAlpha, t);
  result.moonAlpha = THREE.MathUtils.lerp(k1.moonAlpha, k2.moonAlpha, t);
  result.starAlpha = THREE.MathUtils.lerp(k1.starAlpha, k2.starAlpha, t);

  return result;
}

export function getCelestialDirections(time: number): {
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  sunY: number;
} {
  const solarFraction = (time - 6.0) / 12.0;
  const sunAngle = solarFraction * Math.PI;
  const sunY = Math.sin(sunAngle) * 0.88 + 0.12;
  const sunDir = new THREE.Vector3(
    Math.cos(sunAngle),
    sunY,
    Math.sin(sunAngle * 0.5) * 0.38
  ).normalize();

  const moonAngle = sunAngle + Math.PI;
  const moonY = -sunY;
  const moonDir = new THREE.Vector3(
    Math.cos(moonAngle),
    moonY,
    -Math.sin(sunAngle * 0.5) * 0.38
  ).normalize();

  return { sunDir, moonDir, sunY };
}

/**
 * Advances the diurnal clock with realistic open-world pacing:
 * - Daytime (6:00 to 18:30): Relaxed pacing (~14 mins of sunshine)
 * - Sunset & Dusk (18:30 to 20:30): Cinematic pacing (~1.3 mins of alpenglow)
 * - Night (20:30 to 5:00): Swift pacing (~2.1 mins of starry night)
 * - Dawn (5:00 to 6:00): Gentle dawn (~33 secs)
 * Yields ~88% daylight and ~12% night.
 */
export function advanceDiurnalTime(currentTime: number, deltaSec: number = 1): number {
  let rate: number;
  if (currentTime >= 6.0 && currentTime < 18.5) {
    rate = 0.015;
  } else if (currentTime >= 18.5 && currentTime < 20.5) {
    rate = 0.025;
  } else if (currentTime >= 20.5 || currentTime < 5.0) {
    rate = 0.065;
  } else {
    rate = 0.03;
  }
  return ((currentTime + rate * deltaSec) % 24 + 24) % 24;
}

export class AtmosphereManager {
  private scene: THREE.Scene;
  private skyDome: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;

  // Celestial bodies (Grouped and anchored to optical infinity)
  private sunGroup: THREE.Group = new THREE.Group();
  private sunDiscMesh: THREE.Mesh;
  private sunCoronaSprite: THREE.Sprite;
  private sunOuterGlowSprite: THREE.Sprite;

  private moonGroup: THREE.Group = new THREE.Group();
  private moonDiscMesh: THREE.Mesh;
  private moonGlowSprite: THREE.Sprite;

  // Volumetric procedural cloud banks
  private cloudGroup: THREE.Group = new THREE.Group();
  private clouds: CloudCluster[] = [];

  // Out-of-bounds perimeter cloud banks and mountain fog shrouds
  private outOfBoundsCloudGroup: THREE.Group = new THREE.Group();
  private outOfBoundsClouds: OutOfBoundsCloudCluster[] = [];

  private cloudTexture: THREE.CanvasTexture;
  private sunTexture: THREE.CanvasTexture;
  private moonTexture: THREE.CanvasTexture;
  private dustTexture: THREE.CanvasTexture;

  // Rain and storm lightning
  private rainGroup: THREE.Group = new THREE.Group();
  private rainParticles: THREE.Points | null = null;
  private rainPositions: Float32Array | null = null;
  private lightningLight: THREE.PointLight;
  private lightningMesh: THREE.Line | null = null;

  // Dynamic sandstorm dust particles
  private sandstormGroup: THREE.Group = new THREE.Group();
  private sandstormParticles: THREE.Points | null = null;
  private sandstormPositions: Float32Array | null = null;
  private sandstormVelocities: Float32Array | null = null;

  // Ambient desert floating dust motes
  private ambientDustGroup: THREE.Group = new THREE.Group();
  private ambientDustParticles: THREE.Points | null = null;
  private ambientDustPositions: Float32Array | null = null;

  private weather: WeatherType = 'clear';
  private timeOfDay: number = 9.5; // default 9:30 AM bright morning desert sunshine
  private currentTimeOfDay: number = 9.5;
  private targetTimeOfDay: number = 9.5;
  private isInitialized: boolean = false;
  private weatherWeights = { sandstorm: 0, storm: 0, lightRain: 0 };
  private cachedSunLight?: THREE.DirectionalLight;
  private cachedHemiLight?: THREE.HemisphereLight;
  private diurnalState: InterpolatedDiurnalState = {
    zenithColor: new THREE.Color(0x2458a8),
    horizonColor: new THREE.Color(0xf4b260),
    sunCoronaColor: new THREE.Color(0xffb855),
    sunCoronaIntensity: 1.25,
    sunColor: new THREE.Color(0xffaa58),
    sunIntensity: 2.4,
    hemiSkyColor: new THREE.Color(0xffdfba),
    hemiGroundColor: new THREE.Color(0xa0552b),
    fogColor: new THREE.Color(0xdda06d),
    fogDensity: 0.0025,
    cloudTopColor: new THREE.Color(0xfef3c7),
    cloudBaseColor: new THREE.Color(0xb0c0d6),
    cloudOpacity: 0.88,
    sunAlpha: 1.0,
    moonAlpha: 0.0,
    starAlpha: 0.0,
  };
  private stormTimer: number = 0;
  private lightningActiveTimer: number = 0;
  private nextLightningTime: number = 4.0;
  private elapsedTime: number = 0;
  public onLightningFlash?: (intensity: number) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Generate high-fidelity procedural textures
    this.cloudTexture = createCloudPuffTexture();
    this.sunTexture = createSunCoronaTexture();
    this.moonTexture = createMoonGlowTexture();
    this.dustTexture = createDustPuffTexture();

    // 1. Physically Accurate Atmospheric Scattering Sky Dome
    // Uses camera-relative ray directions so the sky dome is 100% immune to camera position distortion
    const skyGeo = new THREE.SphereGeometry(2800, 48, 32);
    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          // Since the sky dome is positioned at the camera/player center,
          // the sphere vertex position represents the pure angular view ray direction!
          vDirection = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunPosition; // Normalized sun direction vector
        uniform float uTime;
        uniform float uTimeOfDay;
        uniform float uWeather;
        uniform vec3 uZenithColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunCoronaColor;
        uniform float uSunCoronaIntensity;
        uniform float uStarAlpha;
        uniform float uHaboobDustBlend;
        varying vec3 vDirection;

        float starHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 viewDir = normalize(vDirection);
          vec3 sunDir = normalize(uSunPosition);
          float sunDot = max(dot(viewDir, sunDir), 0.0);
          float horizon = clamp(viewDir.y, 0.0, 1.0);

          // RDR western atmosphere: warm low-altitude desert aerosol / dust haze band near the horizon
          float horizonHaze = pow(1.0 - horizon, 3.2);
          vec3 warmHazeColor = mix(uHorizonColor, vec3(0.96, 0.62, 0.36), 0.35);

          // Eased Rayleigh celestial dome gradient across day, golden hour, twilight, and night
          vec3 sky = mix(uHorizonColor, uZenithColor, pow(horizon, 0.48));
          sky = mix(sky, warmHazeColor, horizonHaze * 0.45);

          // Physical Sun Disc and Mie scattering corona on the celestial sky dome
          // Smooth sunset immersion factor: fades smoothly as sun descends towards/below the horizon
          float horizonFade = clamp((sunDir.y + 0.04) / 0.16, 0.0, 1.0);
          if (horizonFade > 0.001 && uSunCoronaIntensity > 0.01) {
            // Solar disc (apparent angular size ~0.5°)
            float sunDisc = smoothstep(0.9997, 0.99995, sunDot);

            // Forward Mie atmospheric scattering corona with multi-tier optical falloff (RDR golden glow)
            float innerCorona = pow(sunDot, 1024.0) * 2.2;
            float midCorona = pow(sunDot, 140.0) * 0.65;
            float outerGlow = pow(sunDot, 32.0) * 0.22;
            float horizonAerosolGlow = pow(sunDot, 8.0) * horizonHaze * 0.28;

            float coronaTotal = (innerCorona + midCorona + outerGlow + horizonAerosolGlow) * uSunCoronaIntensity * horizonFade;
            sky += uSunCoronaColor * min(coronaTotal, 2.4);
            sky += vec3(1.0, 1.0, 0.96) * sunDisc * 2.2 * horizonFade;
          } else if (horizonFade > 0.001 && uHaboobDustBlend > 0.05) {
            // Obscured reddish solar disc struggling through the thick Haboob dust
            float sunDisc = smoothstep(0.9995, 0.99995, sunDot);
            sky += vec3(1.0, 0.55, 0.25) * sunDisc * 0.7 * uHaboobDustBlend * horizonFade;
            sky += vec3(0.9, 0.45, 0.2) * pow(sunDot, 64.0) * 0.25 * uHaboobDustBlend * horizonFade;
          }

          // Celestial Night Stars and Procedural Milky Way with smooth eased opacity
          if (uStarAlpha > 0.005) {
            float star = step(0.9962, starHash(floor(viewDir * 420.0))) * uStarAlpha;
            float milkyBand = pow(max(0.0, 1.0 - abs(viewDir.x * 0.72 + viewDir.z * 0.69)), 5.5) * 0.38 * uStarAlpha;
            sky += vec3(0.94, 0.96, 1.0) * star + vec3(0.70, 0.78, 0.98) * milkyBand;
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      uniforms: {
        uSunPosition: { value: new THREE.Vector3(0.6, 0.7, 0.3).normalize() },
        uTime: { value: 0 },
        uTimeOfDay: { value: 9.5 },
        uWeather: { value: 0 },
        uZenithColor: { value: new THREE.Color(0x2458a8) },
        uHorizonColor: { value: new THREE.Color(0xf4b260) },
        uSunCoronaColor: { value: new THREE.Color(0xffb855) },
        uSunCoronaIntensity: { value: 1.25 },
        uStarAlpha: { value: 0.0 },
        uHaboobDustBlend: { value: 0.0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyDome);

    // 2. Optical Sun System (Spherical Core + Circular Camera-Facing Sprites)
    const sunDiscGeo = new THREE.SphereGeometry(18.0, 32, 32);
    const sunDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      fog: false,
      transparent: true,
      opacity: 1.0,
    });
    this.sunDiscMesh = new THREE.Mesh(sunDiscGeo, sunDiscMat);
    this.sunGroup.add(this.sunDiscMesh);

    // Luminous inner corona flare sprite
    const coronaMat = new THREE.SpriteMaterial({
      map: this.sunTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.72,
      fog: false,
      depthWrite: false,
    });
    this.sunCoronaSprite = new THREE.Sprite(coronaMat);
    this.sunCoronaSprite.scale.set(115, 115, 1);
    this.sunGroup.add(this.sunCoronaSprite);

    // Atmospheric wide bloom sprite (subtle ambient optical bleed)
    const outerGlowMat = new THREE.SpriteMaterial({
      map: this.sunTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.22,
      fog: false,
      depthWrite: false,
    });
    this.sunOuterGlowSprite = new THREE.Sprite(outerGlowMat);
    this.sunOuterGlowSprite.scale.set(230, 230, 1);
    this.sunGroup.add(this.sunOuterGlowSprite);

    this.scene.add(this.sunGroup);

    // 3. Optical Moon System
    const moonDiscGeo = new THREE.SphereGeometry(22.0, 32, 32);
    const moonDiscMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      fog: false,
      transparent: true,
      opacity: 0.95,
    });
    this.moonDiscMesh = new THREE.Mesh(moonDiscGeo, moonDiscMat);
    this.moonGroup.add(this.moonDiscMesh);

    const moonGlowMat = new THREE.SpriteMaterial({
      map: this.moonTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.42,
      fog: false,
      depthWrite: false,
    });
    this.moonGlowSprite = new THREE.Sprite(moonGlowMat);
    this.moonGlowSprite.scale.set(125, 125, 1);
    this.moonGroup.add(this.moonGlowSprite);

    this.scene.add(this.moonGroup);

    // 4. Volumetric Realistic Desert Clouds
    this.scene.add(this.cloudGroup);
    this.spawnRealisticClouds();

    // 4b. Out-of-bounds Perimeter Cloud Banks & Mountain Fog Shrouds
    this.scene.add(this.outOfBoundsCloudGroup);
    this.spawnOutOfBoundsClouds();

    // 5. Rain Particle System
    this.scene.add(this.rainGroup);
    this.initRainSystem();

    // 6. Dynamic Sandstorm Dust Particles
    this.scene.add(this.sandstormGroup);
    this.initSandstormSystem();

    // 7. Ambient Desert Dust Motes
    this.scene.add(this.ambientDustGroup);
    this.initAmbientDustSystem();

    // 8. Lightning Light
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 450);
    this.lightningLight.position.set(60, 95, 20);
    this.scene.add(this.lightningLight);

    this.updateAtmosphere(this.timeOfDay, this.weather);
  }

  /**
   * Spawns natural cumulus cloud formations.
   * Built with layered, soft camera-facing billow puffs.
   * Explicitly sets fog: false so clouds are NEVER stained brown by low-altitude ground dust fog!
   */
  private spawnRealisticClouds() {
    const cloudClusterCount = 14;

    for (let c = 0; c < cloudClusterCount; c++) {
      const clusterGroup = new THREE.Group();
      const topSprites: THREE.Sprite[] = [];
      const baseSprites: THREE.Sprite[] = [];

      // Organic cluster composition: 10 to 14 overlapping billow puffs
      const puffCount = 10 + Math.floor(Math.random() * 5);
      const clusterWidth = 65 + Math.random() * 45;
      const clusterDepth = 45 + Math.random() * 30;

      for (let p = 0; p < puffCount; p++) {
        const isTopBillow = p > puffCount * 0.45;
        const puffSize = 28 + Math.random() * 22;

        const puffMat = new THREE.SpriteMaterial({
          map: this.cloudTexture,
          transparent: true,
          opacity: isTopBillow ? 0.88 : 0.82,
          fog: false, // CRITICAL: Clouds sit high in troposphere and must NOT absorb ground dust fog
          depthWrite: false,
        });

        const sprite = new THREE.Sprite(puffMat);
        sprite.scale.set(puffSize, puffSize * (0.75 + Math.random() * 0.25), 1);

        // Position puffs organically: flat base along bottom, rising dome billows in center/top
        const xOffset = (Math.random() - 0.5) * clusterWidth;
        const zOffset = (Math.random() - 0.5) * clusterDepth;
        // Central puffs billow higher
        const distFromCenter = Math.hypot(xOffset / clusterWidth, zOffset / clusterDepth);
        const domeElevation = Math.max(0, 1.0 - distFromCenter * 1.6) * 14;
        const yOffset = isTopBillow ? (domeElevation + Math.random() * 4) : (-4 + Math.random() * 3);

        sprite.position.set(xOffset, yOffset, zOffset);
        // Optimize: sub-sprites are stationary within cluster group, disable per-frame auto matrix computation
        sprite.matrixAutoUpdate = false;
        sprite.updateMatrix();
        clusterGroup.add(sprite);

        if (isTopBillow) {
          topSprites.push(sprite);
        } else {
          baseSprites.push(sprite);
        }
      }

      // Distribute across the vast desert sky dome
      const angle = (c / cloudClusterCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 140 + Math.random() * 180;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const altitude = 135 + Math.random() * 35; // Lofty altitude above all mountains

      clusterGroup.position.set(x, altitude, z);
      this.cloudGroup.add(clusterGroup);

      this.clouds.push({
        mesh: clusterGroup,
        topSprites,
        baseSprites,
        speed: 1.2 + Math.random() * 1.6,
        baseY: altitude,
      });
    }
  }

  /**
   * Spawns dense, rolling volumetric cloud banks and mountain fog shrouds
   * that encircle the entire wilderness perimeter, blanketing the out-of-bounds terrain.
   * Features:
   * - 36 multi-layered cloud clusters encircling the perimeter (radii 235m to 390m).
   * - Low-altitude mountain ridge clouds (Y = 28m - 62m) that hug the perimeter peaks, passes, and out-of-bounds rims.
   * - Mid-to-high sprawling cumulus banks (Y = 55m - 125m) completely obscuring the out-of-bounds horizon.
   * - Dynamic lighting: reactive to sunrise, golden hour, midday sun, stormy skies, and silver moonlight.
   */
  private spawnOutOfBoundsClouds() {
    const clusterCount = 28;
    for (let i = 0; i < clusterCount; i++) {
      const clusterGroup = new THREE.Group();
      const topSprites: THREE.Sprite[] = [];
      const baseSprites: THREE.Sprite[] = [];
      const mistSprites: THREE.Sprite[] = [];
      const initialScales: { sprite: THREE.Sprite; scaleX: number; scaleY: number }[] = [];

      // Alternate between inner ridge-clinging cloud banks and massive outer boundary cumulus banks
      // along the distant 2500m Superstition Wilderness boundary
      const isInnerRidgeCloud = i % 2 === 0;
      const angle = (i / clusterCount) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / clusterCount);
      const radius = isInnerRidgeCloud
        ? 2300 + Math.random() * 200
        : 2550 + Math.random() * 350;

      // Distant boundary thunderheads and cumulus banks rising above the mountain horizons
      const altitude = isInnerRidgeCloud
        ? 120 + Math.random() * 80
        : 160 + Math.random() * 140;

      // Voluminous cluster composition: expansive billow puffs
      const puffCount = 8 + Math.floor(Math.random() * 4);
      const clusterWidth = isInnerRidgeCloud ? 380 + Math.random() * 180 : 520 + Math.random() * 240;
      const clusterDepth = isInnerRidgeCloud ? 220 + Math.random() * 120 : 340 + Math.random() * 180;

      for (let p = 0; p < puffCount; p++) {
        // Classify puffs: mist (low base wisp), base (dense mid-body), top (sunlit dome)
        const isMist = p < 3;
        const isTop = !isMist && p >= puffCount - 4;
        const isBase = !isMist && !isTop;

        const puffSize = isMist
          ? (220 + Math.random() * 120)
          : isTop
          ? (190 + Math.random() * 110)
          : (210 + Math.random() * 130);

        const puffMat = new THREE.SpriteMaterial({
          map: this.cloudTexture,
          transparent: true,
          opacity: isMist ? 0.72 : isTop ? 0.90 : 0.85,
          fog: false,
          depthWrite: false,
        });

        const sprite = new THREE.Sprite(puffMat);
        const scaleX = puffSize * (isMist ? 1.8 : (1.0 + Math.random() * 0.35));
        const scaleY = puffSize * (isMist ? 0.55 : (0.75 + Math.random() * 0.25));
        sprite.scale.set(scaleX, scaleY, 1);
        initialScales.push({ sprite, scaleX, scaleY });

        // Spread puffs across cluster
        const xOffset = (Math.random() - 0.5) * clusterWidth;
        const zOffset = (Math.random() - 0.5) * clusterDepth;
        const distFromClusterCenter = Math.hypot(xOffset / clusterWidth, zOffset / clusterDepth);
        const domeElevation = Math.max(0, 1.0 - distFromClusterCenter * 1.5) * (isInnerRidgeCloud ? 16 : 28);

        const yOffset = isMist
          ? (-10 + Math.random() * 5)
          : isTop
          ? (domeElevation + Math.random() * 6)
          : (-2 + Math.random() * 10);

        sprite.position.set(xOffset, yOffset, zOffset);
        // Slight random rotation for varied cloud puff silhouettes
        sprite.material.rotation = (Math.random() - 0.5) * Math.PI;
        // Optimize: sub-sprites are stationary within parent cluster, avoid per-frame CPU matrix math
        sprite.matrixAutoUpdate = false;
        sprite.updateMatrix();
        clusterGroup.add(sprite);

        if (isMist) {
          mistSprites.push(sprite);
        } else if (isTop) {
          topSprites.push(sprite);
        } else {
          baseSprites.push(sprite);
        }
      }

      const posX = Math.cos(angle) * radius;
      const posZ = Math.sin(angle) * radius;
      clusterGroup.position.set(posX, altitude, posZ);
      this.outOfBoundsCloudGroup.add(clusterGroup);

      this.outOfBoundsClouds.push({
        mesh: clusterGroup,
        topSprites,
        baseSprites,
        mistSprites,
        angle,
        radius,
        baseY: altitude,
        driftSpeed: (0.003 + Math.random() * 0.005) * (Math.random() > 0.5 ? 1 : -1),
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.12 + Math.random() * 0.15,
        initialScales,
      });
    }
  }

  // --- RAIN PARTICLE SYSTEM ---
  private initRainSystem() {
    const count = 1800;
    const geometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 260;
      this.rainPositions[i * 3 + 1] = Math.random() * 70 + 5;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 260;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.45,
      transparent: true,
      opacity: 0.75,
      fog: true,
    });

    this.rainParticles = new THREE.Points(geometry, material);
    this.rainParticles.visible = false;
    this.rainGroup.add(this.rainParticles);
  }

  // --- DYNAMIC SANDSTORM DUST PARTICLE SYSTEM ---
  private initSandstormSystem() {
    const count = 3600;
    const geometry = new THREE.BufferGeometry();
    this.sandstormPositions = new Float32Array(count * 3);
    this.sandstormVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.sandstormPositions[i * 3] = (Math.random() - 0.5) * 160;
      this.sandstormPositions[i * 3 + 1] = Math.random() * 35;
      this.sandstormPositions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      // Base velocity with variation
      this.sandstormVelocities[i * 3] = 42 + Math.random() * 26; // Windward speed along +X
      this.sandstormVelocities[i * 3 + 1] = (Math.random() - 0.5) * 3.5; // Vertical oscillation
      this.sandstormVelocities[i * 3 + 2] = (Math.random() - 0.5) * 12; // Crosswind
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.sandstormPositions, 3));

    const material = new THREE.PointsMaterial({
      map: this.dustTexture,
      color: 0xe09b55,
      size: 1.35,
      transparent: true,
      opacity: 0.82,
      fog: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.sandstormParticles = new THREE.Points(geometry, material);
    this.sandstormParticles.visible = false;
    this.sandstormGroup.add(this.sandstormParticles);
  }

  // --- AMBIENT DESERT DUST MOTES SYSTEM ---
  private initAmbientDustSystem() {
    const count = 500;
    const geometry = new THREE.BufferGeometry();
    this.ambientDustPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.ambientDustPositions[i * 3] = (Math.random() - 0.5) * 55;
      this.ambientDustPositions[i * 3 + 1] = Math.random() * 15 + 0.5;
      this.ambientDustPositions[i * 3 + 2] = (Math.random() - 0.5) * 55;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.ambientDustPositions, 3));

    const material = new THREE.PointsMaterial({
      map: this.dustTexture,
      color: 0xfde68a,
      size: 0.55,
      transparent: true,
      opacity: 0.40,
      fog: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.ambientDustParticles = new THREE.Points(geometry, material);
    this.ambientDustParticles.visible = true;
    this.ambientDustGroup.add(this.ambientDustParticles);
  }

  // --- LIGHTNING BOLT PROCEDURAL MESH ---
  private triggerLightningFlash() {
    this.lightningActiveTimer = 0.12;
    this.lightningLight.intensity = 5.5;
    this.onLightningFlash?.(1.0);

    const startX = (Math.random() - 0.5) * 120 + 40;
    const startZ = (Math.random() - 0.5) * 120;
    const startY = 85;

    this.lightningLight.position.set(startX, startY - 15, startZ);

    if (this.lightningMesh) {
      this.scene.remove(this.lightningMesh);
      this.lightningMesh.geometry.dispose();
      this.lightningMesh = null;
    }

    const points: THREE.Vector3[] = [];
    let curX = startX;
    let curY = startY;
    let curZ = startZ;

    points.push(new THREE.Vector3(curX, curY, curZ));
    while (curY > 15) {
      curY -= 6 + Math.random() * 8;
      curX += (Math.random() - 0.5) * 12;
      curZ += (Math.random() - 0.5) * 12;
      points.push(new THREE.Vector3(curX, curY, curZ));
    }

    const boltGeo = new THREE.BufferGeometry().setFromPoints(points);
    const boltMat = new THREE.LineBasicMaterial({
      color: 0xdbeafe,
      linewidth: 3,
      fog: false,
    });

    this.lightningMesh = new THREE.Line(boltGeo, boltMat);
    this.scene.add(this.lightningMesh);

    soundEngine.playThunder();
  }

  /**
   * Synchronizes lighting, fog, and cloud coloration with the astronomical time and weather.
   */
  public updateAtmosphere(
    time: number,
    weather: WeatherType,
    sunLight?: THREE.DirectionalLight,
    hemiLight?: THREE.HemisphereLight
  ) {
    this.targetTimeOfDay = time;
    this.weather = weather;
    if (sunLight) this.cachedSunLight = sunLight;
    if (hemiLight) this.cachedHemiLight = hemiLight;

    if (!this.isInitialized) {
      this.currentTimeOfDay = time;
      this.timeOfDay = time;
      this.isInitialized = true;
      this.applyAtmosphereState(time, weather, sunLight, hemiLight);
    }
  }

  /**
   * Evaluates continuous Hermite-eased diurnal keyframes and blends weather overrides smoothly.
   */
  private applyAtmosphereState(
    time: number,
    weather: WeatherType,
    sunLight?: THREE.DirectionalLight,
    hemiLight?: THREE.HemisphereLight
  ) {
    // 1. Calculate astronomical solar vector
    const { sunDir, moonDir } = getCelestialDirections(time);

    // 2. Query continuously interpolated diurnal state
    const state = getInterpolatedDiurnalState(time, this.diurnalState);

    // Synchronize audio synthesizer ambiance
    soundEngine.updateWeatherAmbiance(weather, false);

    // Weather blending factors
    const sw = this.weatherWeights.storm;
    const dustW = this.weatherWeights.sandstorm;
    const rainW = this.weatherWeights.lightRain;

    // Interpolate final colors
    const finalZenith = state.zenithColor.clone();
    const finalHorizon = state.horizonColor.clone();
    const finalFogColor = state.fogColor.clone();
    let finalFogDensity = state.fogDensity;

    const finalSunColor = state.sunColor.clone();
    let finalSunIntensity = state.sunIntensity;

    const finalHemiSky = state.hemiSkyColor.clone();
    const finalHemiGround = state.hemiGroundColor.clone();

    const finalCloudTop = state.cloudTopColor.clone();
    const finalCloudBase = state.cloudBaseColor.clone();
    let finalCloudOpacity = state.cloudOpacity;

    // Storm override blend
    if (sw > 0.001) {
      finalZenith.lerp(new THREE.Color(0x131720), sw);
      finalHorizon.lerp(new THREE.Color(0x20242a), sw);
      finalFogColor.lerp(new THREE.Color(0x1a202c), sw);
      finalFogDensity = THREE.MathUtils.lerp(finalFogDensity, 0.0055, sw);
      finalSunColor.lerp(new THREE.Color(0x64748b), sw);
      finalSunIntensity = THREE.MathUtils.lerp(finalSunIntensity, 0.45, sw);
      finalHemiSky.lerp(new THREE.Color(0x334155), sw);
      finalHemiGround.lerp(new THREE.Color(0x1e293b), sw);
      finalCloudTop.lerp(new THREE.Color(0x64748b), sw);
      finalCloudBase.lerp(new THREE.Color(0x334155), sw);
      finalCloudOpacity = THREE.MathUtils.lerp(finalCloudOpacity, 0.94, sw);
    }

    // Sandstorm Haboob override blend (Severe low visibility & blinding ochre dust wall)
    if (dustW > 0.001) {
      finalZenith.lerp(new THREE.Color(0x4a2810), dustW);
      finalHorizon.lerp(new THREE.Color(0x6e3c1a), dustW);
      finalFogColor.lerp(new THREE.Color(0x944f24), dustW);
      finalFogDensity = THREE.MathUtils.lerp(finalFogDensity, 0.0165, dustW); // Severe visibility drop (~55-70m)
      finalSunColor.lerp(new THREE.Color(0xd97534), dustW);
      finalSunIntensity = THREE.MathUtils.lerp(finalSunIntensity, 0.35, dustW); // Choking dust obscures the sun
      finalHemiSky.lerp(new THREE.Color(0xba6832), dustW);
      finalHemiGround.lerp(new THREE.Color(0x4d260f), dustW);
      finalCloudTop.lerp(new THREE.Color(0x944f24), dustW);
      finalCloudBase.lerp(new THREE.Color(0x5c2e12), dustW);
      finalCloudOpacity = THREE.MathUtils.lerp(finalCloudOpacity, 0.99, dustW);
    }

    // Light rain override blend
    if (rainW > 0.001) {
      finalZenith.lerp(new THREE.Color(0x283444), rainW);
      finalHorizon.lerp(new THREE.Color(0x485462), rainW);
      finalFogColor.lerp(new THREE.Color(0x5d6e82), rainW);
      finalFogDensity = THREE.MathUtils.lerp(finalFogDensity, 0.0038, rainW);
      finalSunColor.lerp(new THREE.Color(0x9fb5ce), rainW);
      finalSunIntensity = THREE.MathUtils.lerp(finalSunIntensity, 1.3, rainW);
      finalHemiSky.lerp(new THREE.Color(0x8aa1bd), rainW);
      finalHemiGround.lerp(new THREE.Color(0x384758), rainW);
      finalCloudTop.lerp(new THREE.Color(0xb8c8da), rainW);
      finalCloudBase.lerp(new THREE.Color(0x6b7c91), rainW);
      finalCloudOpacity = THREE.MathUtils.lerp(finalCloudOpacity, 0.88, rainW);
    }

    // Apply to Scene Fog
    if (this.scene.fog && 'color' in this.scene.fog) {
      this.scene.fog.color.copy(finalFogColor);
      if ('density' in this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = finalFogDensity;
      }
    }

    // Apply to Directional Sun / Celestial Key Light
    if (sunLight) {
      sunLight.color.copy(finalSunColor);
      sunLight.intensity = finalSunIntensity;
    }

    // Apply to Ambient Hemisphere Light
    if (hemiLight) {
      hemiLight.color.copy(finalHemiSky);
      hemiLight.groundColor.copy(finalHemiGround);
    }

    // Update Sky Shader uniforms
    this.skyMaterial.uniforms.uSunPosition.value.copy(sunDir);
    this.skyMaterial.uniforms.uTimeOfDay.value = time;
    this.skyMaterial.uniforms.uZenithColor.value.copy(finalZenith);
    this.skyMaterial.uniforms.uHorizonColor.value.copy(finalHorizon);
    this.skyMaterial.uniforms.uSunCoronaColor.value.copy(state.sunCoronaColor);
    this.skyMaterial.uniforms.uSunCoronaIntensity.value =
      state.sunCoronaIntensity * (1.0 - 0.9 * sw) * (1.0 - 0.7 * dustW);
    this.skyMaterial.uniforms.uStarAlpha.value =
      state.starAlpha * (1.0 - sw) * (1.0 - dustW) * (1.0 - rainW);
    this.skyMaterial.uniforms.uHaboobDustBlend.value = dustW;

    // Smooth fading of celestial bodies (sun & moon discs and sprites)
    const sunHorizonFade = Math.max(0, Math.min(1, (sunDir.y + 0.04) / 0.16));
    const effectiveSunAlpha = state.sunAlpha * (1.0 - sw) * (1.0 - 0.45 * dustW) * sunHorizonFade;
    (this.sunDiscMesh.material as THREE.MeshBasicMaterial).opacity = effectiveSunAlpha;
    (this.sunCoronaSprite.material as THREE.SpriteMaterial).opacity = 0.72 * effectiveSunAlpha;
    (this.sunOuterGlowSprite.material as THREE.SpriteMaterial).opacity = 0.22 * effectiveSunAlpha;
    this.sunGroup.visible = effectiveSunAlpha > 0.005;

    const moonHorizonFade = Math.max(0, Math.min(1, (moonDir.y + 0.04) / 0.16));
    const effectiveMoonAlpha = state.moonAlpha * (1.0 - 0.85 * sw) * (1.0 - 0.75 * dustW) * moonHorizonFade;
    (this.moonDiscMesh.material as THREE.MeshBasicMaterial).opacity = effectiveMoonAlpha * 0.95;
    (this.moonGlowSprite.material as THREE.SpriteMaterial).opacity = 0.42 * effectiveMoonAlpha;
    this.moonGroup.visible = effectiveMoonAlpha > 0.005;

    // Update 3D volumetric cloud puff colors and opacity
    this.updateCloudColors(finalCloudTop, finalCloudBase, finalCloudOpacity);

    // Weather particle visibility toggles
    if (this.sandstormParticles) {
      this.sandstormParticles.visible = dustW > 0.05;
      if (this.sandstormParticles.material && 'opacity' in this.sandstormParticles.material) {
        (this.sandstormParticles.material as THREE.PointsMaterial).opacity = Math.min(1.0, dustW * 1.2);
      }
    }

    if (this.rainParticles) {
      const activeRain = Math.max(sw, rainW);
      this.rainParticles.visible = activeRain > 0.05;
      if (this.rainParticles.material && 'opacity' in this.rainParticles.material) {
        const targetRainOpacity = sw > rainW ? 0.82 : 0.45;
        (this.rainParticles.material as THREE.PointsMaterial).opacity = activeRain * targetRainOpacity;
        (this.rainParticles.material as THREE.PointsMaterial).size = THREE.MathUtils.lerp(0.38, 0.55, sw);
        (this.rainParticles.material as THREE.PointsMaterial).color.setHex(sw > rainW ? 0x93c5fd : 0xbfdbfe);
      }
    }

    if (this.ambientDustParticles) {
      this.ambientDustParticles.visible = dustW < 0.6 && sw < 0.6;
    }
  }

  /**
   * Colors the cloud formations with physical lighting.
   * Tops reflect direct sunlight; undersides reflect diffuse ambient tropospheric skylight.
   */
  private updateCloudColors(topColor: THREE.Color | number, baseColor: THREE.Color | number, opacity: number) {
    const topCol = topColor instanceof THREE.Color ? topColor : new THREE.Color(topColor);
    const baseCol = baseColor instanceof THREE.Color ? baseColor : new THREE.Color(baseColor);

    this.clouds.forEach((c) => {
      c.topSprites.forEach((s) => {
        s.material.color.copy(topCol);
        s.material.opacity = opacity;
      });
      c.baseSprites.forEach((s) => {
        s.material.color.copy(baseCol);
        s.material.opacity = opacity * 0.92;
      });
    });

    const mistCol = baseCol.clone().lerp(this.diurnalState.horizonColor, 0.45);
    this.outOfBoundsClouds.forEach((c) => {
      c.topSprites.forEach((s) => {
        s.material.color.copy(topCol);
        s.material.opacity = opacity * 0.95;
      });
      c.baseSprites.forEach((s) => {
        s.material.color.copy(baseCol);
        s.material.opacity = opacity * 0.88;
      });
      c.mistSprites.forEach((s) => {
        s.material.color.copy(mistCol);
        s.material.opacity = opacity * 0.78;
      });
    });
  }

  /**
   * Main per-frame animation loop.
   * Anchors the Sky Dome, Sun, and Moon relative to the player's camera position.
   * This guarantees ZERO parallax displacement between the shader sky and 3D celestial bodies!
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    sunLight?: THREE.DirectionalLight,
    hemiLight?: THREE.HemisphereLight,
    isUnderground: boolean = false
  ) {
    this.elapsedTime += delta;
    this.skyMaterial.uniforms.uTime.value = this.elapsedTime;

    if (sunLight) this.cachedSunLight = sunLight;
    if (hemiLight) this.cachedHemiLight = hemiLight;

    // Smooth continuous easing for time of day transitions
    // Handle wrap-around across midnight smoothly
    let diff = this.targetTimeOfDay - this.currentTimeOfDay;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;

    // Smooth rate: ease gently and smoothly between dawn, dusk, day, and night
    // 1.8 blend speed creates a gentle, cinema-grade atmospheric gradient transition without sudden color jumps
    const blendSpeed = 1.8;
    const step = diff * Math.min(1.0, blendSpeed * delta);
    this.currentTimeOfDay = ((this.currentTimeOfDay + step) % 24 + 24) % 24;
    this.timeOfDay = this.currentTimeOfDay;

    // Eased weather blending weights
    const targetSandstorm = this.weather === 'sandstorm' ? 1.0 : 0.0;
    const targetStorm = this.weather === 'storm' ? 1.0 : 0.0;
    const targetLightRain = this.weather === 'light_rain' ? 1.0 : 0.0;

    const weatherBlendRate = Math.min(1.0, 3.5 * delta);
    this.weatherWeights.sandstorm = THREE.MathUtils.lerp(this.weatherWeights.sandstorm, targetSandstorm, weatherBlendRate);
    this.weatherWeights.storm = THREE.MathUtils.lerp(this.weatherWeights.storm, targetStorm, weatherBlendRate);
    this.weatherWeights.lightRain = THREE.MathUtils.lerp(this.weatherWeights.lightRain, targetLightRain, weatherBlendRate);

    // Apply continuous atmospheric properties
    this.applyAtmosphereState(this.currentTimeOfDay, this.weather, this.cachedSunLight, this.cachedHemiLight);

    // Follow player so sky dome is always centered on camera
    this.skyDome.position.copy(playerPos);

    // Compute celestial orbit vectors
    const { sunDir, moonDir } = getCelestialDirections(this.currentTimeOfDay);

    // Place Sun and Moon at optical infinity (2400 units) relative to player position
    // This aligns the optical solar disc, corona sprites, and sky shader flawlessly across the vast wilderness
    this.sunGroup.position.copy(playerPos).addScaledVector(sunDir, 2400);
    this.moonGroup.position.copy(playerPos).addScaledVector(moonDir, 2400);

    // Keep shader uniform aligned with true celestial vector
    this.skyMaterial.uniforms.uSunPosition.value.copy(sunDir);

    // Align directional shadow-casting sunlight with celestial angle
    if (sunLight) {
      sunLight.position.copy(playerPos).addScaledVector(sunDir, 160);
      sunLight.target.position.copy(playerPos);
      sunLight.target.updateMatrixWorld();
    }

    // 1. Drifting Clouds with graceful wrap-around
    this.clouds.forEach((c) => {
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 260) {
        c.mesh.position.x = -260;
        c.mesh.position.z = (Math.random() - 0.5) * 360;
      }
    });

    // 1b. Out-of-bounds Perimeter Clouds animation (slow orbital drift and organic billow breathing)
    this.outOfBoundsClouds.forEach((c) => {
      c.angle += c.driftSpeed * delta;
      c.mesh.position.x = Math.cos(c.angle) * c.radius;
      c.mesh.position.z = Math.sin(c.angle) * c.radius;
      c.mesh.position.y = c.baseY + Math.sin(this.elapsedTime * c.bobSpeed + c.bobPhase) * 3.8;

      const breathe = 1.0 + Math.sin(this.elapsedTime * (c.bobSpeed * 1.5) + c.bobPhase) * 0.05;
      c.mesh.scale.set(breathe, breathe, 1);
    });

    // 2. Underground attenuation
    if (isUnderground) {
      this.cloudGroup.visible = false;
      this.outOfBoundsCloudGroup.visible = false;
      if (this.sandstormParticles) this.sandstormParticles.visible = false;
      if (this.rainParticles) this.rainParticles.visible = false;
    } else {
      this.cloudGroup.visible = true;
      this.outOfBoundsCloudGroup.visible = true;
      // 3. Dynamic Sandstorm Dust Particle System
      if (this.weather === 'sandstorm' && this.sandstormParticles && this.sandstormPositions && this.sandstormVelocities) {
        this.sandstormParticles.visible = true;
        const count = this.sandstormPositions.length / 3;
        const windGust = Math.sin(this.elapsedTime * 2.2) * 12.0;

        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          this.sandstormPositions[idx] += (this.sandstormVelocities[idx] + windGust) * delta;
          this.sandstormPositions[idx + 1] += (this.sandstormVelocities[idx + 1] + Math.sin(this.elapsedTime * 3.2 + i) * 1.8) * delta;
          this.sandstormPositions[idx + 2] += (this.sandstormVelocities[idx + 2] + Math.cos(this.elapsedTime * 1.5 + i) * 3.5) * delta;

          // Wrap around player position
          if (this.sandstormPositions[idx] > playerPos.x + 85) {
            this.sandstormPositions[idx] = playerPos.x - 85;
          } else if (this.sandstormPositions[idx] < playerPos.x - 85) {
            this.sandstormPositions[idx] = playerPos.x + 85;
          }

          if (this.sandstormPositions[idx + 2] > playerPos.z + 85) {
            this.sandstormPositions[idx + 2] = playerPos.z - 85;
          } else if (this.sandstormPositions[idx + 2] < playerPos.z - 85) {
            this.sandstormPositions[idx + 2] = playerPos.z + 85;
          }

          if (this.sandstormPositions[idx + 1] < playerPos.y - 3) {
            this.sandstormPositions[idx + 1] = playerPos.y + 32;
          } else if (this.sandstormPositions[idx + 1] > playerPos.y + 36) {
            this.sandstormPositions[idx + 1] = playerPos.y - 1;
          }
        }
        this.sandstormParticles.geometry.attributes.position.needsUpdate = true;
      }

      // 4. Rain Particles (Supports both gentle light_rain and intense storm)
      if ((this.weather === 'storm' || this.weather === 'light_rain') && this.rainParticles && this.rainPositions) {
        this.rainParticles.visible = true;
        const count = this.rainPositions.length / 3;
        const fallSpeed = this.weather === 'storm' ? 48 : 24;
        const windDrift = this.weather === 'storm' ? 12 : 3.5;

        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          this.rainPositions[idx + 1] -= fallSpeed * delta;
          this.rainPositions[idx] += windDrift * delta;

          if (this.rainPositions[idx + 1] < playerPos.y - 2) {
            this.rainPositions[idx + 1] = playerPos.y + 55;
            this.rainPositions[idx] = playerPos.x + (Math.random() - 0.5) * 140;
            this.rainPositions[idx + 2] = playerPos.z + (Math.random() - 0.5) * 140;
          }
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      // 5. Storm Lightning Flashes
      if (this.weather === 'storm') {
        this.stormTimer += delta;

        if (this.stormTimer >= this.nextLightningTime) {
          this.triggerLightningFlash();
          this.stormTimer = 0;
          this.nextLightningTime = 3.5 + Math.random() * 5.5;
        }

        if (this.lightningActiveTimer > 0) {
          this.lightningActiveTimer -= delta;
          if (this.lightningActiveTimer <= 0) {
            this.lightningLight.intensity = 0;
            this.onLightningFlash?.(0);
            if (this.lightningMesh) {
              this.scene.remove(this.lightningMesh);
              this.lightningMesh.geometry.dispose();
              this.lightningMesh = null;
            }
          }
        }
      }
    }

    // 6. Ambient Floating Desert Dust Motes (bobbing Brownian motion)
    if (this.ambientDustParticles && this.ambientDustParticles.visible && this.ambientDustPositions) {
      const count = this.ambientDustPositions.length / 3;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        this.ambientDustPositions[idx] += (1.1 + Math.sin(this.elapsedTime * 0.4 + i) * 0.5) * delta;
        this.ambientDustPositions[idx + 1] += Math.sin(this.elapsedTime * 0.7 + i * 2) * 0.35 * delta;
        this.ambientDustPositions[idx + 2] += Math.cos(this.elapsedTime * 0.5 + i) * 0.5 * delta;

        if (Math.abs(this.ambientDustPositions[idx] - playerPos.x) > 35) {
          this.ambientDustPositions[idx] = playerPos.x - Math.sign(this.ambientDustPositions[idx] - playerPos.x) * 33;
        }
        if (Math.abs(this.ambientDustPositions[idx + 2] - playerPos.z) > 35) {
          this.ambientDustPositions[idx + 2] = playerPos.z - Math.sign(this.ambientDustPositions[idx + 2] - playerPos.z) * 33;
        }
        if (this.ambientDustPositions[idx + 1] < playerPos.y - 1) {
          this.ambientDustPositions[idx + 1] = playerPos.y + 12;
        } else if (this.ambientDustPositions[idx + 1] > playerPos.y + 15) {
          this.ambientDustPositions[idx + 1] = playerPos.y + 0.5;
        }
      }
      this.ambientDustParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose() {
    this.scene.remove(this.skyDome);
    this.skyDome.geometry.dispose();
    this.skyMaterial.dispose();

    this.scene.remove(this.sunGroup);
    this.sunDiscMesh.geometry.dispose();
    (this.sunDiscMesh.material as THREE.Material).dispose();
    this.sunCoronaSprite.material.dispose();
    this.sunOuterGlowSprite.material.dispose();

    this.scene.remove(this.moonGroup);
    this.moonDiscMesh.geometry.dispose();
    (this.moonDiscMesh.material as THREE.Material).dispose();
    this.moonGlowSprite.material.dispose();

    this.scene.remove(this.cloudGroup);
    this.clouds.forEach((c) => {
      c.mesh.traverse((child) => {
        if (child instanceof THREE.Sprite) {
          child.material.dispose();
        }
      });
    });
    this.clouds = [];

    this.scene.remove(this.outOfBoundsCloudGroup);
    this.outOfBoundsClouds.forEach((c) => {
      c.mesh.traverse((child) => {
        if (child instanceof THREE.Sprite) {
          child.material.dispose();
        }
      });
    });
    this.outOfBoundsClouds = [];

    this.cloudTexture.dispose();
    this.sunTexture.dispose();
    this.moonTexture.dispose();
    this.dustTexture.dispose();

    this.scene.remove(this.rainGroup);
    if (this.rainParticles) {
      this.rainParticles.geometry.dispose();
      (this.rainParticles.material as THREE.Material).dispose();
    }

    this.scene.remove(this.sandstormGroup);
    if (this.sandstormParticles) {
      this.sandstormParticles.geometry.dispose();
      (this.sandstormParticles.material as THREE.Material).dispose();
    }

    this.scene.remove(this.ambientDustGroup);
    if (this.ambientDustParticles) {
      this.ambientDustParticles.geometry.dispose();
      (this.ambientDustParticles.material as THREE.Material).dispose();
    }

    this.scene.remove(this.lightningLight);
    if (this.lightningMesh) {
      this.scene.remove(this.lightningMesh);
      this.lightningMesh.geometry.dispose();
    }
  }
}
