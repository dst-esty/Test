import * as THREE from 'three';
import { soundEngine } from '../audio/soundEffects';
import { Vector3D } from '../types';

/**
 * Historical US Army Cavalry Patrol (Fort McDowell, Arizona Territory - 1880s)
 * 
 * Historical Context:
 * Fort McDowell was established in 1865 on the Verde River north of the Superstition Mountains.
 * Cavalry detachments (Units from the 6th and 8th US Cavalry) routinely patrolled the
 * Salt River Valley, Tortilla Flat trail, and western passes to survey trails, suppress outlaw road-agents,
 * maintain peace, and protect government courier routes.
 * 
 * Behavior & Visuals:
 * - A mounted column consisting of:
 *   1. Cavalry Lieutenant / Scout Leader (with campaign hat, officer sash, binoculars, saber)
 *   2. Guidon Bearer carrying the regulation swallowtail US Cavalry Guidon flag (Red over White / Stars & Stripes)
 *   3. Mounted Trooper armed with a Springfield 1873 Trapdoor carbine
 * - Authentic uniforms: Dark indigo blue wool tunics, sky-blue trousers with cavalry yellow piping,
 *   campaign hats with crossed-sabers insignia, and leather carbine boots.
 * - Cavalry bay/sorrel mounts with McClellan saddle, white halter, and brass bit appointments.
 * - Patrols ride across the frontier (Tortilla Flat river trail, Fish Creek canyon, and northern passes),
 *   stopping occasionally to reconnoiter with binoculars.
 * - Plays authentic brass bugle calls ("Boots & Saddles", "Assembly") echoing through the canyon when arriving.
 * - Friendly/Protective to peaceful prospectors: Greets the player, assists against outlaw bandits if in combat,
 *   and provides frontier patrol reports.
 */

export interface CavalryRider {
  id: string;
  role: 'officer' | 'guidon' | 'trooper';
  name: string;
  rank: string;
  mesh: THREE.Group;
  horseLegs: THREE.Group[];
  guidonFlag?: THREE.Mesh;
  carbineMesh?: THREE.Object3D;
  saberMesh?: THREE.Mesh;
  localOffset: THREE.Vector3; // Position relative to column leader
  walkTimer: number;
}

export interface CavalryPatrolRoutePoint {
  x: number;
  z: number;
  name: string;
  pauseSeconds?: number;
}

export class CavalryPatrolManager {
  private scene: THREE.Scene;
  private patrolGroup: THREE.Group = new THREE.Group();
  private riders: CavalryRider[] = [];
  
  // Patrol column movement state
  private isActive: boolean = false;
  private currentWaypointIndex: number = 0;
  private columnPosition: THREE.Vector3 = new THREE.Vector3(-180, 0, -290);
  private columnRotation: number = 0;
  private speed: number = 5.2; // Trotting speed
  private pauseTimer: number = 0;
  private hoofSoundTimer: number = 0;
  private bannerTriggeredForArrival: boolean = false;
  private patrolCycleTimer: number = 600; // Rare historic event: 10 min cooldown before first patrol

  // Patrol waypoints: Starts from Fort McDowell approach (North-West across Salt River Canyon),
  // rides along Tortilla Flat Stage road, surveys Apache Trail wash, passes Mountain Bluffs, and returns.
  private waypoints: CavalryPatrolRoutePoint[] = [
    { x: -160, z: -285, name: 'Fort McDowell Verde Trail River Crossing' },
    { x: -90, z: -265, name: 'Salt River Canyon North Embankment' },
    { x: -25, z: -255, name: 'Tortilla Flat Western Stage Gate', pauseSeconds: 8 },
    { x: 15, z: -248, name: 'Tortilla Flat Saloon & Assayer Hitching Rails', pauseSeconds: 12 },
    { x: 55, z: -230, name: 'Tortilla Creek Wash & Stagecoach Road', pauseSeconds: 6 },
    { x: 105, z: -175, name: 'Fish Creek Canyon Overlook Trail' },
    { x: 80, z: -90, name: 'Dutchman Canyon Northern Approach' },
    { x: 20, z: -130, name: 'Black Rock Ridge Patrol Pass', pauseSeconds: 10 },
    { x: -50, z: -190, name: 'Old Government Scout Trail' },
    { x: -120, z: -245, name: 'Tortilla Flat West Mesa' },
    { x: -180, z: -290, name: 'Return to Fort McDowell Garrison', pauseSeconds: 40 },
  ];

