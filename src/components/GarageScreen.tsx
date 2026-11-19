import React, { useState } from 'react';
import {
  Check,
  Coins,
  Flame,
  Gauge,
  Lock,
  MessageSquareQuote,
  Palette,
  Play,
  Shirt,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import {
  ALL_UPGRADE_KEYS,
  DRIVER_OUTFIT_SWATCHES,
  DRIVERS,
  getDriverById,
  getEffectiveVehicleStats,
  getUpgradeCost,
  getVehicleById,
  MAX_UPGRADE_LEVEL,
  UPGRADE_META,
  VEHICLE_PAINT_SWATCHES,
  VEHICLES,
} from '../game/catalog';
import {
  countUnclaimedMissionRewards,
  DAILY_SWEEP_BONUS,
  formatMissionValue,
  getDailyMissionsForDate,
} from '../game/missions';
import { DriverId, SaveData, UpgradeKey, VehicleId } from '../game/types';
import { VehiclePreview } from './VehiclePreview';

type GarageTab = 'vehicles' | 'drivers' | 'upgrades' | 'missions';

interface GarageScreenProps {
  save: SaveData;
  onSelectDriver: (id: DriverId) => void;
  onUnlockDriver: (id: DriverId) => void;
  onSelectVehicle: (id: VehicleId) => void;
  onUnlockVehicle: (id: VehicleId) => void;
  onPurchaseUpgrade: (vehicleId: VehicleId, key: UpgradeKey) => void;
  onSelectVehicleColor: (vehicleId: VehicleId, swatchId: string) => void;
  onSelectDriverOutfit: (driverId: DriverId, swatchId: string) => void;
  onClaimMissionReward: (missionId: string) => void;
  onClaimSweepBonus: () => void;
  onClaimAllMissions: () => void;
  onToggleSfx: () => void;
  onToggleVoice: () => void;
  onStartGame: () => void;
}

export const GarageScreen: React.FC<GarageScreenProps> = ({
  save,
  onSelectDriver,
  onUnlockDriver,
  onSelectVehicle,
  onUnlockVehicle,
  onPurchaseUpgrade,
  onSelectVehicleColor,
  onSelectDriverOutfit,
  onClaimMissionReward,
  onClaimSweepBonus,
  onClaimAllMissions,
  onToggleSfx,
  onToggleVoice,
  onStartGame,
}) => {
  const [activeTab, setActiveTab] = useState<GarageTab>('vehicles');
  const [previewQuote, setPreviewQuote] = useState<string | null>(null);

  const selectedDriver = getDriverById(save.selectedDriver);
  const selectedVehicle = getVehicleById(save.selectedVehicle);
  const currentUpgrades = save.upgrades[save.selectedVehicle];
  const activeVehicleColor = save.vehicleColors[save.selectedVehicle] ?? 'default';
  const activeDriverOutfit = save.driverOutfits[save.selectedDriver] ?? 'default';
  const effectiveStats = getEffectiveVehicleStats(selectedVehicle, currentUpgrades);
  const dailyMissions = getDailyMissionsForDate(save.dailyMissions.dateKey);
  const unclaimedCount = countUnclaimedMissionRewards(save.dailyMissions);
  const completedMissionsCount = dailyMissions.filter(
    (m) => save.dailyMissions.progress[m.id]?.completed
  ).length;
  const allMissionsCompleted = completedMissionsCount === dailyMissions.length;

  const handleTestVoice = () => {
    const line = soundEngine.speakDriverLine(selectedDriver, 'flip', true);
    if (line) setPreviewQuote(line);
  };

  const upgradeKeys: UpgradeKey[] = ALL_UPGRADE_KEYS;

  // Effective rating boosts from upgrades for display
  const speedRating = Math.min(
    100,
    selectedVehicle.ratings.speed + (currentUpgrades.engine - 1) * 2 + (currentUpgrades.turbo - 1) * 2
  );
  const torqueRating = Math.min(
    100,
    selectedVehicle.ratings.torque +
      (currentUpgrades.engine - 1) * 2 +
      (currentUpgrades.tires - 1) * 2 +
      (currentUpgrades.turbo - 1)
  );
  const suspRating = Math.min(
    100,
    selectedVehicle.ratings.suspension + (currentUpgrades.suspension - 1) * 3
  );
  const fuelRating = Math.min(
    100,
    selectedVehicle.ratings.efficiency + (currentUpgrades.fuel - 1) * 4
  );

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Bar (Strict 3-Zone Contract) */}
      <header className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-8 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
        <span className="text-lg sm:text-xl font-extrabold font-display tracking-tight text-white whitespace-nowrap shrink-0">
          VIP Hill Climb
        </span>

        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
          {(
            [
              { id: 'vehicles', label: 'Vehicles' },
              { id: 'drivers', label: 'Drivers' },
              { id: 'upgrades', label: 'Upgrades' },
              {
                id: 'missions',
                label: unclaimedCount > 0 ? `Missions (${unclaimedCount})` : 'Missions',
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : tab.id === 'missions' && unclaimedCount > 0
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={onStartGame}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Drive Now</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Showcase & Active Rig Summary */}
          <section className="lg:col-span-5 flex flex-col gap-5">
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              {/* Rig Bank & Record Strip */}
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-bold tabular-nums text-base">
                  <Coins className="w-4 h-4 shrink-0" />
                  <span>{save.coins.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-sky-400" />
                    Best: {save.bestDistance.toLocaleString()} m
                  </span>
                </div>
              </div>

              {/* Live Animated Canvas Stage */}
              <div className="p-4 bg-slate-950/60 flex flex-col items-center">
                <VehiclePreview
                  driverId={save.selectedDriver}
                  vehicleId={save.selectedVehicle}
                  vehicleColorId={activeVehicleColor}
                  driverOutfitId={activeDriverOutfit}
                  rollcageShields={effectiveStats.rollcageShields}
                  width={440}
                  height={215}
                />
                <div className="mt-3 w-full flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold font-display text-white truncate">
                      {selectedDriver.name} in {selectedVehicle.name}
                    </h1>
                    <p className="text-xs text-slate-400 truncate">
                      {selectedVehicle.subtitle} · Best Run{' '}
                      {save.bestDistanceByVehicle[save.selectedVehicle].toLocaleString()} m
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Hear driver catchphrase"
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400" />
                    <span>Voice</span>
                  </button>
                </div>
                {previewQuote && (
                  <p className="mt-2.5 w-full text-xs italic text-amber-200/90 border-t border-slate-800/80 pt-2">
                    &ldquo;{previewQuote}&rdquo;
                  </p>
                )}
              </div>

              {/* Paint & Outfit Customizer */}
              <div className="px-5 py-3.5 border-t border-slate-800 space-y-3 bg-slate-900/70">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      <span>Vehicle Paint</span>
                    </span>
                    <span className="text-slate-400">
                      {VEHICLE_PAINT_SWATCHES.find((s) => s.id === activeVehicleColor)?.label ?? 'Factory'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {VEHICLE_PAINT_SWATCHES.map((swatch) => {
                      const isSelected = activeVehicleColor === swatch.id;
                      const previewBg = swatch.primary || selectedVehicle.primaryColor;
                      return (
                        <button
                          key={swatch.id}
                          type="button"
                          onClick={() => onSelectVehicleColor(save.selectedVehicle, swatch.id)}
                          title={swatch.label}
                          aria-label={`Vehicle paint ${swatch.label}`}
                          className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'border-amber-400 scale-110'
                              : 'border-slate-700 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: previewBg }}
                        >
                          {swatch.id === 'default' && (
                            <span className="text-[9px] font-bold text-slate-950 bg-white/80 rounded-sm px-0.5 leading-tight">
                              F
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                      <Shirt className="w-3.5 h-3.5 text-sky-400" />
                      <span>Driver Outfit</span>
                    </span>
                    <span className="text-slate-400">
                      {DRIVER_OUTFIT_SWATCHES.find((s) => s.id === activeDriverOutfit)?.label ?? 'Signature'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DRIVER_OUTFIT_SWATCHES.map((swatch) => {
                      const isSelected = activeDriverOutfit === swatch.id;
                      const previewBg = swatch.primary || selectedDriver.defaultOutfitPrimary;
                      return (
                        <button
                          key={swatch.id}
                          type="button"
                          onClick={() => onSelectDriverOutfit(save.selectedDriver, swatch.id)}
                          title={swatch.label}
                          aria-label={`Driver outfit ${swatch.label}`}
                          className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'border-sky-400 scale-110'
                              : 'border-slate-700 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: previewBg }}
                        >
                          {swatch.id === 'default' && (
                            <span className="text-[9px] font-bold text-slate-950 bg-white/80 rounded-sm px-0.5 leading-tight">
                              S
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Performance Spec Bars */}
              <div className="px-5 py-4 space-y-3 border-t border-slate-800">
                <StatBar label="Top Speed" value={speedRating} accent="bg-amber-400" />
                <StatBar label="Climb Torque" value={torqueRating} accent="bg-emerald-400" />
                <StatBar label="Suspension" value={suspRating} accent="bg-sky-400" />
                <StatBar label="Fuel Range" value={fuelRating} accent="bg-orange-400" />
                {selectedVehicle.hasJetThruster && (
                  <div className="pt-2 flex items-center gap-2 text-xs text-sky-300 border-t border-slate-800/70">
                    <Flame className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      Hold Gas to ignite jet afterburner and glide across canyons (higher fuel burn).
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls & Audio Strip */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">Controls & Audio</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleSfx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      save.sfxEnabled
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {save.sfxEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    <span>SFX {save.sfxEnabled ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleVoice}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      save.voiceEnabled
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <MessageSquareQuote
                      className={`w-3.5 h-3.5 ${save.voiceEnabled ? 'text-amber-400' : 'text-slate-500'}`}
                    />
                    <span>Voices {save.voiceEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-400 leading-relaxed flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <strong className="text-slate-200">Gas / Tilt Forward:</strong> Right Arrow, D, or Right Pedal
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-slate-200">Brake / Tilt Back:</strong> Left Arrow, A, or Left Pedal
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Vehicles / Drivers / Upgrades Workspace */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            {activeTab === 'vehicles' && (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-bold font-display text-white">Luxury Fleet</h2>
                  <span className="text-xs text-slate-400">
                    {save.unlockedVehicles.length} of {VEHICLES.length} unlocked
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {VEHICLES.map((v) => {
                    const unlocked = save.unlockedVehicles.includes(v.id);
                    const selected = save.selectedVehicle === v.id;
                    const canAfford = save.coins >= v.cost;

                    return (
                      <div
                        key={v.id}
                        className={`rounded-xl bg-slate-900 border transition-colors overflow-hidden flex flex-col ${
                          selected
                            ? 'border-amber-500'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="p-3 bg-slate-950/50">
                          <VehiclePreview
                            driverId={save.selectedDriver}
                            vehicleId={v.id}
                            vehicleColorId={save.vehicleColors[v.id] ?? 'default'}
                            driverOutfitId={activeDriverOutfit}
                            width={300}
                            height={132}
                            animate={selected}
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-base font-bold font-display text-white">
                                {v.name}
                              </h3>
                              <span className="text-xs font-mono text-slate-400">
                                {v.driveType}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                              {v.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                            {unlocked ? (
                              selected ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                                  <Check className="w-4 h-4" />
                                  Selected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onSelectVehicle(v.id)}
                                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                                >
                                  Select Vehicle
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => onUnlockVehicle(v.id)}
                                className={`w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                                  canAfford
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Unlock · {v.cost.toLocaleString()}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'drivers' && (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-bold font-display text-white">VIP Drivers</h2>
                  <span className="text-xs text-slate-400">
                    {save.unlockedDrivers.length} of {DRIVERS.length} unlocked
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DRIVERS.map((d) => {
                    const unlocked = save.unlockedDrivers.includes(d.id);
                    const selected = save.selectedDriver === d.id;
                    const canAfford = save.coins >= d.cost;

                    return (
                      <div
                        key={d.id}
                        className={`rounded-xl bg-slate-900 border transition-colors overflow-hidden flex flex-col ${
                          selected
                            ? 'border-amber-500'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="p-3 bg-slate-950/50 flex justify-center">
                          <VehiclePreview
                            driverId={d.id}
                            vehicleId={save.selectedVehicle}
                            driverOutfitId={save.driverOutfits[d.id] ?? 'default'}
                            mode="driver"
                            width={180}
                            height={128}
                            animate={selected}
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex items-baseline justify-between gap-2">
                              <h3 className="text-base font-bold font-display text-white">
                                {d.name}
                              </h3>
                              <span className="text-xs text-slate-400 truncate">{d.title}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                              {d.tagline}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800">
                            {unlocked ? (
                              selected ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                                  <Check className="w-4 h-4" />
                                  In Driver Seat
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onSelectDriver(d.id)}
                                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                                >
                                  Select Driver
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => onUnlockDriver(d.id)}
                                className={`w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                                  canAfford
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Unlock · {d.cost.toLocaleString()}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'upgrades' && (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold font-display text-white">
                      Tuning Shop · {selectedVehicle.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Upgrades are saved per vehicle in local storage.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 tabular-nums">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      Lv{' '}
                      {ALL_UPGRADE_KEYS.reduce((acc, k) => acc + (currentUpgrades[k] ?? 1), 0)}/
                      {MAX_UPGRADE_LEVEL * ALL_UPGRADE_KEYS.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {upgradeKeys.map((key) => {
                    const meta = UPGRADE_META[key];
                    const level = currentUpgrades[key];
                    const isMax = level >= MAX_UPGRADE_LEVEL;
                    const cost = getUpgradeCost(key, level);
                    const canAfford = !isMax && save.coins >= cost;

                    return (
                      <div
                        key={key}
                        className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                              <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>{meta.label}</span>
                            </h3>
                            <span className="text-xs font-mono tabular-nums text-slate-300">
                              Lv {level} / {MAX_UPGRADE_LEVEL}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{meta.shortDesc}</p>

                          {/* Segmented Level Progress Bar */}
                          <div className="mt-3 grid grid-cols-10 gap-1">
                            {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-2 rounded-sm transition-colors ${
                                  idx < level ? 'bg-amber-400' : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="sm:w-40 shrink-0">
                          {isMax ? (
                            <div className="w-full py-2.5 px-3 rounded-lg bg-slate-800/70 text-emerald-400 text-xs font-bold text-center">
                              Maxed Out
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAfford}
                              onClick={() => onPurchaseUpgrade(save.selectedVehicle, key)}
                              className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold font-mono tabular-nums transition-all whitespace-nowrap ${
                                canAfford
                                  ? 'bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 cursor-pointer'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>{cost.toLocaleString()}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'missions' && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold font-display text-white">Daily Missions</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Complete goals in a single run to earn bonus coins · Resets daily ({save.dailyMissions.dateKey})
                    </p>
                  </div>
                  {unclaimedCount > 1 && (
                    <button
                      type="button"
                      onClick={onClaimAllMissions}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Claim All ({unclaimedCount})</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {dailyMissions.map((m) => {
                    const prog = save.dailyMissions.progress[m.id] ?? {
                      bestAttempt: 0,
                      completed: false,
                      claimed: false,
                    };
                    const bestVal = prog.completed ? m.target : Math.min(prog.bestAttempt, m.target);
                    const pct = Math.min(100, (bestVal / m.target) * 100);

                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl bg-slate-900 border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          prog.completed && !prog.claimed
                            ? 'border-emerald-500/60'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                              <Target
                                className={`w-4 h-4 shrink-0 ${
                                  prog.completed ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              />
                              <span>{m.title}</span>
                            </h3>
                            <span className="text-xs font-mono tabular-nums text-amber-400 font-bold shrink-0">
                              +{m.reward.toLocaleString()} coins
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{m.description}</p>

                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400 mb-1">
                              <span>{prog.completed ? 'Goal completed' : 'Best single-run attempt'}</span>
                              <span className="text-slate-200">
                                {formatMissionValue(m.metric, bestVal, m.unit)} /{' '}
                                {formatMissionValue(m.metric, m.target, m.unit)}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  prog.completed ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="sm:w-36 shrink-0">
                          {prog.completed && !prog.claimed ? (
                            <button
                              type="button"
                              onClick={() => onClaimMissionReward(m.id)}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 text-xs font-bold font-mono tabular-nums transition-all whitespace-nowrap cursor-pointer"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Claim +{m.reward}</span>
                            </button>
                          ) : prog.claimed ? (
                            <div className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-800/70 text-emerald-400 text-xs font-bold">
                              <Check className="w-3.5 h-3.5" />
                              <span>Claimed</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={onStartGame}
                              className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Drive to Earn
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Daily Sweep Completion Bonus */}
                  <div
                    className={`rounded-xl bg-slate-900 border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      allMissionsCompleted && !save.dailyMissions.sweepBonusClaimed
                        ? 'border-amber-500'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Daily Sweep Bonus</span>
                        </h3>
                        <span className="text-xs font-mono tabular-nums text-amber-400 font-bold shrink-0">
                          +{DAILY_SWEEP_BONUS.toLocaleString()} coins
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Finish all 3 daily missions today to unlock an extra coin payout.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2 text-xs font-mono tabular-nums text-slate-300">
                        <span>
                          {completedMissionsCount} / {dailyMissions.length} missions completed
                        </span>
                      </div>
                    </div>

                    <div className="sm:w-36 shrink-0">
                      {allMissionsCompleted && !save.dailyMissions.sweepBonusClaimed ? (
                        <button
                          type="button"
                          onClick={onClaimSweepBonus}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-xs font-bold font-mono tabular-nums transition-all whitespace-nowrap cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Claim +{DAILY_SWEEP_BONUS}</span>
                        </button>
                      ) : save.dailyMissions.sweepBonusClaimed ? (
                        <div className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-800/70 text-emerald-400 text-xs font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Claimed</span>
                        </div>
                      ) : (
                        <div className="w-full py-2.5 px-3 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-500 text-xs font-semibold text-center">
                          Locked
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

const StatBar: React.FC<{ label: string; value: number; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <div>
    <div className="flex items-center justify-between text-xs mb-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono tabular-nums text-slate-200 font-semibold">{value}</span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-transform origin-left ${accent}`}
        style={{ width: `${Math.min(100, Math.max(4, value))}%` }}
      />
    </div>
  </div>
);
