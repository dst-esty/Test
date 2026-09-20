import * as THREE from 'three';

export interface ClaimNoticePlateParams {
  name: string;
  ownerName: string;
  isOwner: boolean;
  stakedAt?: number;
  x: number;
  z: number;
  elevation?: number;
  forSale?: boolean;
  priceDollars?: number;
  priceGoldOunces?: number;
}

function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

/**
 * Creates an authentic, high-resolution 1880s stamped brass notice plate texture
 * for 3D claim monument posts in the world.
 */
export function createClaimNoticePlateTexture(params: ClaimNoticePlateParams): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const { name, ownerName, isOwner, stakedAt, x, z, elevation, forSale, priceDollars, priceGoldOunces } = params;

  // 1. Aged Metallic Brass Plaque Base
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 640);
  bgGrad.addColorStop(0, '#e8bc55');
  bgGrad.addColorStop(0.2, '#cca03b');
  bgGrad.addColorStop(0.5, '#deb04c');
  bgGrad.addColorStop(0.8, '#af8126');
  bgGrad.addColorStop(1, '#cda13c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 640);

  // Subtle metallic horizontal brush lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 640; i += 4) {
    ctx.fillRect(0, i, 512, 1.5);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let i = 2; i < 640; i += 6) {
    ctx.fillRect(0, i, 512, 1.5);
  }

  // Dark oxidized outer border
  ctx.strokeStyle = '#4a3311';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 626);

  // Inner beveled gold edge
  ctx.strokeStyle = '#fcedb6';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 480, 608);

  // Ornate inner stamped boundary
  ctx.strokeStyle = isOwner ? '#634316' : '#732e14';
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, 460, 588);

  // 2. Corner Rivets / Screws (with specular highlight and drop-shadow)
  const rivetCoords = [
    [32, 32],
    [480, 32],
    [32, 608],
    [480, 608],
  ];
  rivetCoords.forEach(([rx, ry]) => {
    // Shadow
    ctx.beginPath();
    ctx.arc(rx + 1, ry + 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 20, 10, 0.6)';
    ctx.fill();

    // Rivet body
    ctx.beginPath();
    ctx.arc(rx, ry, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#6e4c19';
    ctx.fill();

    // Specular dot
    ctx.beginPath();
    ctx.arc(rx - 2, ry - 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fffae2';
    ctx.fill();

    // Screw slot
    ctx.strokeStyle = '#2d1c05';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx - 4, ry - 4);
    ctx.lineTo(rx + 4, ry + 4);
    ctx.stroke();
  });

  ctx.textAlign = 'center';

  // 3. Top Header: Territory & District
  ctx.fillStyle = '#3c2408';
  ctx.font = 'bold 16px "Times New Roman", Georgia, serif';
  ctx.fillText('★ ★  TERRITORY OF ARIZONA  ★ ★', 256, 58);

  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillStyle = '#5c3a12';
  ctx.fillText('SUPERSTITION MINING DISTRICT • APACHE TRAIL', 256, 78);

  // Dividing rule
  ctx.strokeStyle = '#5c3a12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 92);
  ctx.lineTo(452, 92);
  ctx.stroke();

  // 4. Main Banner
  ctx.fillStyle = isOwner ? '#261503' : '#3f1709';
  ctx.font = '900 24px "Times New Roman", Georgia, serif';
  ctx.fillText('NOTICE OF MINING LOCATION', 256, 126);

  ctx.font = 'bold 13px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#6a4317';
  ctx.fillText('LODE & PLACER MINERAL CLAIM PATENT', 256, 148);

  // 5. Recessed Claim Name Plaque
  ctx.fillStyle = 'rgba(45, 29, 10, 0.12)';
  ctx.beginPath();
  safeRoundRect(ctx, 42, 166, 428, 108, 12);
  ctx.fill();

  ctx.strokeStyle = '#855921';
  ctx.lineWidth = 2;
  ctx.beginPath();
  safeRoundRect(ctx, 42, 166, 428, 108, 12);
  ctx.stroke();

  // Name formatting (wrap if long)
  const cleanName = (name || 'UNNAMED MINERAL LODE').toUpperCase();
  ctx.fillStyle = '#1f1003';
  if (cleanName.length > 24) {
    ctx.font = 'bold 22px "Times New Roman", Georgia, serif';
    const words = cleanName.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).trim().length <= 20) {
        line1 = (line1 + ' ' + w).trim();
      } else {
        line2 = (line2 + ' ' + w).trim();
      }
    }
    ctx.fillText(`"${line1}"`, 256, 210);
    if (line2) {
      ctx.fillText(`"${line2}"`, 256, 240);
    }
  } else {
    ctx.font = 'bold 28px "Times New Roman", Georgia, serif';
    ctx.fillText(`"${cleanName}"`, 256, 228);
  }

  // 6. Locator / Ownership Data
  ctx.textAlign = 'left';
  const startX = 64;
  let currY = 305;

  ctx.fillStyle = '#261503';
  ctx.font = 'bold 15px "Times New Roman", Georgia, serif';
  ctx.fillText('CLAIMANT / LOCATOR:', startX, currY);

  ctx.font = '900 17px "Times New Roman", Georgia, serif';
  ctx.fillStyle = isOwner ? '#0f4216' : '#571e0c';
  const displayOwner = isOwner ? 'YOU (PATENT HOLDER)' : (ownerName || 'UNKNOWN PROSPECTOR').toUpperCase();
  ctx.fillText(displayOwner, startX + 175, currY);

  currY += 28;
  ctx.fillStyle = '#3c2408';
  ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
  ctx.fillText('SURVEYED BOUNDS:', startX, currY);
  ctx.font = '14px "Times New Roman", Georgia, serif';
  ctx.fillText('40 ACRES • 600 FT × 1500 FT (1600 M²)', startX + 175, currY);

  currY += 26;
  ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
  ctx.fillText('LOCATION GRID:', startX, currY);
  ctx.font = '14px "Times New Roman", Georgia, serif';
  ctx.fillText(`${x.toFixed(1)}° E, ${z.toFixed(1)}° S ${elevation !== undefined ? `• ${elevation.toFixed(0)}m Elev` : ''}`, startX + 175, currY);

  currY += 26;
  ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
  ctx.fillText('DATE RECORDED:', startX, currY);
  ctx.font = '14px "Times New Roman", Georgia, serif';
  const dateStr = stakedAt ? new Date(stakedAt).toLocaleDateString() : 'A.T. REGISTERED';
  ctx.fillText(dateStr, startX + 175, currY);

  currY += 26;
  ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
  ctx.fillText('MINING RIGHTS:', startX, currY);
  ctx.font = '14px "Times New Roman", Georgia, serif';
  ctx.fillText(isOwner ? 'EXCLUSIVE EXTRACTION PATENT' : 'PRIVATE MINING CONCESSION', startX + 175, currY);

  // 7. Status Banner or Sale Tag
  ctx.textAlign = 'center';
  if (forSale) {
    // Sale Notice Box
    ctx.fillStyle = 'rgba(168, 48, 20, 0.9)';
    ctx.beginPath();
    safeRoundRect(ctx, 42, 450, 428, 70, 8);
    ctx.fill();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 18px "Times New Roman", Georgia, serif';
    ctx.fillText(`★ LISTED FOR SALE: $${priceDollars || 250} CASH ★`, 256, 478);

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`OR ${priceGoldOunces || 12} OZ RAW GOLD • INQUIRE AT DEED OFFICE`, 256, 502);
  } else {
    // Standard Legal Protection Stamp
    ctx.fillStyle = 'rgba(40, 24, 8, 0.08)';
    ctx.beginPath();
    safeRoundRect(ctx, 42, 456, 428, 64, 8);
    ctx.fill();

    ctx.strokeStyle = '#7c5322';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#3c2408';
    ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
    ctx.fillText('WARNING TO WILDCATTERS & CLAIM JUMPERS', 256, 482);

    ctx.font = 'italic 12px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#5c3a12';
    ctx.fillText('All gold & minerals are property of the recorded locator.', 256, 502);
  }

  // 8. Territorial Seal & Bottom Signature
  ctx.strokeStyle = '#5c3a12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(70, 545);
  ctx.lineTo(442, 545);
  ctx.stroke();

  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#4c2e0b';
  ctx.fillText('TERRITORIAL RECORDER OF DEEDS • PHOENIX, A.T.', 256, 565);

  ctx.font = 'italic 11px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#6c4316';
  ctx.fillText('Drive corner posts 4 ft high. Mark boundary lines visibly.', 256, 584);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a floating 3D billboard sprite above a claim monument cairn
 * so players can read the claim title and owner clearly from 30+ meters.
 */
