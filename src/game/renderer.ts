import {
  getDriverById,
  PIXELS_PER_METER,
  resolveDriverOutfitColors,
  resolveVehicleColors,
} from './catalog';
import { GameSimulation } from './physics';
import { TerrainProp } from './terrain';
import { Collectible, DriverId, Particle, VehicleConfig, VehiclePhysicsState } from './types';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * Draws any of the 14 stylized cartoon VIP bobblehead drivers with customizable outfit colors.
 */
export function drawVIPDriver(
  ctx: CanvasRenderingContext2D,
  driverId: DriverId,
  headAngle: number,
  timeSec: number,
  crashed: boolean,
  outfitSwatchId = 'default'
): void {
  const driverCfg = getDriverById(driverId);
  const outfit = resolveDriverOutfitColors(driverCfg, outfitSwatchId);

  ctx.save();

  // --- CUSTOMIZABLE TORSO / OUTFIT ---
  if (driverId === 'namo') {
    // White kurta sleeves + Nehru jacket in outfit primary
    ctx.fillStyle = '#F8FAFC';
    roundRectPath(ctx, -12, -10, 24, 20, 6);
    ctx.fill();
    ctx.fillStyle = outfit.primary;
    roundRectPath(ctx, -10, -10, 20, 20, 5);
    ctx.fill();
    ctx.strokeStyle = outfit.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(3, -5, 4, 2);
    ctx.fillStyle = outfit.secondary;
    ctx.beginPath();
    ctx.arc(0, -3, 1.3, 0, Math.PI * 2);
    ctx.arc(0, 3, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (driverId === 'yogiji') {
    // Flowing robes with diagonal draped shawl
    ctx.fillStyle = outfit.primary;
    roundRectPath(ctx, -12, -10, 24, 20, 6);
    ctx.fill();
    ctx.strokeStyle = outfit.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = outfit.isCustom ? outfit.accent : '#FB923C';
    ctx.beginPath();
    ctx.moveTo(-10, -9);
    ctx.lineTo(10, 5);
    ctx.lineTo(8, 10);
    ctx.lineTo(-12, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#78350F';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 2.5, -6 + Math.abs(i) * 0.7, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (driverId === 'donnyt' || driverId === 'boris_b') {
    // Tailored suit + fluttering tie
    ctx.fillStyle = outfit.primary;
    roundRectPath(ctx, -13, -10, 26, 20, 5);
    ctx.fill();
    ctx.strokeStyle = outfit.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(5, -10);
    ctx.lineTo(1, 2);
    ctx.closePath();
    ctx.fill();
    const tieFlutter = Math.sin(timeSec * 14) * 3;
    ctx.fillStyle = driverId === 'donnyt' ? '#DC2626' : '#2563EB';
    ctx.beginPath();
    ctx.moveTo(-1, -9);
    ctx.lineTo(3, -9);
    ctx.lineTo(4 - tieFlutter, 11);
    ctx.lineTo(0 - tieFlutter, 14);
    ctx.lineTo(-2 - tieFlutter * 0.6, 10);
    ctx.closePath();
    ctx.fill();
  } else if (driverId === 'gordon') {
    // Double-breasted chef jacket
    ctx.fillStyle = outfit.primary;
    roundRectPath(ctx, -12, -10, 24, 20, 5);
    ctx.fill();
    ctx.strokeStyle = outfit.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.arc(-2, -5 + r * 4.5, 1.2, 0, Math.PI * 2);
      ctx.arc(3.5, -5 + r * 4.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (driverId === 'cr7') {
    // Athletic jersey with collar stripe & number crest
    ctx.fillStyle = outfit.primary;
    roundRectPath(ctx, -12, -10, 24, 20, 5);
    ctx.fill();
    ctx.strokeStyle = outfit.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-10, -10, 20, 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('7', 2, 4);
  } else if (driverId === 'taylor') {
    // Sparkling tour blazer
    ctx.fillStyle = outfit.primary;
    roundRectPath(ctx, -12, -10, 24, 20, 5);
    ctx.fill();
    ctx.strokeStyle = outfit.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(-5, -6, 2, 2);
    ctx.fillRect(3, -4, 2, 2);
    ctx.fillRect(-2, 2, 2, 2);
    ctx.fillRect(5, 4, 2, 2);
  } else {
    // Biker jacket / Hoodie / Tactical / Tweed / Tracksuit using customizable outfit palette
    ctx.fillStyle = outfit.primary;
    roundRectPath(ctx, -12, -10, 24, 20, 5);
    ctx.fill();
    ctx.strokeStyle = outfit.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Zipper / lapel accent
    ctx.strokeStyle = outfit.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, -9);
    ctx.lineTo(2, 9);
    ctx.stroke();
  }

  // --- NECK SPRING ---
  ctx.strokeStyle = '#D4A373';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(Math.sin(headAngle) * 6, -15);
  ctx.stroke();

  // --- OVERSIZED BOBBLEHEAD ---
  ctx.translate(0, -10);
  ctx.rotate(headAngle);
  ctx.translate(0, -15);

  const skinMap: Record<DriverId, string> = {
    namo: '#E5B285',
    yogiji: '#DDA676',
    donnyt: '#F6B882',
    elon: '#F3D2B8',
    zuck: '#F5D8C0',
    jeffy: '#EBC29E',
    putin_bear: '#F2CFB5',
    boris_b: '#F7D2B7',
    king_srk: '#DEA97E',
    cr7: '#E1AB7D',
    gordon: '#F5C9A8',
    snoop: '#A16842',
    taylor: '#FAE0CC',
    einstein: '#F2D0B6',
  };
  const skinColor = skinMap[driverId] ?? '#F3D2B8';

  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15.5, 16.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ear
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(-13, 1, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Nose
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(14.5, 1, 3.2, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();

  // --- CHARACTER-SPECIFIC HEAD FEATURES ---
  if (driverId === 'namo') {
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(-2, -6, 14.5, Math.PI * 0.95, Math.PI * 2.02);
    ctx.quadraticCurveTo(8, -14, -12, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(-6, 5);
    ctx.quadraticCurveTo(4, 22, 15.5, 10);
    ctx.quadraticCurveTo(15, 4, 8, 5);
    ctx.quadraticCurveTo(1, 8, -6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(9.5, 6.2, 5.5, 2.2, 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
    roundRectPath(ctx, 3, -5.5, 9.5, 6.2, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(3, -2.5);
    ctx.stroke();
    drawDriverEye(ctx, 8.2, -2.3, crashed);
  } else if (driverId === 'yogiji') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-2, -10, 6.5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EA580C';
    ctx.fillRect(9.5, -10.5, 2.4, 5.5);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(10.2, -9.5, 1, 3.5);
    drawAviators(ctx, '#F59E0B');
    drawSmile(ctx, 8, 5, '#7C2D12');
  } else if (driverId === 'donnyt') {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.quadraticCurveTo(-15, -19, 2, -20);
    ctx.quadraticCurveTo(18, -21, 21, -11);
    ctx.quadraticCurveTo(13, -6, 3, -9);
    ctx.quadraticCurveTo(-6, -10, -14, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#A16207';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, -6.5);
    ctx.lineTo(12, -5.2);
    ctx.stroke();
    drawDriverEye(ctx, 8.2, -2, crashed);
    ctx.fillStyle = '#991B1B';
    ctx.beginPath();
    ctx.ellipse(9.5, 6.8, 3.6, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (driverId === 'elon') {
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(-15, -16, -2, -17.5);
    ctx.lineTo(5, -20);
    ctx.lineTo(9, -15.5);
    ctx.lineTo(14, -14);
    ctx.quadraticCurveTo(6, -9, -11, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawWrapShades(ctx, '#38BDF8');
    drawSmile(ctx, 8.5, 6.5, '#78350F');
  } else if (driverId === 'zuck') {
    // Curly brown tech locks
    ctx.fillStyle = '#78350F';
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.9 + (i / 5) * Math.PI * 1.15;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 12, -4 + Math.sin(a) * 11, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Smart glasses
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    roundRectPath(ctx, 2, -5.5, 11.5, 6, 2);
    ctx.fill();
    ctx.stroke();
    drawDriverEye(ctx, 8, -2.5, crashed);
    drawSmile(ctx, 8.5, 6.5, '#78350F');
  } else if (driverId === 'jeffy') {
    // Gleaming bald dome + cowboy hat brim + blue space aviators
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-2, -10, 7, 3.2, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Cowboy hat
    ctx.fillStyle = '#D6D3D1';
    ctx.strokeStyle = '#57534E';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -13, 19, 4.5, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    roundRectPath(ctx, -10, -23, 20, 11, 4);
    ctx.fill();
    ctx.stroke();
    drawAviators(ctx, '#38BDF8');
    drawSmile(ctx, 8.5, 6.5, '#78350F');
  } else if (driverId === 'putin_bear') {
    // Thin slicked blonde-grey hairline + stern dark shades
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(-5, -9, 10, Math.PI, Math.PI * 1.85);
    ctx.fill();
    drawWrapShades(ctx, '#94A3B8');
    // Stern straight mouth
    ctx.strokeStyle = '#7C2D12';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(5, 7);
    ctx.lineTo(12, 7);
    ctx.stroke();
  } else if (driverId === 'boris_b') {
    // Wild windswept platinum blonde mop
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-9, -18);
    ctx.lineTo(-4, -23);
    ctx.lineTo(4, -19);
    ctx.lineTo(13, -22);
    ctx.lineTo(19, -12);
    ctx.lineTo(12, -7);
    ctx.lineTo(2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawDriverEye(ctx, 8.2, -2, crashed);
    drawSmile(ctx, 8.5, 6.5, '#7C2D12');
  } else if (driverId === 'king_srk') {
    // Iconic swept dark Bollywood hair + stylish dark shades + light stubble
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-15, 2);
    ctx.quadraticCurveTo(-18, -17, 0, -19);
    ctx.quadraticCurveTo(16, -18, 17, -8);
    ctx.quadraticCurveTo(8, -11, -7, -6);
    ctx.closePath();
    ctx.fill();
    drawAviators(ctx, '#F59E0B');
    // Charm dimple grin
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(8.5, 6, 4.2, 0.1, Math.PI * 0.85);
    ctx.fill();
  } else if (driverId === 'cr7') {
    // Sharp athletic spiked fade
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-12, -16);
    ctx.lineTo(-2, -19);
    ctx.lineTo(8, -21);
    ctx.lineTo(15, -13);
    ctx.lineTo(6, -10);
    ctx.lineTo(-10, -8);
    ctx.closePath();
    ctx.fill();
    drawDriverEye(ctx, 8.4, -2, crashed);
    // Big bright grin
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(8.5, 6.2, 4.5, 0.05, Math.PI * 0.9);
    ctx.fill();
  } else if (driverId === 'gordon') {
    // Tall spiked blonde hair + furrowed intense brow
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#A16207';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-10, -21);
    ctx.lineTo(-2, -17);
    ctx.lineTo(4, -23);
    ctx.lineTo(11, -17);
    ctx.lineTo(16, -15);
    ctx.lineTo(10, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Intense furrowed brow
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(3.5, -7);
    ctx.lineTo(12, -4.5);
    ctx.stroke();
    drawDriverEye(ctx, 8.2, -1.8, crashed);
    // Shouting open mouth
    ctx.fillStyle = '#7F1D1D';
    ctx.beginPath();
    ctx.ellipse(9, 7, 4.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (driverId === 'snoop') {
    // Braids with colorful beads + round tinted sunglasses + goatee
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(-2, -6, 15, Math.PI * 0.9, Math.PI * 2.05);
    ctx.fill();
    // Hanging braids at back
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-11 - i * 2, 0);
      ctx.lineTo(-14 - i * 3, 14 + i * 2);
      ctx.stroke();
      ctx.fillStyle = i % 2 === 0 ? '#FACC15' : '#A855F7';
      ctx.beginPath();
      ctx.arc(-14 - i * 3, 14 + i * 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Round retro shades
    ctx.fillStyle = '#581C87';
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(8, -2, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Goatee
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(10, 12, 3.8, 0, Math.PI * 2);
    ctx.fill();
    drawSmile(ctx, 8.5, 6.5, '#FFFFFF');
  } else if (driverId === 'taylor') {
    // Flowing blonde hair + signature front bangs + classic red lips
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-16, 13);
    ctx.quadraticCurveTo(-20, -14, 0, -18.5);
    ctx.quadraticCurveTo(16, -18, 16, -6);
    ctx.lineTo(4, -8);
    ctx.quadraticCurveTo(-8, -4, -10, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawDriverEye(ctx, 8.2, -2, crashed);
    // Red lips smile
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.ellipse(9.5, 6.5, 3.8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Prof. Albert Einstein: Wild electrified white hair + bushy white mustache
    ctx.fillStyle = '#F1F5F9';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.75 + (i / 6) * Math.PI * 1.25;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 14, -4 + Math.sin(a) * 13, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    drawDriverEye(ctx, 8.2, -2.2, crashed);
    // Bushy white mustache
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.ellipse(9.5, 5.5, 6.8, 3.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Spinning stars when crashed
  if (crashed) {
    for (let i = 0; i < 3; i++) {
      const a = timeSec * 5 + (i * Math.PI * 2) / 3;
      const sx = Math.cos(a) * 20;
      const sy = -22 + Math.sin(a) * 6;
      drawStar(ctx, sx, sy, 5, 5, 2.4, '#FACC15');
    }
  }

  ctx.restore();
}

function drawAviators(ctx: CanvasRenderingContext2D, rimColor: string) {
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, 2, -5.5, 12.5, 7, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(4.5, -4);
  ctx.lineTo(7.5, -0.5);
  ctx.stroke();
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(2, -2.5);
  ctx.stroke();
}

function drawWrapShades(ctx: CanvasRenderingContext2D, rimColor: string) {
  ctx.fillStyle = '#09090B';
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(1, -5.5);
  ctx.lineTo(15, -4.5);
  ctx.lineTo(13.5, 1.5);
  ctx.lineTo(2, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(4, -3.5);
  ctx.lineTo(12, -2.8);
  ctx.stroke();
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(1.5, -2.5);
  ctx.stroke();
}

function drawSmile(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0.15, Math.PI * 0.78);
  ctx.stroke();
}

function drawDriverEye(ctx: CanvasRenderingContext2D, x: number, y: number, crashed: boolean) {
  if (crashed) {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y - 2.5);
    ctx.lineTo(x + 2.5, y + 2.5);
    ctx.moveTo(x + 2.5, y - 2.5);
    ctx.lineTo(x - 2.5, y + 2.5);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(x, y, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x + 0.7, y - 0.7, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number,
  color: string
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draws any of the 14 vehicles with custom paint color, suspension struts, wheels,
 * optional Roll Cage arch, jet afterburner, and customizable VIP driver!
 */
export function drawVehicleWithDriver(
  ctx: CanvasRenderingContext2D,
  vehicle: VehicleConfig,
  driverId: DriverId,
  params: {
    x: number;
    y: number;
    angle: number;
    rearWheelLen: number;
    frontWheelLen: number;
    rearSpin: number;
    frontSpin: number;
    headAngle: number;
    jetHeat: number;
    timeSec: number;
    crashed: boolean;
    vehicleColorId?: string;
    driverOutfitId?: string;
    rollcageShields?: number;
  }
): void {
  const {
    x,
    y,
    angle,
    rearWheelLen,
    frontWheelLen,
    rearSpin,
    frontSpin,
    headAngle,
    jetHeat,
    timeSec,
    crashed,
    vehicleColorId = 'default',
    driverOutfitId = 'default',
    rollcageShields = 0,
  } = params;

  const paint = resolveVehicleColors(vehicle, vehicleColorId);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Suspension struts & shock coils behind body
  drawSuspensionStrut(ctx, vehicle.rearWheelOffsetX, vehicle.wheelAnchorY, rearWheelLen, vehicle.id);
  drawSuspensionStrut(ctx, vehicle.frontWheelOffsetX, vehicle.wheelAnchorY, frontWheelLen, vehicle.id);

  // 2. Jet afterburner cone if fighter jet or rocket sled
  if (vehicle.hasJetThruster && jetHeat > 0.05) {
    const flicker = 0.85 + Math.sin(timeSec * 55) * 0.18;
    const isTwin = vehicle.id === 'rocket_sled';
    const flameLen = (52 + jetHeat * (isTwin ? 85 : 68)) * flicker;
    const offsets = isTwin ? [-8, 10] : [2];

    for (const oy of offsets) {
      ctx.save();
      ctx.translate(-vehicle.chassisHalfW - 4, oy);
      const grad = ctx.createLinearGradient(0, 0, -flameLen, 0);
      grad.addColorStop(0, 'rgba(251, 146, 60, 0.95)');
      grad.addColorStop(0.55, 'rgba(239, 68, 68, 0.78)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(-flameLen, 0);
      ctx.lineTo(0, 9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(-flameLen * 0.58, 0);
      ctx.lineTo(0, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 3. Draw Driver seated inside cabin
  ctx.save();
  ctx.translate(vehicle.driverSeatX, vehicle.driverSeatY);
  drawVIPDriver(ctx, driverId, headAngle, timeSec, crashed, driverOutfitId);
  ctx.restore();

  // 4. Vehicle Body Silhouette (all 14 distinct designs tinted by custom paint!)
  drawVehicleSilhouette(ctx, vehicle.id, paint.primary, paint.secondary);

  // 5. Optional visible Roll Cage protective arch when upgraded
  if (rollcageShields > 0) {
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(vehicle.driverSeatX + 2, vehicle.driverSeatY - 12, 30, Math.PI * 1.12, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  }

  // 6. Wheels
  drawWheel(
    ctx,
    vehicle.rearWheelOffsetX,
    vehicle.wheelAnchorY + rearWheelLen,
    vehicle.wheelRadius,
    rearSpin,
    vehicle.id
  );
  drawWheel(
    ctx,
    vehicle.frontWheelOffsetX,
    vehicle.wheelAnchorY + frontWheelLen,
    vehicle.wheelRadius,
    frontSpin,
    vehicle.id
  );

  // Extra middle tread rollers for Tank
  if (vehicle.id === 'tank') {
    const midY = vehicle.wheelAnchorY + (rearWheelLen + frontWheelLen) * 0.5 + 3;
    drawWheel(ctx, -18, midY, 19, rearSpin, 'tank');
    drawWheel(ctx, 20, midY, 19, frontSpin, 'tank');
    // Armored track belt silhouette
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 5;
    roundRectPath(
      ctx,
      vehicle.rearWheelOffsetX - vehicle.wheelRadius,
      midY - 21,
      vehicle.wheelBase + vehicle.wheelRadius * 2,
      44,
      20
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawVehicleSilhouette(
  ctx: CanvasRenderingContext2D,
  id: VehicleConfig['id'],
  primary: string,
  secondary: string
) {
  switch (id) {
    case 'sedan':
      drawLuxurySedanBody(ctx, primary, secondary);
      break;
    case 'suv':
      drawHeavySuvBody(ctx, primary, secondary);
      break;
    case 'coupe':
      drawSportsCoupeBody(ctx, primary, secondary);
      break;
    case 'jet':
      drawFighterJetBody(ctx, primary, secondary);
      break;
    case 'tuk_tuk':
      drawTukTukBody(ctx, primary, secondary);
      break;
    case 'vintage_jeep':
      drawJeepBody(ctx, primary, secondary);
      break;
    case 'cyber_truck':
      drawCyberTruckBody(ctx, primary, secondary);
      break;
    case 'dune_buggy':
      drawDuneBuggyBody(ctx, primary, secondary);
      break;
    case 'monster_truck':
      drawMonsterTruckBody(ctx, primary, secondary);
      break;
    case 'rally_hatch':
      drawRallyHatchBody(ctx, primary, secondary);
      break;
    case 'gold_limo':
      drawGoldLimoBody(ctx, primary, secondary);
      break;
    case 'formula_car':
      drawFormulaCarBody(ctx, primary, secondary);
      break;
    case 'tank':
      drawTankBody(ctx, primary, secondary);
      break;
    case 'rocket_sled':
      drawRocketSledBody(ctx, primary, secondary);
      break;
  }
}

function drawSuspensionStrut(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  len: number,
  vehicleId: VehicleConfig['id']
) {
  ctx.save();
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = vehicleId === 'monster_truck' ? 5.5 : 4;
  ctx.beginPath();
  ctx.moveTo(ax, ay - 4);
  ctx.lineTo(ax, ay + len);
  ctx.stroke();

  ctx.strokeStyle =
    vehicleId === 'coupe' || vehicleId === 'formula_car'
      ? '#EF4444'
      : vehicleId === 'suv' || vehicleId === 'monster_truck'
        ? '#F59E0B'
        : '#38BDF8';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  const coils = vehicleId === 'monster_truck' || vehicleId === 'dune_buggy' ? 5 : 4;
  const startY = ay;
  const stepY = (len - 4) / coils;
  ctx.moveTo(ax, startY);
  for (let i = 0; i < coils; i++) {
    const dir = i % 2 === 0 ? 6.5 : -6.5;
    ctx.lineTo(ax + dir, startY + (i + 0.5) * stepY);
  }
  ctx.lineTo(ax, ay + len - 2);
  ctx.stroke();
  ctx.restore();
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  r: number,
  spin: number,
  vehicleId: VehicleConfig['id']
) {
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(spin);

  ctx.fillStyle = '#18181B';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  if (
    vehicleId === 'suv' ||
    vehicleId === 'monster_truck' ||
    vehicleId === 'vintage_jeep' ||
    vehicleId === 'dune_buggy'
  ) {
    const lugs = vehicleId === 'monster_truck' ? 16 : 12;
    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = vehicleId === 'monster_truck' ? 5 : 3.5;
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
      ctx.lineTo(Math.cos(a) * (r + 2.2), Math.sin(a) * (r + 2.2));
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#3F3F46';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  const rimR = r * (vehicleId === 'coupe' || vehicleId === 'formula_car' ? 0.68 : 0.58);
  ctx.fillStyle = vehicleId === 'gold_limo' ? '#F59E0B' : vehicleId === 'coupe' ? '#27272A' : '#E2E8F0';
  ctx.beginPath();
  ctx.arc(0, 0, rimR, 0, Math.PI * 2);
  ctx.fill();

  const spokes = vehicleId === 'coupe' || vehicleId === 'rally_hatch' ? 6 : 5;
  ctx.strokeStyle = vehicleId === 'coupe' ? '#F59E0B' : '#475569';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (rimR - 1.5), Math.sin(a) * (rimR - 1.5));
    ctx.stroke();
  }

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(0, 0, rimR * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLuxurySedanBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-76, 16);
  ctx.lineTo(-78, 0);
  ctx.quadraticCurveTo(-74, -12, -52, -13);
  ctx.lineTo(-34, -14);
  ctx.lineTo(-22, -20);
  ctx.lineTo(18, -20);
  ctx.lineTo(34, -12);
  ctx.lineTo(66, -8);
  ctx.quadraticCurveTo(79, -5, 80, 10);
  ctx.lineTo(75, 18);
  ctx.lineTo(-76, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = secondary;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(28, -12);
  ctx.lineTo(14, -36);
  ctx.stroke();

  ctx.fillStyle = '#0284C7';
  ctx.fillRect(-30, 2, 56, 3.5);
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(-30, 5.5, 56, 2.5);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-30, 8, 56, 2.5);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(74, -1, 6, 11);
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.ellipse(73, -3, 5.5, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-77, -5, 6, 6);

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-52, 18, 22, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(54, 18, 22, Math.PI, 0);
  ctx.fill();
}

function drawTukTukBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Classic yellow-and-green Indian auto-rickshaw canopy & cabin
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-58, 18);
  ctx.lineTo(-58, -16);
  ctx.lineTo(-10, -16);
  ctx.lineTo(24, -14);
  ctx.quadraticCurveTo(56, -12, 58, 10);
  ctx.lineTo(54, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower trim band
  ctx.fillStyle = secondary;
  ctx.fillRect(-57, 2, 113, 14);

  // Soft-top arched canopy roof & pillars
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-54, -16);
  ctx.lineTo(-50, -56);
  ctx.lineTo(34, -56);
  ctx.lineTo(44, -12);
  ctx.stroke();
  ctx.fillStyle = '#18181B';
  roundRectPath(ctx, -53, -61, 90, 9, 4);
  ctx.fill();

  // Classic round cyclops front headlight
  ctx.fillStyle = '#FEF08A';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(56, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawJeepBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-72, 18);
  ctx.lineTo(-72, -16);
  ctx.lineTo(-26, -16);
  ctx.lineTo(-22, -8);
  ctx.lineTo(20, -8);
  ctx.lineTo(24, -16);
  ctx.lineTo(70, -16);
  ctx.lineTo(74, -4);
  ctx.lineTo(74, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Open rollbar + fold-up flat windshield
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-64, -16);
  ctx.lineTo(-42, -52);
  ctx.lineTo(-10, -52);
  ctx.lineTo(6, -12);
  ctx.stroke();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(28, -16);
  ctx.lineTo(20, -44);
  ctx.stroke();

  // Rear mounted jerrycan & star decal
  ctx.fillStyle = '#DC2626';
  roundRectPath(ctx, -82, -14, 10, 20, 2);
  ctx.fill();
  drawStar(ctx, 44, 0, 5, 8, 3.5, '#FEF08A');

  // Round headlamp
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(73, -8, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeavySuvBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#52525B';
  ctx.lineWidth = 2;
  roundRectPath(ctx, -91, -24, 14, 34, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-78, 22);
  ctx.lineTo(-78, -28);
  ctx.lineTo(-32, -28);
  ctx.lineTo(-28, -20);
  ctx.lineTo(24, -20);
  ctx.lineTo(30, -24);
  ctx.lineTo(74, -22);
  ctx.lineTo(80, -14);
  ctx.lineTo(82, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = secondary;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-75, -28);
  ctx.lineTo(-75, -54);
  ctx.lineTo(24, -54);
  ctx.lineTo(34, -23);
  ctx.stroke();

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-76, -58);
  ctx.lineTo(20, -58);
  ctx.stroke();

  ctx.fillStyle = '#18181B';
  ctx.fillRect(-76, -4, 154, 6);

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(81, 18);
  ctx.lineTo(88, 18);
  ctx.lineTo(86, -12);
  ctx.lineTo(78, -12);
  ctx.stroke();

  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(78, -11, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.arc(-55, 22, 26, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(57, 22, 26, Math.PI, 0);
  ctx.fill();
}

function drawCyberTruckBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Iconic sharp triangular wedge pickup
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-84, 16);
  ctx.lineTo(-86, -14);
  ctx.lineTo(-34, -22);
  ctx.lineTo(28, -22);
  ctx.lineTo(86, -4);
  ctx.lineTo(88, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sharp angular roof frame
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-84, -14);
  ctx.lineTo(4, -52);
  ctx.lineTo(54, -14);
  ctx.stroke();

  // Signature full-width glowing lightbar
  ctx.fillStyle = '#E0F2FE';
  ctx.fillRect(78, -4, 10, 4);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-86, -13, 8, 4);

  // Trapezoidal wheel wells
  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.moveTo(-80, 18);
  ctx.lineTo(-70, -2);
  ctx.lineTo(-44, -2);
  ctx.lineTo(-34, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(38, 18);
  ctx.lineTo(48, -2);
  ctx.lineTo(74, -2);
  ctx.lineTo(84, 18);
  ctx.closePath();
  ctx.fill();
}

function drawDuneBuggyBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Exposed tubular desert sand rail cage
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-68, 14);
  ctx.lineTo(-56, -8);
  ctx.lineTo(40, -8);
  ctx.lineTo(72, 4);
  ctx.lineTo(66, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Roll cage tubing
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-58, -8);
  ctx.lineTo(-28, -44);
  ctx.lineTo(14, -44);
  ctx.lineTo(44, -6);
  ctx.moveTo(-28, -44);
  ctx.lineTo(-20, -6);
  ctx.stroke();

  // Roof desert light pods
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(16, -46, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSportsCoupeBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Rear GT spoiler wing
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(-72, -12);
  ctx.lineTo(-86, -28);
  ctx.lineTo(-68, -28);
  ctx.lineTo(-60, -12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-88, -30, 22, 3.5);

  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-78, 14);
  ctx.lineTo(-82, -2);
  ctx.quadraticCurveTo(-68, -16, -34, -17);
  ctx.lineTo(14, -17);
  ctx.quadraticCurveTo(44, -11, 80, 0);
  ctx.quadraticCurveTo(86, 6, 82, 15);
  ctx.lineTo(-78, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Signature carbon sideblade
  ctx.fillStyle = '#18181B';
  ctx.beginPath();
  ctx.moveTo(-36, -15);
  ctx.lineTo(-18, -15);
  ctx.lineTo(-26, 13);
  ctx.lineTo(-42, 13);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(32, -11);
  ctx.lineTo(8, -30);
  ctx.stroke();

  ctx.fillStyle = '#E0F2FE';
  ctx.beginPath();
  ctx.moveTo(68, -1);
  ctx.lineTo(81, 3);
  ctx.lineTo(76, 7);
  ctx.lineTo(65, 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.arc(-55, 16, 20.5, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(57, 16, 20.5, Math.PI, 0);
  ctx.fill();
}

function drawMonsterTruckBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // High-lifted pickup truck body perched over massive suspension
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-82, 16);
  ctx.lineTo(-84, -16);
  ctx.lineTo(-32, -16);
  ctx.lineTo(-26, -24);
  ctx.lineTo(22, -24);
  ctx.lineTo(30, -16);
  ctx.lineTo(80, -14);
  ctx.lineTo(84, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Heavy rollbar & twin exhaust stacks behind cab
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-34, -16);
  ctx.lineTo(-36, -54);
  ctx.lineTo(-44, -56);
  ctx.stroke();

  // Lightning bolt racing decal
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.moveTo(-64, -4);
  ctx.lineTo(24, -8);
  ctx.lineTo(14, 2);
  ctx.lineTo(64, -2);
  ctx.lineTo(10, 8);
  ctx.lineTo(18, 0);
  ctx.closePath();
  ctx.fill();

  // Chrome bumper
  ctx.fillStyle = secondary;
  ctx.fillRect(78, 4, 10, 11);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(77, -10, 7, 9);
}

function drawRallyHatchBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Aggressive WRC rally spoiler
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(-72, -22);
  ctx.lineTo(-86, -42);
  ctx.lineTo(-64, -42);
  ctx.lineTo(-56, -22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-72, 16);
  ctx.lineTo(-74, -22);
  ctx.lineTo(-34, -22);
  ctx.lineTo(28, -14);
  ctx.lineTo(72, -8);
  ctx.quadraticCurveTo(78, 4, 74, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Roof frame & intake scoop
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-66, -22);
  ctx.lineTo(-46, -46);
  ctx.lineTo(12, -46);
  ctx.lineTo(32, -14);
  ctx.stroke();

  // Bold WRC racing stripe & rally light pod
  ctx.fillStyle = secondary;
  ctx.fillRect(-66, 0, 128, 7);
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(74, -2, 5, 0, Math.PI * 2);
  ctx.arc(71, 6, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoldLimoBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Extra-long executive stretch limousine
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.moveTo(-102, 16);
  ctx.lineTo(-104, -10);
  ctx.lineTo(-82, -14);
  ctx.lineTo(-64, -22);
  ctx.lineTo(44, -22);
  ctx.lineTo(58, -12);
  ctx.lineTo(96, -10);
  ctx.quadraticCurveTo(106, -4, 104, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Luxury gold trim pinstripe & tinted VIP rear windows
  ctx.fillStyle = secondary;
  ctx.fillRect(-100, 0, 200, 4);
  ctx.fillStyle = '#020617';
  roundRectPath(ctx, -64, -19, 54, 14, 3);
  ctx.fill();

  // Presidential hood flag!
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(84, -10);
  ctx.lineTo(84, -34);
  ctx.stroke();
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(68, -34, 16, 10);

  // Headlight
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(96, -5, 8, 7);
}

function drawFormulaCarBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // High rear downforce wing
  ctx.fillStyle = secondary;
  ctx.fillRect(-86, -34, 16, 26);
  ctx.fillStyle = primary;
  ctx.fillRect(-90, -36, 24, 6);

  // Sleek low-slung open-wheel nosecone
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-76, 12);
  ctx.lineTo(-76, -10);
  ctx.lineTo(-26, -18);
  ctx.lineTo(14, -12);
  ctx.lineTo(90, 4);
  ctx.lineTo(88, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front aero wing & airbox roll hoop
  ctx.fillStyle = secondary;
  ctx.fillRect(74, 6, 20, 6);
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-24, -14);
  ctx.lineTo(-16, -36);
  ctx.lineTo(-4, -36);
  ctx.lineTo(0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFighterJetBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  ctx.fillStyle = secondary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-84, -8);
  ctx.lineTo(-96, -54);
  ctx.lineTo(-76, -54);
  ctx.lineTo(-50, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-88, -44, 16, 5);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-86, -39, 16, 4);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(-84, -35, 16, 4);

  ctx.fillStyle = primary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-94, -8);
  ctx.lineTo(-54, -14);
  ctx.lineTo(36, -15);
  ctx.quadraticCurveTo(78, -10, 108, 4);
  ctx.quadraticCurveTo(74, 18, 28, 17);
  ctx.lineTo(-84, 16);
  ctx.lineTo(-94, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(86, -2);
  ctx.lineTo(108, 4);
  ctx.lineTo(86, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#334155';
  roundRectPath(ctx, -100, -10, 12, 22, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(-42, 4);
  ctx.lineTo(24, 6);
  ctx.lineTo(-10, 19);
  ctx.lineTo(-52, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
  ctx.beginPath();
  ctx.moveTo(-22, -14);
  ctx.quadraticCurveTo(10, -56, 46, -13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawTankBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Long armored cannon barrel pointing forward
  ctx.fillStyle = secondary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.fillRect(24, -36, 76, 9);
  ctx.strokeRect(24, -36, 76, 9);
  ctx.fillRect(94, -38, 12, 13);

  // Armored turret base
  ctx.fillStyle = primary;
  roundRectPath(ctx, -40, -40, 68, 22, 8);
  ctx.fill();
  ctx.stroke();

  // Heavy sloped tank hull
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-88, 16);
  ctx.lineTo(-82, -18);
  ctx.lineTo(74, -18);
  ctx.lineTo(90, 4);
  ctx.lineTo(82, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Armor skirt & VIP star emblem
  ctx.fillStyle = secondary;
  ctx.fillRect(-80, 2, 160, 12);
  drawStar(ctx, -20, -28, 5, 7, 3, '#FACC15');
}

function drawRocketSledBody(ctx: CanvasRenderingContext2D, primary: string, secondary: string) {
  // Twin vertical tail stabilizers
  ctx.fillStyle = secondary;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-90, -10);
  ctx.lineTo(-104, -46);
  ctx.lineTo(-80, -46);
  ctx.lineTo(-56, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sleek white orbital fuselage
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(-98, -12);
  ctx.lineTo(44, -14);
  ctx.quadraticCurveTo(88, -8, 114, 4);
  ctx.quadraticCurveTo(82, 18, 36, 17);
  ctx.lineTo(-98, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Racing orbital stripe & twin rear rocket bells
  ctx.fillStyle = secondary;
  ctx.fillRect(-94, -2, 172, 6);
  ctx.fillStyle = '#334155';
  roundRectPath(ctx, -106, -14, 12, 12, 2);
  ctx.fill();
  ctx.stroke();
  roundRectPath(ctx, -106, 4, 12, 12, 2);
  ctx.fill();
  ctx.stroke();

  // Tinted space visor canopy
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.beginPath();
  ctx.moveTo(-22, -13);
  ctx.quadraticCurveTo(10, -54, 48, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/**
 * Full gameplay scene renderer.
 */
export function renderGameScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sim: GameSimulation,
  cameraX: number,
  cameraY: number,
  timeSec: number,
  zoom: number
): void {
  const s: VehiclePhysicsState = sim.state;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#0284C7');
  skyGrad.addColorStop(0.45, '#38BDF8');
  skyGrad.addColorStop(0.82, '#BAE6FD');
  skyGrad.addColorStop(1, '#FEF3C7');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  const sunX = width * 0.82;
  const sunY = height * 0.17;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 110);
  sunGlow.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
  sunGlow.addColorStop(0.35, 'rgba(253, 224, 71, 0.45)');
  sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
  ctx.fill();

  drawParallaxClouds(ctx, width, height, cameraX, timeSec);
  drawMountainLayer(ctx, width, height, cameraX * 0.12, height * 0.62, 110, '#64748B', '#94A3B8', 0.55);
  drawMountainLayer(ctx, width, height, cameraX * 0.28, height * 0.72, 85, '#334155', '#475569', 0.72);

  ctx.save();
  ctx.translate(width * 0.34, height * 0.58);
  ctx.scale(zoom, zoom);
  ctx.translate(-cameraX, -cameraY);

  const viewLeft = cameraX - (width * 0.42) / zoom - 120;
  const viewRight = cameraX + (width * 0.74) / zoom + 160;
  const viewBottom = cameraY + (height * 0.58) / zoom + 220;

  const props = sim.terrain.getPropsInRange(viewLeft, viewRight);
  for (let i = 0; i < props.length; i++) {
    drawTerrainProp(ctx, props[i], sim.terrain.getHeight(props[i].x));
  }

  drawMilestones(ctx, sim, viewLeft, viewRight);
  drawTerrainMesh(ctx, sim, viewLeft, viewRight, viewBottom);

  const collectibles = sim.terrain.getCollectiblesInRange(viewLeft, viewRight);
  for (let i = 0; i < collectibles.length; i++) {
    const item = collectibles[i];
    if (!item.collected) {
      drawCollectible(ctx, item, timeSec);
    }
  }

  drawVehicleWithDriver(ctx, sim.vehicle, sim.driver.id, {
    x: s.x,
    y: s.y,
    angle: s.angle,
    rearWheelLen: s.rearWheel.length,
    frontWheelLen: s.frontWheel.length,
    rearSpin: s.rearWheel.spin,
    frontSpin: s.frontWheel.spin,
    headAngle: s.headAngle,
    jetHeat: s.jetHeat,
    timeSec,
    crashed: s.crashed && s.crashReason === 'driver_down',
    vehicleColorId: sim.vehicleColorId,
    driverOutfitId: sim.driverOutfitId,
    rollcageShields: s.rollcageShields,
  });

  drawParticles(ctx, sim.particles);

  for (let i = 0; i < sim.popups.length; i++) {
    const pop = sim.popups[i];
    if (!pop.worldSpace) continue;
    const progress = pop.life / pop.maxLife;
    const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = '800 20px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }

  ctx.restore();

  for (let i = 0; i < sim.popups.length; i++) {
    const pop = sim.popups[i];
    if (pop.worldSpace) continue;
    const progress = pop.life / pop.maxLife;
    const scale = progress < 0.14 ? 0.65 + (progress / 0.14) * 0.45 : 1.05 - progress * 0.08;
    const alpha = progress < 0.68 ? 1 : 1 - (progress - 0.68) / 0.32;
    const px = width * pop.x;
    const py = height * pop.y - progress * 34;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    if (pop.subtext) {
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(pop.subtext, 0, -24);
      ctx.fillText(pop.subtext, 0, -24);
    }
    ctx.font = '800 32px "Bricolage Grotesque", sans-serif';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText(pop.text, 0, 0);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, 0, 0);
    ctx.restore();
  }
}

function drawParallaxClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  timeSec: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  const span = width + 360;
  for (let i = 0; i < 6; i++) {
    const rawX = i * 310 - cameraX * 0.06 - timeSec * 7;
    const cx = (((rawX % span) + span) % span) - 180;
    const cy = 54 + (i % 3) * 48 + Math.sin(i * 1.7) * 14;
    const sc = 0.75 + (i % 3) * 0.22;

    ctx.beginPath();
    ctx.arc(cx, cy, 24 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 24 * sc, cy - 8 * sc, 28 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 52 * sc, cy, 22 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMountainLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  baseY: number,
  amp: number,
  color: string,
  snowColor: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  const step = 42;
  for (let sx = 0; sx <= width + step; sx += step) {
    const wx = sx + offsetX;
    const h =
      Math.sin(wx * 0.0022) * amp * 0.65 +
      Math.cos(wx * 0.0051) * amp * 0.35 +
      Math.sin(wx * 0.009) * amp * 0.14;
    ctx.lineTo(sx, baseY - Math.abs(h));
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = snowColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawTerrainProp(ctx: CanvasRenderingContext2D, prop: TerrainProp, groundY: number) {
  ctx.save();
  ctx.translate(prop.x, groundY);
  ctx.scale(prop.scale, prop.scale);

  if (prop.type === 'pine') {
    ctx.fillStyle = '#5C3A21';
    ctx.fillRect(-5, -24, 10, 26);
    ctx.fillStyle = '#15803D';
    for (let l = 0; l < 3; l++) {
      const y = -20 - l * 18;
      const w = 26 - l * 5;
      ctx.beginPath();
      ctx.moveTo(-w, y);
      ctx.lineTo(0, y - 28);
      ctx.lineTo(w, y);
      ctx.closePath();
      ctx.fill();
    }
  } else if (prop.type === 'tree') {
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(-4.5, -34, 9, 36);
    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.arc(0, -44, 21, 0, Math.PI * 2);
    ctx.arc(-14, -36, 15, 0, Math.PI * 2);
    ctx.arc(14, -36, 15, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.type === 'rock') {
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.lineTo(-12, -14);
    ctx.lineTo(4, -18);
    ctx.lineTo(18, -6);
    ctx.lineTo(20, 2);
    ctx.closePath();
    ctx.fill();
  } else if (prop.type === 'lamp') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, -56);
    ctx.lineTo(14, -56);
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(14, -53, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMilestones(
  ctx: CanvasRenderingContext2D,
  sim: GameSimulation,
  viewLeft: number,
  viewRight: number
) {
  if (viewLeft < 140 && viewRight > -20) {
    const gy = sim.terrain.getHeight(60);
    ctx.save();
    ctx.translate(60, gy);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-4, -92, 6, 94);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(2 + c * 7, -92 + r * 7, 7, 7);
      }
    }
    ctx.restore();
  }

  const firstMeter = Math.max(100, Math.floor(((viewLeft - 60) / PIXELS_PER_METER) / 100) * 100);
  const lastMeter = Math.ceil(((viewRight - 60) / PIXELS_PER_METER) / 100) * 100;
  for (let m = firstMeter; m <= lastMeter; m += 100) {
    const mx = 60 + m * PIXELS_PER_METER;
    const gy = sim.terrain.getHeight(mx);
    ctx.save();
    ctx.translate(mx, gy);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2.5, -52, 5, 54);
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    roundRectPath(ctx, -28, -68, 56, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${m}m`, 0, -57);
    ctx.restore();
  }
}

function drawTerrainMesh(
  ctx: CanvasRenderingContext2D,
  sim: GameSimulation,
  viewLeft: number,
  viewRight: number,
  viewBottom: number
) {
  const step = 12;
  const startX = Math.floor(viewLeft / step) * step;
  const endX = Math.ceil(viewRight / step) * step;

  const pts: { x: number; y: number }[] = [];
  for (let x = startX; x <= endX; x += step) {
    pts.push({ x, y: sim.terrain.getHeight(x) });
  }
  if (pts.length < 2) return;

  const earthGrad = ctx.createLinearGradient(0, pts[0].y - 120, 0, viewBottom);
  earthGrad.addColorStop(0, '#713F12');
  earthGrad.addColorStop(0.35, '#583113');
  earthGrad.addColorStop(1, '#2D190C');

  ctx.fillStyle = earthGrad;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, viewBottom);
  for (let i = 0; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.lineTo(pts[pts.length - 1].x, viewBottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(254, 215, 170, 0.08)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y + 42);
    else ctx.lineTo(pts[i].x, pts[i].y + 42);
  }
  ctx.stroke();

  ctx.strokeStyle = '#3F230E';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y + 9);
    else ctx.lineTo(pts[i].x, pts[i].y + 9);
  }
  ctx.stroke();

  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = 11;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y + 2);
    else ctx.lineTo(pts[i].x, pts[i].y + 2);
  }
  ctx.stroke();

  ctx.strokeStyle = '#4ADE80';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y - 2);
    else ctx.lineTo(pts[i].x, pts[i].y - 2);
  }
  ctx.stroke();
}

function drawCollectible(ctx: CanvasRenderingContext2D, item: Collectible, timeSec: number) {
  const bob = Math.sin(timeSec * 4.5 + item.bobPhase) * 4.5;
  ctx.save();
  ctx.translate(item.x, item.y + bob);

  if (item.type === 'coin') {
    const r = item.value >= 500 ? 18 : item.value >= 100 ? 16 : 14;
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#78350F';
    ctx.font = `800 ${item.value >= 100 ? 10 : 12}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(item.value), 0, 1);
  } else {
    ctx.shadowColor = 'rgba(239, 68, 68, 0.55)';
    ctx.shadowBlur = 12;

    ctx.fillStyle = '#FACC15';
    ctx.fillRect(4, -22, 6, 7);
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 3;
    ctx.strokeRect(-9, -20, 13, 6);

    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 2;
    roundRectPath(ctx, -14, -15, 28, 32, 5);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FUEL', 0, 1);
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    if (p.kind === 'star') {
      drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.45, p.color);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.kind === 'flame' ? 0.5 + p.alpha * 0.6 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
