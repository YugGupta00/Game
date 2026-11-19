import { getEffectiveVehicleStats, PIXELS_PER_METER } from './catalog';
import { ProceduralTerrain } from './terrain';
import {
  DriverConfig,
  FloatingPopup,
  InputState,
  Particle,
  RunMetrics,
  VehicleConfig,
  VehiclePhysicsState,
  VehicleUpgrades,
  WheelState,
} from './types';

export interface PhysicsEvents {
  onCoinPickup: (value: number) => void;
  onFuelPickup: () => void;
  onFlip: (isBackflip: boolean, count: number, bonus: number) => void;
  onAirTime: (seconds: number, bonus: number) => void;
  onLowFuel: () => void;
  onRollcageSave?: () => void;
  onCrash: (reason: 'driver_down' | 'out_of_fuel') => void;
}

// Slightly higher gravity & tighter balance for a more challenging hill climb
const GRAVITY = 935;
const SUBSTEPS = 5;

function createWheel(anchorX: number, anchorY: number, restLen: number, carX: number, carY: number): WheelState {
  return {
    anchorX,
    anchorY,
    length: restLen,
    prevLength: restLen,
    wx: carX + anchorX,
    wy: carY + anchorY + restLen,
    spin: 0,
    omega: 0,
    onGround: false,
    groundNormalX: 0,
    groundNormalY: -1,
    compressionRatio: 0,
  };
}

export function createInitialPhysicsState(
  vehicle: VehicleConfig,
  terrain: ProceduralTerrain,
  upgrades: VehicleUpgrades
): VehiclePhysicsState {
  const startX = 60;
  const groundY = terrain.getHeight(startX);
  const startY = groundY - vehicle.wheelAnchorY - vehicle.suspensionRest - vehicle.wheelRadius + 2;
  const stats = getEffectiveVehicleStats(vehicle, upgrades);

  const rearWheel = createWheel(
    vehicle.rearWheelOffsetX,
    vehicle.wheelAnchorY,
    vehicle.suspensionRest,
    startX,
    startY
  );
  const frontWheel = createWheel(
    vehicle.frontWheelOffsetX,
    vehicle.wheelAnchorY,
    vehicle.suspensionRest,
    startX,
    startY
  );

  return {
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    angle: 0,
    omega: 0,
    rearWheel,
    frontWheel,
    headAngle: 0,
    headOmega: 0,
    headOffsetX: 0,
    headOffsetY: 0,
    headWorldX: startX + vehicle.driverSeatX,
    headWorldY: startY + vehicle.driverSeatY - 24,
    rpm: 0.12,
    speedKmh: 0,
    maxSpeedKmhThisRun: 0,
    jetActive: false,
    jetHeat: 0,
    fuel: 100,
    maxFuel: stats.fuelCapacity,
    rollcageShields: stats.rollcageShields,
    rollcageCooldown: 0,
    airTime: 0,
    totalAirTimeThisRun: 0,
    airTimeAwardedSteps: 0,
    airRotationAccum: 0,
    flipsThisRun: 0,
    backflipsThisRun: 0,
    frontflipsThisRun: 0,
    airBonusCoins: 0,
    flipBonusCoins: 0,
    roadCoins: 0,
    coinsCollectedCount: 0,
    fuelPickupsCount: 0,
    distanceMeters: 0,
    maxDistanceMeters: 0,
    crashed: false,
    crashReason: null,
    outOfFuelTimer: 0,
    crashFreezeTimer: 0,
  };
}

export class GameSimulation {
  public state: VehiclePhysicsState;
  public terrain: ProceduralTerrain;
  public vehicle: VehicleConfig;
  public driver: DriverConfig;
  public upgrades: VehicleUpgrades;
  public vehicleColorId: string;
  public driverOutfitId: string;
  public particles: Particle[] = [];
  public popups: FloatingPopup[] = [];
  private popupId = 1;
  private lowFuelTriggered = false;
  private dustAccum = 0;

