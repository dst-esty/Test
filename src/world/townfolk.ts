import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { soundEngine } from '../audio/soundEffects';

export interface TownNPCData {
  id: string;
  name: string;
  title: string;
  role: 'prospector' | 'barkeep' | 'hostler' | 'sheriff' | 'assayer' | 'driver' | 'homesteader' | 'blacksmith';
  position: THREE.Vector3;
  heading: number;
  dialogues: string[];
  actionTab?: 'saloon' | 'livery' | 'assayer' | 'stagecoach';
  actionPrompt?: string;
  isSeated?: boolean;
  patrol?: {
    axis: 'x' | 'z';
    min: number;
    max: number;
    speed: number;
  };
}

/**
 * Creates a stylized, high-contrast 1880s Western nameplate sprite
 */
function createNameplateTexture(name: string, title: string, badgeSymbol: string = ''): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Rounded plaque background with Western aged parchment / dark wood
  ctx.fillStyle = 'rgba(22, 14, 9, 0.88)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 120, 24);
  ctx.fill();

  // Ornate double border
  ctx.strokeStyle = '#d4af37'; // Antique Gold
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(14, 14, 484, 112, 20);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(22, 22, 468, 96, 14);
  ctx.stroke();

  // Name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff4dc';
  ctx.font = 'bold 40px "Georgia", serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  const fullName = badgeSymbol ? `${badgeSymbol} ${name}` : name;
  ctx.fillText(fullName, 256, 54);

  // Subtitle / Title
  ctx.font = 'italic 24px "Georgia", serif';
  ctx.fillStyle = '#dfb86c';
  ctx.shadowBlur = 4;
  ctx.fillText(title, 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export class TownNPC {
  public data: TownNPCData;
  public group: THREE.Group;
  public headGroup: THREE.Group;
  public leftArmGroup: THREE.Group;
  public rightArmGroup: THREE.Group;
  public leftLegGroup: THREE.Group;
  public rightLegGroup: THREE.Group;
  public torsoGroup: THREE.Group;
  public nameplateSprite: THREE.Sprite;
  
  private dialogueIdx: number = 0;
  private animClock: number = Math.random() * 10;
  private currentDirection: number = 1;
  private waitTimer: number = 0;
  private isWalking: boolean = false;
  private targetHeading: number;

  constructor(data: TownNPCData) {
    this.data = data;
    this.targetHeading = data.heading;
    this.group = new THREE.Group();
    this.group.position.copy(data.position);
    this.group.rotation.y = data.heading;

    // --- Build Anatomic Articulated 3D Model ---
    this.torsoGroup = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.leftArmGroup = new THREE.Group();
    this.rightArmGroup = new THREE.Group();
    this.leftLegGroup = new THREE.Group();
    this.rightLegGroup = new THREE.Group();

    this.buildCharacterMesh();

    // Attach Nameplate Billboard Sprite
    const badge = data.role === 'sheriff' ? '★' : data.role === 'prospector' ? '⛏' : '•';
    const tex = createNameplateTexture(data.name, data.title, badge);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    });
    this.nameplateSprite = new THREE.Sprite(spriteMat);
    this.nameplateSprite.scale.set(2.4, 0.65, 1.0);
    this.nameplateSprite.position.set(0, 2.3, 0);
    this.group.add(this.nameplateSprite);
  }

  private buildCharacterMesh() {
    const role = this.data.role;

    // Shared Palette Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddb494, roughness: 0.8 });
    const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x221811, roughness: 0.75 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x18120d, roughness: 0.8 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.85, roughness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e431f, roughness: 0.85 });

    // Role-specific fabrics
    let coatColor = 0x4a3525;
    let vestColor = 0x332014;
    let pantColor = 0x27313f;
    let hatColor = 0x261d17;

    if (role === 'sheriff') {
      coatColor = 0x181a1d; // Dark charcoal frock
      vestColor = 0x202428;
      pantColor = 0x1d2126;
      hatColor = 0xd5cfc7; // Off-white Stetson
    } else if (role === 'barkeep') {
      coatColor = 0xf0ede6; // Linen shirt
      vestColor = 0x5a2d1d;
      pantColor = 0x241d18;
      hatColor = 0x18120e;
    } else if (role === 'hostler') {
      coatColor = 0x8a2b22; // Red work shirt
      vestColor = 0x54321b;
      pantColor = 0x593d25; // Leather chaps
      hatColor = 0xbc9f6b; // Straw hat
    } else if (role === 'assayer') {
      coatColor = 0x2b3036; // Tweed jacket
      vestColor = 0x3c434d;
      pantColor = 0x23272d;
      hatColor = 0x16181b; // Bowler hat
    } else if (role === 'driver') {
      coatColor = 0x785638; // Heavy duster
      vestColor = 0x3d281a;
      pantColor = 0x2a3340;
      hatColor = 0x38291e;
    } else if (role === 'homesteader') {
      coatColor = 0x3c647a; // Calico blue
      vestColor = 0xf4eee4; // Apron
      pantColor = 0x3c647a; // Long skirt
      hatColor = 0xf7f2e8; // Bonnet
    } else if (role === 'blacksmith') {
      coatColor = 0x55585d;
      vestColor = 0x45291b; // Thick leather bib
      pantColor = 0x292827;
      hatColor = 0x303030; // Flat cap
    }

    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.85 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.8 });
    const pantMat = new THREE.MeshStandardMaterial({ color: pantColor, roughness: 0.85 });
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.75 });

    // --- 1. Torso & Pelvis ---
    this.torsoGroup.position.y = this.data.isSeated ? 0.72 : 0.88;
    this.group.add(this.torsoGroup);

    // Pelvis
    const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.22), pantMat);
    pelvisMesh.castShadow = true;
    this.torsoGroup.add(pelvisMesh);

    // Belt
    const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.25), darkLeatherMat);
    beltMesh.position.y = 0.08;
    this.torsoGroup.add(beltMesh);

    // Belt Buckle
    const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.02), brassMat);
    buckleMesh.position.set(0, 0.08, 0.13);
    this.torsoGroup.add(buckleMesh);

    // Sheriff Holster & Colt
    if (role === 'sheriff' || role === 'driver' || role === 'prospector') {
      const holster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), darkLeatherMat);
      holster.position.set(0.19, -0.04, 0.02);
      holster.rotation.z = -0.12;
      this.torsoGroup.add(holster);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.05), woodMat);
      grip.position.set(0.19, 0.06, 0.02);
      grip.rotation.x = -0.2;
      this.torsoGroup.add(grip);
    }

    // Chest & Vest
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.24), vestMat);
    chest.position.y = 0.32;
    chest.castShadow = true;
    this.torsoGroup.add(chest);

    // Sheriff Silver 5-Point Star Badge
    if (role === 'sheriff') {
      const star = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.015, 5),
        new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 0.95, roughness: 0.15 })
      );
      star.rotation.x = Math.PI / 2;
      star.position.set(-0.09, 0.38, 0.13);
      this.torsoGroup.add(star);
    }

    // Barkeep Crisp Apron
    if (role === 'barkeep') {
      const apronBib = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.44, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.9 })
      );
      apronBib.position.set(0, 0.22, 0.13);
      this.torsoGroup.add(apronBib);
    }

    // Blacksmith Leather Heavy Bib
    if (role === 'blacksmith') {
      const bib = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.46, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.9 })
      );
      bib.position.set(0, 0.21, 0.13);
      this.torsoGroup.add(bib);
    }

    // Homesteader Dress Skirt
    if (role === 'homesteader') {
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.36, 0.78, 10),
        pantMat
      );
      skirt.position.y = -0.36;
      skirt.castShadow = true;
      this.torsoGroup.add(skirt);
    }

    // Neckerchief / Bandana / Bowtie
    const neckTie = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.08, 0.14),
      new THREE.MeshStandardMaterial({
        color: role === 'barkeep' ? 0x111111 : role === 'sheriff' ? 0x1c1e22 : 0xa42618,
        roughness: 0.7,
      })
    );
    neckTie.position.set(0, 0.52, 0.05);
    this.torsoGroup.add(neckTie);

    // --- 2. Head & Facial Features ---
    this.headGroup.position.set(0, 0.62, 0.02);
    this.torsoGroup.add(this.headGroup);

    // Head Base
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), skinMat);
    head.position.y = 0.09;
    head.castShadow = true;
    this.headGroup.add(head);

    // Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.06), skinMat);
    nose.position.set(0, 0.09, 0.125);
    this.headGroup.add(nose);

    // Beard / Mustache
    const hairColor = role === 'prospector' ? 0xb5b8ba : role === 'barkeep' ? 0x1f1915 : 0x483221;
    const beardMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95 });

    if (role === 'prospector') {
      // Big Bushy Prospector Sourdough Beard
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.14), beardMat);
      beard.position.set(0, -0.02, 0.09);
      this.headGroup.add(beard);
    } else if (role === 'barkeep') {
      // Handlebar Mustache
      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06), beardMat);
      mustache.position.set(0, 0.04, 0.12);
      this.headGroup.add(mustache);
    } else if (role === 'sheriff' || role === 'driver' || role === 'blacksmith') {
      // Rugged Frontier Mustache
      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.05), beardMat);
      mustache.position.set(0, 0.04, 0.12);
      this.headGroup.add(mustache);
    }

    // Assayer Spectacles
    if (role === 'assayer') {
      const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.04), brassMat);
      glasses.position.set(0, 0.11, 0.11);
      this.headGroup.add(glasses);
    }

    // Hat Construction
    if (role === 'homesteader') {
      // Prairie Bonnet
      const bonnetBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.18, 12, 1, true, 0, Math.PI), hatMat);
      bonnetBrim.position.set(0, 0.16, 0.02);
      bonnetBrim.rotation.x = 0.2;
      this.headGroup.add(bonnetBrim);
    } else if (role === 'assayer') {
      // Bowler / Derby Hat
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
      crown.position.set(0, 0.2, 0);
      this.headGroup.add(crown);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12), hatMat);
      brim.position.set(0, 0.2, 0);
      this.headGroup.add(brim);
    } else if (role === 'blacksmith') {
      // Flat Cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.06, 10), hatMat);
      cap.position.set(0, 0.22, 0.02);
      cap.rotation.x = -0.1;
      this.headGroup.add(cap);
    } else {
      // Western Slouch / Stetson Hat
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.35, 0.025, 14), hatMat);
      brim.position.set(0, 0.2, 0);
      brim.rotation.x = role === 'sheriff' ? -0.05 : 0.05;
      this.headGroup.add(brim);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 12), hatMat);
      crown.position.set(0, 0.28, 0);
      this.headGroup.add(crown);

      // Hat Band
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.04, 12), darkLeatherMat);
      band.position.set(0, 0.22, 0);
      this.headGroup.add(band);
    }

    // --- 3. Arms & Hands ---
    // Left Arm
    this.leftArmGroup.position.set(-0.24, 0.44, 0);
    this.torsoGroup.add(this.leftArmGroup);
    const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.1), coatMat);
    lUpper.position.y = -0.12;
    this.leftArmGroup.add(lUpper);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), skinMat);
    lHand.position.y = -0.28;
    this.leftArmGroup.add(lHand);

    // Right Arm
    this.rightArmGroup.position.set(0.24, 0.44, 0);
    this.torsoGroup.add(this.rightArmGroup);
    const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.1), coatMat);
    rUpper.position.y = -0.12;
    this.rightArmGroup.add(rUpper);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), skinMat);
    rHand.position.y = -0.28;
    this.rightArmGroup.add(rHand);

    // Character Handheld Props
    if (role === 'prospector') {
      // Holding tin whiskey mug
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 8), ironMat);
      mug.position.set(0, -0.32, 0.08);
      this.rightArmGroup.add(mug);
    } else if (role === 'barkeep') {
      // Holding tall glass tumbler and bar towel
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.04, 0.12, 8),
        new THREE.MeshStandardMaterial({ color: 0xbfe5f2, roughness: 0.1, transparent: true, opacity: 0.7 })
      );
      glass.position.set(0, -0.32, 0.06);
      this.rightArmGroup.add(glass);

      const towel = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.18, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.9 })
      );
      towel.position.set(0, -0.28, 0.02);
      this.leftArmGroup.add(towel);
    } else if (role === 'hostler') {
      // 3-Tined Wooden Hay Pitchfork
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), woodMat);
      handle.position.set(0.05, -0.25, 0.2);
      handle.rotation.x = -0.1;
      this.rightArmGroup.add(handle);

      const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.03), ironMat);
      crossBar.position.set(0.05, 0.45, 0.15);
      this.rightArmGroup.add(crossBar);

      for (let t = -0.09; t <= 0.09; t += 0.09) {
        const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.3, 4), ironMat);
        tine.position.set(0.05 + t, 0.6, 0.15);
        this.rightArmGroup.add(tine);
      }
    } else if (role === 'assayer') {
      // Leather Assay Ledger Book & Brass Calipers
      const ledger = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.22, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x5a180e, roughness: 0.7 })
      );
      ledger.position.set(0, -0.26, 0.08);
      ledger.rotation.x = -0.3;
      this.leftArmGroup.add(ledger);
    } else if (role === 'homesteader') {
      // Woven Wicker Basket
      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.1, 0.14, 8),
        new THREE.MeshStandardMaterial({ color: 0xb58b54, roughness: 0.95 })
      );
      basket.position.set(0, -0.34, 0.06);
      this.leftArmGroup.add(basket);
    } else if (role === 'blacksmith') {
      // Heavy Forging Anvil Hammer
      const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), woodMat);
      hammerHandle.position.set(0, -0.15, 0.15);
      hammerHandle.rotation.x = -Math.PI / 2;
      this.rightArmGroup.add(hammerHandle);

      const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.16), ironMat);
      hammerHead.position.set(0, -0.15, 0.38);
      this.rightArmGroup.add(hammerHead);
    }

    // --- 4. Legs & Boots ---
    if (!this.data.isSeated) {
      // Standing legs
      this.leftLegGroup.position.set(-0.1, 0, 0);
      this.torsoGroup.add(this.leftLegGroup);
      const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), pantMat);
      lLeg.position.y = -0.24;
      lLeg.castShadow = true;
      this.leftLegGroup.add(lLeg);
      const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, 0.2), bootMat);
      lBoot.position.set(0, -0.56, 0.03);
      lBoot.castShadow = true;
      this.leftLegGroup.add(lBoot);

      this.rightLegGroup.position.set(0.1, 0, 0);
      this.torsoGroup.add(this.rightLegGroup);
      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), pantMat);
      rLeg.position.y = -0.24;
      rLeg.castShadow = true;
      this.rightLegGroup.add(rLeg);
      const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, 0.2), bootMat);
      rBoot.position.set(0, -0.56, 0.03);
      rBoot.castShadow = true;
      this.rightLegGroup.add(rBoot);
    } else {
      // Seated on Saddle Barstool (Old Dusty Pete)
      this.leftLegGroup.position.set(-0.14, 0, 0);
      this.torsoGroup.add(this.leftLegGroup);
      this.leftLegGroup.rotation.x = -Math.PI / 2.4;
      this.leftLegGroup.rotation.z = 0.2;
      const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), pantMat);
      lThigh.position.y = -0.2;
      this.leftLegGroup.add(lThigh);
      const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.11), pantMat);
      lShin.position.set(0, -0.4, 0.15);
      lShin.rotation.x = Math.PI / 2.2;
      this.leftLegGroup.add(lShin);
      const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), bootMat);
      lBoot.position.set(0, -0.58, 0.2);
      this.leftLegGroup.add(lBoot);

      this.rightLegGroup.position.set(0.14, 0, 0);
      this.torsoGroup.add(this.rightLegGroup);
      this.rightLegGroup.rotation.x = -Math.PI / 2.4;
      this.rightLegGroup.rotation.z = -0.2;
      const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), pantMat);
      rThigh.position.y = -0.2;
      this.rightLegGroup.add(rThigh);
      const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.11), pantMat);
      rShin.position.set(0, -0.4, 0.15);
      rShin.rotation.x = Math.PI / 2.2;
      this.rightLegGroup.add(rShin);
      const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), bootMat);
      rBoot.position.set(0, -0.58, 0.2);
      this.rightLegGroup.add(rBoot);

      // Resting arms pose
      this.leftArmGroup.rotation.set(-0.55, 0.1, 0.35);
      this.rightArmGroup.rotation.set(-0.75, -0.2, -0.25);
    }
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    this.animClock += delta;

    // Face toward player if player is nearby (< 6m)
    const distToPlayer = this.group.position.distanceTo(playerPos);
    if (distToPlayer < 6.0) {
      const dx = playerPos.x - this.group.position.x;
      const dz = playerPos.z - this.group.position.z;
      const angle = Math.atan2(dx, dz);
      // Smoothly rotate head towards player
      const angleDiff = THREE.MathUtils.euclideanModulo(angle - this.group.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      this.headGroup.rotation.y = THREE.MathUtils.clamp(angleDiff * 0.7, -0.8, 0.8);
      this.headGroup.rotation.x = THREE.MathUtils.clamp((playerPos.y - (this.group.position.y + 1.5)) * 0.2, -0.3, 0.4);
    } else {
      // Natural idle head wandering
      this.headGroup.rotation.y = Math.sin(this.animClock * 0.8) * 0.18;
      this.headGroup.rotation.x = Math.cos(this.animClock * 0.6) * 0.08;
    }

    // Nameplate visibility: visible when player is within 22 meters
    this.nameplateSprite.visible = distToPlayer < 22.0;
    if (this.nameplateSprite.visible) {
      // Slight scale pop when close
      const scale = THREE.MathUtils.clamp(1.8 + (distToPlayer / 18) * 0.8, 1.8, 2.8);
      this.nameplateSprite.scale.set(scale, scale * 0.28, 1.0);
    }

    // Character-specific behavior & animations
    if (this.data.isSeated) {
      // Old Dusty Pete idle breathing and mug sipping
      const breath = Math.sin(this.animClock * 1.5) * 0.015;
      this.torsoGroup.position.y = 0.72 + breath;
      // Periodic sip
      const sipCycle = (this.animClock * 0.3) % (Math.PI * 2);
      if (sipCycle > 5.0) {
        this.rightArmGroup.rotation.x = -1.2 + Math.sin(this.animClock * 4.0) * 0.08;
        this.headGroup.rotation.x = -0.2;
      } else {
        this.rightArmGroup.rotation.x = -0.75 + Math.sin(this.animClock * 1.5) * 0.04;
      }
      return;
    }

    // Patrol locomotion for walking NPCs (Sheriff, Homesteader)
    if (this.data.patrol) {
      if (this.waitTimer > 0) {
        this.waitTimer -= delta;
        this.isWalking = false;
        // Idle breathing while surveying
        this.torsoGroup.position.y = 0.88 + Math.sin(this.animClock * 2.0) * 0.01;
        this.leftLegGroup.rotation.x = 0;
        this.rightLegGroup.rotation.x = 0;
        this.leftArmGroup.rotation.x = 0.1;
        this.rightArmGroup.rotation.x = 0.1;
        return;
      }

      this.isWalking = true;
      const p = this.data.patrol;
      const step = p.speed * delta * this.currentDirection;

      if (p.axis === 'z') {
        this.group.position.z += step;
        this.targetHeading = this.currentDirection > 0 ? 0 : Math.PI;

        if (this.group.position.z >= p.max) {
          this.group.position.z = p.max;
          this.currentDirection = -1;
          this.waitTimer = 3.5 + Math.random() * 2.0;
        } else if (this.group.position.z <= p.min) {
          this.group.position.z = p.min;
          this.currentDirection = 1;
          this.waitTimer = 3.5 + Math.random() * 2.0;
        }
      } else {
        this.group.position.x += step;
        this.targetHeading = this.currentDirection > 0 ? Math.PI / 2 : -Math.PI / 2;

        if (this.group.position.x >= p.max) {
          this.group.position.x = p.max;
          this.currentDirection = -1;
          this.waitTimer = 3.5 + Math.random() * 2.0;
        } else if (this.group.position.x <= p.min) {
          this.group.position.x = p.min;
          this.currentDirection = 1;
          this.waitTimer = 3.5 + Math.random() * 2.0;
        }
      }

      // Smooth heading turn
      this.group.rotation.y = this.targetHeading;

      // Adjust height to terrain as they walk
      const currentH = getTerrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = currentH;

      // Walking swing kinematics
      const stride = Math.sin(this.animClock * 6.5);
      this.leftLegGroup.rotation.x = stride * 0.45;
      this.rightLegGroup.rotation.x = -stride * 0.45;
      this.leftArmGroup.rotation.x = -stride * 0.35;
      this.rightArmGroup.rotation.x = stride * 0.35;
      this.torsoGroup.position.y = 0.88 - Math.abs(Math.sin(this.animClock * 6.5)) * 0.04;
      return;
    }

    // Standing idle behaviors
    const breath = Math.sin(this.animClock * 1.8) * 0.012;
    this.torsoGroup.position.y = 0.88 + breath;

    if (this.data.role === 'barkeep') {
      // Wiping mug with towel motion
      const wipe = Math.sin(this.animClock * 5.0) * 0.12;
      this.leftArmGroup.rotation.set(-0.7 + wipe * 0.5, 0.3, 0.2);
      this.rightArmGroup.rotation.set(-0.85 - wipe, -0.2, -0.1);
    } else if (this.data.role === 'blacksmith') {
      // Periodic hammer strike on anvil
      const strikeCycle = (this.animClock * 1.4) % (Math.PI * 2);
      if (strikeCycle < 1.2) {
        // Hammer raised
        this.rightArmGroup.rotation.x = -1.5;
      } else if (strikeCycle < 1.6) {
        // Hammer strikes down!
        this.rightArmGroup.rotation.x = -0.3;
      } else {
        // Rest on anvil
        this.rightArmGroup.rotation.x = -0.7;
      }
    } else if (this.data.role === 'hostler') {
      // Leaning on pitchfork
      this.rightArmGroup.rotation.set(-0.6, -0.1, -0.2);
      this.leftArmGroup.rotation.set(0.1 + Math.sin(this.animClock * 1.2) * 0.05, 0, 0.1);
    } else if (this.data.role === 'assayer') {
      // Checking assay ledger
      this.leftArmGroup.rotation.set(-0.85, 0.3, 0.2);
      this.rightArmGroup.rotation.set(-0.75, -0.1, -0.15);
    } else {
      // Natural idle arm swing
      this.leftArmGroup.rotation.set(0.08 + Math.sin(this.animClock) * 0.04, 0, 0.08);
      this.rightArmGroup.rotation.set(0.08 - Math.sin(this.animClock) * 0.04, 0, -0.08);
    }
  }

  public getNextDialogue(): string {
    const list = this.data.dialogues;
    if (!list || list.length === 0) return 'Howdy stranger!';
    const line = list[this.dialogueIdx % list.length];
    this.dialogueIdx++;
    return line;
  }

  public dispose() {
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}

