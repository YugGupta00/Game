import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Coins,
  Flag,
  Flame,
  Fuel,
  MessageSquareQuote,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Target,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { soundEngine } from '../game/audio';
import { getDriverById, getVehicleById } from '../game/catalog';
import {
  formatMissionValue,
  getDailyMissionsForDate,
  getMetricValueFromRun,
} from '../game/missions';
import { GameSimulation } from '../game/physics';
import { renderGameScene } from '../game/renderer';
import { HudSnapshot, InputState, RunMetrics, RunSummary, SaveData } from '../game/types';
import { GameOverModal } from './GameOverModal';
import { RpmGauge } from './RpmGauge';

interface GameCanvasProps {
  save: SaveData;
  onRunComplete: (summary: RunSummary) => void;
  onMissionCompleted: (missionId: string, achievedValue: number) => void;
  onClaimMissionReward: (missionId: string) => void;
  onClaimSweepBonus: () => void;
  onOpenGarage: () => void;
  onToggleSfx: () => void;
  onToggleVoice: () => void;
}

const EMPTY_RUN_METRICS: RunMetrics = {
  distance: 0,
  backflips: 0,
  frontflips: 0,
  flips: 0,
  totalAirTime: 0,
  coinsCollectedCount: 0,
  fuelPickupsCount: 0,
  maxSpeedKmh: 0,
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  save,
  onRunComplete,
  onMissionCompleted,
  onClaimMissionReward,
  onClaimSweepBonus,
  onOpenGarage,
  onToggleSfx,
  onToggleVoice,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<GameSimulation | null>(null);
  const inputRef = useRef<InputState>({ gas: false, brake: false });
  const pausedRef = useRef<boolean>(false);
  const runReportedRef = useRef<boolean>(false);
  const cameraRef = useRef<{ x: number; y: number; zoom: number }>({ x: 100, y: 340, zoom: 1 });
  const quoteTimerRef = useRef<number | null>(null);
  const dailyMissionsRef = useRef(save.dailyMissions);
  const completedThisRunRef = useRef<Set<string>>(new Set());

  dailyMissionsRef.current = save.dailyMissions;

  const [paused, setPaused] = useState(false);
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [crashQuote, setCrashQuote] = useState<string | null>(null);
  const [runId, setRunId] = useState(1);

  const vehicle = getVehicleById(save.selectedVehicle);
  const driver = getDriverById(save.selectedDriver);
  const upgrades = save.upgrades[save.selectedVehicle];

  const [hud, setHud] = useState<HudSnapshot>({
    fuel: 100,
    rpm: 0.12,
    speedKmh: 0,
    distance: 0,
    bestDistance: save.bestDistance,
    runCoins: 0,
    totalBankCoins: save.coins,
    jetActive: false,
    hasJet: vehicle.hasJetThruster,
    lowFuel: false,
    airTime: 0,
    rollcageShields: 0,
    runMetrics: EMPTY_RUN_METRICS,
  });

  const showVoiceCaption = useCallback((line: string | null) => {
    if (!line) return;
    setActiveQuote(line);
    if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = window.setTimeout(() => {
      setActiveQuote(null);
    }, 2800);
  }, []);

  const handleRestart = useCallback(() => {
    soundEngine.cancelSpeech();
    setRunSummary(null);
    setCrashQuote(null);
    setPaused(false);
    pausedRef.current = false;
    inputRef.current = { gas: false, brake: false };
    setGasPressed(false);
    setBrakePressed(false);
    setRunId((n) => n + 1);
  }, []);

  const togglePause = useCallback(() => {
    if (runSummary) return;
    setPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      if (next) {
        inputRef.current = { gas: false, brake: false };
        setGasPressed(false);
        setBrakePressed(false);
        soundEngine.updateEngine(0, false, 0, true);
      }
      return next;
    });
  }, [runSummary]);

  // Keep soundEngine settings synced
  useEffect(() => {
    soundEngine.setSettings(save.sfxEnabled, save.voiceEnabled);
  }, [save.sfxEnabled, save.voiceEnabled]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        inputRef.current.gas = true;
        setGasPressed(true);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        inputRef.current.brake = true;
        setBrakePressed(true);
      } else if (e.code === 'KeyR' && !e.repeat) {
        e.preventDefault();
        handleRestart();
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        e.preventDefault();
        togglePause();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.gas = false;
        setGasPressed(false);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.brake = false;
        setBrakePressed(false);
      }
    };

    const onBlur = () => {
      inputRef.current = { gas: false, brake: false };
      setGasPressed(false);
      setBrakePressed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleRestart, togglePause]);

  // Main Simulation & Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vehicleColorId = save.vehicleColors[save.selectedVehicle] ?? 'default';
    const driverOutfitId = save.driverOutfits[save.selectedDriver] ?? 'default';
    const sim = new GameSimulation(vehicle, driver, upgrades, vehicleColorId, driverOutfitId);
    simRef.current = sim;
    runReportedRef.current = false;
    completedThisRunRef.current = new Set();

    cameraRef.current = {
      x: sim.state.x + 110,
      y: sim.state.y - 25,
      zoom: 1,
    };

    soundEngine.startEngine(vehicle.engineTone);
    const introLine = soundEngine.speakDriverLine(driver, 'start', false);
    if (introLine) showVoiceCaption(introLine);

    let rafId = 0;
    let lastTime = performance.now();
    let lastHudSync = 0;
    const startTime = lastTime;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
    };
    resize();
    window.addEventListener('resize', resize);

    const physicsEvents = {
      onCoinPickup: () => {
        soundEngine.playCoin();
      },
      onFuelPickup: () => {
        soundEngine.playFuelPickup();
        const line = soundEngine.speakDriverLine(driver, 'fuelPickup', false);
        showVoiceCaption(line);
      },
      onFlip: () => {
        soundEngine.playStuntFanfare();
        const line = soundEngine.speakDriverLine(driver, 'flip', false);
        showVoiceCaption(line);
      },
      onAirTime: () => {
        soundEngine.playStuntFanfare();
        const line = soundEngine.speakDriverLine(driver, 'airtime', false);
        showVoiceCaption(line);
      },
      onLowFuel: () => {
        const line = soundEngine.speakDriverLine(driver, 'lowFuel', false);
        showVoiceCaption(line);
      },
      onRollcageSave: () => {
        soundEngine.playUpgradeClick();
      },
      onCrash: (reason: 'driver_down' | 'out_of_fuel') => {
        if (reason === 'driver_down') {
          soundEngine.playCrash();
        }
        soundEngine.updateEngine(0, false, 0, true);
        const line = soundEngine.speakDriverLine(driver, 'crash', true);
        setCrashQuote(line);
        showVoiceCaption(line);
      },
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeSec = (now - startTime) / 1000;

      if (!pausedRef.current) {
        sim.step(dt, inputRef.current, physicsEvents);
        const s = sim.state;
        const currentMetrics = sim.getRunMetrics();

        // Check live single-run Daily Mission completion
        const activeMissionState = dailyMissionsRef.current;
        const todaysMissions = getDailyMissionsForDate(activeMissionState.dateKey);
        for (let i = 0; i < todaysMissions.length; i++) {
          const mission = todaysMissions[i];
          const prog = activeMissionState.progress[mission.id];
          if (prog?.completed || completedThisRunRef.current.has(mission.id)) continue;
          const val = getMetricValueFromRun(mission.metric, currentMetrics);
          if (val >= mission.target) {
            completedThisRunRef.current.add(mission.id);
            soundEngine.playStuntFanfare();
            sim.spawnPopup(
              'MISSION COMPLETE!',
              '#34D399',
              false,
              0.5,
              0.33,
              `${mission.title} · +${mission.reward} COINS`
            );
            onMissionCompleted(mission.id, val);
          }
        }

        // Update continuous Web Audio engine & low fuel beep
        soundEngine.updateEngine(
          s.rpm,
          inputRef.current.gas,
          s.jetHeat,
          s.fuel <= 0 || s.crashed
        );
        if (!s.crashed && s.fuel > 0 && s.fuel < 20) {
          soundEngine.playLowFuelBeep();
        }

        // Report Game Over cleanly after a short 0.85s dramatic freeze so player sees the crash
        if (s.crashed && !runReportedRef.current && s.crashFreezeTimer >= 0.82) {
          runReportedRef.current = true;
          const totalCoins = s.roadCoins + s.flipBonusCoins + s.airBonusCoins;
          const summary: RunSummary = {
            distance: s.maxDistanceMeters,
            isNewBest: s.maxDistanceMeters > save.bestDistance,
            previousBest: save.bestDistance,
            roadCoins: s.roadCoins,
            flipBonusCoins: s.flipBonusCoins,
            airBonusCoins: s.airBonusCoins,
            totalCoins,
            flips: s.flipsThisRun,
            metrics: currentMetrics,
            completedMissionIds: Array.from(completedThisRunRef.current),
            reason: s.crashReason ?? 'driver_down',
          };
          setRunSummary(summary);
          onRunComplete(summary);
        }

        // Smooth camera tracking with velocity look-ahead & dynamic zoom on big air / high speed
        const cam = cameraRef.current;
        const lookAheadX = Math.max(70, Math.min(220, 95 + s.vx * 0.22));
        const targetCamX = s.x + lookAheadX;
        const targetCamY = s.y - 26;
        cam.x += (targetCamX - cam.x) * Math.min(1, dt * 6.5);
        cam.y += (targetCamY - cam.y) * Math.min(1, dt * 5.2);

        const parentW = canvas.parentElement?.clientWidth ?? 1280;
        const baseScale = parentW < 640 ? 0.68 : parentW < 1024 ? 0.84 : 0.96;
        const speedZoomOut = Math.min(0.18, (Math.hypot(s.vx, s.vy) / 850) * 0.16);
        const airZoomOut = Math.min(0.12, s.airTime * 0.06);
        const targetZoom = baseScale * (1 - speedZoomOut - airZoomOut);
        cam.zoom += (targetZoom - cam.zoom) * Math.min(1, dt * 3.5);
      }

      // Draw frame
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      ctx.save();
      ctx.scale(dpr, dpr);
      renderGameScene(
        ctx,
        cssW,
        cssH,
        sim,
        cameraRef.current.x,
        cameraRef.current.y,
        timeSec,
        cameraRef.current.zoom
      );
      ctx.restore();

      // Throttle React HUD updates to ~20fps for zero jank
      if (now - lastHudSync > 50) {
        lastHudSync = now;
        const s = sim.state;
        setHud({
          fuel: s.fuel,
          rpm: s.rpm,
          speedKmh: s.speedKmh,
          distance: s.maxDistanceMeters,
          bestDistance: Math.max(save.bestDistance, s.maxDistanceMeters),
          runCoins: s.roadCoins + s.flipBonusCoins + s.airBonusCoins,
          totalBankCoins: save.coins + s.roadCoins + s.flipBonusCoins + s.airBonusCoins,
          jetActive: s.jetActive,
          hasJet: vehicle.hasJetThruster,
          lowFuel: s.fuel < 22 && s.fuel > 0,
          airTime: s.airTime,
          rollcageShields: s.rollcageShields,
          runMetrics: sim.getRunMetrics(),
        });
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      soundEngine.stopEngine();
      if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
    };
    // Re-initialize run only when runId or selected rig changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, save.selectedDriver, save.selectedVehicle]);

  const setGas = (pressed: boolean) => {
    if (pausedRef.current) return;
    inputRef.current.gas = pressed;
    setGasPressed(pressed);
  };

  const setBrake = (pressed: boolean) => {
    if (pausedRef.current) return;
    inputRef.current.brake = pressed;
    setBrakePressed(pressed);
  };

  const fuelPct = Math.round(hud.fuel);
  const fuelBarColor =
    fuelPct <= 20 ? 'bg-red-500' : fuelPct <= 45 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="relative h-full w-full overflow-hidden bg-sky-900 select-none">
      {/* Live HTML5 Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />

      {/* Top HUD Bar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 p-3 sm:p-4 flex items-start justify-between gap-3">
        {/* Left: Fuel Gauge, Coins, Distance & Live Daily Goals */}
        <div className="pointer-events-auto flex flex-col gap-2 min-w-[205px] sm:min-w-[255px]">
          <div className="flex flex-col gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-700/70 rounded-xl px-3.5 py-2.5 shadow-lg">
            {/* Fuel Bar */}
            <div>
              <div className="flex items-center justify-between gap-2 text-xs mb-1">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                  <Fuel className={`w-3.5 h-3.5 ${hud.lowFuel ? 'text-red-400' : 'text-emerald-400'}`} />
                  <span>Fuel</span>
                  {hud.lowFuel && (
                    <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      LOW
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-100">{fuelPct}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${fuelBarColor}`}
                  style={{ width: `${Math.max(0, Math.min(100, hud.fuel))}%` }}
                />
              </div>
            </div>

            {/* Distance, Armor & Coins */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80 text-xs sm:text-sm font-mono tabular-nums">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Flag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{hud.distance.toLocaleString()} m</span>
              </div>
              {hud.rollcageShields > 0 && (
                <div
                  className="flex items-center gap-1 text-sky-300 font-bold text-xs"
                  title="Roll Cage Armor Shields Remaining"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>{hud.rollcageShields}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Coins className="w-3.5 h-3.5 shrink-0" />
                <span>{hud.totalBankCoins.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Compact Live Daily Missions Tracker (hides automatically once all 3 are complete) */}
          {(() => {
            const incomplete = getDailyMissionsForDate(save.dailyMissions.dateKey).filter(
              (m) => !save.dailyMissions.progress[m.id]?.completed
            );
            if (incomplete.length === 0) return null;
            return (
              <div className="hidden sm:flex flex-col gap-1.5 bg-slate-950/72 backdrop-blur-md border border-slate-700/60 rounded-lg px-3 py-2 shadow-md">
                {incomplete.map((m) => {
                  const val = getMetricValueFromRun(m.metric, hud.runMetrics);
                  const pct = Math.min(100, (val / m.target) * 100);
                  return (
                    <div key={m.id} className="space-y-0.5">
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-slate-200 font-medium truncate">
                          <Target className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </span>
                        <span className="font-mono tabular-nums text-slate-300 shrink-0">
                          {formatMissionValue(m.metric, Math.min(val, m.target), m.unit)}/{m.target}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-100"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Center Voice Speech Caption (appears briefly on funny one-liners) */}
        {activeQuote && !runSummary && (
          <div className="hidden md:flex items-center gap-2 max-w-md bg-slate-950/80 backdrop-blur-md border border-slate-700/70 rounded-lg px-3.5 py-2 text-xs text-amber-100 shadow-lg">
            <MessageSquareQuote className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong className="text-amber-400 mr-1.5">{driver.name}:</strong>
              &ldquo;{activeQuote}&rdquo;
            </span>
          </div>
        )}

        {/* Right: Audio, Restart, Pause/Garage */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleSfx}
            aria-label={save.sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="w-10 h-10 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
          >
            {save.sfxEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleVoice}
            aria-label={save.voiceEnabled ? 'Mute driver voice' : 'Enable driver voice'}
            className="w-10 h-10 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
          >
            <MessageSquareQuote
              className={`w-4 h-4 ${save.voiceEnabled ? 'text-amber-400' : 'text-slate-500'}`}
            />
          </button>

          <button
            type="button"
            onClick={handleRestart}
            aria-label="Restart run"
            className="w-10 h-10 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? 'Resume game' : 'Pause game'}
            className="h-10 px-3 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700/70 inline-flex items-center gap-1.5 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Controls: Brake Pedal, Analog RPM Gauge, Gas Pedal */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 p-3 sm:p-5 flex items-end justify-between gap-3">
        {/* Brake / Tilt Back Pedal */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setBrake(true);
          }}
          onPointerUp={() => setBrake(false)}
          onPointerCancel={() => setBrake(false)}
          className={`pointer-events-auto touch-none w-24 h-24 sm:w-32 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-1 shadow-xl transition-transform cursor-pointer ${
            brakePressed
              ? 'bg-red-600/90 border-red-300 text-white scale-95 translate-y-1'
              : 'bg-slate-950/80 border-slate-600 text-slate-100 hover:border-red-400'
          }`}
        >
          <span className="text-base sm:text-lg font-extrabold font-display tracking-wide">
            BRAKE
          </span>
          <span className="text-[11px] font-mono text-slate-300">Tilt Back · A / ←</span>
        </button>

        {/* Center Analog RPM Speedometer Dial */}
        <div className="flex flex-col items-center">
          {hud.hasJet && hud.jetActive && (
            <div className="mb-1 inline-flex items-center gap-1 text-xs font-bold font-mono text-sky-300 bg-slate-950/80 border border-sky-500/60 px-2.5 py-0.5 rounded-md">
              <Flame className="w-3.5 h-3.5 text-sky-400" />
              <span>JET BOOST</span>
            </div>
          )}
          <RpmGauge
            rpm={hud.rpm}
            speedKmh={hud.speedKmh}
            jetActive={hud.jetActive}
            hasJet={hud.hasJet}
          />
        </div>

        {/* Gas / Tilt Forward Pedal */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setGas(true);
          }}
          onPointerUp={() => setGas(false)}
          onPointerCancel={() => setGas(false)}
          className={`pointer-events-auto touch-none w-24 h-24 sm:w-32 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-1 shadow-xl transition-transform cursor-pointer ${
            gasPressed
              ? hud.hasJet
                ? 'bg-sky-500/95 border-sky-200 text-slate-950 scale-95 translate-y-1'
                : 'bg-emerald-500/95 border-emerald-200 text-slate-950 scale-95 translate-y-1'
              : 'bg-slate-950/80 border-slate-600 text-slate-100 hover:border-emerald-400'
          }`}
        >
          <span className="text-base sm:text-lg font-extrabold font-display tracking-wide">
            {hud.hasJet ? 'GAS / JET' : 'GAS'}
          </span>
          <span
            className={`text-[11px] font-mono ${
              gasPressed ? 'text-slate-900 font-semibold' : 'text-slate-300'
            }`}
          >
            Tilt Fwd · D / →
          </span>
        </button>
      </div>

      {/* Pause Overlay */}
      {paused && !runSummary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5">
            <div>
              <p className="text-xs text-slate-400">
                {driver.name} · {vehicle.name}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold font-display text-white">Game Paused</h2>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Driving</span>
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Run</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.cancelSpeech();
                  onOpenGarage();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>Back to Garage</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {runSummary && (
        <GameOverModal
          summary={runSummary}
          driverName={driver.name}
          vehicleName={vehicle.name}
          quote={crashQuote}
          totalBankCoins={save.coins}
          dailyMissions={save.dailyMissions}
          onClaimMissionReward={onClaimMissionReward}
          onClaimSweepBonus={onClaimSweepBonus}
          onRestart={handleRestart}
          onOpenGarage={() => {
            soundEngine.cancelSpeech();
            onOpenGarage();
          }}
        />
      )}
    </div>
  );
};
