import * as THREE from 'three';
import { soundEngine } from '../audio/soundEffects';

export interface MountData {
  type: 'burro' | 'pony';
  name: string;
}

/**
 * Manages procedural 3D pack burro and mountain pony mounts:
 * - Authentic 1880s Sonoran Desert models (pack saddle, sawbuck, burlap sacks vs leather stock saddle)
 * - 4-beat trotting and galloping leg kinematics
 * - Ridden vs trail-following companion behaviors
 * - Idle grazing, ear twitches, and synchronized hoof sounds
 */
export class MountManager {
  private scene: THREE.Scene;
  public group: THREE.Group;
  public get mountGroup(): THREE.Group {
    return this.group;
  }
  public mountType: 'burro' | 'pony' | null = null;
  public mountName: string = '';

  // 3D Meshes & Rig Parts
  private bodyMesh: THREE.Mesh | null = null;
  private headGroup: THREE.Group | null = null;
  private neckMesh: THREE.Mesh | null = null;
  private legFL: THREE.Group | null = null;
  private legFR: THREE.Group | null = null;
  private legBL: THREE.Group | null = null;
  private legBR: THREE.Group | null = null;
  private tailGroup: THREE.Group | null = null;
  private earL: THREE.Mesh | null = null;
  private earR: THREE.Mesh | null = null;

