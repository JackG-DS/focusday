'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TaskItem } from './TaskItem';
import { useTaskContext } from '@/context/TaskContext';
import {
  CalendarClock,
  Trophy,
  X,
  ListTodo,
  Trash2,
  AlertTriangle,
  Sunset,
  RotateCcw,
  Sparkles,
  Coins,
  TrendingDown,
  Clock,
} from 'lucide-react';

export const DailyTaskList: React.FC = () => {
  const {
    todaysTasks,
    reorderDailyTasks,
    rolloverReport,
    dismissRolloverReport,
    isTodayAllCompleted,
    clearAllDailyTasks,
    poolTasks,
    endDay,
    resumeDay,
    isDayEnded,
    currentWeekBountyPool,
    todayBountyEarned,
    currentWeekRangeLabel,
    isSundayPoolReset,
    setActiveTab,
  } = useTaskContext();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [showEndDayConfirm, setShowEndDayConfirm] = useState(false);
  const [isEndingDay, setIsEndingDay] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderDailyTasks(String(active.id), String(over.id));
    }
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearAllDailyTasks();
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  const handleConfirmEndDay = async () => {
    setIsEndingDay(true);
    try {
      await endDay();
    } finally {
      setIsEndingDay(false);
      setShowEndDayConfirm(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Weekly Bounty Pool Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-teal-500/15 border border-amber-500/30 dark:border-amber-500/25 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Weekly Bounty Pool
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                  {currentWeekRangeLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  ${currentWeekBountyPool}
                </span>
                {todayBountyEarned > 0 && (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    +${todayBountyEarned} today
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end justify-between text-xs gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View Weekly Chart →</span>
            </button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                {isSundayPoolReset
                  ? 'Sunday EOD reached — Pool reset for the new week!'
                  : 'Resets automatically at End of Day Sunday'}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-amber-500/20 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Most Wanted:</strong> Starts at <strong>$100</strong> (-$1/hr, min <strong>$20</strong>)
            </span>
          </span>
          <span>
            <strong>Bounties:</strong> Flat <strong>$10</strong> (no decay)
          </span>
        </div>
      </div>

      {/* Rollover Alert Banner */}
      {rolloverReport && rolloverReport.migratedCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-300 text-xs sm:text-sm animate-slide-up shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold">Still At Large! (Sundown Rollover)</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                {rolloverReport.migratedCount} uncaptured{' '}
                {rolloverReport.migratedCount === 1 ? 'outlaw' : 'outlaws'} slipped away
                yesterday and returned to today’s Most Wanted board.
              </p>
            </div>
          </div>
          <button
            onClick={dismissRolloverReport}
            className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Day Completed Banner (Triggered when user ends day) */}
      {isDayEnded && (
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-pink-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-200 text-center animate-slide-up shadow-xs space-y-2">
          <div className="w-10 h-10 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Sunset className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <span>Spurs Hung Up for Tonight 🤠</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-sm mx-auto">
              You called off the posse for today. New Bounty postings are paused until dawn.
            </p>
          </div>
          <button
            type="button"
            onClick={resumeDay}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
            <span>Back in the Saddle</span>
          </button>
        </div>
      )}

      {/* Done for the Day Banner (When all daily tasks completed and bonus pool is empty and not already ended) */}
      {!isDayEnded && isTodayAllCompleted && poolTasks.length === 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-center animate-slide-up shadow-xs">
          <div className="w-10 h-10 mx-auto mb-2 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-500/30">
            <Trophy className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm sm:text-base text-emerald-950 dark:text-white">
            The Town is Safe &amp; Clear! 🤠
          </h3>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1 max-w-sm mx-auto">
            Every Most Wanted target and Bounty has been captured. Fine work, Sheriff!
          </p>
        </div>
      )}

      {/* Top Header Row with Actions (End Day & Clear All) */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Most Wanted — Dead or Alive {todaysTasks.length > 0 ? `(${todaysTasks.length})` : ''}
        </span>

        <div className="flex items-center gap-1.5">
          {/* End Day Button */}
          {!isDayEnded ? (
            <button
              type="button"
              onClick={() => setShowEndDayConfirm(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 transition-colors active:scale-95 shadow-2xs"
              aria-label="Hang Up Spurs"
              title="Call off the hunt for today and pause new Bounties"
            >
              <Sunset className="w-3.5 h-3.5" />
              <span>Hang Up Spurs</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeDay}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors active:scale-95"
              aria-label="Back in the Saddle"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Back in the Saddle</span>
            </button>
          )}

          {/* Clear All Action */}
          {todaysTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition-colors active:scale-95"
              aria-label="Tear down all posters from Most Wanted"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Board</span>
            </button>
          )}
        </div>
      </div>

      {/* End Day Confirmation Modal */}
      {showEndDayConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl text-center space-y-3.5 animate-scale-up">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sunset className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Hang Up Your Spurs?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This will close out today&apos;s hunt and stop posting new Bounties until dawn.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEndDayConfirm(false)}
                disabled={isEndingDay}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Keep Hunting
              </button>
              <button
                type="button"
                onClick={handleConfirmEndDay}
                disabled={isEndingDay}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              >
                {isEndingDay ? 'Closing Hunt...' : 'Yes, Call It a Night'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-5 shadow-2xl text-center space-y-3.5 animate-scale-up">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Clear the Most Wanted Board?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to tear down all posters from today&apos;s Most Wanted list? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
              >
                {isClearing ? 'Tearing Down...' : 'Yes, Clear Board'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {todaysTasks.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ListTodo className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
            No outlaws on the board
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            The town is quiet, Sheriff. Post your Most Wanted targets above to start the hunt!
          </p>
        </div>
      ) : (
        /* Sortable List with DnD Kit */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={todaysTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {todaysTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
