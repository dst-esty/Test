import * as THREE from 'three';
import { WeatherType } from '../types';
import { soundEngine } from '../audio/soundEffects';

interface CloudPuff {
  mesh: THREE.Group;
  speed: number;
  baseY: number;
}

export class AtmosphereManager {
  private scene: THREE.Scene;
  private skyDome: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private sunMesh: THREE.Mesh;
  private sunGlow: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private cloudGroup: THREE.Group = new THREE.Group();
  private clouds: CloudPuff[] = [];
  private rainGroup: THREE.Group = new THREE.Group();
  private rainParticles: THREE.Points | null = null;
  private rainPositions: Float32Array | null = null;
  private lightningLight: THREE.PointLight;
  private lightningMesh: THREE.Line | null = null;

  private weather: WeatherType = 'clear';
  private timeOfDay: number = 16.0; // default 4 PM Weaver's Needle Shadow Legend
  private stormTimer: number = 0;
  private lightningActiveTimer: number = 0;
  private nextLightningTime: number = 4.0;
  private elapsedTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Realistic Atmospheric Scattering Sky Dome
    const skyGeo = new THREE.SphereGeometry(550, 32, 24);
    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunPosition;
        uniform float uTime;
        uniform float uTimeOfDay;
        uniform float uWeather; // 0=clear/clouds, 1=sunset, 2=night, 3=storm
        varying vec3 vWorldPosition;

        float starHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 viewDir = normalize(vWorldPosition);
          vec3 sunDir = normalize(uSunPosition);
          float sunDot = max(dot(viewDir, sunDir), 0.0);
          float horizon = clamp(viewDir.y, 0.0, 1.0);

          // Rayleigh scattering gradient curves
          vec3 zenith = vec3(0.16, 0.42, 0.85);
          vec3 horizonCol = vec3(0.92, 0.78, 0.62);

          if (uTimeOfDay >= 15.5 && uTimeOfDay <= 19.5) {
            // Golden hour into Arizona alpenglow sunset
            float t = (uTimeOfDay - 15.5) / 4.0;
            zenith = mix(vec3(0.18, 0.36, 0.68), vec3(0.08, 0.05, 0.22), t);
            horizonCol = mix(vec3(0.98, 0.56, 0.18), vec3(0.85, 0.22, 0.12), t);
          } else if (uTimeOfDay > 19.5 || uTimeOfDay < 5.5) {
            // Deep starlit desert night
            zenith = vec3(0.012, 0.018, 0.045);
            horizonCol = vec3(0.035, 0.045, 0.095);
          }

          if (uWeather > 2.5) {
            // Monsoonal thunderstorm sky
            zenith = vec3(0.11, 0.13, 0.16);
            horizonCol = vec3(0.18, 0.20, 0.24);
          }

          vec3 sky = mix(horizonCol, zenith, pow(horizon, 0.48));

          // Physical Sun Disc and Mie scattering glow
          if (sunDir.y > -0.05 && uWeather < 2.5) {
            float sunHalo = pow(sunDot, 160.0) * 3.5 + pow(sunDot, 14.0) * 0.45;
            vec3 haloCol = (uTimeOfDay >= 15.5 && uTimeOfDay <= 19.5) ? vec3(1.0, 0.58, 0.22) : vec3(1.0, 0.95, 0.84);
            sky += haloCol * sunHalo;
          }

