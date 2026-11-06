'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
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
  } = useTaskContext();
  const todayStr = getTodayDateString();
  const pastDates = historyDates.filter((d) => d !== todayStr);

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => {
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
    100
  );

  const totalAllTimeShown = weeklyBountyHistory.reduce((sum, w) => sum + w.totalAmount, 0);
  const bestWeekEarned = Math.max(...weeklyBountyHistory.map((w) => w.totalAmount), 0);

  return (
    <div className="space-y-5 pb-12">
      {/* Overview Header */}
      <div className="border-b border-[#E2DDD5] dark:border-[#2E2A26] pb-3">
        <h2 className="font-serif tracking-tight font-bold text-lg sm:text-xl text-[#1F1D1A] dark:text-[#EDE8E1]">
          Sheriff&apos;s Ledger &amp; Archive
        </h2>
        <p className="text-xs sm:text-sm text-[#70685E] dark:text-[#8C8479] mt-0.5">
          Historical weekly bounty tallies and archived daily dispatches.
        </p>
      </div>

      {/* Weekly Bounty Collection Chart Card */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-serif tracking-widest uppercase text-xs font-bold text-[#70685E] dark:text-[#8C8479]">
              Weekly Bounty Tally
            </h3>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-0.5">
              MON&ndash;SUN LEDGER PERIODS (RESETS EOD SUNDAY)
            </p>
          </div>

          {/* Summary KPI Pills */}
          <div className="flex items-center gap-2 flex-wrap font-mono text-xs tracking-wider">
            <div className="px-2.5 py-1 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413]">
              <span className="text-[#70685E] dark:text-[#8C8479] mr-1.5">THIS WK:</span>
              <strong className="text-[#8B5E3C] dark:text-[#D4A373] font-semibold">
                ${currentWeekBountyPool.toLocaleString()}
              </strong>
            </div>
            <div className="px-2.5 py-1 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413]">
              <span className="text-[#70685E] dark:text-[#8C8479] mr-1.5">BEST:</span>
              <strong className="text-[#1F1D1A] dark:text-[#EDE8E1] font-semibold">
                ${bestWeekEarned.toLocaleString()}
              </strong>
            </div>
            <div className="px-2.5 py-1 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413]">
              <span className="text-[#70685E] dark:text-[#8C8479] mr-1.5">TOTAL:</span>
              <strong className="text-[#1F1D1A] dark:text-[#EDE8E1] font-semibold">
                ${totalAllTimeShown.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="pt-3 pb-1">
          <div className="grid grid-cols-8 gap-2 items-end h-40 pt-6 border-b border-[#E2DDD5] dark:border-[#2E2A26] pb-2">
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
                  <span
                    className={`font-mono text-[10px] tracking-wider font-semibold mb-1 ${
                      week.totalAmount > 0
                        ? isCurrentWeek
                          ? 'text-[#8B5E3C] dark:text-[#D4A373]'
                          : 'text-[#1F1D1A] dark:text-[#EDE8E1]'
                        : 'text-[#70685E]/50 dark:text-[#8C8479]/50'
                    }`}
                  >
                    ${week.totalAmount}
                  </span>

                  <div className="w-full max-w-[32px] flex-1 flex items-end justify-center">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-sm transition-all duration-500 ${
                        week.totalAmount === 0
                          ? 'bg-[#E2DDD5] dark:bg-[#2E2A26]'
                          : isCurrentWeek
                          ? 'bg-[#8B5E3C] dark:bg-[#D4A373]'
                          : 'bg-[#1F1D1A]/75 dark:bg-[#EDE8E1]/75 group-hover:bg-[#1F1D1A] dark:group-hover:bg-[#EDE8E1]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="grid grid-cols-8 gap-2 pt-2 text-center">
            {weeklyBountyHistory.map((week) => {
              const isCurrentWeek = week.isCurrentWeek;
              const shortLabel = week.weekStart.slice(5).replace('-', '/');
              return (
                <div key={week.weekStart} className="flex flex-col items-center min-w-0">
                  <span
                    className={`font-mono text-[10px] tracking-wider uppercase truncate max-w-full ${
                      isCurrentWeek
                        ? 'text-[#8B5E3C] dark:text-[#D4A373] font-semibold'
                        : 'text-[#70685E] dark:text-[#8C8479]'
                    }`}
                  >
                    {isCurrentWeek ? 'Current' : shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Past Daily Logs */}
      {pastDates.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h3 className="font-serif tracking-tight font-bold text-[#1F1D1A] dark:text-[#EDE8E1] text-sm">
            No Archived Daily Ledgers
          </h3>
          <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-1 max-w-xs mx-auto">
            Past daily records will be cataloged here as each day concludes.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pastDates.map((date) => {
            const tasks = getTasksForDate(date);
            const completed = tasks.filter((t) => t.completed).length;
            const total = tasks.length;
            const dateBounty = getDateBountyTotal(date);
            const isExpanded = !!expandedDates[date];

            return (
              <div
                key={date}
                className="bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(date)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#F7F5F0]/50 dark:hover:bg-[#151413]/40 transition-colors"
                >
                  <div>
                    <h4 className="font-serif tracking-tight font-bold text-sm text-[#1F1D1A] dark:text-[#EDE8E1]">
                      {formatReadableDate(date)}
                    </h4>
                    <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-0.5 uppercase">
                      {completed} of {total} resolved ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {dateBounty > 0 && (
                      <span className="font-mono text-xs tracking-wider font-semibold px-2 py-0.5 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#8B5E3C] dark:text-[#D4A373]">
                        +${dateBounty}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#70685E] dark:text-[#8C8479]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#70685E] dark:text-[#8C8479]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-[#E2DDD5] dark:border-[#2E2A26] space-y-1.5">
                    {tasks.map((task) => {
                      const val = getTaskBountyValue(task);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-2.5 p-2 rounded bg-[#F2EFE9]/40 dark:bg-[#181615]/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 ${
                                task.completed
                                  ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413]'
                                  : 'border border-[#70685E]/50 dark:border-[#8C8479]/50'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </div>
                            <span
                              className={`text-sm font-medium break-words ${
                                task.completed
                                  ? 'opacity-50 text-[#70685E] dark:text-[#8C8479] line-through'
                                  : 'text-[#1F1D1A] dark:text-[#EDE8E1]'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373]">
                              ${val}
                            </span>
                            {task.completed && (
                              <span className="font-mono text-[10px] tracking-widest uppercase font-bold text-[#9E2A2B] dark:text-[#C94A4B]">
                                [CLAIMED]
                              </span>
                            )}
                          </div>
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
