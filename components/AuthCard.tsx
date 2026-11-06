'use client';

import React, { useState } from 'react';
import {
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const AuthCard: React.FC = () => {
  const {
    authUser,
    authLoading,
    authError,
    setAuthError,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    supabaseConfig,
  } = useTaskContext();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setAuthError(null);

    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      setAuthError('Please configure your Supabase Project URL & Anon Key below first.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signin') {
      const ok = await handleSignIn(email, password);
      if (ok) {
        setSuccessMessage('Signed in successfully.');
      }
    } else {
      const ok = await handleSignUp(email, password);
      if (ok) {
        setSuccessMessage('Account created. Check your email for confirmation if required.');
      }
    }
  };

  if (authUser.isAuthenticated) {
    return (
      <div className="p-4 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#8B5E3C] dark:text-[#D4A373] font-semibold">
              Authenticated Ledger Account
            </p>
            <h4 className="font-serif tracking-tight font-bold text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1] mt-0.5">
              {authUser.email || 'Authenticated User'}
            </h4>
          </div>

          <button
            onClick={handleSignOut}
            disabled={authLoading}
            className="px-3 py-1.5 bg-[#F7F5F0] dark:bg-[#151413] text-[#9E2A2B] dark:text-[#C94A4B] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-md font-mono text-xs uppercase tracking-wider hover:border-[#9E2A2B] dark:hover:border-[#C94A4B] transition-colors flex items-center gap-1.5"
          >
            {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-serif tracking-tight font-bold text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
            Account Credentials
          </h3>
          <p className="text-xs text-[#70685E] dark:text-[#8C8479]">
            Sign in to protect your ledger with Row-Level Security.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#F7F5F0] dark:bg-[#151413] p-0.5 rounded-md border border-[#E2DDD5] dark:border-[#2E2A26] font-mono text-xs uppercase tracking-wider">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setAuthError(null);
              setSuccessMessage(null);
            }}
            className={`px-2.5 py-1 rounded-sm transition-all ${
              mode === 'signin'
                ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                : 'text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setAuthError(null);
              setSuccessMessage(null);
            }}
            className={`px-2.5 py-1 rounded-sm transition-all ${
              mode === 'signup'
                ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] font-semibold'
                : 'text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
            }`}
          >
            Register
          </button>
        </div>
      </div>

      {/* Error and Success alerts */}
      {authError && (
        <div className="p-2.5 bg-[#F7F5F0] dark:bg-[#151413] border border-[#9E2A2B] dark:border-[#C94A4B] rounded text-[#9E2A2B] dark:text-[#C94A4B] font-mono text-xs tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 bg-[#F7F5F0] dark:bg-[#151413] border border-[#8B5E3C] dark:border-[#D4A373] rounded text-[#8B5E3C] dark:text-[#D4A373] font-mono text-xs tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full text-sm bg-[#F7F5F0] dark:bg-[#151413] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-md px-3 py-2 text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/50 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373]"
          />
        </div>

        <div>
          <label className="block font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
            minLength={6}
            className="w-full text-sm bg-[#F7F5F0] dark:bg-[#151413] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-md px-3 py-2 text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/50 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373]"
          />
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="w-full bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 disabled:opacity-50 text-xs font-medium uppercase tracking-wider px-3.5 py-2.5 rounded-md transition-opacity flex items-center justify-center gap-1.5"
        >
          {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          <span>
            {authLoading
              ? 'Authenticating...'
              : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
          </span>
        </button>
      </form>
    </div>
  );
};
