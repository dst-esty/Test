import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { Landmark } from '../types';
import { buildTortillaFlatSettlement } from './tortillaFlat';
import { buildMalapaisMountainSummit, buildPistolCanyonGorge } from './malapaisPistol';
import { buildPetersCanyonPinchAndBivouac } from './petersCanyonPinch';
import { buildSuperstitionPeaksAndSprings } from './superstitionPeaks';
import { buildRuthMysteryAndSkeletons } from './ruthMysteryAndSkeletons';
import { buildDickHolmesCluesSite } from './dickHolmesCluesSite';
import { buildFrontierExplorationDiscoveries } from './frontierExplorationDiscoveries';
import { buildPeraltaSolveSites } from './peraltaSolveSites';

export interface LandmarkMeshes {
  weaversNeedle: THREE.Group;
  trailhead: THREE.Group;
  spring: THREE.Group;
  massacre: THREE.Group;
  dugout: THREE.Group;
  eyeRock: THREE.Group;
  mine: THREE.Group;
  mineInterior: THREE.Group;
  tortillaFlat: THREE.Group;
  malapaisMountain?: THREE.Group;
  pistolCanyon?: THREE.Group;
  petersCanyonPinch?: THREE.Group;
  blackTopMesa?: THREE.Group;
  battleshipMountain?: THREE.Group;
  minersNeedle?: THREE.Group;
  charleboisSpring?: THREE.Group;
  fourPeaks?: THREE.Group;
  laBargeUpperBox?: THREE.Group;
  squawBoxCanyon?: THREE.Group;
  petersCanyonAndCave?: THREE.Group;
  petersMesa?: THREE.Group;
  ruthCamp?: THREE.Group;
  ruthSkull?: THREE.Group;
  craveySite?: THREE.Group;
  massacreSkeletons?: THREE.Group;
  dickHolmesSite?: THREE.Group;
  frontierDiscoveries?: Map<string, THREE.Group>;
  peraltaSolveSites?: THREE.Group;
  waterRefillPoints: THREE.Vector3[];
}

function createWeaversNeedleTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.Texture() as unknown as THREE.CanvasTexture;
  }
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm Arizona dacite/rhyolite ash-flow tuff base
  ctx.fillStyle = '#b65f32';
  ctx.fillRect(0, 0, size, size);

  // 1. Horizontal geological bedding & ash-flow flow-banding strata
  for (let y = 0; y < size; y++) {
    const strataNoise =
      Math.sin(y * 0.04) * 0.45 +
      Math.cos(y * 0.11) * 0.30 +
      Math.sin(y * 0.015) * 0.25;
    const brightness = 0.82 + strataNoise * 0.28;
    const r = Math.min(255, Math.floor(196 * brightness));
    const g = Math.min(255, Math.floor(112 * brightness));
    const b = Math.min(255, Math.floor(62 * brightness));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, size, 1);
  }

  // 2. High-contrast pale ash-flow tuff horizontal bedding lenses
  for (let i = 0; i < 28; i++) {
    const y = Math.floor(Math.random() * size);
    const h = 2 + Math.floor(Math.random() * 6);
    ctx.fillStyle = `rgba(224, 186, 142, ${0.12 + Math.random() * 0.18})`;
    ctx.fillRect(0, y, size, h);
  }

  // 3. Vertical manganese/iron oxide desert varnish runoff streaks (warm umber/sienna)
  for (let i = 0; i < 48; i++) {
    const x = Math.floor(Math.random() * size);
    const w = 2 + Math.floor(Math.random() * 6);
    const alpha = 0.08 + Math.random() * 0.18;
    const isDarkVarnish = Math.random() > 0.45;
    ctx.fillStyle = isDarkVarnish
      ? `rgba(62, 34, 22, ${alpha})`
      : `rgba(245, 185, 115, ${alpha * 0.8})`;
    ctx.fillRect(x, 0, w, size);
  }

  // 4. Fine crystalline rock grain, quartz phenocrysts, and micro-grit
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 32;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.78));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.55));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  return texture;
}

/**
 * Procedural Natural Sandstone Rock Arch ("Eye of the Needle")
 * Monolithic wind- and water-eroded dacite/sandstone arch.
 * Rooted 8 meters into the mountain ridge with zero floating gaps or boxy overhangs.
 */
