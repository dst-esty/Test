import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

/**
 * Procedural Canvas Texture Generator for realistic 1880s Western painted wood signs.
 * High-resolution canvas rendering with aged wooden boards, decorative pinstripe borders,
 * hand-painted vintage lettering, and historical distress.
 */
export function createWesternSignTexture(
  mainText: string,
  subText: string = '',
  detailText: string = '',
  options: {
    bg?: string;
    border?: string;
    text?: string;
    subText?: string;
    width?: number;
    height?: number;
  } = {}
): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const w = options.width || 512;
  const h = options.height || 128;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d');

  if (ctx) {
    // 1. Weathered wood plank background
    ctx.fillStyle = options.bg || '#2e1c12';
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal wood planks
    const plankH = h / 4;
    for (let p = 0; p < 4; p++) {
      ctx.fillStyle = p % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, p * plankH, w, plankH);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, p * plankH, w, 2);
    }

    // 2. Ornate Western decorative borders
    const borderCol = options.border || '#cda851';
    ctx.strokeStyle = '#5a381e';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Corner decorative diamond flourishes
    const cornerInset = 16;
    const drawDiamond = (cx: number, cy: number) => {
      ctx.fillStyle = borderCol;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 5, cy);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(cornerInset, cornerInset);
    drawDiamond(w - cornerInset, cornerInset);
    drawDiamond(cornerInset, h - cornerInset);
    drawDiamond(w - cornerInset, h - cornerInset);

    // 3. Typography
    const mainCol = options.text || '#f8ecd2';
    const subCol = options.subText || '#dfb86c';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Auto-scale font size if text is wide
    let fontSize = Math.floor(h * (subText ? (detailText ? 0.28 : 0.34) : 0.44));
    ctx.font = `bold ${fontSize}px "Georgia", "Times New Roman", serif`;
    while (ctx.measureText(mainText).width > w - 48 && fontSize > 16) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px "Georgia", "Times New Roman", serif`;
    }

    const mainY = subText ? (detailText ? h * 0.32 : h * 0.40) : h * 0.5;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(mainText, w / 2 + 2, mainY + 2);

    // Main Text
    ctx.fillStyle = mainCol;
    ctx.fillText(mainText, w / 2, mainY);

    // Subtitle
    if (subText) {
      const subY = detailText ? h * 0.62 : h * 0.74;
      let subFontSize = Math.floor(h * (detailText ? 0.16 : 0.19));
      ctx.font = `italic ${subFontSize}px "Georgia", "Times New Roman", serif`;
      while (ctx.measureText(subText).width > w - 48 && subFontSize > 11) {
        subFontSize -= 1;
        ctx.font = `italic ${subFontSize}px "Georgia", "Times New Roman", serif`;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(subText, w / 2 + 1, subY + 1);
      ctx.fillStyle = subCol;
      ctx.fillText(subText, w / 2, subY);
    }

    // Detail text (e.g. "ELEV. 1720 FT")
    if (detailText) {
      ctx.font = `bold ${Math.floor(h * 0.12)}px sans-serif`;
      ctx.fillStyle = '#bfa57b';
      ctx.fillText(detailText, w / 2, h * 0.84);
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural Horizontal Wood Clapboard Siding Texture
 */
function createClapboardTexture(baseColor = '#6a4d34', lineCount = 16): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.Texture() as unknown as THREE.CanvasTexture;
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
  const ctx = cvs.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);
    const plankH = 256 / lineCount;
    for (let i = 0; i < lineCount; i++) {
      const y = i * plankH;
      // Shadow groove under the overlapping clapboard
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y, 256, 3);
      // Top edge highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, y + 3, 256, 1.5);
      // Wood grain variations
      ctx.fillStyle = (i % 3 === 0) ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, y + 5, 256, plankH - 5);
    }
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural Cedar Roof Shingle Texture
 */
function createRoofShingleTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.Texture() as unknown as THREE.CanvasTexture;
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
  const ctx = cvs.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#422f22';
    ctx.fillRect(0, 0, 256, 256);
    const rows = 12;
    const rH = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rH;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, y + rH - 2.5, 256, 2.5);
      const cols = 8;
      const cW = 256 / cols;
      const offset = (r % 2) * (cW / 2);
      for (let c = 0; c < cols + 1; c++) {
        const x = c * cW + offset;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, y, 2, rH);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Glazed Multi-Pane Window Component with realistic wooden casing, mullions, and glass.
 */
function createGlazedWindow(
  width: number,
  height: number,
  trimMat: THREE.Material,
  panesX: number = 2,
  panesY: number = 3,
  interiorLight?: number,
  windowRegistry?: THREE.MeshStandardMaterial[]
): THREE.Group {
  const group = new THREE.Group();

  // 1. Molded Wooden Frame Casing
  const frameThick = 0.08;
  const outerBorder = 0.12;

  // Window Sill (projecting ledge on bottom)
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(width + outerBorder * 2 + 0.1, 0.08, frameThick + 0.08),
    trimMat
  );
  sill.position.set(0, -height / 2 - 0.04, 0.04);
  sill.castShadow = true;
  group.add(sill);

  // Top header molding
  const header = new THREE.Mesh(
    new THREE.BoxGeometry(width + outerBorder * 2 + 0.08, 0.12, frameThick + 0.04),
    trimMat
  );
  header.position.set(0, height / 2 + 0.06, 0.02);
  header.castShadow = true;
  group.add(header);

  // Side jamb casings
  for (const sx of [-1, 1]) {
    const jamb = new THREE.Mesh(
      new THREE.BoxGeometry(outerBorder, height, frameThick),
      trimMat
    );
    jamb.position.set(sx * (width / 2 + outerBorder / 2), 0, 0);
    jamb.castShadow = true;
    group.add(jamb);
  }

  // 2. Glass Pane
  const glassMat = new THREE.MeshStandardMaterial({
    color: interiorLight ? 0xffeaad : 0x26201a,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: interiorLight ? 0.9 : 0.72,
    emissive: interiorLight ? 0xcc8822 : 0x000000,
    emissiveIntensity: interiorLight ? 0.6 : 0.0,
    side: THREE.DoubleSide,
  });

  if (windowRegistry) {
    windowRegistry.push(glassMat);
  }

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glassMat);
  glass.position.set(0, 0, 0.01);
  group.add(glass);

  // Dark backing for realistic depth
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: interiorLight ? 0x221105 : 0x090c0e, side: THREE.DoubleSide })
  );
  backing.position.set(0, 0, -0.04);
  group.add(backing);

  // 3. Wooden Muntins / Glazing bars
  const barThick = 0.035;
  const barMat = trimMat;

  // Vertical mullion bars
  for (let vx = 1; vx < panesX; vx++) {
    const px = -width / 2 + (vx * width) / panesX;
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(barThick, height, 0.04), barMat);
    vBar.position.set(px, 0, 0.02);
    group.add(vBar);
  }

  // Horizontal muntin bars
  for (let hy = 1; hy < panesY; hy++) {
    const py = -height / 2 + (hy * height) / panesY;
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(width, barThick, 0.04), barMat);
    hBar.position.set(0, py, 0.02);
    group.add(hBar);
  }

  return group;
}

/**
 * Creates a physically modeled 1880s wooden painted signboard.
 * - Heavy weathered cedar backing board (thickness 0.08m)
 * - Molded timber border casing trim around all 4 edges
 * - High-resolution painted canvas texture on the front face
 * - Forged iron square lag bolts in the 4 corners
 * - Directionally oriented (+X, -X, +Z, -Z) so it rests flush on walls without clipping into geometry!
 */
export function createMountedSignboard(
  signTex: THREE.Texture,
  width: number,
  height: number,
  facing: '+X' | '-X' | '+Z' | '-Z' = '+X',
  trimColor: number = 0x2e1a0e
): THREE.Group {
  const group = new THREE.Group();
  const depth = 0.08;
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.88 });

  // 1. Backing board (width along X, height along Y, depth along Z)
  const backBoard = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.12, height + 0.12, depth),
    new THREE.MeshStandardMaterial({ color: 0x3a2315, roughness: 0.94 })
  );
  backBoard.position.set(0, 0, -depth / 2);
  backBoard.castShadow = true;
  group.add(backBoard);

  // 2. Mitered raised molding trim around all 4 edges
  const borderThick = 0.08;
  const borderProj = depth + 0.04;

  // Top & bottom trim
  for (const ty of [-height / 2 - 0.03, height / 2 + 0.03]) {
    const tMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, borderThick, borderProj),
      trimMat
    );
    tMesh.position.set(0, ty, 0);
    tMesh.castShadow = true;
    group.add(tMesh);
  }

  // Left & right side trim
  for (const tx of [-width / 2 - 0.03, width / 2 + 0.03]) {
    const sMesh = new THREE.Mesh(
      new THREE.BoxGeometry(borderThick, height + 0.06, borderProj),
      trimMat
    );
    sMesh.position.set(tx, 0, 0);
    sMesh.castShadow = true;
    group.add(sMesh);
  }

  // 3. Painted signboard face
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.72,
      metalness: 0.04,
      side: THREE.FrontSide,
    })
  );
  signFace.position.set(0, 0, 0.02);
  group.add(signFace);

  // 4. Forged iron mounting brackets and lag bolts
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
  for (const bx of [-width * 0.42, width * 0.42]) {
    for (const by of [-height * 0.38, height * 0.38]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 6), ironMat);
      bolt.position.set(bx, by, 0.03);
      bolt.rotation.x = Math.PI / 2;
      group.add(bolt);
    }
  }

  // Rotate group according to facing direction:
  if (facing === '+X') {
    group.rotation.y = Math.PI / 2;
  } else if (facing === '-X') {
    group.rotation.y = -Math.PI / 2;
  } else if (facing === '-Z') {
    group.rotation.y = Math.PI;
  }
  // If '+Z', rotation is 0

  return group;
}

// =========================================================================
// NIGHT ILLUMINATION & FESTIVE LIGHTING SYSTEM FOR TORTILLA FLAT
// =========================================================================

export interface TortillaTorch {
  group: THREE.Group;
  light?: THREE.PointLight | null;
  flameMesh: THREE.Mesh;
  flameCore: THREE.Mesh;
  baseIntensity: number;
  flickerOffset: number;
}

export interface TortillaStringLight {
  group: THREE.Group;
  light: THREE.PointLight | null;
  bulbMaterials: THREE.MeshStandardMaterial[];
  baseIntensity: number;
  baseEmissive: number;
}

export interface TortillaLantern {
  group: THREE.Group;
  light?: THREE.PointLight | null;
  baseIntensity: number;
}

export interface TortillaLightingData {
  torches: TortillaTorch[];
  stringLights: TortillaStringLight[];
  lanterns: TortillaLantern[];
  windows: THREE.MeshStandardMaterial[];
  update: (timeOfDay: number, delta: number) => void;
}

/**
 * Calculates smooth diurnal transition factor for town night illumination.
 * Returns 0.0 during full daylight, smoothly ramps 0.0 -> 1.0 at dusk (17.5 - 19.5),
 * stays 1.0 throughout starry night (19.5 - 5.0), and smoothly ramps down at dawn (5.0 - 6.5).
 */
export function getTortillaNightFactor(timeOfDay: number): number {
  if (timeOfDay >= 6.5 && timeOfDay < 17.5) {
    return 0.0;
  } else if (timeOfDay >= 17.5 && timeOfDay < 19.5) {
    const t = (timeOfDay - 17.5) / 2.0;
    return t * t * (3.0 - 2.0 * t); // Smooth Hermite interpolation
  } else if (timeOfDay >= 19.5 || timeOfDay < 5.0) {
    return 1.0;
  } else {
    // Dawn transition: 5.0 to 6.5
    const t = (timeOfDay - 5.0) / 1.5;
    return 1.0 - t * t * (3.0 - 2.0 * t);
  }
}

/**
 * Creates a procedural soft radial volumetric glow sprite texture for incandescent bulbs.
 */
function createFestoonGlowTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.Texture() as unknown as THREE.CanvasTexture;
  const cvs = document.createElement('canvas');
  cvs.width = 64;
  cvs.height = 64;
  const ctx = cvs.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 200, 70, 0.95)');
    grad.addColorStop(0.2, 'rgba(255, 180, 55, 0.65)');
    grad.addColorStop(0.5, 'rgba(255, 110, 20, 0.22)');
    grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(cvs);
  return tex;
}

/**
 * Creates an authentic 1880s pitch-pine frontier torch with hand-forged iron cresset brazier basket,
 * glowing charred pitch-pine wood coals, dancing stylized flame cones, and crackling PointLight.
 */
function createFrontierTorch(
  position: THREE.Vector3,
  torchesList: TortillaTorch[],
  options: {
    height?: number;
    wallMounted?: boolean;
    baseIntensity?: number;
    hasLight?: boolean;
  } = {}
): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(position);

  const torchHeight = options.height || 2.25;
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5, metalness: 0.85 });
  const woodPoleMat = new THREE.MeshStandardMaterial({ color: 0x442c1e, roughness: 0.92 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x220601,
    emissive: 0xff3b00,
    emissiveIntensity: 1.8,
    roughness: 0.9,
  });

  let topY = torchHeight;

  if (options.wallMounted) {
    const bracketArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), ironMat);
    bracketArm.position.set(0.25, 0, 0);
    group.add(bracketArm);

    const angleSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.32, 8), ironMat);
    angleSleeve.position.set(0.46, 0.1, 0);
    angleSleeve.rotation.z = -0.32;
    group.add(angleSleeve);
    topY = 0.25;
  } else {
    // Hewn timber support post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, torchHeight, 8), woodPoleMat);
    post.position.set(0, torchHeight / 2, 0);
    post.castShadow = true;
    group.add(post);

    // Iron reinforcement strakes/hoops
    for (const hy of [torchHeight * 0.32, torchHeight * 0.65, torchHeight * 0.92]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 6, 12), ironMat);
      hoop.position.set(0, hy, 0);
      hoop.rotation.x = Math.PI / 2;
      group.add(hoop);
    }
  }

  // Wrought-iron cresset basket base
  const basketBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.16, 8), ironMat);
  basketBase.position.set(0, topY + 0.08, 0);
  group.add(basketBase);

  // 4 Curved forged iron vertical ribs
  for (let r = 0; r < 4; r++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.025), ironMat);
    const ang = (r * Math.PI) / 2;
    rib.position.set(Math.cos(ang) * 0.16, topY + 0.2, Math.sin(ang) * 0.16);
    rib.rotation.y = ang;
    group.add(rib);
  }

  // Flared top rim ring
  const topRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 6, 12), ironMat);
  topRim.position.set(0, topY + 0.3, 0);
  topRim.rotation.x = Math.PI / 2;
  group.add(topRim);

  // Glowing charcoal embers bed
  const coals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 1), emberMat);
  coals.position.set(0, topY + 0.2, 0);
  group.add(coals);

  // Layered Dancing Flame Cones
  const flameOuterMat = new THREE.MeshStandardMaterial({
    color: 0xff6a14,
    emissive: 0xff4804,
    emissiveIntensity: 1.2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 8), flameOuterMat);
  flameMesh.position.set(0, topY + 0.44, 0);
  group.add(flameMesh);

  const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xffde6a });
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.3, 8), flameCoreMat);
  flameCore.position.set(0, topY + 0.36, 0);
  group.add(flameCore);

  // Optional warm orange/amber torch PointLight (controlled to prevent WebGL uniform overflow)
  let torchLight: THREE.PointLight | null = null;
  const baseIntensity = options.baseIntensity || 2.8;
  if (options.hasLight) {
    torchLight = new THREE.PointLight(0xff7722, baseIntensity, 13, 1.8);
    torchLight.position.set(0, topY + 0.48, 0);
    group.add(torchLight);
  }

  torchesList.push({
    group,
    light: torchLight,
    flameMesh,
    flameCore,
    baseIntensity,
    flickerOffset: Math.random() * Math.PI * 2,
  });

  return group;
}

/**
 * Creates overhead festive string swags ("Festival Catenary Swags") hanging between buildings across Main Street.
 * Features realistic catenary wire sag, brass drop sockets, teardrop incandescent glass bulbs, and volumetric glow.
 */
function createFestoonStringLights(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  numBulbs: number,
  sag: number,
  stringLightsList: TortillaStringLight[],
  glowTexture: THREE.CanvasTexture,
  options: { baseIntensity?: number; hasLight?: boolean } = {}
): THREE.Group {
  const group = new THREE.Group();
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1b1814, roughness: 0.95 });
  const brassSocketMat = new THREE.MeshStandardMaterial({ color: 0xa88532, metalness: 0.8, roughness: 0.4 });
  const glowSpriteMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xff9922,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.82,
  });

  const bulbMaterials: THREE.MeshStandardMaterial[] = [];
  const segments = Math.max(12, numBulbs * 2);
  const curvePoints: THREE.Vector3[] = [];

  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    const pt = new THREE.Vector3().lerpVectors(p1, p2, t);
    // Catenary sag curve
    pt.y -= sag * 4.0 * t * (1.0 - t);
    curvePoints.push(pt);
  }

  // 1. Twisted catenary overhead cable
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const cableGeom = new THREE.TubeGeometry(curve, segments, 0.018, 6, false);
  const cableMesh = new THREE.Mesh(cableGeom, cableMat);
  group.add(cableMesh);

  // 2. Hanging warm Edison bulbs along the swag
  for (let b = 1; b <= numBulbs; b++) {
    const t = b / (numBulbs + 1);
    const bulbPt = new THREE.Vector3().lerpVectors(p1, p2, t);
    bulbPt.y -= sag * 4.0 * t * (1.0 - t);

    // Turned brass drop socket
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.075, 8), brassSocketMat);
    socket.position.set(bulbPt.x, bulbPt.y - 0.038, bulbPt.z);
    group.add(socket);

    // Teardrop glass bulb
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      emissive: 0xff8811,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.05,
    });
    bulbMaterials.push(bulbMat);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), bulbMat);
    bulb.position.set(bulbPt.x, bulbPt.y - 0.1, bulbPt.z);
    bulb.scale.set(1.0, 1.25, 1.0);
    group.add(bulb);

    // Radial volumetric glow sprite
    const sprite = new THREE.Sprite(glowSpriteMat);
    sprite.position.set(bulbPt.x, bulbPt.y - 0.1, bulbPt.z);
    sprite.scale.set(0.5, 0.5, 0.5);
    group.add(sprite);
  }

  // 3. Optional central ambient PointLight illuminating the thoroughfare below
  let spanLight: THREE.PointLight | null = null;
  const baseIntensity = options.baseIntensity || 2.0;
  if (options.hasLight) {
    const midPt = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
    midPt.y -= sag + 0.15;
    spanLight = new THREE.PointLight(0xffaa44, baseIntensity, 24, 1.6);
    spanLight.position.copy(midPt);
    group.add(spanLight);
  }

  stringLightsList.push({
    group,
    light: spanLight,
    bulbMaterials,
    baseIntensity,
    baseEmissive: 1.8,
  });

  return group;
}

/**
 * Creates a rustic 1880s carriage lantern mounted atop a weathered timber post along the wooden boardwalk curbs.
 */
function createBoardwalkLanternPost(
  x: number,
  z: number,
  facingAngle: number,
  lanternsList: TortillaLantern[],
  options: { baseIntensity?: number; hasLight?: boolean } = {}
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0.38, z); // Mounted directly on boardwalk curb deck
  group.rotation.y = facingAngle;

  const woodPostMat = new THREE.MeshStandardMaterial({ color: 0x3d2819, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.45, metalness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffefdb,
    transparent: true,
    opacity: 0.32,
    roughness: 0.15,
  });

  // 1. Weathered timber lamp post
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.5, 0.15), woodPostMat);
  post.position.set(0, 1.25, 0);
  post.castShadow = true;
  group.add(post);

  // 2. Cantilevered wrought-iron scroll arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.42), ironMat);
  arm.position.set(0, 2.44, 0.21);
  group.add(arm);

  const diagonalBrace = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.32), ironMat);
  diagonalBrace.position.set(0, 2.26, 0.13);
  diagonalBrace.rotation.x = -Math.PI / 4;
  group.add(diagonalBrace);

  // 3. Carriage Lantern assembly
  const lampGroup = new THREE.Group();
  lampGroup.position.set(0, 2.26, 0.38);

  // Pyramidal roof cap with chimney ring
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.15, 4), ironMat);
  cap.position.set(0, 0.21, 0);
  cap.rotation.y = Math.PI / 4;
  lampGroup.add(cap);

  const chimneyRing = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.014, 6, 10), ironMat);
  chimneyRing.position.set(0, 0.31, 0);
  chimneyRing.rotation.x = Math.PI / 2;
  lampGroup.add(chimneyRing);

  // Beveled glass chamber
  const glassChamber = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), glassMat);
  glassChamber.position.set(0, 0.03, 0);
  lampGroup.add(glassChamber);

  // 4 Iron corner stays
  for (const cx of [-0.1, 0.1]) {
    for (const cz of [-0.1, 0.1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.26, 0.018), ironMat);
      rib.position.set(cx, 0.03, cz);
      lampGroup.add(rib);
    }
  }

  // Internal brass kerosene burner with glowing teardrop flame
  const burner = new THREE.Mesh(
    new THREE.ConeGeometry(0.032, 0.09, 6),
    new THREE.MeshBasicMaterial({ color: 0xffa433 })
  );
  burner.position.set(0, 0.015, 0);
  lampGroup.add(burner);

  // Optional warm amber PointLight
  let light: THREE.PointLight | null = null;
  const baseIntensity = options.baseIntensity || 1.8;
  if (options.hasLight) {
    light = new THREE.PointLight(0xffb844, baseIntensity, 14, 1.8);
    light.position.set(0, 0.04, 0);
    lampGroup.add(light);
  }

  group.add(lampGroup);

  lanternsList.push({
    group,
    light,
    baseIntensity,
  });

  return group;
}

/**
 * Builds the complete, highly realistic 1880s Historic Town of Tortilla Flat.
 */
export function buildTortillaFlatSettlement(scene: THREE.Scene, waterRefillPoints: THREE.Vector3[]): THREE.Group {
  const townGroup = new THREE.Group();
  const townX = 0;
  const townZ = -250;
  const townY = getTerrainHeight(townX, townZ);
  townGroup.position.set(townX, townY, townZ);

  // Settlement Night Lighting Collections
  const townTorches: TortillaTorch[] = [];
  const townStringLights: TortillaStringLight[] = [];
  const townLanterns: TortillaLantern[] = [];
  const townWindowMaterials: THREE.MeshStandardMaterial[] = [];
  const glowTexture = createFestoonGlowTexture();

  // -------------------------------------------------------------
  // SHARED HISTORIC ARCHITECTURAL MATERIALS
  // -------------------------------------------------------------
  const woodClapboardDark = new THREE.MeshStandardMaterial({
    map: createClapboardTexture('#442d1e', 14),
    roughness: 0.92,
    metalness: 0.02,
  });

  const woodClapboardCedar = new THREE.MeshStandardMaterial({
    map: createClapboardTexture('#5e432f', 16),
    roughness: 0.90,
    metalness: 0.02,
  });

  const woodClapboardWeathered = new THREE.MeshStandardMaterial({
    map: createClapboardTexture('#705642', 16),
    roughness: 0.94,
    metalness: 0.01,
  });

  const woodPlankDeck = new THREE.MeshStandardMaterial({
    color: 0x6e523a,
    roughness: 0.92,
  });

  const woodTrimWalnut = new THREE.MeshStandardMaterial({
    color: 0x382315,
    roughness: 0.88,
  });

  const woodTrimCream = new THREE.MeshStandardMaterial({
    color: 0xd8cbb5,
    roughness: 0.85,
  });

  const roofShingleMat = new THREE.MeshStandardMaterial({
    map: createRoofShingleTexture(),
    roughness: 0.94,
  });

  const stoneMasonryMat = new THREE.MeshStandardMaterial({
    color: 0x645448,
    roughness: 0.96,
  });

  const forgedIronMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.82,
    roughness: 0.45,
  });

  const antiqueBrassMat = new THREE.MeshStandardMaterial({
    color: 0xc89838,
    metalness: 0.88,
    roughness: 0.32,
  });

  const cleanWaterMat = new THREE.MeshStandardMaterial({
    color: 0x2f8bb0,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.85,
  });

  // -------------------------------------------------------------
  // 1. DRY TOWN ROAD BED & WOODEN BOARDWALKS
  // -------------------------------------------------------------
  // Packed desert caliche & dirt main street
  const street = new THREE.Mesh(
    new THREE.BoxGeometry(15.0, 0.12, 54.0),
    new THREE.MeshStandardMaterial({ color: 0x8a6a4d, roughness: 0.98 })
  );
  street.position.set(0, 0.06, -3.0);
  street.receiveShadow = true;
  townGroup.add(street);

  // Deep wagon wheel ruts worn into the roadbed
  for (const rx of [-2.4, 2.4]) {
    const rut = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.04, 52.0),
      new THREE.MeshStandardMaterial({ color: 0x6e5138, roughness: 0.99 })
    );
    rut.position.set(rx, 0.11, -3.0);
    rut.receiveShadow = true;
    townGroup.add(rut);
  }

  // West Elevated Wooden Boardwalk (Saloon & Mercantile)
  const westBoardwalk = new THREE.Group();
  westBoardwalk.position.set(-9.0, 0, -3.0);

  const westWalkDeck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.32, 44.0), woodPlankDeck);
  westWalkDeck.position.set(0, 0.22, 0);
  westWalkDeck.receiveShadow = true;
  westWalkDeck.castShadow = true;
  westBoardwalk.add(westWalkDeck);

  // Timber fascia curb boards and stringers
  const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 44.0), woodTrimWalnut);
  westCurb.position.set(1.8, 0.19, 0);
  westBoardwalk.add(westCurb);

  // Step risers down to street
  for (const sz of [-18, -4, 10]) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 2.4), woodPlankDeck);
    step.position.set(2.4, 0.07, sz);
    step.receiveShadow = true;
    westBoardwalk.add(step);
  }
  townGroup.add(westBoardwalk);

  // East Elevated Wooden Boardwalk (Sheriff Jail & Livery)
  const eastBoardwalk = new THREE.Group();
  eastBoardwalk.position.set(9.0, 0, -5.0);

  const eastWalkDeck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.32, 38.0), woodPlankDeck);
  eastWalkDeck.position.set(0, 0.22, 0);
  eastWalkDeck.receiveShadow = true;
  eastWalkDeck.castShadow = true;
  eastBoardwalk.add(eastWalkDeck);

  const eastCurb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 38.0), woodTrimWalnut);
  eastCurb.position.set(-1.8, 0.19, 0);
  eastBoardwalk.add(eastCurb);

  for (const sz of [-12, 4]) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 2.4), woodPlankDeck);
    step.position.set(-2.4, 0.07, sz);
    step.receiveShadow = true;
    eastBoardwalk.add(step);
  }
  townGroup.add(eastBoardwalk);

  // -------------------------------------------------------------
  // 2. THE SUPERSTITION SALOON & RESTAURANT (West side)
  // Two-story authentic boomtown false-front with upper balcony,
  // multi-pane glazed windows, batwing doors & saddle barstools
  // -------------------------------------------------------------
  const saloonGroup = new THREE.Group();
  saloonGroup.position.set(-14.8, 0, 4.0);

  // Heavy Masonry Foundation Footing (anchors structure securely into terrace floor)
  const saloonFoundation = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.4, 14.0), stoneMasonryMat);
  saloonFoundation.position.set(0, -0.4, 0);
  saloonFoundation.castShadow = true;
  saloonFoundation.receiveShadow = true;
  saloonGroup.add(saloonFoundation);

  // Main Saloon Hall Structure
  const saloonMain = new THREE.Mesh(new THREE.BoxGeometry(9.2, 6.8, 13.6), woodClapboardCedar);
  saloonMain.position.set(0, 3.4, 0);
  saloonMain.castShadow = true;
  saloonMain.receiveShadow = true;
  saloonGroup.add(saloonMain);

  // Gabled Pitched Roof
  const saloonRoof = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.28, 14.0), roofShingleMat);
  saloonRoof.position.set(-0.2, 7.0, 0);
  saloonRoof.castShadow = true;
  saloonGroup.add(saloonRoof);

  // Grand Two-Story Western False Front Facade (Stepped Parapet)
  const saloonFacade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 9.4, 14.2), woodClapboardDark);
  saloonFacade.position.set(4.6, 4.7, 0);
  saloonFacade.castShadow = true;
  saloonGroup.add(saloonFacade);

  // Stepped Decorative Top Parapet & Cornice
  const corniceTier1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 14.6), woodTrimWalnut);
  corniceTier1.position.set(4.6, 9.4, 0);
  corniceTier1.castShadow = true;
  saloonGroup.add(corniceTier1);

  const cornicePediment = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 7.8), woodClapboardDark);
  cornicePediment.position.set(4.6, 10.1, 0);
  cornicePediment.castShadow = true;
  saloonGroup.add(cornicePediment);

  const corniceCap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.25, 8.2), woodTrimWalnut);
  corniceCap.position.set(4.6, 10.8, 0);
  corniceCap.castShadow = true;
  saloonGroup.add(corniceCap);

  // Decorative Corbel Brackets under the cornice
  for (let bz = -6.4; bz <= 6.4; bz += 1.6) {
    const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.18), woodTrimWalnut);
    corbel.position.set(4.6, 9.15, bz);
    corbel.castShadow = true;
    saloonGroup.add(corbel);
  }

  // Painted Saloon Main Signboard (Flush-mounted on facade, facing +X street)
  const saloonSignTex = createWesternSignTexture(
    'SUPERSTITION SALOON & HOTEL',
    'TORTILLA FLAT — ESTABLISHED 1880',
    'MINERS BOARDING ROOMS • COLD SARSAPARILLA • WHISKEY',
    { bg: '#2b1a10', border: '#d4aa52', text: '#fceecf', subText: '#e8c47a', width: 640, height: 160 }
  );
  const saloonSign = createMountedSignboard(saloonSignTex, 9.6, 1.8, '+X', 0x24150c);
  saloonSign.position.set(4.90, 8.0, 0);
  saloonSign.castShadow = true;
  saloonGroup.add(saloonSign);

  // Upper Balcony Hotel Boarding Plaque
  const hotelPlaqueTex = createWesternSignTexture(
    'BOARDING ROOMS $2.00',
    'FEATHER BEDS • FRESH WATER • SECURE KEYS',
    '',
    { bg: '#1c100a', border: '#e8c47a', text: '#fff0d0', subText: '#dfb86c', width: 480, height: 110 }
  );
  const hotelPlaque = createMountedSignboard(hotelPlaqueTex, 4.2, 1.0, '+X', 0x24150c);
  hotelPlaque.position.set(8.25, 4.15, -1.8);
  hotelPlaque.castShadow = true;
  saloonGroup.add(hotelPlaque);

  // Second Floor Balcony & Covered Porch
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.28, 14.4), roofShingleMat);
  porchRoof.position.set(6.4, 4.8, 0);
  porchRoof.rotation.z = -0.10;
  porchRoof.castShadow = true;
  saloonGroup.add(porchRoof);

  // Heavy Chamfered Porch Timber Posts with 45-degree angle knee-braces
  for (const pz of [-6.0, -2.0, 2.0, 6.0]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.8, 0.36), woodTrimWalnut);
    post.position.set(8.2, 2.4, pz);
    post.castShadow = true;
    saloonGroup.add(post);

    // Diagonal timber knee-braces
    for (const bDir of [-1, 1]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.24), woodTrimWalnut);
      brace.position.set(8.2, 4.3, pz + bDir * 0.45);
      brace.rotation.x = bDir * 0.78;
      saloonGroup.add(brace);
    }
  }

  // Upper Balcony Railing with Cross-Buck Pattern
  const balDeck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 14.0), woodPlankDeck);
  balDeck.position.set(6.4, 4.75, 0);
  saloonGroup.add(balDeck);

  const balTopRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 14.2), woodTrimWalnut);
  balTopRail.position.set(8.2, 5.8, 0);
  saloonGroup.add(balTopRail);

  for (let rz = -6.2; rz <= 6.2; rz += 1.2) {
    const balSpindle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), woodTrimWalnut);
    balSpindle.position.set(8.2, 5.3, rz);
    saloonGroup.add(balSpindle);
  }

  // Second Floor Multi-Pane Guest Room Windows (Facing +X outside)
  for (const wz of [-3.8, 3.8]) {
    const win = createGlazedWindow(1.4, 2.0, woodTrimCream, 2, 3, 0xffcc66, townWindowMaterials);
    win.position.set(4.83, 6.4, wz);
    win.rotation.y = Math.PI / 2;
    saloonGroup.add(win);
  }

  // Ground Floor Large Saloon Windows flanking entrance (Facing +X outside)
  for (const wz of [-3.6, 3.6]) {
    const bigWin = createGlazedWindow(2.2, 2.2, woodTrimWalnut, 3, 3, 0xffaa44, townWindowMaterials);
    bigWin.position.set(4.83, 2.2, wz);
    bigWin.rotation.y = Math.PI / 2;
    saloonGroup.add(bigWin);
  }

  // Classic Saloon Entry Vestibule & Batwing Doors
  const doorRecess = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.8, 2.0), woodClapboardDark);
  doorRecess.position.set(4.4, 1.4, 0);
  saloonGroup.add(doorRecess);

  const doorHole = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.6),
    new THREE.MeshBasicMaterial({ color: 0x140a04, side: THREE.DoubleSide })
  );
  doorHole.position.set(4.81, 1.4, 0);
  doorHole.rotation.y = Math.PI / 2;
  saloonGroup.add(doorHole);

  // Louvered Batwing Doors
  for (const dz of [-0.48, 0.48]) {
    const batwing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.8), woodTrimWalnut);
    batwing.position.set(4.82, 1.45, dz);
    batwing.castShadow = true;
    saloonGroup.add(batwing);
  }

  // Authentic Porch Details: Saddle Barstools (Famous Tortilla Flat feature!)
  for (let s = 0; s < 3; s++) {
    const stoolZ = -2.2 + s * 2.2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.8, 8), woodTrimWalnut);
    post.position.set(6.8, 0.4, stoolZ);
    post.castShadow = true;
    saloonGroup.add(post);

    // Leather saddle seat
    const saddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.22, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x7a3e1d, roughness: 0.75 })
    );
    saddle.position.set(6.8, 0.9, stoolZ);
    saddle.castShadow = true;
    saloonGroup.add(saddle);
  }

  // Whiskey Barrels with Forged Iron Hoops
  for (let b = 0; b < 4; b++) {
    const bGroup = new THREE.Group();
    bGroup.position.set(6.5 + (b % 2) * 0.6, 0.55, -5.2 - Math.floor(b / 2) * 0.9);

    const barrelBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.05, 12), woodTrimWalnut);
    barrelBody.castShadow = true;
    bGroup.add(barrelBody);

    for (const hy of [-0.35, -0.15, 0.15, 0.35]) {
      const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.485, 0.485, 0.05, 12), forgedIronMat);
      hoop.position.y = hy;
      bGroup.add(hoop);
    }
    saloonGroup.add(bGroup);
  }

  // Hitching Rail with Leather Tether Reins
  const hitchPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.2), woodTrimWalnut);
  hitchPole.position.set(9.4, 1.1, 0);
  hitchPole.rotation.x = Math.PI / 2;
  hitchPole.castShadow = true;
  saloonGroup.add(hitchPole);

  for (const hpz of [-3.2, 0, 3.2]) {
    const hPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), woodTrimWalnut);
    hPost.position.set(9.4, 0.6, hpz);
    hPost.castShadow = true;
    saloonGroup.add(hPost);
  }

  // Glowing Hanging Brass Hurricane Porch Lantern
  const saloonLantern = new THREE.Group();
  saloonLantern.position.set(6.8, 3.8, 0);

  const lanternLight = new THREE.PointLight(0xffa834, 2.5, 16);
  lanternLight.position.set(0, 0, 0);
  saloonLantern.add(lanternLight);

  const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.42, 8), antiqueBrassMat);
  saloonLantern.add(lanternBody);
  saloonGroup.add(saloonLantern);

  townGroup.add(saloonGroup);

  // -------------------------------------------------------------
  // 3. TORTILLA FLAT GENERAL MERCANTILE, POST OFFICE & ASSAY (West side)
  // Double display bay windows, goods on porch, assayer scale,
  // dynamite powder crates, burlap sacks, and authentic signage
  // -------------------------------------------------------------
  const storeGroup = new THREE.Group();
  storeGroup.position.set(-14.8, 0, -11.5);

  // Heavy Masonry Foundation Footing
  const storeFoundation = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.4, 10.8), stoneMasonryMat);
  storeFoundation.position.set(0, -0.4, 0);
  storeFoundation.castShadow = true;
  storeFoundation.receiveShadow = true;
  storeGroup.add(storeFoundation);

  const storeMain = new THREE.Mesh(new THREE.BoxGeometry(9.0, 5.8, 10.4), woodClapboardWeathered);
  storeMain.position.set(0, 2.9, 0);
  storeMain.castShadow = true;
  storeMain.receiveShadow = true;
  storeGroup.add(storeMain);

  // Stepped False Front Facade
  const storeFacade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 7.8, 10.8), woodClapboardCedar);
  storeFacade.position.set(4.5, 3.9, 0);
  storeFacade.castShadow = true;
  storeGroup.add(storeFacade);

  const storeCornice = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 11.2), woodTrimCream);
  storeCornice.position.set(4.5, 7.8, 0);
  storeCornice.castShadow = true;
  storeGroup.add(storeCornice);

  // Ornate General Store Painted Signboard (Flush-mounted on facade, facing +X street)
  const storeSignTex = createWesternSignTexture(
    'GENERAL MERCANTILE',
    'TORTILLA FLAT U.S. POST OFFICE & ASSAY OFFICE',
    'MINING SUPPLIES • POWDER & FUSE • ORE WEIGHED & BOUGHT',
    { bg: '#251b14', border: '#cfa95b', text: '#faeccf', subText: '#e5bf76', width: 640, height: 160 }
  );
  const storeSign = createMountedSignboard(storeSignTex, 9.2, 1.6, '+X', 0x251b14);
  storeSign.position.set(4.82, 6.6, 0);
  storeSign.castShadow = true;
  storeGroup.add(storeSign);

  // Porch Awning Overhang with Wooden Shake Shingles
  const storeAwning = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.24, 11.0), roofShingleMat);
  storeAwning.position.set(6.2, 4.4, 0);
  storeAwning.rotation.z = -0.15;
  storeAwning.castShadow = true;
  storeGroup.add(storeAwning);

  for (const pz of [-4.8, 0, 4.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.2, 0.32), woodTrimCream);
    post.position.set(7.8, 2.1, pz);
    post.castShadow = true;
    storeGroup.add(post);
  }

  // Twin Front Display Windows (Facing +X outside)
  for (const wz of [-2.8, 2.8]) {
    const win = createGlazedWindow(1.8, 2.2, woodTrimCream, 3, 3, 0xffd588, townWindowMaterials);
    win.position.set(4.73, 2.2, wz);
    win.rotation.y = Math.PI / 2;
    storeGroup.add(win);
  }

  // Paneled Store Entry Door with Glass Transom
  const storeDoor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 1.4), woodTrimWalnut);
  storeDoor.position.set(4.72, 1.4, 0);
  storeDoor.castShadow = true;
  storeGroup.add(storeDoor);

  const doorBrassKnob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), antiqueBrassMat);
  doorBrassKnob.position.set(4.8, 1.4, -0.5);
  storeGroup.add(doorBrassKnob);

  // Porch Goods: Stacked DuPont Powder Dynamite Crates
  const crateWoodMat = new THREE.MeshStandardMaterial({ color: 0x825a38, roughness: 0.9 });
  for (let c = 0; c < 5; c++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.95), crateWoodMat);
    crate.position.set(6.4 + (c % 2) * 0.7, 0.45 + (c >= 3 ? 0.65 : 0), -2.6 + Math.floor(c / 2) * 0.9);
    crate.castShadow = true;
    storeGroup.add(crate);
  }

  // Outdoor Assayer Ore Balance Table & Scale
  const assayBench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 2.2), woodPlankDeck);
  assayBench.position.set(6.5, 0.55, 2.4);
  assayBench.castShadow = true;
  storeGroup.add(assayBench);

  // Brass beam balance scale
  const scalePost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.65, 8), antiqueBrassMat);
  scalePost.position.set(6.5, 1.3, 2.4);
  storeGroup.add(scalePost);

  const scaleBeam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.6), antiqueBrassMat);
  scaleBeam.position.set(6.5, 1.6, 2.4);
  storeGroup.add(scaleBeam);

  for (const pSide of [-0.25, 0.25]) {
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.04, 10), antiqueBrassMat);
    pan.position.set(6.5, 1.35, 2.4 + pSide);
    storeGroup.add(pan);
  }

  // Prospector Gold Pan leaning on wall
  const goldPan = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.08, 16), forgedIronMat);
  goldPan.position.set(4.8, 0.6, 1.1);
  goldPan.rotation.z = Math.PI / 2;
  goldPan.rotation.x = 0.2;
  storeGroup.add(goldPan);

  townGroup.add(storeGroup);

  // -------------------------------------------------------------
  // 4. TERRITORIAL SHERIFF'S OFFICE & TOWN JAIL (East side)
  // Fieldstone masonry base, iron-barred cell windows, heavy oak
  // studded jail door, Territorial Marshal star badge & Wanted posters
  // -------------------------------------------------------------
  const jailGroup = new THREE.Group();
  jailGroup.position.set(14.8, 0, -8.5);

  // Heavy Masonry Foundation Footing
  const jailFoundation = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.4, 10.0), stoneMasonryMat);
  jailFoundation.position.set(0, -0.4, 0);
  jailFoundation.castShadow = true;
  jailFoundation.receiveShadow = true;
  jailGroup.add(jailFoundation);

  // Hybrid Building: Sonoran Fieldstone Base & Heavy Timber Top
  const jailStoneBase = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.6, 9.6), stoneMasonryMat);
  jailStoneBase.position.set(0, 1.3, 0);
  jailStoneBase.castShadow = true;
  jailStoneBase.receiveShadow = true;
  jailGroup.add(jailStoneBase);

  const jailTimberTop = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.2, 9.4), woodClapboardDark);
  jailTimberTop.position.set(0, 4.2, 0);
  jailTimberTop.castShadow = true;
  jailGroup.add(jailTimberTop);

  // Stone Chimney on side
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.8, 1.4), stoneMasonryMat);
  chimney.position.set(3.8, 3.4, -2.4);
  chimney.castShadow = true;
  jailGroup.add(chimney);

  // False Front Facade
  const jailFacade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 6.6, 9.8), woodClapboardDark);
  jailFacade.position.set(-4.2, 4.3, 0);
  jailFacade.castShadow = true;
  jailGroup.add(jailFacade);

  // Painted Sheriff Signboard (Flush-mounted on facade, facing -X street)
  const jailSignTex = createWesternSignTexture(
    'SHERIFF & TOWN JAIL',
    'TORTILLA FLAT MARSHAL — TERRITORY OF ARIZONA',
    'JUSTICE FOR ALL • SPEEDY TRIAL • LAW & ORDER',
    { bg: '#241b16', border: '#b89248', text: '#faecd5', subText: '#dfb86c', width: 512, height: 128 }
  );
  const jailSign = createMountedSignboard(jailSignTex, 7.8, 1.4, '-X', 0x241b16);
  jailSign.position.set(-4.48, 5.8, 0);
  jailSign.castShadow = true;
  jailGroup.add(jailSign);

  // Barred Cell Windows with Embedded Iron Cross-Grille (Facing -X street)
  for (const wz of [1.8, -2.2]) {
    const cellWinHole = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide })
    );
    cellWinHole.position.set(-4.25, 2.5, wz);
    cellWinHole.rotation.y = -Math.PI / 2;
    jailGroup.add(cellWinHole);

    // Heavy vertical iron bars
    for (let b = -0.45; b <= 0.45; b += 0.22) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), forgedIronMat);
      bar.position.set(-4.28, 2.5, wz + b);
      jailGroup.add(bar);
    }
    // Horizontal cross ties
    for (const hy of [2.1, 2.9]) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.1), forgedIronMat);
      tie.position.set(-4.28, hy, wz);
      jailGroup.add(tie);
    }
  }

  // Studded Oak Jail Door with Bronze Marshal Star
  const jailDoor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 1.5), woodTrimWalnut);
  jailDoor.position.set(-4.3, 1.4, 0);
  jailDoor.castShadow = true;
  jailGroup.add(jailDoor);

  // Peephole iron slide grille
  const peephole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.35), forgedIronMat);
  peephole.position.set(-4.4, 1.9, 0);
  jailGroup.add(peephole);

  // 5-Point Arizona Territorial Marshal Star Badge
  const starBadge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), antiqueBrassMat);
  starBadge.position.set(-4.42, 2.4, 0);
  jailGroup.add(starBadge);

  // Wanted Notice Board with Parchment Posters
  const noticeBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.6), woodPlankDeck);
  noticeBoard.position.set(-4.35, 2.2, 3.8);
  jailGroup.add(noticeBoard);

  const posterTex = createWesternSignTexture(
    'WANTED',
    'REWARD $500 IN GOLD',
    'DEAD OR ALIVE — APACHE TRAIL ROAD AGENTS',
    { bg: '#d4c29c', border: '#442211', text: '#2a1105', subText: '#662211', width: 256, height: 128 }
  );
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.65, 0.85),
    new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.85, side: THREE.FrontSide })
  );
  poster.position.set(-4.42, 2.2, 3.8);
  poster.rotation.y = -Math.PI / 2;
  jailGroup.add(poster);

  townGroup.add(jailGroup);

  // -------------------------------------------------------------
  // 5. STAGECOACH LIVERY BARN & BLACKSMITH SHOP (East side)
  // Board-and-batten gambrel barn, open smithy bay, forge with glowing coals,
  // anvil on tree stump, tools, wagon wheels & cedar split-rail corral
  // -------------------------------------------------------------
  const liveryGroup = new THREE.Group();
  liveryGroup.position.set(14.8, 0, 7.5);

  // Heavy Masonry Foundation Footing
  const liveryFoundation = new THREE.Mesh(new THREE.BoxGeometry(9.8, 1.4, 12.8), stoneMasonryMat);
  liveryFoundation.position.set(0, -0.4, 0);
  liveryFoundation.castShadow = true;
  liveryFoundation.receiveShadow = true;
  liveryGroup.add(liveryFoundation);

  // Main Timber Barn Structure
  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(9.4, 6.2, 12.4), woodClapboardDark);
  barnBody.position.set(0, 3.1, 0);
  barnBody.castShadow = true;
  barnBody.receiveShadow = true;
  liveryGroup.add(barnBody);

  // Realistic Gambrel Barn Roof
  const gambrelLower = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.3, 13.0), roofShingleMat);
  gambrelLower.position.set(0, 6.2, 0);
  gambrelLower.rotation.z = -0.25;
  gambrelLower.castShadow = true;
  liveryGroup.add(gambrelLower);

  const gambrelUpper = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.3, 13.0), roofShingleMat);
  gambrelUpper.position.set(0, 7.2, 0);
  gambrelUpper.rotation.z = 0.15;
  gambrelUpper.castShadow = true;
  liveryGroup.add(gambrelUpper);

  // Upper Hayloft Door & Hoist Beam with Pulley
  const hayloftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 1.8), woodTrimWalnut);
  hayloftDoor.position.set(-4.75, 4.8, 0);
  liveryGroup.add(hayloftDoor);

  const hoistBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8), woodTrimWalnut);
  hoistBeam.position.set(-5.4, 6.2, 0);
  hoistBeam.rotation.z = Math.PI / 2;
  liveryGroup.add(hoistBeam);

  const pulleyWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), forgedIronMat);
  pulleyWheel.position.set(-5.9, 6.0, 0);
  liveryGroup.add(pulleyWheel);

  const hoistRope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.4), woodTrimCream);
  hoistRope.position.set(-5.9, 4.3, 0);
  liveryGroup.add(hoistRope);

  // Painted Livery Signboard (Flush-mounted on facade, facing -X street)
  const liverySignTex = createWesternSignTexture(
    'LIVERY STABLE & BLACKSMITH',
    'TORTILLA FLAT CORRAL — FRESH TEAMS FOR APACHE STAGES',
    'HORSESHOEING • WAGON REPAIRS • FORGE WORK',
    { bg: '#2b1c12', border: '#cfa95b', text: '#fcedd2', subText: '#dfb86c', width: 640, height: 160 }
  );
  const liverySign = createMountedSignboard(liverySignTex, 9.2, 1.6, '-X', 0x2b1c12);
  liverySign.position.set(-4.88, 5.8, 0);
  liverySign.castShadow = true;
  liveryGroup.add(liverySign);

  // Open Blacksmith Bay with Forge, Anvil & Bellows
  const forgeBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), stoneMasonryMat);
  forgeBase.position.set(-3.2, 0.45, 3.8);
  forgeBase.castShadow = true;
  liveryGroup.add(forgeBase);

  // Glowing Charcoal Fire Bed
  const forgeFire = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 12),
    new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff4400,
      emissiveIntensity: 1.4,
    })
  );
  forgeFire.position.set(-3.2, 0.91, 3.8);
  forgeFire.rotation.x = -Math.PI / 2;
  liveryGroup.add(forgeFire);

  // Heavy Iron Blacksmith Anvil on Mesquite Tree Stump
  const anvilStump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.75, 10), woodTrimWalnut);
  anvilStump.position.set(-1.8, 0.38, 3.8);
  anvilStump.castShadow = true;
  liveryGroup.add(anvilStump);

  const anvilMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 1.05), forgedIronMat);
  anvilMesh.position.set(-1.8, 0.92, 3.8);
  anvilMesh.castShadow = true;
  liveryGroup.add(anvilMesh);

  // Leaning Wagon Wheels with Steel Tires
  for (let w = 0; w < 3; w++) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 16), woodTrimWalnut);
    wheel.position.set(-4.5, 0.7, -2.8 - w * 1.1);
    wheel.rotation.z = Math.PI / 2;
    wheel.rotation.x = 0.25;
    wheel.castShadow = true;
    liveryGroup.add(wheel);

    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.71, 0.03, 6, 16), forgedIronMat);
    tire.position.copy(wheel.position);
    tire.rotation.copy(wheel.rotation);
    liveryGroup.add(tire);
  }

  // Golden Hay Bales
  const hayMat = new THREE.MeshStandardMaterial({ color: 0xc6a246, roughness: 0.98 });
  for (let h = 0; h < 6; h++) {
    const bale = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.8), hayMat);
    bale.position.set(1.6 + (h % 2) * 1.3, 0.4 + Math.floor(h / 2) * 0.7, -2.8 + (h % 3) * 0.5);
    bale.castShadow = true;
    liveryGroup.add(bale);
  }

  // Cedar Split-Rail Corral
  for (let cz = -5.0; cz <= 5.0; cz += 2.5) {
    const cPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), woodTrimWalnut);
    cPost.position.set(5.5, 0.7, cz);
    liveryGroup.add(cPost);
  }
  for (const cy of [0.6, 1.1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 10.4), woodPlankDeck);
    rail.position.set(5.5, cy, 0);
    liveryGroup.add(rail);
  }

  townGroup.add(liveryGroup);

  // -------------------------------------------------------------
  // 6. HISTORIC ARTESIAN WATER TOWER & CEDAR WATER TROUGH (West side)
  // 4-legged heavy timber stilt trestle with diagonal cross-braces,
  // iron-banded round cedar cistern, conical roof & drinking trough
  // -------------------------------------------------------------
  const waterTowerGroup = new THREE.Group();
  waterTowerGroup.position.set(-13.0, 0, 16.5);

  // 4 Robust Stilt Legs
  for (const tx of [-1.6, 1.6]) {
    for (const tz of [-1.6, 1.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 6.8, 0.42), woodTrimWalnut);
      leg.position.set(tx, 3.4, tz);
      leg.castShadow = true;
      waterTowerGroup.add(leg);
    }
  }

  // Diagonal cross-tie braces
  for (const by of [2.2, 4.6]) {
    for (const axis of ['x', 'z']) {
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(axis === 'x' ? 3.4 : 0.2, 0.2, axis === 'z' ? 3.4 : 0.2),
        woodPlankDeck
      );
      brace.position.set(0, by, 0);
      waterTowerGroup.add(brace);
    }
  }

  // Heavy Staging Platform
  const towerPlatform = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 4.4), woodPlankDeck);
  towerPlatform.position.set(0, 6.8, 0);
  towerPlatform.castShadow = true;
  waterTowerGroup.add(towerPlatform);

  // Round Cedar Wood-Stave Water Cistern Tank
  const waterTank = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 3.2, 16),
    woodClapboardCedar
  );
  waterTank.position.set(0, 8.5, 0);
  waterTank.castShadow = true;
  waterTowerGroup.add(waterTank);

  // Forged Iron Tension Band Hoops
  for (const hy of [7.3, 8.1, 8.9, 9.7]) {
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(2.24, 2.24, 0.08, 16), forgedIronMat);
    hoop.position.set(0, hy, 0);
    waterTowerGroup.add(hoop);
  }

  // Conical Shake Roof with Weather-Vane Spire
  const tankRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.4, 16), roofShingleMat);
  tankRoof.position.set(0, 10.8, 0);
  tankRoof.castShadow = true;
  waterTowerGroup.add(tankRoof);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.2, 6), forgedIronMat);
  spire.position.set(0, 12.0, 0);
  waterTowerGroup.add(spire);

  // Iron Downspout Pipe Pouring into Horse Trough
  const downspout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.4, 8), forgedIronMat);
  downspout.position.set(2.4, 3.4, 0);
  waterTowerGroup.add(downspout);

  // Long Hand-Hewn Cedar Horse & Prospector Water Trough
  const trough = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 4.2), woodPlankDeck);
  trough.position.set(3.4, 0.38, 0);
  trough.castShadow = true;
  waterTowerGroup.add(trough);

  // Clear bubbling spring water surface (hydrates player to 100%)
  const troughWater = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 3.8), cleanWaterMat);
  troughWater.position.set(3.4, 0.65, 0);
  waterTowerGroup.add(troughWater);

  // Water Tower Painted Signboard (facing East towards the street: +X)
  const wellSignTex = createWesternSignTexture(
    'ARTESIAN WELL WATER',
    'TORTILLA FLAT SPRING — ELEVATION 1,720 FT',
    'FREE PURE WATER FOR TRAIL HORSES & PROSPECTORS',
    { bg: '#251b14', border: '#cfa95b', text: '#fcedd2', subText: '#dfb86c', width: 512, height: 128 }
  );
  const wellSign = createMountedSignboard(wellSignTex, 4.0, 0.95, '+X', 0x251b14);
  wellSign.position.set(2.15, 5.8, 0);
  wellSign.castShadow = true;
  waterTowerGroup.add(wellSign);

  // Register Water Refill Spot for Canteen in world coordinates
  waterRefillPoints.push(new THREE.Vector3(townX - 9.6, townY + 0.65, townZ + 16.5));

  townGroup.add(waterTowerGroup);

  // -------------------------------------------------------------
  // 7. HISTORIC ABBOTT-DOWNING CONCORD STAGECOACH (Main Street)
  // Historically authentic 1880s Arizona Overland Stagecoach:
  // coach-red wooden cabin, curved leather thoroughbraces, spoked artillery wheels,
  // driver's elevated box seat, roof luggage rail with trunks and mail pouches
  // -------------------------------------------------------------
  const coachGroup = new THREE.Group();
  coachGroup.position.set(0, 0, -2.0);
  coachGroup.rotation.y = 0.05;

  const coachRedMat = new THREE.MeshStandardMaterial({ color: 0x8a1c14, roughness: 0.55 });
  const coachYellowMat = new THREE.MeshStandardMaterial({ color: 0xd69928, roughness: 0.5 });
  const coachLeatherMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.75 });
  const coachCanvasMat = new THREE.MeshStandardMaterial({ color: 0xd2c09c, roughness: 0.95 });

  // Main Coach Cabin Body with Elliptical Curves
  const coachBody = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.9, 3.6), coachRedMat);
  coachBody.position.set(0, 1.95, 0);
  coachBody.castShadow = true;
  coachGroup.add(coachBody);

  // Gold Pinstripe Decorative Belt Line
  const pinstripe = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.06, 3.64), antiqueBrassMat);
  pinstripe.position.set(0, 1.95, 0);
  coachGroup.add(pinstripe);

  // Passenger Doors & Paned Windows
  for (const cx of [-1.09, 1.09]) {
    const doorOutline = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.5),
      new THREE.MeshBasicMaterial({ color: 0x160804 })
    );
    doorOutline.position.set(cx, 1.95, 0);
    doorOutline.rotation.y = cx > 0 ? Math.PI / 2 : -Math.PI / 2;
    coachGroup.add(doorOutline);
  }

  // Driver & Shotgun Messenger's Elevated Box Seat
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.95), coachLeatherMat);
  driverSeat.position.set(0, 2.65, 1.75);
  driverSeat.castShadow = true;
  coachGroup.add(driverSeat);

  const footboard = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.75), woodTrimWalnut);
  footboard.position.set(0, 2.15, 2.3);
  footboard.castShadow = true;
  coachGroup.add(footboard);

  // Roof Luggage Railing with Canvas Trunks & Mail Bags
  const roofRail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 2.8), forgedIronMat);
  roofRail.position.set(0, 3.05, -0.3);
  coachGroup.add(roofRail);

  for (let t = 0; t < 4; t++) {
    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.5, 0.7),
      t % 2 === 0 ? coachCanvasMat : coachLeatherMat
    );
    trunk.position.set((t % 2 - 0.5) * 0.9, 3.35, -0.8 + Math.floor(t / 2) * 0.9);
    trunk.castShadow = true;
    coachGroup.add(trunk);
  }

  // Spoked Artillery Wheels (Rear: 1.6m diam, Front: 1.2m diam)
  // Rear Large Wheels
  for (const wx of [-1.22, 1.22]) {
    const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.16, 18), coachYellowMat);
    rWheel.position.set(wx, 0.82, -1.25);
    rWheel.rotation.z = Math.PI / 2;
    rWheel.castShadow = true;
    coachGroup.add(rWheel);

    const rHub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 12), forgedIronMat);
    rHub.position.copy(rWheel.position);
    rHub.rotation.copy(rWheel.rotation);
    coachGroup.add(rHub);
  }

  // Front Smaller Turning Wheels
  for (const wx of [-1.18, 1.18]) {
    const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 18), coachYellowMat);
    fWheel.position.set(wx, 0.62, 1.25);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.castShadow = true;
    coachGroup.add(fWheel);

    const fHub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 12), forgedIronMat);
    fHub.position.copy(fWheel.position);
    fHub.rotation.copy(fWheel.rotation);
    coachGroup.add(fHub);
  }

  // Double Hitch Pole extending forward for horses
  const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 8), woodTrimWalnut);
  tongue.position.set(0, 0.52, 4.1);
  tongue.rotation.x = Math.PI / 2;
  coachGroup.add(tongue);

  // Carriage Brass Beveled Oil Lamps
  for (const lx of [-1.2, 1.2]) {
    const cLamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 0.22), antiqueBrassMat);
    cLamp.position.set(lx, 2.7, 1.7);
    coachGroup.add(cLamp);
  }

  townGroup.add(coachGroup);

  // -------------------------------------------------------------
  // 8. TOWN PLAZA CAMPFIRE, REST & WELCOME ARCH (South edge)
  // -------------------------------------------------------------
  // Town Welcome Archway
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0, 22.0);

  for (const px of [-4.8, 4.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.8, 0.45), woodTrimWalnut);
    post.position.set(px, 2.9, 0);
    post.castShadow = true;
    archGroup.add(post);
  }

  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.5, 0.5), woodTrimWalnut);
  archBeam.position.set(0, 5.6, 0);
  archBeam.castShadow = true;
  archGroup.add(archBeam);

  const archSignTex = createWesternSignTexture(
    'HISTORIC TORTILLA FLAT',
    'POPULATION 6 — ELEVATION 1,720 FT — EST. 1880',
    'HISTORIC APACHE TRAIL STAGE STOP & ROOSEVELT FREIGHT DEPOT',
    { bg: '#2b1b11', border: '#cfa95b', text: '#fcedd2', subText: '#dfb86c', width: 680, height: 160 }
  );
  const archSign = createMountedSignboard(archSignTex, 8.8, 1.6, '+Z', 0x2b1b11);
  archSign.position.set(0, 4.5, 0.08);
  archSign.castShadow = true;
  archGroup.add(archSign);

  townGroup.add(archGroup);

  // Campfire Ring & Prospector Log Benches
  const campGroup = new THREE.Group();
  campGroup.position.set(3.5, 0, 14.0);

  for (let a = 0; a < 12; a++) {
    const angle = (a / 12) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), stoneMasonryMat);
    stone.position.set(Math.cos(angle) * 1.2, 0.16, Math.sin(angle) * 1.2);
    campGroup.add(stone);
  }

  const campEmbers = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a0a04, emissive: 0xcc3300, emissiveIntensity: 0.9 })
  );
  campEmbers.position.set(0, 0.08, 0);
  campEmbers.rotation.x = -Math.PI / 2;
  campGroup.add(campEmbers);

  for (let l = 0; l < 4; l++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.3), woodTrimWalnut);
    log.position.set(0, 0.22, 0);
    log.rotation.x = 0.35;
    log.rotation.y = (l * Math.PI) / 2;
    campGroup.add(log);
  }

  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.42, 8), forgedIronMat);
  kettle.position.set(0, 0.46, 0);
  campGroup.add(kettle);

  const campLight = new THREE.PointLight(0xff6611, 2.6, 16);
  campLight.position.set(0, 0.9, 0);
  campGroup.add(campLight);

  for (const bz of [-2.4, 2.4]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 0.55), woodPlankDeck);
    bench.position.set(0, 0.35, bz);
    campGroup.add(bench);
  }
  townGroup.add(campGroup);

  // Mileage Fingerpost Sign pointing to landmarks
  const fingerpost = new THREE.Group();
  fingerpost.position.set(4.5, 0, 19.0);

  const fpPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.8, 8), woodTrimWalnut);
  fpPole.position.set(0, 1.4, 0);
  fingerpost.add(fpPole);

  const trailSignTex = createWesternSignTexture(
    '← PERALTA PASS 240m',
    "WEAVER'S NEEDLE: 270m • LOST DUTCHMAN MINE: 360m",
    'NORTH: SALT RIVER CANYON 60m',
    { bg: '#291c13', border: '#cda851', text: '#fceecf', subText: '#dfb86c', width: 512, height: 128 }
  );
  const trailSign = createMountedSignboard(trailSignTex, 2.6, 0.8, '+Z', 0x291c13);
  trailSign.position.set(0, 2.3, 0.06);
  trailSign.castShadow = true;
  fingerpost.add(trailSign);
  townGroup.add(fingerpost);

  // -------------------------------------------------------------
  // 9. THE SALT RIVER OVERLOOK, FREIGHT DEPOT & TIMBER PIER (North at z = -286 to -304)
  // Winding scenic trail from town down to the riverbank.
  // Freight dock for 1904 Roosevelt Dam construction supplies,
  // heavy timber pier extending out over the water, and river skiff.
  // -------------------------------------------------------------
  // Scenic River Canyon Overlook Signboard (z = -286, trail elev: ~5.7m, offset -1.8m)
  const overlookGroup = new THREE.Group();
  overlookGroup.position.set(-6.0, -1.8, -36.0); // World Z: -286

  const overlookSignTex = createWesternSignTexture(
    'THE SALT RIVER CANYON',
    'APACHE TRAIL SCENIC GORGE — ELEVATION 1,680 FT',
    'EAST: ROOSEVELT DAM 22mi • WEST: MORMON FLAT 5mi',
    { bg: '#251b14', border: '#cfa95b', text: '#fcedd2', subText: '#dfb86c', width: 512, height: 128 }
  );
  const overlookSign = createMountedSignboard(overlookSignTex, 3.6, 0.9, '+Z', 0x251b14);
  overlookSign.position.set(0, 1.8, 0.06);
  overlookSign.castShadow = true;
  overlookGroup.add(overlookSign);

  // Wooden Overlook Viewing Rail
  for (const rx of [-2.4, 0, 2.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), woodTrimWalnut);
    post.position.set(rx, 0.6, 0.6);
    overlookGroup.add(post);
  }
  const oRail = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.14), woodPlankDeck);
  oRail.position.set(0, 1.1, 0.6);
  overlookGroup.add(oRail);
  townGroup.add(overlookGroup);

  // Salt River Project Freight Depot Platform (z = -298, trail elev: ~3.9m, offset -3.6m)
  const depotGroup = new THREE.Group();
  depotGroup.position.set(13.0, -3.6, -48.0); // World Z: -298

  const depotDeck = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.32, 9.0), woodPlankDeck);
  depotDeck.position.set(0, 0.16, 0);
  depotDeck.receiveShadow = true;
  depotDeck.castShadow = true;
  depotGroup.add(depotDeck);

  // Stacked Portland Cement Barrels for Roosevelt Dam
  const cBarrelMat = new THREE.MeshStandardMaterial({ color: 0x5a4432, roughness: 0.9 });
  for (let b = 0; b < 8; b++) {
    const cBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.0, 10), cBarrelMat);
    cBarrel.position.set(-2.4 + (b % 3) * 0.95, 0.65 + (b >= 6 ? 1.0 : 0), -2.2 + Math.floor(b / 3) * 1.0);
    cBarrel.castShadow = true;
    depotGroup.add(cBarrel);
  }

  // Heavy Freight Derrick / Cargo Crane
  const craneMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.8, 8), woodTrimWalnut);
  craneMast.position.set(2.6, 3.4, 2.4);
  craneMast.castShadow = true;
  depotGroup.add(craneMast);

  const craneBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.4, 8), woodTrimWalnut);
  craneBoom.position.set(1.2, 4.8, 0.6);
  craneBoom.rotation.z = -0.55;
  craneBoom.rotation.y = 0.45;
  craneBoom.castShadow = true;
  depotGroup.add(craneBoom);

  const depotSignTex = createWesternSignTexture(
    'SALT RIVER PROJECT',
    'ROOSEVELT DAM FREIGHT STAGING — 1904',
    'HYDRAULIC MACHINERY • CEMENT • CANYON FREIGHT',
    { bg: '#251b14', border: '#bfa060', text: '#fcedd2', subText: '#dfb86c', width: 512, height: 128 }
  );
  const depotSign = createMountedSignboard(depotSignTex, 3.6, 0.8, '+Z', 0x251b14);
  depotSign.position.set(0, 2.5, 3.8);
  depotSign.castShadow = true;
  depotGroup.add(depotSign);
  townGroup.add(depotGroup);

  // River Pier & Boat Landing extending out into the Salt River (z = -304, water elev: 2.8m, offset -4.7m)
  const riverPierGroup = new THREE.Group();
  riverPierGroup.position.set(-2.0, -4.7, -54.0); // World Z: -304

  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 14.0), woodPlankDeck);
  pierDeck.position.set(0, 0.18, -4.0);
  pierDeck.castShadow = true;
  pierDeck.receiveShadow = true;
  riverPierGroup.add(pierDeck);

  // Heavy Round Timber Pilings driven into riverbed
  for (const px of [-2.2, 2.2]) {
    for (const pz of [2.0, -2.0, -6.0, -10.0]) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 4.8, 8), woodTrimWalnut);
      piling.position.set(px, -2.0, pz);
      piling.castShadow = true;
      riverPierGroup.add(piling);
    }
  }

  // Mooring Bollards & Coiled Hemp Ropes
  for (const mPos of [{ x: -2.2, z: -1.0 }, { x: -2.2, z: -7.0 }, { x: 2.2, z: -4.0 }, { x: 2.2, z: -9.0 }]) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.95, 8), woodTrimWalnut);
    bollard.position.set(mPos.x, 0.65, mPos.z);
    bollard.castShadow = true;
    riverPierGroup.add(bollard);

    const rope = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.05, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x8a7452, roughness: 0.95 })
    );
    rope.rotation.x = Math.PI / 2;
    rope.position.set(mPos.x, 0.45, mPos.z);
    riverPierGroup.add(rope);
  }

  // Pier Lantern Post
  const pierLight = new THREE.PointLight(0xffa834, 2.2, 14);
  pierLight.position.set(-1.8, 3.2, -9.0);
  riverPierGroup.add(pierLight);

  const pierLanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), woodTrimWalnut);
  pierLanternPole.position.set(-2.0, 1.7, -9.0);
  riverPierGroup.add(pierLanternPole);

  // River Skiff moored at the pier
  const skiff = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 4.8), woodClapboardWeathered);
  skiff.position.set(-3.8, -0.6, -6.0);
  skiff.rotation.y = 0.08;
  riverPierGroup.add(skiff);

  // River Landing Signboard
  const landingSignTex = createWesternSignTexture(
    'SALT RIVER LANDING',
    'TORTILLA FLAT FREIGHT DOCK — ELEVATION 1,680 FT',
    'APACHE TRAIL FERRY & WATER SUPPLY',
    { bg: '#251b14', border: '#cfa95b', text: '#fcedd2', subText: '#dfb86c', width: 512, height: 128 }
  );
  const landingSign = createMountedSignboard(landingSignTex, 3.6, 0.85, '+Z', 0x251b14);
  landingSign.position.set(0, 2.4, 2.5);
  landingSign.castShadow = true;
  riverPierGroup.add(landingSign);

  townGroup.add(riverPierGroup);

  // -------------------------------------------------------------
  // 12. FESTIVE OVERHEAD STRING LIGHTS ACROSS MAIN STREET & BUILDINGS
  // -------------------------------------------------------------
  const festoonGroup = new THREE.Group();

  // Swag 1: South Welcome Entrance Archway Catenary
  festoonGroup.add(
    createFestoonStringLights(
      new THREE.Vector3(-6.8, 5.0, 20.5),
      new THREE.Vector3(6.8, 5.0, 20.5),
      10,
      0.75,
      townStringLights,
      glowTexture,
      { baseIntensity: 2.2 }
    )
  );

  // Swag 2: Plaza Campfire & Livery South Catenary
  festoonGroup.add(
    createFestoonStringLights(
      new THREE.Vector3(-7.2, 5.2, 13.5),
      new THREE.Vector3(7.2, 5.2, 13.5),
      11,
      0.8,
      townStringLights,
      glowTexture,
      { baseIntensity: 2.4 }
    )
  );

  // Swag 3: Main Street Center (over Stagecoach stop) Catenary with Main Thoroughfare Illuminating Light
  festoonGroup.add(
    createFestoonStringLights(
      new THREE.Vector3(-7.2, 5.4, 2.5),
      new THREE.Vector3(7.2, 5.4, 2.5),
      11,
      0.8,
      townStringLights,
      glowTexture,
      { baseIntensity: 2.8, hasLight: true }
    )
  );

  // Swag 4: Saloon to Jail Crossing Catenary
  festoonGroup.add(
    createFestoonStringLights(
      new THREE.Vector3(-7.2, 5.4, -6.5),
      new THREE.Vector3(7.2, 5.4, -6.5),
      11,
      0.8,
      townStringLights,
      glowTexture,
      { baseIntensity: 2.4 }
    )
  );

  // Swag 5: General Mercantile to Jail North Catenary
  festoonGroup.add(
    createFestoonStringLights(
      new THREE.Vector3(-7.2, 5.2, -14.5),
      new THREE.Vector3(7.2, 5.2, -14.5),
      11,
      0.8,
      townStringLights,
      glowTexture,
      { baseIntensity: 2.2 }
    )
  );

  // Swag 6: Saloon Second-Floor Balcony Balustrade Garland
  festoonGroup.add(
    createFestoonStringLights(
      new THREE.Vector3(-6.8, 4.45, 4.0),
      new THREE.Vector3(-6.8, 4.45, 12.5),
      12,
      0.32,
      townStringLights,
      glowTexture,
      { baseIntensity: 2.0 }
    )
  );

  // Swag 7: General Mercantile Front Porch Eaves Garland
  festoonGroup.add(
    createFestoonStringLights(
      new THREE.Vector3(-7.0, 3.65, -15.5),
      new THREE.Vector3(-7.0, 3.65, -7.5),
      10,
      0.3,
      townStringLights,
      glowTexture,
      { baseIntensity: 2.0 }
    )
  );

  townGroup.add(festoonGroup);

  // -------------------------------------------------------------
  // 13. BOARDWALK CARRIAGE POST LANTERNS (West & East Curbs)
  // -------------------------------------------------------------
  const boardwalkLanternsGroup = new THREE.Group();

  // West Elevated Boardwalk Curbs (Saloon & Mercantile, facing +X street)
  const westLanternZs = [16.0, 8.5, 0.0, -8.5, -17.0];
  for (const lz of westLanternZs) {
    boardwalkLanternsGroup.add(
      createBoardwalkLanternPost(-7.15, lz, 0, townLanterns, { baseIntensity: 1.8 })
    );
  }

  // East Elevated Boardwalk Curbs (Jail & Livery, facing -X street)
  const eastLanternZs = [12.0, 5.0, -2.0, -9.0, -16.0];
  for (const lz of eastLanternZs) {
    boardwalkLanternsGroup.add(
      createBoardwalkLanternPost(7.15, lz, Math.PI, townLanterns, {
        baseIntensity: 2.0,
        hasLight: lz === -2.0, // Primary East boardwalk light outside Marshal office
      })
    );
  }

  townGroup.add(boardwalkLanternsGroup);

  // -------------------------------------------------------------
  // 14. FLAMING PITCH-PINE TORCHES & IRON CRESSET BRAZIERS
  // -------------------------------------------------------------
  const torchesGroup = new THREE.Group();

  // Entrance Archway Flanking Torch Pillars
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-5.8, 0, 22.0), townTorches, { height: 2.4, baseIntensity: 3.0 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(5.8, 0, 22.0), townTorches, { height: 2.4, baseIntensity: 3.0 })
  );

  // Saloon Entrance Boardwalk Steps
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-7.0, 0.22, 6.2), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-7.0, 0.22, 10.8), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );

  // Mercantile Storefront Boardwalk
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-7.0, 0.22, -13.8), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-7.0, 0.22, -9.2), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );

  // Sheriff Office & Town Jail Entrance
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(7.0, 0.22, -9.8), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(7.0, 0.22, -7.2), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );

  // Livery Stable & Blacksmith Forge Entrance
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(7.0, 0.22, 5.2), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(7.0, 0.22, 9.8), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );

  // Concord Stagecoach Stop
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(0.5, 0, -1.5), townTorches, { height: 2.25, baseIntensity: 2.6 })
  );

  // Plaza Campfire Gathering Circle Perimeter
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(1.2, 0, 14.0), townTorches, { height: 2.0, baseIntensity: 2.4 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(5.8, 0, 14.0), townTorches, { height: 2.0, baseIntensity: 2.4 })
  );

  // North Canyon Trailhead & Scenic Overlook
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-3.6, -1.8, -36.0), townTorches, { height: 2.0, baseIntensity: 2.6 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-8.4, -1.8, -36.0), townTorches, { height: 2.0, baseIntensity: 2.6 })
  );

  // Salt River Pier & Freight Dock Landing
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(-4.5, -4.7, -53.0), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );
  torchesGroup.add(
    createFrontierTorch(new THREE.Vector3(0.5, -4.7, -53.0), townTorches, { height: 2.25, baseIntensity: 2.8 })
  );

  townGroup.add(torchesGroup);

  // -------------------------------------------------------------
  // 15. DYNAMIC DIURNAL LIGHTING & FLICKER ANIMATION CONTROLLER
  // -------------------------------------------------------------
  let animClock = 0;
  const updateLighting = (timeOfDay: number, delta: number) => {
    animClock += delta;
    const nightFactor = getTortillaNightFactor(timeOfDay);

    // 1. Update Dancing Torches: organic multi-harmonic wind flutter, scaling, and crackle
    for (let i = 0; i < townTorches.length; i++) {
      const t = townTorches[i];
      const offset = t.flickerOffset;
      const flicker =
        1.0 +
        0.16 * Math.sin(animClock * 9.5 + offset) +
        0.08 * Math.cos(animClock * 23.3 + offset * 2.1);
      if (t.light) {
        t.light.intensity = t.baseIntensity * (0.15 + 0.85 * nightFactor) * flicker;
      }

      const scaleY = 1.0 + 0.22 * Math.sin(animClock * 11.2 + offset);
      const scaleXZ = 1.0 + 0.12 * Math.cos(animClock * 14.0 + offset);
      t.flameMesh.scale.set(scaleXZ, scaleY, scaleXZ);
      t.flameMesh.rotation.y = animClock * 2.0 + offset;
    }

    // 2. Update Festive Overhead String Lights: warm glowing incandescent filaments
    const bulbFlicker = 1.0 + 0.03 * Math.sin(animClock * 4.2);
    for (let i = 0; i < townStringLights.length; i++) {
      const sl = townStringLights[i];
      if (sl.light) {
        sl.light.intensity = sl.baseIntensity * nightFactor * bulbFlicker;
      }
      const emissiveVal = sl.baseEmissive * (0.05 + 0.95 * nightFactor) * bulbFlicker;
      for (let b = 0; b < sl.bulbMaterials.length; b++) {
        sl.bulbMaterials[b].emissiveIntensity = emissiveVal;
      }
    }

    // 3. Update Boardwalk Carriage Post Lanterns: steady kerosene glow
    for (let i = 0; i < townLanterns.length; i++) {
      const l = townLanterns[i];
      if (l.light) {
        const lFlicker = 1.0 + 0.04 * Math.sin(animClock * 5.2 + i * 1.4);
        l.light.intensity = l.baseIntensity * (0.08 + 0.92 * nightFactor) * lFlicker;
      }
    }

    // 4. Update Glazed Windows: cozy tavern and mercantile radiation into the street
    const winEmissive = 0.15 + 1.25 * nightFactor;
    for (let i = 0; i < townWindowMaterials.length; i++) {
      townWindowMaterials[i].emissiveIntensity = winEmissive;
    }
  };

  // Expose update controller to render loop
  townGroup.userData.updateLighting = updateLighting;
  townGroup.userData.lightingData = {
    torches: townTorches,
    stringLights: townStringLights,
    lanterns: townLanterns,
    windows: townWindowMaterials,
  };

  // Initial evaluation for the current hour
  updateLighting(12.0, 0.016);

  // Add the entire historic town to the scene
  scene.add(townGroup);

  return townGroup;
}