  constructor(
    vehicle: VehicleConfig,
    driver: DriverConfig,
    upgrades: VehicleUpgrades,
    vehicleColorId = 'default',
    driverOutfitId = 'default',
    seed?: number
  ) {
    this.vehicle = vehicle;
    this.driver = driver;
    this.upgrades = upgrades;
    this.vehicleColorId = vehicleColorId;
    this.driverOutfitId = driverOutfitId;
    this.terrain = new ProceduralTerrain(seed);
    this.terrain.ensureGenerated(0);
    this.state = createInitialPhysicsState(vehicle, this.terrain, upgrades);
  }

  public spawnPopup(text: string, color: string, worldSpace: boolean, x: number, y: number, subtext?: string): void {
    this.popups.push({
      id: this.popupId++,
      text,
      subtext,
      color,
      x,
      y,
      worldSpace,
      life: 0,
      maxLife: 1.55,
    });
  }

  public getRunMetrics(): RunMetrics {
    const s = this.state;
    return {
      distance: s.maxDistanceMeters,
      backflips: s.backflipsThisRun,
      frontflips: s.frontflipsThisRun,
      flips: s.flipsThisRun,
      totalAirTime: s.totalAirTimeThisRun,
      coinsCollectedCount: s.coinsCollectedCount,
      fuelPickupsCount: s.fuelPickupsCount,
      maxSpeedKmh: s.maxSpeedKmhThisRun,
    };
  }

