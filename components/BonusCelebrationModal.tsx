'use client';

import React from 'react';
import { Gift, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const BonusCelebrationModal: React.FC = () => {
  const { celebrationModalTask, dismissCelebrationModal, setActiveTab } = useTaskContext();

  if (!celebrationModalTask) return null;

  const handleGoToTask = () => {
    dismissCelebrationModal();
    setActiveTab('today');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-scale-up">
        {/* Decorative Badge */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Gift className="w-8 h-8 animate-bounce-short" />
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> Bonus Unlocked
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            All Daily Tasks Done!
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            You crushed your primary goals for today! Here is your unlocked bonus task from the pool:
          </p>
        </div>

        {/* Unlocked Task Highlight Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 text-left">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500 text-white shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                New Daily Challenge
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {celebrationModalTask.title}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleGoToTask}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Let&apos;s Crush It!</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={dismissCelebrationModal}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            I&apos;ll do it later
          </button>
        </div>
      </div>
    </div>
  );
};
