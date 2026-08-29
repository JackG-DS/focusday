'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sunrise,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Trash2,
  Edit3,
  CheckCheck,
  X,
  FileText,
  Save,
  Plus,
  Palette,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { DailyTask, TaskColor } from '@/lib/types';
import { TASK_COLOR_PALETTE } from '@/components/TaskInput';

const COLOR_ACCENTS: Record<string, { borderLeft: string; dot: string }> = {
  red: { borderLeft: 'border-l-4 border-l-rose-500', dot: 'bg-rose-500' },
  orange: { borderLeft: 'border-l-4 border-l-orange-500', dot: 'bg-orange-500' },
  amber: { borderLeft: 'border-l-4 border-l-amber-500', dot: 'bg-amber-500' },
  emerald: { borderLeft: 'border-l-4 border-l-emerald-500', dot: 'bg-emerald-500' },
  blue: { borderLeft: 'border-l-4 border-l-blue-500', dot: 'bg-blue-500' },
  purple: { borderLeft: 'border-l-4 border-l-purple-500', dot: 'bg-purple-500' },
  default: { borderLeft: '', dot: '' },
};

export const TomorrowPreview: React.FC = () => {
  const {
    tomorrowTasks,
    moveTaskToToday,
    deleteDailyTask,
    updateDailyTaskTitle,
    updateDailyTaskNotes,
    updateDailyTaskColor,
  } = useTaskContext();

  const [isOpen, setIsOpen] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  // Per-task states
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState('');
  const [editColorValue, setEditColorValue] = useState<TaskColor>('default');

  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTitleId && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitleId]);

  useEffect(() => {
    if (editingNotesId && notesTextareaRef.current) {
      notesTextareaRef.current.focus();
    }
  }, [editingNotesId]);

  const toggleTaskExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEditTitle = (task: DailyTask) => {
    setEditingTitleId(task.id);
    setEditTitleValue(task.title);
  };

  const handleSaveTitle = (id: string) => {
    if (editTitleValue.trim()) {
      updateDailyTaskTitle(id, editTitleValue.trim());
    }
    setEditingTitleId(null);
  };

  const handleStartEditNotes = (task: DailyTask) => {
    setEditingNotesId(task.id);
    setEditNotesValue(task.notes || '');
    setEditColorValue((task.color as TaskColor) || 'default');
    setExpandedIds((prev) => ({ ...prev, [task.id]: true }));
  };

  const handleSaveNotes = (id: string) => {
    updateDailyTaskNotes(id, editNotesValue.trim() || null);
    if (editColorValue !== 'default') {
      updateDailyTaskColor(id, editColorValue);
    } else {
      updateDailyTaskColor(id, null);
    }
    setEditingNotesId(null);
  };

  const handleMoveToToday = async (taskId: string) => {
    setMovingTaskId(taskId);
    try {
      await moveTaskToToday(taskId);
    } finally {
      setMovingTaskId(null);
    }
  };

  return (
    <div className="mt-8 rounded-3xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sunrise className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                Tomorrow&apos;s Plan
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                {tomorrowTasks.length} {tomorrowTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Preview and schedule priorities ahead of time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <span className="text-xs font-semibold hidden sm:inline">
            {isOpen ? 'Hide' : 'View'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Collapsible Body */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 animate-slide-up space-y-2.5">
          {tomorrowTasks.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                No tasks planned for tomorrow yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                Toggle &ldquo;Tomorrow&rdquo; in the creation bar above to queue up goals for tomorrow!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tomorrowTasks.map((task) => {
                const isExpanded = Boolean(expandedIds[task.id]);
                const isEditingTitle = editingTitleId === task.id;
                const isEditingNotes = editingNotesId === task.id;
                const hasNotes = Boolean(task.notes && task.notes.trim().length > 0);
                const taskColorKey = task.color || 'default';
                const accent = COLOR_ACCENTS[taskColorKey] || COLOR_ACCENTS.default;
                const isMoving = movingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs transition-all overflow-hidden ${accent.borderLeft}`}
                  >
                    {/* Item Row */}
                    <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        {isEditingTitle ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              ref={titleInputRef}
                              type="text"
                              value={editTitleValue}
                              onChange={(e) => setEditTitleValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(task.id);
                                if (e.key === 'Escape') setEditingTitleId(null);
                              }}
                              className="w-full bg-slate-100 dark:bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-sm text-slate-900 dark:text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTitle(task.id)}
                              className="p-1 text-indigo-600 dark:text-indigo-400"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTitleId(null)}
                              className="p-1 text-slate-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {accent.dot && (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${accent.dot}`} />
                            )}
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
                              {task.title}
                            </span>

                            {hasNotes && !isExpanded && (
                              <button
                                type="button"
                                onClick={() => toggleTaskExpand(task.id)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                              >
                                <FileText className="w-3 h-3 text-indigo-500" />
                                <span>Notes</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Expand Details Chevron */}
                        <button
                          type="button"
                          onClick={() => toggleTaskExpand(task.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                          title={isExpanded ? 'Collapse notes' : 'View notes & color'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <ChevronDown className={`w-4 h-4 ${hasNotes ? 'text-indigo-500' : ''}`} />
                          )}
                        </button>

                        {/* Move to Today Button */}
                        <button
                          type="button"
                          onClick={() => handleMoveToToday(task.id)}
                          disabled={isMoving}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl border border-emerald-300 dark:border-emerald-800 transition-all active:scale-95 shadow-2xs"
                          title="Move to Today's Tasks immediately"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>{isMoving ? 'Moving...' : 'Move to Today'}</span>
                        </button>

                        {/* Edit Title Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEditTitle(task)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                          title="Edit task title"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteDailyTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete tomorrow's task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Notes & Color Drawer */}
                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-700/50 animate-slide-up space-y-2.5">
                        {isEditingNotes ? (
                          <div className="space-y-2.5">
                            {/* Color Selector */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Palette className="w-3.5 h-3.5 text-slate-400" />
                                <span>Task Color:</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                {TASK_COLOR_PALETTE.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setEditColorValue(p.id)}
                                    title={p.name}
                                    className={`w-4 h-4 rounded-full transition-transform ${p.bgClass} ${
                                      editColorValue === p.id
                                        ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                                        : 'opacity-70 hover:opacity-100'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-indigo-500" />
                                  <span>Editing Notes</span>
                                </span>
                              </div>
                              <textarea
                                ref={notesTextareaRef}
                                value={editNotesValue}
                                onChange={(e) => setEditNotesValue(e.target.value)}
                                rows={3}
                                placeholder="Add sub-items, checklist items, links, or notes..."
                                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-indigo-500/70 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingNotesId(null)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveNotes(task.id)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {hasNotes ? (
                              <div
                                onClick={() => handleStartEditNotes(task)}
                                className="cursor-pointer group/notes rounded-xl bg-slate-50/80 dark:bg-slate-900/60 p-3 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-500/40 transition-all"
                                title="Click to edit notes"
                              >
                                <div className="whitespace-pre-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {task.notes}
                                </div>
                                <div className="mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                                    <Edit3 className="w-3 h-3" /> Click to edit notes or color
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditNotes(task)}
                                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:border-indigo-500 transition-all flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add notes or change color</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