  public step(dtRaw: number, input: InputState, events: PhysicsEvents): void {
    const dt = Math.min(0.033, Math.max(0.001, dtRaw));
    const s = this.state;
    const v = this.vehicle;
    const stats = getEffectiveVehicleStats(v, this.upgrades);

    // Update particles & floating popups even during crash freeze
    this.updateParticles(dt);
    this.updatePopups(dt);

    if (s.rollcageCooldown > 0) {
      s.rollcageCooldown = Math.max(0, s.rollcageCooldown - dt);
    }

    if (s.crashed) {
      s.crashFreezeTimer += dt;
      s.jetActive = false;
      s.jetHeat = Math.max(0, s.jetHeat - dt * 3);
      return;
    }

    this.terrain.ensureGenerated(s.x);

    const hasFuel = s.fuel > 0;
    const gas = input.gas && hasFuel;
    const brake = input.brake && hasFuel;

    // Fuel consumption (1.12x base burn rate for extra challenge)
    if (hasFuel) {
      let burnRate = v.fuelBurnIdle * 1.12;
      if (gas) {
        burnRate = (v.fuelBurnGas + (v.hasJetThruster ? v.jetFuelBurnExtra : 0)) * 1.12;
      } else if (brake) {
        burnRate = v.fuelBurnIdle * 1.55;
      }
      const fuelPctPerSec = (burnRate / stats.fuelCapacity) * 100;
      s.fuel = Math.max(0, s.fuel - fuelPctPerSec * dt);

      if (s.fuel < 22 && !this.lowFuelTriggered) {
        this.lowFuelTriggered = true;
        events.onLowFuel();
      } else if (s.fuel > 30) {
        this.lowFuelTriggered = false;
      }
    }

    // Out-of-fuel glide timeout
    if (s.fuel <= 0) {
      const speed = Math.hypot(s.vx, s.vy);
      if (speed < 36 || s.outOfFuelTimer > 2.6) {
        s.outOfFuelTimer += dt;
        if (s.outOfFuelTimer > 1.1 || speed < 22) {
          s.crashed = true;
          s.crashReason = 'out_of_fuel';
          events.onCrash('out_of_fuel');
          return;
        }
      } else {
        s.outOfFuelTimer += dt * 0.35;
      }
    } else {
      s.outOfFuelTimer = 0;
    }

    const subDt = dt / SUBSTEPS;

    for (let stepIdx = 0; stepIdx < SUBSTEPS; stepIdx++) {
      this.stepPhysicsSub(subDt, gas, brake, stats, events);
      if (s.crashed) return;
    }

    // Update Jet visual heat & flames
    s.jetActive = Boolean(v.hasJetThruster && gas);
    const targetHeat = s.jetActive ? 1 : 0;
    s.jetHeat += (targetHeat - s.jetHeat) * Math.min(1, dt * 11);

    if (s.jetActive) {
      this.emitJetFlames(dt);
    }

    // Emit dirt/grass kicks from driven wheels when accelerating on ground
    this.emitWheelDust(dt, gas, brake);

    // Distance tracking (meters from starting line x=60)
    const dist = Math.max(0, Math.floor((s.x - 60) / PIXELS_PER_METER));
    s.distanceMeters = dist;
    if (dist > s.maxDistanceMeters) {
      s.maxDistanceMeters = dist;
    }

    // Telemetry: Speed km/h and smooth RPM
    const forwardSpeed = Math.hypot(s.vx, s.vy);
    s.speedKmh = Math.round((forwardSpeed / PIXELS_PER_METER) * 3.6);
    if (s.speedKmh > s.maxSpeedKmhThisRun) {
      s.maxSpeedKmhThisRun = s.speedKmh;
    }
    const wheelSpeedNorm = Math.min(1, Math.abs(s.rearWheel.omega * v.wheelRadius) / stats.maxSpeed);
    const targetRpm = hasFuel
      ? gas
        ? Math.min(1.05, 0.32 + wheelSpeedNorm * 0.72 + (s.jetActive ? 0.2 : 0))
        : brake
          ? Math.min(0.85, 0.24 + wheelSpeedNorm * 0.45)
          : 0.1 + wheelSpeedNorm * 0.35
      : 0;
    s.rpm += (targetRpm - s.rpm) * Math.min(1, dt * 8);

    // Air time & flip tracking
    const airborne = !s.rearWheel.onGround && !s.frontWheel.onGround;
    if (airborne) {
      s.airTime += dt;
      s.totalAirTimeThisRun += dt;
      s.airRotationAccum += s.omega * dt;

      // Award air time milestones at 1.25s, 2.25s, 3.25s...
      const airStep = Math.floor((s.airTime - 0.25) / 1.0);
      if (airStep >= 1 && airStep > s.airTimeAwardedSteps) {
        s.airTimeAwardedSteps = airStep;
        const bonus = airStep === 1 ? 500 : airStep === 2 ? 1000 : 1500;
        s.airBonusCoins += bonus;
        this.spawnPopup(
          airStep >= 2 ? `MEGA AIR! +${bonus}` : `AIR TIME! +${bonus}`,
          '#38BDF8',
          false,
          0.5,
          0.26
        );
        events.onAirTime(s.airTime, bonus);
      }

      // Detect completed 360-degree flips
      const flipThreshold = Math.PI * 1.8;
      if (Math.abs(s.airRotationAccum) >= flipThreshold) {
        const isBackflip = s.airRotationAccum < 0;
        s.airRotationAccum -= Math.sign(s.airRotationAccum) * Math.PI * 2;
        s.flipsThisRun += 1;
        if (isBackflip) {
          s.backflipsThisRun += 1;
        } else {
          s.frontflipsThisRun += 1;
        }
        const bonus = 1000;
        s.flipBonusCoins += bonus;
        this.spawnPopup(
          `${isBackflip ? 'BACKFLIP' : 'FRONTFLIP'}! +${bonus}`,
          '#FBBF24',
          false,
          0.5,
          0.19,
          'STUNT BONUS'
        );
        this.emitCoinBurst(s.x, s.y - 45, 14);
        events.onFlip(isBackflip, s.flipsThisRun, bonus);
      }
    } else {
      s.airTime = 0;
      s.airTimeAwardedSteps = 0;
      s.airRotationAccum *= 0.65;
      if (Math.abs(s.airRotationAccum) < 0.15) s.airRotationAccum = 0;
    }

    // Collectible magnet & pickups (coins & fuel cans)
    this.checkCollectibles(dt, stats.magnetRadius, events);
  }

