'use client';

import React, { useState } from 'react';
import {
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Palette,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { TaskColor } from '@/lib/types';

export const TASK_COLOR_PALETTE: { id: TaskColor; name: string; bgClass: string }[] = [
  { id: 'default', name: 'Default', bgClass: 'bg-[#70685E]/40 dark:bg-[#8C8479]/40' },
  { id: 'red', name: 'Crimson', bgClass: 'bg-[#9E2A2B] dark:bg-[#C94A4B]' },
  { id: 'orange', name: 'Rust', bgClass: 'bg-[#B85D3B] dark:bg-[#D47A55]' },
  { id: 'amber', name: 'Saddle', bgClass: 'bg-[#8B5E3C] dark:bg-[#D4A373]' },
  { id: 'emerald', name: 'Sage', bgClass: 'bg-[#4A6B53] dark:bg-[#6B9075]' },
  { id: 'blue', name: 'Slate', bgClass: 'bg-[#4A6278] dark:bg-[#6C8CA8]' },
  { id: 'purple', name: 'Plum', bgClass: 'bg-[#6E536E] dark:bg-[#967596]' },
];

export const TaskInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const [bountyInput, setBountyInput] = useState('100');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState<TaskColor>('default');
  const [targetDateMode, setTargetDateMode] = useState<'today' | 'tomorrow'>('today');
  const [showDetails, setShowDetails] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { addDailyTask, todayStr, tomorrowStr } = useTaskContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const trimmedTitle = title.trim();
    const targetDate = targetDateMode === 'today' ? todayStr : tomorrowStr;
    const parsedBounty = parseInt(bountyInput, 10);
    const bountyAmount = !Number.isNaN(parsedBounty) && parsedBounty > 0 ? parsedBounty : 100;

    const result = await addDailyTask(
      trimmedTitle,
      notes.trim() || null,
      color !== 'default' ? color : null,
      targetDate,
      bountyAmount
    );

    if (result.duplicate) {
      setWarningMessage(result.message || `"${trimmedTitle}" is already posted on this board.`);
      setTimeout(() => setWarningMessage(null), 3500);
      return;
    }

    if (result.success) {
      if (targetDateMode === 'tomorrow') {
        setSuccessMessage(`Posted "${trimmedTitle}" to tomorrow's leads.`);
        setTimeout(() => setSuccessMessage(null), 3500);
      }

      setTitle('');
      setBountyInput('100');
      setNotes('');
      setColor('default');
      setShowDetails(false);
      setWarningMessage(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Target Date Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center p-0.5 bg-[#FFFDF9] dark:bg-[#1E1C1A] rounded-md border border-[#E2DDD5] dark:border-[#2E2A26]">
          <button
            type="button"
            onClick={() => setTargetDateMode('today')}
            className={`px-2.5 py-1 rounded-sm font-mono text-xs tracking-wider uppercase transition-all ${
              targetDateMode === 'today'
                ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                : 'text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
            }`}
          >
            Most Wanted
          </button>
          <button
            type="button"
            onClick={() => setTargetDateMode('tomorrow')}
            className={`px-2.5 py-1 rounded-sm font-mono text-xs tracking-wider uppercase transition-all ${
              targetDateMode === 'tomorrow'
                ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                : 'text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
            }`}
          >
            Tomorrow
          </button>
        </div>

        <span className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] hidden sm:inline">
          {targetDateMode === 'today'
            ? 'DECAY: -$1/HR (MIN $20)'
            : 'PAUSED UNTIL DAWN'}
        </span>
      </div>

      {/* Duplicate Warning Toast */}
      {warningMessage && (
        <div className="p-3 bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#9E2A2B] dark:border-[#C94A4B] rounded-lg text-[#9E2A2B] dark:text-[#C94A4B] font-mono text-xs tracking-wider flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Feedback for Tomorrow */}
      {successMessage && (
        <div className="p-3 bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#8B5E3C] dark:border-[#D4A373] rounded-lg text-[#8B5E3C] dark:text-[#D4A373] font-mono text-xs tracking-wider flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Minimalist Single-Row Input Container with Hairline Border */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#FFFDF9] dark:bg-[#1E1C1A] rounded-lg border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all overflow-hidden"
      >
        <div className="flex items-center gap-1.5 p-2">
          {/* Task Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              targetDateMode === 'today'
                ? 'Post a new Most Wanted notice...'
                : 'Log a notice for tomorrow...'
            }
            className="flex-1 min-w-0 bg-transparent text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/60 dark:placeholder-[#8C8479]/60 font-medium text-sm sm:text-base px-2 py-1 focus:outline-none"
          />

          {/* Integrated Currency Bounty Field */}
          <div
            className="flex items-center border-l border-[#E2DDD5] dark:border-[#2E2A26] pl-2.5 pr-1 shrink-0"
            title="Starting bounty amount ($)"
          >
            <span className="font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373] select-none">
              $
            </span>
            <input
              type="number"
              min={1}
              max={9999}
              value={bountyInput}
              onChange={(e) => setBountyInput(e.target.value)}
              aria-label="Bounty reward amount"
              className="w-16 bg-transparent font-mono text-xs tracking-wider font-semibold text-[#8B5E3C] dark:text-[#D4A373] placeholder-[#70685E]/50 focus:outline-none px-1 py-1"
            />
          </div>

          {/* Toggle Details / Notes Button */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            title={showDetails ? 'Hide details' : 'Add notes or category color'}
            className={`p-1.5 rounded border transition-colors shrink-0 flex items-center gap-0.5 ${
              showDetails || notes.trim() || color !== 'default'
                ? 'border-[#8B5E3C] dark:border-[#D4A373] text-[#8B5E3C] dark:text-[#D4A373] bg-[#F7F5F0] dark:bg-[#151413]'
                : 'border-transparent text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {showDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Submit Button: Minimal Solid Ink Button */}
          <button
            type="submit"
            disabled={!title.trim()}
            aria-label={targetDateMode === 'today' ? 'Add task to today' : 'Add task to tomorrow'}
            className="bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 disabled:opacity-40 text-xs font-medium uppercase tracking-wider px-3.5 py-2 rounded-md transition-opacity shrink-0"
          >
            Post
          </button>
        </div>

        {/* Expandable Details: Notes & Color Picker */}
        {showDetails && (
          <div className="p-3 pt-2.5 border-t border-[#E2DDD5] dark:border-[#2E2A26] animate-fade-in space-y-3">
            {/* Color Palette Selector */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] flex items-center gap-1.5">
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
                    aria-label={`Color ${p.name}`}
                    className={`w-4 h-4 rounded-sm transition-transform ${p.bgClass} ${
                      color === p.id
                        ? 'ring-1 ring-[#1F1D1A] dark:ring-[#EDE8E1] ring-offset-1 ring-offset-[#FFFDF9] dark:ring-offset-[#1E1C1A] scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Notes Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479]">
                <span>Dispatch Notes &amp; Sub-items</span>
                {notes && (
                  <button
                    type="button"
                    onClick={() => setNotes('')}
                    className="hover:text-[#9E2A2B] dark:hover:text-[#C94A4B] flex items-center gap-0.5"
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
                placeholder="Add particulars, checklist items, or context..."
                className="w-full bg-[#F2EFE9]/40 dark:bg-[#181615]/50 p-2.5 rounded text-xs font-mono border border-[#E2DDD5] dark:border-[#2E2A26] text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/60 dark:placeholder-[#8C8479]/60 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373] leading-relaxed resize-y"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
