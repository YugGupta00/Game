export type DriverId =
  | 'namo'
  | 'yogiji'
  | 'donnyt'
  | 'elon'
  | 'zuck'
  | 'jeffy'
  | 'putin_bear'
  | 'boris_b'
  | 'king_srk'
  | 'cr7'
  | 'gordon'
  | 'snoop'
  | 'taylor'
  | 'einstein';

export type VehicleId =
  | 'sedan'
  | 'suv'
  | 'coupe'
  | 'jet'
  | 'tuk_tuk'
  | 'vintage_jeep'
  | 'cyber_truck'
  | 'dune_buggy'
  | 'monster_truck'
  | 'rally_hatch'
  | 'gold_limo'
  | 'formula_car'
  | 'tank'
  | 'rocket_sled';

export type UpgradeKey =
  | 'engine'
  | 'suspension'
  | 'tires'
  | 'fuel'
  | 'turbo'
  | 'air_control'
  | 'magnet'
  | 'rollcage';

export interface ColorSwatch {
  id: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface DriverConfig {
  id: DriverId;
  name: string;
  title: string;
  tagline: string;
  cost: number;
  voicePitch: number;
  voiceRate: number;
  accentColor: string;
  defaultOutfitPrimary: string;
  defaultOutfitSecondary: string;
  lines: {
    start: string[];
    flip: string[];
    airtime: string[];
    crash: string[];
    lowFuel: string[];
    fuelPickup: string[];
  };
}

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  subtitle: string;
  description: string;
  cost: number;
  primaryColor: string;
  secondaryColor: string;
  // Geometry in world pixels (scale ~ 18px = 1 meter)
  wheelBase: number;
  rearWheelOffsetX: number;
  frontWheelOffsetX: number;
  wheelAnchorY: number; // positive = below chassis center
  wheelRadius: number;
  suspensionRest: number;
  suspensionMin: number;
  suspensionMax: number;
  driverSeatX: number;
  driverSeatY: number; // negative = above chassis center
  headRadius: number;
  chassisHalfW: number;
  chassisHalfH: number;
  // Base physics parameters (scaled by upgrades)
  mass: number;
  inertia: number;
  enginePower: number; // linear drive acceleration force
  maxSpeed: number; // world px/s
  springK: number;
  damping: number;
  grip: number; // tire traction multiplier
  airPitchTorque: number; // mid-air rotation authority
  fuelCapacity: number; // seconds at nominal burn
  fuelBurnIdle: number;
  fuelBurnGas: number;
  hasJetThruster: boolean;
  jetThrustForce: number;
  jetLiftFactor: number;
  jetFuelBurnExtra: number;
  driveType: 'RWD' | 'AWD' | 'JET';
  engineTone: 'sedan' | 'suv' | 'coupe' | 'jet';
  // Display ratings (1-100) for Garage comparison
  ratings: {
    speed: number;
    torque: number;
    suspension: number;
    efficiency: number;
  };
}

export interface VehicleUpgrades {
  engine: number; // 1..10
  suspension: number; // 1..10
  tires: number; // 1..10
  fuel: number; // 1..10
  turbo: number; // 1..10
  air_control: number; // 1..10
  magnet: number; // 1..10
  rollcage: number; // 1..10
}

export type DailyMissionMetric =
  | 'distance'
  | 'backflips'
  | 'frontflips'
  | 'flips'
  | 'airtime_total'
  | 'coins_collected'
  | 'fuel_pickups'
  | 'top_speed';

export interface DailyMission {
  id: string;
  metric: DailyMissionMetric;
  title: string;
  description: string;
  target: number;
  reward: number;
  unit: string;
}

