'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share, X, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isInStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isInStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="p-3.5 bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-2 animate-fade-in">
        <div>
          <p className="font-serif tracking-tight font-bold text-sm text-[#1F1D1A] dark:text-[#EDE8E1]">
            Install BountyList Edition
          </p>
          <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-0.5">
            Add to your home screen for offline ledger access
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3 py-1.5 rounded-md flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Installation Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151413]/70 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-lg p-5 shadow-lg space-y-4 text-center">
            <h3 className="font-serif tracking-tight font-bold text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
              Install on iOS (Safari)
            </h3>

            <div className="text-left space-y-2.5 text-xs text-[#70685E] dark:text-[#8C8479]">
              <p>
                1. Tap the <strong className="text-[#1F1D1A] dark:text-[#EDE8E1]">Share</strong> button{' '}
                <Share className="w-3.5 h-3.5 inline mx-0.5" /> in Safari&apos;s toolbar.
              </p>
              <p>
                2. Scroll down and select{' '}
                <strong className="text-[#1F1D1A] dark:text-[#EDE8E1]">Add to Home Screen</strong>{' '}
                <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" />.
              </p>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3.5 py-2 rounded-md transition-opacity"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
};
