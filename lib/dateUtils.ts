// Bulletproof Local & Logical Date Utility
// Always uses local timezone components and respects the user's daily reset_time (default 04:00)
// to prevent UTC date skew in evening hours and premature rollovers before the reset time.

const DEFAULT_RESET_TIME = '04:00';

export const getConfiguredResetTime = (overrideResetTime?: string): string => {
  if (overrideResetTime && overrideResetTime.includes(':')) {
    return overrideResetTime.slice(0, 5);
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('antigravity_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reset_time === 'string' && parsed.reset_time.includes(':')) {
          return parsed.reset_time.slice(0, 5);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }
  return DEFAULT_RESET_TIME;
};

export const getLogicalDate = (d = new Date(), resetTime?: string): Date => {
  const effectiveReset = getConfiguredResetTime(resetTime);
  const [resetHStr, resetMStr] = effectiveReset.split(':');
  const resetH = parseInt(resetHStr, 10);
  const resetM = parseInt(resetMStr, 10);

  const shifted = new Date(d.getTime());
  if (!Number.isNaN(resetH)) {
    shifted.setHours(
      shifted.getHours() - resetH,
      shifted.getMinutes() - (Number.isNaN(resetM) ? 0 : resetM)
    );
  }
  return shifted;
};

export const formatDateComponents = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalDateString = (d = new Date(), resetTime?: string): string => {
  const logical = getLogicalDate(d, resetTime);
  return formatDateComponents(logical);
};

export const getTomorrowDateString = (d = new Date(), resetTime?: string): string => {
  const logical = getLogicalDate(d, resetTime);
  logical.setDate(logical.getDate() + 1);
  return formatDateComponents(logical);
};

