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

// Returns the ISO timestamp for when a given YYYY-MM-DD logical day begins (at resetTime, e.g. 04:00 local)
export const getLogicalDayStartIso = (dateStr: string, resetTime?: string): string => {
  const effectiveReset = getConfiguredResetTime(resetTime);
  const [resetHStr, resetMStr] = effectiveReset.split(':');
  const resetH = parseInt(resetHStr, 10) || 0;
  const resetM = parseInt(resetMStr, 10) || 0;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day, resetH, resetM, 0, 0);
    return d.toISOString();
  }
  return new Date().toISOString();
};

// Given a YYYY-MM-DD string, returns the Monday YYYY-MM-DD of that Monday-Sunday week
export const getWeekStartDateString = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const dow = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysSinceMonday = (dow + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  d.setDate(d.getDate() - daysSinceMonday);
  return formatDateComponents(d);
};

// Given a Monday YYYY-MM-DD string, returns the Sunday YYYY-MM-DD of that week
export const getWeekEndDateString = (weekStartStr: string): string => {
  const parts = weekStartStr.split('-');
  if (parts.length !== 3) return weekStartStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  d.setDate(d.getDate() + 6);
  return formatDateComponents(d);
};

// Formats a Monday YYYY-MM-DD string into a readable week label (e.g. "Nov 2 – Nov 8")
export const formatWeekRangeLabel = (weekStartStr: string): string => {
  const endStr = getWeekEndDateString(weekStartStr);
  const sParts = weekStartStr.split('-');
  const eParts = endStr.split('-');
  if (sParts.length !== 3 || eParts.length !== 3) return weekStartStr;

  const sDate = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
  const eDate = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10));

  const sMonth = sDate.toLocaleDateString(undefined, { month: 'short' });
  const eMonth = eDate.toLocaleDateString(undefined, { month: 'short' });
  const sDay = sDate.getDate();
  const eDay = eDate.getDate();

  if (sMonth === eMonth) {
    return `${sMonth} ${sDay}–${eDay}`;
  }
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}`;
};


