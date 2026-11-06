'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
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
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { DailyTask, TaskColor } from '@/lib/types';
import { TASK_COLOR_PALETTE } from '@/components/TaskInput';
import { COLOR_ACCENTS } from '@/components/TaskItem';

export const TomorrowPreview: React.FC = () => {
  const {
    tomorrowTasks,
    moveTaskToToday,
    deleteDailyTask,
    updateDailyTaskTitle,
    updateDailyTaskNotes,
    updateDailyTaskColor,
    getTaskBountyValue,
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
    <div className="rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#F7F5F0]/60 dark:hover:bg-[#151413]/40 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-serif tracking-tight font-bold text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
              Tomorrow&apos;s Leads
            </h3>
            <span className="font-mono text-xs tracking-wider px-2 py-0.5 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#8B5E3C] dark:text-[#D4A373] font-semibold">
              {tomorrowTasks.length}
            </span>
          </div>
          <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-0.5">
            DECAY PAUSED UNTIL POSTED TO TODAY&apos;S BOARD
          </p>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479]">
          <span className="hidden sm:inline">{isOpen ? 'Hide' : 'Inspect'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Collapsible Body */}
      {isOpen && (
        <div className="p-3.5 pt-2.5 border-t border-[#E2DDD5] dark:border-[#2E2A26] animate-fade-in space-y-2">
          {tomorrowTasks.length === 0 ? (
            <div className="text-center py-6 px-4 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0]/50 dark:bg-[#151413]/50">
              <p className="font-serif tracking-tight font-bold text-sm text-[#1F1D1A] dark:text-[#EDE8E1]">
                No Leads Logged for Tomorrow
              </p>
              <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-1">
                Select &ldquo;Tomorrow&rdquo; in the input bar above to stage upcoming targets.
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
                const bountyVal = getTaskBountyValue(task);

                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all ${accent.borderLeft}`}
                  >
                    {/* Item Row */}
                    <div className="flex items-center justify-between gap-2.5">
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
                              className="w-full bg-[#F7F5F0] dark:bg-[#151413] border border-[#8B5E3C] dark:border-[#D4A373] rounded px-2.5 py-1 text-sm font-medium text-[#1F1D1A] dark:text-[#EDE8E1] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTitle(task.id)}
                              className="p-1 text-[#8B5E3C] dark:text-[#D4A373]"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTitleId(null)}
                              className="p-1 text-[#70685E] dark:text-[#8C8479]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1] break-words">
                              {task.title}
                            </span>

                            <span
                              className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373] shrink-0"
                              title="Paused until moved to Today's Most Wanted"
                            >
                              ${bountyVal}
                            </span>

                            {hasNotes && !isExpanded && (
                              <button
                                type="button"
                                onClick={() => toggleTaskExpand(task.id)}
                                className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479]"
                              >
                                <FileText className="w-2.5 h-2.5" />
                                <span>Notes</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleTaskExpand(task.id)}
                          className="p-1 rounded text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
                          title={isExpanded ? 'Collapse notes' : 'View notes & color'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveToToday(task.id)}
                          disabled={isMoving}
                          className="inline-flex items-center gap-1 font-mono text-xs tracking-wider uppercase px-2 py-1 bg-[#F7F5F0] dark:bg-[#151413] text-[#1F1D1A] dark:text-[#EDE8E1] hover:border-[#8B5E3C] dark:hover:border-[#D4A373] rounded border border-[#E2DDD5] dark:border-[#2E2A26] transition-colors"
                          title="Post to Most Wanted immediately"
                        >
                          <ArrowUpRight className="w-3 h-3 text-[#8B5E3C] dark:text-[#D4A373]" />
                          <span>{isMoving ? 'Posting...' : 'Post Now'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditTitle(task)}
                          className="p-1 text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] rounded transition-colors"
                          title="Edit task title"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteDailyTask(task.id)}
                          className="p-1 text-[#70685E] dark:text-[#8C8479] hover:text-[#9E2A2B] dark:hover:text-[#C94A4B] rounded transition-colors"
                          title="Delete tomorrow's task"
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
                              ref={notesTextareaRef}
                              value={editNotesValue}
                              onChange={(e) => setEditNotesValue(e.target.value)}
                              rows={3}
                              placeholder="Add ledger notes or checklist items..."
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
                                onClick={() => handleSaveNotes(task.id)}
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
                                onClick={() => handleStartEditNotes(task)}
                                className="cursor-pointer bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono text-[#1F1D1A] dark:text-[#EDE8E1] border border-transparent hover:border-[#E2DDD5] dark:hover:border-[#2E2A26] transition-all"
                                title="Click to edit notes"
                              >
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {task.notes}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditNotes(task)}
                                className="w-full bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono tracking-wider text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] border border-[#E2DDD5] dark:border-[#2E2A26] transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add notes or category color</span>
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
