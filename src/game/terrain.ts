import { PIXELS_PER_METER } from './catalog';
import { Collectible } from './types';

export interface TerrainProp {
  x: number;
  type: 'tree' | 'pine' | 'rock' | 'flag' | 'lamp';
  scale: number;
  variant: number;
}

/**
 * Procedural bumpy hill terrain with escalating difficulty.
 * Coordinate system: +X is right, +Y is DOWN (standard HTML5 Canvas).
 * Flat starting pad around x <= 260, then progressively steeper hills,
 * launch ramps, valleys, and big alpine ridges.
 */
export class ProceduralTerrain {
  private seed: number;
  private collectibles: Map<number, Collectible[]> = new Map();
  private props: Map<number, TerrainProp[]> = new Map();
  private nextCollectibleId = 1;
  private readonly chunkWidth = 900; // 50 meters per chunk
  private lastFuelX = 320;
  private generatedUpToChunk = -1;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 100000);
  }

  private hash(n: number): number {
    const x = Math.sin(n * 127.1 + this.seed * 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  /**
   * Returns ground Y coordinate (canvas Y, larger = lower on screen) at world X.
   */
  public getHeight(x: number): number {
    const baseLine = 420;
    if (x < -120) {
      // Steep wall behind start so player cannot reverse infinitely
      const behind = -120 - x;
      return baseLine - behind * 1.15;
    }
    if (x <= 180) {
      return baseLine;
    }

    const dx = x - 180;
    const distMeters = dx / PIXELS_PER_METER;
    // Shorter smooth intro ramp (~19m) so hills engage sooner
    const intro = Math.min(1, dx / 340);
    const smoothIntro = intro * intro * (3 - 2 * intro);

    // Faster progressive amplitude & steepness scaling for a more challenging climb
    const difficulty = 1.15 + Math.min(2.65, distMeters / 255);
    const steepness = 1.12 + Math.min(1.85, distMeters / 340);

    const s = (this.seed % 97) * 0.37;

    // Layered steeper mountain waves
    const macroHill =
      Math.sin(dx * 0.00235 + s) * 98 * difficulty +
      Math.cos(dx * 0.00128 + s * 0.6) * 82 * difficulty;

    const midBumps =
      Math.sin(dx * 0.0062 + s * 1.3) * 41 * steepness +
      Math.sin(dx * 0.0108 + s * 2.1) * 23 * steepness;

    // Sharper launch ramps & technical double-crest ridges
    const rampWave = Math.sin(dx * 0.0042 + s * 0.8);
    const rampKick = rampWave > 0.28 ? Math.pow(rampWave - 0.28, 2) * 145 * difficulty : 0;

    // Rocky washboard chatter that challenges un-upgraded suspension
    const microChatter =
      Math.sin(dx * 0.026 + s * 3.1) * 6.2 * Math.min(1.85, steepness) +
      Math.cos(dx * 0.041 + s * 1.9) * 3.1 * Math.min(1.6, steepness);

    // Deep dramatic valleys & towering climbs
    const valley = Math.sin(dx * 0.00085 + s * 0.4) * 115 * Math.min(1.85, difficulty);

    const h = macroHill + midBumps - rampKick + microChatter + valley;
    return baseLine + h * smoothIntro;
  }

  /**
   * Returns unit normal pointing UP out of the ground (nx, ny where ny < 0).
   */
  public getNormal(x: number): { nx: number; ny: number; slope: number } {
    const eps = 3;
    const hL = this.getHeight(x - eps);
    const hR = this.getHeight(x + eps);
    const slope = (hR - hL) / (2 * eps); // dy/dx
    // Tangent vector is (1, slope); upward normal is (slope, -1) normalized
    const len = Math.hypot(slope, 1);
    return {
      nx: slope / len,
      ny: -1 / len,
      slope,
    };
  }

  /**
   * Ensures collectibles and roadside props are generated ahead of worldX.
   */
  public ensureGenerated(worldX: number): void {
    const targetChunk = Math.floor((worldX + 2200) / this.chunkWidth);
    while (this.generatedUpToChunk < targetChunk) {
      this.generatedUpToChunk++;
      this.generateChunk(this.generatedUpToChunk);
    }
  }

  private generateChunk(chunkIdx: number): void {
    const startX = chunkIdx * this.chunkWidth;
    const items: Collectible[] = [];
    const chunkProps: TerrainProp[] = [];

    if (chunkIdx < 0) {
      this.collectibles.set(chunkIdx, items);
      this.props.set(chunkIdx, chunkProps);
      return;
    }

    // Generate roadside decorative props (trees, pines, rocks)
    const propCount = 5 + Math.floor(this.hash(chunkIdx * 13 + 1) * 4);
    for (let i = 0; i < propCount; i++) {
      const px = startX + 70 + this.hash(chunkIdx * 31 + i * 7) * (this.chunkWidth - 140);
      if (px < 160) continue;
      const r = this.hash(chunkIdx * 53 + i * 19);
      const type: TerrainProp['type'] =
        r < 0.45 ? 'pine' : r < 0.78 ? 'tree' : r < 0.93 ? 'rock' : 'lamp';
      chunkProps.push({
        x: px,
        type,
        scale: 0.78 + this.hash(chunkIdx * 71 + i * 11) * 0.52,
        variant: Math.floor(this.hash(chunkIdx * 97 + i * 3) * 3),
      });
    }

    // Place Fuel Cans slightly farther apart as distance climbs (~94m to ~144m)
    const distMeters = Math.max(0, startX / PIXELS_PER_METER);
    const fuelSpacingPx = Math.min(2600, 1680 + distMeters * 1.48);

    let cursorX = Math.max(startX + 120, this.lastFuelX + fuelSpacingPx);
    while (cursorX < startX + this.chunkWidth - 60) {
      const gy = this.getHeight(cursorX);
      items.push({
        id: this.nextCollectibleId++,
        type: 'fuel',
        x: cursorX,
        y: gy - 32,
        value: 100,
        collected: false,
        collectAnim: 0,
        bobPhase: this.hash(cursorX) * Math.PI * 2,
      });
      this.lastFuelX = cursorX;
      cursorX += fuelSpacingPx;
    }

    // Place 2-3 coin arcs per chunk (valued higher as distance increases)
    const groups = 2 + (this.hash(chunkIdx * 17 + 5) > 0.45 ? 1 : 0);
    const groupSpan = this.chunkWidth / groups;

    for (let g = 0; g < groups; g++) {
      const gx = startX + g * groupSpan + 95 + this.hash(chunkIdx * 41 + g * 13) * 110;
      if (gx < 280) continue;
      // Avoid overlapping directly on top of a fuel can
      const nearFuel = items.some((it) => it.type === 'fuel' && Math.abs(it.x - gx) < 95);
      if (nearFuel) continue;

      const count = 4 + Math.floor(this.hash(chunkIdx * 23 + g * 9) * 3); // 4..6 coins
      const isJumpArc = this.hash(chunkIdx * 61 + g * 29) > 0.65;
      const coinSpacing = 48;

      // Coin value tier escalates with distance
      const m = gx / PIXELS_PER_METER;
      let baseVal = 5;
      if (m > 450) baseVal = 500;
      else if (m > 220) baseVal = 100;
      else if (m > 75) baseVal = 25;

      for (let c = 0; c < count; c++) {
        const cx = gx + c * coinSpacing;
        if (items.some((it) => it.type === 'fuel' && Math.abs(it.x - cx) < 55)) continue;
        const gy = this.getHeight(cx);
        const arcLift = isJumpArc ? Math.sin((c / (count - 1)) * Math.PI) * 78 : 0;
        // Last coin in a jump arc is a higher-tier bonus coin
        const coinVal =
          isJumpArc && c === Math.floor(count / 2)
            ? baseVal === 5
              ? 25
              : baseVal === 25
                ? 100
                : 500
            : baseVal;

        items.push({
          id: this.nextCollectibleId++,
          type: 'coin',
          x: cx,
          y: gy - 32 - arcLift,
          value: coinVal,
          collected: false,
          collectAnim: 0,
          bobPhase: c * 0.45,
        });
      }
    }

    this.collectibles.set(chunkIdx, items);
    this.props.set(chunkIdx, chunkProps);
  }

  public getCollectiblesInRange(minX: number, maxX: number): Collectible[] {
    const cMin = Math.floor(minX / this.chunkWidth) - 1;
    const cMax = Math.floor(maxX / this.chunkWidth) + 1;
    const out: Collectible[] = [];
    for (let c = cMin; c <= cMax; c++) {
      const list = this.collectibles.get(c);
      if (list) {
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (item.x >= minX - 60 && item.x <= maxX + 60) {
            out.push(item);
          }
        }
      }
    }
    return out;
  }

  public getPropsInRange(minX: number, maxX: number): TerrainProp[] {
    const cMin = Math.floor(minX / this.chunkWidth) - 1;
    const cMax = Math.floor(maxX / this.chunkWidth) + 1;
    const out: TerrainProp[] = [];
    for (let c = cMin; c <= cMax; c++) {
      const list = this.props.get(c);
      if (list) {
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          if (p.x >= minX - 140 && p.x <= maxX + 140) {
            out.push(p);
          }
        }
      }
    }
    return out;
  }
}
