import * as THREE from 'three';

/**
 * Procedural PBR Texture Generation Suite for Wild West Characters
 * Generates organic micro-surface bump maps, fabric weaves, leather grain, and lifelike eyes
 * entirely in-memory using lightweight HTML5 Canvas routines, cached for maximum performance.
 */

class CharacterTextureManager {
  private static instance: CharacterTextureManager;
  private denimBump?: THREE.CanvasTexture;
  private leatherBump?: THREE.CanvasTexture;
  private skinBump?: THREE.CanvasTexture;
  private woodGrain?: THREE.CanvasTexture;
  private bandanaMap?: THREE.CanvasTexture;
  private eyeCache: Map<number, THREE.CanvasTexture> = new Map();

  public static getInstance(): CharacterTextureManager {
    if (!CharacterTextureManager.instance) {
      CharacterTextureManager.instance = new CharacterTextureManager();
    }
    return CharacterTextureManager.instance;
  }

  /**
   * High-frequency diagonal denim/canvas twill weave bump map
   */
  public getDenimBump(): THREE.CanvasTexture {
    if (this.denimBump) return this.denimBump;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base neutral gray
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Diagonal twill weave
    ctx.lineWidth = 1.2;
    for (let i = -size; i < size * 2; i += 4) {
      const shade = 128 + Math.floor(Math.sin(i * 0.8) * 35);
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();

      // Cross-hatch micro fibers
      ctx.strokeStyle = `rgba(${128 - 25},${128 - 25},${128 - 25}, 0.25)`;
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i + size);
      ctx.stroke();
    }

