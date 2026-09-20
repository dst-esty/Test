import React, { useEffect, useRef } from 'react';
import { SurfaceAnalysisResult, SurfaceMaterialCategory } from '../world/prospectingAnalysis';

interface MicroMineralCanvasProps {
  analysis: SurfaceAnalysisResult | null;
  opticalZoom: number; // 4, 10, 24
  size?: number;
}

// Fullscreen quad vertex shader
const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Real-time petrological loupe fragment shader
const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uZoom;
uniform float uMaterialCat; // 0.0=quartz, 1.0=rock, 2.0=caliche, 3.0=sand
uniform float uMineralization;
uniform float uGoldProb;
uniform vec2 uMouse;
uniform vec2 uResolution;

void main() {
  vec2 st = (vUv - 0.5) * 2.0;
  float dist = length(st);

  // Circular lens aperture clip
  if (dist > 1.0) {
    discard;
  }

  // 1. Hastings Triplet Optical Curvature (Spherical Barrel Distortion)
  vec2 uv = st;
  uv += uv * dist * 0.08;
  vec2 texCoord = uv * 0.5 + 0.5;
  texCoord = clamp(texCoord, 0.002, 0.998);

  // 2. Multi-Tap Normal Mapping for Physical 3D Relief
  vec2 texel = vec2(1.0 / 1024.0, 1.0 / 1024.0);
  float hC = dot(texture2D(uTexture, texCoord).rgb, vec3(0.299, 0.587, 0.114));
  float hL = dot(texture2D(uTexture, texCoord - vec2(texel.x * 2.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float hR = dot(texture2D(uTexture, texCoord + vec2(texel.x * 2.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float hD = dot(texture2D(uTexture, texCoord - vec2(0.0, texel.y * 2.0)).rgb, vec3(0.299, 0.587, 0.114));
  float hU = dot(texture2D(uTexture, texCoord + vec2(0.0, texel.y * 2.0)).rgb, vec3(0.299, 0.587, 0.114));

  float bumpStrength = 4.0;
  if (uMaterialCat > 2.5) {
    bumpStrength = 5.0; // Sand grains have high granular curvature
  } else if (uMaterialCat > 1.5) {
    bumpStrength = 3.0; // Caliche has subtle chalk porosity
  } else if (uMaterialCat > 0.5) {
    bumpStrength = 4.5; // Rock has sharp cleavage faces
  }

  vec3 normal = normalize(vec3(
    (hL - hR) * bumpStrength,
    (hD - hU) * bumpStrength,
    1.0
  ));

  // Sample base color and metallic mask (stored in alpha channel)
  vec4 sampleColor = texture2D(uTexture, texCoord);
  vec3 baseColor = sampleColor.rgb;
  float metallic = sampleColor.a;

  // 3. Dynamic Inspection Lighting (Interactive with mouse & ambient sunlight)
  float lightAngle = uTime * 0.35 + uMouse.x * 2.5;
  vec3 lightDir = normalize(vec3(cos(lightAngle) * 0.85, sin(lightAngle) * 0.85 + uMouse.y * 0.5, 1.35));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);

  float diff = max(dot(normal, lightDir), 0.0);
  float specAngle = max(dot(normal, halfDir), 0.0);

  // Micro-fracture ambient occlusion
  float ao = clamp(pow(hC, 0.65) * 1.35, 0.35, 1.0);
  vec3 diffuse = baseColor * (0.35 + 0.65 * diff) * ao;

  vec3 specular = vec3(0.0);

  // 4. Material-Specific Optical Shading
  if (uMaterialCat < 0.5) {
    // === QUARTZ & GOSSAN ===
    float isQuartz = smoothstep(0.45, 0.82, (baseColor.r + baseColor.g + baseColor.b) / 3.0) * (1.0 - metallic);
    // Subsurface scattering inside crystalline quartz
    float sss = pow(max(dot(viewDir, -lightDir), 0.0), 2.5) * isQuartz;
    diffuse += vec3(0.96, 0.94, 0.86) * sss * 0.28;
    // Vitreous glassy specular glint
    float quartzSpec = pow(specAngle, 42.0) * isQuartz * 0.55;
    specular += vec3(1.0, 0.98, 0.94) * quartzSpec;
  } else if (uMaterialCat < 1.5) {
    // === SOLID ROCK & DESERT VARNISH ===
    float rockVarnish = pow(specAngle, 24.0) * 0.32 * (1.0 - metallic);
    float feldsparGlint = pow(specAngle, 55.0) * 0.45 * smoothstep(0.4, 0.6, baseColor.r);
    specular += vec3(0.95, 0.92, 0.88) * (rockVarnish + feldsparGlint);
  } else if (uMaterialCat < 2.5) {
    // === CALICHE HARDPAN ===
    float calciteGlint = pow(specAngle, 38.0) * 0.20 * (1.0 - metallic);
    specular += vec3(1.0, 0.99, 0.95) * calciteGlint;
    diffuse += vec3(0.04, 0.035, 0.03) * diff;
  } else {
    // === DESERT WASH SAND ===
    float sandGlint = pow(specAngle, 52.0) * 0.48 * (1.0 - metallic);
    float micaGlint = pow(specAngle, 85.0) * 0.75 * smoothstep(0.65, 0.9, baseColor.g);
    specular += vec3(1.0, 0.97, 0.90) * (sandGlint + micaGlint);
  }

  // 5. Native Gold / Electrum Specular Glint (22k metallic Fresnel glint)
  if (metallic > 0.05) {
    vec3 goldColor = vec3(1.0, 0.82, 0.22);
    float goldSpec1 = pow(specAngle, 16.0) * 1.8;
    float goldSpec2 = pow(specAngle, 80.0) * 4.2;
    vec3 goldSpecular = mix(goldColor, vec3(1.0, 0.98, 0.75), 0.6) * (goldSpec1 + goldSpec2);
    
    // Fresnel rim reflection
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    goldSpecular += goldColor * fresnel * 0.8;
    specular += goldSpecular * metallic;
  }

  vec3 finalColor = diffuse + specular;

  // 6. Optical Chromatic Aberration at Loupe Perimeter
  if (dist > 0.65) {
    float chromaOffset = (dist - 0.65) * 0.016;
    float rChroma = texture2D(uTexture, texCoord + vec2(chromaOffset, 0.0)).r;
    float bChroma = texture2D(uTexture, texCoord - vec2(chromaOffset, 0.0)).b;
    finalColor.r = mix(finalColor.r, rChroma * 1.15, 0.35);
    finalColor.b = mix(finalColor.b, bChroma * 0.85, 0.35);
  }

  // 7. Microscopic Depth of Field Softening
  float edgeBlur = smoothstep(0.78, 1.0, dist);
  finalColor = mix(finalColor, finalColor * 0.88 + vec3(0.04), edgeBlur * 0.25);

  // 8. Optical Loupe Glass Vignette & Curved Bevel Rim
  float lensVignette = smoothstep(1.0, 0.70, dist);
  finalColor *= (0.42 + 0.58 * lensVignette);

  // Antique glass AR sheen
  float glassSheen = pow(max(dot(reflect(-viewDir, vec3(0.0, 0.0, 1.0)), lightDir), 0.0), 12.0);
  finalColor += vec3(0.65, 0.75, 1.0) * glassSheen * 0.06 * (1.0 - dist * 0.5);

  // Rim bevel occlusion
  finalColor *= smoothstep(0.995, 0.94, dist);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ============================================================================
// REAL-TIME PROCEDURAL TEXTURE SYNTHESIS (ACCURATE TO PROSPECTING ANALYSIS)
// ============================================================================

function generateProceduralTexture(
  category: SurfaceMaterialCategory,
  mineralization: number,
  goldProbability: number,
  strata: string,
  zoom: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return canvas;

  let seed = 91823;
  const seedStr = `${category}_${strata}`;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 500000;
  }
  const prng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  if (category === 'sand') {
    // === DESERT WASH ALLUVIAL PLACER SAND ===
    // Base wash background
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
    bgGrad.addColorStop(0, '#8c7355');
    bgGrad.addColorStop(0.5, '#735c40');
    bgGrad.addColorStop(1, '#5c4830');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Micro-silt matrix
    for (let i = 0; i < 6000; i++) {
      const sx = prng() * 1024;
      const sy = prng() * 1024;
      const sr = 1.0 + prng() * 2.0;
      ctx.fillStyle = prng() < 0.5 ? 'rgba(215, 185, 145, 0.15)' : 'rgba(45, 35, 25, 0.2)';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy black magnetite sand placer trails (indicator of placer gold)
    if (mineralization > 10) {
      const trailCount = Math.min(8, Math.floor(mineralization / 12) + 1);
      for (let t = 0; t < trailCount; t++) {
        const ty = 120 + t * 130 + prng() * 40;
        const trailGrad = ctx.createRadialGradient(512, ty, 40, 512, ty, 380);
        trailGrad.addColorStop(0, 'rgba(15, 12, 10, 0.85)');
        trailGrad.addColorStop(0.5, 'rgba(28, 22, 18, 0.45)');
        trailGrad.addColorStop(1, 'rgba(35, 28, 22, 0.0)');
        ctx.fillStyle = trailGrad;
        ctx.fillRect(0, ty - 60, 1024, 120);

        // Dense sub-millimeter black magnetite beads
        for (let m = 0; m < 400; m++) {
          const mx = prng() * 1024;
          const my = ty + (prng() - 0.5) * 80;
          ctx.fillStyle = 'rgba(10, 8, 6, 0.9)';
          ctx.beginPath();
          ctx.arc(mx, my, 1.2 + prng() * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Individual rounded and sub-angular sand grains (quartz, feldspar, jasper)
    const grainCount = zoom === 24 ? 450 : 850;
    const baseRadius = zoom === 24 ? 14 : 7;

    for (let g = 0; g < grainCount; g++) {
      const gx = prng() * 1024;
      const gy = prng() * 1024;
      const gr = baseRadius * (0.6 + prng() * 1.1);

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(prng() * Math.PI * 2);

      // Grain shadow
      ctx.fillStyle = 'rgba(20, 14, 10, 0.35)';
      ctx.beginPath();
      ctx.arc(gr * 0.2, gr * 0.2, gr * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // Grain mineral type
      const mineralRoll = prng();
      let grainGrad = ctx.createRadialGradient(-gr * 0.3, -gr * 0.3, gr * 0.1, 0, 0, gr);

      if (mineralRoll < 0.45) {
        // Translucent Quartz (Clear/Amber/Smoky)
        grainGrad.addColorStop(0, '#fef9e7');
        grainGrad.addColorStop(0.4, '#e4d3b2');
        grainGrad.addColorStop(0.85, '#a3875e');
        grainGrad.addColorStop(1, '#5e4b30');
      } else if (mineralRoll < 0.70) {
        // Salmon Orthoclase Feldspar
        grainGrad.addColorStop(0, '#fad7c4');
        grainGrad.addColorStop(0.5, '#e09579');
        grainGrad.addColorStop(0.9, '#a6543b');
        grainGrad.addColorStop(1, '#542618');
      } else if (mineralRoll < 0.85) {
        // Red Jasper / Rhyolite Clast
        grainGrad.addColorStop(0, '#c75943');
        grainGrad.addColorStop(0.6, '#872a1a');
        grainGrad.addColorStop(1, '#3b1008');
      } else {
        // Black Magnetite / Ilmenite Clast
        grainGrad.addColorStop(0, '#4a4642');
        grainGrad.addColorStop(0.6, '#211e1c');
        grainGrad.addColorStop(1, '#0a0807');
      }

      ctx.fillStyle = grainGrad;
      ctx.beginPath();
      const vertices = 7 + Math.floor(prng() * 5);
      for (let v = 0; v < vertices; v++) {
        const angle = (v / vertices) * Math.PI * 2;
        const rad = gr * (0.8 + (prng() - 0.5) * 0.4);
        const vx = Math.cos(angle) * rad;
        const vy = Math.sin(angle) * rad;
        if (v === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();

      // Vitreous facet reflection
      if (mineralRoll < 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-gr * 0.3, -gr * 0.3, gr * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Water-worn native placer gold flakes (if auriferous zone)
    if (mineralization >= 20 || goldProbability >= 0.2) {
      const flakeCount = Math.max(2, Math.floor((mineralization / 100) * 12));
      for (let f = 0; f < flakeCount; f++) {
        const fx = 160 + prng() * 704;
        const fy = 160 + prng() * 704;
        const fSize = zoom === 24 ? 14 + prng() * 16 : 8 + prng() * 10;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(prng() * Math.PI * 2);

        // Flake shadow
        ctx.fillStyle = 'rgba(15, 10, 5, 0.6)';
        ctx.beginPath();
        ctx.arc(3, 3, fSize * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // 22K Placer Gold Gradient
        const goldGrad = ctx.createRadialGradient(-fSize * 0.3, -fSize * 0.3, fSize * 0.1, 0, 0, fSize);
        goldGrad.addColorStop(0, '#fffbeb');
        goldGrad.addColorStop(0.3, '#fde047');
        goldGrad.addColorStop(0.7, '#eab308');
        goldGrad.addColorStop(0.9, '#a16207');
        goldGrad.addColorStop(1, '#713f12');
        ctx.fillStyle = goldGrad;

        ctx.beginPath();
        const goldVerts = 8;
        for (let gv = 0; gv < goldVerts; gv++) {
          const ga = (gv / goldVerts) * Math.PI * 2;
          const grad = fSize * (0.65 + (prng() - 0.5) * 0.6);
          const gx = Math.cos(ga) * grad;
          const gy = Math.sin(ga) * grad;
          if (gv === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        }
        ctx.closePath();
        ctx.fill();

        // Metallic highlight
        ctx.fillStyle = 'rgba(255, 245, 180, 0.85)';
        ctx.beginPath();
        ctx.arc(-fSize * 0.25, -fSize * 0.25, fSize * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  } else if (category === 'caliche') {
    // === CALICHE SUB-SURFACE HARDPAN (CaCO3) ===
    // Chalky off-white to buff cement
    const calGrad = ctx.createRadialGradient(512, 512, 50, 512, 512, 700);
    calGrad.addColorStop(0, '#ede5d8');
    calGrad.addColorStop(0.6, '#dbcebb');
    calGrad.addColorStop(1, '#baa892');
    ctx.fillStyle = calGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Micro-porous chalk texture
    for (let i = 0; i < 8000; i++) {
      const px = prng() * 1024;
      const py = prng() * 1024;
      ctx.fillStyle = prng() < 0.6 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(120, 105, 90, 0.25)';
      ctx.fillRect(px, py, 1.5 + prng() * 2.5, 1.5 + prng() * 2.5);
    }

    // Sunbaked desiccation craze cracks
    ctx.strokeStyle = 'rgba(90, 75, 60, 0.6)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let c = 0; c < 24; c++) {
      let cx = 100 + prng() * 824;
      let cy = 100 + prng() * 824;
      ctx.moveTo(cx, cy);
      for (let step = 0; step < 6; step++) {
        cx += (prng() - 0.5) * 120;
        cy += (prng() - 0.5) * 120;
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();

    // Embedded terrace pebbles with white carbonate reaction precipitation rims
    const pebbleCount = Math.min(18, Math.floor(mineralization / 6) + 6);
    for (let p = 0; p < pebbleCount; p++) {
      const px = 120 + prng() * 784;
      const py = 120 + prng() * 784;
      const pr = 16 + prng() * 32;

      // Outer pure white CaCO3 precipitation rim
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(px, py, pr * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Pebble core (basalt or quartzite)
      const pebGrad = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.2, pr * 0.1, px, py, pr);
      pebGrad.addColorStop(0, '#756858');
      pebGrad.addColorStop(0.8, '#3d3429');
      pebGrad.addColorStop(1, '#1c1712');
      ctx.fillStyle = pebGrad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Manganese oxide dendrites (black tree-like patterns on caliche fissures)
    ctx.strokeStyle = 'rgba(20, 18, 15, 0.75)';
    ctx.lineWidth = 1.2;
    for (let d = 0; d < 8; d++) {
      let dx = 200 + prng() * 624;
      let dy = 200 + prng() * 624;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      for (let br = 0; br < 5; br++) {
        const da = prng() * Math.PI * 2;
        const dlen = 15 + prng() * 25;
        dx += Math.cos(da) * dlen;
        dy += Math.sin(da) * dlen;
        ctx.lineTo(dx, dy);
      }
      ctx.stroke();
    }
  } else if (category === 'rock') {
    // === BEDROCK & BOULDERS (Basalt / Granodiorite Porphyry) ===
    // Dark igneous bedrock base with desert varnish patina
    const rGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 720);
    rGrad.addColorStop(0, '#363029');
    rGrad.addColorStop(0.5, '#24201b');
    rGrad.addColorStop(1, '#141210');
    ctx.fillStyle = rGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Mechanical fracture cleavage steps
    ctx.strokeStyle = 'rgba(10, 8, 6, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let f = 0; f < 8; f++) {
      let fx = 50 + prng() * 924;
      let fy = 50;
      ctx.moveTo(fx, fy);
      for (let s = 0; s < 7; s++) {
        fx += (prng() - 0.5) * 80;
        fy += 120 + prng() * 40;
        ctx.lineTo(fx, fy);
      }
    }
    ctx.stroke();

    // Blocky salmon-pink orthoclase feldspar phenocrysts
    for (let ph = 0; ph < 45; ph++) {
      const phx = prng() * 1024;
      const phy = prng() * 1024;
      const phw = 12 + prng() * 24;
      const phh = 8 + prng() * 18;

      ctx.save();
      ctx.translate(phx, phy);
      ctx.rotate(prng() * Math.PI * 2);

      const phGrad = ctx.createLinearGradient(-phw, -phh, phw, phh);
      phGrad.addColorStop(0, '#fca5a5');
      phGrad.addColorStop(0.5, '#ef4444');
      phGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = phGrad;
      ctx.fillRect(-phw * 0.5, -phh * 0.5, phw, phh);
      ctx.restore();
    }

    // Quartz intrusion veinlets traversing the rock face
    if (mineralization > 12) {
      ctx.strokeStyle = 'rgba(235, 230, 220, 0.7)';
      ctx.lineWidth = zoom === 24 ? 7 : 4;
      ctx.beginPath();
      let qx = 120 + prng() * 200;
      let qy = 60;
      ctx.moveTo(qx, qy);
      for (let s = 0; s < 6; s++) {
        qx += 90 + prng() * 90;
        qy += 140 + (prng() - 0.5) * 40;
        ctx.lineTo(qx, qy);
      }
      ctx.stroke();

      // Pyrite cubic specks along veinlet margin
      const pyCount = Math.min(20, Math.floor(mineralization / 5));
      for (let py = 0; py < pyCount; py++) {
        const px = 180 + prng() * 664;
        const pyPos = 180 + prng() * 664;
        const pSize = 4 + prng() * 5;
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(px, pyPos, pSize, pSize);
      }
    }
  } else {
    // === HYDROTHERMAL QUARTZ VEIN (Au Host Rock) ===
    // Massive milky bull quartz
    const qGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 700);
    qGrad.addColorStop(0, '#faf8f5');
    qGrad.addColorStop(0.4, '#ede6da');
    qGrad.addColorStop(0.8, '#d6cbbb');
    qGrad.addColorStop(1, '#a89c8a');
    ctx.fillStyle = qGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Crystalline micro-fracture network
    ctx.strokeStyle = 'rgba(180, 160, 140, 0.4)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let qf = 0; qf < 35; qf++) {
      let qx = prng() * 1024;
      let qy = prng() * 1024;
      ctx.moveTo(qx, qy);
      for (let qs = 0; qs < 4; qs++) {
        qx += (prng() - 0.5) * 90;
        qy += (prng() - 0.5) * 90;
        ctx.lineTo(qx, qy);
      }
    }
    ctx.stroke();

    // Rusty limonite/hematite gossan iron-hat boxwork cavities
    const gossanCount = Math.min(18, Math.floor(mineralization / 7) + 4);
    for (let g = 0; g < gossanCount; g++) {
      const gx = 140 + prng() * 744;
      const gy = 140 + prng() * 744;
      const gr = 16 + prng() * 30;

      // Iron oxide stain halo
      const haloGrad = ctx.createRadialGradient(gx, gy, gr * 0.2, gx, gy, gr * 2.2);
      haloGrad.addColorStop(0, 'rgba(180, 60, 15, 0.85)');
      haloGrad.addColorStop(0.5, 'rgba(217, 119, 6, 0.45)');
      haloGrad.addColorStop(1, 'rgba(180, 83, 9, 0.0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Cavernous cellular boxwork void
      ctx.fillStyle = 'rgba(55, 20, 8, 0.9)';
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 22K Native Wire Gold Ribbons
    const wireCount = Math.max(3, Math.floor((mineralization / 100) * 14));
    for (let w = 0; w < wireCount; w++) {
      let wx = 200 + prng() * 624;
      let wy = 200 + prng() * 624;

      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = zoom === 24 ? 5.0 : 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(wx, wy);

      const segments = 6 + Math.floor(prng() * 6);
      for (let s = 0; s < segments; s++) {
        const ga = prng() * Math.PI * 2;
        const glen = (zoom === 24 ? 22 : 15) * (0.6 + prng() * 0.8);
        wx += Math.cos(ga) * glen;
        wy += Math.sin(ga) * glen;
        ctx.lineTo(wx, wy);
      }
      ctx.stroke();

      // Inner bright 24k gold core
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = zoom === 24 ? 2.2 : 1.4;
      ctx.stroke();

      // Native crystalline nugget octahedron
      const nRad = (zoom === 24 ? 10 : 7) * (0.8 + prng() * 0.8);
      const nGrad = ctx.createRadialGradient(wx - nRad * 0.3, wy - nRad * 0.3, nRad * 0.1, wx, wy, nRad);
      nGrad.addColorStop(0, '#fffbeb');
      nGrad.addColorStop(0.3, '#fde047');
      nGrad.addColorStop(0.7, '#eab308');
      nGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = nGrad;
      ctx.beginPath();
      ctx.arc(wx, wy, nRad, 0, Math.PI * 2);
      ctx.fill();

      // Alpha metallic mask
      ctx.fillStyle = 'rgba(255, 220, 80, 1.0)';
      ctx.beginPath();
      ctx.arc(wx, wy, nRad * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  return canvas;
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

export const MicroMineralCanvas: React.FC<MicroMineralCanvasProps> = ({
  analysis,
  opticalZoom,
  size = 332,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // If no surface is hit (e.g. aiming at the open sky), do not render the loupe canvas
    if (!analysis || !analysis.hit) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) {
      console.warn('[MicroMineralCanvas] WebGL not supported on this device');
      return;
    }

    // Compile vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);

    // Compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) return;
    gl.shaderSource(fs, FRAGMENT_SHADER);
    gl.compileShader(fs);

    // Link shader program
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[MicroMineralCanvas] Shader link error:', gl.getProgramInfoLog(program));
      return;
    }

    // Create quad geometry
    const quadVertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Generate real-time procedural texture based on analysis
    const category = analysis.materialCategory || 'sand';
    const mineralization = analysis.mineralization ?? 15;
    const goldProbability = analysis.goldProbability ?? 0.15;
    const strata = analysis.strataName || 'Needle Pass Quartz Contact';

    const proceduralCanvas = generateProceduralTexture(
      category,
      mineralization,
      goldProbability,
      strata,
      opticalZoom
    );

    // Upload texture to WebGL
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, proceduralCanvas);

    // Uniform locations
    const uTextureLoc = gl.getUniformLocation(program, 'uTexture');
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uZoomLoc = gl.getUniformLocation(program, 'uZoom');
    const uMaterialCatLoc = gl.getUniformLocation(program, 'uMaterialCat');
    const uMineralizationLoc = gl.getUniformLocation(program, 'uMineralization');
    const uGoldProbLoc = gl.getUniformLocation(program, 'uGoldProb');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');

    const materialCode = category === 'quartz' ? 0.0 : category === 'rock' ? 1.0 : category === 'caliche' ? 2.0 : 3.0;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let startTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (uTextureLoc) gl.uniform1i(uTextureLoc, 0);

      if (uTimeLoc) gl.uniform1f(uTimeLoc, elapsed);
      if (uZoomLoc) gl.uniform1f(uZoomLoc, opticalZoom);
      if (uMaterialCatLoc) gl.uniform1f(uMaterialCatLoc, materialCode);
      if (uMineralizationLoc) gl.uniform1f(uMineralizationLoc, mineralization);
      if (uGoldProbLoc) gl.uniform1f(uGoldProbLoc, goldProbability);
      if (uMouseLoc) gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);
      if (uResolutionLoc) gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (buffer) gl.deleteBuffer(buffer);
      if (texture) gl.deleteTexture(texture);
      if (program) gl.deleteProgram(program);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    };
  }, [analysis?.materialCategory, analysis?.strataName, analysis?.hit, opticalZoom, size]);

  if (!analysis || !analysis.hit) {
    return null;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
