import * as THREE from 'three';
import { BulletTracer, DynamiteEntity, EnemyBandit, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';
import { createPeriodCorrectRifle } from './firearmModel';

export interface BanditEntity {
  data: EnemyBandit;
  mesh: THREE.Group;
  rifleMesh: THREE.Mesh;
  muzzleFlash: THREE.PointLight;
  legs: THREE.Mesh[];
  walkTimer: number;
}

export class CombatManager {
  private bandits: BanditEntity[] = [];
  private tracers: { tracer: BulletTracer; mesh: THREE.Line }[] = [];
  private dynamites: { entity: DynamiteEntity; mesh: THREE.Group }[] = [];
  private scene: THREE.Scene;
  private combatGroup: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene, getTerrainElevation: (x: number, z: number) => number) {
    this.scene = scene;
    this.scene.add(this.combatGroup);
    this.spawnBandits(getTerrainElevation);
  }

  // Spawn hostile claim jumper outlaws guarding key points
  private spawnBandits(getTerrainElevation: (x: number, z: number) => number) {
    const banditSpawns = [
      { id: 'b1', name: 'Black Bart (Rifleman)', x: -20, z: 60 },
      { id: 'b2', name: 'Curly Bill (Claim Jumper)', x: 110, z: 80 },
      { id: 'b3', name: 'Dutchman Canyon Sentry', x: 135, z: 92 },
      { id: 'b4', name: 'Red-Rock Lookout', x: 45, z: -60 },
      { id: 'b5', name: 'Apache Pass Desperado', x: -85, z: 45 },
    ];

    banditSpawns.forEach((b) => {
      const y = getTerrainElevation(b.x, b.z);
      this.createBandit(b.id, b.name, b.x, y, b.z);
    });
  }

  // --- BANDIT 3D MODEL ---
  private createBandit(id: string, name: string, x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Outlaw materials
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x2e231c, roughness: 0.8 }); // Black duster
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x7c2d22, roughness: 0.9 }); // Red plaid shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f2733, roughness: 0.9 }); // Denim trousers
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8987b, roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.7 }); // Black cowboy hat
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x262626, metalness: 0.8, roughness: 0.3 });

    // Torso / Duster
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.9, 8), coatMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    // Red Bandana Mask (Classic Western outlaw look)
    const bandana = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 })
    );
    bandana.rotation.x = Math.PI;
    bandana.position.set(0, 1.48, 0.12);
    group.add(bandana);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 8), skinMat);
    head.position.set(0, 1.62, 0);
    group.add(head);

    // Black Stetson Cowboy Hat
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.04, 12), hatMat);
    brim.position.set(0, 1.76, 0);
    brim.rotation.x = -0.05;
    group.add(brim);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.25, 10), hatMat);
    crown.position.set(0, 1.9, 0);
    group.add(crown);

    // Authentic Period-Correct Frontier Rifle with Real Barrel & Malcolm Telescopic Sight
    const rifleParts = createPeriodCorrectRifle({ isFirstPerson: false });
    rifleParts.root.position.set(0.28, 1.15, 0.25);
    rifleParts.root.rotation.x = -0.2;
    group.add(rifleParts.root);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.65, 6);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.16, 0.32, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.16, 0.32, 0);
    rightLeg.castShadow = true;
    group.add(leftLeg);
    group.add(rightLeg);

    this.combatGroup.add(group);
    this.bandits.push({
      data: {
        id,
        name,
        position: { x, y, z },
        health: 100,
        maxHealth: 100,
        state: 'patrol',
        alertTimer: 0,
        shootCooldown: 1.5 + Math.random() * 2,
        patrolCenter: { x, y, z },
        patrolAngle: Math.random() * Math.PI * 2,
      },
      mesh: group,
      rifleMesh: rifleParts.barrelMesh,
      muzzleFlash: rifleParts.muzzleFlashLight || new THREE.PointLight(0xffaa22, 0, 10),
      legs: [leftLeg, rightLeg],
      walkTimer: Math.random() * 10,
    });
  }

  // --- PLAYER WEAPON: FIRE RIFLE ---
  public playerShootRifle(
    cameraPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    onHitBandit: (bandit: EnemyBandit, damage: number) => void
  ): boolean {
    soundEngine.playRifleShot();

    const bulletRay = new THREE.Raycaster(cameraPos, cameraDir, 0.5, 120);

    // Check hit against bandits
    let hitBandit: BanditEntity | null = null;
    let hitPoint = cameraPos.clone().addScaledVector(cameraDir, 80);

    for (const b of this.bandits) {
      if (b.data.state === 'dead') continue;
      const bPos = b.mesh.position;
      // Cylinder / bounding check
      const dToRay = bulletRay.ray.distanceToPoint(new THREE.Vector3(bPos.x, bPos.y + 1.0, bPos.z));
      if (dToRay < 0.9) {
        const dist = cameraPos.distanceTo(bPos);
        if (dist < 80) {
          hitBandit = b;
          hitPoint = new THREE.Vector3(bPos.x, bPos.y + 1.2, bPos.z);
          break;
        }
      }
    }

    // Spawn visible bullet tracer
    this.spawnTracer(cameraPos, hitPoint, false);

    if (hitBandit) {
      const damage = 55;
      hitBandit.data.health -= damage;
      soundEngine.playRicochet();

      if (hitBandit.data.health <= 0) {
        this.killBandit(hitBandit);
      } else {
        // Stagger bandit and alert
        hitBandit.data.state = 'aiming';
        hitBandit.mesh.rotation.y += 0.2;
      }

      onHitBandit(hitBandit.data, damage);
      return true;
    }

    return false;
  }

  // --- PLAYER WEAPON: THROW DYNAMITE ---
  public throwDynamite(cameraPos: THREE.Vector3, cameraDir: THREE.Vector3) {
    soundEngine.playFuseHiss();

    const group = new THREE.Group();
    group.position.copy(cameraPos).addScaledVector(cameraDir, 0.8);

    // Red dynamite stick model with brass band and burning wick
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 })
    );
    group.add(stick);

    // Burning wick spark light
    const wickLight = new THREE.PointLight(0xffaa00, 1.5, 4);
    wickLight.position.set(0, 0.22, 0);
    group.add(wickLight);

    this.combatGroup.add(group);

    const throwVel = cameraDir.clone().multiplyScalar(18);
    throwVel.y += 6; // Arcing lob

    this.dynamites.push({
      entity: {
        id: `dyn_${Date.now()}`,
        position: { x: group.position.x, y: group.position.y, z: group.position.z },
        velocity: { x: throwVel.x, y: throwVel.y, z: throwVel.z },
        fuseTimer: 2.4, // explodes after 2.4 seconds
      },
      mesh: group,
    });
  }

  // --- BULLET TRACER VISUAL EFFECT ---
  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, isEnemy: boolean) {
    const points = [start.clone(), end.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: isEnemy ? 0xff4422 : 0xffe066,
      linewidth: 2,
    });
    const line = new THREE.Line(geo, mat);
    this.combatGroup.add(line);

    this.tracers.push({
      tracer: {
        id: `tr_${Math.random()}`,
        start: { x: start.x, y: start.y, z: start.z },
        end: { x: end.x, y: end.y, z: end.z },
        progress: 0,
        isEnemy,
      },
      mesh: line,
    });
  }

  // Defeat a bandit
  private killBandit(b: BanditEntity) {
    b.data.state = 'dead';
    soundEngine.playDiscovery(); // Triumph cue

    // Knockback death tumble
    b.mesh.rotation.x = Math.PI / 2;
    b.mesh.position.y -= 0.6;
    b.muzzleFlash.intensity = 0;
  }

  // Update loop for bandits AI, bullet tracers, and dynamites
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    getTerrainElevation: (x: number, z: number) => number,
    onPlayerDamage: (dmg: number) => void,
    onDynamiteExplode: (pos: THREE.Vector3) => void
  ) {
    // 1. Update Bandits AI
    this.bandits.forEach((b) => {
      if (b.data.state === 'dead') return;

      const dist = b.mesh.position.distanceTo(playerPos);
      b.walkTimer += delta;

      if (dist < 42) {
        // Player in range: Alert & Aim weapon!
        b.data.state = 'aiming';

        // Face player
        const angleToPlayer = Math.atan2(
          playerPos.x - b.mesh.position.x,
          playerPos.z - b.mesh.position.z
        );
        b.mesh.rotation.y = angleToPlayer;

        // Count down shoot cooldown
        b.data.shootCooldown -= delta;
        if (b.data.shootCooldown <= 0) {
          // SHOOT AT PLAYER!
          b.data.shootCooldown = 3.2 + Math.random() * 2.0;
          soundEngine.playBanditShot();

          // Flash muzzle
          b.muzzleFlash.intensity = 3;
          setTimeout(() => {
            b.muzzleFlash.intensity = 0;
          }, 80);

          // Calculate bullet path
          const muzzlePos = new THREE.Vector3(
            b.mesh.position.x,
            b.mesh.position.y + 1.2,
            b.mesh.position.z
          );

          // Inaccuracy spread based on distance
          const spread = (dist / 35) * 1.4;
          const target = playerPos.clone();
          target.x += (Math.random() - 0.5) * spread;
          target.y += 0.9 + (Math.random() - 0.5) * spread;
          target.z += (Math.random() - 0.5) * spread;

          this.spawnTracer(muzzlePos, target, true);

          // If bullet was close enough to player, deal fair combat damage (8-14 dmg)
          if (target.distanceTo(playerPos) < 1.3) {
            const dmg = 8 + Math.floor(Math.random() * 6);
            soundEngine.playPlayerHurt();
            onPlayerDamage(dmg);
          } else {
            soundEngine.playRicochet();
          }
        }
      } else {
        // Patrol around base camp
        b.data.state = 'patrol';
        b.data.patrolAngle += delta * 0.4;
        const patrolR = 6;
        b.mesh.position.x = b.data.patrolCenter.x + Math.cos(b.data.patrolAngle) * patrolR;
        b.mesh.position.z = b.data.patrolCenter.z + Math.sin(b.data.patrolAngle) * patrolR;
        b.mesh.position.y = getTerrainElevation(b.mesh.position.x, b.mesh.position.z);
        b.mesh.rotation.y = b.data.patrolAngle + Math.PI / 2;

        // Leg walking cycle animation
        b.legs[0].rotation.x = Math.sin(b.walkTimer * 5) * 0.35;
        b.legs[1].rotation.x = -Math.sin(b.walkTimer * 5) * 0.35;
      }
    });

    // 2. Update Bullet Tracers (fade out quickly)
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.tracer.progress += delta * 7;
      if (t.tracer.progress >= 1) {
        this.combatGroup.remove(t.mesh);
        t.mesh.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // 3. Update Thrown Dynamites
    for (let i = this.dynamites.length - 1; i >= 0; i--) {
      const d = this.dynamites[i];
      d.entity.fuseTimer -= delta;

      // Physics integration
      d.entity.velocity.y -= 22 * delta; // Gravity
      d.mesh.position.x += d.entity.velocity.x * delta;
      d.mesh.position.y += d.entity.velocity.y * delta;
      d.mesh.position.z += d.entity.velocity.z * delta;

      d.mesh.rotation.x += delta * 8;
      d.mesh.rotation.z += delta * 5;

      // Ground bounce
      const groundY = getTerrainElevation(d.mesh.position.x, d.mesh.position.z) + 0.15;
      if (d.mesh.position.y <= groundY) {
        d.mesh.position.y = groundY;
        d.entity.velocity.y = -d.entity.velocity.y * 0.4;
        d.entity.velocity.x *= 0.7;
        d.entity.velocity.z *= 0.7;
      }

      // Detonate!
      if (d.entity.fuseTimer <= 0) {
        const blastPos = d.mesh.position.clone();
        this.combatGroup.remove(d.mesh);
        this.dynamites.splice(i, 1);

        // Blast damage to nearby bandits
        this.bandits.forEach((b) => {
          if (b.data.state === 'dead') return;
          const distToBlast = b.mesh.position.distanceTo(blastPos);
          if (distToBlast < 8) {
            b.data.health -= 120;
            this.killBandit(b);
          }
        });

        // Trigger voxel destruction & shockwave
        onDynamiteExplode(blastPos);
      }
    }
  }

  public getActiveBandits() {
    return this.bandits.map((b) => b.data);
  }

  public dispose() {
    this.scene.remove(this.combatGroup);
    this.combatGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
    this.bandits = [];
    this.tracers = [];
    this.dynamites = [];
  }
}
