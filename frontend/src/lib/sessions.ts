import type { Session } from '@/types/agent';
import { loadCollection, saveInBackground } from './cloud-store';

export function loadSessions(): Session[] {
  return loadCollection<Session>('sessions').sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveSessions(sessions: Session[]): void {
  saveInBackground('sessions', sessions);
}

export function newSessionId(): string {
  return crypto.randomUUID();
}