/**
 * TownfolkManager manages all NPCs in Historic Tortilla Flat settlement.
 */
export class TownfolkManager {
  public root: THREE.Group;
  public npcs: TownNPC[] = [];

  constructor(scene: THREE.Scene) {
    this.root = new THREE.Group();
    this.root.name = 'TortillaFlatTownfolk';
    scene.add(this.root);

    this.spawnTownfolk();
  }

  private spawnTownfolk() {
    const townY = getTerrainHeight(0, -250);

    const npcConfigs: TownNPCData[] = [
      // 1. "Old Dusty" Pete - Sitting on the iconic Tortilla Flat Saloon porch saddle barstool
      {
        id: 'old_dusty_pete',
        name: 'Old Dusty Pete',
        title: 'Veteran Gold Prospector',
        role: 'prospector',
        position: new THREE.Vector3(-8.0, townY + 0.95, -246.0),
        heading: Math.PI / 2, // Facing east toward the main street
        isSeated: true,
        dialogues: [
          'Howdy stranger! Grab a saddle stool and rest your boots. The sun in Needle Canyon will boil a greenhorn’s brains before noon.',
          'Old Jacob Waltz? Ayup, I knew him. He’d slip into this very saloon with saddlebags bulging with high-grade rose quartz gold, pay his bar tab in solid nuggets, and vanish back into the crags.',
          'Word of advice, pardner: watch for heavy black sand and red hematite float down in the creek beds. Where the iron settles, the raw gold always rests below.',
          'The Peralta miners carved secret stone cross markers into the red cliff faces to guide their burro trains. Keep your eyes sharp on the canyon walls!',
          'Hear those coyotes howling at dusk? Mind the Apache Leap ridges—bandits prowl the high narrows waiting to jump lone claims.',
        ],
        actionPrompt: 'Hear Prospector Lore & Mining Tips',
      },

      // 2. Hank "Dutch" Miller - Saloon Keeper & Barkeep
      {
        id: 'barkeep_hank',
        name: 'Hank "Dutch" Miller',
        title: 'Superstition Saloon Keeper',
        role: 'barkeep',
        position: new THREE.Vector3(-9.6, townY + 0.45, -243.6),
        heading: Math.PI / 2, // Facing the boardwalk entrance
        dialogues: [
          'Welcome to the Superstition Saloon! Ice-cold sarsaparilla, mountain whiskey, and fresh trail rations for weary prospectors.',
          'If you’re heading deep into the canyons, stock up on timber planks for shaft shoring and rifle cartridges next door before sundown.',
          'Had a rider from Florence come through yesterday—swore he spotted smoke signals rising over Weaver’s Needle. Don’t go into the dark without a loaded Winchester.',
          'Every dollar of gold you pull from the hills, Judge Walker at the Assay counter will cash into honest legal tender at $20.67 an ounce.',
        ],
        actionTab: 'saloon',
        actionPrompt: 'Open Saloon & Mercantile [E]',
      },

      // 3. Silas "Red" McCurdy - Master Hostler & Corral Master
      {
        id: 'hostler_silas',
        name: 'Silas "Red" McCurdy',
        title: 'Master Hostler & Wrangler',
        role: 'hostler',
        position: new THREE.Vector3(10.2, townY + 0.15, -242.0),
        heading: -Math.PI / 2, // Facing west toward the town street
        dialogues: [
          'Howdy! Need a surefooted Spanish pack burro to haul heavy quartz ore, or a spirited mountain mustang to cross the Salt River flats?',
          'A good burro can carry 150 pounds of solid pay-dirt over razor-sharp volcanic scree without losing a shoe. Best partner a prospector could ask for.',
          'Be sure to water your mount at the artesian trough before you ride out past the canyon narrows. Dehydration kills faster than outlaws in this desert.',
          'If you press [M], you can mount up and ride at a brisk gallop across the open washes!',
        ],
        actionTab: 'livery',
        actionPrompt: 'Inspect Burros & Mounts [E]',
      },

      // 4. Sheriff Wyatt Vance - Frontier Lawman & Territorial Deputy
      {
        id: 'sheriff_wyatt',
        name: 'Sheriff Wyatt Vance',
        title: 'Territorial Lawman',
        role: 'sheriff',
        position: new THREE.Vector3(10.5, townY + 0.45, -258.0),
        heading: 0,
        patrol: {
          axis: 'z',
          min: -263.0,
          max: -253.0,
          speed: 1.1,
        },
        dialogues: [
          'Keep the peace in Tortilla Flat, stranger. No reckless gunplay inside town limits, or you’ll spend the night cooling your heels in the iron jail cell.',
          'Outlaw bandits have been ambushing prospectors near Geronimo Head and the canyon washes. Shoot to defend yourself if cornered, and report any claim jumpers.',
          'If you discover rich quartz or pay dirt, drive your survey stake legal and file your title at the deed registry. Frontier law respects a staked perimeter!',
          'Watch the shadows once night falls. When the town torches light up, the wild things come out of the Superstitions.',
        ],
        actionPrompt: 'Speak with Sheriff Vance',
      },

      // 5. Judge Hiram Walker - U.S. Mineral Assayer
      {
        id: 'assayer_walker',
        name: 'Judge Hiram Walker',
        title: 'U.S. Mineral Assayer',
        role: 'assayer',
        position: new THREE.Vector3(-9.6, townY + 0.45, -261.2),
        heading: Math.PI / 2, // Facing east toward the mercantile boardwalk
        dialogues: [
          'United States Mineral Standard: $20.67 per troy ounce. Bring me your raw placer dust and quartz vein chunks—I’ll certify every grain on balance and acid test.',
          'Pure 24-karat Superstition gold! High specific gravity, won’t dissolve in nitric acid. Cash in your haul anytime to fund your mining expedition.',
          'Notice how the gold in Needle Canyon is telluride and crystalline quartz? That’s ancient volcanic hydrothermal deposition, pure as the day creation forged it.',
          'Step up to the scales whenever your pouch gets heavy, prospector.',
        ],
        actionTab: 'assayer',
        actionPrompt: 'Consult Assayer Scales [E]',
      },

      // 6. Jedediah - Overland Stagecoach Driver
      {
        id: 'stage_jedediah',
        name: 'Jedediah "Whip" Cole',
        title: 'Concord Stagecoach Driver',
        role: 'driver',
        position: new THREE.Vector3(3.4, townY + 0.15, -252.2),
        heading: -Math.PI / 1.5, // Leaning near stagecoach
        dialogues: [
          'Fresh team of six sturdy horses harnessed up! The Salt River stage run departs for Florence and Phoenix every Tuesday and Friday.',
          'The road through Fish Creek Canyon is rough enough to rattle your teeth loose, but this Abbott-Downing Concord coach has genuine English thoroughbrace leather suspension.',
          'If you need swift transport across the territory to the established trailheads, hop aboard and we’ll make good time before sundown.',
        ],
        actionTab: 'stagecoach',
        actionPrompt: 'Stagecoach Overland Travel [E]',
      },

      // 7. Clara Miller - Frontier Homesteader & Baker
      {
        id: 'clara_miller',
        name: 'Clara Miller',
        title: 'Frontier Homesteader',
        role: 'homesteader',
        position: new THREE.Vector3(-7.2, townY + 0.2, -254.0),
        heading: 0,
        patrol: {
          axis: 'z',
          min: -257.0,
          max: -241.0,
          speed: 0.9,
        },
        dialogues: [
          'Good day to you, traveler! The air off the Salt River is sweet this morning. Mind the rattlesnakes if you step off the gravel road.',
          'Mr. Jacob Waltz used to pass by with his pack burros loaded with dried jerky and flour. A quiet, hardened man—never said where he dug his gold, God rest his soul.',
          'Be sure to keep your canteen filled at the artesian spring trough. You can’t drink gold when the desert fever takes hold!',
        ],
        actionPrompt: 'Greet Clara Miller',
      },

      // 8. Gus Trombley - Town Blacksmith & Farrier
      {
        id: 'gus_blacksmith',
        name: 'Gus Trombley',
        title: 'Town Blacksmith & Farrier',
        role: 'blacksmith',
        position: new THREE.Vector3(12.2, townY + 0.15, -238.2),
        heading: -Math.PI / 2, // Standing by corral anvil
        dialogues: [
          'Clang! Cold iron and mesquite coal smoke. I shoe horses and re-point rusted prospector pickaxes. A dull pick won’t scratch mountain granite!',
          'If you find native silver or copper float up in the hills, bring it down. Good metal is hard to come by out here in the Arizona Territory.',
          'Keep your tools sharp and your timber braces tight when you dig deep underground. The mountain doesn’t give second chances to careless miners.',
        ],
        actionPrompt: 'Speak with Gus the Farrier',
      },
    ];

    for (const cfg of npcConfigs) {
      const npc = new TownNPC(cfg);
      this.npcs.push(npc);
      this.root.add(npc.group);
    }
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    for (let i = 0; i < this.npcs.length; i++) {
      this.npcs[i].update(delta, playerPos);
    }
  }

  /**
   * Returns the nearest NPC within maxDistance
   */
  public getNearestNPC(playerPos: THREE.Vector3, maxDistance: number = 3.6): TownNPC | null {
    let nearest: TownNPC | null = null;
    let minDist = maxDistance;

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      const dist = npc.group.position.distanceTo(playerPos);
      if (dist < minDist) {
        minDist = dist;
        nearest = npc;
      }
    }

    return nearest;
  }

  public dispose() {
    for (let i = 0; i < this.npcs.length; i++) {
      this.npcs[i].dispose();
    }
    this.npcs = [];
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}
