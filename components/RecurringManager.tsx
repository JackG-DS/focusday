'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Repeat,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  CalendarPlus,
  Check,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Palette,
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { RecurringTask, TaskColor } from '@/lib/types';
import { TASK_COLOR_PALETTE } from '@/components/TaskInput';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const COLOR_ACCENTS: Record<string, { borderLeft: string; dot: string }> = {
  red: { borderLeft: 'border-l-4 border-l-rose-500', dot: 'bg-rose-500' },
  orange: { borderLeft: 'border-l-4 border-l-orange-500', dot: 'bg-orange-500' },
  amber: { borderLeft: 'border-l-4 border-l-amber-500', dot: 'bg-amber-500' },
  emerald: { borderLeft: 'border-l-4 border-l-emerald-500', dot: 'bg-emerald-500' },
  blue: { borderLeft: 'border-l-4 border-l-blue-500', dot: 'bg-blue-500' },
  purple: { borderLeft: 'border-l-4 border-l-purple-500', dot: 'bg-purple-500' },
  default: { borderLeft: '', dot: '' },
};

export const RecurringManager: React.FC = () => {
  const {
    recurringTasks,
    addRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    pushTemplateToToday,
    addDailyTask,
    setActiveTab,
  } = useTaskContext();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState<TaskColor>('default');
  const [showDetails, setShowDetails] = useState(false);
  const [mode, setMode] = useState<'daily' | 'weekly' | 'once'>('daily');
  const [selectedDow, setSelectedDow] = useState<number>(1); // Monday default
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [pushingTaskId, setPushingTaskId] = useState<string | null>(null);
  const [recentlyPushedIds, setRecentlyPushedIds] = useState<Record<string, boolean>>({});

  // Expanded items in list
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState('');
  const [editColorValue, setEditColorValue] = useState<TaskColor>('default');
  const editNotesTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingNotesId && editNotesTextareaRef.current) {
      editNotesTextareaRef.current.focus();
    }
  }, [editingNotesId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditNotes = (task: RecurringTask) => {
    setEditingNotesId(task.id);
    setEditNotesValue(task.notes || '');
    setEditColorValue((task.color as TaskColor) || 'default');
    setExpandedIds((prev) => ({ ...prev, [task.id]: true }));
  };

  const saveEditedNotes = async (id: string) => {
    await updateRecurringTask(id, {
      notes: editNotesValue.trim() || null,
      color: editColorValue !== 'default' ? editColorValue : null,
    });
    setEditingNotesId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const trimmed = title.trim();
    const trimmedNotes = notes.trim() || null;
    const taskColor = color !== 'default' ? color : null;

    if (mode === 'once') {
      // Add once right now into today's list
      await addDailyTask(trimmed, trimmedNotes, taskColor);
      setAddedNotice(`Added "${trimmed}" to today's daily focus!`);
    } else if (mode === 'daily') {
      await addRecurringTask(trimmed, 'daily', undefined, trimmedNotes, taskColor);
      setAddedNotice(`Added "${trimmed}" as a Daily recurring routine!`);
    } else if (mode === 'weekly') {
      await addRecurringTask(trimmed, 'weekly', selectedDow, trimmedNotes, taskColor);
      const dayName = DAYS_OF_WEEK.find((d) => d.value === selectedDow)?.label || 'selected day';
      setAddedNotice(`Added "${trimmed}" to recur every ${dayName}!`);
    }

    setTitle('');
    setNotes('');
    setColor('default');
    setShowDetails(false);
    setTimeout(() => setAddedNotice(null), 3500);
  };

  const handlePushToToday = async (task: RecurringTask) => {
    setPushingTaskId(task.id);
    try {
      await pushTemplateToToday(task.title, task.notes, task.color);
      setRecentlyPushedIds((prev) => ({ ...prev, [task.id]: true }));
      setAddedNotice(`Pushed "${task.title}" to today's daily tasks!`);
      setTimeout(() => {
        setRecentlyPushedIds((prev) => ({ ...prev, [task.id]: false }));
      }, 2500);
      setTimeout(() => {
        setAddedNotice(null);
      }, 3500);
    } finally {
      setPushingTaskId(null);
    }
  };

  const getDayName = (dow?: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dow)?.label || 'Weekly';
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Repeat className="w-5 h-5 text-indigo-500" />
          <span>Recurring Tasks</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Build habits &amp; automated routines that schedule themselves every day or week.
        </p>
      </div>

      {/* Success Notification Banner */}
      {addedNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-slide-up shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{addedNotice}</span>
          </div>
          <button
            onClick={() => setActiveTab('today')}
            className="text-xs font-bold underline hover:text-emerald-700 dark:hover:text-emerald-200 shrink-0 ml-2"
          >
            View Today
          </button>
        </div>
      )}

      {/* Creation Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3.5">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Create Recurring Template or Quick Add
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning workout, Team standup, Review analytics..."
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Optional Details Toggle / Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {showDetails
                    ? 'Hide Template Details'
                    : notes.trim() || color !== 'default'
                    ? 'Edit Template Notes & Color'
                    : '+ Add Details & Color (Optional)'}
                </span>
                {showDetails ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {notes && showDetails && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="text-[11px] text-slate-400 hover:text-red-500"
                >
                  Clear notes
                </button>
              )}
            </div>

            {showDetails && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 animate-slide-up">
                {/* Color Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    <span>Template Color:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {TASK_COLOR_PALETTE.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setColor(p.id)}
                        title={p.name}
                        className={`w-5 h-5 rounded-full transition-transform ${p.bgClass} ${
                          color === p.id
                            ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110 shadow-xs'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Notes Textarea */}
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add sub-items, checklist items, links, or context..."
                  className="w-full text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
                />
              </div>
            )}
          </div>

          {/* Frequency Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Frequency Options
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Option 1: Daily */}
              <button
                type="button"
                onClick={() => setMode('daily')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  mode === 'daily'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Repeat className="w-4 h-4 text-indigo-500" />
                <span>Daily</span>
              </button>

              {/* Option 2: Weekly */}
              <button
                type="button"
                onClick={() => setMode('weekly')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  mode === 'weekly'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>Weekly</span>
              </button>

              {/* Option 3: Add once right now */}
              <button
                type="button"
                onClick={() => setMode('once')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  mode === 'once'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Add Once Now</span>
              </button>
            </div>
          </div>

          {/* Weekly Day of Week Picker */}
          {mode === 'weekly' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 animate-slide-up">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose Day of the Week:
              </label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setSelectedDow(d.value)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      selectedDow === d.value
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>
              {mode === 'once'
                ? 'Add to Today Immediately'
                : mode === 'daily'
                ? 'Save Daily Routine'
                : `Save Weekly (${DAYS_OF_WEEK.find((d) => d.value === selectedDow)?.short})`}
            </span>
          </button>
        </form>
      </div>

      {/* Active Recurring Templates List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Configured Routines ({recurringTasks.length})
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Auto-generates into daily list
          </span>
        </div>

        {recurringTasks.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Repeat className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              No recurring tasks set up yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Create routines like workouts, daily standups, or weekly reviews above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recurringTasks.map((task) => {
              const isPushing = pushingTaskId === task.id;
              const isRecentlyPushed = Boolean(recentlyPushedIds[task.id]);
              const isExpanded = Boolean(expandedIds[task.id]);
              const isEditingNotes = editingNotesId === task.id;
              const hasNotes = Boolean(task.notes && task.notes.trim().length > 0);
              const taskColorKey = task.color || 'default';
              const accent = COLOR_ACCENTS[taskColorKey] || COLOR_ACCENTS.default;

              return (
                <div
                  key={task.id}
                  className={`bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs transition-all overflow-hidden ${accent.borderLeft}`}
                >
                  {/* Template Header Row */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {accent.dot && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${accent.dot}`} />
                        )}
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {task.title}
                        </p>

                        {/* Note badge indicator */}
                        {hasNotes && !isExpanded && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(task.id)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FileText className="w-3 h-3 text-indigo-500" />
                            <span>Notes</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            task.frequency === 'daily'
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          {task.frequency === 'daily'
                            ? 'Every Day'
                            : `Every ${getDayName(task.day_of_week)}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Expand / Collapse Chevron */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(task.id)}
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors ${
                          isExpanded || hasNotes
                            ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title={isExpanded ? 'Collapse notes' : 'View / Edit details & color'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <ChevronDown className={`w-4 h-4 ${hasNotes ? 'text-indigo-500' : ''}`} />
                        )}
                      </button>

                      {/* Quick Action: Add to Today (Copies Template, Notes & Color) */}
                      <button
                        type="button"
                        onClick={() => handlePushToToday(task)}
                        disabled={isPushing}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 ${
                          isRecentlyPushed
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-300'
                        }`}
                        aria-label={`Add ${task.title} to today's list`}
                      >
                        {isPushing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        ) : isRecentlyPushed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <CalendarPlus className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                        <span>
                          {isPushing ? 'Adding...' : isRecentlyPushed ? 'Added!' : '+ Today'}
                        </span>
                      </button>

                      {/* Delete Recurring Task */}
                      <button
                        type="button"
                        onClick={() => deleteRecurringTask(task.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                        aria-label={`Delete recurring task ${task.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
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
                              <span>Template Color:</span>
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
                                <span>Editing Template Notes</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Will copy to daily tasks on schedule
                              </span>
                            </div>
                            <textarea
                              ref={editNotesTextareaRef}
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
                              onClick={() => saveEditedNotes(task.id)}
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
                              onClick={() => startEditNotes(task)}
                              className="cursor-pointer group/notes rounded-xl bg-slate-50/80 dark:bg-slate-900/60 p-3 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-500/40 transition-all"
                              title="Click to edit notes"
                            >
                              <div className="whitespace-pre-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {task.notes}
                              </div>
                              <div className="mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                                  <Edit3 className="w-3 h-3" /> Click to edit template notes or color
                                </span>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditNotes(task)}
                              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:border-indigo-500 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add details, list items, or change color</span>
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
    </div>
  );
};
