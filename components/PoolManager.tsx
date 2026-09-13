'use client';

import React, { useState } from 'react';
import { Gift, Plus, Trash2, ArrowUpRight, Sparkles } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const PoolManager: React.FC = () => {
  const [newTitle, setNewTitle] = useState('');
  const {
    poolTasks,
    addPoolTask,
    deletePoolTask,
    pullBonusTaskToToday,
    setActiveTab,
  } = useTaskContext();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      addPoolTask(newTitle);
      setNewTitle('');
    }
  };

  const handleManualPull = async (id: string) => {
    await pullBonusTaskToToday(id);
    setActiveTab('today');
  };

  return (
    <div className="space-y-4">
      {/* Header card explaining how Bonus Pool works */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-slate-800 dark:text-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Bonus Task Pool
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
                {poolTasks.length} {poolTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Store backlogged ideas or reward tasks here. Whenever you finish <strong>100%</strong> of today’s active tasks, the system automatically pulls <strong>1 random task</strong> from this pool as your bonus challenge!
            </p>
          </div>
        </div>

        {poolTasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-indigo-200/40 dark:border-indigo-800/40 flex items-center">
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Auto-reward ready (unlocked upon 100% daily completion)
            </span>
          </div>
        )}
      </div>

      {/* Add new pool task */}
      <form onSubmit={handleAdd} className="relative flex items-center">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a bonus idea to the pool..."
          className="w-full bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          aria-label="Add bonus task"
          className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl shadow-sm transition-all focus:outline-none"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </form>

      {/* List of pool tasks */}
      <div className="space-y-2">
        {poolTasks.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Your pool is empty
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Add fun side quests, reading goals, or backlog tasks above so they can be unlocked as rewards!
            </p>
          </div>
        ) : (
          poolTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-indigo-500 font-bold text-sm">🎁</span>
                <span className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 break-words">
                  {task.title}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Pull now button */}
                <button
                  type="button"
                  onClick={() => handleManualPull(task.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700/60 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-slate-200/80 dark:border-slate-600/80 transition-all"
                  title="Move to Today's Tasks immediately"
                >
                  <span>Pull to Today</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => deletePoolTask(task.id)}
                  aria-label="Delete bonus task"
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
