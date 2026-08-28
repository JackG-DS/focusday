'use client';

import React, { useState } from 'react';
import { Plus, FileText, X, ChevronDown, ChevronUp, Palette, AlertCircle } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { TaskColor } from '@/lib/types';

export const TASK_COLOR_PALETTE: { id: TaskColor; name: string; bgClass: string }[] = [
  { id: 'default', name: 'Default', bgClass: 'bg-slate-300 dark:bg-slate-600' },
  { id: 'red', name: 'Red', bgClass: 'bg-rose-500' },
  { id: 'orange', name: 'Orange', bgClass: 'bg-orange-500' },
  { id: 'amber', name: 'Amber', bgClass: 'bg-amber-500' },
  { id: 'emerald', name: 'Green', bgClass: 'bg-emerald-500' },
  { id: 'blue', name: 'Blue', bgClass: 'bg-blue-500' },
  { id: 'purple', name: 'Purple', bgClass: 'bg-purple-500' },
];

export const TaskInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState<TaskColor>('default');
  const [showDetails, setShowDetails] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const { addDailyTask } = useTaskContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const result = await addDailyTask(
        title.trim(),
        notes.trim() || null,
        color !== 'default' ? color : null
      );

      if (result.duplicate) {
        setWarningMessage(`"${title.trim()}" is already active on today's list!`);
        setTimeout(() => setWarningMessage(null), 3500);
        return;
      }

      setTitle('');
      setNotes('');
      setColor('default');
      setShowDetails(false);
      setWarningMessage(null);
    }
  };

  return (
    <div className="space-y-2">
      {/* Duplicate Warning Toast */}
      {warningMessage && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between animate-slide-up shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              onClick={() => setShowDetails(!showDetails)}
              title={showDetails ? 'Hide details' : 'Add notes, checklist, or color'}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                showDetails || notes.trim() || color !== 'default'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              {showDetails ? (
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

        {/* Expandable Details: Notes & Color Picker */}
        {showDetails && (
          <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-700/60 animate-slide-up space-y-3">
            {/* Color Palette Selector */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>Task Color:</span>
              </span>
              <div className="flex items-center gap-1.5">
                {TASK_COLOR_PALETTE.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setColor(p.id)}
                    title={p.name}
                    aria-label={`Color ${p.name}`}
                    className={`w-5 h-5 rounded-full transition-transform ${p.bgClass} ${
                      color === p.id
                        ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 shadow-xs'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Notes Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
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
          </div>
        )}
      </form>
    </div>
  );
};