          // Celestial Night Stars and Procedural Milky Way Lane
          if (uTimeOfDay > 19.5 || uTimeOfDay < 5.5) {
            float nightFade = (uTimeOfDay > 19.5 && uTimeOfDay < 21.0)
              ? (uTimeOfDay - 19.5) / 1.5
              : (uTimeOfDay >= 4.5 && uTimeOfDay <= 5.5 ? (5.5 - uTimeOfDay) : 1.0);

            float star = step(0.9962, starHash(floor(viewDir * 420.0))) * nightFade;
            float milkyBand = pow(max(0.0, 1.0 - abs(viewDir.x * 0.72 + viewDir.z * 0.69)), 5.5) * 0.28 * nightFade;
            sky += vec3(0.94, 0.96, 1.0) * star + vec3(0.68, 0.76, 0.98) * milkyBand;
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      uniforms: {
        uSunPosition: { value: new THREE.Vector3(100, 150, 100) },
        uTime: { value: 0 },
        uTimeOfDay: { value: 16.0 },
        uWeather: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyDome);

    // 2. Visible Sun disc & Solar Corona
    const sunGeo = new THREE.SphereGeometry(6.5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffaed,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);

    // Glowing halo around sun
    const glowGeo = new THREE.PlaneGeometry(36, 36);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      depthWrite: false,
    });
    this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
    this.sunMesh.add(this.sunGlow);
    this.scene.add(this.sunMesh);

    // 3. Visible Moon
    const moonGeo = new THREE.SphereGeometry(5.0, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe0e7ff,
      fog: false,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);

    const moonGlowGeo = new THREE.PlaneGeometry(28, 28);
    const moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      depthWrite: false,
    });
    const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    this.moonMesh.add(moonGlow);
    this.scene.add(this.moonMesh);

    // 4. Volumetric Desert Clouds
    this.scene.add(this.cloudGroup);
    this.spawnClouds();

    // 5. Rain & Storm System
    this.scene.add(this.rainGroup);
    this.initRainSystem();

    // 6. Lightning Light
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 450);
    this.lightningLight.position.set(60, 95, 20);
    this.scene.add(this.lightningLight);

    this.updateAtmosphere(this.timeOfDay, this.weather);
  }

  // --- PROCEDURAL CLOUDS ---
  private spawnClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      flatShading: false,
    });

    // Spawn 14 puffy drifting cloud formations across the sky dome
    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 5);

      for (let p = 0; p < puffCount; p++) {
        const radius = 9 + Math.random() * 9;
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(radius, 1),
          cloudMat.clone()
        );
        puff.position.set(
          (p - puffCount / 2) * 11 + (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 12
        );
        puff.scale.set(1.2, 0.65 + Math.random() * 0.25, 1.0);
        group.add(puff);
      }

      const x = (Math.random() - 0.5) * 360;
      const z = (Math.random() - 0.5) * 360;
      const y = 85 + Math.random() * 16;
      group.position.set(x, y, z);

      this.cloudGroup.add(group);
      this.clouds.push({
        mesh: group,
        speed: 1.8 + Math.random() * 1.5,
        baseY: y,
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

  // --- LIGHTNING BOLT PROCEDURAL MESH ---
  private triggerLightningFlash() {
    this.lightningActiveTimer = 0.12;
    this.lightningLight.intensity = 5.5;

    // Random bolt origin over mountain peaks
    const startX = (Math.random() - 0.5) * 120 + 40;
    const startZ = (Math.random() - 0.5) * 120;
    const startY = 85;

    this.lightningLight.position.set(startX, startY - 15, startZ);

    if (this.lightningMesh) {
      this.scene.remove(this.lightningMesh);
      this.lightningMesh.geometry.dispose();
      this.lightningMesh = null;
    }

    // Procedural jagged lightning bolt
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

  // --- ATMOSPHERE & LIGHTING UPDATE ---
  public updateAtmosphere(
    time: number,
    weather: WeatherType,
    sunLight?: THREE.DirectionalLight,
    hemiLight?: THREE.HemisphereLight
  ) {
    this.timeOfDay = time;
    this.weather = weather;

    // 1. Sun & Moon Orbital Trajectory
    // Solar angle: 0 at 6am (east), Math.PI/2 at 12pm (noon zenith), Math.PI at 18pm (west)
    const solarFraction = (time - 6) / 12;
    const sunAngle = solarFraction * Math.PI;
    const orbitDist = 260;

    const sunX = Math.cos(sunAngle) * orbitDist;
    const sunY = Math.sin(sunAngle) * 160 + 20;
    const sunZ = Math.sin(sunAngle * 0.5) * 70;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunGlow.lookAt(0, 0, 0);

    // Lunar orbit (opposite the sun)
    const lunarFraction = (time - 18) / 12;
    const moonAngle = lunarFraction * Math.PI;
    const moonX = Math.cos(moonAngle) * orbitDist;
    const moonY = Math.sin(moonAngle) * 150 + 20;
    const moonZ = Math.sin(moonAngle * 0.5) * 70;

    this.moonMesh.position.set(moonX, moonY, moonZ);
    this.moonMesh.children[0]?.lookAt(0, 0, 0);

    // Update shader uniforms
    this.skyMaterial.uniforms.uSunPosition.value.set(sunX, sunY, sunZ);
    this.skyMaterial.uniforms.uTimeOfDay.value = time;
    let weatherCode = 0;
    if (weather === 'sunset' || (time >= 15.5 && time <= 19.5)) weatherCode = 1;
    if (weather === 'night' || time < 5.5 || time > 19.5) weatherCode = 2;
    if (weather === 'storm') weatherCode = 3;
    this.skyMaterial.uniforms.uWeather.value = weatherCode;

    if (sunLight) {
      sunLight.position.set(sunX, Math.max(sunY, -30), sunZ);
    }

    const isSunUp = sunY > 0;
    this.sunMesh.visible = isSunUp && weather !== 'storm';
    this.moonMesh.visible = !isSunUp || weather === 'night';

    // 2. Weather & Color Schemes
    if (weather === 'storm') {
      // Monsoonal Desert Thunderstorm
      this.scene.background = new THREE.Color(0x1a202c);
      if (this.scene.fog) {
        this.scene.fog.color = new THREE.Color(0x1a202c);
        (this.scene.fog as THREE.Fog).near = 15;
        (this.scene.fog as THREE.Fog).far = 180;
      }
      if (sunLight) {
        sunLight.color = new THREE.Color(0x64748b);
        sunLight.intensity = 0.4;
      }
      if (hemiLight) {
        hemiLight.color = new THREE.Color(0x334155);
        hemiLight.groundColor = new THREE.Color(0x0f172a);
      }
      if (this.rainParticles) this.rainParticles.visible = true;

      // Darken clouds to ominous storm clouds
      this.cloudGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).color.setHex(0x374151);
          (child.material as THREE.MeshStandardMaterial).opacity = 0.96;
        }
      });
    } else if (weather === 'sunset' || (time >= 15.5 && time <= 19.5)) {
      // Warm Arizona Golden Hour (Needle Shadow Legend at 16:00!)
      const sunsetCol = new THREE.Color(0xd97706); // Rich copper
      this.scene.background = sunsetCol;
      if (this.scene.fog) {
        this.scene.fog.color = new THREE.Color(0xd97706);
        (this.scene.fog as THREE.Fog).near = 35;
        (this.scene.fog as THREE.Fog).far = 320;
      }
      if (sunLight) {
        sunLight.color = new THREE.Color(0xff8c42);
        sunLight.intensity = 2.4;
      }
      if (hemiLight) {
        hemiLight.color = new THREE.Color(0xfba465);
        hemiLight.groundColor = new THREE.Color(0x6b2816);
      }
      if (this.rainParticles) this.rainParticles.visible = false;

      // Golden tinged clouds
      this.cloudGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).color.setHex(0xfecba1);
          (child.material as THREE.MeshStandardMaterial).opacity = 0.88;
        }
      });
    } else if (weather === 'night' || time < 5.5 || time > 19.5) {
      // Starry desert night
      this.scene.background = new THREE.Color(0x050814);
      if (this.scene.fog) {
        this.scene.fog.color = new THREE.Color(0x050814);
        (this.scene.fog as THREE.Fog).near = 40;
        (this.scene.fog as THREE.Fog).far = 300;
      }
      if (sunLight) {
        sunLight.color = new THREE.Color(0x384a75);
        sunLight.intensity = 0.35;
      }
      if (hemiLight) {
        hemiLight.color = new THREE.Color(0x1e293b);
        hemiLight.groundColor = new THREE.Color(0x030712);
      }
      if (this.rainParticles) this.rainParticles.visible = false;

      this.cloudGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).color.setHex(0x1e293b);
          (child.material as THREE.MeshStandardMaterial).opacity = 0.7;
        }
      });
    } else {
      // Brilliant Arizona Blue Sky (Noon / Clear / Clouds)
      const azureBlue = new THREE.Color(0x38bdf8);
      this.scene.background = azureBlue;
      if (this.scene.fog) {
        this.scene.fog.color = new THREE.Color(0xdbeafe);
        (this.scene.fog as THREE.Fog).near = 50;
        (this.scene.fog as THREE.Fog).far = 350;
      }
      if (sunLight) {
        sunLight.color = new THREE.Color(0xfffaed);
        sunLight.intensity = 2.0;
      }
      if (hemiLight) {
        hemiLight.color = new THREE.Color(0xe0f2fe);
        hemiLight.groundColor = new THREE.Color(0x78350f);
      }
      if (this.rainParticles) this.rainParticles.visible = false;

      // Clean puffy white clouds
      this.cloudGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
          (child.material as THREE.MeshStandardMaterial).opacity = weather === 'clouds' ? 0.95 : 0.75;
        }
      });
    }
  }

  // --- ANIMATION UPDATE LOOP ---
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    sunLight?: THREE.DirectionalLight,
    hemiLight?: THREE.HemisphereLight
  ) {
    this.elapsedTime += delta;
    this.skyMaterial.uniforms.uTime.value = this.elapsedTime;

    // Follow player so sky dome is always centered on camera
    this.skyDome.position.copy(playerPos);

    // 1. Drifting Clouds
    this.clouds.forEach((c) => {
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 220) {
        c.mesh.position.x = -220;
        c.mesh.position.z = (Math.random() - 0.5) * 360;
      }
    });

    // 2. Storm Rain Animation & Lightning
    if (this.weather === 'storm') {
      this.stormTimer += delta;

      // Move rain around player
      if (this.rainParticles && this.rainPositions) {
        const count = this.rainPositions.length / 3;
        for (let i = 0; i < count; i++) {
          this.rainPositions[i * 3 + 1] -= 42 * delta; // Falling velocity
          this.rainPositions[i * 3] += 5 * delta; // Wind angle

          if (this.rainPositions[i * 3 + 1] < 0) {
            this.rainPositions[i * 3 + 1] = 65;
            this.rainPositions[i * 3] = playerPos.x + (Math.random() - 0.5) * 160;
            this.rainPositions[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 160;
          }
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Lightning strike schedule
      if (this.stormTimer >= this.nextLightningTime) {
        this.triggerLightningFlash();
        this.stormTimer = 0;
        this.nextLightningTime = 3.5 + Math.random() * 5.5;
      }

      // Lightning decay
      if (this.lightningActiveTimer > 0) {
        this.lightningActiveTimer -= delta;
        if (this.lightningActiveTimer <= 0) {
          this.lightningLight.intensity = 0;
          if (this.lightningMesh) {
            this.scene.remove(this.lightningMesh);
            this.lightningMesh.geometry.dispose();
            this.lightningMesh = null;
          }
        }
      }
    }
  }

  public dispose() {
    this.scene.remove(this.skyDome);
    this.skyDome.geometry.dispose();
    this.skyMaterial.dispose();
    this.scene.remove(this.sunMesh);
    this.scene.remove(this.moonMesh);
    this.scene.remove(this.cloudGroup);
    this.scene.remove(this.rainGroup);
    this.scene.remove(this.lightningLight);
    if (this.lightningMesh) {
      this.scene.remove(this.lightningMesh);
      this.lightningMesh.geometry.dispose();
    }
    this.clouds.forEach((c) => {
      c.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    });
    this.clouds = [];
  }
}
