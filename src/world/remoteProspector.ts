import * as THREE from 'three';
import { MultiplayerPlayer } from '../types';
import { createProspectorCharacter, ProspectorRig } from './prospectorModel';
import { getTerrainHeight } from './terrain';

export class RemoteProspector {
  public id: string;
  public group: THREE.Group;
  public rig: ProspectorRig;

  // Dedicated procedural mount model for remote prospector
  public mountGroup: THREE.Group;
  private mountLegFL: THREE.Group;
  private mountLegFR: THREE.Group;
  private mountLegBL: THREE.Group;
  private mountLegBR: THREE.Group;
  private mountHeadGroup: THREE.Group;
  private mountTrotTimer: number = 0;

  private nameplateSprite: THREE.Sprite;
  private nameplateCanvas: HTMLCanvasElement;
  private nameplateCtx: CanvasRenderingContext2D;
  private nameplateTexture: THREE.CanvasTexture;
  private nameplateTimer: number = 0;

  public targetPos: THREE.Vector3;
  public targetYaw: number = 0;
  public targetPitch: number = 0;
  public targetAction: string = 'idle';
  public targetTool: string = 'pickaxe';
  public name: string = 'Prospector';
  public outfitColor: string = '#8c5932';
  public goldFound: number = 0;
  public health: number = 100;
  public isPardner: boolean = false;

  public isRiding: boolean = false;
  public isAiming: boolean = false;
  public carriedRock: boolean = false;
  public isHunkered: boolean = false;
  public currentActivity: string = 'idle';

  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  public lastUpdate: number = Date.now();

