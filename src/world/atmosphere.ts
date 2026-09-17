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
  private timeOfDay: number = 16.0; // default 4 PM Weaver's Needle Shadow Legend
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
    const skyGeo = new THREE.SphereGeometry(550, 48, 32);
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
        uniform float uWeather; // 0=clear/clouds, 1=sunset/golden hour, 2=night, 3=storm, 4=sandstorm, 5=light_rain
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

          // Rayleigh scattering gradient curves
          // Default: Brilliant Arizona desert azure sky
          vec3 zenith = vec3(0.18, 0.44, 0.88);
          vec3 horizonCol = vec3(0.76, 0.86, 0.94);

          if (uTimeOfDay >= 15.0 && uTimeOfDay <= 19.5) {
            // Golden hour into Arizona alpenglow and desert twilight
            float t = clamp((uTimeOfDay - 15.0) / 4.5, 0.0, 1.0);
            zenith = mix(vec3(0.19, 0.36, 0.68), vec3(0.08, 0.07, 0.22), t);
            horizonCol = mix(vec3(0.98, 0.62, 0.24), vec3(0.88, 0.28, 0.12), t);
          } else if (uTimeOfDay > 19.5 || uTimeOfDay < 5.5) {
            // Pristine starlit desert night
            zenith = vec3(0.012, 0.016, 0.038);
            horizonCol = vec3(0.032, 0.042, 0.088);
          }

          if (uWeather > 2.5 && uWeather < 3.5) {
            // Monsoonal thunderstorm sky
            zenith = vec3(0.13, 0.15, 0.19);
            horizonCol = vec3(0.20, 0.22, 0.26);
          } else if (uWeather >= 3.5 && uWeather < 4.5) {
            // Dramatic Haboob desert sandstorm sky
            zenith = vec3(0.56, 0.34, 0.18);
            horizonCol = vec3(0.74, 0.49, 0.26);
          } else if (uWeather >= 4.5) {
            // Gentle overcast light rain sky
            zenith = vec3(0.28, 0.34, 0.44);
            horizonCol = vec3(0.48, 0.54, 0.62);
          }

          vec3 sky = mix(horizonCol, zenith, pow(horizon, 0.52));

          // Physical Sun Disc and Mie scattering corona on the celestial sky dome
          if (sunDir.y > -0.08 && uWeather < 2.5) {
            // Razor-sharp optical solar disc with soft limb darkening
            float sunDisc = smoothstep(0.9993, 0.9998, sunDot);

            // Forward Mie atmospheric scattering corona
            float innerCorona = pow(sunDot, 320.0) * 3.5;
            float outerCorona = pow(sunDot, 24.0) * 0.75;
            float wideGlare = pow(sunDot, 5.0) * 0.18;

            vec3 sunHue = (uTimeOfDay >= 15.0 && uTimeOfDay <= 19.5)
              ? vec3(1.0, 0.76, 0.38)
              : vec3(1.0, 0.96, 0.88);

            sky += sunHue * (innerCorona + outerCorona + wideGlare);
            sky += vec3(1.0, 1.0, 0.95) * sunDisc * 2.5;
          } else if (sunDir.y > -0.08 && uWeather >= 3.5 && uWeather < 4.5) {
            // Obscured reddish solar disc struggling through the thick Haboob dust
            float sunDisc = smoothstep(0.9988, 0.9998, sunDot);
            sky += vec3(1.0, 0.55, 0.25) * sunDisc * 0.9;
            sky += vec3(0.9, 0.45, 0.2) * pow(sunDot, 14.0) * 0.32;
          }

          // Celestial Night Stars and Procedural Milky Way
          if (uTimeOfDay > 19.2 || uTimeOfDay < 5.8) {
            float nightFade = 1.0;
            if (uTimeOfDay >= 19.2 && uTimeOfDay < 20.8) {
              nightFade = (uTimeOfDay - 19.2) / 1.6;
            } else if (uTimeOfDay >= 4.8 && uTimeOfDay <= 5.8) {
              nightFade = (5.8 - uTimeOfDay);
            }

            float star = step(0.9962, starHash(floor(viewDir * 420.0))) * nightFade;
            float milkyBand = pow(max(0.0, 1.0 - abs(viewDir.x * 0.72 + viewDir.z * 0.69)), 5.5) * 0.30 * nightFade;
            sky += vec3(0.94, 0.96, 1.0) * star + vec3(0.70, 0.78, 0.98) * milkyBand;
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      uniforms: {
        uSunPosition: { value: new THREE.Vector3(0.6, 0.7, 0.3).normalize() },
        uTime: { value: 0 },
        uTimeOfDay: { value: 16.0 },
        uWeather: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyDome);

    // 2. Optical Sun System (Spherical Core + Circular Camera-Facing Sprites)
    // Never uses untextured flat square PlaneGeometry quads!
    const sunDiscGeo = new THREE.SphereGeometry(6.0, 32, 32);
    const sunDiscMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      fog: false,
    });
    this.sunDiscMesh = new THREE.Mesh(sunDiscGeo, sunDiscMat);
    this.sunGroup.add(this.sunDiscMesh);

    // Luminous inner corona flare sprite
    const coronaMat = new THREE.SpriteMaterial({
      map: this.sunTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.92,
      fog: false,
      depthWrite: false,
    });
    this.sunCoronaSprite = new THREE.Sprite(coronaMat);
    this.sunCoronaSprite.scale.set(58, 58, 1);
    this.sunGroup.add(this.sunCoronaSprite);

    // Atmospheric wide bloom sprite
    const outerGlowMat = new THREE.SpriteMaterial({
      map: this.sunTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.38,
      fog: false,
      depthWrite: false,
    });
    this.sunOuterGlowSprite = new THREE.Sprite(outerGlowMat);
    this.sunOuterGlowSprite.scale.set(130, 130, 1);
    this.sunGroup.add(this.sunOuterGlowSprite);

    this.scene.add(this.sunGroup);

    // 3. Optical Moon System
    const moonDiscGeo = new THREE.SphereGeometry(5.2, 32, 32);
    const moonDiscMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      fog: false,
    });
    this.moonDiscMesh = new THREE.Mesh(moonDiscGeo, moonDiscMat);
    this.moonGroup.add(this.moonDiscMesh);

    const moonGlowMat = new THREE.SpriteMaterial({
      map: this.moonTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.55,
      fog: false,
      depthWrite: false,
    });
    this.moonGlowSprite = new THREE.Sprite(moonGlowMat);
    this.moonGlowSprite.scale.set(42, 42, 1);
    this.moonGroup.add(this.moonGlowSprite);

    this.scene.add(this.moonGroup);

    // 4. Volumetric Realistic Desert Clouds
    this.scene.add(this.cloudGroup);
    this.spawnRealisticClouds();

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
    this.timeOfDay = time;
    this.weather = weather;

    // 1. Calculate astronomical solar vector
    const solarFraction = (time - 6) / 12;
    const sunAngle = solarFraction * Math.PI;
    const sunY = Math.sin(sunAngle) * 0.88 + 0.12;
    const sunDir = new THREE.Vector3(
      Math.cos(sunAngle),
      sunY,
      Math.sin(sunAngle * 0.5) * 0.38
    ).normalize();

    const isSunUp = sunY > 0.02;
    this.sunGroup.visible = isSunUp && weather !== 'storm';
    this.moonGroup.visible = !isSunUp || weather === 'night';

    // Update sky shader uniforms
    this.skyMaterial.uniforms.uSunPosition.value.copy(sunDir);
    this.skyMaterial.uniforms.uTimeOfDay.value = time;

    let weatherCode = 0;
    if (weather === 'sunset' || (time >= 15.0 && time <= 19.5)) weatherCode = 1;
    if (weather === 'night' || time < 5.5 || time > 19.5) weatherCode = 2;
    if (weather === 'storm') weatherCode = 3;
    if (weather === 'sandstorm') weatherCode = 4;
    if (weather === 'light_rain') weatherCode = 5;
    this.skyMaterial.uniforms.uWeather.value = weatherCode;

    // Synchronize audio synthesizer ambiance
    soundEngine.updateWeatherAmbiance(weather, false);

    // 2. Weather Lighting & Realistic Cloud Colors
    if (weather === 'sandstorm') {
      // Violent Arizona Haboob Dust Storm
      if (this.scene.fog && 'color' in this.scene.fog) {
        this.scene.fog.color.setHex(0xa66336); // Thick suspended terracotta dust
        if ('density' in this.scene.fog) (this.scene.fog as THREE.FogExp2).density = 0.0095;
      }
      if (sunLight) {
        sunLight.color.setHex(0xdf8445);
        sunLight.intensity = 0.65;
      }
      if (hemiLight) {
        hemiLight.color.setHex(0xca7740);
        hemiLight.groundColor.setHex(0x603418);
      }
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.sandstormParticles) this.sandstormParticles.visible = true;
      if (this.ambientDustParticles) this.ambientDustParticles.visible = false;

      // Haboob dust clouds: Thick, dark churning ochre/sand billows
      this.updateCloudColors(0xa66336, 0x6e3b1c, 0.98);

    } else if (weather === 'light_rain') {
      // Gentle Overcast Desert Shower
      if (this.scene.fog && 'color' in this.scene.fog) {
        this.scene.fog.color.setHex(0x5d6e82); // Soft blue-gray rain haze
        if ('density' in this.scene.fog) (this.scene.fog as THREE.FogExp2).density = 0.0038;
      }
      if (sunLight) {
        sunLight.color.setHex(0x9fb5ce);
        sunLight.intensity = 1.3;
      }
      if (hemiLight) {
        hemiLight.color.setHex(0x8aa1bd);
        hemiLight.groundColor.setHex(0x384758);
      }
      if (this.rainParticles) {
        this.rainParticles.visible = true;
        (this.rainParticles.material as THREE.PointsMaterial).size = 0.38;
        (this.rainParticles.material as THREE.PointsMaterial).opacity = 0.45;
        (this.rainParticles.material as THREE.PointsMaterial).color.setHex(0xbfdbfe);
      }
      if (this.sandstormParticles) this.sandstormParticles.visible = false;
      if (this.ambientDustParticles) this.ambientDustParticles.visible = false;

      // Rainy overcast clouds: Soft silver-grey
      this.updateCloudColors(0xb8c8da, 0x6b7c91, 0.88);

    } else if (weather === 'storm') {
      // Monsoonal Desert Thunderstorm
      if (this.scene.fog && 'color' in this.scene.fog) {
        this.scene.fog.color.setHex(0x1a202c);
        if ('density' in this.scene.fog) (this.scene.fog as THREE.FogExp2).density = 0.0055;
      }
      if (sunLight) {
        sunLight.color.setHex(0x64748b);
        sunLight.intensity = 0.45;
      }
      if (hemiLight) {
        hemiLight.color.setHex(0x334155);
        hemiLight.groundColor.setHex(0x1e293b);
      }
      if (this.rainParticles) {
        this.rainParticles.visible = true;
        (this.rainParticles.material as THREE.PointsMaterial).size = 0.55;
        (this.rainParticles.material as THREE.PointsMaterial).opacity = 0.82;
        (this.rainParticles.material as THREE.PointsMaterial).color.setHex(0x93c5fd);
      }
      if (this.sandstormParticles) this.sandstormParticles.visible = false;
      if (this.ambientDustParticles) this.ambientDustParticles.visible = false;

      // Storm clouds: dramatic slate blue-gray with dark turbulent undersides
      this.updateCloudColors(0x64748b, 0x334155, 0.94);

    } else if (weather === 'sunset' || (time >= 15.0 && time <= 19.5)) {
      // Warm Arizona Golden Hour (Needle Shadow Legend at 16:00!)
      // Atmosphere has warm desert haze on mountains, but clouds reflect clean golden light
      if (this.scene.fog && 'color' in this.scene.fog) {
        this.scene.fog.color.setHex(0xd49b6a); // Clean desert atmospheric haze
        if ('density' in this.scene.fog) (this.scene.fog as THREE.FogExp2).density = 0.0028;
      }
      if (sunLight) {
        sunLight.color.setHex(0xffaa5e);
        sunLight.intensity = 2.4;
      }
      if (hemiLight) {
        hemiLight.color.setHex(0xffdfba); // Warm golden sky
        hemiLight.groundColor.setHex(0x995830); // Warm terracotta ground bounce
      }
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.sandstormParticles) this.sandstormParticles.visible = false;
      if (this.ambientDustParticles) this.ambientDustParticles.visible = true;

      // Realistic Golden Hour Clouds:
      // Tops: Radiant golden-ivory rim lighting from the low western sun
      // Undersides: Atmospheric soft twilight periwinkle/slate — NEVER muddy brown!
      this.updateCloudColors(0xfef3c7, 0xb0c0d6, 0.90);

    } else if (weather === 'night' || time < 5.5 || time > 19.5) {
      // Starry desert night
      if (this.scene.fog && 'color' in this.scene.fog) {
        this.scene.fog.color.setHex(0x060913);
        if ('density' in this.scene.fog) (this.scene.fog as THREE.FogExp2).density = 0.0035;
      }
      if (sunLight) {
        sunLight.color.setHex(0x384a75);
        sunLight.intensity = 0.35;
      }
      if (hemiLight) {
        hemiLight.color.setHex(0x1e293b);
        hemiLight.groundColor.setHex(0x0b0f19);
      }
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.sandstormParticles) this.sandstormParticles.visible = false;
      if (this.ambientDustParticles) this.ambientDustParticles.visible = true;

      // Night clouds: Translucent silvery-indigo silhouettes under starlight
      this.updateCloudColors(0x334155, 0x182030, 0.45);

    } else {
      // Brilliant Clear Arizona Blue Sky (Midday)
      if (this.scene.fog && 'color' in this.scene.fog) {
        this.scene.fog.color.setHex(0xc2ddf8); // Soft distant blue horizon haze
        if ('density' in this.scene.fog) (this.scene.fog as THREE.FogExp2).density = 0.0020;
      }
      if (sunLight) {
        sunLight.color.setHex(0xfffaed);
        sunLight.intensity = 2.0;
      }
      if (hemiLight) {
        hemiLight.color.setHex(0xe0f2fe);
        hemiLight.groundColor.setHex(0x94653d);
      }
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.sandstormParticles) this.sandstormParticles.visible = false;
      if (this.ambientDustParticles) this.ambientDustParticles.visible = true;

      // Daylight clouds: Crisp radiant pure white tops with soft ambient azure shadows
      this.updateCloudColors(0xffffff, 0xdbeafe, weather === 'clouds' ? 0.94 : 0.82);
    }
  }

  /**
   * Colors the cloud formations with physical lighting.
   * Tops reflect direct sunlight; undersides reflect diffuse ambient tropospheric skylight.
   */
  private updateCloudColors(topHex: number, baseHex: number, opacity: number) {
    const topCol = new THREE.Color(topHex);
    const baseCol = new THREE.Color(baseHex);

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

    // Follow player so sky dome is always centered on camera
    this.skyDome.position.copy(playerPos);

    // Compute celestial orbit vectors
    const solarFraction = (this.timeOfDay - 6) / 12;
    const sunAngle = solarFraction * Math.PI;
    const sunY = Math.sin(sunAngle) * 0.88 + 0.12;
    const sunDir = new THREE.Vector3(
      Math.cos(sunAngle),
      sunY,
      Math.sin(sunAngle * 0.5) * 0.38
    ).normalize();

    const moonDir = sunDir.clone().negate();

    // Place Sun and Moon at optical infinity (450 units) relative to player position
    // This aligns the optical solar disc, corona sprites, and sky shader flawlessly
    this.sunGroup.position.copy(playerPos).addScaledVector(sunDir, 450);
    this.moonGroup.position.copy(playerPos).addScaledVector(moonDir, 450);

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

    // 2. Underground attenuation
    if (isUnderground) {
      if (this.sandstormParticles) this.sandstormParticles.visible = false;
      if (this.rainParticles) this.rainParticles.visible = false;
    } else {
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