  private stepPhysicsSub(
    dt: number,
    gas: boolean,
    brake: boolean,
    stats: ReturnType<typeof getEffectiveVehicleStats>,
    events: PhysicsEvents
  ): void {
    const s = this.state;
    const v = this.vehicle;

    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    const downX = -sin;
    const downY = cos;
    const fwdX = cos;
    const fwdY = sin;

    let fx = 0;
    let fy = v.mass * GRAVITY;
    let torque = 0;

    const wheels: { wheel: WheelState; driven: boolean; isRear: boolean }[] = [
      { wheel: s.rearWheel, driven: true, isRear: true },
      { wheel: s.frontWheel, driven: v.driveType !== 'RWD', isRear: false },
    ];

    for (let i = 0; i < wheels.length; i++) {
      const { wheel, driven } = wheels[i];

      const rx = wheel.anchorX * cos - wheel.anchorY * sin;
      const ry = wheel.anchorX * sin + wheel.anchorY * cos;
      const anchorWX = s.x + rx;
      const anchorWY = s.y + ry;

      const maxWX = anchorWX + downX * v.suspensionMax;
      const maxWY = anchorWY + downY * v.suspensionMax;
      const groundAtWheel = this.terrain.getHeight(maxWX);

      const wheelBottomAtMax = maxWY + v.wheelRadius;
      const penetration = wheelBottomAtMax - groundAtWheel;

      wheel.prevLength = wheel.length;

      if (penetration > 0 && downY > 0.15) {
        wheel.onGround = true;
        const compressedLen = Math.max(
          v.suspensionMin,
          v.suspensionMax - penetration / Math.max(0.45, downY)
        );
        wheel.length = compressedLen;
        wheel.wx = anchorWX + downX * wheel.length;
        wheel.wy = anchorWY + downY * wheel.length;

        const hardGroundY = this.terrain.getHeight(wheel.wx);
        const hardPen = wheel.wy + v.wheelRadius - hardGroundY;
        if (hardPen > 0) {
          s.y -= hardPen * 0.65;
          if (s.vy > 0) s.vy *= 0.72;
          wheel.wy -= hardPen * 0.65;
        }

        const norm = this.terrain.getNormal(wheel.wx);
        wheel.groundNormalX = norm.nx;
        wheel.groundNormalY = norm.ny;

        const compression = Math.max(0, v.suspensionRest - wheel.length);
        wheel.compressionRatio = Math.min(
          1,
          compression / Math.max(1, v.suspensionRest - v.suspensionMin)
        );

        const velAnchorX = s.vx - s.omega * ry;
        const velAnchorY = s.vy + s.omega * rx;
        const vAlongNorm = -(velAnchorX * norm.nx + velAnchorY * norm.ny);

        const springForce = Math.max(
          0,
          stats.springK * compression + stats.damping * vAlongNorm
        );

        const fnx = norm.nx * springForce;
        const fny = norm.ny * springForce;
        fx += fnx;
        fy += fny;
        torque += rx * fny - ry * fnx;

        const tanX = -norm.ny;
        const tanY = norm.nx;
        const vTan = velAnchorX * tanX + velAnchorY * tanY;

        let driveForce = 0;
        const drivenShare = v.driveType === 'RWD' ? 1.0 : 0.56;

        if (gas && driven) {
          const speedRatio = Math.max(0, vTan / stats.maxSpeed);
          const torqueCurve = Math.max(0.08, 1 - speedRatio * 0.92);
          driveForce = stats.enginePower * drivenShare * stats.grip * torqueCurve;
          wheel.omega = Math.min(stats.maxSpeed / v.wheelRadius, vTan / v.wheelRadius + 8);
        } else if (brake) {
          if (vTan > 25) {
            driveForce = -stats.enginePower * 0.92 * stats.grip * 0.6;
          } else {
            const revRatio = Math.max(0, -vTan / (stats.maxSpeed * 0.42));
            driveForce = -stats.enginePower * 0.58 * drivenShare * stats.grip * Math.max(0.1, 1 - revRatio);
          }
          wheel.omega = vTan / v.wheelRadius - 4;
        } else {
          driveForce = -vTan * 0.46 * v.mass;
          wheel.omega = vTan / v.wheelRadius;
        }

        const ftx = tanX * driveForce;
        const fty = tanY * driveForce;
        fx += ftx;
        fy += fty;

        const contactRX = wheel.wx - s.x;
        const contactRY = wheel.wy + v.wheelRadius * 0.45 - s.y;
        torque += (contactRX * fty - contactRY * ftx) * 0.27;

        // Wheelie pitch kick on steep gas/brake (slightly livelier for challenge!)
        if (gas && i === 0) {
          torque -= stats.airPitchTorque * 0.25;
        } else if (brake && i === 1) {
          torque += stats.airPitchTorque * 0.25;
        }
      } else {
        wheel.onGround = false;
        wheel.compressionRatio = 0;
        wheel.length += (v.suspensionRest - wheel.length) * Math.min(1, dt * 10);
        wheel.wx = anchorWX + downX * wheel.length;
        wheel.wy = anchorWY + downY * wheel.length;
        if (gas && driven) {
          wheel.omega = Math.min(36, wheel.omega + 42 * dt);
        } else if (brake) {
          wheel.omega = Math.max(-24, wheel.omega - 38 * dt);
        } else {
          wheel.omega *= 0.985;
        }
      }

      wheel.spin += wheel.omega * dt;
    }

    // Mid-air pitch control (scaled by Gyro Air Control upgrade!)
    const airborne = !s.rearWheel.onGround && !s.frontWheel.onGround;
    if (airborne) {
      if (gas) {
        torque += stats.airPitchTorque * 1.15;
      }
      if (brake) {
        torque -= stats.airPitchTorque * 1.15;
      }
      torque -= s.omega * 250;
    } else {
      torque -= s.omega * 390;
    }

    // Fighter Jet / Hyper-Rocket Thruster & Aerodynamic Glide
    if (v.hasJetThruster && gas) {
      fx += fwdX * stats.jetThrustForce;
      fy += fwdY * stats.jetThrustForce;

      if (airborne && s.vx > 140) {
        const lift = Math.min(v.mass * GRAVITY * 0.78, (s.vx / 520) * v.mass * GRAVITY * v.jetLiftFactor);
        fy -= lift;
      }
    }

    // Air drag
    const speedSq = s.vx * s.vx + s.vy * s.vy;
    const speed = Math.sqrt(speedSq);
    if (speed > 1) {
      const dragCoeff = v.hasJetThruster ? 0.00018 : 0.00028;
      const dragForce = dragCoeff * speedSq;
      fx -= (s.vx / speed) * dragForce;
      fy -= (s.vy / speed) * dragForce;
    }

    // Integrate linear & angular velocity
    s.vx += (fx / v.mass) * dt;
    s.vy += (fy / v.mass) * dt;
    s.omega += (torque / v.inertia) * dt;

    const hardMaxV = stats.maxSpeed * (v.hasJetThruster ? 1.45 : 1.35);
    if (s.vx > hardMaxV) s.vx = hardMaxV;
    if (s.vx < -380) s.vx = -380;
    if (s.vy > 1140) s.vy = 1140;
    if (s.vy < -950) s.vy = -950;
    s.omega = Math.max(-7.5, Math.min(7.5, s.omega));

    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.angle += s.omega * dt;

    if (s.x < -80) {
      s.x = -80;
      if (s.vx < 0) s.vx = 0;
    }

    // Chassis bottom & bumper collision checks
    const chassisChecks = [
      { lx: -v.chassisHalfW * 0.85, ly: v.chassisHalfH * 0.6 },
      { lx: 0, ly: v.chassisHalfH * 0.75 },
      { lx: v.chassisHalfW * 0.85, ly: v.chassisHalfH * 0.6 },
    ];
    for (let i = 0; i < chassisChecks.length; i++) {
      const pt = chassisChecks[i];
      const wx = s.x + pt.lx * cos - pt.ly * sin;
      const wy = s.y + pt.lx * sin + pt.ly * cos;
      const gy = this.terrain.getHeight(wx);
      if (wy > gy) {
        const pen = wy - gy;
        s.y -= pen * 0.6;
        if (s.vy > 40) {
          s.vy *= -0.15;
          this.emitSparks(wx, gy, 3);
        } else if (s.vy > 0) {
          s.vy = 0;
        }
        // Roll cage reduces speed loss slightly on heavy bottom-outs
        const scrapeDamp = this.upgrades.rollcage >= 4 ? 0.992 : 0.982;
        s.vx *= scrapeDamp;
      }
    }

    // Bobblehead spring physics
    const accelTorque = -(fx / v.mass) * 0.0022 - s.omega * 0.85;
    const headSpringK = 82;
    const headDamp = 6.2;
    const headAccel = accelTorque - headSpringK * s.headAngle - headDamp * s.headOmega;
    s.headOmega += headAccel * dt;
    s.headAngle += s.headOmega * dt;
    s.headAngle = Math.max(-0.55, Math.min(0.55, s.headAngle));

    const seatLocalX = v.driverSeatX;
    const seatLocalY = v.driverSeatY;
    const headDist = 23;
    const totalHeadAngle = s.angle + s.headAngle * 0.6;
    const neckWX = s.x + seatLocalX * cos - seatLocalY * sin;
    const neckWY = s.y + seatLocalX * sin + seatLocalY * cos;
    s.headWorldX = neckWX + Math.sin(totalHeadAngle) * headDist;
    s.headWorldY = neckWY - Math.cos(totalHeadAngle) * headDist;

    // Driver head vs ground crash check (slightly stricter angle 1.26 rad for higher difficulty!)
    const headGroundY = this.terrain.getHeight(s.headWorldX);
    const normalizedAngle = Math.atan2(Math.sin(s.angle), Math.cos(s.angle));
    const isInverted = Math.abs(normalizedAngle) > 1.26;

    if (isInverted && s.headWorldY + v.headRadius * 0.86 > headGroundY) {
      if (s.rollcageCooldown > 0) {
        // Still bouncing away from a roll cage save
        s.y -= 10;
        s.vy = Math.min(s.vy, -190);
        return;
      }

      if (s.rollcageShields > 0) {
        // Roll Cage absorbs the roof impact and flips/bounces the vehicle safely!
        s.rollcageShields -= 1;
        s.rollcageCooldown = 0.7;
        s.y -= 28;
        s.vy = -360;
        s.omega = normalizedAngle > 0 ? -4.2 : 4.2;
        this.emitSparks(s.headWorldX, headGroundY, 14);
        this.spawnPopup(
          'ROLL CAGE SAVE!',
          '#38BDF8',
          false,
          0.5,
          0.24,
          s.rollcageShields > 0 ? `${s.rollcageShields} ARMOR LEFT` : 'ARMOR BROKEN'
        );
        events.onRollcageSave?.();
        return;
      }

      s.crashed = true;
      s.crashReason = 'driver_down';
      s.headWorldY = headGroundY - v.headRadius * 0.7;
      this.emitCrashStars(s.headWorldX, s.headWorldY);
      events.onCrash('driver_down');
    }
  }

