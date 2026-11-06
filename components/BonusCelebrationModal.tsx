'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const BonusCelebrationModal: React.FC = () => {
  const { celebrationModalTask, dismissCelebrationModal, setActiveTab } = useTaskContext();

  if (!celebrationModalTask) return null;

  const handleGoToTask = () => {
    dismissCelebrationModal();
    setActiveTab('today');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151413]/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-lg p-6 shadow-lg text-center space-y-4 animate-scale-up">
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] tracking-widest uppercase font-bold text-[#8B5E3C] dark:text-[#D4A373]">
            SPECIAL DISPATCH UNLOCKED
          </div>
          <h2 className="font-serif tracking-tight font-bold text-xl text-[#1F1D1A] dark:text-[#EDE8E1]">
            Most Wanted Board Cleared
          </h2>
          <p className="text-xs sm:text-sm text-[#70685E] dark:text-[#8C8479]">
            All primary targets have been resolved. A supplemental Bounty contract has been posted to your board:
          </p>
        </div>

        {/* Unlocked Task Highlight Card */}
        <div className="p-3.5 rounded-lg bg-[#F2EFE9]/40 dark:bg-[#181615]/50 border border-[#E2DDD5] dark:border-[#2E2A26] text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-widest uppercase text-[#70685E] dark:text-[#8C8479]">
              STANDING BOUNTY
            </span>
            <span className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373]">
              $10
            </span>
          </div>
          <p className="font-medium text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1] mt-1">
            {celebrationModalTask.title}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleGoToTask}
            className="w-full bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3.5 py-2.5 rounded-md transition-opacity flex items-center justify-center gap-2"
          >
            <span>Inspect Notice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={dismissCelebrationModal}
            className="w-full py-1.5 font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