function createEyeArchGeometry(): THREE.BufferGeometry {
  const numSlices = 32;
  const numRadial = 14;
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Smooth continuous arch curve: left subterranean anchor -> arch crest -> right subterranean anchor
  for (let i = 0; i <= numSlices; i++) {
    const t = i / numSlices;
    let px = 0;
    let py = 0;
    let pz = 0;
    let tx = 0;
    let ty = 1;
    let tz = 0;

    if (t <= 0.28) {
      // Left vertical/tapered pillar
      const u = t / 0.28;
      px = -4.6;
      py = -8.0 + u * 12.0; // from -8.0 to +4.0
      tx = 0;
      ty = 1;
    } else if (t <= 0.72) {
      // Arched crest spanning between -4.6 and +4.6
      const u = (t - 0.28) / 0.44; // 0 to 1
      const angle = Math.PI * (1.0 - u); // PI down to 0
      px = Math.cos(angle) * 4.6;
      py = 4.0 + Math.sin(angle) * 7.2;
      tx = -Math.sin(angle) * 4.6;
      ty = Math.cos(angle) * 7.2;
    } else {
      // Right vertical/tapered pillar
      const u = (t - 0.72) / 0.28;
      px = 4.6;
      py = 4.0 - u * 12.0; // from +4.0 to -8.0
      tx = 0;
      ty = -1;
    }

    // Tangent normalization
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;

    // Normal & Binormal for cross-section
    const nx = -ty;
    const ny = tx;
    const nz = 0;
    const bx = 0;
    const by = 0;
    const bz = 1;

    // Radius along arch: wide subterranean footing (3.8m), tapering to 2.2m at apex
    const isBase = py < 0;
    const baseWiden = isBase ? Math.pow(Math.min(1.0, -py / 8.0), 1.5) * 1.5 : 0;
    const archTaper = Math.max(0, py - 4.0) / 7.2;
    const baseRadius = 2.5 + baseWiden - archTaper * 0.45;

    for (let j = 0; j <= numRadial; j++) {
      const phi = (j / numRadial) * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Geological jointing & strata
      const facet = Math.cos(phi * 4.0) * 0.12 + Math.sin(phi * 7.0) * 0.05;
      const strata = Math.sin(py * 2.4) * 0.06;
      const r = baseRadius * (1.0 + facet + strata);

      const vx = px + (nx * cosP + bx * sinP) * r;
      const vy = py + (ny * cosP + by * sinP) * r;
      const vz = pz + (nz * cosP + bz * sinP) * r;

      positions.push(vx, vy, vz);

      // Normal approximation
      const normX = nx * cosP + bx * sinP;
      const normY = ny * cosP + by * sinP;
      const normZ = nz * cosP + bz * sinP;
      normals.push(normX, normY, normZ);

      // Vertex colors: rich terracotta sandstone with dark desert varnish near crest
      let cr = 0.72;
      let cg = 0.35;
      let cb = 0.20;
      if (py > 8.0) {
        // Desert varnish patina
        const vRatio = Math.min(1.0, (py - 8.0) / 3.5);
        cr = cr * (1 - vRatio * 0.55);
        cg = cg * (1 - vRatio * 0.45);
        cb = cb * (1 - vRatio * 0.35);
      } else if (py < 0) {
        // Deep subterranean bedrock
        cr *= 0.85;
        cg *= 0.85;
        cb *= 0.85;
      }
      colors.push(cr, cg, cb);
    }
  }

  // Connect triangle faces
  for (let i = 0; i < numSlices; i++) {
    for (let j = 0; j < numRadial; j++) {
      const a = i * (numRadial + 1) + j;
      const b = (i + 1) * (numRadial + 1) + j;
      const c = (i + 1) * (numRadial + 1) + (j + 1);
      const d = i * (numRadial + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Procedural Canyon Cliff Headwall & Portal Recess for the Lost Dutchman Mine
 * Massive, natural volcanic headwall embedded 8 meters into the mountain ridge.
 * Natural upward-receding 80-degree cliff face with columnar jointing and strata bands.
 * Eliminates artificial boxy overhang blocks.
 */
function createMineHeadwallRockGeometry(): THREE.BufferGeometry {
  const width = 30.0;
  const height = 26.0;
  const depth = 16.0;
  const geo = new THREE.BoxGeometry(width, height, depth, 24, 20, 14);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);

    // Normalize height: py goes from -13 to +13 (translates to world y: -8 to +18)
    const t = (py + 13.0) / 26.0;

    // Upward recession: cliff face slopes naturally backward as it ascends (NO horizontal overhangs!)
    const recede = t * 4.2;
    if (pz > 0) {
      pz -= recede;

      // Mine portal recess: carved into front face center (|px| < 3.4, py between -13 and -7.4)
      const isPortalX = Math.abs(px) < 3.4;
      const isPortalY = py < -7.4;
      if (isPortalX && isPortalY) {
        const xNorm = Math.abs(px) / 3.4;
        const yNorm = (py - (-13.0)) / 5.6;
        const portalDepth = (1.0 - xNorm * xNorm) * (1.0 - Math.pow(Math.max(0, yNorm), 3.0)) * 4.4;
        pz -= portalDepth;
      }
    }

    // Columnar vertical rock jointing & strata
    const joint = Math.cos(px * 0.45) * 0.45 + Math.sin(px * 1.1) * 0.22;
    const strata = Math.sin(py * 1.6) * 0.20;
    pz += (joint + strata) * (pz > 0 ? 0.7 : 0.3);
    px += Math.sin(py * 0.7) * 0.35;

    // Subterranean base widening so it penetrates deeply into bedrock
    if (t < 0.22) {
      const baseFlare = (0.22 - t) * 1.8;
      px *= (1.0 + baseFlare * 0.25);
      pz *= (1.0 + baseFlare * 0.25);
    }

    pos.setXYZ(i, px, py, pz);

    // Weathered volcanic rock colors
    const strataCol = Math.sin(py * 1.4) * 0.5 + 0.5;
    let r = 0.62 + strataCol * 0.08;
    let g = 0.33 + strataCol * 0.05;
    let b = 0.20 + strataCol * 0.03;

    if (t > 0.82) {
      // Summit desert varnish
      r = 0.34 + strataCol * 0.04;
      g = 0.24 + strataCol * 0.03;
      b = 0.19 + strataCol * 0.02;
    } else if (py < -7.5 && Math.abs(px) < 3.2 && pz < 2.0) {
      // Portal interior shadow
      r = 0.20;
      g = 0.14;
      b = 0.10;
    }

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createLandmarkStructures(
  scene: THREE.Scene,
  landmarks: Landmark[]
): LandmarkMeshes {
  const waterRefillPoints: THREE.Vector3[] = [];

  // ==========================================
  // 1. Weaver's Needle (Towering volcanic neck)
  // ==========================================
  // Photorealistic geological reconstruction of Arizona's iconic 1,000-ft volcanic plug.
  // Researched from USGS 7.5' Quadrangle surveys and photographic archives from Fremont Saddle:
  // - Colossal monolithic dacite neck rising ~1,000 feet above the surrounding desert floor
  // - North-South elongated profile (ratio ~1.5:1 along Z vs X)
  // - 16 distinct vertical organ-pipe columnar cooling joints and fluted fissures
  // - Asymmetric couloirs: West climbing couloir (Peralta ascent) and East vertical precipice
  // - The iconic Twin Summits cleanly divided by "The Notch" (Needle's Eye):
  //   * North Peak (Main Spire): High sheer pinnacle with vertical northern prow
  //   * The Notch: Deep 22-unit V-cleft forming the historic climbing chimney
  //   * Jammed Chockstone: The famous massive dacite boulder suspended inside the notch cleft
  //   * South Peak (South Shoulder): Weathered, broader dacite crag
  // - Expansive talus apron anchored 22 units into bedrock with fallen corestones
  const needleGroup = new THREE.Group();
  const needleY = getTerrainHeight(0, 15);
  needleGroup.position.set(0, needleY, 15);

  const spireAnchor = 22.0; // Anchored subterranean into bedrock for 100% gapless footing
  const spireHeight = 96.0; // Full 1,000-ft scale relief matching the real landmark
  const spireRadial = 72;
  const spireHeightSegs = 96;
  const spireGeo = new THREE.CylinderGeometry(5.2, 17.5, spireHeight, spireRadial, spireHeightSegs, false);
  const sPos = spireGeo.attributes.position;
  const sColors = new Float32Array(sPos.count * 3);

  for (let i = 0; i < sPos.count; i++) {
    let px = sPos.getX(i);
    let py = sPos.getY(i);
    let pz = sPos.getZ(i);

    const t = (py + spireHeight * 0.5) / spireHeight; // 0.0 at subterranean base to 1.0 at summit
    const angle = Math.atan2(pz, px);
    let radius = Math.hypot(px, pz);

    // 1. Vertical organ-pipe columnar jointing ribs and cooling flutes
    const fluting = Math.cos(angle * 14.0) * 0.08 + Math.sin(angle * 28.0) * 0.025;
    const strataLedges = Math.sin(py * 0.45) * 0.03 + Math.cos(py * 0.18) * 0.02;
    const sheerFacets = 1.0 - Math.pow(Math.sin(angle * 2.0), 4.0) * 0.04;

    // 2. Couloir indentations on West (climbers chimney) and East (Needle Canyon chasm)
    const westCouloir = Math.exp(-Math.pow((angle - Math.PI) / 0.35, 2.0)) * 0.18;
    const eastCouloir = Math.exp(-Math.pow(angle / 0.40, 2.0)) * 0.12;

    // 3. Subterranean & Base Buttress Splay (deep bedrock anchor seamlessly meeting scree)
    if (t < 0.28) {
      const baseFlare = (0.28 - t) / 0.28;
      const buttress = Math.pow(Math.cos(angle * 7.0), 2.0) * 3.5 * baseFlare;
      radius += buttress;
    }

    // 4. Iconic Summit Twin Peaks and The Notch (t >= 0.68)
    // Modeled precisely after photographs of Weaver's Needle:
    // - North-South axis splits the summit into North Fang and South Crag
    // - Deep central notch cleft drops down forming the famous chimney
    let inNotch = false;
    if (t >= 0.68) {
      const s = (t - 0.68) / 0.32;
      const zn = Math.sin(angle); // -1.0 (South) to +1.0 (North)

      if (Math.abs(zn) < 0.32) {
        // The Notch ("Needle's Eye" climbing chimney cleft)
        const notchDepth = (1.0 - Math.pow(Math.abs(zn) / 0.32, 2.0)) * 22.0 * s;
        py -= notchDepth;
        px *= (1.0 - 0.22 * s);
        inNotch = true;
      } else if (zn > 0.18) {
        // North Peak (Main Summit - sharp vertical prow towering to the true apex)
        const northRise = Math.pow((zn - 0.18) / 0.82, 1.3) * 6.5 * s;
        py += northRise;
        if (zn > 0.70) px *= (1.0 - 0.15 * s);
      } else if (zn < -0.18) {
        // South Peak (South Shoulder - broad weathered crag)
        const southRise = Math.pow((-zn - 0.18) / 0.82, 1.4) * 2.2 * s;
        py += southRise;
      }
    }

    // 5. Elongated North-South Aspect Ratio (narrow East-West "needle" profile from North/South)
    const effectiveRadius = radius * (1.0 + fluting + strataLedges - westCouloir - eastCouloir) * sheerFacets;
    px = Math.cos(angle) * effectiveRadius * 0.84;
    pz = Math.sin(angle) * effectiveRadius * 1.32;

    // 6. Micro-rock roughness and angular dacite fracture displacement
    px += (Math.sin(py * 1.8 + angle * 4.0) + Math.cos(py * 3.5)) * 0.14;
    pz += (Math.cos(py * 2.0 + angle * 5.0) + Math.sin(py * 3.8)) * 0.14;

    sPos.setX(i, px);
    sPos.setY(i, py);
    sPos.setZ(i, pz);

    // 7. Authentic Arizona Dacite & Desert Varnish Color Palette
    const strataBand = Math.sin(py * 0.40) * 0.5 + 0.5;
    const isCrevice = fluting < -0.03 || westCouloir > 0.08 || eastCouloir > 0.08;
    const isExposedRib = fluting > 0.03 && !isCrevice;

    // Warm Arizona red-rock / terracotta volcanic base
    let r = 0.82 + strataBand * 0.10;
    let g = 0.48 + strataBand * 0.08;
    let b = 0.30 + strataBand * 0.05;

    // Desert varnish streaks (rich mahogany / umber) concentrated in fissures
    if (isCrevice) {
      r = 0.54 + strataBand * 0.08;
      g = 0.32 + strataBand * 0.05;
      b = 0.20 + strataBand * 0.04;
    } else if (isExposedRib) {
      // Golden buff sun-baked volcanic highlights on exposed ribs
      r = 0.94 + strataBand * 0.06;
      g = 0.66 + strataBand * 0.08;
      b = 0.42 + strataBand * 0.06;
    }

    // Gentle shade inside the Notch (not pitch black)
    if (inNotch) {
      r *= 0.82;
      g *= 0.82;
      b *= 0.82;
    }

    // Weathered ancient summit caprock
    if (t > 0.88) {
      const capT = (t - 0.88) / 0.12;
      r = r * (1.0 - capT) + 0.62 * capT;
      g = g * (1.0 - capT) + 0.42 * capT;
      b = b * (1.0 - capT) + 0.30 * capT;
    }

    // Subterranean transition matching scree
    if (t < 0.22) {
      const baseT = (0.22 - t) / 0.22;
      r = r * (1.0 - baseT) + 0.80 * baseT;
      g = g * (1.0 - baseT) + 0.56 * baseT;
      b = b * (1.0 - baseT) + 0.38 * baseT;
    }

    sColors[i * 3] = r;
    sColors[i * 3 + 1] = g;
    sColors[i * 3 + 2] = b;
  }

  spireGeo.setAttribute('color', new THREE.BufferAttribute(sColors, 3));
  spireGeo.computeVertexNormals();
  spireGeo.computeBoundingBox();
  spireGeo.computeBoundingSphere();

  const rockTexture = createWeaversNeedleTexture();
  const needleRockMat = new THREE.MeshStandardMaterial({
    map: rockTexture,
    vertexColors: true,
    roughness: 0.90,
    metalness: 0.04,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  const spire = new THREE.Mesh(spireGeo, needleRockMat);
  // Anchor spire base into subterranean bedrock so it is 100% gapless and seamless on all slopes
  spire.position.y = spireHeight * 0.5 - spireAnchor;
  spire.castShadow = true;
  spire.receiveShadow = true;
  spire.frustumCulled = false;
  needleGroup.add(spire);

  // =========================================================================
  // The Famous Jammed Chockstone
  // Massive angular dacite boulder suspended inside the Notch chimney cleft,
  // the defining landmark feature described by every climber ascending the Needle.
  // =========================================================================
  const chockstoneGeo = new THREE.DodecahedronGeometry(4.2, 1);
  const csPos = chockstoneGeo.attributes.position;
  const csCols = new Float32Array(csPos.count * 3);
  for (let k = 0; k < csPos.count; k++) {
    let cx = csPos.getX(k);
    let cy = csPos.getY(k);
    let cz = csPos.getZ(k);
    // Wedge deformation so it sits tightly clamped between the north and south walls
    cx *= 1.35;
    cy *= 0.85;
    cz *= 1.15 + Math.sin(cy * 2.0) * 0.2;
    csPos.setX(k, cx);
    csPos.setY(k, cy);
    csPos.setZ(k, cz);

    csCols[k * 3] = 0.48 + Math.sin(k) * 0.04;
    csCols[k * 3 + 1] = 0.30 + Math.cos(k) * 0.03;
    csCols[k * 3 + 2] = 0.20 + Math.sin(k * 2) * 0.02;
  }
  chockstoneGeo.setAttribute('color', new THREE.BufferAttribute(csCols, 3));
  chockstoneGeo.computeVertexNormals();
  chockstoneGeo.computeBoundingBox();
  chockstoneGeo.computeBoundingSphere();

  const chockstone = new THREE.Mesh(chockstoneGeo, needleRockMat);
  chockstone.position.set(0, spire.position.y + 16.5, 0);
  chockstone.rotation.set(0.4, 0.6, -0.2);
  chockstone.castShadow = true;
  chockstone.receiveShadow = true;
  chockstone.frustumCulled = false;
  needleGroup.add(chockstone);

  // =========================================================================
  // Giant Fallen Dacite Corestone Boulders on the Talus Apron
  // Shattered columnar blocks embedded firmly into the scree skirt around the base
  // =========================================================================
  const talusBoulders = [
    { x: -18, z: 16, size: 6.2, rot: 0.4 },
    { x: 22, z: -14, size: 5.6, rot: 1.2 },
    { x: -15, z: -24, size: 7.4, rot: 2.1 },
    { x: 24, z: 22, size: 5.8, rot: 0.8 },
    { x: 0, z: 32, size: 5.2, rot: 1.7 },
    { x: -26, z: -10, size: 5.5, rot: 2.7 },
    { x: 14, z: 34, size: 6.0, rot: 3.1 },
    { x: -22, z: 28, size: 5.1, rot: 0.9 },
    { x: 28, z: -8, size: 6.4, rot: 1.8 },
    { x: -8, z: -32, size: 6.8, rot: 2.4 },
  ];

  talusBoulders.forEach((tb) => {
    const bGeo = new THREE.DodecahedronGeometry(tb.size, 1);
    const bPos = bGeo.attributes.position;
    const bCols = new Float32Array(bPos.count * 3);

    for (let k = 0; k < bPos.count; k++) {
      let bx = bPos.getX(k);
      let by = bPos.getY(k);
      let bz = bPos.getZ(k);

      // Chiseled angular talus fracture
      bx *= 1.0 + Math.sin(by * 1.5) * 0.22;
      by *= 0.78; // Slightly flattened tabular block
      bz *= 1.0 + Math.cos(bx * 1.4) * 0.22;

      bPos.setX(k, bx);
      bPos.setY(k, by);
      bPos.setZ(k, bz);

      bCols[k * 3] = 0.62 + Math.sin(k) * 0.05;
      bCols[k * 3 + 1] = 0.36 + Math.cos(k) * 0.04;
      bCols[k * 3 + 2] = 0.22 + Math.sin(k * 2) * 0.03;
    }

    bGeo.setAttribute('color', new THREE.BufferAttribute(bCols, 3));
    bGeo.computeVertexNormals();
    bGeo.computeBoundingBox();
    bGeo.computeBoundingSphere();

    const boulderMesh = new THREE.Mesh(bGeo, needleRockMat);
    const worldX = 0 + tb.x;
    const worldZ = 15 + tb.z;
    const groundY = getTerrainHeight(worldX, worldZ);
    // Embedded firmly into the talus scree slope
    boulderMesh.position.set(tb.x, groundY - needleY + tb.size * 0.15, tb.z);
    boulderMesh.rotation.set(0.2, tb.rot, -0.15);
    boulderMesh.castShadow = true;
    boulderMesh.receiveShadow = true;
    boulderMesh.frustumCulled = false;
    needleGroup.add(boulderMesh);
  });

  scene.add(needleGroup);

  // ==========================================
  // 2. Peralta Trailhead Base Camp
  // ==========================================
  const trailheadGroup = new THREE.Group();
  const thY = getTerrainHeight(-120, -120);
  trailheadGroup.position.set(-120, thY, -120);

  // Lean-to wooden frame & canvas shelter
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0xcfc0a2, roughness: 0.8, side: THREE.DoubleSide });

  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 3, 6);
  for (const [px, pz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(px, 1.5, pz);
    trailheadGroup.add(post);
  }

  // Slanted canvas roof
  const roofGeo = new THREE.PlaneGeometry(5, 5);
  roofGeo.rotateX(Math.PI / 3);
  const roof = new THREE.Mesh(roofGeo, canvasMat);
  roof.position.set(0, 2.7, 0);
  roof.castShadow = true;
  trailheadGroup.add(roof);

  // Trail Register & Peralta Map on wooden post
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.1), woodMat);
  signBoard.position.set(-2, 1.6, 0);
  trailheadGroup.add(signBoard);

  const parchment = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xe6d5ac, roughness: 0.5 })
  );
  parchment.position.set(-2, 1.6, 0.06);
  trailheadGroup.add(parchment);

  // Fresh Water Barrel (replenishes hydration!)
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 })
  );
  barrel.position.set(1.5, 0.7, -1.2);
  trailheadGroup.add(barrel);
  waterRefillPoints.push(new THREE.Vector3(-120 + 1.5, thY, -120 - 1.2));

  // Campfire circle
  const campfireGroup = new THREE.Group();
  campfireGroup.position.set(0, 0.1, 3.5);
  for (let r = 0; r < 8; r++) {
    const cAngle = (r / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), woodMat);
    stone.position.set(Math.cos(cAngle) * 0.8, 0.15, Math.sin(cAngle) * 0.8);
    campfireGroup.add(stone);
  }
  // Charred embers
  const embers = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x221105, emissive: 0x552200, emissiveIntensity: 0.5 })
  );
  campfireGroup.add(embers);
  trailheadGroup.add(campfireGroup);

  scene.add(trailheadGroup);

  // ==========================================
  // 3. Hieroglyphic Oasis & Spring
  // ==========================================
  const springGroup = new THREE.Group();
  const spY = getTerrainHeight(-70, -20);
  springGroup.position.set(-70, spY, -20);

  // Shimmering spring pool
  const waterGeo = new THREE.CircleGeometry(6, 16);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1b7a82,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85,
  });
  const pool = new THREE.Mesh(waterGeo, waterMat);
  pool.position.y = 0.3;
  springGroup.add(pool);
  waterRefillPoints.push(new THREE.Vector3(-70, spY, -20));

  // Ancient Petroglyph Boulders with carvings
  const petroMat = new THREE.MeshStandardMaterial({ color: 0x2c2b2a, roughness: 0.9 });
  for (let p = 0; p < 5; p++) {
    const bAngle = (p / 5) * Math.PI * 2 + 0.3;
    const relX = Math.cos(bAngle) * 7.5;
    const relZ = Math.sin(bAngle) * 7.5;
    const groundY = getTerrainHeight(-70 + relX, -20 + relZ) - spY;
    const pRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), petroMat);
    // Embedded 1.1m into the bank so no underside is exposed
    pRock.position.set(relX, groundY + 0.7, relZ);
    pRock.castShadow = true;
    springGroup.add(pRock);

    // Carved symbols (glowing subtle ochre petroglyph glyphs)
    const glyph = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.45, 8),
      new THREE.MeshBasicMaterial({ color: 0xdfbc83, side: THREE.DoubleSide })
    );
    glyph.position.set(Math.cos(bAngle) * 6.5, groundY + 1.2, Math.sin(bAngle) * 6.5);
    glyph.lookAt(-70, spY + groundY + 1.2, -20);
    springGroup.add(glyph);
  }

  // Desert Cottonwood Trees near the water
  const treeTrunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 5, 6);
  const foliageGeo = new THREE.DodecahedronGeometry(2.5, 1);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x476326, roughness: 0.8 });

  for (const [tx, tz] of [[-5, 5], [6, -4], [-4, -6]]) {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);

    const trunk = new THREE.Mesh(treeTrunkGeo, woodMat);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(foliageGeo, foliageMat);
    crown.position.y = 5.5;
    crown.castShadow = true;
    tree.add(crown);

    springGroup.add(tree);
  }
  scene.add(springGroup);

  // ==========================================
  // 4. 1848 Peralta Massacre Grounds
  // ==========================================
  const massacreGroup = new THREE.Group();
  const mgY = getTerrainHeight(-40, 90);
  massacreGroup.position.set(-40, mgY, 90);

  // Old weathered wooden memorial crosses
  for (let c = 0; c < 5; c++) {
    const crossGroup = new THREE.Group();
    crossGroup.position.set((c - 2) * 3 + (Math.random() - 0.5), 0, (Math.random() - 0.5) * 3);
    crossGroup.rotation.y = Math.random() * 0.5;
    crossGroup.rotation.z = (Math.random() - 0.5) * 0.15; // slightly tilted

    const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), woodMat);
    vBeam.position.y = 1.2;
    vBeam.castShadow = true;
    crossGroup.add(vBeam);

    const hBeam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.18), woodMat);
    hBeam.position.y = 1.7;
    hBeam.castShadow = true;
    crossGroup.add(hBeam);

    // Stone cairn at base
    const cairn = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 6), petroMat);
    cairn.position.y = 0.3;
    crossGroup.add(cairn);

    massacreGroup.add(crossGroup);
  }

  // Peralta Silver Spur & Stirrup relic on rock
  const relicRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), petroMat);
  relicRock.position.set(2, 0.8, 2);
  massacreGroup.add(relicRock);

  const silverRelic = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.08, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0xd9e1e8, metalness: 0.9, roughness: 0.3 })
  );
  silverRelic.position.set(2, 1.8, 2);
  silverRelic.rotation.x = Math.PI / 4;
  massacreGroup.add(silverRelic);

  scene.add(massacreGroup);

  // ==========================================
  // 5. Jacob Waltz's Abandoned Dugout / Stone Cabin
  // ==========================================
  const dugoutGroup = new THREE.Group();
  const dgY = getTerrainHeight(30, -90);
  dugoutGroup.position.set(30, dgY, -90);

  const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0x6e5241, roughness: 0.95 });
  // Four low stone wall ruins
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 0.5), stoneWallMat);
  wallN.position.set(0, 0.9, -2.5);
  dugoutGroup.add(wallN);

  const wallS1 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.5), stoneWallMat);
  wallS1.position.set(-1.8, 0.9, 2.5);
  dugoutGroup.add(wallS1);

  const wallS2 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.5), stoneWallMat);
  wallS2.position.set(1.8, 0.9, 2.5);
  dugoutGroup.add(wallS2); // leaves 2m doorway in center

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 5.5), stoneWallMat);
  wallW.position.set(-3, 0.9, 0);
  dugoutGroup.add(wallW);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 5.5), stoneWallMat);
  wallE.position.set(3, 0.9, 0);
  dugoutGroup.add(wallE);

  // Hearth & chimney
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), stoneWallMat);
  hearth.position.set(-2.2, 1.6, -1.8);
  dugoutGroup.add(hearth);

  // Prospector's Pickaxe leaning on stone wall
  const pickaxeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5), woodMat);
  pickaxeHandle.position.set(1.2, 0.6, 2.2);
  pickaxeHandle.rotation.z = -0.3;
  dugoutGroup.add(pickaxeHandle);

  const pickHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.4 })
  );
  pickHead.position.set(1.4, 1.1, 2.2);
  pickHead.rotation.z = -0.3;
  dugoutGroup.add(pickHead);

  // Old Table with Jacob Waltz's Journal
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), woodMat);
  table.position.set(0, 0.4, 0);
  dugoutGroup.add(table);

  const journalMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.06, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.6 })
  );
  journalMesh.position.set(0, 0.83, 0);
  dugoutGroup.add(journalMesh);

  scene.add(dugoutGroup);

  // ==========================================
  // 6. Eye of the Needle Bluff
  // ==========================================
  const eyeGroup = new THREE.Group();
  const eyeY = getTerrainHeight(130, -40);
  eyeGroup.position.set(130, eyeY, -40);

  // Natural monolithic sandstone arch rooted deeply into the mountain ridge bedrock
  const eyeArchGeo = createEyeArchGeometry();
  const eyeArchMesh = new THREE.Mesh(eyeArchGeo, needleRockMat);
  eyeArchMesh.castShadow = true;
  eyeArchMesh.receiveShadow = true;
  eyeGroup.add(eyeArchMesh);

  // Natural talus apron corestones nestled around the arch base
  const archTalus = [
    { x: -5.5, z: 2.2, r: 2.1, rot: 0.6 },
    { x: 5.2, z: -1.8, r: 1.8, rot: 1.9 },
    { x: -3.0, z: -3.5, r: 2.4, rot: 2.7 },
  ];
  archTalus.forEach((at) => {
    const tGeo = new THREE.DodecahedronGeometry(at.r, 1);
    const tMesh = new THREE.Mesh(tGeo, needleRockMat);
    const tGroundY = getTerrainHeight(130 + at.x, -40 + at.z) - eyeY;
    tMesh.position.set(at.x, tGroundY + at.r * 0.35, at.z);
    tMesh.rotation.set(0.15, at.rot, -0.2);
    tMesh.castShadow = true;
    tMesh.receiveShadow = true;
    eyeGroup.add(tMesh);
  });

  // Ancient trail pointer cairn
  const pointerPillar = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.0, 5), needleRockMat);
  const cairnGroundY = getTerrainHeight(130, -40 + 4) - eyeY;
  pointerPillar.position.set(0, cairnGroundY + 1.2, 4);
  pointerPillar.castShadow = true;
  eyeGroup.add(pointerPillar);

  scene.add(eyeGroup);

  // ==========================================
  // 7. The Lost Dutchman Mine Shaft & Secret Canyon
  // ==========================================
  const mineGroup = new THREE.Group();
  const mineY = getTerrainHeight(160, 110);
  mineGroup.position.set(160, mineY, 110);

  // Natural canyon cliff headwall seamlessly embedded 8 meters into the mountain ridge
  const mineHeadwallGeo = createMineHeadwallRockGeometry();
  const mineHeadwall = new THREE.Mesh(mineHeadwallGeo, needleRockMat);
  mineHeadwall.position.set(0, 5.0, 0);
  mineHeadwall.castShadow = true;
  mineHeadwall.receiveShadow = true;
  mineGroup.add(mineHeadwall);

  // Heavy timber portal frame
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.95 });
  const timberL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), beamMat);
  timberL.position.set(-2.2, 2.7, 4);
  timberL.castShadow = true;
  mineGroup.add(timberL);

  const timberR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), beamMat);
  timberR.position.set(2.2, 2.7, 4);
  timberR.castShadow = true;
  mineGroup.add(timberR);

  const timberTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 0.6), beamMat);
  timberTop.position.set(0, 5.2, 4);
  timberTop.castShadow = true;
  mineGroup.add(timberTop);

  // Wooden portal sign
  const mineSign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.1), beamMat);
  mineSign.position.set(0, 6.0, 4.1);
  mineGroup.add(mineSign);

  // Rusted Ore Cart on rails
  const cartGroup = new THREE.Group();
  cartGroup.position.set(0, 0, 7);
  const cartBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x5a4a42, metalness: 0.7, roughness: 0.6 })
  );
  cartBody.position.y = 1.0;
  cartGroup.add(cartBody);

  // Rich gold ore lumps inside the cart
  const cartGold = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.5, 1),
    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.2, emissive: 0x664400, emissiveIntensity: 0.4 })
  );
  cartGold.position.set(0, 1.6, 0);
  cartGroup.add(cartGold);

  // Wooden mine rails
  const railMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
  for (const rx of [-0.6, 0.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 14), railMat);
    rail.position.set(rx, 0.1, 2);
    mineGroup.add(rail);
  }
  mineGroup.add(cartGroup);

  // Dark mine entrance tunnel (black interior plane / doorway)
  const tunnelBlack = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 5.0),
    new THREE.MeshBasicMaterial({ color: 0x050302, side: THREE.DoubleSide })
  );
  tunnelBlack.position.set(0, 2.5, 3.8);
  mineGroup.add(tunnelBlack);

  // Glowing lantern on post
  const lanternLight = new THREE.PointLight(0xffa500, 2.5, 15);
  lanternLight.position.set(2.2, 3.2, 4.3);
  mineGroup.add(lanternLight);

  const lanternMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffaa33, emissiveIntensity: 1.0 })
  );
  lanternMesh.position.copy(lanternLight.position);
  mineGroup.add(lanternMesh);

  scene.add(mineGroup);

  // ==========================================
  // 8. Hidden Mine Drift Interior Chamber
  // Positioned in a separate hollow cave space beneath/behind the entrance
  // ==========================================
  const mineInterior = new THREE.Group();
  mineInterior.position.set(160, mineY - 0.5, 135);

  // Cave walls
  const caveGeo = new THREE.CylinderGeometry(6, 6, 8, 12, 1, true);
  const caveMat = new THREE.MeshStandardMaterial({
    color: 0x241812,
    roughness: 0.95,
    side: THREE.BackSide,
  });
  const caveWall = new THREE.Mesh(caveGeo, caveMat);
  caveWall.position.y = 4;
  mineInterior.add(caveWall);

  const caveRoof = new THREE.Mesh(new THREE.CircleGeometry(6, 12), caveMat);
  caveRoof.position.y = 8;
  caveRoof.rotateX(Math.PI / 2);
  mineInterior.add(caveRoof);

  // Timber support arches inside
  for (let tz = -4; tz <= 4; tz += 4) {
    const arch = new THREE.Group();
    arch.position.set(0, 0, tz);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), beamMat);
    postL.position.set(-3.2, 2.5, 0);
    arch.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), beamMat);
    postR.position.set(3.2, 2.5, 0);
    arch.add(postR);

    const crossB = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 0.5), beamMat);
    crossB.position.set(0, 5, 0);
    arch.add(crossB);

    mineInterior.add(arch);
  }

  // The Mother Lode: Jacob Waltz's Gold Cache Chest & Vein
  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, 0.5, 2);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.0, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.7 })
  );
  chest.position.y = 0.5;
  chestGroup.add(chest);

  // Open lid
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.3, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x3d200e, roughness: 0.7 })
  );
  lid.position.set(0, 1.1, -0.4);
  lid.rotation.x = -Math.PI / 4;
  chestGroup.add(lid);

  // Gold ingots & raw bonanza quartz inside the chest
  const goldBarMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.15,
    emissive: 0x553300,
    emissiveIntensity: 0.5,
  });

  for (let g = 0; g < 12; g++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.6), goldBarMat);
    bar.position.set((Math.random() - 0.5) * 1.1, 0.9 + (g % 3) * 0.12, (Math.random() - 0.5) * 0.7);
    bar.rotation.y = Math.random() * 0.5;
    chestGroup.add(bar);
  }

  // Golden quartz vein running through cave back wall
  const veinMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x664400,
    emissiveIntensity: 0.6,
  });
  for (let v = 0; v < 8; v++) {
    const veinChunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), veinMat);
    veinChunk.position.set(Math.sin(v) * 2.5, 2 + v * 0.6, 5.2);
    mineInterior.add(veinChunk);
  }

  // Warm interior lantern light
  const caveLight = new THREE.PointLight(0xffb74d, 3, 20);
  caveLight.position.set(0, 4.5, 0);
  mineInterior.add(caveLight);

  mineInterior.add(chestGroup);
  scene.add(mineInterior);

  // ==========================================
  // 9. Historic Town of Tortilla Flat (1880s Frontier Settlement on Tortilla Creek)
  // Authentic Boomtown Western Architecture, Glazed Multi-Pane Windows,
  // Superstition Saloon, Mercantile & Post Office, Sheriff Jail, Livery Barn,
  // Abbott-Downing Concord Stagecoach, Artesian Water Tower & Tortilla Creek Landing
  // ==========================================
  const tortillaGroup = buildTortillaFlatSettlement(scene, waterRefillPoints);

  // ==========================================
  // 10. Malapais Mountain Summit (USGS Elev. 4,229 ft / 1,289m)
  // Highest dominant basalt massif in northern Superstitions ("Black Mountain")
  // ==========================================
  const malapaisGroup = buildMalapaisMountainSummit(scene);

  // ==========================================
  // 11. Pistol Canyon Box Gorge (Historic Lost Dutchman Tributary)
  // Narrow slot canyon with Roy Bradford's lost 1870s Colt revolver & tinaja
  // ==========================================
  const pistolGroup = buildPistolCanyonGorge(scene, waterRefillPoints);

  // ==========================================
  // 12. Peters Canyon Pinch, Bighorn Crags & Jacob Emerick's 2016 SAR Bivouac Site
  // Famous Malapais Loop descent, Rose Quartz slope, the Two-Foot Ladder,
  // The Pinch dry fall tinaja, and Search & Rescue emergency bivouac lean-to
  // ==========================================
  const petersPinchGroup = buildPetersCanyonPinchAndBivouac(scene, waterRefillPoints);

  // ==========================================
  // 13. Real-World Superstition Peaks & Oasis Springs
  // Black Top Mesa (arrastra & basalt rim), Battleship Mountain (knife prow),
  // Miners Needle (eyelet crags), Charlebois Spring (cottonwood tinaja)
  // ==========================================
  const peakMeshes = buildSuperstitionPeaksAndSprings(scene, waterRefillPoints);

  // ==========================================
  // 14. Curse of the Lost Dutchman & The Adolph Ruth Mystery (1931)
  // Dr. Ruth's East Ravine camp & headless skeleton, severed skull in Needle Canyon wash,
  // 1947 James Cravey helicopter bivouac, and 1848 Peralta Massacre wash remains
  // ==========================================
  const ruthMystery = buildRuthMysteryAndSkeletons(scene);

  // ==========================================
  // 15. The Dick Holmes Clues & The 1891 Candle Box of Gold
  // Location: Needle Canyon Trail Divide & The "Face in the Rock" Pass (78X, -48Z)
  // Recreating the authentic 1891 deathbed clues, candle box of wire gold ore,
  // the natural "Face in the Rock" profile, and the Holmes Manuscript field folio.
  // ==========================================
  const dickHolmesData = buildDickHolmesCluesSite(scene);

  // ==========================================
  // 16. Frontier Exploration Discoveries:
  // Spanish Arrastras, Lost Saddlebags in Rock Crevices,
  // Hidden Cave Petroglyphs, and Abandoned Miner Bivouacs
  // ==========================================
  const discoveriesData = buildFrontierExplorationDiscoveries(scene);

  // ==========================================
  // 17. The Peralta Stone Map Solves (Endgame Sites)
  // Solve II: El Corazón & Sombrero Butte Altar (-65X, 95Z)
  // Solve III: Black Top Mesa Sun Dagger & Two-Foot Funnel Pit (24X, -45Z)
  // Solve IV: Upper La Barge Jesuit Ingot Vault (40X, -175Z)
  // ==========================================
  const solveSitesData = buildPeraltaSolveSites(scene);

  return {
    weaversNeedle: needleGroup,
    trailhead: trailheadGroup,
    spring: springGroup,
    massacre: massacreGroup,
    dugout: dugoutGroup,
    eyeRock: eyeGroup,
    mine: mineGroup,
    mineInterior,
    tortillaFlat: tortillaGroup,
    malapaisMountain: malapaisGroup,
    pistolCanyon: pistolGroup,
    petersCanyonPinch: petersPinchGroup,
    blackTopMesa: peakMeshes.blackTopMesa,
    battleshipMountain: peakMeshes.battleshipMountain,
    minersNeedle: peakMeshes.minersNeedle,
    charleboisSpring: peakMeshes.charleboisSpring,
    fourPeaks: peakMeshes.fourPeaks,
    laBargeUpperBox: peakMeshes.laBargeUpperBox,
    squawBoxCanyon: peakMeshes.squawBoxCanyon,
    petersCanyonAndCave: peakMeshes.petersCanyonAndCave,
    petersMesa: peakMeshes.petersMesa,
    ruthCamp: ruthMystery.ruthCamp,
    ruthSkull: ruthMystery.ruthSkull,
    craveySite: ruthMystery.craveySite,
    massacreSkeletons: ruthMystery.massacreSkeletons,
    dickHolmesSite: dickHolmesData.rootGroup,
    frontierDiscoveries: discoveriesData.groups,
    peraltaSolveSites: solveSitesData.rootGroup,
    waterRefillPoints,
  };
}
