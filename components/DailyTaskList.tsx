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
  X,
  Trash2,
  RotateCcw,
} from 'lucide-react';

export const WeeklyBountyLedgerCard: React.FC = () => {
  const {
    currentWeekBountyPool,
    todayBountyEarned,
    currentWeekRangeLabel,
    isSundayPoolReset,
    setActiveTab,
  } = useTaskContext();

  return (
    <div className="p-4 rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif tracking-widest uppercase text-xs font-bold text-[#70685E] dark:text-[#8C8479]">
              Weekly Bounty Ledger
            </span>
            <span className="font-mono text-xs tracking-wider px-2 py-0.5 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479]">
              {currentWeekRangeLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="font-mono text-2xl sm:text-3xl font-bold tracking-wider text-[#8B5E3C] dark:text-[#D4A373]">
              ${currentWeekBountyPool.toLocaleString()}
            </span>
            {todayBountyEarned > 0 && (
              <span className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373] border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] px-2 py-0.5 rounded">
                +${todayBountyEarned} TODAY
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end justify-between gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className="font-mono text-xs tracking-wider uppercase font-semibold text-[#8B5E3C] dark:text-[#D4A373] hover:underline"
          >
            Inspect Ledger &rarr;
          </button>
          <span className="font-mono text-[11px] tracking-wider text-[#70685E] dark:text-[#8C8479]">
            {isSundayPoolReset
              ? 'SUNDAY EOD REACHED — LEDGER RESET'
              : 'RESETS EOD SUNDAY'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-[#E2DDD5] dark:border-[#2E2A26] flex items-center justify-between gap-2 flex-wrap font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479]">
        <span>
          MOST WANTED: <strong className="text-[#1F1D1A] dark:text-[#EDE8E1]">$100</strong> (-$1/HR, MIN $20)
        </span>
        <span>
          BOUNTIES: <strong className="text-[#1F1D1A] dark:text-[#EDE8E1]">$10</strong> FIXED
        </span>
      </div>
    </div>
  );
};

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
    <div className="space-y-4">

      {/* Rollover Alert Banner */}
      {rolloverReport && rolloverReport.migratedCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-3.5 bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] border-l-[3px] border-l-[#8B5E3C] dark:border-l-[#D4A373] rounded-lg animate-fade-in">
          <div>
            <p className="font-serif tracking-tight font-bold text-sm text-[#1F1D1A] dark:text-[#EDE8E1]">
              Unresolved Notices Carried Forward
            </p>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-0.5">
              {rolloverReport.migratedCount} uncaptured{' '}
              {rolloverReport.migratedCount === 1 ? 'target' : 'targets'} from yesterday returned to today&apos;s board.
            </p>
          </div>
          <button
            onClick={dismissRolloverReport}
            className="p-1 text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Day Completed Banner (Triggered when user ends day) */}
      {isDayEnded && (
        <div className="p-4 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] text-center animate-fade-in space-y-2.5">
          <div>
            <h3 className="font-serif tracking-tight font-bold text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
              Ledger Closed for the Evening
            </h3>
            <p className="text-xs text-[#70685E] dark:text-[#8C8479] mt-1 max-w-sm mx-auto">
              Active hunting is paused for today. Automatic Bounty postings resume at dawn.
            </p>
          </div>
          <button
            type="button"
            onClick={resumeDay}
            className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase font-semibold px-3 py-1.5 rounded-md bg-[#F7F5F0] dark:bg-[#151413] text-[#1F1D1A] dark:text-[#EDE8E1] border border-[#E2DDD5] dark:border-[#2E2A26] hover:border-[#8B5E3C] dark:hover:border-[#D4A373] transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-[#8B5E3C] dark:text-[#D4A373]" />
            <span>Reopen Ledger</span>
          </button>
        </div>
      )}

      {/* Done for the Day Banner */}
      {!isDayEnded && isTodayAllCompleted && poolTasks.length === 0 && (
        <div className="p-4 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] text-center animate-fade-in">
          <h3 className="font-serif tracking-tight font-bold text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
            All Notices Resolved
          </h3>
          <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-1 max-w-sm mx-auto">
            Every Most Wanted target and Bounty on the board has been claimed.
          </p>
        </div>
      )}

      {/* Section Header Row with Actions */}
      <div className="flex items-center justify-between pt-2 border-b border-[#E2DDD5] dark:border-[#2E2A26] pb-2">
        <h2 className="font-serif tracking-widest uppercase text-xs font-bold text-[#70685E] dark:text-[#8C8479]">
          Most Wanted — Dead or Alive {todaysTasks.length > 0 ? `(${todaysTasks.length})` : ''}
        </h2>

        <div className="flex items-center gap-2">
          {/* End Day Button */}
          {!isDayEnded ? (
            <button
              type="button"
              onClick={() => setShowEndDayConfirm(true)}
              className="font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] px-2 py-1 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] transition-colors"
              aria-label="Hang Up Spurs"
              title="Close today's ledger and pause new Bounties"
            >
              Close Day
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeDay}
              className="font-mono text-xs tracking-wider uppercase text-[#8B5E3C] dark:text-[#D4A373] hover:opacity-80 px-2 py-1 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] transition-colors"
              aria-label="Back in the Saddle"
            >
              Reopen Day
            </button>
          )}

          {/* Clear All Action */}
          {todaysTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 font-mono text-xs tracking-wider uppercase text-[#9E2A2B] dark:text-[#C94A4B] hover:opacity-80 px-2 py-1 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] transition-colors"
              aria-label="Clear all notices from Most Wanted"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* End Day Confirmation Modal */}
      {showEndDayConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151413]/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-lg p-5 shadow-lg text-center space-y-4 animate-scale-up">
            <div className="space-y-1.5">
              <h3 className="font-serif tracking-tight font-bold text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
                Close the Ledger for Tonight?
              </h3>
              <p className="text-xs text-[#70685E] dark:text-[#8C8479] leading-relaxed">
                This will conclude today&apos;s active hunt and pause automatic Bounty postings until dawn.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEndDayConfirm(false)}
                disabled={isEndingDay}
                className="flex-1 py-2 font-mono text-xs uppercase tracking-wider rounded-md border border-[#E2DDD5] dark:border-[#2E2A26] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndDay}
                disabled={isEndingDay}
                className="flex-1 bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3.5 py-2 rounded-md transition-opacity"
              >
                {isEndingDay ? 'Closing...' : 'Close Ledger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151413]/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-lg p-5 shadow-lg text-center space-y-4 animate-scale-up">
            <div className="space-y-1.5">
              <h3 className="font-serif tracking-tight font-bold text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
                Clear the Most Wanted Board?
              </h3>
              <p className="text-xs text-[#70685E] dark:text-[#8C8479] leading-relaxed">
                Are you sure you want to remove all notices from today&apos;s Most Wanted list? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="flex-1 py-2 font-mono text-xs uppercase tracking-wider rounded-md border border-[#E2DDD5] dark:border-[#2E2A26] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="flex-1 py-2 text-xs font-medium uppercase tracking-wider rounded-md bg-[#9E2A2B] dark:bg-[#C94A4B] text-[#FFFDF9] hover:opacity-90 transition-opacity"
              >
                {isClearing ? 'Clearing...' : 'Confirm Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {todaysTasks.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h3 className="font-serif tracking-tight font-bold text-[#1F1D1A] dark:text-[#EDE8E1] text-base">
            No Active Notices on the Board
          </h3>
          <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-1 max-w-xs mx-auto">
            Post a Most Wanted target above to begin recording today&apos;s ledger.
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