  private checkCollectibles(dt: number, magnetRadius: number, events: PhysicsEvents): void {
    const s = this.state;
    const scanRange = Math.max(180, magnetRadius + 60);
    const items = this.terrain.getCollectiblesInRange(s.x - scanRange, s.x + scanRange);
    const pickupRadius = 56;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.collected) continue;

      const dx = s.x - item.x;
      const dy = s.y - item.y;
      const dCar = Math.hypot(dx, dy);

      // Coin Magnet upgrade pulls nearby coins (and fuel cans at high levels) smoothly toward chassis!
      if (magnetRadius > 0 && dCar < magnetRadius && dCar > 4) {
        const pullSpeed = item.type === 'coin' ? 420 : 280;
        const stepDist = Math.min(dCar, pullSpeed * dt);
        item.x += (dx / dCar) * stepDist;
        item.y += (dy / dCar) * stepDist;
      }

      const dHead = Math.hypot(item.x - s.headWorldX, item.y - s.headWorldY);
      const dCarAfter = Math.hypot(item.x - s.x, item.y - s.y);

      if (dCarAfter < pickupRadius || dHead < pickupRadius * 0.8) {
        item.collected = true;
        item.collectAnim = 0.01;
        if (item.type === 'coin') {
          s.roadCoins += item.value;
          s.coinsCollectedCount += 1;
          this.spawnPopup(`+${item.value}`, '#FBBF24', true, item.x, item.y - 16);
          this.emitCoinBurst(item.x, item.y, 6);
          events.onCoinPickup(item.value);
        } else {
          s.fuel = 100;
          s.fuelPickupsCount += 1;
          this.lowFuelTriggered = false;
          this.spawnPopup('FUEL FULL!', '#34D399', true, item.x, item.y - 24);
          this.emitFuelBurst(item.x, item.y);
          events.onFuelPickup();
        }
      }
    }
  }

  private emitWheelDust(dt: number, gas: boolean, brake: boolean): void {
    const s = this.state;
    const v = this.vehicle;
    const rate = gas || brake ? 38 : Math.abs(s.vx) > 180 ? 18 : 0;
    if (rate <= 0) return;

    this.dustAccum += rate * dt;
    while (this.dustAccum >= 1) {
      this.dustAccum -= 1;
      const wheels = [s.rearWheel, s.frontWheel];
      for (const w of wheels) {
        if (!w.onGround) continue;
        if (this.particles.length > 160) break;
        const dir = gas ? -1 : 1;
        this.particles.push({
          x: w.wx + (Math.random() - 0.5) * 10,
          y: w.wy + v.wheelRadius - 2,
          vx: dir * (40 + Math.random() * 90) + s.vx * 0.15,
          vy: -(25 + Math.random() * 75),
          size: 3 + Math.random() * 4.5,
          color: Math.random() > 0.4 ? '#784A26' : '#4D7C0F',
          alpha: 0.85,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
          gravity: 320,
          kind: 'dirt',
        });
      }
    }
  }

  private emitJetFlames(dt: number): void {
    const s = this.state;
    const cos = Math.cos(s.angle);
    const sin = Math.sin(s.angle);
    const nozzleLocalX = -this.vehicle.chassisHalfW - 4;
    const nozzleLocalY = 2;
    const nx = s.x + nozzleLocalX * cos - nozzleLocalY * sin;
    const ny = s.y + nozzleLocalX * sin + nozzleLocalY * cos;

    const count = Math.max(2, Math.round(dt * 180));
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 190) break;
      const spread = (Math.random() - 0.5) * 0.35;
      const ejectSpeed = 320 + Math.random() * 220;
      const a = s.angle + Math.PI + spread;
      const isCore = Math.random() > 0.55;
      this.particles.push({
        x: nx + (Math.random() - 0.5) * 6,
        y: ny + (Math.random() - 0.5) * 6,
        vx: s.vx * 0.35 + Math.cos(a) * ejectSpeed,
        vy: s.vy * 0.35 + Math.sin(a) * ejectSpeed,
        size: isCore ? 7 + Math.random() * 6 : 10 + Math.random() * 8,
        color: isCore ? '#38BDF8' : Math.random() > 0.4 ? '#F97316' : '#FACC15',
        alpha: 0.95,
        life: 0,
        maxLife: 0.14 + Math.random() * 0.16,
        gravity: -40,
        kind: 'flame',
      });
    }
  }

  private emitSparks(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 180) break;
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 180 - this.state.vx * 0.2,
        vy: -(40 + Math.random() * 110),
        size: 2.5 + Math.random() * 2,
        color: '#FDE047',
        alpha: 1,
        life: 0,
        maxLife: 0.22 + Math.random() * 0.18,
        gravity: 420,
        kind: 'spark',
      });
    }
  }

  private emitCoinBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 65 + Math.random() * 110;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 50,
        size: 3 + Math.random() * 3,
        color: i % 2 === 0 ? '#FACC15' : '#FEF08A',
        alpha: 1,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.25,
        gravity: 260,
        kind: 'coin',
      });
    }
  }

  private emitFuelBurst(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spd = 80 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 40,
        size: 4 + Math.random() * 3,
        color: i % 2 === 0 ? '#34D399' : '#EF4444',
        alpha: 1,
        life: 0,
        maxLife: 0.5,
        gravity: 160,
        kind: 'coin',
      });
    }
  }

  private emitCrashStars(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const spd = 90 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 90,
        size: 5 + Math.random() * 4,
        color: i % 2 === 0 ? '#FACC15' : '#FB7185',
        alpha: 1,
        life: 0,
        maxLife: 0.9,
        gravity: 220,
        kind: 'star',
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  private updatePopups(dt: number): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life += dt;
      if (pop.life >= pop.maxLife) {
        this.popups.splice(i, 1);
      } else if (pop.worldSpace) {
        pop.y -= 48 * dt;
      }
    }
  }
}