export interface DailyMissionProgress {
  bestAttempt: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyMissionState {
  dateKey: string;
  progress: Record<string, DailyMissionProgress>;
  sweepBonusClaimed: boolean;
}

export interface RunMetrics {
  distance: number;
  backflips: number;
  frontflips: number;
  flips: number;
  totalAirTime: number;
  coinsCollectedCount: number;
  fuelPickupsCount: number;
  maxSpeedKmh: number;
}

export interface SaveData {
  coins: number;
  bestDistance: number;
  bestDistanceByVehicle: Record<VehicleId, number>;
  unlockedDrivers: DriverId[];
  unlockedVehicles: VehicleId[];
  selectedDriver: DriverId;
  selectedVehicle: VehicleId;
  upgrades: Record<VehicleId, VehicleUpgrades>;
  vehicleColors: Record<VehicleId, string>; // ColorSwatch id or 'default'
  driverOutfits: Record<DriverId, string>; // ColorSwatch id or 'default'
  dailyMissions: DailyMissionState;
  sfxEnabled: boolean;
  voiceEnabled: boolean;
}

export interface Collectible {
  id: number;
  type: 'coin' | 'fuel';
  x: number;
  y: number;
  value: number; // coin value (5, 25, 100, 500) or 100 for fuel
  collected: boolean;
  collectAnim: number; // 0..1 after pickup
  bobPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  kind: 'dirt' | 'spark' | 'smoke' | 'flame' | 'coin' | 'star';
}

export interface FloatingPopup {
  id: number;
  text: string;
  subtext?: string;
  color: string;
  x: number; // screen normalized 0..1 or world coords
  y: number;
  worldSpace: boolean;
  life: number;
  maxLife: number;
}

export interface WheelState {
  // Local mount offset
  anchorX: number;
  anchorY: number;
  // Current suspension extension length
  length: number;
  prevLength: number;
  // World position
  wx: number;
  wy: number;
  // Wheel spin angle (radians)
  spin: number;
  omega: number;
  onGround: boolean;
  groundNormalX: number;
  groundNormalY: number;
  compressionRatio: number; // 0..1
}

export interface VehiclePhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  rearWheel: WheelState;
  frontWheel: WheelState;
  // Bobblehead spring (relative tilt & offset)
  headAngle: number;
  headOmega: number;
  headOffsetX: number;
  headOffsetY: number;
  headWorldX: number;
  headWorldY: number;
  // Live telemetry
  rpm: number; // 0..1 normalized
  speedKmh: number;
  maxSpeedKmhThisRun: number;
  jetActive: boolean;
  jetHeat: number; // 0..1 visual flame intensity
  fuel: number; // 0..100
  maxFuel: number;
  rollcageShields: number;
  rollcageCooldown: number;
  // Air / stunt state
  airTime: number;
  totalAirTimeThisRun: number;
  airTimeAwardedSteps: number;
  airRotationAccum: number;
  flipsThisRun: number;
  backflipsThisRun: number;
  frontflipsThisRun: number;
  airBonusCoins: number;
  flipBonusCoins: number;
  roadCoins: number;
  coinsCollectedCount: number;
  fuelPickupsCount: number;
  distanceMeters: number;
  maxDistanceMeters: number;
  // Fail state
  crashed: boolean;
  crashReason: 'driver_down' | 'out_of_fuel' | null;
  outOfFuelTimer: number;
  crashFreezeTimer: number;
}

export interface InputState {
  gas: boolean;
  brake: boolean;
}

export interface RunSummary {
  distance: number;
  isNewBest: boolean;
  previousBest: number;
  roadCoins: number;
  flipBonusCoins: number;
  airBonusCoins: number;
  totalCoins: number;
  flips: number;
  metrics: RunMetrics;
  completedMissionIds: string[];
  reason: 'driver_down' | 'out_of_fuel';
}

export interface HudSnapshot {
  fuel: number; // 0..100
  rpm: number; // 0..1
  speedKmh: number;
  distance: number;
  bestDistance: number;
  runCoins: number;
  totalBankCoins: number;
  jetActive: boolean;
  hasJet: boolean;
  lowFuel: boolean;
  airTime: number;
  rollcageShields: number;
  runMetrics: RunMetrics;
}
