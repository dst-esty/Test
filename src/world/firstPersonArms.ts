import * as THREE from 'three';

export interface FirstPersonArmsOptions {
  outfitColor?: number | string;
}

export interface FPArmsUpdateParams {
  delta: number;
  tool: string;
  isAiming: boolean;
  isMoving: boolean;
  isSprinting: boolean;
  isSwinging: boolean;
  swingProgress: number; // 0 to 1
  recoil: number; // 0 to 1
  carriedRock: boolean;
  restingOnBarrier?: boolean;
}

export class FirstPersonArmsRig {
  public root: THREE.Group;

  // Arm sub-groups
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;

  // Meshes for color updates
  private leftSleeveMeshes: THREE.Mesh[] = [];
  private rightSleeveMeshes: THREE.Mesh[] = [];

  // Pointers to components for procedural kinematics
  private leftElbowPivot: THREE.Group;
  private leftWristPivot: THREE.Group;
  private rightElbowPivot: THREE.Group;
  private rightWristPivot: THREE.Group;

  // Stride / breathing timers
  private bobTimer: number = 0;
  private breathTimer: number = 0;

  constructor(options: FirstPersonArmsOptions = {}) {
    this.root = new THREE.Group();
    this.root.name = 'FirstPersonArmsRig';

    const sleeveColor = options.outfitColor ? new THREE.Color(options.outfitColor) : new THREE.Color(0x5a3c22);
    const cuffColor = new THREE.Color(0x3a2214);
    const gloveColor = new THREE.Color(0x2d1c10);
    const brassColor = new THREE.Color(0xd4af37);

    // Shared materials
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: sleeveColor,
      roughness: 0.85,
      metalness: 0.05,
    });

    const cuffMat = new THREE.MeshStandardMaterial({
      color: cuffColor,
      roughness: 0.75,
      metalness: 0.1,
    });

    const gloveMat = new THREE.MeshStandardMaterial({
      color: gloveColor,
      roughness: 0.7,
      metalness: 0.15,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: brassColor,
      roughness: 0.35,
      metalness: 0.85,
    });

    // ==========================================
    // 1. LEFT ARM & GLOVED HAND
    // ==========================================
    this.leftArm = new THREE.Group();
    this.leftArm.name = 'LeftArm';
    // Starting shoulder/bicep position coming from lower-left of screen
    this.leftArm.position.set(-0.28, -0.36, -0.22);
    this.leftArm.rotation.set(0.35, 0.45, -0.25);

    // Left Upper Arm (Bicep/Tricep)
    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.054, 0.28, 8),
      sleeveMat
    );
    leftUpperArm.position.set(0, -0.12, 0);
    this.leftSleeveMeshes.push(leftUpperArm);
    this.leftArm.add(leftUpperArm);

    // Left Elbow Pivot
    this.leftElbowPivot = new THREE.Group();
    this.leftElbowPivot.position.set(0, -0.24, 0);
    this.leftArm.add(this.leftElbowPivot);

    // Left Forearm
    const leftForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.046, 0.26, 8),
      sleeveMat
    );
    leftForearm.position.set(0, -0.11, 0);
    this.leftSleeveMeshes.push(leftForearm);
    this.leftElbowPivot.add(leftForearm);

    // Left Sleeve Cuff Band
    const leftCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.047, 0.048, 0.04, 8),
      cuffMat
    );
    leftCuff.position.set(0, -0.22, 0);
    this.leftElbowPivot.add(leftCuff);

    // Left Cuff Brass Button
    const leftButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.006, 6),
      brassMat
    );
    leftButton.rotation.z = Math.PI / 2;
    leftButton.position.set(0.048, -0.22, 0);
    this.leftElbowPivot.add(leftButton);

    // Left Wrist Pivot
    this.leftWristPivot = new THREE.Group();
    this.leftWristPivot.position.set(0, -0.25, 0);
    this.leftElbowPivot.add(this.leftWristPivot);

    // Left Hand Palm (Oiled Leather Work Glove)
    const leftPalm = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.075, 0.038),
      gloveMat
    );
    leftPalm.position.set(0, -0.035, 0);
    this.leftWristPivot.add(leftPalm);

    // Left Glove Thumb
    const leftThumb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.015, 0.05, 6),
      gloveMat
    );
    leftThumb.position.set(0.034, -0.025, 0.012);
    leftThumb.rotation.z = -0.65;
    leftThumb.rotation.x = 0.45;
    this.leftWristPivot.add(leftThumb);

    // Left Glove Curled Fingers (supporting under rifle stock)
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.012, 0.055, 6),
        gloveMat
      );
      finger.position.set(-0.022 + f * 0.015, -0.072, 0.01);
      finger.rotation.x = 0.75;
      this.leftWristPivot.add(finger);
    }

    this.root.add(this.leftArm);

    // ==========================================
    // 2. RIGHT ARM & GLOVED HAND
    // ==========================================
    this.rightArm = new THREE.Group();
    this.rightArm.name = 'RightArm';
    // Starting shoulder/bicep position coming from lower-right of screen
    this.rightArm.position.set(0.32, -0.36, -0.2);
    this.rightArm.rotation.set(0.4, -0.4, 0.2);

    // Right Upper Arm
    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.054, 0.28, 8),
      sleeveMat
    );
    rightUpperArm.position.set(0, -0.12, 0);
    this.rightSleeveMeshes.push(rightUpperArm);
    this.rightArm.add(rightUpperArm);

    // Right Elbow Pivot
    this.rightElbowPivot = new THREE.Group();
    this.rightElbowPivot.position.set(0, -0.24, 0);
    this.rightArm.add(this.rightElbowPivot);

    // Right Forearm
    const rightForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.046, 0.26, 8),
      sleeveMat
    );
    rightForearm.position.set(0, -0.11, 0);
    this.rightSleeveMeshes.push(rightForearm);
    this.rightElbowPivot.add(rightForearm);

    // Right Sleeve Cuff Band
    const rightCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.047, 0.048, 0.04, 8),
      cuffMat
    );
    rightCuff.position.set(0, -0.22, 0);
    this.rightElbowPivot.add(rightCuff);

    // Right Cuff Brass Button
    const rightButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.006, 6),
      brassMat
    );
    rightButton.rotation.z = -Math.PI / 2;
    rightButton.position.set(-0.048, -0.22, 0);
    this.rightElbowPivot.add(rightButton);

    // Right Wrist Pivot
    this.rightWristPivot = new THREE.Group();
    this.rightWristPivot.position.set(0, -0.25, 0);
    this.rightElbowPivot.add(this.rightWristPivot);

    // Right Hand Palm (Oiled Leather Work Glove)
    const rightPalm = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.075, 0.038),
      gloveMat
    );
    rightPalm.position.set(0, -0.035, 0);
    this.rightWristPivot.add(rightPalm);

    // Right Glove Thumb (curled over wrist grip)
    const rightThumb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.015, 0.05, 6),
      gloveMat
    );
    rightThumb.position.set(-0.034, -0.025, 0.012);
    rightThumb.rotation.z = 0.65;
    rightThumb.rotation.x = 0.45;
    this.rightWristPivot.add(rightThumb);

    // Right Glove Index Finger (on trigger)
    const triggerFinger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.011, 0.052, 6),
      gloveMat
    );
    triggerFinger.position.set(-0.02, -0.07, 0.016);
    triggerFinger.rotation.x = 0.95;
    this.rightWristPivot.add(triggerFinger);

    // Other 3 Fingers (gripping lever loop)
    for (let f = 1; f < 4; f++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.012, 0.052, 6),
        gloveMat
      );
      finger.position.set(-0.02 + f * 0.014, -0.072, 0.008);
      finger.rotation.x = 1.15;
      this.rightWristPivot.add(finger);
    }

    this.root.add(this.rightArm);
  }

  public setOutfitColor(color: number | string) {
    const c = new THREE.Color(color);
    for (const mesh of this.leftSleeveMeshes) {
      (mesh.material as THREE.MeshStandardMaterial).color.copy(c);
    }
    for (const mesh of this.rightSleeveMeshes) {
      (mesh.material as THREE.MeshStandardMaterial).color.copy(c);
    }
  }

  public update(params: FPArmsUpdateParams) {
    const {
      delta,
      tool,
      isAiming,
      isMoving,
      isSprinting,
      isSwinging,
      swingProgress,
      recoil,
      carriedRock,
      restingOnBarrier = false,
    } = params;

    // 1. Natural Breathing Sway
    this.breathTimer += delta * 2.2;
    const breatheY = Math.sin(this.breathTimer) * 0.005 * (restingOnBarrier ? 0.2 : isAiming ? 0.4 : 1.0);
    const breatheX = Math.cos(this.breathTimer * 0.5) * 0.003 * (restingOnBarrier ? 0.2 : isAiming ? 0.4 : 1.0);

    // 2. Walking / Sprinting Stride Sway
    let bobX = 0;
    let bobY = 0;
    if (isMoving) {
      const bobFreq = isSprinting ? 12.0 : 8.0;
      const bobAmp = isSprinting ? 0.022 : 0.012;
      this.bobTimer += delta * bobFreq;
      bobX = Math.cos(this.bobTimer * 0.5) * bobAmp;
      bobY = Math.abs(Math.sin(this.bobTimer)) * bobAmp;
    }

    // 3. Tool-Specific Poses
    if (carriedRock) {
      // Both arms wrapped around heavy boulder in front of chest
      this.leftArm.position.set(-0.22 + bobX + breatheX, -0.28 + bobY + breatheY, -0.32);
      this.leftArm.rotation.set(0.65, 0.45, -0.35);
      this.leftElbowPivot.rotation.set(-0.85, 0.2, 0.3);
      this.leftWristPivot.rotation.set(0.4, 0.2, -0.2);

      this.rightArm.position.set(0.22 + bobX + breatheX, -0.28 + bobY + breatheY, -0.32);
      this.rightArm.rotation.set(0.65, -0.45, 0.35);
      this.rightElbowPivot.rotation.set(-0.85, -0.2, -0.3);
      this.rightWristPivot.rotation.set(0.4, -0.2, 0.2);

      // Heave rock up/down if action pressed
      if (isSwinging && swingProgress > 0) {
        const heave = Math.sin(swingProgress * Math.PI);
        this.leftArm.position.y += heave * 0.12;
        this.rightArm.position.y += heave * 0.12;
      }
    } else if (tool === 'rifle') {
      if (isAiming) {
        // Shoulder Aiming / Scope Alignment
        // Bring rifle stock tight into right shoulder and cheek weld, left arm reaching forward supporting barrel
        const recoilKickY = recoil * 0.06;
        const recoilKickZ = recoil * 0.08;
        const recoilPitch = recoil * 0.25;

        // Left Arm: extended forward, holding under the octagonal barrel and fore-end
        this.leftArm.position.set(-0.16 + breatheX + bobX * 0.3, -0.22 + breatheY + bobY * 0.3 + recoilKickY, -0.38 + recoilKickZ);
        this.leftArm.rotation.set(0.65 - recoilPitch * 0.5, 0.38, -0.22);
        this.leftElbowPivot.rotation.set(-0.95, 0.32, 0.15);
        this.leftWristPivot.rotation.set(0.35, -0.1, 0.2);

        // Right Arm: tucked tightly against chest / shoulder socket
        this.rightArm.position.set(0.18 + breatheX + bobX * 0.3, -0.21 + breatheY + bobY * 0.3 + recoilKickY, -0.28 + recoilKickZ);
        this.rightArm.rotation.set(0.72 - recoilPitch, -0.32, 0.18);
        this.rightElbowPivot.rotation.set(-1.05, -0.25, -0.12);
        this.rightWristPivot.rotation.set(0.25, 0.15, -0.15);
      } else {
        // Low-Ready Frontier Hip Hold
        const recoilKickY = recoil * 0.05;
        const recoilKickZ = recoil * 0.09;
        const recoilPitch = recoil * 0.22;

        // Left Arm: holding wooden fore-end forward
        this.leftArm.position.set(-0.18 + breatheX + bobX, -0.28 + breatheY + bobY + recoilKickY, -0.42 + recoilKickZ);
        this.leftArm.rotation.set(0.48 - recoilPitch * 0.4, 0.42, -0.2);
        this.leftElbowPivot.rotation.set(-0.75, 0.28, 0.18);
        this.leftWristPivot.rotation.set(0.3, -0.1, 0.15);

        // Right Arm: hand on trigger guard & walnut wrist
        this.rightArm.position.set(0.25 + breatheX + bobX, -0.27 + breatheY + bobY + recoilKickY, -0.32 + recoilKickZ);
        this.rightArm.rotation.set(0.55 - recoilPitch * 0.8, -0.35, 0.16);
        this.rightElbowPivot.rotation.set(-0.85, -0.22, -0.1);
        this.rightWristPivot.rotation.set(0.28, 0.12, -0.12);
      }
    } else if (tool === 'pickaxe' || tool === 'shovel' || tool === 'axe') {
      const swing = isSwinging ? Math.sin(swingProgress * Math.PI) : 0;

      // Right Arm: grips the wooden tool handle and drives the strike
      this.rightArm.position.set(
        0.28 + bobX,
        -0.28 - swing * 0.22 + breatheY + bobY,
        -0.35 - swing * 0.15
      );
      this.rightArm.rotation.set(
        0.5 + swing * 0.85,
        -0.25,
        0.15 - swing * 0.35
      );
      this.rightElbowPivot.rotation.set(-0.7 - swing * 0.4, -0.15, 0);
      this.rightWristPivot.rotation.set(0.2 + swing * 0.4, 0, 0);

      // Left Arm: two-handed tool grip support or bracing
      this.leftArm.position.set(
        -0.12 + bobX,
        -0.34 - swing * 0.18 + breatheY + bobY,
        -0.38 - swing * 0.12
      );
      this.leftArm.rotation.set(
        0.45 + swing * 0.7,
        0.35,
        -0.2
      );
      this.leftElbowPivot.rotation.set(-0.65 - swing * 0.3, 0.2, 0);
      this.leftWristPivot.rotation.set(0.25 + swing * 0.35, 0, 0);
    } else {
      // Empty hands / binoculars / compass
      this.leftArm.position.set(-0.26 + bobX + breatheX, -0.38 + bobY + breatheY, -0.26);
      this.leftArm.rotation.set(0.3, 0.35, -0.2);
      this.leftElbowPivot.rotation.set(-0.4, 0.15, 0);
      this.leftWristPivot.rotation.set(0.1, 0, 0);

      this.rightArm.position.set(0.26 + bobX + breatheX, -0.38 + bobY + breatheY, -0.26);
      this.rightArm.rotation.set(0.3, -0.35, 0.2);
      this.rightElbowPivot.rotation.set(-0.4, -0.15, 0);
      this.rightWristPivot.rotation.set(0.1, 0, 0);
    }
  }

  public dispose() {
    this.root.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  }
}
