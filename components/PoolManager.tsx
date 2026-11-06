'use client';

import React, { useState } from 'react';
import { Trash2, ArrowUpRight } from 'lucide-react';
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
      <div className="p-4 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h2 className="font-serif tracking-tight font-bold text-base sm:text-lg text-[#1F1D1A] dark:text-[#EDE8E1]">
            Standing Bounties Reservoir
          </h2>
          <span className="font-mono text-xs tracking-wider px-2 py-0.5 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#8B5E3C] dark:text-[#D4A373] font-semibold">
            {poolTasks.length} {poolTasks.length === 1 ? 'CONTRACT' : 'CONTRACTS'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#70685E] dark:text-[#8C8479] mt-1.5 leading-relaxed">
          Record side contracts and supplemental tasks here. Each standing Bounty carries a fixed{' '}
          <strong className="font-mono text-[#8B5E3C] dark:text-[#D4A373]">$10</strong> reward (no hourly decay). When 100% of your active Most Wanted board is resolved, a random contract from this ledger is automatically posted.
        </p>
      </div>

      {/* Add new pool task */}
      <form
        onSubmit={handleAdd}
        className="bg-[#FFFDF9] dark:bg-[#1E1C1A] rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Register a new $10 Bounty contract..."
          className="flex-1 min-w-0 bg-transparent text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/60 dark:placeholder-[#8C8479]/60 font-medium text-sm sm:text-base px-2 py-1 focus:outline-none"
        />
        <span className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373] border-l border-[#E2DDD5] dark:border-[#2E2A26] pl-2.5 pr-1 select-none shrink-0">
          $10
        </span>
        <button
          type="submit"
          disabled={!newTitle.trim()}
          aria-label="Add bounty"
          className="bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 disabled:opacity-40 text-xs font-medium uppercase tracking-wider px-3.5 py-2 rounded-md transition-opacity shrink-0"
        >
          Add
        </button>
      </form>

      {/* List of pool tasks */}
      <div className="space-y-2">
        {poolTasks.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="font-serif tracking-tight font-bold text-[#1F1D1A] dark:text-[#EDE8E1] text-sm">
              No Standing Bounties Recorded
            </h3>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-1 max-w-xs mx-auto">
              Add supplemental contracts above so they can be drawn when the main board is cleared.
            </p>
          </div>
        ) : (
          poolTasks.map((task) => {
            const cleanTitle = task.title.replace(/^[💰🎁]\s*/, '');
            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all"
              >
                <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                  <span className="font-medium text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1] break-words">
                    {cleanTitle}
                  </span>
                  <span
                    className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373] shrink-0"
                    title="Fixed $10 bounty reward (does not decrease)"
                  >
                    $10
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Pull now button */}
                  <button
                    type="button"
                    onClick={() => handleManualPull(task.id)}
                    className="inline-flex items-center gap-1 font-mono text-xs tracking-wider uppercase px-2.5 py-1 bg-[#F7F5F0] dark:bg-[#151413] text-[#1F1D1A] dark:text-[#EDE8E1] hover:border-[#8B5E3C] dark:hover:border-[#D4A373] rounded border border-[#E2DDD5] dark:border-[#2E2A26] transition-colors"
                    title="Post to Most Wanted immediately"
                  >
                    <span>Post</span>
                    <ArrowUpRight className="w-3 h-3 text-[#8B5E3C] dark:text-[#D4A373]" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => deletePoolTask(task.id)}
                    aria-label="Delete bonus task"
                    className="p-1.5 text-[#70685E] dark:text-[#8C8479] hover:text-[#9E2A2B] dark:hover:text-[#C94A4B] rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