export function createClaimBillboardSprite(params: {
  name: string;
  ownerName: string;
  isOwner: boolean;
  forSale?: boolean;
  priceDollars?: number;
}): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const spriteMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) });
    return new THREE.Sprite(spriteMat);
  }

  const { name, ownerName, isOwner, forSale, priceDollars } = params;

  // Background Plaque
  ctx.fillStyle = 'rgba(18, 12, 8, 0.92)';
  ctx.beginPath();
  safeRoundRect(ctx, 10, 10, 492, 130, 20);
  ctx.fill();

  // Outer Border: Antique Gold for player's claim, Warm Amber/Orange for rival
  ctx.strokeStyle = isOwner ? '#f59e0b' : '#ea580c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  safeRoundRect(ctx, 12, 12, 488, 126, 18);
  ctx.stroke();

  // Inner subtle border
  ctx.strokeStyle = isOwner ? 'rgba(251, 191, 36, 0.35)' : 'rgba(249, 115, 22, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  safeRoundRect(ctx, 18, 18, 476, 114, 14);
  ctx.stroke();

  ctx.textAlign = 'center';

  // Header tag pill
  ctx.fillStyle = isOwner ? '#d97706' : '#c2410c';
  ctx.font = 'bold 13px "Courier New", monospace';
  const tagText = isOwner ? '★ YOUR MINING CLAIM • 40 ACRES' : `⚠️ RIVAL TERRITORY • 40 ACRES`;
  ctx.fillText(tagText, 256, 38);

  // Claim Title
  ctx.fillStyle = '#fff4dc';
  ctx.font = 'bold 26px "Times New Roman", Georgia, serif';
  const title = name.length > 26 ? name.slice(0, 24) + '…' : name;
  ctx.fillText(`"${title}"`, 256, 74);

  // Subtitle / Owner & Sale status
  if (forSale) {
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillText(`🏷️ FOR SALE: $${priceDollars || 250} • PRESS [E] TO INSPECT DEED`, 256, 108);
  } else {
    ctx.fillStyle = '#d6d3d1';
    ctx.font = '14px "Times New Roman", Georgia, serif';
    const ownerStr = isOwner ? 'Exclusive Patent Holder: You' : `Locator: ${ownerName || 'Prospector'}`;
    ctx.fillText(`${ownerStr} • Press [E] to Inspect Notice`, 256, 108);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3.4, 1.0, 1.0);
  sprite.position.set(0, 3.3, 0);
  return sprite;
}
