import type { Session } from '@/types/agent';

const KEY = 'agent_sessions_v1';

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    /* storage full / unavailable — ignore */
  }
}

export function newSessionId(): string {
  return crypto.randomUUID();
}