  // Materials (shared to minimize draw calls)
  private horseCoatMat: THREE.MeshStandardMaterial;
  private maneMat: THREE.MeshStandardMaterial;
  private armyBlueTunicMat: THREE.MeshStandardMaterial;
  private skyBluePantsMat: THREE.MeshStandardMaterial;
  private yellowPipingMat: THREE.MeshStandardMaterial;
  private campaignHatMat: THREE.MeshStandardMaterial;
  private leatherMat: THREE.MeshStandardMaterial;
  private brassMat: THREE.MeshStandardMaterial;
  private skinMat: THREE.MeshStandardMaterial;
  private guidonMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.patrolGroup.name = 'CavalryPatrolGroup';
    this.scene.add(this.patrolGroup);

    // Realistic historic uniform materials
    this.horseCoatMat = new THREE.MeshStandardMaterial({ color: 0x5a2d12, roughness: 0.75 }); // Dark bay / sorrel cavalry mount
    this.maneMat = new THREE.MeshStandardMaterial({ color: 0x18120e, roughness: 0.9 });
    this.armyBlueTunicMat = new THREE.MeshStandardMaterial({ color: 0x18243b, roughness: 0.82 }); // US Army dark blue wool tunic
    this.skyBluePantsMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.85 }); // Regulation sky blue wool trousers
    this.yellowPipingMat = new THREE.MeshStandardMaterial({ color: 0xf5b700, roughness: 0.5 }); // Cavalry yellow stripe & collar cord
    this.campaignHatMat = new THREE.MeshStandardMaterial({ color: 0x221d19, roughness: 0.8 }); // Black felt campaign hat
    this.leatherMat = new THREE.MeshStandardMaterial({ color: 0x2e180d, roughness: 0.65 }); // Black bridle & McClellan leather saddle
    this.brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xc8987b, roughness: 0.7 });

    // Regulation 1880s US Cavalry Guidon Canvas Texture (Stars & Stripes swallowtail design)
    this.guidonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });
    this.initGuidonTexture();

    this.spawnCavalryColumn();
  }

  private initGuidonTexture() {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // US Regulation Guidon: Red top half, White bottom half with crossed sabres and troop letter "Co. B / 8th Cav"
    ctx.fillStyle = '#b91c1c'; // Regulation crimson red
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f8fafc'; // White
    ctx.fillRect(0, 64, 256, 64);

    // Golden Crossed Sabres & Regiment Designation
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FORT McDOWELL', 115, 32);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 20px serif';
    ctx.fillText('U.S. CAVALRY', 115, 96);

    // Swallowtail triangle notch cutout on fly side
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(190, 64);
    ctx.lineTo(256, 128);
    ctx.closePath();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    this.guidonMat.map = texture;
    this.guidonMat.transparent = true;
    this.guidonMat.needsUpdate = true;
  }

  private spawnCavalryColumn() {
    const roles: { role: 'officer' | 'guidon' | 'trooper'; name: string; rank: string; offset: THREE.Vector3 }[] = [
      {
        role: 'officer',
        name: 'Lt. Ethan Sterling',
        rank: '1st Lieutenant, 6th U.S. Cavalry',
        offset: new THREE.Vector3(0, 0, 0), // Leader
      },
      {
        role: 'guidon',
        name: 'Cpl. Silas Bradley',
        rank: 'Corporal & Guidon Bearer',
        offset: new THREE.Vector3(-1.6, 0, -2.4), // Rear Left
      },
      {
        role: 'trooper',
        name: 'Pvt. Henry Crawford',
        rank: 'Mounted Scout, 8th U.S. Cavalry',
        offset: new THREE.Vector3(1.6, 0, -2.4), // Rear Right
      },
    ];

    roles.forEach((r) => {
      const rider = this.createCavalryRiderModel(r.role, r.name, r.rank, r.offset);
      this.riders.push(rider);
      this.patrolGroup.add(rider.mesh);
    });

    // Place at first waypoint
    const startWp = this.waypoints[0];
    this.columnPosition.set(startWp.x, 0, startWp.z);
    this.patrolGroup.position.copy(this.columnPosition);
    this.patrolGroup.visible = false; // Hidden until patrol cycle begins
  }

  private createCavalryRiderModel(
    role: 'officer' | 'guidon' | 'trooper',
    name: string,
    rank: string,
    offset: THREE.Vector3
  ): CavalryRider {
    const group = new THREE.Group();
    group.position.copy(offset);

    // ==========================================
    // 1. CAVALRY MOUNT (Strong military horse)
    // ==========================================
    const horseGroup = new THREE.Group();
    group.add(horseGroup);

    // Horse Body
    const bodyGeo = new THREE.CylinderGeometry(0.42, 0.46, 1.5, 10);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, this.horseCoatMat);
    body.position.y = 1.18;
    body.castShadow = true;
    horseGroup.add(body);

    // Regulation Cavalry Saddle Blanket (Dark Navy Blue with Yellow border trim)
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.05, 0.88),
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.9 })
    );
    blanket.position.set(0, 0.44, 0.06);
    body.add(blanket);

    const blanketTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.94, 0.055, 0.9),
      this.yellowPipingMat
    );
    blanketTrim.position.set(0, 0.435, 0.06);
    body.add(blanketTrim);

    // 1874 Model McClellan Cavalry Saddle (Black leather with open center-tree design)
    const saddle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.4, 0.52, 8),
      this.leatherMat
    );
    saddle.rotateX(Math.PI / 2);
    saddle.position.set(0, 0.48, 0.06);
    body.add(saddle);

    // Leather Saddlebags & Bedroll (Military field gear)
    const bedroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.72, 8),
      new THREE.MeshStandardMaterial({ color: 0x524b42, roughness: 0.9 }) // Wool shelter half / poncho
    );
    bedroll.rotateZ(Math.PI / 2);
    bedroll.position.set(0, 0.62, -0.28);
    body.add(bedroll);

    const saddlebagL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.28), this.leatherMat);
    saddlebagL.position.set(-0.46, 0.28, -0.25);
    body.add(saddlebagL);
    const saddlebagR = saddlebagL.clone();
    saddlebagR.position.x = 0.46;
    body.add(saddlebagR);

    // Brass Stirrups
    const stirrupL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 8), this.brassMat);
    stirrupL.position.set(-0.52, -0.15, 0.08);
    body.add(stirrupL);
    const stirrupR = stirrupL.clone();
    stirrupR.position.x = 0.52;
    body.add(stirrupR);

    // Horse Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.85, 8), this.horseCoatMat);
    neck.position.set(0, 1.55, 0.65);
    neck.rotation.x = Math.PI / 3.8;
    neck.castShadow = true;
    horseGroup.add(neck);

    // Black Horse Mane
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.16), this.maneMat);
    mane.position.set(0, 1.68, 0.58);
    mane.rotation.x = Math.PI / 3.8;
    horseGroup.add(mane);

    // Horse Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.86, 0.96);
    horseGroup.add(headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.54), this.horseCoatMat);
    head.castShadow = true;
    headGroup.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.06, 0.22, 5);
    const earL = new THREE.Mesh(earGeo, this.horseCoatMat);
    earL.position.set(-0.1, 0.22, -0.12);
    headGroup.add(earL);
    const earR = new THREE.Mesh(earGeo, this.horseCoatMat);
    earR.position.set(0.1, 0.22, -0.12);
    headGroup.add(earR);

    // Black Leather Bridle & Brass Bit
    const bridleBrow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.04), this.leatherMat);
    bridleBrow.position.set(0, 0.08, 0.1);
    headGroup.add(bridleBrow);

    const bitRings = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 8), this.brassMat);
    bitRings.position.set(-0.16, -0.06, 0.22);
    bitRings.rotation.y = Math.PI / 2;
    headGroup.add(bitRings);
    const bitRingsR = bitRings.clone();
    bitRingsR.position.x = 0.16;
    headGroup.add(bitRingsR);

    // Horse Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.75, 6), this.maneMat);
    tail.position.set(0, 0.95, -0.85);
    tail.rotation.x = -0.3;
    horseGroup.add(tail);

    // 4 Articulated Horse Legs
    const horseLegs: THREE.Group[] = [];
    const legPositions = [
      { x: -0.35, z: 0.5 },  // Front Left
      { x: 0.35, z: 0.5 },   // Front Right
      { x: -0.35, z: -0.5 }, // Back Left
      { x: 0.35, z: -0.5 },  // Back Right
    ];

    legPositions.forEach((pos) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(pos.x, 1.15, pos.z);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.58, 6), this.horseCoatMat);
      upper.position.y = -0.28;
      upper.castShadow = true;
      legPivot.add(upper);

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 6), this.horseCoatMat);
      lower.position.y = -0.75;
      lower.castShadow = true;
      legPivot.add(lower);

      const hoof = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.08, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.5 })
      );
      hoof.position.y = -1.04;
      legPivot.add(hoof);

      horseGroup.add(legPivot);
      horseLegs.push(legPivot);
    });

    // ==========================================
    // 2. MOUNTED CAVALRY TROOPER MODEL
    // ==========================================
    const riderGroup = new THREE.Group();
    riderGroup.position.set(0, 1.62, 0.05);
    group.add(riderGroup);

    // Trousers & Mounted Leg Posture (Sky blue wool with cavalry yellow piping)
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.4), this.skyBluePantsMat);
    riderGroup.add(pelvis);

    // Left Mounted Leg bent forward into stirrup
    const legL = new THREE.Group();
    legL.position.set(-0.28, -0.05, 0.05);
    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.5, 6), this.skyBluePantsMat);
    thighL.rotation.x = Math.PI / 3.2;
    thighL.position.set(0, -0.15, 0.18);
    legL.add(thighL);

    // Yellow cavalry outer seam stripe
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.48, 0.04), this.yellowPipingMat);
    stripeL.position.set(-0.11, -0.15, 0.18);
    stripeL.rotation.x = Math.PI / 3.2;
    legL.add(stripeL);

    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.18), this.leatherMat); // Black riding boot
    bootL.position.set(0, -0.42, 0.28);
    legL.add(bootL);
    riderGroup.add(legL);

    // Right Mounted Leg
    const legR = new THREE.Group();
    legR.position.set(0.28, -0.05, 0.05);
    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.5, 6), this.skyBluePantsMat);
    thighR.rotation.x = Math.PI / 3.2;
    thighR.position.set(0, -0.15, 0.18);
    legR.add(thighR);

    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.48, 0.04), this.yellowPipingMat);
    stripeR.position.set(0.11, -0.15, 0.18);
    stripeR.rotation.x = Math.PI / 3.2;
    legR.add(stripeR);

    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.18), this.leatherMat);
    bootR.position.set(0, -0.42, 0.28);
    legR.add(bootR);
    riderGroup.add(legR);

    // Torso (Dark Blue Army Tunic)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.72, 8), this.armyBlueTunicMat);
    torso.position.y = 0.42;
    torso.castShadow = true;
    riderGroup.add(torso);

    // Brass Tunic Buttons (Single breasted regulation)
    for (let b = 0; b < 4; b++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), this.brassMat);
      button.position.set(0, 0.2 + b * 0.12, 0.29);
      riderGroup.add(button);
    }

    // Yellow Cavalry Collar Facing & Shoulder Straps
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.1, 8), this.yellowPipingMat);
    collar.position.y = 0.78;
    riderGroup.add(collar);

    // Officer Red Silk Sash or Rank Chevrons
    if (role === 'officer') {
      const officerSash = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.04, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.7 }) // Crimson silk sash
      );
      officerSash.rotation.x = Math.PI / 2;
      officerSash.position.set(0, 0.25, 0);
      riderGroup.add(officerSash);

      // Gold Shoulder Epaulets
      const epauletL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.2), this.brassMat);
      epauletL.position.set(-0.3, 0.74, 0);
      riderGroup.add(epauletL);
      const epauletR = epauletL.clone();
      epauletR.position.x = 0.3;
      riderGroup.add(epauletR);
    }

    // Trooper Arms holding reins
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.55, 6), this.armyBlueTunicMat);
    armL.position.set(-0.35, 0.46, 0.18);
    armL.rotation.x = -Math.PI / 3.5;
    armL.rotation.z = -0.15;
    riderGroup.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.55, 6), this.armyBlueTunicMat);
    armR.position.set(0.35, 0.46, 0.18);
    armR.rotation.x = -Math.PI / 3.5;
    armR.rotation.z = 0.15;
    riderGroup.add(armR);

    // Weathered Frontiersman Head
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), this.skinMat);
    headMesh.position.set(0, 0.94, 0.02);
    riderGroup.add(headMesh);

    // Classic Mustache / Mutton Chops (1880s military facial hair)
    const mustache = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 })
    );
    mustache.position.set(0, 0.9, 0.19);
    riderGroup.add(mustache);

    // Black Felt Campaign Hat (Folded regulation brim & crossed sabers brass device)
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.03, 10), this.campaignHatMat);
    hatBrim.position.set(0, 1.08, 0.02);
    hatBrim.rotation.x = -0.05;
    riderGroup.add(hatBrim);

    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.24, 8), this.campaignHatMat);
    hatCrown.position.set(0, 1.2, 0.02);
    riderGroup.add(hatCrown);

    // Gold Crossed Sabres Insignia on Hat
    const saberDevice = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), this.brassMat);
    saberDevice.position.set(0, 1.15, 0.26);
    riderGroup.add(saberDevice);

    // ==========================================
    // 3. ROLE-SPECIFIC EQUIPMENT
    // ==========================================
    let guidonFlagMesh: THREE.Mesh | undefined;
    let carbineMesh: THREE.Object3D | undefined;
    let saberMesh: THREE.Mesh | undefined;

    // A. Model 1860 Cavalry Saber (Scabbard at left hip)
    const scabbard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.02, 1.05, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a929a, metalness: 0.9, roughness: 0.3 }) // Polished steel
    );
    scabbard.position.set(-0.36, 0.05, -0.08);
    scabbard.rotation.x = -0.3;
    scabbard.rotation.z = -0.2;
    riderGroup.add(scabbard);
    saberMesh = scabbard;

    // Brass 3-branch saber basket hilt
    const basketHilt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), this.brassMat);
    basketHilt.position.set(-0.32, 0.52, -0.22);
    riderGroup.add(basketHilt);

    if (role === 'guidon') {
      // B. Regimental Guidon Staff & Swallowtail Flag
      const staff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 }) // Ash wood pike
      );
      staff.position.set(0.42, 0.95, 0.15);
      staff.rotation.x = -0.15;
      riderGroup.add(staff);

      // Brass Spearpoint finial
      const spearpoint = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), this.brassMat);
      spearpoint.position.set(0.42, 2.3, 0.35);
      riderGroup.add(spearpoint);

      // Flying swallowtail silk guidon flag
      const flagGeo = new THREE.PlaneGeometry(1.2, 0.65, 8, 4);
      const flagMesh = new THREE.Mesh(flagGeo, this.guidonMat);
      flagMesh.position.set(0.98, 1.9, 0.3);
      flagMesh.rotation.y = -Math.PI / 2;
      riderGroup.add(flagMesh);
      guidonFlagMesh = flagMesh;
    } else if (role === 'trooper') {
      // C. Springfield Model 1873 "Trapdoor" Carbine (.45-70 Gov)
      const carbineGroup = new THREE.Group();
      // Wooden stock
      const stock = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.12, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x422a18, roughness: 0.7 })
      );
      carbineGroup.add(stock);

      // Blued steel barrel & barrel bands
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.15, 6),
        new THREE.MeshStandardMaterial({ color: 0x22262b, metalness: 0.85, roughness: 0.35 })
      );
      barrel.rotateX(Math.PI / 2);
      barrel.position.set(0, 0.05, 0.1);
      carbineGroup.add(barrel);

      // Slung diagonally across trooper back
      carbineGroup.position.set(0.05, 0.45, -0.22);
      carbineGroup.rotation.set(-0.4, 0.2, 0.65);
      riderGroup.add(carbineGroup);
      carbineMesh = carbineGroup;
    } else if (role === 'officer') {
      // D. Brass Field Binoculars in leather case on officer chest
      const binos = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), this.brassMat);
      binos.position.set(0, 0.52, 0.28);
      riderGroup.add(binos);
    }

    return {
      id: `cavalry_${role}_${Math.random().toString(36).substring(2, 6)}`,
      role,
      name,
      rank,
      mesh: group,
      horseLegs,
      guidonFlag: guidonFlagMesh,
      carbineMesh,
      saberMesh,
      localOffset: offset,
      walkTimer: Math.random() * Math.PI * 2,
    };
  }

  /**
   * Main update loop called each frame from WorldCanvas.
   */
  public update(
    delta: number,
    playerPos: Vector3D,
    getTerrainElevation: (x: number, z: number) => number,
    onShowBanner?: (msg: string) => void
  ) {
    // 1. Patrol Cycle Spawning (rides through very rarely as an authentic historic event)
    if (!this.isActive) {
      this.patrolCycleTimer -= delta;
      if (this.patrolCycleTimer <= 0) {
        this.startPatrol(getTerrainElevation, onShowBanner, playerPos);
      }
      return;
    }

    // 2. Pause Handling at scenic waypoints (scouting Tortilla Flat or trail overlooks)
    if (this.pauseTimer > 0) {
      this.pauseTimer -= delta;
      // Idle horse breathing & gentle tail swish while stationed
      this.animateStationaryTroop(delta);
      return;
    }

    // 3. Move along waypoints
    const targetWp = this.waypoints[this.currentWaypointIndex];
    const dx = targetWp.x - this.columnPosition.x;
    const dz = targetWp.z - this.columnPosition.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 3.5) {
      // Reached waypoint!
      if (targetWp.pauseSeconds && targetWp.pauseSeconds > 0) {
        this.pauseTimer = targetWp.pauseSeconds;

        // Play gentle bugle call ONLY when stopping at Tortilla Flat AND player is physically close by (< 35m)
        if (targetWp.name.includes('Tortilla Flat') && !this.bannerTriggeredForArrival) {
          this.bannerTriggeredForArrival = true;
          const playerDistToTF = Math.hypot(playerPos.x - targetWp.x, playerPos.z - targetWp.z);
          if (playerDistToTF < 35) {
            const volScale = (1 - playerDistToTF / 35) * 0.08;
            soundEngine.playCavalryBugleCall('assembly', volScale);
            if (onShowBanner) {
              onShowBanner('🎖️ 6th U.S. Cavalry Detachment arrived at Tortilla Flat hitching rails.');
            }
          }
        }
      }

      this.currentWaypointIndex++;
      if (this.currentWaypointIndex >= this.waypoints.length) {
        // Patrol finished round trip; rest at garrison before next rare sweep
        this.isActive = false;
        this.patrolGroup.visible = false;
        this.patrolCycleTimer = 1200 + Math.random() * 600; // 20 - 30 minutes between rare patrols
        this.currentWaypointIndex = 0;
        this.bannerTriggeredForArrival = false;
        return;
      }
    } else {
      // Trot towards target waypoint
      const targetAngle = Math.atan2(dx, dz);
      // Smooth turning interpolation
      let angleDiff = targetAngle - this.columnRotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.columnRotation += angleDiff * Math.min(1, delta * 3.5);

      const moveDist = this.speed * delta;
      this.columnPosition.x += Math.sin(this.columnRotation) * moveDist;
      this.columnPosition.z += Math.cos(this.columnRotation) * moveDist;
      this.columnPosition.y = getTerrainElevation(this.columnPosition.x, this.columnPosition.z);

      this.patrolGroup.position.set(this.columnPosition.x, this.columnPosition.y, this.columnPosition.z);
      this.patrolGroup.rotation.y = this.columnRotation;

      // Animate trotting legs, body bounce, and fluttering guidon flag
      this.animateTrottingTroop(delta);

      // Sound: Very occasional soft hooves clattering only when player is physically close (< 28m)
      this.hoofSoundTimer += delta;
      if (this.hoofSoundTimer > 1.6) {
        this.hoofSoundTimer = 0;
        const playerDist = Math.hypot(playerPos.x - this.columnPosition.x, playerPos.z - this.columnPosition.z);
        if (playerDist < 28) {
          const volumeFactor = Math.max(0, 1 - (playerDist / 28)) * 0.25;
          soundEngine.playCavalryTroopHooves(volumeFactor);
        }
      }
    }
  }

  /**
   * Launch a new cavalry patrol sweep from Fort McDowell
   */
  public startPatrol(
    getTerrainElevation: (x: number, z: number) => number,
    onShowBanner?: (msg: string) => void,
    playerPos?: Vector3D
  ) {
    this.isActive = true;
    this.currentWaypointIndex = 0;
    const startWp = this.waypoints[0];
    this.columnPosition.set(startWp.x, getTerrainElevation(startWp.x, startWp.z), startWp.z);
    this.patrolGroup.position.copy(this.columnPosition);
    this.patrolGroup.visible = true;
    this.pauseTimer = 0;
    this.bannerTriggeredForArrival = false;

    // Distant faint bugle call only if player is near Fort McDowell river crossing (< 50m)
    if (playerPos) {
      const dist = Math.hypot(playerPos.x - startWp.x, playerPos.z - startWp.z);
      if (dist < 50) {
        const volScale = (1 - dist / 50) * 0.08;
        soundEngine.playCavalryBugleCall('boots_and_saddles', volScale);
        if (onShowBanner) {
          onShowBanner('🎺 Fort McDowell Cavalry Patrol dispatched along the Salt River trail.');
        }
      }
    }
  }

  private animateTrottingTroop(delta: number) {
    this.riders.forEach((rider, idx) => {
      rider.walkTimer += delta * 7.5; // Trotting cadence
      const phase = rider.walkTimer + idx * 0.4;

      // 4-beat diagonal horse trot animation
      if (rider.horseLegs.length === 4) {
        rider.horseLegs[0].rotation.x = Math.sin(phase) * 0.45;       // Front Left
        rider.horseLegs[1].rotation.x = -Math.sin(phase) * 0.45;      // Front Right
        rider.horseLegs[2].rotation.x = -Math.sin(phase) * 0.45;      // Back Left
        rider.horseLegs[3].rotation.x = Math.sin(phase) * 0.45;       // Back Right
      }

      // Gentle vertical saddle bobbing
      rider.mesh.position.y = Math.abs(Math.sin(phase * 2)) * 0.08;

      // Swallowtail guidon flag wind flutter
      if (rider.guidonFlag) {
        const flagWave = Math.sin(rider.walkTimer * 2.2) * 0.15;
        rider.guidonFlag.rotation.z = flagWave;
      }
    });
  }

  private animateStationaryTroop(delta: number) {
    this.riders.forEach((rider, idx) => {
      rider.walkTimer += delta * 2.0;
      // Reset legs gently to standing stance
      rider.horseLegs.forEach((leg) => {
        leg.rotation.x *= 0.88;
      });
      // Soft breathing idle
      rider.mesh.position.y = Math.sin(rider.walkTimer + idx) * 0.02;

      // Gentle wind flutter on the guidon
      if (rider.guidonFlag) {
        rider.guidonFlag.rotation.z = Math.sin(rider.walkTimer * 1.5) * 0.08;
      }
    });
  }

  /**
   * Check if player is near cavalry patrol to trigger friendly dialogue/interaction.
   */
  public getNearbyCavalryDialogue(playerPos: Vector3D): { name: string; text: string; rank: string } | null {
    if (!this.isActive || !this.patrolGroup.visible) return null;
    const dist = Math.hypot(playerPos.x - this.columnPosition.x, playerPos.z - this.columnPosition.z);
    if (dist < 12) {
      const officer = this.riders[0];
      const wp = this.waypoints[this.currentWaypointIndex] || this.waypoints[0];
      return {
        name: officer.name,
        rank: officer.rank,
        text: `“Good day, citizen! 6th Cavalry out of Fort McDowell on route reconnaissance. Currently surveying ${wp.name}. Keep your canteen full and watch the high ridges for claim jumpers and renegades. Safe prospecting!”`,
      };
    }
    return null;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getColumnPosition(): THREE.Vector3 {
    return this.columnPosition;
  }

  public dispose() {
    this.scene.remove(this.patrolGroup);
  }
}
