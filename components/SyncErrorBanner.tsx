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
    <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 dark:border-rose-500/40 rounded-2xl text-rose-900 dark:text-rose-200 text-xs sm:text-sm animate-slide-up shadow-xs mb-3 flex items-start justify-between gap-2.5">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="p-1.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-rose-950 dark:text-rose-100">
            Cloud Sync Disconnected
          </p>
          <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-0.5 leading-relaxed">
            {syncErrorMessage || 'Database unreachable. Running locally with offline storage.'}
          </p>
          {authUser.isAuthenticated && (
            <button
              onClick={() => syncWithCloud()}
              disabled={isSyncing}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-xs rounded-lg transition-all shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Reconnecting...' : 'Retry Cloud Sync'}</span>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={dismissSyncError}
        className="p-1 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-colors shrink-0"
        aria-label="Dismiss error banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
