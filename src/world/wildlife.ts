import * as THREE from 'three';
import { DesertAnimal, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';

interface AnimalEntity {
  data: DesertAnimal;
  mesh: THREE.Group;
  ears?: THREE.Group;
  tail?: THREE.Mesh;
  animTimer: number;
}

export class WildlifeManager {
  private animals: AnimalEntity[] = [];
  private scene: THREE.Scene;
  private wildlifeGroup: THREE.Group = new THREE.Group();
  private rattleCooldown: number = 0;

  constructor(scene: THREE.Scene, getTerrainElevation: (x: number, z: number) => number) {
    this.scene = scene;
    this.scene.add(this.wildlifeGroup);
    this.spawnWildlife(getTerrainElevation);
  }

  private spawnWildlife(getTerrainElevation: (x: number, z: number) => number) {
    // 1. Jackrabbits (10 rabbits scattered in bushes)
    for (let i = 0; i < 10; i++) {
      const rx = (Math.random() - 0.5) * 220;
      const rz = (Math.random() - 0.5) * 220;
      const ry = getTerrainElevation(rx, rz);
      this.createRabbit(rx, ry, rz);
    }

    // 2. Diamondback Rattlesnakes (5 snakes near rocky crags)
    const snakeLocs = [
      { x: -35, z: 85 },
      { x: 25, z: -85 },
      { x: 95, z: 25 },
      { x: 140, z: 95 },
      { x: -65, z: -15 },
    ];
    snakeLocs.forEach((loc) => {
      const ry = getTerrainElevation(loc.x, loc.z);
      this.createRattlesnake(loc.x, ry, loc.z);
    });

    // 3. Desert Bighorn Sheep (4 sheep on high peaks)
    const sheepLocs = [
      { x: 75, z: 12 }, // near Weaver's needle ledge
      { x: 88, z: 22 },
      { x: 125, z: -35 }, // Eye ridge bluff
      { x: -45, z: 110 },
    ];
    sheepLocs.forEach((loc) => {
      const ry = getTerrainElevation(loc.x, loc.z);
      this.createBighornSheep(loc.x, ry, loc.z);
    });

    // 4. Soaring Vultures (3 circling high in the sky)
    for (let i = 0; i < 4; i++) {
      this.createVulture(i * (Math.PI / 2), 65 + i * 15);
    }
  }

  // --- JACKRABBIT MODEL ---
  private createRabbit(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const furMat = new THREE.MeshStandardMaterial({ color: 0x9b7a5a, roughness: 0.9 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0d4c3, roughness: 0.9 });

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), furMat);
    body.scale.set(0.9, 0.8, 1.3);
    body.position.y = 0.28;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), furMat);
    head.position.set(0, 0.45, 0.26);
    group.add(head);

    // Long Jackrabbit Ears (Iconic Sonoran Desert feature)
    const earsGroup = new THREE.Group();
    earsGroup.position.set(0, 0.55, 0.24);

    const earGeo = new THREE.BoxGeometry(0.06, 0.35, 0.02);
    const leftEar = new THREE.Mesh(earGeo, bellyMat);
    leftEar.position.set(-0.08, 0.15, 0);
    leftEar.rotation.z = 0.2;
    const rightEar = new THREE.Mesh(earGeo, bellyMat);
    rightEar.position.set(0.08, 0.15, 0);
    rightEar.rotation.z = -0.2;

    earsGroup.add(leftEar);
    earsGroup.add(rightEar);
    group.add(earsGroup);

    // Tail
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), bellyMat);
    tail.position.set(0, 0.35, -0.36);
    group.add(tail);

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `rabbit_${Math.random()}`,
        type: 'rabbit',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 3.5,
        stateTimer: Math.random() * 3,
        fleeing: false,
      },
      mesh: group,
      ears: earsGroup,
      animTimer: Math.random() * 10,
    });
  }

  // --- RATTLESNAKE MODEL ---
  private createRattlesnake(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const scaleMat = new THREE.MeshStandardMaterial({
      color: 0x6e5239,
      roughness: 0.7,
    });
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0x9b784a,
      roughness: 0.6,
    });

    // S-coiled body segments
    for (let i = 0; i < 7; i++) {
      const radius = 0.07 + (i < 4 ? i * 0.015 : (7 - i) * 0.015);
      const seg = new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 6), i % 2 === 0 ? scaleMat : diamondMat);
      const angle = i * 0.8;
      const r = 0.25 - i * 0.02;
      seg.position.set(Math.cos(angle) * r, radius * 0.8, Math.sin(angle) * r);
      group.add(seg);
    }

    // Triangular Viper Head
    const headGeo = new THREE.ConeGeometry(0.09, 0.18, 4);
    headGeo.rotateX(Math.PI / 2);
    const head = new THREE.Mesh(headGeo, scaleMat);
    head.position.set(0.28, 0.12, 0.15);
    head.rotation.y = 0.5;
    group.add(head);

    // Segmented Rattle Tail
    const rattleGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.12, 5);
    const rattleMat = new THREE.MeshStandardMaterial({ color: 0xc4ab79 });
    const rattle = new THREE.Mesh(rattleGeo, rattleMat);
    rattle.position.set(-0.2, 0.12, -0.15);
    rattle.rotation.z = Math.PI / 4;
    group.add(rattle);

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `snake_${Math.random()}`,
        type: 'snake',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 0.8,
        stateTimer: 0,
        fleeing: false,
      },
      mesh: group,
      tail: rattle,
      animTimer: 0,
    });
  }

  // --- BIGHORN SHEEP MODEL ---
  private createBighornSheep(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x82654c, roughness: 0.85 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2d, roughness: 0.5 });
    const rumpMat = new THREE.MeshStandardMaterial({ color: 0xdfd4be });

    // Muscular body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 1.1), coatMat);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    // White rump patch
    const rump = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 0.1), rumpMat);
    rump.position.set(0, 0.95, -0.55);
    group.add(rump);

    // Head and neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.35), coatMat);
    neck.position.set(0, 1.35, 0.45);
    neck.rotation.x = -0.3;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.45), coatMat);
    head.position.set(0, 1.6, 0.65);
    group.add(head);

    // Massive Curved Ram Horns
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 6, 12, Math.PI * 1.4), hornMat);
      horn.position.set(side * 0.24, 1.65, 0.6);
      horn.rotation.set(0.3, side * 0.4, side * 0.8);
      group.add(horn);
    });

    // 4 Strong Sturdy Legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.7, 0.14);
    [
      { lx: -0.22, lz: 0.35 },
      { lx: 0.22, lz: 0.35 },
      { lx: -0.22, lz: -0.35 },
      { lx: 0.22, lz: -0.35 },
    ].forEach((l) => {
      const leg = new THREE.Mesh(legGeo, coatMat);
      leg.position.set(l.lx, 0.35, l.lz);
      leg.castShadow = true;
      group.add(leg);
    });

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `sheep_${Math.random()}`,
        type: 'bighorn',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 1.2,
        stateTimer: Math.random() * 5,
        fleeing: false,
      },
      mesh: group,
      animTimer: Math.random() * 5,
    });
  }

  // --- SOARING TURKEY VULTURE MODEL ---
  private createVulture(initialAngle: number, flightRadius: number) {
    const group = new THREE.Group();
    group.position.set(0, 75, 0);

    const featherMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.6 }); // bald red head

    // Broad Soaring Wingspan (V-dihedral angle)
    const wingGeo = new THREE.BoxGeometry(2.8, 0.04, 0.6);
    const wings = new THREE.Mesh(wingGeo, featherMat);
    wings.rotation.x = 0.05;
    group.add(wings);

    // Fuselage / body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.9), featherMat);
    group.add(body);

    // Red Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), headMat);
    head.position.set(0, 0.05, 0.55);
    group.add(head);

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `vulture_${Math.random()}`,
        type: 'vulture',
        position: { x: 0, y: 75, z: 0 },
        targetPos: { x: flightRadius, y: 75, z: 0 },
        rotation: initialAngle,
        speed: 0.25 + Math.random() * 0.1,
        stateTimer: initialAngle,
        fleeing: false,
      },
      mesh: group,
      animTimer: initialAngle,
    });
  }

  // Update loops for wildlife behaviors (hopping rabbits, rattling snakes, soaring vultures)
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    getTerrainElevation: (x: number, z: number) => number
  ) {
    this.rattleCooldown = Math.max(0, this.rattleCooldown - delta);

    this.animals.forEach((a) => {
      const distToPlayer = a.mesh.position.distanceTo(playerPos);

      if (a.data.type === 'rabbit') {
        // Jackrabbit: Flee if player is close, else hop peacefully
        a.animTimer += delta;
        if (distToPlayer < 9) {
          // Flee away from player
          const dirX = a.mesh.position.x - playerPos.x;
          const dirZ = a.mesh.position.z - playerPos.z;
          const len = Math.hypot(dirX, dirZ) || 1;
          a.mesh.position.x += (dirX / len) * 8 * delta;
          a.mesh.position.z += (dirZ / len) * 8 * delta;
          a.mesh.rotation.y = Math.atan2(dirX, dirZ);
          // Hopping bounce
          a.mesh.position.y =
            getTerrainElevation(a.mesh.position.x, a.mesh.position.z) +
            Math.abs(Math.sin(a.animTimer * 12)) * 0.35;
        } else {
          // Gentle idle ear twitch and occasional hop
          if (a.ears) {
            a.ears.rotation.y = Math.sin(a.animTimer * 3) * 0.25;
          }
          if (Math.sin(a.animTimer * 1.5) > 0.8) {
            a.mesh.position.y =
              getTerrainElevation(a.mesh.position.x, a.mesh.position.z) + 0.1;
          } else {
            a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z);
          }
        }
      } else if (a.data.type === 'snake') {
        // Rattlesnake: Rattle alert if player approaches!
        if (distToPlayer < 6.5) {
          if (a.tail) {
            a.tail.rotation.z = Math.PI / 4 + Math.sin(Date.now() * 0.05) * 0.3;
          }
          if (this.rattleCooldown <= 0) {
            soundEngine.playRattleWarning();
            this.rattleCooldown = 2.2;
          }
        }
      } else if (a.data.type === 'bighorn') {
        // Bighorn sheep standing proud on ridge, looking around
        a.animTimer += delta;
        a.mesh.rotation.y += Math.sin(a.animTimer * 0.5) * 0.005;
      } else if (a.data.type === 'vulture') {
        // Soaring in a thermal spiral
        a.animTimer += a.data.speed * delta;
        const radius = a.data.targetPos.x;
        a.mesh.position.x = Math.cos(a.animTimer) * radius + 50;
        a.mesh.position.z = Math.sin(a.animTimer) * radius + 10;
        a.mesh.position.y = 80 + Math.sin(a.animTimer * 0.5) * 6;
        a.mesh.rotation.y = -a.animTimer - Math.PI / 2;
        // Wing banking roll
        a.mesh.rotation.z = -0.15;
      }
    });
  }

  public dispose() {
    this.scene.remove(this.wildlifeGroup);
    this.animals.forEach((a) => {
      a.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    });
    this.animals = [];
  }
}
