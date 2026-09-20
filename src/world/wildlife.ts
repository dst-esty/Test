import * as THREE from 'three';
import { DesertAnimal, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';

export interface AnimalHarvestResult {
  hit: boolean;
  animal?: DesertAnimal;
  killed?: boolean;
  message?: string;
  carcassCreated?: boolean;
  carcassId?: string;
  harvest?: {
    foodType: 'rabbit_meat' | 'venison' | 'bighorn_mutton';
    quantity: number;
    name: string;
    healthRestored: number;
  };
}

export interface AnimalCarcass {
  id: string;
  type: 'rabbit' | 'mule_deer' | 'whitetail_deer' | 'bighorn';
  animalName: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  beaconMesh?: THREE.Group;
  harvest: {
    foodType: 'rabbit_meat' | 'venison' | 'bighorn_mutton';
    quantity: number;
    name: string;
    healthRestored: number;
  };
  promptText: string;
  createdAt: number;
}

interface AnimalEntity {
  data: DesertAnimal;
  mesh: THREE.Group;
  ears?: THREE.Group;
  tail?: THREE.Mesh | THREE.Group;
  head?: THREE.Group | THREE.Mesh;
  neck?: THREE.Mesh | THREE.Group;
  antlers?: THREE.Group;
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
  private carcasses: AnimalCarcass[] = [];
  private scene: THREE.Scene;
  private wildlifeGroup: THREE.Group = new THREE.Group();
  private rattleGlobalCooldown: number = 0;
  private spawnTimer: number = 0;
  private envenomTimer: number = 0;
  private envenomTicksRemaining: number = 0;
  private envenomSource: string = '';

  // Max active populations near player
  private readonly MAX_SNAKES = 4;
  private readonly MAX_SCORPIONS = 4;
  private readonly MAX_RABBITS = 6;
  private readonly MAX_MULE_DEER = 4;
  private readonly MAX_WHITETAIL_DEER = 4;
  private readonly MAX_BIGHORN_SHEEP = 4;

  constructor(scene: THREE.Scene, getTerrainElevation: (x: number, z: number) => number) {
    this.scene = scene;
    this.scene.add(this.wildlifeGroup);
    this.spawnInitialWildlife(getTerrainElevation);
  }

  private spawnInitialWildlife(getTerrainElevation: (x: number, z: number) => number) {
    // 1. Initial Jackrabbits
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 22 + Math.random() * 32;
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

    // 4. Sonoran Desert Mule Deer in desert foothills and washes
    const muleDeerLocs = [
      { x: 38, z: -35 },
      { x: -55, z: 40 },
      { x: 62, z: 58 },
      { x: -32, z: -68 },
    ];
    muleDeerLocs.forEach((loc) => {
      const dy = getTerrainElevation(loc.x, loc.z);
      this.createMuleDeer(loc.x, dy, loc.z);
    });

    // 5. Arizona Coues Whitetail Deer in brushy draws and mountain canyons
    const whitetailLocs = [
      { x: -48, z: -25 },
      { x: 45, z: 75 },
      { x: -70, z: 80 },
      { x: 80, z: -40 },
    ];
    whitetailLocs.forEach((loc) => {
      const wy = getTerrainElevation(loc.x, loc.z);
      this.createWhitetailDeer(loc.x, wy, loc.z);
    });

    // 6. Desert Bighorn Sheep on crags and ridges
    const sheepLocs = [
      { x: 75, z: 12 },
      { x: 88, z: 22 },
      { x: -45, z: 110 },
      { x: -85, z: -55 },
    ];
    sheepLocs.forEach((loc) => {
      const ry = getTerrainElevation(loc.x, loc.z);
      this.createBighornSheep(loc.x, ry, loc.z);
    });

    // 7. Soaring Turkey Vultures
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
    let muleDeerCount = 0;
    let whitetailCount = 0;
    let bighornCount = 0;

    // Filter and count active nearby animals, despawning distant ones (> 90m)
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];
      if (a.data.type === 'vulture') {
        continue; // Permanent ambient soaring birds
      }

      const dist = a.mesh.position.distanceTo(playerPos);
      if (dist > 95) {
        this.removeAnimalAtIndex(i);
        continue;
      }

      if (a.data.type === 'snake') snakeCount++;
      else if (a.data.type === 'scorpion') scorpionCount++;
      else if (a.data.type === 'rabbit') rabbitCount++;
      else if (a.data.type === 'mule_deer') muleDeerCount++;
      else if (a.data.type === 'whitetail_deer') whitetailCount++;
      else if (a.data.type === 'bighorn') bighornCount++;
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
      const dist = 22 + Math.random() * 28;
      const rx = playerPos.x + Math.cos(angle) * dist;
      const rz = playerPos.z + Math.sin(angle) * dist;
      const ry = getTerrainElevation(rx, rz);
      if (ry > 0.5) {
        this.createRabbit(rx, ry, rz);
      }
    }

    // Spawn Sonoran Mule Deer in open flats/washes
    if (muleDeerCount < this.MAX_MULE_DEER) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 32 + Math.random() * 38;
      const mx = playerPos.x + Math.cos(angle) * dist;
      const mz = playerPos.z + Math.sin(angle) * dist;
      const my = getTerrainElevation(mx, mz);
      if (my > 0.5) {
        this.createMuleDeer(mx, my, mz);
      }
    }

    // Spawn Arizona Coues Whitetail Deer in brushy canyon bottoms
    if (whitetailCount < this.MAX_WHITETAIL_DEER) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.random() * 35;
      const wx = playerPos.x + Math.cos(angle) * dist;
      const wz = playerPos.z + Math.sin(angle) * dist;
      const wy = getTerrainElevation(wx, wz);
      if (wy > 0.5) {
        this.createWhitetailDeer(wx, wy, wz);
      }
    }

    // Spawn Desert Bighorn Sheep on crags
    if (bighornCount < this.MAX_BIGHORN_SHEEP) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 45 + Math.random() * 40;
      const bx = playerPos.x + Math.cos(angle) * dist;
      const bz = playerPos.z + Math.sin(angle) * dist;
      const by = getTerrainElevation(bx, bz);
      if (by > 1.5) {
        this.createBighornSheep(bx, by, bz);
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

  // --- 4. SONORAN DESERT MULE DEER ---
  private createMuleDeer(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Warm gray-brown desert pelt
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x7a6552, roughness: 0.85 });
    const throatMat = new THREE.MeshStandardMaterial({ color: 0xd9cebe, roughness: 0.9 });
    const rumpMat = new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x221c16, roughness: 0.7 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xc8baa2, roughness: 0.55 });

    // Torso (sturdy buck body)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 1.25), coatMat);
    body.position.y = 0.98;
    body.castShadow = true;
    group.add(body);

    // Pale chest & underbelly
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.5), throatMat);
    chest.position.set(0, 0.92, 0.32);
    group.add(chest);

    // Large distinctive White Rump Patch
    const rump = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.55, 0.12), rumpMat);
    rump.position.set(0, 0.98, -0.63);
    group.add(rump);

    // Mule Deer Tail: Thin pale cream with a stark black tip
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.05, -0.65);
    const tailBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.06), rumpMat);
    tailBase.position.y = -0.09;
    tailGroup.add(tailBase);
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.07), darkMat);
    tailTip.position.y = -0.22;
    tailGroup.add(tailTip);
    group.add(tailGroup);

    // Graceful Upright Neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.32), coatMat);
    neck.position.set(0, 1.42, 0.48);
    neck.rotation.x = -0.32;
    neck.castShadow = true;
    group.add(neck);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.72, 0.68);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.38), coatMat);
    headGroup.add(skull);

    // Tapered Muzzle with black nose
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.26), throatMat);
    muzzle.position.set(0, -0.05, 0.26);
    headGroup.add(muzzle);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.08), darkMat);
    nose.position.set(0, -0.02, 0.4);
    headGroup.add(nose);

    // Dark alert eyes
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      eye.position.set(side * 0.14, 0.04, 0.06);
      headGroup.add(eye);
    });

    // FAMOUS MULE DEER EARS (Oversized, alert, angled backward)
    const earsGroup = new THREE.Group();
    [-1, 1].forEach((side) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.15, 0.16, -0.06);
      earGroup.rotation.set(-0.25, side * 0.35, side * 0.45);

      const earBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.03), coatMat);
      earBack.position.y = 0.16;
      earGroup.add(earBack);

      const earInside = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.015), throatMat);
      earInside.position.set(0, 0.16, 0.015);
      earGroup.add(earInside);

      earsGroup.add(earGroup);
    });
    headGroup.add(earsGroup);

    // BIFURCATED / FORKED ANTLERS (Diagnostic Mule Deer branching rack)
    const antlersGroup = new THREE.Group();
    [-1, 1].forEach((side) => {
      // Main beam curving up and out
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.38, 5), antlerMat);
      beam.position.set(side * 0.14, 0.28, -0.02);
      beam.rotation.set(0.2, side * 0.25, side * 0.5);
      antlersGroup.add(beam);

      // Forward fork
      const fork1 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.24, 4), antlerMat);
      fork1.position.set(side * 0.25, 0.46, 0.05);
      fork1.rotation.set(0.4, side * 0.1, side * 0.2);
      antlersGroup.add(fork1);

      // Rear fork
      const fork2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.22, 4), antlerMat);
      fork2.position.set(side * 0.28, 0.48, -0.12);
      fork2.rotation.set(-0.3, side * 0.15, side * 0.35);
      antlersGroup.add(fork2);
    });
    headGroup.add(antlersGroup);
    group.add(headGroup);

    // 4 Slender Legs with black hooves
    const legGeo = new THREE.BoxGeometry(0.11, 0.72, 0.11);
    const hoofGeo = new THREE.BoxGeometry(0.12, 0.08, 0.13);
    [
      { lx: -0.19, lz: 0.42 },
      { lx: 0.19, lz: 0.42 },
      { lx: -0.19, lz: -0.44 },
      { lx: 0.19, lz: -0.44 },
    ].forEach((l) => {
      const leg = new THREE.Mesh(legGeo, coatMat);
      leg.position.set(l.lx, 0.38, l.lz);
      leg.castShadow = true;
      group.add(leg);

      const hoof = new THREE.Mesh(hoofGeo, darkMat);
      hoof.position.set(l.lx, 0.04, l.lz);
      group.add(hoof);
    });

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `mule_deer_${Math.random().toString(36).substr(2, 9)}`,
        type: 'mule_deer',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 1.6,
        stateTimer: Math.random() * 5,
        fleeing: false,
        health: 35,
        maxHealth: 35,
      },
      mesh: group,
      head: headGroup,
      ears: earsGroup,
      tail: tailGroup,
      animTimer: Math.random() * 10,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 35,
      maxHealth: 35,
    });
  }

  // --- 5. ARIZONA COUES WHITETAIL DEER ("Gray Ghost" of the Superstitions) ---
  private createWhitetailDeer(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Ashy grayish-tan desert coat (smaller, refined Coues whitetail build)
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x8c7865, roughness: 0.85 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 0.75 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.7 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd4c7b0, roughness: 0.5 });

    // Sleeker, agile body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 1.1), coatMat);
    body.position.y = 0.92;
    body.castShadow = true;
    group.add(body);

    // Pure white underbelly and throat patch
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.55), whiteMat);
    belly.position.set(0, 0.85, 0.15);
    group.add(belly);

    // ICONIC WHITETAIL "FLAG" TAIL (Raised vertically when alert or fleeing!)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.05, -0.55);

    // Broad bushy tail: brown top, brilliant snow-white underside
    const tailTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.05), coatMat);
    tailTop.position.set(0, -0.12, 0.02);
    tailGroup.add(tailTop);

    const tailUnder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.04), whiteMat);
    tailUnder.position.set(0, -0.12, -0.02);
    tailGroup.add(tailUnder);
    group.add(tailGroup);

    // Slender, alert neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 0.26), coatMat);
    neck.position.set(0, 1.34, 0.42);
    neck.rotation.x = -0.36;
    neck.castShadow = true;
    group.add(neck);

    // Refined head with white eye-rings and white muzzle band
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 0.58);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.32), coatMat);
    headGroup.add(skull);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), coatMat);
    muzzle.position.set(0, -0.04, 0.22);
    headGroup.add(muzzle);

    const whiteChin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.14), whiteMat);
    whiteChin.position.set(0, -0.1, 0.24);
    headGroup.add(whiteChin);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.06), darkMat);
    nose.position.set(0, -0.02, 0.34);
    headGroup.add(nose);

    // Dark liquid eyes with white eye-rings
    [-1, 1].forEach((side) => {
      const eyeRing = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.07), whiteMat);
      eyeRing.position.set(side * 0.115, 0.04, 0.04);
      headGroup.add(eyeRing);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
      );
      eye.position.set(side * 0.12, 0.04, 0.04);
      headGroup.add(eye);
    });

    // Alert whitetail ears
    const earsGroup = new THREE.Group();
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.03), coatMat);
      ear.position.set(side * 0.12, 0.15, -0.04);
      ear.rotation.set(-0.15, side * 0.2, side * 0.35);
      earsGroup.add(ear);
    });
    headGroup.add(earsGroup);

    // CLASSIC WHITETAIL ANTLERS (Forward-curving main beams with vertical tines)
    const antlersGroup = new THREE.Group();
    [-1, 1].forEach((side) => {
      // Main forward-sweeping beam
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.36, 5), antlerMat);
      beam.position.set(side * 0.12, 0.22, 0.06);
      beam.rotation.set(0.55, side * 0.3, side * 0.35);
      antlersGroup.add(beam);

      // Vertical tines pointing straight up (Coues deer rack)
      const tine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.18, 4), antlerMat);
      tine1.position.set(side * 0.18, 0.36, 0.08);
      tine1.rotation.set(0.1, 0, side * 0.1);
      antlersGroup.add(tine1);

      const tine2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.16, 4), antlerMat);
      tine2.position.set(side * 0.22, 0.42, 0.18);
      tine2.rotation.set(0.15, 0, side * 0.15);
      antlersGroup.add(tine2);
    });
    headGroup.add(antlersGroup);
    group.add(headGroup);

    // 4 Nimble Desert Legs
    const legGeo = new THREE.BoxGeometry(0.09, 0.68, 0.09);
    const hoofGeo = new THREE.BoxGeometry(0.1, 0.07, 0.11);
    [
      { lx: -0.16, lz: 0.36 },
      { lx: 0.16, lz: 0.36 },
      { lx: -0.16, lz: -0.38 },
      { lx: 0.16, lz: -0.38 },
    ].forEach((l) => {
      const leg = new THREE.Mesh(legGeo, coatMat);
      leg.position.set(l.lx, 0.35, l.lz);
      leg.castShadow = true;
      group.add(leg);

      const hoof = new THREE.Mesh(hoofGeo, darkMat);
      hoof.position.set(l.lx, 0.035, l.lz);
      group.add(hoof);
    });

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `whitetail_${Math.random().toString(36).substr(2, 9)}`,
        type: 'whitetail_deer',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 1.8,
        stateTimer: Math.random() * 5,
        fleeing: false,
        health: 30,
        maxHealth: 30,
      },
      mesh: group,
      head: headGroup,
      ears: earsGroup,
      tail: tailGroup,
      animTimer: Math.random() * 10,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 30,
      maxHealth: 30,
    });
  }

  // --- 6. DESERT BIGHORN SHEEP MODEL ---
  private createBighornSheep(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x82654c, roughness: 0.85 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2d, roughness: 0.5 });
    const rumpMat = new THREE.MeshStandardMaterial({ color: 0xdfd4be });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x241d18 });

    // Muscular mountain body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 1.15), coatMat);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    const rump = new THREE.Mesh(new THREE.BoxGeometry(0.69, 0.52, 0.12), rumpMat);
    rump.position.set(0, 0.95, -0.58);
    group.add(rump);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.58, 0.38), coatMat);
    neck.position.set(0, 1.35, 0.45);
    neck.rotation.x = -0.3;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.46), coatMat);
    head.position.set(0, 1.6, 0.65);
    group.add(head);

    // White muzzle
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.2), rumpMat);
    muzzle.position.set(0, 1.52, 0.85);
    group.add(muzzle);

    // Massive Coiled Ram Horns
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.085, 8, 14, Math.PI * 1.45), hornMat);
      horn.position.set(side * 0.26, 1.68, 0.62);
      horn.rotation.set(0.3, side * 0.38, side * 0.85);
      group.add(horn);
    });

    const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    [
      { lx: -0.23, lz: 0.35 },
      { lx: 0.23, lz: 0.35 },
      { lx: -0.23, lz: -0.35 },
      { lx: 0.23, lz: -0.35 },
    ].forEach((l) => {
      const leg = new THREE.Mesh(legGeo, coatMat);
      leg.position.set(l.lx, 0.35, l.lz);
      leg.castShadow = true;
      group.add(leg);

      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), darkMat);
      hoof.position.set(l.lx, 0.04, l.lz);
      group.add(hoof);
    });

    this.wildlifeGroup.add(group);
    this.animals.push({
      data: {
        id: `sheep_${Math.random().toString(36).substr(2, 9)}`,
        type: 'bighorn',
        position: { x, y, z },
        targetPos: { x, y, z },
        rotation: Math.random() * Math.PI * 2,
        speed: 1.4,
        stateTimer: Math.random() * 5,
        fleeing: false,
        health: 45,
        maxHealth: 45,
      },
      mesh: group,
      animTimer: Math.random() * 5,
      strikeCooldown: 0,
      warningCooldown: 0,
      health: 45,
      maxHealth: 45,
    });
  }

  // --- 7. SOARING TURKEY VULTURE MODEL ---
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

  // --- WEAPON HIT TEST (Hunt wildlife with rifle, pickaxe, axe, or shovel) ---
  public hitTestRay(
    ray: THREE.Raycaster,
    maxDistance: number = 3.5,
    damage: number = 25
  ): AnimalHarvestResult {
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];
      // Skip soaring vultures high in the stratosphere
      if (a.data.type === 'vulture') continue;

      const intersects = ray.intersectObject(a.mesh, true);
      if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
        a.health -= damage;
        // Make the animal immediately start fleeing from pain/noise
        a.data.fleeing = true;
        a.data.stateTimer = 10;

        if (a.health <= 0) {
          const type = a.data.type;

          if (type === 'snake') {
            soundEngine.playWildlifeDefeated();
            this.removeAnimalAtIndex(i);
            return {
              hit: true,
              animal: a.data,
              killed: true,
              message: 'Crushed Western Diamondback Rattlesnake! Area safe from venom strikes.',
            };
          } else if (type === 'scorpion') {
            soundEngine.playWildlifeDefeated();
            this.removeAnimalAtIndex(i);
            return {
              hit: true,
              animal: a.data,
              killed: true,
              message: 'Neutralized Sonoran Bark Scorpion! Area clear of stinging threats.',
            };
          }

          // Huntable desert game (rabbit, mule deer, whitetail deer, bighorn sheep)
          soundEngine.playWildlifeDefeated();
          // Remove from active moving animal simulation (mesh stays in world as carcass)
          this.animals.splice(i, 1);
          const carcass = this.createCarcassFromAnimal(a, type);

          return {
            hit: true,
            animal: a.data,
            killed: true,
            carcassCreated: true,
            carcassId: carcass.id,
            message: `🎯 Downed ${carcass.animalName}! Walk to the fallen game to field-dress and claim your harvest.`,
          };
        } else {
          soundEngine.playPickaxe();
          const typeName =
            a.data.type === 'mule_deer'
              ? 'Sonoran Mule Deer'
              : a.data.type === 'whitetail_deer'
              ? 'Coues Whitetail Deer'
              : a.data.type === 'bighorn'
              ? 'Desert Bighorn Sheep'
              : a.data.type === 'rabbit'
              ? 'Desert Jackrabbit'
              : 'wild creature';

          return {
            hit: true,
            animal: a.data,
            killed: false,
            message: `Wounded ${typeName}! (Remaining Health: ${Math.round(a.health)} HP) — Creature is fleeing!`,
          };
        }
      }
    }
    return { hit: false };
  }

  // --- CARCASS CREATION & FIELD-DRESSING ---
  private createCarcassFromAnimal(a: AnimalEntity, type: DesertAnimal['type']): AnimalCarcass {
    const mesh = a.mesh;

    // Lay the animal naturally on its side on the terrain
    mesh.rotation.z = Math.PI * 0.48;
    mesh.rotation.x = 0.15;

    if (type === 'rabbit') {
      mesh.position.y -= 0.12;
    } else {
      mesh.position.y -= 0.62;
    }

    if (a.legs) {
      a.legs.forEach((leg, idx) => {
        leg.rotation.x = idx % 2 === 0 ? 0.35 : -0.35;
        leg.rotation.z = 0.2;
      });
    }
    if (a.neck) {
      a.neck.rotation.x = -0.05;
    }

    // Visual harvest beacon marker above the carcass
    const beacon = new THREE.Group();
    beacon.position.set(0, type === 'rabbit' ? 0.45 : 0.85, 0);

    // Glowing diamond/star indicator
    const diamondGeo = new THREE.OctahedronGeometry(type === 'rabbit' ? 0.12 : 0.18);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
    beacon.add(diamondMesh);

    // Ground survey claim pulse ring
    const ringGeo = new THREE.RingGeometry(
      type === 'rabbit' ? 0.35 : 0.65,
      type === 'rabbit' ? 0.45 : 0.8,
      24
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = type === 'rabbit' ? -0.4 : -0.8;
    beacon.add(ringMesh);

    mesh.add(beacon);

    let animalName = 'Desert Game';
    let harvest: AnimalCarcass['harvest'] = {
      foodType: 'rabbit_meat',
      quantity: 1,
      name: 'Fresh Desert Rabbit Meat',
      healthRestored: 25,
    };

    if (type === 'rabbit') {
      animalName = 'Desert Jackrabbit';
      harvest = {
        foodType: 'rabbit_meat',
        quantity: 1,
        name: 'Fresh Desert Rabbit Meat',
        healthRestored: 25,
      };
    } else if (type === 'mule_deer') {
      animalName = 'Sonoran Mule Deer';
      harvest = {
        foodType: 'venison',
        quantity: 3,
        name: 'Prime Mule Deer Venison',
        healthRestored: 35,
      };
    } else if (type === 'whitetail_deer') {
      animalName = 'Coues Whitetail Deer';
      harvest = {
        foodType: 'venison',
        quantity: 2,
        name: 'Coues Whitetail Venison',
        healthRestored: 35,
      };
    } else if (type === 'bighorn') {
      animalName = 'Desert Bighorn Sheep';
      harvest = {
        foodType: 'bighorn_mutton',
        quantity: 3,
        name: 'Desert Bighorn Mountain Mutton',
        healthRestored: 45,
      };
    }

    const carcass: AnimalCarcass = {
      id: `carcass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: type as AnimalCarcass['type'],
      animalName,
      position: mesh.position.clone(),
      mesh,
      beaconMesh: beacon,
      harvest,
      promptText: `🥩 Claim & Field-Dress ${animalName} [E]`,
      createdAt: Date.now(),
    };

    this.carcasses.push(carcass);
    return carcass;
  }

  public getNearbyCarcass(playerPos: THREE.Vector3, maxDistance: number = 3.5): AnimalCarcass | null {
    let closest: AnimalCarcass | null = null;
    let minDist = maxDistance;
    for (const c of this.carcasses) {
      const dist = Math.hypot(c.position.x - playerPos.x, c.position.z - playerPos.z);
      const dy = Math.abs(c.position.y - playerPos.y);
      if (dist < minDist && dy < 3.2) {
        minDist = dist;
        closest = c;
      }
    }
    return closest;
  }

  public raycastCarcass(ray: THREE.Raycaster, maxDistance: number = 4.5): AnimalCarcass | null {
    let closest: AnimalCarcass | null = null;
    let minDist = maxDistance;
    for (const c of this.carcasses) {
      const intersects = ray.intersectObject(c.mesh, true);
      if (intersects.length > 0 && intersects[0].distance < minDist) {
        minDist = intersects[0].distance;
        closest = c;
      }
    }
    return closest;
  }

  public claimCarcass(carcassId: string): {
    success: boolean;
    carcass?: AnimalCarcass;
    message?: string;
  } {
    const index = this.carcasses.findIndex((c) => c.id === carcassId);
    if (index === -1) return { success: false };
    const carcass = this.carcasses[index];

    soundEngine.playHarvestGame();

    // Clean up mesh and materials
    this.wildlifeGroup.remove(carcass.mesh);
    carcass.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });

    this.carcasses.splice(index, 1);
    return {
      success: true,
      carcass,
      message: `Field-dressed ${carcass.animalName} (+${carcass.harvest.quantity} ${carcass.harvest.name})`,
    };
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

    // Animate active carcasses and claim beacons
    const now = Date.now();
    for (let ci = this.carcasses.length - 1; ci >= 0; ci--) {
      const c = this.carcasses[ci];
      // Carcass timeout: 10 minutes (600,000 ms)
      if (now - c.createdAt > 600000) {
        this.wildlifeGroup.remove(c.mesh);
        c.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material?.dispose();
          }
        });
        this.carcasses.splice(ci, 1);
        continue;
      }

      // Animate beacon rotation and subtle floating bob
      if (c.beaconMesh) {
        c.beaconMesh.rotation.y += delta * 1.6;
        const bob = Math.sin((now - c.createdAt) * 0.003) * 0.06;
        c.beaconMesh.position.y = (c.type === 'rabbit' ? 0.45 : 0.85) + bob;
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
        const isFleeing = a.data.fleeing || distToPlayer < 10;
        if (isFleeing) {
          const dirX = a.mesh.position.x - playerPos.x;
          const dirZ = a.mesh.position.z - playerPos.z;
          const len = Math.hypot(dirX, dirZ) || 1;
          const fleeSpeed = 8.5;
          a.mesh.position.x += (dirX / len) * fleeSpeed * delta;
          a.mesh.position.z += (dirZ / len) * fleeSpeed * delta;
          a.mesh.rotation.y = Math.atan2(dirX, dirZ);
          a.mesh.position.y =
            getTerrainElevation(a.mesh.position.x, a.mesh.position.z) +
            Math.abs(Math.sin(a.animTimer * 14)) * 0.35;

          if (a.data.stateTimer > 0) {
            a.data.stateTimer -= delta;
            if (a.data.stateTimer <= 0) a.data.fleeing = false;
          }
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

      // --- 4. SONORAN DESERT MULE DEER AI ---
      else if (a.data.type === 'mule_deer') {
        a.animTimer += delta;
        const isFleeing = a.data.fleeing || distToPlayer < 24;

        if (isFleeing) {
          // Rapid Mule Deer Stotting (4-legged bounding jump escape)
          const dirX = a.mesh.position.x - playerPos.x;
          const dirZ = a.mesh.position.z - playerPos.z;
          const len = Math.hypot(dirX, dirZ) || 1;
          const sprintSpeed = 8.2;
          a.mesh.position.x += (dirX / len) * sprintSpeed * delta;
          a.mesh.position.z += (dirZ / len) * sprintSpeed * delta;

          // Face escape direction
          const targetRot = Math.atan2(dirX, dirZ);
          a.mesh.rotation.y = THREE.MathUtils.lerp(a.mesh.rotation.y, targetRot, delta * 5.0);

          // Stotting vertical bounce
          const stottBounce = Math.abs(Math.sin(a.animTimer * 8.5)) * 0.45;
          a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z) + stottBounce;

          // Head tossed back in flight
          if (a.head) {
            a.head.rotation.x = -0.15 + Math.sin(a.animTimer * 8.5) * 0.1;
          }

          if (a.data.stateTimer > 0) {
            a.data.stateTimer -= delta;
            if (a.data.stateTimer <= 0) a.data.fleeing = false;
          }
        } else {
          // Calm grazing / browsing in desert wash
          a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z);

          // Slow casual wander
          const wanderSpeed = 0.5;
          a.mesh.position.x += Math.cos(a.animTimer * 0.25) * wanderSpeed * delta;
          a.mesh.position.z += Math.sin(a.animTimer * 0.25) * wanderSpeed * delta;
          a.mesh.rotation.y += Math.sin(a.animTimer * 0.3) * 0.006;

          // Swiveling mule ears and grazing head bobs
          if (a.ears) {
            a.ears.rotation.y = Math.sin(a.animTimer * 2.2) * 0.35;
          }
          if (a.head) {
            a.head.rotation.x = 0.2 + Math.sin(a.animTimer * 1.2) * 0.18;
          }
        }
      }

      // --- 5. ARIZONA COUES WHITETAIL DEER AI ---
      else if (a.data.type === 'whitetail_deer') {
        a.animTimer += delta;
        const isFleeing = a.data.fleeing || distToPlayer < 22;

        if (isFleeing) {
          // Swift agile bounding escape
          const dirX = a.mesh.position.x - playerPos.x;
          const dirZ = a.mesh.position.z - playerPos.z;
          const len = Math.hypot(dirX, dirZ) || 1;
          const gallopSpeed = 9.0;
          a.mesh.position.x += (dirX / len) * gallopSpeed * delta;
          a.mesh.position.z += (dirZ / len) * gallopSpeed * delta;

          const targetRot = Math.atan2(dirX, dirZ);
          a.mesh.rotation.y = THREE.MathUtils.lerp(a.mesh.rotation.y, targetRot, delta * 6.0);

          // Graceful bounding leaps
          const leapBounce = Math.abs(Math.sin(a.animTimer * 10)) * 0.5;
          a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z) + leapBounce;

          // RAISE WHITE FLAG TAIL (Diagnostic Coues Whitetail defense flag)
          if (a.tail) {
            a.tail.rotation.x = 1.45; // Tail held straight up in alarm!
          }

          if (a.data.stateTimer > 0) {
            a.data.stateTimer -= delta;
            if (a.data.stateTimer <= 0) a.data.fleeing = false;
          }
        } else {
          // Tail lowered in calm state
          if (a.tail) {
            a.tail.rotation.x = 0;
          }

          a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z);
          // Gentle walk
          a.mesh.position.x += Math.cos(a.animTimer * 0.2) * 0.4 * delta;
          a.mesh.position.z += Math.sin(a.animTimer * 0.2) * 0.4 * delta;
          a.mesh.rotation.y += Math.sin(a.animTimer * 0.2) * 0.004;

          if (a.head) {
            a.head.rotation.x = 0.15 + Math.sin(a.animTimer * 1.4) * 0.15;
          }
        }
      }

      // --- 6. DESERT BIGHORN SHEEP AI ---
      else if (a.data.type === 'bighorn') {
        a.animTimer += delta;
        const isFleeing = a.data.fleeing || distToPlayer < 18;

        if (isFleeing) {
          // Sprints away up rocky slopes
          const dirX = a.mesh.position.x - playerPos.x;
          const dirZ = a.mesh.position.z - playerPos.z;
          const len = Math.hypot(dirX, dirZ) || 1;
          const runSpeed = 7.0;
          a.mesh.position.x += (dirX / len) * runSpeed * delta;
          a.mesh.position.z += (dirZ / len) * runSpeed * delta;

          const targetRot = Math.atan2(dirX, dirZ);
          a.mesh.rotation.y = THREE.MathUtils.lerp(a.mesh.rotation.y, targetRot, delta * 4.0);

          const gallopBounce = Math.abs(Math.sin(a.animTimer * 8)) * 0.3;
          a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z) + gallopBounce;

          if (a.data.stateTimer > 0) {
            a.data.stateTimer -= delta;
            if (a.data.stateTimer <= 0) a.data.fleeing = false;
          }
        } else {
          // Stately mountain overlook stance
          a.mesh.position.y = getTerrainElevation(a.mesh.position.x, a.mesh.position.z);
          a.mesh.rotation.y += Math.sin(a.animTimer * 0.4) * 0.004;
        }
      }

      // --- 7. SOARING TURKEY VULTURE AI ---
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
    this.carcasses.forEach((c) => {
      c.mesh.traverse((child) => {
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
    this.carcasses = [];
  }
}
