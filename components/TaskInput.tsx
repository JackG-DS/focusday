'use client';

import React, { useState } from 'react';
import { Plus, Sparkles, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const TaskInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const { addDailyTask } = useTaskContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addDailyTask(title.trim(), notes.trim() || null);
      setTitle('');
      setNotes('');
      setShowNotes(false);
    }
  };

  const handleQuickAdd = (presetTitle: string, presetNotes?: string) => {
    addDailyTask(presetTitle, presetNotes || null);
  };

  return (
    <div className="space-y-2">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs transition-all overflow-hidden"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new daily priority..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base pl-4 pr-24 py-3.5 focus:outline-none"
          />

          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              title={showNotes ? 'Hide notes' : 'Add notes/details'}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                showNotes || notes.trim()
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              {showNotes ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            <button
              type="submit"
              disabled={!title.trim()}
              aria-label="Add task"
              className="p-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-all focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Expandable Notes Input */}
        {showNotes && (
          <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-700/60 animate-slide-up space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Notes &amp; Sub-items (Optional)</span>
              </span>
              {notes && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="hover:text-red-500 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add details, bullet points, links, or context..."
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y"
            />
          </div>
        )}
      </form>

      {/* Quick suggested action tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs text-slate-500 dark:text-slate-400">
        <span className="shrink-0 flex items-center gap-1 font-medium text-[11px] text-slate-400">
          <Sparkles className="w-3 h-3 text-emerald-500" /> Ideas:
        </span>
        <button
          type="button"
          onClick={() =>
            handleQuickAdd(
              'Review pull requests & code sync 💻',
              '• Check latest branch merges\n• Run regression suite\n• Review security checklist'
            )
          }
          className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          + Code review
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickAdd(
              'Draft weekly goals & milestones 📝',
              '1. Review previous week blockers\n2. Align priority targets\n3. Assign deadlines'
            )
          }
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
