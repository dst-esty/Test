import * as THREE from 'three';
import { DesertAnimal, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';

interface AnimalEntity {
  data: DesertAnimal;
  mesh: THREE.Group;
  ears?: THREE.Group;
  tail?: THREE.Mesh | THREE.Group;
  head?: THREE.Group | THREE.Mesh;
  pincers?: THREE.Group;
  legs?: THREE.Mesh[];
  tongue?: THREE.Mesh;
  animTimer: number;
  strikeCooldown: number;
  warningCooldown: number;
  health: number;
  maxHealth: number;
  isStriking?: boolean;
  strikeProgress?: number;
  strikeOrigin?: THREE.Vector3;
  strikeTarget?: THREE.Vector3;
}

export class WildlifeManager {
  private animals: AnimalEntity[] = [];
  private scene: THREE.Scene;
  private wildlifeGroup: THREE.Group = new THREE.Group();
  private rattleGlobalCooldown: number = 0;
  private spawnTimer: number = 0;
  private envenomTimer: number = 0;
  private envenomTicksRemaining: number = 0;
  private envenomSource: string = '';

  // Max active populations near player
  private readonly MAX_SNAKES = 5;
  private readonly MAX_SCORPIONS = 6;
  private readonly MAX_RABBITS = 6;

  constructor(scene: THREE.Scene, getTerrainElevation: (x: number, z: number) => number) {
    this.scene = scene;
    this.scene.add(this.wildlifeGroup);
    this.spawnInitialWildlife(getTerrainElevation);
  }

  private spawnInitialWildlife(getTerrainElevation: (x: number, z: number) => number) {
    // 1. Initial Jackrabbits
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 25 + Math.random() * 35;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const ry = getTerrainElevation(rx, rz);
      this.createRabbit(rx, ry, rz);
    }

    // 2. Initial Diamondback Rattlesnakes near crags and brush
    const snakeOffsets = [
      { dist: 18, angle: 0.4 },
      { dist: 28, angle: 1.8 },
      { dist: 35, angle: 3.2 },
      { dist: 22, angle: 4.6 },
    ];
    snakeOffsets.forEach((s) => {
      const sx = Math.cos(s.angle) * s.dist;
      const sz = Math.sin(s.angle) * s.dist;
      const sy = getTerrainElevation(sx, sz);
      this.createRattlesnake(sx, sy, sz);
    });

    // 3. Initial Sonoran Bark Scorpions hiding in rocky soil
    const scorpionOffsets = [
      { dist: 14, angle: 1.2 },
      { dist: 24, angle: 2.6 },
      { dist: 32, angle: 4.1 },
      { dist: 20, angle: 5.4 },
    ];
    scorpionOffsets.forEach((sc) => {
      const scx = Math.cos(sc.angle) * sc.dist;
      const scz = Math.sin(sc.angle) * sc.dist;
      const scy = getTerrainElevation(scx, scz);
      this.createScorpion(scx, scy, scz);
    });

    // 4. Desert Bighorn Sheep on distant crags
    const sheepLocs = [
      { x: 75, z: 12 },
      { x: 88, z: 22 },
      { x: -45, z: 110 },
    ];
    sheepLocs.forEach((loc) => {
      const ry = getTerrainElevation(loc.x, loc.z);
      this.createBighornSheep(loc.x, ry, loc.z);
    });

    // 5. Soaring Turkey Vultures
    for (let i = 0; i < 3; i++) {
      this.createVulture(i * ((Math.PI * 2) / 3), 70 + i * 12);
    }
  }

  // --- DYNAMIC PROXIMITY SPAWNER ---
  private checkDynamicSpawning(
    playerPos: THREE.Vector3,
    getTerrainElevation: (x: number, z: number) => number
  ) {
    // If player is deep underground in a subterranean shaft, don't spawn desert surface wildlife
    if (playerPos.y < -2.5) return;

    let snakeCount = 0;
    let scorpionCount = 0;
    let rabbitCount = 0;

    // Filter and count active nearby animals, despawning distant ones (> 75m)
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];
      if (a.data.type === 'vulture' || a.data.type === 'bighorn') {
        continue; // Permanent ambient landmarks
      }

      const dist = a.mesh.position.distanceTo(playerPos);
      if (dist > 75) {
        this.removeAnimalAtIndex(i);
        continue;
      }

      if (a.data.type === 'snake') snakeCount++;
      else if (a.data.type === 'scorpion') scorpionCount++;
      else if (a.data.type === 'rabbit') rabbitCount++;
    }

    // Spawn new rattlesnake near player if under target count
    if (snakeCount < this.MAX_SNAKES) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 26; // 18m - 44m from player
      const sx = playerPos.x + Math.cos(angle) * dist;
      const sz = playerPos.z + Math.sin(angle) * dist;
      const sy = getTerrainElevation(sx, sz);
      if (sy > 0.5) {
        this.createRattlesnake(sx, sy, sz);
      }
    }

    // Spawn new scorpion near rocks/ground if under target count
    if (scorpionCount < this.MAX_SCORPIONS) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 24; // 15m - 39m from player
      const scx = playerPos.x + Math.cos(angle) * dist;
      const scz = playerPos.z + Math.sin(angle) * dist;
      const scy = getTerrainElevation(scx, scz);
      if (scy > 0.5) {
        this.createScorpion(scx, scy, scz);
      }
    }

    // Spawn rabbit if sparse
    if (rabbitCount < this.MAX_RABBITS) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 25;
      const rx = playerPos.x + Math.cos(angle) * dist;
      const rz = playerPos.z + Math.sin(angle) * dist;
      const ry = getTerrainElevation(rx, rz);
      if (ry > 0.5) {
        this.createRabbit(rx, ry, rz);
      }
    }
  }

  // --- 1. WESTERN DIAMONDBACK RATTLESNAKE ---
  private createRattlesnake(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const scaleMat = new THREE.MeshStandardMaterial({
      color: 0x543b24,
      roughness: 0.72,
    });
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0x9b784a,
      roughness: 0.65,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      color: 0xd9c298,
      roughness: 0.8,
    });

    // S-coiled body segments
    const bodyRoot = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const radius = 0.075 + (i < 4 ? i * 0.012 : (8 - i) * 0.012);
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 7, 7),
        i % 2 === 0 ? scaleMat : diamondMat
      );
      const angle = i * 0.75;
      const r = 0.28 - i * 0.022;
      seg.position.set(Math.cos(angle) * r, radius * 0.85, Math.sin(angle) * r);
      seg.castShadow = true;
      bodyRoot.add(seg);
    }
    group.add(bodyRoot);

    // Articulated Head and Neck Group (allows rearing and striking animation)
    const headGroup = new THREE.Group();
    headGroup.position.set(0.28, 0.12, 0.18);

    // Pit-Viper Triangular Head
    const headGeo = new THREE.ConeGeometry(0.09, 0.2, 4);
    headGeo.rotateX(Math.PI / 2);
    const head = new THREE.Mesh(headGeo, scaleMat);
    head.castShadow = true;
    headGroup.add(head);

    // Pit organs / eyes
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      eye.position.set(side * 0.05, 0.03, 0.04);
      headGroup.add(eye);
    });

    // Forked tongue (flickers in and out)
    const tongueGeo = new THREE.BoxGeometry(0.015, 0.005, 0.1);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0x991111 });
    const tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, -0.01, 0.14);
    headGroup.add(tongue);

    group.add(headGroup);

    // Upright Segmented Rattle Tail
    const rattleGroup = new THREE.Group();
    rattleGroup.position.set(-0.24, 0.14, -0.16);
    rattleGroup.rotation.z = Math.PI / 4;

    for (let r = 0; r < 4; r++) {
      const rRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018 + r * 0.004, 0.022 + r * 0.004, 0.04, 6),
        r % 2 === 0 ? creamMat : diamondMat
      );
      rRing.position.y = r * 0.035;
      rRing.castShadow = true;
      rattleGroup.add(rRing);
    }
    group.add(rattleGroup);

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `snake_${Math.random().toString(36).substr(2, 9)}`,
        type: 'snake',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 0.9,
        stateTimer: 0,
        fleeing: false,
        health: 15,
        maxHealth: 15,
        isHostile: true,
      },
      mesh: group,
      head: headGroup,
      tail: rattleGroup,
      tongue: tongue,
      animTimer: Math.random() * 5,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 15,
      maxHealth: 15,
    });
  }

  // --- 2. SONORAN BARK SCORPION ---
  private createScorpion(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Translucent yellowish-amber chitin with subtle night fluorescence
    const chitinMat = new THREE.MeshStandardMaterial({
      color: 0xc89842,
      roughness: 0.55,
      metalness: 0.1,
    });
    const darkChitinMat = new THREE.MeshStandardMaterial({
      color: 0x8a6328,
      roughness: 0.65,
    });
    const stingerMat = new THREE.MeshStandardMaterial({
      color: 0x4a2a12,
      roughness: 0.4,
    });

    // 1. Cephalothorax (Head / Prosoma Shield)
    const carapaceGeo = new THREE.BoxGeometry(0.16, 0.06, 0.18);
    const carapace = new THREE.Mesh(carapaceGeo, chitinMat);
    carapace.position.y = 0.06;
    carapace.castShadow = true;
    group.add(carapace);

    // Median eye beads
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    eye.position.set(0, 0.09, 0.04);
    group.add(eye);

    // 2. Mesosoma (Segmented Flat Abdomen)
    const abdomenGeo = new THREE.BoxGeometry(0.14, 0.055, 0.24);
    const abdomen = new THREE.Mesh(abdomenGeo, darkChitinMat);
    abdomen.position.set(0, 0.065, -0.16);
    abdomen.castShadow = true;
    group.add(abdomen);

    // 3. Metasoma (5-Segment Curved Tail arching UP & OVER back)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.07, -0.26);

    let currentPos = new THREE.Vector3(0, 0, 0);
    const tailSegCount = 5;
    for (let t = 0; t < tailSegCount; t++) {
      const frac = t / (tailSegCount - 1);
      // Upward and forward arching trajectory
      const segRadius = 0.025 - frac * 0.005;
      const segMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(segRadius * 0.9, segRadius, 0.08, 6),
        chitinMat
      );
      // Curve upwards and forwards
      const angle = (t / tailSegCount) * Math.PI * 0.95;
      segMesh.position.set(0, Math.sin(angle) * 0.18, -Math.cos(angle) * 0.12);
      segMesh.rotation.x = -angle + 0.3;
      segMesh.castShadow = true;
      tailGroup.add(segMesh);
      currentPos = segMesh.position;
    }

    // Venom Vesicle (Bulbous Telson) & Sharp Stinger Needle (Aculeus)
    const telson = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 6, 6),
      chitinMat
    );
    telson.position.set(0, currentPos.y + 0.04, currentPos.z + 0.05);
    telson.castShadow = true;
    tailGroup.add(telson);

    const aculeusGeo = new THREE.ConeGeometry(0.012, 0.06, 5);
    aculeusGeo.rotateX(-Math.PI / 2);
    const aculeus = new THREE.Mesh(aculeusGeo, stingerMat);
    aculeus.position.set(0, telson.position.y + 0.015, telson.position.z + 0.04);
    tailGroup.add(aculeus);

    group.add(tailGroup);

    // 4. Articulated Chelae / Pedipalps (Front Pincers)
    const pincersGroup = new THREE.Group();
    pincersGroup.position.set(0, 0.06, 0.08);

    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.015, 0.14, 5),
        chitinMat
      );
      arm.position.set(side * 0.12, 0.02, 0.07);
      arm.rotation.z = side * 0.6;
      arm.rotation.y = side * 0.35;
      pincersGroup.add(arm);

      // Claws
      const claw = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.08, 4),
        darkChitinMat
      );
      claw.position.set(side * 0.18, 0.02, 0.15);
      claw.rotation.x = Math.PI / 2;
      claw.rotation.z = side * 0.4;
      claw.castShadow = true;
      pincersGroup.add(claw);
    });
    group.add(pincersGroup);

    // 5. 8 Skittering Walking Legs
    const legs: THREE.Mesh[] = [];
    const legGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4);
    [-1, 1].forEach((side) => {
      for (let l = 0; l < 4; l++) {
        const leg = new THREE.Mesh(legGeo, chitinMat);
        const lz = -0.06 + l * 0.05;
        leg.position.set(side * 0.11, 0.03, lz);
        leg.rotation.z = side * (Math.PI / 3.2);
        leg.rotation.y = (l - 1.5) * 0.2;
        group.add(leg);
        legs.push(leg);
      }
    });

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `scorpion_${Math.random().toString(36).substr(2, 9)}`,
        type: 'scorpion',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 1.1,
        stateTimer: 0,
        fleeing: false,
        health: 10,
        maxHealth: 10,
        isHostile: true,
      },
      mesh: group,
      tail: tailGroup,
      pincers: pincersGroup,
      legs: legs,
      animTimer: Math.random() * 5,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 10,
      maxHealth: 10,
    });
  }

  // --- 3. JACKRABBIT MODEL ---
  private createRabbit(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const furMat = new THREE.MeshStandardMaterial({ color: 0x9b7a5a, roughness: 0.9 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0d4c3, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), furMat);
    body.scale.set(0.9, 0.8, 1.3);
    body.position.y = 0.28;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), furMat);
    head.position.set(0, 0.45, 0.26);
    group.add(head);

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

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), bellyMat);
    tail.position.set(0, 0.35, -0.36);
    group.add(tail);

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `rabbit_${Math.random().toString(36).substr(2, 9)}`,
        type: 'rabbit',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 3.5,
        stateTimer: Math.random() * 3,
        fleeing: false,
        health: 5,
        maxHealth: 5,
      },
      mesh: group,
      ears: earsGroup,
      animTimer: Math.random() * 10,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 5,
      maxHealth: 5,
    });
  }

  // --- 4. BIGHORN SHEEP MODEL ---
  private createBighornSheep(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x82654c, roughness: 0.85 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2d, roughness: 0.5 });
    const rumpMat = new THREE.MeshStandardMaterial({ color: 0xdfd4be });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 1.1), coatMat);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    const rump = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 0.1), rumpMat);
    rump.position.set(0, 0.95, -0.55);
    group.add(rump);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.35), coatMat);
    neck.position.set(0, 1.35, 0.45);
    neck.rotation.x = -0.3;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.45), coatMat);
    head.position.set(0, 1.6, 0.65);
    group.add(head);

    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 6, 12, Math.PI * 1.4), hornMat);
      horn.position.set(side * 0.24, 1.65, 0.6);
      horn.rotation.set(0.3, side * 0.4, side * 0.8);
      group.add(horn);
    });

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
        id: `sheep_${Math.random().toString(36).substr(2, 9)}`,
        type: 'bighorn',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 1.2,
        stateTimer: Math.random() * 5,
        fleeing: false,
        health: 40,
        maxHealth: 40,
      },
      mesh: group,
      animTimer: Math.random() * 5,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 40,
      maxHealth: 40,
    });
  }

  // --- 5. SOARING TURKEY VULTURE MODEL ---
  private createVulture(initialAngle: number, flightRadius: number) {
    const group = new THREE.Group();
    group.position.set(0, 75, 0);

    const featherMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.6 });

    const wingGeo = new THREE.BoxGeometry(2.8, 0.04, 0.6);
    const wings = new THREE.Mesh(wingGeo, featherMat);
    wings.rotation.x = 0.05;
    group.add(wings);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.9), featherMat);
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), headMat);
    head.position.set(0, 0.05, 0.55);
    group.add(head);

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `vulture_${Math.random().toString(36).substr(2, 9)}`,
        type: 'vulture',
        position: { x: 0, y: 75, z: 0 },
        targetPos: { x: flightRadius, y: 75, z: 0 },
        rotation: initialAngle,
        speed: 0.25 + Math.random() * 0.1,
        stateTimer: initialAngle,
        fleeing: false,
        health: 20,
        maxHealth: 20,
      },
      mesh: group,
      animTimer: initialAngle,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 20,
      maxHealth: 20,
    });
  }

  // --- WEAPON HIT TEST (Player attacks wildlife with pickaxe, shovel, or rifle) ---
  public hitTestRay(
    ray: THREE.Raycaster,
    maxDistance: number = 3.5,
    damage: number = 25
  ): { hit: boolean; animal?: DesertAnimal; killed?: boolean; message?: string } {
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];
      if (a.data.type === 'vulture' || a.data.type === 'bighorn') continue;

      const intersects = ray.intersectObject(a.mesh, true);
      if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
        a.health -= damage;

        if (a.health <= 0) {
          soundEngine.playWildlifeDefeated();
          const type = a.data.type;
          this.removeAnimalAtIndex(i);

          let message = 'Struck wild animal!';
          if (type === 'snake') {
            message = 'Crushed Western Diamondback Rattlesnake! Preserved rattle trophy.';
          } else if (type === 'scorpion') {
            message = 'Neutralized Sonoran Bark Scorpion! Area clear of stinging threats.';
          } else if (type === 'rabbit') {
            message = 'Caught desert jackrabbit!';
          }

          return { hit: true, animal: a.data, killed: true, message };
        } else {
          soundEngine.playPickaxe();
          return { hit: true, animal: a.data, killed: false, message: 'Wounded desert creature!' };
        }
      }
    }
    return { hit: false };
  }

  private removeAnimalAtIndex(index: number) {
    if (index < 0 || index >= this.animals.length) return;
    const a = this.animals[index];
    this.wildlifeGroup.remove(a.mesh);
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
    this.animals.splice(index, 1);
  }

  // --- MAIN UPDATE LOOP ---
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    getTerrainElevation: (x: number, z: number) => number,
    onPlayerDamage?: (damage: number, type: 'snake' | 'scorpion', name: string) => void,
    onShowBanner?: (msg: string) => void
  ) {
    this.rattleGlobalCooldown = Math.max(0, this.rattleGlobalCooldown - delta);
    this.spawnTimer += delta;

    // Periodically check and spawn dynamic wildlife near player
    if (this.spawnTimer > 2.5) {
      this.spawnTimer = 0;
      this.checkDynamicSpawning(playerPos, getTerrainElevation);
    }

    // Handle active player envenomation ticks
    if (this.envenomTicksRemaining > 0) {
      this.envenomTimer += delta;
      if (this.envenomTimer >= 2.0) {
        this.envenomTimer = 0;
        this.envenomTicksRemaining--;
        if (onPlayerDamage) {
          onPlayerDamage(
            3,
            this.envenomSource === 'snake' ? 'snake' : 'scorpion',
            this.envenomSource === 'snake' ? 'Diamondback Venom Effect' : 'Scorpion Neurotoxin'
          );
        }
        if (this.envenomTicksRemaining === 0 && onShowBanner) {
          onShowBanner('Venom effects have metabolized and subsided.');
        }
      }
    }

    // Update each animal's AI, animations, and danger zones
    this.animals.forEach((a) => {
      const distToPlayer = a.mesh.position.distanceTo(playerPos);
      const verticalDiff = Math.abs(playerPos.y - a.mesh.position.y);
      const isPlayerAccessible = verticalDiff < 3.0;
      a.strikeCooldown = Math.max(0, a.strikeCooldown - delta);
      a.warningCooldown = Math.max(0, a.warningCooldown - delta);

      // --- 1. RATTLESNAKE AI & ATTACKS ---
      if (a.data.type === 'snake') {
        a.animTimer += delta;

        // Visual orientation: Face towards player when alerted (< 8m)
        if (distToPlayer < 8.0 && isPlayerAccessible) {
          const dx = playerPos.x - a.mesh.position.x;
          const dz = playerPos.z - a.mesh.position.z;
          const targetAngle = Math.atan2(dx, dz);
          a.mesh.rotation.y = THREE.MathUtils.lerp(a.mesh.rotation.y, targetAngle, delta * 3.5);

          // Tongue flicking animation
          if (a.tongue) {
            a.tongue.scale.z = 1.0 + Math.sin(a.animTimer * 16) * 0.8;
          }
        }

        // Warning Zone (< 6.5m): Vibrate tail rattle and sound warning!
        if (distToPlayer < 6.5 && isPlayerAccessible) {
          if (a.tail) {
            // Rapid rattle vibration
            a.tail.rotation.z = (Math.PI / 4) + Math.sin(Date.now() * 0.09) * 0.35;
          }

          if (a.head) {
            // Rear head back defensively
            a.head.position.y = 0.16 + Math.sin(a.animTimer * 4) * 0.02;
          }

          if (this.rattleGlobalCooldown <= 0 && a.warningCooldown <= 0) {
            soundEngine.playRattleWarning();
            this.rattleGlobalCooldown = 1.6;
            a.warningCooldown = 1.8;
          }
        }

        // Close Threat Zone (< 3.8m): Threat Hiss!
        if (distToPlayer < 3.8 && isPlayerAccessible && a.warningCooldown <= 0.4) {
          soundEngine.playSnakeHiss();
          a.warningCooldown = 2.4;
        }

        // STRIKE ZONE (< 2.0m): Venomous Strike Attack!
        if (distToPlayer < 2.0 && isPlayerAccessible && a.strikeCooldown <= 0) {
          a.strikeCooldown = 2.8;
          a.isStriking = true;
          a.strikeProgress = 0;

          // Sound effects & damage
          soundEngine.playSnakeBite();
          soundEngine.playPlayerHurt();

          const damageAmount = 22;
          if (onPlayerDamage) {
            onPlayerDamage(damageAmount, 'snake', 'Western Diamondback Rattlesnake');
          }

          // Trigger venom over time
          this.envenomTicksRemaining = 3;
          this.envenomTimer = 0;
          this.envenomSource = 'snake';

          if (onShowBanner) {
            onShowBanner('⚠️ BITTEN BY A DIAMONDBACK RATTLESNAKE! Venom courses through your bloodstream!');
          }
        }

        // Strike lunge spring animation
        if (a.isStriking && a.head) {
          a.strikeProgress = (a.strikeProgress || 0) + delta * 6;
          if (a.strikeProgress < 1.0) {
            // Lunge forward
            a.head.position.z = 0.18 + Math.sin(a.strikeProgress * Math.PI) * 0.32;
            a.head.position.y = 0.12 + Math.sin(a.strikeProgress * Math.PI) * 0.08;
          } else {
            a.isStriking = false;
            a.head.position.set(0.28, 0.12, 0.18);
          }
        }
      }

      // --- 2. SONORAN BARK SCORPION AI & ATTACKS ---
      else if (a.data.type === 'scorpion') {
        a.animTimer += delta;

        // Skittering leg movement
        if (a.legs) {
          a.legs.forEach((leg, idx) => {
            const phase = idx % 2 === 0 ? 1 : -1;
            leg.rotation.x = Math.sin(a.animTimer * 14 + idx) * 0.25 * phase;
          });
        }

        // Threat Zone (< 4.8m): Face player, flare pincers open, arch tail stinger high
        if (distToPlayer < 4.8 && isPlayerAccessible) {
          const dx = playerPos.x - a.mesh.position.x;
          const dz = playerPos.z - a.mesh.position.z;
          const targetAngle = Math.atan2(dx, dz);
          a.mesh.rotation.y = THREE.MathUtils.lerp(a.mesh.rotation.y, targetAngle, delta * 4.0);

          // Pincers threat flare
          if (a.pincers) {
            a.pincers.scale.x = 1.1 + Math.sin(a.animTimer * 6) * 0.15;
            a.pincers.position.y = 0.08 + Math.sin(a.animTimer * 5) * 0.02;
          }

          // Stinger tail pulsating threat curve
          if (a.tail) {
            a.tail.rotation.x = Math.sin(a.animTimer * 8) * 0.2;
          }

          // Dry chitin scuttle sound warning
          if (a.warningCooldown <= 0) {
            soundEngine.playScorpionScuttle();
            a.warningCooldown = 2.0;
          }
        } else {
          // Idle skitter: slow creep
          a.mesh.position.x += Math.cos(a.animTimer * 0.4) * 0.2 * delta;
          a.mesh.position.z += Math.sin(a.animTimer * 0.4) * 0.2 * delta;
          a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z);
        }

        // STING ZONE (< 1.6m): Venomous Tail Stinger Whip!
        if (distToPlayer < 1.6 && isPlayerAccessible && a.strikeCooldown <= 0) {
          a.strikeCooldown = 2.4;
          a.isStriking = true;
          a.strikeProgress = 0;

          // Sound effects & damage
          soundEngine.playScorpionSting();
          soundEngine.playPlayerHurt();

          const damageAmount = 16;
          if (onPlayerDamage) {
            onPlayerDamage(damageAmount, 'scorpion', 'Sonoran Bark Scorpion');
          }

          // Trigger neurotoxic venom sting ticks
          this.envenomTicksRemaining = 2;
          this.envenomTimer = 0;
          this.envenomSource = 'scorpion';

          if (onShowBanner) {
            onShowBanner('🦂 STUNG BY A SONORAN BARK SCORPION! Severe neurotoxic burning pain!');
          }
        }

        // Stinger whip animation
        if (a.isStriking && a.tail) {
          a.strikeProgress = (a.strikeProgress || 0) + delta * 8;
          if (a.strikeProgress < 1.0) {
            // Rapid forward whip of curved tail
            a.tail.rotation.x = -Math.sin(a.strikeProgress * Math.PI) * 0.8;
            a.tail.position.z = -0.26 + Math.sin(a.strikeProgress * Math.PI) * 0.25;
          } else {
            a.isStriking = false;
            a.tail.rotation.x = 0;
            a.tail.position.z = -0.26;
          }
        }
      }

      // --- 3. JACKRABBIT AI ---
      else if (a.data.type === 'rabbit') {
        a.animTimer += delta;
        if (distToPlayer < 9) {
          const dirX = a.mesh.position.x - playerPos.x;
          const dirZ = a.mesh.position.z - playerPos.z;
          const len = Math.hypot(dirX, dirZ) || 1;
          a.mesh.position.x += (dirX / len) * 8 * delta;
          a.mesh.position.z += (dirZ / len) * 8 * delta;
          a.mesh.rotation.y = Math.atan2(dirX, dirZ);
          a.mesh.position.y =
            getTerrainElevation(a.mesh.position.x, a.mesh.position.z) +
            Math.abs(Math.sin(a.animTimer * 12)) * 0.35;
        } else {
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
      }

      // --- 4. BIGHORN SHEEP AI ---
      else if (a.data.type === 'bighorn') {
        a.animTimer += delta;
        a.mesh.rotation.y += Math.sin(a.animTimer * 0.5) * 0.005;
      }

      // --- 5. SOARING TURKEY VULTURE AI ---
      else if (a.data.type === 'vulture') {
        a.animTimer += a.data.speed * delta;
        const radius = a.data.targetPos.x;
        a.mesh.position.x = Math.cos(a.animTimer) * radius + 50;
        a.mesh.position.z = Math.sin(a.animTimer) * radius + 10;
        a.mesh.position.y = 80 + Math.sin(a.animTimer * 0.5) * 6;
        a.mesh.rotation.y = -a.animTimer - Math.PI / 2;
        a.mesh.rotation.z = -0.15;
      }
    });
  }

  public getWildlifeEntities(): DesertAnimal[] {
    return this.animals.map((a) => a.data);
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
