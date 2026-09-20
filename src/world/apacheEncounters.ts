import * as THREE from 'three';
import { soundEngine } from '../audio/soundEffects';
import { apacheVigilance, VigilanceStatus } from '../services/apacheVigilanceService';
import { createRifleModel } from './rifleModel';
import { BuiltStructure } from '../types';

export interface ApacheScout {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  state: 'observing' | 'alerted' | 'fleeing' | 'vanished' | 'dead';
  vanishProgress: number;
  idleTimer: number;
  health: number;
  snipeCooldown?: number;
}

export interface MountedWarrior {
  id: string;
  mesh: THREE.Group;
  riderTorso: THREE.Mesh;
  horseLegs: THREE.Group[];
  weaponType: 'bow' | 'carbine' | 'lance';
  muzzleFlash: THREE.PointLight;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  gallopTimer: number;
  shootCooldown: number;
  health: number;
  state: 'charging' | 'circling' | 'lance_charge' | 'retreating' | 'dead';
  circleAngle: number;
  circleRadius: number;
  circleCenter: THREE.Vector3;
  lanceCooldown: number;
  chargeTarget: THREE.Vector3;
  chargeTime: number;
  hasDealtChargeDamage: boolean;
}

export interface FlyingArrow {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  stuck: boolean;
  lifetime: number;
}

export class ApacheEncounterManager {
  private scene: THREE.Scene;
  private encounterGroup: THREE.Group = new THREE.Group();
  private scouts: ApacheScout[] = [];
  private warParty: MountedWarrior[] = [];
  private arrows: FlyingArrow[] = [];
  private dustPuffs: { mesh: THREE.Mesh; life: number; maxLife: number; velocity: THREE.Vector3 }[] = [];

  // Raid timing & cooldowns
  private lastRaidTime: number = -999;
  private raidCooldown: number = 90; // seconds between spontaneous raids
  private isRaidActive: boolean = false;
  private raidDuration: number = 0;
  private scoutCheckTimer: number = 0;
  private gallopSoundTimer: number = 0;
  private sabotageCheckTimer: number = 0;

