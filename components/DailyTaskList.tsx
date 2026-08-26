'use client';

import React from 'react';
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
import { CalendarClock, Trophy, X, ListTodo, CheckCircle2 } from 'lucide-react';

export const DailyTaskList: React.FC = () => {
  const {
    todaysTasks,
    reorderDailyTasks,
    rolloverReport,
    dismissRolloverReport,
    isTodayAllCompleted,
    poolTasks,
  } = useTaskContext();

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
              <p className="font-semibold">
                Midnight Rollover Active
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                {rolloverReport.migratedCount} unfinished {rolloverReport.migratedCount === 1 ? 'task' : 'tasks'} carried over from yesterday to today’s priorities.
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

      {/* Done for the Day Banner (When all daily tasks completed and bonus pool is empty) */}
      {isTodayAllCompleted && poolTasks.length === 0 && (
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
            What do you want to accomplish today? Add your top priorities below to get started!
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
