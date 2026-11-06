'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const SyncErrorBanner: React.FC = () => {
  const { syncErrorMessage, dismissSyncError, syncWithCloud, isSyncing, syncStatus, authUser } = useTaskContext();

  if (!syncErrorMessage && syncStatus !== 'error') {
    return null;
  }

  return (
    <div className="p-3.5 bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] border-l-[3px] border-l-[#9E2A2B] dark:border-l-[#C94A4B] rounded-lg text-xs sm:text-sm animate-fade-in flex items-start justify-between gap-2.5">
      <div className="flex items-start gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-[#9E2A2B] dark:text-[#C94A4B] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-serif tracking-tight font-bold text-[#1F1D1A] dark:text-[#EDE8E1]">
            Telegraph Sync Disconnected
          </p>
          <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-0.5 leading-relaxed">
            {syncErrorMessage || 'Database unreachable. Operating on local ledger storage.'}
          </p>
          {authUser.isAuthenticated && (
            <button
              onClick={() => syncWithCloud()}
              disabled={isSyncing}
              className="mt-2 inline-flex items-center gap-1.5 bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3 py-1.5 rounded-md transition-opacity"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Reconnecting...' : 'Retry Sync'}</span>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={dismissSyncError}
        className="p-1 text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] rounded transition-colors shrink-0"
        aria-label="Dismiss error banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