  // State & Physics
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotationY: number = 0;
  public isRiding: boolean = false;
  private trotTimer: number = 0;
  private hoofSoundTimer: number = 0;
  private idleGrazingTimer: number = 0;
  private isGrazing: boolean = false;
  private brayTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);
  }

  /**
   * Spawns or updates the player's owned companion mount
   */
  public setMount(type: 'burro' | 'pony' | null, name: string = '') {
    if (this.mountType === type && Boolean(this.bodyMesh)) {
      this.mountName = name;
      return;
    }

    // Clean up old model
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    this.mountType = type;
    this.mountName = name;

    if (!type) {
      this.group.visible = false;
      this.isRiding = false;
      return;
    }

    this.group.visible = true;
    if (type === 'burro') {
      this.buildBurroModel();
    } else {
      this.buildPonyModel();
    }
  }

  /**
   * Authentic Spanish Pack Burro / Desert Donkey
   * Dun-gray coat, long donkey ears, sawbuck wooden pack saddle, burlap sacks, canteen & pickaxe
   */
  private buildBurroModel() {
    const dunMat = new THREE.MeshStandardMaterial({ color: 0x7a7469, roughness: 0.88 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xc8c2b5, roughness: 0.9 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xded9cf, roughness: 0.92 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x4a321f, roughness: 0.85 });
    const burlapMat = new THREE.MeshStandardMaterial({ color: 0xa89371, roughness: 0.95 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x2e1c11, roughness: 0.75 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 });

    // 1. Torso Barrel
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.25, 10);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, dunMat);
    body.position.y = 0.95;
    body.castShadow = true;
    this.group.add(body);
    this.bodyMesh = body;

    // Belly highlight
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 1.15, 8), bellyMat);
    belly.rotateX(Math.PI / 2);
    belly.position.set(0, -0.05, 0);
    body.add(belly);

    // Dark dorsal stripe down spine (classic donkey trait)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.2), new THREE.MeshBasicMaterial({ color: 0x3d352b }));
    stripe.position.set(0, 0.42, 0);
    body.add(stripe);

    // 2. Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.65, 8), dunMat);
    neck.position.set(0, 1.25, 0.55);
    neck.rotation.x = Math.PI / 4;
    neck.castShadow = true;
    this.group.add(neck);
    this.neckMesh = neck;

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.52, 0.82);

    // Skull
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.48), dunMat);
    head.castShadow = true;
    headGroup.add(head);

    // Soft Cream Muzzle
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.28), muzzleMat);
    muzzle.position.set(0, -0.06, 0.32);
    headGroup.add(muzzle);

    // Dark Nostrils
    const nostrilL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
    nostrilL.position.set(-0.06, -0.04, 0.45);
    headGroup.add(nostrilL);
    const nostrilR = nostrilL.clone();
    nostrilR.position.x = 0.06;
    headGroup.add(nostrilR);

    // Long Iconic Donkey Ears
    const earGeo = new THREE.ConeGeometry(0.08, 0.45, 6);
    earGeo.rotateZ(0.12);
    const earL = new THREE.Mesh(earGeo, dunMat);
    earL.position.set(-0.12, 0.32, -0.08);
    earL.rotation.z = 0.25;
    earL.rotation.x = -0.15;
    headGroup.add(earL);
    this.earL = earL;

    const earR = new THREE.Mesh(earGeo, dunMat);
    earR.position.set(0.12, 0.32, -0.08);
    earR.rotation.z = -0.25;
    earR.rotation.x = -0.15;
    headGroup.add(earR);
    this.earR = earR;

    // Bridle & Rope Halter
    const halter = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 12), leatherMat);
    halter.rotation.x = Math.PI / 2;
    halter.position.set(0, -0.04, 0.15);
    headGroup.add(halter);

    this.group.add(headGroup);
    this.headGroup = headGroup;

    // 3. Sawbuck Wooden Pack Saddle (Cross-tree frame)
    const crossGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05);
    const frameL1 = new THREE.Mesh(crossGeo, darkWood);
    frameL1.position.set(-0.35, 1.35, 0.15);
    frameL1.rotation.z = 0.4;
    this.group.add(frameL1);
    const frameL2 = frameL1.clone();
    frameL2.rotation.z = -0.4;
    this.group.add(frameL2);

    const frameR1 = new THREE.Mesh(crossGeo, darkWood);
    frameR1.position.set(0.35, 1.35, 0.15);
    frameR1.rotation.z = -0.4;
    this.group.add(frameR1);
    const frameR2 = frameR1.clone();
    frameR2.rotation.z = 0.4;
    this.group.add(frameR2);

    // Rear sawbuck frame
    const frameBL1 = frameL1.clone();
    frameBL1.position.z = -0.25;
    this.group.add(frameBL1);
    const frameBL2 = frameL2.clone();
    frameBL2.position.z = -0.25;
    this.group.add(frameBL2);
    const frameBR1 = frameR1.clone();
    frameBR1.position.z = -0.25;
    this.group.add(frameBR1);
    const frameBR2 = frameR2.clone();
    frameBR2.position.z = -0.25;
    this.group.add(frameBR2);

    // Burlap Ore Pack Sacks (Bulging on both flanks)
    const sackGeo = new THREE.BoxGeometry(0.32, 0.45, 0.65);
    const sackL = new THREE.Mesh(sackGeo, burlapMat);
    sackL.position.set(-0.46, 0.98, -0.05);
    sackL.castShadow = true;
    this.group.add(sackL);

    const sackR = new THREE.Mesh(sackGeo, burlapMat);
    sackR.position.set(0.46, 0.98, -0.05);
    sackR.castShadow = true;
    this.group.add(sackR);

    // Strapped Trail Pickaxe on Left Flank
    const pickShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), darkWood);
    pickShaft.position.set(-0.62, 1.05, -0.05);
    pickShaft.rotation.x = Math.PI / 3;
    this.group.add(pickShaft);
    const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.42), ironMat);
    pickHead.position.set(-0.62, 1.35, 0.12);
    pickHead.rotation.x = Math.PI / 3;
    this.group.add(pickHead);

    // 4. Sturdy Legs (4 Joints with hooves)
    const createLeg = (x: number, z: number) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(x, 0.9, z);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.5, 6), dunMat);
      upper.position.y = -0.25;
      upper.castShadow = true;
      legPivot.add(upper);

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.45, 6), dunMat);
      lower.position.y = -0.65;
      lower.castShadow = true;
      legPivot.add(lower);

      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.1, 6), hoofMat);
      hoof.position.y = -0.9;
      legPivot.add(hoof);

      this.group.add(legPivot);
      return legPivot;
    };

    this.legFL = createLeg(-0.25, 0.42);
    this.legFR = createLeg(0.25, 0.42);
    this.legBL = createLeg(-0.25, -0.42);
    this.legBR = createLeg(0.25, -0.42);

    // 5. Tufted Donkey Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.92, -0.62);
    const tailRope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.55), dunMat);
    tailRope.position.y = -0.25;
    tailRope.rotation.x = -0.15;
    tailGroup.add(tailRope);

    const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0x2a241c }));
    tailTuft.position.set(0, -0.55, 0.05);
    tailTuft.rotation.x = Math.PI;
    tailGroup.add(tailTuft);
    this.group.add(tailGroup);
    this.tailGroup = tailGroup;
  }

  /**
   * Mountain Mustang Trail Pony
   * Rich chestnut sorrel coat, black mane/tail, tooled leather Western saddle, stirrups, blanket & reins
   */
  private buildPonyModel() {
    const horseCoat = new THREE.MeshStandardMaterial({ color: 0x783b1e, roughness: 0.72 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1c130d, roughness: 0.9 });
    const saddleLeather = new THREE.MeshStandardMaterial({ color: 0x3b2112, roughness: 0.65 });
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x942921, roughness: 0.9 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.5 });

    // 1. Sleek, Muscular Horse Body
    const bodyGeo = new THREE.CylinderGeometry(0.42, 0.46, 1.45, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, horseCoat);
    body.position.y = 1.15;
    body.castShadow = true;
    this.group.add(body);
    this.bodyMesh = body;

    // Navajo Pattern Saddle Blanket
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.85), blanketMat);
    blanket.position.set(0, 0.44, 0.05);
    body.add(blanket);

    // Western Leather Stock Saddle (High horn & cantle)
    const saddleSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.55, 8), saddleLeather);
    saddleSeat.rotateX(Math.PI / 2);
    saddleSeat.position.set(0, 0.48, 0.05);
    body.add(saddleSeat);

    // Saddle Horn
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.16, 6), brassMat);
    horn.position.set(0, 0.72, 0.25);
    horn.rotation.x = -0.2;
    body.add(horn);

    // Cantle (Backrest)
    const cantle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.06), saddleLeather);
    cantle.position.set(0, 0.68, -0.2);
    cantle.rotation.x = -0.3;
    body.add(cantle);

    // Stirrups Leather Straps & Brass Rings
    const stirrupL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 8), brassMat);
    stirrupL.position.set(-0.52, -0.15, 0.08);
    body.add(stirrupL);
    const stirrupR = stirrupL.clone();
    stirrupR.position.x = 0.52;
    body.add(stirrupR);

    // 2. Arched Neck & Expressive Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.82, 8), horseCoat);
    neck.position.set(0, 1.5, 0.65);
    neck.rotation.x = Math.PI / 3.8;
    neck.castShadow = true;
    this.group.add(neck);
    this.neckMesh = neck;

    // Flowing Black Mane
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.18), maneMat);
    mane.position.set(0, 1.62, 0.58);
    mane.rotation.x = Math.PI / 3.8;
    this.group.add(mane);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.82, 0.95);

    // Elegant Horse Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.55), horseCoat);
    head.castShadow = true;
    headGroup.add(head);

    // White Star Forehead Blaze
    const star = new THREE.Mesh(new THREE.CircleGeometry(0.05, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    star.position.set(0, 0.1, 0.28);
    star.rotation.x = -Math.PI / 4;
    headGroup.add(star);

    // Pointed Alert Ears
    const earGeo = new THREE.ConeGeometry(0.06, 0.24, 5);
    const earL = new THREE.Mesh(earGeo, horseCoat);
    earL.position.set(-0.1, 0.24, -0.12);
    earL.rotation.z = 0.15;
    earL.rotation.x = -0.2;
    headGroup.add(earL);
    this.earL = earL;

    const earR = new THREE.Mesh(earGeo, horseCoat);
    earR.position.set(0.1, 0.24, -0.12);
    earR.rotation.z = -0.15;
    earR.rotation.x = -0.2;
    headGroup.add(earR);
    this.earR = earR;

    // Bridle, Bit & Leather Reins
    const bridle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 12), saddleLeather);
    bridle.position.set(0, -0.02, 0.15);
    headGroup.add(bridle);

    this.group.add(headGroup);
    this.headGroup = headGroup;

    // 3. Slender, Powerful Legs
    const createLeg = (x: number, z: number) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(x, 1.1, z);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.6, 6), horseCoat);
      upper.position.y = -0.3;
      upper.castShadow = true;
      legPivot.add(upper);

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 6), horseCoat);
      lower.position.y = -0.8;
      lower.castShadow = true;
      legPivot.add(lower);

      // Black Hoof
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.12, 6), hoofMat);
      hoof.position.y = -1.1;
      legPivot.add(hoof);

      this.group.add(legPivot);
      return legPivot;
    };

    this.legFL = createLeg(-0.28, 0.5);
    this.legFR = createLeg(0.28, 0.5);
    this.legBL = createLeg(-0.28, -0.5);
    this.legBR = createLeg(0.28, -0.5);

    // 4. Flowing Horse Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.15, -0.75);
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.95, 6), maneMat);
    tailMesh.position.set(0, -0.45, -0.1);
    tailMesh.rotation.x = -0.22;
    tailGroup.add(tailMesh);
    this.group.add(tailGroup);
    this.tailGroup = tailGroup;
  }

  /**
   * Main per-frame update loop for mount locomotion, riding sync, and idle animations
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    isMoving: boolean,
    isSprinting: boolean,
    getTerrainHeight: (x: number, z: number) => number
  ) {
    if (!this.mountType || !this.group.visible) return;

    this.trotTimer += delta * (isSprinting ? 14.0 : 8.5);
    this.idleGrazingTimer += delta;
    this.brayTimer += delta;

    // Periodic ambient vocalization (burro bray or horse whinny every ~45 to 80 seconds)
    if (this.brayTimer > 55.0) {
      this.brayTimer = 0;
      if (this.mountType === 'burro') {
        soundEngine.playBurroBray();
      } else {
        soundEngine.playHorseWhinny();
      }
    }

    if (this.isRiding) {
      // 1. RIDDEN STATE: Mount sits directly under player, facing forward
      this.group.position.x = playerPos.x;
      this.group.position.z = playerPos.z;
      const groundY = getTerrainHeight(playerPos.x, playerPos.z);
      this.group.position.y = groundY;
      this.group.rotation.y = playerYaw;

      // Leg Trotting / Galloping Kinematics
      if (isMoving) {
        const swing = Math.sin(this.trotTimer) * (isSprinting ? 0.65 : 0.42);
        if (this.legFL) this.legFL.rotation.x = swing;
        if (this.legBR) this.legBR.rotation.x = swing;
        if (this.legFR) this.legFR.rotation.x = -swing;
        if (this.legBL) this.legBL.rotation.x = -swing;

        // Head bobbing with rhythmic stride
        if (this.headGroup) {
          this.headGroup.position.y = (this.mountType === 'burro' ? 1.52 : 1.82) + Math.sin(this.trotTimer * 2) * 0.04;
        }

        // Tail sway
        if (this.tailGroup) {
          this.tailGroup.rotation.z = Math.sin(this.trotTimer) * 0.25;
        }

        // Hoof Step Sound Dispatch
        this.hoofSoundTimer += delta;
        const hoofInterval = isSprinting ? 0.22 : 0.36;
        if (this.hoofSoundTimer >= hoofInterval) {
          this.hoofSoundTimer = 0;
          soundEngine.playHoofTrot(isSprinting);
        }
      } else {
        // Idle breathing in place
        this.resetLegs();
        const breathe = Math.sin(this.idleGrazingTimer * 2) * 0.02;
        if (this.headGroup) {
          this.headGroup.position.y = (this.mountType === 'burro' ? 1.52 : 1.82) + breathe;
        }
        if (this.tailGroup) {
          this.tailGroup.rotation.z = Math.sin(this.idleGrazingTimer * 1.5) * 0.12;
        }
      }
    } else {
      // 2. DISMOUNTED / COMPANION FOLLOWING STATE
      const dx = playerPos.x - this.group.position.x;
      const dz = playerPos.z - this.group.position.z;
      const distToPlayer = Math.hypot(dx, dz);

      // Follow distance: follow at ~3.2m behind the player
      const targetFollowDist = 3.2;

      if (distToPlayer > targetFollowDist) {
        // Trot toward player
        const moveSpeed = (distToPlayer > 8.0 ? 8.5 : 4.5) * delta;
        const angle = Math.atan2(dx, dz);
        this.group.rotation.y = angle;

        this.group.position.x += Math.sin(angle) * moveSpeed;
        this.group.position.z += Math.cos(angle) * moveSpeed;
        const groundY = getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = groundY;

        // Trot animation
        const swing = Math.sin(this.trotTimer) * 0.38;
        if (this.legFL) this.legFL.rotation.x = swing;
        if (this.legBR) this.legBR.rotation.x = swing;
        if (this.legFR) this.legFR.rotation.x = -swing;
        if (this.legBL) this.legBL.rotation.x = -swing;

        if (this.tailGroup) this.tailGroup.rotation.z = Math.sin(this.trotTimer) * 0.2;
      } else {
        // Standing nearby: gentle grazing & ear twitches
        this.resetLegs();
        const groundY = getTerrainHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = groundY;

        // Grazing cycle (every ~8 seconds lowers head to graze on desert scrub)
        const grazeCycle = Math.sin(this.idleGrazingTimer * 0.4);
        if (grazeCycle > 0.4) {
          if (this.headGroup) {
            this.headGroup.position.y = (this.mountType === 'burro' ? 0.95 : 1.15);
            this.headGroup.rotation.x = 0.55;
          }
        } else {
          if (this.headGroup) {
            this.headGroup.position.y = (this.mountType === 'burro' ? 1.52 : 1.82);
            this.headGroup.rotation.x = 0;
          }
        }

        // Gentle ear twitches
        if (this.earL) this.earL.rotation.z = 0.25 + Math.sin(this.idleGrazingTimer * 3.5) * 0.15;
        if (this.earR) this.earR.rotation.z = -0.25 + Math.cos(this.idleGrazingTimer * 3.0) * 0.15;
        if (this.tailGroup) this.tailGroup.rotation.z = Math.sin(this.idleGrazingTimer * 1.8) * 0.18;
      }
    }
  }

  private resetLegs() {
    if (this.legFL) this.legFL.rotation.x = 0;
    if (this.legFR) this.legFR.rotation.x = 0;
    if (this.legBL) this.legBL.rotation.x = 0;
    if (this.legBR) this.legBR.rotation.x = 0;
  }

  /**
   * Toggles mounting / dismounting
   */
  public toggleMount(): boolean {
    if (!this.mountType) return false;
    this.isRiding = !this.isRiding;
    soundEngine.playMountSaddle();
    if (this.isRiding) {
      if (this.mountType === 'burro') {
        soundEngine.playBurroBray();
      } else {
        soundEngine.playHorseWhinny();
      }
    }
    return this.isRiding;
  }

  /**
   * Distance between player and mount in world space
   */
  public getDistanceToPlayer(playerPos: THREE.Vector3): number {
    return this.group.position.distanceTo(playerPos);
  }

  public dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
