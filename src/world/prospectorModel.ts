import * as THREE from 'three';
import { createRifleModel } from './rifleModel';
import { characterTextures } from './characterTextures';

export interface ProspectorModelOptions {
  outfitColor?: string | number;
  pantColor?: string | number;
  hatColor?: string | number;
  skinTone?: string | number;
  scale?: number;
  showBackpack?: boolean;
}

export interface ProspectorAnimationParams {
  delta: number;
  isMoving: boolean;
  moveSpeed?: number;
  isRiding?: boolean;
  isAiming?: boolean;
  isSwinging?: boolean;
  swingProgress?: number;
  pitch?: number;
  carriedRock?: boolean;
  isDead?: boolean;
  isHunkered?: boolean;
}

/**
 * Procedural 3D Frontier Prospector Character Model & Animation Rig.
 * Features:
 * - Period-accurate 1880s Sonoran Desert prospector attire (slouch hat, duster coat, wild rag, beard, boots & spurs)
 * - Complete articulated skeleton rig (head, torso, dual arms with elbows/wrists, dual legs with knees/ankles)
 * - Integrated equipped tools (Winchester rifle with brass Malcolm scope, pickaxe, shovel, axe, lantern, dynamite, etc.)
 * - Procedural kinematics for walk/run locomotion, mining swings, rifle aiming, saddle riding, and idle breathing.
 */
export class ProspectorRig {
  public root: THREE.Group;
  public bodyGroup: THREE.Group;
  public headGroup: THREE.Group;
  public neckGroup: THREE.Group;
  public leftArmGroup: THREE.Group;
  public leftForearmGroup: THREE.Group;
  public rightArmGroup: THREE.Group;
  public rightForearmGroup: THREE.Group;
  public rightHandSocket: THREE.Group;
  public leftLegGroup: THREE.Group;
  public leftShinGroup: THREE.Group;
  public rightLegGroup: THREE.Group;
  public rightShinGroup: THREE.Group;
  public coatLeftTail: THREE.Mesh;
  public coatRightTail: THREE.Mesh;
  public backpackGroup: THREE.Group;

  // Tools
  public toolsGroup: THREE.Group;
  public pickaxeMesh: THREE.Group;
  public shovelMesh: THREE.Group;
  public axeMesh: THREE.Group;
  public rifleMesh: THREE.Group;
  public lanternMesh: THREE.Group;
  public dynamiteMesh: THREE.Group;
  public compassMesh: THREE.Group;
  public panMesh: THREE.Group;
  public rockMesh: THREE.Mesh;
  public activeToolName: string = 'hands';

  // Realistic facial and breathing nodes
  private leftEyelid?: THREE.Mesh;
  private rightEyelid?: THREE.Mesh;
  private chestMesh?: THREE.Mesh;
  private bandanaTail?: THREE.Mesh;
  private leftSpurWheel?: THREE.Group;
  private rightSpurWheel?: THREE.Group;
  private blinkTimer: number = 3.0;
  private isBlinking: boolean = false;
  private blinkDuration: number = 0.13;
  private currentBlinkTime: number = 0;

  // Materials to allow runtime recoloring
  private coatMaterial: THREE.MeshStandardMaterial;
  private vestMaterial: THREE.MeshStandardMaterial;
  private hatMaterial: THREE.MeshStandardMaterial;

  // Animation cycle tracking
  private walkTime: number = 0;
  private idleTime: number = 0;
  private swingTime: number = 0;

