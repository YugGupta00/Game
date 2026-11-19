import { DailyMission, DailyMissionMetric, DailyMissionProgress, DailyMissionState, RunMetrics } from './types';

interface MissionTemplate {
  id: string;
  metric: DailyMissionMetric;
  title: string;
  description: string;
  target: number;
  reward: number;
  unit: string;
}

const DISTANCE_POOL: MissionTemplate[] = [
  {
    id: 'dist_500',
    metric: 'distance',
    title: 'Travel 500 meters',
    description: 'Reach 500m in a single run',
    target: 500,
    reward: 650,
    unit: 'm',
  },
  {
    id: 'dist_300',
    metric: 'distance',
    title: 'Travel 300 meters',
    description: 'Reach 300m in a single run',
    target: 300,
    reward: 450,
    unit: 'm',
  },
  {
    id: 'dist_750',
    metric: 'distance',
    title: 'Mountain Expedition',
    description: 'Travel 750m in a single run',
    target: 750,
    reward: 950,
    unit: 'm',
  },
];

const STUNT_POOL: MissionTemplate[] = [
  {
    id: 'backflip_3',
    metric: 'backflips',
    title: 'Perform 3 backflips',
    description: 'Land 3 backflips in a single run',
    target: 3,
    reward: 800,
    unit: 'flips',
  },
  {
    id: 'backflip_2',
    metric: 'backflips',
    title: 'Double Backflip Run',
    description: 'Perform 2 backflips in a single run',
    target: 2,
    reward: 550,
    unit: 'flips',
  },
  {
    id: 'flips_3',
    metric: 'flips',
    title: 'Stunt Driver',
    description: 'Land 3 flips (front or back) in a single run',
    target: 3,
    reward: 700,
    unit: 'flips',
  },
  {
    id: 'airtime_6',
    metric: 'airtime_total',
    title: 'Frequent Flyer',
    description: 'Spend 6 seconds airborne in a single run',
    target: 6,
    reward: 600,
    unit: 's',
  },
];

const ACTION_POOL: MissionTemplate[] = [
  {
    id: 'fuel_2',
    metric: 'fuel_pickups',
    title: 'Fuel Scavenger',
    description: 'Collect 2 fuel cans in a single run',
    target: 2,
    reward: 500,
    unit: 'cans',
  },
  {
    id: 'coins_18',
    metric: 'coins_collected',
    title: 'Gold Rush',
    description: 'Collect 18 road coins in a single run',
    target: 18,
    reward: 550,
    unit: 'coins',
  },
  {
    id: 'speed_95',
    metric: 'top_speed',
    title: 'Speed Demon',
    description: 'Reach 95 km/h in a single run',
    target: 95,
    reward: 600,
    unit: 'km/h',
  },
  {
    id: 'frontflip_2',
    metric: 'frontflips',
    title: 'Forward Momentum',
    description: 'Perform 2 frontflips in a single run',
    target: 2,
    reward: 650,
    unit: 'flips',
  },
];

export const DAILY_SWEEP_BONUS = 1000;

export function getTodayDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Deterministically picks 3 varied daily single-run missions for a given YYYY-MM-DD date.
 */
export function getDailyMissionsForDate(dateKey: string): DailyMission[] {
  const h = hashDateKey(dateKey);
  // Make sure the iconic "Travel 500 meters" + "Perform 3 backflips" appear frequently
  const m1 = DISTANCE_POOL[h % DISTANCE_POOL.length];
  const m2 = STUNT_POOL[Math.floor(h / 7) % STUNT_POOL.length];
  const m3 = ACTION_POOL[Math.floor(h / 19) % ACTION_POOL.length];

  return [m1, m2, m3].map((tpl) => ({
    ...tpl,
    id: `${dateKey}_${tpl.id}`,
  }));
}

export function createInitialDailyMissionState(dateKey: string = getTodayDateKey()): DailyMissionState {
  const missions = getDailyMissionsForDate(dateKey);
  const progress: Record<string, DailyMissionProgress> = {};
  for (const m of missions) {
    progress[m.id] = {
      bestAttempt: 0,
      completed: false,
      claimed: false,
    };
  }
  return {
    dateKey,
    progress,
    sweepBonusClaimed: false,
  };
}

/**
 * Ensures stored daily mission state matches today's local date; resets cleanly on a new day.
 */
export function ensureCurrentDailyMissionState(
  existing?: DailyMissionState | null,
  dateKey: string = getTodayDateKey()
): DailyMissionState {
  if (!existing || existing.dateKey !== dateKey) {
    return createInitialDailyMissionState(dateKey);
  }
  const missions = getDailyMissionsForDate(dateKey);
  const progress: Record<string, DailyMissionProgress> = {};
  for (const m of missions) {
    const prev = existing.progress?.[m.id];
    progress[m.id] = {
      bestAttempt: Math.max(0, Number(prev?.bestAttempt ?? 0) || 0),
      completed: Boolean(prev?.completed),
      claimed: Boolean(prev?.claimed),
    };
  }
  return {
    dateKey,
    progress,
    sweepBonusClaimed: Boolean(existing.sweepBonusClaimed),
  };
}

export function getMetricValueFromRun(metric: DailyMissionMetric, run: RunMetrics): number {
  switch (metric) {
    case 'distance':
      return run.distance;
    case 'backflips':
      return run.backflips;
    case 'frontflips':
      return run.frontflips;
    case 'flips':
      return run.flips;
    case 'airtime_total':
      return Math.floor(run.totalAirTime * 10) / 10;
    case 'coins_collected':
      return run.coinsCollectedCount;
    case 'fuel_pickups':
      return run.fuelPickupsCount;
    case 'top_speed':
      return run.maxSpeedKmh;
  }
}

export function formatMissionValue(metric: DailyMissionMetric, value: number, unit: string): string {
  if (metric === 'airtime_total') {
    return `${value.toFixed(1)}${unit}`;
  }
  if (metric === 'distance' || metric === 'top_speed') {
    return `${Math.floor(value)} ${unit}`;
  }
  return `${Math.floor(value)}`;
}

export function countUnclaimedMissionRewards(state: DailyMissionState): number {
  const missions = getDailyMissionsForDate(state.dateKey);
  let count = 0;
  let allCompleted = true;
  for (const m of missions) {
    const p = state.progress[m.id];
    if (p?.completed && !p.claimed) count++;
    if (!p?.completed) allCompleted = false;
  }
  if (allCompleted && !state.sweepBonusClaimed) count++;
  return count;
}
