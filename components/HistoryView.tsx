'use client';

import React, { useState } from 'react';
import {
  History,
  Calendar,
  ChevronDown,
  ChevronRight,
  Check,
  Coins,
  BarChart3,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { formatReadableDate, getTodayDateString } from '@/lib/storage';

export const HistoryView: React.FC = () => {
  const {
    historyDates,
    getTasksForDate,
    weeklyBountyHistory,
    currentWeekBountyPool,
    getDateBountyTotal,
    getTaskBountyValue,
    isTaskBonus,
  } = useTaskContext();
  const todayStr = getTodayDateString();
  const pastDates = historyDates.filter((d) => d !== todayStr);

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => {
    // Expand the most recent past date by default
    if (pastDates.length > 0) {
      return { [pastDates[0]]: true };
    }
    return {};
  });

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const maxWeeklyEarned = Math.max(
    ...weeklyBountyHistory.map((w) => w.totalAmount),
    100 // minimum scale of $100 so bars look proportional
  );

  const totalAllTimeShown = weeklyBountyHistory.reduce((sum, w) => sum + w.totalAmount, 0);
  const bestWeekEarned = Math.max(...weeklyBountyHistory.map((w) => w.totalAmount), 0);

  return (
    <div className="space-y-4">
      {/* Overview header card */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-800 text-emerald-400 border border-slate-700">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sheriff&apos;s Ledger (Archive)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Weekly bounty earnings chart and past capture records.
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Bounty Collection Chart Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Weekly Bounty Collected
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bounty pool resets every Sunday at End of Day (Mon–Sun weeks)
              </p>
            </div>
          </div>

          {/* Summary KPI Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-xs">
              <span className="text-slate-500 dark:text-slate-400 mr-1">This Week:</span>
              <strong className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                ${currentWeekBountyPool}
              </strong>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 text-xs flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-500 dark:text-slate-400">Best:</span>
              <strong className="text-amber-800 dark:text-amber-300 font-extrabold">
                ${bestWeekEarned}
              </strong>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-xs flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-slate-500 dark:text-slate-400">8-Wk Total:</span>
              <strong className="text-slate-800 dark:text-slate-100 font-extrabold">
                ${totalAllTimeShown}
              </strong>
            </div>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="pt-4 pb-1 px-1">
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2.5 items-end h-44 pt-6 border-b border-slate-200 dark:border-slate-700/80 pb-2">
            {weeklyBountyHistory.map((week) => {
              const isCurrentWeek = week.isCurrentWeek;
              const heightPercent =
                week.totalAmount > 0
                  ? Math.max(Math.round((week.totalAmount / maxWeeklyEarned) * 100), 10)
                  : 4;

              return (
                <div
                  key={week.weekStart}
                  className="flex flex-col items-center justify-end h-full group relative"
                  title={`${week.label}: $${week.totalAmount} collected (${week.tasksCount} ${
                    week.tasksCount === 1 ? 'capture' : 'captures'
                  })`}
                >
                  {/* Dollar Amount Label Above Bar */}
                  <span
                    className={`text-[10px] sm:text-xs font-extrabold mb-1 transition-transform group-hover:-translate-y-0.5 ${
                      week.totalAmount > 0
                        ? isCurrentWeek
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    ${week.totalAmount}
                  </span>

                  {/* Bar */}
                  <div className="w-full max-w-[38px] flex-1 flex items-end justify-center">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        week.totalAmount === 0
                          ? 'bg-slate-200 dark:bg-slate-700/60'
                          : isCurrentWeek
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm shadow-emerald-500/20'
                          : 'bg-gradient-to-t from-amber-600 to-amber-400 dark:from-amber-600 dark:to-amber-400 opacity-85 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2.5 pt-2 text-center">
            {weeklyBountyHistory.map((week) => {
              const isCurrentWeek = week.isCurrentWeek;
              // Compact label for mobile, full range on hover
              const shortLabel = week.weekStart.slice(5).replace('-', '/');
              return (
                <div key={week.weekStart} className="flex flex-col items-center min-w-0">
                  <span
                    className={`text-[10px] font-bold truncate max-w-full ${
                      isCurrentWeek
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isCurrentWeek ? 'This Wk' : shortLabel}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline truncate max-w-full">
                    {week.tasksCount} {week.tasksCount === 1 ? 'capture' : 'captures'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {pastDates.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            No past daily logs in the archive yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            As you round up Most Wanted targets day after day, your daily capture logs will archive here!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastDates.map((date) => {
            const tasks = getTasksForDate(date);
            const completed = tasks.filter((t) => t.completed).length;
            const total = tasks.length;
            const dateBounty = getDateBountyTotal(date);
            const isExpanded = !!expandedDates[date];

            return (
              <div
                key={date}
                className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(date)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {formatReadableDate(date)}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {completed} of {total} captured ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {dateBounty > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                        <Coins className="w-3 h-3 text-emerald-500" />
                        <span>+${dateBounty}</span>
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                    {tasks.map((task) => {
                      const val = getTaskBountyValue(task);
                      const bonus = isTaskBonus(task);
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between gap-2.5 p-2 rounded-xl text-xs sm:text-sm ${
                            task.completed
                              ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-500'
                              : 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center text-white shrink-0 ${
                                task.completed ? 'bg-emerald-500' : 'border border-amber-400'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </div>
                            <span className={`break-words ${task.completed ? 'line-through' : ''}`}>
                              {task.title}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                              task.completed
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {task.completed
                              ? `+$${val}${bonus ? ' (Bounty)' : ''}`
                              : `$${val} Uncaptured`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
