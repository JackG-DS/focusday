'use client';

import React, { useState } from 'react';
import { History, Calendar, CheckCircle2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { formatReadableDate, getTodayDateString } from '@/lib/storage';

export const HistoryView: React.FC = () => {
  const { historyDates, getTasksForDate } = useTaskContext();
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

  return (
    <div className="space-y-4">
      {/* Overview header card */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-800 text-emerald-400 border border-slate-700">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Past Days Archive</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review your historical task completions and track your progress over time.
            </p>
          </div>
        </div>
      </div>

      {pastDates.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            No past history yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            As you check off tasks day after day, your past logs will automatically archive here!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastDates.map((date) => {
            const tasks = getTasksForDate(date);
            const completed = tasks.filter((t) => t.completed).length;
            const total = tasks.length;
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
                        {completed} of {total} completed ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-xs sm:text-sm ${
                          task.completed
                            ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-500 line-through'
                            : 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-white ${
                            task.completed ? 'bg-emerald-500' : 'border border-amber-400'
                          }`}
                        >
                          {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </div>
                        <span className="break-words">{task.title}</span>
                      </div>
                    ))}
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
