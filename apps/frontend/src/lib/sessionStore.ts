import type { SessionRecord } from '@/types';

const STORAGE_KEY = 'bandaro_session_history';
const MAX_SESSIONS = 50;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadSessions(): SessionRecord[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: SessionRecord[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

export function clearSessions() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}