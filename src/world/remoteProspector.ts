import * as THREE from 'three';
import { MultiplayerPlayer } from '../types';

export class RemoteProspector {
  public id: string;
  public group: THREE.Group;
  private coatMesh: THREE.Mesh;
  private rightArmGroup: THREE.Group;
  private leftLegGroup: THREE.Group;
  private rightLegGroup: THREE.Group;
  private pickaxeMesh: THREE.Group;
  private shovelMesh: THREE.Group;
  private dynamiteMesh: THREE.Mesh;
  private nameplateSprite: THREE.Sprite;
  private nameplateCanvas: HTMLCanvasElement;
  private nameplateCtx: CanvasRenderingContext2D;
  private nameplateTexture: THREE.CanvasTexture;

  public targetPos: THREE.Vector3;
  public targetYaw: number = 0;
  public targetAction: string = 'idle';
  public targetTool: string = 'pickaxe';
  public name: string = 'Prospector';
  public outfitColor: string = '#8c5932';
  public goldFound: number = 0;
  public health: number = 100;
  public isPardner: boolean = false;

  private walkCycleTime: number = 0;
  private swingCycleTime: number = 0;
  private isSwinging: boolean = false;
  private lastUpdate: number = Date.now();

  constructor(player: MultiplayerPlayer) {
    this.id = player.id;
    this.name = player.name;
    this.outfitColor = player.outfitColor || '#8c5932';
    this.goldFound = player.goldFound || 0;
    this.health = player.health || 100;
    this.targetPos = new THREE.Vector3(player.x, player.y, player.z);
    this.targetYaw = player.yaw || 0;
    this.targetAction = player.action || 'idle';
    this.targetTool = player.activeTool || 'pickaxe';

    this.group = new THREE.Group();
    this.group.position.copy(this.targetPos);
    this.group.rotation.y = this.targetYaw;

    // --- 1. Torso & Coat ---
    const coatColor = new THREE.Color(this.outfitColor);
    const coatMat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.coatMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8),
      coatMat
    );
    this.coatMesh.position.y = 0.9;
    this.group.add(this.coatMesh);

    // Belt and brass buckle
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x221811, roughness: 0.9 });
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.33, 0.08, 8), beltMat);
    belt.position.y = 0.52;
    this.group.add(belt);

    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.3 });
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.03), buckleMat);
    buckle.position.set(0, 0.52, 0.32);
    this.group.add(buckle);

    // --- 2. Head & Facial Features ---
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdcb898, roughness: 0.9 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), skinMat);
    head.position.y = 1.5;
    this.group.add(head);

    // Frontier Bandana / Scarf
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
    const scarf = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.1, 8), scarfMat);
    scarf.position.y = 1.37;
    this.group.add(scarf);

    // --- 3. Slouch Prospector Hat ---
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.9 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 10), hatMat);
    brim.position.y = 1.62;
    this.group.add(brim);

    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.22, 10), hatMat);
    hatCrown.position.y = 1.74;
    this.group.add(hatCrown);

    // Hat band
    const hatBandMat = new THREE.MeshStandardMaterial({ color: 0x5a3e2a, roughness: 0.8 });
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.05, 10), hatBandMat);
    hatBand.position.y = 1.66;
    this.group.add(hatBand);

    // --- 4. Prospector Backpack & Bedroll ---
    const packMat = new THREE.MeshStandardMaterial({ color: 0x755938, roughness: 0.9 });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), packMat);
    pack.position.set(0, 1.0, -0.3);
    this.group.add(pack);

    // Bedroll on top of pack
    const bedrollMat = new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.9 });
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.44, 8), bedrollMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 1.3, -0.3);
    this.group.add(bedroll);

    // --- 5. Legs ---
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x303642, roughness: 0.9 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1f1915, roughness: 0.8 });

    // Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.16, 0.5, 0);
    const leftPant = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.48, 6), pantMat);
    leftPant.position.y = -0.24;
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.18), bootMat);
    leftBoot.position.set(0, -0.45, 0.04);
    this.leftLegGroup.add(leftPant);
    this.leftLegGroup.add(leftBoot);
    this.group.add(this.leftLegGroup);

    // Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.16, 0.5, 0);
    const rightPant = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.48, 6), pantMat);
    rightPant.position.y = -0.24;
    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.18), bootMat);
    rightBoot.position.set(0, -0.45, 0.04);
    this.rightLegGroup.add(rightPant);
    this.rightLegGroup.add(rightBoot);
    this.group.add(this.rightLegGroup);

    // --- 6. Left Arm (Dangling/Stabilizing) ---
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.6, 6), coatMat);
    leftArm.position.set(-0.36, 1.0, 0);
    leftArm.rotation.z = 0.15;
    this.group.add(leftArm);

    // --- 7. Right Arm & Tool Rig ---
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.36, 1.25, 0);

    const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 6), coatMat);
    rightArmMesh.position.y = -0.25;
    this.rightArmGroup.add(rightArmMesh);

    // Pickaxe tool
    this.pickaxeMesh = this.createPickaxeModel();
    this.pickaxeMesh.position.set(0.05, -0.5, 0.25);
    this.pickaxeMesh.rotation.x = -Math.PI / 3;
    this.rightArmGroup.add(this.pickaxeMesh);

    // Shovel tool
    this.shovelMesh = this.createShovelModel();
    this.shovelMesh.position.set(0.05, -0.5, 0.25);
    this.shovelMesh.rotation.x = -Math.PI / 3;
    this.shovelMesh.visible = false;
    this.rightArmGroup.add(this.shovelMesh);

    // Dynamite tool
    const dynMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c });
    this.dynamiteMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), dynMat);
    this.dynamiteMesh.position.set(0.05, -0.45, 0.2);
    this.dynamiteMesh.visible = false;
    this.rightArmGroup.add(this.dynamiteMesh);

    this.group.add(this.rightArmGroup);

    // --- 8. Floating Nameplate Sprite ---
    this.nameplateCanvas = document.createElement('canvas');
    this.nameplateCanvas.width = 384;
    this.nameplateCanvas.height = 128;
    this.nameplateCtx = this.nameplateCanvas.getContext('2d')!;
    this.nameplateTexture = new THREE.CanvasTexture(this.nameplateCanvas);
    this.nameplateTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.nameplateTexture,
      transparent: true,
      depthTest: false,
    });
    this.nameplateSprite = new THREE.Sprite(spriteMat);
    this.nameplateSprite.position.set(0, 2.3, 0);
    this.nameplateSprite.scale.set(2.4, 0.8, 1);
    this.group.add(this.nameplateSprite);

    this.updateNameplate(0);
    this.updateToolVisibility();
  }

  private createPickaxeModel(): THREE.Group {
    const group = new THREE.Group();
    // Handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 8), handleMat);
    handle.position.y = 0.2;
    group.add(handle);

    // Iron Head
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.3 });
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), ironMat);
    head.position.set(0, 0.52, 0.12);
    head.rotation.x = Math.PI / 2;
    group.add(head);

    const headBack = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.24, 4), ironMat);
    headBack.position.set(0, 0.52, -0.1);
    headBack.rotation.x = -Math.PI / 2;
    group.add(headBack);

    return group;
  }

  private createShovelModel(): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e482b, roughness: 0.85 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), woodMat);
    handle.position.y = 0.25;
    group.add(handle);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x484e56, metalness: 0.8, roughness: 0.35 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), bladeMat);
    blade.position.set(0, 0.6, 0);
    group.add(blade);
    return group;
  }

  public setProfile(name: string, outfitColor: string) {
    this.name = name;
    this.outfitColor = outfitColor;
    const c = new THREE.Color(outfitColor);
    (this.coatMesh.material as THREE.MeshStandardMaterial).color.copy(c);
    this.updateNameplate(0);
  }

  public setPardnerStatus(isPardner: boolean) {
    if (this.isPardner !== isPardner) {
      this.isPardner = isPardner;
      this.updateNameplate(0);
    }
  }

  public setTool(tool: string) {
    this.targetTool = tool;
    this.updateToolVisibility();
  }

  private updateToolVisibility() {
    this.pickaxeMesh.visible = this.targetTool === 'pickaxe';
    this.shovelMesh.visible = this.targetTool === 'shovel';
    this.dynamiteMesh.visible = this.targetTool === 'dynamite';
  }

  public triggerAction(action: string, tool?: string) {
    this.targetAction = action;
    if (tool) this.setTool(tool);
    if (action === 'dig' || action === 'pickaxe' || action === 'swing') {
      this.isSwinging = true;
      this.swingCycleTime = 0;
    }
  }

  public updateData(data: Partial<MultiplayerPlayer>) {
    if (typeof data.x === 'number' && typeof data.y === 'number' && typeof data.z === 'number') {
      this.targetPos.set(data.x, data.y, data.z);
    }
    if (typeof data.yaw === 'number') {
      this.targetYaw = data.yaw;
    }
    if (data.action) {
      this.targetAction = data.action;
      if (data.action === 'dig' || data.action === 'pickaxe') {
        this.isSwinging = true;
      }
    }
    if (data.activeTool) {
      this.setTool(data.activeTool);
    }
    if (typeof data.goldFound === 'number') {
      this.goldFound = data.goldFound;
    }
    if (typeof data.health === 'number') {
      this.health = data.health;
    }
    this.lastUpdate = Date.now();
  }

  public updateNameplate(distanceToLocal: number) {
    const ctx = this.nameplateCtx;
    const canvas = this.nameplateCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rounded card background
    ctx.fillStyle = this.isPardner ? 'rgba(35, 24, 10, 0.92)' : 'rgba(18, 14, 11, 0.82)';
    ctx.beginPath();
    ctx.roundRect(16, 12, canvas.width - 32, canvas.height - 24, 18);
    ctx.fill();

    // Border with player outfit color or bright gold for pardners
    ctx.lineWidth = this.isPardner ? 6 : 4;
    ctx.strokeStyle = this.isPardner ? '#fbbf24' : this.outfitColor;
    ctx.stroke();

    // Online status dot (gold star for pardner, green dot for others)
    if (this.isPardner) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 44, 48);
    } else {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(44, 48, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Name
    ctx.fillStyle = this.isPardner ? '#fef08a' : '#fef3c7';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, 62, 48);

    // Distance and Gold badge
    ctx.fillStyle = this.isPardner ? '#f59e0b' : '#d97706';
    ctx.font = '20px monospace';
    const distText = distanceToLocal > 0 ? `${Math.round(distanceToLocal)}m away` : 'Near';
    const goldText = `${this.goldFound.toFixed(1)} oz Gold`;
    const pardnerBadge = this.isPardner ? '🤝 PARDNER  •  ' : '';
    ctx.fillText(`${pardnerBadge}${distText}  •  ${goldText}`, 44, 88);

    this.nameplateTexture.needsUpdate = true;
  }

  public update(delta: number, localPlayerPos: THREE.Vector3) {
    // 1. Smoothly interpolate position towards target
    const lerpFactor = Math.min(1.0, delta * 12);
    this.group.position.lerp(this.targetPos, lerpFactor);

    // Shortest angular distance lerp for yaw
    let diffYaw = this.targetYaw - this.group.rotation.y;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    this.group.rotation.y += diffYaw * lerpFactor;

    // Distance to local player for nameplate & LOD
    const dist = this.group.position.distanceTo(localPlayerPos);
    this.updateNameplate(dist);

    // Check if moving
    const speed = this.group.position.distanceTo(this.targetPos);
    const isMoving = speed > 0.04 || this.targetAction === 'walk' || this.targetAction === 'run';

    // 2. Leg walk animation
    if (isMoving) {
      this.walkCycleTime += delta * 9;
      const legAngle = Math.sin(this.walkCycleTime) * 0.45;
      this.leftLegGroup.rotation.x = legAngle;
      this.rightLegGroup.rotation.x = -legAngle;
    } else {
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, delta * 10);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, delta * 10);
    }

    // 3. Tool swing / dig animation
    if (this.isSwinging) {
      this.swingCycleTime += delta * 12;
      const swingAngle = Math.sin(this.swingCycleTime) * 1.2 - 0.4;
      this.rightArmGroup.rotation.x = swingAngle;
      if (this.swingCycleTime >= Math.PI) {
        this.isSwinging = false;
        this.rightArmGroup.rotation.x = 0;
      }
    } else if (isMoving) {
      this.rightArmGroup.rotation.x = -Math.sin(this.walkCycleTime) * 0.3;
    } else {
      this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, delta * 10);
    }
  }

  public dispose() {
    this.nameplateTexture.dispose();
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
  }
}
