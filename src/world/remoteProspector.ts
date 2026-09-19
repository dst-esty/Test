import * as THREE from 'three';
import { MultiplayerPlayer } from '../types';
import { createProspectorCharacter, ProspectorRig } from './prospectorModel';

export class RemoteProspector {
  public id: string;
  public group: THREE.Group;
  public rig: ProspectorRig;

  private nameplateSprite: THREE.Sprite;
  private nameplateCanvas: HTMLCanvasElement;
  private nameplateCtx: CanvasRenderingContext2D;
  private nameplateTexture: THREE.CanvasTexture;

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

  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  public lastUpdate: number = Date.now();

  constructor(player: MultiplayerPlayer) {
    this.id = player.id;
    this.name = player.name;
    this.outfitColor = player.outfitColor || '#8c5932';
    this.goldFound = player.goldFound || 0;
    this.health = player.health || 100;
    this.targetPos = new THREE.Vector3(player.x, player.y, player.z);
    this.targetYaw = player.yaw || 0;
    this.targetPitch = player.pitch || 0;
    this.targetAction = player.action || 'idle';
    this.targetTool = player.activeTool || 'pickaxe';

    this.group = new THREE.Group();
    this.group.position.copy(this.targetPos);
    this.group.rotation.y = this.targetYaw;

    // Build the high-detail 3D prospector rig
    this.rig = createProspectorCharacter({
      outfitColor: this.outfitColor,
      showBackpack: true,
    });
    this.group.add(this.rig.root);

    // Floating Nameplate Sprite
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
    this.nameplateSprite.position.set(0, 2.35, 0);
    this.nameplateSprite.scale.set(2.4, 0.8, 1);
    this.group.add(this.nameplateSprite);

    this.updateNameplate(0);
    this.rig.setEquippedTool(this.targetTool);
  }

  public setProfile(name: string, outfitColor?: string) {
    this.name = name;
    if (outfitColor) {
      this.outfitColor = outfitColor;
      this.rig.setOutfitColor(outfitColor);
    }
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
    if (action === 'dig' || action === 'pickaxe' || action === 'swing' || action === 'chop') {
      this.isSwinging = true;
      this.swingProgress = 1.0;
    }
  }

  public updateData(data: Partial<MultiplayerPlayer>) {
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
      if (data.action === 'dig' || data.action === 'pickaxe' || data.action === 'chop') {
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
    const moveSpeed = this.targetAction === 'run' ? 1.5 : (isMoving ? 1.0 : 0);

    // Handle tool swing progress
    if (this.isSwinging) {
      this.swingProgress -= delta * 3.5;
      if (this.swingProgress <= 0) {
        this.isSwinging = false;
        this.swingProgress = 0;
      }
    }

    // Drive procedural animation rig
    this.rig.updateAnimation({
      delta,
      isMoving,
      moveSpeed,
      isRiding: false,
      isAiming: this.targetTool === 'rifle' && (this.targetAction === 'aim' || this.targetAction === 'shoot'),
      isSwinging: this.isSwinging,
      swingProgress: this.swingProgress,
      pitch: this.targetPitch,
      carriedRock: false,
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
