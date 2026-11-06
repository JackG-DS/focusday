'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Palette,
  AlertCircle,
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { RecurringTask, TaskColor } from '@/lib/types';
import { TASK_COLOR_PALETTE } from '@/components/TaskInput';
import { COLOR_ACCENTS } from '@/components/TaskItem';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

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
  const [warningNotice, setWarningNotice] = useState<string | null>(null);
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
      const res = await addDailyTask(trimmed, trimmedNotes, taskColor);
      if (res.duplicate) {
        setWarningNotice(`"${trimmed}" is already posted on the Most Wanted board.`);
        setTimeout(() => setWarningNotice(null), 3500);
        return;
      }
      setAddedNotice(`Posted "${trimmed}" to Most Wanted.`);
    } else if (mode === 'daily') {
      await addRecurringTask(trimmed, 'daily', undefined, trimmedNotes, taskColor);
      setAddedNotice(`Added "${trimmed}" as a Daily standing order.`);
    } else if (mode === 'weekly') {
      await addRecurringTask(trimmed, 'weekly', selectedDow, trimmedNotes, taskColor);
      const dayName = DAYS_OF_WEEK.find((d) => d.value === selectedDow)?.label || 'selected day';
      setAddedNotice(`Added "${trimmed}" to post every ${dayName}.`);
    }

    setTitle('');
    setNotes('');
    setColor('default');
    setShowDetails(false);
    setWarningNotice(null);
    setTimeout(() => setAddedNotice(null), 3500);
  };

  const handlePushToToday = async (task: RecurringTask) => {
    setPushingTaskId(task.id);
    try {
      const res = await pushTemplateToToday(task.title, task.notes, task.color);
      if (res.duplicate) {
        setWarningNotice(`"${task.title}" is already posted on the Most Wanted board.`);
        setTimeout(() => setWarningNotice(null), 3500);
        return;
      }

      if (res.success) {
        setRecentlyPushedIds((prev) => ({ ...prev, [task.id]: true }));
        setAddedNotice(`Posted "${task.title}" to Most Wanted.`);
        setTimeout(() => {
          setRecentlyPushedIds((prev) => ({ ...prev, [task.id]: false }));
        }, 2500);
        setTimeout(() => {
          setAddedNotice(null);
        }, 3500);
      }
    } finally {
      setPushingTaskId(null);
    }
  };

  const getDayName = (dow?: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dow)?.label || 'Weekly';
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* View Header */}
      <div className="border-b border-[#E2DDD5] dark:border-[#2E2A26] pb-3">
        <h2 className="font-serif tracking-tight font-bold text-lg sm:text-xl text-[#1F1D1A] dark:text-[#EDE8E1]">
          Standing Orders &amp; Recurring Warrants
        </h2>
        <p className="text-xs sm:text-sm text-[#70685E] dark:text-[#8C8479] mt-0.5">
          Configure daily or weekly dispatches that automatically post to your Most Wanted board.
        </p>
      </div>

      {/* Duplicate Warning Notice */}
      {warningNotice && (
        <div className="p-3 bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#9E2A2B] dark:border-[#C94A4B] rounded-lg text-[#9E2A2B] dark:text-[#C94A4B] font-mono text-xs tracking-wider flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{warningNotice}</span>
          </div>
          <button
            onClick={() => setWarningNotice(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {addedNotice && (
        <div className="p-3 bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#8B5E3C] dark:border-[#D4A373] rounded-lg text-[#8B5E3C] dark:text-[#D4A373] font-mono text-xs tracking-wider flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{addedNotice}</span>
          </div>
          <button
            onClick={() => setActiveTab('today')}
            className="font-mono text-xs uppercase underline shrink-0 ml-2"
          >
            View Board
          </button>
        </div>
      )}

      {/* Creation Card */}
      <div className="p-4 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
        <h3 className="font-serif tracking-widest uppercase text-xs font-bold text-[#70685E] dark:text-[#8C8479]">
          Issue Standing Warrant
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title Input */}
          <div>
            <label className="block font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] mb-1">
              Notice Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning telegraph review, Weekly ledger audit..."
              className="w-full font-medium text-sm sm:text-base bg-[#F7F5F0] dark:bg-[#151413] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-md px-3 py-2 text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/60 dark:placeholder-[#8C8479]/60 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373]"
            />
          </div>

          {/* Optional Details Toggle / Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="font-mono text-xs tracking-wider uppercase text-[#8B5E3C] dark:text-[#D4A373] hover:underline flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {showDetails
                    ? 'Hide Particulars'
                    : notes.trim() || color !== 'default'
                    ? 'Edit Notes & Category Color'
                    : '+ Add Notes & Category Color'}
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
                  className="font-mono text-xs text-[#70685E] hover:text-[#9E2A2B]"
                >
                  Clear
                </button>
              )}
            </div>

            {showDetails && (
              <div className="p-3 bg-[#F2EFE9]/40 dark:bg-[#181615]/50 rounded border border-[#E2DDD5] dark:border-[#2E2A26] space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Category Border:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {TASK_COLOR_PALETTE.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setColor(p.id)}
                        title={p.name}
                        className={`w-4 h-4 rounded-sm transition-transform ${p.bgClass} ${
                          color === p.id
                            ? 'ring-1 ring-[#1F1D1A] dark:ring-[#EDE8E1] ring-offset-1 ring-offset-[#FFFDF9] dark:ring-offset-[#1E1C1A] scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add sub-items, checklist items, or context..."
                  className="w-full text-xs font-mono bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] rounded p-2.5 text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/60 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373] leading-relaxed resize-y"
                />
              </div>
            )}
          </div>

          {/* Frequency Selector */}
          <div>
            <label className="block font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] mb-1.5">
              Schedule
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('daily')}
                className={`py-2 px-3 rounded-md border font-mono text-xs tracking-wider uppercase transition-all ${
                  mode === 'daily'
                    ? 'border-[#1F1D1A] dark:border-[#EDE8E1] bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                    : 'border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
                }`}
              >
                Daily
              </button>

              <button
                type="button"
                onClick={() => setMode('weekly')}
                className={`py-2 px-3 rounded-md border font-mono text-xs tracking-wider uppercase transition-all ${
                  mode === 'weekly'
                    ? 'border-[#1F1D1A] dark:border-[#EDE8E1] bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                    : 'border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
                }`}
              >
                Weekly
              </button>

              <button
                type="button"
                onClick={() => setMode('once')}
                className={`py-2 px-3 rounded-md border font-mono text-xs tracking-wider uppercase transition-all ${
                  mode === 'once'
                    ? 'border-[#1F1D1A] dark:border-[#EDE8E1] bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                    : 'border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
                }`}
              >
                Once Now
              </button>
            </div>
          </div>

          {/* Weekly Day of Week Picker */}
          {mode === 'weekly' && (
            <div className="p-3 bg-[#F7F5F0] dark:bg-[#151413] rounded-md border border-[#E2DDD5] dark:border-[#2E2A26] space-y-2 animate-fade-in">
              <label className="block font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479]">
                Day of Dispatch:
              </label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setSelectedDow(d.value)}
                    className={`py-1.5 font-mono text-xs tracking-wider uppercase rounded transition-all ${
                      selectedDow === d.value
                        ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                        : 'bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#70685E] dark:text-[#8C8479] border border-[#E2DDD5] dark:border-[#2E2A26] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
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
            className="w-full bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 disabled:opacity-40 text-xs font-medium uppercase tracking-wider px-3.5 py-2.5 rounded-md transition-opacity"
          >
            {mode === 'once'
              ? 'Post to Most Wanted Immediately'
              : mode === 'daily'
              ? 'Save Daily Standing Order'
              : `Save Weekly Order (${DAYS_OF_WEEK.find((d) => d.value === selectedDow)?.short})`}
          </button>
        </form>
      </div>

      {/* Active Recurring Templates List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#E2DDD5] dark:border-[#2E2A26] pb-2">
          <h3 className="font-serif tracking-widest uppercase text-xs font-bold text-[#70685E] dark:text-[#8C8479]">
            Active Standing Orders ({recurringTasks.length})
          </h3>
          <span className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479]">
            AUTO-DISPATCHED
          </span>
        </div>

        {recurringTasks.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h4 className="font-serif tracking-tight font-bold text-[#1F1D1A] dark:text-[#EDE8E1] text-sm">
              No Standing Orders Registered
            </h4>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-1 max-w-xs mx-auto">
              Establish daily or weekly routines above to populate your ledger automatically.
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
                  className={`rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all ${accent.borderLeft}`}
                >
                  {/* Template Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="font-medium text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1] break-words">
                          {task.title}
                        </p>
                        <span className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373]">
                          $100
                        </span>

                        {hasNotes && !isExpanded && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(task.id)}
                            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479]"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>Notes</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap font-mono text-[11px] tracking-wider uppercase text-[#70685E] dark:text-[#8C8479]">
                        <span>
                          {task.frequency === 'daily'
                            ? 'DAILY DISPATCH'
                            : `EVERY ${getDayName(task.day_of_week).toUpperCase()}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(task.id)}
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        className="p-1 rounded text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
                        title={isExpanded ? 'Collapse notes' : 'View / Edit details & color'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Quick Action: Add to Today */}
                      <button
                        type="button"
                        onClick={() => handlePushToToday(task)}
                        disabled={isPushing}
                        className={`inline-flex items-center gap-1 font-mono text-xs tracking-wider uppercase px-2.5 py-1 rounded border transition-colors ${
                          isRecentlyPushed
                            ? 'border-[#8B5E3C] dark:border-[#D4A373] text-[#8B5E3C] dark:text-[#D4A373] bg-[#F7F5F0] dark:bg-[#151413]'
                            : 'border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#1F1D1A] dark:text-[#EDE8E1] hover:border-[#8B5E3C] dark:hover:border-[#D4A373]'
                        }`}
                        aria-label={`Post ${task.title} to Most Wanted`}
                      >
                        {isPushing ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : isRecentlyPushed ? (
                          <Check className="w-3 h-3" />
                        ) : null}
                        <span>
                          {isPushing ? 'Posting...' : isRecentlyPushed ? 'Posted' : '+ Board'}
                        </span>
                      </button>

                      {/* Delete Recurring Task */}
                      <button
                        type="button"
                        onClick={() => deleteRecurringTask(task.id)}
                        className="p-1.5 text-[#70685E] dark:text-[#8C8479] hover:text-[#9E2A2B] dark:hover:text-[#C94A4B] rounded transition-colors"
                        aria-label={`Delete recurring task ${task.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Notes & Color Drawer */}
                  {isExpanded && (
                    <div className="mt-3 pt-2.5 border-t border-[#E2DDD5] dark:border-[#2E2A26] animate-fade-in space-y-2.5">
                      {isEditingNotes ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] flex items-center gap-1">
                              <Palette className="w-3 h-3" />
                              <span>Category Border:</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              {TASK_COLOR_PALETTE.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setEditColorValue(p.id)}
                                  title={p.name}
                                  className={`w-3.5 h-3.5 rounded-sm transition-transform ${p.bgClass} ${
                                    editColorValue === p.id
                                      ? 'ring-1 ring-[#1F1D1A] dark:ring-[#EDE8E1] ring-offset-1 ring-offset-[#FFFDF9] dark:ring-offset-[#1E1C1A] scale-110'
                                      : 'opacity-70 hover:opacity-100'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <textarea
                            ref={editNotesTextareaRef}
                            value={editNotesValue}
                            onChange={(e) => setEditNotesValue(e.target.value)}
                            rows={3}
                            placeholder="Add standing notes or checklist items..."
                            className="w-full bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono border border-[#E2DDD5] dark:border-[#2E2A26] text-[#1F1D1A] dark:text-[#EDE8E1] focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373] leading-relaxed resize-y"
                          />

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingNotesId(null)}
                              className="px-2.5 py-1 font-mono text-xs uppercase tracking-wider rounded border border-[#E2DDD5] dark:border-[#2E2A26] text-[#70685E] dark:text-[#8C8479]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEditedNotes(task.id)}
                              className="bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3 py-1 rounded-md flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {hasNotes ? (
                            <div
                              onClick={() => startEditNotes(task)}
                              className="cursor-pointer bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono text-[#1F1D1A] dark:text-[#EDE8E1] border border-transparent hover:border-[#E2DDD5] dark:hover:border-[#2E2A26] transition-all"
                              title="Click to edit notes"
                            >
                              <div className="whitespace-pre-wrap leading-relaxed">
                                {task.notes}
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-[#E2DDD5]/60 dark:border-[#2E2A26]/60 flex items-center justify-between text-[10px] uppercase tracking-wider text-[#70685E] dark:text-[#8C8479]">
                                <span className="flex items-center gap-1">
                                  <Edit3 className="w-2.5 h-2.5" /> Edit standing notes or color
                                </span>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditNotes(task)}
                              className="w-full bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono tracking-wider text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] border border-[#E2DDD5] dark:border-[#2E2A26] transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add standing notes or category color</span>
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