  constructor(player: MultiplayerPlayer) {
    this.id = player.id;
    this.name = player.name || 'Prospector';
    this.outfitColor = player.outfitColor || '#8c5932';
    this.goldFound = player.goldFound || 0;
    this.health = player.health || 100;
    this.targetPos = new THREE.Vector3(player.x, player.y, player.z);
    this.targetYaw = player.yaw || 0;
    this.targetPitch = player.pitch || 0;
    this.targetAction = player.action || 'idle';
    this.targetTool = player.activeTool || 'pickaxe';
    this.isRiding = Boolean(player.isRiding);
    this.isAiming = Boolean(player.isAiming);
    this.carriedRock = Boolean(player.carriedRock);
    this.isHunkered = Boolean(player.isHunkered);
    this.currentActivity = player.currentActivity || 'idle';

    this.group = new THREE.Group();
    // Plant boots firmly on the ground (always clamp to terrain height so avatars never sink underground)
    const terrainGroundY = getTerrainHeight(this.targetPos.x, this.targetPos.z);
    let initialGroundY = terrainGroundY;
    if (this.targetPos.y > terrainGroundY + 0.8) {
      initialGroundY = Math.max(terrainGroundY, this.targetPos.y - 1.7);
    }
    this.group.position.set(this.targetPos.x, initialGroundY, this.targetPos.z);
    this.group.rotation.y = this.targetYaw;

    // 1. Build the high-detail 3D prospector rig
    this.rig = createProspectorCharacter({
      outfitColor: this.outfitColor,
      showBackpack: true,
    });
    this.group.add(this.rig.root);

    // 2. Build procedural companion mount (Pony/Burro)
    this.mountGroup = new THREE.Group();
    const { mountGroup, legFL, legFR, legBL, legBR, headGroup } = this.buildProceduralMount();
    this.mountGroup = mountGroup;
    this.mountLegFL = legFL;
    this.mountLegFR = legFR;
    this.mountLegBL = legBL;
    this.mountLegBR = legBR;
    this.mountHeadGroup = headGroup;
    this.mountGroup.visible = this.isRiding;
    this.group.add(this.mountGroup);

    if (this.isRiding) {
      this.rig.root.position.y = 0.52; // Sits elevated in the saddle
    }

    // 3. Floating Nameplate Sprite with High-Contrast Canvas Rendering
    this.nameplateCanvas = document.createElement('canvas');
    this.nameplateCanvas.width = 440;
    this.nameplateCanvas.height = 140;
    this.nameplateCtx = this.nameplateCanvas.getContext('2d')!;
    this.nameplateTexture = new THREE.CanvasTexture(this.nameplateCanvas);
    this.nameplateTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.nameplateTexture,
      transparent: true,
      depthTest: false,
    });
    this.nameplateSprite = new THREE.Sprite(spriteMat);
    this.nameplateSprite.renderOrder = 9999;
    this.nameplateSprite.position.set(0, this.isRiding ? 2.85 : 2.4, 0);
    this.nameplateSprite.scale.set(3.2, 1.0, 1);
    this.group.add(this.nameplateSprite);

    this.updateNameplate(0);
    this.rig.setEquippedTool(this.targetTool);
  }

  private buildProceduralMount(): {
    mountGroup: THREE.Group;
    legFL: THREE.Group;
    legFR: THREE.Group;
    legBL: THREE.Group;
    legBR: THREE.Group;
    headGroup: THREE.Group;
  } {
    const mount = new THREE.Group();
    const dunMat = new THREE.MeshStandardMaterial({ color: 0x6e5238, roughness: 0.85 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x9c7a56, roughness: 0.9 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xdfd4c5, roughness: 0.92 });
    const saddleLeather = new THREE.MeshStandardMaterial({ color: 0x2e1c11, roughness: 0.72 });
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x8b251e, roughness: 0.88 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.5 });

    // Torso Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.18, 9), dunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.y = 0.92;
    barrel.castShadow = true;
    mount.add(barrel);

    // Belly underbelly
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 1.05, 8), bellyMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, -0.05, 0);
    barrel.add(belly);

    // Woven Saddle Blanket
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.78), blanketMat);
    blanket.position.set(0, 1.25, 0.02);
    mount.add(blanket);

    // High-back Western Stock Saddle
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.56), saddleLeather);
    saddle.position.set(0, 1.34, -0.02);
    mount.add(saddle);

    // Saddle Horn
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 8), saddleLeather);
    horn.position.set(0, 1.48, 0.22);
    horn.rotation.x = -0.15;
    mount.add(horn);

    // Stirrup straps
    const stirrupL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.06), saddleLeather);
    stirrupL.position.set(-0.35, 1.05, 0.04);
    mount.add(stirrupL);
    const stirrupR = stirrupL.clone();
    stirrupR.position.x = 0.35;
    mount.add(stirrupR);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.58, 8), dunMat);
    neck.position.set(0, 1.25, 0.52);
    neck.rotation.x = Math.PI / 4;
    mount.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.52, 0.78);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.42), dunMat);
    headGroup.add(skull);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.22), muzzleMat);
    muzzle.position.set(0, -0.05, 0.26);
    headGroup.add(muzzle);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.05, 0.18, 5);
    const earL = new THREE.Mesh(earGeo, dunMat);
    earL.position.set(-0.08, 0.2, -0.08);
    earL.rotation.z = -0.18;
    headGroup.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.08;
    earR.rotation.z = 0.18;
    headGroup.add(earR);
    mount.add(headGroup);

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.65, 6), saddleLeather);
    tail.position.set(0, 0.85, -0.65);
    tail.rotation.x = -0.35;
    mount.add(tail);

    // Legs with articulated pivots
    const createLeg = (x: number, z: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(x, 0.92, z);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.88, 7), dunMat);
      legMesh.position.y = -0.44;
      legGroup.add(legMesh);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.09, 7), hoofMat);
      hoof.position.y = -0.88;
      legGroup.add(hoof);
      mount.add(legGroup);
      return legGroup;
    };

    const legFL = createLeg(-0.22, 0.42);
    const legFR = createLeg(0.22, 0.42);
    const legBL = createLeg(-0.22, -0.42);
    const legBR = createLeg(0.22, -0.42);

    return { mountGroup: mount, legFL, legFR, legBL, legBR, headGroup };
  }

  public setProfile(name: string, outfitColor?: string) {
    if (name && typeof name === 'string') {
      this.name = name.trim();
    }
    if (outfitColor) {
      this.outfitColor = outfitColor;
      this.rig.setOutfitColor(outfitColor);
    }
    this.nameplateTimer = 1.0;
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
    this.rig.setEquippedTool(tool);
  }

  public triggerAction(action: string, tool?: string) {
    this.targetAction = action;
    if (tool) this.setTool(tool);
    if (action === 'dig' || action === 'pickaxe' || action === 'swing' || action === 'chop' || action === 'pan') {
      this.isSwinging = true;
      this.swingProgress = 1.0;
    }
  }

  public updateData(data: Partial<MultiplayerPlayer>) {
    const resolvedName = data.displayName || data.name;
    if (resolvedName && resolvedName !== this.name) {
      this.setProfile(resolvedName, data.outfitColor || this.outfitColor);
    } else if (data.outfitColor && data.outfitColor !== this.outfitColor) {
      this.setProfile(this.name, data.outfitColor);
    }
    if (typeof data.x === 'number' && typeof data.y === 'number' && typeof data.z === 'number') {
      this.targetPos.set(data.x, data.y, data.z);
    }
    if (typeof data.yaw === 'number') {
      this.targetYaw = data.yaw;
    }
    if (typeof data.pitch === 'number') {
      this.targetPitch = data.pitch;
    }
    if (data.action) {
      this.targetAction = data.action;
      if (data.action === 'dig' || data.action === 'pickaxe' || data.action === 'chop' || data.action === 'pan') {
        this.isSwinging = true;
        this.swingProgress = 1.0;
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
    if (typeof data.isRiding === 'boolean') {
      this.isRiding = data.isRiding;
    }
    if (typeof data.isAiming === 'boolean') {
      this.isAiming = data.isAiming;
    }
    if (typeof data.carriedRock === 'boolean') {
      this.carriedRock = data.carriedRock;
    }
    if (typeof data.isHunkered === 'boolean') {
      this.isHunkered = data.isHunkered;
    }
    if (data.currentActivity) {
      this.currentActivity = data.currentActivity;
    }
    this.lastUpdate = Date.now();
  }

  public updateNameplate(distanceToLocal: number) {
    const ctx = this.nameplateCtx;
    const canvas = this.nameplateCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rounded card background
    ctx.fillStyle = this.isPardner ? 'rgba(38, 26, 12, 0.94)' : 'rgba(18, 14, 11, 0.88)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(14, 10, canvas.width - 28, canvas.height - 20, 18);
    } else {
      const x = 14, y = 10, w = canvas.width - 28, h = canvas.height - 20, r = 18;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    ctx.fill();

    // Border with player outfit color or bright gold for pardners
    ctx.lineWidth = this.isPardner ? 5 : 3.5;
    ctx.strokeStyle = this.isPardner ? '#fbbf24' : this.outfitColor;
    ctx.stroke();

    // Online status icon
    if (this.isPardner) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 42, 46);
    } else {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(42, 46, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Name
    ctx.fillStyle = this.isPardner ? '#fef08a' : '#fef3c7';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, 62, 46);

    // Live Activity Tag
    let activityTag = 'Resting';
    if (this.isRiding) {
      activityTag = '🐎 Mounted Trail Ride';
    } else if (this.isHunkered) {
      activityTag = '🏕️ Hunkered Down';
    } else if (this.isAiming || (this.targetTool === 'rifle' && (this.targetAction === 'aim' || this.targetAction === 'shoot'))) {
      activityTag = '🎯 Aiming Rifle';
    } else if (this.isSwinging) {
      if (this.targetTool === 'pickaxe') activityTag = '⛏️ Mining Quartz';
      else if (this.targetTool === 'shovel') activityTag = '⛏️ Digging Ground';
      else if (this.targetTool === 'gold_pan') activityTag = '🪙 Panning Gold';
      else if (this.targetTool === 'axe') activityTag = '🪓 Chopping Timber';
      else activityTag = '⚒️ Working';
    } else if (this.carriedRock) {
      activityTag = '🪨 Hauling Ore';
    } else if (this.targetAction === 'run') {
      activityTag = '🏃 Sprinting';
    } else if (this.targetAction === 'walk') {
      activityTag = '🚶 Trekking';
    } else if (this.currentActivity && this.currentActivity !== 'idle') {
      activityTag = this.currentActivity;
    }

    // Subtitle: Activity • Distance • Gold
    ctx.fillStyle = this.isPardner ? '#fcd34d' : '#e2d5c3';
    ctx.font = 'bold 18px monospace';
    const distText = distanceToLocal > 0 ? `${Math.round(distanceToLocal)}m away` : 'Near';
    const goldText = `${this.goldFound.toFixed(1)} oz`;
    const pardnerPrefix = this.isPardner ? '🤝 PARDNER • ' : '';
    ctx.fillText(`${pardnerPrefix}${activityTag}  •  ${distText}  •  ${goldText}`, 42, 88);

    // Subtle Health Pip Bar at bottom of card
    const barWidth = canvas.width - 84;
    const hpRatio = THREE.MathUtils.clamp(this.health / 100, 0, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(42, 110, barWidth, 6);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(42, 110, barWidth * hpRatio, 6);

    this.nameplateTexture.needsUpdate = true;
  }

  public update(delta: number, localPlayerPos: THREE.Vector3) {
    // 1. Plant boots firmly on the ground (always clamp to terrain height so avatars never sink underground)
    const terrainGroundY = getTerrainHeight(this.targetPos.x, this.targetPos.z);
    let targetGroundY = terrainGroundY;
    if (this.targetPos.y > terrainGroundY + 0.8) {
      targetGroundY = Math.max(terrainGroundY, this.targetPos.y - 1.7);
    }
    const targetGroundPos = new THREE.Vector3(this.targetPos.x, targetGroundY, this.targetPos.z);
    const lerpFactor = Math.min(1.0, delta * 12);
    this.group.position.lerp(targetGroundPos, lerpFactor);

    // Shortest angular distance lerp for yaw
    let diffYaw = this.targetYaw - this.group.rotation.y;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    this.group.rotation.y += diffYaw * lerpFactor;

    // Distance to local player for nameplate & LOD
    const dist = this.group.position.distanceTo(localPlayerPos);
    
    // Dynamic distance scaling so nameplates are crisp and readable near and far
    const distScale = Math.max(3.2, Math.min(10.5, dist * 0.12));
    this.nameplateSprite.scale.set(distScale, distScale * 0.32, 1);
    this.nameplateSprite.position.set(0, (this.isRiding ? 2.9 : 2.4) + (distScale - 3.2) * 0.22, 0);

    this.nameplateTimer += delta;
    if (this.nameplateTimer > 0.25) {
      this.nameplateTimer = 0;
      this.updateNameplate(dist);
    }

    // Check if moving
    const speed = this.group.position.distanceTo(targetGroundPos);
    const isMoving = speed > 0.04 || this.targetAction === 'walk' || this.targetAction === 'run';
    const moveSpeed = this.targetAction === 'run' ? 1.5 : (isMoving ? 1.0 : 0);

    // Handle tool swing progress
    if (this.isSwinging) {
      this.swingProgress -= delta * 3.5;
      if (this.swingProgress <= 0) {
        this.isSwinging = false;
        this.swingProgress = 0;
      }
    }

    // Toggle and animate procedural mount
    this.mountGroup.visible = this.isRiding;
    if (this.isRiding) {
      this.rig.root.position.y = 0.52; // Sits in saddle
      this.nameplateSprite.position.set(0, 2.85, 0);

      if (isMoving) {
        this.mountTrotTimer += delta * (moveSpeed > 1.2 ? 14 : 9);
        const swing = Math.sin(this.mountTrotTimer) * 0.45;
        this.mountLegFL.rotation.x = swing;
        this.mountLegFR.rotation.x = -swing;
        this.mountLegBL.rotation.x = -swing;
        this.mountLegBR.rotation.x = swing;
        this.mountHeadGroup.rotation.x = Math.sin(this.mountTrotTimer * 0.5) * 0.1;
      } else {
        this.mountLegFL.rotation.x = 0;
        this.mountLegFR.rotation.x = 0;
        this.mountLegBL.rotation.x = 0;
        this.mountLegBR.rotation.x = 0;
      }
    } else {
      this.rig.root.position.y = 0;
      this.nameplateSprite.position.set(0, 2.4, 0);
    }

    // Drive procedural character animation rig
    this.rig.updateAnimation({
      delta,
      isMoving,
      moveSpeed,
      isRiding: this.isRiding,
      isAiming: this.isAiming || (this.targetTool === 'rifle' && (this.targetAction === 'aim' || this.targetAction === 'shoot')),
      isSwinging: this.isSwinging,
      swingProgress: this.swingProgress,
      pitch: this.targetPitch,
      carriedRock: this.carriedRock,
      isHunkered: this.isHunkered,
      isDead: this.health <= 0,
    });
  }

  public dispose() {
    this.nameplateTexture.dispose();
    this.rig.dispose();
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
  }
}
