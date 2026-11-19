import { DRIVERS, VEHICLES } from './catalog';
import { createInitialDailyMissionState, ensureCurrentDailyMissionState } from './missions';
import { DriverId, SaveData, VehicleId, VehicleUpgrades } from './types';

const STORAGE_KEY = 'vip_hill_climb_save_v1';

export const DEFAULT_UPGRADES: VehicleUpgrades = {
  engine: 1,
  suspension: 1,
  tires: 1,
  fuel: 1,
  turbo: 1,
  air_control: 1,
  magnet: 1,
  rollcage: 1,
};

function createAllVehicleRecord<T>(factory: () => T): Record<VehicleId, T> {
  const out = {} as Record<VehicleId, T>;
  for (const v of VEHICLES) {
    out[v.id] = factory();
  }
  return out;
}

function createAllDriverRecord<T>(factory: () => T): Record<DriverId, T> {
  const out = {} as Record<DriverId, T>;
  for (const d of DRIVERS) {
    out[d.id] = factory();
  }
  return out;
}

export function createDefaultSaveData(): SaveData {
  return {
    coins: 500,
    bestDistance: 0,
    bestDistanceByVehicle: createAllVehicleRecord(() => 0),
    unlockedDrivers: ['namo'],
    unlockedVehicles: ['sedan'],
    selectedDriver: 'namo',
    selectedVehicle: 'sedan',
    upgrades: createAllVehicleRecord(() => ({ ...DEFAULT_UPGRADES })),
    vehicleColors: createAllVehicleRecord(() => 'default'),
    driverOutfits: createAllDriverRecord(() => 'default'),
    dailyMissions: createInitialDailyMissionState(),
    sfxEnabled: true,
    voiceEnabled: true,
  };
}

export function loadSaveData(): SaveData {
  const fallback = createDefaultSaveData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveData>;

    const validDrivers = new Set<DriverId>(DRIVERS.map((d) => d.id));
    const validVehicles = new Set<VehicleId>(VEHICLES.map((v) => v.id));

    const unlockedDrivers = Array.isArray(parsed.unlockedDrivers)
      ? parsed.unlockedDrivers.filter((d): d is DriverId => validDrivers.has(d as DriverId))
      : fallback.unlockedDrivers;
    if (!unlockedDrivers.includes('namo')) unlockedDrivers.unshift('namo');

    const unlockedVehicles = Array.isArray(parsed.unlockedVehicles)
      ? parsed.unlockedVehicles.filter((v): v is VehicleId => validVehicles.has(v as VehicleId))
      : fallback.unlockedVehicles;
    if (!unlockedVehicles.includes('sedan')) unlockedVehicles.unshift('sedan');

    const selectedDriver: DriverId =
      parsed.selectedDriver && unlockedDrivers.includes(parsed.selectedDriver)
        ? parsed.selectedDriver
        : 'namo';

    const selectedVehicle: VehicleId =
      parsed.selectedVehicle && unlockedVehicles.includes(parsed.selectedVehicle)
        ? parsed.selectedVehicle
        : 'sedan';

    const upgrades = createAllVehicleRecord(() => ({ ...DEFAULT_UPGRADES }));
    const bestDistanceByVehicle = createAllVehicleRecord(() => 0);
    const vehicleColors = createAllVehicleRecord(() => 'default');
    const driverOutfits = createAllDriverRecord(() => 'default');

    for (const v of VEHICLES) {
      if (parsed.upgrades?.[v.id]) {
        upgrades[v.id] = { ...DEFAULT_UPGRADES, ...parsed.upgrades[v.id] };
      }
      bestDistanceByVehicle[v.id] = Math.max(
        0,
        Number(parsed.bestDistanceByVehicle?.[v.id] ?? 0) || 0
      );
      if (typeof parsed.vehicleColors?.[v.id] === 'string') {
        vehicleColors[v.id] = parsed.vehicleColors[v.id];
      }
    }

    for (const d of DRIVERS) {
      if (typeof parsed.driverOutfits?.[d.id] === 'string') {
        driverOutfits[d.id] = parsed.driverOutfits[d.id];
      }
    }

    return {
      coins: Math.max(0, Math.floor(Number(parsed.coins ?? fallback.coins) || 0)),
      bestDistance: Math.max(0, Math.floor(Number(parsed.bestDistance ?? 0) || 0)),
      bestDistanceByVehicle,
      unlockedDrivers,
      unlockedVehicles,
      selectedDriver,
      selectedVehicle,
      upgrades,
      vehicleColors,
      driverOutfits,
      dailyMissions: ensureCurrentDailyMissionState(parsed.dailyMissions),
      sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : true,
      voiceEnabled: typeof parsed.voiceEnabled === 'boolean' ? parsed.voiceEnabled : true,
    };
  } catch {
    return fallback;
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or storage restriction errors silently
  }
}
