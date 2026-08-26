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
} from 'lucide-react';
import { DailyTask } from '@/lib/types';
import { useTaskContext } from '@/context/TaskContext';

interface TaskItemProps {
  task: DailyTask;
  isDragDisabled?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, isDragDisabled = false }) => {
  const {
    toggleDailyTask,
    updateDailyTaskTitle,
    updateDailyTaskNotes,
    deleteDailyTask,
  } = useTaskContext();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState(task.notes || '');

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border transition-all select-none ${
        isDragging
          ? 'z-50 opacity-90 scale-[1.02] shadow-xl bg-white dark:bg-slate-800 border-emerald-500/60 ring-2 ring-emerald-500/20'
          : task.completed
          ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 text-slate-400 dark:text-slate-500'
          : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Main Task Row */}
      <div className="flex items-center gap-2.5 p-3.5">
        {/* Drag Handle (Touch & Mouse friendly) */}
        {!isDragDisabled && (
          <button
            type="button"
            aria-label="Drag to reorder task"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors touch-none focus:outline-none shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Interactive Checkbox */}
        <button
          type="button"
          onClick={() => toggleDailyTask(task.id)}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 border ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs shadow-emerald-500/30'
              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-400 bg-transparent'
          }`}
        >
          {task.completed && <Check className="w-4 h-4 stroke-[2.5]" />}
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
                className="w-full bg-slate-100 dark:bg-slate-900 border border-emerald-500 rounded-lg px-2.5 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
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
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={() => toggleDailyTask(task.id)}
                className={`text-sm sm:text-base font-medium break-words cursor-pointer transition-all ${
                  task.completed ? 'line-through opacity-70' : ''
                }`}
              >
                {task.title}
              </span>

              {/* Note Icon / Indicator Badge */}
              {hasNotes && !isExpanded && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="View notes"
                >
                  <FileText className="w-3 h-3 text-emerald-500" />
                  <span>Notes</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Expand Chevron, Edit & Delete */}
        {!isEditingTitle && (
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Expand / Collapse Chevron Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse notes' : 'Expand notes'}
              title={isExpanded ? 'Collapse details' : 'Expand details & notes'}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors ${
                isExpanded || hasNotes
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 opacity-90 sm:opacity-0 group-hover:opacity-100'
              }`}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <ChevronDown className={`w-4 h-4 ${hasNotes ? 'text-emerald-500' : ''}`} />
              )}
            </button>

            {/* Edit Title Button */}
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              aria-label="Edit task title"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => deleteDailyTask(task.id)}
              aria-label="Delete task"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Expandable Notes Drawer / Accordion */}
      {isExpanded && (
        <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-700/50 animate-slide-up">
          {isEditingNotes ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-500" />
                  <span>Editing Notes</span>
                </span>
                <span className="text-[10px] text-slate-400">Markdown / Lists supported</span>
              </div>
              <textarea
                ref={notesTextareaRef}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Add sub-items, checklist items, links, or notes..."
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-emerald-500/70 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditNotes(task.notes || '');
                    setIsEditingNotes(false);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  <span>Save Notes</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {hasNotes ? (
                <div
                  onClick={() => setIsEditingNotes(true)}
                  className="cursor-pointer group/notes rounded-xl bg-slate-50/80 dark:bg-slate-900/60 p-3 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-500/40 transition-all"
                  title="Click to edit notes"
                >
                  <div className="whitespace-pre-wrap text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {task.notes}
                  </div>
                  <div className="mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Edit3 className="w-3 h-3" /> Click to edit notes
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold text-slate-500 hover:text-emerald-600 hover:border-emerald-500 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add details, list items, or notes</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