  constructor(options: ProspectorModelOptions = {}) {
    const {
      outfitColor = 0x6e4a2d,
      pantColor = 0x2c3545,
      hatColor = 0x241a14,
      skinTone = 0xdcb898,
      scale = 1.0,
      showBackpack = true,
    } = options;

    this.root = new THREE.Group();
    this.root.scale.set(scale, scale, scale);

    // --- Shared High-Fidelity PBR Materials ---
    this.coatMaterial = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.82,
      metalness: 0.05,
      bumpMap: characterTextures.getDenimBump(),
      bumpScale: 0.02,
    });
    this.vestMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2719,
      roughness: 0.65,
      metalness: 0.12,
      bumpMap: characterTextures.getLeatherBump(),
      bumpScale: 0.025,
    });
    this.hatMaterial = new THREE.MeshStandardMaterial({
      color: hatColor,
      roughness: 0.78,
      metalness: 0.04,
      bumpMap: characterTextures.getLeatherBump(),
      bumpScale: 0.02,
    });
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: skinTone,
      roughness: 0.62,
      metalness: 0.0,
      sheen: 0.45,
      sheenColor: new THREE.Color(0xffd2bd),
      clearcoat: 0.08,
      bumpMap: characterTextures.getSkinBump(),
      bumpScale: 0.012,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x3a2518,
      roughness: 0.95,
    });
    const bandanaMat = new THREE.MeshStandardMaterial({
      color: 0x9b2226,
      roughness: 0.72,
      map: characterTextures.getBandanaTexture(),
      bumpMap: characterTextures.getDenimBump(),
      bumpScale: 0.015,
    });
    const leatherBeltMat = new THREE.MeshStandardMaterial({
      color: 0x1f1610,
      roughness: 0.55,
      metalness: 0.15,
      bumpMap: characterTextures.getLeatherBump(),
      bumpScale: 0.035,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.22,
    });
    const pantMat = new THREE.MeshStandardMaterial({
      color: pantColor,
      roughness: 0.86,
      metalness: 0.04,
      bumpMap: characterTextures.getDenimBump(),
      bumpScale: 0.025,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x18120d,
      roughness: 0.55,
      metalness: 0.12,
      bumpMap: characterTextures.getLeatherBump(),
      bumpScale: 0.03,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x2d3136,
      metalness: 0.88,
      roughness: 0.32,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e431f,
      roughness: 0.72,
      bumpMap: characterTextures.getWoodGrain(),
      bumpScale: 0.035,
    });

    // Helper to configure cast/receive shadows on meshes
    const enableShadows = (mesh: THREE.Object3D) => {
      mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    };

    // --- Main Torso Body Group ---
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 0.88; // Center of pelvis
    this.root.add(this.bodyGroup);

    // Pelvis & Lower Torso
    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.18, 0.24),
      pantMat
    );
    pelvis.position.y = 0.04;
    this.bodyGroup.add(pelvis);

    // Leather Gun Belt & Holster
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.37, 0.08, 0.27),
      leatherBeltMat
    );
    belt.position.y = 0.1;
    this.bodyGroup.add(belt);

    // Brass Belt Buckle
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.025),
      brassMat
    );
    buckle.position.set(0, 0.1, 0.14);
    this.bodyGroup.add(buckle);

    // Right Hip Holster
    const holster = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.22, 0.08),
      leatherBeltMat
    );
    holster.position.set(0.2, 0.02, 0.04);
    holster.rotation.z = -0.12;
    this.bodyGroup.add(holster);

    // Holstered Frontier Revolver Sidearm
    const revolverGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.09, 0.05),
      woodMat
    );
    revolverGrip.position.set(0.2, 0.13, 0.04);
    revolverGrip.rotation.x = -0.25;
    this.bodyGroup.add(revolverGrip);

    const revolverHammer = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.025, 0.03),
      brassMat
    );
    revolverHammer.position.set(0.2, 0.165, 0.02);
    this.bodyGroup.add(revolverHammer);

    // Brass cartridge loops along back of gun belt
    for (let c = -2; c <= 2; c++) {
      const cartridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.045, 6),
        brassMat
      );
      cartridge.position.set(c * 0.042, 0.1, -0.14);
      this.bodyGroup.add(cartridge);
    }

    // Upper Torso / Vest & Shirt (Articulated with natural breathing cycle)
    this.chestMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.26),
      this.vestMaterial
    );
    this.chestMesh.position.y = 0.31;
    this.bodyGroup.add(this.chestMesh);

    // Collar / Open Shirt V-neck with cloth texture
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xdfd4c5,
      roughness: 0.82,
      bumpMap: characterTextures.getDenimBump(),
      bumpScale: 0.018,
    });
    const shirtV = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.02),
      shirtMat
    );
    shirtV.position.set(0, 0.36, 0.132);
    this.bodyGroup.add(shirtV);

    // Duster Coat Outer Lapels & Shoulders
    const coatChest = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.4, 0.28),
      this.coatMaterial
    );
    coatChest.position.y = 0.32;
    coatChest.scale.set(1.02, 1.0, 1.02);
    this.bodyGroup.add(coatChest);

    // Duster Shoulder Cape / Mantle (characteristic western duster storm flap)
    const mantle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.29, 0.12, 12, 1, false, 0, Math.PI * 2),
      this.coatMaterial
    );
    mantle.position.set(0, 0.48, 0);
    mantle.scale.set(1.08, 1.0, 0.82);
    this.bodyGroup.add(mantle);

    // Front Vest Buttons (Tiny brass studs)
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8),
        brassMat
      );
      button.rotation.x = Math.PI / 2;
      button.position.set(0, 0.22 + i * 0.08, 0.146);
      this.bodyGroup.add(button);
    }

    // Split Duster Coat Tails (hanging down behind legs)
    const tailGeo = new THREE.PlaneGeometry(0.19, 0.48);
    this.coatLeftTail = new THREE.Mesh(tailGeo, this.coatMaterial);
    this.coatLeftTail.position.set(-0.095, -0.15, -0.14);
    this.coatLeftTail.rotation.x = 0.08;
    this.bodyGroup.add(this.coatLeftTail);

    this.coatRightTail = new THREE.Mesh(tailGeo, this.coatMaterial);
    this.coatRightTail.position.set(0.095, -0.15, -0.14);
    this.coatRightTail.rotation.x = 0.08;
    this.bodyGroup.add(this.coatRightTail);

    // --- Neck & Head Group ---
    this.neckGroup = new THREE.Group();
    this.neckGroup.position.set(0, 0.52, 0);
    this.bodyGroup.add(this.neckGroup);

    // Wild Rag / Frontier Bandana Neckerchief
    const bandana = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.16, 0.11, 10),
      bandanaMat
    );
    bandana.position.y = 0.04;
    this.neckGroup.add(bandana);

    const bandanaKnot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.09, 0.06),
      bandanaMat
    );
    bandanaKnot.position.set(0, 0.01, 0.13);
    bandanaKnot.rotation.x = 0.2;
    this.neckGroup.add(bandanaKnot);

    // Dangling triangular bandana tail with secondary wind flutter
    this.bandanaTail = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.16, 4),
      bandanaMat
    );
    this.bandanaTail.position.set(0, -0.08, 0.135);
    this.bandanaTail.rotation.x = 0.15;
    this.neckGroup.add(this.bandanaTail);

    // Head Group (Pivots with camera pitch)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.16, 0);
    this.neckGroup.add(this.headGroup);

    // Weathered Face & Cranium with Subsurface-Simulated Material
    const headMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.24, 0.22),
      skinMat
    );
    headMesh.position.set(0, 0.08, 0);
    this.headGroup.add(headMesh);

    // Brow Ridge & Weathered Forehead
    const browRidge = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.04, 0.06),
      skinMat
    );
    browRidge.position.set(0, 0.14, 0.11);
    this.headGroup.add(browRidge);

    // Sculpted Nose with bridge and nostrils
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.08, 0.06),
      skinMat
    );
    nose.position.set(0, 0.08, 0.135);
    this.headGroup.add(nose);

    // Sculpted High Frontier Cheekbones
    const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.03), skinMat);
    cheekL.position.set(-0.08, 0.07, 0.112);
    cheekL.rotation.y = 0.22;
    this.headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.03), skinMat);
    cheekR.position.set(0.08, 0.07, 0.112);
    cheekR.rotation.y = -0.22;
    this.headGroup.add(cheekR);

    // --- Highly Realistic Glossy Physical Eyes with Iris & Blink Eyelids ---
    const eyeMat = new THREE.MeshPhysicalMaterial({
      map: characterTextures.getEyeTexture(0x3f2a1a),
      roughness: 0.04,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
    });

    const eyeGeo = new THREE.SphereGeometry(0.022, 12, 12);
    eyeGeo.rotateY(Math.PI / 2); // align eye texture to face forward

    // Left Eyeball
    const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
    eyeLeft.position.set(-0.06, 0.11, 0.115);
    this.headGroup.add(eyeLeft);

    // Left Eyelid (Blusher / Eyelid that animates on natural blinks)
    this.leftEyelid = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.024, 0.016),
      skinMat
    );
    this.leftEyelid.position.set(-0.06, 0.12, 0.118);
    this.leftEyelid.scale.y = 0.01; // hidden/open by default
    this.headGroup.add(this.leftEyelid);

    // Right Eyeball
    const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
    eyeRight.position.set(0.06, 0.11, 0.115);
    this.headGroup.add(eyeRight);

    // Right Eyelid
    this.rightEyelid = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.024, 0.016),
      skinMat
    );
    this.rightEyelid.position.set(0.06, 0.12, 0.118);
    this.rightEyelid.scale.y = 0.01;
    this.headGroup.add(this.rightEyelid);

    // Bushy Eyebrows with character arch
    const browMat = new THREE.MeshStandardMaterial({ color: 0x362114, roughness: 0.95 });
    const browLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.03), browMat);
    browLeft.position.set(-0.06, 0.135, 0.125);
    browLeft.rotation.z = -0.08;
    const browRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.03), browMat);
    browRight.position.set(0.06, 0.135, 0.125);
    browRight.rotation.z = 0.08;
    this.headGroup.add(browLeft);
    this.headGroup.add(browRight);

    // Bushy Multi-layered Prospector Beard & Mustache
    const beard = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.22, 0.18),
      hairMat
    );
    beard.position.set(0, -0.04, 0.06);
    this.headGroup.add(beard);

    // Beard lower tapered point
    const beardTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.12, 0.14),
      hairMat
    );
    beardTip.position.set(0, -0.12, 0.05);
    this.headGroup.add(beardTip);

    // Swept Handlebar Mustache
    const mustacheCenter = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.055, 0.06),
      hairMat
    );
    mustacheCenter.position.set(0, 0.04, 0.13);
    this.headGroup.add(mustacheCenter);

    const mustacheWingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.045, 0.05),
      hairMat
    );
    mustacheWingL.position.set(-0.08, 0.03, 0.125);
    mustacheWingL.rotation.z = -0.22;
    this.headGroup.add(mustacheWingL);

    const mustacheWingR = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.045, 0.05),
      hairMat
    );
    mustacheWingR.position.set(0.08, 0.03, 0.125);
    mustacheWingR.rotation.z = 0.22;
    this.headGroup.add(mustacheWingR);

    // Ears
    const earLeft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.04), skinMat);
    earLeft.position.set(-0.12, 0.08, 0);
    const earRight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.04), skinMat);
    earRight.position.set(0.12, 0.08, 0);
    this.headGroup.add(earLeft);
    this.headGroup.add(earRight);

    // Sideburns / Hair Tuft
    const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.12), hairMat);
    hairSideL.position.set(-0.115, 0.12, -0.02);
    const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.12), hairMat);
    hairSideR.position.set(0.115, 0.12, -0.02);
    this.headGroup.add(hairSideL);
    this.headGroup.add(hairSideR);

    // --- Slouch Prospector Hat (Curved Brim & Pinched Crown with authentic tilt) ---
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.2, 0);
    hatGroup.rotation.x = 0.04; // Authentic low slouch tilt over eyes
    this.headGroup.add(hatGroup);

    // Oval Shaped Wide Brim
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.03, 14),
      this.hatMaterial
    );
    brim.scale.set(1.0, 1.0, 1.15); // Slightly elongated front-to-back
    hatGroup.add(brim);

    // Hat Band with Brass Buckle
    const hatBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.215, 0.04, 12),
      leatherBeltMat
    );
    hatBand.position.y = 0.035;
    hatGroup.add(hatBand);

    const hatConcho = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.015),
      brassMat
    );
    hatConcho.position.set(0.19, 0.035, 0);
    hatGroup.add(hatConcho);

    // Creased/Pinched Crown
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.21, 0.22, 12),
      this.hatMaterial
    );
    crown.position.set(0, 0.12, -0.01);
    crown.scale.set(0.9, 1.0, 1.08);
    hatGroup.add(crown);

    // Crown Crease Dent
    const crease = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.06, 0.22),
      this.hatMaterial
    );
    crease.position.set(0, 0.21, -0.01);
    hatGroup.add(crease);

    // --- Rugged Canvas Rucksack / Backpack & Bedroll ---
    this.backpackGroup = new THREE.Group();
    this.backpackGroup.position.set(0, 0.28, -0.19);
    this.bodyGroup.add(this.backpackGroup);

    if (showBackpack) {
      const packMat = new THREE.MeshStandardMaterial({ color: 0x5a4835, roughness: 0.9 });
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.22), packMat);
      this.backpackGroup.add(pack);

      // Wool Bedroll Blanket strapped on top
      const bedrollMat = new THREE.MeshStandardMaterial({ color: 0x485338, roughness: 0.95 });
      const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 8), bedrollMat);
      bedroll.rotation.z = Math.PI / 2;
      bedroll.position.set(0, 0.24, 0);
      this.backpackGroup.add(bedroll);

      // Bedroll leather straps
      const strap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.025, 8), leatherBeltMat);
      strap1.rotation.z = Math.PI / 2;
      strap1.position.set(-0.13, 0.24, 0);
      const strap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.025, 8), leatherBeltMat);
      strap2.rotation.z = Math.PI / 2;
      strap2.position.set(0.13, 0.24, 0);
      this.backpackGroup.add(strap1);
      this.backpackGroup.add(strap2);

      // Gold Prospecting Pan strapped to side
      const panMat = new THREE.MeshStandardMaterial({ color: 0x454b52, metalness: 0.7, roughness: 0.4 });
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.04, 12), panMat);
      pan.rotation.z = Math.PI / 2;
      pan.position.set(-0.2, 0, 0.02);
      this.backpackGroup.add(pan);

      // Frontier Canteen flask slung on other side
      const canteen = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10), panMat);
      canteen.position.set(0.2, -0.05, 0);
      this.backpackGroup.add(canteen);
    }

    // --- Left Arm (Shoulder -> Upper Arm -> Forearm -> Hand) ---
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.25, 0.45, 0);
    this.bodyGroup.add(this.leftArmGroup);

    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.065, 0.28, 8),
      this.coatMaterial
    );
    leftUpperArm.position.y = -0.14;
    this.leftArmGroup.add(leftUpperArm);

    this.leftForearmGroup = new THREE.Group();
    this.leftForearmGroup.position.set(0, -0.28, 0);
    this.leftArmGroup.add(this.leftForearmGroup);

    const leftForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.055, 0.26, 8),
      this.coatMaterial
    );
    leftForearm.position.y = -0.13;
    this.leftForearmGroup.add(leftForearm);

    // Articulated Frontier Work Gloves Builder
    const buildGlove = (isRight: boolean) => {
      const glove = new THREE.Group();

      // Flared Wrist Gauntlet Cuff
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.062, 0.06, 8),
        leatherBeltMat
      );
      cuff.position.set(0, -0.22, 0);
      glove.add(cuff);

      // Main Hand / Palm Section
      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.072, 0.095, 0.082),
        leatherBeltMat
      );
      palm.position.set(0, -0.29, 0.01);
      glove.add(palm);

      // Angled Articulated Thumb
      const thumb = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.05, 0.034),
        leatherBeltMat
      );
      thumb.position.set(isRight ? -0.042 : 0.042, -0.27, 0.035);
      thumb.rotation.z = isRight ? 0.4 : -0.4;
      thumb.rotation.x = -0.25;
      glove.add(thumb);

      // Knuckle Guard Reinforcement
      const knuckle = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.02, 0.02),
        leatherBeltMat
      );
      knuckle.position.set(0, -0.28, 0.05);
      glove.add(knuckle);

      return glove;
    };

    // Leather Work Glove (Left)
    this.leftForearmGroup.add(buildGlove(false));

    // --- Right Arm (Shoulder -> Upper Arm -> Forearm -> Hand & Tool Socket) ---
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.25, 0.45, 0);
    this.bodyGroup.add(this.rightArmGroup);

    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.065, 0.28, 8),
      this.coatMaterial
    );
    rightUpperArm.position.y = -0.14;
    this.rightArmGroup.add(rightUpperArm);

    this.rightForearmGroup = new THREE.Group();
    this.rightForearmGroup.position.set(0, -0.28, 0);
    this.rightArmGroup.add(this.rightForearmGroup);

    const rightForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.055, 0.26, 8),
      this.coatMaterial
    );
    rightForearm.position.y = -0.13;
    this.rightForearmGroup.add(rightForearm);

    // Leather Work Glove (Right)
    this.rightForearmGroup.add(buildGlove(true));

    // Right Hand Tool Mount Socket
    this.rightHandSocket = new THREE.Group();
    this.rightHandSocket.position.set(0, -0.32, 0.02);
    this.rightForearmGroup.add(this.rightHandSocket);

    // Helper to construct realistic 8-point rotating brass star spur
    const createStarSpur = () => {
      const spurGroup = new THREE.Group();
      // Curved heel heel-band shank
      const shank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.018, 8, 1, false, -Math.PI / 2, Math.PI),
        brassMat
      );
      shank.position.set(0, 0, 0.03);
      spurGroup.add(shank);

      // Star rowel wheel (rotates with movement)
      const wheelGroup = new THREE.Group();
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), brassMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      for (let p = 0; p < 8; p++) {
        const ray = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.032, 0.006), brassMat);
        ray.rotation.x = (p * Math.PI) / 4;
        wheelGroup.add(ray);
      }
      wheelGroup.position.set(0, 0, -0.04);
      spurGroup.add(wheelGroup);
      return { group: spurGroup, wheel: wheelGroup };
    };

    // --- Articulated Legs (Hips -> Thigh -> Knee -> Shin -> Boot with Spur) ---
    // Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.11, 0, 0);
    this.bodyGroup.add(this.leftLegGroup);

    const leftThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.08, 0.42, 8),
      pantMat
    );
    leftThigh.position.y = -0.21;
    this.leftLegGroup.add(leftThigh);

    this.leftShinGroup = new THREE.Group();
    this.leftShinGroup.position.set(0, -0.42, 0);
    this.leftLegGroup.add(this.leftShinGroup);

    const leftShin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.075, 0.36, 8),
      pantMat
    );
    leftShin.position.y = -0.18;
    this.leftShinGroup.add(leftShin);

    // Denim pant cuff rolled over boot
    const leftPantCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.085, 0.06, 8),
      pantMat
    );
    leftPantCuff.position.y = -0.32;
    this.leftShinGroup.add(leftPantCuff);

    // Left Cowboy Boot with Heel and Brass Spur
    const leftBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, 0.23),
      bootMat
    );
    leftBoot.position.set(0, -0.38, 0.04);
    this.leftShinGroup.add(leftBoot);

    const leftHeel = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.05, 0.08),
      bootMat
    );
    leftHeel.position.set(0, -0.44, -0.04);
    this.leftShinGroup.add(leftHeel);

    const leftSpurData = createStarSpur();
    leftSpurData.group.position.set(0, -0.42, -0.08);
    this.leftShinGroup.add(leftSpurData.group);
    this.leftSpurWheel = leftSpurData.wheel;

    // Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.11, 0, 0);
    this.bodyGroup.add(this.rightLegGroup);

    const rightThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.08, 0.42, 8),
      pantMat
    );
    rightThigh.position.y = -0.21;
    this.rightLegGroup.add(rightThigh);

    this.rightShinGroup = new THREE.Group();
    this.rightShinGroup.position.set(0, -0.42, 0);
    this.rightLegGroup.add(this.rightShinGroup);

    const rightShin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.075, 0.36, 8),
      pantMat
    );
    rightShin.position.y = -0.18;
    this.rightShinGroup.add(rightShin);

    // Denim pant cuff rolled over boot
    const rightPantCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.085, 0.06, 8),
      pantMat
    );
    rightPantCuff.position.y = -0.32;
    this.rightShinGroup.add(rightPantCuff);

    // Right Cowboy Boot with Heel and Brass Spur
    const rightBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, 0.23),
      bootMat
    );
    rightBoot.position.set(0, -0.38, 0.04);
    this.rightShinGroup.add(rightBoot);

    const rightHeel = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.05, 0.08),
      bootMat
    );
    rightHeel.position.set(0, -0.44, -0.04);
    this.rightShinGroup.add(rightHeel);

    const rightSpurData = createStarSpur();
    rightSpurData.group.position.set(0, -0.42, -0.08);
    this.rightShinGroup.add(rightSpurData.group);
    this.rightSpurWheel = rightSpurData.wheel;

    // --- Build 3D Equipped Tools ---
    this.toolsGroup = new THREE.Group();
    this.rightHandSocket.add(this.toolsGroup);

    // 1. Pickaxe
    this.pickaxeMesh = new THREE.Group();
    const pickHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.82, 8),
      woodMat
    );
    pickHandle.position.y = 0.15;
    this.pickaxeMesh.add(pickHandle);

    const pickHead1 = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.32, 4), ironMat);
    pickHead1.position.set(0, 0.52, 0.16);
    pickHead1.rotation.x = Math.PI / 2;
    const pickHead2 = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.32, 4), ironMat);
    pickHead2.position.set(0, 0.52, -0.16);
    pickHead2.rotation.x = -Math.PI / 2;
    this.pickaxeMesh.add(pickHead1);
    this.pickaxeMesh.add(pickHead2);
    this.pickaxeMesh.rotation.x = -Math.PI / 3;
    this.pickaxeMesh.visible = false;
    this.toolsGroup.add(this.pickaxeMesh);

    // 2. Shovel
    this.shovelMesh = new THREE.Group();
    const shovelHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.9, 8),
      woodMat
    );
    shovelHandle.position.y = 0.15;
    this.shovelMesh.add(shovelHandle);

    const shovelBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.32, 0.02),
      ironMat
    );
    shovelBlade.position.set(0, 0.55, 0);
    this.shovelMesh.add(shovelBlade);
    this.shovelMesh.rotation.x = -Math.PI / 3;
    this.shovelMesh.visible = false;
    this.toolsGroup.add(this.shovelMesh);

    // 3. Felling Axe
    this.axeMesh = new THREE.Group();
    const axeHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 0.8, 8),
      woodMat
    );
    axeHandle.position.y = 0.15;
    this.axeMesh.add(axeHandle);

    const axeBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.18, 0.22),
      ironMat
    );
    axeBlade.position.set(0, 0.5, 0.08);
    this.axeMesh.add(axeBlade);
    this.axeMesh.rotation.x = -Math.PI / 3;
    this.axeMesh.visible = false;
    this.toolsGroup.add(this.axeMesh);

    // 4. Winchester 1873 Repeater Rifle with Vintage Brass Malcolm Scope
    this.rifleMesh = createRifleModel({ withScope: true, scale: 0.9 });
    this.rifleMesh.position.set(0.04, 0.05, 0.12);
    this.rifleMesh.rotation.set(-Math.PI / 4, 0.08, 0);
    this.rifleMesh.visible = false;
    this.toolsGroup.add(this.rifleMesh);

    // 5. Vintage Brass Kerosene Lantern with warm glass glow
    this.lanternMesh = new THREE.Group();
    const lanternBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.06, 10),
      brassMat
    );
    this.lanternMesh.add(lanternBase);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffe8a3,
      emissive: 0xffaa33,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const lanternGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10),
      glassMat
    );
    lanternGlass.position.y = 0.11;
    this.lanternMesh.add(lanternGlass);

    const lanternTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.08, 0.06, 10),
      brassMat
    );
    lanternTop.position.y = 0.22;
    this.lanternMesh.add(lanternTop);
    this.lanternMesh.position.set(0, -0.15, 0.1);
    this.lanternMesh.visible = false;
    this.toolsGroup.add(this.lanternMesh);

    // 6. Nitro Dynamite Stick
    this.dynamiteMesh = new THREE.Group();
    const tntMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
    const tntStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.26, 8),
      tntMat
    );
    this.dynamiteMesh.add(tntStick);
    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.08, 4),
      new THREE.MeshStandardMaterial({ color: 0x221105 })
    );
    wick.position.set(0, 0.16, 0);
    this.dynamiteMesh.add(wick);
    this.dynamiteMesh.rotation.x = -Math.PI / 4;
    this.dynamiteMesh.visible = false;
    this.toolsGroup.add(this.dynamiteMesh);

    // 7. Field Brass Compass
    this.compassMesh = new THREE.Group();
    const compCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.025, 12),
      brassMat
    );
    this.compassMesh.add(compCase);
    this.compassMesh.position.set(0, 0.05, 0.15);
    this.compassMesh.visible = false;
    this.toolsGroup.add(this.compassMesh);

    // 8. Heavy Lifted Boulder / Ore Chunk (Centered in front of body)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7c7365,
      roughness: 0.95,
    });
    this.rockMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24, 0),
      rockMat
    );
    this.rockMesh.position.set(0, 0.35, 0.35);
    this.rockMesh.visible = false;
    this.bodyGroup.add(this.rockMesh);

    // 9. Steel Gold Pan
    this.panMesh = new THREE.Group();
    const panMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.65,
      metalness: 0.7,
    });
    const panBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.03, 14), panMat);
    this.panMesh.add(panBase);
    const panRim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.04, 14), panMat);
    panRim.position.y = 0.02;
    this.panMesh.add(panRim);
    this.panMesh.rotation.x = -Math.PI / 4;
    this.panMesh.position.set(0, 0, 0.15);
    this.panMesh.visible = false;
    this.toolsGroup.add(this.panMesh);

    // Apply high-fidelity dynamic shadows to all character body parts, garments & tools
    enableShadows(this.root);
  }

  /**
   * Set outfit and duster coat color dynamically (e.g. for multiplayer player outfits)
   */
  public setOutfitColor(color: string | number): void {
    const c = new THREE.Color(color);
    this.coatMaterial.color.copy(c);
  }

  /**
   * Toggles visibility of equipped 3D hand tools & weapons
   */
  public setEquippedTool(toolName: string, isCarryingRock: boolean = false): void {
    this.activeToolName = toolName;
    this.pickaxeMesh.visible = toolName === 'pickaxe' && !isCarryingRock;
    this.shovelMesh.visible = toolName === 'shovel' && !isCarryingRock;
    this.axeMesh.visible = toolName === 'axe' && !isCarryingRock;
    this.rifleMesh.visible = toolName === 'rifle' && !isCarryingRock;
    this.lanternMesh.visible = toolName === 'lantern' && !isCarryingRock;
    this.dynamiteMesh.visible = toolName === 'dynamite' && !isCarryingRock;
    this.compassMesh.visible = (toolName === 'compass' || toolName === 'binoculars') && !isCarryingRock;
    this.panMesh.visible = (toolName === 'pan' || toolName === 'gold_pan') && !isCarryingRock;
    this.rockMesh.visible = isCarryingRock;
  }

  /**
   * Procedural Kinematics & Animation Engine
   * Dynamically coordinates walking strides, weapon aim, mining swings, mount riding, and idle breathing.
   */
  public updateAnimation(params: ProspectorAnimationParams): void {
    const {
      delta,
      isMoving,
      moveSpeed = 1.0,
      isRiding = false,
      isAiming = false,
      isSwinging = false,
      swingProgress = 0,
      pitch = 0,
      carriedRock = false,
      isDead = false,
    } = params;

    if (isDead) {
      // Fallen prospector pose
      this.root.rotation.z = Math.PI / 2;
      this.root.position.y = 0.2;
      return;
    } else {
      this.root.rotation.z = 0;
    }

    // --- Procedural Natural Eye Blinking ---
    this.blinkTimer -= delta;
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      this.currentBlinkTime = 0;
      this.blinkTimer = 2.4 + Math.random() * 3.6; // random interval 2.4s - 6s
    }

    if (this.isBlinking && this.leftEyelid && this.rightEyelid) {
      this.currentBlinkTime += delta;
      const progress = this.currentBlinkTime / this.blinkDuration;
      if (progress >= 1.0) {
        this.isBlinking = false;
        this.leftEyelid.scale.y = 0.01;
        this.rightEyelid.scale.y = 0.01;
      } else {
        const blinkAmount = Math.sin(progress * Math.PI);
        this.leftEyelid.scale.y = Math.max(0.01, blinkAmount * 1.0);
        this.rightEyelid.scale.y = Math.max(0.01, blinkAmount * 1.0);
      }
    }

    // --- Organic Chest Respiration Breathing ---
    if (this.chestMesh) {
      const respTime = isMoving ? this.walkTime * 0.35 : this.idleTime * 1.6;
      const breathExpand = Math.sin(respTime) * 0.022;
      this.chestMesh.scale.set(1.0 + breathExpand, 1.0 + breathExpand * 0.5, 1.0 + breathExpand * 1.4);
    }

    // --- Secondary Wild Rag Bandana Wind Flutter ---
    if (this.bandanaTail) {
      const windCycle = (this.walkTime || this.idleTime) * 4.0;
      const windFlutter = Math.sin(windCycle) * 0.12 + Math.cos(windCycle * 1.7) * 0.06;
      this.bandanaTail.rotation.x = 0.15 + (isMoving ? 0.35 : 0.05) + windFlutter;
      this.bandanaTail.rotation.z = Math.sin(windCycle * 0.8) * 0.08;
    }

    // Head Pitch (Looks up/down with player aim)
    this.headGroup.rotation.x = THREE.MathUtils.clamp(-pitch * 0.7, -0.6, 0.6);

    // --- 1. SADDLE RIDING POSE (When mounted on Horse or Burro) ---
    if (isRiding) {
      this.idleTime += delta * 2.5;
      const rideBob = Math.sin(this.idleTime) * 0.04;

      // Legs bend forward into stirrups and flare out to straddle animal flanks
      this.leftLegGroup.rotation.x = -Math.PI / 3 + rideBob * 0.3;
      this.leftLegGroup.rotation.z = 0.35;
      this.leftShinGroup.rotation.x = Math.PI / 2.5;

      this.rightLegGroup.rotation.x = -Math.PI / 3 - rideBob * 0.3;
      this.rightLegGroup.rotation.z = -0.35;
      this.rightShinGroup.rotation.x = Math.PI / 2.5;

      // Pelvis lowers slightly onto saddle
      this.bodyGroup.position.y = 0.82 + rideBob;
      this.bodyGroup.rotation.x = 0.06 + rideBob * 0.4;

      // Arms hold reins in front
      this.leftArmGroup.rotation.set(-0.6, 0, 0.25);
      this.leftForearmGroup.rotation.set(-0.8, 0, 0);

      if (!isAiming && !isSwinging) {
        this.rightArmGroup.rotation.set(-0.6, 0, -0.25);
        this.rightForearmGroup.rotation.set(-0.8, 0, 0);
      }
      return;
    }

    // --- 1b. HUNKERED / CROUCHED SURVIVAL COVER POSE ---
    if (params.isHunkered && !isRiding) {
      this.bodyGroup.position.y = 0.44;
      this.bodyGroup.rotation.set(0.32, 0, 0);
      this.leftLegGroup.rotation.set(-1.15, 0, 0.22);
      this.leftShinGroup.rotation.set(1.4, 0, 0);
      this.rightLegGroup.rotation.set(-1.15, 0, -0.22);
      this.rightShinGroup.rotation.set(1.4, 0, 0);
      if (!isAiming && !isSwinging && !carriedRock) {
        this.leftArmGroup.rotation.set(-0.5, 0, 0.2);
        this.leftForearmGroup.rotation.set(-0.8, 0, 0);
        this.rightArmGroup.rotation.set(-0.5, 0, -0.2);
        this.rightForearmGroup.rotation.set(-0.8, 0, 0);
      }
      return;
    }

    // --- 2. HEAVY OBJECT CARRYING POSE ---
    if (carriedRock) {
      this.rockMesh.visible = true;
      // Both arms wrapped around heavy boulder
      this.leftArmGroup.rotation.set(-0.85, 0.4, 0.3);
      this.leftForearmGroup.rotation.set(-0.7, 0, 0);
      this.rightArmGroup.rotation.set(-0.85, -0.4, -0.3);
      this.rightForearmGroup.rotation.set(-0.7, 0, 0);
    }

    // --- 3. LOCOMOTION & WALKING CYCLE ---
    if (isMoving) {
      const cycleSpeed = Math.max(0.8, moveSpeed) * 8.5;
      this.walkTime += delta * cycleSpeed;
      const stride = Math.sin(this.walkTime);
      const counterStride = Math.cos(this.walkTime);

      // Rotating star spurs as feet strike the ground
      if (this.leftSpurWheel && this.rightSpurWheel) {
        const spurSpin = delta * 12.0;
        this.leftSpurWheel.rotation.x += spurSpin;
        this.rightSpurWheel.rotation.x += spurSpin;
      }

      // Alternating Leg Swings
      this.leftLegGroup.rotation.x = stride * 0.55;
      this.leftLegGroup.rotation.z = 0;
      // Knee bends as leg swings back
      this.leftShinGroup.rotation.x = stride < 0 ? -stride * 0.6 : 0.05;

      this.rightLegGroup.rotation.x = -stride * 0.55;
      this.rightLegGroup.rotation.z = 0;
      this.rightShinGroup.rotation.x = stride > 0 ? stride * 0.6 : 0.05;

      // Subtle Vertical Pelvis Bobbing (Step impact frequency is 2x stride)
      const bounce = Math.abs(Math.sin(this.walkTime)) * 0.05;
      this.bodyGroup.position.y = 0.88 - bounce;
      this.bodyGroup.rotation.y = counterStride * 0.04;
      this.bodyGroup.rotation.z = stride * 0.02;

      // Duster coat tails flutter with momentum
      this.coatLeftTail.rotation.x = 0.12 - stride * 0.18;
      this.coatRightTail.rotation.x = 0.12 + stride * 0.18;

      // Arm counter-swing (when not aiming, swinging, or carrying)
      if (!carriedRock) {
        this.leftArmGroup.rotation.x = -stride * 0.45;
        this.leftArmGroup.rotation.z = 0.1;
        this.leftForearmGroup.rotation.x = -Math.abs(stride) * 0.2;

        if (!isAiming && !isSwinging) {
          this.rightArmGroup.rotation.x = stride * 0.45;
          this.rightArmGroup.rotation.z = -0.1;
          this.rightForearmGroup.rotation.x = -Math.abs(stride) * 0.2;
        }
      }
    } else {
      // Idle Breathing & Subtle Weight Shift
      this.idleTime += delta * 1.8;
      const breath = Math.sin(this.idleTime) * 0.015;
      const sway = Math.sin(this.idleTime * 0.8) * 0.012;
      this.bodyGroup.position.y = 0.88 + breath;
      this.bodyGroup.rotation.set(0, sway * 0.5, sway * 0.3);

      // Relaxed Legs
      this.leftLegGroup.rotation.set(0.04, 0, 0.04);
      this.leftShinGroup.rotation.set(0, 0, 0);
      this.rightLegGroup.rotation.set(-0.04, 0, -0.04);
      this.rightShinGroup.rotation.set(0, 0, 0);

      // Relaxed Coat Tails
      this.coatLeftTail.rotation.x = 0.06;
      this.coatRightTail.rotation.x = 0.06;

      if (!carriedRock) {
        // Natural arm hang
        this.leftArmGroup.rotation.set(0.08, 0, 0.12);
        this.leftForearmGroup.rotation.set(-0.15, 0, 0);

        if (!isAiming && !isSwinging) {
          this.rightArmGroup.rotation.set(0.08, 0, -0.12);
          this.rightForearmGroup.rotation.set(-0.15, 0, 0);
        }
      }
    }

    // --- 4. RIFLE AIMING POSE ---
    if (this.activeToolName === 'rifle' && isAiming && !carriedRock) {
      // Both arms raise rifle to shoulder level, sighting down the barrel
      this.rightArmGroup.rotation.set(-Math.PI / 2.2, 0.25, -0.2);
      this.rightForearmGroup.rotation.set(-0.4, 0, 0);

      this.leftArmGroup.rotation.set(-Math.PI / 2.4, -0.3, 0.35);
      this.leftForearmGroup.rotation.set(-0.9, 0.2, 0);

      // Slight head tilt onto cheek rest
      this.headGroup.rotation.z = -0.08;
    }

    // --- 5. TOOL ACTION / MINING SWING (Pickaxe / Shovel / Axe) ---
    if (isSwinging || swingProgress > 0) {
      const p = isSwinging ? (swingProgress > 0 ? swingProgress : 0.5) : swingProgress;
      // p goes from 1.0 (start of strike) down to 0 (recovery)
      // Raise arm high overhead, then slash downward
      const swingAngle = Math.sin(p * Math.PI);
      this.rightArmGroup.rotation.set(
        -Math.PI / 1.8 + (1 - swingAngle) * 0.9,
        0,
        -0.15
      );
      this.rightForearmGroup.rotation.set(-swingAngle * 0.8, 0, 0);

      // Torso leans into mining strike
      this.bodyGroup.rotation.x = (1 - p) * 0.15;
    }
  }

  /**
   * Cleanly disposes of geometries and materials to avoid WebGL memory leaks
   */
  public dispose(): void {
    this.coatMaterial.dispose();
    this.vestMaterial.dispose();
    this.hatMaterial.dispose();
  }
}

/**
 * Factory helper for quick instantiation of a prospector character model
 */
export function createProspectorCharacter(options: ProspectorModelOptions = {}): ProspectorRig {
  return new ProspectorRig(options);
}
