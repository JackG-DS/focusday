'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check, Trash2, Edit3, CheckCheck, X } from 'lucide-react';
import { DailyTask } from '@/lib/types';
import { useTaskContext } from '@/context/TaskContext';

interface TaskItemProps {
  task: DailyTask;
  isDragDisabled?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, isDragDisabled = false }) => {
  const { toggleDailyTask, updateDailyTaskTitle, deleteDailyTask } = useTaskContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragDisabled || isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      updateDailyTaskTitle(task.id, editTitle.trim());
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all select-none ${
        isDragging
          ? 'z-50 opacity-90 scale-[1.02] shadow-xl bg-white dark:bg-slate-800 border-emerald-500/60 ring-2 ring-emerald-500/20'
          : task.completed
          ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 text-slate-400 dark:text-slate-500'
          : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Drag Handle (Touch & Mouse friendly) */}
      {!isDragDisabled && (
        <button
          type="button"
          aria-label="Drag to reorder task"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors touch-none focus:outline-none"
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

      {/* Task Content / Inline Edit Input */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-emerald-500 rounded-lg px-2.5 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveEdit}
              className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              title="Save"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTitle(task.title);
                setIsEditing(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span
            onClick={() => toggleDailyTask(task.id)}
            className={`block text-sm sm:text-base font-medium break-words cursor-pointer transition-all ${
              task.completed ? 'line-through opacity-70' : ''
            }`}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Action buttons (Edit & Delete) */}
      {!isEditing && (
        <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label="Edit task"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteDailyTask(task.id)}
            aria-label="Delete task"
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
