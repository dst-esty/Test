import * as THREE from 'three';
import { GraphicsQuality, WeatherType } from '../types';

/**
 * Creates a soft, organic wisp/dust grain procedural texture for low-opacity desert dust particles.
 * Avoids hard circular borders by using smooth multi-stage exponential attenuation.
 */
function createGroundDustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  const cx = 64;
  const cy = 64;

  // Main soft radial billow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 62);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.18, 'rgba(255, 245, 230, 0.88)');
  grad.addColorStop(0.42, 'rgba(240, 215, 185, 0.48)');
  grad.addColorStop(0.68, 'rgba(215, 175, 135, 0.16)');
  grad.addColorStop(0.88, 'rgba(185, 140, 95, 0.04)');
  grad.addColorStop(1.0, 'rgba(160, 115, 75, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fill();

  // Secondary offset soft lobe for natural asymmetric organic fluff
  const subGrad = ctx.createRadialGradient(cx - 10, cy - 6, 0, cx - 10, cy - 6, 44);
  subGrad.addColorStop(0.0, 'rgba(255, 250, 240, 0.35)');
  subGrad.addColorStop(0.5, 'rgba(235, 205, 170, 0.12)');
  subGrad.addColorStop(1.0, 'rgba(200, 160, 120, 0.0)');
  ctx.fillStyle = subGrad;
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 6, 44, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

interface GroundDustParticleData {
  x: number;
  z: number;
  hoverHeight: number;
  speedMult: number;
  crosswind: number;
  phase: number;
  swirlRadius: number;
  swirlSpeed: number;
  age: number;
  maxAge: number;
}

/**
 * WindBlownGroundDustSystem
 *
 * Simulates delicate, low-opacity wind-blown desert dust and micro-silt skimming just above
 * the Sonoran terrain surface (0.05m to 1.6m elevation).
 *
 * Features:
 * - Terrain Conformance: Continuously hugs procedural elevation via getTerrainHeight
 * - Dynamic Sonoran Wind: Natural gusting vector with eddy turbulence and crosswind billows
 * - Boundary Wrapping: Follows the player within a 48m radius with smooth edge distance fading
 * - Near-Camera Soft Culling: Smoothly fades before intersecting the first/third-person camera
 * - Diurnal Lighting: Adapts subtly to dawn gold, midday sun, desert sunset amber, and moonlight
 * - Weather Sensitivity: Damps during desert rains and swells during arid windstorms
 */
export class WindBlownGroundDustSystem {
  private scene: THREE.Scene;
  private getTerrainHeight: (x: number, z: number) => number;
  private rootGroup: THREE.Group;

  private pointsMesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private dustTexture: THREE.CanvasTexture;

  private readonly maxCount = 1300;
  private activeCount = 750;
  private particles: GroundDustParticleData[] = [];

  private positionsArray: Float32Array;
  private scaleArray: Float32Array;
  private alphaArray: Float32Array;
  private colorArray: Float32Array;

  private elapsedTime = 0;
  private baseWindDir = new THREE.Vector2(0.85, 0.52).normalize(); // Prevailing east-northeast Sonoran desert breeze
  private currentWindAngle = Math.atan2(0.52, 0.85);

  private tempColor = new THREE.Color();
  private isVisible = true;

  constructor(scene: THREE.Scene, getTerrainHeight: (x: number, z: number) => number) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'WindBlownGroundDustSystem';

    this.dustTexture = createGroundDustTexture();

    // Prepare buffer attributes
    this.positionsArray = new Float32Array(this.maxCount * 3);
    this.scaleArray = new Float32Array(this.maxCount);
    this.alphaArray = new Float32Array(this.maxCount);
    this.colorArray = new Float32Array(this.maxCount * 3);

    // Natural desert soil & mineral particle palettes
    const palette = [
      new THREE.Color(0xe5b888), // Warm golden sandstone silt
      new THREE.Color(0xdcb082), // Desert arroyo alluvium
      new THREE.Color(0xcfa174), // Weathered volcanic dust
      new THREE.Color(0xf2dac0), // Fine sun-bleached quartz powder
      new THREE.Color(0xd49b6a), // Terracotta caliche dust
      new THREE.Color(0xc08c5c), // Iron-oxide stained grit
    ];

    for (let i = 0; i < this.maxCount; i++) {
      const pColor = palette[i % palette.length];
      const pAlpha = 0.45 + Math.random() * 0.55;
      const pScale = 0.75 + Math.random() * 1.5;

      this.scaleArray[i] = pScale;
      this.alphaArray[i] = pAlpha;
      this.colorArray[i * 3] = pColor.r;
      this.colorArray[i * 3 + 1] = pColor.g;
      this.colorArray[i * 3 + 2] = pColor.b;

      // Initialize internal particle physics state
      this.particles.push({
        x: (Math.random() - 0.5) * 90,
        z: (Math.random() - 0.5) * 90,
        hoverHeight: Math.random() < 0.75 ? 0.08 + Math.random() * 0.65 : 0.75 + Math.random() * 0.95,
        speedMult: 0.72 + Math.random() * 0.68,
        crosswind: (Math.random() - 0.5) * 1.2,
        phase: Math.random() * Math.PI * 2,
        swirlRadius: Math.random() * 0.35,
        swirlSpeed: 0.8 + Math.random() * 1.6,
        age: Math.random() * 12.0,
        maxAge: 10.0 + Math.random() * 8.0,
      });

      this.positionsArray[i * 3] = this.particles[i].x;
      this.positionsArray[i * 3 + 1] = 0;
      this.positionsArray[i * 3 + 2] = this.particles[i].z;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionsArray, 3));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(this.scaleArray, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphaArray, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.geometry.setDrawRange(0, this.activeCount);

    // Custom atmospheric points shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.dustTexture },
        uPlayerCenter: { value: new THREE.Vector3(0, 0, 0) },
        uTime: { value: 0 },
        uBaseSize: { value: 2.2 },
        uOpacity: { value: 0.16 }, // Subtle and delicate default opacity
        uTint: { value: new THREE.Color(0xf6e6d4) },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aAlpha;
        attribute vec3 aColor;

        uniform vec3 uPlayerCenter;
        uniform float uBaseSize;

        varying float vAlpha;
        varying vec3 vColor;
        varying float vCamDist;
        varying float vPerimeterFade;

        void main() {
          vAlpha = aAlpha;
          vColor = aColor;

          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vec4 mvPosition = viewMatrix * worldPos;
          vCamDist = -mvPosition.z;

          // Smooth edge fading near the outer perimeter boundary (36m to 48m from player center)
          float distFromCenter = length(worldPos.xz - uPlayerCenter.xz);
          vPerimeterFade = smoothstep(48.0, 36.0, distFromCenter);

          // Perspective size scaling with distance
          float pSize = uBaseSize * aScale * (85.0 / max(0.5, -mvPosition.z));
          gl_PointSize = clamp(pSize, 2.0, 75.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uOpacity;
        uniform vec3 uTint;

        varying float vAlpha;
        varying vec3 vColor;
        varying float vCamDist;
        varying float vPerimeterFade;

        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);
          if (texColor.a < 0.01) discard;

          // Camera near-fade (1.2m to 3.2m) to prevent harsh camera clipping near the lens
          float nearFade = smoothstep(1.2, 3.2, vCamDist);

          float finalAlpha = texColor.a * vAlpha * uOpacity * vPerimeterFade * nearFade;
          if (finalAlpha < 0.003) discard;

          vec3 finalColor = vColor * uTint;
          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.pointsMesh.frustumCulled = false; // Always updated relative to player cylinder
    this.rootGroup.add(this.pointsMesh);
    this.scene.add(this.rootGroup);
  }

  /**
   * Adjust active particle density based on graphics quality preset.
   */
  public setQuality(quality: GraphicsQuality) {
    if (quality === 'performance') {
      this.activeCount = 380;
    } else if (quality === 'balanced') {
      this.activeCount = 750;
    } else {
      this.activeCount = 1250;
    }
    this.geometry.setDrawRange(0, this.activeCount);
  }

  /**
   * Controls whether the ground dust is rendered (e.g. hidden inside deep underground mine shafts).
   */
  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.rootGroup.visible = visible;
  }

  /**
   * Main per-frame simulation update.
   * Hugs the local terrain surface, simulates wind gusts, and updates diurnal lighting tints.
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    timeOfDay: number = 12.0,
    weather: WeatherType = 'clear',
    isUnderground: boolean = false
  ) {
    if (isUnderground) {
      if (this.rootGroup.visible) this.rootGroup.visible = false;
      return;
    }
    if (!this.isVisible) return;
    if (!this.rootGroup.visible) this.rootGroup.visible = true;

    // Clamp delta to avoid massive leaps on frame drops
    const dt = Math.min(delta, 0.08);
    this.elapsedTime += dt;

    // Slowly meandering wind azimuth for realistic desert atmospheric drift
    const windAngle = this.currentWindAngle + Math.sin(this.elapsedTime * 0.04) * 0.15;
    const windDirX = Math.cos(windAngle);
    const windDirZ = Math.sin(windAngle);

    // Desert wind gust simulation: periodic swell + gust flutter
    const gustSwell = Math.sin(this.elapsedTime * 0.65) * 1.5;
    const gustFlutter = Math.sin(this.elapsedTime * 1.85 + 1.2) * 0.8;
    const baseBreeze = 3.6;

    let weatherSpeedFactor = 1.0;
    let targetOpacity = 0.16; // Subtle default

    if (weather === 'sandstorm') {
      weatherSpeedFactor = 2.4;
      targetOpacity = 0.34;
    } else if (weather === 'storm' || weather === 'light_rain') {
      weatherSpeedFactor = 0.8;
      targetOpacity = 0.035; // Wet desert soil suppresses loose blowing dust
    }

    const currentSpeed = Math.max(1.4, (baseBreeze + gustSwell + gustFlutter) * weatherSpeedFactor);

    // Diurnal color & atmospheric tint
    this.updateDiurnalTint(timeOfDay, weather, targetOpacity);

    // Update shader uniforms
    this.material.uniforms.uPlayerCenter.value.copy(playerPos);
    this.material.uniforms.uTime.value = this.elapsedTime;

    const crosswindX = -windDirZ;
    const crosswindZ = windDirX;

    const maxRadius = 46.0;
    const maxRadiusSq = maxRadius * maxRadius;

    for (let i = 0; i < this.activeCount; i++) {
      const p = this.particles[i];
      const idx = i * 3;

      p.age += dt;

      // Advance particle position along wind vector
      const speed = currentSpeed * p.speedMult;
      const swirl = Math.sin(this.elapsedTime * p.swirlSpeed + p.phase) * p.swirlRadius;

      p.x += (windDirX * speed + crosswindX * (p.crosswind + swirl)) * dt;
      p.z += (windDirZ * speed + crosswindZ * (p.crosswind + swirl)) * dt;

      const dx = p.x - playerPos.x;
      const dz = p.z - playerPos.z;
      const distSq = dx * dx + dz * dz;

      // Downwind projection check: recycle when drifted too far past player or aged out
      const downwindDist = dx * windDirX + dz * windDirZ;

      if (distSq > maxRadiusSq || downwindDist > 40.0 || p.age > p.maxAge) {
        // Respawn on the upwind crescent perimeter
        p.age = 0;
        p.maxAge = 9.0 + Math.random() * 8.0;

        const upwindOffset = 38.0 + Math.random() * 8.0;
        const lateralSpread = (Math.random() - 0.5) * 72.0;

        p.x = playerPos.x - windDirX * upwindOffset + crosswindX * lateralSpread;
        p.z = playerPos.z - windDirZ * upwindOffset + crosswindZ * lateralSpread;
        p.hoverHeight = Math.random() < 0.72 ? 0.06 + Math.random() * 0.65 : 0.70 + Math.random() * 0.95;
        p.speedMult = 0.75 + Math.random() * 0.65;
        p.crosswind = (Math.random() - 0.5) * 1.2;
      }

      // Sample terrain elevation so dust hugs the ground surface
      const groundY = this.getTerrainHeight(p.x, p.z);
      const verticalWave = Math.sin(this.elapsedTime * 2.1 + p.phase) * 0.07;

      this.positionsArray[idx] = p.x;
      this.positionsArray[idx + 1] = groundY + p.hoverHeight + verticalWave;
      this.positionsArray[idx + 2] = p.z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Colors the ground dust in response to diurnal sun angle and weather conditions.
   */
  private updateDiurnalTint(timeOfDay: number, weather: WeatherType, baseOpacity: number) {
    // 0 to 24 hours
    // Dawn: 5.5 - 7.5
    // Noon: 11.5 - 13.5
    // Sunset: 17.5 - 19.5
    // Night: < 5.0 or > 20.0

    if (timeOfDay >= 5.5 && timeOfDay < 8.0) {
      // Warm golden hour dawn
      const t = (timeOfDay - 5.5) / 2.5;
      this.tempColor.setHex(0xfbbf24).lerp(new THREE.Color(0xfde68a), t);
      this.material.uniforms.uOpacity.value = baseOpacity * 1.15; // Golden rim illumination
    } else if (timeOfDay >= 8.0 && timeOfDay < 17.0) {
      // Arid sun-bleached daytime silt
      this.tempColor.setHex(0xf3dfc8);
      this.material.uniforms.uOpacity.value = baseOpacity;
    } else if (timeOfDay >= 17.0 && timeOfDay < 19.8) {
      // Fiery Superstition Mountain sunset
      const t = (timeOfDay - 17.0) / 2.8;
      this.tempColor.setHex(0xf97316).lerp(new THREE.Color(0xb45309), t);
      this.material.uniforms.uOpacity.value = baseOpacity * 1.25; // Backlit dust glow
    } else {
      // Moonlit desert night: soft silvery-slate ochre
      this.tempColor.setHex(0x94a3b8);
      this.material.uniforms.uOpacity.value = baseOpacity * 0.65;
    }

    if (weather === 'sandstorm') {
      this.tempColor.lerp(new THREE.Color(0xd97706), 0.6);
    } else if (weather === 'storm') {
      this.tempColor.lerp(new THREE.Color(0x64748b), 0.7);
    }

    this.material.uniforms.uTint.value.copy(this.tempColor);
  }

  public dispose() {
    this.scene.remove(this.rootGroup);
    this.geometry.dispose();
    this.material.dispose();
    this.dustTexture.dispose();
    this.particles = [];
  }
}
