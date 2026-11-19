import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GarageScreen } from './components/GarageScreen';
import { soundEngine } from './game/audio';
import { getDriverById, getUpgradeCost, getVehicleById, MAX_UPGRADE_LEVEL } from './game/catalog';
import {
  DAILY_SWEEP_BONUS,
  ensureCurrentDailyMissionState,
  getDailyMissionsForDate,
  getMetricValueFromRun,
} from './game/missions';
import { loadSaveData, persistSaveData } from './game/storage';
import { DriverId, RunSummary, SaveData, UpgradeKey, VehicleId } from './game/types';

type ScreenMode = 'GARAGE' | 'PLAYING';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<ScreenMode>('GARAGE');

  useEffect(() => {
    persistSaveData(save);
    soundEngine.setSettings(save.sfxEnabled, save.voiceEnabled);
  }, [save]);

  const handleSelectDriver = useCallback((id: DriverId) => {
    soundEngine.playUpgradeClick();
    setSave((prev) => {
      if (!prev.unlockedDrivers.includes(id)) return prev;
      return { ...prev, selectedDriver: id };
    });
  }, []);

  const handleUnlockDriver = useCallback((id: DriverId) => {
    const driver = getDriverById(id);
    setSave((prev) => {
      if (prev.unlockedDrivers.includes(id) || prev.coins < driver.cost) return prev;
      soundEngine.playStuntFanfare();
      soundEngine.speakDriverLine(driver, 'start', true);
      return {
        ...prev,
        coins: prev.coins - driver.cost,
        unlockedDrivers: [...prev.unlockedDrivers, id],
        selectedDriver: id,
      };
    });
  }, []);

  const handleSelectVehicle = useCallback((id: VehicleId) => {
    soundEngine.playUpgradeClick();
    setSave((prev) => {
      if (!prev.unlockedVehicles.includes(id)) return prev;
      return { ...prev, selectedVehicle: id };
    });
  }, []);

  const handleUnlockVehicle = useCallback((id: VehicleId) => {
    const vehicle = getVehicleById(id);
    setSave((prev) => {
      if (prev.unlockedVehicles.includes(id) || prev.coins < vehicle.cost) return prev;
      soundEngine.playStuntFanfare();
      return {
        ...prev,
        coins: prev.coins - vehicle.cost,
        unlockedVehicles: [...prev.unlockedVehicles, id],
        selectedVehicle: id,
      };
    });
  }, []);

  const handlePurchaseUpgrade = useCallback((vehicleId: VehicleId, key: UpgradeKey) => {
    setSave((prev) => {
      const currentLevel = prev.upgrades[vehicleId][key];
      if (currentLevel >= MAX_UPGRADE_LEVEL) return prev;
      const cost = getUpgradeCost(key, currentLevel);
      if (prev.coins < cost) return prev;
      soundEngine.playUpgradeClick();
      return {
        ...prev,
        coins: prev.coins - cost,
        upgrades: {
          ...prev.upgrades,
          [vehicleId]: {
            ...prev.upgrades[vehicleId],
            [key]: currentLevel + 1,
          },
        },
      };
    });
  }, []);

  const handleSelectVehicleColor = useCallback((vehicleId: VehicleId, swatchId: string) => {
    soundEngine.playUpgradeClick();
    setSave((prev) => ({
      ...prev,
      vehicleColors: {
        ...prev.vehicleColors,
        [vehicleId]: swatchId,
      },
    }));
  }, []);

  const handleSelectDriverOutfit = useCallback((driverId: DriverId, swatchId: string) => {
    soundEngine.playUpgradeClick();
    setSave((prev) => ({
      ...prev,
      driverOutfits: {
        ...prev.driverOutfits,
        [driverId]: swatchId,
      },
    }));
  }, []);

  const handleMissionCompleted = useCallback((missionId: string, achievedValue: number) => {
    setSave((prev) => {
      const current = ensureCurrentDailyMissionState(prev.dailyMissions);
      const existing = current.progress[missionId];
      if (!existing || existing.completed) return prev;
      return {
        ...prev,
        dailyMissions: {
          ...current,
          progress: {
            ...current.progress,
            [missionId]: {
              ...existing,
              bestAttempt: Math.max(existing.bestAttempt, achievedValue),
              completed: true,
            },
          },
        },
      };
    });
  }, []);

  const handleClaimMissionReward = useCallback((missionId: string) => {
    setSave((prev) => {
      const current = ensureCurrentDailyMissionState(prev.dailyMissions);
      const missions = getDailyMissionsForDate(current.dateKey);
      const mission = missions.find((m) => m.id === missionId);
      const prog = current.progress[missionId];
      if (!mission || !prog || !prog.completed || prog.claimed) return prev;

      soundEngine.playCoin();
      return {
        ...prev,
        coins: prev.coins + mission.reward,
        dailyMissions: {
          ...current,
          progress: {
            ...current.progress,
            [missionId]: {
              ...prog,
              claimed: true,
            },
          },
        },
      };
    });
  }, []);

  const handleClaimSweepBonus = useCallback(() => {
    setSave((prev) => {
      const current = ensureCurrentDailyMissionState(prev.dailyMissions);
      if (current.sweepBonusClaimed) return prev;
      const missions = getDailyMissionsForDate(current.dateKey);
      const allDone = missions.every((m) => current.progress[m.id]?.completed);
      if (!allDone) return prev;

      soundEngine.playStuntFanfare();
      return {
        ...prev,
        coins: prev.coins + DAILY_SWEEP_BONUS,
        dailyMissions: {
          ...current,
          sweepBonusClaimed: true,
        },
      };
    });
  }, []);

  const handleClaimAllMissions = useCallback(() => {
    setSave((prev) => {
      const current = ensureCurrentDailyMissionState(prev.dailyMissions);
      const missions = getDailyMissionsForDate(current.dateKey);
      let bonusCoins = 0;
      const nextProgress = { ...current.progress };

      for (const m of missions) {
        const prog = nextProgress[m.id];
        if (prog?.completed && !prog.claimed) {
          bonusCoins += m.reward;
          nextProgress[m.id] = { ...prog, claimed: true };
        }
      }

      const allDone = missions.every((m) => nextProgress[m.id]?.completed);
      let nextSweepClaimed = current.sweepBonusClaimed;
      if (allDone && !nextSweepClaimed) {
        bonusCoins += DAILY_SWEEP_BONUS;
        nextSweepClaimed = true;
      }

      if (bonusCoins <= 0) return prev;
      soundEngine.playStuntFanfare();

      return {
        ...prev,
        coins: prev.coins + bonusCoins,
        dailyMissions: {
          ...current,
          progress: nextProgress,
          sweepBonusClaimed: nextSweepClaimed,
        },
      };
    });
  }, []);

  const handleRunComplete = useCallback((summary: RunSummary) => {
    setSave((prev) => {
      const vId = prev.selectedVehicle;
      const nextVehicleBest = Math.max(prev.bestDistanceByVehicle[vId], summary.distance);

      // Update daily mission single-run best attempts & completion status
      const currentMissions = ensureCurrentDailyMissionState(prev.dailyMissions);
      const todaysMissions = getDailyMissionsForDate(currentMissions.dateKey);
      const nextProgress = { ...currentMissions.progress };

      for (const m of todaysMissions) {
        const existing = nextProgress[m.id] ?? {
          bestAttempt: 0,
          completed: false,
          claimed: false,
        };
        const achieved = getMetricValueFromRun(m.metric, summary.metrics);
        const bestAttempt = Math.max(existing.bestAttempt, achieved);
        const completed = existing.completed || achieved >= m.target;
        nextProgress[m.id] = {
          ...existing,
          bestAttempt,
          completed,
        };
      }

      return {
        ...prev,
        coins: prev.coins + summary.totalCoins,
        bestDistance: Math.max(prev.bestDistance, summary.distance),
        bestDistanceByVehicle: {
          ...prev.bestDistanceByVehicle,
          [vId]: nextVehicleBest,
        },
        dailyMissions: {
          ...currentMissions,
          progress: nextProgress,
        },
      };
    });
  }, []);

  const handleToggleSfx = useCallback(() => {
    setSave((prev) => ({ ...prev, sfxEnabled: !prev.sfxEnabled }));
  }, []);

  const handleToggleVoice = useCallback(() => {
    setSave((prev) => ({ ...prev, voiceEnabled: !prev.voiceEnabled }));
  }, []);

  const handleStartGame = useCallback(() => {
    // Refresh daily missions cleanly if the clock crossed midnight while sitting in the Garage
    setSave((prev) => ({
      ...prev,
      dailyMissions: ensureCurrentDailyMissionState(prev.dailyMissions),
    }));
    setScreen('PLAYING');
  }, []);

  if (screen === 'PLAYING') {
    return (
      <GameCanvas
        save={save}
        onRunComplete={handleRunComplete}
        onMissionCompleted={handleMissionCompleted}
        onClaimMissionReward={handleClaimMissionReward}
        onClaimSweepBonus={handleClaimSweepBonus}
        onOpenGarage={() => setScreen('GARAGE')}
        onToggleSfx={handleToggleSfx}
        onToggleVoice={handleToggleVoice}
      />
    );
  }

  return (
    <GarageScreen
      save={save}
      onSelectDriver={handleSelectDriver}
      onUnlockDriver={handleUnlockDriver}
      onSelectVehicle={handleSelectVehicle}
      onUnlockVehicle={handleUnlockVehicle}
      onPurchaseUpgrade={handlePurchaseUpgrade}
      onSelectVehicleColor={handleSelectVehicleColor}
      onSelectDriverOutfit={handleSelectDriverOutfit}
      onClaimMissionReward={handleClaimMissionReward}
      onClaimSweepBonus={handleClaimSweepBonus}
      onClaimAllMissions={handleClaimAllMissions}
      onToggleSfx={handleToggleSfx}
      onToggleVoice={handleToggleVoice}
      onStartGame={handleStartGame}
    />
  );
}
