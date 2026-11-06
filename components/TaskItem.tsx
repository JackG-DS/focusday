'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Check,
  Trash2,
  Edit3,
  CheckCheck,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Save,
  Plus,
  Palette,
} from 'lucide-react';
import { DailyTask, TaskColor } from '@/lib/types';
import { useTaskContext } from '@/context/TaskContext';
import { TASK_COLOR_PALETTE } from '@/components/TaskInput';

interface TaskItemProps {
  task: DailyTask;
  isDragDisabled?: boolean;
}

export const COLOR_ACCENTS: Record<string, { borderLeft: string }> = {
  red: { borderLeft: 'border-l-[3px] border-l-[#9E2A2B] dark:border-l-[#C94A4B]' },
  orange: { borderLeft: 'border-l-[3px] border-l-[#B85D3B] dark:border-l-[#D47A55]' },
  amber: { borderLeft: 'border-l-[3px] border-l-[#8B5E3C] dark:border-l-[#D4A373]' },
  emerald: { borderLeft: 'border-l-[3px] border-l-[#4A6B53] dark:border-l-[#6B9075]' },
  blue: { borderLeft: 'border-l-[3px] border-l-[#4A6278] dark:border-l-[#6C8CA8]' },
  purple: { borderLeft: 'border-l-[3px] border-l-[#6E536E] dark:border-l-[#967596]' },
  default: { borderLeft: '' },
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, isDragDisabled = false }) => {
  const {
    toggleDailyTask,
    updateDailyTaskTitle,
    updateDailyTaskNotes,
    updateDailyTaskColor,
    deleteDailyTask,
    getTaskBountyValue,
    getTaskMinutesUntilDecay,
    isTaskBonus,
  } = useTaskContext();

  const bountyValue = getTaskBountyValue(task);
  const minutesUntilDecay = getTaskMinutesUntilDecay(task);
  const isBonus = isTaskBonus(task);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState(task.notes || '');
  const [selectedColor, setSelectedColor] = useState<TaskColor>((task.color as TaskColor) || 'default');

  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragDisabled || isEditingTitle || isEditingNotes,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    setEditNotes(task.notes || '');
  }, [task.notes]);

  useEffect(() => {
    setSelectedColor((task.color as TaskColor) || 'default');
  }, [task.color]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingNotes && notesTextareaRef.current) {
      notesTextareaRef.current.focus();
    }
  }, [isEditingNotes]);

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      updateDailyTaskTitle(task.id, editTitle.trim());
    } else {
      setEditTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleSaveNotes = () => {
    updateDailyTaskNotes(task.id, editNotes.trim() || null);
    if (selectedColor !== (task.color || 'default')) {
      updateDailyTaskColor(task.id, selectedColor !== 'default' ? selectedColor : null);
    }
    setIsEditingNotes(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  const hasNotes = Boolean(task.notes && task.notes.trim().length > 0);
  const taskColorKey = task.color || 'default';
  const accent = COLOR_ACCENTS[taskColorKey] || COLOR_ACCENTS.default;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all select-none ${
        accent.borderLeft
      } ${
        isDragging
          ? 'z-50 opacity-95 ring-1 ring-[#8B5E3C] dark:ring-[#D4A373]'
          : 'hover:border-[#70685E]/40 dark:hover:border-[#8C8479]/40'
      }`}
    >
      {/* Main Task Row */}
      <div className="flex items-center gap-2.5">
        {/* Drag Handle */}
        {!isDragDisabled && (
          <button
            type="button"
            aria-label="Drag to reorder task"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-[#70685E]/60 dark:text-[#8C8479]/60 hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors touch-none focus:outline-none shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Square Brass / Ink Checkbox */}
        <button
          type="button"
          onClick={() => toggleDailyTask(task.id)}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
          className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 transition-colors ${
            task.completed
              ? 'border border-[#1F1D1A] dark:border-[#EDE8E1] bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413]'
              : 'border border-[#70685E]/50 dark:border-[#8C8479]/50 hover:border-[#1F1D1A] dark:hover:border-[#EDE8E1] bg-transparent'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
        </button>

        {/* Task Title / Inline Edit */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                className="w-full bg-[#F7F5F0] dark:bg-[#151413] border border-[#8B5E3C] dark:border-[#D4A373] rounded px-2.5 py-1 text-sm font-medium text-[#1F1D1A] dark:text-[#EDE8E1] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-[#8B5E3C] dark:text-[#D4A373] hover:opacity-80"
                title="Save title"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditTitle(task.title);
                  setIsEditingTitle(false);
                }}
                className="p-1 text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                onClick={() => toggleDailyTask(task.id)}
                className={`font-medium text-sm sm:text-base break-words cursor-pointer transition-all ${
                  task.completed
                    ? 'opacity-50 text-[#70685E] dark:text-[#8C8479] line-through'
                    : 'text-[#1F1D1A] dark:text-[#EDE8E1]'
                }`}
              >
                {task.title}
              </span>

              {/* Bounty Value Ledger Entry */}
              <span
                className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373] shrink-0"
                title={
                  isBonus
                    ? task.completed
                      ? 'Bounty reward claimed: +$10 added to weekly pool'
                      : 'Bonus Bounty contract: Fixed $10 value (no decay)'
                    : task.completed
                    ? `Most Wanted reward claimed: +$${bountyValue} added to weekly pool`
                    : bountyValue <= 20
                    ? 'Minimum floor reached ($20)'
                    : `Decreases by $1/hr (min $20). Next -$1 in ${minutesUntilDecay ?? 60}m`
                }
              >
                ${bountyValue}
              </span>

              {/* Completed Status Tag */}
              {task.completed && (
                <span className="font-mono text-[10px] tracking-widest uppercase font-bold text-[#9E2A2B] dark:text-[#C94A4B] shrink-0">
                  [CLAIMED]
                </span>
              )}

              {/* Note Indicator */}
              {hasNotes && !isExpanded && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
                  title="View notes"
                >
                  <FileText className="w-2.5 h-2.5" />
                  <span>Notes</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Expand Chevron, Edit & Delete */}
        {!isEditingTitle && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse notes' : 'Expand notes'}
              title={isExpanded ? 'Collapse details' : 'Expand details & notes'}
              className={`p-1 rounded text-xs flex items-center transition-colors ${
                isExpanded || hasNotes
                  ? 'text-[#1F1D1A] dark:text-[#EDE8E1]'
                  : 'text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] opacity-90 sm:opacity-0 group-hover:opacity-100'
              }`}
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              aria-label="Edit task title"
              className="p-1 text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] rounded transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => deleteDailyTask(task.id)}
              aria-label="Delete task"
              className="p-1 text-[#70685E] dark:text-[#8C8479] hover:text-[#9E2A2B] dark:hover:text-[#C94A4B] rounded transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Expandable Notes Drawer / Accordion */}
      {isExpanded && (
        <div className="mt-3 pt-2.5 border-t border-[#E2DDD5] dark:border-[#2E2A26] animate-fade-in space-y-2.5">
          {isEditingNotes ? (
            <div className="space-y-2.5">
              {/* Color Selector in Edit Mode */}
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
                      onClick={() => setSelectedColor(p.id)}
                      title={p.name}
                      className={`w-3.5 h-3.5 rounded-sm transition-transform ${p.bgClass} ${
                        selectedColor === p.id
                          ? 'ring-1 ring-[#1F1D1A] dark:ring-[#EDE8E1] ring-offset-1 ring-offset-[#FFFDF9] dark:ring-offset-[#1E1C1A] scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Notes Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px] tracking-wider uppercase text-[#70685E] dark:text-[#8C8479]">
                  <span>Ledger Notes / Checklist</span>
                </div>
                <textarea
                  ref={notesTextareaRef}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add ledger notes, sub-items, or coordinates..."
                  className="w-full bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono border border-[#E2DDD5] dark:border-[#2E2A26] text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/60 dark:placeholder-[#8C8479]/60 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373] leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditNotes(task.notes || '');
                    setSelectedColor((task.color as TaskColor) || 'default');
                    setIsEditingNotes(false);
                  }}
                  className="px-2.5 py-1 font-mono text-xs uppercase tracking-wider rounded border border-[#E2DDD5] dark:border-[#2E2A26] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3 py-1 rounded-md transition-all flex items-center gap-1"
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
                  onClick={() => setIsEditingNotes(true)}
                  className="cursor-pointer bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono text-[#1F1D1A] dark:text-[#EDE8E1] border border-transparent hover:border-[#E2DDD5] dark:hover:border-[#2E2A26] transition-all"
                  title="Click to edit notes"
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {task.notes}
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-[#E2DDD5]/60 dark:border-[#2E2A26]/60 flex items-center justify-between text-[10px] uppercase tracking-wider text-[#70685E] dark:text-[#8C8479]">
                    <span className="flex items-center gap-1">
                      <Edit3 className="w-2.5 h-2.5" /> Edit notes or border color
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="w-full bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono tracking-wider text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] border border-[#E2DDD5] dark:border-[#2E2A26] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add notes, checklist items, or category color</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