    // Micro noise grain
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let p = 0; p < data.length; p += 4) {
      const n = (Math.random() - 0.5) * 28;
      data[p] = Math.min(255, Math.max(0, data[p] + n));
      data[p + 1] = Math.min(255, Math.max(0, data[p + 1] + n));
      data[p + 2] = Math.min(255, Math.max(0, data[p + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    this.denimBump = tex;
    return tex;
  }

  /**
   * Distressed frontier leather pebble grain and crease bump map
   */
  public getLeatherBump(): THREE.CanvasTexture {
    if (this.leatherBump) return this.leatherBump;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Organic leather pores and pebble cells
    const cellCount = 65;
    for (let c = 0; c < cellCount; c++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const r = 2.5 + Math.random() * 4.5;
      const grad = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, r);
      grad.addColorStop(0, 'rgba(215, 215, 215, 0.45)');
      grad.addColorStop(0.65, 'rgba(128, 128, 128, 0.15)');
      grad.addColorStop(1, 'rgba(40, 40, 40, 0.6)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stress cracks and creases
    ctx.strokeStyle = 'rgba(45, 45, 45, 0.4)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 12; k++) {
      ctx.beginPath();
      let sx = Math.random() * size;
      let sy = Math.random() * size;
      ctx.moveTo(sx, sy);
      for (let s = 0; s < 4; s++) {
        sx += (Math.random() - 0.5) * 22;
        sy += (Math.random() - 0.5) * 22;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    this.leatherBump = tex;
    return tex;
  }

  /**
   * Micro-skin pores and subtle cellular striation bump map
   */
  public getSkinBump(): THREE.CanvasTexture {
    if (this.skinBump) return this.skinBump;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Fine skin micro-pores
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.15) {
        // Pore depression
        const dip = -15 - Math.random() * 25;
        data[i] = Math.max(0, data[i] + dip);
        data[i + 1] = Math.max(0, data[i + 1] + dip);
        data[i + 2] = Math.max(0, data[i + 2] + dip);
      } else {
        // Subtle skin grain
        const n = (Math.random() - 0.5) * 12;
        data[i] = Math.min(255, Math.max(0, data[i] + n));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    this.skinBump = tex;
    return tex;
  }

  /**
   * Longitudinal aged hardwood grain texture for tool handles and gun stocks
   */
  public getWoodGrain(): THREE.CanvasTexture {
    if (this.woodGrain) return this.woodGrain;

    const width = 64;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#5c371d';
    ctx.fillRect(0, 0, width, height);

    // Wood rings & striated grain fibers
    for (let y = 0; y < height; y += 2) {
      const v = Math.sin(y * 0.08) * 15 + Math.cos(y * 0.03) * 20;
      const shade = Math.floor(75 + v);
      ctx.fillStyle = `rgb(${shade + 18}, ${Math.floor(shade * 0.65)}, ${Math.floor(shade * 0.35)})`;
      ctx.fillRect(0, y, width, 2);
    }

    // Deep grain knots and crevices
    ctx.fillStyle = 'rgba(38, 20, 10, 0.4)';
    for (let k = 0; k < 6; k++) {
      const ky = Math.random() * height;
      ctx.beginPath();
      ctx.ellipse(width / 2, ky, width * 0.4, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);
    this.woodGrain = tex;
    return tex;
  }

  /**
   * Lifelike human eye texture with sclera, dark limbal ring, radiating fibrous iris,
   * deep pupil, and natural corneal highlight
   */
  public getEyeTexture(irisColorHex: number = 0x3d2b1f): THREE.CanvasTexture {
    if (this.eyeCache.has(irisColorHex)) {
      return this.eyeCache.get(irisColorHex)!;
    }

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. Sclera with subtle organic capillary warmth towards edges
    const scleraGrad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    scleraGrad.addColorStop(0, '#f9f6f0');
    scleraGrad.addColorStop(0.75, '#ece5d8');
    scleraGrad.addColorStop(1.0, '#dfcfc2'); // Warm vascular edge
    ctx.fillStyle = scleraGrad;
    ctx.fillRect(0, 0, size, size);

    // Tiny pinkish corner capillaries
    ctx.strokeStyle = 'rgba(195, 80, 80, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() < 0.5 ? 2 : size - 2, Math.random() * size);
      ctx.lineTo(size * 0.25 + Math.random() * size * 0.5, size / 2);
      ctx.stroke();
    }

    // 2. Iris outer limbal ring
    const cx = size / 2;
    const cy = size / 2;
    const irisR = size * 0.36;

    // Convert hex to rgb
    const r = (irisColorHex >> 16) & 255;
    const g = (irisColorHex >> 8) & 255;
    const b = irisColorHex & 255;

    // Dark limbal ring
    ctx.fillStyle = '#16110d';
    ctx.beginPath();
    ctx.arc(cx, cy, irisR + 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Iris base radial gradient
    const irisGrad = ctx.createRadialGradient(cx, cy, irisR * 0.2, cx, cy, irisR);
    irisGrad.addColorStop(0, `rgb(${Math.min(255, r + 45)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 30)})`);
    irisGrad.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    irisGrad.addColorStop(0.88, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 20)})`);
    irisGrad.addColorStop(1.0, '#110c08');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Radiating iris fibers / striations
    ctx.lineWidth = 1.2;
    for (let a = 0; a < Math.PI * 2; a += 0.08) {
      const spokeShade = Math.sin(a * 7) > 0 ? 30 : -20;
      ctx.strokeStyle = `rgba(${Math.min(255, r + spokeShade + 20)}, ${Math.min(255, g + spokeShade + 15)}, ${Math.min(255, b + spokeShade)}, 0.45)`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (irisR * 0.32), cy + Math.sin(a) * (irisR * 0.32));
      ctx.lineTo(cx + Math.cos(a) * (irisR * 0.96), cy + Math.sin(a) * (irisR * 0.96));
      ctx.stroke();
    }

    // 3. Deep Pupil
    const pupilR = irisR * 0.38;
    ctx.fillStyle = '#060403';
    ctx.beginPath();
    ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // 4. Glossy corneal light reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(cx - pupilR * 0.5, cy - pupilR * 0.55, pupilR * 0.28, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    this.eyeCache.set(irisColorHex, tex);
    return tex;
  }

  /**
   * Authentic Wild West bandana fabric texture with white decorative paisley/diamond borders
   */
  public getBandanaTexture(): THREE.CanvasTexture {
    if (this.bandanaMap) return this.bandanaMap;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rich crimson ground
    ctx.fillStyle = '#8f1d1d';
    ctx.fillRect(0, 0, size, size);

    // Subtle dark folds
    const foldGrad = ctx.createLinearGradient(0, 0, size, size);
    foldGrad.addColorStop(0, 'rgba(0,0,0,0.18)');
    foldGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    foldGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = foldGrad;
    ctx.fillRect(0, 0, size, size);

    // Frontier paisley/dot pattern in soft ivory
    ctx.fillStyle = '#f5eedc';
    ctx.strokeStyle = '#f5eedc';
    ctx.lineWidth = 1;

    // Diamond border
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.strokeRect(10, 10, size - 20, size - 20);

    // Geometric polka stars
    for (let x = 18; x < size - 16; x += 18) {
      for (let y = 18; y < size - 16; y += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Tiny corner cross
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + 3, y);
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 3);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    this.bandanaMap = tex;
    return tex;
  }
}

export const characterTextures = CharacterTextureManager.getInstance();