  // Materials reused for high performance
  private buckskinMat = new THREE.MeshStandardMaterial({ color: 0xbfa170, roughness: 0.85 });
  private redClothMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
  private darkHairMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.9 });
  private skinMat = new THREE.MeshStandardMaterial({ color: 0xb57855, roughness: 0.7 });
  private warPaintWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
  private pintoCoatMat = new THREE.MeshStandardMaterial({ color: 0xded5c5, roughness: 0.85 });
  private pintoPatchMat = new THREE.MeshStandardMaterial({ color: 0x6e3b20, roughness: 0.85 });
  private darkHoofMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  private arrowWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b5338, roughness: 0.7 });
  private flintHeadMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4, metalness: 0.2 });
  private featherMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.9 });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.encounterGroup);
  }

  // ==========================================
  // 1. HIGH-RIDGE SENTINEL SCOUT CREATION
  // ==========================================
  private createScoutModel(): THREE.Group {
    const group = new THREE.Group();

    // Legs in buckskin leggings
    const legGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.75, 6);
    const legL = new THREE.Mesh(legGeo, this.buckskinMat);
    legL.position.set(-0.16, 0.38, 0);
    legL.castShadow = true;
    group.add(legL);

    const legR = new THREE.Mesh(legGeo, this.buckskinMat);
    legR.position.set(0.16, 0.38, 0);
    legR.castShadow = true;
    group.add(legR);

    // Torso with buckskin tunic & fringed hem
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.82, 8), this.buckskinMat);
    torso.position.y = 1.08;
    torso.castShadow = true;
    group.add(torso);

    // Quiver across back
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.7, 6), this.buckskinMat);
    quiver.position.set(-0.15, 1.15, -0.22);
    quiver.rotation.z = 0.35;
    group.add(quiver);

    // Arrow fletchings sticking out of quiver
    for (let i = 0; i < 3; i++) {
      const arr = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3), this.arrowWoodMat);
      arr.position.set(-0.18 + i * 0.04, 1.48, -0.22);
      arr.rotation.z = 0.35;
      group.add(arr);
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), this.skinMat);
    head.position.set(0, 1.62, 0);
    group.add(head);

    // War paint (white ochre stripe across eyes)
    const warPaint = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.12), this.warPaintWhite);
    warPaint.position.set(0, 1.63, 0.12);
    group.add(warPaint);

    // Black flowing hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.35), this.darkHairMat);
    hair.position.set(0, 1.62, -0.05);
    group.add(hair);

    // Red headband with trailing ribbons
    const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 10), this.redClothMat);
    headband.position.set(0, 1.72, 0);
    group.add(headband);

    // Eagle feather in hair
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.32, 4), this.featherMat);
    feather.position.set(-0.12, 1.88, -0.08);
    feather.rotation.z = -0.4;
    group.add(feather);

    // Recurve Bow in hand
    const bowGroup = new THREE.Group();
    const bowUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.55), this.arrowWoodMat);
    bowUpper.position.set(0, 0.25, 0.08);
    bowUpper.rotation.x = -0.3;
    bowGroup.add(bowUpper);

    const bowLower = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.55), this.arrowWoodMat);
    bowLower.position.set(0, -0.25, 0.08);
    bowLower.rotation.x = 0.3;
    bowGroup.add(bowLower);

    // Bowstring
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.48, 0),
      new THREE.Vector3(0, -0.48, 0),
    ]);
    const bowString = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xdddddd }));
    bowGroup.add(bowString);

    bowGroup.position.set(0.32, 1.15, 0.25);
    bowGroup.rotation.y = 0.4;
    group.add(bowGroup);

    return group;
  }

  // ==========================================
  // 2. MOUNTED WARRIOR & PINTO HORSE CREATION
  // ==========================================
  private createMountedWarriorModel(weaponType: 'bow' | 'carbine' | 'lance'): {
    group: THREE.Group;
    torso: THREE.Mesh;
    legs: THREE.Group[];
    flash: THREE.PointLight;
  } {
    const group = new THREE.Group();

    // --- HORSE MODEL ---
    // Horse Body (Pinto patched pattern)
    const horseBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.8, 1.7), this.pintoCoatMat);
    horseBody.position.y = 1.25;
    horseBody.castShadow = true;
    group.add(horseBody);

    // Pinto brown patches on flank
    const patchL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.7), this.pintoPatchMat);
    patchL.position.set(-0.35, 1.3, 0.1);
    group.add(patchL);

    const patchR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.6), this.pintoPatchMat);
    patchR.position.set(0.35, 1.28, -0.2);
    group.add(patchR);

    // Red ochre sacred handprint painted on horse flank (Apache war talisman)
    const talisman = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.24, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.9 })
    );
    talisman.position.set(0.38, 1.35, 0.35);
    group.add(talisman);

    // Horse Neck & Head
    const horseNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.85, 6), this.pintoPatchMat);
    horseNeck.position.set(0, 1.75, 0.72);
    horseNeck.rotation.x = -0.55;
    horseNeck.castShadow = true;
    group.add(horseNeck);

    const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.58), this.pintoCoatMat);
    horseHead.position.set(0, 2.05, 1.05);
    horseHead.rotation.x = 0.25;
    group.add(horseHead);

    // Horse Ears
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), this.pintoPatchMat);
    earL.position.set(-0.12, 2.3, 0.95);
    group.add(earL);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), this.pintoPatchMat);
    earR.position.set(0.12, 2.3, 0.95);
    group.add(earR);

    // Flowing Mane with red prayer cloth feather
    const horseMane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.4), this.darkHairMat);
    horseMane.position.set(0, 1.9, 0.65);
    horseMane.rotation.x = -0.55;
    group.add(horseMane);

    // 4 Articulated Galloping Horse Legs
    const createHorseLeg = (x: number, z: number): THREE.Group => {
      const legPivot = new THREE.Group();
      legPivot.position.set(x, 1.15, z);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.6, 6), this.pintoCoatMat);
      upper.position.y = -0.3;
      upper.castShadow = true;
      legPivot.add(upper);

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 6), this.pintoPatchMat);
      lower.position.y = -0.75;
      lower.castShadow = true;
      legPivot.add(lower);

      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 6), this.darkHoofMat);
      hoof.position.y = -1.05;
      legPivot.add(hoof);

      group.add(legPivot);
      return legPivot;
    };

    const horseLegs = [
      createHorseLeg(-0.28, 0.55), // Front Left
      createHorseLeg(0.28, 0.55),  // Front Right
      createHorseLeg(-0.28, -0.55), // Back Left
      createHorseLeg(0.28, -0.55),  // Back Right
    ];

    // Horse Tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 6), this.darkHairMat);
    tail.position.set(0, 1.35, -0.95);
    tail.rotation.x = -0.35;
    group.add(tail);

    // Rawhide saddle blanket
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.85), this.redClothMat);
    blanket.position.set(0, 1.68, 0.05);
    group.add(blanket);

    // --- MOUNTED WARRIOR RIDER ---
    // Rider Torso (low combat crouch)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.8, 8), this.buckskinMat);
    torso.position.set(0, 2.15, 0.05);
    torso.rotation.x = 0.22; // Leaning forward in gallop
    torso.castShadow = true;
    group.add(torso);

    // Rider Head with headband and feather
    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), this.skinMat);
    riderHead.position.set(0, 2.65, 0.2);
    group.add(riderHead);

    const rHair = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.3), this.darkHairMat);
    rHair.position.set(0, 2.65, 0.1);
    group.add(rHair);

    const rBand = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), this.redClothMat);
    rBand.position.set(0, 2.73, 0.2);
    group.add(rBand);

    const rFeather = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), this.featherMat);
    rFeather.position.set(-0.1, 2.88, 0.12);
    rFeather.rotation.z = -0.4;
    group.add(rFeather);

    // Rider Legs wrapped around horse flanks
    const rLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.7, 6), this.buckskinMat);
    rLegL.position.set(-0.42, 1.7, 0.1);
    rLegL.rotation.z = -0.3;
    rLegL.rotation.x = 0.4;
    group.add(rLegL);

    const rLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.7, 6), this.buckskinMat);
    rLegR.position.set(0.42, 1.7, 0.1);
    rLegR.rotation.z = 0.3;
    rLegR.rotation.x = 0.4;
    group.add(rLegR);

    // Muzzle Flash light for carbine
    const flash = new THREE.PointLight(0xffaa22, 0, 10);
    flash.position.set(0.3, 2.2, 0.9);
    flash.visible = false;
    group.add(flash);

    // Weapon
    if (weaponType === 'carbine') {
      const carbine = createRifleModel({ withScope: false, scale: 0.85 });
      carbine.position.set(0.32, 2.15, 0.45);
      carbine.rotation.x = 0.15;
      group.add(carbine);
    } else if (weaponType === 'lance') {
      // 2.6m Apache War Lance with flint head & red trade cloth streamers
      const lanceGroup = new THREE.Group();
      lanceGroup.position.set(0.35, 2.15, 0.15);
      lanceGroup.rotation.x = 0.32; // Couched forward
      lanceGroup.rotation.y = -0.08;

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 2.6, 6), this.arrowWoodMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = 0.6;
      shaft.castShadow = true;
      lanceGroup.add(shaft);

      const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), this.flintHeadMat);
      spearHead.rotation.x = Math.PI / 2;
      spearHead.position.z = 1.95;
      spearHead.castShadow = true;
      lanceGroup.add(spearHead);

      // Red trade cloth streamer / horsehair fringe
      const streamer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.65), this.redClothMat);
      streamer.position.set(0, -0.1, 1.5);
      lanceGroup.add(streamer);

      group.add(lanceGroup);
    } else {
      // Powerful Apache recurve bow
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 6, 12, Math.PI), this.arrowWoodMat);
      bow.position.set(0.32, 2.2, 0.4);
      bow.rotation.y = Math.PI / 2;
      bow.rotation.z = -0.4;
      group.add(bow);
    }

    return { group, torso, legs: horseLegs, flash };
  }

  // ==========================================
  // 3. ARROW PROJECTILE CREATION
  // ==========================================
  private spawnArrow(start: THREE.Vector3, dir: THREE.Vector3, speed: number = 42) {
    soundEngine.playArrowWhoosh();

    const group = new THREE.Group();
    group.position.copy(start);

    // Wooden shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 6), this.arrowWoodMat);
    shaft.rotation.x = Math.PI / 2;
    group.add(shaft);

    // Flint arrowhead
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), this.flintHeadMat);
    head.position.z = 0.42;
    head.rotation.x = Math.PI / 2;
    group.add(head);

    // Red & White feather fletchings
    const fletch1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.15), this.featherMat);
    fletch1.position.z = -0.32;
    group.add(fletch1);

    const fletch2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.15), this.redClothMat);
    fletch2.position.z = -0.32;
    group.add(fletch2);

    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.encounterGroup.add(group);

    const velocity = dir.clone().multiplyScalar(speed);
    velocity.y += 1.2; // slight parabolic arc

    this.arrows.push({
      id: `arr_${Math.random()}`,
      mesh: group,
      position: start.clone(),
      velocity,
      stuck: false,
      lifetime: 0,
    });
  }

  // ==========================================
  // 4. DUST TRAIL & VANISH PUFF PARTICLES
  // ==========================================
  private spawnDustPuff(pos: THREE.Vector3, count: number = 3, colorHex: number = 0xbfa170) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.25 + Math.random() * 0.25, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.6,
        pos.y + 0.1 + Math.random() * 0.3,
        pos.z + (Math.random() - 0.5) * 0.6
      );
      this.encounterGroup.add(mesh);

      this.dustPuffs.push({
        mesh,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.5,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0.8 + Math.random() * 1.2,
          (Math.random() - 0.5) * 0.8
        ),
      });
    }
  }

  // ==========================================
  // 5. SCOUT & RAID SPAWNING TRIGGERS
  // ==========================================
  public checkAndSpawnScouts(
    playerPos: THREE.Vector3,
    vigilance: VigilanceStatus,
    getTerrainElevation: (x: number, z: number) => number
  ) {
    if (this.scouts.length >= 2) return;
    if (vigilance.level === 'dormant') return;

    // Look for high ridge spawn points 60-95m away
    const angle = Math.random() * Math.PI * 2;
    const dist = 65 + Math.random() * 30;
    const sx = playerPos.x + Math.cos(angle) * dist;
    const sz = playerPos.z + Math.sin(angle) * dist;
    const sy = getTerrainElevation(sx, sz);

    // Scouts favor elevated positions overlooking the player
    if (sy > playerPos.y + 3) {
      const scoutModel = this.createScoutModel();
      scoutModel.position.set(sx, sy, sz);

      // Face toward player
      const angleToPlayer = Math.atan2(playerPos.x - sx, playerPos.z - sz);
      scoutModel.rotation.y = angleToPlayer;

      this.encounterGroup.add(scoutModel);
      this.scouts.push({
        id: `scout_${Date.now()}`,
        position: new THREE.Vector3(sx, sy, sz),
        mesh: scoutModel,
        state: 'observing',
        vanishProgress: 0,
        idleTimer: 0,
        health: 65,
      });

      // Eerie nocturnal owl sentinel call
      soundEngine.playApacheSentinelCall();
    }
  }

  public triggerWarPartyRaid(
    playerPos: THREE.Vector3,
    getTerrainElevation: (x: number, z: number) => number,
    showBanner: (msg: string) => void
  ) {
    const now = Date.now() / 1000;
    if (this.isRaidActive || now - this.lastRaidTime < this.raidCooldown) return;

    this.isRaidActive = true;
    this.lastRaidTime = now;
    this.raidDuration = 0;

    // Announce Raid & play thunderous war drums & war cries
    soundEngine.playWarWhoop();
    soundEngine.playApacheWarCry();
    soundEngine.playApacheWarDrum(0.95);
    showBanner('🏹 APACHE WAR PARTY CHARGING WITH LETHAL FORCE! Guardians defend sacred soil—fight or flee!');

    // Spawn 2 to 4 mounted warriors galloping in from canyon washes (75-95m away)
    const vigilanceStatus = apacheVigilance.getStatus();
    const warriorCount = vigilanceStatus.level === 'wrathful' ? 3 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2);
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < warriorCount; i++) {
      const angle = baseAngle + (i - 1) * 0.55;
      const spawnDist = 75 + Math.random() * 20;
      const wx = playerPos.x + Math.cos(angle) * spawnDist;
      const wz = playerPos.z + Math.sin(angle) * spawnDist;
      const wy = getTerrainElevation(wx, wz);

      const weaponType: 'lance' | 'carbine' | 'bow' =
        i === 0 ? 'lance' : i === 1 ? 'carbine' : i === 2 ? 'bow' : (Math.random() < 0.5 ? 'lance' : 'carbine');

      const { group, torso, legs, flash } = this.createMountedWarriorModel(weaponType);
      group.position.set(wx, wy, wz);
      this.encounterGroup.add(group);

      this.warParty.push({
        id: `warrior_${Date.now()}_${i}`,
        mesh: group,
        riderTorso: torso,
        horseLegs: legs,
        weaponType,
        muzzleFlash: flash,
        position: new THREE.Vector3(wx, wy, wz),
        velocity: new THREE.Vector3(0, 0, 0),
        gallopTimer: Math.random() * 10,
        shootCooldown: 1.5 + Math.random() * 2.0,
        health: weaponType === 'lance' ? 95 : 80,
        state: 'charging',
        circleAngle: baseAngle + i * 1.8,
        circleRadius: weaponType === 'lance' ? 18 + Math.random() * 6 : 22 + Math.random() * 10,
        circleCenter: playerPos.clone(),
        lanceCooldown: weaponType === 'lance' ? 3.5 + Math.random() * 3.5 : 7.0 + Math.random() * 5.0,
        chargeTarget: playerPos.clone(),
        chargeTime: 0,
        hasDealtChargeDamage: false,
      });
    }
  }

  // ==========================================
  // 6. MAIN ANIMATION & COMBAT UPDATE LOOP
  // ==========================================
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isAimingRifle: boolean,
    cameraDir: THREE.Vector3,
    isInsideMine: boolean,
    getTerrainElevation: (x: number, z: number) => number,
    onPlayerDamage: (dmg: number, reason: string) => void,
    showBanner: (msg: string) => void,
    structures?: BuiltStructure[],
    onSabotageStructure?: (structure: BuiltStructure) => void,
    playerHealth?: number
  ) {
    const vigilance = apacheVigilance.getStatus();

    // 1. Scout Spawning & Vigilance Monitoring
    this.scoutCheckTimer += delta;
    if (this.scoutCheckTimer > 8.0) {
      this.scoutCheckTimer = 0;
      this.checkAndSpawnScouts(playerPos, vigilance, getTerrainElevation);

      // Spontaneous raid check at Hostile or Wrathful
      if (
        (vigilance.level === 'hostile' || vigilance.level === 'wrathful') &&
        !this.isRaidActive &&
        !isInsideMine
      ) {
        // Higher probability as vigilance climbs
        const raidProb = vigilance.level === 'wrathful' ? 0.75 : 0.4;
        if (Math.random() < raidProb) {
          this.triggerWarPartyRaid(playerPos, getTerrainElevation, showBanner);
        }
      }
    }

    // 1b. Unconcealed Mine Sabotage Monitoring: Apache War Parties Target Sacred Ground Excavations
    if (structures && structures.length > 0 && onSabotageStructure) {
      // Periodic check for raids striking unconcealed mining infrastructure
      this.sabotageCheckTimer += delta;
      if (this.sabotageCheckTimer >= 18.0) {
        this.sabotageCheckTimer = 0;

        if (vigilance.level === 'hostile' || vigilance.level === 'wrathful') {
          // Find exposed (unconcealed and unsabotaged) mining structures outside town sanctuary (z > -180)
          const vulnerableTargets = structures.filter(
            (s) =>
              !s.sabotaged &&
              !s.concealed &&
              (s.type === 'timber_portal' ||
                s.type === 'deep_shaft' ||
                s.type === 'headframe_hoist' ||
                s.type === 'prospector_camp') &&
              Math.hypot(s.position.x, s.position.z + 246) > 65
          );

          if (vulnerableTargets.length > 0) {
            const raidTriggerProb = vigilance.level === 'wrathful' ? 0.6 : 0.3;
            if (Math.random() < raidTriggerProb) {
              const target = vulnerableTargets[Math.floor(Math.random() * vulnerableTargets.length)];
              this.spawnDustPuff(new THREE.Vector3(target.position.x, target.position.y + 1, target.position.z), 18, 0x422f20);
              onSabotageStructure(target);
              if (isInsideMine) {
                soundEngine.playMineSabotageRumble();
                soundEngine.playMountainGroan();
                showBanner(`⚠️ CATASTROPHIC RUMBLE ABOVE! Apache war party collapsed your surface [${target.name}]! Rubble blocks the exit.`);
              } else {
                showBanner(`💥 APACHE SABOTAGE! War party raided and collapsed unconcealed [${target.name}]! Conceal mines with brush [K] to evade detection.`);
              }
            }
          }
        }
      }
    }

    // 2. High-Ridge Scouts AI: Stalking, Vanishing & Warning Sniping
    for (let i = this.scouts.length - 1; i >= 0; i--) {
      const scout = this.scouts[i];
      if (scout.state === 'vanished' || scout.state === 'dead') continue;

      scout.idleTimer += delta;
      // Gentle breathing & observing sway
      scout.mesh.rotation.y += Math.sin(scout.idleTimer * 1.2) * 0.003;

      const distToPlayer = scout.mesh.position.distanceTo(playerPos);

      // High-Ridge Sentinel Sniping: If vigilance is elevated, scout looses warning arrows from bluffs
      scout.snipeCooldown = (scout.snipeCooldown ?? (10 + Math.random() * 8)) - delta;
      if (
        scout.state === 'observing' &&
        distToPlayer > 28 &&
        distToPlayer < 95 &&
        scout.snipeCooldown <= 0 &&
        (vigilance.level === 'hostile' || vigilance.level === 'wrathful') &&
        !isInsideMine
      ) {
        scout.snipeCooldown = 15 + Math.random() * 10;
        const arrowStart = scout.mesh.position.clone();
        arrowStart.y += 1.8;
        const target = playerPos.clone();
        target.y += 1.2;
        target.x += (Math.random() - 0.5) * 2.0;
        target.z += (Math.random() - 0.5) * 2.0;
        const dir = target.sub(arrowStart).normalize();
        this.spawnArrow(arrowStart, dir, 38);
        showBanner('🏹 Whistling arrow loosed from high ridges! An Apache sentinel is firing on your position!');
      }

      // Check if player is aiming through scope at the scout!
      let playerAimingAtScout = false;
      if (isAimingRifle) {
        const toScout = scout.mesh.position.clone().sub(playerPos).normalize();
        const dot = cameraDir.dot(toScout);
        if (dot > 0.985 && distToPlayer < 120) {
          playerAimingAtScout = true;
        }
      }

      // Vanishing trigger: player approached within 32m OR aimed directly with rifle scope!
      if ((distToPlayer < 34 || playerAimingAtScout) && scout.state === 'observing') {
        scout.state = 'alerted';
        soundEngine.playScoutVanish();
        this.spawnDustPuff(scout.mesh.position, 6, 0xd4c2a5);
        showBanner('👁️ A high-ridge Apache scout slipped into the mountain crags!');
      }

      if (scout.state === 'alerted') {
        scout.vanishProgress += delta * 2.5;
        scout.mesh.position.y -= delta * 1.8; // Drops behind boulders
        scout.mesh.scale.multiplyScalar(0.92);

        if (scout.vanishProgress >= 1.0) {
          scout.state = 'vanished';
          this.encounterGroup.remove(scout.mesh);
          this.scouts.splice(i, 1);
        }
      }
    }

    // 3. Mounted War Party Combat AI (Relentless Lethal Engagement)
    if (this.isRaidActive && this.warParty.length > 0) {
      this.raidDuration += delta;
      this.gallopSoundTimer += delta;

      // Galloping sound rhythm
      if (this.gallopSoundTimer > 0.35) {
        this.gallopSoundTimer = 0;
        soundEngine.playWarHorseGallop();
      }

      // Sanctuary check: Tortilla Flat (x: 0, z: -246) or inside subterranean mine
      const distToTortilla = Math.hypot(playerPos.x - 0, playerPos.z - (-246));
      const reachedSanctuary = distToTortilla < 65 || isInsideMine;

      if (reachedSanctuary || this.raidDuration > 65) {
        // War party breaks off and retreats
        this.repelWarParty(showBanner, reachedSanctuary ? 'sanctuary' : 'timeout');
      }

      for (let i = this.warParty.length - 1; i >= 0; i--) {
        const warrior = this.warParty[i];
        if (warrior.state === 'dead') continue;

        warrior.gallopTimer += delta;

        // Animate 4 galloping legs with authentic 4-beat cycle
        const gSpeed = warrior.state === 'lance_charge' ? 22 : 14;
        const gCycle = warrior.gallopTimer * gSpeed;
        warrior.horseLegs[0].rotation.x = Math.sin(gCycle) * 0.75;
        warrior.horseLegs[1].rotation.x = Math.sin(gCycle + 0.5) * 0.75;
        warrior.horseLegs[2].rotation.x = -Math.sin(gCycle + 1.2) * 0.8;
        warrior.horseLegs[3].rotation.x = -Math.sin(gCycle + 1.7) * 0.8;

        // Kick up dust puffs at hooves
        const dustRate = warrior.state === 'lance_charge' ? 0.55 : 0.25;
        if (Math.random() < dustRate) {
          this.spawnDustPuff(warrior.mesh.position, 1, 0xcaa978);
        }

        const distToPlayer = warrior.mesh.position.distanceTo(playerPos);

        if (warrior.state === 'charging') {
          // Gallop rapidly towards perimeter around player
          const toTarget = playerPos.clone().sub(warrior.mesh.position);
          toTarget.y = 0;
          toTarget.normalize();

          const gallopSpeed = 17.5;
          warrior.mesh.position.x += toTarget.x * gallopSpeed * delta;
          warrior.mesh.position.z += toTarget.z * gallopSpeed * delta;
          warrior.mesh.position.y = getTerrainElevation(warrior.mesh.position.x, warrior.mesh.position.z);

          // Face direction of movement
          const angle = Math.atan2(toTarget.x, toTarget.z);
          warrior.mesh.rotation.y = angle;

          if (distToPlayer <= warrior.circleRadius + 4) {
            if (warrior.weaponType === 'lance' && Math.random() < 0.6) {
              // Plunge straight into a devastating lance strike!
              warrior.state = 'lance_charge';
              warrior.chargeTarget = playerPos.clone();
              warrior.chargeTime = 0;
              warrior.hasDealtChargeDamage = false;
              soundEngine.playWarWhoop();
              showBanner('⚠️ INCOMING APACHE LANCE CHARGE! Dodge or shoot!');
            } else {
              warrior.state = 'circling';
              warrior.circleCenter.copy(playerPos);
            }
          }
        } else if (warrior.state === 'circling') {
          // Fast horse combat encircling tactics
          warrior.circleAngle += delta * 0.85; // Circumnavigate player
          const cx = warrior.circleCenter.x + Math.cos(warrior.circleAngle) * warrior.circleRadius;
          const cz = warrior.circleCenter.z + Math.sin(warrior.circleAngle) * warrior.circleRadius;

          // Smoothly track moving player's center
          warrior.circleCenter.lerp(playerPos, delta * 1.2);

          warrior.mesh.position.x = cx;
          warrior.mesh.position.z = cz;
          warrior.mesh.position.y = getTerrainElevation(cx, cz);

          // Tangent facing + banking into turn
          warrior.mesh.rotation.y = warrior.circleAngle + Math.PI / 2;
          warrior.riderTorso.rotation.z = -0.22; // Body combat lean

          // Lethal Charge Timer: periodically break circle to kill!
          const isPlayerWounded = playerHealth !== undefined && playerHealth < 40;
          const chargeDecay = isPlayerWounded ? delta * 2.2 : delta;
          warrior.lanceCooldown -= chargeDecay;

          if (warrior.lanceCooldown <= 0 && distToPlayer < 45) {
            warrior.state = 'lance_charge';
            warrior.chargeTarget = playerPos.clone();
            warrior.chargeTime = 0;
            warrior.hasDealtChargeDamage = false;
            warrior.lanceCooldown = isPlayerWounded ? 3.5 + Math.random() * 3.0 : 7.0 + Math.random() * 5.0;
            soundEngine.playWarWhoop();
            showBanner(
              warrior.weaponType === 'lance'
                ? '⚠️ APACHE WARRIOR COUCHING LANCE! SPRINTING FOR THE KILL!'
                : '⚠️ MOUNTED WARRIOR CHARGING IN TO TRAMPLE!'
            );
          }

          // Shooting weapons at prospector
          warrior.shootCooldown -= delta;
          if (warrior.shootCooldown <= 0) {
            warrior.shootCooldown = 1.8 + Math.random() * 1.8;

            if (warrior.weaponType === 'bow') {
              // Fire lethal whistling war arrow with lead trajectory
              const arrowStart = warrior.mesh.position.clone();
              arrowStart.y += 2.1;

              const target = playerPos.clone();
              target.y += 1.1;
              target.x += (Math.random() - 0.5) * 1.2;
              target.z += (Math.random() - 0.5) * 1.2;

              const dir = target.sub(arrowStart).normalize();
              this.spawnArrow(arrowStart, dir, 44);
            } else if (warrior.weaponType === 'carbine') {
              // Fire Winchester repeater carbine
              soundEngine.playBanditShot();
              warrior.muzzleFlash.visible = true;
              warrior.muzzleFlash.intensity = 4.0;
              setTimeout(() => {
                warrior.muzzleFlash.intensity = 0;
                warrior.muzzleFlash.visible = false;
              }, 75);

              // Lethal carbine accuracy (higher if closer or wrathful)
              const hitThreshold = distToPlayer < 22 ? 0.65 : 0.45;
              if (Math.random() < hitThreshold) {
                // Direct high-caliber hit
                soundEngine.playPlayerHurt();
                onPlayerDamage(22 + Math.floor(Math.random() * 10), 'apache_carbine');
              } else {
                soundEngine.playRicochet();
              }
            }
          }
        } else if (warrior.state === 'lance_charge') {
          // Blazing full-gallop cavalry charge directly through the player
          warrior.chargeTime += delta;
          const toCharge = warrior.chargeTarget.clone().sub(warrior.mesh.position);
          toCharge.y = 0;
          toCharge.normalize();

          const sprintSpeed = 22.0; // 22 m/s lethal sprint
          warrior.mesh.position.x += toCharge.x * sprintSpeed * delta;
          warrior.mesh.position.z += toCharge.z * sprintSpeed * delta;
          warrior.mesh.position.y = getTerrainElevation(warrior.mesh.position.x, warrior.mesh.position.z);
          warrior.mesh.rotation.y = Math.atan2(toCharge.x, toCharge.z);

          // Lethal Melee / Trample Hit Check
          if (distToPlayer < 2.35 && !warrior.hasDealtChargeDamage) {
            warrior.hasDealtChargeDamage = true;
            soundEngine.playLanceStrike();
            soundEngine.playPlayerHurt();
            this.spawnDustPuff(playerPos, 12, 0x8a6a42);

            const isLance = warrior.weaponType === 'lance';
            const dmg = isLance
              ? 34 + Math.floor(Math.random() * 14) // 34-48 HP devastating blow!
              : 26 + Math.floor(Math.random() * 8);  // 26-34 HP trample damage!
            const reason = isLance ? 'apache_lance' : 'apache_cavalry_trample';

            onPlayerDamage(dmg, reason);
            showBanner(
              isLance
                ? '💥 IMPALED BY WAR LANCE! Devastating blow from mounted warrior!'
                : '💥 TRAMPLED UNDER GALLOPING HOOVES! Mountain defenders strike!'
            );
          }

          // Complete charge pass and loop back into circling
          if (warrior.chargeTime > 2.6 || warrior.mesh.position.distanceTo(warrior.chargeTarget) < 2.5) {
            warrior.state = 'circling';
            warrior.circleCenter.copy(playerPos);
            warrior.circleAngle = Math.atan2(
              warrior.mesh.position.z - playerPos.z,
              warrior.mesh.position.x - playerPos.x
            );
          }
        } else if (warrior.state === 'retreating') {
          // Gallop away into mountain passes
          const retreatDir = warrior.mesh.position.clone().sub(playerPos);
          retreatDir.y = 0;
          retreatDir.normalize();

          warrior.mesh.position.x += retreatDir.x * 16 * delta;
          warrior.mesh.position.z += retreatDir.z * 16 * delta;
          warrior.mesh.position.y = getTerrainElevation(warrior.mesh.position.x, warrior.mesh.position.z);
          warrior.mesh.rotation.y = Math.atan2(retreatDir.x, retreatDir.z);

          if (distToPlayer > 140) {
            this.encounterGroup.remove(warrior.mesh);
            this.warParty.splice(i, 1);
          }
        }

        // Check if warrior rides near an unconcealed prospector structure during the raid
        if (structures && onSabotageStructure && warrior.state !== 'retreating') {
          for (const s of structures) {
            if (s.sabotaged || s.concealed) continue;
            if (Math.hypot(s.position.x, s.position.z + 246) < 65) continue;
            const distToStruct = warrior.mesh.position.distanceTo(
              new THREE.Vector3(s.position.x, s.position.y, s.position.z)
            );
            if (distToStruct < 14.0) {
              this.spawnDustPuff(new THREE.Vector3(s.position.x, s.position.y + 1, s.position.z), 18, 0x3d2716);
              onSabotageStructure(s);
              showBanner(`💥 WARRIORS SACKED YOUR MINE! [${s.name}] collapsed by rockfall and fire!`);
              break;
            }
          }
        }
      }
    }

    // 4. Update Flying War Arrows (High-Velocity Lethal Projectiles)
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arr = this.arrows[i];
      if (arr.stuck) {
        arr.lifetime += delta;
        if (arr.lifetime > 12) {
          this.encounterGroup.remove(arr.mesh);
          this.arrows.splice(i, 1);
        }
        continue;
      }

      arr.velocity.y -= 14.5 * delta; // Gravity arc
      arr.position.x += arr.velocity.x * delta;
      arr.position.y += arr.velocity.y * delta;
      arr.position.z += arr.velocity.z * delta;
      arr.mesh.position.copy(arr.position);

      // Align arrow heading with flight velocity vector
      const heading = arr.velocity.clone().normalize();
      arr.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), heading);

      // Hit check against player
      const distToPlayer = arr.position.distanceTo(playerPos);
      if (distToPlayer < 1.45) {
        soundEngine.playArrowImpact();
        soundEngine.playPlayerHurt();
        onPlayerDamage(24 + Math.floor(Math.random() * 10), 'apache_arrow');

        this.encounterGroup.remove(arr.mesh);
        this.arrows.splice(i, 1);
        continue;
      }

      // Hit check against ground
      const groundY = getTerrainElevation(arr.position.x, arr.position.z);
      if (arr.position.y <= groundY + 0.1) {
        arr.stuck = true;
        arr.position.y = groundY + 0.15;
        arr.mesh.position.copy(arr.position);
        soundEngine.playArrowImpact();
      }
    }

    // 5. Update Dust Puffs
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const p = this.dustPuffs[i];
      p.life += delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.scale.multiplyScalar(1 + delta * 0.8);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.6 * (1 - p.life / p.maxLife));

      if (p.life >= p.maxLife) {
        this.encounterGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.dustPuffs.splice(i, 1);
      }
    }
  }

  // ==========================================
  // 7. PLAYER BULLET HIT DETECTION
  // ==========================================
  public checkBulletHit(
    cameraPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    showBanner: (msg: string) => void
  ): boolean {
    const ray = new THREE.Raycaster(cameraPos, cameraDir, 0.5, 120);

    // Check hit against scouts
    for (const scout of this.scouts) {
      if (scout.state === 'vanished' || scout.state === 'dead') continue;
      const sPos = scout.mesh.position;
      const distToRay = ray.ray.distanceToPoint(new THREE.Vector3(sPos.x, sPos.y + 1.0, sPos.z));
      if (distToRay < 0.95) {
        scout.health -= 55;
        soundEngine.playRicochet();

        if (scout.health <= 0) {
          scout.state = 'dead';
          soundEngine.playDiscovery();
          this.spawnDustPuff(scout.mesh.position, 8);
          showBanner('🏹 High-ridge scout repelled! Vigilance temporarily disrupted.');
          apacheVigilance.coolDown(12);
          this.encounterGroup.remove(scout.mesh);
        } else {
          // Scout vanishes immediately if wounded
          scout.state = 'alerted';
          soundEngine.playScoutVanish();
        }
        return true;
      }
    }

    // Check hit against mounted warriors
    for (const warrior of this.warParty) {
      if (warrior.state === 'dead' || warrior.state === 'retreating') continue;
      const wPos = warrior.mesh.position;
      const distToRay = ray.ray.distanceToPoint(new THREE.Vector3(wPos.x, wPos.y + 1.4, wPos.z));
      if (distToRay < 1.25) {
        warrior.health -= 50;
        soundEngine.playRicochet();

        if (warrior.health <= 0) {
          warrior.state = 'dead';
          soundEngine.playDiscovery();
          this.spawnDustPuff(warrior.mesh.position, 12, 0x4a3220);
          this.encounterGroup.remove(warrior.mesh);
          showBanner('💥 Mounted warrior unhorsed! The war party loses resolve!');

          // Check if surviving warriors should break off
          const activeWarriors = this.warParty.filter((w) => w.state !== 'dead' && w.state !== 'retreating');
          if (activeWarriors.length <= 1) {
            this.repelWarParty(showBanner, 'combat');
          }
        }
        return true;
      }
    }

    return false;
  }

  // ==========================================
  // 8. DYNAMITE BLAST DAMAGE
  // ==========================================
  public checkDynamiteBlast(blastPos: THREE.Vector3, showBanner: (msg: string) => void) {
    let unhorsedCount = 0;
    this.warParty.forEach((warrior) => {
      if (warrior.state === 'dead') return;
      const dist = warrior.mesh.position.distanceTo(blastPos);
      if (dist < 10.5) {
        warrior.health -= 120;
        warrior.state = 'dead';
        this.spawnDustPuff(warrior.mesh.position, 14, 0x3d2716);
        this.encounterGroup.remove(warrior.mesh);
        unhorsedCount++;
      }
    });

    if (unhorsedCount > 0) {
      showBanner(`💥 Dynamite blast shattered the war party formation! (${unhorsedCount} unhorsed)`);
      this.repelWarParty(showBanner, 'combat');
    }
  }

  // ==========================================
  // 9. REPEL WAR PARTY & COOL DOWN
  // ==========================================
  private repelWarParty(showBanner: (msg: string) => void, reason: 'combat' | 'sanctuary' | 'timeout') {
    if (!this.isRaidActive) return;
    this.isRaidActive = false;

    if (reason === 'combat') {
      showBanner('🏹 The Apache War Party retreats over the high ridges! Peak Vigilance drops (-25%).');
      apacheVigilance.coolDown(25);
    } else if (reason === 'sanctuary') {
      showBanner('🏕️ Sanctuary reached! The war party broke off pursuit at the perimeter.');
      apacheVigilance.coolDown(15);
    } else {
      showBanner('🌲 The war party dispersed back into the sacred mountain canyons.');
      apacheVigilance.coolDown(10);
    }

    // Command all remaining warriors to gallop away
    this.warParty.forEach((w) => {
      if (w.state !== 'dead') {
        w.state = 'retreating';
      }
    });
  }

  public isRaidInProgress(): boolean {
    return this.isRaidActive;
  }

  // Cleanup
  public dispose() {
    this.scene.remove(this.encounterGroup);
    this.scouts = [];
    this.warParty = [];
    this.arrows = [];
    this.dustPuffs = [];
  }
}
