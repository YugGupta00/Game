import React from 'react';
import { Check, Coins, Flag, RotateCcw, Target, Trophy, Wrench } from 'lucide-react';
import {
  DAILY_SWEEP_BONUS,
  formatMissionValue,
  getDailyMissionsForDate,
  getMetricValueFromRun,
} from '../game/missions';
import { DailyMissionState, RunSummary } from '../game/types';

interface GameOverModalProps {
  summary: RunSummary;
  driverName: string;
  vehicleName: string;
  quote: string | null;
  totalBankCoins: number;
  dailyMissions: DailyMissionState;
  onClaimMissionReward: (missionId: string) => void;
  onClaimSweepBonus: () => void;
  onRestart: () => void;
  onOpenGarage: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  driverName,
  vehicleName,
  quote,
  totalBankCoins,
  dailyMissions,
  onClaimMissionReward,
  onClaimSweepBonus,
  onRestart,
  onOpenGarage,
}) => {
  const isOutOfFuel = summary.reason === 'out_of_fuel';
  const missions = getDailyMissionsForDate(dailyMissions.dateKey);
  const allCompleted = missions.every((m) => dailyMissions.progress[m.id]?.completed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400">
                {driverName} · {vehicleName}
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
                {isOutOfFuel ? 'Out of Fuel' : 'Driver Down'}
              </h2>
            </div>
            {summary.isNewBest && (
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-sm shrink-0">
                <Trophy className="w-4 h-4" />
                <span>New Record</span>
              </div>
            )}
          </div>
          {quote && (
            <p className="mt-2.5 text-sm italic text-slate-300 leading-relaxed">
              &ldquo;{quote}&rdquo;
            </p>
          )}
        </div>

        {/* Scrollable Body: Distance, Coins & Daily Missions */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Flag className="w-3.5 h-3.5 text-sky-400" />
                <span>Distance</span>
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-white">
                {summary.distance.toLocaleString()} m
              </div>
              <div className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
                Best: {Math.max(summary.distance, summary.previousBest).toLocaleString()} m
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Coins Earned</span>
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-400">
                +{summary.totalCoins.toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
                Bank: {totalBankCoins.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-sm border-t border-slate-800 pt-3.5">
            <div className="flex items-center justify-between text-slate-300">
              <span>Road Coins</span>
              <span className="font-mono tabular-nums font-medium">
                +{summary.roadCoins.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Flips ({summary.flips})</span>
              <span className="font-mono tabular-nums font-medium text-amber-300">
                +{summary.flipBonusCoins.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Air Time Bonus</span>
              <span className="font-mono tabular-nums font-medium text-sky-300">
                +{summary.airBonusCoins.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Daily Missions Strip */}
          <div className="border-t border-slate-800 pt-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily Missions</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {missions.filter((m) => dailyMissions.progress[m.id]?.completed).length}/{missions.length} done
              </span>
            </div>

            <div className="space-y-2">
              {missions.map((m) => {
                const prog = dailyMissions.progress[m.id];
                const runVal = getMetricValueFromRun(m.metric, summary.metrics);
                const isCompleted = Boolean(prog?.completed);
                const isClaimed = Boolean(prog?.claimed);
                const justCompleted = summary.completedMissionIds.includes(m.id);

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${
                      justCompleted || (isCompleted && !isClaimed)
                        ? 'bg-emerald-950/35 border-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate">{m.title}</div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400">
                        {isCompleted
                          ? 'Completed'
                          : `This run: ${formatMissionValue(m.metric, Math.min(runVal, m.target), m.unit)} / ${formatMissionValue(m.metric, m.target, m.unit)}`}
                      </div>
                    </div>

                    {isCompleted && !isClaimed ? (
                      <button
                        type="button"
                        onClick={() => onClaimMissionReward(m.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Coins className="w-3 h-3" />
                        <span>Claim +{m.reward}</span>
                      </button>
                    ) : isClaimed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold whitespace-nowrap shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>Claimed</span>
                      </span>
                    ) : (
                      <span className="font-mono tabular-nums text-amber-400/90 font-semibold whitespace-nowrap shrink-0">
                        +{m.reward}
                      </span>
                    )}
                  </div>
                );
              })}

              {allCompleted && !dailyMissions.sweepBonusClaimed && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border bg-amber-950/35 border-amber-500/50 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-amber-300">Daily Sweep Bonus</div>
                    <div className="text-[11px] text-amber-200/80">All 3 daily missions complete</div>
                  </div>
                  <button
                    type="button"
                    onClick={onClaimSweepBonus}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Coins className="w-3 h-3" />
                    <span>Claim +{DAILY_SWEEP_BONUS}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenGarage}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-100 font-semibold text-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Garage & Upgrades</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Drive Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
