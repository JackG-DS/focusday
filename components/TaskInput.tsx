'use client';

import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const TaskInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const { addDailyTask } = useTaskContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addDailyTask(title);
      setTitle('');
    }
  };

  const handleQuickAdd = (presetTitle: string) => {
    addDailyTask(presetTitle);
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new daily priority..."
          className="w-full bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          aria-label="Add task"
          className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </form>

      {/* Quick suggested action tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs text-slate-500 dark:text-slate-400">
        <span className="shrink-0 flex items-center gap-1 font-medium text-[11px] text-slate-400">
          <Sparkles className="w-3 h-3 text-emerald-500" /> Ideas:
        </span>
        <button
          type="button"
          onClick={() => handleQuickAdd('Review pull requests & code sync 💻')}
          className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          + Code review
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd('Draft weekly goals & milestones 📝')}
          className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          + Draft goals
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd('15 min inbox zero & cleanup 📬')}
          className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          + Inbox zero
        </button>
      </div>
    </div>
  );
};
