/**
 * Apache Smoke Signals 3D Particle & Billow System
 *
 * Renders procedural, organic smoke signal puffs that rise from high,
 * inaccessible mountain ridges (Weaver's Crag, Peralta North Rim, Black Mesa)
 * when Apache vigilance reaches noticeable levels.
 *
 * Puffs rise, expand, drift subtly on the desert wind, and fade,
 * mimicking authentic rhythmic Apache smoke telegraphy.
 */

import * as THREE from 'three';
import { SMOKE_SIGNAL_LOCATIONS, SmokeSignalLocation } from '../services/apacheVigilanceService';

interface SmokePuff {
  mesh: THREE.Mesh;
  birthTime: number;
  lifetime: number;
  initialScale: number;
  targetScale: number;
  riseSpeed: number;
  driftX: number;
  driftZ: number;
  sourceLocation: SmokeSignalLocation;
}

export class ApacheSmokeSignalSystem {
  private scene: THREE.Scene;
  private smokeGroup: THREE.Group = new THREE.Group();
  private puffs: SmokePuff[] = [];
  private smokeTexture: THREE.CanvasTexture;
  private smokeMaterial: THREE.MeshBasicMaterial;
  private puffGeometry: THREE.PlaneGeometry;
  private lastEmitTime: number = 0;
  private emitInterval: number = 2.4; // Seconds between puffs (rhythmic signals)
  private isVisible: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.smokeGroup.name = 'apache_smoke_signals';
    this.scene.add(this.smokeGroup);

    this.smokeTexture = this.createSmokeTexture();
    this.puffGeometry = new THREE.PlaneGeometry(3.5, 3.5);
    this.smokeMaterial = new THREE.MeshBasicMaterial({
      map: this.smokeTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
  }

  private createSmokeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 128);

    // Multi-puff dense woodfire smoke contour
    const subPuffs = [
      { x: 64, y: 64, r: 42, a: 0.8 },
      { x: 50, y: 56, r: 32, a: 0.65 },
      { x: 78, y: 58, r: 34, a: 0.65 },
      { x: 60, y: 76, r: 30, a: 0.6 },
      { x: 74, y: 74, r: 28, a: 0.55 },
    ];

    subPuffs.forEach(({ x, y, r, a }) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(45, 38, 32, ${a})`);
      grad.addColorStop(0.5, `rgba(65, 55, 46, ${a * 0.7})`);
      grad.addColorStop(0.8, `rgba(90, 80, 70, ${a * 0.3})`);
      grad.addColorStop(1, 'rgba(110, 100, 90, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  public setVigilanceState(active: boolean) {
    this.isVisible = active;
  }

  public update(deltaTime: number, camera: THREE.Camera, timeSeconds: number) {
    // Spawn new puffs periodically from ridge locations if vigilance is active
    if (this.isVisible && timeSeconds - this.lastEmitTime > this.emitInterval) {
      this.lastEmitTime = timeSeconds;

      // Pick 1-2 active ridge locations to emit a puff
      SMOKE_SIGNAL_LOCATIONS.forEach((loc) => {
        // Stagger puff chances to create realistic Morse-like intervals
        if (Math.random() < 0.65) {
          this.spawnPuff(loc, timeSeconds);
        }
      });
    }

    // Update active puffs
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      const age = timeSeconds - p.birthTime;
      const progress = age / p.lifetime;

      if (progress >= 1.0) {
        // Remove dead puff
        this.smokeGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.puffs.splice(i, 1);
        continue;
      }

      // Billboard to face camera
      p.mesh.quaternion.copy(camera.quaternion);

      // Rise and drift
      p.mesh.position.y += p.riseSpeed * deltaTime;
      p.mesh.position.x += p.driftX * deltaTime;
      p.mesh.position.z += p.driftZ * deltaTime;

      // Scale expansion as it rises into the sky
      const currentScale = p.initialScale + (p.targetScale - p.initialScale) * Math.pow(progress, 0.7);
      p.mesh.scale.set(currentScale, currentScale, currentScale);

      // Alpha envelope: fade in quickly, stay solid, then gently fade out
      let opacity = 0;
      if (progress < 0.15) {
        opacity = (progress / 0.15) * 0.75;
      } else if (progress < 0.65) {
        opacity = 0.75;
      } else {
        opacity = 0.75 * (1.0 - (progress - 0.65) / 0.35);
      }

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }
  }

  private spawnPuff(loc: SmokeSignalLocation, timeSeconds: number) {
    if (this.puffs.length > 45) return; // Cap maximum smoke puffs for smooth 60fps

    // Unique material clone per puff so opacity can fade individually
    const mat = this.smokeMaterial.clone();
    const mesh = new THREE.Mesh(this.puffGeometry, mat);

    // Initial slight jitter around ridge firepit
    const jx = (Math.random() - 0.5) * 2.0;
    const jz = (Math.random() - 0.5) * 2.0;
    mesh.position.set(loc.x + jx, loc.y + 1.0, loc.z + jz);

    const initialScale = 1.0 + Math.random() * 0.5;
    const targetScale = 6.5 + Math.random() * 3.5;
    mesh.scale.set(initialScale, initialScale, initialScale);

    this.smokeGroup.add(mesh);

    this.puffs.push({
      mesh,
      birthTime: timeSeconds,
      lifetime: 9.0 + Math.random() * 4.0, // 9 to 13 seconds airtime
      initialScale,
      targetScale,
      riseSpeed: 3.2 + Math.random() * 1.5,
      driftX: 0.6 + (Math.random() - 0.5) * 0.4, // Gentle canyon breeze
      driftZ: -0.4 + (Math.random() - 0.5) * 0.3,
      sourceLocation: loc,
    });
  }

  public dispose() {
    this.puffs.forEach((p) => {
      this.smokeGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.puffs = [];
    this.smokeTexture.dispose();
    this.smokeMaterial.dispose();
    this.puffGeometry.dispose();
    this.scene.remove(this.smokeGroup);
  }
}
