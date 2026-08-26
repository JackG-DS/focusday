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
      {/* Rollover Alert Banner */}
      {rolloverReport && rolloverReport.migratedCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-300 text-xs sm:text-sm animate-slide-up shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold">Midnight Rollover Active</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                {rolloverReport.migratedCount} unfinished{' '}
                {rolloverReport.migratedCount === 1 ? 'task' : 'tasks'} carried over from
                yesterday to today’s priorities.
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
              <span>Day Completed 🎉</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-sm mx-auto">
              You marked today complete. Bonus task pulls are paused until tomorrow.
            </p>
          </div>
          <button
            type="button"
            onClick={resumeDay}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
            <span>Resume Day</span>
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
            You are done for the day! 🎉
          </h3>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1 max-w-sm mx-auto">
            All daily priorities and bonus tasks are complete. Great job!
          </p>
        </div>
      )}

      {/* Top Header Row with Actions (End Day & Clear All) */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Today&apos;s Focus {todaysTasks.length > 0 ? `(${todaysTasks.length})` : ''}
        </span>

        <div className="flex items-center gap-1.5">
          {/* End Day Button */}
          {!isDayEnded ? (
            <button
              type="button"
              onClick={() => setShowEndDayConfirm(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 transition-colors active:scale-95 shadow-2xs"
              aria-label="End Day"
              title="Mark today complete and pause bonus tasks"
            >
              <Sunset className="w-3.5 h-3.5" />
              <span>End Day</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeDay}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors active:scale-95"
              aria-label="Resume Day"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Resume Day</span>
            </button>
          )}

          {/* Clear All Action */}
          {todaysTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition-colors active:scale-95"
              aria-label="Clear all tasks from today's list"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
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
                End Day?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This will mark today complete and stop pulling bonus tasks until tomorrow.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEndDayConfirm(false)}
                disabled={isEndingDay}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndDay}
                disabled={isEndingDay}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              >
                {isEndingDay ? 'Ending Day...' : 'Yes, End Day'}
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
                Clear All Daily Tasks?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to clear all tasks from today&apos;s list? This cannot be undone.
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
                {isClearing ? 'Clearing...' : 'Yes, Clear All'}
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
            No daily tasks yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            What do you want to accomplish today? Add your top priorities above to get started!
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
